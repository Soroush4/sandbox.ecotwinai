/**
 * CircleManager - Manages circle drawing functionality
 */
class CircleManager {
    constructor(scene, selectionManager = null, lightingManager = null) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.lightingManager = lightingManager;
        this.circles = [];
        this.isDrawing = false;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        this.tempShape = null;
        
        // Temporary material for preview circle
        this.tempCircleMaterial = new BABYLON.StandardMaterial("tempCircleMaterial", this.scene);
        this.tempCircleMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground type preview
        this.tempCircleMaterial.alpha = 0.5;
        this.tempCircleMaterial.backFaceCulling = false;
        
        // Shape counter for unique naming
        this.circleCounter = 0;
        
        // Callbacks
        this.onDrawingStopped = null;
        this.onCircleCreated = null;
    }

    /**
     * Generate unique name for circle
     */
    generateUniqueName() {
        this.circleCounter++;
        return `circle_${this.circleCounter}`;
    }

    /**
     * Create a circle
     */
    createCircle(radius, position = new BABYLON.Vector3(0, 0, 0), color = new BABYLON.Color3(0.4, 0.3, 0.2), height = 0.1) {
        const uniqueName = this.generateUniqueName();
        
        // Create a 3D cylinder instead of a 2D disc
        const circle = BABYLON.MeshBuilder.CreateCylinder(uniqueName, {
            radius: radius,
            height: height,
            tessellation: 32
        }, this.scene);
        
        // Position the cylinder so its bottom face is on the ground
        circle.position = new BABYLON.Vector3(
            position.x,
            position.y + height / 2, // Center the cylinder vertically
            position.z
        );
        circle.renderingGroupId = 1; // Higher rendering priority than ground
        
        const material = new BABYLON.StandardMaterial(`${uniqueName}Material`, this.scene);
        material.diffuseColor = color;
        material.backFaceCulling = false; // Make it 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        circle.material = material;
        
        // Anti-flickering mesh settings
        circle.enableEdgesRendering();
        circle.edgesWidth = 1.0;
        circle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Store circle properties in userData
        circle.userData = {
            type: 'ground',
            shapeType: 'circle',
            dimensions: {
                radius: radius,
                height: height
            },
            originalHeight: height
        };
        
        // Add to circles array
        this.circles.push(circle);
        
        // Make circle selectable
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(circle);
        }
        
        // Enable shadows for the new circle
        if (this.lightingManager) {
            this.lightingManager.updateShadowsForNewObject(circle);
        }
        
        return circle;
    }

    /**
     * Start interactive circle drawing
     */
    startInteractiveDrawing() {
        // Stop any existing drawing first
        this.stopInteractiveDrawing();
        
        this.isDrawing = true;
        this.isCompleting = false;
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        
        // Add mouse event listeners
        this.scene.onPointerObservable.add(this.onPointerMove, BABYLON.PointerEventTypes.POINTERMOVE);
        this.scene.onPointerObservable.add(this.onPointerDown, BABYLON.PointerEventTypes.POINTERDOWN);
        this.scene.onPointerObservable.add(this.onPointerUp, BABYLON.PointerEventTypes.POINTERUP);
    }

    /**
     * Stop interactive circle drawing
     */
    stopInteractiveDrawing() {
        this.isDrawing = false;
        this.isCompleting = false;
        
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
            this.updatePreviewCircle();
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
        
        // Prevent multiple circle creation
        if (this.isCompleting) return;
        this.isCompleting = true;
        
        // Create final circle
        this.finishCircle();
    }

    /**
     * Update preview circle during drawing
     */
    updatePreviewCircle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;
        
        // Calculate radius from center to current point
        const radius = Math.sqrt(
            Math.pow(this.drawingEndPoint.x - this.drawingStartPoint.x, 2) +
            Math.pow(this.drawingEndPoint.z - this.drawingStartPoint.z, 2)
        );
        
        // Remove old preview
        if (this.tempShape) {
            this.tempShape.dispose();
        }
        
        // Create new preview circle as 3D cylinder
        const height = 0.1; // Minimal height for preview to prevent flickering
        this.tempShape = BABYLON.MeshBuilder.CreateCylinder("tempCircle", {
            radius: radius,
            height: height,
            tessellation: 32
        }, this.scene);
        
        this.tempShape.position = new BABYLON.Vector3(this.drawingStartPoint.x, height / 2, this.drawingStartPoint.z);
        this.tempShape.material = this.tempCircleMaterial;
        this.tempShape.renderingGroupId = 1;
        
        // Anti-flickering settings for preview
        this.tempShape.enableEdgesRendering();
        this.tempShape.edgesWidth = 1.0;
        this.tempShape.edgesColor = new BABYLON.Color4(0, 0, 0, 0.5);
    }

    /**
     * Finish circle drawing
     */
    finishCircle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;
        
        // Calculate final radius
        const radius = Math.sqrt(
            Math.pow(this.drawingEndPoint.x - this.drawingStartPoint.x, 2) +
            Math.pow(this.drawingEndPoint.z - this.drawingStartPoint.z, 2)
        );
        
        // Clean up temporary shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Create final circle with center at start point
        const circle = this.createCircle(
            radius,
            new BABYLON.Vector3(this.drawingStartPoint.x, 0, this.drawingStartPoint.z),
            new BABYLON.Color3(0.4, 0.3, 0.2), // Brown for ground type
            0.1 // Minimal height to prevent flickering
        );
        
        this.stopInteractiveDrawing();
        
        // Call callback
        if (this.onCircleCreated) {
            this.onCircleCreated(circle);
        }
        
        return circle;
    }

    /**
     * Clear all circles
     */
    clearAllCircles() {
        this.circles.forEach(circle => {
            if (circle.material) {
                circle.material.dispose();
            }
            circle.dispose();
        });
        this.circles = [];
    }

    /**
     * Get all circles
     */
    getAllCircles() {
        return this.circles;
    }

    /**
     * Remove a specific circle
     */
    removeCircle(circle) {
        const index = this.circles.indexOf(circle);
        if (index > -1) {
            this.circles.splice(index, 1);
            if (circle.material) {
                circle.material.dispose();
            }
            circle.dispose();
        }
    }

    /**
     * Dispose of the manager
     */
    dispose() {
        this.stopInteractiveDrawing();
        this.clearAllCircles();
        
        if (this.tempCircleMaterial) {
            this.tempCircleMaterial.dispose();
        }
    }
}
