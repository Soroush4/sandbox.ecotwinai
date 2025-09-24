/**
 * UIManager - Manages user interface interactions
 */
class UIManager {
    constructor(sceneManager, buildingGenerator, lightingManager, cameraController, gridManager, selectionManager, moveManager, rotateManager, scaleManager, shape2DManager) {
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
        
        this.isInitialized = false;
        this.statsInterval = null;
        this.isGlobalMode = false; // Default to local mode
        
        this.init();
    }

    /**
     * Initialize UI
     */
    init() {
        this.setupEventListeners();
        this.setupPropertiesPopup();
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

        // Shadows toggle
        const shadowsToggle = document.getElementById('shadowsToggle');
        if (shadowsToggle) {
            shadowsToggle.addEventListener('click', () => {
                this.toggleShadows();
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
            
            // Show properties popup for 2D shapes only when select tool is active
            if (count === 1 && this.isSelectToolActive()) {
                const selectedObject = selectedObjects[0];
                if (this.is2DShape(selectedObject)) {
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
                this.selectDrawingTool(toolName);
            });
        });
    }

    /**
     * Select drawing tool
     */
    selectDrawingTool(toolName) {
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
            case 'clear-drawings':
                this.clear2DShapes();
                break;
        }
    }

    /**
     * Reset to select tool (default state)
     */
    resetToSelectTool() {
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
                const action = e.target.getAttribute('data-action');
                this.handleMenuAction(action);
            });
        });
    }

    /**
     * Handle menu actions
     */
    handleMenuAction(action) {
        switch (action) {
            case 'new-scene':
                this.resetScene();
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
            case 'export-obj':
                this.exportOBJ();
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
            case 'scene-settings':
                this.openSceneSettings();
                break;
            case 'render-settings':
                this.openRenderSettings();
                break;
            case 'camera-settings':
                this.openCameraSettings();
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
        alert('Eco Digital Twin Sandbox\nVersion 1.0\nPowered by Babylon.js\n\nA 3D environment for creating and visualizing digital twin models.');
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
            this.setupPreferencesListeners();
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

        // Shadows toggle
        const shadowsToggle = document.getElementById('shadowsTogglePref');
        if (shadowsToggle) {
            shadowsToggle.addEventListener('click', () => {
                this.toggleShadows();
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

        // Range inputs
        this.setupPreferencesRangeInputs();
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
     * Toggle grid
     */
    toggleGrid() {
        const isVisible = this.gridManager.toggle();
        const gridToggle = document.getElementById('gridToggle');
        
        if (gridToggle) {
            gridToggle.classList.toggle('active', isVisible);
        }
    }

    /**
     * Toggle shadows
     */
    toggleShadows() {
        const isEnabled = this.lightingManager.toggleShadows();
        const shadowsToggle = document.getElementById('shadowsToggle');
        
        if (shadowsToggle) {
            shadowsToggle.classList.toggle('active', isEnabled);
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
            console.log('Shape2DManager not available');
            return;
        }

        console.log('Creating test 2D shapes...');

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

        console.log('Test 2D shapes created successfully!');
    }

    /**
     * Create rectangle
     */
    createRectangle() {
        if (!this.shape2DManager) {
            console.log('Shape2DManager not available');
            return;
        }

        // Disable camera controls during drawing
        this.disableCameraControls();

        // Set callback for when drawing stops
        this.shape2DManager.onDrawingStopped = () => {
            this.enableCameraControls();
            // Deactivate drawing tool after drawing is complete
            this.deactivateDrawingTool();
        };

        // Start interactive rectangle drawing
        this.shape2DManager.startInteractiveDrawing('rectangle');
        console.log('Rectangle drawing mode activated - Click and drag on the ground to draw');
    }

    /**
     * Create circle
     */
    createCircle() {
        if (!this.shape2DManager) {
            console.log('Shape2DManager not available');
            return;
        }

        // Disable camera controls during drawing
        this.disableCameraControls();

        // Set callback for when drawing stops
        this.shape2DManager.onDrawingStopped = () => {
            this.enableCameraControls();
            // Deactivate drawing tool after drawing is complete
            this.deactivateDrawingTool();
        };

        // Start interactive circle drawing
        this.shape2DManager.startInteractiveDrawing('circle');
        console.log('Circle drawing mode activated - Click and drag on the ground to draw');
    }


    /**
     * Setup drawing event listeners
     */
    setupDrawingEventListeners() {
        if (!this.sceneManager || !this.sceneManager.canvas) return;

        const canvas = this.sceneManager.canvas;
        let isMouseDown = false;
        let isDragging = false;

        // Mouse down
        canvas.addEventListener('pointerdown', (event) => {
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
            // Handle Delete key for selected objects
            if (event.key === 'Delete' || event.key === 'Backspace') {
                this.deleteSelectedObjects();
                return;
            }

            // Handle Escape key for drawing
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
            
            // Disable camera controls
            if (typeof this.cameraController.camera.detachControls === 'function') {
                this.cameraController.camera.detachControls();
            } else if (typeof this.cameraController.camera.detachControl === 'function') {
                this.cameraController.camera.detachControl();
            }
            
            console.log('Camera controls disabled for drawing');
        }
    }

    /**
     * Enable camera controls
     */
    enableCameraControls() {
        if (this.cameraController && this.cameraController.camera && this.cameraControlsDisabled) {
            // Re-enable camera controls
            if (typeof this.cameraController.camera.attachControl === 'function') {
                this.cameraController.camera.attachControl(this.sceneManager.canvas, true);
            } else if (typeof this.cameraController.camera.attachControls === 'function') {
                this.cameraController.camera.attachControls(this.sceneManager.canvas, true);
            }
            
            this.cameraControlsDisabled = false;
            console.log('Camera controls enabled');
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
            this.updatePropertiesFields(e.target.value);
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
        });

        document.getElementById('shapeRadius').addEventListener('input', () => {
            this.updateShapeInRealTime();
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
        
        // Show/hide fields based on shape type
        this.updatePropertiesFields(properties.type);
        
        // Set values for specific fields
        if (properties.type === 'building') {
            document.getElementById('shapeHeight').value = properties.height || 0;
        }
        
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
        const height = parseFloat(document.getElementById('shapeHeight').value) || 0;
        const radius = parseFloat(document.getElementById('shapeRadius').value) || 0;

        // Update material color
        const rgbColor = this.hexToRgb(color);
        const newColor = new BABYLON.Color3(rgbColor.r / 255, rgbColor.g / 255, rgbColor.b / 255);
        
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
    }

    /**
     * Update shape geometry
     */
    updateShapeGeometry(shape, properties) {
        const shapeType = this.getShapeType(shape);
        
        if (shapeType === 'rectangle') {
            this.updateRectangleGeometry(shape, properties);
        } else if (shapeType === 'circle') {
            this.updateCircleGeometry(shape, properties);
        }
    }

    /**
     * Update rectangle geometry
     */
    updateRectangleGeometry(shape, properties) {
        // Store current position and material
        const currentPosition = shape.position.clone();
        const currentMaterial = shape.material;
        const currentName = shape.name;
        const currentUserData = shape.userData;

        // Dispose old mesh
        shape.dispose();

        // Create new mesh with updated dimensions
        const newMesh = BABYLON.MeshBuilder.CreateGround(currentName, {
            width: properties.length,
            height: properties.width,
            subdivisions: 1
        }, this.scene);

        // Create new material (clone the old one to avoid sharing)
        const newMaterial = currentMaterial.clone(`${currentName}Material`);
        
        // Restore properties
        newMesh.position = currentPosition;
        newMesh.material = newMaterial;
        newMesh.renderingGroupId = 1;
        newMesh.userData = currentUserData;

        // Update userData dimensions
        newMesh.userData.dimensions = {
            width: properties.length,
            height: properties.width
        };

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

        // Update shape2DManager shapes array
        if (this.shape2DManager) {
            // Remove old mesh from shapes array
            const oldIndex = this.shape2DManager.shapes.indexOf(shape);
            if (oldIndex !== -1) {
                this.shape2DManager.shapes.splice(oldIndex, 1);
            }
            // Add new mesh to shapes array
            this.shape2DManager.shapes.push(newMesh);
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
     * Update circle geometry
     */
    updateCircleGeometry(shape, properties) {
        // Store current position and material
        const currentPosition = shape.position.clone();
        const currentMaterial = shape.material;
        const currentName = shape.name;
        const currentUserData = shape.userData;

        // Dispose old mesh
        shape.dispose();

        // Create new mesh with updated dimensions
        const newMesh = BABYLON.MeshBuilder.CreateDisc(currentName, {
            radius: properties.radius,
            tessellation: 32
        }, this.scene);

        // Create new material (clone the old one to avoid sharing)
        const newMaterial = currentMaterial.clone(`${currentName}Material`);
        
        // Restore properties
        newMesh.position = currentPosition;
        newMesh.material = newMaterial;
        newMesh.rotation.x = Math.PI / 2; // Keep horizontal
        newMesh.renderingGroupId = 1;
        newMesh.userData = currentUserData;

        // Update userData dimensions
        newMesh.userData.dimensions = {
            radius: properties.radius
        };

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

        // Update shape2DManager shapes array
        if (this.shape2DManager) {
            // Remove old mesh from shapes array
            const oldIndex = this.shape2DManager.shapes.indexOf(shape);
            if (oldIndex !== -1) {
                this.shape2DManager.shapes.splice(oldIndex, 1);
            }
            // Add new mesh to shapes array
            this.shape2DManager.shapes.push(newMesh);
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
        // Remove existing extrusion if any
        this.removeExtrusion(shape);

        if (height <= 0) return;

        // Create extrusion mesh
        const extrusionName = `${shape.name}_extrusion`;
        const shapeType = this.getShapeType(shape);
        
        let extrusion;
        if (shapeType === 'rectangle') {
            const dimensions = shape.userData.dimensions;
            extrusion = BABYLON.MeshBuilder.CreateBox(extrusionName, {
                width: dimensions.width,
                height: height,
                depth: dimensions.height
            }, this.scene);
        } else if (shapeType === 'circle') {
            const radius = shape.userData.dimensions.radius;
            extrusion = BABYLON.MeshBuilder.CreateCylinder(extrusionName, {
                height: height,
                diameter: radius * 2,
                tessellation: 32
            }, this.scene);
        }

        if (extrusion) {
            // Position extrusion at the same location as the base shape
            extrusion.position = shape.position.clone();
            extrusion.position.y = height / 2; // Half height above the base shape
            
            // Create separate material for extrusion
            const extrusionMaterial = new BABYLON.StandardMaterial(`${extrusionName}Material`, this.scene);
            extrusionMaterial.diffuseColor = shape.material.diffuseColor.clone();
            extrusionMaterial.backFaceCulling = false;
            extrusion.material = extrusionMaterial;
            extrusion.renderingGroupId = 1;
            
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
        }
    }

    /**
     * Remove extrusion from shape
     */
    removeExtrusion(shape) {
        if (shape.extrusion) {
            // Remove from selection manager
            if (this.selectionManager) {
                this.selectionManager.removeSelectableObject(shape.extrusion);
            }
            
            // Remove from shape2DManager shapes array
            if (this.shape2DManager) {
                const extrusionIndex = this.shape2DManager.shapes.indexOf(shape.extrusion);
                if (extrusionIndex !== -1) {
                    this.shape2DManager.shapes.splice(extrusionIndex, 1);
                }
            }
            
            // Remove parent relationship
            shape.extrusion.setParent(null);
            
            // Dispose extrusion material
            if (shape.extrusion.material) {
                shape.extrusion.material.dispose();
            }
            
            // Dispose extrusion mesh
            shape.extrusion.dispose();
            shape.extrusion = null;
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
        
        if (type === 'building') {
            // Show height for buildings
            heightGroup.style.display = 'flex';
            
            // Show appropriate geometric fields based on shape type
            if (shapeType === 'circle') {
                lengthGroup.style.display = 'none';
                widthGroup.style.display = 'none';
                radiusGroup.style.display = 'flex';
            } else if (shapeType === 'rectangle') {
                lengthGroup.style.display = 'flex';
                widthGroup.style.display = 'flex';
                radiusGroup.style.display = 'none';
            }
        } else if (type === 'land') {
            // Hide height for land
            heightGroup.style.display = 'none';
            
            // Show appropriate geometric fields based on shape type
            if (shapeType === 'circle') {
                lengthGroup.style.display = 'none';
                widthGroup.style.display = 'none';
                radiusGroup.style.display = 'flex';
            } else if (shapeType === 'rectangle') {
                lengthGroup.style.display = 'flex';
                widthGroup.style.display = 'flex';
                radiusGroup.style.display = 'none';
            }
        }
    }

    /**
     * Get shape properties
     */
    getShapeProperties(shape) {
        const name = shape.name || 'Unnamed Shape';
        const type = shape.userData?.type || 'land';
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
            radius: 0
        };

        // First try to get dimensions from userData (stored during creation)
        if (shape.userData && shape.userData.dimensions) {
            const storedDimensions = shape.userData.dimensions;
            
            if (this.getShapeType(shape) === 'rectangle') {
                dimensions.length = parseFloat(storedDimensions.width || 0).toFixed(2);
                dimensions.width = parseFloat(storedDimensions.height || 0).toFixed(2);
            } else if (this.getShapeType(shape) === 'circle') {
                dimensions.radius = parseFloat(storedDimensions.radius || 0).toFixed(2);
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
            }
        }

        return dimensions;
    }

    /**
     * Get shape type (rectangle, circle, etc.)
     */
    getShapeType(shape) {
        if (shape.name.includes('circle')) return 'circle';
        if (shape.name.includes('rectangle')) return 'rectangle';
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
        if (!this.currentShape) return;

        // Final update to ensure everything is saved
        this.updateShapeInRealTime();

        // After saving, select both the shape and its extrusion (if exists)
        this.selectShapeAndExtrusionAfterSave();

        this.hidePropertiesPopup();
    }


    /**
     * Select shape and its extrusion after saving properties
     */
    selectShapeAndExtrusionAfterSave() {
        if (!this.selectionManager || !this.currentShape) return;

        console.log('Selecting shape and extrusion after save:', this.currentShape.name);

        // Clear current selection
        this.selectionManager.clearSelection();

        // Select the current shape
        this.selectionManager.selectObject(this.currentShape, false, true); // includeExtrusion = true

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
                // Check if it's a 2D shape
                if (this.shape2DManager && this.is2DShape(obj)) {
                    this.shape2DManager.removeShape(obj);
                } else {
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
        
        const shapeNames = ['rectangle', 'circle', 'triangle', 'text', 'polyline', 'line'];
        return shapeNames.some(name => obj.name.includes(name));
    }

    /**
     * Clear all 2D shapes
     */
    clear2DShapes() {
        if (!this.shape2DManager) {
            console.log('Shape2DManager not available');
            return;
        }

        this.shape2DManager.clearAllShapes();
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
