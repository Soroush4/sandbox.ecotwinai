/**
 * CircleManager - Simple 3D Circle (Cylinder) Drawing
 */
class CircleManager {
    constructor(scene, lightingManager, uiManager = null) {
        this.scene = scene;
        this.lightingManager = lightingManager;
        this.uiManager = uiManager;
        
        // Drawing state
        this.isDrawing = false;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        this.tempShape = null;
        
        // Material for preview
        this.tempMaterial = new BABYLON.StandardMaterial("tempCircleMaterial", this.scene);
        // Use standardized preview color
        const previewColor = this.uiManager ? this.uiManager.getDefaultPreviewColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
        const previewAlpha = this.uiManager ? this.uiManager.getDefaultPreviewAlpha() : 0.5;
        this.tempMaterial.diffuseColor = previewColor;
        this.tempMaterial.alpha = previewAlpha;
        this.tempMaterial.backFaceCulling = false;
        this.tempMaterial.twoSidedLighting = true;
        
        // Counter for unique naming
        this.circleCounter = 0;
        
        // Callbacks
        this.onDrawingStopped = null;
        this.onCircleCreated = null;
    }

    /**
     * Set UIManager reference for standardized colors
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Start interactive circle drawing
     */
    startInteractiveDrawing() {
        console.log('Starting circle drawing...');
        
        // Stop any previous drawing
        this.stopInteractiveDrawing();
        
        this.isDrawing = true;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        
        // Disable camera controls
        this.scene.activeCamera.detachControl();
        
        // Add event listeners
        this.scene.onPointerObservable.add(this.onPointerMove, BABYLON.PointerEventTypes.POINTERMOVE);
        this.scene.onPointerObservable.add(this.onPointerDown, BABYLON.PointerEventTypes.POINTERDOWN);
        this.scene.onPointerObservable.add(this.onPointerUp, BABYLON.PointerEventTypes.POINTERUP);
    }

    /**
     * Stop interactive circle drawing
     */
    stopInteractiveDrawing() {
        console.log('Stopping circle drawing...');
        
        this.isDrawing = false;
        this.isCompleting = false;
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Re-enable camera controls
        this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
        
        // Remove event listeners
        this.scene.onPointerObservable.removeCallback(this.onPointerMove, BABYLON.PointerEventTypes.POINTERMOVE);
        this.scene.onPointerObservable.removeCallback(this.onPointerDown, BABYLON.PointerEventTypes.POINTERDOWN);
        this.scene.onPointerObservable.removeCallback(this.onPointerUp, BABYLON.PointerEventTypes.POINTERUP);
        
        // Reset state
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        
        // Call callback
        if (this.onDrawingStopped) {
            this.onDrawingStopped();
        }
    }

    /**
     * Handle pointer move during drawing
     */
    onPointerMove = (pointerInfo) => {
        if (!this.isDrawing || !this.drawingStartPoint) return;
        
        // Get current mouse position on ground
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (pickResult && pickResult.hit && pickResult.pickedPoint) {
            this.drawingEndPoint = pickResult.pickedPoint;
            this.updatePreview();
        }
    }

    /**
     * Handle pointer down during drawing
     */
    onPointerDown = (pointerInfo) => {
        if (!this.isDrawing) return;
        
        // Get ground intersection point
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (pickResult && pickResult.hit && pickResult.pickedPoint) {
            if (!this.drawingStartPoint) {
                // Start drawing - set center point
                this.drawingStartPoint = pickResult.pickedPoint.clone();
                console.log('Circle drawing started at:', this.drawingStartPoint);
            }
        }
    }

    /**
     * Handle pointer up during drawing
     */
    onPointerUp = (pointerInfo) => {
        if (!this.isDrawing || !this.drawingStartPoint) return;
        
        // Prevent multiple circle creation
        if (this.isCompleting) return;
        this.isCompleting = true;
        
        // Get final end point
        const pickResult = this.scene.pick(this.scene.pointerX, this.scene.pointerY);
        if (pickResult && pickResult.hit && pickResult.pickedPoint) {
            this.drawingEndPoint = pickResult.pickedPoint.clone();
        } else if (!this.drawingEndPoint) {
            // Fallback: use start point with minimum radius
            this.drawingEndPoint = new BABYLON.Vector3(
                this.drawingStartPoint.x + 1.0,
                this.drawingStartPoint.y,
                this.drawingStartPoint.z
            );
        }
        
        console.log('Circle drawing ended at:', this.drawingEndPoint);
        
        // Create final circle
        this.finishCircle();
    }

    /**
     * Update preview during drawing
     */
    updatePreview() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;
        
        // Calculate radius from center to current point
        const dx = this.drawingEndPoint.x - this.drawingStartPoint.x;
        const dz = this.drawingEndPoint.z - this.drawingStartPoint.z;
        const radius = Math.max(Math.sqrt(dx * dx + dz * dz), 0.2); // Minimum radius 0.2
        
        console.log('Preview radius:', radius);
        
        // Remove old preview
        if (this.tempShape) {
            this.tempShape.dispose();
        }
        
        // Create new preview cylinder
        const height = 0.2; // Preview height
        this.tempShape = BABYLON.MeshBuilder.CreateCylinder("tempCircle", {
            height: height,
            diameterTop: radius * 2,
            diameterBottom: radius * 2,
            tessellation: 32
        }, this.scene);
        
        // Position at center point
        this.tempShape.position = new BABYLON.Vector3(
            this.drawingStartPoint.x, 
            height / 2, 
            this.drawingStartPoint.z
        );
        this.tempShape.material = this.tempMaterial;
        this.tempShape.renderingGroupId = 1;
        
        // Anti-flickering settings
        this.tempShape.enableEdgesRendering();
        this.tempShape.edgesWidth = 2.0;
        this.tempShape.edgesColor = new BABYLON.Color4(0, 0, 0, 0.8);
    }

    /**
     * Finish circle drawing
     */
    finishCircle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;
        
        // Calculate final radius
        const dx = this.drawingEndPoint.x - this.drawingStartPoint.x;
        const dz = this.drawingEndPoint.z - this.drawingStartPoint.z;
        const radius = Math.max(Math.sqrt(dx * dx + dz * dz), 0.5); // Minimum radius 0.5
        
        console.log('Final circle radius:', radius);
        console.log('Center:', this.drawingStartPoint);
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Create final circle with ground type color
        const circle = this.createCircle(
            radius,
            new BABYLON.Vector3(this.drawingStartPoint.x, 0, this.drawingStartPoint.z),
            new BABYLON.Color3(0.4, 0.3, 0.2), // Brown
            0.2, // Height
            'ground' // Type
        );
        
        console.log('Circle created:', circle.name, 'with radius:', radius);
        
        this.stopInteractiveDrawing();
        
        // Call callback
        if (this.onCircleCreated) {
            this.onCircleCreated(circle);
        }
        
        return circle;
    }

    /**
     * Create a simple 3D circle (cylinder)
     */
    createCircle(radius, position = new BABYLON.Vector3(0, 0, 0), color = null, height = 0.2, type = 'ground') {
        const uniqueName = this.generateUniqueNameByType(type);
        const diameter = radius * 2;
        
        // Create a 3D cylinder
        const circle = BABYLON.MeshBuilder.CreateCylinder(uniqueName, {
            height: height,
            diameterTop: diameter,
            diameterBottom: diameter,
            tessellation: 32
        }, this.scene);
        
        // Position the cylinder so its bottom face is on the ground
        circle.position = new BABYLON.Vector3(
            position.x,
            position.y + height / 2, // Center the cylinder vertically
            position.z
        );
        circle.renderingGroupId = 1; // Higher rendering priority than ground
        
        // Create material with color based on type
        const material = new BABYLON.StandardMaterial(`${uniqueName}Material`, this.scene);
        
        // Set color based on type (default is ground)
        let materialColor;
        if (color) {
            // Use provided color
            materialColor = color;
        } else if (this.uiManager) {
            // Use standardized color from UIManager
            materialColor = this.uiManager.getColorByType(type);
        } else {
            // Fallback brown
            materialColor = new BABYLON.Color3(0.4, 0.3, 0.2);
        }
        
        material.diffuseColor = materialColor;
        material.backFaceCulling = false; // Make it 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        material.alpha = 1.0; // Fully opaque
        circle.material = material;
        
        // Anti-flickering mesh settings
        circle.enableEdgesRendering();
        circle.edgesWidth = 2.0; // Thicker edges for better visibility
        circle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        console.log('Created cylinder:', uniqueName, 'radius:', radius, 'height:', height, 'position:', circle.position);
        
        // Store circle properties in userData
        circle.userData = {
            type: type,
            shapeType: 'circle',
            dimensions: { 
                diameterTop: diameter, 
                diameterBottom: diameter, 
                height: height 
            },
            originalHeight: height
        };
        
        console.log('Circle userData set:', circle.userData);
        
        // Enable shadows
        if (this.lightingManager && this.lightingManager.updateShadowsForNewObject) {
            this.lightingManager.updateShadowsForNewObject(circle);
        } else if (this.lightingManager && this.lightingManager.addShadowCaster) {
            this.lightingManager.addShadowCaster(circle);
        }
        
        // Call callback to add to selection manager
        if (this.onCircleCreated) {
            this.onCircleCreated(circle);
        }
        
        return circle;
    }

    /**
     * Generate unique name for circle
     */
    generateUniqueName() {
        this.circleCounter++;
        return `circle_${this.circleCounter}`;
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
            if (mesh.name && mesh.isEnabled() && mesh.name.startsWith(`${type}_`)) {
                const match = mesh.name.match(new RegExp(`^${type}_(\\d+)$`));
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
        return `${type}_${nextNumber}`;
    }

    /**
     * Update circle diameter and height (simple method)
     */
    updateCircle(shape, newDiameterTop, newDiameterBottom, newHeight) {
        if (!shape || !shape.userData) {
            console.warn('Cannot update: no shape or userData');
            return;
        }
        
        // Check if this is a circle or building that originated from a circle
        const isCircle = shape.userData.shapeType === 'circle' || 
                        (shape.userData.shapeType === 'building' && shape.userData.dimensions && shape.userData.dimensions.diameterTop !== undefined);
        
        if (!isCircle) {
            console.warn('Cannot update: not a circle or building from circle');
            return;
        }
        
        console.log('Updating circle:', shape.name, 'diameterTop:', newDiameterTop, 'diameterBottom:', newDiameterBottom, 'height:', newHeight);
        
        // Store current transform properties
        const currentPosition = shape.position.clone();
        const currentRotation = shape.rotation.clone();
        const currentScaling = shape.scaling.clone();
        
        // Dispose old mesh
        if (shape.geometry) { shape.geometry.dispose(); }
        if (shape.material && shape.material !== this.scene.defaultMaterial) { shape.material.dispose(); }
        shape.setEnabled(false);
        shape.dispose();
        
        // Create new cylinder with updated dimensions
        const newCircle = BABYLON.MeshBuilder.CreateCylinder(shape.name, {
            height: newHeight,
            diameterTop: newDiameterTop,
            diameterBottom: newDiameterBottom,
            tessellation: 32
        }, this.scene);
        
        // Restore all transform properties with smart Y positioning
        // Calculate the bottom of the original circle
        const originalHeight = shape.userData?.dimensions?.height || shape.userData?.originalHeight || newHeight;
        const originalBottom = currentPosition.y - (originalHeight / 2);
        
        // Position new circle with same bottom but new height
        newCircle.position = new BABYLON.Vector3(
            currentPosition.x,
            originalBottom + (newHeight / 2), // Keep same bottom, adjust for new height
            currentPosition.z
        );
        newCircle.rotation = currentRotation;
        newCircle.scaling = currentScaling;
        
        // Create new material (color will be set later based on type)
        const material = new BABYLON.StandardMaterial(`${shape.name}Material`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Default brown (will be updated)
        material.backFaceCulling = false;
        material.twoSidedLighting = true;
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.alpha = 1.0;
        newCircle.material = material;
        newCircle.renderingGroupId = 1; // Same rendering priority as buildings and trees
        
        // Anti-flickering settings
        newCircle.enableEdgesRendering();
        newCircle.edgesWidth = 2.0;
        newCircle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Update userData (preserve existing type if available)
        const existingType = shape.userData?.type || 'ground';
        const existingShapeType = shape.userData?.shapeType || 'circle';
        
        // Keep the same name (don't generate new name for updates)
        // The name should already be updated in UIManager if type changed
        newCircle.name = shape.name;
        
        newCircle.userData = {
            type: existingType,
            shapeType: existingShapeType,
            dimensions: { 
                diameterTop: newDiameterTop, 
                diameterBottom: newDiameterBottom, 
                height: newHeight 
            },
            originalHeight: newHeight
        };
        
        // Use the color selected by user (from color picker) if available
        let materialColor;
        const colorPicker = document.getElementById('circleColor');
        if (colorPicker && colorPicker.value) {
            // Convert hex to RGB
            const hex = colorPicker.value;
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            if (result) {
                materialColor = new BABYLON.Color3(
                    parseInt(result[1], 16) / 255,
                    parseInt(result[2], 16) / 255,
                    parseInt(result[3], 16) / 255
                );
            } else {
                materialColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Default brown
            }
        } else {
            // No fallback colors - user must choose from color picker
            materialColor = new BABYLON.Color3(0.5, 0.5, 0.5); // Default neutral gray
        }
        
        // Update the material color
        newCircle.material.diffuseColor = materialColor;
        
        // Enable shadows
        if (this.lightingManager && this.lightingManager.updateShadowsForNewObject) {
            this.lightingManager.updateShadowsForNewObject(newCircle);
        } else if (this.lightingManager && this.lightingManager.addShadowCaster) {
            this.lightingManager.addShadowCaster(newCircle);
        }
        
        // Call callback to add to selection manager
        if (this.onCircleCreated) {
            this.onCircleCreated(newCircle);
        }
        
        console.log('Circle updated successfully');
        return newCircle;
    }
    
    /**
     * Clear all circles from the scene
     */
    clearAllCircles() {
        const scene = this.scene;
        if (!scene) return;
        
        // Find all circles in the scene by checking userData
        const circles = scene.meshes.filter(mesh => {
            return mesh.userData && mesh.userData.shapeType === 'circle';
        });
        
        // Remove and dispose each circle
        circles.forEach(circle => {
            if (circle && circle.dispose) {
                scene.removeMesh(circle);
                if (circle.material) {
                    circle.material.dispose();
                }
                circle.dispose();
            }
        });
        
        console.log(`Cleared ${circles.length} circles from scene`);
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CircleManager;
}