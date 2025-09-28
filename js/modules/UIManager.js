/**
 * UIManager - Manages user interface interactions
 */
class UIManager {
    constructor(sceneManager, buildingGenerator, lightingManager, cameraController, gridManager, selectionManager, moveManager, rotateManager, scaleManager, shape2DManager, treeManager, polygonManager, rectangleManager, circleManager) {
        this.sceneManager = sceneManager;
        this.buildingGenerator = buildingGenerator;
        this.lightingManager = lightingManager;
        this.cameraController = cameraController;
        this.gridManager = gridManager;
        this.selectionManager = selectionManager;
        this.moveManager = moveManager;
        this.rotateManager = rotateManager;
        this.scaleManager = scaleManager;
        this.shape2DManager = shape2DManager;
        this.treeManager = treeManager;
        this.polygonManager = polygonManager;
        this.rectangleManager = rectangleManager;
        this.circleManager = circleManager;
        
        this.isInitialized = false;
        this.statsInterval = null;
        this.isGlobalMode = false; // Default to local mode
        this.preferencesListenersSetup = false; // Track if preferences listeners are setup
        this.cameraControlsDisabled = false; // Initialize camera control state
        
        this.init();
    }

    /**
     * Initialize UI
     */
    init() {
        this.setupEventListeners();
        this.setupPropertiesPopup();
        this.setupTreeEventListeners();
        this.startStatsUpdate();
        this.updateCoordinateToggleUI(); // Initialize coordinate toggle UI
        this.isInitialized = true;
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        this.setupMenuListeners();
        this.setupTransformToolsListeners();
        this.setupDrawingToolsListeners();
        this.setupDrawingEventListeners();

        // Grid toggle
        const gridToggle = document.getElementById('gridToggle');
        if (gridToggle) {
            gridToggle.addEventListener('click', () => {
                this.toggleGrid();
            });
        }


        // Reset camera button
        const resetCameraBtn = document.getElementById('resetCamera');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.resetCamera();
            });
        }

        // Range inputs
        this.setupRangeInputs();
        
        // Selection events
        this.setupSelectionEvents();
    }

    /**
     * Setup selection events
     */
    setupSelectionEvents() {
        // Listen for selection changes
        window.addEventListener('selectionChanged', (event) => {
            const { selectedObjects, count } = event.detail;
            this.onSelectionChanged(selectedObjects, count);
        });
    }

    /**
     * Handle selection changes
     */
    onSelectionChanged(selectedObjects, count) {
        
        // Update UI based on selection
        if (count > 0) {
            
            // Show selection info
            this.showSelectionInfo(count);
            
            // Show properties popup for 2D shapes, rectangles, and buildings only when select tool is active
            if (count === 1 && this.isSelectToolActive()) {
                const selectedObject = selectedObjects[0];
                if (this.is2DShape(selectedObject) || this.getShapeType(selectedObject) === 'rectangle' || this.getShapeType(selectedObject) === 'building') {
                    this.showPropertiesPopup(selectedObject);
                }
            }
        } else {
            this.hideSelectionInfo();
            this.hidePropertiesPopup();
        }
    }

    /**
     * Show selection information
     */
    showSelectionInfo(count) {
        // Popup removed
    }

    /**
     * Hide selection information
     */
    hideSelectionInfo() {
        // Popup removed
    }

    /**
     * Setup transform tools event listeners
     */
    setupTransformToolsListeners() {
        const transformTools = document.querySelectorAll('#transformPanel .tool-item');
        transformTools.forEach(tool => {
            tool.addEventListener('click', (e) => {
                e.stopPropagation();
                const toolName = tool.getAttribute('data-tool');
                this.selectTransformTool(toolName);
                
                // Hide properties popup when switching away from select tool
                if (toolName !== 'select') {
                    this.hidePropertiesPopup();
                }
            });
        });
    }

    /**
     * Select transform tool
     */
    selectTransformTool(toolName) {
        // Skip coordinate toggle - it's not a transform tool
        if (toolName === 'coordinate-toggle') {
            this.handleTransformToolSelection(toolName);
            return;
        }

        // Deactivate tree placement when switching to transform tools
        this.deactivateTreePlacement();
        
        // Re-enable camera controls when switching to transform tools
        this.enableCameraControls();
        
        // Deactivate polygon drawing when switching to transform tools
        this.stopPolygonDrawing();

        // Remove active class from all transform tools (except coordinate toggle)
        const allTransformTools = document.querySelectorAll('#transformPanel .tool-item:not([data-tool="coordinate-toggle"])');
        allTransformTools.forEach(tool => tool.classList.remove('active'));

        // Remove active class from all drawing tools
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        allDrawingTools.forEach(tool => tool.classList.remove('active'));

        // Add active class to selected tool
        const selectedTool = document.querySelector(`#transformPanel [data-tool="${toolName}"]`);
        if (selectedTool) {
            selectedTool.classList.add('active');
        }

        // Hide properties popup when switching away from select tool
        if (toolName !== 'select') {
            this.hidePropertiesPopup();
        }

        // If switching to a transform tool (not select), ensure extrusions are selected
        if (toolName !== 'select' && this.selectionManager) {
            this.ensureExtrusionsSelected();
        }

        // Handle tool selection
        this.handleTransformToolSelection(toolName);
    }

    /**
     * Setup drawing tools event listeners
     */
    setupDrawingToolsListeners() {
        const drawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        drawingTools.forEach(tool => {
            tool.addEventListener('click', (e) => {
                e.stopPropagation();
                const toolName = tool.getAttribute('data-tool');
                
                // Skip tree tool - it has its own specific handler
                if (toolName === 'tree') {
                    return;
                }
                
                this.selectDrawingTool(toolName);
            });
        });
    }

    /**
     * Setup tree event listeners
     */
    setupTreeEventListeners() {
        // Tree tool click
        const treeTool = document.getElementById('treeTool');
        if (treeTool) {
            treeTool.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault(); // Prevent default behavior
                this.toggleTreeSubmenu();
            });
        }

        // Tree option clicks
        const treeOptions = document.querySelectorAll('.tree-option');
        treeOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const treeType = option.getAttribute('data-tree-type');
                this.selectTreeType(treeType);
            });
        });

        // Click outside to close tree submenu
        document.addEventListener('click', (e) => {
            const treeSubmenu = document.getElementById('treeSubmenu');
            const treeTool = document.getElementById('treeTool');
            
            if (treeSubmenu && treeTool && 
                !treeSubmenu.contains(e.target) && 
                !treeTool.contains(e.target)) {
                this.hideTreeSubmenu();
            }
        });

        // Height control event listeners
        this.setupTreeHeightControls();
    }

    /**
     * Setup tree height controls
     */
    setupTreeHeightControls() {
        const minHeightInput = document.getElementById('minHeight');
        const maxHeightInput = document.getElementById('maxHeight');
        const treeDistanceInput = document.getElementById('treeDistance');

        if (minHeightInput) {
            minHeightInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                
                // Ensure min height doesn't exceed max height
                const maxHeight = parseFloat(maxHeightInput.value);
                if (value > maxHeight) {
                    maxHeightInput.value = value;
                }
                
                this.updateTreeHeightParameters();
            });
        }

        if (maxHeightInput) {
            maxHeightInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                
                // Ensure max height doesn't go below min height
                const minHeight = parseFloat(minHeightInput.value);
                if (value < minHeight) {
                    minHeightInput.value = value;
                }
                
                this.updateTreeHeightParameters();
            });
        }

        if (treeDistanceInput) {
            treeDistanceInput.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.updateTreeDistanceParameter(value);
            });
        }
    }

    /**
     * Update tree height parameters in TreeManager
     */
    updateTreeHeightParameters() {
        if (!this.treeManager) return;

        const minHeight = parseFloat(document.getElementById('minHeight').value);
        const maxHeight = parseFloat(document.getElementById('maxHeight').value);
        
        this.treeManager.setHeightParameters(minHeight, maxHeight);
    }

    /**
     * Update tree distance parameter in TreeManager
     */
    updateTreeDistanceParameter(distance) {
        if (!this.treeManager) return;
        
        this.treeManager.setTreeDistance(distance);
    }

    /**
     * Select drawing tool
     */
    selectDrawingTool(toolName) {
        // Deactivate tree placement when switching to other drawing tools
        if (toolName !== 'tree') {
            this.deactivateTreePlacement();
            // Re-enable camera controls when switching away from tree tool
            this.enableCameraControls();
        }
        
        // Deactivate polygon drawing when switching to other drawing tools
        if (toolName !== 'polygon') {
            this.stopPolygonDrawing();
            this.hidePolygonDrawingInstructions();
        }

        // Remove active class from all drawing tools
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        allDrawingTools.forEach(tool => tool.classList.remove('active'));

        // Remove active class from all transform tools (except coordinate toggle)
        const allTransformTools = document.querySelectorAll('#transformPanel .tool-item:not([data-tool="coordinate-toggle"])');
        allTransformTools.forEach(tool => tool.classList.remove('active'));

        // Add active class to selected tool
        const selectedTool = document.querySelector(`#drawingPanel [data-tool="${toolName}"]`);
        if (selectedTool) {
            selectedTool.classList.add('active');
        }

        // Automatically activate select tool when drawing tool is selected
        this.activateSelectToolOnly();

        // Handle tool selection
        this.handleDrawingToolSelection(toolName);
    }

    /**
     * Ensure extrusions are selected when switching to transform tools
     */
    ensureExtrusionsSelected() {
        if (!this.selectionManager) return;

        const selectedObjects = this.selectionManager.selectedObjects;

        selectedObjects.forEach(shape => {
            // Check if this is a 2D shape with extrusion
            if (shape.extrusion && !selectedObjects.includes(shape.extrusion)) {
                this.selectionManager.selectedObjects.push(shape.extrusion);
                this.selectionManager.highlightObject(shape.extrusion);
            }
        });

        // Update selection display
        this.selectionManager.onSelectionChanged();
    }

    /**
     * Activate select tool only (without affecting drawing tools)
     */
    activateSelectToolOnly() {
        // Remove active class from all transform tools (except coordinate toggle)
        const allTransformTools = document.querySelectorAll('#transformPanel .tool-item:not([data-tool="coordinate-toggle"])');
        allTransformTools.forEach(tool => tool.classList.remove('active'));

        // Add active class to select tool
        const selectTool = document.querySelector('#transformPanel [data-tool="select"]');
        if (selectTool) {
            selectTool.classList.add('active');
        }

        // Handle select tool selection
        this.handleTransformToolSelection('select');
    }

    /**
     * Handle drawing tool selection logic
     */
    handleDrawingToolSelection(toolName) {

        switch (toolName) {
            case 'rectangle':
                this.createRectangle();
                break;
            case 'circle':
                this.createCircle();
                break;
            case 'polygon':
                this.startPolygonDrawing();
                break;
            case 'tree':
                // Tree tool is handled separately in tree event listeners
                break;
            case 'clear-drawings':
                this.clear2DShapes();
                break;
        }
    }

    /**
     * Start polygon drawing
     */
    startPolygonDrawing() {
        if (this.polygonManager) {
            // Set up callbacks for polygon completion and cancellation
            this.polygonManager.onPolygonCompleted = () => {
                this.enableCameraControls();
                this.hidePolygonDrawingInstructions();
                this.deactivatePolygonTool();
                this.activateSelectTool();
            };
            
            this.polygonManager.onPolygonCancelled = () => {
                this.enableCameraControls();
                this.hidePolygonDrawingInstructions();
                this.deactivatePolygonTool();
                this.activateSelectTool();
            };
            
            this.polygonManager.startDrawing();
            this.disableCameraControls();
            this.showPolygonDrawingInstructions();
        }
    }

    /**
     * Show polygon drawing instructions
     */
    showPolygonDrawingInstructions() {
        // Only show if polygon tool is active
        const polygonTool = document.querySelector('#drawingPanel [data-tool="polygon"]');
        if (!polygonTool || !polygonTool.classList.contains('active')) {
            return;
        }

        // Create or update instruction panel
        let instructionPanel = document.getElementById('polygon-instructions');
        if (!instructionPanel) {
            instructionPanel = document.createElement('div');
            instructionPanel.id = 'polygon-instructions';
            instructionPanel.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 15px;
                border-radius: 8px;
                font-family: Arial, sans-serif;
                font-size: 14px;
                z-index: 1000;
                max-width: 250px;
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(instructionPanel);
        }

        instructionPanel.innerHTML = `
            <div style="font-weight: bold; margin-bottom: 10px; color: #4CAF50;">🎯 Polygon Drawing</div>
            <div style="margin-bottom: 8px;">• Click to add points</div>
            <div style="margin-bottom: 8px;">• <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">Backspace</kbd> to remove last point</div>
            <div style="margin-bottom: 8px;">• <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">Enter</kbd> to complete</div>
            <div style="margin-bottom: 8px;">• <kbd style="background: #333; padding: 2px 6px; border-radius: 3px;">Escape</kbd> to cancel</div>
            <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #555;">
                <div style="font-size: 11px; color: #ccc; margin-bottom: 5px;">Test Concave Polygons:</div>
                <div style="margin-bottom: 5px;">
                    <button id="test-negative-z" style="background: #FF5722; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; margin-right: 5px;">Test -Z</button>
                    <button id="test-negative-x" style="background: #9C27B0; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer;">Test -X</button>
                </div>
                <div>
                    <button id="test-positive-z" style="background: #4CAF50; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer; margin-right: 5px;">Test +Z</button>
                    <button id="test-positive-x" style="background: #2196F3; color: white; border: none; padding: 4px 8px; border-radius: 3px; font-size: 11px; cursor: pointer;">Test +X</button>
                </div>
            </div>
            <div id="polygon-stats" style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #555; font-size: 12px; color: #ccc;">
                Points: <span id="point-count">0</span> | Status: <span id="polygon-status">Drawing</span>
            </div>
        `;
        
        // Add event listeners for test buttons
        const testNegativeZBtn = document.getElementById('test-negative-z');
        const testNegativeXBtn = document.getElementById('test-negative-x');
        const testPositiveZBtn = document.getElementById('test-positive-z');
        const testPositiveXBtn = document.getElementById('test-positive-x');
        
        if (testNegativeZBtn) {
            testNegativeZBtn.addEventListener('click', () => {
                this.testNegativeZConcavePolygon();
            });
        }
        
        if (testNegativeXBtn) {
            testNegativeXBtn.addEventListener('click', () => {
                this.testNegativeXConcavePolygon();
            });
        }
        
        if (testPositiveZBtn) {
            testPositiveZBtn.addEventListener('click', () => {
                this.testPositiveZConcavePolygon();
            });
        }
        
        if (testPositiveXBtn) {
            testPositiveXBtn.addEventListener('click', () => {
                this.testPositiveXConcavePolygon();
            });
        }
        
        // Start updating stats
        this.startPolygonStatsUpdate();
    }

    /**
     * Hide polygon drawing instructions
     */
    hidePolygonDrawingInstructions() {
        const instructionPanel = document.getElementById('polygon-instructions');
        if (instructionPanel) {
            instructionPanel.remove();
        }
        this.stopPolygonStatsUpdate();
    }

    /**
     * Start updating polygon statistics
     */
    startPolygonStatsUpdate() {
        this.stopPolygonStatsUpdate(); // Clear any existing interval
        
        this.polygonStatsInterval = setInterval(() => {
            this.updatePolygonStats();
        }, 100); // Update every 100ms
    }

    /**
     * Stop updating polygon statistics
     */
    stopPolygonStatsUpdate() {
        if (this.polygonStatsInterval) {
            clearInterval(this.polygonStatsInterval);
            this.polygonStatsInterval = null;
        }
    }

    /**
     * Update polygon statistics display
     */
    updatePolygonStats() {
        // Only update if polygon tool is active and drawing
        const polygonTool = document.querySelector('#drawingPanel [data-tool="polygon"]');
        if (!polygonTool || !polygonTool.classList.contains('active')) {
            return;
        }

        if (!this.polygonManager || !this.polygonManager.isCurrentlyDrawing) {
            return;
        }

        const stats = this.polygonManager.getCurrentStats();
        const pointCountElement = document.getElementById('point-count');
        const statusElement = document.getElementById('polygon-status');

        if (pointCountElement) {
            pointCountElement.textContent = stats.pointCount;
        }

        if (statusElement) {
            let status = 'Drawing';
            if (stats.canComplete) {
                status = 'Ready to complete';
            } else if (stats.pointCount === 0) {
                status = 'Start drawing';
            } else if (stats.pointCount < 3) {
                status = 'Need more points';
            }
            
            if (stats.isSnapped) {
                status += ' (snapped to first)';
            }
            
            statusElement.textContent = status;
        }
    }

    /**
     * Test E-shape polygon creation
     */
    testEShapePolygon() {
        if (this.polygonManager) {
            this.polygonManager.testEShapePolygon();
        }
    }

    /**
     * Test complex polygon creation
     */
    testComplexPolygon() {
        if (this.polygonManager) {
            this.polygonManager.testComplexPolygon();
        }
    }

    /**
     * Stop polygon drawing
     */
    stopPolygonDrawing() {
        if (this.polygonManager) {
            this.polygonManager.stopDrawing();
            this.enableCameraControls();
            this.hidePolygonDrawingInstructions();
        }
    }

    /**
     * Stop polygon drawing for tree tool (without enabling camera controls)
     */
    stopPolygonDrawingForTreeTool() {
        if (this.polygonManager) {
            this.polygonManager.stopDrawing();
            this.hidePolygonDrawingInstructions();
        }
    }

    /**
     * Complete polygon drawing
     */
    completePolygonDrawing() {
        if (this.polygonManager) {
            this.polygonManager.completePolygon();
            // Callbacks will handle the rest
        }
    }

    /**
     * Cancel polygon drawing
     */
    cancelPolygonDrawing() {
        if (this.polygonManager) {
            this.polygonManager.cancelDrawing();
            // Callbacks will handle the rest
        }
    }

    /**
     * Deactivate polygon tool
     */
    deactivatePolygonTool() {
        const polygonTool = document.querySelector('#drawingPanel [data-tool="polygon"]');
        if (polygonTool) {
            polygonTool.classList.remove('active');
        }
    }

    /**
     * Activate select tool
     */
    activateSelectTool() {
        const selectTool = document.querySelector('#transformPanel [data-tool="select"]');
        if (selectTool) {
            selectTool.classList.add('active');
        }
    }

    /**
     * Test negative Z concave polygon
     */
    testNegativeZConcavePolygon() {
        if (this.polygonManager) {
            this.polygonManager.testNegativeZConcavePolygon();
        }
    }

    /**
     * Test negative X concave polygon
     */
    testNegativeXConcavePolygon() {
        if (this.polygonManager) {
            this.polygonManager.testNegativeXConcavePolygon();
        }
    }

    /**
     * Test positive Z concave polygon
     */
    testPositiveZConcavePolygon() {
        if (this.polygonManager) {
            this.polygonManager.testPositiveZConcavePolygon();
        }
    }

    /**
     * Test positive X concave polygon
     */
    testPositiveXConcavePolygon() {
        if (this.polygonManager) {
            this.polygonManager.testPositiveXConcavePolygon();
        }
    }

    /**
     * Toggle tree submenu visibility
     */
    toggleTreeSubmenu() {
        const treeSubmenu = document.getElementById('treeSubmenu');
        if (treeSubmenu) {
            const isVisible = treeSubmenu.style.display !== 'none';
            treeSubmenu.style.display = isVisible ? 'none' : 'block';
            
            // If opening the submenu, deactivate all other tools
            if (!isVisible) {
                this.deselectAllOtherTools();
            }
        }
    }

    /**
     * Hide tree submenu
     */
    hideTreeSubmenu() {
        const treeSubmenu = document.getElementById('treeSubmenu');
        if (treeSubmenu) {
            treeSubmenu.style.display = 'none';
        }
    }

    /**
     * Select tree type and start placement
     */
    selectTreeType(treeType) {
        if (!this.treeManager) {
            return;
        }

        // Hide submenu
        this.hideTreeSubmenu();

        // Remove active class from all tree options
        const treeOptions = document.querySelectorAll('.tree-option');
        treeOptions.forEach(option => option.classList.remove('active'));

        // Add active class to selected option
        const selectedOption = document.querySelector(`[data-tree-type="${treeType}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }

        // Deselect all other tools when tree tool is selected
        this.deselectAllOtherTools();

        // Disable camera controls during tree placement
        this.disableCameraControls();

        // Initialize height parameters from UI
        this.updateTreeHeightParameters();
        
        // Initialize distance parameter from UI
        const distanceInput = document.getElementById('treeDistance');
        if (distanceInput) {
            this.updateTreeDistanceParameter(parseFloat(distanceInput.value));
        }

        // Start tree placement
        this.treeManager.startTreePlacement(treeType);
    }

    /**
     * Deselect all other tools when tree tool is selected
     */
    deselectAllOtherTools() {
        // Remove active class from all drawing tools
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        allDrawingTools.forEach(tool => tool.classList.remove('active'));

        // Remove active class from all transform tools (except coordinate toggle)
        const allTransformTools = document.querySelectorAll('#transformPanel .tool-item:not([data-tool="coordinate-toggle"])');
        allTransformTools.forEach(tool => tool.classList.remove('active'));

        // Deactivate all transform modes
        this.deactivateCurrentMode();

        // Deactivate polygon drawing if active (but don't enable camera controls)
        this.stopPolygonDrawingForTreeTool();

        // Clear any active selections
        if (this.selectionManager) {
            this.selectionManager.clearSelection();
        }

        // Reset to select tool state (but don't activate select tool visually)
        this.currentTransformMode = null;

    }

    /**
     * Deactivate tree placement mode
     */
    deactivateTreePlacement() {
        if (!this.treeManager) {
            return;
        }

        // Stop tree placement
        this.treeManager.stopTreePlacement();

        // Remove active class from all tree options
        const treeOptions = document.querySelectorAll('.tree-option');
        treeOptions.forEach(option => option.classList.remove('active'));

        // Hide tree submenu
        this.hideTreeSubmenu();

        // Note: Camera controls are NOT re-enabled here
        // They will be re-enabled only when another tool is selected

        // Reset drag variables (they will be reset in the next mouse event)
    }

    /**
     * Reset to select tool (default state)
     */
    resetToSelectTool() {
        // Deactivate tree placement when resetting to select tool
        this.deactivateTreePlacement();

        // Remove active class from all drawing tools
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        allDrawingTools.forEach(tool => tool.classList.remove('active'));

        // Remove active class from all transform tools (except coordinate toggle)
        const allTransformTools = document.querySelectorAll('#transformPanel .tool-item:not([data-tool="coordinate-toggle"])');
        allTransformTools.forEach(tool => tool.classList.remove('active'));

        // Activate select tool
        const selectTool = document.querySelector('#transformPanel [data-tool="select"]');
        if (selectTool) {
            selectTool.classList.add('active');
        }

        this.setTransformMode('select');
    }

    /**
     * Handle transform tool selection logic
     */
    handleTransformToolSelection(toolName) {

        switch (toolName) {
            case 'select':
                this.setTransformMode('select');
                break;
            case 'move':
                this.setTransformMode('move');
                break;
            case 'rotate':
                this.setTransformMode('rotate');
                break;
            case 'scale':
                this.setTransformMode('scale');
                break;
            case 'coordinate-toggle':
                this.toggleCoordinateMode();
                break;
        }
    }

    /**
     * Set transform mode
     */
    setTransformMode(mode) {
        
        // Deactivate previous mode
        this.deactivateCurrentMode();
        
        // Store current transform mode
        this.currentTransformMode = mode;
        
        // Handle different transform modes
        switch (mode) {
            case 'select':
                this.enableSelectionMode();
                break;
            case 'move':
                this.enableMoveMode();
                break;
            case 'rotate':
                this.enableRotateMode();
                break;
            case 'scale':
                this.enableScaleMode();
                break;
        }
        
        // Show visual feedback
        this.showTransformModeFeedback(mode);
    }

    /**
     * Deactivate current transform mode
     */
    deactivateCurrentMode() {
        if (this.moveManager) {
            this.moveManager.deactivate();
        }
        
        if (this.rotateManager) {
            this.rotateManager.deactivate();
        }
        
        if (this.scaleManager) {
            this.scaleManager.deactivate();
        }
    }

    /**
     * Enable selection mode
     */
    enableSelectionMode() {
        // Selection is handled by SelectionManager automatically
        // Just ensure it's active
        if (this.selectionManager) {
            // Selection manager is already listening for clicks
        }
        
        // Enable camera controls for selection mode
        this.enableCameraControls();
    }

    /**
     * Enable move mode
     */
    enableMoveMode() {
        
        // Deactivate other modes first
        if (this.selectionManager) {
            // Selection manager is always active, but we can show feedback
        }
        
        // Activate move manager
        if (this.moveManager) {
            this.moveManager.activate();
        }
        
        // Enable camera controls for move mode
        this.enableCameraControls();
        
        // Show move instructions
        this.showMoveInstructions();
    }

    /**
     * Enable rotate mode
     */
    enableRotateMode() {
        if (this.rotateManager) {
            this.rotateManager.activate();
            this.showRotateInstructions();
        } else {
        }
        
        // Enable camera controls for rotate mode
        this.enableCameraControls();
    }

    /**
     * Enable scale mode
     */
    enableScaleMode() {
        if (this.scaleManager) {
            this.scaleManager.activate();
            this.showScaleInstructions();
        } else {
        }
        
        // Enable camera controls for scale mode
        this.enableCameraControls();
    }

    /**
     * Show transform mode feedback
     */
    showTransformModeFeedback(mode) {
        // Popup removed - only console log
        const modeNames = {
            'select': 'Select Mode',
            'move': 'Move Mode',
            'rotate': 'Rotate Mode',
            'scale': 'Scale Mode'
        };
    }

    /**
     * Setup menu bar event listeners
     */
    setupMenuListeners() {
        const menuOptions = document.querySelectorAll('.menu-option');
        menuOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                // Find the closest menu-option element (in case we clicked on a child element)
                const menuOption = e.target.closest('.menu-option');
                if (menuOption) {
                    const action = menuOption.getAttribute('data-action');
                    if (action) {
                        this.handleMenuAction(action);
                    }
                }
            });
        });
    }

    /**
     * Handle menu actions
     */
    handleMenuAction(action) {
        switch (action) {
            case 'empty-scene':
                this.createEmptyScene();
                break;
            case 'default-scene':
                this.createDefaultScene();
                break;
            case 'save-scene':
                this.saveScene();
                break;
            case 'load-scene':
                this.loadScene();
                break;
            case 'export-stl':
                this.exportSTL();
                break;
            case 'import-stl':
                this.importSTL();
                break;
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'select-all':
                this.selectAll();
                break;
            case 'clear-selection':
                this.clearSelection();
                break;
            case 'delete-selected':
                this.deleteSelected();
                break;
            case 'preferences':
                this.openPreferences();
                break;
            case 'about':
                this.showAbout();
                break;
            default:
        }
    }

    /**
     * Menu action implementations
     */
    // Note: The following methods were removed as they only contained placeholder alerts:
    // saveScene, loadScene, exportSTL, exportOBJ, undo, redo, selectAll, 
    // clearSelection, deleteSelected, openSceneSettings, openRenderSettings, openCameraSettings

    openPreferences() {
        this.showPreferencesWindow();
    }

    showAbout() {
        const aboutText = `Eco Digital Twin Sandbox
Version 1.0
Powered by Babylon.js

About EcoTwin AI

We are a startup company specializing in energy consumption modeling, dedicated to reducing CO2 emissions and carbon footprint. Our mission focuses on:

• Finding solutions for energy consumption optimization
• Clean, renewable, and sustainable energy production
• Energy democracy and accessibility
• Urban sustainability and resilience
• Residential, agricultural, and industrial applications

This application helps you import STL building and urban models, add and edit various components to achieve your desired patterns, and prepare them for export to energy simulation software.

Transform your 3D models into powerful energy analysis tools.`;

        alert(aboutText);
    }

    /**
     * Select all 3D models except ground
     */
    selectAll() {
        if (this.selectionManager) {
            this.selectionManager.selectAll();
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        if (this.selectionManager) {
            this.selectionManager.clearSelection();
        }
    }

    /**
     * Delete selected objects
     */
    deleteSelected() {
        this.deleteSelectedObjects();
    }

    /**
     * Import STL file
     */
    importSTL() {
        // Create file input element
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.stl';
        fileInput.style.display = 'none';
        
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                this.loadSTLFile(file);
            }
        });
        
        // Trigger file selection
        document.body.appendChild(fileInput);
        fileInput.click();
        document.body.removeChild(fileInput);
    }

    /**
     * Load STL file and add to scene
     */
    loadSTLFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                // For now, show a placeholder message
                // In a real implementation, you would parse the STL file and create a mesh
                alert(`STL file "${file.name}" selected. STL import functionality will be implemented in a future version.`);
                
                // TODO: Implement actual STL parsing and mesh creation
                // This would involve:
                // 1. Parsing the STL file format (binary or ASCII)
                // 2. Creating a Babylon.js mesh from the STL data
                // 3. Adding the mesh to the scene
                // 4. Positioning it appropriately
                
            } catch (error) {
                console.error('Error loading STL file:', error);
                alert('Error loading STL file. Please try again.');
            }
        };
        
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
        };
        
        reader.readAsArrayBuffer(file);
    }

    /**
     * Show preferences window
     */
    showPreferencesWindow() {
        const window = document.getElementById('preferencesWindow');
        const overlay = document.getElementById('preferencesOverlay');
        
        if (window && overlay) {
            window.classList.add('show');
            overlay.classList.add('show');
            // Only setup listeners once
            if (!this.preferencesListenersSetup) {
                this.setupPreferencesListeners();
                this.preferencesListenersSetup = true;
            }
            this.syncPreferencesState();
        }
    }

    /**
     * Hide preferences window
     */
    hidePreferencesWindow() {
        const window = document.getElementById('preferencesWindow');
        const overlay = document.getElementById('preferencesOverlay');
        
        if (window && overlay) {
            window.classList.remove('show');
            overlay.classList.remove('show');
        }
    }

    /**
     * Setup preferences window event listeners
     */
    setupPreferencesListeners() {
        // Close button
        const closeBtn = document.getElementById('closePreferences');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePreferencesWindow();
            });
        }

        // Overlay click to close
        const overlay = document.getElementById('preferencesOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.hidePreferencesWindow();
            });
        }

        // Grid toggle
        const gridToggle = document.getElementById('gridTogglePref');
        if (gridToggle) {
            gridToggle.addEventListener('click', () => {
                this.toggleGrid();
            });
        }

        // Shadow toggle
        const shadowToggle = document.getElementById('shadowTogglePref');
        if (shadowToggle) {
            shadowToggle.addEventListener('click', () => {
                this.toggleObjectShadows();
            });
        }

        // Hard shadow toggle
        const hardShadowToggle = document.getElementById('hardShadowTogglePref');
        if (hardShadowToggle) {
            hardShadowToggle.addEventListener('click', () => {
                this.toggleHardShadows();
            });
        }

        // Light intensity slider
        const lightIntensitySlider = document.getElementById('lightIntensityPref');
        if (lightIntensitySlider) {
            lightIntensitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setLightIntensity(value);
                this.updateLightIntensityDisplay(value);
            });
        }

        // Shadow darkness slider
        const shadowDarknessSlider = document.getElementById('shadowDarknessPref');
        if (shadowDarknessSlider) {
            shadowDarknessSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowDarkness(value);
                this.updateShadowDarknessDisplay(value);
            });
        }

        // Shadow bias slider
        const shadowBiasSlider = document.getElementById('shadowBiasPref');
        if (shadowBiasSlider) {
            shadowBiasSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowBias(value);
                this.updateShadowBiasDisplay(value);
            });
        }

        // Shadow normal bias slider
        const shadowNormalBiasSlider = document.getElementById('shadowNormalBiasPref');
        if (shadowNormalBiasSlider) {
            shadowNormalBiasSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowNormalBias(value);
                this.updateShadowNormalBiasDisplay(value);
            });
        }

        // Shadow depth scale slider
        const shadowDepthScaleSlider = document.getElementById('shadowDepthScalePref');
        if (shadowDepthScaleSlider) {
            shadowDepthScaleSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowDepthScale(value);
                this.updateShadowDepthScaleDisplay(value);
            });
        }

        // Shadow ortho scale slider
        const shadowOrthoScaleSlider = document.getElementById('shadowOrthoScalePref');
        if (shadowOrthoScaleSlider) {
            shadowOrthoScaleSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowOrthoScale(value);
                this.updateShadowOrthoScaleDisplay(value);
            });
        }

        // Shadow frustum size slider
        const shadowFrustumSizeSlider = document.getElementById('shadowFrustumSizePref');
        if (shadowFrustumSizeSlider) {
            shadowFrustumSizeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowFrustumSize(value);
                this.updateShadowFrustumSizeDisplay(value);
            });
        }


        // Reset camera
        const resetCameraBtn = document.getElementById('resetCameraPref');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.resetCamera();
            });
        }

        // Generate buildings
        const generateBtn = document.getElementById('generateBuildingsPref');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateBuildings();
            });
        }

        // Reset scene
        const resetBtn = document.getElementById('resetScenePref');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetScene();
            });
        }

        // Save lighting settings
        const saveLightingBtn = document.getElementById('saveLightingSettingsPref');
        if (saveLightingBtn) {
            saveLightingBtn.addEventListener('click', () => {
                this.saveLightingSettings();
            });
        }

        // Statistics toggle button
        const statisticsTogglePref = document.getElementById('statisticsTogglePref');
        if (statisticsTogglePref) {
            statisticsTogglePref.addEventListener('click', () => {
                this.toggleStatistics();
            });
        }

        // Range inputs
        this.setupPreferencesRangeInputs();
    }

    /**
     * Synchronize preferences window state with current application state
     */
    syncPreferencesState() {
        // Sync grid toggle state
        const gridTogglePref = document.getElementById('gridTogglePref');
        if (gridTogglePref) {
            const isGridVisible = this.gridManager.isGridVisible();
            gridTogglePref.classList.toggle('active', isGridVisible);
        }

        // Sync shadow toggle state
        const shadowTogglePref = document.getElementById('shadowTogglePref');
        if (shadowTogglePref) {
            const areObjectShadowsEnabled = this.lightingManager.areObjectShadowsEnabled();
            shadowTogglePref.classList.toggle('active', areObjectShadowsEnabled);
        }

        // Sync hard shadow toggle state
        const hardShadowTogglePref = document.getElementById('hardShadowTogglePref');
        if (hardShadowTogglePref) {
            const areHardShadowsEnabled = this.lightingManager.areHardShadowsEnabled();
            hardShadowTogglePref.classList.toggle('active', areHardShadowsEnabled);
        }

        // Sync light intensity
        const lightIntensitySlider = document.getElementById('lightIntensityPref');
        const lightIntensityValue = document.getElementById('lightIntensityValuePref');
        if (lightIntensitySlider && lightIntensityValue) {
            const currentIntensity = this.lightingManager.getDirectionalIntensity();
            lightIntensitySlider.value = currentIntensity;
            lightIntensityValue.textContent = currentIntensity.toFixed(1);
        }

        // Sync shadow darkness
        const shadowDarknessSlider = document.getElementById('shadowDarknessPref');
        const shadowDarknessValue = document.getElementById('shadowDarknessValuePref');
        if (shadowDarknessSlider && shadowDarknessValue) {
            const currentDarkness = this.lightingManager.getShadowDarkness();
            shadowDarknessSlider.value = currentDarkness;
            shadowDarknessValue.textContent = currentDarkness.toFixed(2);
        }

        // Sync shadow bias
        const shadowBiasSlider = document.getElementById('shadowBiasPref');
        const shadowBiasValue = document.getElementById('shadowBiasValuePref');
        if (shadowBiasSlider && shadowBiasValue) {
            const currentBias = this.lightingManager.getShadowBias();
            shadowBiasSlider.value = currentBias;
            shadowBiasValue.textContent = currentBias.toFixed(5);
        }

        // Sync shadow normal bias
        const shadowNormalBiasSlider = document.getElementById('shadowNormalBiasPref');
        const shadowNormalBiasValue = document.getElementById('shadowNormalBiasValuePref');
        if (shadowNormalBiasSlider && shadowNormalBiasValue) {
            const currentNormalBias = this.lightingManager.getShadowNormalBias();
            shadowNormalBiasSlider.value = currentNormalBias;
            shadowNormalBiasValue.textContent = currentNormalBias.toFixed(2);
        }

        // Sync shadow depth scale
        const shadowDepthScaleSlider = document.getElementById('shadowDepthScalePref');
        const shadowDepthScaleValue = document.getElementById('shadowDepthScaleValuePref');
        if (shadowDepthScaleSlider && shadowDepthScaleValue) {
            const currentDepthScale = this.lightingManager.getShadowDepthScale();
            shadowDepthScaleSlider.value = currentDepthScale;
            shadowDepthScaleValue.textContent = currentDepthScale.toFixed(0);
        }

        // Sync shadow ortho scale
        const shadowOrthoScaleSlider = document.getElementById('shadowOrthoScalePref');
        const shadowOrthoScaleValue = document.getElementById('shadowOrthoScaleValuePref');
        if (shadowOrthoScaleSlider && shadowOrthoScaleValue) {
            const currentOrthoScale = this.lightingManager.getShadowOrthoScale();
            shadowOrthoScaleSlider.value = currentOrthoScale;
            shadowOrthoScaleValue.textContent = currentOrthoScale.toFixed(0);
        }

        // Sync shadow frustum size
        const shadowFrustumSizeSlider = document.getElementById('shadowFrustumSizePref');
        const shadowFrustumSizeValue = document.getElementById('shadowFrustumSizeValuePref');
        if (shadowFrustumSizeSlider && shadowFrustumSizeValue) {
            const currentFrustumSize = this.lightingManager.getShadowFrustumSize();
            shadowFrustumSizeSlider.value = currentFrustumSize;
            shadowFrustumSizeValue.textContent = currentFrustumSize.toFixed(0);
        }

        // Sync statistics toggle state
        const statisticsTogglePref = document.getElementById('statisticsTogglePref');
        if (statisticsTogglePref && window.fpsMonitor) {
            const isStatisticsVisible = window.fpsMonitor.isVisible;
            statisticsTogglePref.classList.toggle('active', isStatisticsVisible);
        }
    }

    /**
     * Setup preferences range input controls
     */
    setupPreferencesRangeInputs() {
        // Building count
        const buildingCount = document.getElementById('buildingCountPref');
        const buildingCountValue = document.getElementById('buildingCountValuePref');
        if (buildingCount && buildingCountValue) {
            buildingCount.addEventListener('input', (e) => {
                buildingCountValue.textContent = e.target.value;
            });
        }

        // Min height
        const minHeight = document.getElementById('minHeightPref');
        const minHeightValue = document.getElementById('minHeightValuePref');
        if (minHeight && minHeightValue) {
            minHeight.addEventListener('input', (e) => {
                minHeightValue.textContent = e.target.value;
            });
        }

        // Max height
        const maxHeight = document.getElementById('maxHeightPref');
        const maxHeightValue = document.getElementById('maxHeightValuePref');
        if (maxHeight && maxHeightValue) {
            maxHeight.addEventListener('input', (e) => {
                maxHeightValue.textContent = e.target.value;
            });
        }
    }

    /**
     * Setup range input controls
     */
    setupRangeInputs() {
        // Building count
        const buildingCount = document.getElementById('buildingCount');
        const buildingCountValue = document.getElementById('buildingCountValue');
        if (buildingCount && buildingCountValue) {
            buildingCount.addEventListener('input', (e) => {
                buildingCountValue.textContent = e.target.value;
            });
        }

        // Min height
        const minHeight = document.getElementById('minHeight');
        const minHeightValue = document.getElementById('minHeightValue');
        if (minHeight && minHeightValue) {
            minHeight.addEventListener('input', (e) => {
                minHeightValue.textContent = e.target.value;
            });
        }

        // Max height
        const maxHeight = document.getElementById('maxHeight');
        const maxHeightValue = document.getElementById('maxHeightValue');
        if (maxHeight && maxHeightValue) {
            maxHeight.addEventListener('input', (e) => {
                maxHeightValue.textContent = e.target.value;
            });
        }
    }

    /**
     * Generate buildings
     */
    generateBuildings() {
        // Try to get values from preferences first, fallback to original elements
        const countEl = document.getElementById('buildingCountPref') || document.getElementById('buildingCount');
        const minHeightEl = document.getElementById('minHeightPref') || document.getElementById('minHeight');
        const maxHeightEl = document.getElementById('maxHeightPref') || document.getElementById('maxHeight');
        
        const count = parseInt(countEl?.value) || 10;
        const minHeight = parseInt(minHeightEl?.value) || 4;
        const maxHeight = parseInt(maxHeightEl?.value) || 20;

        // Clear existing buildings
        this.sceneManager.clearBuildings();

        // Generate new buildings
        const buildings = this.buildingGenerator.generateBuildings(count, minHeight, maxHeight);

        // Add buildings to scene and setup shadows
        buildings.forEach(building => {
            this.sceneManager.addBuilding(building);
            this.lightingManager.addShadowCaster(building.mesh);
            
            // Make building selectable
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(building.mesh);
            }
        });

        // Show loading state
        this.showLoading(false);
        
    }

    /**
     * Reset scene
     */
    resetScene() {
        // Clear buildings
        this.sceneManager.clearBuildings();
        this.buildingGenerator.clearBuildings();

        // Reset camera
        this.cameraController.resetCamera();

        // Reset UI values
        document.getElementById('buildingCount').value = 10;
        document.getElementById('buildingCountValue').textContent = '10';
        document.getElementById('minHeight').value = 4;
        document.getElementById('minHeightValue').textContent = '4';
        document.getElementById('maxHeight').value = 20;
        document.getElementById('maxHeightValue').textContent = '20';

    }

    /**
     * Save current lighting settings
     */
    saveLightingSettings() {
        if (!this.lightingManager) {
            console.error('LightingManager not available');
            return;
        }

        // Collect all current lighting settings
        const settings = {
            // Light settings
            lightIntensity: this.lightingManager.getDirectionalIntensity(),
            hemisphericIntensity: this.lightingManager.hemisphericLight ? this.lightingManager.hemisphericLight.intensity : 0.8,
            
            // Shadow settings
            shadowDarkness: this.lightingManager.getShadowDarkness(),
            shadowBias: this.lightingManager.getShadowBias(),
            shadowNormalBias: this.lightingManager.getShadowNormalBias(),
            shadowDepthScale: this.lightingManager.getShadowDepthScale(),
            shadowOrthoScale: this.lightingManager.getShadowOrthoScale(),
            shadowFrustumSize: this.lightingManager.getShadowFrustumSize(),
            
            // Shadow toggles
            objectShadowsEnabled: this.lightingManager.areObjectShadowsEnabled(),
            hardShadowsEnabled: this.lightingManager.areHardShadowsEnabled(),
            
            // Light position and direction
            lightPosition: this.lightingManager.directionalLight ? {
                x: this.lightingManager.directionalLight.position.x,
                y: this.lightingManager.directionalLight.position.y,
                z: this.lightingManager.directionalLight.position.z
            } : null,
            lightDirection: this.lightingManager.directionalLight ? {
                x: this.lightingManager.directionalLight.direction.x,
                y: this.lightingManager.directionalLight.direction.y,
                z: this.lightingManager.directionalLight.direction.z
            } : null,
            
            // Shadow frustum settings
            shadowMinZ: this.lightingManager.directionalLight ? this.lightingManager.directionalLight.shadowMinZ : 0.01,
            shadowMaxZ: this.lightingManager.directionalLight ? this.lightingManager.directionalLight.shadowMaxZ : 500,
            
            // Timestamp
            timestamp: new Date().toISOString(),
            version: '1.0'
        };

        // Create downloadable JSON file
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});
        
        // Create download link
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `lighting-settings-${new Date().toISOString().split('T')[0]}.json`;
        
        // Trigger download
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Also log to console for easy copy-paste
        
        // Show success message
        this.showNotification('Lighting settings saved successfully!', 'success');
        
        return settings;
    }

    /**
     * Load lighting settings from JSON
     */
    loadLightingSettings(settings) {
        if (!this.lightingManager || !settings) {
            console.error('LightingManager not available or settings invalid');
            return;
        }

        try {
            // Apply light settings
            if (settings.lightIntensity !== undefined) {
                this.lightingManager.setDirectionalIntensity(settings.lightIntensity);
            }
            if (settings.hemisphericIntensity !== undefined && this.lightingManager.hemisphericLight) {
                this.lightingManager.hemisphericLight.intensity = settings.hemisphericIntensity;
            }

            // Apply shadow settings
            if (settings.shadowDarkness !== undefined) {
                this.lightingManager.setShadowDarkness(settings.shadowDarkness);
            }
            if (settings.shadowBias !== undefined) {
                this.lightingManager.setShadowBias(settings.shadowBias);
            }
            if (settings.shadowNormalBias !== undefined) {
                this.lightingManager.setShadowNormalBias(settings.shadowNormalBias);
            }
            if (settings.shadowDepthScale !== undefined) {
                this.lightingManager.setShadowDepthScale(settings.shadowDepthScale);
            }
            if (settings.shadowOrthoScale !== undefined) {
                this.lightingManager.setShadowOrthoScale(settings.shadowOrthoScale);
            }
            if (settings.shadowFrustumSize !== undefined) {
                this.lightingManager.setShadowFrustumSize(settings.shadowFrustumSize);
            }

            // Apply shadow toggles
            if (settings.objectShadowsEnabled !== undefined) {
                if (settings.objectShadowsEnabled !== this.lightingManager.areObjectShadowsEnabled()) {
                    this.lightingManager.toggleObjectShadows();
                }
            }
            if (settings.hardShadowsEnabled !== undefined) {
                if (settings.hardShadowsEnabled !== this.lightingManager.areHardShadowsEnabled()) {
                    this.lightingManager.toggleHardShadows();
                }
            }

            // Apply light position and direction
            if (settings.lightPosition && this.lightingManager.directionalLight) {
                this.lightingManager.directionalLight.position = new BABYLON.Vector3(
                    settings.lightPosition.x,
                    settings.lightPosition.y,
                    settings.lightPosition.z
                );
            }
            if (settings.lightDirection && this.lightingManager.directionalLight) {
                this.lightingManager.directionalLight.direction = new BABYLON.Vector3(
                    settings.lightDirection.x,
                    settings.lightDirection.y,
                    settings.lightDirection.z
                );
            }

            // Apply shadow frustum settings
            if (settings.shadowMinZ !== undefined && this.lightingManager.directionalLight) {
                this.lightingManager.directionalLight.shadowMinZ = settings.shadowMinZ;
            }
            if (settings.shadowMaxZ !== undefined && this.lightingManager.directionalLight) {
                this.lightingManager.directionalLight.shadowMaxZ = settings.shadowMaxZ;
            }

            // Sync UI with new settings
            this.syncPreferencesState();

            this.showNotification('Lighting settings loaded successfully!', 'success');

        } catch (error) {
            console.error('Error loading lighting settings:', error);
            this.showNotification('Error loading lighting settings', 'error');
        }
    }

    /**
     * Toggle statistics display
     */
    toggleStatistics() {
        if (window.fpsMonitor) {
            window.fpsMonitor.toggleVisibility();
            
            // Update button state
            const statisticsTogglePref = document.getElementById('statisticsTogglePref');
            if (statisticsTogglePref) {
                const isVisible = window.fpsMonitor.isVisible;
                if (isVisible) {
                    statisticsTogglePref.classList.add('active');
                } else {
                    statisticsTogglePref.classList.remove('active');
                }
            }
            
        } else {
        }
    }

    /**
     * Create empty scene with only ground
     */
    createEmptyScene() {
        // Clear all buildings
        this.sceneManager.clearBuildings();
        this.buildingGenerator.clearBuildings();

        // Reset camera
        this.cameraController.resetCamera();

        // Reset UI values
        document.getElementById('buildingCount').value = 10;
        document.getElementById('buildingCountValue').textContent = '10';
        document.getElementById('minHeight').value = 4;
        document.getElementById('minHeightValue').textContent = '4';
        document.getElementById('maxHeight').value = 20;
        document.getElementById('maxHeightValue').textContent = '20';

        // Ensure ground is visible
        if (!this.sceneManager.getGround()) {
            this.sceneManager.createGround();
        }
    }

    /**
     * Create default scene with ground and 10 random buildings
     */
    createDefaultScene() {
        // Clear all buildings first
        this.sceneManager.clearBuildings();
        this.buildingGenerator.clearBuildings();

        // Reset camera
        this.cameraController.resetCamera();

        // Reset UI values
        document.getElementById('buildingCount').value = 10;
        document.getElementById('buildingCountValue').textContent = '10';
        document.getElementById('minHeight').value = 4;
        document.getElementById('minHeightValue').textContent = '4';
        document.getElementById('maxHeight').value = 20;
        document.getElementById('maxHeightValue').textContent = '20';

        // Ensure ground is visible
        if (!this.sceneManager.getGround()) {
            this.sceneManager.createGround();
        }

        // Generate 10 random buildings
        this.buildingGenerator.generateBuildings(10);
    }

    /**
     * Toggle grid
     */
    toggleGrid() {
        const isVisible = this.gridManager.toggle();
        const gridToggle = document.getElementById('gridToggle');
        const gridTogglePref = document.getElementById('gridTogglePref');
        
        if (gridToggle) {
            gridToggle.classList.toggle('active', isVisible);
        }
        
        if (gridTogglePref) {
            gridTogglePref.classList.toggle('active', isVisible);
        }
    }

    /**
     * Toggle object shadows
     */
    toggleObjectShadows() {
        const areEnabled = this.lightingManager.toggleObjectShadows();
        const shadowTogglePref = document.getElementById('shadowTogglePref');
        
        if (shadowTogglePref) {
            shadowTogglePref.classList.toggle('active', areEnabled);
        }
        
        return areEnabled;
    }

    /**
     * Toggle hard shadows
     */
    toggleHardShadows() {
        const areEnabled = this.lightingManager.toggleHardShadows();
        const hardShadowTogglePref = document.getElementById('hardShadowTogglePref');
        
        if (hardShadowTogglePref) {
            hardShadowTogglePref.classList.toggle('active', areEnabled);
        }
        
        return areEnabled;
    }

    /**
     * Set light intensity
     */
    setLightIntensity(intensity) {
        this.lightingManager.setDirectionalIntensity(intensity);
    }

    /**
     * Update light intensity display
     */
    updateLightIntensityDisplay(intensity) {
        const lightIntensityValue = document.getElementById('lightIntensityValuePref');
        if (lightIntensityValue) {
            lightIntensityValue.textContent = intensity.toFixed(1);
        }
    }

    /**
     * Set shadow darkness
     */
    setShadowDarkness(darkness) {
        this.lightingManager.setShadowDarkness(darkness);
    }

    /**
     * Update shadow darkness display
     */
    updateShadowDarknessDisplay(darkness) {
        const shadowDarknessValue = document.getElementById('shadowDarknessValuePref');
        if (shadowDarknessValue) {
            shadowDarknessValue.textContent = darkness.toFixed(2);
        }
    }

    /**
     * Set shadow bias
     */
    setShadowBias(bias) {
        this.lightingManager.setShadowBias(bias);
    }

    /**
     * Update shadow bias display
     */
    updateShadowBiasDisplay(bias) {
        const shadowBiasValue = document.getElementById('shadowBiasValuePref');
        if (shadowBiasValue) {
            shadowBiasValue.textContent = bias.toFixed(5);
        }
    }

    /**
     * Set shadow normal bias
     */
    setShadowNormalBias(normalBias) {
        this.lightingManager.setShadowNormalBias(normalBias);
    }

    /**
     * Update shadow normal bias display
     */
    updateShadowNormalBiasDisplay(normalBias) {
        const shadowNormalBiasValue = document.getElementById('shadowNormalBiasValuePref');
        if (shadowNormalBiasValue) {
            shadowNormalBiasValue.textContent = normalBias.toFixed(2);
        }
    }

    /**
     * Set shadow depth scale
     */
    setShadowDepthScale(depthScale) {
        this.lightingManager.setShadowDepthScale(depthScale);
    }

    /**
     * Update shadow depth scale display
     */
    updateShadowDepthScaleDisplay(depthScale) {
        const shadowDepthScaleValue = document.getElementById('shadowDepthScaleValuePref');
        if (shadowDepthScaleValue) {
            shadowDepthScaleValue.textContent = depthScale.toFixed(0);
        }
    }

    /**
     * Set shadow ortho scale
     */
    setShadowOrthoScale(orthoScale) {
        this.lightingManager.setShadowOrthoScale(orthoScale);
    }

    /**
     * Update shadow ortho scale display
     */
    updateShadowOrthoScaleDisplay(orthoScale) {
        const shadowOrthoScaleValue = document.getElementById('shadowOrthoScaleValuePref');
        if (shadowOrthoScaleValue) {
            shadowOrthoScaleValue.textContent = orthoScale.toFixed(0);
        }
    }

    /**
     * Set shadow frustum size
     */
    setShadowFrustumSize(frustumSize) {
        this.lightingManager.setShadowFrustumSize(frustumSize);
    }

    /**
     * Update shadow frustum size display
     */
    updateShadowFrustumSizeDisplay(frustumSize) {
        const shadowFrustumSizeValue = document.getElementById('shadowFrustumSizeValuePref');
        if (shadowFrustumSizeValue) {
            shadowFrustumSizeValue.textContent = frustumSize.toFixed(0);
        }
    }


    /**
     * Reset camera
     */
    resetCamera() {
        this.cameraController.resetCamera();
    }

    /**
     * Show/hide loading state
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Start stats update interval
     */
    startStatsUpdate() {
        this.statsInterval = setInterval(() => {
            this.updateStats();
        }, 1000);
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const sceneStats = this.sceneManager.getStats();
        const buildingStats = this.buildingGenerator.getStats();
        const lightingStats = this.lightingManager.getStats();

        // Update FPS counter (if footer exists)
        const fpsCounter = document.getElementById('fpsCounter');
        if (fpsCounter) {
            fpsCounter.textContent = `FPS: ${Math.round(sceneStats.fps)}`;
        }

        // Update object count (if footer exists)
        const objectCount = document.getElementById('objectCount');
        if (objectCount) {
            objectCount.textContent = `Objects: ${sceneStats.meshCount}`;
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        if (this.sceneManager && this.sceneManager.getEngine()) {
            this.sceneManager.getEngine().resize();
        }
    }

    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        // Popup removed
    }


    /**
     * Show move instructions
     */
    showMoveInstructions() {
        // Popup removed
    }

    /**
     * Show rotate instructions
     */
    showRotateInstructions() {
        // Popup removed
    }

    /**
     * Toggle coordinate mode (Local/Global)
     */
    toggleCoordinateMode() {
        // Toggle coordinate mode
        this.isGlobalMode = !this.isGlobalMode;
        
        // Update UI
        this.updateCoordinateToggleUI();
        
        // Update transform managers
        this.updateTransformManagers();
        
    }

    /**
     * Update coordinate toggle UI
     */
    updateCoordinateToggleUI() {
        const toggleButton = document.getElementById('coordinateToggle');
        const toggleIcon = document.getElementById('coordinateIcon');
        
        if (toggleButton && toggleIcon) {
            if (this.isGlobalMode) {
                toggleButton.classList.remove('local-mode');
                toggleButton.classList.add('global-mode');
                toggleIcon.src = 'icons/global.svg';
                toggleButton.title = 'Switch to Local Coordinates';
            } else {
                toggleButton.classList.remove('global-mode');
                toggleButton.classList.add('local-mode');
                toggleIcon.src = 'icons/local.svg';
                toggleButton.title = 'Switch to Global Coordinates';
            }
        }
    }

    /**
     * Show scale instructions
     */
    showScaleInstructions() {
        // Popup removed
    }

    /**
     * Update transform managers with current coordinate mode
     */
    updateTransformManagers() {
        // Update move manager
        if (this.moveManager) {
            this.moveManager.setCoordinateMode(this.isGlobalMode);
        }
        
        // Update rotate manager
        if (this.rotateManager) {
            this.rotateManager.setCoordinateMode(this.isGlobalMode);
        }
        
        // Update scale manager
        if (this.scaleManager) {
            this.scaleManager.setCoordinateMode(this.isGlobalMode);
        }
    }

    /**
     * Test 2D shapes
     */
    test2DShapes() {
        if (!this.shape2DManager) {
            return;
        }


        // Create a line
        const startPoint = new BABYLON.Vector3(-10, 0, 0);
        const endPoint = new BABYLON.Vector3(10, 0, 0);
        this.shape2DManager.createLine(startPoint, endPoint, new BABYLON.Color3(1, 1, 0));

        // Create a rectangle
        this.shape2DManager.createRectangle(5, 3, new BABYLON.Vector3(0, 0, 5), new BABYLON.Color3(1, 0, 0));

        // Create a circle
        this.shape2DManager.createCircle(2, new BABYLON.Vector3(0, 0, -5), new BABYLON.Color3(0, 1, 0));

        // Create a triangle
        this.shape2DManager.createTriangle(4, new BABYLON.Vector3(8, 0, 0), new BABYLON.Color3(0, 0, 1));

        // Create 3D text
        this.shape2DManager.createText("2D Shapes Test", 1, new BABYLON.Vector3(0, 2, 0), new BABYLON.Color3(1, 1, 1));

        // Create a polyline
        const polylinePoints = [
            new BABYLON.Vector3(-5, 0, -10),
            new BABYLON.Vector3(-3, 2, -10),
            new BABYLON.Vector3(-1, 0, -10),
            new BABYLON.Vector3(1, 2, -10),
            new BABYLON.Vector3(3, 0, -10),
            new BABYLON.Vector3(5, 2, -10)
        ];
        this.shape2DManager.createPolyline(polylinePoints, new BABYLON.Color3(1, 0, 1));

    }

    /**
     * Create rectangle
     */
    createRectangle() {
        if (!this.rectangleManager) {
            return;
        }

        // Disable camera controls during drawing
        this.disableCameraControls();

        // Set callback for when drawing stops
        this.rectangleManager.onDrawingStopped = () => {
            this.enableCameraControls();
            // Deactivate drawing tool after drawing is complete
            this.deactivateDrawingTool();
        };

        // Set callback for when rectangle is created
        this.rectangleManager.onRectangleCreated = (rectangle) => {
            // Rectangle is automatically added to selection manager by RectangleManager
            console.log('Rectangle created:', rectangle.name);
        };

        // Start interactive rectangle drawing
        this.rectangleManager.startInteractiveDrawing();
    }

    /**
     * Create circle
     */
    createCircle() {
        if (!this.circleManager) {
            return;
        }

        // Disable camera controls during drawing
        this.disableCameraControls();

        // Set callback for when drawing stops
        this.circleManager.onDrawingStopped = () => {
            this.enableCameraControls();
            // Deactivate drawing tool after drawing is complete
            this.deactivateDrawingTool();
        };

        // Set callback for when circle is created
        this.circleManager.onCircleCreated = (circle) => {
            // Circle is automatically added to selection manager by CircleManager
            console.log('Circle created:', circle.name);
        };

        // Start interactive circle drawing
        this.circleManager.startInteractiveDrawing();
    }


    /**
     * Setup drawing event listeners
     */
    setupDrawingEventListeners() {
        if (!this.sceneManager || !this.sceneManager.canvas) return;

        const canvas = this.sceneManager.canvas;
        let isMouseDown = false;
        let isDragging = false;
        let lastTreePosition = null;
        let treePlacementInterval = null;
        // Dynamic tree placement distance will be retrieved from TreeManager

        // Helper function to check if point is on ground
        const isPointOnGround = (x, y) => {
            const pickResult = this.sceneManager.getScene().pick(x, y, (mesh) => {
                return mesh.name === 'ground';
            });
            return pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground';
        };

        // Helper function to get what mesh is under the mouse
        const getMeshUnderMouse = (x, y) => {
            const pickResult = this.sceneManager.getScene().pick(x, y);
            if (pickResult && pickResult.hit && pickResult.pickedMesh) {
                return pickResult.pickedMesh.name;
            }
            return null;
        };

        // Mouse down
        canvas.addEventListener('pointerdown', (event) => {
            // Handle polygon drawing - only left click
            if (this.polygonManager && this.polygonManager.isCurrentlyDrawing && event.button === 0) {
                event.preventDefault();
                event.stopPropagation();

                // Get ground intersection point
                const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                    return mesh.name === 'ground';
                });
                if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground') {
                    const point = pickResult.pickedPoint;
                    this.polygonManager.addPoint(point);
                }
                return;
            }

            // Handle tree placement - only left click
            if (this.treeManager && this.treeManager.isCurrentlyPlacing() && event.button === 0) {
                event.preventDefault();
                event.stopPropagation();

                // Check if point is on ground
                if (isPointOnGround(event.offsetX, event.offsetY)) {
                    // Get ground intersection point
                    const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                        return mesh.name === 'ground';
                    });
                    const point = pickResult.pickedPoint;
                    
                    // Place first tree
                    this.treeManager.placeTree(point);
                    lastTreePosition = point.clone();
                    
                    // Start dragging for continuous tree placement
                    isMouseDown = true;
                    isDragging = false;
                } else {
                    // If not on ground, don't start dragging
                    const meshName = getMeshUnderMouse(event.offsetX, event.offsetY);
                    console.log(`Tree placement blocked - mouse over: ${meshName || 'nothing'}`);
                }
                return;
            }

            if (!this.shape2DManager || !this.shape2DManager.isCurrentlyDrawing()) return;

            // Prevent camera movement during drawing
            event.preventDefault();
            event.stopPropagation();

            isMouseDown = true;
            isDragging = false;

            // Get ground intersection point (ignore temp shapes during drawing)
            const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                // Only pick ground, ignore temp shapes
                return mesh.name === 'ground';
            });
            if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground') {
                const point = pickResult.pickedPoint;
                this.shape2DManager.onMouseDown(point);
            }
        });

        // Mouse move
        canvas.addEventListener('pointermove', (event) => {
            // Handle polygon preview
            if (this.polygonManager && this.polygonManager.isCurrentlyDrawing) {
                event.preventDefault();
                event.stopPropagation();

                // Get ground intersection point for preview
                const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                    return mesh.name === 'ground';
                });
                if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground') {
                    const point = pickResult.pickedPoint;
                    this.polygonManager.updatePreview(point);
                }
                return;
            }

            // Handle continuous tree placement during drag
            if (this.treeManager && this.treeManager.isCurrentlyPlacing() && isMouseDown) {
                event.preventDefault();
                event.stopPropagation();

                // Check if point is on ground
                if (isPointOnGround(event.offsetX, event.offsetY)) {
                    // Get ground intersection point
                    const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                        return mesh.name === 'ground';
                    });
                    const point = pickResult.pickedPoint;
                    
                    // Check if we should place a new tree (minimum distance with random variation)
                    if (lastTreePosition) {
                        const currentDistance = BABYLON.Vector3.Distance(point, lastTreePosition);
                        const requiredDistance = this.treeManager.getRandomTreeDistance();
                        
                        if (currentDistance > requiredDistance) {
                            this.treeManager.placeTree(point);
                            lastTreePosition = point.clone();
                            isDragging = true;
                        }
                    }
                } else {
                    // If not on ground (on building), don't place trees during drag
                    // But continue dragging to allow resuming when back on ground
                    const meshName = getMeshUnderMouse(event.offsetX, event.offsetY);
                    console.log(`Tree placement blocked during drag - mouse over: ${meshName || 'nothing'}`);
                }
                return;
            }

            // Prevent camera movement during tree placement
            if (this.treeManager && this.treeManager.isCurrentlyPlacing()) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (!this.shape2DManager || !this.shape2DManager.isCurrentlyDrawing()) return;

            // Only handle mouse move if mouse is down (dragging)
            if (isMouseDown) {
                // Prevent camera movement during drawing
                event.preventDefault();
                event.stopPropagation();

                isDragging = true;

                // Get ground intersection point (ignore temp shapes during drawing)
                const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                    // Only pick ground, ignore temp shapes
                    return mesh.name === 'ground';
                });
                if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground') {
                    const point = pickResult.pickedPoint;
                    this.shape2DManager.onMouseMove(point);
                }
            }
        });

        // Mouse up
        canvas.addEventListener('pointerup', (event) => {
            // Handle tree placement drag end
            if (this.treeManager && this.treeManager.isCurrentlyPlacing() && isMouseDown) {
                event.preventDefault();
                event.stopPropagation();
                
                // End dragging
                isMouseDown = false;
                isDragging = false;
                lastTreePosition = null;
                
                console.log('Tree placement drag ended');
                return;
            }

            // Prevent camera movement during tree placement
            if (this.treeManager && this.treeManager.isCurrentlyPlacing()) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            if (!this.shape2DManager || !this.shape2DManager.isCurrentlyDrawing()) return;

            // Prevent camera movement during drawing
            event.preventDefault();
            event.stopPropagation();

            if (isMouseDown) {
                isMouseDown = false;

                // Get ground intersection point (ignore temp shapes during drawing)
                const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                    // Only pick ground, ignore temp shapes
                    return mesh.name === 'ground';
                });
                if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground') {
                    const point = pickResult.pickedPoint;
                    this.shape2DManager.onMouseUp(point);
                }
            }
        });


        // Keyboard events
        document.addEventListener('keydown', (event) => {
            // Handle polygon drawing specific keys first
            if (this.polygonManager && this.polygonManager.isCurrentlyDrawing) {
                if (event.key === 'Backspace') {
                    // Remove last point during polygon drawing
                    const removed = this.polygonManager.removeLastPoint();
                    if (removed) {
                        console.log('Last point removed from polygon');
                        event.preventDefault(); // Prevent default browser behavior
                    }
                    return;
                } else if (event.key === 'Escape') {
                    this.cancelPolygonDrawing();
                    
                    // Deactivate drawing tool
                    const activeTool = document.querySelector('#drawingPanel .tool-item.active');
                    if (activeTool) {
                        activeTool.classList.remove('active');
                    }
                    
                    return;
                } else if (event.key === 'Enter') {
                    this.completePolygonDrawing();
                    
                    // Deactivate drawing tool
                    const activeTool = document.querySelector('#drawingPanel .tool-item.active');
                    if (activeTool) {
                        activeTool.classList.remove('active');
                    }
                    
                    return;
                }
            }

            // Handle Shift+F for statistics toggle
            if (event.shiftKey && event.key.toLowerCase() === 'f') {
                event.preventDefault();
                this.toggleStatistics();
                return;
            }

            // Handle Delete key for selected objects (only when not drawing polygon and properties popup is not open)
            if (event.key === 'Delete' || event.key === 'Backspace') {
                // Check if properties popup is open
                const propertiesPopup = document.getElementById('propertiesPopup');
                if (propertiesPopup && propertiesPopup.classList.contains('show')) {
                    // Don't delete objects when properties popup is open
                    return;
                }
                this.deleteSelectedObjects();
                return;
            }

            // Handle Escape key for other drawing modes
            if (this.shape2DManager && this.shape2DManager.isCurrentlyDrawing()) {
                if (event.key === 'Escape') {
                    this.shape2DManager.stopInteractiveDrawing();
                    
                    // Re-enable camera controls
                    this.enableCameraControls();
                    
                    // Deactivate drawing tool
                    const activeTool = document.querySelector('#drawingPanel .tool-item.active');
                    if (activeTool) {
                        activeTool.classList.remove('active');
                    }
                    
                    console.log('Drawing cancelled');
                }
            } else if (this.treeManager && this.treeManager.isCurrentlyPlacing()) {
                if (event.key === 'Escape') {
                    this.deactivateTreePlacement();
                    console.log('Tree placement cancelled');
                }
            }

            // Handle Shift+A for Select All
            if (event.shiftKey && event.key === 'A') {
                event.preventDefault(); // Prevent default browser behavior
                this.selectAll();
                return;
            }

            // Handle Shift+D for Clear Selection
            if (event.shiftKey && event.key === 'D') {
                event.preventDefault(); // Prevent default browser behavior
                this.clearSelection();
                return;
            }
        });
    }

    /**
     * Disable camera controls
     */
    disableCameraControls() {
        if (this.cameraController && this.cameraController.camera) {
            // Store current camera state
            this.cameraControlsDisabled = true;
            
            // Use CameraController's method to disable controls
            if (typeof this.cameraController.setControlsEnabled === 'function') {
                this.cameraController.setControlsEnabled(false);
                console.log('Camera controls disabled via CameraController');
            } else {
                // Fallback to direct camera control
                if (typeof this.cameraController.camera.detachControls === 'function') {
                    this.cameraController.camera.detachControls();
                    console.log('Camera controls disabled via detachControls');
                } else if (typeof this.cameraController.camera.detachControl === 'function') {
                    this.cameraController.camera.detachControl();
                    console.log('Camera controls disabled via detachControl');
                }
            }
            
            console.log('Camera controls disabled for drawing');
        } else {
            console.warn('Cannot disable camera controls: cameraController or camera not available');
        }
    }

    /**
     * Enable camera controls
     */
    enableCameraControls() {
        if (this.cameraController && this.cameraController.camera) {
            // Use CameraController's method to enable controls
            if (typeof this.cameraController.setControlsEnabled === 'function') {
                this.cameraController.setControlsEnabled(true);
                console.log('Camera controls enabled via CameraController');
            } else {
                // Fallback to direct camera control
                if (typeof this.cameraController.camera.attachControl === 'function') {
                    this.cameraController.camera.attachControl(this.sceneManager.canvas, true);
                    console.log('Camera controls enabled via attachControl');
                } else if (typeof this.cameraController.camera.attachControls === 'function') {
                    this.cameraController.camera.attachControls(this.sceneManager.canvas, true);
                    console.log('Camera controls enabled via attachControls');
                }
            }
            
            this.cameraControlsDisabled = false;
            console.log('Camera controls enabled');
        } else {
            console.warn('Cannot enable camera controls: cameraController or camera not available');
        }
    }

    /**
     * Deactivate drawing tool
     */
    deactivateDrawingTool() {
        const activeTool = document.querySelector('#drawingPanel .tool-item.active');
        if (activeTool) {
            activeTool.classList.remove('active');
        }
        
        // Also deactivate tree placement when deactivating drawing tools
        this.deactivateTreePlacement();
    }

    /**
     * Check if select tool is active
     */
    isSelectToolActive() {
        const activeTool = document.querySelector('#transformPanel .tool-item.active');
        return activeTool && activeTool.getAttribute('data-tool') === 'select';
    }

    /**
     * Setup properties popup
     */
    setupPropertiesPopup() {
        // Close button
        document.getElementById('closeProperties').addEventListener('click', () => {
            this.hidePropertiesPopup();
        });

        // Cancel button
        document.getElementById('cancelProperties').addEventListener('click', () => {
            this.hidePropertiesPopup();
        });

        // Save button
        document.getElementById('saveProperties').addEventListener('click', () => {
            this.saveShapeProperties();
        });

        // Shape type change
        document.getElementById('shapeType').addEventListener('change', (e) => {
            const newType = e.target.value;
            console.log('Type changed to:', newType);
            this.updatePropertiesFields(newType);
            
            // Update userData type immediately
            if (this.currentShape) {
                this.currentShape.userData = this.currentShape.userData || {};
                this.currentShape.userData.type = newType;
                console.log('Updated userData.type to:', newType);
            }
            
            this.updateShapeInRealTime();
        });

        // Real-time updates for all input fields
        document.getElementById('shapeColor').addEventListener('input', () => {
            this.updateShapeInRealTime();
        });

        document.getElementById('shapeLength').addEventListener('input', () => {
            this.updateShapeInRealTime();
        });

        document.getElementById('shapeWidth').addEventListener('input', () => {
            this.updateShapeInRealTime();
        });

        document.getElementById('shapeHeight').addEventListener('input', () => {
            this.updateShapeInRealTime();
            this.previewHeightChanges();
        });

        document.getElementById('shapeRadius').addEventListener('input', () => {
            this.updateShapeInRealTime();
        });

        // Prevent backspace from closing popup when typing in input fields
        const popup = document.getElementById('propertiesPopup');
        popup.addEventListener('keydown', (event) => {
            // Allow backspace in input fields
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
                event.stopPropagation();
            }
        });
    }

    /**
     * Show properties popup for a shape
     */
    showPropertiesPopup(shape) {
        this.currentShape = shape;
        
        // Get shape properties
        const properties = this.getShapeProperties(shape);
        
        // Get original color from SelectionManager if shape is selected
        let originalColor = properties.color;
        if (this.selectionManager && this.selectionManager.selectedObjects.includes(shape)) {
            const originalMaterial = this.selectionManager.originalMaterials.get(shape);
            if (originalMaterial && originalMaterial.diffuseColor) {
                const color = originalMaterial.diffuseColor;
                originalColor = this.rgbToHex(
                    Math.round(color.r * 255),
                    Math.round(color.g * 255),
                    Math.round(color.b * 255)
                );
            }
        }
        
        // Fill form fields
        document.getElementById('shapeName').value = properties.name;
        document.getElementById('shapeType').value = properties.type;
        document.getElementById('shapeColor').value = originalColor;
        document.getElementById('shapeLength').value = properties.length;
        document.getElementById('shapeWidth').value = properties.width;
        
        // Set values for specific fields first
        if (properties.type === 'building') {
            document.getElementById('shapeHeight').value = properties.height || 0.1;
        }
        
        // Show/hide fields based on shape type
        this.updatePropertiesFields(properties.type);
        
        if (properties.shapeType === 'circle') {
            document.getElementById('shapeRadius').value = properties.radius;
        }
        
        // Show popup
        document.getElementById('propertiesPopup').classList.add('show');
    }

    /**
     * Hide properties popup
     */
    hidePropertiesPopup() {
        // Remove preview extrusion when hiding popup
        this.removePreviewExtrusion();
        
        document.getElementById('propertiesPopup').classList.remove('show');
        this.currentShape = null;
    }

    /**
     * Update shape in real-time based on popup values
     */
    updateShapeInRealTime() {
        if (!this.currentShape) return;

        // Get current values from popup
        const type = document.getElementById('shapeType').value;
        const color = document.getElementById('shapeColor').value;
        const length = parseFloat(document.getElementById('shapeLength').value) || 0;
        const width = parseFloat(document.getElementById('shapeWidth').value) || 0;
        const height = Math.max(parseFloat(document.getElementById('shapeHeight').value) || 0, 0.001);
        const radius = parseFloat(document.getElementById('shapeRadius').value) || 0;

        // Update material color based on type
        let newColor;
        if (type === 'building') {
            newColor = new BABYLON.Color3(1, 1, 1); // White for buildings
        } else if (type === 'ground') {
            newColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground
        } else if (type === 'waterway') {
            newColor = new BABYLON.Color3(0, 0.5, 1); // Blue for waterway
        } else if (type === 'highway') {
            newColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
        } else if (type === 'green') {
            newColor = new BABYLON.Color3(0, 0.8, 0); // Green for green areas
        } else {
            // Use custom color for other types
            const rgbColor = this.hexToRgb(color);
            newColor = new BABYLON.Color3(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255);
        }
        
        // Check if shape is currently selected (has highlight material)
        const isSelected = this.selectionManager && this.selectionManager.selectedObjects.includes(this.currentShape);
        
        if (isSelected) {
            // Shape is selected - update the original material in SelectionManager
            const originalMaterial = this.selectionManager.originalMaterials.get(this.currentShape);
            if (originalMaterial) {
                originalMaterial.diffuseColor = newColor;
            }
            
            // Update extrusion original material if it exists
            if (this.currentShape.extrusion) {
                const extrusionOriginalMaterial = this.selectionManager.originalMaterials.get(this.currentShape.extrusion);
                if (extrusionOriginalMaterial) {
                    extrusionOriginalMaterial.diffuseColor = newColor;
                }
            }
        } else {
            // Shape is not selected - update material directly
            if (this.currentShape.material && this.currentShape.material.diffuseColor) {
                this.currentShape.material.diffuseColor = newColor;
            }
            
            // Update extrusion material color if it exists
            if (this.currentShape.extrusion && this.currentShape.extrusion.material) {
                this.currentShape.extrusion.material.diffuseColor = newColor;
            }
        }

        // Update geometry based on shape type
        this.updateShapeGeometry(this.currentShape, {
            type: type,
            length: length,
            width: width,
            height: height,
            radius: radius
        });

        // Update userData
        this.currentShape.userData = this.currentShape.userData || {};
        this.currentShape.userData.type = type;
        
        // Update dimensions in userData for rectangles, buildings, and circles
        if (this.getShapeType(this.currentShape) === 'rectangle' || this.getShapeType(this.currentShape) === 'building') {
            this.currentShape.userData.dimensions = {
                width: length,
                depth: width,
                height: height
            };
            this.currentShape.userData.originalHeight = height;
        } else if (this.getShapeType(this.currentShape) === 'circle') {
            this.currentShape.userData.dimensions = {
                radius: radius,
                height: height
            };
            this.currentShape.userData.originalHeight = height;
        }
    }

    /**
     * Update shape geometry
     */
    updateShapeGeometry(shape, properties) {
        const shapeType = this.getShapeType(shape);
        
        if (shapeType === 'rectangle') {
            this.updateRectangleGeometry(shape, properties);
        } else if (shapeType === 'building') {
            this.updateBuildingGeometry(shape, properties);
        } else if (shapeType === 'circle') {
            this.updateCircleGeometry(shape, properties);
        } else if (shapeType === 'polygon') {
            this.updatePolygonGeometry(shape, properties);
        }
    }

    /**
     * Update building geometry
     */
    updateBuildingGeometry(shape, properties) {
        // Store current position and material
        const currentPosition = shape.position.clone();
        const currentMaterial = shape.material;
        const currentName = this.generateUniqueNameByType(properties.type);
        const isSelected = this.selectionManager && this.selectionManager.isSelected(shape);
        
        // Remove from selection manager first
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(shape);
            this.selectionManager.originalMaterials.delete(shape);
        }
        
        // Dispose old mesh completely
        if (shape.geometry) { shape.geometry.dispose(); }
        if (shape.material && shape.material !== this.sceneManager.getScene().defaultMaterial) { shape.material.dispose(); }
        shape.setEnabled(false);
        shape.dispose();
        
        // Create new 3D box mesh with updated dimensions
        const newMesh = BABYLON.MeshBuilder.CreateBox(currentName, {
            width: properties.length,
            height: properties.height,
            depth: properties.width
        }, this.sceneManager.getScene());
        
        // Restore position (center the box vertically based on new height)
        newMesh.position = new BABYLON.Vector3(
            currentPosition.x,
            properties.height / 2, // Center the box vertically based on new height
            currentPosition.z
        );
        
        // Create new material with appropriate color based on type
        const newMaterial = new BABYLON.StandardMaterial(`${currentName}Material`, this.sceneManager.getScene());
        
        // Set color based on type
        if (properties.type === 'building') {
            newMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // White for buildings
        } else if (properties.type === 'ground') {
            newMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground
        } else if (properties.type === 'waterway') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.5, 1); // Blue for waterway
        } else if (properties.type === 'highway') {
            newMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
        } else if (properties.type === 'green') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Green for green areas
        } else {
            newMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // Default white
        }
        
        newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        newMaterial.roughness = 0.7;
        newMaterial.twoSidedLighting = true;
        
        newMesh.material = newMaterial;
        newMesh.renderingGroupId = 1;
        newMesh.enableEdgesRendering();
        newMesh.edgesWidth = 1.0;
        newMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Update userData
        newMesh.userData = {
            type: properties.type,
            shapeType: 'building',
            dimensions: {
                width: properties.length,
                depth: properties.width,
                height: properties.height
            },
            originalHeight: properties.height
        };
        
        // Update currentShape reference
        this.currentShape = newMesh;
        
        // Make new mesh selectable
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(newMesh);
            if (isSelected) {
                this.selectionManager.originalMaterials.set(newMesh, currentMaterial);
                this.selectionManager.selectObject(newMesh, false, false);
            }
        }
        
        // Enable shadows for the new mesh
        if (this.lightingManager) {
            this.lightingManager.updateShadowsForNewObject(newMesh);
        }
    }

    /**
     * Update polygon geometry
     */
    updatePolygonGeometry(shape, properties) {
        // Store current position and material
        const currentPosition = shape.position.clone();
        const currentMaterial = shape.material;
        const currentName = shape.name;
        const currentUserData = shape.userData || {};
        const currentPoints = currentUserData.points || [];

        // Dispose old mesh
        shape.dispose();

        if (properties.type === 'building' && properties.height > 0.001) {
            // Create extrusion for building
            this.createPolygonExtrusion(currentName, currentPoints, properties.height, currentPosition, currentMaterial, currentUserData);
        } else {
            // Keep as 2D polygon
            this.createPolygonMesh(currentName, currentPoints, currentPosition, currentMaterial, currentUserData);
        }
    }

    /**
     * Create polygon mesh (2D)
     */
    createPolygonMesh(name, points, position, material, userData) {
        if (points.length < 3) return;

        // Calculate center and relative points
        const center = BABYLON.Vector3.Zero();
        points.forEach(point => center.addInPlace(point));
        center.scaleInPlace(1 / points.length);
        center.y = 0;

        const relativePoints = points.map(point => point.subtract(center));

        // Create polygon mesh using PolygonManager's method
        const mesh = this.createCustomPolygonMesh(relativePoints);
        mesh.name = name;
        mesh.material = material;
        mesh.renderingGroupId = 1;
        mesh.receiveShadows = true;
        mesh.castShadows = true;
        mesh.position = center;
        mesh.userData = userData;

        // Add to selection manager
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(mesh);
        }
    }

    /**
     * Create polygon extrusion (3D building)
     */
    createPolygonExtrusion(name, points, height, position, material, userData) {
        if (points.length < 3) return;

        console.log(`Creating polygon extrusion for ${name} with ${points.length} points`);

        // Create 2D polygon base
        this.createPolygonMesh(name, points, position, material, userData);

        // Ensure points are in the correct order (same as the base polygon)
        const correctedPoints = this.ensureCounterClockwiseForExtrusion(points);
        console.log(`Using ${correctedPoints.length} corrected points for extrusion`);

        // Create extrusion using custom method with corrected points
        const extrusionName = name + '_extrusion';
        const extrusion = this.createCustomPolygonExtrusion(extrusionName, correctedPoints, height);

        // Calculate center of polygon for positioning
        const centerX = correctedPoints.reduce((sum, p) => sum + p.x, 0) / correctedPoints.length;
        const centerZ = correctedPoints.reduce((sum, p) => sum + p.z, 0) / correctedPoints.length;
        
        extrusion.position = new BABYLON.Vector3(centerX, position.y, centerZ);
        // Keep extrusion at the same Y level as the base polygon
        extrusion.material = material;
        extrusion.renderingGroupId = 1;
        extrusion.receiveShadows = true;
        extrusion.castShadows = true;
        extrusion.userData = {
            ...userData,
            type: 'building',
            buildingHeight: height
        };

        // Link extrusion to base polygon
        const scene = this.sceneManager.getScene();
        const basePolygon = scene.getMeshByName(name);
        if (basePolygon) {
            basePolygon.extrusion = extrusion;
            extrusion.basePolygon = basePolygon;
            
            // Make extrusion a child of base polygon for transform synchronization
            extrusion.setParent(basePolygon);
        }

        // Add to selection manager
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(extrusion);
        }
    }

    /**
     * Create custom polygon mesh (helper method)
     */
    createCustomPolygonMesh(relativePoints) {
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Add polygon vertices
        relativePoints.forEach((point, index) => {
            positions.push(point.x, 0.01, point.z);
            normals.push(0, 1, 0); // Normal pointing upward
            
            const u = (point.x + 1) / 2;
            const v = (point.z + 1) / 2;
            uvs.push(u, v);
        });

        // Triangulate polygon
        this.triangulatePolygon(relativePoints, indices);

        const scene = this.sceneManager.getScene();
        const mesh = new BABYLON.Mesh("polygon", scene);
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
        mesh.setIndices(indices);

        return mesh;
    }

    /**
     * Triangulate polygon (helper method)
     */
    triangulatePolygon(points, indices) {
        if (points.length < 3) return;
        
        if (points.length === 3) {
            indices.push(0, 2, 1); // Reverse order for upward normals
            return;
        }
        
        if (points.length === 4) {
            indices.push(0, 2, 1); // Reverse order for upward normals
            indices.push(0, 3, 2);
            return;
        }
        
        const vertexIndices = [];
        for (let i = 0; i < points.length; i++) {
            vertexIndices.push(i);
        }
        
        let attempts = 0;
        const maxAttempts = vertexIndices.length * 2; // Prevent infinite loops
        
        while (vertexIndices.length > 3 && attempts < maxAttempts) {
            let earFound = false;
            
            for (let i = 0; i < vertexIndices.length; i++) {
                const prev = vertexIndices[(i - 1 + vertexIndices.length) % vertexIndices.length];
                const curr = vertexIndices[i];
                const next = vertexIndices[(i + 1) % vertexIndices.length];
                
                if (this.isEar(points, vertexIndices, prev, curr, next)) {
                    indices.push(prev, next, curr); // Reverse order for upward normals
                    vertexIndices.splice(i, 1);
                    earFound = true;
                    break;
                }
            }
            
            if (!earFound) {
                // Try to find any convex vertex and force triangulation
                let convexFound = false;
                for (let i = 0; i < vertexIndices.length; i++) {
                    const prev = vertexIndices[(i - 1 + vertexIndices.length) % vertexIndices.length];
                    const curr = vertexIndices[i];
                    const next = vertexIndices[(i + 1) % vertexIndices.length];
                    
                    if (this.isConvex(points, prev, curr, next)) {
                        indices.push(prev, next, curr);
                        vertexIndices.splice(i, 1);
                        convexFound = true;
                        break;
                    }
                }
                
                if (!convexFound) {
                    // Force triangulation from first vertex
                    for (let i = 1; i < vertexIndices.length - 1; i++) {
                        indices.push(vertexIndices[0], vertexIndices[i + 1], vertexIndices[i]);
                    }
                    break;
                }
            }
            
            attempts++;
        }
        
        if (vertexIndices.length === 3) {
            indices.push(vertexIndices[0], vertexIndices[2], vertexIndices[1]); // Reverse order for upward normals
        }
    }

    /**
     * Check if vertex is an ear (helper method)
     */
    isEar(points, vertexIndices, prev, curr, next) {
        const p1 = points[prev];
        const p2 = points[curr];
        const p3 = points[next];
        
        const cross = (p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x);
        if (cross <= 0) return false; // Not convex
        
        for (let i = 0; i < vertexIndices.length; i++) {
            const idx = vertexIndices[i];
            if (idx === prev || idx === curr || idx === next) continue;
            
            const point = points[idx];
            if (this.isPointInTriangle(point, p1, p2, p3)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Check if vertex is convex (helper method)
     */
    isConvex(points, prev, curr, next) {
        const p1 = points[prev];
        const p2 = points[curr];
        const p3 = points[next];
        
        // Check if the triangle is convex (counter-clockwise)
        const cross = (p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x);
        return cross > 0; // Convex if counter-clockwise
    }

    /**
     * Check if point is inside triangle (helper method)
     */
    isPointInTriangle(point, a, b, c) {
        const denom = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
        if (Math.abs(denom) < 0.0001) return false;
        
        const alpha = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / denom;
        const beta = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / denom;
        const gamma = 1 - alpha - beta;
        
        return alpha >= 0 && beta >= 0 && gamma >= 0;
    }

    /**
     * Create custom polygon extrusion (3D building)
     */
    createCustomPolygonExtrusion(name, points, height) {
        console.log(`Creating extrusion for ${name} with ${points.length} points and height ${height}`);
        
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Calculate center of polygon
        const centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const centerZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;

        // Create bottom face (same as 2D polygon)
        points.forEach((point, index) => {
            const relativeX = point.x - centerX;
            const relativeZ = point.z - centerZ;
            positions.push(relativeX, 0, relativeZ);
            normals.push(0, 1, 0); // Bottom face normals point up (inverted)
            uvs.push(relativeX, relativeZ);
        });

        // Create top face with actual height
        points.forEach((point, index) => {
            const relativeX = point.x - centerX;
            const relativeZ = point.z - centerZ;
            positions.push(relativeX, height, relativeZ); // Use actual height
            normals.push(0, -1, 0); // Top face normals point down (inverted)
            uvs.push(relativeX, relativeZ);
        });

        // Use the same triangulation method as PolygonManager for consistency
        const bottomIndices = [];
        this.triangulatePolygonForExtrusionConsistent(points, bottomIndices, false);
        indices.push(...bottomIndices);

        // Triangulate top face (reverse order for downward normals)
        const topIndices = [];
        this.triangulatePolygonForExtrusionConsistent(points, topIndices, true);
        indices.push(...topIndices.map(i => i + points.length));

        // Create side faces
        for (let i = 0; i < points.length; i++) {
            const next = (i + 1) % points.length;
            const bottom1 = i;
            const bottom2 = next;
            const top1 = i + points.length;
            const top2 = next + points.length;

            // Create two triangles for each side face
            indices.push(bottom1, top1, bottom2);
            indices.push(bottom2, top1, top2);

            // Calculate side face normal
            const p1 = points[i];
            const p2 = points[next];
            const sideNormal = new BABYLON.Vector3(p2.z - p1.z, 0, p1.x - p2.x).normalize();
            
            // Add side face normals
            normals[bottom1 * 3 + 0] = sideNormal.x;
            normals[bottom1 * 3 + 1] = sideNormal.y;
            normals[bottom1 * 3 + 2] = sideNormal.z;
            
            normals[top1 * 3 + 0] = sideNormal.x;
            normals[top1 * 3 + 1] = sideNormal.y;
            normals[top1 * 3 + 2] = sideNormal.z;
        }

        // Create mesh
        const scene = this.sceneManager.getScene();
        const mesh = new BABYLON.Mesh(name, scene);
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
        mesh.setIndices(indices);

        console.log(`Extrusion created with ${positions.length / 3} vertices and ${indices.length / 3} triangles`);
        return mesh;
    }

    /**
     * Triangulate polygon for extrusion using the same method as PolygonManager
     */
    triangulatePolygonForExtrusionConsistent(points, indices, reverse = false) {
        if (points.length < 3) return;
        
        // Use the same triangulation logic as PolygonManager
        if (points.length === 3) {
            if (reverse) {
                indices.push(0, 2, 1);
            } else {
                indices.push(0, 1, 2);
            }
            return;
        }
        
        if (points.length === 4) {
            if (reverse) {
                indices.push(0, 2, 1);
                indices.push(0, 3, 2);
            } else {
                indices.push(0, 1, 2);
                indices.push(0, 2, 3);
            }
            return;
        }
        
        // For complex polygons, use ear clipping algorithm (same as PolygonManager)
        const vertexIndices = [];
        for (let i = 0; i < points.length; i++) {
            vertexIndices.push(i);
        }
        
        let iterations = 0;
        const maxIterations = points.length * 2;
        
        while (vertexIndices.length > 3 && iterations < maxIterations) {
            let earFound = false;
            iterations++;
            
            for (let i = 0; i < vertexIndices.length; i++) {
                const prev = vertexIndices[(i - 1 + vertexIndices.length) % vertexIndices.length];
                const curr = vertexIndices[i];
                const next = vertexIndices[(i + 1) % vertexIndices.length];
                
                if (this.isEarForExtrusion(points, vertexIndices, prev, curr, next)) {
                    if (reverse) {
                        indices.push(prev, next, curr);
                    } else {
                        indices.push(prev, curr, next);
                    }
                    
                    vertexIndices.splice(i, 1);
                    earFound = true;
                    break;
                }
            }
            
            if (!earFound) {
                // Fallback to fan triangulation
                console.warn('Ear clipping failed in extrusion, using fan triangulation');
                for (let i = 1; i < vertexIndices.length - 1; i++) {
                    if (reverse) {
                        indices.push(vertexIndices[0], vertexIndices[i + 1], vertexIndices[i]);
                    } else {
                        indices.push(vertexIndices[0], vertexIndices[i], vertexIndices[i + 1]);
                    }
                }
                break;
            }
        }
        
        // Add the final triangle
        if (vertexIndices.length === 3) {
            if (reverse) {
                indices.push(vertexIndices[0], vertexIndices[2], vertexIndices[1]);
            } else {
                indices.push(vertexIndices[0], vertexIndices[1], vertexIndices[2]);
            }
        }
    }

    /**
     * Check if a vertex is an ear for extrusion triangulation
     */
    isEarForExtrusion(points, vertexIndices, prev, curr, next) {
        const p1 = points[prev];
        const p2 = points[curr];
        const p3 = points[next];
        
        // Check if the triangle is convex (counter-clockwise)
        const cross = this.calculateCrossProductForExtrusion(p1, p2, p3);
        if (cross <= 0) return false; // Not convex
        
        // Check if any other vertex is inside the triangle
        for (let i = 0; i < vertexIndices.length; i++) {
            const idx = vertexIndices[i];
            if (idx === prev || idx === curr || idx === next) continue;
            
            const point = points[idx];
            if (this.isPointInTriangleForExtrusion(point, p1, p2, p3)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Calculate cross product for extrusion triangulation
     */
    calculateCrossProductForExtrusion(p1, p2, p3) {
        const v1x = p2.x - p1.x;
        const v1z = p2.z - p1.z;
        const v2x = p3.x - p1.x;
        const v2z = p3.z - p1.z;
        
        const cross = v1x * v2z - v1z * v2x;
        
        const epsilon = 1e-10;
        if (Math.abs(cross) < epsilon) {
            return 0;
        }
        
        return cross;
    }

    /**
     * Check if a point is inside a triangle for extrusion
     */
    isPointInTriangleForExtrusion(point, a, b, c) {
        const denom = (b.z - c.z) * (a.x - c.x) + (c.x - b.x) * (a.z - c.z);
        if (Math.abs(denom) < 0.0001) {
            return false;
        }
        
        const alpha = ((b.z - c.z) * (point.x - c.x) + (c.x - b.x) * (point.z - c.z)) / denom;
        const beta = ((c.z - a.z) * (point.x - c.x) + (a.x - c.x) * (point.z - c.z)) / denom;
        const gamma = 1 - alpha - beta;
        
        return alpha >= 0 && beta >= 0 && gamma >= 0;
    }

    /**
     * Ensure polygon has counter-clockwise winding order for extrusion
     * @param {BABYLON.Vector3[]} points - Polygon points
     * @returns {BABYLON.Vector3[]} Points with correct winding order
     */
    ensureCounterClockwiseForExtrusion(points) {
        let totalCross = 0;
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            const cross = this.calculateCrossProductForExtrusion(prev, curr, next);
            totalCross += cross;
        }
        
        // If clockwise, reverse the order
        if (totalCross < 0) {
            console.log('Reversing polygon winding order for extrusion to counter-clockwise');
            return points.slice().reverse();
        }
        
        return points;
    }

    /**
     * Triangulate polygon for extrusion (legacy method)
     */
    triangulatePolygonForExtrusion(points, indices, reverse = false) {
        if (points.length < 3) return;
        
        if (points.length === 3) {
            if (reverse) {
                indices.push(0, 2, 1);
            } else {
                indices.push(0, 1, 2);
            }
            return;
        }
        
        if (points.length === 4) {
            if (reverse) {
                indices.push(0, 2, 1);
                indices.push(0, 3, 2);
            } else {
                indices.push(0, 1, 2);
                indices.push(0, 2, 3);
            }
            return;
        }
        
        // For more complex polygons, use fan triangulation
        for (let i = 1; i < points.length - 1; i++) {
            if (reverse) {
                indices.push(0, i + 1, i);
            } else {
                indices.push(0, i, i + 1);
            }
        }
    }

    /**
     * Update rectangle geometry
     */
    updateRectangleGeometry(shape, properties) {
        // Store current position and material
        const currentPosition = shape.position.clone();
        const currentMaterial = shape.material;
        // Generate new name based on type
        const currentName = this.generateUniqueNameByType(properties.type);
        const currentUserData = shape.userData;

        // Check if shape is selected
        const isSelected = this.selectionManager && this.selectionManager.selectedObjects.includes(shape);
        
        // Remove from selection manager first
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(shape);
            this.selectionManager.originalMaterials.delete(shape);
        }

        // Dispose old mesh completely
        if (shape.geometry) {
            shape.geometry.dispose();
        }
        if (shape.material && shape.material !== this.sceneManager.getScene().defaultMaterial) {
            shape.material.dispose();
        }
        
        // Remove from scene before disposing
        shape.setEnabled(false);
        shape.dispose();
        
        // Force garbage collection hint
        if (this.sceneManager.getScene().getEngine()._gl) {
            this.sceneManager.getScene().getEngine()._gl.flush();
        }

        // Create new 3D box mesh with updated dimensions (always start with unit box)
        const newMesh = BABYLON.MeshBuilder.CreateBox(currentName, {
            width: properties.length,
            height: properties.height,
            depth: properties.width
        }, this.sceneManager.getScene());

        // Create new material with appropriate color based on type
        const newMaterial = new BABYLON.StandardMaterial(`${currentName}Material`, this.sceneManager.getScene());
        
        // Set color based on type
        if (properties.type === 'building') {
            newMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // White for buildings
        } else if (properties.type === 'ground') {
            newMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground
        } else if (properties.type === 'waterway') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.5, 1); // Blue for waterway
        } else if (properties.type === 'highway') {
            newMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
        } else if (properties.type === 'green') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Green for green areas
        } else {
            // Use original material color for other types
            if (currentMaterial && currentMaterial.diffuseColor) {
                newMaterial.diffuseColor = currentMaterial.diffuseColor.clone();
            } else {
                newMaterial.diffuseColor = new BABYLON.Color3(0, 1, 0); // Default green
            }
        }
        
        // Set common material properties
        newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        newMaterial.roughness = 0.7;
        
        // Restore properties
        newMesh.position = new BABYLON.Vector3(
            currentPosition.x,
            properties.height / 2, // Center the box vertically
            currentPosition.z
        );
        newMesh.material = newMaterial;
        newMesh.renderingGroupId = 1;
        newMesh.userData = currentUserData;

        // Apply anti-flickering settings
        newMesh.enableEdgesRendering();
        newMesh.edgesWidth = 1.0;
        newMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

        // Update userData dimensions and type
        newMesh.userData.dimensions = {
            width: properties.length,
            depth: properties.width,
            height: properties.height
        };
        newMesh.userData.type = properties.type;
        newMesh.userData.shapeType = properties.type === 'building' ? 'building' : 'rectangle';
        newMesh.userData.originalHeight = properties.height;

        // Update currentShape reference
        this.currentShape = newMesh;

        // Make new mesh selectable
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(newMesh);
            
            // If the old shape was selected, select the new one
            if (isSelected) {
                this.selectionManager.originalMaterials.set(newMesh, newMaterial);
                this.selectionManager.selectObject(newMesh, false, false);
            }
        }

        // Update rectangleManager rectangles array
        if (this.rectangleManager) {
            // Remove old mesh from rectangles array
            const oldIndex = this.rectangleManager.rectangles.indexOf(shape);
            if (oldIndex !== -1) {
                this.rectangleManager.rectangles.splice(oldIndex, 1);
            }
            // Add new mesh to rectangles array
            this.rectangleManager.rectangles.push(newMesh);
        }

        // Enable shadows for the new mesh
        if (this.lightingManager) {
            this.lightingManager.updateShadowsForNewObject(newMesh);
        }
    }

    /**
     * Update circle geometry
     */
    updateCircleGeometry(shape, properties) {
        // Store current position and material
        const currentPosition = shape.position.clone();
        const currentMaterial = shape.material;
        // Generate new name based on type
        const currentName = this.generateUniqueNameByType(properties.type);
        const currentUserData = shape.userData;

        // Check if shape is selected
        const isSelected = this.selectionManager && this.selectionManager.selectedObjects.includes(shape);
        
        // Remove from selection manager first
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(shape);
            this.selectionManager.originalMaterials.delete(shape);
        }
        
        // Dispose old mesh completely
        if (shape.geometry) { shape.geometry.dispose(); }
        if (shape.material && shape.material !== this.sceneManager.getScene().defaultMaterial) { shape.material.dispose(); }
        shape.setEnabled(false);
        shape.dispose();

        // Create new 3D cylinder mesh with updated dimensions
        const newMesh = BABYLON.MeshBuilder.CreateCylinder(currentName, {
            radius: properties.radius,
            height: properties.height,
            tessellation: 32
        }, this.sceneManager.getScene());

        // Create new material with appropriate color based on type
        const newMaterial = new BABYLON.StandardMaterial(`${currentName}Material`, this.sceneManager.getScene());
        
        // Set color based on type
        if (properties.type === 'building') {
            newMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // White for buildings
        } else if (properties.type === 'ground') {
            newMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground
        } else if (properties.type === 'waterway') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.5, 1); // Blue for waterway
        } else if (properties.type === 'highway') {
            newMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
        } else if (properties.type === 'green') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Green for green areas
        } else {
            // Use original material color for other types
            if (currentMaterial && currentMaterial.diffuseColor) {
                newMaterial.diffuseColor = currentMaterial.diffuseColor.clone();
            } else {
                newMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Default brown
            }
        }
        
        // Set common material properties
        newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        newMaterial.roughness = 0.7;
        
        // Restore properties (center the cylinder vertically based on new height)
        newMesh.position = new BABYLON.Vector3(
            currentPosition.x,
            properties.height / 2, // Center the cylinder vertically based on new height
            currentPosition.z
        );
        newMesh.material = newMaterial;
        newMesh.renderingGroupId = 1;
        newMesh.userData = currentUserData;

        // Apply anti-flickering settings
        newMesh.enableEdgesRendering();
        newMesh.edgesWidth = 1.0;
        newMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);

        // Update userData dimensions and type
        newMesh.userData.dimensions = {
            radius: properties.radius,
            height: properties.height
        };
        newMesh.userData.type = properties.type;
        newMesh.userData.shapeType = 'circle';
        newMesh.userData.originalHeight = properties.height;

        // Update currentShape reference
        this.currentShape = newMesh;

        // Make new mesh selectable
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(newMesh);
            
            // Update original materials if the old shape was selected
            if (this.selectionManager.selectedObjects.includes(shape)) {
                this.selectionManager.originalMaterials.set(newMesh, newMaterial);
                // Remove old mesh from originalMaterials
                this.selectionManager.originalMaterials.delete(shape);
            }
        }

        // Update circleManager circles array
        if (this.circleManager) {
            // Remove old mesh from circles array
            const oldIndex = this.circleManager.circles.indexOf(shape);
            if (oldIndex !== -1) {
                this.circleManager.circles.splice(oldIndex, 1);
            }
            // Add new mesh to circles array
            this.circleManager.circles.push(newMesh);
        }
        
        // Enable shadows for the new mesh
        if (this.lightingManager) {
            this.lightingManager.updateShadowsForNewObject(newMesh);
        }

        // Handle building height (extrusion)
        if (properties.type === 'building' && properties.height > 0) {
            this.extrudeShape(newMesh, properties.height);
        } else {
            // Remove extrusion if height is 0 or type is land
            this.removeExtrusion(newMesh);
        }

        // Update userData
        if (properties.type === 'building') {
            newMesh.userData.dimensions.buildingHeight = properties.height;
        }
    }

    /**
     * Extrude shape to create 3D building
     */
    extrudeShape(shape, height) {
        console.log(`Extruding shape ${shape.name} to height ${height}`);
        
        const shapeType = this.getShapeType(shape);
        
        if (shapeType === 'rectangle') {
            // For 3D rectangles, directly update the height
            this.updateRectangleHeight(shape, height);
            return;
        }
        
        if (height <= 0) {
            // Remove existing extrusion if height is 0 or negative
        this.removeExtrusion(shape);
            return;
        }

        // Clean up all duplicate extrusions in the scene first
        this.cleanupAllDuplicateExtrusions();
        // Clean up all extra meshes
        this.cleanupAllExtraMeshes();
        
        // Check if extrusion already exists
        if (shape.extrusion) {
            console.log(`Updating existing extrusion for ${shape.name}`);
            this.updateExistingExtrusion(shape, height);
        } else {
            console.log(`Creating new extrusion for ${shape.name}`);
            this.createNewExtrusion(shape, height);
        }
    }

    /**
     * Check for duplicate extrusions and clean them up
     */
    cleanupDuplicateExtrusions(shape) {
        const scene = this.sceneManager.getScene();
        const extrusionName = `${shape.name}_extrusion`;
        
        // Find all meshes with the same extrusion name
        const duplicateExtrusions = scene.meshes.filter(mesh => 
            mesh.name === extrusionName && mesh !== shape.extrusion
        );
        
        if (duplicateExtrusions.length > 0) {
            console.log(`Found ${duplicateExtrusions.length} duplicate extrusions for ${shape.name}, cleaning up...`);
            
            duplicateExtrusions.forEach(duplicate => {
                console.log(`Disposing duplicate extrusion: ${duplicate.name}`);
                
                // Remove from selection manager
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(duplicate);
                }
                
                // Remove from shape2DManager
                if (this.shape2DManager) {
                    const index = this.shape2DManager.shapes.indexOf(duplicate);
                    if (index !== -1) {
                        this.shape2DManager.shapes.splice(index, 1);
                    }
                }
                
                // Remove from parent
                duplicate.setParent(null);
                
                // Dispose material
                if (duplicate.material) {
                    duplicate.material.dispose();
                }
                
                // Dispose mesh
                duplicate.dispose();
            });
            
            console.log(`Cleaned up ${duplicateExtrusions.length} duplicate extrusions`);
        }
        
        // Also clean up any meshes that might be related to this shape
        const relatedMeshes = scene.meshes.filter(mesh => 
            mesh.name.includes(shape.name) && 
            mesh.name !== shape.name && 
            mesh !== shape.extrusion &&
            (mesh.name.includes('_extrusion') || mesh.name.includes('_box') || mesh.name.includes('_copy'))
        );
        
        if (relatedMeshes.length > 0) {
            console.log(`Found ${relatedMeshes.length} related meshes for ${shape.name}, cleaning up...`);
            
            relatedMeshes.forEach(mesh => {
                console.log(`Disposing related mesh: ${mesh.name}`);
                
                // Remove from selection manager
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(mesh);
                }
                
                // Remove from shape2DManager
                if (this.shape2DManager) {
                    const index = this.shape2DManager.shapes.indexOf(mesh);
                    if (index !== -1) {
                        this.shape2DManager.shapes.splice(index, 1);
                    }
                }
                
                // Remove from parent
                mesh.setParent(null);
                
                // Dispose material
                if (mesh.material) {
                    mesh.material.dispose();
                }
                
                // Dispose mesh
                mesh.dispose();
            });
            
            console.log(`Cleaned up ${relatedMeshes.length} related meshes`);
        }
    }

    /**
     * Clean up all duplicate extrusions in the scene
     */
    cleanupAllDuplicateExtrusions() {
        const scene = this.sceneManager.getScene();
        
        // Log all meshes in scene for debugging
        console.log('All meshes in scene:');
        scene.meshes.forEach(mesh => {
            console.log(`- ${mesh.name} (type: ${mesh.constructor.name})`);
        });
        
        // Find all extrusion meshes
        const extrusionMeshes = scene.meshes.filter(mesh => 
            mesh.name.includes('_extrusion') || 
            mesh.name.includes('_box') || 
            mesh.name.includes('_copy') ||
            mesh.name.includes('polygon') && mesh.name !== 'polygon'
        );
        
        if (extrusionMeshes.length > 0) {
            console.log(`Found ${extrusionMeshes.length} duplicate extrusions in scene, cleaning up...`);
            
            extrusionMeshes.forEach(mesh => {
                console.log(`Disposing duplicate extrusion: ${mesh.name}`);
                
                // Remove from selection manager
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(mesh);
                }
                
                // Remove from shape2DManager
                if (this.shape2DManager) {
                    const index = this.shape2DManager.shapes.indexOf(mesh);
                    if (index !== -1) {
                        this.shape2DManager.shapes.splice(index, 1);
                    }
                }
                
                // Remove from parent
                mesh.setParent(null);
                
                // Dispose material
                if (mesh.material) {
                    mesh.material.dispose();
                }
                
                // Dispose mesh
                mesh.dispose();
            });
            
            console.log(`Cleaned up ${extrusionMeshes.length} duplicate extrusions`);
        }
    }

    /**
     * Clean up all duplicate and related meshes for a shape
     */
    cleanupAllRelatedMeshes(shape) {
        const scene = this.sceneManager.getScene();
        const shapeName = shape.name;
        
        // Find all meshes that are related to this shape
        const relatedMeshes = scene.meshes.filter(mesh => 
            mesh.name.includes(shapeName) && 
            mesh.name !== shapeName && 
            mesh !== shape.extrusion &&
            mesh !== shape // Also exclude the shape itself
        );
        
        if (relatedMeshes.length > 0) {
            console.log(`Found ${relatedMeshes.length} related meshes for ${shapeName}, cleaning up all...`);
            
            relatedMeshes.forEach(mesh => {
                console.log(`Disposing related mesh: ${mesh.name}`);
                
                // Remove from selection manager
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(mesh);
                }
                
                // Remove from shape2DManager
                if (this.shape2DManager) {
                    const index = this.shape2DManager.shapes.indexOf(mesh);
                    if (index !== -1) {
                        this.shape2DManager.shapes.splice(index, 1);
                    }
                }
                
                // Remove from parent
                mesh.setParent(null);
                
                // Dispose material
                if (mesh.material) {
                    mesh.material.dispose();
                }
                
                // Dispose mesh
                mesh.dispose();
            });
            
            console.log(`Cleaned up ${relatedMeshes.length} related meshes`);
        }
        
        // Also clean up any polygon meshes that might be duplicates
        const polygonMeshes = scene.meshes.filter(mesh => 
            mesh.name === 'polygon' && 
            mesh !== shape &&
            mesh !== shape.extrusion
        );
        
        if (polygonMeshes.length > 0) {
            console.log(`Found ${polygonMeshes.length} duplicate polygon meshes, cleaning up...`);
            
            polygonMeshes.forEach(mesh => {
                console.log(`Disposing duplicate polygon mesh: ${mesh.name}`);
                
                // Remove from selection manager
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(mesh);
                }
                
                // Remove from shape2DManager
                if (this.shape2DManager) {
                    const index = this.shape2DManager.shapes.indexOf(mesh);
                    if (index !== -1) {
                        this.shape2DManager.shapes.splice(index, 1);
                    }
                }
                
                // Remove from parent
                mesh.setParent(null);
                
                // Dispose material
                if (mesh.material) {
                    mesh.material.dispose();
                }
                
                // Dispose mesh
                mesh.dispose();
            });
            
            console.log(`Cleaned up ${polygonMeshes.length} duplicate polygon meshes`);
        }
    }

    /**
     * Clean up all extra meshes in the scene
     */
    cleanupAllExtraMeshes() {
        const scene = this.sceneManager.getScene();
        
        // Find all meshes that might be extra
        const extraMeshes = scene.meshes.filter(mesh => 
            mesh.name === 'polygon' || 
            mesh.name.includes('_extrusion') || 
            mesh.name.includes('_box') || 
            mesh.name.includes('_copy') ||
            mesh.name.includes('_temp') ||
            mesh.name.includes('_old')
        );
        
        if (extraMeshes.length > 0) {
            console.log(`Found ${extraMeshes.length} extra meshes in scene, cleaning up...`);
            
            extraMeshes.forEach(mesh => {
                console.log(`Disposing extra mesh: ${mesh.name}`);
                
                // Remove from selection manager
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(mesh);
                }
                
                // Remove from shape2DManager
                if (this.shape2DManager) {
                    const index = this.shape2DManager.shapes.indexOf(mesh);
                    if (index !== -1) {
                        this.shape2DManager.shapes.splice(index, 1);
                    }
                }
                
                // Remove from parent
                mesh.setParent(null);
                
                // Dispose material
                if (mesh.material) {
                    mesh.material.dispose();
                }
                
                // Dispose mesh
                mesh.dispose();
            });
            
            console.log(`Cleaned up ${extraMeshes.length} extra meshes`);
        }
    }

    /**
     * Update existing extrusion with new height
     */
    updateExistingExtrusion(shape, height) {
        // Clean up any duplicate extrusions first
        this.cleanupDuplicateExtrusions(shape);
        // Also clean up all related meshes
        this.cleanupAllRelatedMeshes(shape);
        // Clean up all extra meshes
        this.cleanupAllExtraMeshes();
        
        const extrusion = shape.extrusion;
        const shapeType = this.getShapeType(shape);
        
        if (shapeType === 'rectangle') {
            // For 3D rectangles, we don't have a separate extrusion
            // Instead, we modify the existing rectangle's height
            this.updateRectangleHeight(shape, height);
            return;
        } else if (shapeType === 'circle') {
            // Update cylinder extrusion - sync with current shape position
            extrusion.scaling.y = height / (extrusion.userData.originalHeight || 1);
            extrusion.position = shape.position.clone();
            extrusion.position.y = height / 2;
            extrusion.userData.originalHeight = height;
        } else if (shapeType === 'polygon') {
            // For polygons, recreate the extrusion with new height (like rectangle/circle scaling)
            console.log(`Recreating polygon extrusion for ${shape.name} with height ${height}`);
            
            // Store current position and rotation
            const currentPosition = extrusion.position.clone();
            const currentRotation = extrusion.rotation.clone();
            const currentScaling = extrusion.scaling.clone();
            
            // Dispose old extrusion
            if (extrusion.material) {
                extrusion.material.dispose();
            }
            extrusion.dispose();
            
            // Create new extrusion with new height
            const points = shape.userData.points || [];
            if (points.length >= 3) {
                const extrusionName = `${shape.name}_extrusion`;
                const newExtrusion = this.createCustomPolygonExtrusion(extrusionName, points, height);
                
                // Restore position and rotation
                newExtrusion.position = currentPosition;
                newExtrusion.rotation = currentRotation;
                newExtrusion.scaling = currentScaling;
                
                // Update position to match current shape position
                newExtrusion.position = shape.position.clone();
                newExtrusion.position.y = height / 2;
                
                // Create material
                const extrusionMaterial = new BABYLON.StandardMaterial(`${extrusionName}Material`, this.sceneManager.getScene());
                if (shape.material && shape.material.diffuseColor) {
                    extrusionMaterial.diffuseColor = shape.material.diffuseColor.clone();
                } else {
                    extrusionMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
                }
                extrusionMaterial.backFaceCulling = false;
                newExtrusion.material = extrusionMaterial;
                newExtrusion.renderingGroupId = 1;
                
                // Update userData
                newExtrusion.userData = {
                    originalHeight: height,
                    buildingHeight: height,
                    type: 'building'
                };
                
                // Make extrusion a child of the base shape
                newExtrusion.setParent(shape);
                
                // Update reference
                shape.extrusion = newExtrusion;
                
                console.log(`Polygon extrusion recreated with height ${height}`);
            }
        }
        
        // Update userData
        if (extrusion.userData) {
            extrusion.userData.buildingHeight = height;
        }
        
        console.log(`Updated extrusion for ${shape.name} to height ${height}`);
    }

    /**
     * Update rectangle height (for 3D rectangles)
     */
    updateRectangleHeight(shape, height) {
        if (!shape || shape.userData.shapeType !== 'rectangle') {
            return;
        }
        
        // Update the rectangle's height by scaling it
        const originalHeight = shape.userData.originalHeight || 0.01;
        const scaleFactor = height / originalHeight;
        
        // Update the scaling
        shape.scaling.y = scaleFactor;
        
        // Update position to keep bottom face on ground
        shape.position.y = height / 2;
        
        // Update userData
        shape.userData.dimensions.height = height;
        shape.userData.originalHeight = height;
        
        console.log(`Updated rectangle ${shape.name} height to ${height}`);
    }

    /**
     * Create new extrusion
     */
    createNewExtrusion(shape, height) {
        // Clean up any duplicate extrusions first
        this.cleanupDuplicateExtrusions(shape);
        // Also clean up all related meshes
        this.cleanupAllRelatedMeshes(shape);
        // Clean up all extra meshes
        this.cleanupAllExtraMeshes();
        
        const extrusionName = `${shape.name}_extrusion`;
        const shapeType = this.getShapeType(shape);
        
        let extrusion;
        if (shapeType === 'rectangle') {
            // For 3D rectangles, we don't create a separate extrusion
            // Instead, we modify the existing rectangle's height
            this.updateRectangleHeight(shape, height);
            return;
        } else if (shapeType === 'circle') {
            const radius = shape.userData.dimensions.radius;
            extrusion = BABYLON.MeshBuilder.CreateCylinder(extrusionName, {
                height: height,
                diameter: radius * 2,
                tessellation: 32
            }, this.sceneManager.getScene());
        } else if (shapeType === 'polygon') {
            // For polygons, use the custom extrusion method with actual height
            const points = shape.userData.points || [];
            if (points.length >= 3) {
                extrusion = this.createCustomPolygonExtrusion(extrusionName, points, height); // Create with actual height
            }
        }

        if (extrusion) {
            // Position extrusion at the same location as the base shape
            if (shapeType === 'rectangle') {
                // For rectangles, position extrusion so its corner matches the rectangle corner
                const dimensions = shape.userData.dimensions;
                
                // Position extrusion at the same corner as the rectangle
                // Since CreateBox centers the mesh, we need to offset by half dimensions
                extrusion.position = new BABYLON.Vector3(
                    shape.position.x,                         // Same corner as rectangle
                    height / 2,                               // Half height above ground
                    shape.position.z                          // Same corner as rectangle
                );
                console.log(`Rectangle corner at: ${shape.position}, extrusion center at: ${extrusion.position}`);
            } else {
                // For other shapes, use shape position directly
                extrusion.position = shape.position.clone();
                extrusion.position.y = height / 2; // Half height above the base shape
            }
            
            // No additional scaling needed for polygon extrusions (created with actual height)
            
            // Create separate material for extrusion
            const extrusionMaterial = new BABYLON.StandardMaterial(`${extrusionName}Material`, this.sceneManager.getScene());
            
            // Check if shape has material and diffuseColor
            if (shape.material && shape.material.diffuseColor) {
            extrusionMaterial.diffuseColor = shape.material.diffuseColor.clone();
            } else {
                // Use default color if shape material is null or doesn't have diffuseColor
                extrusionMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // White
                console.warn(`Shape ${shape.name} has no material or diffuseColor, using default white color`);
            }
            
            extrusionMaterial.backFaceCulling = false;
            extrusion.material = extrusionMaterial;
            extrusion.renderingGroupId = 1;
            
            // Store original height for scaling
            extrusion.userData = {
                originalHeight: height, // Store actual height for all shapes
                buildingHeight: height,
                type: 'building'
            };
            
            // Make extrusion a child of the base shape
            extrusion.setParent(shape);
            
            // Store reference to extrusion
            shape.extrusion = extrusion;
            
            // Add extrusion to shape2DManager shapes array so it's managed together
            if (this.shape2DManager) {
                this.shape2DManager.shapes.push(extrusion);
            }
            
            // Make extrusion selectable as part of the shape
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(extrusion);
            }
            
            console.log(`Created new extrusion for ${shape.name} with height ${height} at position (${extrusion.position.x}, ${extrusion.position.y}, ${extrusion.position.z})`);
        }
    }

    /**
     * Remove extrusion from shape
     */
    removeExtrusion(shape) {
        const shapeType = this.getShapeType(shape);
        
        if (shapeType === 'rectangle') {
            // For 3D rectangles, reset height to minimal value
            this.updateRectangleHeight(shape, 0.01);
            return;
        }
        
        if (shape.extrusion) {
            console.log(`Removing extrusion from ${shape.name}`);
            
            const extrusion = shape.extrusion;
            
            // Remove from selection manager
            if (this.selectionManager) {
                this.selectionManager.removeSelectableObject(extrusion);
            }
            
            // Remove from shape2DManager shapes array
            if (this.shape2DManager) {
                const extrusionIndex = this.shape2DManager.shapes.indexOf(extrusion);
                if (extrusionIndex !== -1) {
                    this.shape2DManager.shapes.splice(extrusionIndex, 1);
                }
            }
            
            // Remove parent relationship
            extrusion.setParent(null);
            
            // Dispose extrusion material
            if (extrusion.material) {
                extrusion.material.dispose();
            }
            
            // Dispose extrusion mesh
            extrusion.dispose();
            
            // Clear reference
            shape.extrusion = null;
            
            // Force garbage collection hint
            if (window.gc) {
                window.gc();
            }
            
            console.log(`Extrusion completely removed from ${shape.name}`);
        }
    }

    /**
     * Update properties fields based on shape type
     */
    updatePropertiesFields(type) {
        const heightGroup = document.getElementById('heightGroup');
        const radiusGroup = document.getElementById('radiusGroup');
        const lengthGroup = document.getElementById('shapeLength').parentElement;
        const widthGroup = document.getElementById('shapeWidth').parentElement;
        
        // Get current shape type (rectangle/circle)
        const shapeType = this.getShapeType(this.currentShape);
        
        // Show height only for building type
        if (type === 'building') {
            heightGroup.style.display = 'flex';
            // Set height value
            const heightInput = document.getElementById('shapeHeight');
            if (heightInput) {
                // Always set the height value when switching to building type
                const currentHeight = this.currentShape?.userData?.dimensions?.height || 0.1;
                heightInput.value = currentHeight;
            }
        } else {
            // Hide height for all other types (ground, waterway, highway, green, land)
            heightGroup.style.display = 'none';
        }
        
        // Show appropriate geometric fields based on shape type
        if (shapeType === 'circle') {
            lengthGroup.style.display = 'none';
            widthGroup.style.display = 'none';
            radiusGroup.style.display = 'flex';
        } else if (shapeType === 'rectangle' || shapeType === 'building') {
            lengthGroup.style.display = 'flex';
            widthGroup.style.display = 'flex';
            radiusGroup.style.display = 'none';
        } else if (shapeType === 'polygon') {
            // For polygons, show area and perimeter instead of length/width
            lengthGroup.style.display = 'none';
            widthGroup.style.display = 'none';
            radiusGroup.style.display = 'none';
            // Note: We'll need to add polygon-specific fields to the HTML
        }
    }

    /**
     * Get shape properties
     */
    getShapeProperties(shape) {
        const name = shape.name || 'Unnamed Shape';
        const type = shape.userData?.type || 'ground';
        const color = this.getShapeColor(shape);
        const dimensions = this.getShapeDimensions(shape);
        
        return {
            name: name,
            type: type,
            color: color,
            length: dimensions.length,
            width: dimensions.width,
            height: dimensions.height,
            radius: dimensions.radius,
            shapeType: this.getShapeType(shape)
        };
    }

    /**
     * Get shape color in hex format
     */
    getShapeColor(shape) {
        if (shape.material && shape.material.diffuseColor) {
            const color = shape.material.diffuseColor;
            return this.rgbToHex(
                Math.round(color.r * 255),
                Math.round(color.g * 255),
                Math.round(color.b * 255)
            );
        }
        return '#00ff00'; // Default green
    }

    /**
     * Get shape dimensions
     */
    getShapeDimensions(shape) {
        const dimensions = {
            length: 0,
            width: 0,
            height: 0,
            radius: 0,
            area: 0,
            perimeter: 0,
            vertices: 0
        };

        // First try to get dimensions from userData (stored during creation)
        if (shape.userData && shape.userData.dimensions) {
            const storedDimensions = shape.userData.dimensions;
            
            if (this.getShapeType(shape) === 'rectangle') {
                dimensions.length = parseFloat(storedDimensions.width || 0).toFixed(2);
                dimensions.width = parseFloat(storedDimensions.depth || 0).toFixed(2);
                dimensions.height = parseFloat(storedDimensions.height || 0).toFixed(2);
            } else if (this.getShapeType(shape) === 'building') {
                dimensions.length = parseFloat(storedDimensions.width || 0).toFixed(2);
                dimensions.width = parseFloat(storedDimensions.depth || 0).toFixed(2);
                dimensions.height = parseFloat(storedDimensions.height || 0).toFixed(2);
            } else if (this.getShapeType(shape) === 'circle') {
                dimensions.radius = parseFloat(storedDimensions.radius || 0).toFixed(2);
                dimensions.height = parseFloat(storedDimensions.height || 0).toFixed(2);
            } else if (this.getShapeType(shape) === 'polygon') {
                dimensions.area = parseFloat(storedDimensions.area || 0).toFixed(2);
                dimensions.perimeter = parseFloat(storedDimensions.perimeter || 0).toFixed(2);
                dimensions.vertices = parseInt(storedDimensions.vertices || 0);
            }
            
            // Get building height if available
            if (storedDimensions.buildingHeight !== undefined) {
                dimensions.height = parseFloat(storedDimensions.buildingHeight || 0).toFixed(2);
            }
        } else if (shape.geometry && shape.geometry.boundingInfo) {
            // Fallback to boundingBox calculation
            const boundingBox = shape.geometry.boundingInfo.boundingBox;
            const size = boundingBox.extendSize;
            
            dimensions.length = (size.x * 2).toFixed(2);
            dimensions.width = (size.z * 2).toFixed(2);
            dimensions.height = (size.y * 2).toFixed(2);
            
            // For circles, radius is half the width
            if (this.getShapeType(shape) === 'circle') {
                dimensions.radius = (size.x).toFixed(2);
            } else if (this.getShapeType(shape) === 'polygon') {
                // For polygons, calculate approximate area and perimeter
                dimensions.area = (size.x * size.z).toFixed(2);
                dimensions.perimeter = (2 * (size.x + size.z)).toFixed(2);
                dimensions.vertices = 0; // Will be calculated from mesh data if available
            }
        }

        return dimensions;
    }

    /**
     * Generate unique name based on type
     */
    generateUniqueNameByType(type) {
        // Count existing objects of this type in the scene
        let maxNumber = 0;
        const scene = this.sceneManager.getScene();
        
        // Check all meshes in the scene for names of this type
        scene.meshes.forEach(mesh => {
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
     * Generate unique building name (for backward compatibility)
     */
    generateUniqueBuildingName() {
        return this.generateUniqueNameByType('building');
    }

    /**
     * Get shape type (rectangle, circle, polygon, etc.)
     */
    getShapeType(shape) {
        // First check userData for explicit shape type
        if (shape.userData && shape.userData.shapeType) {
            return shape.userData.shapeType;
        }
        
        // Fallback to name-based detection
        if (shape.name.includes('circle')) return 'circle';
        if (shape.name.includes('rectangle')) return 'rectangle';
        if (shape.name.includes('polygon')) return 'polygon';
        if (shape.name.includes('building')) return 'building';
        return 'rectangle'; // Default
    }

    /**
     * Convert RGB to hex
     */
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /**
     * Save shape properties
     */
    saveShapeProperties() {
        // Get the shape name from the properties popup
        const shapeNameElement = document.getElementById('shapeName');
        if (!shapeNameElement) {
            console.warn('Cannot save properties: shape name element not found');
            return;
        }

        const shapeName = shapeNameElement.value;
        if (!shapeName) {
            console.warn('Cannot save properties: shape name is empty');
            return;
        }

        // Find the shape in the scene
        const scene = this.sceneManager.getScene();
        const shape = scene.getMeshByName(shapeName);
        if (!shape) {
            console.warn('Cannot save properties: shape not found in scene:', shapeName);
            return;
        }

        // Set currentShape for updateShapeInRealTime
        this.currentShape = shape;

        // Get the height value from the popup
        const height = Math.max(parseFloat(document.getElementById('shapeHeight').value) || 0, 0.001);
        
        // Apply height changes now (this is the only time height is applied)
        this.applyHeightChanges(shape, height);

        // Final update to ensure everything is saved
        this.updateShapeInRealTime();

        // After saving, select both the shape and its extrusion (if exists)
        this.selectShapeAndExtrusionAfterSave();

        this.hidePropertiesPopup();
    }


    /**
     * Preview height changes (shows temporary extrusion for preview)
     */
    previewHeightChanges() {
        if (!this.currentShape) return;
        
        // Get the height value from the popup
        const height = Math.max(parseFloat(document.getElementById('shapeHeight').value) || 0, 0.001);
        const type = document.getElementById('shapeType').value;
        
        // Remove existing preview extrusion
        this.removePreviewExtrusion();
        
        // Only show preview if type is building and height > 0
        if (type === 'building' && height > 0.001) {
            this.createPreviewExtrusion(height);
        }
    }

    /**
     * Create a temporary preview extrusion
     * @param {number} height - The height for the preview
     */
    createPreviewExtrusion(height) {
        if (!this.currentShape) return;
        
        const shapeType = this.getShapeType(this.currentShape);
        const previewName = `${this.currentShape.name}_preview_extrusion`;
        
        let previewExtrusion;
        if (shapeType === 'rectangle') {
            const dimensions = this.currentShape.userData.dimensions;
            previewExtrusion = BABYLON.MeshBuilder.CreateBox(previewName, {
                width: dimensions.width,
                height: height,
                depth: dimensions.height
            }, this.sceneManager.getScene());
        } else if (shapeType === 'circle') {
            const radius = this.currentShape.userData.dimensions.radius;
            previewExtrusion = BABYLON.MeshBuilder.CreateCylinder(previewName, {
                height: height,
                diameter: radius * 2,
                tessellation: 32
            }, this.sceneManager.getScene());
        } else if (shapeType === 'polygon') {
            // For polygons, create a simple box preview
            const dimensions = this.currentShape.userData.dimensions;
            previewExtrusion = BABYLON.MeshBuilder.CreateBox(previewName, {
                width: dimensions.width || 2,
                height: height,
                depth: dimensions.height || 2
            }, this.sceneManager.getScene());
        }
        
        if (previewExtrusion) {
            // Position preview extrusion
            previewExtrusion.position = this.currentShape.position.clone();
            previewExtrusion.position.y = height / 2;
            
            // Create preview material (semi-transparent)
            const previewMaterial = new BABYLON.StandardMaterial(`${previewName}Material`, this.sceneManager.getScene());
            previewMaterial.diffuseColor = new BABYLON.Color3(0.5, 0.5, 1.0); // Light blue
            previewMaterial.alpha = 0.3; // Semi-transparent
            previewMaterial.backFaceCulling = false;
            previewExtrusion.material = previewMaterial;
            previewExtrusion.renderingGroupId = 1;
            
            // Store reference for removal
            this.currentShape.previewExtrusion = previewExtrusion;
            
            console.log(`Preview extrusion created for ${this.currentShape.name} with height ${height}`);
        }
    }

    /**
     * Remove preview extrusion
     */
    removePreviewExtrusion() {
        if (this.currentShape && this.currentShape.previewExtrusion) {
            this.currentShape.previewExtrusion.dispose();
            this.currentShape.previewExtrusion = null;
        }
    }

    /**
     * Apply height changes to a shape (only called when save is clicked)
     * @param {BABYLON.Mesh} shape - The shape to apply height changes to
     * @param {number} height - The new height value
     */
    applyHeightChanges(shape, height) {
        console.log(`Applying height changes to ${shape.name}: height = ${height}`);
        
        // Remove preview extrusion first
        this.removePreviewExtrusion();
        
        // Get current properties
        const type = document.getElementById('shapeType').value;
        
        // Update userData with new height
        if (!shape.userData) {
            shape.userData = {};
        }
        if (!shape.userData.dimensions) {
            shape.userData.dimensions = {};
        }
        shape.userData.dimensions.buildingHeight = height;
        shape.userData.type = type;
        
        // Apply height changes based on shape type
        if (type === 'building' && height > 0.001) {
            // Create or update extrusion
            this.extrudeShape(shape, height);
        } else {
            // Remove extrusion if height is 0 or type is land
            this.removeExtrusion(shape);
        }
        
        console.log(`Height changes applied to ${shape.name}`);
    }

    /**
     * Select shape and its extrusion after saving properties
     */
    selectShapeAndExtrusionAfterSave() {
        if (!this.selectionManager) {
            console.warn('Cannot select after save: selectionManager is null');
            return;
        }

        // Get the shape name from the properties popup
        const shapeNameElement = document.getElementById('shapeName');
        if (!shapeNameElement) {
            console.warn('Cannot select after save: shape name element not found');
            return;
        }

        const shapeName = shapeNameElement.value;
        if (!shapeName) {
            console.warn('Cannot select after save: shape name is empty');
            return;
        }

        console.log('Selecting shape and extrusion after save:', shapeName);

        // Clear current selection
        this.selectionManager.clearSelection();

        // Check if the shape still exists in the scene
        const scene = this.sceneManager.getScene();
        const shapeInScene = scene.getMeshByName(shapeName);
        
        if (!shapeInScene) {
            console.warn('Shape not found in scene after save:', shapeName);
            return;
        }

        // Select the current shape
        this.selectionManager.selectObject(shapeInScene, false, true); // includeExtrusion = true

        console.log('Selected objects after save:', this.selectionManager.selectedObjects.map(obj => obj.name));
    }

    /**
     * Convert hex to RGB
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    /**
     * Delete selected objects
     */
    deleteSelectedObjects() {
        if (!this.selectionManager) {
            console.log('SelectionManager not available');
            return;
        }

        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log('No objects selected to delete');
            return;
        }

        console.log(`Deleting ${selectedObjects.length} selected objects`);

        // Delete each selected object
        selectedObjects.forEach(obj => {
            if (obj && obj.dispose) {
                // Check if it's a tree
                if (this.treeManager && this.isTree(obj)) {
                    // Find the tree object in the tree manager
                    const tree = this.treeManager.trees.find(t => t.parent === obj);
                    if (tree) {
                        this.treeManager.removeTree(tree);
                    } else {
                        // Fallback: just dispose the object
                        obj.dispose();
                    }
                }
                // Check if it's a 2D shape
                else if (this.shape2DManager && this.is2DShape(obj)) {
                    this.shape2DManager.removeShape(obj);
                } 
                // Check if it's a polygon
                else if (this.polygonManager && this.isPolygon(obj)) {
                    // For now, just dispose the polygon object
                    // TODO: Add proper polygon removal method to PolygonManager
                    obj.dispose();
                }
                else {
                    // It's a 3D building or other object
                    obj.dispose();
                }
                console.log(`Deleted object: ${obj.name}`);
            }
        });

        // Clear selection after deletion
        this.selectionManager.clearSelection();
        console.log('Selected objects deleted and selection cleared');
    }

    /**
     * Check if object is a 2D shape
     */
    is2DShape(obj) {
        if (!obj || !obj.name) return false;
        
        const shapeNames = ['rectangle', 'circle', 'triangle', 'text', 'polyline', 'line', 'polygon'];
        return shapeNames.some(name => obj.name.includes(name));
    }

    /**
     * Check if object is a tree
     */
    isTree(obj) {
        if (!obj || !obj.name) return false;
        
        return obj.name.startsWith('tree_') || 
               obj.name.includes('_tree_') || 
               obj.name.startsWith('simple_tree_');
    }

    /**
     * Check if object is a polygon
     */
    isPolygon(obj) {
        if (!obj || !obj.name) return false;
        
        return obj.name.includes('polygon');
    }

    /**
     * Clear all 2D shapes
     */
    clear2DShapes() {
        // Clear rectangles
        if (this.rectangleManager) {
            this.rectangleManager.clearAllRectangles();
        }
        
        // Clear circles
        if (this.circleManager) {
            this.circleManager.clearAllCircles();
        }
        
        // Clear polygons
        if (this.polygonManager) {
            this.polygonManager.clearAllPolygons();
        }
        
        // Clear other shapes from shape2DManager if it exists
        if (this.shape2DManager) {
            this.shape2DManager.clearAllShapes();
        }
        
        console.log('All 2D shapes cleared');
    }

    /**
     * Dispose of UI manager
     */
    dispose() {
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
        }
    }
}
