/**
 * MeasurementManager - Manages distance and area measurement tools
 */
class MeasurementManager {
    constructor(scene, camera, canvas, selectionManager, uiManager = null) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.selectionManager = selectionManager;
        this.uiManager = uiManager;
        
        // Measurement state
        this.activeTool = null; // 'distance' or 'area'
        this.isActive = false;
        
        // Distance measurement state
        this.distancePoints = [];
        this.distanceLines = [];
        this.distanceLabels = []; // Now stores HTML elements instead of 3D meshes
        
        // Area measurement state
        this.areaPoints = [];
        this.areaPolygon = null;
        this.areaLabel = null; // Now stores HTML element instead of 3D mesh
        
        // Event handlers
        this.onPointerDown = null;
        this.onPointerMove = null;
        this.onPointerUp = null;
        this.onContextMenu = null;
        this.onKeyDown = null;
        
        // Label position update observer
        this.labelPositionObserver = null;
        
        // Container for HTML labels
        this.labelContainer = null;
        this.setupLabelContainer();
        
        // Setup initial state
        this.setupEventListeners();
        this.setupLabelPositionObserver();
    }
    
    /**
     * Setup container for HTML labels
     */
    setupLabelContainer() {
        // Create container if it doesn't exist
        if (!this.labelContainer) {
            this.labelContainer = document.createElement('div');
            this.labelContainer.id = 'measurement-labels-container';
            this.labelContainer.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10000;
            `;
            document.body.appendChild(this.labelContainer);
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Event handlers will be attached/detached when tools are activated/deactivated
    }
    
    /**
     * Setup observer for label position updates
     */
    setupLabelPositionObserver() {
        if (this.labelPositionObserver) {
            return; // Already set up
        }
        
        this.labelPositionObserver = this.scene.onBeforeRenderObservable.add(() => {
            this.updateLabelPositions();
        });
    }
    
    /**
     * Remove label position observer
     */
    removeLabelPositionObserver() {
        if (this.labelPositionObserver) {
            this.scene.onBeforeRenderObservable.remove(this.labelPositionObserver);
            this.labelPositionObserver = null;
        }
    }
    
    /**
     * Convert 3D world position to 2D screen coordinates
     */
    worldToScreen(worldPosition) {
        if (!this.camera || !this.canvas) return null;
        
        const viewport = this.camera.viewport.toGlobal(
            this.scene.getEngine().getRenderWidth(),
            this.scene.getEngine().getRenderHeight()
        );
        
        const vector = BABYLON.Vector3.Project(
            worldPosition,
            BABYLON.Matrix.Identity(),
            this.scene.getTransformMatrix(),
            viewport
        );
        
        if (vector.z < 0 || vector.z > 1) {
            return null; // Behind camera or too far
        }
        
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: rect.left + vector.x,
            y: rect.top + vector.y
        };
    }
    
    /**
     * Update label positions based on 3D world positions
     */
    updateLabelPositions() {
        if (!this.camera || !this.canvas) return;
        
        // Update distance labels
        this.distanceLabels.forEach((label) => {
            if (label && label.element && label.worldPosition) {
                const screenPos = this.worldToScreen(label.worldPosition);
                if (screenPos) {
                    label.element.style.left = screenPos.x + 'px';
                    label.element.style.top = screenPos.y + 'px';
                    label.element.style.display = 'block';
                } else {
                    label.element.style.display = 'none';
                }
            }
        });
        
        // Update area label
        if (this.areaLabel && this.areaLabel.element && this.areaLabel.worldPosition) {
            const screenPos = this.worldToScreen(this.areaLabel.worldPosition);
            if (screenPos) {
                this.areaLabel.element.style.left = screenPos.x + 'px';
                this.areaLabel.element.style.top = screenPos.y + 'px';
                this.areaLabel.element.style.display = 'block';
            } else {
                this.areaLabel.element.style.display = 'none';
            }
        }
    }
    
    /**
     * Activate measurement tool
     * @param {string} toolName - 'distance' or 'area'
     */
    activateTool(toolName) {
        console.log(`[MEASUREMENT] activateTool called with: ${toolName}`);
        
        if (this.isActive && this.activeTool === toolName) {
            console.log('[MEASUREMENT] Tool already active, returning');
            return; // Already active
        }
        
        // Deactivate current tool if any
        this.deactivateTool();
        
        this.activeTool = toolName;
        this.isActive = true;
        
        console.log(`[MEASUREMENT] Tool state set - activeTool: ${this.activeTool}, isActive: ${this.isActive}`);
        
        // Note: Camera controls are disabled by UIManager, not here
        
        // Attach event listeners
        this.attachEventListeners();
        
        console.log(`[MEASUREMENT] Measurement tool activated: ${toolName}`);
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
        
        // Re-enable camera controls
        if (this.uiManager && this.uiManager.enableCameraControls) {
            this.uiManager.enableCameraControls();
        }
        
        this.activeTool = null;
        this.isActive = false;
        
        console.log('Measurement tool deactivated');
    }
    
    /**
     * Attach event listeners
     */
    attachEventListeners() {
        console.log('[MEASUREMENT] Attaching event listeners');
        
        this.onPointerDown = (event) => this.handlePointerDown(event);
        this.onPointerMove = (event) => this.handlePointerMove(event);
        this.onPointerUp = (event) => this.handlePointerUp(event);
        this.onKeyDown = (event) => this.handleKeyDown(event);
        this.onContextMenu = (event) => {
            // Prevent context menu when measurement tool is active
            if (this.isActive) {
                event.preventDefault();
            }
        };
        
        this.canvas.addEventListener('pointerdown', this.onPointerDown);
        this.canvas.addEventListener('pointermove', this.onPointerMove);
        this.canvas.addEventListener('pointerup', this.onPointerUp);
        this.canvas.addEventListener('contextmenu', this.onContextMenu);
        document.addEventListener('keydown', this.onKeyDown);
        
        console.log('[MEASUREMENT] Event listeners attached');
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
        if (this.onContextMenu) {
            this.canvas.removeEventListener('contextmenu', this.onContextMenu);
        }
        if (this.onKeyDown) {
            document.removeEventListener('keydown', this.onKeyDown);
        }
        
        this.onPointerDown = null;
        this.onPointerMove = null;
        this.onPointerUp = null;
        this.onContextMenu = null;
        this.onKeyDown = null;
    }
    
    /**
     * Handle pointer down event
     */
    handlePointerDown(event) {
        if (!this.isActive) {
            console.log('[MEASUREMENT] Tool not active, ignoring pointer down');
            return;
        }
        
        // Check for right-click (button 2) to deactivate tool
        if (event.button === 2 || event.which === 3) {
            console.log('[MEASUREMENT] Right-click detected, deactivating tool');
            // Clear current measurement and deactivate
            if (this.activeTool === 'distance') {
                this.clearDistanceMeasurement();
            } else if (this.activeTool === 'area') {
                this.clearAreaMeasurement();
            }
            // Deactivate tool (this will also re-enable camera controls)
            this.deactivateTool();
            
            // Remove active class from measurement tools
            const measurementTools = document.querySelectorAll('#measurementPanel .tool-item');
            measurementTools.forEach(tool => tool.classList.remove('active'));
            
            // Prevent context menu from showing
            event.preventDefault();
            return;
        }
        
        // Only process left-click (button 0)
        if (event.button !== 0 && event.which !== 1) {
            return;
        }
        
        console.log('[MEASUREMENT] Pointer down event:', event.offsetX, event.offsetY);
        
        // Get pick result - try picking any mesh first to debug
        const pickResult = this.scene.pick(
            event.offsetX || event.clientX,
            event.offsetY || event.clientY,
            (mesh) => {
                // Only pick ground plane
                const isGround = mesh.name === 'earth' || mesh.name === 'ground';
                if (isGround) {
                    console.log('[MEASUREMENT] Picked ground mesh:', mesh.name);
                }
                return isGround;
            }
        );
        
        console.log('[MEASUREMENT] Pick result:', {
            hit: pickResult.hit,
            pickedPoint: pickResult.pickedPoint,
            pickedMesh: pickResult.pickedMesh ? pickResult.pickedMesh.name : null
        });
        
        if (pickResult.hit && pickResult.pickedPoint) {
            console.log('[MEASUREMENT] Adding point:', pickResult.pickedPoint);
            if (this.activeTool === 'distance') {
                this.addDistancePoint(pickResult.pickedPoint);
            } else if (this.activeTool === 'area') {
                this.addAreaPoint(pickResult.pickedPoint);
            }
        } else {
            console.log('[MEASUREMENT] No hit or no picked point');
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
            // Deactivate tool (this will also re-enable camera controls)
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
        console.log('[MEASUREMENT] Adding distance point:', point);
        this.distancePoints.push(point.clone());
        console.log('[MEASUREMENT] Total distance points:', this.distancePoints.length);
        
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
        console.log('[MEASUREMENT] Updating distance measurement, points:', this.distancePoints.length);
        
        // Clear existing lines and labels
        this.clearDistanceLines();
        
        if (this.distancePoints.length < 2) {
            console.log('[MEASUREMENT] Not enough points for distance measurement');
            return;
        }
        
        // Create lines between points
        for (let i = 0; i < this.distancePoints.length - 1; i++) {
            const start = this.distancePoints[i];
            const end = this.distancePoints[i + 1];
            
            console.log(`[MEASUREMENT] Creating line ${i} from`, start, 'to', end);
            
            // Create line
            const line = BABYLON.MeshBuilder.CreateLines(`distance_line_${i}`, {
                points: [start, end],
                updatable: true
            }, this.scene);
            line.color = new BABYLON.Color3(1, 0, 0); // Red
            line.renderingGroupId = 2; // Higher rendering group for better visibility
            this.distanceLines.push(line);
            
            console.log(`[MEASUREMENT] Line ${i} created:`, line.name, 'visible:', line.isVisible);
            
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
        console.log(`[MEASUREMENT] Total distance: ${totalDistance.toFixed(2)} units`);
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
        line.color = new BABYLON.Color3(1, 0, 0); // Red
        line.renderingGroupId = 2; // Higher rendering group for better visibility
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
            if (label.element && label.element.parentNode) {
                label.element.parentNode.removeChild(label.element);
            }
        });
        this.distanceLabels = [];
    }
    
    /**
     * Create distance label as HTML popup (similar to drawing coordinates tooltip style)
     */
    createDistanceLabel(position, distance, index) {
        const text = `${distance.toFixed(2)} m`;
        
        // Create HTML element for label
        const labelElement = document.createElement('div');
        labelElement.className = 'measurement-label';
        labelElement.textContent = text;
        labelElement.style.cssText = `
            position: fixed;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.85);
            color: #ffffff;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            white-space: nowrap;
            z-index: 10001;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: none;
        `;
        
        // Add to container
        if (this.labelContainer) {
            this.labelContainer.appendChild(labelElement);
        }
        
        // Store world position for position updates
        const worldPosition = position.clone();
        worldPosition.y += 0.5; // Offset above ground
        
        return {
            element: labelElement,
            worldPosition: worldPosition
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
            if (this.areaLabel.element && this.areaLabel.element.parentNode) {
                this.areaLabel.element.parentNode.removeChild(this.areaLabel.element);
            }
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
        polygon.color = new BABYLON.Color3(1, 0, 0); // Red
        polygon.renderingGroupId = 2; // Higher rendering group for better visibility
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
        polygon.color = new BABYLON.Color3(1, 0, 0); // Red
        polygon.renderingGroupId = 2; // Higher rendering group for better visibility
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
            if (this.areaLabel.element && this.areaLabel.element.parentNode) {
                this.areaLabel.element.parentNode.removeChild(this.areaLabel.element);
            }
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
     * Create area label as HTML popup (similar to drawing coordinates tooltip style)
     */
    createAreaLabel(position, area) {
        const text = `${area.toFixed(2)} m²`;
        
        // Create HTML element for label
        const labelElement = document.createElement('div');
        labelElement.className = 'measurement-label';
        labelElement.textContent = text;
        labelElement.style.cssText = `
            position: fixed;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.85);
            color: #ffffff;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            white-space: nowrap;
            z-index: 10001;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            display: none;
        `;
        
        // Add to container
        if (this.labelContainer) {
            this.labelContainer.appendChild(labelElement);
        }
        
        // Store world position for position updates
        const worldPosition = position.clone();
        worldPosition.y += 0.5; // Offset above ground
        
        return {
            element: labelElement,
            worldPosition: worldPosition
        };
    }
}
