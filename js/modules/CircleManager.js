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
        this.tempMaterial.backFaceCulling = false; // 2-sided
        this.tempMaterial.twoSidedLighting = true; // Enable lighting on both sides
        
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
        // Stop any previous drawing
        this.stopInteractiveDrawing();
        
        this.isDrawing = true;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        
        // Disable camera controls via uiManager
        if (this.uiManager) {
            this.uiManager.disableCameraControls();
        } else {
            this.scene.activeCamera.detachControl();
        }
        
        // Add event listeners with high priority (add first to execute before CameraController)
        // Store observers for cleanup
        this.pointerMoveObserver = this.scene.onPointerObservable.add(this.onPointerMove, BABYLON.PointerEventTypes.POINTERMOVE);
        this.pointerDownObserver = this.scene.onPointerObservable.add(this.onPointerDown, BABYLON.PointerEventTypes.POINTERDOWN);
        this.pointerUpObserver = this.scene.onPointerObservable.add(this.onPointerUp, BABYLON.PointerEventTypes.POINTERUP);
    }

    /**
     * Stop interactive circle drawing
     */
    stopInteractiveDrawing() {
        // Only trigger callback if we were actually drawing
        const wasDrawing = this.isDrawing;
        
        this.isDrawing = false;
        this.isCompleting = false;
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Remove event listeners using stored observers
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
        
        // Reset state
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        
        // Only call callback if we were actually drawing (not just cleaning up)
        if (wasDrawing && this.onDrawingStopped) {
            this.onDrawingStopped();
        } else if (wasDrawing && !this.onDrawingStopped) {
            // Fallback: re-enable camera controls if no callback is set
            if (this.uiManager) {
                this.uiManager.enableCameraControls();
            } else {
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
            console.log('[CIRCLE] Right click detected - canceling drawing');
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
        
        // IMPORTANT: Only accept left mouse button (button === 0)
        const button = pointerInfo.event?.button ?? pointerInfo.event?.which ?? -1;
        
        // Right click: cancel drawing
        if (button === 2) {
            console.log('[CIRCLE] Right click detected on pointer up - canceling drawing');
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
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Get type from circleType input (circle-specific), not from selected shape/polygon
        // This ensures each drawing tool uses its own type input, not the type of a previously selected object
        let drawingType = 'ground';
        const circleTypeSelect = document.getElementById('circleType');
        if (circleTypeSelect && circleTypeSelect.value) {
            drawingType = circleTypeSelect.value;
        }
        
        // Get color from uiManager based on type
        let circleColor = null;
        if (this.uiManager) {
            circleColor = this.uiManager.getColorByType(drawingType);
        } else {
            circleColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Fallback brown
        }
        
        // Create final circle with appropriate type
        const circle = this.createCircle(
            radius,
            new BABYLON.Vector3(this.drawingStartPoint.x, 0, this.drawingStartPoint.z),
            circleColor,
            0.2, // Height
            drawingType // Type from input
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
        
        // For all types except 'building', height should be 0 (use flat cylinder)
        const isBuilding = type.toLowerCase() === 'building';
        const finalHeight = isBuilding ? height : 0;
        
        // Log height for non-building types
        if (!isBuilding) {
            console.log(`[HEIGHT] CircleManager.createCircle type="${type}" using flat cylinder (height=0 for non-building types)`);
        }
        
        let circle;
        if (!isBuilding) {
            // For flat types, use CreateCylinder with very small height (0.001) instead of 0
            // This ensures proper picking and rendering while appearing flat
            const flatHeight = 0.001; // Very small height for flat appearance
            circle = BABYLON.MeshBuilder.CreateCylinder(uniqueName, {
                height: flatHeight,
                diameterTop: diameter,
                diameterBottom: diameter,
                tessellation: 32
            }, this.scene);
            
            // Position the cylinder with bottom at Y=0 (ground level)
            // Bottom should always be at Y=0, center at flatHeight/2
            const baseY = position.y || 0; // Use position.y or default to 0
            circle.position = new BABYLON.Vector3(
                position.x,
                baseY + flatHeight / 2,  // Center the cylinder vertically, bottom at baseY
                position.z
            );
            
            // Make it pickable for drawing interactions
            circle.isPickable = true;
        } else {
            // For 3D types (buildings), use CreateCylinder
            circle = BABYLON.MeshBuilder.CreateCylinder(uniqueName, {
                height: finalHeight,
                diameterTop: diameter,
                diameterBottom: diameter,
                tessellation: 32
            }, this.scene);
            
            // Position the cylinder with bottom at Y=0 (ground level)
            // Height should only grow upward, not downward
            const baseY = position.y || 0; // Use position.y or default to 0
            circle.position = new BABYLON.Vector3(
                position.x,
                baseY + finalHeight / 2, // Bottom at baseY, center at baseY + finalHeight/2
                position.z
            );
        }
        // Set rendering priority based on type
        circle.renderingGroupId = SceneManager.getRenderingGroupId(type);
        
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
        material.backFaceCulling = false; // 2-sided
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
        // For non-building types, store 0 as height in userData even though mesh has 0.001 for rendering
        // Store height: 0 for non-building types, actual height for building type
        const storedHeight = isBuilding ? finalHeight : 0;
        circle.userData = {
            type: type,
            shapeType: 'circle',
            dimensions: { 
                diameterTop: diameter, 
                diameterBottom: diameter, 
                height: storedHeight  // Store 0 for flat types in userData
            },
            originalHeight: storedHeight  // Store 0 for flat types in userData
        };
        
        console.log('Circle userData set:', circle.userData);
        
        // Apply depth offset based on type to ensure correct render order
        SceneManager.applyDepthOffset(circle, type);
        
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
     * Update circle diameter and height (simple method)
     * @param {BABYLON.Mesh} shape - The circle mesh to update
     * @param {number} newDiameterTop - New top diameter
     * @param {number} newDiameterBottom - New bottom diameter
     * @param {number} newHeight - New height
     * @param {string} newType - New type (optional, will use shape.userData.type if not provided)
     */
    updateCircle(shape, newDiameterTop, newDiameterBottom, newHeight, newType = null) {
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
        
        // Get type from parameter or from userData (parameter takes priority)
        const typeToUse = newType || shape.userData.type || 'ground';
        
        console.log('Updating circle:', shape.name, 'diameterTop:', newDiameterTop, 'diameterBottom:', newDiameterBottom, 'height:', newHeight, 'type:', typeToUse);
        
        // Store current transform properties and userData BEFORE disposing
        const currentPosition = shape.position.clone();
        const currentRotation = shape.rotation.clone();
        const currentScaling = shape.scaling.clone();
        const oldName = shape.name;
        const oldUserData = shape.userData ? JSON.parse(JSON.stringify(shape.userData)) : {};
        
        // IMPORTANT: Check if circle was selected before update (to restore selection after update)
        // Check both shape and extrusion selection state
        const oldExtrusion = shape.extrusion;
        const wasShapeSelected = this.uiManager && this.uiManager.selectionManager && 
                                this.uiManager.selectionManager.isSelected(shape);
        const wasExtrusionSelected = oldExtrusion && this.uiManager && this.uiManager.selectionManager && 
                                     this.uiManager.selectionManager.isSelected(oldExtrusion);
        const wasSelected = wasShapeSelected || wasExtrusionSelected;
        
        console.log(`[SELECTION_RESTORE] Circle update: shape=${shape.name}, wasShapeSelected=${wasShapeSelected}, wasExtrusionSelected=${wasExtrusionSelected}, wasSelected=${wasSelected}`);
        
        // Remove from selection manager BEFORE disposing (if uiManager provides access)
        if (this.uiManager && this.uiManager.selectionManager) {
            this.uiManager.selectionManager.removeSelectableObject(shape);
            if (oldExtrusion) {
                this.uiManager.selectionManager.removeSelectableObject(oldExtrusion);
            }
        }
        
        // IMPORTANT: Disable shape first to prevent any rendering issues
        shape.setEnabled(false);
        shape.isVisible = false;
        
        // Remove from scene before disposing
        this.scene.removeMesh(shape);
        
        // IMPORTANT: Verify that shape is actually removed from scene
        // If shape is still in scene.meshes, force remove it
        const meshIndex = this.scene.meshes.indexOf(shape);
        if (meshIndex !== -1) {
            console.warn('Shape still in scene.meshes after removeMesh, forcing removal');
            this.scene.meshes.splice(meshIndex, 1);
        }
        
        // Check if material is shared with other meshes before disposing
        let shouldDisposeMaterial = true;
        const oldMaterial = shape.material;
        if (oldMaterial && oldMaterial !== this.scene.defaultMaterial) {
            // Check if this material is used by other meshes
            const meshesUsingMaterial = this.scene.meshes.filter(m => m.material === oldMaterial && m !== shape);
            if (meshesUsingMaterial.length > 0) {
                console.log(`Material is shared with ${meshesUsingMaterial.length} other meshes, not disposing`);
                shouldDisposeMaterial = false;
            }
        }
        
        // Dispose old mesh
        if (shape.geometry) { 
            shape.geometry.dispose(); 
        }
        if (shouldDisposeMaterial && oldMaterial && oldMaterial !== this.scene.defaultMaterial) {
            oldMaterial.dispose();
        }
        shape.dispose();
        
        // IMPORTANT: Check if there's still a mesh with the same name in the scene
        // This can happen if CreateCylinder doesn't properly replace the old mesh
        const existingMesh = this.scene.getMeshByName(oldName);
        if (existingMesh && existingMesh !== shape) {
            console.warn(`Found existing mesh with name ${oldName}, disposing it before creating new one`);
            existingMesh.setEnabled(false);
            existingMesh.isVisible = false;
            this.scene.removeMesh(existingMesh);
            if (existingMesh.geometry) {
                existingMesh.geometry.dispose();
            }
            if (existingMesh.material && existingMesh.material !== this.scene.defaultMaterial) {
                existingMesh.material.dispose();
            }
            existingMesh.dispose();
        }
        
        // For all types except 'building', height should be 0 (use flat cylinder)
        const isBuilding = typeToUse.toLowerCase() === 'building';
        const actualHeight = isBuilding ? newHeight : 0.001; // Use very small height for non-building types
        
        // Create new cylinder with updated dimensions
        const newCircle = BABYLON.MeshBuilder.CreateCylinder(oldName, {
            height: actualHeight,
            diameterTop: newDiameterTop,
            diameterBottom: newDiameterBottom,
            tessellation: 32
        }, this.scene);
        
        // IMPORTANT: Ensure new circle is visible and enabled immediately after creation
        // CreateCylinder adds mesh to scene automatically, but we need to ensure it's visible and enabled
        newCircle.isVisible = true;
        newCircle.setEnabled(true);
        
        // Restore all transform properties with smart Y positioning
        // IMPORTANT: Preserve the current bottom position when height changes
        // Calculate the bottom of the original circle
        const originalHeight = oldUserData?.dimensions?.height || oldUserData?.originalHeight || newHeight;
        const originalBottom = currentPosition.y - (originalHeight / 2);
        
        // IMPORTANT: Preserve the original bottom position (don't reset to Y=0)
        // This ensures that if a circle is at height 1m, changing its height won't move it back to ground
        const targetBottom = originalBottom; // Keep bottom at its current position
        
        // Position new circle with bottom at the same position, height grows upward only
        newCircle.position = new BABYLON.Vector3(
            currentPosition.x,
            targetBottom + (actualHeight / 2), // Bottom at original position, center at targetBottom + actualHeight/2
            currentPosition.z
        );
        
        console.log(`[CIRCLE_POSITION] Updated circle: type=${typeToUse}, isBuilding=${isBuilding}, originalBottom=${originalBottom.toFixed(3)}, targetBottom=${targetBottom.toFixed(3)}, actualHeight=${actualHeight.toFixed(3)}, newPosition.y=${(targetBottom + (actualHeight / 2)).toFixed(3)}`);
        newCircle.rotation = currentRotation;
        newCircle.scaling = currentScaling;
        
        // Determine shape type based on new type
        const newShapeType = typeToUse === 'building' ? 'building' : 'circle';
        
        // Set rendering priority based on type
        newCircle.renderingGroupId = SceneManager.getRenderingGroupId(typeToUse);
        
        // Anti-flickering settings
        newCircle.enableEdgesRendering();
        newCircle.edgesWidth = 2.0;
        newCircle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Update userData with new type and dimensions
        newCircle.name = oldName; // Keep the same name (should already be updated in UIManager if type changed)
        
        newCircle.userData = {
            type: typeToUse,
            shapeType: newShapeType,
            dimensions: { 
                diameterTop: newDiameterTop, 
                diameterBottom: newDiameterBottom, 
                height: newHeight 
            },
            originalHeight: newHeight,
            name: oldName // Preserve name
        };
        
        // Re-link extrusion to new circle if it existed
        // IMPORTANT: Similar to rectangle, we need to re-parent extrusion to new circle
        let newExtrusion = null;
        if (oldExtrusion) {
            // Re-parent extrusion to new circle (similar to rectangle)
            oldExtrusion.setParent(newCircle);
            // Re-link bidirectional references
            newCircle.extrusion = oldExtrusion;
            oldExtrusion.basePolygon = newCircle;
            newExtrusion = oldExtrusion;
            
            // IMPORTANT: Ensure extrusion is visible and enabled (similar to rectangle)
            oldExtrusion.isVisible = true;
            oldExtrusion.setEnabled(true);
            // Note: Extrusion will be added to selection manager in onCircleCreated callback
        }
        
        // IMPORTANT: Ensure new circle is visible and enabled before adding to selection manager
        // This is similar to rectangle to prevent "Cannot select invisible or disabled mesh" error
        newCircle.isVisible = true;
        newCircle.setEnabled(true);
        
        // IMPORTANT: Ensure new circle is in the scene FIRST
        // CreateCylinder automatically adds mesh to scene, but we verify it's there
        if (!this.scene.meshes.includes(newCircle)) {
            this.scene.addMesh(newCircle);
            console.log(`[CIRCLE_UPDATE] Added new circle ${newCircle.name} to scene`);
        }
        
        // IMPORTANT: Always assign material AFTER mesh is in scene to ensure it persists
        // Material must be assigned after mesh is added to scene, otherwise it may be lost
        console.log(`[CIRCLE_UPDATE] Ensuring material is assigned to ${newCircle.name} (current material: ${newCircle.material ? newCircle.material.name : 'none'})`);
        
        // Create or get material
        let material = this.scene.getMaterialByName(`${oldName}Material`);
        if (!material) {
            material = new BABYLON.StandardMaterial(`${oldName}Material`, this.scene);
        }
        
        // Get color from uiManager if available
        let materialColor;
        if (this.uiManager && this.uiManager.getColorByType) {
            materialColor = this.uiManager.getColorByType(typeToUse);
        } else {
            materialColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Default brown
        }
        
        // Update material properties
        material.diffuseColor = materialColor;
        material.backFaceCulling = false;
        material.twoSidedLighting = true;
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.alpha = 1.0;
        
        // IMPORTANT: Always assign material to ensure it's set
        newCircle.material = material;
        console.log(`[CIRCLE_UPDATE] Material assigned to ${newCircle.name}: ${material.name}, color: (${materialColor.r}, ${materialColor.g}, ${materialColor.b})`);
        
        // Double-check that material is actually assigned
        if (!newCircle.material) {
            console.error(`[CIRCLE_UPDATE] ERROR: Material assignment failed for ${newCircle.name}!`);
        }
        
        // Enable shadows
        if (this.lightingManager && this.lightingManager.updateShadowsForNewObject) {
            this.lightingManager.updateShadowsForNewObject(newCircle);
            if (newExtrusion) {
                this.lightingManager.updateShadowsForNewObject(newExtrusion);
            }
        } else if (this.lightingManager && this.lightingManager.addShadowCaster) {
            this.lightingManager.addShadowCaster(newCircle);
            if (newExtrusion) {
                this.lightingManager.addShadowCaster(newExtrusion);
            }
        }
        
        // Call callback to add to selection manager
        // IMPORTANT: Pass isUpdate=true, wasSelected, and wasExtrusionSelected to indicate this is an update and restore selection
        if (this.onCircleCreated) {
            this.onCircleCreated(newCircle, true, wasSelected, wasExtrusionSelected, newExtrusion);
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