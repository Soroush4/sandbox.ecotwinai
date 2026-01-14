/**
 * MeasurementManager - Manages distance and area measurement tools
 */
class MeasurementManager {
    constructor(scene, camera, canvas, selectionManager) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.selectionManager = selectionManager;
        
        // Measurement state
        this.activeTool = null; // 'distance' or 'area'
        this.isActive = false;
        
        // Distance measurement state
        this.distancePoints = [];
        this.distanceLines = [];
        this.distanceLabels = [];
        
        // Area measurement state
        this.areaPoints = [];
        this.areaPolygon = null;
        this.areaLabel = null;
        
        // Event handlers
        this.onPointerDown = null;
        this.onPointerMove = null;
        this.onPointerUp = null;
        this.onKeyDown = null;
        
        // Setup initial state
        this.setupEventListeners();
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Event handlers will be attached/detached when tools are activated/deactivated
    }
    
    /**
     * Activate measurement tool
     * @param {string} toolName - 'distance' or 'area'
     */
    activateTool(toolName) {
        if (this.isActive && this.activeTool === toolName) {
            return; // Already active
        }
        
        // Deactivate current tool if any
        this.deactivateTool();
        
        this.activeTool = toolName;
        this.isActive = true;
        
        // Disable camera controls when measurement tool is active
        if (this.camera && this.camera.inputs) {
            this.camera.inputs.attached.keyboard.detachControls();
            this.camera.inputs.attached.mousewheel.detachControls();
        }
        
        // Attach event listeners
        this.attachEventListeners();
        
        console.log(`Measurement tool activated: ${toolName}`);
    }
    
    /**
     * Deactivate measurement tool
     */
    deactivateTool() {
        if (!this.isActive) {
            return;
        }
        
        // Clear measurements
        this.clearDistanceMeasurement();
        this.clearAreaMeasurement();
        
        // Detach event listeners
        this.detachEventListeners();
        
        // Note: Camera controls are re-enabled by UIManager
        
        this.activeTool = null;
        this.isActive = false;
        
        console.log('Measurement tool deactivated');
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        this.onPointerDown = (event) => this.handlePointerDown(event);
        this.onPointerMove = (event) => this.handlePointerMove(event);
        this.onPointerUp = (event) => this.handlePointerUp(event);
        this.onKeyDown = (event) => this.handleKeyDown(event);
        
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        document.addEventListener('keydown', this.onKeyDown);
    }
    
    /**
     * Detach event listeners
     */
    detachEventListeners() {
        if (this.onPointerDown) {
            this.canvas.removeEventListener('pointerdown', this.onPointerDown);
        }
        if (this.onPointerMove) {
            this.canvas.removeEventListener('pointermove', this.onPointerMove);
        }
        if (this.onPointerUp) {
            this.canvas.removeEventListener('pointerup', this.onPointerUp);
        }
        if (this.onKeyDown) {
            document.removeEventListener('keydown', this.onKeyDown);
        }
        
        this.onPointerDown = null;
        this.onPointerMove = null;
        this.onPointerUp = null;
        this.onKeyDown = null;
    }
    
    /**
     * Handle pointer down event
     */
    handlePointerDown(event) {
        if (!this.isActive) return;
        
        // Get pick result
        const pickResult = this.scene.pick(
            event.offsetX || event.clientX,
            event.offsetY || event.clientY,
            (mesh) => {
                // Only pick ground plane
                return mesh.name === 'earth' || mesh.name === 'ground';
            }
        );
        
        if (pickResult.hit && pickResult.pickedPoint) {
            if (this.activeTool === 'distance') {
                this.addDistancePoint(pickResult.pickedPoint);
            } else if (this.activeTool === 'area') {
                this.addAreaPoint(pickResult.pickedPoint);
            }
        }
    }
    
    /**
     * Handle pointer move event
     */
    handlePointerMove(event) {
        if (!this.isActive) return;
        
        // Get pick result for preview
        const pickResult = this.scene.pick(
            event.offsetX || event.clientX,
            event.offsetY || event.clientY,
            (mesh) => {
                return mesh.name === 'earth' || mesh.name === 'ground';
            }
        );
        
        if (pickResult.hit && pickResult.pickedPoint) {
            if (this.activeTool === 'distance') {
                this.updateDistancePreview(pickResult.pickedPoint);
            } else if (this.activeTool === 'area') {
                this.updateAreaPreview(pickResult.pickedPoint);
            }
        }
    }
    
    /**
     * Handle pointer up event
     */
    handlePointerUp(event) {
        // Handled in pointer down
    }
    
    /**
     * Handle key down event
     */
    handleKeyDown(event) {
        if (!this.isActive) return;
        
        if (event.key === 'Escape') {
            // Clear current measurement and deactivate
            if (this.activeTool === 'distance') {
                this.clearDistanceMeasurement();
            } else if (this.activeTool === 'area') {
                this.clearAreaMeasurement();
            }
            this.deactivateTool();
            
            // Remove active class from measurement tools
            const measurementTools = document.querySelectorAll('#measurementPanel .tool-item');
            measurementTools.forEach(tool => tool.classList.remove('active'));
        } else if (event.key === 'Backspace' || event.key === 'Delete') {
            // Remove last point
            if (this.activeTool === 'distance') {
                this.removeLastDistancePoint();
            } else if (this.activeTool === 'area') {
                this.removeLastAreaPoint();
            }
        }
    }
    
    /**
     * Add distance measurement point
     */
    addDistancePoint(point) {
        this.distancePoints.push(point.clone());
        
        // Update lines and labels
        this.updateDistanceMeasurement();
    }
    
    /**
     * Remove last distance point
     */
    removeLastDistancePoint() {
        if (this.distancePoints.length > 0) {
            this.distancePoints.pop();
            this.updateDistanceMeasurement();
        }
    }
    
    /**
     * Update distance measurement display
     */
    updateDistanceMeasurement() {
        // Clear existing lines and labels
        this.clearDistanceLines();
        
        if (this.distancePoints.length < 2) {
            return;
        }
        
        // Create lines between points
        for (let i = 0; i < this.distancePoints.length - 1; i++) {
            const start = this.distancePoints[i];
            const end = this.distancePoints[i + 1];
            
            // Create line
            const line = BABYLON.MeshBuilder.CreateLines(`distance_line_${i}`, {
                points: [start, end],
                updatable: true
            }, this.scene);
            line.color = new BABYLON.Color3(1, 1, 0); // Yellow
            this.distanceLines.push(line);
            
            // Calculate distance
            const distance = BABYLON.Vector3.Distance(start, end);
            
            // Create label at midpoint
            const midpoint = BABYLON.Vector3.Lerp(start, end, 0.5);
            const label = this.createDistanceLabel(midpoint, distance, i);
            this.distanceLabels.push(label);
        }
        
        // Calculate total distance
        let totalDistance = 0;
        for (let i = 0; i < this.distancePoints.length - 1; i++) {
            totalDistance += BABYLON.Vector3.Distance(this.distancePoints[i], this.distancePoints[i + 1]);
        }
        
        // Show total distance in console or UI
        console.log(`Total distance: ${totalDistance.toFixed(2)} units`);
    }
    
    /**
     * Update distance preview (for last point)
     */
    updateDistancePreview(previewPoint) {
        if (this.distancePoints.length === 0) return;
        
        // Remove preview line if exists
        const previewLine = this.scene.getMeshByName('distance_preview');
        if (previewLine) {
            previewLine.dispose();
        }
        
        // Create preview line
        const lastPoint = this.distancePoints[this.distancePoints.length - 1];
        const line = BABYLON.MeshBuilder.CreateLines('distance_preview', {
            points: [lastPoint, previewPoint],
            updatable: true
        }, this.scene);
        line.color = new BABYLON.Color3(1, 1, 0.5); // Light yellow for preview
    }
    
    /**
     * Clear distance measurement
     */
    clearDistanceMeasurement() {
        this.distancePoints = [];
        this.clearDistanceLines();
        
        // Remove preview line
        const previewLine = this.scene.getMeshByName('distance_preview');
        if (previewLine) {
            previewLine.dispose();
        }
    }
    
    /**
     * Clear distance lines and labels
     */
    clearDistanceLines() {
        this.distanceLines.forEach(line => line.dispose());
        this.distanceLines = [];
        
        this.distanceLabels.forEach(label => {
            if (label.textPlane) label.textPlane.dispose();
            if (label.textTexture) label.textTexture.dispose();
        });
        this.distanceLabels = [];
    }
    
    /**
     * Create distance label
     */
    createDistanceLabel(position, distance, index) {
        // Create dynamic texture for text
        const texture = new BABYLON.DynamicTexture(`distance_label_${index}`, { width: 256, height: 64 }, this.scene);
        const context = texture.getContext();
        context.fillStyle = 'yellow';
        context.font = 'bold 24px Arial';
        context.fillText(`${distance.toFixed(2)} m`, 10, 40);
        texture.update();
        
        // Create plane for text
        const plane = BABYLON.MeshBuilder.CreatePlane(`distance_label_plane_${index}`, {
            size: 2,
            updatable: true
        }, this.scene);
        plane.position = position.clone();
        plane.position.y += 0.5; // Offset above ground
        
        // Create material
        const material = new BABYLON.StandardMaterial(`distance_label_mat_${index}`, this.scene);
        material.diffuseTexture = texture;
        material.emissiveColor = new BABYLON.Color3(1, 1, 0);
        material.backFaceCulling = false;
        plane.material = material;
        
        // Make plane always face camera
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        return {
            textPlane: plane,
            textTexture: texture
        };
    }
    
    /**
     * Add area measurement point
     */
    addAreaPoint(point) {
        this.areaPoints.push(point.clone());
        
        // Update polygon and area
        this.updateAreaMeasurement();
    }
    
    /**
     * Remove last area point
     */
    removeLastAreaPoint() {
        if (this.areaPoints.length > 0) {
            this.areaPoints.pop();
            this.updateAreaMeasurement();
        }
    }
    
    /**
     * Update area measurement display
     */
    updateAreaMeasurement() {
        // Clear existing polygon and label
        if (this.areaPolygon) {
            this.areaPolygon.dispose();
            this.areaPolygon = null;
        }
        
        if (this.areaLabel) {
            if (this.areaLabel.textPlane) this.areaLabel.textPlane.dispose();
            if (this.areaLabel.textTexture) this.areaLabel.textTexture.dispose();
            this.areaLabel = null;
        }
        
        if (this.areaPoints.length < 3) {
            return;
        }
        
        // Create polygon from points
        const points = this.areaPoints.map(p => new BABYLON.Vector3(p.x, p.y + 0.01, p.z)); // Slightly above ground
        points.push(points[0]); // Close the polygon
        
        // Create lines for polygon outline
        const polygon = BABYLON.MeshBuilder.CreateLines('area_polygon', {
            points: points,
            updatable: true
        }, this.scene);
        polygon.color = new BABYLON.Color3(0, 1, 1); // Cyan
        this.areaPolygon = polygon;
        
        // Calculate area
        const area = this.calculatePolygonArea(this.areaPoints);
        
        // Create label at center
        const center = this.calculatePolygonCenter(this.areaPoints);
        this.areaLabel = this.createAreaLabel(center, area);
        
        console.log(`Area: ${area.toFixed(2)} square units`);
    }
    
    /**
     * Update area preview (for last point)
     */
    updateAreaPreview(previewPoint) {
        if (this.areaPoints.length < 2) return;
        
        // Remove preview polygon if exists
        const previewPolygon = this.scene.getMeshByName('area_preview');
        if (previewPolygon) {
            previewPolygon.dispose();
        }
        
        // Create preview polygon
        const points = this.areaPoints.map(p => new BABYLON.Vector3(p.x, p.y + 0.01, p.z));
        points.push(previewPoint.clone());
        points.push(this.areaPoints[0].clone()); // Close the polygon
        
        const polygon = BABYLON.MeshBuilder.CreateLines('area_preview', {
            points: points,
            updatable: true
        }, this.scene);
        polygon.color = new BABYLON.Color3(0, 1, 0.5); // Light cyan for preview
    }
    
    /**
     * Clear area measurement
     */
    clearAreaMeasurement() {
        this.areaPoints = [];
        
        if (this.areaPolygon) {
            this.areaPolygon.dispose();
            this.areaPolygon = null;
        }
        
        if (this.areaLabel) {
            if (this.areaLabel.textPlane) this.areaLabel.textPlane.dispose();
            if (this.areaLabel.textTexture) this.areaLabel.textTexture.dispose();
            this.areaLabel = null;
        }
        
        // Remove preview polygon
        const previewPolygon = this.scene.getMeshByName('area_preview');
        if (previewPolygon) {
            previewPolygon.dispose();
        }
    }
    
    /**
     * Calculate polygon area using shoelace formula
     */
    calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].z;
            area -= points[j].x * points[i].z;
        }
        return Math.abs(area) / 2;
    }
    
    /**
     * Calculate polygon center
     */
    calculatePolygonCenter(points) {
        if (points.length === 0) return BABYLON.Vector3.Zero();
        
        const center = BABYLON.Vector3.Zero();
        points.forEach(point => center.addInPlace(point));
        center.scaleInPlace(1 / points.length);
        return center;
    }
    
    /**
     * Create area label
     */
    createAreaLabel(position, area) {
        // Create dynamic texture for text
        const texture = new BABYLON.DynamicTexture('area_label', { width: 256, height: 64 }, this.scene);
        const context = texture.getContext();
        context.fillStyle = 'cyan';
        context.font = 'bold 24px Arial';
        context.fillText(`${area.toFixed(2)} m²`, 10, 40);
        texture.update();
        
        // Create plane for text
        const plane = BABYLON.MeshBuilder.CreatePlane('area_label_plane', {
            size: 2,
            updatable: true
        }, this.scene);
        plane.position = position.clone();
        plane.position.y += 0.5; // Offset above ground
        
        // Create material
        const material = new BABYLON.StandardMaterial('area_label_mat', this.scene);
        material.diffuseTexture = texture;
        material.emissiveColor = new BABYLON.Color3(0, 1, 1);
        material.backFaceCulling = false;
        plane.material = material;
        
        // Make plane always face camera
        plane.billboardMode = BABYLON.Mesh.BILLBOARDMODE_ALL;
        
        return {
            textPlane: plane,
            textTexture: texture
        };
    }
}
