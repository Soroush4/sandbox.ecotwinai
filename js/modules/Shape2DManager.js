/**
 * Shape2DManager - Manages 2D shapes and lines in the scene
 */
class Shape2DManager {
    constructor(scene, selectionManager = null, uiManager = null) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.uiManager = uiManager;
        this.shapes = [];
        this.lines = [];
        this.currentShape = null;
        this.isDrawing = false;
        this.drawingPoints = [];
        this.currentDrawingMode = null; // 'rectangle', 'circle', 'polyline'
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        this.tempShape = null;
        
        // Temporary materials for preview shapes
        this.tempRectMaterial = null;
        this.tempCircleMaterial = null;
        this.tempPolygonMaterial = null;
        
        // Throttling for update functions to prevent WebGL errors
        this.lastUpdateTime = 0;
        this.updateThrottle = 16; // ~60fps
        
        // Shape counters for unique naming
        this.shapeCounters = {
            rectangle: 0,
            circle: 0
        };
        
    }

    /**
     * Set UIManager reference for standardized colors
     */
    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    /**
     * Generate unique name for shape
     */
    generateUniqueName(shapeType) {
        this.shapeCounters[shapeType]++;
        return `${shapeType}_${this.shapeCounters[shapeType]}`;
    }

    /**
     * Create a simple line
     */
    createLine(startPoint, endPoint, color = new BABYLON.Color3(1, 1, 1)) {
        const points = [startPoint, endPoint];
        const line = BABYLON.MeshBuilder.CreateLines("line", {
            points: points,
            colors: [color, color]
        }, this.scene);
        
        this.lines.push(line);
        return line;
    }

    /**
     * Create a closed polygon with surface
     */
    createPolygon(points, color = new BABYLON.Color3(1, 1, 1)) {
        if (points.length < 3) {
            return null;
        }

        // Ensure the polygon is closed by adding the first point at the end
        const closedPoints = [...points];
        if (closedPoints.length > 0) {
            closedPoints.push(closedPoints[0].clone());
        }

        // Create the outline
        const line = BABYLON.MeshBuilder.CreateLines("polygon", {
            points: closedPoints,
            colors: closedPoints.map(() => color)
        }, this.scene);
        
        this.lines.push(line);

        // Create the surface (polygon)
        const polygon = this.createPolygonSurface(points, color);
        if (polygon) {
            this.shapes.push(polygon);
            // Make shape selectable
            this.makeShapeSelectable(polygon);
        }
        
        return line;
    }

    /**
     * Create a polygon surface from points
     */
    createPolygonSurface(points, color = new BABYLON.Color3(1, 1, 1)) {
        if (points.length < 3) {
            return null;
        }

        // Create a custom mesh for the polygon surface
        const polygon = new BABYLON.Mesh("polygon", this.scene);
        
        // Create vertices for the polygon
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Add vertices
        points.forEach((point, index) => {
            positions.push(point.x, point.y, point.z);
            normals.push(0, 1, 0); // All normals point up
            uvs.push(0.5, 0.5); // Simple UV mapping
        });

        // Create triangles using fan triangulation
        for (let i = 1; i < points.length - 1; i++) {
            indices.push(0, i, i + 1);
        }

        // Create vertex data
        const vertexData = new BABYLON.VertexData();
        vertexData.positions = positions;
        vertexData.indices = indices;
        vertexData.normals = normals;
        vertexData.uvs = uvs;

        // Apply vertex data to mesh
        vertexData.applyToMesh(polygon);

        // Set position slightly above ground to avoid z-fighting
        polygon.position.y = 0.01;
        polygon.renderingGroupId = 1; // Higher rendering priority than ground

        // Create material
        const material = new BABYLON.StandardMaterial("polygonMaterial", this.scene);
        material.diffuseColor = color;
        material.backFaceCulling = false;
        material.alpha = 0.7; // Semi-transparent
        polygon.material = material;

        return polygon;
    }

    /**
     * Create a rectangle
     */
    createRectangle(width, height, position = new BABYLON.Vector3(0, 0, 0), color = new BABYLON.Color3(1, 0, 0)) {
        const uniqueName = this.generateUniqueName('rectangle');
        const rectangle = BABYLON.MeshBuilder.CreateGround(uniqueName, {
            width: width,
            height: height
        }, this.scene);
        
        rectangle.position = position;
        rectangle.renderingGroupId = 1; // Higher rendering priority than ground
        
        const material = new BABYLON.StandardMaterial(`${uniqueName}Material`, this.scene);
        material.diffuseColor = color;
        material.backFaceCulling = false; // برای نمایش از هر دو طرف
        rectangle.material = material;
        
        // Add user data
        rectangle.userData = {
            type: 'land',
            shapeType: 'rectangle',
            dimensions: { width, height }
        };
        
        this.shapes.push(rectangle);
        
        // Make shape selectable
        this.makeShapeSelectable(rectangle);
        
        return rectangle;
    }

    /**
     * Create a circle
     */
    createCircle(radius, position = new BABYLON.Vector3(0, 0, 0), color = new BABYLON.Color3(0, 1, 0)) {
        const uniqueName = this.generateUniqueName('circle');
        const circle = BABYLON.MeshBuilder.CreateDisc(uniqueName, {
            radius: radius,
            tessellation: 32
        }, this.scene);
        
        circle.position = position;
        circle.rotation.x = Math.PI / 2; // Rotate to be horizontal on ground (corrected)
        circle.renderingGroupId = 1; // Higher rendering priority than ground
        
        const material = new BABYLON.StandardMaterial(`${uniqueName}Material`, this.scene);
        material.diffuseColor = color;
        material.backFaceCulling = false;
        circle.material = material;
        
        // Add user data
        circle.userData = {
            type: 'land',
            shapeType: 'circle',
            dimensions: { radius }
        };
        
        this.shapes.push(circle);
        
        // Make shape selectable
        this.makeShapeSelectable(circle);
        
        return circle;
    }

    /**
     * Create a triangle
     */
    createTriangle(size, position = new BABYLON.Vector3(0, 0, 0), color = new BABYLON.Color3(0, 0, 1)) {
        const triangle = BABYLON.MeshBuilder.CreateGround("triangle", {
            width: size,
            height: size,
            subdivisions: 2
        }, this.scene);
        
        triangle.position = position;
        triangle.renderingGroupId = 1; // Higher rendering priority than ground
        
        const material = new BABYLON.StandardMaterial("triangleMaterial", this.scene);
        material.diffuseColor = color;
        material.backFaceCulling = false;
        triangle.material = material;
        
        this.shapes.push(triangle);
        
        // Make shape selectable
        this.makeShapeSelectable(triangle);
        
        return triangle;
    }

    /**
     * Create 3D text
     */
    createText(text, size = 2, position = new BABYLON.Vector3(0, 0, 0), color = new BABYLON.Color3(1, 1, 1)) {
        const textMesh = BABYLON.MeshBuilder.CreateText("text", text, {
            size: size,
            depth: 0.1
        }, this.scene);
        
        textMesh.position = position;
        textMesh.renderingGroupId = 1; // Higher rendering priority than ground
        
        const material = new BABYLON.StandardMaterial("textMaterial", this.scene);
        material.diffuseColor = color;
        textMesh.material = material;
        
        this.shapes.push(textMesh);
        
        // Make shape selectable
        this.makeShapeSelectable(textMesh);
        
        return textMesh;
    }

    /**
     * Make a shape selectable
     */
    makeShapeSelectable(shape) {
        if (!this.selectionManager) {
            return;
        }
        
        // Add shape to selection manager's selectable objects
        if (this.selectionManager.addSelectableObject) {
            this.selectionManager.addSelectableObject(shape);
        }
        
        // Set shape properties for selection
        shape.isPickable = true;
        shape.checkCollisions = false;
        
    }

    /**
     * Start drawing mode
     */
    startDrawing() {
        this.isDrawing = true;
        this.drawingPoints = [];
    }

    /**
     * Add point to current drawing
     */
    addDrawingPoint(point) {
        if (this.isDrawing) {
            this.drawingPoints.push(point);
        }
    }

    /**
     * Finish current drawing
     */
    finishDrawing() {
        if (this.isDrawing && this.drawingPoints.length > 1) {
            const line = this.createPolyline(this.drawingPoints, new BABYLON.Color3(1, 1, 0));
            this.isDrawing = false;
            this.drawingPoints = [];
            return line;
        }
        return null;
    }

    /**
     * Cancel current drawing
     */
    cancelDrawing() {
        this.isDrawing = false;
        this.drawingPoints = [];
    }

    /**
     * Remove a specific shape
     */
    removeShape(shape) {
        if (!shape) return;

        // Remove from shapes array
        const shapeIndex = this.shapes.indexOf(shape);
        if (shapeIndex !== -1) {
            this.shapes.splice(shapeIndex, 1);
        }

        // Remove from lines array
        const lineIndex = this.lines.indexOf(shape);
        if (lineIndex !== -1) {
            this.lines.splice(lineIndex, 1);
        }

        // Dispose the shape
        if (shape.dispose) {
            shape.dispose();
        }

    }

    /**
     * Clear all shapes
     */
    clearAllShapes() {
        this.shapes.forEach(shape => shape.dispose());
        this.lines.forEach(line => line.dispose());
        this.shapes = [];
        this.lines = [];
    }

    /**
     * Clear all lines
     */
    clearAllLines() {
        this.lines.forEach(line => line.dispose());
        this.lines = [];
    }

    /**
     * Get all shapes
     */
    getAllShapes() {
        return [...this.shapes, ...this.lines];
    }

    /**
     * Start interactive drawing mode
     */
    startInteractiveDrawing(mode) {
        this.currentDrawingMode = mode;
        this.isDrawing = true;
        this.drawingPoints = [];
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        this.tempShape = null;
    }

    /**
     * Stop interactive drawing mode
     */
    stopInteractiveDrawing() {
        this.currentDrawingMode = null;
        this.isDrawing = false;
        this.drawingPoints = [];
        this.drawingStartPoint = null;
        this.drawingEndPoint = null;
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Clean up temporary materials to prevent WebGL errors
        this.cleanupTempMaterials();
        
        // Notify UI manager to re-enable camera controls
        if (this.onDrawingStopped) {
            this.onDrawingStopped();
        }
        
    }

    /**
     * Clean up temporary materials to prevent WebGL errors
     */
    cleanupTempMaterials() {
        if (this.tempRectMaterial) {
            this.tempRectMaterial.dispose();
            this.tempRectMaterial = null;
        }
        if (this.tempCircleMaterial) {
            this.tempCircleMaterial.dispose();
            this.tempCircleMaterial = null;
        }
        if (this.tempPolygonMaterial) {
            this.tempPolygonMaterial.dispose();
            this.tempPolygonMaterial = null;
        }
    }

    /**
     * Dispose all resources to prevent memory leaks
     */
    dispose() {
        // Stop any active drawing
        this.stopInteractiveDrawing();
        
        // Dispose all shapes
        this.shapes.forEach(shape => {
            if (shape && shape.dispose) {
                shape.dispose();
            }
        });
        this.shapes = [];
        
        // Dispose all lines
        this.lines.forEach(line => {
            if (line && line.dispose) {
                line.dispose();
            }
        });
        this.lines = [];
        
        // Clean up temporary materials
        this.cleanupTempMaterials();
        
    }

    /**
     * Handle mouse down for interactive drawing
     */
    onMouseDown(point) {
        if (!this.isDrawing || !this.currentDrawingMode) return;

        this.drawingStartPoint = point.clone();
        this.drawingEndPoint = point.clone(); // Initialize end point to avoid issues
        
        // Reset update throttling for new drawing
        this.lastUpdateTime = 0;
    }

    /**
     * Handle mouse move for interactive drawing
     */
    onMouseMove(point) {
        if (!this.isDrawing || !this.currentDrawingMode || !this.drawingStartPoint) return;

        this.drawingEndPoint = point.clone();

        // Update temporary shape based on mode
        switch (this.currentDrawingMode) {
            case 'rectangle':
                this.updateTempRectangle();
                break;
            case 'circle':
                this.updateTempCircle();
                break;
        }
    }

    /**
     * Handle mouse up for interactive drawing
     */
    onMouseUp(point) {
        if (!this.isDrawing || !this.currentDrawingMode || !this.drawingStartPoint) {
            return;
        }

        this.drawingEndPoint = point.clone();

        // Create final shape based on mode
        switch (this.currentDrawingMode) {
            case 'rectangle':
                this.finishRectangle();
                break;
            case 'circle':
                this.finishCircle();
                break;
        }
    }

    /**
     * Create temporary rectangle for preview
     */
    createTempRectangle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;

        // Dispose existing temp shape if it exists
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }

        // Calculate actual width and height (can be negative when moving back)
        const width = this.drawingEndPoint.x - this.drawingStartPoint.x;
        const height = this.drawingEndPoint.z - this.drawingStartPoint.z;
        
        // Calculate center position (always between start and end points)
        const centerX = (this.drawingStartPoint.x + this.drawingEndPoint.x) / 2;
        const centerZ = (this.drawingStartPoint.z + this.drawingEndPoint.z) / 2;
        
        // Calculate actual dimensions (always positive for mesh creation)
        const actualWidth = Math.max(Math.abs(width), 0.1);
        const actualHeight = Math.max(Math.abs(height), 0.1);

        this.tempShape = BABYLON.MeshBuilder.CreateGround("tempRectangle", {
            width: actualWidth,
            height: actualHeight
        }, this.scene);

        this.tempShape.position = new BABYLON.Vector3(centerX, 0.02, centerZ);
        this.tempShape.renderingGroupId = 2; // Higher rendering priority than ground and other shapes

        // Use a shared material to avoid creating too many materials
        if (!this.tempRectMaterial) {
            this.tempRectMaterial = new BABYLON.StandardMaterial("tempRectMaterial", this.scene);
            // Use standardized preview color
            const previewColor = this.uiManager ? this.uiManager.getDefaultPreviewColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
            const previewAlpha = this.uiManager ? this.uiManager.getDefaultPreviewAlpha() : 0.5;
            this.tempRectMaterial.diffuseColor = previewColor;
            this.tempRectMaterial.alpha = previewAlpha;
        }
        this.tempShape.material = this.tempRectMaterial;
        
        // Make temp shape non-selectable
        this.tempShape.isPickable = false;
    }

    /**
     * Update temporary rectangle for preview (optimized to avoid flickering)
     */
    updateTempRectangle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;

        // Throttle updates to prevent WebGL errors
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottle) {
            return;
        }
        this.lastUpdateTime = now;

        // Calculate actual width and height (can be negative when moving back)
        const width = this.drawingEndPoint.x - this.drawingStartPoint.x;
        const height = this.drawingEndPoint.z - this.drawingStartPoint.z;
        
        // Calculate center position (always between start and end points)
        const centerX = (this.drawingStartPoint.x + this.drawingEndPoint.x) / 2;
        const centerZ = (this.drawingStartPoint.z + this.drawingEndPoint.z) / 2;
        
        // Calculate actual dimensions (always positive for mesh creation)
        const actualWidth = Math.max(Math.abs(width), 0.1);
        const actualHeight = Math.max(Math.abs(height), 0.1);

        // If temp shape doesn't exist, create it
        if (!this.tempShape) {
            this.createTempRectangle();
            return;
        }

        // Update existing temp shape properties
        this.tempShape.position = new BABYLON.Vector3(centerX, 0.02, centerZ);
        
        // Check if boundingInfo exists
        if (this.tempShape.geometry && this.tempShape.geometry.boundingInfo) {
            const originalWidth = this.tempShape.geometry.boundingInfo.boundingBox.extendSize.x * 2;
            const originalHeight = this.tempShape.geometry.boundingInfo.boundingBox.extendSize.z * 2;
            this.tempShape.scaling.x = actualWidth / originalWidth;
            this.tempShape.scaling.z = actualHeight / originalHeight;
        } else {
            // Fallback: recreate the shape if boundingInfo is not available
            this.tempShape.dispose();
            this.tempShape = null;
            this.createTempRectangle();
        }
    }

    /**
     * Create temporary circle for preview
     */
    createTempCircle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;

        // Dispose existing temp shape if it exists
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }

        // Calculate distance from center (start point) to current mouse position
        const distance = BABYLON.Vector3.Distance(this.drawingStartPoint, this.drawingEndPoint);
        const radius = Math.max(distance, 0.1);

        this.tempShape = BABYLON.MeshBuilder.CreateDisc("tempCircle", {
            radius: radius,
            tessellation: 32
        }, this.scene);

        // Circle center is always at the start point (slightly above ground to avoid z-fighting)
        this.tempShape.position = new BABYLON.Vector3(this.drawingStartPoint.x, 0.02, this.drawingStartPoint.z);
        this.tempShape.rotation.x = Math.PI / 2; // Rotate to be horizontal on ground
        this.tempShape.renderingGroupId = 2; // Higher rendering priority than ground and other shapes

        // Use a shared material to avoid creating too many materials
        if (!this.tempCircleMaterial) {
            this.tempCircleMaterial = new BABYLON.StandardMaterial("tempCircleMaterial", this.scene);
            // Use standardized preview color
            const previewColor = this.uiManager ? this.uiManager.getDefaultPreviewColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
            const previewAlpha = this.uiManager ? this.uiManager.getDefaultPreviewAlpha() : 0.5;
            this.tempCircleMaterial.diffuseColor = previewColor;
            this.tempCircleMaterial.alpha = previewAlpha;
        }
        this.tempShape.material = this.tempCircleMaterial;
        
        // Make temp shape non-selectable
        this.tempShape.isPickable = false;
    }

    /**
     * Update temporary circle for preview (optimized to avoid flickering)
     */
    updateTempCircle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;

        // Throttle updates to prevent WebGL errors
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottle) {
            return;
        }
        this.lastUpdateTime = now;

        // Calculate distance from center (start point) to current mouse position
        const distance = BABYLON.Vector3.Distance(this.drawingStartPoint, this.drawingEndPoint);
        const radius = Math.max(distance, 0.1);

        // If temp shape doesn't exist, create it
        if (!this.tempShape) {
            this.createTempCircle();
            return;
        }

        // Update existing temp shape properties
        // Check if boundingInfo exists
        if (this.tempShape.geometry && this.tempShape.geometry.boundingInfo) {
            const originalRadius = this.tempShape.geometry.boundingInfo.boundingBox.extendSize.x * 2;
            const scaleFactor = radius / originalRadius;
            this.tempShape.scaling.x = scaleFactor;
            this.tempShape.scaling.z = scaleFactor;
        } else {
            // Fallback: recreate the shape if boundingInfo is not available
            this.tempShape.dispose();
            this.tempShape = null;
            this.createTempCircle();
        }
    }

    /**
     * Update temporary polygon for preview
     */
    updateTempPolygon(currentPoint) {
        if (this.drawingPoints.length < 2) return;

        // Throttle updates to prevent WebGL errors
        const now = Date.now();
        if (now - this.lastUpdateTime < this.updateThrottle) {
            return;
        }
        this.lastUpdateTime = now;

        // Create preview points (all existing points + current mouse position)
        const previewPoints = [...this.drawingPoints, currentPoint];
        
        // Remove previous temp polygon
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }
        
        // Create temporary polygon surface
        this.tempShape = this.createPolygonSurface(previewPoints, new BABYLON.Color3(1, 1, 0)); // Yellow for preview
        
        if (this.tempShape) {
            // Use shared material for polygon preview
            if (!this.tempPolygonMaterial) {
                this.tempPolygonMaterial = new BABYLON.StandardMaterial("tempPolygonMaterial", this.scene);
                // Use standardized preview color
                const previewColor = this.uiManager ? this.uiManager.getDefaultPreviewColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
                const previewAlpha = this.uiManager ? this.uiManager.getDefaultPreviewAlpha() : 0.5;
                this.tempPolygonMaterial.diffuseColor = previewColor;
                this.tempPolygonMaterial.alpha = previewAlpha;
            }
            this.tempShape.material = this.tempPolygonMaterial;
            this.tempShape.isPickable = false;
            this.tempShape.renderingGroupId = 2; // Higher rendering priority
        }
    }

    /**
     * Finish rectangle drawing
     */
    finishRectangle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) return;

        // Calculate actual width and height (can be negative when moving back)
        const width = this.drawingEndPoint.x - this.drawingStartPoint.x;
        const height = this.drawingEndPoint.z - this.drawingStartPoint.z;
        
        // Calculate center position (always between start and end points)
        const centerX = (this.drawingStartPoint.x + this.drawingEndPoint.x) / 2;
        const centerZ = (this.drawingStartPoint.z + this.drawingEndPoint.z) / 2;

        // Calculate actual dimensions (always positive for mesh creation)
        const actualWidth = Math.max(Math.abs(width), 0.1);
        const actualHeight = Math.max(Math.abs(height), 0.1);

        // Remove temp shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }

        // Create final rectangle
        // Use standardized color for final shape
        const finalColor = this.uiManager ? this.uiManager.getDefaultDrawingColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
        const rectangle = this.createRectangle(
            actualWidth,
            actualHeight,
            new BABYLON.Vector3(centerX, 0, centerZ),
            finalColor
        );

        this.stopInteractiveDrawing();
        return rectangle;
    }

    /**
     * Finish circle drawing
     */
    finishCircle() {
        if (!this.drawingStartPoint || !this.drawingEndPoint) {
            return;
        }

        // Calculate distance from center (start point) to final mouse position
        const distance = BABYLON.Vector3.Distance(this.drawingStartPoint, this.drawingEndPoint);
        const radius = Math.max(distance, 0.1);

        // Remove temp shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }

        // Create final circle with center at start point
        // Use standardized color for final shape
        const finalColor = this.uiManager ? this.uiManager.getDefaultDrawingColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
        const circle = this.createCircle(
            radius,
            new BABYLON.Vector3(this.drawingStartPoint.x, 0, this.drawingStartPoint.z),
            finalColor
        );

        this.stopInteractiveDrawing();
        return circle;
    }

    /**
     * Finish polygon drawing
     */
    finishPolygon() {
        if (this.drawingPoints.length < 3) {
            this.stopInteractiveDrawing();
            return null;
        }

        // Remove temp shape
        if (this.tempShape) {
            this.tempShape.dispose();
            this.tempShape = null;
        }

        // Use standardized color for final shape
        const finalColor = this.uiManager ? this.uiManager.getDefaultDrawingColor() : new BABYLON.Color3(0.4, 0.3, 0.2);
        const polygon = this.createPolygon(
            this.drawingPoints,
            finalColor
        );

        this.stopInteractiveDrawing();
        return polygon;
    }

    /**
     * Get current drawing mode
     */
    getCurrentDrawingMode() {
        return this.currentDrawingMode;
    }

    /**
     * Check if currently drawing
     */
    isCurrentlyDrawing() {
        return this.isDrawing;
    }

    /**
     * Dispose of the manager
     */
    dispose() {
        this.stopInteractiveDrawing();
        this.clearAllShapes();
    }
}
