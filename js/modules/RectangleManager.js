/**
 * RectangleManager - Manages rectangle drawing functionality
 */
class RectangleManager {
    constructor(scene, selectionManager = null, lightingManager = null) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.lightingManager = lightingManager;
        this.rectangles = [];
        this.isDrawing = false;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        this.tempShape = null;
        
        // Temporary material for preview rectangle
        this.tempRectMaterial = new BABYLON.StandardMaterial("tempRectMaterial", this.scene);
        this.tempRectMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground type preview
        this.tempRectMaterial.alpha = 0.5;
        this.tempRectMaterial.backFaceCulling = false;
        this.tempRectMaterial.twoSidedLighting = true; // Enable lighting on both sides
        this.tempRectMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        
        // Shape counter for unique naming
        this.rectangleCounter = 0;
        
        // Callbacks
        this.onDrawingStopped = null;
        this.onRectangleCreated = null;
    }

    /**
     * Generate unique name for rectangle
     */
    generateUniqueName() {
        this.rectangleCounter++;
        return `rectangle_${this.rectangleCounter}`;
    }

    /**
     * Create a 3D rectangle (box with minimal height)
     */
    createRectangle(width, depth, position = new BABYLON.Vector3(0, 0, 0), color = new BABYLON.Color3(0.4, 0.3, 0.2), height = 0.1) {
        const uniqueName = this.generateUniqueName();
        
        // Create a 3D box instead of a 2D ground
        const rectangle = BABYLON.MeshBuilder.CreateBox(uniqueName, {
            width: width,
            height: height,
            depth: depth
        }, this.scene);
        
        // Position the rectangle so its bottom face is on the ground
        rectangle.position = new BABYLON.Vector3(
            position.x,
            position.y + height / 2, // Center the box vertically
            position.z
        );
        
        rectangle.renderingGroupId = 1; // Higher rendering priority than ground
        
        const material = new BABYLON.StandardMaterial(`${uniqueName}Material`, this.scene);
        material.diffuseColor = color;
        material.backFaceCulling = false; // Make it 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        rectangle.material = material;
        
        // Anti-flickering mesh settings
        rectangle.enableEdgesRendering();
        rectangle.edgesWidth = 1.0;
        rectangle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Store rectangle properties in userData
        rectangle.userData = {
            type: 'ground',
            shapeType: 'rectangle',
            dimensions: {
                width: width,
                depth: depth,
                height: height
            },
            originalHeight: height // Store original height for reference
        };
        
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
        
        // Disable camera controls during rectangle drawing
        if (this.scene.activeCamera) {
            this.scene.activeCamera.detachControl();
            console.log('Camera controls disabled for rectangle drawing');
        }
        
        // Add mouse event listeners
        this.scene.onPointerObservable.add(this.onPointerMove, BABYLON.PointerEventTypes.POINTERMOVE);
        this.scene.onPointerObservable.add(this.onPointerDown, BABYLON.PointerEventTypes.POINTERDOWN);
        this.scene.onPointerObservable.add(this.onPointerUp, BABYLON.PointerEventTypes.POINTERUP);
    }

    /**
     * Stop interactive rectangle drawing
     */
    stopInteractiveDrawing() {
        this.isDrawing = false;
        this.isCompleting = false;
        
        // Re-enable camera controls after rectangle drawing
        if (this.scene.activeCamera) {
            this.scene.activeCamera.attachControl(this.scene.getEngine().getRenderingCanvas(), true);
            console.log('Camera controls enabled after rectangle drawing');
        }
        
        // Remove mouse event listeners
        this.scene.onPointerObservable.removeCallback(this.onPointerMove, BABYLON.PointerEventTypes.POINTERMOVE);
        this.scene.onPointerObservable.removeCallback(this.onPointerDown, BABYLON.PointerEventTypes.POINTERDOWN);
        this.scene.onPointerObservable.removeCallback(this.onPointerUp, BABYLON.PointerEventTypes.POINTERUP);
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
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
        if (!this.isDrawing) return;
        
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
        
        // Create final 3D rectangle with minimal height
        const rectangle = this.createRectangle(
            actualWidth,
            actualDepth,
            new BABYLON.Vector3(centerX, 0, centerZ),
            new BABYLON.Color3(0.4, 0.3, 0.2), // Brown for ground type
            0.1 // Minimal height to prevent flickering
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
