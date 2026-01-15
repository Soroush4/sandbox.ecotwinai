/**
 * RectangleManager - Manages rectangle drawing functionality
 */
class RectangleManager {
    constructor(scene, selectionManager = null, lightingManager = null, uiManager = null) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.lightingManager = lightingManager;
        this.uiManager = uiManager;
        this.rectangles = [];
        this.isDrawing = false;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        this.tempShape = null;
        
        // Temporary material for preview rectangle
        this.tempRectMaterial = new BABYLON.StandardMaterial("tempRectMaterial", this.scene);
        // Use standardized preview color
        const previewColor = this.uiManager ? this.uiManager.getDefaultPreviewColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
        const previewAlpha = this.uiManager ? this.uiManager.getDefaultPreviewAlpha() : 0.5;
        this.tempRectMaterial.diffuseColor = previewColor;
        this.tempRectMaterial.alpha = previewAlpha;
        this.tempRectMaterial.backFaceCulling = false; // 2-sided
        this.tempRectMaterial.twoSidedLighting = true; // Enable lighting on both sides
        this.tempRectMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        
        // Shape counter for unique naming
        this.rectangleCounter = 0;
        
        // Callbacks
        this.onDrawingStopped = null;
        this.onRectangleCreated = null;
    }

    /**
     * Set UIManager reference for standardized colors
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Generate unique name for rectangle
     */
    generateUniqueName() {
        this.rectangleCounter++;
        return `rectangle_${this.rectangleCounter}`;
    }

    /**
     * Generate unique name by type
     */
    generateUniqueNameByType(type) {
        // Count existing objects of this type in the scene
        let maxNumber = 0;
        const usedNumbers = new Set();
        
        // Check all meshes in the scene for names of this type
        // Only count enabled meshes that are still in the scene
        this.scene.meshes.forEach(mesh => {
            if (mesh.name && mesh.isEnabled() && mesh.name.startsWith(type) && /^\d+$/.test(mesh.name.substring(type.length))) {
                const match = mesh.name.match(new RegExp(`^${type}(\\d+)$`));
                if (match) {
                    const number = parseInt(match[1]);
                    usedNumbers.add(number);
                    if (number > maxNumber) {
                        maxNumber = number;
                    }
                }
            }
        });
        
        // Find the first available number (not just maxNumber + 1)
        let nextNumber = 1;
        while (usedNumbers.has(nextNumber)) {
            nextNumber++;
        }
        
        // Return next available number
        return `${type}${nextNumber}`;
    }

    /**
     * Create a 3D rectangle (box with minimal height)
     */
    createRectangle(width, depth, position = new BABYLON.Vector3(0, 0, 0), color = null, height = 0.1, type = 'ground') {
        const uniqueName = this.generateUniqueNameByType(type);
        
        // For all types except 'building', height should be 0 (use flat box)
        const isBuilding = type.toLowerCase() === 'building';
        const finalHeight = isBuilding ? height : 0;
        
        // Log height for non-building types
        if (!isBuilding) {
        }
        
        let rectangle;
        if (!isBuilding) {
            // For flat types, use CreateBox with very small height (0.001) instead of 0
            // This ensures proper picking and rendering while appearing flat
            const flatHeight = 0.001; // Very small height for flat appearance
            rectangle = BABYLON.MeshBuilder.CreateBox(uniqueName, {
                width: width,
                height: flatHeight,
                depth: depth
            }, this.scene);
            
            // Position the box at Y=0 (centered vertically on the small height)
            rectangle.position = new BABYLON.Vector3(
                position.x,
                position.y + flatHeight / 2,  // Center the box vertically
                position.z
            );
            
            // Make it pickable for drawing interactions
            rectangle.isPickable = true;
        } else {
            // For 3D types (buildings), use CreateBox
            rectangle = BABYLON.MeshBuilder.CreateBox(uniqueName, {
                width: width,
                height: finalHeight,
                depth: depth
            }, this.scene);
            
            // Position the rectangle so its bottom face is on the ground
            rectangle.position = new BABYLON.Vector3(
                position.x,
                position.y + finalHeight / 2, // Center the box vertically
                position.z
            );
        }
        
        // Set rendering priority based on type
        rectangle.renderingGroupId = SceneManager.getRenderingGroupId(type);
        
        const material = new BABYLON.StandardMaterial(`${uniqueName}Material`, this.scene);
        // Use standardized color if no color provided or use UIManager's color system
        let materialColor;
        if (color) {
            materialColor = color;
        } else if (this.uiManager) {
            materialColor = this.uiManager.getColorByType(type);
        } else {
            materialColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Fallback brown
        }
        material.diffuseColor = materialColor;
        material.backFaceCulling = false; // 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        rectangle.material = material;
        
        // Anti-flickering mesh settings
        rectangle.enableEdgesRendering();
        rectangle.edgesWidth = 1.0;
        rectangle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Ensure type is valid (default to 'ground' if not provided or invalid)
        const validType = (type && type !== undefined && type !== null && type !== '') ? type : 'ground';
        
        // Store rectangle properties in userData
        // For non-building types, store 0 as height in userData even though mesh has 0.001 for rendering
        const storedHeight = isBuilding ? finalHeight : 0;
        rectangle.userData = {
            type: validType,
            shapeType: 'rectangle',
            dimensions: {
                width: width,
                depth: depth,
                height: storedHeight  // Store 0 for flat types in userData
            },
            originalHeight: storedHeight // Store 0 for flat types in userData
        };
        
        // Final validation: ensure type is set
        if (!rectangle.userData.type || rectangle.userData.type === undefined || rectangle.userData.type === null) {
            rectangle.userData.type = 'ground';
            console.warn(`Rectangle ${uniqueName} had no type after creation, set to 'ground'`);
        }
        
        // Apply depth offset based on type to ensure correct render order
        SceneManager.applyDepthOffset(rectangle, validType);
        
        // Add to rectangles array
        this.rectangles.push(rectangle);
        
        // Make rectangle selectable
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(rectangle);
        }
        
        // Enable shadows for the rectangle
        if (this.lightingManager) {
            this.lightingManager.updateShadowsForNewObject(rectangle);
        }
        
        return rectangle;
    }

    /**
     * Start interactive rectangle drawing
     */
    startInteractiveDrawing() {
        // Stop any existing drawing first
        this.stopInteractiveDrawing();
        
        this.isDrawing = true;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        
        // Disable camera controls during rectangle drawing via uiManager
        if (this.uiManager) {
            this.uiManager.disableCameraControls();
        } else if (this.scene.activeCamera) {
            this.scene.activeCamera.detachControl();
        }
        
        // Add mouse event listeners with high priority (add first to execute before CameraController)
        // Store observers for cleanup
        this.pointerMoveObserver = this.scene.onPointerObservable.add(this.onPointerMove, BABYLON.PointerEventTypes.POINTERMOVE);
        this.pointerDownObserver = this.scene.onPointerObservable.add(this.onPointerDown, BABYLON.PointerEventTypes.POINTERDOWN);
        this.pointerUpObserver = this.scene.onPointerObservable.add(this.onPointerUp, BABYLON.PointerEventTypes.POINTERUP);
    }

    /**
     * Stop interactive rectangle drawing
     */
    stopInteractiveDrawing() {
        // Only trigger callback if we were actually drawing
        const wasDrawing = this.isDrawing;
        
        this.isDrawing = false;
        this.isCompleting = false;
        
        // Remove mouse event listeners using stored observers
        if (this.pointerMoveObserver) {
            this.scene.onPointerObservable.remove(this.pointerMoveObserver);
            this.pointerMoveObserver = null;
        }
        if (this.pointerDownObserver) {
            this.scene.onPointerObservable.remove(this.pointerDownObserver);
            this.pointerDownObserver = null;
        }
        if (this.pointerUpObserver) {
            this.scene.onPointerObservable.remove(this.pointerUpObserver);
            this.pointerUpObserver = null;
        }
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Only call callback if we were actually drawing (not just cleaning up)
        if (wasDrawing && this.onDrawingStopped) {
            this.onDrawingStopped();
        } else if (wasDrawing && !this.onDrawingStopped) {
            // Fallback: re-enable camera controls if no callback is set
            if (this.uiManager) {
                this.uiManager.enableCameraControls();
            } else if (this.scene.activeCamera) {
                this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
            }
        }
    }

    /**
     * Handle pointer move during drawing
     */
    onPointerMove = (pointerInfo) => {
        if (!this.isDrawing || !this.drawingStartPoint) {
            return;
        }
        
        // Prevent camera movement by stopping event propagation
        if (pointerInfo.event) {
            pointerInfo.event.preventDefault();
            pointerInfo.event.stopPropagation();
        }
        
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (pickResult && pickResult.hit && pickResult.pickedPoint) {
            this.drawingEndPoint = pickResult.pickedPoint;
            this.updatePreviewRectangle();
        }
    }

    /**
     * Handle pointer down during drawing
     */
    onPointerDown = (pointerInfo) => {
        if (!this.isDrawing) {
            return;
        }
        
        // Prevent camera movement by stopping event propagation
        if (pointerInfo.event) {
            pointerInfo.event.preventDefault();
            pointerInfo.event.stopPropagation();
        }
        
        // IMPORTANT: Only accept left mouse button (button === 0)
        // Right click (button === 2) and middle click (button === 1) should cancel drawing
        const button = pointerInfo.event?.button ?? pointerInfo.event?.which ?? -1;
        
        // Right click: cancel drawing
        if (button === 2) {
            console.log('[RECTANGLE] Right click detected - canceling drawing');
            this.stopInteractiveDrawing();
            return;
        }
        
        // Middle click: ignore
        if (button === 1) {
            return;
        }
        
        // Only proceed with left click (button === 0)
        if (button !== 0) {
            return;
        }
        
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (pickResult && pickResult.hit && pickResult.pickedPoint) {
            if (!this.drawingStartPoint) {
                // Start drawing
                this.drawingStartPoint = pickResult.pickedPoint;
            }
        }
    }

    /**
     * Handle pointer up during drawing
     */
    onPointerUp = (pointerInfo) => {
        if (!this.isDrawing || !this.drawingStartPoint || !this.drawingEndPoint) return;
        
        // IMPORTANT: Only accept left mouse button (button === 0)
        const button = pointerInfo.event?.button ?? pointerInfo.event?.which ?? -1;
        
        // Right click: cancel drawing
        if (button === 2) {
            console.log('[RECTANGLE] Right click detected on pointer up - canceling drawing');
            this.stopInteractiveDrawing();
            return;
        }
        
        // Middle click: ignore
        if (button === 1) {
            return;
        }
        
        // Only proceed with left click (button === 0)
        if (button !== 0) {
            return;
        }
        
        // Prevent multiple rectangle creation
        if (this.isCompleting) return;
        this.isCompleting = true;
        
        // Create final rectangle
        this.finishRectangle();
    }

    /**
     * Update preview rectangle during drawing
     */
    updatePreviewRectangle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;
        
        // Calculate rectangle dimensions
        const width = Math.abs(this.drawingEndPoint.x - this.drawingStartPoint.x);
        const depth = Math.abs(this.drawingEndPoint.z - this.drawingStartPoint.z);
        const height = 0.1; // Minimal height for preview to prevent flickering
        
        // Calculate center position
        const centerX = (this.drawingStartPoint.x + this.drawingEndPoint.x) / 2;
        const centerZ = (this.drawingStartPoint.z + this.drawingEndPoint.z) / 2;
        
        // Remove old preview
        if (this.tempShape) {
            this.tempShape.dispose();
        }
        
        // Create new preview rectangle as 3D box
        this.tempShape = BABYLON.MeshBuilder.CreateBox("tempRectangle", {
            width: width,
            height: height,
            depth: depth
        }, this.scene);
        
        this.tempShape.position = new BABYLON.Vector3(centerX, height / 2, centerZ);
        this.tempShape.material = this.tempRectMaterial;
        this.tempShape.renderingGroupId = 1;
        
        // Anti-flickering settings for preview
        this.tempShape.enableEdgesRendering();
        this.tempShape.edgesWidth = 1.0;
        this.tempShape.edgesColor = new BABYLON.Color4(0, 0, 0, 0.5);
    }

    /**
     * Finish rectangle drawing
     */
    finishRectangle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;
        
        // Calculate final dimensions
        const actualWidth = Math.abs(this.drawingEndPoint.x - this.drawingStartPoint.x);
        const actualDepth = Math.abs(this.drawingEndPoint.z - this.drawingStartPoint.z);
        
        // Calculate center position
        const centerX = (this.drawingStartPoint.x + this.drawingEndPoint.x) / 2;
        const centerZ = (this.drawingStartPoint.z + this.drawingEndPoint.z) / 2;
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Get type from shapeType input (rectangle-specific), not from selected shape/polygon
        // This ensures each drawing tool uses its own type input, not the type of a previously selected object
        let drawingType = 'ground';
        const shapeTypeSelect = document.getElementById('shapeType');
        if (shapeTypeSelect && shapeTypeSelect.value) {
            drawingType = shapeTypeSelect.value;
        }
        
        // For all types except 'building', height should be 0
        const isBuilding = drawingType.toLowerCase() === 'building';
        const finalHeight = isBuilding ? 0.1 : 0;
        
        // Log height for non-building types
        if (!isBuilding) {
            console.log(`[HEIGHT] RectangleManager.finishRectangle type="${drawingType}" finalHeight=${finalHeight} (should be 0 for non-building types)`);
        }
        
        // Get color from uiManager based on type
        let rectangleColor = null;
        if (this.uiManager) {
            rectangleColor = this.uiManager.getColorByType(drawingType);
        } else {
            rectangleColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Fallback brown
        }
        
        // Create final 3D rectangle with appropriate height based on type
        const rectangle = this.createRectangle(
            actualWidth,
            actualDepth,
            new BABYLON.Vector3(centerX, 0, centerZ),
            rectangleColor,
            finalHeight, // Height based on type (0 for flat types, 0.1 for others)
            drawingType // Type from uiManager or default 'ground'
        );
        
        this.stopInteractiveDrawing();
        
        // Call callback
        if (this.onRectangleCreated) {
            this.onRectangleCreated(rectangle);
        }
        
        return rectangle;
    }

    /**
     * Clear all rectangles
     */
    clearAllRectangles() {
        this.rectangles.forEach(rectangle => {
            if (rectangle.material) {
                rectangle.material.dispose();
            }
            rectangle.dispose();
        });
        this.rectangles = [];
    }

    /**
     * Get all rectangles
     */
    getAllRectangles() {
        return this.rectangles;
    }

    /**
     * Remove a specific rectangle
     */
    removeRectangle(rectangle) {
        const index = this.rectangles.indexOf(rectangle);
        if (index > -1) {
            this.rectangles.splice(index, 1);
            if (rectangle.material) {
                rectangle.material.dispose();
            }
            rectangle.dispose();
        }
    }

    /**
     * Dispose of the manager
     */
    dispose() {
        this.stopInteractiveDrawing();
        this.clearAllRectangles();
        
        if (this.tempRectMaterial) {
            this.tempRectMaterial.dispose();
        }
    }
}
