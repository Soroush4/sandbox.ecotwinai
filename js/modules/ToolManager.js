/**
 * ToolManager - Manages tool activation, selection, and state
 */
class ToolManager {
    constructor(uiManager, selectionManager, moveManager, rotateManager, scaleManager, 
                rectangleManager, circleManager, polygonManager, treeManager, shape2DManager) {
        this.uiManager = uiManager;
        this.selectionManager = selectionManager;
        this.moveManager = moveManager;
        this.rotateManager = rotateManager;
        this.scaleManager = scaleManager;
        this.rectangleManager = rectangleManager;
        this.circleManager = circleManager;
        this.polygonManager = polygonManager;
        this.treeManager = treeManager;
        this.shape2DManager = shape2DManager;
        
        this.currentTransformMode = 'select';
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for tools
     */
    setupEventListeners() {
        this.setupTransformToolsListeners();
        this.setupDrawingToolsListeners();
        this.setupKeyboardShortcuts();
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
            });
        });
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
     * Setup keyboard shortcuts for tools
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Tool selection shortcuts: Q=Select, W=Move, E=Rotate, R=Scale
            // Use event.code for language-independent shortcuts (like UIManager does)
            
            // Check for modifier keys - only activate if no modifiers are pressed
            if (event.ctrlKey || event.altKey || event.shiftKey || event.metaKey) {
                return; // Don't interfere with other shortcuts
            }

            // Don't activate tools when typing in input fields
            const activeElement = document.activeElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                return; // Don't activate tools when typing
            }

            let toolName = null;
            // Use event.code for language-independent shortcuts
            if (event.code === 'KeyQ') {
                toolName = 'select';
            } else if (event.code === 'KeyW') {
                toolName = 'move';
            } else if (event.code === 'KeyE') {
                toolName = 'rotate';
            } else if (event.code === 'KeyR') {
                toolName = 'scale';
            } else if (event.code === 'KeyF') {
                // F key: Zoom to extent of selected objects
                event.preventDefault();
                event.stopPropagation();
                if (this.selectionManager && this.selectionManager.zoomToSelectedExtent) {
                    this.selectionManager.zoomToSelectedExtent();
                } else {
                    console.warn('SelectionManager or zoomToSelectedExtent not available');
                }
                return; // Don't process as tool selection
            }

            if (toolName) {
                event.preventDefault();
                event.stopPropagation();
                console.log(`Tool shortcut pressed: ${toolName}`);
                this.selectTransformTool(toolName);
            }
        }, true); // Use capture phase to catch early (like UIManager does)
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

        // If any drawing tool is active, stop all drawing operations
        if (this.isDrawingModeActive()) {
            console.log('Exiting drawing mode - stopping all drawing operations');
            this.stopAllDrawingOperations();
        }

        // Deactivate tree placement when switching to transform tools
        if (this.uiManager && this.uiManager.deactivateTreePlacement) {
            this.uiManager.deactivateTreePlacement();
        }
        
        // Re-enable camera controls when switching to transform tools
        if (this.uiManager && this.uiManager.enableCameraControls) {
            this.uiManager.enableCameraControls();
        }

        // Deactivate polygon drawing when switching to transform tools
        if (this.uiManager && this.uiManager.stopPolygonDrawing) {
            this.uiManager.stopPolygonDrawing();
        }

        // Remove active class from all transform tools (except coordinate toggle)
        const allTransformTools = document.querySelectorAll('#transformPanel .tool-item:not([data-tool="coordinate-toggle"])');
        allTransformTools.forEach(tool => tool.classList.remove('active'));

        // Remove active class from all drawing tools and reset their styles
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        allDrawingTools.forEach(tool => {
            tool.classList.remove('active');
            // Reset inline styles
            tool.style.background = '';
            tool.style.borderColor = '';
            tool.style.boxShadow = '';
            const icon = tool.querySelector('.tool-icon');
            if (icon) {
                icon.style.filter = '';
            }
        });

        // Add active class to selected tool
        const selectedTool = document.querySelector(`#transformPanel [data-tool="${toolName}"]`);
        if (selectedTool) {
            selectedTool.classList.add('active');
        }

        // If switching to a transform tool (not select), ensure extrusions are selected
        if (toolName !== 'select' && this.selectionManager && this.uiManager && this.uiManager.ensureExtrusionsSelected) {
            this.uiManager.ensureExtrusionsSelected();
        }

        // Handle tool selection
        this.handleTransformToolSelection(toolName);
        
        // Show/hide transform input fields based on tool selection
        if (this.uiManager && this.uiManager.updateTransformInputFieldsVisibility) {
            this.uiManager.updateTransformInputFieldsVisibility();
        }
        
        // Update values when tool changes (only for editing tools)
        if (this.isTransformEditingToolActive() && this.uiManager && this.uiManager.updateTransformInputFieldsValues) {
            this.uiManager.updateTransformInputFieldsValues();
        }
    }

    /**
     * Select drawing tool
     */
    selectDrawingTool(toolName) {
        // Clear any existing selection when switching to drawing tools
        if (this.selectionManager) {
            this.selectionManager.clearSelection();
        }

        // Deactivate tree placement when switching to other drawing tools
        if (toolName !== 'tree' && this.uiManager && this.uiManager.deactivateTreePlacement) {
            this.uiManager.deactivateTreePlacement();
            // Re-enable camera controls when switching away from tree tool
            if (this.uiManager.enableCameraControls) {
                this.uiManager.enableCameraControls();
            }
        }
        
        // Deactivate polygon drawing when switching to other drawing tools
        if (toolName !== 'polygon' && this.uiManager) {
            if (this.uiManager.stopPolygonDrawing) {
                this.uiManager.stopPolygonDrawing();
            }
            if (this.uiManager.hidePolygonDrawingInstructions) {
                this.uiManager.hidePolygonDrawingInstructions();
            }
        }

        // Remove active class from all drawing tools
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        allDrawingTools.forEach(tool => tool.classList.remove('active'));

        // Remove active class from all transform tools (except coordinate toggle) and reset their styles
        const allTransformTools = document.querySelectorAll('#transformPanel .tool-item:not([data-tool="coordinate-toggle"])');
        allTransformTools.forEach(tool => {
            tool.classList.remove('active');
            // Reset inline styles
            tool.style.background = '';
            tool.style.borderColor = '';
            tool.style.boxShadow = '';
            const icon = tool.querySelector('.tool-icon');
            if (icon) {
                icon.style.filter = '';
            }
        });

        // Add active class to selected tool
        const selectedTool = document.querySelector(`#drawingPanel [data-tool="${toolName}"]`);
        if (selectedTool) {
            selectedTool.classList.add('active');
        }

        // Automatically activate select tool when drawing tool is selected
        this.activateSelectToolOnly();

        // Handle tool selection
        this.handleDrawingToolSelection(toolName);
        
        // Hide transform input fields when drawing tool is selected
        if (this.uiManager && this.uiManager.updateTransformInputFieldsVisibility) {
            this.uiManager.updateTransformInputFieldsVisibility();
        }
    }

    /**
     * Activate select tool only (without changing drawing tools)
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
        
        // Hide transform input fields when select tool is activated
        if (this.uiManager && this.uiManager.updateTransformInputFieldsVisibility) {
            this.uiManager.updateTransformInputFieldsVisibility();
        }
    }

    /**
     * Activate select tool (simple version)
     */
    activateSelectTool() {
        const selectTool = document.querySelector('#transformPanel [data-tool="select"]');
        if (selectTool) {
            selectTool.classList.add('active');
        }
    }

    /**
     * Handle drawing tool selection logic
     */
    handleDrawingToolSelection(toolName) {
        switch (toolName) {
            case 'rectangle':
                if (this.uiManager && this.uiManager.createRectangle) {
                    this.uiManager.createRectangle();
                }
                break;
            case 'circle':
                if (this.uiManager && this.uiManager.createCircle) {
                    this.uiManager.createCircle();
                }
                break;
            case 'polygon':
                if (this.uiManager && this.uiManager.startPolygonDrawing) {
                    this.uiManager.startPolygonDrawing();
                }
                break;
            case 'tree':
                // Tree tool is handled separately in tree event listeners
                break;
            case 'clear-drawings':
                if (this.uiManager && this.uiManager.clear2DShapes) {
                    this.uiManager.clear2DShapes();
                }
                break;
        }
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
                if (this.uiManager && this.uiManager.toggleCoordinateMode) {
                    this.uiManager.toggleCoordinateMode();
                }
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
        if (this.uiManager && this.uiManager.showTransformModeFeedback) {
            this.uiManager.showTransformModeFeedback(mode);
        }
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
        
        // Enable coordinate toggle for selection mode
        if (this.uiManager && this.uiManager.enableCoordinateToggle) {
            this.uiManager.enableCoordinateToggle();
        }
        
        // Enable camera controls for selection mode
        if (this.uiManager && this.uiManager.enableCameraControls) {
            this.uiManager.enableCameraControls();
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
        
        // Disable coordinate toggle for move mode
        if (this.uiManager && this.uiManager.disableCoordinateToggle) {
            this.uiManager.disableCoordinateToggle();
        }
        
        // Enable camera controls for move mode
        if (this.uiManager && this.uiManager.enableCameraControls) {
            this.uiManager.enableCameraControls();
        }
    }

    /**
     * Enable rotate mode
     */
    enableRotateMode() {
        // Deactivate other modes first
        if (this.selectionManager) {
            // Selection manager is always active, but we can show feedback
        }
        
        // Activate rotate manager
        if (this.rotateManager) {
            this.rotateManager.activate();
        }
        
        // Disable coordinate toggle for rotate mode
        if (this.uiManager && this.uiManager.disableCoordinateToggle) {
            this.uiManager.disableCoordinateToggle();
        }
        
        // Enable camera controls for rotate mode
        if (this.uiManager && this.uiManager.enableCameraControls) {
            this.uiManager.enableCameraControls();
        }
    }

    /**
     * Enable scale mode
     */
    enableScaleMode() {
        // Deactivate other modes first
        if (this.selectionManager) {
            // Selection manager is always active, but we can show feedback
        }
        
        // Activate scale manager
        if (this.scaleManager) {
            this.scaleManager.activate();
        }
        
        // Disable coordinate toggle for scale mode
        if (this.uiManager && this.uiManager.disableCoordinateToggle) {
            this.uiManager.disableCoordinateToggle();
        }
        
        // Enable camera controls for scale mode
        if (this.uiManager && this.uiManager.enableCameraControls) {
            this.uiManager.enableCameraControls();
        }
    }

    /**
     * Check if any transform tool is active
     */
    isAnyTransformToolActive() {
        const activeTool = document.querySelector('#transformPanel .tool-item.active');
        if (!activeTool) return false;
        
        const toolName = activeTool.getAttribute('data-tool');
        return ['select', 'move', 'rotate', 'scale'].includes(toolName);
    }

    /**
     * Check if a transform editing tool is active (move, rotate, scale - excluding select)
     */
    isTransformEditingToolActive() {
        const activeTool = document.querySelector('#transformPanel .tool-item.active');
        if (!activeTool) return false;
        
        const toolName = activeTool.getAttribute('data-tool');
        return ['move', 'rotate', 'scale'].includes(toolName);
    }

    /**
     * Check if drawing mode is active
     */
    isDrawingModeActive() {
        const activeDrawingTool = document.querySelector('#drawingPanel .tool-item.active');
        return activeDrawingTool !== null;
    }

    /**
     * Stop all active drawing operations
     */
    stopAllDrawingOperations() {
        // Stop polygon drawing
        if (this.polygonManager && this.polygonManager.isDrawing && this.uiManager && this.uiManager.stopPolygonDrawing) {
            this.uiManager.stopPolygonDrawing();
        }

        // Stop rectangle drawing
        if (this.rectangleManager && this.rectangleManager.isDrawing) {
            this.rectangleManager.stopInteractiveDrawing();
        }

        // Stop circle drawing
        if (this.circleManager && this.circleManager.isDrawing) {
            this.circleManager.stopInteractiveDrawing();
        }

        // Stop tree placement
        if (this.uiManager && this.uiManager.deactivateTreePlacement) {
            this.uiManager.deactivateTreePlacement();
        }

        // Stop any other drawing operations
        if (this.shape2DManager && this.shape2DManager.isCurrentlyDrawing && this.shape2DManager.isCurrentlyDrawing()) {
            this.shape2DManager.stopInteractiveDrawing();
        }
    }

    /**
     * Get active transform tool
     */
    getActiveTransformTool() {
        const activeTool = document.querySelector('#transformPanel .tool-item.active:not([data-tool="coordinate-toggle"])');
        if (activeTool) {
            return activeTool.getAttribute('data-tool');
        }
        return 'select';
    }
}

