/**
 * CircleManager - Simple 3D Circle (Cylinder) Drawing
 */
class CircleManager {
    constructor(scene, lightingManager) {
        this.scene = scene;
        this.lightingManager = lightingManager;
        
        // Drawing state
        this.isDrawing = false;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        this.tempShape = null;
        
        // Material for preview
        this.tempMaterial = new BABYLON.StandardMaterial("tempCircleMaterial", this.scene);
        this.tempMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0); // Brown for ground type
        this.tempMaterial.alpha = 0.7;
        this.tempMaterial.backFaceCulling = false;
        this.tempMaterial.twoSidedLighting = true;
        
        // Counter for unique naming
        this.circleCounter = 0;
        
        // Callbacks
        this.onDrawingStopped = null;
        this.onCircleCreated = null;
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
            new BABYLON.Color3(0.4, 0.2, 0), // Brown for ground type
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
    createCircle(radius, position = new BABYLON.Vector3(0, 0, 0), color = new BABYLON.Color3(0.4, 0.3, 0.2), height = 0.2, type = 'ground') {
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
        } else {
            // Default brown for ground type
            materialColor = new BABYLON.Color3(0.4, 0.2, 0);
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
        
        // Check all meshes in the scene for names of this type
        this.scene.meshes.forEach(mesh => {
            if (mesh.name && mesh.name.startsWith(`${type}_`)) {
                const match = mesh.name.match(new RegExp(`${type}_(\\d+)`));
                if (match) {
                    const number = parseInt(match[1]);
                    if (number > maxNumber) {
                        maxNumber = number;
                    }
                }
            }
        });
        
        // Return next available number
        return `${type}_${maxNumber + 1}`;
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
        
        // Store current position
        const currentPosition = shape.position.clone();
        
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
        
        // Position the new cylinder
        newCircle.position = new BABYLON.Vector3(
            currentPosition.x,
            newHeight / 2, // Center vertically
            currentPosition.z
        );
        
        // Create new material (color will be set later based on type)
        const material = new BABYLON.StandardMaterial(`${shape.name}Material`, this.scene);
        material.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0); // Default brown (will be updated)
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
        
        // Update material color based on the current type
        let materialColor;
        if (existingType === 'building') {
            materialColor = new BABYLON.Color3(1, 1, 1); // White for buildings
        } else if (existingType === 'ground') {
            materialColor = new BABYLON.Color3(0.4, 0.2, 0); // Brown for ground
        } else if (existingType === 'waterway') {
            materialColor = new BABYLON.Color3(0, 0.5, 1); // Blue for waterway
        } else if (existingType === 'highway') {
            materialColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
        } else if (existingType === 'green') {
            materialColor = new BABYLON.Color3(0, 0.8, 0); // Green for green areas
        } else {
            materialColor = new BABYLON.Color3(0.4, 0.2, 0); // Default brown
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
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CircleManager;
}