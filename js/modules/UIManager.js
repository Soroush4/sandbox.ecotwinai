/**
 * UIManager - Manages user interface interactions
 */
class UIManager {
    constructor(sceneManager, buildingGenerator, lightingManager, cameraController, gridManager, selectionManager, moveManager, rotateManager, scaleManager, shape2DManager, treeManager, polygonManager, rectangleManager, circleManager, postProcessingManager) {
        // ToolManager will be set after initialization
        this.toolManager = null;
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
        this.objectListManager = null;
        this.postProcessingManager = postProcessingManager;
        
        this.isInitialized = false;
        this.statsInterval = null;
        this.isGlobalMode = false; // Default to local mode
        this.preferencesListenersSetup = false; // Track if preferences listeners are setup
        this.postProcessingListenersSetup = false; // Track if post processing listeners are setup
        this.cameraControlsDisabled = false; // Initialize camera control state
        this.cursorCheckInterval = null; // Interval to maintain cursor during drawing
        this.drawingCoordinatesTooltip = null; // Tooltip for displaying coordinates during drawing
        this.drawingCoordinatesMoveHandler = null; // Mouse move handler for coordinates tooltip
        
        // STLManager reference (set by app.js after initialization)
        this.stlManager = null;
        
        // SceneOperationsManager reference (set by app.js after initialization)
        this.sceneOperationsManager = null;
        
        // PropertiesPopupManager reference (set by app.js after initialization)
        this.propertiesPopupManager = null;
        
        // SurfaceTypesManager reference (set by app.js after initialization)
        this.surfaceTypesManager = null;
        
        // ToolManager reference (set by app.js after initialization)
        this.toolManager = null;
        
        // TransformInputManager reference (set by app.js after initialization)
        this.transformInputManager = null;
        
        // MeasurementManager reference (set by app.js after initialization)
        this.measurementManager = null;
        
        // Current shape/polygon/tree/STL mesh references (used by properties popups)
        this.currentShape = null;
        this.currentTree = null;
        this.currentPolygon = null;
        this.currentSTLMesh = null;
        
        // Last selected tree type (for remembering user's choice)
        this.lastSelectedTreeType = null;
        
        // Tree tool long press timer
        this.treeToolLongPressTimer = null;
        this.treeToolLongPressStartTime = null;
        
        // Flag to prevent recursion in tree activation/deactivation
        this.isDeactivatingTreePlacement = false;
        
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
        this.initializeObjectListManager();
        this.setupObjectListVisibilityListener();
        this.setupHierarchyButton();
        // Apply 2-sided materials to all existing meshes
        this.apply2SidedMaterialsToAll();
        // Set default tree tool icon to first tree (tree1)
        this.updateTreeToolIcon('1');
        this.isInitialized = true;
    }

    /**
     * Get canvas element
     * @returns {HTMLCanvasElement|null} The canvas element
     */
    getCanvas() {
        // Try to get canvas from sceneManager
        if (this.sceneManager && this.sceneManager.canvas) {
            return this.sceneManager.canvas;
        }
        // Fallback: try to get canvas from scene engine
        if (this.sceneManager && this.sceneManager.getScene && this.sceneManager.getScene().getEngine) {
            return this.sceneManager.getScene().getEngine().getRenderingCanvas();
        }
        // Final fallback: try to get canvas by ID
        return document.getElementById('renderCanvas');
    }

    /**
     * Create position tooltip element
     */
    createPositionTooltip() {
        // Remove existing tooltip if any
        if (this.positionTooltip) {
            this.positionTooltip.remove();
        }
        
        // Create tooltip element
        this.positionTooltip = document.createElement('div');
        this.positionTooltip.id = 'drawing-position-tooltip';
        this.positionTooltip.className = 'drawing-position-tooltip';
        this.positionTooltip.style.cssText = `
            position: fixed;
            pointer-events: none;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-family: monospace;
            z-index: 10000;
            white-space: nowrap;
            display: none;
        `;
        document.body.appendChild(this.positionTooltip);
    }
    
    /**
     * Update position tooltip
     */
    updatePositionTooltip(event) {
        if (!this.positionTooltip || !this.sceneManager) {
            return;
        }
        
        const canvas = this.getCanvas();
        if (!canvas) {
            return;
        }
        
        // Get mouse position relative to canvas
        const rect = canvas.getBoundingClientRect();
        const canvasX = event.clientX - rect.left;
        const canvasY = event.clientY - rect.top;
        
        // Get ground intersection point
        const intersectionPoint = this.sceneManager.getGroundIntersection(canvasX, canvasY);
        
        if (intersectionPoint) {
            // Format coordinates (round to 2 decimal places)
            const x = intersectionPoint.x.toFixed(2);
            const z = intersectionPoint.z.toFixed(2);
            this.positionTooltip.textContent = `X: ${x}, Z: ${z}`;
            
            // Position tooltip next to cursor (offset by 15px)
            this.positionTooltip.style.left = (event.clientX + 15) + 'px';
            this.positionTooltip.style.top = (event.clientY + 15) + 'px';
            this.positionTooltip.style.display = 'block';
        } else {
            this.positionTooltip.style.display = 'none';
        }
    }
    
    /**
     * Set cursor to crosshair for drawing mode
     */
    setDrawingCursor() {
        console.log('[CURSOR] setDrawingCursor() called');
        const canvas = this.getCanvas();
        if (!canvas) {
            console.log('[CURSOR] ERROR: Canvas not found!');
            return;
        }
        
        console.log('[CURSOR] Canvas found:', canvas.id || canvas.className || 'unnamed');
        console.log('[CURSOR] Current cursor before change:', canvas.style.cursor || window.getComputedStyle(canvas).cursor);
        
        // Add drawing-mode class to canvas (CSS will handle cursor with !important)
        canvas.classList.add('drawing-mode');
        console.log('[CURSOR] Added drawing-mode class. Has class?', canvas.classList.contains('drawing-mode'));
        
        // Also set inline style as backup
        // Note: setProperty with 'important' may not work in all browsers, so we use multiple methods
        canvas.style.cursor = 'crosshair';
        try {
            canvas.style.setProperty('cursor', 'crosshair', 'important');
        } catch (e) {
            // Fallback if setProperty with important doesn't work
            console.log('[CURSOR] setProperty with important failed, using regular style:', e);
        }
        console.log('[CURSOR] Set cursor to crosshair. Current style:', canvas.style.cursor);
        console.log('[CURSOR] Computed cursor:', window.getComputedStyle(canvas).cursor);
        console.log('[CURSOR] Canvas classes:', Array.from(canvas.classList));
        
        // Check drawing mode status
        const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
        const circleActive = this.circleManager && this.circleManager.isDrawing;
        const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
        const treeActive = this.treeManager && this.treeManager.isPlacingTree;
        const isDrawingActive = rectangleActive || circleActive || polygonActive || treeActive;
        console.log('[CURSOR] Drawing mode active:', isDrawingActive);
        console.log('[CURSOR] Rectangle drawing:', this.rectangleManager && this.rectangleManager.isDrawing);
        console.log('[CURSOR] Circle drawing:', this.circleManager && this.circleManager.isDrawing);
        console.log('[CURSOR] Polygon drawing:', this.polygonManager && this.polygonManager.isCurrentlyDrawing);
        console.log('[CURSOR] Tree placing:', this.treeManager && this.treeManager.isPlacingTree);
        
        // Clear any existing interval
        if (this.cursorCheckInterval) {
            clearInterval(this.cursorCheckInterval);
            this.cursorCheckInterval = null;
            console.log('[CURSOR] Cleared existing interval');
        }
        
        // Start interval to continuously maintain crosshair cursor
        // This ensures cursor stays crosshair even if CameraController tries to change it
        this.cursorCheckInterval = setInterval(() => {
            const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
            const circleActive = this.circleManager && this.circleManager.isDrawing;
            const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
            const treeActive = this.treeManager && this.treeManager.isPlacingTree;
            const isDrawingActive = rectangleActive || circleActive || polygonActive || treeActive;
            
            if (isDrawingActive) {
                const currentCanvas = this.getCanvas();
                if (currentCanvas) {
                    const currentCursor = window.getComputedStyle(currentCanvas).cursor;
                    if (currentCursor !== 'crosshair' && currentCursor !== 'default') {
                        console.log('[CURSOR] Interval: Cursor changed to', currentCursor, '- fixing to crosshair');
                    }
                    currentCanvas.classList.add('drawing-mode');
                    currentCanvas.style.cursor = 'crosshair';
                    try {
                        currentCanvas.style.setProperty('cursor', 'crosshair', 'important');
                    } catch (e) {}
                }
            } else {
                // Stop interval if drawing mode is no longer active
                console.log('[CURSOR] Interval: Drawing mode no longer active, stopping interval');
                if (this.cursorCheckInterval) {
                    clearInterval(this.cursorCheckInterval);
                    this.cursorCheckInterval = null;
                }
            }
        }, 50); // Check every 50ms
        console.log('[CURSOR] Started cursor check interval');
        
        // Setup coordinates tooltip (using existing function)
        this.setupDrawingCoordinatesTooltip();
        
        // Remove any existing drawing cursor listeners to avoid duplicates
        if (this.drawingCursorPointerDownHandler) {
            canvas.removeEventListener('pointerdown', this.drawingCursorPointerDownHandler, true);
        }
        if (this.drawingCursorPointerUpHandler) {
            canvas.removeEventListener('pointerup', this.drawingCursorPointerUpHandler, true);
        }
        if (this.drawingCursorPointerLeaveHandler) {
            canvas.removeEventListener('pointerleave', this.drawingCursorPointerLeaveHandler, true);
        }
        if (this.drawingCursorPointerMoveHandler) {
            canvas.removeEventListener('pointermove', this.drawingCursorPointerMoveHandler, true);
        }
        
        // Add event listeners to maintain crosshair cursor during drawing
        // These will override CameraController's cursor changes
        // Use capture phase (true) to ensure these run before CameraController's handlers
        this.drawingCursorPointerDownHandler = (e) => {
            canvas.classList.add('drawing-mode');
            canvas.style.cursor = 'crosshair';
            try {
                canvas.style.setProperty('cursor', 'crosshair', 'important');
            } catch (e) {}
        };
        this.drawingCursorPointerUpHandler = (e) => {
            canvas.classList.add('drawing-mode');
            canvas.style.cursor = 'crosshair';
            try {
                canvas.style.setProperty('cursor', 'crosshair', 'important');
            } catch (e) {}
        };
        this.drawingCursorPointerLeaveHandler = (e) => {
            canvas.classList.add('drawing-mode');
            canvas.style.cursor = 'crosshair';
            try {
                canvas.style.setProperty('cursor', 'crosshair', 'important');
            } catch (e) {}
        };
        this.drawingCursorPointerMoveHandler = (e) => {
            // Only set crosshair if we're in drawing mode
            const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
            const circleActive = this.circleManager && this.circleManager.isDrawing;
            const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
            const treeActive = this.treeManager && this.treeManager.isPlacingTree;
            const isDrawingActive = rectangleActive || circleActive || polygonActive || treeActive;
            
            if (isDrawingActive) {
                canvas.classList.add('drawing-mode');
                canvas.style.cursor = 'crosshair';
                try {
                    canvas.style.setProperty('cursor', 'crosshair', 'important');
                } catch (e) {}
            }
        };
        
        // Use capture phase to ensure these run before CameraController's handlers
        canvas.addEventListener('pointerdown', this.drawingCursorPointerDownHandler, true);
        canvas.addEventListener('pointerup', this.drawingCursorPointerUpHandler, true);
        canvas.addEventListener('pointerleave', this.drawingCursorPointerLeaveHandler, true);
        canvas.addEventListener('pointermove', this.drawingCursorPointerMoveHandler, true);
    }

    /**
     * Reset cursor to default (grab)
     */
    resetCursor() {
        console.log('[CURSOR] resetCursor() called');
        const canvas = this.getCanvas();
        if (!canvas) {
            console.log('[CURSOR] ERROR: Canvas not found in resetCursor!');
            return;
        }
        
        console.log('[CURSOR] Current cursor before reset:', canvas.style.cursor || window.getComputedStyle(canvas).cursor);
        
        // Stop cursor check interval
        if (this.cursorCheckInterval) {
            clearInterval(this.cursorCheckInterval);
            this.cursorCheckInterval = null;
            console.log('[CURSOR] Stopped cursor check interval');
        }
        
        // Remove drawing-mode class
        canvas.classList.remove('drawing-mode');
        console.log('[CURSOR] Removed drawing-mode class. Has class?', canvas.classList.contains('drawing-mode'));
        
        // Remove drawing cursor event listeners
        if (this.drawingCursorPointerDownHandler) {
            canvas.removeEventListener('pointerdown', this.drawingCursorPointerDownHandler, true);
            this.drawingCursorPointerDownHandler = null;
        }
        if (this.drawingCursorPointerUpHandler) {
            canvas.removeEventListener('pointerup', this.drawingCursorPointerUpHandler, true);
            this.drawingCursorPointerUpHandler = null;
        }
        if (this.drawingCursorPointerLeaveHandler) {
            canvas.removeEventListener('pointerleave', this.drawingCursorPointerLeaveHandler, true);
            this.drawingCursorPointerLeaveHandler = null;
        }
        if (this.drawingCursorPointerMoveHandler) {
            canvas.removeEventListener('pointermove', this.drawingCursorPointerMoveHandler, true);
            this.drawingCursorPointerMoveHandler = null;
        }
        console.log('[CURSOR] Removed event listeners');
        
        // Reset cursor to grab (remove important flag)
        canvas.style.removeProperty('cursor');
        canvas.style.cursor = 'grab';
        console.log('[CURSOR] Reset cursor to grab. Current style:', canvas.style.cursor);
        console.log('[CURSOR] Computed cursor:', window.getComputedStyle(canvas).cursor);
        
        // Hide coordinates tooltip
        this.hideDrawingCoordinatesTooltip();
    }

    /**
     * Setup coordinates tooltip for drawing mode
     */
    setupDrawingCoordinatesTooltip() {
        console.log('[TOOLTIP] setupDrawingCoordinatesTooltip() called');
        
        // Remove any existing positionTooltip to avoid duplicates
        if (this.positionTooltip) {
            console.log('[TOOLTIP] Removing duplicate positionTooltip');
            this.positionTooltip.remove();
            this.positionTooltip = null;
        }
        
        // Remove any existing tooltip with id 'drawing-position-tooltip'
        const existingPositionTooltip = document.getElementById('drawing-position-tooltip');
        if (existingPositionTooltip) {
            console.log('[TOOLTIP] Removing existing tooltip with id drawing-position-tooltip');
            existingPositionTooltip.remove();
        }
        
        // Create tooltip element if it doesn't exist
        if (!this.drawingCoordinatesTooltip) {
            console.log('[TOOLTIP] Creating new tooltip element');
            this.drawingCoordinatesTooltip = document.createElement('div');
            this.drawingCoordinatesTooltip.className = 'drawing-coordinates-tooltip';
            // Set inline styles to ensure visibility
            // Use a very high z-index and ensure it's in the root stacking context
            this.drawingCoordinatesTooltip.style.cssText = `
                position: fixed !important;
                pointer-events: none !important;
                background: rgba(20, 20, 20, 0.7) !important;
                color: #ffffff !important;
                padding: 8px 12px !important;
                border-radius: 6px !important;
                font-size: 13px !important;
                font-family: 'Courier New', monospace !important;
                font-weight: bold !important;
                white-space: nowrap !important;
                z-index: 2147483647 !important;
                display: none !important;
                box-shadow: none !important;
                border: none !important;
                visibility: visible !important;
                opacity: 1 !important;
                transform: none !important;
                will-change: transform !important;
                backdrop-filter: blur(2px) !important;
            `;
            // Ensure tooltip is appended to body (root stacking context)
            if (this.drawingCoordinatesTooltip.parentElement !== document.body) {
                document.body.appendChild(this.drawingCoordinatesTooltip);
            }
            console.log('[TOOLTIP] Tooltip element created and added to body');
        } else {
            console.log('[TOOLTIP] Tooltip element already exists');
        }

        const canvas = this.getCanvas();
        if (!canvas) {
            console.log('[TOOLTIP] ERROR: Canvas not found!');
            return;
        }
        console.log('[TOOLTIP] Canvas found:', canvas.id || canvas.className);

        // Remove existing handler if any
        if (this.drawingCoordinatesMoveHandler) {
            canvas.removeEventListener('pointermove', this.drawingCoordinatesMoveHandler, true);
            canvas.removeEventListener('mousemove', this.drawingCoordinatesMoveHandler, true);
        }

        // Store last mouse position for smooth updates
        this.lastTooltipMouseX = 0;
        this.lastTooltipMouseY = 0;
        this.tooltipUpdateInterval = null;
        
        // Create new handler for real-time mouse position tracking
        this.drawingCoordinatesMoveHandler = (event) => {
            // Check if drawing mode is active using the correct method
            const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
            const circleActive = this.circleManager && this.circleManager.isDrawing;
            const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
            const treeActive = this.treeManager && this.treeManager.isPlacingTree;
            const isDrawingActive = rectangleActive || circleActive || polygonActive || treeActive;
            
            if (!isDrawingActive) {
                if (this.drawingCoordinatesTooltip) {
                    this.drawingCoordinatesTooltip.style.display = 'none';
                }
                if (this.tooltipUpdateInterval) {
                    clearInterval(this.tooltipUpdateInterval);
                    this.tooltipUpdateInterval = null;
                }
                return;
            }

            // Store mouse position immediately (this is fast)
            const rect = canvas.getBoundingClientRect();
            this.lastTooltipMouseX = event.clientX || 0;
            this.lastTooltipMouseY = event.clientY || 0;
            
            // IMPORTANT: Update scene.pointerX and scene.pointerY manually
            // because Babylon.js only updates them through its own event system
            const scene = this.sceneManager.getScene();
            if (scene) {
                const canvasX = this.lastTooltipMouseX - rect.left;
                const canvasY = this.lastTooltipMouseY - rect.top;
                scene.pointerX = canvasX;
                scene.pointerY = canvasY;
            }
            
            // Update tooltip position immediately (without waiting for pick)
            // This ensures tooltip always follows cursor smoothly
            if (this.drawingCoordinatesTooltip) {
                const newLeft = this.lastTooltipMouseX + 15;
                const newTop = this.lastTooltipMouseY + 15;
                this.drawingCoordinatesTooltip.style.setProperty('left', `${newLeft}px`, 'important');
                this.drawingCoordinatesTooltip.style.setProperty('top', `${newTop}px`, 'important');
                this.drawingCoordinatesTooltip.style.setProperty('display', 'block', 'important');
            } else {
                console.warn('[TOOLTIP] Tooltip element not found in move handler!');
            }
        };
        
        // Start continuous update loop for coordinates (runs every frame via requestAnimationFrame)
        // This ensures coordinates update smoothly even during fast mouse movement
        // Only start loop if it's not already running
        if (!this.tooltipUpdateLoopRunning) {
            this.tooltipUpdateLoopRunning = true;
            let lastUpdateTime = 0;
            let loopIteration = 0;
            const updateLoop = () => {
                if (!this.tooltipUpdateLoopRunning) {
                    return; // Stop loop
                }
                
                const now = performance.now();
                // Throttle to ~60fps (every ~16ms) to avoid excessive pick calls
                // Reduced to ~4ms for smoother updates during fast movement (250fps)
                if (now - lastUpdateTime >= 4) {
                    loopIteration++;
                    // Removed frequent logging to reduce console clutter
                    this.updateTooltipCoordinates();
                    lastUpdateTime = now;
                }
                
                // Continue loop
                requestAnimationFrame(updateLoop);
            };
            
            // Start the update loop
            requestAnimationFrame(updateLoop);
        }
        
        // Method to update tooltip coordinates (called via requestAnimationFrame)
        this.updateTooltipCoordinates = () => {
            if (!this.drawingCoordinatesTooltip || !this.sceneManager) {
                if (!this._lastTooltipUpdateErrorLog || Date.now() - this._lastTooltipUpdateErrorLog > 1000) {
                    console.warn('[TOOLTIP] updateTooltipCoordinates - Missing tooltip or sceneManager:', {
                        tooltip: !!this.drawingCoordinatesTooltip,
                        sceneManager: !!this.sceneManager
                    });
                    this._lastTooltipUpdateErrorLog = Date.now();
                }
                return;
            }
            
            const canvas = this.getCanvas();
            if (!canvas) {
                if (!this._lastTooltipUpdateErrorLog || Date.now() - this._lastTooltipUpdateErrorLog > 1000) {
                    console.warn('[TOOLTIP] updateTooltipCoordinates - Canvas not found');
                    this._lastTooltipUpdateErrorLog = Date.now();
                }
                return;
            }
            
            // Check if drawing mode is still active
            const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
            const circleActive = this.circleManager && this.circleManager.isDrawing;
            const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
            const treeActive = this.treeManager && this.treeManager.isPlacingTree;
            const isDrawingActive = rectangleActive || circleActive || polygonActive || treeActive;
            
            if (!isDrawingActive) {
                if (this.drawingCoordinatesTooltip) {
                    this.drawingCoordinatesTooltip.style.display = 'none';
                }
                return;
            }
            
            // Use scene.pointerX and scene.pointerY which are always up-to-date
            // These are automatically updated by Babylon.js on every pointer move
            const scene = this.sceneManager.getScene();
            if (!scene) {
                if (!this._lastTooltipUpdateErrorLog || Date.now() - this._lastTooltipUpdateErrorLog > 1000) {
                    console.warn('[TOOLTIP] updateTooltipCoordinates - Scene not available');
                    this._lastTooltipUpdateErrorLog = Date.now();
                }
                return;
            }
            
            // Use scene.pointerX/Y which are always current (updated by Babylon.js or manually)
            // For polygon drawing, these are updated in setupDrawingEventListeners
            // For other drawing tools, they're updated in drawingCoordinatesMoveHandler
            const canvasX = scene.pointerX;
            const canvasY = scene.pointerY;
            
            // Removed logging to reduce console clutter
            
            // Get world coordinates from ground intersection
            const pickStartTime = performance.now();
            const pickResult = scene.pick(canvasX, canvasY, (mesh) => {
                return mesh.name === 'earth' || mesh.name === 'invisible_ground';
            });
            const pickDuration = performance.now() - pickStartTime;
            
            if (pickResult && pickResult.hit && pickResult.pickedPoint) {
                const worldPoint = pickResult.pickedPoint;
                const xCoord = worldPoint.x.toFixed(2);
                const zCoord = worldPoint.z.toFixed(2);
                
                    // Update tooltip text (coordinates) - this is the only thing that needs pick
                    if (this.drawingCoordinatesTooltip) {
                        this.drawingCoordinatesTooltip.textContent = `X: ${xCoord}, Z: ${zCoord}`;
                    }
                } else {
                    // Don't hide tooltip if pick fails - just keep showing last known position
                    // This prevents flickering when moving quickly
                }
        };
        
        // Note: Using direct event listeners (pointermove/mousemove) for real-time updates
        // This is more reliable than scene.onPointerObservable for tooltip updates

        // Add event listeners for real-time updates
        // Use both pointermove and mousemove for maximum compatibility
        // Use capture phase to ensure we get events before other handlers
        canvas.addEventListener('pointermove', this.drawingCoordinatesMoveHandler, true);
        canvas.addEventListener('mousemove', this.drawingCoordinatesMoveHandler, true);
        
        // Hide tooltip when mouse leaves canvas
        this.drawingCoordinatesLeaveHandler = (event) => {
            if (this.drawingCoordinatesTooltip) {
                this.drawingCoordinatesTooltip.style.display = 'none';
            }
        };
        
        // Show tooltip when mouse enters canvas (if drawing mode is active)
        this.drawingCoordinatesEnterHandler = (event) => {
            const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
            const circleActive = this.circleManager && this.circleManager.isDrawing;
            const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
            const treeActive = this.treeManager && this.treeManager.isPlacingTree;
            const isDrawingActive = rectangleActive || circleActive || polygonActive || treeActive;
            
            if (isDrawingActive && this.drawingCoordinatesTooltip) {
                this.drawingCoordinatesTooltip.style.display = 'block';
            }
        };
        
        canvas.addEventListener('pointerleave', this.drawingCoordinatesLeaveHandler, true);
        canvas.addEventListener('mouseleave', this.drawingCoordinatesLeaveHandler, true);
        canvas.addEventListener('pointerenter', this.drawingCoordinatesEnterHandler, true);
        canvas.addEventListener('mouseenter', this.drawingCoordinatesEnterHandler, true);
        
        console.log('[TOOLTIP] Event listeners added for pointermove, mousemove, pointerleave, mouseleave, pointerenter, mouseenter with capture phase');
    }

    /**
     * Update tooltip position (called via requestAnimationFrame)
     */
    updateTooltipPosition() {
        if (!this.drawingCoordinatesTooltip || !this.sceneManager) {
            return;
        }
        
        const canvas = this.getCanvas();
        if (!canvas) {
            return;
        }
        
        // Check if drawing mode is active
        const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
        const circleActive = this.circleManager && this.circleManager.isDrawing;
        const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
        const treeActive = this.treeManager && this.treeManager.isPlacingTree;
        const isDrawingActive = rectangleActive || circleActive || polygonActive || treeActive;
        
        if (!isDrawingActive) {
            this.hideDrawingCoordinatesTooltip();
            return;
        }
        
        // Get canvas coordinates
        const rect = canvas.getBoundingClientRect();
        const canvasX = this.lastMouseX - rect.left;
        const canvasY = this.lastMouseY - rect.top;
        
        // Get world coordinates from ground intersection
        const scene = this.sceneManager.getScene();
        if (scene) {
            const pickResult = scene.pick(canvasX, canvasY, (mesh) => {
                return mesh.name === 'earth' || mesh.name === 'invisible_ground';
            });
            
            if (pickResult && pickResult.hit && pickResult.pickedPoint) {
                const worldPoint = pickResult.pickedPoint;
                const xCoord = worldPoint.x.toFixed(2);
                const zCoord = worldPoint.z.toFixed(2);
                
                // Update tooltip text and position
                this.drawingCoordinatesTooltip.textContent = `X: ${xCoord}, Z: ${zCoord}`;
                this.drawingCoordinatesTooltip.style.left = `${this.lastMouseX + 15}px`;
                this.drawingCoordinatesTooltip.style.top = `${this.lastMouseY + 15}px`;
                this.drawingCoordinatesTooltip.style.display = 'block';
            } else {
                // Hide tooltip if not on ground
                this.drawingCoordinatesTooltip.style.display = 'none';
            }
        }
    }
    
    /**
     * Hide coordinates tooltip
     */
    hideDrawingCoordinatesTooltip() {
        if (this.drawingCoordinatesTooltip) {
            this.drawingCoordinatesTooltip.style.display = 'none';
        }
        this.tooltipUpdateRequested = false;
        
        // Stop the update loop
        this.tooltipUpdateLoopRunning = false;

        const canvas = this.getCanvas();
        if (canvas) {
            if (this.drawingCoordinatesMoveHandler) {
                canvas.removeEventListener('pointermove', this.drawingCoordinatesMoveHandler, true);
                canvas.removeEventListener('mousemove', this.drawingCoordinatesMoveHandler, true);
                this.drawingCoordinatesMoveHandler = null;
            }
            if (this.drawingCoordinatesLeaveHandler) {
                canvas.removeEventListener('pointerleave', this.drawingCoordinatesLeaveHandler, true);
                canvas.removeEventListener('mouseleave', this.drawingCoordinatesLeaveHandler, true);
                this.drawingCoordinatesLeaveHandler = null;
            }
            if (this.drawingCoordinatesEnterHandler) {
                canvas.removeEventListener('pointerenter', this.drawingCoordinatesEnterHandler, true);
                canvas.removeEventListener('mouseenter', this.drawingCoordinatesEnterHandler, true);
                this.drawingCoordinatesEnterHandler = null;
            }
        }
        
        // Remove pointer observer
        if (this.tooltipPointerObserver && this.sceneManager && this.sceneManager.getScene) {
            this.sceneManager.getScene().onPointerObservable.remove(this.tooltipPointerObserver);
            this.tooltipPointerObserver = null;
        }
    }

    /**
     * Check if any drawing mode is currently active
     * @returns {boolean} True if drawing mode is active
     */
    isDrawingModeActive() {
        const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
        const circleActive = this.circleManager && this.circleManager.isDrawing;
        const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
        const treeActive = this.treeManager && this.treeManager.isPlacingTree;
        
        const isActive = rectangleActive || circleActive || polygonActive || treeActive;
        
        // Log only when state changes to avoid spam
        if (isActive && !this._lastDrawingState) {
            console.log('[CURSOR] Drawing mode activated:', {
                rectangle: rectangleActive,
                circle: circleActive,
                polygon: polygonActive,
                tree: treeActive
            });
        } else if (!isActive && this._lastDrawingState) {
            console.log('[CURSOR] Drawing mode deactivated');
        }
        
        this._lastDrawingState = isActive;
        return isActive;
    }

    /**
     * Apply 2-sided materials to all meshes in the scene
     */
    apply2SidedMaterialsToAll() {
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            return;
        }

        let updatedCount = 0;

        // Apply to all meshes
        scene.meshes.forEach(mesh => {
            if (mesh.material && mesh.material instanceof BABYLON.StandardMaterial) {
                if (mesh.material.backFaceCulling !== false) {
                    mesh.material.backFaceCulling = false; // 2-sided
                    mesh.material.twoSidedLighting = true; // Enable lighting on both sides
                    updatedCount++;
                }
            }
        });

        // Also apply to TransformNodes (for trees)
        scene.transformNodes.forEach(node => {
            if (node.getChildMeshes) {
                const childMeshes = node.getChildMeshes();
                childMeshes.forEach(childMesh => {
                    if (childMesh.material && childMesh.material instanceof BABYLON.StandardMaterial) {
                        if (childMesh.material.backFaceCulling !== false) {
                            childMesh.material.backFaceCulling = false; // 2-sided
                            childMesh.material.twoSidedLighting = true; // Enable lighting on both sides
                            updatedCount++;
                        }
                    }
                });
            }
        });

        // console.log(`Applied 2-sided materials to ${updatedCount} meshes in the scene`);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Simple Delete key handler - FIRST, before anything else
        document.addEventListener('keydown', (event) => {
            if (event.code === 'Delete') {
                // Only check if we're typing in an input field
                const activeElement = document.activeElement;
                if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                    return; // Don't delete when typing
                }
                
                event.preventDefault();
                event.stopPropagation();
                console.log('Delete pressed - deleting selected');
                this.deleteSelected();
            }
        }, true); // Capture phase to catch early

        // Tool selection shortcuts are now handled by ToolManager
        // They will be set up when ToolManager is initialized
        
        this.setupMenuListeners();
        // Transform and drawing tools listeners are now handled by ToolManager
        // Transform input fields are now handled by TransformInputManager
        // They will be set up when ToolManager and TransformInputManager are initialized
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
        
        // Transform input fields are now handled by TransformInputManager
        // They will be set up when TransformInputManager is initialized
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
            
            // Show properties popup for any selected object when any transform tool is active
            if (count === 1 && this.isAnyTransformToolActive()) {
                let selectedObject = selectedObjects[0];
                
                // IMPORTANT: If extrusion is selected, use its base polygon for properties popup
                // This ensures polygon properties are shown even when extrusion is selected
                if (selectedObject.name && selectedObject.name.includes('_extrusion') && selectedObject.basePolygon) {
                    console.log(`[SELECTION] Extrusion selected, using base polygon for properties: ${selectedObject.basePolygon.name}`);
                    selectedObject = selectedObject.basePolygon;
                }
                
                const shapeType = this.getShapeType(selectedObject);
                
                // Check if this is a circle or building that originated from a circle
                const isCircle = shapeType === 'circle';
                const isBuildingFromCircle = shapeType === 'building' && 
                    selectedObject.userData && 
                    selectedObject.userData.dimensions && 
                    selectedObject.userData.dimensions.diameterTop !== undefined;
                
                
                // Check if this is an imported STL mesh first
                if (selectedObject.userData && selectedObject.userData.isImportedSTL) {
                    if (this.propertiesPopupManager) {
                        this.propertiesPopupManager.showSTLPropertiesPopup(selectedObject);
                    } else {
                        this.showSTLPropertiesPopup(selectedObject);
                    }
                } else if (this.isTree(selectedObject)) {
                    if (this.propertiesPopupManager) {
                        this.propertiesPopupManager.showTreePropertiesPopup(selectedObject);
                    } else {
                        this.showTreePropertiesPopup(selectedObject);
                    }
                } else if (isCircle || isBuildingFromCircle) {
                    if (this.propertiesPopupManager) {
                        this.propertiesPopupManager.showCirclePropertiesPopup(selectedObject);
                    } else {
                        this.showCirclePropertiesPopup(selectedObject);
                    }
                } else if (shapeType === 'polygon') {
                    if (this.propertiesPopupManager) {
                        this.propertiesPopupManager.showPolygonPropertiesPopup(selectedObject);
                    } else {
                        this.showPolygonPropertiesPopup(selectedObject);
                    }
                } else if (this.is2DShape(selectedObject) || shapeType === 'rectangle' || shapeType === 'building') {
                    if (this.propertiesPopupManager) {
                        this.propertiesPopupManager.showPropertiesPopup(selectedObject);
                    } else {
                        this.showPropertiesPopup(selectedObject);
                    }
                }
            } else if (count > 1) {
                // Hide properties popup when multiple objects are selected
                console.log(`Multiple objects selected (${count}), hiding properties popup`);
                if (this.propertiesPopupManager) {
                    this.propertiesPopupManager.hidePropertiesPopup();
                } else {
                    this.hidePropertiesPopup();
                }
            }
        } else {
            this.hideSelectionInfo();
            if (this.propertiesPopupManager) {
                this.propertiesPopupManager.hidePropertiesPopup();
            } else {
                this.hidePropertiesPopup();
            }
        }
        
        // Update transform input fields when selection changes
        this.updateTransformInputFieldsValues();
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
        // Delegated to ToolManager
        if (this.toolManager) {
            // ToolManager handles this
            return;
        }
        // Fallback if ToolManager not available (should not happen)
        console.warn('ToolManager not available, transform tools listeners not set up');
    }

    /**
     * Select transform tool
     */
    selectTransformTool(toolName) {
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.selectTransformTool(toolName);
        }
        // Fallback if ToolManager not available (should not happen)
        console.warn('ToolManager not available, cannot select transform tool');
    }

    /**
     * Setup drawing tools event listeners
     */
    setupDrawingToolsListeners() {
        // Delegated to ToolManager
        if (this.toolManager) {
            // ToolManager handles this
            return;
        }
        // Fallback if ToolManager not available (should not happen)
        console.warn('ToolManager not available, drawing tools listeners not set up');
    }

    /**
     * Setup tree event listeners
     */
    setupTreeEventListeners() {
        // Tree tool click with long press detection
        const treeTool = document.getElementById('treeTool');
        if (treeTool) {
            // Handle pointer down (mouse down or touch start)
            treeTool.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return; // Only left click
                e.stopPropagation();
                e.preventDefault();
                
                // Start long press timer
                this.treeToolLongPressStartTime = Date.now();
                this.treeToolLongPressTimer = setTimeout(() => {
                    // After 0.4 seconds, cancel current tree type and open panel
                    if (this.treeManager && this.treeManager.isCurrentlyPlacing()) {
                        this.treeManager.stopTreePlacement();
                    }
                    // Remove active class from all tree options
                    const treeOptions = document.querySelectorAll('.tree-option');
                    treeOptions.forEach(option => option.classList.remove('active'));
                    // Open submenu
                    this.showTreeSubmenu();
                    this.treeToolLongPressTimer = null;
                }, 400);
            });
            
            // Handle pointer up (mouse up or touch end)
            treeTool.addEventListener('pointerup', (e) => {
                if (e.button !== 0) return; // Only left click
                e.stopPropagation();
                e.preventDefault();
                
                // Clear long press timer
                if (this.treeToolLongPressTimer) {
                    clearTimeout(this.treeToolLongPressTimer);
                    this.treeToolLongPressTimer = null;
                }
                
                // If it was a short click (less than 0.4 seconds), activate tree with default/last selected type
                const pressDuration = Date.now() - (this.treeToolLongPressStartTime || 0);
                if (pressDuration < 200) {
                    // Activate tree with default or last selected type
                    const treeTypeToActivate = this.lastSelectedTreeType || '1';
                    this.activateTreeType(treeTypeToActivate, false);
                }
                
                this.treeToolLongPressStartTime = null;
            });
            
            // Handle pointer leave (mouse leave or touch cancel)
            treeTool.addEventListener('pointerleave', (e) => {
                // Clear long press timer if mouse leaves
                if (this.treeToolLongPressTimer) {
                    clearTimeout(this.treeToolLongPressTimer);
                    this.treeToolLongPressTimer = null;
                }
                this.treeToolLongPressStartTime = null;
            });
            
            // Prevent context menu on right click
            treeTool.addEventListener('contextmenu', (e) => {
                e.preventDefault();
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
        // Note: This will trigger hideTreeSubmenu which will activate default/last selected tree type
        document.addEventListener('click', (e) => {
            const treeSubmenu = document.getElementById('treeSubmenu');
            const treeTool = document.getElementById('treeTool');
            
            if (treeSubmenu && treeTool && 
                !treeSubmenu.contains(e.target) && 
                !treeTool.contains(e.target)) {
                // Only hide if submenu is visible
                if (treeSubmenu.style.display !== 'none') {
                    this.hideTreeSubmenu();
                }
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
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.selectDrawingTool(toolName);
        }
        // Fallback if ToolManager not available (should not happen)
        console.warn('ToolManager not available, cannot select drawing tool');
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
        
        // Hide transform input fields when select tool is activated
        this.updateTransformInputFieldsVisibility();
    }

    /**
     * Handle drawing tool selection logic
     */
    handleDrawingToolSelection(toolName) {
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.handleDrawingToolSelection(toolName);
        }
        // Fallback if ToolManager not available
        switch (toolName) {
            case 'rectangle':
                if (this.createRectangle) this.createRectangle();
                break;
            case 'circle':
                if (this.createCircle) this.createCircle();
                break;
            case 'polygon':
                if (this.startPolygonDrawing) this.startPolygonDrawing();
                break;
            case 'tree':
                // Tree tool is handled separately in tree event listeners
                break;
            case 'clear-drawings':
                if (this.clear2DShapes) this.clear2DShapes();
                break;
        }
    }

    /**
     * Start polygon drawing
     */
    startPolygonDrawing() {
        if (this.polygonManager) {
            // IMPORTANT: Reset polygonType dropdown to 'ground' when starting new polygon drawing
            // This ensures new polygons default to 'ground' type, not the type of previously edited polygon
            const polygonTypeSelect = document.getElementById('polygonType');
            if (polygonTypeSelect) {
                polygonTypeSelect.value = 'ground';
                polygonTypeSelect.removeAttribute('data-previous-value');
            }
            
            // IMPORTANT: Deactivate all other drawing tools before activating polygon
            this.deactivateAllDrawingTools();
            
            // Activate polygon tool button
            const polygonTool = document.querySelector('#drawingPanel [data-tool="polygon"]');
            if (polygonTool) {
                polygonTool.classList.add('active');
            }
            
            // Set up callbacks for polygon completion and cancellation
            this.polygonManager.onPolygonCompleted = (polygon) => {
                this.enableCameraControls();
                this.hidePolygonDrawingInstructions();
                // Reset cursor to default
                this.resetCursor();
                this.deactivatePolygonTool();
                this.activateSelectTool();
                
                // Automatically select the newly created polygon
                if (polygon && this.selectionManager) {
                    this.selectionManager.selectObject(polygon, false, true);
                }
                
                // Dispatch scene change event to update object list
                this.dispatchSceneChangeEvent();
            };
            
            this.polygonManager.onPolygonCancelled = () => {
                this.enableCameraControls();
                this.hidePolygonDrawingInstructions();
                // Reset cursor to default
                this.resetCursor();
                this.deactivatePolygonTool();
                this.activateSelectTool();
            };
            
            this.polygonManager.startDrawing();
            this.disableCameraControls();
            this.showPolygonDrawingInstructions();
            
            // Set cursor to crosshair for drawing mode
            this.setDrawingCursor();
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
            // Position to the left of transform panel
            // Transform panel is at top center (left: 50%, translateX(-50%))
            // Drawing panel is at left: 20px, width: 60px
            // Position polygon drawing panel to the left of transform panel, above drawing panel
            // Calculate position: left of transform panel (approximately left: calc(50% - 200px))
            instructionPanel.style.cssText = `
                position: fixed;
                top: 20px;
                left: 90px;
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
        } else {
            // Update position if panel already exists
            instructionPanel.style.left = '90px';
            instructionPanel.style.right = 'auto';
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
            // Reset inline styles that might be applied by event listeners
            polygonTool.style.background = '';
            polygonTool.style.borderColor = '';
            polygonTool.style.boxShadow = '';
            const icon = polygonTool.querySelector('.tool-icon');
            if (icon) {
                icon.style.filter = '';
            }
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
    /**
     * Show tree submenu
     */
    showTreeSubmenu() {
        const treeSubmenu = document.getElementById('treeSubmenu');
        if (treeSubmenu) {
            treeSubmenu.style.display = 'block';
            // Deactivate all other tools when opening submenu
            this.deselectAllOtherTools();
            // Hide transform input fields when tree tool is activated
            this.updateTransformInputFieldsVisibility();
        }
    }
    
    /**
     * Toggle tree submenu visibility
     */
    toggleTreeSubmenu() {
        const treeSubmenu = document.getElementById('treeSubmenu');
        if (treeSubmenu) {
            const isVisible = treeSubmenu.style.display !== 'none';
            if (isVisible) {
                this.hideTreeSubmenu();
            } else {
                this.showTreeSubmenu();
            }
        }
    }

    /**
     * Hide tree submenu
     * If no tree type was selected, activate default or last selected type
     */
    hideTreeSubmenu() {
        const treeSubmenu = document.getElementById('treeSubmenu');
        if (treeSubmenu) {
            treeSubmenu.style.display = 'none';
            
            // Don't reactivate tree if we're in the middle of deactivating tree placement
            if (this.isDeactivatingTreePlacement) {
                return;
            }
            
            // Check if any tree type is currently active (both in UI and in TreeManager)
            const activeTreeOption = document.querySelector('.tree-option.active');
            const isTreePlacementActive = this.treeManager && this.treeManager.isPlacingTree;
            
            if (!activeTreeOption && !isTreePlacementActive) {
                // No tree type selected and no tree placement active, activate default or last selected type
                const treeTypeToActivate = this.lastSelectedTreeType || '1';
                this.activateTreeType(treeTypeToActivate, false);
            }
        }
    }

    /**
     * Select tree type and start placement (called when user clicks on a tree option)
     */
    selectTreeType(treeType) {
        // Save the selected tree type for future use
        this.lastSelectedTreeType = treeType;
        // Activate tree type and hide submenu
        this.activateTreeType(treeType, true);
    }
    
    /**
     * Activate tree type (internal method)
     * @param {string} treeType - Tree type to activate ('1', '2', '3', or '4')
     * @param {boolean} hideSubmenu - Whether to hide the submenu after activation
     */
    activateTreeType(treeType, hideSubmenu = true) {
        if (!this.treeManager) {
            return;
        }

        // Clear any existing selection when switching to tree tool
        if (this.selectionManager) {
            this.selectionManager.clearSelection();
        }

        // Hide submenu if requested
        if (hideSubmenu) {
            this.hideTreeSubmenu();
        }

        // Remove active class from all tree options
        const treeOptions = document.querySelectorAll('.tree-option');
        treeOptions.forEach(option => option.classList.remove('active'));

        // Add active class to selected option
        const selectedOption = document.querySelector(`[data-tree-type="${treeType}"]`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }

        // Update tree tool icon to match selected tree type
        this.updateTreeToolIcon(treeType);

        // Deselect all other tools when tree tool is selected
        this.deselectAllOtherTools();

        // Hide transform input fields when tree tool is selected
        this.updateTransformInputFieldsVisibility();

        // Disable camera controls during tree placement
        this.disableCameraControls();

        // Initialize height parameters from UI
        this.updateTreeHeightParameters();
        
        // Initialize distance parameter from UI
        const distanceInput = document.getElementById('treeDistance');
        if (distanceInput) {
            this.updateTreeDistanceParameter(parseFloat(distanceInput.value));
        }

        // IMPORTANT: Deactivate OTHER drawing tools (rectangle, circle, polygon) but NOT tree
        // We don't call deactivateAllDrawingTools() here because it would deactivate the tree we're trying to activate
        if (this.rectangleManager && this.rectangleManager.isDrawing) {
            this.rectangleManager.stopInteractiveDrawing();
        }
        if (this.circleManager && this.circleManager.isDrawing) {
            this.circleManager.stopInteractiveDrawing();
        }
        if (this.polygonManager && this.polygonManager.isCurrentlyDrawing) {
            this.polygonManager.stopDrawing();
        }
        
        // Remove active class from other drawing tools (but not tree)
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item:not([data-tool="tree"])');
        allDrawingTools.forEach(tool => tool.classList.remove('active'));
        
        // Activate tree tool button
        const treeTool = document.querySelector('#drawingPanel [data-tool="tree"]');
        if (treeTool) {
            treeTool.classList.add('active');
        }

        // Start tree placement
        this.treeManager.startTreePlacement(treeType);
        
        // Set cursor to crosshair for drawing mode
        this.setDrawingCursor();
    }

    /**
     * Update tree tool icon to match selected tree type
     * @param {string} treeType - Tree type ('1', '2', '3', or '4')
     */
    updateTreeToolIcon(treeType) {
        const treeTool = document.querySelector('#drawingPanel [data-tool="tree"]');
        if (!treeTool) {
            return;
        }
        
        const toolIcon = treeTool.querySelector('.tool-icon');
        if (!toolIcon) {
            return;
        }
        
        // Map tree type to icon path
        const iconMap = {
            '1': 'icons/tree1.svg',
            '2': 'icons/tree2.svg',
            '3': 'icons/tree3.svg',
            '4': 'icons/tree4.svg'
        };
        
        const iconPath = iconMap[treeType];
        if (iconPath) {
            toolIcon.src = iconPath;
        }
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

        // Hide transform input fields when tools are deselected
        this.updateTransformInputFieldsVisibility();

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

        // Set flag to prevent recursion
        this.isDeactivatingTreePlacement = true;

        try {
            // Stop tree placement
            this.treeManager.stopTreePlacement();

            // Remove active class from all tree options
            const treeOptions = document.querySelectorAll('.tree-option');
            treeOptions.forEach(option => option.classList.remove('active'));

            // Hide tree submenu (but it won't reactivate tree due to flag)
            this.hideTreeSubmenu();

            // Remove active class from tree tool button
            const treeTool = document.querySelector('#drawingPanel [data-tool="tree"]');
            if (treeTool) {
                treeTool.classList.remove('active');
            }

            // Reset cursor to default
            this.resetCursor();

            // Note: Camera controls are NOT re-enabled here
            // They will be re-enabled only when another tool is selected

            // Reset drag variables (they will be reset in the next mouse event)
        } finally {
            // Reset flag after deactivation is complete
            this.isDeactivatingTreePlacement = false;
        }
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
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.handleTransformToolSelection(toolName);
        }
        // Fallback if ToolManager not available
        switch (toolName) {
            case 'select':
                if (this.setTransformMode) this.setTransformMode('select');
                break;
            case 'move':
                if (this.setTransformMode) this.setTransformMode('move');
                break;
            case 'rotate':
                if (this.setTransformMode) this.setTransformMode('rotate');
                break;
            case 'scale':
                if (this.setTransformMode) this.setTransformMode('scale');
                break;
            case 'coordinate-toggle':
                if (this.toggleCoordinateMode) this.toggleCoordinateMode();
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
        
        // Enable coordinate toggle for selection mode
        this.enableCoordinateToggle();
        
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
        
        // Enable coordinate toggle for move mode
        this.enableCoordinateToggle();
        
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
        
        // Enable coordinate toggle for rotate mode
        this.enableCoordinateToggle();
        
        // Enable camera controls for rotate mode
        this.enableCameraControls();
    }

    /**
     * Enable scale mode
     */
    enableScaleMode() {
        if (this.scaleManager) {
            // Force scale mode to local (scale only works in local mode)
            this.scaleManager.isGlobalMode = false;
            this.scaleManager.activate();
            this.showScaleInstructions();
        } else {
        }
        
        // Disable coordinate toggle for scale mode (scale only works in local)
        this.disableCoordinateToggle();
        
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
                this.showSaveSceneDialog('empty');
                break;
            case 'default-scene':
                this.showSaveSceneDialog('default');
                break;
            case 'save-scene':
                this.saveScene();
                break;
            case 'load-scene':
                this.loadProject();
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
            case 'duplicate-selected':
                this.duplicateSelected();
                break;
            case 'delete-selected':
                this.deleteSelected();
                break;
            case 'preferences':
                this.openPreferences();
                break;
            case 'post-processing':
                this.openPostProcessing();
                break;
            case 'about':
                this.showAbout();
                break;
            case 'toggle-object-list':
                this.toggleObjectList();
                break;
            case 'surface-types-manager':
                this.openSurfaceTypesManager();
                break;
            default:
        }
    }

    /**
     * Menu action implementations
     */
    // Note: The following methods were removed as they only contained placeholder alerts:
    // loadScene, exportOBJ, undo, redo, selectAll, 
    // clearSelection, deleteSelected, openSceneSettings, openRenderSettings, openCameraSettings

    /**
     * Save current scene
     * Note: Currently uses STL export as save mechanism
     * In the future, this could save to a custom scene format
     */
    async saveScene() {
        // Show save project dialog
        this.showSaveProjectDialog();
    }

    /**
     * Show save project dialog
     */
    showSaveProjectDialog() {
        const dialog = document.getElementById('saveProjectDialog');
        if (!dialog) {
            console.error('Save project dialog not found');
            return;
        }

        // Check if JSZip is available
        if (typeof JSZip === 'undefined') {
            alert('JSZip library is not loaded. Please refresh the page.');
            return;
        }

        // Check if File System Access API is supported
        if (!('showSaveFilePicker' in window)) {
            alert('File System Access API is not supported in this browser. Please use a modern browser like Chrome or Edge.');
            return;
        }

        // Reset dialog state
        const filenameInput = document.getElementById('saveProjectFilename');
        const locationDisplay = document.getElementById('saveProjectLocationDisplay');
        const saveBtn = document.getElementById('saveProjectDialogSave');
        const chooseLocationBtn = document.getElementById('saveProjectChooseLocation');
        
        if (filenameInput) {
            filenameInput.value = 'project';
        }
        if (locationDisplay) {
            locationDisplay.textContent = 'No location selected';
        }
        if (saveBtn) {
            saveBtn.disabled = true;
        }

        // Store file handle
        this.saveProjectFileHandle = null;

        // Show dialog
        dialog.style.display = 'flex';

        // Setup event listeners
        this.setupSaveProjectDialogListeners();
    }

    /**
     * Setup save project dialog event listeners
     */
    setupSaveProjectDialogListeners() {
        const dialog = document.getElementById('saveProjectDialog');
        const closeBtn = document.getElementById('saveProjectDialogClose');
        const cancelBtn = document.getElementById('saveProjectDialogCancel');
        const saveBtn = document.getElementById('saveProjectDialogSave');
        const chooseLocationBtn = document.getElementById('saveProjectChooseLocation');
        const filenameInput = document.getElementById('saveProjectFilename');
        const locationDisplay = document.getElementById('saveProjectLocationDisplay');

        // Close dialog
        const closeDialog = () => {
            dialog.style.display = 'none';
            this.saveProjectFileHandle = null;
        };

        if (closeBtn) {
            closeBtn.onclick = closeDialog;
        }
        if (cancelBtn) {
            cancelBtn.onclick = closeDialog;
        }

        // Choose location button
        if (chooseLocationBtn) {
            chooseLocationBtn.onclick = async () => {
                try {
                    const filenameInput = document.getElementById('saveProjectFilename');
                    const filename = filenameInput ? filenameInput.value.trim() || 'project' : 'project';
                    
                    const fileHandle = await window.showSaveFilePicker({
                        suggestedName: `${filename}.cdt`,
                        types: [{
                            description: 'CDT Files',
                            accept: {
                                'application/zip': ['.cdt'],
                                'application/x-zip-compressed': ['.cdt']
                            }
                        }]
                    });

                    this.saveProjectFileHandle = fileHandle;
                    
                    if (locationDisplay) {
                        // Get directory path if possible
                        const fileName = fileHandle.name;
                        locationDisplay.textContent = `File: ${fileName}`;
                    }
                    if (saveBtn) {
                        saveBtn.disabled = false;
                    }
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Error choosing save location:', error);
                        alert('Error choosing save location: ' + error.message);
                    }
                }
            };
        }

        // Update location when filename changes (reset location)
        if (filenameInput) {
            filenameInput.addEventListener('input', () => {
                if (this.saveProjectFileHandle) {
                    // Reset location when filename changes
                    this.saveProjectFileHandle = null;
                    if (locationDisplay) {
                        locationDisplay.textContent = 'No location selected (please choose again)';
                    }
                    if (saveBtn) {
                        saveBtn.disabled = true;
                    }
                }
            });
        }

        // Save button
        if (saveBtn) {
            saveBtn.onclick = async () => {
                if (!this.saveProjectFileHandle) {
                    alert('Please choose a save location first.');
                    return;
                }

                const filename = filenameInput ? filenameInput.value.trim() : 'project';
                if (!filename) {
                    alert('Please enter a project name.');
                    return;
                }

                // Close dialog and show loading
                dialog.style.display = 'none';
                this.showSaveProjectLoading('Preparing to save...');

                try {
                    await this.performSaveProject(filename, this.saveProjectFileHandle);
                    
                    // Hide loading
                    this.hideSaveProjectLoading();
                    this.saveProjectFileHandle = null;
                    
                    alert(`Project saved successfully: ${filename}.cdt`);
                } catch (error) {
                    console.error('Error saving project:', error);
                    this.hideSaveProjectLoading();
                    alert('Error saving project: ' + error.message);
                }
            };
        }
    }

    /**
     * Perform the actual save operation
     * @param {string} filename - Project filename (without extension)
     * @param {FileSystemFileHandle} fileHandle - File handle for saving
     */
    async performSaveProject(filename, fileHandle) {
        console.log('Saving scene...');
        this.updateSaveProjectLoadingStatus('Creating project archive...');
        
        // Create a new JSZip instance
        const zip = new JSZip();
        
        // Export STL and add to zip
        if (this.stlManager && this.stlManager.generateSTLContentForZip) {
            this.updateSaveProjectLoadingStatus('Generating STL geometry...');
            const stlContent = await this.stlManager.generateSTLContentForZip('y-up');
            if (stlContent) {
                zip.file('geometry.stl', stlContent);
                console.log('STL file added to zip: geometry.stl');
            }
        }
        
        // Save CSV files to zip
        if (this.surfaceTypesManager) {
            this.updateSaveProjectLoadingStatus('Generating CSV files...');
            await this.saveCSVFilesToZip(zip);
        }
        
        // Generate zip file
        this.updateSaveProjectLoadingStatus('Compressing files...');
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        
        // Save zip file with .cdt extension
        this.updateSaveProjectLoadingStatus('Writing to disk...');
        const writable = await fileHandle.createWritable();
        await writable.write(zipBlob);
        await writable.close();
        
        console.log(`Project saved successfully: ${filename}.cdt`);
    }

    /**
     * Show save project loading overlay
     * @param {string} status - Loading status message
     */
    showSaveProjectLoading(status = 'Saving project...') {
        const loadingOverlay = document.getElementById('saveProjectLoadingOverlay');
        const statusElement = document.getElementById('saveProjectLoadingStatus');
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
        
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Update save project loading status
     * @param {string} status - New status message
     */
    updateSaveProjectLoadingStatus(status) {
        const statusElement = document.getElementById('saveProjectLoadingStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Hide save project loading overlay
     */
    hideSaveProjectLoading() {
        const loadingOverlay = document.getElementById('saveProjectLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    /**
     * Show load project loading overlay
     * @param {string} status - Loading status message
     */
    showLoadProjectLoading(status = 'Loading project...') {
        const loadingOverlay = document.getElementById('loadProjectLoadingOverlay');
        const statusElement = document.getElementById('loadProjectLoadingStatus');
        
        if (loadingOverlay) {
            loadingOverlay.style.display = 'flex';
        }
        
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Update load project loading status
     * @param {string} status - New status message
     */
    updateLoadProjectLoadingStatus(status) {
        const statusElement = document.getElementById('loadProjectLoadingStatus');
        if (statusElement) {
            statusElement.textContent = status;
        }
    }

    /**
     * Hide load project loading overlay
     */
    hideLoadProjectLoading() {
        const loadingOverlay = document.getElementById('loadProjectLoadingOverlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }
    
    
    /**
     * Save CSV files to zip
     * @param {JSZip} zip - JSZip instance
     */
    async saveCSVFilesToZip(zip) {
        if (!this.surfaceTypesManager) {
            throw new Error('SurfaceTypesManager not available');
        }
        
        // CSV files to save based on Samples folder structure
        const csvFiles = [
            { category: 'roadTypes', filename: 'roadTypes.csv' },
            { category: 'soilTypes', filename: 'soilTypes.csv' },
            { category: 'waterTypes', filename: 'waterTypes.csv' }
        ];
        
        this.updateSaveProjectLoadingStatus('Saving surface types (road, soil, water)...');
        for (const file of csvFiles) {
            try {
                const csvContent = this.surfaceTypesManager.exportToCSV(file.category);
                if (csvContent) {
                    zip.file(file.filename, csvContent);
                    console.log(`CSV file added to zip: ${file.filename}`);
        } else {
                    console.warn(`No data to export for ${file.category}`);
                }
            } catch (error) {
                console.error(`Error adding ${file.filename} to zip:`, error);
            }
        }
        
        // Save building_archetype_envelope_property.csv
        this.updateSaveProjectLoadingStatus('Saving building archetype envelope properties...');
        try {
            const envelopePropertyContent = this.generateBuildingArchetypeEnvelopePropertyCSV();
            if (envelopePropertyContent) {
                zip.file('building_archetype_envelope_property.csv', envelopePropertyContent);
                console.log('CSV file added to zip: building_archetype_envelope_property.csv');
            }
        } catch (error) {
            console.error('Error adding building_archetype_envelope_property.csv to zip:', error);
        }
        
        // Save solidWaterSubcategories.csv
        this.updateSaveProjectLoadingStatus('Saving waterway objects...');
        try {
            const solidWaterContent = this.generateSolidWaterSubcategoriesCSV();
            if (solidWaterContent) {
                zip.file('solidWaterSubcategories.csv', solidWaterContent);
                console.log('CSV file added to zip: solidWaterSubcategories.csv');
            }
        } catch (error) {
            console.error('Error adding solidWaterSubcategories.csv to zip:', error);
        }
        
        // Save solidVegetationSoilSubcategories.csv
        this.updateSaveProjectLoadingStatus('Saving vegetation and ground objects...');
        try {
            const solidVegetationContent = this.generateSolidVegetationSoilSubcategoriesCSV();
            if (solidVegetationContent) {
                zip.file('solidVegetationSoilSubcategories.csv', solidVegetationContent);
                console.log('CSV file added to zip: solidVegetationSoilSubcategories.csv');
            }
        } catch (error) {
            console.error('Error adding solidVegetationSoilSubcategories.csv to zip:', error);
        }
        
        // Save solidRoadSubcategories.csv
        this.updateSaveProjectLoadingStatus('Saving road objects...');
        try {
            const solidRoadContent = this.generateSolidRoadSubcategoriesCSV();
            if (solidRoadContent) {
                zip.file('solidRoadSubcategories.csv', solidRoadContent);
                console.log('CSV file added to zip: solidRoadSubcategories.csv');
            }
        } catch (error) {
            console.error('Error adding solidRoadSubcategories.csv to zip:', error);
        }
        
        // Save vegetationTypes.csv
        this.updateSaveProjectLoadingStatus('Saving vegetation types...');
        try {
            const vegetationTypesContent = this.generateVegetationTypesCSV();
            if (vegetationTypesContent) {
                zip.file('vegetationTypes.csv', vegetationTypesContent);
                console.log('CSV file added to zip: vegetationTypes.csv');
            }
        } catch (error) {
            console.error('Error adding vegetationTypes.csv to zip:', error);
        }
        
        // Save solidBuildingSubcategories.csv
        this.updateSaveProjectLoadingStatus('Saving building objects...');
        try {
            const solidBuildingContent = this.generateSolidBuildingSubcategoriesCSV();
            if (solidBuildingContent) {
                zip.file('solidBuildingSubcategories.csv', solidBuildingContent);
                console.log('CSV file added to zip: solidBuildingSubcategories.csv');
            }
        } catch (error) {
            console.error('Error adding solidBuildingSubcategories.csv to zip:', error);
        }
    }
    
    /**
     * Save CSV files to directory (kept for backward compatibility)
     * @param {FileSystemDirectoryHandle} directoryHandle - Directory handle
     */
    async saveCSVFilesToDirectory(directoryHandle) {
        if (!this.surfaceTypesManager) {
            throw new Error('SurfaceTypesManager not available');
        }
        
        // CSV files to save based on Samples folder structure
        const csvFiles = [
            { category: 'roadTypes', filename: 'roadTypes.csv' },
            { category: 'soilTypes', filename: 'soilTypes.csv' },
            { category: 'waterTypes', filename: 'waterTypes.csv' }
        ];
        
        for (const file of csvFiles) {
            try {
                const csvContent = this.surfaceTypesManager.exportToCSV(file.category);
                if (csvContent) {
                    const fileHandle = await directoryHandle.getFileHandle(file.filename, { create: true });
                    const writable = await fileHandle.createWritable();
                    await writable.write(csvContent);
                    await writable.close();
                    console.log(`CSV file saved: ${file.filename}`);
                } else {
                    console.warn(`No data to export for ${file.category}`);
                }
            } catch (error) {
                console.error(`Error saving ${file.filename}:`, error);
            }
        }
        
        // Save building_archetype_envelope_property.csv
        try {
            const envelopePropertyContent = this.generateBuildingArchetypeEnvelopePropertyCSV();
            if (envelopePropertyContent) {
                const fileHandle = await directoryHandle.getFileHandle('building_archetype_envelope_property.csv', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(envelopePropertyContent);
                await writable.close();
                console.log('CSV file saved: building_archetype_envelope_property.csv');
            }
        } catch (error) {
            console.error('Error saving building_archetype_envelope_property.csv:', error);
        }
        
        // Save solidWaterSubcategories.csv
        try {
            const solidWaterContent = this.generateSolidWaterSubcategoriesCSV();
            if (solidWaterContent) {
                const fileHandle = await directoryHandle.getFileHandle('solidWaterSubcategories.csv', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(solidWaterContent);
                await writable.close();
                console.log('CSV file saved: solidWaterSubcategories.csv');
            }
        } catch (error) {
            console.error('Error saving solidWaterSubcategories.csv:', error);
        }
        
        // Save solidVegetationSoilSubcategories.csv
        try {
            const solidVegetationContent = this.generateSolidVegetationSoilSubcategoriesCSV();
            if (solidVegetationContent) {
                const fileHandle = await directoryHandle.getFileHandle('solidVegetationSoilSubcategories.csv', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(solidVegetationContent);
                await writable.close();
                console.log('CSV file saved: solidVegetationSoilSubcategories.csv');
            }
        } catch (error) {
            console.error('Error saving solidVegetationSoilSubcategories.csv:', error);
        }
        
        // Save solidRoadSubcategories.csv
        try {
            const solidRoadContent = this.generateSolidRoadSubcategoriesCSV();
            if (solidRoadContent) {
                const fileHandle = await directoryHandle.getFileHandle('solidRoadSubcategories.csv', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(solidRoadContent);
                await writable.close();
                console.log('CSV file saved: solidRoadSubcategories.csv');
            }
        } catch (error) {
            console.error('Error saving solidRoadSubcategories.csv:', error);
        }
        
        // Save vegetationTypes.csv
        try {
            const vegetationTypesContent = this.generateVegetationTypesCSV();
            if (vegetationTypesContent) {
                const fileHandle = await directoryHandle.getFileHandle('vegetationTypes.csv', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(vegetationTypesContent);
                await writable.close();
                console.log('CSV file saved: vegetationTypes.csv');
            }
        } catch (error) {
            console.error('Error saving vegetationTypes.csv:', error);
        }
        
        // Save solidBuildingSubcategories.csv
        try {
            const solidBuildingContent = this.generateSolidBuildingSubcategoriesCSV();
            if (solidBuildingContent) {
                const fileHandle = await directoryHandle.getFileHandle('solidBuildingSubcategories.csv', { create: true });
                const writable = await fileHandle.createWritable();
                await writable.write(solidBuildingContent);
                await writable.close();
                console.log('CSV file saved: solidBuildingSubcategories.csv');
            }
        } catch (error) {
            console.error('Error saving solidBuildingSubcategories.csv:', error);
        }
    }
    
    /**
     * Generate solidRoadSubcategories.csv content from highway objects in scene
     * @returns {string} CSV content
     */
    generateSolidRoadSubcategoriesCSV() {
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            return '';
        }
        
        const lines = [];
        
        // Header row
        lines.push('solidName,roadType');
        
        // Get all highway objects
        const highwayObjects = [];
        scene.meshes.forEach(mesh => {
            if (mesh.userData) {
                const isHighway = mesh.userData.type === 'highway' || 
                                  mesh.userData.shapeType === 'highway' ||
                                  (mesh.name && mesh.name.toLowerCase().startsWith('highway'));
                if (isHighway) {
                    highwayObjects.push(mesh);
                }
            }
        });
        
        // Sort by name to ensure consistent order
        highwayObjects.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });
        
        // Add rows for each highway object
        highwayObjects.forEach(mesh => {
            const name = mesh.name || '';
            // Get roadType from userData, or use default if not set
            let roadType = mesh.userData?.highwayRoadType || '';
            
            // If still empty, use default value
            if (!roadType) {
                roadType = 'default';
            }
            
            lines.push(`${name},${roadType}`);
        });
        
        return lines.join('\n');
    }
    
    /**
     * Generate vegetationTypes.csv content from Ground Types, Grass Types, and Tree Types
     * @returns {string} CSV content
     */
    generateVegetationTypesCSV() {
        if (!this.surfaceTypesManager) {
            return '';
        }
        
        const lines = [];
        
        // Get data from SurfaceTypesManager
        const groundTypes = this.surfaceTypesManager.getSurfaceTypes('groundTypes') || [];
        const grassTypes = this.surfaceTypesManager.getSurfaceTypes('grassTypes') || [];
        const treeTypes = this.surfaceTypesManager.getSurfaceTypes('treeTypes') || [];
        
        // Combine all types with their source information
        const allVegetationTypes = [];
        
        // Add ground types with solidType = 'ground'
        groundTypes.forEach(type => {
            allVegetationTypes.push({
                ...type,
                _source: 'ground'
            });
        });
        
        // Add grass types with solidType = 'grass'
        grassTypes.forEach(type => {
            allVegetationTypes.push({
                ...type,
                _source: 'grass'
            });
        });
        
        // Add tree types with solidType = 'tree'
        treeTypes.forEach(type => {
            allVegetationTypes.push({
                ...type,
                _source: 'tree'
            });
        });
        
        if (allVegetationTypes.length === 0) {
            return '';
        }
        
        // Define the expected header order based on sample file
        const expectedHeaders = [
            'vegetationType',
            'solidType',
            'root_fraction_layer_1',
            'root_fraction_layer_2',
            'root_fraction_layer_3',
            'root_fraction_layer_4',
            'minCanopyRes',
            'leafAreaIndex',
            'tallVegCorrFac',
            'momentumRoughLength',
            'heatRoughLength',
            'thermalCondStable',
            'thermalCondUnstable',
            'albedo',
            'emissivity',
            'density',
            'heatCapacity'
        ];
        
        // Use expected headers
        const headers = expectedHeaders;
        lines.push(headers.join(','));
        
        // Add data rows
        allVegetationTypes.forEach(type => {
            const row = headers.map(header => {
                // Special handling for solidType column
                if (header === 'solidType') {
                    return type._source || '';
                }
                
                // Get value from type object
                let value = type[header];
                
                // If value is undefined/null, try alternative key names
                if (value === undefined || value === null) {
                    // Try with different casing
                    const lowerHeader = header.toLowerCase();
                    
                    // Try to find value in type object
                    for (const key in type) {
                        if (key.toLowerCase() === lowerHeader || key === header) {
                            value = type[key];
                            break;
                        }
                    }
                }
                
                // Handle numbers in scientific notation (e.g., 3.00E-04)
                if (typeof value === 'number') {
                    // For very small numbers, use scientific notation
                    if (Math.abs(value) < 0.001 && value !== 0) {
                        return value.toExponential(2);
                    }
                    return value.toString();
                }
                
                // Return empty string if still undefined/null
                return value !== undefined && value !== null ? value.toString() : '';
            });
            lines.push(row.join(','));
        });
        
        return lines.join('\n');
    }
    
    /**
     * Generate solidBuildingSubcategories.csv content from building objects in scene
     * @returns {string} CSV content
     */
    generateSolidBuildingSubcategoriesCSV() {
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            return '';
        }
        
        // Ensure building archetypes and groups are loaded
        if (!this.buildingArchetypes || this.buildingArchetypes.length === 0) {
            this.loadBuildingArchetypesData();
        }
        if (!this.buildingGroups || this.buildingGroups.length === 0) {
            this.loadBuildingGroupsData();
        }
        
        const lines = [];
        
        // Header row
        lines.push('buildingName,constructionYear,envelopePropertyType,usageType_groupName');
        
        // Get all building objects (both meshes and TransformNodes)
        const buildingObjects = [];
        
        // Check meshes
        scene.meshes.forEach(mesh => {
            // Skip wireframe, edge, helper, and gizmo meshes (these are UI elements, not actual buildings)
            if (mesh.name && (
                mesh.name.includes('_wireframe') || 
                mesh.name.includes('_edge') ||
                mesh.name.includes('_helper') ||
                mesh.name.includes('_gizmo') ||
                mesh.name.includes('wireframe') ||
                mesh.name.includes('edge') ||
                mesh.name.endsWith('_wireframe') ||
                mesh.name.endsWith('_edge')
            )) {
                return; // Skip this mesh
            }
            
            // Check by userData first
            if (mesh.userData) {
                const isBuilding = mesh.userData.type === 'building' || 
                                   mesh.userData.shapeType === 'building';
                if (isBuilding) {
                    buildingObjects.push(mesh);
                }
            }
            // Also check by name (buildings usually have names starting with "building")
            else if (mesh.name && mesh.name.toLowerCase().startsWith('building')) {
                buildingObjects.push(mesh);
            }
        });
        
        // Check TransformNodes (buildings can be TransformNodes)
        if (scene.transformNodes) {
            scene.transformNodes.forEach(transformNode => {
                // Check by userData first
                if (transformNode.userData) {
                    const isBuilding = transformNode.userData.type === 'building' || 
                                       transformNode.userData.shapeType === 'building';
                    if (isBuilding) {
                        buildingObjects.push(transformNode);
                    }
                }
                // Also check by name
                else if (transformNode.name && transformNode.name.toLowerCase().startsWith('building')) {
                    buildingObjects.push(transformNode);
                }
            });
        }
        
        // Sort by name to ensure consistent order
        buildingObjects.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });
        
        // Add rows for each building object
        buildingObjects.forEach(buildingObj => {
            const name = buildingObj.name || '';
            
            // Get userData - ALWAYS start with buildingObj.userData (this is the source of truth)
            // Deep copy to avoid reference issues
            let userData = {};
            if (buildingObj.userData && Object.keys(buildingObj.userData).length > 0) {
                // Deep copy userData to avoid reference sharing issues
                userData = JSON.parse(JSON.stringify(buildingObj.userData));
            }
            
            // If buildingObj is a Mesh, use its userData directly (this is the primary source)
            if (buildingObj instanceof BABYLON.Mesh) {
                if (buildingObj.userData && Object.keys(buildingObj.userData).length > 0) {
                    // Deep copy to avoid reference issues
                    userData = JSON.parse(JSON.stringify(buildingObj.userData));
                }
            }
            
            // Only if buildingObj is a TransformNode AND has no userData, check child meshes
            // But only check child meshes that belong to THIS building (by name matching)
            if (buildingObj instanceof BABYLON.TransformNode && 
                (!userData || Object.keys(userData).length === 0) && 
                buildingObj.getChildMeshes) {
                const childMeshes = buildingObj.getChildMeshes();
                if (childMeshes && childMeshes.length > 0) {
                    // Only check child meshes that match this building's name pattern
                    for (const childMesh of childMeshes) {
                        // Make sure child mesh belongs to this building (name should match or be related)
                        const childName = childMesh.name || '';
                        const buildingName = name.toLowerCase();
                        if (childName.toLowerCase().includes(buildingName) || 
                            buildingName.includes(childName.toLowerCase().replace('_edge', '').replace('_wireframe', ''))) {
                            if (childMesh.userData && Object.keys(childMesh.userData).length > 0) {
                                // Deep copy to avoid reference issues
                                const childUserData = JSON.parse(JSON.stringify(childMesh.userData));
                                // Merge child mesh userData (child data takes precedence)
                                userData = { ...userData, ...childUserData };
                            }
                        }
                    }
                }
            }
            
            // Final fallback: if still no userData, use empty object
            if (!userData || Object.keys(userData).length === 0) {
                userData = {};
            }
            
            // Get Year of Construction from userData
            const yearOfConstruction = userData.yearOfConstruction || '';
            
            // Get envelope properties type (try different possible keys)
            let envelopeType = userData.buildingEnvelopeProperties || 
                              userData.buildingEnvelopePropertyType || 
                              '';
            
            // If no envelope properties set, use default: 'archytypes'
            // This ensures all buildings have envelope properties data
            if (!envelopeType || envelopeType === '') {
                envelopeType = 'archytypes'; // Default value
            }
            
            let usageTypeGroupName = '';
            let envelopePropertyType = '';
            
            if (envelopeType === 'archetype' || envelopeType === 'archytypes') {
                envelopePropertyType = 'archetype';
                // Get archetype index (try different possible keys)
                let archetypeIndex = userData.buildingArchytype || 
                                    userData.buildingArchetype ||
                                    userData.buildingArchytypeIndex;
                
                // If no archetype index set, use default: first archetype (index 0)
                if (archetypeIndex === undefined || archetypeIndex === null || archetypeIndex === '') {
                    archetypeIndex = 0; // Default to first archetype
                }
                
                // Ensure buildingArchetypes is loaded
                if (!this.buildingArchetypes || this.buildingArchetypes.length === 0) {
                    this.loadBuildingArchetypesData();
                }
                
                if (this.buildingArchetypes && this.buildingArchetypes.length > 0) {
                    const archetype = this.buildingArchetypes[parseInt(archetypeIndex)];
                    if (archetype) {
                        usageTypeGroupName = archetype.usage_group_building_name || '';
                    } else if (this.buildingArchetypes.length > 0) {
                        // Fallback to first archetype if index is out of range
                        usageTypeGroupName = this.buildingArchetypes[0].usage_group_building_name || '';
                    }
                }
            } else if (envelopeType === 'group' || envelopeType === 'groups') {
                envelopePropertyType = 'buildings_group';
                // Get group index (try different possible keys)
                let groupIndex = userData.buildingGroup || 
                               userData.buildingGroupIndex;
                
                // If no group index set, use default: first group (index 0)
                if (groupIndex === undefined || groupIndex === null || groupIndex === '') {
                    groupIndex = 0; // Default to first group
                }
                
                // Ensure buildingGroups is loaded
                if (!this.buildingGroups || this.buildingGroups.length === 0) {
                    this.loadBuildingGroupsData();
                }
                
                if (this.buildingGroups && this.buildingGroups.length > 0) {
                    const group = this.buildingGroups[parseInt(groupIndex)];
                    if (group) {
                        usageTypeGroupName = group.group_name || group.usage_group_building_name || '';
                    } else if (this.buildingGroups.length > 0) {
                        // Fallback to first group if index is out of range
                        usageTypeGroupName = this.buildingGroups[0].group_name || this.buildingGroups[0].usage_group_building_name || '';
                    }
                }
            } else if (envelopeType === 'customSpec' || envelopeType === 'customSpec') {
                envelopePropertyType = 'specific_building';
                // usageTypeGroupName should be empty (just a comma)
                usageTypeGroupName = '';
            } else {
                // No envelope properties set (should not happen due to default above, but just in case)
                envelopePropertyType = '';
                usageTypeGroupName = '';
            }
            
            // Format the row: name, yearOfConstruction (empty if not set), envelopePropertyType, usageTypeGroupName
            // If yearOfConstruction is empty, just put a comma
            const constructionYear = yearOfConstruction !== '' ? yearOfConstruction : '';
            lines.push(`${name},${constructionYear},${envelopePropertyType},${usageTypeGroupName}`);
        });
        
        return lines.join('\n');
    }
    
    /**
     * Generate building_archetype_envelope_property.csv content
     * @returns {string} CSV content
     */
    generateBuildingArchetypeEnvelopePropertyCSV() {
        const lines = [];
        
        // Part 1: Building Archetypes
        if (this.buildingArchetypes && this.buildingArchetypes.length > 0) {
            this.buildingArchetypes.forEach((archetype, archetypeIndex) => {
                // Row 1: envelope_property_type
                const row1 = ['envelope_property_type', 'archetype'];
                lines.push(this.formatCSVRow(row1));
                
                // Row 2: usage_group_building_name
                const row2 = ['usage_group_building_name', archetype.usage_group_building_name || ''];
                lines.push(this.formatCSVRow(row2));
                
                // Row 3: number_of_wall_layers
                const row3 = ['number_of_wall_layers', archetype.number_of_wall_layers || 1];
                lines.push(this.formatCSVRow(row3));
                
                // Row 4: number_of_roof_layers
                const row4 = ['number_of_roof_layers', archetype.number_of_roof_layers || 1];
                lines.push(this.formatCSVRow(row4));
                
                // Row 5: number_of_floor_layers
                const row5 = ['number_of_floor_layers', archetype.number_of_floor_layers || 1];
                lines.push(this.formatCSVRow(row5));
                
                // Row 6: Header row
                const wallLayers = archetype.number_of_wall_layers || 1;
                const roofLayers = archetype.number_of_roof_layers || 1;
                const floorLayers = archetype.number_of_floor_layers || 1;
                const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
                lines.push(this.formatCSVRow(headers));
                
                // Rows 7+: Period data rows
                archetype.periods.forEach(period => {
                    const periodRow = headers.map(header => {
                        const value = period[header];
                        return value !== null && value !== undefined ? value.toString() : '';
                    });
                    lines.push(this.formatCSVRow(periodRow));
                });
                
                // Add empty row between archetypes (except for the last one)
                if (archetypeIndex < this.buildingArchetypes.length - 1) {
                    lines.push(this.formatCSVRow(['']));
                }
            });
        }
        
        // Add empty row between parts
        if (this.buildingArchetypes && this.buildingArchetypes.length > 0) {
            lines.push(this.formatCSVRow(['']));
        }
        
        // Part 2: Building Groups
        if (this.buildingGroups && this.buildingGroups.length > 0) {
            this.buildingGroups.forEach((group, groupIndex) => {
                // Row 1: envelope_property_type
                const row1 = ['envelope_property_type', 'buildings_group'];
                lines.push(this.formatCSVRow(row1));
                
                // Row 2: usage_group_building_name
                const row2 = ['usage_group_building_name', group.group_name || ''];
                lines.push(this.formatCSVRow(row2));
                
                // Row 3: number_of_wall_layers
                const row3 = ['number_of_wall_layers', group.number_of_wall_layers || 1];
                lines.push(this.formatCSVRow(row3));
                
                // Row 4: number_of_roof_layers
                const row4 = ['number_of_roof_layers', group.number_of_roof_layers || 1];
                lines.push(this.formatCSVRow(row4));
                
                // Row 5: number_of_floor_layers
                const row5 = ['number_of_floor_layers', group.number_of_floor_layers || 1];
                lines.push(this.formatCSVRow(row5));
                
                // Row 6: Header row
                const wallLayers = group.number_of_wall_layers || 1;
                const roofLayers = group.number_of_roof_layers || 1;
                const floorLayers = group.number_of_floor_layers || 1;
                const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
                lines.push(this.formatCSVRow(headers));
                
                // Rows 7+: Period data rows
                group.periods.forEach(period => {
                    const periodRow = headers.map(header => {
                        const value = period[header];
                        return value !== null && value !== undefined ? value.toString() : '';
                    });
                    lines.push(this.formatCSVRow(periodRow));
                });
                
                // Add empty row between groups (except for the last one)
                if (groupIndex < this.buildingGroups.length - 1) {
                    lines.push(this.formatCSVRow(['']));
                }
            });
        }
        
        // Add empty row between parts
        if (this.buildingGroups && this.buildingGroups.length > 0) {
            lines.push(this.formatCSVRow(['']));
        }
        
        // Part 3: Specific Buildings (Custom Spec)
        const specificBuildings = this.getCustomSpecBuildings();
        if (specificBuildings.length > 0) {
            specificBuildings.forEach((building, buildingIndex) => {
                const customSpec = building.userData.buildingCustomSpec || {};
                
                // Row 1: envelope_property_type
                const row1 = ['envelope_property_type', 'specific_building'];
                lines.push(this.formatCSVRow(row1));
                
                // Row 2: usage_group_building_name (building name)
                const buildingName = building.name || building.userData.name || `building${buildingIndex + 1}`;
                const row2 = ['usage_group_building_name', buildingName];
                lines.push(this.formatCSVRow(row2));
                
                // Row 3: number_of_wall_layers
                const row3 = ['number_of_wall_layers', customSpec.number_of_wall_layers || 1];
                lines.push(this.formatCSVRow(row3));
                
                // Row 4: number_of_roof_layers
                const row4 = ['number_of_roof_layers', customSpec.number_of_roof_layers || 1];
                lines.push(this.formatCSVRow(row4));
                
                // Row 5: number_of_floor_layers
                const row5 = ['number_of_floor_layers', customSpec.number_of_floor_layers || 1];
                lines.push(this.formatCSVRow(row5));
                
                // Row 6: Header row
                const wallLayers = customSpec.number_of_wall_layers || 1;
                const roofLayers = customSpec.number_of_roof_layers || 1;
                const floorLayers = customSpec.number_of_floor_layers || 1;
                const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
                lines.push(this.formatCSVRow(headers));
                
                // Row 7: Period data row (single row for custom spec)
                const periodRow = headers.map(header => {
                    // Map custom spec keys to headers
                    let value = customSpec[header];
                    
                    // If not found, try to find in custom spec with different key format
                    if (value === null || value === undefined || value === '') {
                        // Handle layer-specific properties (e.g., ThermalConductivity_wall1[Wm-1K-1])
                        const layerMatch = header.match(/^(.+)_(wall|roof|floor)(\d+)\[/);
                        if (layerMatch) {
                            const prop = layerMatch[1];
                            const layerType = layerMatch[2];
                            const layerNum = layerMatch[3];
                            const unit = header.split('[')[1]; // Get unit part
                            
                            // Try different key formats
                            // Format 1: ThermalConductivity_wall1[Wm-1K-1] (as stored in userData)
                            const key1 = `${prop}_${layerType}${layerNum}[${unit}`;
                            // Format 2: buildingCustomThermalConductivityWall1 (alternative format)
                            const propName = prop.charAt(0).toUpperCase() + prop.slice(1);
                            const layerTypeName = layerType.charAt(0).toUpperCase() + layerType.slice(1);
                            const key2 = `buildingCustom${propName}${layerTypeName}${layerNum}`;
                            
                            value = customSpec[key1] || customSpec[key2];
                        }
                    }
                    
                    // Special handling for startPeriod and endPeriod
                    if (header === 'startPeriod') {
                        value = customSpec.startPeriod || customSpec.buildingCustomStartPeriod || 'NA';
                    } else if (header === 'endPeriod') {
                        value = customSpec.endPeriod || customSpec.buildingCustomEndPeriod || 'NA';
                    } else if (header === 'Uvalue_window(W/m2/K)') {
                        value = value || customSpec.buildingCustomUvalueWindow || '';
                    } else if (header === 'windowSHGC(-)') {
                        value = value || customSpec.buildingCustomWindowSHGC || '';
                    } else if (header === 'windowEmissivity(-)') {
                        value = value || customSpec.buildingCustomWindowEmissivity || '';
                    } else if (header === 'wallAlbedo(-)') {
                        value = value || customSpec.buildingCustomWallAlbedo || '';
                    } else if (header === 'roofAlbedo(-)') {
                        value = value || customSpec.buildingCustomRoofAlbedo || '';
                    } else if (header === 'floorAlbedo(-)') {
                        value = value || customSpec.buildingCustomFloorAlbedo || '';
                    } else if (header === 'wallEmissivity(-)') {
                        value = value || customSpec.buildingCustomWallEmissivity || '';
                    } else if (header === 'roofEmissivity(-)') {
                        value = value || customSpec.buildingCustomRoofEmissivity || '';
                    } else if (header === 'floorEmissivity(-)') {
                        value = value || customSpec.buildingCustomFloorEmissivity || '';
                    }
                    
                    return value !== null && value !== undefined ? value.toString() : '';
                });
                lines.push(this.formatCSVRow(periodRow));
                
                // Add empty row between buildings (except for the last one)
                if (buildingIndex < specificBuildings.length - 1) {
                    lines.push(this.formatCSVRow(['']));
                }
            });
        }
        
        return lines.join('\n');
    }
    
    /**
     * Format CSV row (handle empty values and add commas)
     * @param {Array} values - Array of values
     * @returns {string} Formatted CSV row
     */
    formatCSVRow(values) {
        // Ensure we have at least 25 columns (based on sample file structure)
        const minColumns = 25;
        const formattedValues = [];
        
        values.forEach((value, index) => {
            formattedValues.push(value || '');
        });
        
        // Fill remaining columns with empty values
        while (formattedValues.length < minColumns) {
            formattedValues.push('');
        }
        
        return formattedValues.join(',');
    }
    
    /**
     * Get all buildings with custom spec envelope properties
     * @returns {Array} Array of building meshes
     */
    getCustomSpecBuildings() {
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            return [];
        }
        
        const customSpecBuildings = [];
        
        // Get all meshes with building type (check both type and shapeType)
        scene.meshes.forEach(mesh => {
            if (mesh.userData) {
                const isBuilding = mesh.userData.type === 'building' || mesh.userData.shapeType === 'building';
                if (isBuilding) {
                    const envelopeProperties = mesh.userData.buildingEnvelopeProperties;
                    if (envelopeProperties === 'customSpec') {
                        customSpecBuildings.push(mesh);
                    }
                }
            }
        });
        
        return customSpecBuildings;
    }
    
    /**
     * Generate solidWaterSubcategories.csv content from waterway objects in scene
     * @returns {string} CSV content
     */
    generateSolidWaterSubcategoriesCSV() {
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            return '';
        }
        
        const lines = [];
        
        // Header row
        lines.push('solidName,waterType');
        
        // Get all waterway objects
        const waterwayObjects = [];
        scene.meshes.forEach(mesh => {
            if (mesh.userData) {
                const isWaterway = mesh.userData.type === 'waterway' || 
                                  mesh.userData.shapeType === 'waterway' ||
                                  (mesh.name && mesh.name.toLowerCase().startsWith('waterway'));
                if (isWaterway) {
                    waterwayObjects.push(mesh);
                }
            }
        });
        
        // Sort by name to ensure consistent order
        waterwayObjects.sort((a, b) => {
            const nameA = a.name || '';
            const nameB = b.name || '';
            return nameA.localeCompare(nameB);
        });
        
        // Add rows for each waterway object
        waterwayObjects.forEach(mesh => {
            const name = mesh.name || '';
            const waterType = mesh.userData?.waterwayWaterType || 'default';
            lines.push(`${name},${waterType}`);
        });
        
        return lines.join('\n');
    }
    
    /**
     * Generate solidVegetationSoilSubcategories.csv content from tree, grass, and ground objects in scene
     * @returns {string} CSV content
     */
    generateSolidVegetationSoilSubcategoriesCSV() {
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            return '';
        }
        
        const lines = [];
        
        // Header row
        lines.push('solidName,vegetationType,soilType');
        
        // Get all tree, grass, and ground objects
        const vegetationObjects = [];
        const treeIndexMap = new Map(); // Track tree indices to ensure consistent naming
        
        // 1. Get trees from TreeManager
        if (this.treeManager && this.treeManager.trees) {
            this.treeManager.trees.forEach((tree, index) => {
                if (tree.parent) {
                    const treeName = `tree${index + 1}`;
                    treeIndexMap.set(tree.parent, treeName);
                    
                    // Initialize userData if it doesn't exist
                    if (!tree.parent.userData) {
                        tree.parent.userData = {};
                    }
                    
                    // Try to get userData from parent first
                    let userData = tree.parent.userData || {};
                    
                    // If parent doesn't have the data, try child meshes
                    if ((!userData.treeVegetationType && !userData.treeSoilType) && tree.meshes && tree.meshes.length > 0) {
                        // Try to get userData from child meshes
                        for (const mesh of tree.meshes) {
                            if (mesh && mesh.userData) {
                                // Merge userData from child meshes
                                userData = { ...userData, ...mesh.userData };
                                // If we found the data, break
                                if (userData.treeVegetationType || userData.treeSoilType) {
                                    break;
                                }
                            }
                        }
                    }
                    
                    vegetationObjects.push({
                        name: treeName,
                        type: 'tree',
                        mesh: tree.parent,
                        treeObject: tree, // Store tree object for later access
                        userData: userData
                    });
                }
            });
        }
        
        // 2. Get grass and ground meshes from scene, and also check for STL imported trees
        scene.meshes.forEach(mesh => {
            if (mesh.userData) {
                const type = mesh.userData.type || mesh.userData.shapeType;
                
                if (type === 'tree') {
                    // Check if this tree is already added from TreeManager
                    if (!treeIndexMap.has(mesh)) {
                        // This is likely an STL imported tree or a tree not tracked by TreeManager
                        const treeName = mesh.name || `tree${vegetationObjects.filter(o => o.type === 'tree').length + 1}`;
                        vegetationObjects.push({
                            name: treeName,
                            type: 'tree',
                            mesh: mesh,
                            userData: mesh.userData
                        });
                    }
                } else if (type === 'grass' || type === 'ground') {
                    vegetationObjects.push({
                        name: mesh.name || '',
                        type: type,
                        mesh: mesh,
                        userData: mesh.userData
                    });
                }
            }
        });
        
        // Sort by type first (tree, grass, ground), then by name
        vegetationObjects.sort((a, b) => {
            const typeOrder = { 'tree': 0, 'grass': 1, 'ground': 2 };
            const orderA = typeOrder[a.type] !== undefined ? typeOrder[a.type] : 999;
            const orderB = typeOrder[b.type] !== undefined ? typeOrder[b.type] : 999;
            
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            
            return (a.name || '').localeCompare(b.name || '');
        });
        
        // Add rows for each vegetation object
        vegetationObjects.forEach(obj => {
            const name = obj.name || '';
            let typeValue = ''; // This will be tree type, vegetation type, or ground type
            let soilType = '';
            
            if (obj.type === 'tree') {
                // For trees: use treeVegetationType as "tree type"
                // Try to get from userData, or from tree object's child meshes
                typeValue = obj.userData.treeVegetationType || '';
                soilType = obj.userData.treeSoilType || obj.userData.soilType || '';
                
                // If still empty, try to get from tree object's child meshes
                if ((!typeValue || !soilType) && obj.treeObject && obj.treeObject.meshes) {
                    for (const mesh of obj.treeObject.meshes) {
                        if (mesh && mesh.userData) {
                            if (!typeValue && mesh.userData.treeVegetationType) {
                                typeValue = mesh.userData.treeVegetationType;
                            }
                            if (!soilType) {
                                soilType = mesh.userData.treeSoilType || mesh.userData.soilType || '';
                            }
                            // If we found both, break
                            if (typeValue && soilType) {
                                break;
                            }
                        }
                    }
                }
                
                // If still empty, use default values based on tree properties
                if (!typeValue) {
                    // Try to get tree type from name and convert to vegetation type
                    const treeName = obj.mesh ? obj.mesh.name : name;
                    const treeType = this.getTreeTypeFromName(treeName);
                    // Default to tree_default if we can't determine
                    typeValue = 'tree_default';
                }
                if (!soilType) {
                    soilType = 'default';
                }
            } else if (obj.type === 'grass') {
                // For grass: use grassVegetationType as "vegetation type"
                typeValue = obj.userData.grassVegetationType || '';
                // Try different possible keys for soil type
                soilType = obj.userData.grassSoilType || 
                          obj.userData.soilType || 
                          '';
                
                // If still empty, use default values
                if (!typeValue) {
                    typeValue = 'grass_default';
                }
                if (!soilType) {
                    soilType = 'default';
                }
            } else if (obj.type === 'ground') {
                // For ground: use groundVegetationType as "ground type"
                typeValue = obj.userData.groundVegetationType || '';
                // Try different possible keys for soil type
                soilType = obj.userData.groundSoilType || 
                          obj.userData.soilType || 
                          '';
                
                // If still empty, use default values
                if (!typeValue) {
                    typeValue = 'ground_default';
                }
                if (!soilType) {
                    soilType = 'default';
                }
            }
            
            lines.push(`${name},${typeValue},${soilType}`);
        });
        
        return lines.join('\n');
    }

    /**
     * Load scene
     * Placeholder for future implementation
     */
    /**
     * Load project from .cdt file
     */
    async loadProject() {
        try {
            // Check if JSZip is available
            if (typeof JSZip === 'undefined') {
                alert('JSZip library is not loaded. Please refresh the page.');
                return;
            }

            // Check if File System Access API is supported
            if (!('showOpenFilePicker' in window)) {
                alert('File System Access API is not supported in this browser. Please use a modern browser like Chrome or Edge.');
                return;
            }

            // Show file picker first (before showing loading overlay, as file picker is blocking)
            const [fileHandle] = await window.showOpenFilePicker({
                types: [{
                    description: 'Eco Digital Twin Project',
                    accept: {
                        'application/zip': ['.cdt']
                    }
                }],
                multiple: false
            });

            // Get file
            const file = await fileHandle.getFile();
            
            // Show loading overlay after file is selected
            this.showLoadProjectLoading('Loading project file...');

            // Read file as array buffer
            this.updateLoadProjectLoadingStatus('Reading project file...');
            const arrayBuffer = await file.arrayBuffer();

            // Load zip from array buffer
            this.updateLoadProjectLoadingStatus('Extracting project archive...');
            const zip = await JSZip.loadAsync(arrayBuffer);

            // Clear current scene completely first
            this.updateLoadProjectLoadingStatus('Clearing current scene...');
            if (this.sceneOperationsManager) {
                // Select all objects first to ensure everything is included
                if (this.selectionManager && this.selectionManager.selectAll) {
                    this.selectionManager.selectAll();
                }
                // Then clear the scene completely
                this.sceneOperationsManager.createEmptyScene();
            } else {
                // Fallback: use createEmptyScene from UIManager
                this.createEmptyScene();
            }

            // Load CSV files into SurfaceTypesManager
            this.updateLoadProjectLoadingStatus('Loading surface types...');
            await this.loadCSVFilesFromZip(zip);

            // Import STL file
            this.updateLoadProjectLoadingStatus('Importing geometry...');
            await this.loadSTLFromZip(zip);

            // Apply CSV data to object properties
            this.updateLoadProjectLoadingStatus('Applying properties to objects...');
            await this.applyCSVDataToObjects(zip);

            // Reload building archetypes data to populate dropdowns
            this.loadBuildingArchetypesData();

            // Hide loading overlay
            this.hideLoadProjectLoading();

            console.log('Project loaded successfully');
        } catch (error) {
            console.error('Error loading project:', error);
            this.hideLoadProjectLoading();
            
            if (error.name === 'AbortError') {
                // User cancelled file picker
                return;
            }
            
            alert(`Error loading project: ${error.message}`);
        }
    }

    /**
     * Load CSV files from zip into SurfaceTypesManager
     * @param {JSZip} zip - JSZip instance
     */
    async loadCSVFilesFromZip(zip) {
        if (!this.surfaceTypesManager) {
            throw new Error('SurfaceTypesManager not available');
        }

        // CSV files to load
        const csvFiles = [
            { category: 'roadTypes', filename: 'roadTypes.csv' },
            { category: 'soilTypes', filename: 'soilTypes.csv' },
            { category: 'waterTypes', filename: 'waterTypes.csv' }
        ];

        // Load basic surface types
        for (const file of csvFiles) {
            try {
                const zipFile = zip.file(file.filename);
                if (zipFile) {
                    const csvContent = await zipFile.async('string');
                    this.surfaceTypesManager.importFromCSV(file.category, csvContent);
                    console.log(`Loaded ${file.filename} into ${file.category}`);
                } else {
                    console.warn(`File ${file.filename} not found in zip`);
                }
            } catch (error) {
                console.error(`Error loading ${file.filename}:`, error);
            }
        }

        // Load vegetationTypes.csv and split into groundTypes, grassTypes, treeTypes
        try {
            const vegetationTypesFile = zip.file('vegetationTypes.csv');
            if (vegetationTypesFile) {
                const csvContent = await vegetationTypesFile.async('string');
                this.surfaceTypesManager.importFromCSV('vegetationTypes', csvContent);
                // Split vegetation types into ground, grass, tree types
                this.surfaceTypesManager.splitVegetationTypes();
                console.log('Loaded vegetationTypes.csv and split into ground, grass, tree types');
            }
        } catch (error) {
            console.error('Error loading vegetationTypes.csv:', error);
        }

        // Load building_archetype_envelope_property.csv
        try {
            const buildingArchetypeFile = zip.file('building_archetype_envelope_property.csv');
            if (buildingArchetypeFile) {
                const csvContent = await buildingArchetypeFile.async('string');
                // Parse and load building archetypes and groups
                this.parseAndLoadBuildingArchetypesFromCSV(csvContent);
                console.log('Loaded building_archetype_envelope_property.csv');
            }
        } catch (error) {
            console.error('Error loading building_archetype_envelope_property.csv:', error);
        }
    }

    /**
     * Parse and load building archetypes from CSV content
     * @param {string} csvContent - CSV file content
     */
    parseAndLoadBuildingArchetypesFromCSV(csvContent) {
        if (!this.surfaceTypesManager) {
            return;
        }

        const lines = csvContent.trim().split('\n');
        const archetypes = [];
        const groups = [];
        let currentArchetype = null;
        let currentGroup = null;
        let inArchetypeSection = false;
        let inGroupSection = false;
        let inCustomSpecSection = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) {
                // Empty line - end of section
                if (inArchetypeSection && currentArchetype) {
                    archetypes.push(currentArchetype);
                    currentArchetype = null;
                    inArchetypeSection = false;
                } else if (inGroupSection && currentGroup) {
                    groups.push(currentGroup);
                    currentGroup = null;
                    inGroupSection = false;
                }
                continue;
            }

            const values = this.surfaceTypesManager.parseCSVLine(line);
            if (values.length === 0) continue;

            // Check for section markers
            // Archetype section starts with: envelope_property_type,archetype
            if (values[0] === 'envelope_property_type' && values.length > 1 && values[1] === 'archetype') {
                // If we were already in an archetype section, save the previous one
                if (inArchetypeSection && currentArchetype) {
                    archetypes.push(currentArchetype);
                }
                // Start new archetype section
                inArchetypeSection = true;
                inGroupSection = false;
                inCustomSpecSection = false;
                currentArchetype = { periods: [] };
                continue;
            } 
            // Group section starts with: envelope_property_type,buildings_group
            else if (values[0] === 'envelope_property_type' && values.length > 1 && (values[1] === 'buildings_group' || values[1] === 'group')) {
                inGroupSection = true;
                inArchetypeSection = false;
                inCustomSpecSection = false;
                if (currentGroup) {
                    groups.push(currentGroup);
                }
                currentGroup = { periods: [] };
                continue;
            } 
            // Custom Spec section starts with: envelope_property_type,specific_building
            else if (values[0] === 'envelope_property_type' && values.length > 1 && values[1] === 'specific_building') {
                inCustomSpecSection = true;
                inArchetypeSection = false;
                inGroupSection = false;
                continue;
            }
            // Also check for buildingName,constructionYear header (alternative custom spec marker)
            else if (values[0] === 'buildingName' && values.length > 1 && values[1] === 'constructionYear') {
                inCustomSpecSection = true;
                inArchetypeSection = false;
                inGroupSection = false;
                continue;
            }

            // Parse archetype/group configuration
            if (inArchetypeSection && currentArchetype) {
                if (values[0] === 'usage_group_building_name') {
                    currentArchetype.usage_group_building_name = values[1] || '';
                } else if (values[0] === 'number_of_wall_layers') {
                    currentArchetype.number_of_wall_layers = parseInt(values[1]) || 1;
                } else if (values[0] === 'number_of_roof_layers') {
                    currentArchetype.number_of_roof_layers = parseInt(values[1]) || 1;
                } else if (values[0] === 'number_of_floor_layers') {
                    currentArchetype.number_of_floor_layers = parseInt(values[1]) || 1;
                } else if (values[0] === 'startPeriod') {
                    // Header row for period data
                    currentArchetype.headers = values;
                } else if (values[0] && !isNaN(parseFloat(values[0]))) {
                    // Period data row
                    const period = {};
                    currentArchetype.headers.forEach((header, index) => {
                        period[header] = values[index] || '';
                    });
                    currentArchetype.periods.push(period);
                }
            } else if (inGroupSection && currentGroup) {
                if (values[0] === 'usage_group_building_name') {
                    currentGroup.usage_group_building_name = values[1] || '';
                } else if (values[0] === 'number_of_wall_layers') {
                    currentGroup.number_of_wall_layers = parseInt(values[1]) || 1;
                } else if (values[0] === 'number_of_roof_layers') {
                    currentGroup.number_of_roof_layers = parseInt(values[1]) || 1;
                } else if (values[0] === 'number_of_floor_layers') {
                    currentGroup.number_of_floor_layers = parseInt(values[1]) || 1;
                } else if (values[0] === 'startPeriod') {
                    // Header row for period data
                    currentGroup.headers = values;
                } else if (values[0] && !isNaN(parseFloat(values[0]))) {
                    // Period data row
                    const period = {};
                    currentGroup.headers.forEach((header, index) => {
                        period[header] = values[index] || '';
                    });
                    currentGroup.periods.push(period);
                }
            }
        }

        // Add last archetype/group if exists
        if (currentArchetype) {
            archetypes.push(currentArchetype);
        }
        if (currentGroup) {
            groups.push(currentGroup);
        }

        // Store in SurfaceTypesManager
        // Merge with existing archetypes and groups (don't replace, add to existing)
        const existingArchetypes = this.surfaceTypesManager.getSurfaceTypes('buildingArchyTypes') || [];
        const existingGroups = this.surfaceTypesManager.getSurfaceTypes('buildingGroups') || [];
        
        // Add new archetypes to existing ones (avoid duplicates by name)
        archetypes.forEach(newArchetype => {
            const existingIndex = existingArchetypes.findIndex(a => 
                a.usage_group_building_name === newArchetype.usage_group_building_name
            );
            if (existingIndex >= 0) {
                // Replace existing archetype with same name
                existingArchetypes[existingIndex] = newArchetype;
            } else {
                // Add new archetype
                existingArchetypes.push(newArchetype);
            }
        });
        
        // Add new groups to existing ones (avoid duplicates by name)
        groups.forEach(newGroup => {
            const existingIndex = existingGroups.findIndex(g => 
                g.usage_group_building_name === newGroup.usage_group_building_name
            );
            if (existingIndex >= 0) {
                // Replace existing group with same name
                existingGroups[existingIndex] = newGroup;
            } else {
                // Add new group
                existingGroups.push(newGroup);
            }
        });
        
        this.surfaceTypesManager.surfaceTypes.buildingArchyTypes = existingArchetypes;
        this.surfaceTypesManager.surfaceTypes.buildingGroups = existingGroups;
        
        // Save to localStorage
        this.surfaceTypesManager.saveToLocalStorage();
    }

    /**
     * Load default building archetypes from building_archetype_envelope_property.csv
     * This should be called after surfaceTypesManager is initialized
     */
    async loadDefaultBuildingArchetypes() {
        if (!this.surfaceTypesManager) {
            console.warn('SurfaceTypesManager not available, skipping default building archetypes load');
            return;
        }

        const buildingArchyTypes = this.surfaceTypesManager.getSurfaceTypes('buildingArchyTypes');
        const buildingGroups = this.surfaceTypesManager.getSurfaceTypes('buildingGroups');
        
        // Only load if both are empty (no data from localStorage)
        if ((!buildingArchyTypes || buildingArchyTypes.length === 0) && 
            (!buildingGroups || buildingGroups.length === 0)) {
            try {
                const response = await fetch('Samples/building_archetype_envelope_property.csv');
                if (response.ok) {
                    const csvContent = await response.text();
                    this.parseAndLoadBuildingArchetypesFromCSV(csvContent);
                    console.log('Loaded default building archetypes from building_archetype_envelope_property.csv');
                    // Reload building archetypes data to populate dropdowns
                    this.loadBuildingArchetypesData();
                } else {
                    console.warn('Could not load building_archetype_envelope_property.csv:', response.statusText);
                }
            } catch (error) {
                console.error('Error loading building_archetype_envelope_property.csv:', error);
            }
        } else {
            // If data exists, still reload to populate dropdowns
            this.loadBuildingArchetypesData();
        }
    }

    /**
     * Load STL file from zip
     * @param {JSZip} zip - JSZip instance
     */
    async loadSTLFromZip(zip) {
        if (!this.stlManager) {
            throw new Error('STLManager not available');
        }

        const stlFile = zip.file('geometry.stl');
        if (!stlFile) {
            throw new Error('geometry.stl not found in project file');
        }

        const stlContent = await stlFile.async('string');
        
        // Import STL with default settings (y-up, no flip normals, clear scene is already done)
        this.stlManager.parseSTLFile(stlContent, false, 'y-up', false);
        
        // Remove period properties from all non-building STL objects
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (scene) {
            // Check all meshes
            scene.meshes.forEach(mesh => {
                if (mesh && mesh.userData && mesh.userData.isImportedSTL) {
                    const type = mesh.userData.type;
                    if (type && type !== 'building') {
                        delete mesh.userData.startPeriod;
                        delete mesh.userData.endPeriod;
                        delete mesh.userData.buildingArchetypePeriod;
                        delete mesh.userData.buildingGroupPeriod;
                    }
                }
            });
            
            // Check all TransformNodes (for trees)
            scene.transformNodes.forEach(transformNode => {
                if (transformNode && transformNode.userData && transformNode.userData.isImportedSTL) {
                    const type = transformNode.userData.type;
                    if (type && type !== 'building') {
                        delete transformNode.userData.startPeriod;
                        delete transformNode.userData.endPeriod;
                        delete transformNode.userData.buildingArchetypePeriod;
                        delete transformNode.userData.buildingGroupPeriod;
                    }
                }
            });
        }
    }

    /**
     * Apply CSV data to object properties
     * @param {JSZip} zip - JSZip instance
     */
    async applyCSVDataToObjects(zip) {
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            return;
        }

        // Load solidBuildingSubcategories.csv
        try {
            const buildingFile = zip.file('solidBuildingSubcategories.csv');
            if (buildingFile) {
                const csvContent = await buildingFile.async('string');
                this.applyBuildingPropertiesFromCSV(csvContent, scene);
            }
        } catch (error) {
            console.error('Error applying building properties:', error);
        }

        // Load solidWaterSubcategories.csv
        try {
            const waterFile = zip.file('solidWaterSubcategories.csv');
            if (waterFile) {
                const csvContent = await waterFile.async('string');
                this.applyWaterPropertiesFromCSV(csvContent, scene);
            }
        } catch (error) {
            console.error('Error applying water properties:', error);
        }

        // Load solidRoadSubcategories.csv
        try {
            const roadFile = zip.file('solidRoadSubcategories.csv');
            if (roadFile) {
                const csvContent = await roadFile.async('string');
                this.applyRoadPropertiesFromCSV(csvContent, scene);
            }
        } catch (error) {
            console.error('Error applying road properties:', error);
        }

        // Load solidVegetationSoilSubcategories.csv
        try {
            const vegetationFile = zip.file('solidVegetationSoilSubcategories.csv');
            if (vegetationFile) {
                const csvContent = await vegetationFile.async('string');
                this.applyVegetationPropertiesFromCSV(csvContent, scene);
            }
        } catch (error) {
            console.error('Error applying vegetation properties:', error);
        }
    }

    /**
     * Apply building properties from CSV
     * @param {string} csvContent - CSV file content
     * @param {BABYLON.Scene} scene - Babylon.js scene
     */
    applyBuildingPropertiesFromCSV(csvContent, scene) {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) return; // No data rows

        const headers = this.surfaceTypesManager.parseCSVLine(lines[0]);
        const buildingNameIndex = headers.indexOf('buildingName');
        const constructionYearIndex = headers.indexOf('constructionYear');
        const envelopePropertyTypeIndex = headers.indexOf('envelopePropertyType');
        const usageTypeGroupNameIndex = headers.indexOf('usageType_groupName');

        for (let i = 1; i < lines.length; i++) {
            const values = this.surfaceTypesManager.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const buildingName = values[buildingNameIndex];
            const constructionYear = values[constructionYearIndex];
            const envelopePropertyType = values[envelopePropertyTypeIndex];
            const usageTypeGroupName = values[usageTypeGroupNameIndex];

            // Find building mesh by name
            const building = scene.getMeshByName(buildingName);
            if (building && building.userData) {
                if (constructionYear && constructionYear.trim()) {
                    building.userData.yearOfConstruction = constructionYear.trim();
                }
                if (envelopePropertyType) {
                    building.userData.buildingEnvelopeProperties = envelopePropertyType.trim();
                }
                if (usageTypeGroupName && usageTypeGroupName.trim()) {
                    if (envelopePropertyType === 'archetype') {
                        building.userData.buildingArchetype = usageTypeGroupName.trim();
                    } else if (envelopePropertyType === 'group') {
                        building.userData.buildingGroup = usageTypeGroupName.trim();
                    }
                }
            }
        }
    }

    /**
     * Apply water properties from CSV
     * @param {string} csvContent - CSV file content
     * @param {BABYLON.Scene} scene - Babylon.js scene
     */
    applyWaterPropertiesFromCSV(csvContent, scene) {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) return;

        const headers = this.surfaceTypesManager.parseCSVLine(lines[0]);
        const nameIndex = headers.indexOf('name');
        const waterTypeIndex = headers.indexOf('waterType');

        for (let i = 1; i < lines.length; i++) {
            const values = this.surfaceTypesManager.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const name = values[nameIndex];
            const waterType = values[waterTypeIndex];

            const mesh = scene.getMeshByName(name);
            if (mesh && mesh.userData) {
                if (waterType) {
                    mesh.userData.waterwayWaterType = waterType.trim();
                }
                // Ensure no period properties for waterway
                delete mesh.userData.startPeriod;
                delete mesh.userData.endPeriod;
                delete mesh.userData.buildingArchetypePeriod;
                delete mesh.userData.buildingGroupPeriod;
            }
        }
    }

    /**
     * Apply road properties from CSV
     * @param {string} csvContent - CSV file content
     * @param {BABYLON.Scene} scene - Babylon.js scene
     */
    applyRoadPropertiesFromCSV(csvContent, scene) {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) return;

        const headers = this.surfaceTypesManager.parseCSVLine(lines[0]);
        const nameIndex = headers.indexOf('name');
        const roadTypeIndex = headers.indexOf('roadType');

        for (let i = 1; i < lines.length; i++) {
            const values = this.surfaceTypesManager.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const name = values[nameIndex];
            const roadType = values[roadTypeIndex];

            const mesh = scene.getMeshByName(name);
            if (mesh && mesh.userData) {
                if (roadType) {
                    mesh.userData.highwayRoadType = roadType.trim();
                }
                // Ensure no period properties for highway
                delete mesh.userData.startPeriod;
                delete mesh.userData.endPeriod;
                delete mesh.userData.buildingArchetypePeriod;
                delete mesh.userData.buildingGroupPeriod;
            }
        }
    }

    /**
     * Apply vegetation properties from CSV
     * @param {string} csvContent - CSV file content
     * @param {BABYLON.Scene} scene - Babylon.js scene
     */
    applyVegetationPropertiesFromCSV(csvContent, scene) {
        const lines = csvContent.trim().split('\n');
        if (lines.length < 2) return;

        const headers = this.surfaceTypesManager.parseCSVLine(lines[0]);
        const nameIndex = headers.indexOf('name');
        const typeIndex = headers.indexOf('type');
        const vegetationTypeIndex = headers.indexOf('vegetationType');
        const soilTypeIndex = headers.indexOf('soilType');

        for (let i = 1; i < lines.length; i++) {
            const values = this.surfaceTypesManager.parseCSVLine(lines[i]);
            if (values.length < headers.length) continue;

            const name = values[nameIndex];
            const type = values[typeIndex];
            const vegetationType = values[vegetationTypeIndex];
            const soilType = values[soilTypeIndex];

            // Find mesh by name
            let mesh = scene.getMeshByName(name);
            
            // Also check TransformNodes for trees
            if (!mesh && type === 'tree') {
                const transformNodes = scene.transformNodes.filter(tn => tn.name === name);
                if (transformNodes.length > 0) {
                    mesh = transformNodes[0];
                }
            }

            if (mesh && mesh.userData) {
                if (type === 'tree' && vegetationType) {
                    mesh.userData.treeVegetationType = vegetationType.trim();
                } else if (type === 'grass' && vegetationType) {
                    mesh.userData.grassVegetationType = vegetationType.trim();
                } else if (type === 'ground' && vegetationType) {
                    mesh.userData.groundVegetationType = vegetationType.trim();
                }
                
                if (soilType) {
                    if (type === 'tree') {
                        mesh.userData.treeSoilType = soilType.trim();
                    } else if (type === 'grass') {
                        mesh.userData.grassSoilType = soilType.trim();
                    } else if (type === 'ground') {
                        mesh.userData.groundSoilType = soilType.trim();
                    }
                }
                
                // Ensure no period properties for tree, grass, ground
                delete mesh.userData.startPeriod;
                delete mesh.userData.endPeriod;
                delete mesh.userData.buildingArchetypePeriod;
                delete mesh.userData.buildingGroupPeriod;
            }
        }
    }

    /**
     * Export all 3D models to STL format (ASCII)
     */
    exportSTL() {
        if (this.stlManager) {
            this.stlManager.exportSTL();
        } else {
            console.error('STLManager not available');
        }
    }

    /**
     * Show STL export settings dialog
     */
    showSTLExportDialog() {
        const dialog = document.getElementById('stlExportDialog');
        if (!dialog) {
            console.error('STL export dialog not found');
            return;
        }

        // Reset to default values
        const axisUpSelect = document.getElementById('stlAxisUp');
        if (axisUpSelect) {
            axisUpSelect.value = 'z-up';
        }

        // Show dialog
        dialog.style.display = 'flex';

        // Setup event listeners
        const closeBtn = document.getElementById('stlExportDialogClose');
        const cancelBtn = document.getElementById('stlExportDialogCancel');
        const confirmBtn = document.getElementById('stlExportDialogConfirm');

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        const handleConfirm = () => {
            const axisUp = axisUpSelect ? axisUpSelect.value : 'z-up';
            closeDialog();
            this.proceedWithSTLExport(axisUp);
        };

        // Remove old listeners and add new ones
        if (closeBtn) {
            closeBtn.onclick = closeDialog;
        }
        if (cancelBtn) {
            cancelBtn.onclick = closeDialog;
        }
        if (confirmBtn) {
            confirmBtn.onclick = handleConfirm;
        }

        // Close on overlay click
        dialog.onclick = (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        };
    }

    /**
     * Proceed with STL export after user confirms settings
     */
    async proceedWithSTLExport(axisUp) {
        const scene = this.sceneManager.getScene();
        if (!scene) {
            console.error('Scene not available');
            return;
        }

        console.log('Starting STL export...');

        // Collect all meshes to export
        const meshesToExport = [];

        // 1. Get all meshes with valid types (building, highway, ground, grass, waterway)
        const validTypes = ['building', 'highway', 'ground', 'grass', 'waterway'];
        const typedMeshes = scene.meshes.filter(mesh => {
            if (!mesh || !mesh.isEnabled() || !mesh.isVisible) return false;
            if (!mesh.userData || !mesh.userData.type) return false;
            return validTypes.includes(mesh.userData.type);
        });

        console.log(`Found ${typedMeshes.length} typed meshes`);

        // Group meshes by type for proper naming
        const meshesByType = {};
        typedMeshes.forEach(mesh => {
            const type = mesh.userData.type;
            if (!meshesByType[type]) {
                meshesByType[type] = [];
            }
            meshesByType[type].push(mesh);
        });

        // Add typed meshes to export list with proper naming
        Object.keys(meshesByType).forEach(type => {
            meshesByType[type].forEach((mesh, index) => {
                let exportName;
                
                // For waterway, grass, and ground, use simple type name (or type1, type2, etc. if multiple)
                if (type === 'waterway' || type === 'grass' || type === 'ground') {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                }
                // For other types, use type name format
                else {
                    exportName = meshesByType[type].length === 1 ? type : `${type}${index + 1}`;
                }
                
                meshesToExport.push({
                    mesh: mesh,
                    name: exportName,
                    type: type
                });
            });
        });

        // 2. Get trees from TreeManager
        if (this.treeManager && this.treeManager.trees) {
            const trees = this.treeManager.trees;
            console.log(`Found ${trees.length} trees`);

            trees.forEach((tree, index) => {
                if (tree.parent && tree.meshes && tree.meshes.length > 0) {
                    // Combine all meshes of a tree into one export object
                    meshesToExport.push({
                        mesh: tree.parent, // Use parent TransformNode for transform info
                        childMeshes: tree.meshes, // All child meshes
                        name: `tree${index + 1}`, // Name: tree1, tree2, ...
                        type: 'tree'
                    });
                }
            });
        }

        if (meshesToExport.length === 0) {
            alert('No objects to export. Please create some buildings, roads, or other objects first.');
            return;
        }

        console.log(`Total objects to export: ${meshesToExport.length}`);

        // Generate STL content
        const stlContent = this.generateSTLContent(meshesToExport, axisUp);

        // Ask user for file location and name
        await this.saveSTLFile(stlContent);
    }

    /**
     * Generate STL ASCII content from meshes
     * @param {Array} meshesToExport - Array of meshes to export
     * @param {string} axisUp - 'y-up' or 'z-up'
     */
    generateSTLContent(meshesToExport, axisUp = 'z-up') {
        let stlContent = '';

        meshesToExport.forEach((obj, index) => {
            const objectName = obj.name || `object_${index + 1}`;
            stlContent += `solid ${objectName}\n`;

            if (obj.type === 'tree') {
                // Handle trees: combine all child meshes
                // Note: getWorldMatrix() of child meshes already includes parent TransformNode transform
                if (obj.childMeshes && obj.childMeshes.length > 0) {
                    obj.childMeshes.forEach(childMesh => {
                        const triangles = this.meshToTriangles(childMesh);
                        triangles.forEach(triangle => {
                            stlContent += this.triangleToSTL(triangle, axisUp);
                        });
                    });
                }
            } else {
                // Handle regular meshes
                const triangles = this.meshToTriangles(obj.mesh);
                triangles.forEach(triangle => {
                    stlContent += this.triangleToSTL(triangle, axisUp);
                });
            }

            stlContent += `endsolid ${objectName}\n`;
        });

        return stlContent;
    }

    /**
     * Convert a mesh to triangles with world positions
     * Note: For child meshes parented to TransformNode, getWorldMatrix() automatically includes parent transform
     */
    meshToTriangles(mesh) {
        if (!mesh || !mesh.isEnabled()) return [];

        try {
            // Get vertex data from mesh
            const vertexData = BABYLON.VertexData.ExtractFromMesh(mesh);
            if (!vertexData.positions || vertexData.positions.length === 0) {
                return [];
            }

            const positions = vertexData.positions;
            const indices = vertexData.indices || [];

            // If no indices, create them (assuming triangles)
            let triangleIndices = indices;
            if (triangleIndices.length === 0) {
                triangleIndices = [];
                for (let i = 0; i < positions.length; i += 3) {
                    triangleIndices.push(i, i + 1, i + 2);
                }
            }

            const triangles = [];

            // Process each triangle
            for (let i = 0; i < triangleIndices.length; i += 3) {
                const i0 = triangleIndices[i] * 3;
                const i1 = triangleIndices[i + 1] * 3;
                const i2 = triangleIndices[i + 2] * 3;

                // Get vertex positions (local to mesh)
                const v0 = new BABYLON.Vector3(positions[i0], positions[i0 + 1], positions[i0 + 2]);
                const v1 = new BABYLON.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
                const v2 = new BABYLON.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);

                // Use mesh's world matrix - this automatically includes parent transforms
                // For child meshes parented to TransformNode, getWorldMatrix() already accounts for parent
                const worldMatrix = mesh.getWorldMatrix();
                const finalV0 = BABYLON.Vector3.TransformCoordinates(v0, worldMatrix);
                const finalV1 = BABYLON.Vector3.TransformCoordinates(v1, worldMatrix);
                const finalV2 = BABYLON.Vector3.TransformCoordinates(v2, worldMatrix);

                // Calculate normal
                const normal = this.calculateTriangleNormal(finalV0, finalV1, finalV2);

                triangles.push({
                    normal: normal,
                    vertices: [finalV0, finalV1, finalV2]
                });
            }

            return triangles;
        } catch (error) {
            console.error(`Error converting mesh ${mesh.name} to triangles:`, error);
            return [];
        }
    }

    /**
     * Calculate triangle normal
     */
    calculateTriangleNormal(v0, v1, v2) {
        const edge1 = v1.subtract(v0);
        const edge2 = v2.subtract(v0);
        const normal = BABYLON.Vector3.Cross(edge1, edge2);
        normal.normalize();
        return normal;
    }

    /**
     * Convert a triangle to STL format
     * @param {Object} triangle - Triangle with normal and vertices
     * @param {string} axisUp - 'y-up' or 'z-up'
     */
    triangleToSTL(triangle, axisUp = 'z-up') {
        const normal = triangle.normal;
        const v0 = triangle.vertices[0];
        const v1 = triangle.vertices[1];
        const v2 = triangle.vertices[2];

        // Format: scientific notation with 6 decimal places (as in sample file)
        // Example: 0.000000e+00, 4.667083e+06
        const formatFloat = (val) => {
            // Use toExponential with 6 decimal places
            let str = val.toExponential(6);
            // Ensure positive exponent has + sign and is 2 digits
            str = str.replace(/e\+?(\d+)/, (match, exp) => {
                const expNum = parseInt(exp);
                const sign = expNum >= 0 ? '+' : '-';
                return 'e' + sign + Math.abs(expNum).toString().padStart(2, '0');
            });
            // Ensure negative exponent has - sign and is 2 digits
            str = str.replace(/e-(\d+)/, (match, exp) => {
                return 'e-' + exp.padStart(2, '0');
            });
            return str;
        };

        let stlNormal, stlV0, stlV1, stlV2;

        if (axisUp === 'z-up') {
            // Convert from Babylon.js coordinate system (X, Y, Z) to STL coordinate system (X, Z, Y)
            // Babylon: X=right, Y=up, Z=forward
            // STL: X=right, Y=forward, Z=up
            // So we swap Y and Z: (x, y, z) -> (x, z, y)
            const convertNormal = (n) => {
                return { x: n.x, y: n.z, z: n.y };
            };
            const convertVertex = (v) => {
                return { x: v.x, y: v.z, z: v.y };
            };

            stlNormal = convertNormal(normal);
            stlV0 = convertVertex(v0);
            stlV1 = convertVertex(v1);
            stlV2 = convertVertex(v2);
        } else {
            // Y-up: Keep Babylon.js coordinate system but reverse Z axis (flip forward/backward direction)
            stlNormal = { x: normal.x, y: normal.y, z: -normal.z };
            stlV0 = { x: v0.x, y: v0.y, z: -v0.z };
            stlV1 = { x: v1.x, y: v1.y, z: -v1.z };
            stlV2 = { x: v2.x, y: v2.y, z: -v2.z };
        }

        let stl = `  facet normal ${formatFloat(stlNormal.x)} ${formatFloat(stlNormal.y)} ${formatFloat(stlNormal.z)}\n`;
        stl += `    outer loop\n`;
        stl += `      vertex ${formatFloat(stlV0.x)} ${formatFloat(stlV0.y)} ${formatFloat(stlV0.z)}\n`;
        stl += `      vertex ${formatFloat(stlV1.x)} ${formatFloat(stlV1.y)} ${formatFloat(stlV1.z)}\n`;
        stl += `      vertex ${formatFloat(stlV2.x)} ${formatFloat(stlV2.y)} ${formatFloat(stlV2.z)}\n`;
        stl += `    endloop\n`;
        stl += `  endfacet\n`;

        return stl;
    }

    /**
     * Save STL file using File System Access API (if available) or fallback to download
     * @param {string} content - STL file content
     */
    async saveSTLFile(content) {
        // Check if File System Access API is supported
        if ('showSaveFilePicker' in window) {
            try {
                const fileHandle = await window.showSaveFilePicker({
                    suggestedName: 'scene_export.stl',
                    types: [{
                        description: 'STL Files',
                        accept: {
                            'application/octet-stream': ['.stl'],
                            'text/plain': ['.stl']
                        }
                    }]
                });

                // Create a writable stream
                const writable = await fileHandle.createWritable();
                await writable.write(content);
                await writable.close();

                console.log(`STL file saved: ${fileHandle.name}`);
                alert(`File saved successfully: ${fileHandle.name}`);
            } catch (error) {
                // User cancelled or error occurred
                if (error.name !== 'AbortError') {
                    console.error('Error saving file:', error);
                    // Fallback to download
                    this.downloadSTLFile(content, 'scene_export.stl');
                }
            }
        } else {
            // Fallback to download method for browsers that don't support File System Access API
            this.downloadSTLFile(content, 'scene_export.stl');
        }
    }

    /**
     * Download STL file (fallback method)
     * @param {string} content - STL file content
     * @param {string} filename - Default filename
     */
    downloadSTLFile(content, filename) {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log(`STL file exported: ${filename}`);
    }

    openPreferences() {
        this.showPreferencesWindow();
    }

    /**
     * Open Post Processing Settings
     */
    openPostProcessing() {
        this.showPostProcessingWindow();
    }

    /**
     * Show Post Processing Window
     */
    showPostProcessingWindow() {
        const window = document.getElementById('postProcessingWindow');
        const overlay = document.getElementById('postProcessingOverlay');
        
        if (!window || !overlay) {
            console.error('Post Processing window elements not found');
            return;
        }
        
        window.classList.add('show');
        overlay.style.display = 'block';
        
        // Setup listeners if not already done
        if (!this.postProcessingListenersSetup) {
            this.setupPostProcessingListeners();
            this.postProcessingListenersSetup = true;
        }
        
        // Update UI with current settings
        this.updatePostProcessingUI();
    }

    /**
     * Hide Post Processing Window
     */
    hidePostProcessingWindow() {
        const window = document.getElementById('postProcessingWindow');
        const overlay = document.getElementById('postProcessingOverlay');
        
        if (window) {
            window.classList.remove('show');
        }
        if (overlay) {
            overlay.style.display = 'none';
        }
    }

    /**
     * Setup Post Processing Listeners
     */
    setupPostProcessingListeners() {
        if (!this.postProcessingManager) {
            console.error('PostProcessingManager not available');
            return;
        }

        // Close button
        const closeBtn = document.getElementById('closePostProcessing');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hidePostProcessingWindow();
            });
        }

        // Overlay click to close
        const overlay = document.getElementById('postProcessingOverlay');
        if (overlay) {
            overlay.addEventListener('click', () => {
                this.hidePostProcessingWindow();
            });
        }

        // FXAA
        const fxaaEnabled = document.getElementById('fxaaEnabled');
        if (fxaaEnabled) {
            fxaaEnabled.addEventListener('click', () => {
                const isActive = fxaaEnabled.classList.contains('active');
                fxaaEnabled.classList.toggle('active');
                this.postProcessingManager.setFXAAEnabled(!isActive);
            });
        }

        // Bloom
        const bloomEnabled = document.getElementById('bloomEnabled');
        if (bloomEnabled) {
            bloomEnabled.addEventListener('click', () => {
                const isActive = bloomEnabled.classList.contains('active');
                bloomEnabled.classList.toggle('active');
                this.postProcessingManager.setBloomEnabled(!isActive);
            });
        }

        const bloomThreshold = document.getElementById('bloomThreshold');
        const bloomThresholdValue = document.getElementById('bloomThresholdValue');
        if (bloomThreshold && bloomThresholdValue) {
            bloomThreshold.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                bloomThresholdValue.textContent = value.toFixed(2);
                this.postProcessingManager.setBloomSettings(
                    value,
                    parseFloat(document.getElementById('bloomWeight').value),
                    parseInt(document.getElementById('bloomKernelSize').value),
                    parseFloat(document.getElementById('bloomScale').value)
                );
            });
        }

        const bloomWeight = document.getElementById('bloomWeight');
        const bloomWeightValue = document.getElementById('bloomWeightValue');
        if (bloomWeight && bloomWeightValue) {
            bloomWeight.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                bloomWeightValue.textContent = value.toFixed(2);
                this.postProcessingManager.setBloomSettings(
                    parseFloat(document.getElementById('bloomThreshold').value),
                    value,
                    parseInt(document.getElementById('bloomKernelSize').value),
                    parseFloat(document.getElementById('bloomScale').value)
                );
            });
        }

        const bloomKernelSize = document.getElementById('bloomKernelSize');
        const bloomKernelSizeValue = document.getElementById('bloomKernelSizeValue');
        if (bloomKernelSize && bloomKernelSizeValue) {
            bloomKernelSize.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                bloomKernelSizeValue.textContent = value;
                this.postProcessingManager.setBloomSettings(
                    parseFloat(document.getElementById('bloomThreshold').value),
                    parseFloat(document.getElementById('bloomWeight').value),
                    value,
                    parseFloat(document.getElementById('bloomScale').value)
                );
            });
        }

        const bloomScale = document.getElementById('bloomScale');
        const bloomScaleValue = document.getElementById('bloomScaleValue');
        if (bloomScale && bloomScaleValue) {
            bloomScale.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                bloomScaleValue.textContent = value.toFixed(1);
                this.postProcessingManager.setBloomSettings(
                    parseFloat(document.getElementById('bloomThreshold').value),
                    parseFloat(document.getElementById('bloomWeight').value),
                    parseInt(document.getElementById('bloomKernelSize').value),
                    value
                );
            });
        }

        // Color Correction
        const colorExposure = document.getElementById('colorExposure');
        const colorExposureValue = document.getElementById('colorExposureValue');
        if (colorExposure && colorExposureValue) {
            colorExposure.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                colorExposureValue.textContent = value.toFixed(1);
                this.postProcessingManager.setColorCorrectionSettings(
                    value,
                    parseFloat(document.getElementById('colorContrast').value),
                    parseFloat(document.getElementById('colorSaturation').value)
                );
            });
        }

        const colorContrast = document.getElementById('colorContrast');
        const colorContrastValue = document.getElementById('colorContrastValue');
        if (colorContrast && colorContrastValue) {
            colorContrast.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                colorContrastValue.textContent = value.toFixed(1);
                this.postProcessingManager.setColorCorrectionSettings(
                    parseFloat(document.getElementById('colorExposure').value),
                    value,
                    parseFloat(document.getElementById('colorSaturation').value)
                );
            });
        }

        const colorSaturation = document.getElementById('colorSaturation');
        const colorSaturationValue = document.getElementById('colorSaturationValue');
        if (colorSaturation && colorSaturationValue) {
            colorSaturation.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                colorSaturationValue.textContent = value.toFixed(1);
                this.postProcessingManager.setColorCorrectionSettings(
                    parseFloat(document.getElementById('colorExposure').value),
                    parseFloat(document.getElementById('colorContrast').value),
                    value
                );
            });
        }

        // Chromatic Aberration
        const chromaticEnabled = document.getElementById('chromaticEnabled');
        if (chromaticEnabled) {
            chromaticEnabled.addEventListener('click', () => {
                const isActive = chromaticEnabled.classList.contains('active');
                chromaticEnabled.classList.toggle('active');
                this.postProcessingManager.setChromaticAberrationEnabled(!isActive);
            });
        }

        const chromaticAmount = document.getElementById('chromaticAmount');
        const chromaticAmountValue = document.getElementById('chromaticAmountValue');
        if (chromaticAmount && chromaticAmountValue) {
            chromaticAmount.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                chromaticAmountValue.textContent = value.toFixed(1);
                this.postProcessingManager.setChromaticAberrationSettings(
                    value,
                    parseFloat(document.getElementById('chromaticRadial').value)
                );
            });
        }

        const chromaticRadial = document.getElementById('chromaticRadial');
        const chromaticRadialValue = document.getElementById('chromaticRadialValue');
        if (chromaticRadial && chromaticRadialValue) {
            chromaticRadial.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                chromaticRadialValue.textContent = value.toFixed(1);
                this.postProcessingManager.setChromaticAberrationSettings(
                    parseFloat(document.getElementById('chromaticAmount').value),
                    value
                );
            });
        }

        // Depth of Field
        const dofEnabled = document.getElementById('dofEnabled');
        if (dofEnabled) {
            dofEnabled.addEventListener('click', () => {
                const isActive = dofEnabled.classList.contains('active');
                dofEnabled.classList.toggle('active');
                this.postProcessingManager.setDepthOfFieldEnabled(!isActive);
            });
        }

        const dofFocusDistance = document.getElementById('dofFocusDistance');
        const dofFocusDistanceValue = document.getElementById('dofFocusDistanceValue');
        if (dofFocusDistance && dofFocusDistanceValue) {
            dofFocusDistance.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                dofFocusDistanceValue.textContent = value;
                this.postProcessingManager.setDepthOfFieldSettings(
                    value,
                    parseFloat(document.getElementById('dofLensSize').value),
                    parseFloat(document.getElementById('dofFStop').value)
                );
            });
        }

        const dofLensSize = document.getElementById('dofLensSize');
        const dofLensSizeValue = document.getElementById('dofLensSizeValue');
        if (dofLensSize && dofLensSizeValue) {
            dofLensSize.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                dofLensSizeValue.textContent = value.toFixed(2);
                this.postProcessingManager.setDepthOfFieldSettings(
                    parseFloat(document.getElementById('dofFocusDistance').value),
                    value,
                    parseFloat(document.getElementById('dofFStop').value)
                );
            });
        }

        const dofFStop = document.getElementById('dofFStop');
        const dofFStopValue = document.getElementById('dofFStopValue');
        if (dofFStop && dofFStopValue) {
            dofFStop.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                dofFStopValue.textContent = value.toFixed(1);
                this.postProcessingManager.setDepthOfFieldSettings(
                    parseFloat(document.getElementById('dofFocusDistance').value),
                    parseFloat(document.getElementById('dofLensSize').value),
                    value
                );
            });
        }

        // Grain
        const grainEnabled = document.getElementById('grainEnabled');
        if (grainEnabled) {
            grainEnabled.addEventListener('click', () => {
                const isActive = grainEnabled.classList.contains('active');
                grainEnabled.classList.toggle('active');
                this.postProcessingManager.setGrainEnabled(!isActive);
            });
        }

        const grainIntensity = document.getElementById('grainIntensity');
        const grainIntensityValue = document.getElementById('grainIntensityValue');
        if (grainIntensity && grainIntensityValue) {
            grainIntensity.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                grainIntensityValue.textContent = value.toFixed(1);
                this.postProcessingManager.setGrainSettings(
                    value,
                    document.getElementById('grainAnimated').classList.contains('active')
                );
            });
        }

        const grainAnimated = document.getElementById('grainAnimated');
        if (grainAnimated) {
            grainAnimated.addEventListener('click', () => {
                grainAnimated.classList.toggle('active');
                this.postProcessingManager.setGrainSettings(
                    parseFloat(document.getElementById('grainIntensity').value),
                    grainAnimated.classList.contains('active')
                );
            });
        }

        // Sharpen
        const sharpenEnabled = document.getElementById('sharpenEnabled');
        if (sharpenEnabled) {
            sharpenEnabled.addEventListener('click', () => {
                const isActive = sharpenEnabled.classList.contains('active');
                sharpenEnabled.classList.toggle('active');
                this.postProcessingManager.setSharpenEnabled(!isActive);
            });
        }

        const sharpenEdgeAmount = document.getElementById('sharpenEdgeAmount');
        const sharpenEdgeAmountValue = document.getElementById('sharpenEdgeAmountValue');
        if (sharpenEdgeAmount && sharpenEdgeAmountValue) {
            sharpenEdgeAmount.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                sharpenEdgeAmountValue.textContent = value.toFixed(1);
                this.postProcessingManager.setSharpenSettings(value);
            });
        }

        // Vignette
        const vignetteEnabled = document.getElementById('vignetteEnabled');
        if (vignetteEnabled) {
            vignetteEnabled.addEventListener('click', () => {
                const isActive = vignetteEnabled.classList.contains('active');
                vignetteEnabled.classList.toggle('active');
                this.postProcessingManager.setVignetteEnabled(!isActive);
            });
        }

        const vignetteScale = document.getElementById('vignetteScale');
        const vignetteScaleValue = document.getElementById('vignetteScaleValue');
        if (vignetteScale && vignetteScaleValue) {
            vignetteScale.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                vignetteScaleValue.textContent = value.toFixed(1);
                this.postProcessingManager.setVignetteSettings(
                    value,
                    parseFloat(document.getElementById('vignettePower').value),
                    null
                );
            });
        }

        const vignettePower = document.getElementById('vignettePower');
        const vignettePowerValue = document.getElementById('vignettePowerValue');
        if (vignettePower && vignettePowerValue) {
            vignettePower.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                vignettePowerValue.textContent = value.toFixed(1);
                this.postProcessingManager.setVignetteSettings(
                    parseFloat(document.getElementById('vignetteScale').value),
                    value,
                    null
                );
            });
        }

        // SSAO
        const ssaoEnabled = document.getElementById('ssaoEnabled');
        const ssaoWarning = document.getElementById('ssaoWarning');
        if (ssaoEnabled) {
            // Check if SSAO is available
            if (!this.postProcessingManager.isSSAOAvailable()) {
                ssaoEnabled.disabled = true;
                ssaoEnabled.title = 'SSAO is not available in this version of Babylon.js';
                if (ssaoWarning) {
                    ssaoWarning.style.display = 'block';
                }
            } else {
                if (ssaoWarning) {
                    ssaoWarning.style.display = 'none';
                }
                ssaoEnabled.addEventListener('click', () => {
                    const isActive = ssaoEnabled.classList.contains('active');
                    ssaoEnabled.classList.toggle('active');
                    this.postProcessingManager.setSSAOEnabled(!isActive);
                });
            }
        }

        const ssaoRadius = document.getElementById('ssaoRadius');
        const ssaoRadiusValue = document.getElementById('ssaoRadiusValue');
        if (ssaoRadius && ssaoRadiusValue) {
            ssaoRadius.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                ssaoRadiusValue.textContent = value.toFixed(1);
                this.postProcessingManager.setSSAOSettings(
                    value,
                    parseInt(document.getElementById('ssaoSamples').value),
                    parseFloat(document.getElementById('ssaoStrength').value)
                );
            });
        }

        const ssaoSamples = document.getElementById('ssaoSamples');
        const ssaoSamplesValue = document.getElementById('ssaoSamplesValue');
        if (ssaoSamples && ssaoSamplesValue) {
            ssaoSamples.addEventListener('input', (e) => {
                const value = parseInt(e.target.value);
                ssaoSamplesValue.textContent = value;
                this.postProcessingManager.setSSAOSettings(
                    parseFloat(document.getElementById('ssaoRadius').value),
                    value,
                    parseFloat(document.getElementById('ssaoStrength').value)
                );
            });
        }

        const ssaoStrength = document.getElementById('ssaoStrength');
        const ssaoStrengthValue = document.getElementById('ssaoStrengthValue');
        if (ssaoStrength && ssaoStrengthValue) {
            ssaoStrength.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                ssaoStrengthValue.textContent = value.toFixed(1);
                this.postProcessingManager.setSSAOSettings(
                    parseFloat(document.getElementById('ssaoRadius').value),
                    parseInt(document.getElementById('ssaoSamples').value),
                    value
                );
            });
        }

        // Reset button
        const resetBtn = document.getElementById('resetPostProcessing');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.resetPostProcessingToDefaults();
            });
        }
    }

    /**
     * Update Post Processing UI with current settings
     */
    updatePostProcessingUI() {
        if (!this.postProcessingManager) return;

        const settings = this.postProcessingManager.getSettings();

        // FXAA
        const fxaaEnabled = document.getElementById('fxaaEnabled');
        if (fxaaEnabled) {
            if (settings.fxaa.enabled) {
                fxaaEnabled.classList.add('active');
            } else {
                fxaaEnabled.classList.remove('active');
            }
        }

        // Bloom
        const bloomEnabled = document.getElementById('bloomEnabled');
        if (bloomEnabled) {
            if (settings.bloom.enabled) {
                bloomEnabled.classList.add('active');
            } else {
                bloomEnabled.classList.remove('active');
            }
        }
        this.updateRangeInput('bloomThreshold', settings.bloom.threshold, 'bloomThresholdValue', 2);
        this.updateRangeInput('bloomWeight', settings.bloom.weight, 'bloomWeightValue', 2);
        this.updateRangeInput('bloomKernelSize', settings.bloom.kernelSize, 'bloomKernelSizeValue', 0);
        this.updateRangeInput('bloomScale', settings.bloom.scale, 'bloomScaleValue', 1);

        // Color Correction
        this.updateRangeInput('colorExposure', settings.colorCorrection.exposure, 'colorExposureValue', 1);
        this.updateRangeInput('colorContrast', settings.colorCorrection.contrast, 'colorContrastValue', 1);
        this.updateRangeInput('colorSaturation', settings.colorCorrection.saturation, 'colorSaturationValue', 1);

        // Chromatic Aberration
        const chromaticEnabled = document.getElementById('chromaticEnabled');
        if (chromaticEnabled) {
            if (settings.chromaticAberration.enabled) {
                chromaticEnabled.classList.add('active');
            } else {
                chromaticEnabled.classList.remove('active');
            }
        }
        this.updateRangeInput('chromaticAmount', settings.chromaticAberration.aberrationAmount, 'chromaticAmountValue', 1);
        this.updateRangeInput('chromaticRadial', settings.chromaticAberration.radialIntensity, 'chromaticRadialValue', 1);

        // Depth of Field
        const dofEnabled = document.getElementById('dofEnabled');
        if (dofEnabled) {
            if (settings.depthOfField.enabled) {
                dofEnabled.classList.add('active');
            } else {
                dofEnabled.classList.remove('active');
            }
        }
        this.updateRangeInput('dofFocusDistance', settings.depthOfField.focusDistance, 'dofFocusDistanceValue', 0);
        this.updateRangeInput('dofLensSize', settings.depthOfField.lensSize, 'dofLensSizeValue', 2);
        this.updateRangeInput('dofFStop', settings.depthOfField.fStop, 'dofFStopValue', 1);

        // Grain
        const grainEnabled = document.getElementById('grainEnabled');
        if (grainEnabled) {
            if (settings.grain.enabled) {
                grainEnabled.classList.add('active');
            } else {
                grainEnabled.classList.remove('active');
            }
        }
        this.updateRangeInput('grainIntensity', settings.grain.intensity, 'grainIntensityValue', 1);
        const grainAnimated = document.getElementById('grainAnimated');
        if (grainAnimated) {
            if (settings.grain.animated) {
                grainAnimated.classList.add('active');
            } else {
                grainAnimated.classList.remove('active');
            }
        }

        // Sharpen
        const sharpenEnabled = document.getElementById('sharpenEnabled');
        if (sharpenEnabled) {
            if (settings.sharpen.enabled) {
                sharpenEnabled.classList.add('active');
            } else {
                sharpenEnabled.classList.remove('active');
            }
        }
        this.updateRangeInput('sharpenEdgeAmount', settings.sharpen.edgeAmount, 'sharpenEdgeAmountValue', 1);

        // Vignette
        const vignetteEnabled = document.getElementById('vignetteEnabled');
        if (vignetteEnabled) {
            if (settings.vignette.enabled) {
                vignetteEnabled.classList.add('active');
            } else {
                vignetteEnabled.classList.remove('active');
            }
        }
        this.updateRangeInput('vignetteScale', settings.vignette.scale, 'vignetteScaleValue', 1);
        this.updateRangeInput('vignettePower', settings.vignette.power, 'vignettePowerValue', 1);

        // SSAO
        const ssaoEnabled = document.getElementById('ssaoEnabled');
        if (ssaoEnabled) {
            if (settings.ssao.enabled) {
                ssaoEnabled.classList.add('active');
            } else {
                ssaoEnabled.classList.remove('active');
            }
        }
        this.updateRangeInput('ssaoRadius', settings.ssao.radius, 'ssaoRadiusValue', 1);
        this.updateRangeInput('ssaoSamples', settings.ssao.samples, 'ssaoSamplesValue', 0);
        this.updateRangeInput('ssaoStrength', settings.ssao.strength, 'ssaoStrengthValue', 1);
    }

    /**
     * Helper to update range input and value display
     */
    updateRangeInput(inputId, value, valueId, decimals) {
        const input = document.getElementById(inputId);
        const valueDisplay = document.getElementById(valueId);
        if (input) {
            input.value = value;
        }
        if (valueDisplay) {
            valueDisplay.textContent = decimals === 0 ? value : value.toFixed(decimals);
        }
    }

    /**
     * Reset Post Processing to defaults
     */
    resetPostProcessingToDefaults() {
        if (!this.postProcessingManager) return;

        // Reset all settings to defaults
        const defaultSettings = {
            bloom: { enabled: false, threshold: 0.9, weight: 0.3, kernelSize: 64, scale: 0.5 },
            blur: { enabled: false, kernel: 32 },
            chromaticAberration: { enabled: false, aberrationAmount: 0.5, radialIntensity: 0.5, direction: { x: 1.0, y: 1.0 } },
            colorCorrection: { enabled: false, exposure: 1.0, contrast: 1.0, saturation: 1.0 },
            depthOfField: { enabled: false, focusDistance: 10.0, lensSize: 0.1, fStop: 1.4 },
            fxaa: { enabled: false },
            grain: { enabled: false, intensity: 0.5, animated: true },
            sharpen: { enabled: false, edgeAmount: 0.3 },
            vignette: { enabled: false, color: { r: 0, g: 0, b: 0, a: 1 }, scale: 0.5, power: 0.5 },
            ssao: { enabled: false, radius: 2.0, samples: 16, strength: 1.0 }
        };

        this.postProcessingManager.applySettings(defaultSettings);
        this.updatePostProcessingUI();
    }

    /**
     * Open Surface Types Manager
     */
    openSurfaceTypesManager() {
        if (!this.surfaceTypesManager) {
            console.error('SurfaceTypesManager not available');
            alert('Surface Types Manager is not initialized');
            return;
        }

        const dialog = document.getElementById('surfaceTypesManagerDialog');
        if (!dialog) {
            console.error('Surface Types Manager dialog not found');
            return;
        }

        // Store original data for cancel functionality
        this.surfaceTypesOriginalData = {};
        const categories = ['roadTypes', 'soilTypes', 'waterTypes', 'groundTypes', 'grassTypes', 'treeTypes', 'buildingArchyTypes', 'buildingGroups'];
        categories.forEach(category => {
            const types = this.surfaceTypesManager.getSurfaceTypes(category);
            // Deep copy the data
            this.surfaceTypesOriginalData[category] = JSON.parse(JSON.stringify(types));
        });

        // Reset tabs setup flag when opening dialog
        this.surfaceTypesTabsSetup = false;

        // Show dialog
        dialog.style.display = 'flex';
        
        // Setup tabs
        this.setupSurfaceTypesTabs();
        
        // Setup dialog event listeners
        this.setupSurfaceTypesDialogListeners();
        
        // Load and display data
        this.loadSurfaceTypesData();
        
        // Disable Save button initially
        this.updateSaveButtonState(false);
    }

    /**
     * Setup event listeners for Surface Types Manager dialog
     */
    setupSurfaceTypesDialogListeners() {
        const dialog = document.getElementById('surfaceTypesManagerDialog');
        const closeBtn = document.getElementById('surfaceTypesManagerDialogClose');
        const cancelBtn = document.getElementById('surfaceTypesManagerDialogCancel');
        const saveBtn = document.getElementById('surfaceTypesManagerDialogSave');

        const closeDialog = () => {
            if (dialog) {
                dialog.style.display = 'none';
            }
        };

        const cancelDialog = () => {
            // Restore original data
            if (this.surfaceTypesOriginalData && this.surfaceTypesManager) {
                const categories = ['roadTypes', 'soilTypes', 'waterTypes', 'groundTypes', 'grassTypes', 'treeTypes', 'buildingArchyTypes', 'buildingGroups'];
                categories.forEach(category => {
                    if (this.surfaceTypesOriginalData[category]) {
                        // Deep copy back
                        this.surfaceTypesManager.surfaceTypes[category] = JSON.parse(JSON.stringify(this.surfaceTypesOriginalData[category]));
                    }
                });
                // Reload data to reflect restored values
                this.loadSurfaceTypesData();
            }
            // Disable Save button when canceling
            this.updateSaveButtonState(false);
            closeDialog();
        };

        const saveDialog = () => {
            // Save to localStorage
            if (this.surfaceTypesManager) {
                // Validate and filter building archetypes before saving
                if (this.buildingArchetypes && this.buildingArchetypes.length > 0) {
                    // Validate all periods
                    const validationResult = this.validateAllBuildingArchetypes();
                    if (!validationResult.isValid) {
                        alert(validationResult.message);
                        // Highlight invalid fields
                        this.highlightInvalidPeriodFields(validationResult.invalidFields);
                        return; // Don't save if validation fails
                    }

                    // Filter out empty periods and archetypes without periods
                    this.buildingArchetypes = this.buildingArchetypes.filter(archetype => {
                        // Remove empty periods
                        archetype.periods = archetype.periods.filter(period => {
                            return Object.values(period).some(value => {
                                if (value === null || value === undefined) return false;
                                const strValue = value.toString().trim();
                                return strValue !== '';
                            });
                        });
                        // Keep only archetypes with at least one period
                        return archetype.periods.length > 0;
                    });

                    // Convert to CSV format
                    if (this.buildingArchetypes.length > 0) {
                        const csvData = this.convertBuildingArchetypesToCSV(this.buildingArchetypes);
                        this.surfaceTypesManager.surfaceTypes.buildingArchyTypes = csvData;
                    } else {
                        this.surfaceTypesManager.surfaceTypes.buildingArchyTypes = [];
                    }
                }

                // Validate and filter building groups before saving
                if (this.buildingGroups && this.buildingGroups.length > 0) {
                    // Validate all periods
                    const validationResult = this.validateAllBuildingGroups();
                    if (!validationResult.isValid) {
                        alert(validationResult.message);
                        // Highlight invalid fields
                        this.highlightInvalidGroupPeriodFields(validationResult.invalidFields);
                        return; // Don't save if validation fails
                    }

                    // Filter out empty periods and groups without periods
                    this.buildingGroups = this.buildingGroups.filter(group => {
                        // Remove empty periods
                        group.periods = group.periods.filter(period => {
                            return Object.values(period).some(value => {
                                if (value === null || value === undefined) return false;
                                const strValue = value.toString().trim();
                                return strValue !== '';
                            });
                        });
                        // Keep only groups with at least one period
                        return group.periods.length > 0;
                    });

                    // Convert to CSV format
                    if (this.buildingGroups.length > 0) {
                        const csvData = this.convertBuildingGroupsToCSV(this.buildingGroups);
                        this.surfaceTypesManager.surfaceTypes.buildingGroups = csvData;
                    } else {
                        this.surfaceTypesManager.surfaceTypes.buildingGroups = [];
                    }
                }

                // Filter out empty rows before saving
                const categories = ['roadTypes', 'soilTypes', 'waterTypes', 'groundTypes', 'grassTypes', 'treeTypes', 'buildingArchyTypes', 'buildingGroups'];
                categories.forEach(category => {
                    const types = this.surfaceTypesManager.getSurfaceTypes(category);
                    // Filter out rows where all values are empty
                    const filteredTypes = types.filter(row => {
                        // Check if at least one field has a value
                        return Object.values(row).some(value => {
                            if (value === null || value === undefined) return false;
                            const strValue = value.toString().trim();
                            return strValue !== '';
                        });
                    });
                    // Update the types array with filtered data
                    this.surfaceTypesManager.surfaceTypes[category] = filteredTypes;
                });
                
                this.surfaceTypesManager.saveToLocalStorage();
                
                // Update original data to match saved data
                categories.forEach(category => {
                    const types = this.surfaceTypesManager.getSurfaceTypes(category);
                    this.surfaceTypesOriginalData[category] = JSON.parse(JSON.stringify(types));
                });
                
                // Disable Save button after saving
                this.updateSaveButtonState(false);
                
                alert('Surface types saved successfully! (Empty rows and invalid data were removed)');
            }
            closeDialog();
        };

        if (closeBtn) {
            closeBtn.onclick = cancelDialog;
        }
        if (cancelBtn) {
            cancelBtn.onclick = cancelDialog;
        }
        if (saveBtn) {
            saveBtn.onclick = saveDialog;
        }

        // Close on overlay click (cancel)
        if (dialog) {
            dialog.onclick = (e) => {
                if (e.target === dialog) {
                    cancelDialog();
                }
            };
        }
    }

    /**
     * Setup tab switching for Surface Types Manager
     * Uses event delegation to prevent multiple event listeners
     */
    setupSurfaceTypesTabs() {
        // Check if already set up
        if (this.surfaceTypesTabsSetup) {
            return; // Already set up, don't add listeners again
        }

        const dialog = document.getElementById('surfaceTypesManagerDialog');
        if (!dialog) return;

        // Use event delegation for tab buttons
        dialog.addEventListener('click', (e) => {
            // Handle tab button clicks
            if (e.target.classList.contains('tab-button')) {
                e.stopPropagation();
                const targetTab = e.target.getAttribute('data-tab');
                if (!targetTab) return;
                
                // Remove active class from all tabs and contents
                document.querySelectorAll('#surfaceTypesManagerDialog .tab-button').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('#surfaceTypesManagerDialog .tab-content').forEach(content => content.classList.remove('active'));
                
                // Add active class to clicked tab and corresponding content
                e.target.classList.add('active');
                const targetContent = document.getElementById(`${targetTab}Tab`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
                
                // Reload data for the selected tab
                this.loadSurfaceTypesDataForCategory(targetTab);
                return;
            }
            
            // Handle Add Row button clicks
            if (e.target.classList.contains('add-row-btn')) {
                e.stopPropagation();
                e.preventDefault();
                const category = e.target.getAttribute('data-category');
                if (category) {
                    // Prevent multiple calls by checking if already processing
                    if (e.target.dataset.processing === 'true') {
                        return;
                    }
                    e.target.dataset.processing = 'true';
                    this.addNewRow(category);
                    // Reset after a short delay
                    setTimeout(() => {
                        e.target.dataset.processing = 'false';
                    }, 500);
                }
                return;
            }
        });

        // Mark as set up
        this.surfaceTypesTabsSetup = true;
    }

    /**
     * Load and display all surface types data
     */
    loadSurfaceTypesData() {
        const categories = ['roadTypes', 'soilTypes', 'waterTypes', 'groundTypes', 'grassTypes', 'treeTypes', 'buildingArchyTypes', 'buildingGroups'];
        categories.forEach(category => {
            this.loadSurfaceTypesDataForCategory(category);
        });
    }

    /**
     * Load and display surface types data for a specific category
     * @param {string} category - Category name (roadTypes, soilTypes, waterTypes, groundTypes, grassTypes, treeTypes, buildingArchyTypes, buildingGroups)
     */
    loadSurfaceTypesDataForCategory(category) {
        if (!this.surfaceTypesManager) return;

        // Special handling for buildingArchyTypes
        if (category === 'buildingArchyTypes') {
            this.loadBuildingArchetypesData();
            return;
        }

        // Special handling for buildingGroups
        if (category === 'buildingGroups') {
            this.loadBuildingGroupsData();
            return;
        }

        const types = this.surfaceTypesManager.getSurfaceTypes(category);
        
        // Get table elements
        const tableHead = document.getElementById(`${category}TableHead`);
        const tableBody = document.getElementById(`${category}TableBody`);
        
        if (!tableHead || !tableBody) {
            console.error(`Table elements not found for ${category}`);
            console.error(`Looking for: ${category}TableHead and ${category}TableBody`);
            return;
        }

        // Clear existing content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // Get headers - if no data, use headers from original data or create empty row
        let headers = [];
        if (types.length > 0) {
            headers = Object.keys(types[0]);
        } else {
            // If no data, try to get headers from original data
            if (this.surfaceTypesOriginalData && this.surfaceTypesOriginalData[category] && this.surfaceTypesOriginalData[category].length > 0) {
                headers = Object.keys(this.surfaceTypesOriginalData[category][0]);
            } else {
                // If still no headers, we can't create a table
                console.warn(`No data and no headers found for ${category}`);
                return;
            }
        }

        // Create header row
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            headerRow.appendChild(th);
        });
        // Add Delete column header
        const deleteHeader = document.createElement('th');
        deleteHeader.textContent = 'Actions';
        deleteHeader.style.width = '80px';
        headerRow.appendChild(deleteHeader);
        tableHead.appendChild(headerRow);

        // Create data rows with editable inputs
        types.forEach((type, rowIndex) => {
            const row = document.createElement('tr');
            headers.forEach((header, colIndex) => {
                const td = document.createElement('td');
                const value = type[header];
                
                // Create input field for editing
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'surface-type-input';
                input.value = value !== null && value !== undefined ? value.toString() : '';
                input.dataset.category = category;
                input.dataset.rowIndex = rowIndex;
                input.dataset.header = header;
                
                // Add event listener for changes
                input.addEventListener('blur', () => {
                    this.handleSurfaceTypeChange(category, rowIndex, header, input.value);
                });
                
                // Also save on Enter key
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        input.blur();
                    }
                });
                
                td.appendChild(input);
                row.appendChild(td);
            });
            
            // Add Delete button cell
            const deleteCell = document.createElement('td');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn btn-secondary delete-row-btn';
            deleteBtn.textContent = 'Delete';
            deleteBtn.dataset.category = category;
            deleteBtn.dataset.rowIndex = rowIndex;
            deleteBtn.addEventListener('click', () => {
                this.deleteRow(category, rowIndex);
            });
            deleteCell.appendChild(deleteBtn);
            row.appendChild(deleteCell);
            
            tableBody.appendChild(row);
        });
    }

    /**
     * Handle surface type value change
     * @param {string} category - Category name
     * @param {number} rowIndex - Row index
     * @param {string} header - Column header
     * @param {string} newValue - New value
     */
    handleSurfaceTypeChange(category, rowIndex, header, newValue) {
        if (!this.surfaceTypesManager) return;

        const types = this.surfaceTypesManager.getSurfaceTypes(category);
        if (rowIndex >= types.length) return;

        const type = types[rowIndex];
        const oldValue = type[header];
        
        // Try to parse as number if it's a number field
        const numValue = parseFloat(newValue);
        if (!isNaN(numValue) && newValue.trim() !== '') {
            type[header] = numValue;
        } else {
            type[header] = newValue;
        }

        // Don't save to localStorage here - only save when Save button is clicked
        // Changes are kept in memory until Save is clicked
        
        // Enable Save button when changes are made
        this.updateSaveButtonState(true);
        
        console.log(`Updated ${category}[${rowIndex}].${header}: ${oldValue} -> ${type[header]} (not saved yet)`);
    }

    /**
     * Add a new row to a surface type category
     * @param {string} category - Category name (roadTypes, soilTypes, waterTypes, groundTypes, grassTypes, treeTypes)
     */
    addNewRow(category) {
        if (!this.surfaceTypesManager) return;

        const types = this.surfaceTypesManager.getSurfaceTypes(category);
        
        // Get headers from existing data or original data
        let headers = [];
        if (types.length > 0) {
            headers = Object.keys(types[0]);
        } else if (this.surfaceTypesOriginalData && this.surfaceTypesOriginalData[category] && this.surfaceTypesOriginalData[category].length > 0) {
            headers = Object.keys(this.surfaceTypesOriginalData[category][0]);
        } else {
            alert('Cannot add row: No existing data structure found');
            return;
        }

        // Create new empty object with all headers
        const newRow = {};
        headers.forEach(header => {
            newRow[header] = '';
        });

        // Add to types array
        types.push(newRow);
        const newRowIndex = types.length - 1;

        // Reload the table to show the new row
        this.loadSurfaceTypesDataForCategory(category);
        
        // Enable Save button when a new row is added
        this.updateSaveButtonState(true);
        
        // Scroll to the new row after a short delay to ensure DOM is updated
        setTimeout(() => {
            this.scrollToRow(category, newRowIndex);
        }, 100);
        
        console.log(`Added new row to ${category}`);
    }

    /**
     * Scroll to a specific row in the table
     * @param {string} category - Category name
     * @param {number} rowIndex - Index of the row to scroll to
     */
    scrollToRow(category, rowIndex) {
        const tableBody = document.getElementById(`${category}TableBody`);
        const tableContainer = tableBody ? tableBody.closest('.surface-types-table-container') : null;
        
        if (!tableBody || !tableContainer) {
            console.warn(`Table elements not found for scrolling to row ${rowIndex} in ${category}`);
            return;
        }

        // Get all rows
        const rows = tableBody.querySelectorAll('tr');
        if (rowIndex >= 0 && rowIndex < rows.length) {
            const targetRow = rows[rowIndex];
            
            // Scroll the container to show the target row
            const containerRect = tableContainer.getBoundingClientRect();
            const rowRect = targetRow.getBoundingClientRect();
            
            // Calculate scroll position
            const scrollTop = tableContainer.scrollTop;
            const rowOffset = rowRect.top - containerRect.top + scrollTop;
            
            // Scroll to the row (with some padding at the top)
            tableContainer.scrollTo({
                top: rowOffset - 20, // 20px padding from top
                behavior: 'smooth'
            });
            
            // Also focus on the first input field of the new row
            const firstInput = targetRow.querySelector('.surface-type-input');
            if (firstInput) {
                setTimeout(() => {
                    firstInput.focus();
                }, 200);
            }
        }
    }

    /**
     * Delete a row from a surface type category
     * @param {string} category - Category name (roadTypes, soilTypes, waterTypes, groundTypes, grassTypes, treeTypes)
     * @param {number} rowIndex - Index of the row to delete
     */
    deleteRow(category, rowIndex) {
        if (!this.surfaceTypesManager) return;

        const types = this.surfaceTypesManager.getSurfaceTypes(category);
        if (rowIndex < 0 || rowIndex >= types.length) {
            console.error(`Invalid row index: ${rowIndex}`);
            return;
        }

        // Confirm deletion
        if (!confirm('Are you sure you want to delete this row?')) {
            return;
        }

        // Remove the row from the array
        types.splice(rowIndex, 1);

        // Reload the table to reflect the deletion
        this.loadSurfaceTypesDataForCategory(category);
        
        // Enable Save button when a row is deleted
        this.updateSaveButtonState(true);
        
        console.log(`Deleted row ${rowIndex} from ${category}`);
    }

    /**
     * Update Save button state (enabled/disabled)
     * @param {boolean} enabled - Whether to enable the button
     */
    updateSaveButtonState(enabled) {
        const saveBtn = document.getElementById('surfaceTypesManagerDialogSave');
        if (saveBtn) {
            saveBtn.disabled = !enabled;
            if (enabled) {
                saveBtn.classList.remove('btn-disabled');
                saveBtn.style.opacity = '1';
                saveBtn.style.cursor = 'pointer';
            } else {
                saveBtn.classList.add('btn-disabled');
                saveBtn.style.opacity = '0.5';
                saveBtn.style.cursor = 'not-allowed';
            }
        }
    }

    /**
     * Import Surface Types from file
     */
    importSurfaceTypes() {
        if (!this.surfaceTypesManager) {
            console.error('SurfaceTypesManager not available');
            alert('Surface Types Manager is not initialized');
            return;
        }

        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const csvContent = event.target.result;
                
                // Ask user which category to import into
                const category = prompt('Enter category (roadTypes, soilTypes, waterTypes, groundTypes, grassTypes, treeTypes, buildingArchyTypes, buildingGroups):');
                if (!category || !['roadTypes', 'soilTypes', 'waterTypes', 'groundTypes', 'grassTypes', 'treeTypes', 'buildingArchyTypes', 'buildingGroups'].includes(category)) {
                    alert('Invalid category');
                    return;
                }

                try {
                    this.surfaceTypesManager.importFromCSV(category, csvContent);
                    alert(`Successfully imported ${category}`);
                    console.log(`Imported ${category} from ${file.name}`);
                } catch (error) {
                    console.error('Error importing CSV:', error);
                    alert('Error importing CSV file: ' + error.message);
                }
            };
            reader.readAsText(file);
        };
        input.click();
    }

    /**
     * Export Surface Types to file
     */
    exportSurfaceTypes() {
        if (!this.surfaceTypesManager) {
            console.error('SurfaceTypesManager not available');
            alert('Surface Types Manager is not initialized');
            return;
        }

        // Ask user which category to export
        const category = prompt('Enter category to export (roadTypes, soilTypes, waterTypes, groundTypes, grassTypes, treeTypes, buildingArchyTypes, buildingGroups) or "all" for all categories:');
        if (!category) return;

        if (category === 'all') {
            // Export all categories
            const categories = ['roadTypes', 'soilTypes', 'waterTypes', 'groundTypes', 'grassTypes', 'treeTypes', 'buildingArchyTypes', 'buildingGroups'];
            categories.forEach(cat => {
                this.surfaceTypesManager.downloadCSV(cat, `${cat}.csv`);
            });
            alert('All categories exported successfully');
        } else if (['roadTypes', 'soilTypes', 'waterTypes', 'groundTypes', 'grassTypes', 'treeTypes', 'buildingArchyTypes', 'buildingGroups'].includes(category)) {
            this.surfaceTypesManager.downloadCSV(category, `${category}.csv`);
            alert(`${category} exported successfully`);
        } else {
            alert('Invalid category');
        }
    }

    /**
     * Load and display Building Archetypes data
     */
    loadBuildingArchetypesData() {
        if (!this.surfaceTypesManager) return;

        // Parse building archetypes from CSV structure
        const rawData = this.surfaceTypesManager.getSurfaceTypes('buildingArchyTypes');
        const archetypes = this.parseBuildingArchetypes(rawData);

        // Store parsed archetypes
        this.buildingArchetypes = archetypes;

        // Populate archetype selector
        this.populateArchetypeSelector(archetypes);

        // Setup event listeners if not already set up
        if (!this.buildingArchetypesListenersSetup) {
            this.setupBuildingArchetypesListeners();
            this.buildingArchetypesListenersSetup = true;
        }

        // If an archetype is selected, load it
        const selector = document.getElementById('archetypeSelector');
        if (selector && selector.value) {
            this.loadArchetype(selector.value);
        }
    }

    /**
     * Parse building archetypes from raw CSV data
     * @param {Array} rawData - Raw CSV data
     * @returns {Array} Parsed archetypes array
     */
    parseBuildingArchetypes(rawData) {
        const archetypes = [];
        let currentArchetype = null;
        let expectingConfig = false; // Track if we're expecting configuration rows

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Skip completely empty rows
            const hasValue = Object.values(row).some(val => val !== null && val !== undefined && val.toString().trim() !== '');
            if (!hasValue) {
                // Empty row indicates end of current archetype
                if (currentArchetype) {
                    archetypes.push(currentArchetype);
                    currentArchetype = null;
                    expectingConfig = false;
                }
                continue;
            }

            // Get the first key and value from the row
            const keys = Object.keys(row);
            const firstKey = keys[0];
            const firstValue = row[firstKey];

            // Check if this row defines usage_group_building_name (start of new archetype)
            if (firstKey === 'usage_group_building_name' && firstValue && firstValue.toString().trim() !== '') {
                // Save previous archetype if exists
                if (currentArchetype) {
                    archetypes.push(currentArchetype);
                }

                // Start new archetype
                currentArchetype = {
                    usage_group_building_name: firstValue.toString().trim(),
                    number_of_wall_layers: 1,
                    number_of_roof_layers: 1,
                    number_of_floor_layers: 1,
                    periods: []
                };
                expectingConfig = true; // Next rows should be configuration
                continue;
            }

            // If we have a current archetype and expecting configuration
            if (currentArchetype && expectingConfig) {
                // Check for number_of_wall_layers
                if (firstKey === 'number_of_wall_layers' && firstValue && firstValue.toString().trim() !== '') {
                    currentArchetype.number_of_wall_layers = parseInt(firstValue) || 1;
                    continue;
                }

                // Check for number_of_roof_layers
                if (firstKey === 'number_of_roof_layers' && firstValue && firstValue.toString().trim() !== '') {
                    currentArchetype.number_of_roof_layers = parseInt(firstValue) || 1;
                    continue;
                }

                // Check for number_of_floor_layers
                if (firstKey === 'number_of_floor_layers' && firstValue && firstValue.toString().trim() !== '') {
                    currentArchetype.number_of_floor_layers = parseInt(firstValue) || 1;
                    continue;
                }

                // If we hit a header row (startPeriod as first key and value), we're done with config
                if (firstKey === 'startPeriod' && firstValue === 'startPeriod') {
                    expectingConfig = false;
                    continue; // Skip header row
                }
            }

            // If we have a current archetype and not expecting config, this should be a period row
            if (currentArchetype && !expectingConfig) {
                // Check if this is a header row (skip it)
                if (firstKey === 'startPeriod' && firstValue === 'startPeriod') {
                    continue; // Skip header row
                }

                // This is a period row - it should have startPeriod as a key
                if (row.startPeriod !== undefined && row.startPeriod !== 'startPeriod') {
                    currentArchetype.periods.push(row);
                }
            }

            // If we don't have a current archetype and this is not a usage_group_building_name row,
            // skip it (it might be a leftover config row from previous archetype or invalid data)
            if (!currentArchetype && firstKey !== 'usage_group_building_name') {
                continue;
            }
        }

        // Add last archetype
        if (currentArchetype) {
            archetypes.push(currentArchetype);
        }

        // Filter out any invalid archetypes (those without proper usage_group_building_name)
        const validArchetypes = archetypes.filter(archetype => {
            return archetype.usage_group_building_name && 
                   archetype.usage_group_building_name.trim() !== '' &&
                   archetype.usage_group_building_name !== 'number_of_wall_layers' &&
                   archetype.usage_group_building_name !== 'number_of_roof_layers' &&
                   archetype.usage_group_building_name !== 'number_of_floor_layers';
        });

        return validArchetypes;
    }

    /**
     * Populate archetype selector dropdown
     * @param {Array} archetypes - Array of archetypes
     */
    populateArchetypeSelector(archetypes) {
        const selector = document.getElementById('archetypeSelector');
        if (!selector) return;

        selector.innerHTML = ''; // Clear existing options
        
        // Only show archetypes that have a valid usage_group_building_name
        archetypes.forEach((archetype, index) => {
            // Filter out invalid archetypes (those without usage_group_building_name)
            if (!archetype.usage_group_building_name || 
                archetype.usage_group_building_name.trim() === '' ||
                archetype.usage_group_building_name === 'number_of_wall_layers' ||
                archetype.usage_group_building_name === 'number_of_roof_layers' ||
                archetype.usage_group_building_name === 'number_of_floor_layers') {
                return; // Skip invalid archetypes
            }

            const option = document.createElement('option');
            option.value = index;
            option.textContent = archetype.usage_group_building_name || `Archetype ${index + 1}`;
            selector.appendChild(option);
        });
    }

    /**
     * Setup event listeners for Building Archetypes
     */
    setupBuildingArchetypesListeners() {
        // Archetype selector change
        const selector = document.getElementById('archetypeSelector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                if (e.target.value !== '') {
                    this.loadArchetype(e.target.value);
                }
            });
        }

        // Create new archetype button
        const createNewBtn = document.getElementById('createNewArchetypeBtn');
        if (createNewBtn) {
            createNewBtn.addEventListener('click', () => {
                this.createNewArchetype();
            });
        }

        // Save configuration button
        const saveConfigBtn = document.getElementById('saveArchetypeConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveArchetypeConfiguration();
            });
        }

        // Reset configuration button
        const resetConfigBtn = document.getElementById('resetArchetypeConfigBtn');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => {
                this.resetArchetypeForm();
            });
        }

        // Delete archetype button
        const deleteBtn = document.getElementById('deleteArchetypeBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteArchetype();
            });
        }

        // Add period row button
        const addPeriodBtn = document.getElementById('addPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.addEventListener('click', () => {
                this.addPeriodRow();
            });
        }

        // Layer number changes - rebuild table
        const wallLayers = document.getElementById('wallLayers');
        const roofLayers = document.getElementById('roofLayers');
        const floorLayers = document.getElementById('floorLayers');
        
        [wallLayers, roofLayers, floorLayers].forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    // If an archetype is loaded, rebuild the table
                    const selector = document.getElementById('archetypeSelector');
                    if (selector && selector.value !== '') {
                        this.rebuildArchetypeTable();
                    }
                });
            }
        });
    }

    /**
     * Load an archetype into the form and table
     * @param {string} archetypeIndex - Index of archetype in array
     */
    loadArchetype(archetypeIndex) {
        if (!this.buildingArchetypes) return;

        const index = parseInt(archetypeIndex);
        if (isNaN(index) || index < 0 || index >= this.buildingArchetypes.length) return;

        const archetype = this.buildingArchetypes[index];
        this.currentArchetypeIndex = index;

        // Fill form
        document.getElementById('archetypeName').value = archetype.usage_group_building_name || '';
        document.getElementById('wallLayers').value = archetype.number_of_wall_layers || 1;
        document.getElementById('roofLayers').value = archetype.number_of_roof_layers || 1;
        document.getElementById('floorLayers').value = archetype.number_of_floor_layers || 1;

        // Show delete button
        const deleteBtn = document.getElementById('deleteArchetypeBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }

        // Enable add period button
        const addPeriodBtn = document.getElementById('addPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = false;
        }

        // Rebuild table
        this.rebuildArchetypeTable();
    }

    /**
     * Rebuild archetype table based on current layer configuration
     */
    rebuildArchetypeTable() {
        if (!this.buildingArchetypes || this.currentArchetypeIndex === undefined) return;

        const archetype = this.buildingArchetypes[this.currentArchetypeIndex];
        const wallLayers = parseInt(document.getElementById('wallLayers').value) || 1;
        const roofLayers = parseInt(document.getElementById('roofLayers').value) || 1;
        const floorLayers = parseInt(document.getElementById('floorLayers').value) || 1;

        // Update archetype layer counts
        archetype.number_of_wall_layers = wallLayers;
        archetype.number_of_roof_layers = roofLayers;
        archetype.number_of_floor_layers = floorLayers;

        // Generate headers based on layer counts
        const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);

        // Get table elements
        const tableHead = document.getElementById('buildingArchyTypesTableHead');
        const tableBody = document.getElementById('buildingArchyTypesTableBody');

        if (!tableHead || !tableBody) return;

        // Clear existing content
        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        // Create header row
        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.minWidth = '120px';
            headerRow.appendChild(th);
        });
        // Add Actions column
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Actions';
        actionsHeader.style.width = '80px';
        headerRow.appendChild(actionsHeader);
        tableHead.appendChild(headerRow);

        // Create data rows
        archetype.periods.forEach((period, rowIndex) => {
            const row = this.createArchetypePeriodRow(period, headers, rowIndex);
            tableBody.appendChild(row);
        });
    }

    /**
     * Generate table headers based on layer counts
     * @param {number} wallLayers - Number of wall layers
     * @param {number} roofLayers - Number of roof layers
     * @param {number} floorLayers - Number of floor layers
     * @returns {Array} Array of header names
     */
    generateArchetypeHeaders(wallLayers, roofLayers, floorLayers) {
        const headers = ['startPeriod', 'endPeriod', 'Uvalue_window(W/m2/K)', 'windowSHGC(-)', 'windowEmissivity(-)'];

        // Add ThermalConductivity columns
        for (let i = 1; i <= wallLayers; i++) {
            headers.push(`ThermalConductivity_wall${i}[Wm-1K-1]`);
        }
        for (let i = 1; i <= roofLayers; i++) {
            headers.push(`ThermalConductivity_roof${i}[Wm-1K-1]`);
        }
        for (let i = 1; i <= floorLayers; i++) {
            headers.push(`ThermalConductivity_floor${i}[Wm-1K-1]`);
        }

        // Add SpecificHeat columns
        for (let i = 1; i <= wallLayers; i++) {
            headers.push(`SpecificHeat_wall${i}[Jkg-1K-1]`);
        }
        for (let i = 1; i <= roofLayers; i++) {
            headers.push(`SpecificHeat_roof${i}[Jkg-1K-1]`);
        }
        for (let i = 1; i <= floorLayers; i++) {
            headers.push(`SpecificHeat_floor${i}[Jkg-1K-1]`);
        }

        // Add Density columns
        for (let i = 1; i <= wallLayers; i++) {
            headers.push(`Density_wall${i}[kgm-3]`);
        }
        for (let i = 1; i <= roofLayers; i++) {
            headers.push(`Density_roof${i}[kgm-3]`);
        }
        for (let i = 1; i <= floorLayers; i++) {
            headers.push(`Density_floor${i}[kgm-3]`);
        }

        // Add Thickness columns
        for (let i = 1; i <= wallLayers; i++) {
            headers.push(`Thickness_wall${i}[m]`);
        }
        for (let i = 1; i <= roofLayers; i++) {
            headers.push(`Thickness_roof${i}[m]`);
        }
        for (let i = 1; i <= floorLayers; i++) {
            headers.push(`Thickness_floor${i}[m]`);
        }

        // Add Albedo and Emissivity columns
        headers.push('wallAlbedo(-)', 'roofAlbedo(-)', 'floorAlbedo(-)');
        headers.push('wallEmissivity(-)', 'roofEmissivity(-)', 'floorEmissivity(-)');

        return headers;
    }

    /**
     * Create a table row for a period
     * @param {Object} period - Period data object
     * @param {Array} headers - Array of header names
     * @param {number} rowIndex - Index of the row
     * @returns {HTMLElement} Table row element
     */
    createArchetypePeriodRow(period, headers, rowIndex) {
        const row = document.createElement('tr');

        headers.forEach(header => {
            const td = document.createElement('td');
            const value = period[header] !== undefined ? period[header] : '';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'surface-type-input';
            input.value = value !== null && value !== undefined ? value.toString() : '';
            input.dataset.category = 'buildingArchyTypes';
            input.dataset.rowIndex = rowIndex;
            input.dataset.header = header;
            input.style.width = '100%';
            input.style.padding = '3px';
            
            input.addEventListener('blur', () => {
                this.handleArchetypePeriodChange(rowIndex, header, input.value);
                this.validatePeriodField(input, header, input.value);
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
            
            // Initial validation
            this.validatePeriodField(input, header, input.value);
            
            td.appendChild(input);
            row.appendChild(td);
        });

        // Add Delete button
        const deleteCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-secondary delete-row-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.dataset.rowIndex = rowIndex;
        deleteBtn.addEventListener('click', () => {
            this.deletePeriodRow(rowIndex);
        });
        deleteCell.appendChild(deleteBtn);
        row.appendChild(deleteCell);

        return row;
    }

    /**
     * Validate a period field and apply red border if invalid
     * @param {HTMLElement} input - Input element
     * @param {string} header - Field header name
     * @param {string} value - Field value
     */
    validatePeriodField(input, header, value) {
        if (!input || !header) return true;
        
        const trimmedValue = value.toString().trim();
        const isEmpty = trimmedValue === '' || trimmedValue === null || trimmedValue === undefined;
        
        // Check if this is a numeric field
        const isNumericField = header.includes('ThermalConductivity') || 
                              header.includes('SpecificHeat') || 
                              header.includes('Density') || 
                              header.includes('Thickness') ||
                              header.includes('Uvalue') ||
                              header.includes('SHGC') ||
                              header.includes('Emissivity') ||
                              header.includes('Albedo');
        
        let isValid = true;
        if (isEmpty) {
            isValid = false;
        } else if (isNumericField) {
            const numValue = parseFloat(trimmedValue);
            if (isNaN(numValue)) {
                isValid = false;
            }
        }
        
        // Apply red border if invalid
        if (!isValid) {
            input.style.border = '2px solid red';
            input.style.backgroundColor = '#ffe6e6';
        } else {
            input.style.border = '';
            input.style.backgroundColor = '';
        }
        
        return isValid;
    }

    /**
     * Validate a period field and apply red border if invalid
     * @param {HTMLElement} input - Input element
     * @param {string} header - Field header name
     * @param {string} value - Field value
     */
    validatePeriodField(input, header, value) {
        if (!input || !header) return true;
        
        const trimmedValue = value.toString().trim();
        const isEmpty = trimmedValue === '' || trimmedValue === null || trimmedValue === undefined;
        
        // Check if this is a numeric field
        const isNumericField = header.includes('ThermalConductivity') || 
                              header.includes('SpecificHeat') || 
                              header.includes('Density') || 
                              header.includes('Thickness') ||
                              header.includes('Uvalue') ||
                              header.includes('SHGC') ||
                              header.includes('Emissivity') ||
                              header.includes('Albedo');
        
        let isValid = true;
        if (isEmpty) {
            isValid = false;
        } else if (isNumericField) {
            const numValue = parseFloat(trimmedValue);
            if (isNaN(numValue)) {
                isValid = false;
            }
        }
        
        // Apply red border if invalid
        if (!isValid) {
            input.style.border = '2px solid red';
            input.style.backgroundColor = '#ffe6e6';
        } else {
            input.style.border = '';
            input.style.backgroundColor = '';
        }
        
        return isValid;
    }

    /**
     * Handle period data change
     * @param {number} rowIndex - Row index
     * @param {string} header - Column header
     * @param {string} newValue - New value
     */
    handleArchetypePeriodChange(rowIndex, header, newValue) {
        if (!this.buildingArchetypes || this.currentArchetypeIndex === undefined) return;

        const archetype = this.buildingArchetypes[this.currentArchetypeIndex];
        if (rowIndex >= archetype.periods.length) return;

        const period = archetype.periods[rowIndex];
        const numValue = parseFloat(newValue);
        period[header] = (!isNaN(numValue) && newValue.trim() !== '') ? numValue : newValue;

        this.updateSaveButtonState(true);
    }

    /**
     * Validate all building archetypes and their periods
     * @returns {Object} Validation result with isValid, message, and invalidFields
     */
    validateAllBuildingArchetypes() {
        if (!this.buildingArchetypes || this.buildingArchetypes.length === 0) {
            return { isValid: true, message: '', invalidFields: [] };
        }

        const invalidFields = [];

        this.buildingArchetypes.forEach((archetype, archetypeIndex) => {
            if (!archetype.periods || archetype.periods.length === 0) {
                invalidFields.push({
                    archetypeIndex,
                    archetypeName: archetype.usage_group_building_name,
                    message: `Archetype "${archetype.usage_group_building_name}" has no period data`
                });
                return;
            }

            const wallLayers = archetype.number_of_wall_layers || 1;
            const roofLayers = archetype.number_of_roof_layers || 1;
            const floorLayers = archetype.number_of_floor_layers || 1;
            const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);

            archetype.periods.forEach((period, periodIndex) => {
                headers.forEach(header => {
                    const value = period[header];
                    const trimmedValue = value !== null && value !== undefined ? value.toString().trim() : '';
                    const isEmpty = trimmedValue === '';

                    // Check if this is a numeric field
                    const isNumericField = header.includes('ThermalConductivity') || 
                                          header.includes('SpecificHeat') || 
                                          header.includes('Density') || 
                                          header.includes('Thickness') ||
                                          header.includes('Uvalue') ||
                                          header.includes('SHGC') ||
                                          header.includes('Emissivity') ||
                                          header.includes('Albedo');

                    if (isEmpty) {
                        invalidFields.push({
                            archetypeIndex,
                            periodIndex,
                            header,
                            archetypeName: archetype.usage_group_building_name,
                            message: `Empty field "${header}" in period ${periodIndex + 1} of archetype "${archetype.usage_group_building_name}"`
                        });
                    } else if (isNumericField) {
                        const numValue = parseFloat(trimmedValue);
                        if (isNaN(numValue)) {
                            invalidFields.push({
                                archetypeIndex,
                                periodIndex,
                                header,
                                archetypeName: archetype.usage_group_building_name,
                                message: `Invalid numeric value "${trimmedValue}" in field "${header}" of period ${periodIndex + 1} of archetype "${archetype.usage_group_building_name}"`
                            });
                        }
                    }
                });
            });
        });

        if (invalidFields.length > 0) {
            const messages = invalidFields.map(f => f.message).slice(0, 5); // Show first 5 errors
            const message = `Please fix the following errors before saving:\n\n${messages.join('\n')}${invalidFields.length > 5 ? `\n... and ${invalidFields.length - 5} more errors` : ''}`;
            return { isValid: false, message, invalidFields };
        }

        return { isValid: true, message: '', invalidFields: [] };
    }

    /**
     * Highlight invalid period fields in the table
     * @param {Array} invalidFields - Array of invalid field information
     */
    highlightInvalidPeriodFields(invalidFields) {
        if (!invalidFields || invalidFields.length === 0) return;

        const tableBody = document.getElementById('buildingArchyTypesTableBody');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        
        invalidFields.forEach(field => {
            if (field.periodIndex !== undefined && field.header) {
                const row = rows[field.periodIndex];
                if (row) {
                    const inputs = row.querySelectorAll('input');
                    inputs.forEach(input => {
                        if (input.dataset.header === field.header) {
                            input.style.border = '2px solid red';
                            input.style.backgroundColor = '#ffe6e6';
                            input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    });
                }
            }
        });
    }

    /**
     * Add a new period row with default values
     */
    addPeriodRow() {
        if (!this.buildingArchetypes || this.currentArchetypeIndex === undefined) return;

        const archetype = this.buildingArchetypes[this.currentArchetypeIndex];
        const wallLayers = archetype.number_of_wall_layers || 1;
        const roofLayers = archetype.number_of_roof_layers || 1;
        const floorLayers = archetype.number_of_floor_layers || 1;

        // Create new period with default values
        const newPeriod = this.createDefaultPeriod(wallLayers, roofLayers, floorLayers);

        archetype.periods.push(newPeriod);
        const newRowIndex = archetype.periods.length - 1;

        // Rebuild table
        this.rebuildArchetypeTable();

        // Scroll to new row
        setTimeout(() => {
            const tableBody = document.getElementById('buildingArchyTypesTableBody');
            if (tableBody) {
                const rows = tableBody.querySelectorAll('tr');
                if (newRowIndex < rows.length) {
                    rows[newRowIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, 100);

        this.updateSaveButtonState(true);
    }

    /**
     * Delete a period row
     * @param {number} rowIndex - Index of row to delete
     */
    deletePeriodRow(rowIndex) {
        if (!this.buildingArchetypes || this.currentArchetypeIndex === undefined) return;

        const archetype = this.buildingArchetypes[this.currentArchetypeIndex];
        if (rowIndex >= 0 && rowIndex < archetype.periods.length) {
            archetype.periods.splice(rowIndex, 1);
            this.rebuildArchetypeTable();
            this.updateSaveButtonState(true);
        }
    }

    /**
     * Create default period data based on layer counts
     * @param {number} wallLayers - Number of wall layers
     * @param {number} roofLayers - Number of roof layers
     * @param {number} floorLayers - Number of floor layers
     * @returns {Object} Default period object
     */
    createDefaultPeriod(wallLayers, roofLayers, floorLayers) {
        const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
        const defaultPeriod = {};
        
        // Default values for 1 layer case
        const defaultValues = {
            'startPeriod': '2010',
            'endPeriod': '2013',
            'Uvalue_window(W/m2/K)': 1.6,
            'windowSHGC(-)': 0.31,
            'windowEmissivity(-)': 0.84,
            'ThermalConductivity_wall1[Wm-1K-1]': 0.8,
            'ThermalConductivity_roof1[Wm-1K-1]': 0.8,
            'ThermalConductivity_floor1[Wm-1K-1]': 0.8,
            'SpecificHeat_wall1[Jkg-1K-1]': 800,
            'SpecificHeat_roof1[Jkg-1K-1]': 800,
            'SpecificHeat_floor1[Jkg-1K-1]': 800,
            'Density_wall1[kgm-3]': 2000,
            'Density_roof1[kgm-3]': 2000,
            'Density_floor1[kgm-3]': 2000,
            'Thickness_wall1[m]': 0.2,
            'Thickness_roof1[m]': 0.2,
            'Thickness_floor1[m]': 0.2,
            'wallAlbedo(-)': 0.3,
            'roofAlbedo(-)': 0.1,
            'floorAlbedo(-)': 0.7,
            'wallEmissivity(-)': 0.8,
            'roofEmissivity(-)': 0.8,
            'floorEmissivity(-)': 0.8
        };

        headers.forEach(header => {
            if (defaultValues[header] !== undefined) {
                defaultPeriod[header] = defaultValues[header];
            } else {
                // For additional layers (wall2, roof2, etc.), copy from layer 1
                if (header.includes('_wall') && !header.includes('_wall1')) {
                    const layer1Header = header.replace(/wall\d+/, 'wall1');
                    defaultPeriod[header] = defaultPeriod[layer1Header] || defaultValues[layer1Header] || '';
                } else if (header.includes('_roof') && !header.includes('_roof1')) {
                    const layer1Header = header.replace(/roof\d+/, 'roof1');
                    defaultPeriod[header] = defaultPeriod[layer1Header] || defaultValues[layer1Header] || '';
                } else if (header.includes('_floor') && !header.includes('_floor1')) {
                    const layer1Header = header.replace(/floor\d+/, 'floor1');
                    defaultPeriod[header] = defaultPeriod[layer1Header] || defaultValues[layer1Header] || '';
                } else {
                    defaultPeriod[header] = '';
                }
            }
        });

        return defaultPeriod;
    }

    /**
     * Save archetype configuration
     */
    saveArchetypeConfiguration() {
        const name = document.getElementById('archetypeName').value.trim();
        if (!name) {
            alert('Please enter a Usage Group Building Name');
            return;
        }

        const wallLayers = parseInt(document.getElementById('wallLayers').value) || 1;
        const roofLayers = parseInt(document.getElementById('roofLayers').value) || 1;
        const floorLayers = parseInt(document.getElementById('floorLayers').value) || 1;

        if (!this.buildingArchetypes) {
            this.buildingArchetypes = [];
        }

        const isNewArchetype = this.currentArchetypeIndex === undefined;

        if (this.currentArchetypeIndex !== undefined) {
            // Update existing archetype
            const archetype = this.buildingArchetypes[this.currentArchetypeIndex];
            const oldWallLayers = archetype.number_of_wall_layers || 1;
            const oldRoofLayers = archetype.number_of_roof_layers || 1;
            const oldFloorLayers = archetype.number_of_floor_layers || 1;
            
            archetype.usage_group_building_name = name;
            archetype.number_of_wall_layers = wallLayers;
            archetype.number_of_roof_layers = roofLayers;
            archetype.number_of_floor_layers = floorLayers;

            // If layers increased, copy layer 1 values to new layers
            if (wallLayers > oldWallLayers || roofLayers > oldRoofLayers || floorLayers > oldFloorLayers) {
                this.copyLayer1ValuesToNewLayers(archetype, oldWallLayers, oldRoofLayers, oldFloorLayers, wallLayers, roofLayers, floorLayers);
            }
        } else {
            // Create new archetype with default period
            const newArchetype = {
                usage_group_building_name: name,
                number_of_wall_layers: wallLayers,
                number_of_roof_layers: roofLayers,
                number_of_floor_layers: floorLayers,
                periods: []
            };
            
            // Add default period for new archetype
            const defaultPeriod = this.createDefaultPeriod(wallLayers, roofLayers, floorLayers);
            newArchetype.periods.push(defaultPeriod);
            
            this.buildingArchetypes.push(newArchetype);
            this.currentArchetypeIndex = this.buildingArchetypes.length - 1;

            // Update selector
            this.populateArchetypeSelector(this.buildingArchetypes);
            document.getElementById('archetypeSelector').value = this.currentArchetypeIndex;
        }

        // Rebuild table
        this.rebuildArchetypeTable();

        // Show delete button
        const deleteBtn = document.getElementById('deleteArchetypeBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }

        // Enable add period button
        const addPeriodBtn = document.getElementById('addPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = false;
        }

        this.updateSaveButtonState(true);
    }

    /**
     * Copy layer 1 values to new layers when layer count increases
     * @param {Object} archetype - Archetype object
     * @param {number} oldWallLayers - Previous wall layer count
     * @param {number} oldRoofLayers - Previous roof layer count
     * @param {number} oldFloorLayers - Previous floor layer count
     * @param {number} newWallLayers - New wall layer count
     * @param {number} newRoofLayers - New roof layer count
     * @param {number} newFloorLayers - New floor layer count
     */
    copyLayer1ValuesToNewLayers(archetype, oldWallLayers, oldRoofLayers, oldFloorLayers, newWallLayers, newRoofLayers, newFloorLayers) {
        const headers = this.generateArchetypeHeaders(newWallLayers, newRoofLayers, newFloorLayers);
        
        archetype.periods.forEach(period => {
            headers.forEach(header => {
                // Check if this is a new layer header (wall2, roof2, etc.)
                const wallMatch = header.match(/^(.+)_wall(\d+)\[/);
                const roofMatch = header.match(/^(.+)_roof(\d+)\[/);
                const floorMatch = header.match(/^(.+)_floor(\d+)\[/);
                
                if (wallMatch) {
                    const prop = wallMatch[1];
                    const layerNum = parseInt(wallMatch[2]);
                    if (layerNum > oldWallLayers && layerNum <= newWallLayers) {
                        const layer1Header = `${prop}_wall1[${header.split('[')[1]}`;
                        if (period[layer1Header] !== undefined) {
                            period[header] = period[layer1Header];
                        }
                    }
                } else if (roofMatch) {
                    const prop = roofMatch[1];
                    const layerNum = parseInt(roofMatch[2]);
                    if (layerNum > oldRoofLayers && layerNum <= newRoofLayers) {
                        const layer1Header = `${prop}_roof1[${header.split('[')[1]}`;
                        if (period[layer1Header] !== undefined) {
                            period[header] = period[layer1Header];
                        }
                    }
                } else if (floorMatch) {
                    const prop = floorMatch[1];
                    const layerNum = parseInt(floorMatch[2]);
                    if (layerNum > oldFloorLayers && layerNum <= newFloorLayers) {
                        const layer1Header = `${prop}_floor1[${header.split('[')[1]}`;
                        if (period[layer1Header] !== undefined) {
                            period[header] = period[layer1Header];
                        }
                    }
                }
            });
        });
    }

    /**
     * Create new archetype (reset form and clear period data)
     */
    createNewArchetype() {
        // Reset form
        document.getElementById('archetypeName').value = '';
        document.getElementById('wallLayers').value = 1;
        document.getElementById('roofLayers').value = 1;
        document.getElementById('floorLayers').value = 1;

        // Clear selector
        const selector = document.getElementById('archetypeSelector');
        if (selector) {
            selector.value = '';
        }

        // Hide delete button
        const deleteBtn = document.getElementById('deleteArchetypeBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        // Enable add period button
        const addPeriodBtn = document.getElementById('addPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = false;
        }

        // Reset current archetype index
        this.currentArchetypeIndex = undefined;

        // Clear period data table
        const tableHead = document.getElementById('buildingArchyTypesTableHead');
        const tableBody = document.getElementById('buildingArchyTypesTableBody');
        if (tableHead) tableHead.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';

        // Focus on name input
        setTimeout(() => {
            document.getElementById('archetypeName').focus();
        }, 100);
    }

    /**
     * Create new archetype (reset form and clear period data)
     */
    createNewArchetype() {
        // Reset form
        document.getElementById('archetypeName').value = '';
        document.getElementById('wallLayers').value = 1;
        document.getElementById('roofLayers').value = 1;
        document.getElementById('floorLayers').value = 1;

        // Clear selector
        const selector = document.getElementById('archetypeSelector');
        if (selector) {
            selector.value = '';
        }

        // Hide delete button
        const deleteBtn = document.getElementById('deleteArchetypeBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        // Enable add period button
        const addPeriodBtn = document.getElementById('addPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = false;
        }

        // Reset current archetype index
        this.currentArchetypeIndex = undefined;

        // Clear period data table
        const tableHead = document.getElementById('buildingArchyTypesTableHead');
        const tableBody = document.getElementById('buildingArchyTypesTableBody');
        if (tableHead) tableHead.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';

        // Focus on name input
        setTimeout(() => {
            document.getElementById('archetypeName').focus();
        }, 100);
    }

    /**
     * Reset archetype form
     */
    resetArchetypeForm() {
        document.getElementById('archetypeName').value = '';
        document.getElementById('wallLayers').value = 1;
        document.getElementById('roofLayers').value = 1;
        document.getElementById('floorLayers').value = 1;

        const selector = document.getElementById('archetypeSelector');
        if (selector) {
            selector.value = '';
        }

        const deleteBtn = document.getElementById('deleteArchetypeBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        const addPeriodBtn = document.getElementById('addPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = true;
        }

        this.currentArchetypeIndex = undefined;

        // Clear table
        const tableHead = document.getElementById('buildingArchyTypesTableHead');
        const tableBody = document.getElementById('buildingArchyTypesTableBody');
        if (tableHead) tableHead.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';
    }

    /**
     * Delete current archetype
     */
    deleteArchetype() {
        if (this.currentArchetypeIndex === undefined || !this.buildingArchetypes) return;

        if (confirm('Are you sure you want to delete this archetype?')) {
            this.buildingArchetypes.splice(this.currentArchetypeIndex, 1);
            this.populateArchetypeSelector(this.buildingArchetypes);
            this.resetArchetypeForm();
            this.updateSaveButtonState(true);
        }
    }

    /**
     * Convert building archetypes to CSV format
     * CSV structure:
     * Row 1: usage_group_building_name,value
     * Row 2: number_of_wall_layers,value
     * Row 3: number_of_roof_layers,value
     * Row 4: number_of_floor_layers,value
     * Row 5: header row (all headers)
     * Rows 6+: period data rows
     * Empty row between archetypes
     * 
     * @param {Array} archetypes - Array of archetype objects
     * @returns {Array} Array of CSV row objects
     */
    convertBuildingArchetypesToCSV(archetypes) {
        const csvRows = [];

        archetypes.forEach((archetype, archetypeIndex) => {
            // Row 1: usage_group_building_name (only this field, value in second column)
            const row1 = {};
            row1.usage_group_building_name = archetype.usage_group_building_name || '';
            csvRows.push(row1);

            // Row 2: number_of_wall_layers (only this field, value in second column)
            const row2 = {};
            row2.number_of_wall_layers = archetype.number_of_wall_layers || 1;
            csvRows.push(row2);

            // Row 3: number_of_roof_layers (only this field, value in second column)
            const row3 = {};
            row3.number_of_roof_layers = archetype.number_of_roof_layers || 1;
            csvRows.push(row3);

            // Row 4: number_of_floor_layers (only this field, value in second column)
            const row4 = {};
            row4.number_of_floor_layers = archetype.number_of_floor_layers || 1;
            csvRows.push(row4);

            // Row 5: Header row for periods (all headers in one row)
            const wallLayers = archetype.number_of_wall_layers || 1;
            const roofLayers = archetype.number_of_roof_layers || 1;
            const floorLayers = archetype.number_of_floor_layers || 1;
            const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
            
            const headerRow = {};
            headers.forEach(header => {
                headerRow[header] = header;
            });
            csvRows.push(headerRow);

            // Rows 6+: Period data rows (all fields in one row)
            archetype.periods.forEach(period => {
                const periodRow = {};
                headers.forEach(header => {
                    periodRow[header] = period[header] !== undefined ? period[header] : '';
                });
                csvRows.push(periodRow);
            });

            // Add empty row between archetypes (except for the last one)
            if (archetypeIndex < archetypes.length - 1) {
                csvRows.push({});
            }
        });

        return csvRows;
    }

    /**
     * Load and display Building Groups data
     */
    loadBuildingGroupsData() {
        if (!this.surfaceTypesManager) return;

        // Parse building groups from CSV structure
        const rawData = this.surfaceTypesManager.getSurfaceTypes('buildingGroups');
        let groups = this.parseBuildingGroups(rawData);

        // If no groups exist, create default group1 with default period
        if (!groups || groups.length === 0) {
            const defaultGroup = {
                group_name: 'group1',
                number_of_wall_layers: 1,
                number_of_roof_layers: 1,
                number_of_floor_layers: 1,
                periods: []
            };
            
            // Add default period
            const defaultPeriod = this.createDefaultPeriod(1, 1, 1);
            defaultGroup.periods.push(defaultPeriod);
            
            groups = [defaultGroup];
        }

        // Store parsed groups
        this.buildingGroups = groups;

        // Populate group selector
        this.populateGroupSelector(groups);

        // Setup event listeners if not already set up
        if (!this.buildingGroupsListenersSetup) {
            this.setupBuildingGroupsListeners();
            this.buildingGroupsListenersSetup = true;
        }

        // If a group is selected, load it
        const selector = document.getElementById('groupSelector');
        if (selector && selector.value) {
            this.loadGroup(selector.value);
        }
    }

    /**
     * Parse building groups from raw CSV data
     * CSV structure can be:
     * 1. Standard structure (like buildingArchyTypes): usage_group_building_name, number_of_*, header row, period rows
     * 2. Simple structure: header row, then period rows with group_name in first column
     * @param {Array} rawData - Raw CSV data
     * @returns {Array} Parsed groups array
     */
    parseBuildingGroups(rawData) {
        const groups = [];
        let currentGroup = null;
        let expectingConfig = false;
        let isSimpleStructure = false;

        // Check if this is simple structure (first row is header with usage_group_building_name and startPeriod)
        if (rawData.length > 0) {
            const firstRow = rawData[0];
            const keys = Object.keys(firstRow);
            if (keys.includes('usage_group_building_name') && keys.includes('startPeriod')) {
                // Check if first row is a header row
                const firstRowGroupName = firstRow.usage_group_building_name;
                const firstRowStartPeriod = firstRow.startPeriod;
                
                // Header row has usage_group_building_name = 'usage_group_building_name' or 'startPeriod'
                // and startPeriod = 'startPeriod'
                if ((firstRowGroupName === 'usage_group_building_name' || firstRowGroupName === 'startPeriod') &&
                    firstRowStartPeriod === 'startPeriod') {
                    isSimpleStructure = true;
                }
            }
        }

        for (let i = 0; i < rawData.length; i++) {
            const row = rawData[i];
            
            // Skip completely empty rows
            const hasValue = Object.values(row).some(val => val !== null && val !== undefined && val.toString().trim() !== '');
            if (!hasValue) {
                if (currentGroup) {
                    groups.push(currentGroup);
                    currentGroup = null;
                    expectingConfig = false;
                }
                continue;
            }

            // Get the first key and value from the row
            const keys = Object.keys(row);
            const firstKey = keys[0];
            const firstValue = row[firstKey];

            // Handle simple structure (header row, then period rows)
            if (isSimpleStructure && i === 0) {
                // Skip header row
                continue;
            }

            if (isSimpleStructure && i > 0) {
                // Each row is a period with group_name in usage_group_building_name column
                const groupName = row.usage_group_building_name;
                const trimmedGroupName = groupName ? groupName.toString().trim() : '';
                
                // Skip invalid rows (header row, empty, or reserved names)
                if (!trimmedGroupName || 
                    trimmedGroupName === '' || 
                    trimmedGroupName === 'startPeriod' ||
                    trimmedGroupName === 'endPeriod' ||
                    trimmedGroupName === 'usage_group_building_name') {
                    continue;
                }

                // Find or create group
                let group = groups.find(g => g.group_name === groupName.toString().trim());
                if (!group) {
                    group = {
                        group_name: groupName.toString().trim(),
                        number_of_wall_layers: 1,
                        number_of_roof_layers: 1,
                        number_of_floor_layers: 1,
                        periods: []
                    };
                    groups.push(group);
                }

                // Add period (skip if it's a header row)
                if (row.startPeriod && row.startPeriod.toString().trim() !== 'startPeriod' && row.startPeriod.toString().trim() !== '') {
                    group.periods.push(row);
                }
                continue;
            }

            // Handle standard structure (like buildingArchyTypes)
            // Check if this row defines usage_group_building_name (start of new group)
            // But skip if it's a header row (value is 'usage_group_building_name' or 'startPeriod')
            if (firstKey === 'usage_group_building_name' && firstValue && firstValue.toString().trim() !== '') {
                const trimmedValue = firstValue.toString().trim();
                // Skip header rows
                if (trimmedValue === 'usage_group_building_name' || 
                    trimmedValue === 'startPeriod' || 
                    trimmedValue === 'endPeriod') {
                    continue;
                }

                if (currentGroup) {
                    groups.push(currentGroup);
                }

                currentGroup = {
                    group_name: trimmedValue,
                    number_of_wall_layers: 1,
                    number_of_roof_layers: 1,
                    number_of_floor_layers: 1,
                    periods: []
                };
                expectingConfig = true;
                continue;
            }

            // If we have a current group and expecting configuration
            if (currentGroup && expectingConfig) {
                if (firstKey === 'number_of_wall_layers' && firstValue && firstValue.toString().trim() !== '') {
                    currentGroup.number_of_wall_layers = parseInt(firstValue) || 1;
                    continue;
                }

                if (firstKey === 'number_of_roof_layers' && firstValue && firstValue.toString().trim() !== '') {
                    currentGroup.number_of_roof_layers = parseInt(firstValue) || 1;
                    continue;
                }

                if (firstKey === 'number_of_floor_layers' && firstValue && firstValue.toString().trim() !== '') {
                    currentGroup.number_of_floor_layers = parseInt(firstValue) || 1;
                    continue;
                }

                if (firstKey === 'startPeriod' && firstValue === 'startPeriod') {
                    expectingConfig = false;
                    continue;
                }
            }

            // If we have a current group and not expecting config, this should be a period row
            if (currentGroup && !expectingConfig) {
                // Skip header row
                if (firstKey === 'startPeriod' && firstValue === 'startPeriod') {
                    continue;
                }

                // Check if this is a valid period row (has startPeriod but it's not the header)
                if (row.startPeriod !== undefined && row.startPeriod !== 'startPeriod' && row.startPeriod !== '') {
                    const startPeriodValue = row.startPeriod.toString().trim();
                    if (startPeriodValue !== 'startPeriod' && startPeriodValue !== '') {
                        currentGroup.periods.push(row);
                    }
                }
            }

            if (!currentGroup && firstKey !== 'usage_group_building_name') {
                continue;
            }
        }

        if (currentGroup) {
            groups.push(currentGroup);
        }

        // Filter out any invalid groups and remove empty periods
        const validGroups = groups.filter(group => {
            // Filter out periods that are header rows or empty
            if (group.periods) {
                group.periods = group.periods.filter(period => {
                    // Check if this period is a header row
                    if (period.startPeriod === 'startPeriod' || period.startPeriod === '' || 
                        period.startPeriod === null || period.startPeriod === undefined) {
                        return false;
                    }
                    // Check if period has at least one non-empty value
                    return Object.values(period).some(value => {
                        if (value === null || value === undefined) return false;
                        const strValue = value.toString().trim();
                        return strValue !== '' && strValue !== 'startPeriod';
                    });
                });
            }
            
            // Filter out invalid group names
            const groupName = group.group_name ? group.group_name.toString().trim() : '';
            return groupName !== '' &&
                   groupName !== 'number_of_wall_layers' &&
                   groupName !== 'number_of_roof_layers' &&
                   groupName !== 'number_of_floor_layers' &&
                   groupName !== 'startPeriod' &&
                   groupName !== 'endPeriod' &&
                   groupName !== 'usage_group_building_name';
        });

        return validGroups;
    }

    /**
     * Populate group selector dropdown
     * @param {Array} groups - Array of groups
     */
    populateGroupSelector(groups) {
        const selector = document.getElementById('groupSelector');
        if (!selector) return;

        selector.innerHTML = '';
        
        groups.forEach((group, index) => {
            if (!group.group_name || 
                group.group_name.trim() === '' ||
                group.group_name === 'number_of_wall_layers' ||
                group.group_name === 'number_of_roof_layers' ||
                group.group_name === 'number_of_floor_layers' ||
                group.group_name === 'startPeriod' ||
                group.group_name === 'endPeriod' ||
                group.group_name === 'usage_group_building_name') {
                return; // Skip invalid groups
            }

            const option = document.createElement('option');
            option.value = index;
            option.textContent = group.group_name || `Group ${index + 1}`;
            selector.appendChild(option);
        });
    }

    /**
     * Setup event listeners for Building Groups
     */
    setupBuildingGroupsListeners() {
        // Group selector change
        const selector = document.getElementById('groupSelector');
        if (selector) {
            selector.addEventListener('change', (e) => {
                if (e.target.value !== '') {
                    this.loadGroup(e.target.value);
                }
            });
        }

        // Create new group button
        const createNewBtn = document.getElementById('createNewGroupBtn');
        if (createNewBtn) {
            createNewBtn.addEventListener('click', () => {
                this.createNewGroup();
            });
        }

        // Save configuration button
        const saveConfigBtn = document.getElementById('saveGroupConfigBtn');
        if (saveConfigBtn) {
            saveConfigBtn.addEventListener('click', () => {
                this.saveGroupConfiguration();
            });
        }

        // Reset configuration button
        const resetConfigBtn = document.getElementById('resetGroupConfigBtn');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => {
                this.resetGroupForm();
            });
        }

        // Delete group button
        const deleteBtn = document.getElementById('deleteGroupBtn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteGroup();
            });
        }

        // Add period row button
        const addPeriodBtn = document.getElementById('addGroupPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.addEventListener('click', () => {
                this.addGroupPeriodRow();
            });
        }

        // Layer number changes - rebuild table
        const wallLayers = document.getElementById('groupWallLayers');
        const roofLayers = document.getElementById('groupRoofLayers');
        const floorLayers = document.getElementById('groupFloorLayers');
        
        [wallLayers, roofLayers, floorLayers].forEach(input => {
            if (input) {
                input.addEventListener('change', () => {
                    const selector = document.getElementById('groupSelector');
                    if (selector && selector.value !== '') {
                        this.rebuildGroupTable();
                    }
                });
            }
        });
    }

    /**
     * Load a group into the form and table
     * @param {string} groupIndex - Index of group in array
     */
    loadGroup(groupIndex) {
        if (!this.buildingGroups) return;

        const index = parseInt(groupIndex);
        if (isNaN(index) || index < 0 || index >= this.buildingGroups.length) return;

        const group = this.buildingGroups[index];
        this.currentGroupIndex = index;

        // Fill form
        document.getElementById('groupName').value = group.group_name || '';
        document.getElementById('groupWallLayers').value = group.number_of_wall_layers || 1;
        document.getElementById('groupRoofLayers').value = group.number_of_roof_layers || 1;
        document.getElementById('groupFloorLayers').value = group.number_of_floor_layers || 1;

        // Show delete button
        const deleteBtn = document.getElementById('deleteGroupBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }

        // Enable add period button
        const addPeriodBtn = document.getElementById('addGroupPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = false;
        }

        // Rebuild table
        this.rebuildGroupTable();
    }

    /**
     * Rebuild group table based on current layer configuration
     */
    rebuildGroupTable() {
        if (!this.buildingGroups || this.currentGroupIndex === undefined) return;

        const group = this.buildingGroups[this.currentGroupIndex];
        const wallLayers = parseInt(document.getElementById('groupWallLayers').value) || 1;
        const roofLayers = parseInt(document.getElementById('groupRoofLayers').value) || 1;
        const floorLayers = parseInt(document.getElementById('groupFloorLayers').value) || 1;

        group.number_of_wall_layers = wallLayers;
        group.number_of_roof_layers = roofLayers;
        group.number_of_floor_layers = floorLayers;

        const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);

        const tableHead = document.getElementById('buildingGroupsTableHead');
        const tableBody = document.getElementById('buildingGroupsTableBody');

        if (!tableHead || !tableBody) return;

        tableHead.innerHTML = '';
        tableBody.innerHTML = '';

        const headerRow = document.createElement('tr');
        headers.forEach(header => {
            const th = document.createElement('th');
            th.textContent = header;
            th.style.minWidth = '120px';
            headerRow.appendChild(th);
        });
        const actionsHeader = document.createElement('th');
        actionsHeader.textContent = 'Actions';
        actionsHeader.style.width = '80px';
        headerRow.appendChild(actionsHeader);
        tableHead.appendChild(headerRow);

        group.periods.forEach((period, rowIndex) => {
            const row = this.createGroupPeriodRow(period, headers, rowIndex);
            tableBody.appendChild(row);
        });
    }

    /**
     * Create a table row for a group period
     * @param {Object} period - Period data object
     * @param {Array} headers - Array of header names
     * @param {number} rowIndex - Index of the row
     * @returns {HTMLElement} Table row element
     */
    createGroupPeriodRow(period, headers, rowIndex) {
        const row = document.createElement('tr');

        headers.forEach(header => {
            const td = document.createElement('td');
            const value = period[header] !== undefined ? period[header] : '';
            
            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'surface-type-input';
            input.value = value !== null && value !== undefined ? value.toString() : '';
            input.dataset.category = 'buildingGroups';
            input.dataset.rowIndex = rowIndex;
            input.dataset.header = header;
            input.style.width = '100%';
            input.style.padding = '3px';
            
            input.addEventListener('blur', () => {
                this.handleGroupPeriodChange(rowIndex, header, input.value);
                this.validatePeriodField(input, header, input.value);
            });
            
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    input.blur();
                }
            });
            
            this.validatePeriodField(input, header, input.value);
            
            td.appendChild(input);
            row.appendChild(td);
        });

        const deleteCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-secondary delete-row-btn';
        deleteBtn.textContent = 'Delete';
        deleteBtn.dataset.rowIndex = rowIndex;
        deleteBtn.addEventListener('click', () => {
            this.deleteGroupPeriodRow(rowIndex);
        });
        deleteCell.appendChild(deleteBtn);
        row.appendChild(deleteCell);

        return row;
    }

    /**
     * Handle group period data change
     * @param {number} rowIndex - Row index
     * @param {string} header - Column header
     * @param {string} newValue - New value
     */
    handleGroupPeriodChange(rowIndex, header, newValue) {
        if (!this.buildingGroups || this.currentGroupIndex === undefined) return;

        const group = this.buildingGroups[this.currentGroupIndex];
        if (rowIndex >= group.periods.length) return;

        const period = group.periods[rowIndex];
        const numValue = parseFloat(newValue);
        period[header] = (!isNaN(numValue) && newValue.trim() !== '') ? numValue : newValue;

        this.updateSaveButtonState(true);
    }

    /**
     * Add a new group period row with default values
     */
    addGroupPeriodRow() {
        if (!this.buildingGroups || this.currentGroupIndex === undefined) return;

        const group = this.buildingGroups[this.currentGroupIndex];
        const wallLayers = group.number_of_wall_layers || 1;
        const roofLayers = group.number_of_roof_layers || 1;
        const floorLayers = group.number_of_floor_layers || 1;

        const newPeriod = this.createDefaultPeriod(wallLayers, roofLayers, floorLayers);

        group.periods.push(newPeriod);
        const newRowIndex = group.periods.length - 1;

        this.rebuildGroupTable();

        setTimeout(() => {
            const tableBody = document.getElementById('buildingGroupsTableBody');
            if (tableBody) {
                const rows = tableBody.querySelectorAll('tr');
                if (newRowIndex < rows.length) {
                    rows[newRowIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            }
        }, 100);

        this.updateSaveButtonState(true);
    }

    /**
     * Delete a group period row
     * @param {number} rowIndex - Index of row to delete
     */
    deleteGroupPeriodRow(rowIndex) {
        if (!this.buildingGroups || this.currentGroupIndex === undefined) return;

        const group = this.buildingGroups[this.currentGroupIndex];
        if (rowIndex >= 0 && rowIndex < group.periods.length) {
            group.periods.splice(rowIndex, 1);
            this.rebuildGroupTable();
            this.updateSaveButtonState(true);
        }
    }

    /**
     * Save group configuration
     */
    saveGroupConfiguration() {
        const name = document.getElementById('groupName').value.trim();
        if (!name) {
            alert('Please enter a Group Name');
            return;
        }

        const wallLayers = parseInt(document.getElementById('groupWallLayers').value) || 1;
        const roofLayers = parseInt(document.getElementById('groupRoofLayers').value) || 1;
        const floorLayers = parseInt(document.getElementById('groupFloorLayers').value) || 1;

        if (!this.buildingGroups) {
            this.buildingGroups = [];
        }

        const isNewGroup = this.currentGroupIndex === undefined;

        if (this.currentGroupIndex !== undefined) {
            const group = this.buildingGroups[this.currentGroupIndex];
            const oldWallLayers = group.number_of_wall_layers || 1;
            const oldRoofLayers = group.number_of_roof_layers || 1;
            const oldFloorLayers = group.number_of_floor_layers || 1;
            
            group.group_name = name;
            group.number_of_wall_layers = wallLayers;
            group.number_of_roof_layers = roofLayers;
            group.number_of_floor_layers = floorLayers;

            if (wallLayers > oldWallLayers || roofLayers > oldRoofLayers || floorLayers > oldFloorLayers) {
                this.copyLayer1ValuesToNewLayersForGroup(group, oldWallLayers, oldRoofLayers, oldFloorLayers, wallLayers, roofLayers, floorLayers);
            }
        } else {
            // Create new group
            const newGroup = {
                group_name: name,
                number_of_wall_layers: wallLayers,
                number_of_roof_layers: roofLayers,
                number_of_floor_layers: floorLayers,
                periods: []
            };
            
            // Get period data from table if it exists (user may have edited the default period)
            const tableBody = document.getElementById('buildingGroupsTableBody');
            const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
            
            if (tableBody && tableBody.children.length > 0) {
                // Extract period data from all rows in table
                const rows = tableBody.querySelectorAll('tr');
                rows.forEach(row => {
                    const inputs = row.querySelectorAll('input');
                    const period = {};
                    headers.forEach((header, index) => {
                        if (inputs[index]) {
                            const value = inputs[index].value.trim();
                            const numValue = parseFloat(value);
                            period[header] = (value !== '' && !isNaN(numValue)) ? numValue : value;
                        }
                    });
                    // Only add period if it has at least one non-empty value
                    if (Object.values(period).some(v => v !== '' && v !== null && v !== undefined)) {
                        newGroup.periods.push(period);
                    }
                });
            }
            
            // If no periods were added from table, create default period
            if (newGroup.periods.length === 0) {
                const defaultPeriod = this.createDefaultPeriod(wallLayers, roofLayers, floorLayers);
                newGroup.periods.push(defaultPeriod);
            }
            
            this.buildingGroups.push(newGroup);
            this.currentGroupIndex = this.buildingGroups.length - 1;

            this.populateGroupSelector(this.buildingGroups);
            document.getElementById('groupSelector').value = this.currentGroupIndex;
        }

        this.rebuildGroupTable();

        const deleteBtn = document.getElementById('deleteGroupBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'inline-block';
        }

        const addPeriodBtn = document.getElementById('addGroupPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = false;
        }

        this.updateSaveButtonState(true);
    }

    /**
     * Copy layer 1 values to new layers for a group
     */
    copyLayer1ValuesToNewLayersForGroup(group, oldWallLayers, oldRoofLayers, oldFloorLayers, newWallLayers, newRoofLayers, newFloorLayers) {
        const headers = this.generateArchetypeHeaders(newWallLayers, newRoofLayers, newFloorLayers);
        
        group.periods.forEach(period => {
            headers.forEach(header => {
                const wallMatch = header.match(/^(.+)_wall(\d+)\[/);
                const roofMatch = header.match(/^(.+)_roof(\d+)\[/);
                const floorMatch = header.match(/^(.+)_floor(\d+)\[/);
                
                if (wallMatch) {
                    const layerNum = parseInt(wallMatch[2]);
                    if (layerNum > oldWallLayers && layerNum <= newWallLayers) {
                        const layer1Header = `${wallMatch[1]}_wall1[${header.split('[')[1]}`;
                        if (period[layer1Header] !== undefined) {
                            period[header] = period[layer1Header];
                        }
                    }
                } else if (roofMatch) {
                    const layerNum = parseInt(roofMatch[2]);
                    if (layerNum > oldRoofLayers && layerNum <= newRoofLayers) {
                        const layer1Header = `${roofMatch[1]}_roof1[${header.split('[')[1]}`;
                        if (period[layer1Header] !== undefined) {
                            period[header] = period[layer1Header];
                        }
                    }
                } else if (floorMatch) {
                    const layerNum = parseInt(floorMatch[2]);
                    if (layerNum > oldFloorLayers && layerNum <= newFloorLayers) {
                        const layer1Header = `${floorMatch[1]}_floor1[${header.split('[')[1]}`;
                        if (period[layer1Header] !== undefined) {
                            period[header] = period[layer1Header];
                        }
                    }
                }
            });
        });
    }

    /**
     * Create new group (reset form and show default period data)
     */
    createNewGroup() {
        document.getElementById('groupName').value = '';
        document.getElementById('groupWallLayers').value = 1;
        document.getElementById('groupRoofLayers').value = 1;
        document.getElementById('groupFloorLayers').value = 1;

        const selector = document.getElementById('groupSelector');
        if (selector) {
            selector.value = '';
        }

        const deleteBtn = document.getElementById('deleteGroupBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        const addPeriodBtn = document.getElementById('addGroupPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = false;
        }

        this.currentGroupIndex = undefined;

        // Create a temporary group with default period for preview
        const wallLayers = 1;
        const roofLayers = 1;
        const floorLayers = 1;
        const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
        const defaultPeriod = this.createDefaultPeriod(wallLayers, roofLayers, floorLayers);

        // Build table with default period
        const tableHead = document.getElementById('buildingGroupsTableHead');
        const tableBody = document.getElementById('buildingGroupsTableBody');
        
        if (tableHead && tableBody) {
            tableHead.innerHTML = '';
            tableBody.innerHTML = '';

            // Create header row
            const headerRow = document.createElement('tr');
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                th.style.minWidth = '120px';
                headerRow.appendChild(th);
            });
            const actionsHeader = document.createElement('th');
            actionsHeader.textContent = 'Actions';
            actionsHeader.style.width = '80px';
            headerRow.appendChild(actionsHeader);
            tableHead.appendChild(headerRow);

            // Create default period row
            const row = this.createGroupPeriodRow(defaultPeriod, headers, 0);
            tableBody.appendChild(row);
        }

        setTimeout(() => {
            document.getElementById('groupName').focus();
        }, 100);
    }

    /**
     * Reset group form
     */
    resetGroupForm() {
        document.getElementById('groupName').value = '';
        document.getElementById('groupWallLayers').value = 1;
        document.getElementById('groupRoofLayers').value = 1;
        document.getElementById('groupFloorLayers').value = 1;

        const selector = document.getElementById('groupSelector');
        if (selector) {
            selector.value = '';
        }

        const deleteBtn = document.getElementById('deleteGroupBtn');
        if (deleteBtn) {
            deleteBtn.style.display = 'none';
        }

        const addPeriodBtn = document.getElementById('addGroupPeriodRowBtn');
        if (addPeriodBtn) {
            addPeriodBtn.disabled = true;
        }

        this.currentGroupIndex = undefined;

        const tableHead = document.getElementById('buildingGroupsTableHead');
        const tableBody = document.getElementById('buildingGroupsTableBody');
        if (tableHead) tableHead.innerHTML = '';
        if (tableBody) tableBody.innerHTML = '';
    }

    /**
     * Delete current group
     */
    deleteGroup() {
        if (this.currentGroupIndex === undefined || !this.buildingGroups) return;

        if (confirm('Are you sure you want to delete this group?')) {
            this.buildingGroups.splice(this.currentGroupIndex, 1);
            this.populateGroupSelector(this.buildingGroups);
            this.resetGroupForm();
            this.updateSaveButtonState(true);
        }
    }

    /**
     * Convert building groups to CSV format
     * @param {Array} groups - Array of group objects
     * @returns {Array} Array of CSV row objects
     */
    convertBuildingGroupsToCSV(groups) {
        const csvRows = [];

        groups.forEach((group, groupIndex) => {
            const row1 = {};
            row1.usage_group_building_name = group.group_name || '';
            csvRows.push(row1);

            const row2 = {};
            row2.number_of_wall_layers = group.number_of_wall_layers || 1;
            csvRows.push(row2);

            const row3 = {};
            row3.number_of_roof_layers = group.number_of_roof_layers || 1;
            csvRows.push(row3);

            const row4 = {};
            row4.number_of_floor_layers = group.number_of_floor_layers || 1;
            csvRows.push(row4);

            const wallLayers = group.number_of_wall_layers || 1;
            const roofLayers = group.number_of_roof_layers || 1;
            const floorLayers = group.number_of_floor_layers || 1;
            const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);
            
            const headerRow = {};
            headers.forEach(header => {
                headerRow[header] = header;
            });
            csvRows.push(headerRow);

            group.periods.forEach(period => {
                const periodRow = {};
                headers.forEach(header => {
                    periodRow[header] = period[header] !== undefined ? period[header] : '';
                });
                csvRows.push(periodRow);
            });

            if (groupIndex < groups.length - 1) {
                csvRows.push({});
            }
        });

        return csvRows;
    }

    /**
     * Validate all building groups and their periods
     * @returns {Object} Validation result
     */
    validateAllBuildingGroups() {
        if (!this.buildingGroups || this.buildingGroups.length === 0) {
            return { isValid: true, message: '', invalidFields: [] };
        }

        const invalidFields = [];

        this.buildingGroups.forEach((group, groupIndex) => {
            if (!group.periods || group.periods.length === 0) {
                invalidFields.push({
                    groupIndex,
                    groupName: group.group_name,
                    message: `Group "${group.group_name}" has no period data`
                });
                return;
            }

            const wallLayers = group.number_of_wall_layers || 1;
            const roofLayers = group.number_of_roof_layers || 1;
            const floorLayers = group.number_of_floor_layers || 1;
            const headers = this.generateArchetypeHeaders(wallLayers, roofLayers, floorLayers);

            group.periods.forEach((period, periodIndex) => {
                headers.forEach(header => {
                    const value = period[header];
                    const trimmedValue = value !== null && value !== undefined ? value.toString().trim() : '';
                    const isEmpty = trimmedValue === '';

                    const isNumericField = header.includes('ThermalConductivity') || 
                                          header.includes('SpecificHeat') || 
                                          header.includes('Density') || 
                                          header.includes('Thickness') ||
                                          header.includes('Uvalue') ||
                                          header.includes('SHGC') ||
                                          header.includes('Emissivity') ||
                                          header.includes('Albedo');

                    if (isEmpty) {
                        invalidFields.push({
                            groupIndex,
                            periodIndex,
                            header,
                            groupName: group.group_name,
                            message: `Empty field "${header}" in period ${periodIndex + 1} of group "${group.group_name}"`
                        });
                    } else if (isNumericField) {
                        const numValue = parseFloat(trimmedValue);
                        if (isNaN(numValue)) {
                            invalidFields.push({
                                groupIndex,
                                periodIndex,
                                header,
                                groupName: group.group_name,
                                message: `Invalid numeric value "${trimmedValue}" in field "${header}" of period ${periodIndex + 1} of group "${group.group_name}"`
                            });
                        }
                    }
                });
            });
        });

        if (invalidFields.length > 0) {
            const messages = invalidFields.map(f => f.message).slice(0, 5);
            const message = `Please fix the following errors before saving:\n\n${messages.join('\n')}${invalidFields.length > 5 ? `\n... and ${invalidFields.length - 5} more errors` : ''}`;
            return { isValid: false, message, invalidFields };
        }

        return { isValid: true, message: '', invalidFields: [] };
    }

    /**
     * Highlight invalid group period fields
     * @param {Array} invalidFields - Array of invalid field information
     */
    highlightInvalidGroupPeriodFields(invalidFields) {
        if (!invalidFields || invalidFields.length === 0) return;

        const tableBody = document.getElementById('buildingGroupsTableBody');
        if (!tableBody) return;

        const rows = tableBody.querySelectorAll('tr');
        
        invalidFields.forEach(field => {
            if (field.periodIndex !== undefined && field.header) {
                const row = rows[field.periodIndex];
                if (row) {
                    const inputs = row.querySelectorAll('input');
                    inputs.forEach(input => {
                        if (input.dataset.header === field.header) {
                            input.style.border = '2px solid red';
                            input.style.backgroundColor = '#ffe6e6';
                            input.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                        }
                    });
                }
            }
        });
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
     * Duplicate selected objects - NEW ALGORITHM: Create from scratch instead of cloning
     */
    duplicateSelected() {
        if (this.sceneOperationsManager) {
            this.sceneOperationsManager.duplicateSelected();
        } else {
            console.error('SceneOperationsManager not available');
        }
    }

    /**
     * Import STL file
     */
    importSTL() {
        if (this.stlManager) {
            this.stlManager.importSTL();
        } else {
            console.error('STLManager not available');
        }
    }

    // STL import/export methods moved to STLManager

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
    }

    /**
     * Sync preferences state with UI
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

        // Sync smoothing angle threshold
        const smoothingAngleThresholdSlider = document.getElementById('smoothingAngleThresholdPref');
        const smoothingAngleThresholdValue = document.getElementById('smoothingAngleThresholdValuePref');
        if (smoothingAngleThresholdSlider && smoothingAngleThresholdValue) {
            const currentThreshold = this.stlManager ? this.stlManager.smoothingAngleThreshold : 0;
            smoothingAngleThresholdSlider.value = currentThreshold;
            smoothingAngleThresholdValue.textContent = currentThreshold.toFixed(1);
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

        // Sync hemispheric light intensity
        const hemisphericIntensitySlider = document.getElementById('hemisphericIntensityPref');
        const hemisphericIntensityValue = document.getElementById('hemisphericIntensityValuePref');
        if (hemisphericIntensitySlider && hemisphericIntensityValue) {
            const currentIntensity = this.lightingManager.hemisphericLight ? this.lightingManager.hemisphericLight.intensity : 0.8;
            hemisphericIntensitySlider.value = currentIntensity;
            hemisphericIntensityValue.textContent = currentIntensity.toFixed(1);
        }

        // Sync shadow min Z
        const shadowMinZSlider = document.getElementById('shadowMinZPref');
        const shadowMinZValue = document.getElementById('shadowMinZValuePref');
        if (shadowMinZSlider && shadowMinZValue) {
            const currentMinZ = this.lightingManager.directionalLight ? this.lightingManager.directionalLight.shadowMinZ : 0.01;
            shadowMinZSlider.value = currentMinZ;
            shadowMinZValue.textContent = currentMinZ.toFixed(3);
        }

        // Sync shadow max Z
        const shadowMaxZSlider = document.getElementById('shadowMaxZPref');
        const shadowMaxZValue = document.getElementById('shadowMaxZValuePref');
        if (shadowMaxZSlider && shadowMaxZValue) {
            const currentMaxZ = this.lightingManager.directionalLight ? this.lightingManager.directionalLight.shadowMaxZ : 1500;
            shadowMaxZSlider.value = currentMaxZ;
            shadowMaxZValue.textContent = currentMaxZ.toFixed(0);
        }

        // Sync light position
        const lightPositionXSlider = document.getElementById('lightPositionXPref');
        const lightPositionXValue = document.getElementById('lightPositionXValuePref');
        if (lightPositionXSlider && lightPositionXValue && this.lightingManager.directionalLight) {
            lightPositionXSlider.value = this.lightingManager.directionalLight.position.x;
            lightPositionXValue.textContent = this.lightingManager.directionalLight.position.x.toFixed(0);
        }

        const lightPositionYSlider = document.getElementById('lightPositionYPref');
        const lightPositionYValue = document.getElementById('lightPositionYValuePref');
        if (lightPositionYSlider && lightPositionYValue && this.lightingManager.directionalLight) {
            lightPositionYSlider.value = this.lightingManager.directionalLight.position.y;
            lightPositionYValue.textContent = this.lightingManager.directionalLight.position.y.toFixed(0);
        }

        const lightPositionZSlider = document.getElementById('lightPositionZPref');
        const lightPositionZValue = document.getElementById('lightPositionZValuePref');
        if (lightPositionZSlider && lightPositionZValue && this.lightingManager.directionalLight) {
            lightPositionZSlider.value = this.lightingManager.directionalLight.position.z;
            lightPositionZValue.textContent = this.lightingManager.directionalLight.position.z.toFixed(0);
        }

        // Sync light direction
        const lightDirectionXSlider = document.getElementById('lightDirectionXPref');
        const lightDirectionXValue = document.getElementById('lightDirectionXValuePref');
        if (lightDirectionXSlider && lightDirectionXValue && this.lightingManager.directionalLight) {
            lightDirectionXSlider.value = this.lightingManager.directionalLight.direction.x;
            lightDirectionXValue.textContent = this.lightingManager.directionalLight.direction.x.toFixed(1);
        }

        const lightDirectionYSlider = document.getElementById('lightDirectionYPref');
        const lightDirectionYValue = document.getElementById('lightDirectionYValuePref');
        if (lightDirectionYSlider && lightDirectionYValue && this.lightingManager.directionalLight) {
            lightDirectionYSlider.value = this.lightingManager.directionalLight.direction.y;
            lightDirectionYValue.textContent = this.lightingManager.directionalLight.direction.y.toFixed(1);
        }

        const lightDirectionZSlider = document.getElementById('lightDirectionZPref');
        const lightDirectionZValue = document.getElementById('lightDirectionZValuePref');
        if (lightDirectionZSlider && lightDirectionZValue && this.lightingManager.directionalLight) {
            lightDirectionZSlider.value = this.lightingManager.directionalLight.direction.z;
            lightDirectionZValue.textContent = this.lightingManager.directionalLight.direction.z.toFixed(1);
        }

        // Sync statistics toggle state
        const statisticsTogglePref = document.getElementById('statisticsTogglePref');
        if (statisticsTogglePref && window.fpsMonitor) {
            const isStatisticsVisible = window.fpsMonitor.isVisible;
            statisticsTogglePref.classList.toggle('active', isStatisticsVisible);
        }
    }

    /**
     * Delete selected objects
     */
    deleteSelected() {
        if (this.sceneOperationsManager) {
            this.sceneOperationsManager.deleteSelected();
        } else {
            console.error('SceneOperationsManager not available');
        }
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

        // Hemispheric light intensity slider
        const hemisphericIntensitySlider = document.getElementById('hemisphericIntensityPref');
        if (hemisphericIntensitySlider) {
            hemisphericIntensitySlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setHemisphericIntensity(value);
                this.updateHemisphericIntensityDisplay(value);
            });
        }

        // Shadow min Z slider
        const shadowMinZSlider = document.getElementById('shadowMinZPref');
        if (shadowMinZSlider) {
            shadowMinZSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowMinZ(value);
                this.updateShadowMinZDisplay(value);
            });
        }

        // Shadow max Z slider
        const shadowMaxZSlider = document.getElementById('shadowMaxZPref');
        if (shadowMaxZSlider) {
            shadowMaxZSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setShadowMaxZ(value);
                this.updateShadowMaxZDisplay(value);
            });
        }

        // Smoothing angle threshold slider
        const smoothingAngleThresholdSlider = document.getElementById('smoothingAngleThresholdPref');
        if (smoothingAngleThresholdSlider) {
            // Use debounce to avoid too frequent updates during slider drag
            let smoothingUpdateTimeout = null;
            smoothingAngleThresholdSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.updateSmoothingAngleThresholdDisplay(value);
                
                // Clear previous timeout
                if (smoothingUpdateTimeout) {
                    clearTimeout(smoothingUpdateTimeout);
                }
                
                // Debounce the actual smoothing update (wait 100ms after user stops dragging)
                smoothingUpdateTimeout = setTimeout(() => {
                    this.setSmoothingAngleThreshold(value);
                }, 100);
            });
        }

        // Light position sliders
        const lightPositionXSlider = document.getElementById('lightPositionXPref');
        if (lightPositionXSlider) {
            lightPositionXSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setLightPositionX(value);
                this.updateLightPositionXDisplay(value);
            });
        }

        const lightPositionYSlider = document.getElementById('lightPositionYPref');
        if (lightPositionYSlider) {
            lightPositionYSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setLightPositionY(value);
                this.updateLightPositionYDisplay(value);
            });
        }

        const lightPositionZSlider = document.getElementById('lightPositionZPref');
        if (lightPositionZSlider) {
            lightPositionZSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setLightPositionZ(value);
                this.updateLightPositionZDisplay(value);
            });
        }

        // Light direction sliders
        const lightDirectionXSlider = document.getElementById('lightDirectionXPref');
        if (lightDirectionXSlider) {
            lightDirectionXSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setLightDirectionX(value);
                this.updateLightDirectionXDisplay(value);
            });
        }

        const lightDirectionYSlider = document.getElementById('lightDirectionYPref');
        if (lightDirectionYSlider) {
            lightDirectionYSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setLightDirectionY(value);
                this.updateLightDirectionYDisplay(value);
            });
        }

        const lightDirectionZSlider = document.getElementById('lightDirectionZPref');
        if (lightDirectionZSlider) {
            lightDirectionZSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.setLightDirectionZ(value);
                this.updateLightDirectionZDisplay(value);
            });
        }

        // Reset camera
        const resetCameraBtn = document.getElementById('resetCameraPref');
        if (resetCameraBtn) {
            resetCameraBtn.addEventListener('click', () => {
                this.resetCamera();
            });
        }

        // Zoom to fit ground
        const zoomToFitGroundBtn = document.getElementById('zoomToFitGroundPref');
        if (zoomToFitGroundBtn) {
            zoomToFitGroundBtn.addEventListener('click', () => {
                this.zoomToFitGround();
            });
        }

        // Generate buildings
        const generateBtn = document.getElementById('generateBuildingsPref');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateBuildings();
            });
        }

        // Generate buildings on large area
        const generateLargeBtn = document.getElementById('generateBuildingsLargePref');
        if (generateLargeBtn) {
            generateLargeBtn.addEventListener('click', () => {
                this.generateBuildingsOnLargeArea();
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

        // Create test circle
        const createTestCircleBtn = document.getElementById('createTestCircle');
        if (createTestCircleBtn) {
            createTestCircleBtn.addEventListener('click', () => {
                this.createTestCircle();
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

        // Sync hemispheric light intensity
        const hemisphericIntensitySlider = document.getElementById('hemisphericIntensityPref');
        const hemisphericIntensityValue = document.getElementById('hemisphericIntensityValuePref');
        if (hemisphericIntensitySlider && hemisphericIntensityValue) {
            const currentIntensity = this.lightingManager.hemisphericLight ? this.lightingManager.hemisphericLight.intensity : 0.8;
            hemisphericIntensitySlider.value = currentIntensity;
            hemisphericIntensityValue.textContent = currentIntensity.toFixed(1);
        }

        // Sync shadow min Z
        const shadowMinZSlider = document.getElementById('shadowMinZPref');
        const shadowMinZValue = document.getElementById('shadowMinZValuePref');
        if (shadowMinZSlider && shadowMinZValue) {
            const currentMinZ = this.lightingManager.directionalLight ? this.lightingManager.directionalLight.shadowMinZ : 0.01;
            shadowMinZSlider.value = currentMinZ;
            shadowMinZValue.textContent = currentMinZ.toFixed(3);
        }

        // Sync shadow max Z
        const shadowMaxZSlider = document.getElementById('shadowMaxZPref');
        const shadowMaxZValue = document.getElementById('shadowMaxZValuePref');
        if (shadowMaxZSlider && shadowMaxZValue) {
            const currentMaxZ = this.lightingManager.directionalLight ? this.lightingManager.directionalLight.shadowMaxZ : 1500;
            shadowMaxZSlider.value = currentMaxZ;
            shadowMaxZValue.textContent = currentMaxZ.toFixed(0);
        }

        // Sync smoothing angle threshold
        const smoothingAngleThresholdSlider = document.getElementById('smoothingAngleThresholdPref');
        const smoothingAngleThresholdValue = document.getElementById('smoothingAngleThresholdValuePref');
        if (smoothingAngleThresholdSlider && smoothingAngleThresholdValue) {
            const currentThreshold = this.smoothingAngleThreshold || 100;
            smoothingAngleThresholdSlider.value = currentThreshold;
            smoothingAngleThresholdValue.textContent = currentThreshold.toFixed(0);
        }

        // Sync light position
        const lightPositionXSlider = document.getElementById('lightPositionXPref');
        const lightPositionXValue = document.getElementById('lightPositionXValuePref');
        if (lightPositionXSlider && lightPositionXValue && this.lightingManager.directionalLight) {
            lightPositionXSlider.value = this.lightingManager.directionalLight.position.x;
            lightPositionXValue.textContent = this.lightingManager.directionalLight.position.x.toFixed(0);
        }

        const lightPositionYSlider = document.getElementById('lightPositionYPref');
        const lightPositionYValue = document.getElementById('lightPositionYValuePref');
        if (lightPositionYSlider && lightPositionYValue && this.lightingManager.directionalLight) {
            lightPositionYSlider.value = this.lightingManager.directionalLight.position.y;
            lightPositionYValue.textContent = this.lightingManager.directionalLight.position.y.toFixed(0);
        }

        const lightPositionZSlider = document.getElementById('lightPositionZPref');
        const lightPositionZValue = document.getElementById('lightPositionZValuePref');
        if (lightPositionZSlider && lightPositionZValue && this.lightingManager.directionalLight) {
            lightPositionZSlider.value = this.lightingManager.directionalLight.position.z;
            lightPositionZValue.textContent = this.lightingManager.directionalLight.position.z.toFixed(0);
        }

        // Sync light direction
        const lightDirectionXSlider = document.getElementById('lightDirectionXPref');
        const lightDirectionXValue = document.getElementById('lightDirectionXValuePref');
        if (lightDirectionXSlider && lightDirectionXValue && this.lightingManager.directionalLight) {
            lightDirectionXSlider.value = this.lightingManager.directionalLight.direction.x;
            lightDirectionXValue.textContent = this.lightingManager.directionalLight.direction.x.toFixed(1);
        }

        const lightDirectionYSlider = document.getElementById('lightDirectionYPref');
        const lightDirectionYValue = document.getElementById('lightDirectionYValuePref');
        if (lightDirectionYSlider && lightDirectionYValue && this.lightingManager.directionalLight) {
            lightDirectionYSlider.value = this.lightingManager.directionalLight.direction.y;
            lightDirectionYValue.textContent = this.lightingManager.directionalLight.direction.y.toFixed(1);
        }

        const lightDirectionZSlider = document.getElementById('lightDirectionZPref');
        const lightDirectionZValue = document.getElementById('lightDirectionZValuePref');
        if (lightDirectionZSlider && lightDirectionZValue && this.lightingManager.directionalLight) {
            lightDirectionZSlider.value = this.lightingManager.directionalLight.direction.z;
            lightDirectionZValue.textContent = this.lightingManager.directionalLight.direction.z.toFixed(1);
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

        // Generate new buildings on default area
        const buildings = this.buildingGenerator.generateBuildings(count, minHeight, maxHeight);
        
        // Apply 2-sided materials to all meshes after generating buildings
        this.apply2SidedMaterialsToAll();

        // Add buildings to scene and setup shadows
        buildings.forEach(building => {
            this.sceneManager.addBuilding(building);
            this.lightingManager.addShadowCaster(building.mesh);
            
            // Make building selectable
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(building.mesh);
            }
        });

        // Clean up any unwanted polygons (water_1 without type) that may have been created
        // Call it multiple times to ensure all unwanted polygons are removed
        if (this.buildingGenerator.cleanupUnwantedPolygons) {
            this.buildingGenerator.cleanupUnwantedPolygons();
            // Call again after a short delay to catch any that might have been created during shadow setup
            setTimeout(() => {
                this.buildingGenerator.cleanupUnwantedPolygons();
            }, 500);
        }
        
        // Also cleanup from scene directly as a backup
        this.cleanupWaterMeshesWithoutType();

        // Show loading state
        this.showLoading(false);
        
    }

    /**
     * Generate buildings on large area
     */
    generateBuildingsOnLargeArea() {
        // Try to get values from preferences first, fallback to original elements
        const countEl = document.getElementById('buildingCountPref') || document.getElementById('buildingCount');
        const minHeightEl = document.getElementById('minHeightPref') || document.getElementById('minHeight');
        const maxHeightEl = document.getElementById('maxHeightPref') || document.getElementById('maxHeight');
        
        const count = parseInt(countEl?.value) || 10;
        const minHeight = parseInt(minHeightEl?.value) || 4;
        const maxHeight = parseInt(maxHeightEl?.value) || 20;

        // Clear existing buildings
        this.sceneManager.clearBuildings();

        // Generate new buildings on large area
        const buildings = this.buildingGenerator.generateBuildingsOnLargeArea(count, minHeight, maxHeight);

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
        
        console.log(`Generated ${buildings.length} buildings on large area (2000x2000)`);
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
        document.getElementById('buildingCount').value = 70;
        document.getElementById('buildingCountValue').textContent = '70';
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
            shadowsEnabled: this.lightingManager.areShadowsEnabled(),
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

            // Apply shadow toggles - force apply settings regardless of current state
            if (settings.shadowsEnabled !== undefined) {
                if (settings.shadowsEnabled) {
                    this.lightingManager.enableShadows();
                } else {
                    this.lightingManager.disableShadows();
                }
            }
            if (settings.objectShadowsEnabled !== undefined) {
                // Force set object shadows state
                if (settings.objectShadowsEnabled !== this.lightingManager.areObjectShadowsEnabled()) {
                    this.lightingManager.toggleObjectShadows();
                }
            }
            if (settings.hardShadowsEnabled !== undefined) {
                // Force set hard shadows state
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
     * Show save scene confirmation dialog before creating new scene
     * @param {string} sceneType - 'empty' or 'default'
     */
    showSaveSceneDialog(sceneType) {
        const dialog = document.getElementById('saveSceneDialog');
        if (!dialog) {
            console.error('Save scene dialog not found');
            // If dialog not found, proceed directly
            if (sceneType === 'empty') {
                this.createEmptyScene();
            } else {
                this.createDefaultScene();
            }
            return;
        }

        // Store scene type for later use
        this.pendingSceneType = sceneType;

        // Show dialog
        dialog.style.display = 'flex';

        // Setup event listeners (remove old ones first by cloning)
        const closeBtn = document.getElementById('saveSceneDialogClose');
        const noBtn = document.getElementById('saveSceneDialogNo');
        const yesBtn = document.getElementById('saveSceneDialogYes');

        // Remove existing listeners by cloning elements
        if (closeBtn) {
            const newCloseBtn = closeBtn.cloneNode(true);
            closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
        }
        if (noBtn) {
            const newNoBtn = noBtn.cloneNode(true);
            noBtn.parentNode.replaceChild(newNoBtn, noBtn);
        }
        if (yesBtn) {
            const newYesBtn = yesBtn.cloneNode(true);
            yesBtn.parentNode.replaceChild(newYesBtn, yesBtn);
        }

        const closeDialog = () => {
            dialog.style.display = 'none';
        };

        // Close button
        const finalCloseBtn = document.getElementById('saveSceneDialogClose');
        if (finalCloseBtn) {
            finalCloseBtn.addEventListener('click', closeDialog);
        }

        // No button - proceed without saving
        const finalNoBtn = document.getElementById('saveSceneDialogNo');
        if (finalNoBtn) {
            finalNoBtn.addEventListener('click', () => {
                closeDialog();
                if (this.pendingSceneType === 'empty') {
                    this.createEmptyScene();
                } else {
                    this.createDefaultScene();
                }
                this.pendingSceneType = null;
            });
        }

        // Yes button - save first, then proceed
        const finalYesBtn = document.getElementById('saveSceneDialogYes');
        if (finalYesBtn) {
            finalYesBtn.addEventListener('click', () => {
                closeDialog();
                // Save scene first
                this.saveScene();
                // Then proceed with new scene
                // Note: saveScene might be async, but we proceed anyway
                setTimeout(() => {
                    if (this.pendingSceneType === 'empty') {
                        this.createEmptyScene();
                    } else {
                        this.createDefaultScene();
                    }
                    this.pendingSceneType = null;
                }, 100);
            });
        }
    }

    /**
     * Create empty scene with only ground
     */
    createEmptyScene() {
        if (this.sceneOperationsManager) {
            // First, select all objects
            if (this.selectionManager && this.selectionManager.selectAll) {
                this.selectionManager.selectAll();
            }
            // Then use SceneOperationsManager to clear the scene
            this.sceneOperationsManager.createEmptyScene();
        } else {
            console.error('SceneOperationsManager not available');
        }
    }

    /**
     * Create default scene with ground and random buildings
     */
    createDefaultScene() {
        // Use the same approach as createEmptyScene to ensure all objects (including STL) are cleared
        if (this.sceneOperationsManager) {
            // First, select all objects (this includes STL objects)
            if (this.selectionManager && this.selectionManager.selectAll) {
                this.selectionManager.selectAll();
            }
            // Then use SceneOperationsManager to clear the scene (this handles STL objects too)
            this.sceneOperationsManager.createEmptyScene();
        } else {
            // Fallback: manual clearing
            // Clear selection first
            if (this.selectionManager) {
                this.selectionManager.clearSelection();
            }
            
            // Clear all trees
            if (this.treeManager && this.treeManager.clearAllTrees) {
                this.treeManager.clearAllTrees();
            }
            
            // Clear all buildings (this also clears roads and polygons)
            this.sceneManager.clearBuildings();
            this.buildingGenerator.clearBuildings();
            
            // Clear all rectangles, circles, and polygons
            this.clear2DShapes();
            
            // Clear all STL objects
            const scene = this.sceneManager.getScene();
            if (scene) {
                const meshes = scene.meshes.slice(); // Copy array to avoid modification during iteration
                meshes.forEach(mesh => {
                    if (mesh.userData && mesh.userData.isImportedSTL) {
                        if (this.selectionManager) {
                            this.selectionManager.removeSelectableObject(mesh);
                        }
                        scene.removeMesh(mesh);
                        if (mesh.material && !mesh.material.getClassName().includes('Shared')) {
                            mesh.material.dispose();
                        }
                        mesh.dispose();
                    }
                });
            }

            // Reset camera
            this.cameraController.resetCamera();
        }
        
        // Apply 2-sided materials to all meshes after clearing
        this.apply2SidedMaterialsToAll();
        
        // After clearing (whether using SceneOperationsManager or fallback), generate new random buildings (for default scene)
        // Reset UI values to match the initial scene generation (same as autoGenerateBuildings)
        const buildingCount = document.getElementById('buildingCount');
        const buildingCountValue = document.getElementById('buildingCountValue');
        const minHeight = document.getElementById('minHeight');
        const minHeightValue = document.getElementById('minHeightValue');
        const maxHeight = document.getElementById('maxHeight');
        const maxHeightValue = document.getElementById('maxHeightValue');
        
        // Use same values as initial scene generation (minHeight: 5, maxHeight: 35)
        if (buildingCount) buildingCount.value = 70;
        if (buildingCountValue) buildingCountValue.textContent = '70';
        if (minHeight) minHeight.value = 5;
        if (minHeightValue) minHeightValue.textContent = '5';
        if (maxHeight) maxHeight.value = 35;
        if (maxHeightValue) maxHeightValue.textContent = '35';

        // Ensure ground is visible
        if (!this.sceneManager.getGround()) {
            this.sceneManager.createGround();
        }

        // Generate 70 random buildings with same parameters as initial scene (minHeight: 5, maxHeight: 35)
        this.buildingGenerator.generateBuildings(70, 5, 35);
        
        // Apply 2-sided materials to all meshes after generating buildings
        this.apply2SidedMaterialsToAll();
        
        // Dispatch scene change event to update object list
        this.dispatchSceneChangeEvent();
        
        // Auto-adjust shadow frustum after scene generation
        // This ensures shadows work correctly in all parts of the scene
        if (this.lightingManager && this.lightingManager.autoAdjustShadowFrustum) {
            setTimeout(() => {
                this.lightingManager.autoAdjustShadowFrustum();
            }, 800);
        }
        
        // Zoom to fit ground after scene is fully loaded
        // Use a delay to ensure all objects are rendered and scene is stable
        setTimeout(() => {
            if (this.zoomToFitGround) {
                this.zoomToFitGround();
                // console.log('Auto-zoomed to fit ground after default scene creation');
            }
        }, 1000);
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
     * Set hemispheric light intensity
     */
    setHemisphericIntensity(intensity) {
        if (this.lightingManager && this.lightingManager.hemisphericLight) {
            this.lightingManager.hemisphericLight.intensity = intensity;
            // Update light helper if it exists
            if (this.lightingManager.updateLightHelper) {
                this.lightingManager.updateLightHelper();
            }
        }
    }

    updateHemisphericIntensityDisplay(intensity) {
        const valueDisplay = document.getElementById('hemisphericIntensityValuePref');
        if (valueDisplay) {
            valueDisplay.textContent = intensity.toFixed(1);
        }
    }

    /**
     * Set shadow min Z
     */
    setShadowMinZ(minZ) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            this.lightingManager.directionalLight.shadowMinZ = minZ;
            // Force shadow map update
            if (this.lightingManager.shadowGenerator) {
                this.lightingManager.shadowGenerator.forceCompilation = true;
            }
        }
    }

    updateShadowMinZDisplay(minZ) {
        const valueDisplay = document.getElementById('shadowMinZValuePref');
        if (valueDisplay) {
            valueDisplay.textContent = minZ.toFixed(3);
        }
    }

    /**
     * Set shadow max Z
     */
    setShadowMaxZ(maxZ) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            this.lightingManager.directionalLight.shadowMaxZ = maxZ;
            // Force shadow map update
            if (this.lightingManager.shadowGenerator) {
                this.lightingManager.shadowGenerator.forceCompilation = true;
            }
            // Auto-adjust shadow frustum after changing max Z
            if (this.lightingManager.autoAdjustShadowFrustum) {
                setTimeout(() => {
                    this.lightingManager.autoAdjustShadowFrustum();
                }, 100);
            }
        }
    }

    updateShadowMaxZDisplay(maxZ) {
        const valueDisplay = document.getElementById('shadowMaxZValuePref');
        if (valueDisplay) {
            valueDisplay.textContent = maxZ.toFixed(0);
        }
    }

    /**
     * Set smoothing angle threshold for STL import
     */
    setSmoothingAngleThreshold(angleDegrees) {
        this.smoothingAngleThreshold = angleDegrees;
        console.log(`Smoothing angle threshold set to ${angleDegrees} degrees`);
        
        // Update all imported STL meshes in real-time
        this.updateImportedSTLMeshes();
    }
    
    /**
     * Update all imported STL meshes with new smoothing angle threshold
     */
    updateImportedSTLMeshes() {
        if (!this.sceneManager) {
            return;
        }
        
        const scene = this.sceneManager.getScene();
        if (!scene) {
            return;
        }
        
        // Find all imported STL meshes
        const importedMeshes = scene.meshes.filter(mesh => 
            mesh.userData && mesh.userData.isImportedSTL && mesh.userData.originalSTLData
        );
        
        if (importedMeshes.length === 0) {
            console.log('[Smoothing] No imported STL meshes found to update');
            return;
        }
        
        console.log(`[Smoothing] Updating ${importedMeshes.length} imported STL mesh(es) with new threshold...`);
        
        // Update each mesh
        importedMeshes.forEach(mesh => {
            try {
                this.rebuildMeshWithNewSmoothing(mesh);
            } catch (error) {
                console.error(`[Smoothing] Error updating mesh ${mesh.name}:`, error);
            }
        });
        
        console.log(`[Smoothing] Updated ${importedMeshes.length} mesh(es) successfully`);
    }
    
    /**
     * Rebuild a mesh with new smoothing angle threshold
     * @param {BABYLON.Mesh} mesh - The mesh to rebuild
     */
    rebuildMeshWithNewSmoothing(mesh) {
        if (!mesh.userData || !mesh.userData.originalSTLData) {
            console.warn(`[Smoothing] Mesh ${mesh.name} does not have original STL data`);
            return;
        }
        
        const originalData = mesh.userData.originalSTLData;
        const scene = mesh.getScene();
        
        // Store current properties
        const currentPosition = mesh.position.clone();
        const currentMaterial = mesh.material;
        const currentUserData = { ...mesh.userData };
        
        // Rebuild mesh geometry with new smoothing
        const positions = [];
        const indices = [];
        const normals = [];
        const vertexMap = new Map();
        
        // Use current smoothing angle threshold
        const angleDegrees = this.smoothingAngleThreshold || 100;
        const smoothingAngleThreshold = Math.cos((180 - angleDegrees) * Math.PI / 180);
        
        // First pass: collect vertices and group by position
        originalData.triangles.forEach((triangle) => {
            const triangleIndices = [];
            const triangleNormal = new BABYLON.Vector3(triangle.normal.x, triangle.normal.y, triangle.normal.z);

            // Process each vertex in the triangle
            triangle.vertices.forEach((vertex) => {
                const key = `${vertex.x.toFixed(6)},${vertex.y.toFixed(6)},${vertex.z.toFixed(6)}`;
                
                if (!vertexMap.has(key)) {
                    vertexMap.set(key, []);
                }
                
                const vertexGroup = vertexMap.get(key);
                
                // Find if there's a similar normal in this vertex group
                let foundSimilar = false;
                for (let i = 0; i < vertexGroup.length; i++) {
                    const existing = vertexGroup[i];
                    const existingNormal = new BABYLON.Vector3(
                        existing.normal.x,
                        existing.normal.y,
                        existing.normal.z
                    );
                    existingNormal.normalize();
                    
                    const dotProduct = BABYLON.Vector3.Dot(existingNormal, triangleNormal);
                    
                    // If normals are similar (angle < threshold), use the same vertex index
                    if (dotProduct > smoothingAngleThreshold) {
                        triangleIndices.push(existing.index);
                        foundSimilar = true;
                        
                        // Update normal by averaging
                        const count = existing.triangleCount || 1;
                        existing.normal.x = (existing.normal.x * count + triangle.normal.x) / (count + 1);
                        existing.normal.y = (existing.normal.y * count + triangle.normal.y) / (count + 1);
                        existing.normal.z = (existing.normal.z * count + triangle.normal.z) / (count + 1);
                        existing.triangleCount = count + 1;
                        break;
                    }
                }
                
                // If no similar normal found, create a new vertex (hard edge)
                if (!foundSimilar) {
                    const vertexIndex = positions.length / 3;
                    positions.push(vertex.x, vertex.y, vertex.z);
                    
                    vertexGroup.push({
                        index: vertexIndex,
                        normal: { x: triangle.normal.x, y: triangle.normal.y, z: triangle.normal.z },
                        triangleCount: 1
                    });
                    
                    triangleIndices.push(vertexIndex);
                }
            });

            // Add triangle indices
            // Check if we need to flip the triangle order based on normal direction
            if (triangleIndices.length === 3) {
                // Calculate normal from triangle vertices to verify direction
                const v0 = triangle.vertices[0];
                const v1 = triangle.vertices[1];
                const v2 = triangle.vertices[2];
                
                const edge1 = new BABYLON.Vector3(v1.x - v0.x, v1.y - v0.y, v1.z - v0.z);
                const edge2 = new BABYLON.Vector3(v2.x - v0.x, v2.y - v0.y, v2.z - v0.z);
                const calculatedNormal = BABYLON.Vector3.Cross(edge1, edge2);
                calculatedNormal.normalize();
                
                // Compare with STL normal
                const stlNormal = new BABYLON.Vector3(triangle.normal.x, triangle.normal.y, triangle.normal.z);
                stlNormal.normalize();
                
                const dotProduct = BABYLON.Vector3.Dot(calculatedNormal, stlNormal);
                
                // If normals are opposite (dot product < 0), reverse the triangle order
                if (dotProduct < 0) {
                    // Reverse order: (0, 1, 2) -> (0, 2, 1)
                    indices.push(triangleIndices[0], triangleIndices[2], triangleIndices[1]);
                } else {
                    // Keep original order
                    indices.push(triangleIndices[0], triangleIndices[1], triangleIndices[2]);
                }
            }
        });
        
        // Second pass: calculate final normals for all vertices
        vertexMap.forEach((vertexGroup) => {
            vertexGroup.forEach((vertexData) => {
                const normal = vertexData.normal;
                
                // Normalize the normal
                const length = Math.sqrt(normal.x * normal.x + normal.y * normal.y + normal.z * normal.z);
                if (length > 0.0001) {
                    const normalizedX = normal.x / length;
                    const normalizedY = normal.y / length;
                    const normalizedZ = normal.z / length;
                    normals.push(normalizedX, normalizedY, normalizedZ);
                } else {
                    normals.push(0, 1, 0);
                }
            });
        });
        
        if (positions.length === 0) {
            console.warn(`[Smoothing] No positions generated for mesh ${mesh.name}`);
            return;
        }
        
        // Calculate bounding box to determine mesh center
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
        
        for (let i = 0; i < positions.length; i += 3) {
            minX = Math.min(minX, positions[i]);
            minY = Math.min(minY, positions[i + 1]);
            minZ = Math.min(minZ, positions[i + 2]);
            maxX = Math.max(maxX, positions[i]);
            maxY = Math.max(maxY, positions[i + 1]);
            maxZ = Math.max(maxZ, positions[i + 2]);
        }
        
        const center = new BABYLON.Vector3(
            (minX + maxX) / 2,
            (minY + maxY) / 2,
            (minZ + maxZ) / 2
        );
        
        // Offset all vertices so mesh center is at origin in local space
        const offset = center.clone();
        const adjustedPositions = [];
        for (let i = 0; i < positions.length; i += 3) {
            adjustedPositions.push(
                positions[i] - offset.x,
                positions[i + 1] - offset.y,
                positions[i + 2] - offset.z
            );
        }
        
        // Update mesh geometry
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, adjustedPositions);
        mesh.setIndices(indices);
        
        // Recalculate normals from geometry to ensure correct direction
        // This fixes the issue where STL normals might be inverted
        const recalculatedNormals = [];
        BABYLON.VertexData.ComputeNormals(adjustedPositions, indices, recalculatedNormals);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, recalculatedNormals);
        
        // Refresh bounding info
        mesh.refreshBoundingInfo();
        
        // Update userData with new dimensions
        const updatedBoundingInfo = mesh.getBoundingInfo();
        const updatedMin = updatedBoundingInfo.boundingBox.minimum;
        const updatedMax = updatedBoundingInfo.boundingBox.maximum;
        const localMinY = updatedMin.y;
        const worldMinY = currentPosition.y + localMinY;
        
        // Update userData
        mesh.userData.dimensions = {
            width: updatedMax.x - updatedMin.x,
            depth: updatedMax.z - updatedMin.z,
            height: updatedMax.y - updatedMin.y
        };
        mesh.userData.originalHeight = updatedMax.y - updatedMin.y;
        mesh.userData.baseY = worldMinY;
        
        // Ensure no period properties for non-building objects
        if (mesh.userData.type && mesh.userData.type !== 'building') {
            delete mesh.userData.startPeriod;
            delete mesh.userData.endPeriod;
            delete mesh.userData.buildingArchetypePeriod;
            delete mesh.userData.buildingGroupPeriod;
        }
        
        // Restore original STL data reference
        mesh.userData.originalSTLData = originalData;
        
        // Update gizmo position if it exists and is attached to this mesh
        if (this.moveManager && this.moveManager.gizmoManager) {
            const attachedMesh = this.moveManager.gizmoManager.attachedMesh;
            if (attachedMesh === mesh) {
                this.moveManager.setupSingleObjectGizmo(mesh);
            }
        }
    }

    /**
     * Update smoothing angle threshold display
     */
    updateSmoothingAngleThresholdDisplay(angleDegrees) {
        const valueDisplay = document.getElementById('smoothingAngleThresholdValuePref');
        if (valueDisplay) {
            valueDisplay.textContent = angleDegrees.toFixed(0);
        }
    }

    /**
     * Set light position X
     */
    setLightPositionX(x) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            this.lightingManager.directionalLight.position.x = x;
            // Update light helper if it exists
            if (this.lightingManager.updateLightHelper) {
                this.lightingManager.updateLightHelper();
            }
        }
    }

    updateLightPositionXDisplay(x) {
        const valueDisplay = document.getElementById('lightPositionXValuePref');
        if (valueDisplay) {
            valueDisplay.textContent = x.toFixed(0);
        }
    }

    /**
     * Set light position Y
     */
    setLightPositionY(y) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            this.lightingManager.directionalLight.position.y = y;
            // Update light helper if it exists
            if (this.lightingManager.updateLightHelper) {
                this.lightingManager.updateLightHelper();
            }
        }
    }

    updateLightPositionYDisplay(y) {
        const valueDisplay = document.getElementById('lightPositionYValuePref');
        if (valueDisplay) {
            valueDisplay.textContent = y.toFixed(0);
        }
    }

    /**
     * Set light position Z
     */
    setLightPositionZ(z) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            this.lightingManager.directionalLight.position.z = z;
            // Update light helper if it exists
            if (this.lightingManager.updateLightHelper) {
                this.lightingManager.updateLightHelper();
            }
        }
    }

    updateLightPositionZDisplay(z) {
        const valueDisplay = document.getElementById('lightPositionZValuePref');
        if (valueDisplay) {
            valueDisplay.textContent = z.toFixed(0);
        }
    }

    /**
     * Set light direction X
     */
    setLightDirectionX(x) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            // Get current Y and Z values before normalizing
            const currentY = this.lightingManager.directionalLight.direction.y;
            const currentZ = this.lightingManager.directionalLight.direction.z;
            // Set new direction
            this.lightingManager.directionalLight.direction = new BABYLON.Vector3(x, currentY, currentZ);
            // Normalize direction vector
            this.lightingManager.directionalLight.direction.normalize();
            // Update sliders to reflect normalized values
            this.updateLightDirectionXDisplay(this.lightingManager.directionalLight.direction.x);
            this.updateLightDirectionYDisplay(this.lightingManager.directionalLight.direction.y);
            this.updateLightDirectionZDisplay(this.lightingManager.directionalLight.direction.z);
            // Update light helper if it exists
            if (this.lightingManager.updateLightHelper) {
                this.lightingManager.updateLightHelper();
            }
            // Force shadow map update
            if (this.lightingManager.shadowGenerator) {
                this.lightingManager.shadowGenerator.forceCompilation = true;
            }
        }
    }

    updateLightDirectionXDisplay(x) {
        const valueDisplay = document.getElementById('lightDirectionXValuePref');
        const slider = document.getElementById('lightDirectionXPref');
        if (valueDisplay) {
            valueDisplay.textContent = x.toFixed(1);
        }
        if (slider) {
            slider.value = x;
        }
    }

    /**
     * Set light direction Y
     */
    setLightDirectionY(y) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            // Get current X and Z values before normalizing
            const currentX = this.lightingManager.directionalLight.direction.x;
            const currentZ = this.lightingManager.directionalLight.direction.z;
            // Set new direction
            this.lightingManager.directionalLight.direction = new BABYLON.Vector3(currentX, y, currentZ);
            // Normalize direction vector
            this.lightingManager.directionalLight.direction.normalize();
            // Update sliders to reflect normalized values
            this.updateLightDirectionXDisplay(this.lightingManager.directionalLight.direction.x);
            this.updateLightDirectionYDisplay(this.lightingManager.directionalLight.direction.y);
            this.updateLightDirectionZDisplay(this.lightingManager.directionalLight.direction.z);
            // Update light helper if it exists
            if (this.lightingManager.updateLightHelper) {
                this.lightingManager.updateLightHelper();
            }
            // Force shadow map update
            if (this.lightingManager.shadowGenerator) {
                this.lightingManager.shadowGenerator.forceCompilation = true;
            }
        }
    }

    updateLightDirectionYDisplay(y) {
        const valueDisplay = document.getElementById('lightDirectionYValuePref');
        const slider = document.getElementById('lightDirectionYPref');
        if (valueDisplay) {
            valueDisplay.textContent = y.toFixed(1);
        }
        if (slider) {
            slider.value = y;
        }
    }

    /**
     * Set light direction Z
     */
    setLightDirectionZ(z) {
        if (this.lightingManager && this.lightingManager.directionalLight) {
            // Get current X and Y values before normalizing
            const currentX = this.lightingManager.directionalLight.direction.x;
            const currentY = this.lightingManager.directionalLight.direction.y;
            // Set new direction
            this.lightingManager.directionalLight.direction = new BABYLON.Vector3(currentX, currentY, z);
            // Normalize direction vector
            this.lightingManager.directionalLight.direction.normalize();
            // Update sliders to reflect normalized values
            this.updateLightDirectionXDisplay(this.lightingManager.directionalLight.direction.x);
            this.updateLightDirectionYDisplay(this.lightingManager.directionalLight.direction.y);
            this.updateLightDirectionZDisplay(this.lightingManager.directionalLight.direction.z);
            // Update light helper if it exists
            if (this.lightingManager.updateLightHelper) {
                this.lightingManager.updateLightHelper();
            }
            // Force shadow map update
            if (this.lightingManager.shadowGenerator) {
                this.lightingManager.shadowGenerator.forceCompilation = true;
            }
        }
    }

    updateLightDirectionZDisplay(z) {
        const valueDisplay = document.getElementById('lightDirectionZValuePref');
        const slider = document.getElementById('lightDirectionZPref');
        if (valueDisplay) {
            valueDisplay.textContent = z.toFixed(1);
        }
        if (slider) {
            slider.value = z;
        }
    }

    /**
     * Reset camera
     */
    resetCamera() {
        this.cameraController.resetCamera();
    }

    /**
     * Zoom to fit ground
     */
    zoomToFitGround() {
        this.cameraController.zoomToFitGround();
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
        // Don't allow coordinate toggle when scale tool is active (scale only works in local)
        const activeTool = this.getActiveTransformTool();
        if (activeTool === 'scale') {
            console.log('Coordinate toggle is disabled for scale tool (scale only works in local mode)');
            return;
        }
        
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
     * Disable coordinate toggle button
     */
    disableCoordinateToggle() {
        const toggleButton = document.getElementById('coordinateToggle');
        if (toggleButton) {
            toggleButton.style.opacity = '0.5';
            toggleButton.style.pointerEvents = 'none';
            toggleButton.style.cursor = 'not-allowed';
        }
    }

    /**
     * Enable coordinate toggle button
     */
    enableCoordinateToggle() {
        const toggleButton = document.getElementById('coordinateToggle');
        if (toggleButton) {
            toggleButton.style.opacity = '1';
            toggleButton.style.pointerEvents = 'auto';
            toggleButton.style.cursor = 'pointer';
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

        // IMPORTANT: Deactivate all other drawing tools before activating rectangle
        this.deactivateAllDrawingTools();
        
        // Activate rectangle tool button
        const rectangleTool = document.querySelector('#drawingPanel [data-tool="rectangle"]');
        if (rectangleTool) {
            rectangleTool.classList.add('active');
        }

        // Disable camera controls during drawing
        this.disableCameraControls();

        // Set callback for when drawing stops (BEFORE startInteractiveDrawing to avoid immediate trigger)
        this.rectangleManager.onDrawingStopped = () => {
            this.enableCameraControls();
            // Reset cursor to default
            this.resetCursor();
            // Deactivate drawing tool after drawing is complete
            this.deactivateDrawingTool();
            
            // IMPORTANT: Explicitly deactivate rectangle tool button to ensure it returns to normal state
            const rectangleTool = document.querySelector('#drawingPanel [data-tool="rectangle"]');
            if (rectangleTool) {
                rectangleTool.classList.remove('active');
                // Reset inline styles that might be applied by event listeners
                rectangleTool.style.background = '';
                rectangleTool.style.borderColor = '';
                rectangleTool.style.boxShadow = '';
                const icon = rectangleTool.querySelector('.tool-icon');
                if (icon) {
                    icon.style.filter = '';
                }
            }
            
            // Logs removed to reduce console clutter
        };

        // Set callback for when rectangle is created
        this.rectangleManager.onRectangleCreated = (rectangle) => {
            // Add to selection manager
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(rectangle);
            }
            
            // Add to scene - only add to buildings list if type is 'building'
            if (this.sceneManager) {
                const rectangleType = rectangle.userData?.type || 'ground';
                if (rectangleType.toLowerCase() === 'building') {
                    // addBuilding expects an object with mesh property
                    this.sceneManager.addBuilding({ mesh: rectangle });
                }
                // For non-building types, the rectangle is already in the scene
                // (created by RectangleManager.createRectangle which adds it to scene)
            }
            
            // IMPORTANT: Deactivate drawing tool and activate select tool after completion
            this.deactivateDrawingTool();
            
            // IMPORTANT: Explicitly deactivate rectangle tool button to ensure it returns to normal state
            const rectangleTool = document.querySelector('#drawingPanel [data-tool="rectangle"]');
            if (rectangleTool) {
                rectangleTool.classList.remove('active');
                // Reset inline styles that might be applied by event listeners
                rectangleTool.style.background = '';
                rectangleTool.style.borderColor = '';
                rectangleTool.style.boxShadow = '';
                const icon = rectangleTool.querySelector('.tool-icon');
                if (icon) {
                    icon.style.filter = '';
                }
            }
            
            // Logs removed to reduce console clutter
            
            this.activateSelectTool();
            
            // Automatically select the newly created rectangle
            if (this.selectionManager) {
                this.selectionManager.selectObject(rectangle, false, true);
            }
            
            // Dispatch scene change event to update object list
            this.dispatchSceneChangeEvent();
            
            console.log('Rectangle created:', rectangle.name, 'type:', rectangle.userData?.type || 'unknown');
        };

        // Start interactive rectangle drawing
        this.rectangleManager.startInteractiveDrawing();
        
        // Set cursor to crosshair AFTER starting drawing (to ensure drawing is actually active)
        this.setDrawingCursor();
    }

    /**
     * Create circle
     */
    createCircle() {
        if (!this.circleManager) {
            return;
        }

        // IMPORTANT: Deactivate all other drawing tools before activating circle
        this.deactivateAllDrawingTools();
        
        // Activate circle tool button
        const circleTool = document.querySelector('#drawingPanel [data-tool="circle"]');
        if (circleTool) {
            circleTool.classList.add('active');
        }

        // Disable camera controls during drawing
        this.disableCameraControls();

        // Set callback for when drawing stops (BEFORE startInteractiveDrawing to avoid immediate trigger)
        this.circleManager.onDrawingStopped = () => {
            this.enableCameraControls();
            // Reset cursor to default
            this.resetCursor();
            // Deactivate drawing tool after drawing is complete
            this.deactivateDrawingTool();
            
            // IMPORTANT: Explicitly deactivate circle tool button to ensure it returns to normal state
            const circleTool = document.querySelector('#drawingPanel [data-tool="circle"]');
            if (circleTool) {
                circleTool.classList.remove('active');
                // Reset inline styles that might be applied by event listeners
                circleTool.style.background = '';
                circleTool.style.borderColor = '';
                circleTool.style.boxShadow = '';
                const icon = circleTool.querySelector('.tool-icon');
                if (icon) {
                    icon.style.filter = '';
                }
            }
            
            // Logs removed to reduce console clutter
        };

        // Set callback for when circle is created
        this.circleManager.onCircleCreated = (circle, isUpdate = false, wasSelected = false) => {
            // Add to selection manager (if not already added)
            if (this.selectionManager) {
                // Check if circle is already in selection manager (means it's an update, not a new creation)
                // Since circle is a new mesh after update, we need to check by name or add it
                // The old circle was removed, so we always need to add the new one
                this.selectionManager.addSelectableObject(circle);
            }
            
            // Note: Circle is already added to scene by CreateCylinder
            // No need to call addBuilding as it expects {mesh: ...} format
            // Just ensure it's visible and enabled
            if (circle) {
                circle.setEnabled(true);
                circle.isVisible = true;
            }
            
            // IMPORTANT: Only activate select tool and select circle if it's a NEW creation, not an update
            // When updating (changing height while move tool is active), preserve the current tool
            if (!isUpdate) {
                // IMPORTANT: Explicitly deactivate circle tool button to ensure it returns to normal state
                const circleTool = document.querySelector('#drawingPanel [data-tool="circle"]');
                if (circleTool) {
                    circleTool.classList.remove('active');
                    // Reset inline styles that might be applied by event listeners
                    circleTool.style.background = '';
                    circleTool.style.borderColor = '';
                    circleTool.style.boxShadow = '';
                    const icon = circleTool.querySelector('.tool-icon');
                    if (icon) {
                        icon.style.filter = '';
                    }
                }
                
                // Logs removed to reduce console clutter
                
                // Switch back to select tool after completion
                this.activateSelectTool();
                
                // Automatically select the newly created circle
                if (this.selectionManager) {
                    this.selectionManager.selectObject(circle, false, true);
                }
            } else if (wasSelected) {
                // IMPORTANT: If this is an update and the circle was selected before, restore selection
                // This ensures the circle remains selected after property changes
                if (this.selectionManager) {
                    // Use setTimeout to ensure selection manager has finished adding the circle
                    setTimeout(() => {
                        this.selectionManager.selectObject(circle, false, true);
                    }, 0);
                }
            }
            
            // Dispatch scene change event to update object list
            this.dispatchSceneChangeEvent();
            
            console.log('Circle created:', circle.name, isUpdate ? '(update)' : '(new)', wasSelected ? '[was selected]' : '');
        };

        // Start interactive circle drawing
        this.circleManager.startInteractiveDrawing();
        
        // Set cursor to crosshair AFTER starting drawing (to ensure drawing is actually active)
        this.setDrawingCursor();
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
                return mesh.name === 'earth';
            });
            return pickResult && pickResult.hit && pickResult.pickedMesh && 
                   pickResult.pickedMesh.name === 'earth';
        };

        // Helper function to get what mesh is under the mouse
        const getMeshUnderMouse = (x, y) => {
            const pickResult = this.sceneManager.getScene().pick(x, y);
            if (pickResult && pickResult.hit && pickResult.pickedMesh) {
                return pickResult.pickedMesh.name;
            }
            return null;
        };

        // Mouse down - Use capture phase to execute before CameraController
        canvas.addEventListener('pointerdown', (event) => {
            // Handle polygon drawing
            if (this.polygonManager && this.polygonManager.isCurrentlyDrawing) {
                // Right click: cancel polygon drawing
                if (event.button === 2) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    console.log('[POLYGON] Right click detected - canceling drawing');
                    this.cancelPolygonDrawing();
                    
                    // Deactivate drawing tool
                    const activeTool = document.querySelector('#drawingPanel .tool-item.active');
                    if (activeTool) {
                        activeTool.classList.remove('active');
                    }
                    return;
                }
                
                // Middle click: ignore
                if (event.button === 1) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();
                    return;
                }
                
                // Only proceed with left click (button === 0)
                if (event.button === 0) {
                    event.preventDefault();
                    event.stopPropagation();
                    event.stopImmediatePropagation();

                    // Get ground intersection point
                    const pickResult = this.sceneManager.getScene().pick(event.offsetX, event.offsetY, (mesh) => {
                        return mesh.name === 'earth';
                    });
                    if (pickResult && pickResult.hit && pickResult.pickedMesh && 
                        (pickResult.pickedMesh.name === 'earth' || pickResult.pickedMesh.name === 'invisible_ground')) {
                        const point = pickResult.pickedPoint;
                        // Check if Shift key is held for angle snapping
                        const shouldSnapAngle = event.shiftKey;
                        this.polygonManager.addPoint(point, shouldSnapAngle);
                    }
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
                        return mesh.name === 'earth';
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
                return mesh.name === 'earth';
            });
            if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'earth') {
                const point = pickResult.pickedPoint;
                this.shape2DManager.onMouseDown(point);
            }
        }, true); // Use capture phase to execute before CameraController

        // Mouse move - Use capture phase to execute before CameraController
        canvas.addEventListener('pointermove', (event) => {
            // Handle polygon preview
            if (this.polygonManager && this.polygonManager.isCurrentlyDrawing) {
                // IMPORTANT: Update tooltip position FIRST, before preventDefault/stopPropagation
                // This ensures tooltip always follows cursor, even during fast movement
                const rect = canvas.getBoundingClientRect();
                const canvasX = event.offsetX !== undefined ? event.offsetX : (event.clientX - rect.left);
                const canvasY = event.offsetY !== undefined ? event.offsetY : (event.clientY - rect.top);
                
                // Update scene.pointerX and scene.pointerY for tooltip coordinates
                const scene = this.sceneManager.getScene();
                if (scene) {
                    scene.pointerX = canvasX;
                    scene.pointerY = canvasY;
                }
                
                // Store mouse position for update loop (must be done before preventDefault)
                this.lastTooltipMouseX = event.clientX || 0;
                this.lastTooltipMouseY = event.clientY || 0;
                
                // Update tooltip position immediately (same as drawingCoordinatesMoveHandler)
                // This ensures tooltip follows cursor smoothly during polygon drawing, even during fast movement
                if (this.drawingCoordinatesTooltip) {
                    const newLeft = event.clientX + 15;
                    const newTop = event.clientY + 15;
                    this.drawingCoordinatesTooltip.style.setProperty('left', `${newLeft}px`, 'important');
                    this.drawingCoordinatesTooltip.style.setProperty('top', `${newTop}px`, 'important');
                    this.drawingCoordinatesTooltip.style.setProperty('display', 'block', 'important');
                }
                
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();

                // Get ground intersection point for preview
                // Use the same coordinates we just set in scene.pointerX/Y
                const pickResult = this.sceneManager.getScene().pick(scene.pointerX, scene.pointerY, (mesh) => {
                    return mesh.name === 'earth';
                });
                if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'earth') {
                    const point = pickResult.pickedPoint;
                    // Check if Shift key is held for angle snapping
                    const shouldSnapAngle = event.shiftKey;
                    this.polygonManager.updatePreview(point, shouldSnapAngle);
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
                        return mesh.name === 'earth';
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
                    return mesh.name === 'earth';
                });
                if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'earth') {
                    const point = pickResult.pickedPoint;
                    this.shape2DManager.onMouseMove(point);
                }
            }
        }, true); // Use capture phase to execute before CameraController

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
                    return mesh.name === 'earth';
                });
                if (pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'earth') {
                    const point = pickResult.pickedPoint;
                    this.shape2DManager.onMouseUp(point);
                }
            }
        });


        // Keyboard events - Using event.code instead of event.key for language-independent shortcuts
        document.addEventListener('keydown', (event) => {
            // Check if user is typing in an input field - if so, don't handle global keyboard shortcuts
            const activeElement = document.activeElement;
            const isInputFocused = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'SELECT' || 
                activeElement.tagName === 'TEXTAREA' ||
                activeElement.isContentEditable
            );
            
            // If typing in input field, only handle specific cases (like Escape to close popup)
            // But don't handle other shortcuts that might interfere
            if (isInputFocused) {
                // Only handle Escape to close popup if user wants
                if (event.code === 'Escape') {
                    // Check if any properties popup is open
                    const propertiesPopup = document.getElementById('propertiesPopup');
                    const circlePopup = document.getElementById('circlePropertiesPopup');
                    const polygonPopup = document.getElementById('polygonPropertiesPopup');
                    const treePopup = document.getElementById('treePropertiesPopup');
                    const stlPopup = document.getElementById('stlPropertiesPopup');
                    
                    const isPopupOpen = (propertiesPopup && propertiesPopup.classList.contains('show')) ||
                                      (circlePopup && circlePopup.classList.contains('show')) ||
                                      (polygonPopup && polygonPopup.classList.contains('show')) ||
                                      (treePopup && treePopup.classList.contains('show')) ||
                                      (stlPopup && stlPopup.classList.contains('show'));
                    
                    if (isPopupOpen) {
                        // Don't close popup when typing - just stop propagation
                        event.stopPropagation();
                        return;
                    }
                }
                // For all other keys when typing, don't handle global shortcuts
                return;
            }
            
            // Handle polygon drawing specific keys first
            if (this.polygonManager && this.polygonManager.isCurrentlyDrawing) {
                if (event.code === 'Backspace') {
                    // Remove last point during polygon drawing
                    const removed = this.polygonManager.removeLastPoint();
                    if (removed) {
                        console.log('Last point removed from polygon');
                        event.preventDefault(); // Prevent default browser behavior
                    }
                    return;
                } else if (event.code === 'Escape') {
                    this.cancelPolygonDrawing();
                    
                    // Deactivate drawing tool
                    const activeTool = document.querySelector('#drawingPanel .tool-item.active');
                    if (activeTool) {
                        activeTool.classList.remove('active');
                    }
                    
                    return;
                } else if (event.code === 'Enter' || event.key === 'Enter' || event.keyCode === 13 || event.which === 13) {
                    // IMPORTANT: Complete polygon with any Enter/Return key press
                    this.completePolygonDrawing();
                    
                    // Deactivate drawing tool
                    const activeTool = document.querySelector('#drawingPanel .tool-item.active');
                    if (activeTool) {
                        activeTool.classList.remove('active');
                    }
                    
                    event.preventDefault(); // Prevent default behavior
                    return;
                }
            }


            // Handle Shift+F for statistics toggle (using event.code for language independence)
            if (event.shiftKey && event.code === 'KeyF') {
                event.preventDefault();
                this.toggleStatistics();
                return;
            }

            // Handle Escape key for other drawing modes
            if (this.shape2DManager && this.shape2DManager.isCurrentlyDrawing()) {
                if (event.code === 'Escape') {
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
                if (event.code === 'Escape') {
                    this.deactivateTreePlacement();
                    console.log('Tree placement cancelled');
                }
            }

            // Handle Shift+A for Select All (using event.code for language independence)
            if (event.shiftKey && event.code === 'KeyA') {
                event.preventDefault(); // Prevent default browser behavior
                this.selectAll();
                return;
            }

            // Handle Shift+D for Clear Selection (using event.code for language independence)
            if (event.shiftKey && event.code === 'KeyD') {
                event.preventDefault(); // Prevent default browser behavior
                this.clearSelection();
                return;
            }

            // Handle Ctrl+L for Object List Toggle (using event.code for language independence)
            if (event.ctrlKey && event.code === 'KeyL') {
                event.preventDefault(); // Prevent default browser behavior
                this.toggleObjectList();
                return;
            }

            // Handle Ctrl+Alt+D for Duplicate (using event.code for language independence)
            if (event.ctrlKey && event.altKey && event.code === 'KeyD') {
                event.preventDefault(); // Prevent default browser behavior
                event.stopPropagation(); // Stop event propagation
                console.log('Ctrl+Alt+D pressed - duplicating selected objects');
                this.duplicateSelected();
                return;
            }
        });
        
        // Also add global keyboard listener for duplicate (in case document listener doesn't catch it)
        window.addEventListener('keydown', (event) => {
            // Handle Ctrl+Alt+D for Duplicate (using event.code for language independence)
            if (event.ctrlKey && event.altKey && event.code === 'KeyD') {
                // Only handle if no input field is focused
                const activeElement = document.activeElement;
                const isInputFocused = activeElement && (
                    activeElement.tagName === 'INPUT' || 
                    activeElement.tagName === 'TEXTAREA' ||
                    activeElement.isContentEditable
                );
                
                if (!isInputFocused) {
                    event.preventDefault();
                    event.stopPropagation();
                    console.log('Ctrl+Alt+D pressed (window listener) - duplicating selected objects');
                    this.duplicateSelected();
                }
            }
        }, true); // Use capture phase

        // Right click to exit drawing mode and switch to select tool
        // Use capture phase to handle before SelectionManager's contextmenu handler
        canvas.addEventListener('contextmenu', (event) => {
            // Check if we're in drawing mode (rectangle, circle, polygon) or tree placement
            const isDrawingActive = this.isDrawingModeActive();
            const isTreeActive = this.treeManager && this.treeManager.isCurrentlyPlacing();
            
            if (isDrawingActive || isTreeActive) {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation(); // Stop all other handlers on this element
                
                // Stop all drawing operations
                this.stopAllDrawingOperations();
                
                // Deactivate all drawing tools
                const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
                allDrawingTools.forEach(tool => tool.classList.remove('active'));
                
                // Activate select tool
                this.selectTransformTool('select');
                
                console.log('Exited drawing mode via right click, switched to select tool');
            }
        }, true); // Use capture phase
    }

    /**
     * Disable camera controls
     */
    disableCameraControls() {
        console.log('[UIMANAGER] disableCameraControls() called');
        if (this.cameraController && this.cameraController.camera) {
            // Store current camera state
            this.cameraControlsDisabled = true;
            
            // Use CameraController's method to disable controls
            if (typeof this.cameraController.setControlsEnabled === 'function') {
                console.log('[UIMANAGER] disableCameraControls: Using setControlsEnabled(false)');
                this.cameraController.setControlsEnabled(false);
            } else {
                console.log('[UIMANAGER] disableCameraControls: Using direct detachControl()');
                // Fallback to direct camera control
                if (typeof this.cameraController.camera.detachControls === 'function') {
                    this.cameraController.camera.detachControls();
                } else if (typeof this.cameraController.camera.detachControl === 'function') {
                    this.cameraController.camera.detachControl();
                }
            }
            
        } else {
            console.warn('[UIMANAGER] Cannot disable camera controls: cameraController or camera not available');
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
            } else {
                // Fallback to direct camera control
                if (typeof this.cameraController.camera.attachControl === 'function') {
                    this.cameraController.camera.attachControl(this.sceneManager.canvas, true);
                } else if (typeof this.cameraController.camera.attachControls === 'function') {
                    this.cameraController.camera.attachControls(this.sceneManager.canvas, true);
                }
            }
            
            this.cameraControlsDisabled = false;
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
        
        // Reset cursor to default
        this.resetCursor();
        
        // Also deactivate tree placement when deactivating drawing tools
        this.deactivateTreePlacement();
    }

    /**
     * Deactivate all drawing tools (rectangle, circle, polygon, tree)
     * This ensures only one drawing tool is active at a time
     * IMPORTANT: Also stops all active drawing operations to prevent multiple tools from listening to events simultaneously
     */
    deactivateAllDrawingTools() {
        // IMPORTANT: Stop all active drawing operations first to prevent event listener conflicts
        // Stop rectangle drawing
        if (this.rectangleManager && this.rectangleManager.isDrawing) {
            this.rectangleManager.stopInteractiveDrawing();
        }
        
        // Stop circle drawing
        if (this.circleManager && this.circleManager.isDrawing) {
            this.circleManager.stopInteractiveDrawing();
        }
        
        // Stop polygon drawing
        if (this.polygonManager && this.polygonManager.isCurrentlyDrawing) {
            this.polygonManager.stopDrawing();
        }
        
        // Remove active class from all drawing tools
        const allDrawingTools = document.querySelectorAll('#drawingPanel .tool-item');
        allDrawingTools.forEach(tool => {
            tool.classList.remove('active');
        });
        
        // Also deactivate tree placement
        this.deactivateTreePlacement();
    }

    /**
     * Activate measurement tool
     * @param {string} toolName - 'distance' or 'area'
     */
    activateMeasurementTool(toolName) {
        console.log('[UIMANAGER] activateMeasurementTool called with:', toolName);
        console.log('[UIMANAGER] measurementManager exists:', !!this.measurementManager);
        
        // Deactivate all drawing tools first
        this.deactivateAllDrawingTools();
        
        // Deactivate all transform tools
        if (this.toolManager) {
            this.toolManager.selectTransformTool('select');
        }
        
        // Activate measurement tool
        if (this.measurementManager) {
            this.measurementManager.activateTool(toolName);
        } else {
            console.error('[UIMANAGER] measurementManager is null!');
        }
        
        // Disable camera controls when measurement tool is active
        this.disableCameraControls();
    }
    
    /**
     * Deactivate measurement tool
     */
    deactivateMeasurementTool() {
        if (this.measurementManager) {
            // deactivateTool() will re-enable camera controls internally
            this.measurementManager.deactivateTool();
        }
    }

    /**
     * Check if any drawing tool is currently active
     */
    isDrawingModeActive() {
        // Check drawing managers directly (more reliable than ToolManager or UI state)
        const rectangleActive = this.rectangleManager && this.rectangleManager.isDrawing;
        const circleActive = this.circleManager && this.circleManager.isDrawing;
        const polygonActive = this.polygonManager && this.polygonManager.isCurrentlyDrawing;
        const treeActive = this.treeManager && this.treeManager.isPlacingTree;
        
        return rectangleActive || circleActive || polygonActive || treeActive;
    }

    /**
     * Stop all active drawing operations
     */
    stopAllDrawingOperations() {
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.stopAllDrawingOperations();
        }
        // Fallback if ToolManager not available
        // Stop polygon drawing
        if (this.polygonManager && this.polygonManager.isDrawing) {
            this.stopPolygonDrawing();
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
        this.deactivateTreePlacement();

        // Stop any other drawing operations
        if (this.shape2DManager && this.shape2DManager.isCurrentlyDrawing()) {
            this.shape2DManager.stopInteractiveDrawing();
        }

        // Re-enable camera controls
        this.enableCameraControls();
    }

    /**
     * Check if select tool is active
     */
    isSelectToolActive() {
        const activeTool = document.querySelector('#transformPanel .tool-item.active');
        return activeTool && activeTool.getAttribute('data-tool') === 'select';
    }

    /**
     * Check if any transform tool is active (select, move, rotate, scale)
     */
    isAnyTransformToolActive() {
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.isAnyTransformToolActive();
        }
        // Fallback if ToolManager not available
        const activeTool = document.querySelector('#transformPanel .tool-item.active');
        if (!activeTool) return false;
        
        const toolName = activeTool.getAttribute('data-tool');
        return ['select', 'move', 'rotate', 'scale'].includes(toolName);
    }

    /**
     * Check if a transform editing tool is active (move, rotate, scale - excluding select)
     */
    isTransformEditingToolActive() {
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.isTransformEditingToolActive();
        }
        // Fallback if ToolManager not available
        const activeTool = document.querySelector('#transformPanel .tool-item.active');
        if (!activeTool) return false;
        
        const toolName = activeTool.getAttribute('data-tool');
        return ['move', 'rotate', 'scale'].includes(toolName);
    }

    /**
     * Setup properties popup
     */
    setupPropertiesPopup() {
        // Close button
        document.getElementById('closeProperties').addEventListener('click', () => {
            this.hidePropertiesPopup();
        });

        // Circle properties popup event listeners
        document.getElementById('closeCircleProperties').addEventListener('click', () => {
            this.hideCirclePropertiesPopup();
        });

        // Polygon properties popup event listeners
        document.getElementById('closePolygonProperties').addEventListener('click', () => {
            this.hidePolygonPropertiesPopup();
        });

        // Tree properties popup event listeners
        document.getElementById('closeTreeProperties').addEventListener('click', () => {
            this.hideTreePropertiesPopup();
        });

        // STL properties popup event listeners
        document.getElementById('closeSTLProperties').addEventListener('click', () => {
            this.hideSTLPropertiesPopup();
        });

        // STL properties auto-save listeners
        this.setupSTLPropertiesListeners();

        // Auto-save event listeners for shape properties
        this.setupAutoSaveListeners();

        // Real-time scale update for trees
        document.getElementById('treeScale').addEventListener('input', (e) => {
            this.updateTreeScaleInRealTime(parseFloat(e.target.value));
        });
    }

    /**
     * Check if a name is unique in the scene
     * @param {string} newName - The new name to check
     * @param {BABYLON.Mesh} currentObject - The current object being renamed (to exclude from check)
     * @returns {boolean} - True if name is unique, false if duplicate
     */
    isNameUnique(newName, currentObject) {
        if (!newName || newName.trim() === '') {
            return false; // Empty name is not valid
        }
        
        const scene = this.sceneManager.getScene();
        if (!scene) return false;
        
        // Check all meshes in the scene
        const existingMesh = scene.getMeshByName(newName);
        
        // If a mesh with this name exists and it's not the current object, name is duplicate
        if (existingMesh && existingMesh !== currentObject) {
            return false;
        }
        
        // Also check transform nodes (for trees)
        const existingTransformNode = scene.getTransformNodeByName(newName);
        if (existingTransformNode && existingTransformNode !== currentObject) {
            return false;
        }
        
        return true; // Name is unique
    }

    /**
     * Setup auto-save event listeners for all property inputs
     */
    setupAutoSaveListeners() {
        // Shape name validation
        const shapeNameInput = document.getElementById('shapeName');
        if (shapeNameInput) {
            let originalShapeName = '';
            
            shapeNameInput.addEventListener('focus', () => {
                originalShapeName = shapeNameInput.value;
            });
            
            shapeNameInput.addEventListener('blur', () => {
                const newName = shapeNameInput.value.trim();
                if (newName === '') {
                    shapeNameInput.value = originalShapeName;
                    alert('Name cannot be empty');
                    return;
                }
                
                if (!this.isNameUnique(newName, this.currentShape)) {
                    shapeNameInput.value = originalShapeName;
                    alert('Duplicate name. Please choose a different name.');
                    return;
                }
                
                // Name is unique, update the object name
                if (this.currentShape) {
                    this.currentShape.name = newName;
                    // Also update extrusion name if exists
                    if (this.currentShape.extrusion) {
                        this.currentShape.extrusion.name = `${newName}_extrusion`;
                    }
                    this.dispatchSceneChangeEvent();
                }
            });
        }

        // Circle name validation
        const circleNameInput = document.getElementById('circleName');
        if (circleNameInput) {
            let originalCircleName = '';
            
            circleNameInput.addEventListener('focus', () => {
                originalCircleName = circleNameInput.value;
            });
            
            circleNameInput.addEventListener('blur', () => {
                const newName = circleNameInput.value.trim();
                if (newName === '') {
                    circleNameInput.value = originalCircleName;
                    alert('Name cannot be empty');
                    return;
                }
                
                if (!this.isNameUnique(newName, this.currentShape)) {
                    circleNameInput.value = originalCircleName;
                    alert('Duplicate name. Please choose a different name.');
                    return;
                }
                
                // Name is unique, update the object name
                if (this.currentShape) {
                    this.currentShape.name = newName;
                    // Also update extrusion name if exists
                    if (this.currentShape.extrusion) {
                        this.currentShape.extrusion.name = `${newName}_extrusion`;
                    }
                    this.dispatchSceneChangeEvent();
                }
            });
        }

        // Polygon name validation
        const polygonNameInput = document.getElementById('polygonName');
        if (polygonNameInput) {
            let originalPolygonName = '';
            
            polygonNameInput.addEventListener('focus', () => {
                originalPolygonName = polygonNameInput.value;
            });
            
            polygonNameInput.addEventListener('blur', () => {
                const newName = polygonNameInput.value.trim();
                if (newName === '') {
                    polygonNameInput.value = originalPolygonName;
                    alert('Name cannot be empty');
                    return;
                }
                
                if (!this.isNameUnique(newName, this.currentPolygon)) {
                    polygonNameInput.value = originalPolygonName;
                    alert('Duplicate name. Please choose a different name.');
                    return;
                }
                
                // Name is unique, update the object name
                if (this.currentPolygon) {
                    this.currentPolygon.name = newName;
                    // Also update extrusion name if exists
                    if (this.currentPolygon.extrusion) {
                        this.currentPolygon.extrusion.name = `${newName}_extrusion`;
                    }
                    this.dispatchSceneChangeEvent();
                }
            });
        }

        // Tree name validation
        const treeNameInput = document.getElementById('treeName');
        if (treeNameInput) {
            let originalTreeName = '';
            
            treeNameInput.addEventListener('focus', () => {
                originalTreeName = treeNameInput.value;
            });
            
            treeNameInput.addEventListener('blur', () => {
                const newName = treeNameInput.value.trim();
                if (newName === '') {
                    treeNameInput.value = originalTreeName;
                    alert('Name cannot be empty');
                    return;
                }
                
                // For trees, use the currentTree (which is already the parent TransformNode)
                // If currentTree is a mesh, find its parent
                let currentTree = this.currentTree;
                if (currentTree instanceof BABYLON.Mesh && currentTree.parent instanceof BABYLON.TransformNode) {
                    currentTree = currentTree.parent;
                } else if (this.treeManager && currentTree) {
                    // Try to find the parent tree in TreeManager
                    const treeData = this.treeManager.trees.find(t => 
                        t.parent === currentTree || t.meshes.includes(currentTree)
                    );
                    if (treeData && treeData.parent) {
                        currentTree = treeData.parent;
                    }
                }
                
                if (!currentTree) {
                    console.error('Cannot update tree name: tree not found');
                    treeNameInput.value = originalTreeName;
                    return;
                }
                
                if (!this.isNameUnique(newName, currentTree)) {
                    treeNameInput.value = originalTreeName;
                    alert('Duplicate name. Please choose a different name.');
                    return;
                }
                
                // Name is unique, update the tree name
                currentTree.name = newName;
                this.dispatchSceneChangeEvent();
                
                // Update object list to reflect the name change
                if (this.objectListManager) {
                    this.objectListManager.updateObjectList();
                }
            });
        }

        // Shape properties auto-save
        // Note: shapeType has its own dedicated listener, so we exclude it here
        // IMPORTANT: Don't add input/change listeners for shapeLength, shapeWidth, shapeHeight
        // These are handled by setupContinuousParameterChange which provides better typing experience
        // Only add listeners for fields that don't use setupContinuousParameterChange
        const shapeInputs = [
            'shapeColor', 'shapeRadius'
        ];
        
        shapeInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('input', () => {
                    this.saveShapeProperties();
                });
                element.addEventListener('change', () => {
                    this.saveShapeProperties();
                });
            }
        });
        
        // NOTE: shapeLength, shapeWidth, and shapeHeight are handled by setupContinuousParameterChange
        // which provides debounced updates and better typing experience without interference

        // Circle properties auto-save
        const circleInputs = [
            'circleType', 'circleColor', 'circleDiameter', 'circleHeight'
        ];
        
        circleInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('input', () => {
                    this.saveCircleProperties();
                });
                element.addEventListener('change', () => {
                    this.saveCircleProperties();
                });
            }
        });

        // Polygon properties auto-save
        // NOTE: polygonType has its own dedicated listener below, so we exclude it here
        // NOTE: polygonHeight also has its own dedicated listener below, so we exclude it here
        const polygonInputs = [
            'polygonColor'
        ];
        
        polygonInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('input', () => {
                    // IMPORTANT: Only save if currentShape is set (polygon is selected)
                    if (this.currentShape) {
                        this.savePolygonProperties();
                    }
                });
                element.addEventListener('change', () => {
                    // IMPORTANT: Only save if currentShape is set (polygon is selected)
                    if (this.currentShape) {
                        this.savePolygonProperties();
                    }
                });
            }
        });

        // Tree properties auto-save (scale is already handled above)
        const treeInputs = [
            'treeScale'
        ];
        
        treeInputs.forEach(inputId => {
            const element = document.getElementById(inputId);
            if (element) {
                element.addEventListener('input', () => {
                    this.saveTreeProperties();
                });
                element.addEventListener('change', () => {
                    this.saveTreeProperties();
                });
            }
        });

        // Polygon type change listener
        // IMPORTANT: This listener is separate from the auto-save listeners to prevent duplicate execution
        const polygonTypeSelect = document.getElementById('polygonType');
        if (polygonTypeSelect) {
            polygonTypeSelect.addEventListener('change', (e) => {
                // IMPORTANT: Only process if currentShape is set (polygon is selected)
                if (!this.currentShape) {
                    console.warn('Polygon type changed but no polygon is selected');
                    return;
                }
                
                // IMPORTANT: Verify that currentShape is actually a polygon
                const shapeType = this.currentShape.userData?.shapeType;
                if (shapeType !== 'polygon') {
                    console.warn(`Polygon type changed but currentShape is not a polygon (shapeType: ${shapeType}), ignoring`);
                    return;
                }
                
                const newType = e.target.value;
                const currentPolygonName = this.currentShape.name;
                console.log(`[POLYGON_TYPE_CHANGE] Changing type for polygon "${currentPolygonName}" from "${this.currentShape.userData?.type}" to "${newType}"`);
                
                // Check if type actually changed by comparing with the previous value from the dropdown
                const currentTypeInUserData = this.currentShape?.userData?.type;
                const previousTypeInDropdown = e.target.getAttribute('data-previous-value') || currentTypeInUserData;
                const typeChanged = previousTypeInDropdown !== newType;
                
                // Store the new value for next comparison
                e.target.setAttribute('data-previous-value', newType);
                
            
            // Show/hide height field based on type
            // Only 'building' type can have height > 0, all other types should have height = 0
            const isBuilding = newType.toLowerCase() === 'building';
            const heightGroup = document.getElementById('polygonHeightGroup');
            const heightInput = document.getElementById('polygonHeight');
            if (isBuilding) {
                heightGroup.style.display = 'block';
                // Set default height for building if it's currently 0 or too small
                if (heightInput && parseFloat(heightInput.value) <= 0) {
                    heightInput.value = 1;
                }
            } else {
                heightGroup.style.display = 'none';
                // Set height to 0 for non-building types
                if (heightInput) {
                    heightInput.value = 0;
                }
                
                // IMPORTANT: Hide all building-related groups when type is not building
                // This includes period groups which should only be visible for buildings
                const archetypePeriodGroup = document.getElementById('polygonBuildingArchetypePeriodGroup');
                const groupPeriodGroup = document.getElementById('polygonBuildingGroupPeriodGroup');
                const envelopePropertiesGroup = document.getElementById('polygonBuildingEnvelopePropertiesGroup');
                const archytypesGroup = document.getElementById('polygonBuildingArchytypesGroup');
                const groupsGroup = document.getElementById('polygonBuildingGroupsGroup');
                const readonlyGroup = document.getElementById('polygonBuildingEnvelopeReadonlyValuesGroup');
                const customSpecGroup = document.getElementById('polygonBuildingCustomSpecGroup');
                const yearOfConstructionGroup = document.getElementById('polygonBuildingYearOfConstructionGroup');
                
                if (archetypePeriodGroup) archetypePeriodGroup.style.display = 'none';
                if (groupPeriodGroup) groupPeriodGroup.style.display = 'none';
                if (envelopePropertiesGroup) envelopePropertiesGroup.style.display = 'none';
                if (archytypesGroup) archytypesGroup.style.display = 'none';
                if (groupsGroup) groupsGroup.style.display = 'none';
                if (readonlyGroup) readonlyGroup.style.display = 'none';
                if (customSpecGroup) customSpecGroup.style.display = 'none';
                if (yearOfConstructionGroup) yearOfConstructionGroup.style.display = 'none';
            }
            
            // Color is now automatically determined by type (no color picker)
            
            // Update polygon name based on type (only if type actually changed)
            // IMPORTANT: Update name BEFORE updating userData.type
            if (typeChanged) {
                const newName = this.generateUniqueNameByType(newType);
                
                // Update both the polygon name and the popup field
                if (this.currentShape) {
                    const oldName = this.currentShape.name;
                    this.currentShape.name = newName;
                    
                    // Update userData.name to match the new name
                    if (this.currentShape.userData) {
                        this.currentShape.userData.name = newName;
                    }
                    // Also update extrusion name if exists
                    if (this.currentShape.extrusion) {
                        this.currentShape.extrusion.name = `${newName}_extrusion`;
                    }
                }
                
                // Update popup field
                const polygonNameInput = document.getElementById('polygonName');
                if (polygonNameInput) {
                    polygonNameInput.value = newName;
                }
                
                // Update object list to reflect the name change
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                }
                
                // Dispatch scene change event
                this.dispatchSceneChangeEvent();
            }
            
            // Update userData type AFTER name update
            // IMPORTANT: Name may have changed (ground1 → building1), so we can't check name
            // Instead, we verify that currentShape is still set and is a polygon
            if (this.currentShape) {
                // IMPORTANT: Get current name (may have changed from currentPolygonName)
                const currentNameAfterNameChange = this.currentShape.name;
                
                // IMPORTANT: Verify this is still a polygon (not a different shape type)
                const shapeType = this.currentShape.userData?.shapeType;
                if (shapeType && shapeType !== 'polygon') {
                    console.warn(`[POLYGON_TYPE_CHANGE] Shape type changed! Expected "polygon", got "${shapeType}", aborting`);
                    return;
                }
                
                // IMPORTANT: Preserve sideWallNormalsFlipped flag before updating
                const sideWallNormalsFlipped = this.currentShape.userData?.sideWallNormalsFlipped || false;
                
                // IMPORTANT: Create a new userData object to avoid reference sharing issues
                // Don't use Object.assign as it can share references
                const oldUserData = this.currentShape.userData || {};
                this.currentShape.userData = {
                    ...oldUserData,
                    type: newType,
                    shapeType: 'polygon', // Always keep shapeType as 'polygon'
                    sideWallNormalsFlipped: sideWallNormalsFlipped
                };
                
                console.log(`[POLYGON_TYPE_CHANGE] Updated userData.type to "${newType}" for polygon "${currentNameAfterNameChange}" (was "${currentPolygonName}")`);
            }
            
            // IMPORTANT: Update polygon material and color FIRST
            // This ensures color is updated immediately
            if (this.currentShape) {
                this.updatePolygonMaterialByType(this.currentShape, newType);
            }
            
            // IMPORTANT: Don't call savePolygonProperties here because:
            // 1. We've already updated userData.type above
            // 2. updatePolygonMaterialByType has already updated the color
            // 3. savePolygonProperties reads from DOM which may cause timing issues
            // Instead, we'll update the object list directly
            
            // IMPORTANT: Force immediate update of object list
            // Use requestAnimationFrame to ensure DOM and userData are fully updated
            requestAnimationFrame(() => {
                // Get current shape name (may have changed from currentPolygonName)
                const finalPolygonName = this.currentShape?.name || currentPolygonName;
                
                // Double-check that userData.type is correct
                if (this.currentShape) {
                    if (this.currentShape.userData?.type !== newType) {
                        console.warn(`[POLYGON_TYPE_CHANGE] Type mismatch detected! Expected "${newType}", got "${this.currentShape.userData?.type}". Forcing update...`);
                        // Force update userData.type
                        if (!this.currentShape.userData) {
                            this.currentShape.userData = {};
                        }
                        this.currentShape.userData.type = newType;
                        console.log(`[POLYGON_TYPE_CHANGE] Forced userData.type to "${newType}" for polygon "${finalPolygonName}"`);
                    }
                    
                    // Also update extrusion userData.type if it exists
                    if (this.currentShape.extrusion) {
                        if (!this.currentShape.extrusion.userData) {
                            this.currentShape.extrusion.userData = {};
                        }
                        this.currentShape.extrusion.userData.type = newType;
                        console.log(`[POLYGON_TYPE_CHANGE] Updated extrusion userData.type to "${newType}" for "${finalPolygonName}_extrusion"`);
                    }
                    
                    // Verify final state
                    console.log(`[POLYGON_TYPE_CHANGE] Final state - Polygon: "${finalPolygonName}", userData.type: "${this.currentShape.userData?.type}", expected: "${newType}"`);
                }
                
                // Update object list
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                    console.log(`[POLYGON_TYPE_CHANGE] Object list updated for polygon "${finalPolygonName}" with type "${newType}"`);
                }
                
                // Dispatch scene change event to ensure all listeners are notified
                this.dispatchSceneChangeEvent();
            });
            });
        }

        // Polygon color change listener
        // Color picker removed - color is now automatically determined by type

        // Polygon height change listener (only for building type)
        const polygonHeightInput = document.getElementById('polygonHeight');
        if (polygonHeightInput) {
            polygonHeightInput.addEventListener('input', (e) => {
                // IMPORTANT: Only process if currentShape is set (polygon is selected)
                if (!this.currentShape || this.currentShape.userData?.type !== 'building') {
                    return;
                }
                
                const newHeight = parseFloat(e.target.value) || 1;
                console.log('[HEIGHT_CHANGE] Polygon height changed to:', newHeight, 'for polygon:', this.currentShape.name);
                
                // Update polygon height in real-time (only for building type)
                // IMPORTANT: Calculate originalHeight from current scaling to preserve position correctly
                let originalHeight = this.currentShape.userData?.originalHeight;
                if (!originalHeight || originalHeight <= 0) {
                    // If originalHeight is not set, calculate it from current extrusion scaling
                    if (this.currentShape.extrusion) {
                        const currentScaling = this.currentShape.extrusion.scaling.y;
                        const currentHeight = this.currentShape.userData?.currentHeight || newHeight;
                        originalHeight = currentHeight / currentScaling;
                        if (originalHeight <= 0) originalHeight = 1; // Fallback to 1
                        // Store it for future use
                        if (!this.currentShape.userData) this.currentShape.userData = {};
                        this.currentShape.userData.originalHeight = originalHeight;
                    } else {
                        originalHeight = 1; // Default fallback
                    }
                }
                const scaleFactor = newHeight / originalHeight;
                
                // IMPORTANT: For extrusion, we need to ensure it only grows upward
                if (this.currentShape.extrusion) {
                    // Log current positions before change
                    const polygonPosBefore = this.currentShape.position.clone();
                    const extrusionPosBefore = this.currentShape.extrusion.position.clone();
                    const extrusionScaleBefore = this.currentShape.extrusion.scaling.y;
                    console.log('[HEIGHT_CHANGE] BEFORE - Polygon position:', 
                        `(${polygonPosBefore.x.toFixed(3)}, ${polygonPosBefore.y.toFixed(3)}, ${polygonPosBefore.z.toFixed(3)})`);
                    console.log('[HEIGHT_CHANGE] BEFORE - Extrusion position (world):', 
                        `(${extrusionPosBefore.x.toFixed(3)}, ${extrusionPosBefore.y.toFixed(3)}, ${extrusionPosBefore.z.toFixed(3)})`);
                    console.log('[HEIGHT_CHANGE] BEFORE - Extrusion scaling.y:', extrusionScaleBefore.toFixed(3));
                    
                    // IMPORTANT: Keep polygon position FIXED - do NOT change it
                    // The polygon position should remain constant, only extrusion scales
                    const polygonY = this.currentShape.position.y;
                    console.log(`[HEIGHT_CHANGE] Keeping polygon position.y at ${polygonY.toFixed(3)} (preserving user's position)`);
                    
                    // IMPORTANT: Get current base world Y BEFORE scaling
                    // This is the world Y position of the extrusion's base that we want to preserve
                    // Since extrusion is NOT a child of polygon, position is in world space
                    // IMPORTANT: Use extrusion's actual base world Y, not polygon.position.y
                    // This ensures that if extrusion was moved to a higher position, we preserve that position
                    this.currentShape.extrusion.computeWorldMatrix(true);
                    this.currentShape.extrusion.refreshBoundingInfo();
                    const extrusionBoundingInfoBefore = this.currentShape.extrusion.getBoundingInfo();
                    const baseWorldYBefore = extrusionBoundingInfoBefore && extrusionBoundingInfoBefore.boundingBox ? 
                        extrusionBoundingInfoBefore.boundingBox.minimumWorld.y : polygonY;
                    
                    console.log(`[HEIGHT_CHANGE] Current polygon Y: ${polygonY.toFixed(3)}, extrusion base world Y: ${baseWorldYBefore.toFixed(3)}, will preserve extrusion base at ${baseWorldYBefore.toFixed(3)}`);
                    
                    // Scale extrusion (NOT the polygon, since extrusion is the 3D part)
                    this.currentShape.extrusion.scaling.y = scaleFactor;
                    
                    // IMPORTANT: After scaling, extrusion base will move because scaling happens around the mesh center
                    // We need to adjust extrusion position to keep the base at the same world Y
                    // Since extrusion is in world space, we adjust position.y directly
                    this.currentShape.extrusion.computeWorldMatrix(true);
                    const extrusionBoundingInfoAfter = this.currentShape.extrusion.getBoundingInfo();
                    const baseWorldYAfter = extrusionBoundingInfoAfter && extrusionBoundingInfoAfter.boundingBox ? 
                        extrusionBoundingInfoAfter.boundingBox.minimumWorld.y : baseWorldYBefore;
                    
                    // Calculate the delta - how much the base moved
                    const deltaY = baseWorldYAfter - baseWorldYBefore;
                    
                    console.log(`[HEIGHT_CHANGE] After scaling - Extrusion base world Y: ${baseWorldYAfter.toFixed(3)}, Expected: ${baseWorldYBefore.toFixed(3)}, Delta: ${deltaY.toFixed(3)}`);
                    
                    // Adjust extrusion position to compensate for the base movement
                    // Move extrusion down by deltaY to bring base back to original position
                    if (Math.abs(deltaY) > 0.001) {
                        this.currentShape.extrusion.position.y = this.currentShape.extrusion.position.y - deltaY;
                        this.currentShape.extrusion.computeWorldMatrix(true);
                        const finalBoundingInfo = this.currentShape.extrusion.getBoundingInfo();
                        const finalBaseY = finalBoundingInfo && finalBoundingInfo.boundingBox ? 
                            finalBoundingInfo.boundingBox.minimumWorld.y : baseWorldYBefore;
                        console.log(`[HEIGHT_CHANGE] Fixed extrusion base: adjusted position.y by ${-deltaY.toFixed(3)}, final base Y: ${finalBaseY.toFixed(3)}`);
                    }
                    
                    // IMPORTANT: Do NOT scale the polygon itself - only the extrusion
                    this.currentShape.scaling.y = 1; // Keep polygon scaling at 1
                    
                    // Update userData to reflect the new height
                    if (!this.currentShape.userData) this.currentShape.userData = {};
                    this.currentShape.userData.currentHeight = newHeight;
                    
                    // IMPORTANT: Ensure polygon position.y remains at its current value
                    // Do NOT adjust polygon position - preserve user's position
                    // The extrusion position adjustment handles keeping the base at the correct world Y
                    
                    // Log positions after change
                    const polygonPosAfter = this.currentShape.position.clone();
                    const extrusionPosAfter = this.currentShape.extrusion.position.clone();
                    const extrusionScaleAfter = this.currentShape.extrusion.scaling.y;
                    console.log('[HEIGHT_CHANGE] AFTER - Polygon position:', 
                        `(${polygonPosAfter.x.toFixed(3)}, ${polygonPosAfter.y.toFixed(3)}, ${polygonPosAfter.z.toFixed(3)})`);
                    console.log('[HEIGHT_CHANGE] AFTER - Extrusion position (relative):', 
                        `(${extrusionPosAfter.x.toFixed(3)}, ${extrusionPosAfter.y.toFixed(3)}, ${extrusionPosAfter.z.toFixed(3)})`);
                    console.log('[HEIGHT_CHANGE] AFTER - Extrusion scaling.y:', extrusionScaleAfter.toFixed(3));
                    
                    // Check if polygon position changed (it shouldn't!)
                    if (Math.abs(polygonPosBefore.y - polygonPosAfter.y) > 0.001) {
                        console.warn('[HEIGHT_CHANGE] WARNING: Polygon position.y changed!', 
                            `Before: ${polygonPosBefore.y.toFixed(3)}, After: ${polygonPosAfter.y.toFixed(3)}`);
                    }
                    
                    // Calculate world position of extrusion base (use existing extrusionBoundingInfo if available)
                    this.currentShape.extrusion.computeWorldMatrix(true);
                    this.currentShape.extrusion.refreshBoundingInfo(); // Refresh bounding info after scaling
                    const finalExtrusionBoundingInfo = this.currentShape.extrusion.getBoundingInfo();
                    if (finalExtrusionBoundingInfo && finalExtrusionBoundingInfo.boundingBox) {
                        const extrusionBaseWorldY = finalExtrusionBoundingInfo.boundingBox.minimumWorld.y;
                        console.log('[HEIGHT_CHANGE] Extrusion base world Y:', extrusionBaseWorldY.toFixed(3));
                    }
                    
                    // IMPORTANT: Update wireframe transforms to match the scaled extrusion
                    // This ensures wireframe updates in real-time as height changes
                    if (this.selectionManager) {
                        // Check if extrusion is selected (has wireframe)
                        const isExtrusionSelected = this.selectionManager.selectedObjects.includes(this.currentShape.extrusion);
                        if (isExtrusionSelected) {
                            // Update wireframe transforms to sync with scaled extrusion
                            this.selectionManager.updateWireframeTransforms(this.currentShape.extrusion);
                            console.log('[HEIGHT_CHANGE] Wireframe transforms updated for extrusion');
                        }
                    }
                } else {
                    // If no extrusion, scale polygon directly (shouldn't happen for building type)
                    const baseY = this.getPolygonBaseWorldY(this.currentShape);
                    this.currentShape.scaling.y = scaleFactor;
                    this.realignPolygonBase(this.currentShape, baseY);
                    
                    // Update wireframe for polygon
                    if (this.selectionManager) {
                        this.selectionManager.updateWireframeTransforms(this.currentShape);
                    }
                }
                
                this.currentShape.userData.currentHeight = newHeight;
                
                // NOTE: When using scaling, normals are automatically scaled correctly by Babylon.js
                // We should NOT recalculate normals when height changes via scaling, as this causes shadow issues
                // Only update normals if the mesh geometry itself is recreated (not when scaling changes)
            });
        }

        // Shape type change
        document.getElementById('shapeType').addEventListener('change', (e) => {
            const newType = e.target.value;
            
            // [DEBUG] Log type change attempt
            console.log('[TYPE_CHANGE_DEBUG] ========================================');
            console.log('[TYPE_CHANGE_DEBUG] Type change event triggered');
            console.log('[TYPE_CHANGE_DEBUG] New type:', newType);
            console.log('[TYPE_CHANGE_DEBUG] Current shape:', this.currentShape?.name);
            console.log('[TYPE_CHANGE_DEBUG] Current shape type in userData:', this.currentShape?.userData?.type);
            console.log('[TYPE_CHANGE_DEBUG] Stack trace:', new Error().stack);
            
            // Check if type actually changed by comparing with the current value in userData
            // But also check the previous value from the dropdown to handle cases where userData was already updated
            const currentTypeInUserData = this.currentShape?.userData?.type;
            const previousTypeInDropdown = e.target.getAttribute('data-previous-value') || currentTypeInUserData;
            const typeChanged = previousTypeInDropdown !== newType;
            
            console.log('[TYPE_CHANGE_DEBUG] Type changed?', typeChanged);
            console.log('[TYPE_CHANGE_DEBUG] Previous type:', previousTypeInDropdown);
            console.log('[TYPE_CHANGE_DEBUG] Current type in userData:', currentTypeInUserData);
            
            // Store the new value for next comparison
            e.target.setAttribute('data-previous-value', newType);
            
            // Color is now automatically determined by type (no color picker)
            
            // Update height field based on type
            // Only 'building' type can have height > 0, all other types should have height = 0
            const isBuilding = newType.toLowerCase() === 'building';
            const heightGroup = document.getElementById('heightGroup');
            const heightInput = document.getElementById('shapeHeight');
            
            if (heightGroup && heightInput) {
                if (isBuilding) {
                    heightGroup.style.display = 'flex';
                    // Set minimum height for building if it's currently 0 or too small
                    if (parseFloat(heightInput.value) <= 0) {
                        heightInput.value = 0.1;
                    }
                } else {
                    // For all non-building types, hide height input and set height to 0
                    heightGroup.style.display = 'none';
                    heightInput.value = 0;
                    
                    // IMPORTANT: Hide all building-related groups when type is not building
                    // This includes period groups which should only be visible for buildings
                    const archetypePeriodGroup = document.getElementById('buildingArchetypePeriodGroup');
                    const groupPeriodGroup = document.getElementById('buildingGroupPeriodGroup');
                    const envelopePropertiesGroup = document.getElementById('buildingEnvelopePropertiesGroup');
                    const archytypesGroup = document.getElementById('buildingArchytypesGroup');
                    const groupsGroup = document.getElementById('buildingGroupsGroup');
                    const readonlyGroup = document.getElementById('buildingEnvelopeReadonlyValuesGroup');
                    const customSpecGroup = document.getElementById('buildingCustomSpecGroup');
                    const yearOfConstructionGroup = document.getElementById('buildingYearOfConstructionGroup');
                    
                    if (archetypePeriodGroup) archetypePeriodGroup.style.display = 'none';
                    if (groupPeriodGroup) groupPeriodGroup.style.display = 'none';
                    if (envelopePropertiesGroup) envelopePropertiesGroup.style.display = 'none';
                    if (archytypesGroup) archytypesGroup.style.display = 'none';
                    if (groupsGroup) groupsGroup.style.display = 'none';
                    if (readonlyGroup) readonlyGroup.style.display = 'none';
                    if (customSpecGroup) customSpecGroup.style.display = 'none';
                    if (yearOfConstructionGroup) yearOfConstructionGroup.style.display = 'none';
                }
            }
            
            this.updatePropertiesFields(newType);
            
            // Update name based on new type (only if type actually changed)
            // IMPORTANT: Update name BEFORE updating userData.type, so updateShapeInRealTime can detect the change
            if (typeChanged) {
                const newName = this.generateUniqueNameByType(newType);
                
                // Update both the shape name and the popup field
                const oldName = this.currentShape.name;
                this.currentShape.name = newName;
                document.getElementById('shapeName').value = newName;
                
                // Update userData.name to match the new name
                if (this.currentShape.userData) {
                    this.currentShape.userData.name = newName;
                }
                
                // Update object list to reflect the name change
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                }
                
                // Dispatch scene change event
                this.dispatchSceneChangeEvent();
            }
            
            // Update userData type AFTER name update
            if (this.currentShape) {
                this.currentShape.userData = this.currentShape.userData || {};
                this.currentShape.userData.type = newType;
            }
            
            // IMPORTANT: Always update object list after type change (even if name didn't change)
            // This ensures the object is re-categorized in the correct category
            if (this.objectListManager && this.objectListManager.updateObjectList) {
                this.objectListManager.updateObjectList();
            }
            
            // Dispatch scene change event to ensure all listeners are notified
            this.dispatchSceneChangeEvent();
            
            // Update shape in real-time (this will update geometry and material, but not name since type is already updated)
            // Use setTimeout to ensure DOM is updated (color picker value) before reading it
            console.log('[TYPE_CHANGE_DEBUG] About to call updateShapeInRealTime()');
            setTimeout(() => {
                console.log('[TYPE_CHANGE_DEBUG] Calling updateShapeInRealTime() now');
                this.updateShapeInRealTime();
                console.log('[TYPE_CHANGE_DEBUG] updateShapeInRealTime() completed');
            }, 0);
        });

        // Real-time updates for all input fields
        // Color picker removed - color is now automatically determined by type

        // Add continuous parameter change functionality
        this.setupContinuousParameterChange('shapeLength', () => this.updateShapeInRealTime());
        this.setupContinuousParameterChange('shapeWidth', () => this.updateShapeInRealTime());
        this.setupContinuousParameterChange('shapeHeight', () => {
            this.updateShapeInRealTime();
            this.previewHeightChanges();
        });
        this.setupContinuousParameterChange('shapeRadius', () => this.updateShapeInRealTime());

        // Prevent keyboard events from closing popup when typing in input fields
        const popup = document.getElementById('propertiesPopup');
        popup.addEventListener('keydown', (event) => {
            // Stop all keyboard events when typing in input fields, textareas, or contentEditable elements
            const target = event.target;
            if (target && (
                target.tagName === 'INPUT' || 
                target.tagName === 'SELECT' || 
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            )) {
                event.stopPropagation();
                // Don't prevent default for input fields - allow normal typing
            }
        }, true); // Use capture phase to catch events early

        // Circle properties real-time updates
        document.getElementById('circleType').addEventListener('change', (e) => {
            const newType = e.target.value;
            console.log('Circle type changed to:', newType);
            
            // Check if type actually changed before updating userData
            const currentType = this.currentShape?.userData?.type;
            const typeChanged = currentType !== newType;
            console.log('Circle type change check:', { currentType, newType, typeChanged });
            
            // Color is now automatically determined by type (no color picker)
            
            // Update userData type
            if (this.currentShape) {
                this.currentShape.userData = this.currentShape.userData || {};
                this.currentShape.userData.type = newType;
                this.currentShape.userData.shapeType = newType === 'building' ? 'building' : 'circle';
                console.log('Updated circle userData.type to:', newType);
            }
            
            // Keep current values when changing type
            const currentDiameterTop = this.currentShape?.userData?.dimensions?.diameterTop || 0.1;
            document.getElementById('circleDiameter').value = currentDiameterTop;
            
            // Update height field based on type
            // Only 'building' type can have height > 0, all other types should have height = 0
            const isBuilding = newType.toLowerCase() === 'building';
            const heightGroup = document.getElementById('circleHeightGroup');
            const heightInput = document.getElementById('circleHeight');
            
            if (heightGroup && heightInput) {
                if (isBuilding) {
                    heightGroup.style.display = 'flex';
                    // Set minimum height for building if it's currently 0 or too small
                    if (parseFloat(heightInput.value) <= 0) {
                        heightInput.value = 0.1;
                    }
                } else {
                    // For all non-building types, hide height input and set height to 0
                    heightGroup.style.display = 'none';
                    heightInput.value = 0;
                    
                    // IMPORTANT: Hide all building-related groups when type is not building
                    // This includes period groups which should only be visible for buildings
                    const archetypePeriodGroup = document.getElementById('circleBuildingArchetypePeriodGroup');
                    const groupPeriodGroup = document.getElementById('circleBuildingGroupPeriodGroup');
                    const envelopePropertiesGroup = document.getElementById('circleBuildingEnvelopePropertiesGroup');
                    const archytypesGroup = document.getElementById('circleBuildingArchytypesGroup');
                    const groupsGroup = document.getElementById('circleBuildingGroupsGroup');
                    const readonlyGroup = document.getElementById('circleBuildingEnvelopeReadonlyValuesGroup');
                    const customSpecGroup = document.getElementById('circleBuildingCustomSpecGroup');
                    const yearOfConstructionGroup = document.getElementById('circleBuildingYearOfConstructionGroup');
                    
                    if (archetypePeriodGroup) archetypePeriodGroup.style.display = 'none';
                    if (groupPeriodGroup) groupPeriodGroup.style.display = 'none';
                    if (envelopePropertiesGroup) envelopePropertiesGroup.style.display = 'none';
                    if (archytypesGroup) archytypesGroup.style.display = 'none';
                    if (groupsGroup) groupsGroup.style.display = 'none';
                    if (readonlyGroup) readonlyGroup.style.display = 'none';
                    if (customSpecGroup) customSpecGroup.style.display = 'none';
                    if (yearOfConstructionGroup) yearOfConstructionGroup.style.display = 'none';
                }
            }
            
            // Update name based on new type (only if type actually changed)
            if (typeChanged) {
                const newName = this.generateUniqueNameByType(newType);
                console.log('Circle type changed from', currentType, 'to', newType, '- generating new name:', newName);
                // Update both the shape name and the popup field
                this.currentShape.name = newName;
                document.getElementById('circleName').value = newName;
                
                // Update userData.name to match the new name
                if (this.currentShape.userData) {
                    this.currentShape.userData.name = newName;
                }
                
                // Update object list to reflect the name change
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                }
                
                // Dispatch scene change event
                this.dispatchSceneChangeEvent();
            }
            
            // IMPORTANT: Always update object list after type change (even if name didn't change)
            // This ensures the object is re-categorized in the correct category
            if (this.objectListManager && this.objectListManager.updateObjectList) {
                this.objectListManager.updateObjectList();
            }
            
            // Dispatch scene change event to ensure all listeners are notified
            this.dispatchSceneChangeEvent();
            
            this.updateCircleInRealTime();
        });

        // Color picker removed - color is now automatically determined by type

        // Add continuous parameter change functionality for circles
        this.setupContinuousParameterChange('circleDiameter', () => this.updateCircleInRealTime());
        this.setupContinuousParameterChange('circleHeight', () => this.updateCircleInRealTime());

        // Prevent keyboard events from closing circle popup when typing in input fields
        const circlePopup = document.getElementById('circlePropertiesPopup');
        circlePopup.addEventListener('keydown', (event) => {
            // Stop all keyboard events when typing in input fields, textareas, or contentEditable elements
            const target = event.target;
            if (target && (
                target.tagName === 'INPUT' || 
                target.tagName === 'SELECT' || 
                target.tagName === 'TEXTAREA' ||
                target.isContentEditable
            )) {
                event.stopPropagation();
                // Don't prevent default for input fields - allow normal typing
            }
        }, true); // Use capture phase to catch events early
        
        // Prevent keyboard events from closing polygon popup when typing in input fields
        const polygonPopup = document.getElementById('polygonPropertiesPopup');
        if (polygonPopup) {
            polygonPopup.addEventListener('keydown', (event) => {
                const target = event.target;
                if (target && (
                    target.tagName === 'INPUT' || 
                    target.tagName === 'SELECT' || 
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                )) {
                    event.stopPropagation();
                }
            }, true);
        }
        
        // Prevent keyboard events from closing tree popup when typing in input fields
        const treePopup = document.getElementById('treePropertiesPopup');
        if (treePopup) {
            treePopup.addEventListener('keydown', (event) => {
                const target = event.target;
                if (target && (
                    target.tagName === 'INPUT' || 
                    target.tagName === 'SELECT' || 
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                )) {
                    event.stopPropagation();
                }
            }, true);
        }
        
        // Prevent keyboard events from closing STL popup when typing in input fields
        const stlPopup = document.getElementById('stlPropertiesPopup');
        if (stlPopup) {
            stlPopup.addEventListener('keydown', (event) => {
                const target = event.target;
                if (target && (
                    target.tagName === 'INPUT' || 
                    target.tagName === 'SELECT' || 
                    target.tagName === 'TEXTAREA' ||
                    target.isContentEditable
                )) {
                    event.stopPropagation();
                }
            }, true);
        }
    }

    /**
     * Show properties popup for a shape
     */
    showPropertiesPopup(shape) {
        this.currentShape = shape;
        
        // Get shape properties
        const properties = this.getShapeProperties(shape);
        console.log('Showing properties for shape:', shape.name);
        console.log('Shape userData:', shape.userData);
        console.log('Properties:', properties);
        
        // Color is now automatically determined by type (no color picker)
        
        // Fill form fields
        document.getElementById('shapeName').value = properties.name;
        const shapeTypeSelect = document.getElementById('shapeType');
        shapeTypeSelect.value = properties.type;
        // Store the initial type value for change detection
        shapeTypeSelect.setAttribute('data-previous-value', properties.type);
        document.getElementById('shapeLength').value = properties.length;
        document.getElementById('shapeWidth').value = properties.width;
        
        // Set height value for all types
        document.getElementById('shapeHeight').value = properties.height || 0.1;
        
        // Show/hide fields based on shape type
        this.updatePropertiesFields(properties.type);
        
        // Set radius value for shapes that have radius
        if (properties.shapeType === 'circle') {
            document.getElementById('shapeRadius').value = properties.radius || 0;
        }
        
        // Show popup
        const popup = document.getElementById('propertiesPopup');
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.adjustPropertiesPopupPositionForElement(popup);
    }

    /**
     * Hide properties popup
     */
    hidePropertiesPopup() {
        // Remove preview extrusion when hiding popup
        this.removePreviewExtrusion();
        
        document.getElementById('propertiesPopup').classList.remove('show');
        document.getElementById('circlePropertiesPopup').classList.remove('show');
        document.getElementById('polygonPropertiesPopup').classList.remove('show');
        document.getElementById('treePropertiesPopup').classList.remove('show');
        document.getElementById('stlPropertiesPopup').classList.remove('show');
        this.currentShape = null;
    }

    /**
     * Show circle properties popup
     */
    showCirclePropertiesPopup(shape) {
        this.currentShape = shape;
        
        // Get shape properties
        const properties = this.getShapeProperties(shape);
        console.log('Showing circle properties for shape:', shape.name);
        console.log('Shape userData:', shape.userData);
        console.log('Properties:', properties);
        
        // Color is now automatically determined by type (no color picker)
        
        // Fill form fields
        document.getElementById('circleName').value = properties.name;
        document.getElementById('circleType').value = properties.type;
        
        // Set values for diameter and height
        document.getElementById('circleDiameter').value = properties.diameterTop || 0.1;
        document.getElementById('circleHeight').value = properties.height || 0.1;
        
        // Show popup
        const popup = document.getElementById('circlePropertiesPopup');
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.adjustPropertiesPopupPositionForElement(popup);
    }

    /**
     * Hide circle properties popup
     */
    hideCirclePropertiesPopup() {
        document.getElementById('circlePropertiesPopup').classList.remove('show');
        this.currentShape = null;
    }

    /**
     * Show tree properties popup
     */
    showTreePropertiesPopup(tree) {
        // If tree is a mesh child, find the parent TransformNode
        let treeParent = tree;
        if (tree instanceof BABYLON.Mesh && tree.parent instanceof BABYLON.TransformNode) {
            treeParent = tree.parent;
        } else if (this.treeManager) {
            // Try to find the parent tree in TreeManager
            const treeData = this.treeManager.trees.find(t => 
                t.parent === tree || t.meshes.includes(tree)
            );
            if (treeData && treeData.parent) {
                treeParent = treeData.parent;
            }
        }
        
        this.currentShape = treeParent;
        this.currentTree = treeParent; // Store tree reference for name validation
        
        console.log('Showing tree properties for:', treeParent.name, '(original object:', tree.name, ')');
        
        // Get tree type from name (e.g., "tree_1_0" -> "1")
        const treeType = this.getTreeTypeFromName(treeParent.name);
        
        // Fill form fields - use parent name, not child mesh name
        document.getElementById('treeName').value = treeParent.name;
        document.getElementById('treeCategory').value = 'Tree';
        
        // Set current scale value from parent
        const currentScale = treeParent.scaling.x; // Use X scaling as reference
        document.getElementById('treeScale').value = currentScale.toFixed(1);
        
        // Show popup
        const popup = document.getElementById('treePropertiesPopup');
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.adjustPropertiesPopupPositionForElement(popup);
    }

    /**
     * Hide tree properties popup
     */
    hideTreePropertiesPopup() {
        document.getElementById('treePropertiesPopup').classList.remove('show');
        this.currentShape = null;
    }

    /**
     * Show STL properties popup
     */
    showSTLPropertiesPopup(mesh) {
        this.currentShape = mesh;
        this.currentSTLMesh = mesh; // Store STL mesh reference for name validation
        
        console.log('Showing STL properties for mesh:', mesh.name);
        console.log('Mesh userData:', mesh.userData);
        
        // Fill form fields
        const stlNameInput = document.getElementById('stlName');
        const stlTypeSelect = document.getElementById('stlType');
        const stlNameError = document.getElementById('stlNameError');
        
        if (stlNameInput) {
            stlNameInput.value = mesh.name || '';
        }
        
        if (stlTypeSelect) {
            const type = mesh.userData?.type || 'ground';
            stlTypeSelect.value = type;
        }
        
        // Clear error message
        if (stlNameError) {
            stlNameError.style.display = 'none';
            stlNameError.textContent = '';
        }
        
        // Show popup
        const popup = document.getElementById('stlPropertiesPopup');
        if (popup) {
            popup.classList.add('show');
            // Adjust position based on object list visibility
            this.adjustPropertiesPopupPositionForElement(popup);
        }
    }

    /**
     * Hide STL properties popup
     */
    hideSTLPropertiesPopup() {
        const popup = document.getElementById('stlPropertiesPopup');
        if (popup) {
            popup.classList.remove('show');
        }
        this.currentShape = null;
        this.currentSTLMesh = null;
    }

    /**
     * Setup STL properties listeners
     */
    setupSTLPropertiesListeners() {
        const stlNameInput = document.getElementById('stlName');
        const stlTypeSelect = document.getElementById('stlType');
        const stlNameError = document.getElementById('stlNameError');
        
        if (!stlNameInput || !stlTypeSelect) {
            console.warn('STL properties inputs not found');
            return;
        }
        
        // Store original name for validation
        let originalSTLName = '';
        
        stlNameInput.addEventListener('focus', () => {
            originalSTLName = stlNameInput.value;
        });
        
        stlNameInput.addEventListener('blur', () => {
            const newName = stlNameInput.value.trim();
            
            // Clear previous error
            if (stlNameError) {
                stlNameError.style.display = 'none';
                stlNameError.textContent = '';
            }
            
            // Validate name
            if (!newName || newName === '') {
                if (stlNameError) {
                    stlNameError.textContent = 'Name cannot be empty';
                    stlNameError.style.display = 'block';
                }
                // Restore original name
                stlNameInput.value = originalSTLName;
                return;
            }
            
            // Check if name is unique
            if (!this.isNameUnique(newName, this.currentSTLMesh)) {
                if (stlNameError) {
                    stlNameError.textContent = 'Name already exists. Please choose a different name.';
                    stlNameError.style.display = 'block';
                }
                // Restore original name
                stlNameInput.value = originalSTLName;
                return;
            }
            
            // Update mesh name if valid
            if (this.currentSTLMesh && newName !== originalSTLName) {
                this.currentSTLMesh.name = newName;
                console.log(`STL mesh renamed to: ${newName}`);
                
                // Update object list if available
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                }
            }
        });
        
        // Type change listener
        stlTypeSelect.addEventListener('change', () => {
            if (!this.currentSTLMesh) return;
            
            const newType = stlTypeSelect.value;
            const oldType = this.currentSTLMesh.userData?.type;
            
            if (newType !== oldType) {
                // Update userData
                this.currentSTLMesh.userData.type = newType;
                this.currentSTLMesh.userData.shapeType = newType === 'tree' ? 'tree' : 
                    (newType === 'building' ? 'building' : 'polygon');
                
                // Update material color based on type
                if (this.currentSTLMesh.material) {
                    const color = this.getColorByType(newType);
                    this.currentSTLMesh.material.diffuseColor = color;
                }
                
                // Update name based on new type
                const newName = this.generateUniqueNameByType(newType);
                console.log(`STL mesh type changed from ${oldType} to ${newType}, generating new name: ${newName}`);
                
                // Update both the mesh name and the popup field
                this.currentSTLMesh.name = newName;
                if (this.currentSTLMesh.userData) {
                    this.currentSTLMesh.userData.name = newName;
                }
                document.getElementById('stlName').value = newName;
                
                // IMPORTANT: Always update object list after type change
                // This ensures the object is re-categorized in the correct category
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                }
                
                // Dispatch scene change event to ensure all listeners are notified
                this.dispatchSceneChangeEvent();
            } else {
                // Even if type didn't change, update object list to ensure categorization is correct
                // This handles edge cases where userData.type might have been updated elsewhere
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                }
            }
        });
    }

    /**
     * Get tree type from tree name
     */
    getTreeTypeFromName(name) {
        // Extract type from names like "tree_1_0" or "simple_tree_1_0"
        const match = name.match(/(?:tree_|simple_tree_)(\d+)_/);
        return match ? match[1] : '1';
    }

    /**
     * Update shape in real-time based on popup values (for rectangles and other shapes)
     */
    updateShapeInRealTime() {
        if (!this.currentShape) {
            console.log('[UPDATE_SHAPE_DEBUG] updateShapeInRealTime() called but no currentShape');
            return;
        }

        // IMPORTANT: Check if this is actually a polygon
        // Polygons have their own update mechanism and should NOT use updateRectangleGeometryLikeCircle
        const actualShapeType = this.getShapeType(this.currentShape);
        if (actualShapeType === 'polygon') {
            console.log('[UPDATE_SHAPE_DEBUG] Shape is a polygon, updateShapeInRealTime() should not be called for polygons');
            console.log('[UPDATE_SHAPE_DEBUG] Polygon updates are handled by updatePolygonMaterialByType()');
            return; // Don't proceed with rectangle geometry update
        }

        console.log('[UPDATE_SHAPE_DEBUG] ========================================');
        console.log('[UPDATE_SHAPE_DEBUG] updateShapeInRealTime() called');
        console.log('[UPDATE_SHAPE_DEBUG] Current shape:', this.currentShape.name);
        console.log('[UPDATE_SHAPE_DEBUG] Current shape type:', this.currentShape.userData?.type);
        console.log('[UPDATE_SHAPE_DEBUG] Actual shape type:', actualShapeType);
        console.log('[UPDATE_SHAPE_DEBUG] Stack trace:', new Error().stack);

        // Store current focus element to restore it after update
        const activeElement = document.activeElement;
        const wasInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
        const focusedInputId = wasInputFocused ? activeElement.id : null;

        // Get current values from popup (for rectangles and other shapes)
        const type = document.getElementById('shapeType').value;
        // Color is now automatically determined by type, not from color picker
        // IMPORTANT: Allow length and width to be 0 or any positive value (like height)
        // Don't force minimum of 0.1 - let user enter any value >= 0
        const length = Math.max(parseFloat(document.getElementById('shapeLength').value) || 1.0, 0);
        const width = Math.max(parseFloat(document.getElementById('shapeWidth').value) || 1.0, 0);
        
        // For all types except 'building', height should be 0
        const isBuilding = type?.toLowerCase() === 'building';
        const heightInput = document.getElementById('shapeHeight');
        let height;
        if (isBuilding) {
            // Only building type can have height > 0
            height = Math.max(parseFloat(heightInput?.value || 0.1) || 0.1, 0.1);
        } else {
            // All other types (ground, grass, waterway, highway, etc.) should have height = 0
            height = 0;
            // Update height input to 0 for non-building types
            if (heightInput) {
                heightInput.value = 0;
            }
        }
        const radius = parseFloat(document.getElementById('shapeRadius').value) || 0;
        
        // IMPORTANT: Don't round values - use them as-is to allow any precision
        // This allows users to enter any number they want without forced rounding
        const roundedLength = length;
        const roundedWidth = width;
        const roundedHeight = height;
        const roundedRadius = radius;
        
        // Log height for non-building types
        if (!isBuilding) {
            console.log(`[HEIGHT] Rectangle type="${type}" height=${roundedHeight} (should be 0 for non-building types)`);
        }

        // Get color automatically based on type (user cannot change color manually)
        const newColor = this.getColorByType(type);
        
        // Update material color immediately for visual feedback
        if (this.currentShape.material && this.currentShape.material.diffuseColor) {
            this.currentShape.material.diffuseColor = newColor;
        }
        
        // Also update extrusion color if it exists (for rectangles with extrusion)
        if (this.currentShape.extrusion && this.currentShape.extrusion.material) {
            this.currentShape.extrusion.material.diffuseColor = newColor;
        }

        // For rectangles, update geometry
        // Note: Polygon check was already done at the beginning of this function
        // Update userData (type may have already been updated in the change listener)
        // Don't regenerate name here - it's already handled in the change listener
        this.currentShape.userData.type = type;
        this.currentShape.userData.shapeType = type === 'building' ? 'building' : 'rectangle';

        // Update geometry based on shape type
        
        // Update rectangle geometry using CircleManager-like approach
        console.log('[UPDATE_SHAPE_DEBUG] About to call updateRectangleGeometryLikeCircle()');
        console.log('[UPDATE_SHAPE_DEBUG] Parameters:', { roundedLength, roundedWidth, roundedHeight, type });
        const newRectangle = this.updateRectangleGeometryLikeCircle(this.currentShape, roundedLength, roundedWidth, roundedHeight, type);
        if (newRectangle) {
            console.log('[UPDATE_SHAPE_DEBUG] New rectangle created:', newRectangle.name);
            this.currentShape = newRectangle;
        } else {
            console.log('[UPDATE_SHAPE_DEBUG] No new rectangle returned');
        }
        console.log('[UPDATE_SHAPE_DEBUG] updateShapeInRealTime() finished');
        
        // Restore focus to the input field if it was focused before
        if (wasInputFocused && focusedInputId) {
            // Use setTimeout to ensure DOM is updated
            setTimeout(() => {
                const inputElement = document.getElementById(focusedInputId);
                if (inputElement) {
                    // IMPORTANT: setSelectionRange only works for text inputs, not number inputs
                    // Check if input type supports selection before trying to restore cursor position
                    const inputType = inputElement.type;
                    if (inputType === 'text' || inputType === 'textarea' || inputElement.isContentEditable) {
                        const cursorPosition = inputElement.selectionStart || 0;
                        inputElement.focus();
                        // Try to restore cursor position (only for text inputs)
                        if (inputElement.setSelectionRange) {
                            try {
                                inputElement.setSelectionRange(cursorPosition, cursorPosition);
                            } catch (e) {
                                // Ignore error if setSelectionRange fails
                                console.debug('Could not restore cursor position for input type:', inputType);
                            }
                        }
                    } else {
                        // For number inputs, just focus without trying to restore cursor position
                        inputElement.focus();
                    }
                }
            }, 0);
        }
    }

    /**
     * Update rectangle geometry like CircleManager (preserves focus and works smoothly)
     */
    updateRectangleGeometryLikeCircle(shape, newLength, newWidth, newHeight, type) {
        console.log('[GEOMETRY_UPDATE_DEBUG] ========================================');
        console.log('[GEOMETRY_UPDATE_DEBUG] updateRectangleGeometryLikeCircle() called');
        console.log('[GEOMETRY_UPDATE_DEBUG] Shape:', shape?.name);
        console.log('[GEOMETRY_UPDATE_DEBUG] Parameters:', { newLength, newWidth, newHeight, type });
        console.log('[GEOMETRY_UPDATE_DEBUG] Stack trace:', new Error().stack);
        
        if (!shape || !shape.userData) {
            console.warn('[GEOMETRY_UPDATE_DEBUG] Cannot update: no shape or userData');
            return;
        }
        
        // Check if this is a rectangle or building
        const isRectangle = shape.userData.shapeType === 'rectangle' || shape.userData.shapeType === 'building';
        
        if (!isRectangle) {
            console.warn('Cannot update: not a rectangle or building');
            return;
        }
        
        // For all types except 'building', height should be 0 (use flat box)
        const isBuilding = type?.toLowerCase() === 'building';
        const actualHeight = isBuilding ? newHeight : 0.001; // Use very small height for non-building types
        
        // Log height for non-building types
        if (!isBuilding) {
            console.log(`[HEIGHT] Rectangle "${shape.name}" type="${type}" height=${newHeight} (should be 0 for non-building types, using ${actualHeight} for rendering)`);
        }
        
        // Store current transform properties
        const currentPosition = shape.position.clone();
        const currentRotation = shape.rotation.clone();
        const currentScaling = shape.scaling.clone();
        
        // Store references before disposing
        const oldMaterial = shape.material;
        const materialName = oldMaterial ? oldMaterial.name : null;
        const oldExtrusion = shape.extrusion;
        const oldName = shape.name;
        const oldUserData = shape.userData ? JSON.parse(JSON.stringify(shape.userData)) : null;
        
        // Unlink extrusion before disposing to prevent issues
        if (oldExtrusion) {
            oldExtrusion.setParent(null);
            if (oldExtrusion.basePolygon === shape) {
                oldExtrusion.basePolygon = null;
            }
        }
        
        // Store selection state before removing from selection manager
        const wasSelected = this.selectionManager && this.selectionManager.isSelected(shape);
        
        // Remove from selection manager before disposing
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(shape);
            if (oldExtrusion) {
                this.selectionManager.removeSelectableObject(oldExtrusion);
            }
        }
        
        // Check if material is shared with other meshes before disposing
        let shouldDisposeMaterial = true;
        if (oldMaterial && oldMaterial !== this.sceneManager.getScene().defaultMaterial) {
            const scene = this.sceneManager.getScene();
            // Check if this material is used by other meshes
            const meshesUsingMaterial = scene.meshes.filter(m => m.material === oldMaterial && m !== shape);
            if (meshesUsingMaterial.length > 0) {
                console.log(`Material ${materialName} is shared with ${meshesUsingMaterial.length} other meshes, not disposing`);
                shouldDisposeMaterial = false;
            }
        }
        
        // Dispose old mesh
        if (shape.geometry) { shape.geometry.dispose(); }
        if (shouldDisposeMaterial && oldMaterial && oldMaterial !== this.sceneManager.getScene().defaultMaterial) {
            oldMaterial.dispose();
        }
        shape.setEnabled(false);
        shape.dispose();
        
        // Create new box with updated dimensions
        // Use the stored oldName to ensure we use the correct name (shape is disposed, so we can't use shape.name)
        console.log('[GEOMETRY_UPDATE_DEBUG] Creating new box with name:', oldName);
        console.log('[GEOMETRY_UPDATE_DEBUG] Dimensions:', { width: newLength, height: actualHeight, depth: newWidth, isBuilding });
        const newRectangle = BABYLON.MeshBuilder.CreateBox(oldName, {
            width: newLength,
            height: actualHeight,
            depth: newWidth
        }, this.sceneManager.getScene());
        console.log('[GEOMETRY_UPDATE_DEBUG] New rectangle created:', newRectangle.name);
        console.log('[GEOMETRY_UPDATE_DEBUG] Total meshes in scene:', this.sceneManager.getScene().meshes.length);
        
        // Restore all transform properties with smart Y positioning
        // IMPORTANT: Preserve the current bottom position when height changes
        // Calculate the bottom of the original rectangle (use stored userData since shape is disposed)
        const originalHeight = oldUserData?.dimensions?.height || oldUserData?.originalHeight || newHeight;
        const originalBottom = currentPosition.y - (originalHeight / 2);
        
        // IMPORTANT: Preserve the original bottom position (don't reset to Y=0)
        // This ensures that if a rectangle is at height 1m, changing its height won't move it back to ground
        const targetBottom = originalBottom; // Keep bottom at its current position
        
        // Position new rectangle with bottom at the same position, height grows upward only
        newRectangle.position = new BABYLON.Vector3(
            currentPosition.x,
            targetBottom + (actualHeight / 2), // Bottom at original position, center at targetBottom + actualHeight/2
            currentPosition.z
        );
        
        console.log(`[RECTANGLE_POSITION] Updated rectangle: type=${type}, isBuilding=${isBuilding}, originalBottom=${originalBottom.toFixed(3)}, targetBottom=${targetBottom.toFixed(3)}, actualHeight=${actualHeight.toFixed(3)}, newPosition.y=${(targetBottom + (actualHeight / 2)).toFixed(3)}`);
        newRectangle.rotation = currentRotation;
        newRectangle.scaling = currentScaling;
        
        // Create new material with color based on type
        // Use oldName since shape is already disposed
        const material = new BABYLON.StandardMaterial(`${oldName}Material`, this.sceneManager.getScene());
        // Get color automatically based on type
        const colorByType = this.getColorByType(type);
        material.diffuseColor = colorByType;
        material.backFaceCulling = false; // 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.alpha = 1.0;
        newRectangle.material = material;
        
        // Update userData first to get type
        // Store height: 0 for non-building types, actual height for building type
        const storedHeight = isBuilding ? newHeight : 0;
        newRectangle.userData = {
            type: type,
            shapeType: type === 'building' ? 'building' : 'rectangle',
            dimensions: {
                width: newLength,
                depth: newWidth,
                height: storedHeight  // Store 0 for non-building types in userData
            },
            originalHeight: storedHeight  // Store 0 for non-building types in userData
        };
        
        // Set rendering priority based on type (after userData is set)
        newRectangle.renderingGroupId = SceneManager.getRenderingGroupId(type);
        
        // Re-link extrusion to new mesh if it existed
        if (oldExtrusion) {
            // Re-parent extrusion to new mesh
            oldExtrusion.setParent(newRectangle);
            // Re-link bidirectional references
            newRectangle.extrusion = oldExtrusion;
            oldExtrusion.basePolygon = newRectangle;
            
            // Add extrusion back to selection manager
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(oldExtrusion);
            }
        }
        
        // IMPORTANT: Ensure new rectangle is visible and enabled before adding to selection manager
        newRectangle.isVisible = true;
        newRectangle.setEnabled(true);
        
        // IMPORTANT: Ensure new rectangle is in the scene
        const scene = this.sceneManager.getScene();
        if (!scene.meshes.includes(newRectangle)) {
            scene.addMesh(newRectangle);
            console.log(`[GEOMETRY_UPDATE_DEBUG] Added new rectangle ${newRectangle.name} to scene`);
        }
        
        // Add to selection manager
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(newRectangle);
            
            // Restore selection if it was selected before
            if (wasSelected && this.selectionManager) {
                console.log(`[GEOMETRY_UPDATE_DEBUG] Restoring selection for ${newRectangle.name}, creating wireframe...`);
                // IMPORTANT: Use selectObject with includeExtrusion=false to avoid issues
                this.selectionManager.selectObject(newRectangle, false, false);
            }
        }
        
        // Enable shadows
        if (this.lightingManager) {
            this.lightingManager.updateShadowsForNewObject(newRectangle);
            if (oldExtrusion) {
                this.lightingManager.updateShadowsForNewObject(oldExtrusion);
            }
        }
        
        // Update rectangleManager rectangles array
        if (this.rectangleManager) {
            // Remove old mesh from rectangles array
            const oldIndex = this.rectangleManager.rectangles.indexOf(shape);
            if (oldIndex !== -1) {
                this.rectangleManager.rectangles.splice(oldIndex, 1);
                console.log('[GEOMETRY_UPDATE_DEBUG] Removed old mesh from rectangles array');
            }
            // Add new mesh to rectangles array
            this.rectangleManager.rectangles.push(newRectangle);
            console.log('[GEOMETRY_UPDATE_DEBUG] Added new mesh to rectangles array. Total rectangles:', this.rectangleManager.rectangles.length);
        }
        
        console.log('[GEOMETRY_UPDATE_DEBUG] updateRectangleGeometryLikeCircle() finished');
        return newRectangle;
    }

    /**
     * Update shape geometry (for rectangles and other shapes, NOT circles)
     */
    updateShapeGeometry(shape, properties) {
        const shapeType = this.getShapeType(shape);
        
        if (shapeType === 'rectangle') {
            this.updateRectangleGeometry(shape, properties);
        } else if (shapeType === 'building') {
            // For buildings from rectangles, use building geometry update
            this.updateBuildingGeometry(shape, properties);
        } else if (shapeType === 'polygon') {
            this.updatePolygonGeometry(shape, properties);
        }
    }

    /**
     * Update rectangle geometry using scaling (preserves focus)
     */
    updateRectangleGeometryWithScaling(shape, properties) {
        // Get current dimensions from userData
        const currentDimensions = shape.userData.dimensions || { width: 1, depth: 1, height: 1 };
        
        // Calculate scaling factors
        const scaleX = properties.length / currentDimensions.width;
        const scaleY = properties.height / currentDimensions.height;
        const scaleZ = properties.width / currentDimensions.depth;
        
        // Apply scaling
        shape.scaling = new BABYLON.Vector3(scaleX, scaleY, scaleZ);
        
        // Update userData
        shape.userData.dimensions = {
            width: properties.length,
            depth: properties.width,
            height: properties.height
        };
        shape.userData.type = properties.type;
        shape.userData.shapeType = properties.type === 'building' ? 'building' : 'rectangle';
        shape.userData.originalHeight = properties.height;
        
        // Update material color based on type
        if (shape.material) {
            if (properties.type === 'building') {
                shape.material.diffuseColor = new BABYLON.Color3(1, 1, 1); // White for buildings
            } else if (properties.type === 'ground') {
                shape.material.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground
            } else if (properties.type === 'waterway') {
                shape.material.diffuseColor = new BABYLON.Color3(0, 0.5, 1); // Blue for waterway
            } else if (properties.type === 'highway') {
                shape.material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
            } else if (properties.type === 'grass') {
                shape.material.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Green for grass areas
            }
        }
    }

    /**
     * Update building geometry using scaling (preserves focus)
     */
    updateBuildingGeometryWithScaling(shape, properties) {
        // Get current dimensions from userData
        const currentDimensions = shape.userData.dimensions || { width: 1, depth: 1, height: 1 };
        
        // Calculate scaling factors
        const scaleX = properties.length / currentDimensions.width;
        const scaleY = properties.height / currentDimensions.height;
        const scaleZ = properties.width / currentDimensions.depth;
        
        // Apply scaling
        shape.scaling = new BABYLON.Vector3(scaleX, scaleY, scaleZ);
        
        // Update userData
        shape.userData.dimensions = {
            width: properties.length,
            depth: properties.width,
            height: properties.height
        };
        shape.userData.type = properties.type;
        shape.userData.shapeType = 'building';
        shape.userData.originalHeight = properties.height;
        
        // Update material color based on type
        if (shape.material) {
            if (properties.type === 'building') {
                shape.material.diffuseColor = new BABYLON.Color3(1, 1, 1); // White for buildings
            } else if (properties.type === 'ground') {
                shape.material.diffuseColor = new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground
            } else if (properties.type === 'waterway') {
                shape.material.diffuseColor = new BABYLON.Color3(0, 0.5, 1); // Blue for waterway
            } else if (properties.type === 'highway') {
                shape.material.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
            } else if (properties.type === 'grass') {
                shape.material.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Green for grass areas
            }
        }
    }

    /**
     * Update building geometry
     */
    updateBuildingGeometry(shape, properties) {
        // Store current transform properties and material
        const currentPosition = shape.position.clone();
        const currentRotation = shape.rotation.clone();
        const currentScaling = shape.scaling.clone();
        const currentMaterial = shape.material;
        // Keep the same name (don't generate new name for updates)
        const currentName = shape.name;
        const isSelected = this.selectionManager && this.selectionManager.isSelected(shape);
        
        // IMPORTANT: Store userData BEFORE disposing the shape (deep copy to preserve all properties)
        const existingUserData = shape.userData ? JSON.parse(JSON.stringify(shape.userData)) : {};
        
        // Store current focus element
        const activeElement = document.activeElement;
        
        // Remove from selection manager first
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(shape);
            this.selectionManager.originalMaterials.delete(shape);
        }
        
        // Calculate the bottom of the original building BEFORE disposing
        const originalHeight = existingUserData?.dimensions?.height || existingUserData?.originalHeight || properties.height;
        
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
        
        // Restore all transform properties with smart Y positioning
        // IMPORTANT: For buildings, bottom should always be at Y=0 (ground level)
        // Height should only grow upward, not downward
        // Calculate the bottom of the original building
        const originalBottom = currentPosition.y - (originalHeight / 2);
        
        // IMPORTANT: Preserve the original bottom position (don't reset to Y=0)
        // This ensures that if a building is at height 1m, changing its height won't move it back to ground
        const targetBottom = originalBottom; // Keep bottom at its current position
        
        // Position new building with bottom at the same position, height grows upward only
        newMesh.position = new BABYLON.Vector3(
            currentPosition.x,
            targetBottom + (properties.height / 2), // Bottom at original position, center at targetBottom + properties.height/2
            currentPosition.z
        );
        
        console.log(`[BUILDING_POSITION] Updated building: originalBottom=${originalBottom.toFixed(3)}, targetBottom=${targetBottom.toFixed(3)}, newHeight=${properties.height.toFixed(3)}, newPosition.y=${(targetBottom + (properties.height / 2)).toFixed(3)}`);
        newMesh.rotation = currentRotation;
        newMesh.scaling = currentScaling;
        
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
        } else if (properties.type === 'grass') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Green for grass areas
        } else {
            newMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1); // Default white
        }
        
        newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        newMaterial.roughness = 0.7;
        newMaterial.backFaceCulling = false; // 2-sided
        newMaterial.twoSidedLighting = true; // Enable lighting on both sides
        
        newMesh.material = newMaterial;
        // Set rendering priority based on type (will be set after userData)
        newMesh.enableEdgesRendering();
        newMesh.edgesWidth = 1.0;
        newMesh.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Update userData - preserve existing userData (yearOfConstruction, buildingEnvelopeProperties, etc.)
        // existingUserData was already stored before disposing the shape
        newMesh.userData = {
            ...existingUserData, // Preserve all existing userData (yearOfConstruction, buildingEnvelopeProperties, etc.)
            type: properties.type,
            shapeType: 'building',
            dimensions: {
                width: properties.length,
                depth: properties.width,
                height: properties.height
            },
            originalHeight: properties.height
        };
        
        // Set rendering priority based on type (after userData is set)
        newMesh.renderingGroupId = SceneManager.getRenderingGroupId(properties.type);
        
        // Ensure no period properties for non-building objects
        if (newMesh.userData.type && newMesh.userData.type !== 'building') {
            delete newMesh.userData.startPeriod;
            delete newMesh.userData.endPeriod;
            delete newMesh.userData.buildingArchetypePeriod;
            delete newMesh.userData.buildingGroupPeriod;
        }
        
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
        
        // Restore focus to the active element
        if (activeElement && activeElement.focus) {
            setTimeout(() => {
                activeElement.focus();
            }, 0);
        }
    }

    /**
     * Update polygon geometry
     */
    updatePolygonGeometry(shape, properties) {
        // IMPORTANT: This method should NOT be called when only type changes
        // Type changes should only update material and height via updatePolygonMaterialByType
        // This method is only for geometry changes (points, dimensions, etc.)
        
        // Store current position and material
        const currentPosition = shape.position.clone();
        const currentMaterial = shape.material;
        const currentName = shape.name;
        const currentUserData = shape.userData || {};
        const currentPoints = currentUserData.points || [];

        // Check if this is actually a polygon (has points array)
        if (!currentPoints || currentPoints.length < 3) {
            console.warn('[POLYGON_GEOMETRY] Cannot update polygon geometry: no points array or less than 3 points');
            return null;
        }

        // Store selection state before disposing
        const wasSelected = this.selectionManager && this.selectionManager.isSelected(shape);
        
        // Remove from selection manager before disposing
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(shape);
        }

        // Dispose old mesh
        shape.dispose();

        // For all types except 'building', height should be 0 and no extrusion
        const isBuilding = properties.type?.toLowerCase() === 'building';
        
        let newPolygon = null;
        if (!isBuilding) {
            // Force height to 0 for non-building types and keep as 2D polygon (no extrusion)
            properties.height = 0;
            // Update userData before creating new mesh
            currentUserData.type = properties.type;
            currentUserData.shapeType = 'polygon';
            newPolygon = this.createPolygonMesh(currentName, currentPoints, currentPosition, currentMaterial, currentUserData);
        } else if (properties.height > 0.001) {
            // Create extrusion for building type
            // Update userData before creating new mesh
            currentUserData.type = properties.type;
            currentUserData.shapeType = 'polygon';
            this.createPolygonExtrusion(currentName, currentPoints, properties.height, currentPosition, currentMaterial, currentUserData);
            // Get the created polygon from scene
            const scene = this.sceneManager.getScene();
            newPolygon = scene.getMeshByName(currentName);
        } else {
            // Keep as 2D polygon if building height is 0 or not set
            // Update userData before creating new mesh
            currentUserData.type = properties.type;
            currentUserData.shapeType = 'polygon';
            newPolygon = this.createPolygonMesh(currentName, currentPoints, currentPosition, currentMaterial, currentUserData);
        }
        
        // If polygon was selected, select the new one
        if (newPolygon && wasSelected && this.selectionManager) {
            this.selectionManager.selectObject(newPolygon, false);
        }
        
        return newPolygon;
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
        // Use height 0.001 for 2D polygons (minimal thickness to prevent z-fighting)
        const mesh = this.createCustomPolygonMesh(relativePoints, 0.001);
        
        // Set properties immediately after creation
        mesh.name = name;
        mesh.material = material;
        mesh.receiveShadows = true;
        mesh.castShadows = true;
        mesh.position = center;
        // For 2D polygons, set Y position to 0.001 to prevent z-fighting
        if (userData && !userData.is3D) {
            mesh.position.y = 0.001;
        }
        // IMPORTANT: Ensure userData is properly set and shapeType is always 'polygon'
        // This prevents misidentification as rectangle
        if (!mesh.userData) {
            mesh.userData = {};
        }
        
        // Copy all userData properties
        if (userData) {
            // Deep copy userData to avoid reference issues
            Object.assign(mesh.userData, userData);
            console.log(`[createPolygonMesh] Copied userData to mesh:`, {
                type: userData?.type,
                shapeType: userData?.shapeType,
                pointsCount: userData?.points?.length
            });
        }
        
        // IMPORTANT: Always set shapeType to 'polygon' for polygon meshes
        // This is critical to prevent getShapeType from misidentifying it as rectangle
        mesh.userData.shapeType = 'polygon';
        
        // IMPORTANT: Ensure points array is preserved in userData
        // This is critical for getShapeType to correctly identify it as polygon
        if (userData && userData.points) {
            mesh.userData.points = userData.points.map(p => p.clone ? p.clone() : new BABYLON.Vector3(p.x, p.y, p.z));
        }
        
        // Final validation: ensure type is set correctly
        if (!mesh.userData.type || mesh.userData.type === undefined || mesh.userData.type === null || mesh.userData.type === '') {
            // If no type provided, set default based on name
            // Try to extract type from name (e.g., polygon_water_1 -> water)
            const nameMatch = name.match(/polygon_(water|waterway|ground|grass|highway|building|soil)_/);
            if (nameMatch) {
                mesh.userData.type = nameMatch[1];
                console.warn(`[createPolygonMesh] Polygon ${name} had no type in userData, extracted from name: ${nameMatch[1]}`);
            } else {
                mesh.userData.type = 'ground'; // Default fallback
                console.warn(`[createPolygonMesh] Polygon ${name} had no type in userData, set to 'ground'`);
            }
        }
        
        // Set rendering priority based on type (after userData is finalized)
        const finalType = mesh.userData?.type || 'ground';
        const calculatedRenderingGroupId = SceneManager.getRenderingGroupId(finalType);
        mesh.renderingGroupId = calculatedRenderingGroupId;
        
        console.log(`[createPolygonMesh] Set renderingGroupId: type=${finalType}, renderingGroupId=${calculatedRenderingGroupId}, mesh.userData.type=${mesh.userData?.type}`);
        
        // IMPORTANT: Apply depth offset based on type to ensure correct render order
        SceneManager.applyDepthOffset(mesh, finalType);
        
        // Ensure material is properly applied
        if (material) {
            mesh.material = material;
        }
        
        console.log(`[createPolygonMesh] Created polygon mesh: ${name}, type: ${finalType}, shapeType: ${mesh.userData?.shapeType || 'unknown'}, renderingGroupId: ${mesh.renderingGroupId}, points: ${mesh.userData?.points?.length || 0}, material color: R=${material?.diffuseColor?.r?.toFixed(2) || 'N/A'}, G=${material?.diffuseColor?.g?.toFixed(2) || 'N/A'}, B=${material?.diffuseColor?.b?.toFixed(2) || 'N/A'}`);

        // Add to selection manager
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(mesh);
        }
        
        // Return the created mesh
        return mesh;
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

        // TODO: Implement new extrusion method
        const extrusionName = name + '_extrusion';
        // const extrusion = this.createCustomPolygonExtrusion(extrusionName, correctedPoints, height);

        // Calculate center of polygon for positioning
        const centerX = correctedPoints.reduce((sum, p) => sum + p.x, 0) / correctedPoints.length;
        const centerZ = correctedPoints.reduce((sum, p) => sum + p.z, 0) / correctedPoints.length;
        
        extrusion.position = new BABYLON.Vector3(centerX, position.y, centerZ);
        // Keep extrusion at the same Y level as the base polygon
        extrusion.material = material;
        extrusion.receiveShadows = true;
        extrusion.castShadows = true;
        extrusion.userData = {
            ...userData,
            type: 'building',
            buildingHeight: height
        };
        
        // Set rendering priority based on type (after userData is set)
        extrusion.renderingGroupId = SceneManager.getRenderingGroupId(extrusion.userData.type);

        // Link extrusion to base polygon
        const scene = this.sceneManager.getScene();
        const basePolygon = scene.getMeshByName(name);
        if (basePolygon) {
            basePolygon.extrusion = extrusion;
            extrusion.basePolygon = basePolygon;
            
            // Make extrusion a child of base polygon for transform synchronization
            extrusion.setParent(basePolygon);
        }

        // IMPORTANT: Do NOT add extrusion to selection manager separately
        // Extrusion should be selected together with polygon (as a child)
        // Adding it separately causes duplicate selection and TransformNode issues
    }

    /**
     * Create custom polygon mesh (helper method)
     * @param {BABYLON.Vector3[]} relativePoints - Points relative to center
     * @param {number} height - Height/thickness of the polygon (default: 0.001 for 2D)
     */
    createCustomPolygonMesh(relativePoints, height = 0.001) {
        // IMPORTANT: Ensure counter-clockwise winding order for correct normals
        // This ensures normals point upward (Y+) instead of downward
        const correctedPoints = this.ensureCounterClockwiseFor2DPolygon(relativePoints);
        
        const positions = [];
        const indices = [];
        const normals = [];
        const uvs = [];

        // Add polygon vertices
        correctedPoints.forEach((point, index) => {
            positions.push(point.x, height, point.z);
            normals.push(0, 1, 0); // Normal pointing upward
            
            const u = (point.x + 1) / 2;
            const v = (point.z + 1) / 2;
            uvs.push(u, v);
        });

        // Triangulate polygon with corrected points
        this.triangulatePolygon(correctedPoints, indices);

        const scene = this.sceneManager.getScene();
        // Use a temporary unique name to avoid conflicts
        const tempName = `temp_polygon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const mesh = new BABYLON.Mesh(tempName, scene);
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, positions);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, uvs);
        mesh.setIndices(indices);

        // Apply flat shading to prevent unwanted smoothing artifacts
        // This ensures each face has its own normal, preventing dark spots
        // IMPORTANT: For 2D polygons, pass null as meshHeight to ensure normals point upward
        this.applyFlatShadingToMesh(mesh, positions, indices, null);

        // IMPORTANT: After flat shading, FORCE all normals to point upward for 2D polygons
        // This fixes the issue where normals might point downward due to vertex winding order
        // CRITICAL: Must refresh geometry before reading normals
        mesh.refreshBoundingInfo();
        const finalNormals = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (finalNormals) {
            // For 2D polygons (height = 0.001), ALL normals must point upward (0, 1, 0)
            // Don't check - just force them all to (0, 1, 0)
            const normalCount = finalNormals.length / 3;
            for (let i = 0; i < finalNormals.length; i += 3) {
                finalNormals[i] = 0;     // x = 0
                finalNormals[i + 1] = 1; // y = 1 (upward)
                finalNormals[i + 2] = 0; // z = 0
            }
            mesh.geometry.setVerticesData(BABYLON.VertexBuffer.NormalKind, finalNormals);
            // Force mesh to update
            mesh.computeWorldMatrix(true);
            mesh.refreshBoundingInfo();
            console.log(`[createCustomPolygonMesh] Forced all ${normalCount} normals to point upward (0, 1, 0) for 2D polygon`);
        } else {
            console.warn(`[createCustomPolygonMesh] WARNING: Could not get normals after flat shading!`);
        }

        return mesh;
    }

    /**
     * Triangulate polygon (helper method)
     */
    triangulatePolygon(points, indices) {
        if (points.length < 3) return;
        
        if (points.length === 3) {
            indices.push(0, 1, 2); // Counter-clockwise order for upward normals (Y+)
            return;
        }
        
        if (points.length === 4) {
            indices.push(0, 1, 2); // Counter-clockwise order for upward normals (Y+)
            indices.push(0, 2, 3);
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
                    indices.push(prev, curr, next); // Counter-clockwise order for upward normals (Y+)
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
                        indices.push(prev, curr, next); // Counter-clockwise order for upward normals (Y+)
                        vertexIndices.splice(i, 1);
                        convexFound = true;
                        break;
                    }
                }
                
                if (!convexFound) {
                    // Force triangulation from first vertex
                    // Use counter-clockwise order for upward normals (Y+)
                    for (let i = 1; i < vertexIndices.length - 1; i++) {
                        indices.push(vertexIndices[0], vertexIndices[i], vertexIndices[i + 1]);
                    }
                    break;
                }
            }
            
            attempts++;
        }
        
        if (vertexIndices.length === 3) {
            // Keep counter-clockwise order for upward normals (Y+)
            indices.push(vertexIndices[0], vertexIndices[1], vertexIndices[2]);
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
     * Using PolygonMeshBuilder with improved normal fixing
     */
    createCustomPolygonExtrusion(name, points, height) {
        
        const scene = this.sceneManager.getScene();
        
        // IMPORTANT: Dispose old extrusion if it exists to prevent duplicate extrusions
        // This ensures that when height changes, old extrusion is removed before creating new one
        const oldExtrusion = scene.getMeshByName(name);
        if (oldExtrusion) {
            console.log(`[createCustomPolygonExtrusion] Found existing extrusion "${name}", disposing it before creating new one`);
            // Remove from selection manager if it's there
            if (this.selectionManager) {
                this.selectionManager.removeSelectableObject(oldExtrusion);
            }
            // Dispose material if it exists
            if (oldExtrusion.material && oldExtrusion.material !== scene.defaultMaterial) {
                try {
                    const material = oldExtrusion.material;
                    oldExtrusion.material = null;
                    material.dispose();
                } catch (error) {
                    console.warn(`[createCustomPolygonExtrusion] Error disposing material:`, error);
                }
            }
            // Dispose geometry if it exists
            if (oldExtrusion.geometry) {
                try {
                    oldExtrusion.geometry.dispose();
                } catch (error) {
                    console.warn(`[createCustomPolygonExtrusion] Error disposing geometry:`, error);
                }
            }
            // Dispose the mesh itself
            try {
                oldExtrusion.dispose();
            } catch (error) {
                console.warn(`[createCustomPolygonExtrusion] Error disposing old extrusion:`, error);
            }
        }
        
        // Convert points to Vector2 format for PolygonMeshBuilder
        const shape2D = points.map(p => new BABYLON.Vector2(p.x, p.z));
        
        console.log(`[createCustomPolygonExtrusion] Creating extrusion using PolygonMeshBuilder for ${name} with ${shape2D.length} points, height=${height}`);
        
        // Create polygon mesh using PolygonMeshBuilder with earcut
        const builder = new BABYLON.PolygonMeshBuilder(name, shape2D, scene, earcut);
        const mesh = builder.build(false, height);
        
        // Store height in userData
        if (!mesh.userData) {
            mesh.userData = {};
        }
        mesh.userData.buildingHeight = height;
        
        // Apply flat shading FIRST to prevent unwanted smoothing artifacts
        // This ensures each face has its own normal, preventing dark spots
        this.applyFlatShading(mesh, height);
        
        // ALWAYS flip side wall normals - PolygonMeshBuilder creates them pointing inward
        // This is a known issue with PolygonMeshBuilder
        console.log(`[createCustomPolygonExtrusion] Flipping side wall normals (PolygonMeshBuilder creates them inward)...`);
        this.flipSideWallNormals(mesh, height);
        mesh.userData.sideWallNormalsFlipped = true;
        
        // Ensure material is 2-sided (backFaceCulling disabled)
        if (mesh.material) {
            mesh.material.backFaceCulling = false; // 2-sided
            mesh.material.twoSidedLighting = true; // Enable lighting on both sides
        }
        
        // Force normal recalculation
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo();
        
        // IMPORTANT: Make extrusion pickable so it can be selected by clicking on walls
        mesh.isPickable = true;
        
        // IMPORTANT: Ensure extrusion is visible and enabled from the start
        mesh.isVisible = true;
        mesh.setEnabled(true);
        
        // IMPORTANT: Ensure extrusion has a default material if none exists
        if (!mesh.material) {
            console.warn(`[createCustomPolygonExtrusion] Extrusion ${name} has no material, creating default material`);
            const defaultMaterial = new BABYLON.StandardMaterial(`${name}_defaultMaterial`, scene);
            defaultMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
            defaultMaterial.backFaceCulling = false;
            defaultMaterial.twoSidedLighting = true;
            mesh.material = defaultMaterial;
        }
        
        // IMPORTANT: Ensure extrusion is in the scene
        if (!scene.meshes.includes(mesh)) {
            scene.addMesh(mesh);
            console.log(`[createCustomPolygonExtrusion] Added extrusion ${name} to scene`);
        }
        
        // IMPORTANT: Position will be set after setParent is called
        // For now, set to 0 - it will be adjusted in updatePolygonMaterialByType
        // to keep base at the same Y as polygon
        mesh.position.y = 0;
        
        console.log(`[createCustomPolygonExtrusion] Extrusion ${name} created: visible=${mesh.isVisible}, enabled=${mesh.isEnabled()}, hasMaterial=${!!mesh.material}, inScene=${scene.meshes.includes(mesh)}`);
        
        return mesh;
    }

    /**
     * Fix normals for polygon extrusion
     * PolygonMeshBuilder creates: top/bottom normals pointing outward (correct), side walls pointing inward (wrong)
     * We need: top pointing upward (0, 1, 0), bottom pointing downward (0, -1, 0), side walls pointing outward
     */
    flipSideWallNormals(mesh, height) {
        if (!mesh.geometry || !mesh.geometry.getVerticesData(BABYLON.VertexBuffer.NormalKind)) {
            console.warn('Cannot fix normals: mesh geometry or normals not found');
            return;
        }

        // IMPORTANT: Check if normals have already been fixed to prevent double-fixing
        if (mesh.userData && mesh.userData.sideWallNormalsFlipped === true) {
            console.log(`[flipSideWallNormals] Normals already fixed for ${mesh.name}, skipping`);
            return;
        }

        const positions = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const normals = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        const indices = mesh.geometry.getIndices();

        if (!positions || !normals || !indices) {
            console.warn('Cannot fix normals: missing geometry data');
            return;
        }

        // Find actual min/max Y from positions (after flat shading, Y might not be exactly height/2)
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 1; i < positions.length; i += 3) {
            minY = Math.min(minY, positions[i]);
            maxY = Math.max(maxY, positions[i]);
        }
        
        // Tolerance for identifying top and bottom faces (increased for flat shading)
        const tolerance = 0.01; // Increased tolerance for flat-shaded geometry
        const topY = maxY; // Use actual max Y
        const bottomY = minY; // Use actual min Y

        console.log(`[flipSideWallNormals] Starting normal fix for ${mesh.name}`);
        console.log(`[flipSideWallNormals] height=${height}, expected topY=${height/2}, expected bottomY=${-height/2}`);
        console.log(`[flipSideWallNormals] actual minY=${minY}, actual maxY=${maxY}, using topY=${topY}, bottomY=${bottomY}`);

        // Create a new normals array - start with original normals
        const newNormals = [...normals];

        // Statistics for logging
        let topFaceCount = 0;
        let bottomFaceCount = 0;
        let sideWallCount = 0;
        const sampleNormals = {
            top: [],
            bottom: [],
            sideWall: []
        };

        // Process each triangle to fix normals
        for (let i = 0; i < indices.length; i += 3) {
            const idx1 = indices[i];
            const idx2 = indices[i + 1];
            const idx3 = indices[i + 2];

            const y1 = positions[idx1 * 3 + 1];
            const y2 = positions[idx2 * 3 + 1];
            const y3 = positions[idx3 * 3 + 1];
            const avgY = (y1 + y2 + y3) / 3;

            // Check if this is a top face (all vertices near maxY)
            const isTopFace = Math.abs(y1 - topY) < tolerance && 
                             Math.abs(y2 - topY) < tolerance && 
                             Math.abs(y3 - topY) < tolerance;

            // Check if this is a bottom face (all vertices near minY)
            const isBottomFace = Math.abs(y1 - bottomY) < tolerance && 
                                Math.abs(y2 - bottomY) < tolerance && 
                                Math.abs(y3 - bottomY) < tolerance;

            const normalIdx1 = idx1 * 3;
            const normalIdx2 = idx2 * 3;
            const normalIdx3 = idx3 * 3;

            // Get original normal for logging
            const originalNormal = new BABYLON.Vector3(
                normals[normalIdx1],
                normals[normalIdx1 + 1],
                normals[normalIdx1 + 2]
            );

            if (isTopFace) {
                topFaceCount++;
                if (topFaceCount <= 2) {
                    sampleNormals.top.push({
                        triangle: i / 3,
                        original: originalNormal.clone(),
                        vertices: { y1, y2, y3 }
                    });
                }
                // Top face: KEEP original normals (don't change them)
                // newNormals are already set to original normals, so we do nothing
                // This preserves the normals created by PolygonMeshBuilder
            } else if (isBottomFace) {
                bottomFaceCount++;
                if (bottomFaceCount <= 2) {
                    sampleNormals.bottom.push({
                        triangle: i / 3,
                        original: originalNormal.clone(),
                        vertices: { y1, y2, y3 }
                    });
                }
                // Bottom face: KEEP original normals (don't change them)
                // newNormals are already set to original normals, so we do nothing
                // This preserves the normals created by PolygonMeshBuilder
            } else {
                sideWallCount++;
                // Side walls: ALWAYS flip normals - PolygonMeshBuilder creates them pointing inward
                // Simple approach: just flip the existing normals
                // This is more reliable than recalculating from vertices
                
                const beforeNormal = new BABYLON.Vector3(
                    newNormals[normalIdx1],
                    newNormals[normalIdx1 + 1],
                    newNormals[normalIdx1 + 2]
                );
                
                // Flip all three vertices' normals
                newNormals[normalIdx1] = -newNormals[normalIdx1];
                newNormals[normalIdx1 + 1] = -newNormals[normalIdx1 + 1];
                newNormals[normalIdx1 + 2] = -newNormals[normalIdx1 + 2];
                
                newNormals[normalIdx2] = -newNormals[normalIdx2];
                newNormals[normalIdx2 + 1] = -newNormals[normalIdx2 + 1];
                newNormals[normalIdx2 + 2] = -newNormals[normalIdx2 + 2];
                
                newNormals[normalIdx3] = -newNormals[normalIdx3];
                newNormals[normalIdx3 + 1] = -newNormals[normalIdx3 + 1];
                newNormals[normalIdx3 + 2] = -newNormals[normalIdx3 + 2];
                
                const afterNormal = new BABYLON.Vector3(
                    newNormals[normalIdx1],
                    newNormals[normalIdx1 + 1],
                    newNormals[normalIdx1 + 2]
                );
                
                if (sideWallCount <= 3) {
                    console.log(`[flipSideWallNormals] Side wall ${sideWallCount} flipped: before=(${beforeNormal.x.toFixed(3)}, ${beforeNormal.y.toFixed(3)}, ${beforeNormal.z.toFixed(3)}), after=(${afterNormal.x.toFixed(3)}, ${afterNormal.y.toFixed(3)}, ${afterNormal.z.toFixed(3)})`);
                }
            }
        }

        // Log statistics
        console.log(`[flipSideWallNormals] Face counts: Top=${topFaceCount}, Bottom=${bottomFaceCount}, SideWalls=${sideWallCount}, Total=${indices.length / 3}`);
        
        if (topFaceCount === 0 && bottomFaceCount === 0) {
            console.warn(`[flipSideWallNormals] WARNING: No top or bottom faces detected! All faces classified as side walls.`);
            console.warn(`[flipSideWallNormals] This might indicate that flat shading changed Y coordinates.`);
            console.warn(`[flipSideWallNormals] Checking first few faces for Y coordinates...`);
            for (let i = 0; i < Math.min(6, indices.length / 3); i++) {
                const idx1 = indices[i * 3];
                const idx2 = indices[i * 3 + 1];
                const idx3 = indices[i * 3 + 2];
                const y1 = positions[idx1 * 3 + 1];
                const y2 = positions[idx2 * 3 + 1];
                const y3 = positions[idx3 * 3 + 1];
                const avgY = (y1 + y2 + y3) / 3;
                console.log(`[flipSideWallNormals] Face ${i}: y1=${y1.toFixed(4)}, y2=${y2.toFixed(4)}, y3=${y3.toFixed(4)}, avgY=${avgY.toFixed(4)}, distFromTop=${Math.abs(avgY - topY).toFixed(4)}, distFromBottom=${Math.abs(avgY - bottomY).toFixed(4)}`);
            }
        }
        
        if (sampleNormals.top.length > 0) {
            console.log(`[flipSideWallNormals] Sample TOP faces:`, sampleNormals.top);
        }
        if (sampleNormals.bottom.length > 0) {
            console.log(`[flipSideWallNormals] Sample BOTTOM faces:`, sampleNormals.bottom);
        }
        if (sampleNormals.sideWall.length > 0) {
            console.log(`[flipSideWallNormals] Sample SIDE WALL faces (before/after flip):`, sampleNormals.sideWall);
            
            // Analyze side wall normals
            let inwardCount = 0;
            let outwardCount = 0;
            sampleNormals.sideWall.forEach(face => {
                if (face.isPointingInward) {
                    inwardCount++;
                } else {
                    outwardCount++;
                }
            });
            console.log(`[flipSideWallNormals] Side wall normal analysis: ${inwardCount} pointing inward, ${outwardCount} pointing outward (from sample)`);
            
            // Log detailed normal information for first 2 side walls
            console.log(`[flipSideWallNormals] Detailed normal info for first 2 side walls:`);
            for (let i = 0; i < Math.min(2, sampleNormals.sideWall.length); i++) {
                const face = sampleNormals.sideWall[i];
                console.log(`  Face ${i}:`);
                console.log(`    Before flip: (${face.beforeActual ? face.beforeActual.x.toFixed(3) : 'N/A'}, ${face.beforeActual ? face.beforeActual.y.toFixed(3) : 'N/A'}, ${face.beforeActual ? face.beforeActual.z.toFixed(3) : 'N/A'})`);
                console.log(`    After flip: (${face.afterActual ? face.afterActual.x.toFixed(3) : 'N/A'}, ${face.afterActual ? face.afterActual.y.toFixed(3) : 'N/A'}, ${face.afterActual ? face.afterActual.z.toFixed(3) : 'N/A'})`);
                console.log(`    Face center: (${face.faceCenter.x.toFixed(3)}, ${face.faceCenter.y.toFixed(3)}, ${face.faceCenter.z.toFixed(3)})`);
                console.log(`    Normal dot center: ${face.normalDotCenter.toFixed(3)}`);
                console.log(`    Was flipped: ${face.wasFlipped}`);
            }
        }

        // Update the mesh with corrected normals
        mesh.geometry.setVerticesData(BABYLON.VertexBuffer.NormalKind, newNormals);
        
        // IMPORTANT: Force mesh to update and recalculate normals
        mesh.computeWorldMatrix(true);
        mesh.refreshBoundingInfo();
        
        // CRITICAL: After setting normals, force Babylon.js to recognize the change
        // This ensures the normals are actually used for lighting calculations
        if (mesh.geometry) {
            mesh.geometry._updateBoundingInfo();
        }
        
        // Mark that normals have been fixed
        if (!mesh.userData) {
            mesh.userData = {};
        }
        mesh.userData.sideWallNormalsFlipped = true;
        
        // Log final normal verification
        const verifyNormals = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        if (verifyNormals && sideWallCount > 0) {
            // Check a sample side wall normal to verify it's pointing outward
            let sampleSideWallIdx = -1;
            for (let i = 0; i < indices.length; i += 3) {
                const y1 = positions[indices[i] * 3 + 1];
                const y2 = positions[indices[i + 1] * 3 + 1];
                const y3 = positions[indices[i + 2] * 3 + 1];
                const avgY = (y1 + y2 + y3) / 3;
                const isTop = Math.abs(y1 - topY) < tolerance && Math.abs(y2 - topY) < tolerance && Math.abs(y3 - topY) < tolerance;
                const isBottom = Math.abs(y1 - bottomY) < tolerance && Math.abs(y2 - bottomY) < tolerance && Math.abs(y3 - bottomY) < tolerance;
                if (!isTop && !isBottom) {
                    sampleSideWallIdx = indices[i] * 3;
                    break;
                }
            }
            if (sampleSideWallIdx >= 0 && sampleSideWallIdx < verifyNormals.length) {
                const sampleNormal = new BABYLON.Vector3(
                    verifyNormals[sampleSideWallIdx],
                    verifyNormals[sampleSideWallIdx + 1],
                    verifyNormals[sampleSideWallIdx + 2]
                );
                console.log(`[flipSideWallNormals] Verification: Sample side wall normal after flip: (${sampleNormal.x.toFixed(3)}, ${sampleNormal.y.toFixed(3)}, ${sampleNormal.z.toFixed(3)})`);
            }
        }
        
        console.log(`[flipSideWallNormals] Completed normal fix for ${mesh.name} - Flipped ${sideWallCount} side wall faces`);
    }

    /**
     * Update extrusion normals when height changes (for scaling-based height changes)
     * Note: This should NOT be called when height changes via scaling, as scaling doesn't affect normals.
     * Only call this when the mesh geometry itself is recreated.
     */
    updateExtrusionNormals(extrusion, currentHeight) {
        if (!extrusion || !extrusion.geometry) {
            console.warn('Cannot update extrusion normals: extrusion or geometry not found');
            return;
        }

        // IMPORTANT: When height changes via scaling, normals don't need to be updated
        // Scaling automatically scales normals correctly, so we should NOT recalculate them
        // Only update normals if they haven't been set up yet (first time)
        
        // Check if normals have already been flipped (to avoid double-flipping)
        if (extrusion.userData && extrusion.userData.sideWallNormalsFlipped) {
            // Normals are already correctly flipped, no need to update
            // When scaling changes, normals are automatically scaled correctly by Babylon.js
            console.log('Side wall normals already flipped, skipping update (scaling handles normals automatically)');
            return;
        }

        // Extract vertex data (use local positions, not world positions)
        const positions = extrusion.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const indices = extrusion.geometry.getIndices();
        
        if (!positions || !indices) {
            console.warn('Cannot update extrusion normals: missing position or index data');
            return;
        }
        
        // Find the original height from the geometry (before scaling)
        let minY = Infinity;
        let maxY = -Infinity;
        for (let i = 1; i < positions.length; i += 3) {
            minY = Math.min(minY, positions[i]);
            maxY = Math.max(maxY, positions[i]);
        }
        const originalHeight = maxY - minY;
        
        // Check if normals already exist
        let normals = extrusion.geometry.getVerticesData(BABYLON.VertexBuffer.NormalKind);
        
        // If normals don't exist or are invalid, recalculate them
        if (!normals || normals.length === 0) {
            normals = [];
            BABYLON.VertexData.ComputeNormals(positions, indices, normals);
            extrusion.geometry.setVerticesData(BABYLON.VertexBuffer.NormalKind, normals);
        }
        
        // Flip all normals to point outward
        // PolygonMeshBuilder creates geometry with all normals pointing inward
        this.flipSideWallNormals(extrusion, originalHeight);
        
        // Mark that normals have been flipped
        if (!extrusion.userData) {
            extrusion.userData = {};
        }
        extrusion.userData.sideWallNormalsFlipped = true;
        
        // Force mesh update (but don't recalculate bounding box unnecessarily)
        extrusion.computeWorldMatrix(true);
        extrusion.refreshBoundingInfo();
        
        console.log(`Updated extrusion normals for original height ${originalHeight}`);
    }

    /**
     * Apply flat shading to a mesh to prevent unwanted smoothing artifacts
     * This creates duplicate vertices for each face so each face has its own normal
     * This ensures all faces have smoothing group 0 (no smoothing between faces)
     */
    applyFlatShading(mesh, meshHeight = null) {
        if (!mesh.geometry) {
            console.warn('Cannot apply flat shading: mesh geometry not found');
            return;
        }

        const positions = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
        const indices = mesh.geometry.getIndices();
        
        if (!positions || !indices) {
            console.warn('Cannot apply flat shading: missing position or index data');
            return;
        }

        // Get mesh height from parameter, userData, or calculate from positions
        if (meshHeight === null) {
            if (mesh.userData && mesh.userData.buildingHeight) {
                meshHeight = mesh.userData.buildingHeight;
            } else {
                // Calculate height from positions
                let minY = Infinity;
                let maxY = -Infinity;
                for (let i = 1; i < positions.length; i += 3) {
                    minY = Math.min(minY, positions[i]);
                    maxY = Math.max(maxY, positions[i]);
                }
                if (maxY > minY) {
                    meshHeight = maxY - minY;
                }
            }
        }

        this.applyFlatShadingToMesh(mesh, positions, indices, meshHeight);
    }

    /**
     * Apply flat shading to a mesh using provided positions and indices
     * This creates duplicate vertices for each face so each face has its own normal
     * This ensures all faces have smoothing group 0 (no smoothing between faces)
     * Each face will have sharp edges with no blending between adjacent faces
     * @param {BABYLON.Mesh} mesh - The mesh to apply flat shading to
     * @param {number[]} positions - Vertex positions array
     * @param {number[]} indices - Triangle indices array
     * @param {number|null} meshHeight - Optional mesh height for 3D extrusions
     */
    applyFlatShadingToMesh(mesh, positions, indices, meshHeight = null) {
        if (!positions || !indices || indices.length === 0) {
            console.warn('Cannot apply flat shading: invalid position or index data');
            return;
        }

        // Create new arrays for flat-shaded geometry
        const newPositions = [];
        const newNormals = [];
        const newIndices = [];
        const newUVs = [];
        
        // Get existing UVs if available
        const existingUVs = mesh.geometry ? mesh.geometry.getVerticesData(BABYLON.VertexBuffer.UVKind) : null;

        // Process each triangle (face)
        for (let i = 0; i < indices.length; i += 3) {
            const i0 = indices[i] * 3;
            const i1 = indices[i + 1] * 3;
            const i2 = indices[i + 2] * 3;

            // Get triangle vertices
            const v0 = new BABYLON.Vector3(positions[i0], positions[i0 + 1], positions[i0 + 2]);
            const v1 = new BABYLON.Vector3(positions[i1], positions[i1 + 1], positions[i1 + 2]);
            const v2 = new BABYLON.Vector3(positions[i2], positions[i2 + 1], positions[i2 + 2]);

            // Calculate face normal
            const edge1 = v1.subtract(v0);
            const edge2 = v2.subtract(v0);
            let faceNormal = BABYLON.Vector3.Cross(edge1, edge2);
            faceNormal.normalize();
            
            // IMPORTANT: For 3D extrusions, PolygonMeshBuilder may create normals that are inverted
            // If bottom face is correct, top face normal might be inverted
            // We'll fix this in the face detection logic below
            
            // For 2D polygons (flat surfaces in XZ plane), ensure normal points upward (Y+)
            // Check if this is a flat polygon (all vertices have same Y coordinate)
            const y0 = v0.y;
            const y1 = v1.y;
            const y2 = v2.y;
            const isFlatPolygon = Math.abs(y0 - y1) < 0.001 && Math.abs(y1 - y2) < 0.001;
            
            if (isFlatPolygon) {
                // For flat 2D polygons, ALWAYS force normal to point upward (Y+)
                // This ensures the surface faces upward for proper lighting
                // Don't rely on cross product calculation - always set to (0, 1, 0)
                faceNormal = new BABYLON.Vector3(0, 1, 0);
            } else {
                // For 3D extrusions, ensure top faces point upward and bottom faces point downward
                // In local space, extrusion is centered at origin, so:
                // Top faces have Y near height/2, bottom faces have Y near -height/2
                const avgY = (y0 + y1 + y2) / 3;
                const tolerance = 0.001;
                
                // Calculate expected top and bottom Y if meshHeight is provided
                let topY = null;
                let bottomY = null;
                if (meshHeight) {
                    topY = meshHeight / 2;
                    bottomY = -meshHeight / 2;
                } else {
                    // Fallback: find min/max Y from all vertices
                    let minY = Math.min(y0, y1, y2);
                    let maxY = Math.max(y0, y1, y2);
                    // Check if all vertices are at same Y (flat face)
                    if (Math.abs(y0 - y1) < tolerance && Math.abs(y1 - y2) < tolerance) {
                        if (avgY > 0) {
                            topY = avgY;
                        } else {
                            bottomY = avgY;
                        }
                    }
                }
                
                // Detect top face: all vertices at same Y near topY
                const isTopFace = topY !== null && 
                                 Math.abs(y0 - topY) < tolerance && 
                                 Math.abs(y1 - topY) < tolerance && 
                                 Math.abs(y2 - topY) < tolerance;
                
                // Detect bottom face: all vertices at same Y near bottomY
                const isBottomFace = bottomY !== null && 
                                    Math.abs(y0 - bottomY) < tolerance && 
                                    Math.abs(y1 - bottomY) < tolerance && 
                                    Math.abs(y2 - bottomY) < tolerance;
                
                // IMPORTANT: For side walls (not top or bottom), we'll flip normals in flipSideWallNormals
                // Don't flip here to avoid double-flipping
            }

            // Add vertices for this face (duplicate vertices for flat shading)
            const baseIndex = newPositions.length / 3;
            
            // Vertex 0
            newPositions.push(v0.x, v0.y, v0.z);
            newNormals.push(faceNormal.x, faceNormal.y, faceNormal.z);
            if (existingUVs && i0 / 3 * 2 + 1 < existingUVs.length) {
                const uvIndex = indices[i] * 2;
                newUVs.push(existingUVs[uvIndex] || 0, existingUVs[uvIndex + 1] || 0);
            } else {
                newUVs.push(0, 0);
            }

            // Vertex 1
            newPositions.push(v1.x, v1.y, v1.z);
            newNormals.push(faceNormal.x, faceNormal.y, faceNormal.z);
            if (existingUVs && i1 / 3 * 2 + 1 < existingUVs.length) {
                const uvIndex = indices[i + 1] * 2;
                newUVs.push(existingUVs[uvIndex] || 0, existingUVs[uvIndex + 1] || 0);
            } else {
                newUVs.push(0, 0);
            }

            // Vertex 2
            newPositions.push(v2.x, v2.y, v2.z);
            newNormals.push(faceNormal.x, faceNormal.y, faceNormal.z);
            if (existingUVs && i2 / 3 * 2 + 1 < existingUVs.length) {
                const uvIndex = indices[i + 2] * 2;
                newUVs.push(existingUVs[uvIndex] || 0, existingUVs[uvIndex + 1] || 0);
            } else {
                newUVs.push(0, 0);
            }

            // Add triangle indices (counter-clockwise order)
            newIndices.push(baseIndex, baseIndex + 1, baseIndex + 2);
        }

        // Update mesh geometry with flat-shaded data
        mesh.setVerticesData(BABYLON.VertexBuffer.PositionKind, newPositions);
        mesh.setVerticesData(BABYLON.VertexBuffer.NormalKind, newNormals);
        if (newUVs.length > 0) {
            mesh.setVerticesData(BABYLON.VertexBuffer.UVKind, newUVs);
        }
        mesh.setIndices(newIndices);

        // Refresh bounding info
        mesh.refreshBoundingInfo();
    }

    /**
     * Remove bottom faces from mesh to prevent Z-fighting
     */
    removeBottomFaces(mesh) {
        if (!mesh.geometry || !mesh.geometry.indices) return;
        
        const indices = mesh.geometry.indices;
        const positions = mesh.geometry.positions;
        const newIndices = [];
        
        // Find the minimum Y coordinate (bottom of the mesh)
        let minY = Infinity;
        for (let i = 1; i < positions.length; i += 3) {
            minY = Math.min(minY, positions[i]);
        }
        
        console.log(`Mesh minY: ${minY}, scaling.y: ${mesh.scaling.y}`);
        
        // Filter out triangles that are on the bottom face
        for (let i = 0; i < indices.length; i += 3) {
            const i1 = indices[i] * 3;
            const i2 = indices[i + 1] * 3;
            const i3 = indices[i + 2] * 3;
            
            const y1 = positions[i1 + 1];
            const y2 = positions[i2 + 1];
            const y3 = positions[i3 + 1];
            
            // Check if all three vertices are on the bottom face
            const tolerance = 0.001;
            const isBottomFace = Math.abs(y1 - minY) < tolerance && 
                                Math.abs(y2 - minY) < tolerance && 
                                Math.abs(y3 - minY) < tolerance;
            
            // Keep only non-bottom faces
            if (!isBottomFace) {
                newIndices.push(indices[i], indices[i + 1], indices[i + 2]);
            } else {
                console.log(`Removing bottom face with Y coordinates: ${y1}, ${y2}, ${y3}`);
            }
        }
        
        console.log(`Original indices: ${indices.length}, New indices: ${newIndices.length}`);
        
        // Update mesh indices
        mesh.setIndices(newIndices);
        
        // Force mesh update
        mesh.refreshBoundingInfo();
    }

    /**
     * Convert polygon to 3D model after completion
     */
    convertPolygonTo3D(polygon) {
        if (!polygon || !polygon.userData || !polygon.userData.points) {
            console.warn('Cannot convert polygon to 3D: missing userData or points');
            return;
        }

        const points = polygon.userData.points;
        if (points.length < 3) {
            console.warn('Cannot convert polygon to 3D: not enough points');
            return;
        }

        // Convert world coordinates to relative coordinates (relative to polygon center)
        // Calculate center of points
        const center = BABYLON.Vector3.Zero();
        points.forEach(point => {
            const p = point instanceof BABYLON.Vector3 ? point : new BABYLON.Vector3(point.x, point.y || 0, point.z);
            center.addInPlace(p);
        });
        center.scaleInPlace(1 / points.length);
        center.y = 0; // Keep Y at 0 for 2D polygon shape
        
        // Convert to relative points
        const relativePoints = points.map(point => {
            const p = point instanceof BABYLON.Vector3 ? point : new BABYLON.Vector3(point.x, point.y || 0, point.z);
            return p.subtract(center);
        });

        // Create 3D extrusion with height 0.05
        const extrusionName = `${polygon.name}_3d`;
        const extrusion = this.createCustomPolygonExtrusion(extrusionName, relativePoints, 0.05);
        
        // Position extrusion at polygon center
        extrusion.position.x = center.x;
        extrusion.position.z = center.z;
        
        // Copy material from original polygon
        if (polygon.material) {
            const newMaterial = new BABYLON.StandardMaterial(`${extrusionName}Material`, this.sceneManager.getScene());
            newMaterial.diffuseColor = polygon.material.diffuseColor.clone();
            newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Low specular to prevent flickering
            newMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0); // No emissive
            newMaterial.roughness = 0.7; // Slight roughness for better lighting
            newMaterial.backFaceCulling = false; // 2-sided
            newMaterial.twoSidedLighting = true; // Enable lighting on both sides
            extrusion.material = newMaterial;
        }
        
        // Copy position from original polygon
        extrusion.position = polygon.position.clone();
        extrusion.position.y = 0.05 / 2; // Half height above ground
        
        // Copy userData from original polygon
        extrusion.userData = {
            ...polygon.userData,
            shapeType: 'polygon',
            is3D: true,
            originalHeight: 0.05
        };
        
        // Enable shadows for the polygon
        extrusion.receiveShadows = true;
        
        // Add to shadow system
        if (this.lightingManager) {
            this.lightingManager.addShadowCaster(extrusion);
            this.lightingManager.addShadowReceiver(extrusion);
        }
        
        // Make extrusion selectable
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(extrusion);
        }
        
        // Update wireframe if exists
        if (this.selectionManager) {
            this.selectionManager.updateWireframeTransforms(extrusion);
        }
        
        // Remove original 2D polygon
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(polygon);
        }
        polygon.dispose();
        
        console.log(`Converted polygon ${polygon.name} to 3D model ${extrusionName}`);
        return extrusion;
    }


    /**
     * Ensure polygon has counter-clockwise winding order for 2D polygon
     * @param {BABYLON.Vector3[]} points - Polygon points
     * @returns {BABYLON.Vector3[]} Points with correct winding order
     */
    ensureCounterClockwiseFor2DPolygon(points) {
        if (points.length < 3) return points;
        
        let totalCross = 0;
        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];
            
            // Calculate cross product in XZ plane (2D polygon)
            // Cross product: (p2.x - p1.x) * (p3.z - p1.z) - (p2.z - p1.z) * (p3.x - p1.x)
            const cross = (curr.x - prev.x) * (next.z - prev.z) - (curr.z - prev.z) * (next.x - prev.x);
            totalCross += cross;
        }
        
        // If clockwise (totalCross < 0), reverse the order to make it counter-clockwise
        // Counter-clockwise order produces upward normals (Y+)
        if (totalCross < 0) {
            console.log(`[ensureCounterClockwiseFor2DPolygon] Reversing polygon winding order (was clockwise, now counter-clockwise) for ${points.length} points`);
            return points.slice().reverse();
        }
        
        return points;
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
        // Keep the same name (don't generate new name for updates)
        const currentName = shape.name;
        const currentUserData = shape.userData;

        // Check if shape is selected
        const isSelected = this.selectionManager && this.selectionManager.selectedObjects.includes(shape);
        
        // Store current focus element
        const activeElement = document.activeElement;
        
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
        } else if (properties.type === 'grass') {
            newMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 0); // Green for grass areas
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
        
        // Restore properties with smart Y positioning
        // IMPORTANT: Bottom should always be at Y=0 (ground level)
        // Height should only grow upward, not downward
        // Calculate the bottom of the original rectangle
        const originalHeight = currentUserData?.dimensions?.height || currentUserData?.originalHeight || properties.height;
        const originalBottom = currentPosition.y - (originalHeight / 2);
        
        // IMPORTANT: Preserve the original bottom position (don't reset to Y=0)
        // This ensures that if a rectangle is at height 1m, changing its height won't move it back to ground
        const targetBottom = originalBottom; // Keep bottom at its current position
        
        newMesh.position = new BABYLON.Vector3(
            currentPosition.x,
            targetBottom + (properties.height / 2), // Bottom at original position, center at targetBottom + properties.height/2
            currentPosition.z
        );
        
        console.log(`[RECTANGLE_GEOMETRY_POSITION] Updated rectangle: originalBottom=${originalBottom.toFixed(3)}, targetBottom=${targetBottom}, newHeight=${properties.height.toFixed(3)}, newPosition.y=${(targetBottom + (properties.height / 2)).toFixed(3)}`);
        newMesh.material = newMaterial;
        newMesh.userData = currentUserData;
        
        // Set rendering priority based on type (after userData is set)
        newMesh.renderingGroupId = SceneManager.getRenderingGroupId(newMesh.userData?.type);
        
        // Ensure no period properties for non-building objects
        if (newMesh.userData && newMesh.userData.type && newMesh.userData.type !== 'building') {
            delete newMesh.userData.startPeriod;
            delete newMesh.userData.endPeriod;
            delete newMesh.userData.buildingArchetypePeriod;
            delete newMesh.userData.buildingGroupPeriod;
        }

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
        
        // Restore focus to the active element
        if (activeElement && activeElement.focus) {
            setTimeout(() => {
                activeElement.focus();
            }, 0);
        }
    }



    /**
     * Extrude shape to create 3D building
     */
    extrudeShape(shape, height) {
        console.log(`Extruding shape ${shape.name} to height ${height}`);
        
        const shapeType = this.getShapeType(shape);
        
        if (shapeType === 'polygon') {
            // For 3D polygons, use scaling method (working version)
            if (shape.userData && shape.userData.is3D) {
                const originalHeight = shape.userData.originalHeight || 0.05;
                const scaleFactor = height / originalHeight;
                
                // Update scaling
                shape.scaling.y = scaleFactor;
                
                // Adjust position to keep base at Y=0
                // When scaling, the mesh center moves, so we need to adjust position
                // The base should be at Y=0, so position.y = height
                shape.position.y = height;
                
                // Update userData
                shape.userData.originalHeight = height;
                
                // This method is no longer used - height is managed automatically in updatePolygonMaterialByType
                console.log(`Height management moved to updatePolygonMaterialByType`);
                return;
            }
            
            // For 2D polygons, create extrusion (legacy support)
            if (shape.extrusion) {
                // Remove existing extrusion
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(shape.extrusion);
                }
                if (shape.extrusion.material) {
                    shape.extrusion.material.dispose();
                }
                shape.extrusion.dispose();
                shape.extrusion = null;
            }
            
            if (height > 0.001) {
                // Create new extrusion
                const points = shape.userData.points || [];
                if (points.length >= 3) {
                    // Convert world coordinates to relative coordinates (relative to shape center)
                    // Calculate center of points
                    const center = BABYLON.Vector3.Zero();
                    points.forEach(point => {
                        const p = point instanceof BABYLON.Vector3 ? point : new BABYLON.Vector3(point.x, point.y || 0, point.z);
                        center.addInPlace(p);
                    });
                    center.scaleInPlace(1 / points.length);
                    center.y = 0; // Keep Y at 0 for 2D polygon shape
                    
                    // Convert to relative points
                    const relativePoints = points.map(point => {
                        const p = point instanceof BABYLON.Vector3 ? point : new BABYLON.Vector3(point.x, point.y || 0, point.z);
                        return p.subtract(center);
                    });
                    
                    const extrusionName = `${shape.name}_extrusion`;
                    const extrusion = this.createCustomPolygonExtrusion(extrusionName, relativePoints, height);
                    
                    // Position extrusion at shape center
                    extrusion.position.x = center.x;
                    extrusion.position.z = center.z;
                    
                    // Copy material from original shape
                    if (shape.material) {
                        const newMaterial = new BABYLON.StandardMaterial(`${extrusionName}Material`, this.sceneManager.getScene());
                        newMaterial.diffuseColor = shape.material.diffuseColor.clone();
                        newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Low specular to prevent flickering
                        newMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0); // No emissive
                        newMaterial.roughness = 0.7; // Slight roughness for better lighting
                        newMaterial.backFaceCulling = false; // 2-sided
                    newMaterial.twoSidedLighting = true; // Enable lighting on both sides
                        extrusion.material = newMaterial;
                    }
                    
                    // Position extrusion
                    extrusion.position = shape.position.clone();
                    extrusion.position.y = height / 2;
                    
                    // Make extrusion selectable
                    if (this.selectionManager) {
                        this.selectionManager.addSelectableObject(extrusion);
                    }
                    
                    // Store reference
                    shape.extrusion = extrusion;
                    
                    console.log(`Created new extrusion for ${shape.name} with height ${height}`);
                }
            }
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
     * Update properties fields based on shape type
     */
    updatePropertiesFields(type) {
        const heightGroup = document.getElementById('heightGroup');
        const radiusGroup = document.getElementById('radiusGroup');
        const lengthGroup = document.getElementById('shapeLength').parentElement;
        const widthGroup = document.getElementById('shapeWidth').parentElement;
        
        // Get current shape type (rectangle/circle)
        const shapeType = this.getShapeType(this.currentShape);
        
        // Show height for all types
        heightGroup.style.display = 'flex';
        // Set height value
        const heightInput = document.getElementById('shapeHeight');
        if (heightInput) {
            // Always set the height value
            const currentHeight = this.currentShape?.userData?.dimensions?.height || 0.1;
            heightInput.value = currentHeight;
        }
        
        // Show appropriate geometric fields based on shape type
        if (shapeType === 'circle') {
            lengthGroup.style.display = 'none';
            widthGroup.style.display = 'none';
            radiusGroup.style.display = 'flex';
        } else if (shapeType === 'rectangle') {
            lengthGroup.style.display = 'flex';
            widthGroup.style.display = 'flex';
            radiusGroup.style.display = 'none';
        } else if (shapeType === 'building') {
            // For buildings from rectangles, show length and width
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
            diameterTop: dimensions.diameterTop,
            diameterBottom: dimensions.diameterBottom,
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
        return '#8B4513'; // Default brown
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
            
            // IMPORTANT: Don't use toFixed(2) - return values as-is to preserve precision
            // This allows users to see and edit exact values without forced rounding
            if (this.getShapeType(shape) === 'rectangle') {
                dimensions.length = parseFloat(storedDimensions.width || 1.0);
                dimensions.width = parseFloat(storedDimensions.depth || 1.0);
                dimensions.height = parseFloat(storedDimensions.height || 0.1);
            } else if (this.getShapeType(shape) === 'building') {
                // For buildings, check if it's from a circle or rectangle
                if (storedDimensions.diameterTop !== undefined) {
                    // This is a building from a circle - show diameter and height
                    dimensions.diameterTop = parseFloat(storedDimensions.diameterTop || 1.0);
                    dimensions.diameterBottom = parseFloat(storedDimensions.diameterBottom || 1.0);
                    dimensions.height = parseFloat(storedDimensions.height || 0.1);
                } else {
                    // This is a building from a rectangle - show length, width, and height
                    dimensions.length = parseFloat(storedDimensions.width || 1.0);
                    dimensions.width = parseFloat(storedDimensions.depth || 1.0);
                    dimensions.height = parseFloat(storedDimensions.height || 0.1);
                }
            } else if (this.getShapeType(shape) === 'circle') {
                dimensions.diameterTop = parseFloat(storedDimensions.diameterTop || 1.0);
                dimensions.diameterBottom = parseFloat(storedDimensions.diameterBottom || 1.0);
                dimensions.height = parseFloat(storedDimensions.height || 0.1);
            } else if (this.getShapeType(shape) === 'polygon') {
                dimensions.area = parseFloat(storedDimensions.area || 0);
                dimensions.perimeter = parseFloat(storedDimensions.perimeter || 0);
                dimensions.vertices = parseInt(storedDimensions.vertices || 0);
            }
            
            // Get building height if available
            if (storedDimensions.buildingHeight !== undefined) {
                dimensions.height = parseFloat(storedDimensions.buildingHeight || 0);
            }
        } else if (shape.geometry && shape.geometry.boundingInfo) {
            // Fallback to boundingBox calculation
            const boundingBox = shape.geometry.boundingInfo.boundingBox;
            const size = boundingBox.extendSize;
            
            // IMPORTANT: Don't use toFixed(2) - return values as-is
            dimensions.length = size.x * 2;
            dimensions.width = size.z * 2;
            dimensions.height = size.y * 2;
            
            // For circles, radius is half the width
            // IMPORTANT: Don't use toFixed(2) - return values as-is
            if (this.getShapeType(shape) === 'circle') {
                dimensions.radius = size.x;
            } else if (this.getShapeType(shape) === 'polygon') {
                // For polygons, calculate approximate area and perimeter
                dimensions.area = size.x * size.z;
                dimensions.perimeter = 2 * (size.x + size.z);
                dimensions.vertices = 0; // Will be calculated from mesh data if available
            }
        }

        return dimensions;
    }

    /**
     * Count models by type in the scene
     */
    countModelsByType(type) {
        let count = 0;
        const scene = this.sceneManager.getScene();
        
        scene.meshes.forEach(mesh => {
            if (mesh.userData && mesh.userData.type === type) {
                count++;
            }
        });
        
        return count;
    }

    /**
     * Setup continuous parameter change for number inputs
     */
    setupContinuousParameterChange(inputId, updateCallback) {
        const input = document.getElementById(inputId);
        if (!input) return;

        let isMouseDown = false;
        let isIncreasing = false;
        let intervalId = null;
        let timeoutId = null;
        let isTyping = false;

        const applyStepChange = () => {
            const currentValue = parseFloat(input.value) || 0;
            const step = parseFloat(input.step) || 0.1;
            const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
            const max = input.max !== '' ? parseFloat(input.max) : Infinity;

            const newValue = isIncreasing ? currentValue + step : currentValue - step;
            const constrainedValue = Math.max(min, Math.min(max, newValue));
            
            // IMPORTANT: Don't round the value - let it be as precise as possible
            // Only round for display if needed, but don't force formatting
            const finalValue = constrainedValue;

            if (Math.abs(finalValue - currentValue) < 0.0001) {
                return;
            }

            // IMPORTANT: Set value as-is without formatting
            // This allows whole numbers to stay as whole numbers (e.g., 2 stays as 2, not 2.00)
            input.value = finalValue;
            isTyping = false;

            const inputEvent = new Event('input', { bubbles: true });
            const changeEvent = new Event('change', { bubbles: true });
            input.dispatchEvent(inputEvent);
            input.dispatchEvent(changeEvent);
        };

        // Handle mouse down on spin buttons
        input.addEventListener('mousedown', (e) => {
            // Check if click is on spin button
            const rect = input.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            
            // Check if click is in the right side (spin button area)
            if (clickX > rect.width - 30) {
                e.preventDefault();
                
                // Determine if clicking up or down arrow
                isIncreasing = clickY < rect.height / 2;
                isMouseDown = true;

                applyStepChange();
                
                // Start continuous change after a short delay
                timeoutId = setTimeout(() => {
                    if (isMouseDown && !isTyping) {
                        intervalId = setInterval(() => {
                            if (isMouseDown && !isTyping) {
                                applyStepChange();
                            }
                        }, 50); // Change every 50ms
                    }
                }, 300); // Start after 300ms delay
            }
        });

        // Handle mouse up
        document.addEventListener('mouseup', () => {
            if (isMouseDown) {
                isMouseDown = false;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            }
        });

        // Handle mouse leave
        input.addEventListener('mouseleave', () => {
            if (isMouseDown) {
                isMouseDown = false;
                if (timeoutId) {
                    clearTimeout(timeoutId);
                    timeoutId = null;
                }
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            }
        });

        // Handle focus events to detect typing
        input.addEventListener('focus', () => {
            isTyping = false;
        });

        // Handle blur - DON'T format the value, just save it
        input.addEventListener('blur', (e) => {
            isTyping = false;
            
            // Clear any pending input timeout
            if (inputTimeout) {
                clearTimeout(inputTimeout);
                inputTimeout = null;
            }
            
            // IMPORTANT: Don't format or modify the input value
            // Let the user enter whatever they want (whole numbers, decimals, etc.)
            // Only validate that it's a valid number, but don't change the format
            
            // Always update on blur to ensure final value is saved
            updateCallback();
        });

        // Handle keydown to detect typing
        input.addEventListener('keydown', () => {
            isTyping = true;
        });

        input.addEventListener('keyup', () => {
            isTyping = false;
        });

        // Handle input events - debounced update for real-time changes
        let inputTimeout = null;
        input.addEventListener('input', (e) => {
            isTyping = true; // Mark as typing to prevent interference
            
            // IMPORTANT: Don't format the value while user is typing
            // Only update the model after user stops typing (debounced)
            // This allows user to type multi-digit numbers without interference
            
            // Clear previous timeout
            if (inputTimeout) {
                clearTimeout(inputTimeout);
            }
            
            // Debounce the update - only update after user stops typing for 150ms
            inputTimeout = setTimeout(() => {
                isTyping = false;
                updateCallback(); // Update after user stops typing
            }, 150);
        });
    }

    /**
     * Generate unique name based on type
     */
    generateUniqueNameByType(type) {
        const scene = this.sceneManager.getScene();
        
        // Special handling for buildings: use buildingشماره format (without underscore)
        if (type === 'building') {
            const usedNumbers = new Set();
            let maxNumber = 0;
            
            // Check all meshes in the scene for building names
            // Support both formats: building_1 (old), building1 (new)
            scene.meshes.forEach(mesh => {
                if (mesh.name && mesh.isEnabled() && !mesh.isDisposed()) {
                    // Check for buildingشماره format (without underscore) - new format
                    const noUnderscoreMatch = mesh.name.match(/^building(\d+)$/);
                    if (noUnderscoreMatch) {
                        const number = parseInt(noUnderscoreMatch[1]);
                        usedNumbers.add(number);
                        if (number > maxNumber) {
                            maxNumber = number;
                        }
                    }
                    // Also check for building_شماره format (with underscore) for backward compatibility
                    const underscoreMatch = mesh.name.match(/^building_(\d+)$/);
                    if (underscoreMatch) {
                        const number = parseInt(underscoreMatch[1]);
                        usedNumbers.add(number);
                        if (number > maxNumber) {
                            maxNumber = number;
                        }
                    }
                }
            });
            
            // Start from maxNumber + 1, but check for duplicates
            let nextNumber = maxNumber + 1;
            
            // Keep incrementing until we find a unique name
            while (usedNumbers.has(nextNumber)) {
                nextNumber++;
            }
            
            // Verify the name doesn't exist in the scene
            let proposedName = `building${nextNumber}`;
            while (scene.meshes.some(mesh => mesh.name === proposedName && !mesh.isDisposed())) {
                nextNumber++;
                proposedName = `building${nextNumber}`;
            }
            
            return proposedName;
        }
        
        // For other types (ground, waterway, highway, grass), use maxNumber + 1 logic
        let maxNumber = 0;
        const usedNumbers = new Set();
        
        // Check all meshes in the scene for names of this type
        // Only count enabled meshes that are still in the scene
        // IMPORTANT: Exclude extrusions (they have _extrusion in their name) from counting
        scene.meshes.forEach(mesh => {
            if (mesh.name && mesh.isEnabled() && !mesh.isDisposed() && 
                mesh.name.startsWith(type) && 
                !mesh.name.includes('_extrusion') && // Exclude extrusions
                /^\d+$/.test(mesh.name.substring(type.length))) {
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
        
        // Start from 1 if no existing names found, otherwise maxNumber + 1
        // This ensures we always start from ground1, building1, etc.
        let nextNumber = maxNumber === 0 ? 1 : maxNumber + 1;
        
        // Keep incrementing until we find a unique name
        while (usedNumbers.has(nextNumber)) {
            nextNumber++;
        }
        
        // Verify the name doesn't exist in the scene
        let proposedName = `${type}${nextNumber}`;
        while (scene.meshes.some(mesh => mesh.name === proposedName && !mesh.isDisposed())) {
            nextNumber++;
            proposedName = `${type}${nextNumber}`;
        }
        
        return proposedName;
    }

    /**
     * Generate unique tree name (tree1, tree2, tree3, ...)
     * Checks both TransformNodes and meshes in the scene
     */
    generateUniqueTreeName() {
        const usedNumbers = new Set();
        const scene = this.sceneManager.getScene();
        
        // Check TransformNodes (tree parents)
        if (scene && scene.transformNodes) {
            scene.transformNodes.forEach(node => {
                if (node.name && !node.isDisposed()) {
                    // Check for new naming: tree1, tree2, ...
                    const newFormatMatch = node.name.match(/^tree(\d+)$/);
                    if (newFormatMatch) {
                        const number = parseInt(newFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                    // Also check for old format: tree_1_1, 3_tree_207, etc.
                    // Extract the last number from names like "3_tree_207"
                    const oldFormatMatch = node.name.match(/(?:tree|_tree_)(\d+)(?:_|$)/);
                    if (oldFormatMatch) {
                        const number = parseInt(oldFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                }
            });
        }
        
        // Also check TreeManager trees
        if (this.treeManager && this.treeManager.trees) {
            this.treeManager.trees.forEach(tree => {
                if (tree.parent && tree.parent.name && !tree.parent.isDisposed()) {
                    const newFormatMatch = tree.parent.name.match(/^tree(\d+)$/);
                    if (newFormatMatch) {
                        const number = parseInt(newFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                    const oldFormatMatch = tree.parent.name.match(/(?:tree|_tree_)(\d+)(?:_|$)/);
                    if (oldFormatMatch) {
                        const number = parseInt(oldFormatMatch[1]);
                        usedNumbers.add(number);
                    }
                }
            });
        }
        
        // Find the first available number
        let nextNumber = 1;
        while (usedNumbers.has(nextNumber)) {
            nextNumber++;
        }
        
        return `tree${nextNumber}`;
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
        // First check if it's a tree (before checking userData)
        if (this.isTree(shape) || (shape instanceof BABYLON.TransformNode && this.treeManager)) {
            // Check if it's in TreeManager
            if (this.treeManager) {
                const treeData = this.treeManager.trees.find(t => t.parent === shape || t.meshes.includes(shape));
                if (treeData) {
                    return 'tree';
                }
            }
            // If it's a TransformNode with tree name pattern, it's a tree
            if (shape instanceof BABYLON.TransformNode && 
                (shape.name.startsWith('tree') || shape.name.includes('_tree_'))) {
                return 'tree';
            }
        }
        
        // First check userData for explicit shape type
        if (shape.userData && shape.userData.shapeType) {
            return shape.userData.shapeType;
        }
        
        // IMPORTANT: Check for polygon BEFORE checking dimensions
        // Polygons have points array, which is the most reliable indicator
        if (shape.userData && shape.userData.points && Array.isArray(shape.userData.points) && shape.userData.points.length >= 3) {
            return 'polygon';
        }
        
        // Also check name for polygon (before dimensions check)
        if (shape.name && (shape.name.includes('polygon') || shape.name.startsWith('ground') || shape.name.startsWith('grass') || 
            shape.name.startsWith('waterway') || shape.name.startsWith('highway'))) {
            // Double-check: if it has points, it's definitely a polygon
            if (shape.userData && shape.userData.points) {
                return 'polygon';
            }
        }
        
        // Check if this is a circle by looking for diameterTop in dimensions
        if (shape.userData && shape.userData.dimensions && shape.userData.dimensions.diameterTop !== undefined) {
            return 'circle';
        }
        
        // Check if this is a rectangle by looking for width/depth in dimensions
        if (shape.userData && shape.userData.dimensions && 
            (shape.userData.dimensions.width !== undefined || shape.userData.dimensions.depth !== undefined)) {
            return 'rectangle';
        }
        
        // Fallback to name-based detection
        if (shape.name.includes('circle')) return 'circle';
        if (shape.name.includes('rectangle')) return 'rectangle';
        if (shape.name.includes('polygon')) return 'polygon';
        if (shape.name.includes('building')) return 'building';
        if (shape.name.includes('tree') || shape.name.includes('_tree_')) return 'tree';
        return 'rectangle'; // Default
    }

    /**
     * Convert RGB to hex
     */
    rgbToHex(r, g, b) {
        return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    /**
     * Clean up all water_* meshes without proper type
     * This is a backup cleanup method that works directly on the scene
     */
    cleanupWaterMeshesWithoutType() {
        if (!this.sceneManager) return;
        
        const scene = this.sceneManager.getScene();
        if (!scene) return;
        
        // Find all meshes with name starting with 'water_' that don't have a valid type
        const unwantedMeshes = scene.meshes.filter(mesh => {
            if (!mesh.name || !mesh.name.startsWith('water_')) return false;
            
            // Check if mesh has no type in userData or type is invalid
            const hasNoType = !mesh.userData || !mesh.userData.type || mesh.userData.type === undefined || mesh.userData.type === null || mesh.userData.type === '';
            
            // Also check if it's a rectangle (not a polygon) with water name
            const isRectangleNotPolygon = mesh.userData && mesh.userData.shapeType === 'rectangle';
            
            // Remove if: has no type OR is a rectangle (not polygon)
            return hasNoType || isRectangleNotPolygon;
        });
        
        if (unwantedMeshes.length > 0) {
            console.log(`[UIManager] Found ${unwantedMeshes.length} unwanted water_* meshes, removing...`);
            
            unwantedMeshes.forEach(mesh => {
                console.log(`[UIManager] Removing: ${mesh.name} (type: ${mesh.userData?.type || 'none'})`);
                
                // Remove from selection manager
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(mesh);
                }
                
                // Remove from scene
                try {
                    scene.removeMesh(mesh);
                } catch (e) {
                    console.warn(`Error removing mesh ${mesh.name}:`, e);
                }
                
                // Dispose material
                try {
                    if (mesh.material && mesh.material.dispose) {
                        mesh.material.dispose();
                    }
                } catch (e) {
                    console.warn(`Error disposing material:`, e);
                }
                
                // Dispose mesh
                try {
                    if (mesh.dispose) {
                        mesh.dispose();
                    }
                } catch (e) {
                    console.warn(`Error disposing mesh:`, e);
                }
            });
            
            console.log(`[UIManager] Removed ${unwantedMeshes.length} unwanted water_* meshes`);
        }
    }

    /**
     * Get color for a specific type - Centralized color configuration
     */
    getColorByType(type) {
        // Normalize type to lowercase for case-insensitive comparison
        if (!type) {
            return new BABYLON.Color3(0.4, 0.3, 0.2); // Default brown
        }
        
        const normalizedType = type.toLowerCase();
        
        switch (normalizedType) {
            case 'building':
                return new BABYLON.Color3(1, 1, 1); // White for buildings
            case 'ground':
                return new BABYLON.Color3(0.4, 0.3, 0.2); // Brown for ground
            case 'water':
                return new BABYLON.Color3(0, 0.4, 0.8); // Blue for water
            case 'waterway':
                return new BABYLON.Color3(0, 0.5, 1); // Light blue for waterway
            case 'highway':
                return new BABYLON.Color3(0.3, 0.3, 0.3); // Gray for highway
            case 'grass':
                return new BABYLON.Color3(0, 0.8, 0); // Green for grass areas
            case 'tree':
                return new BABYLON.Color3(0.2, 0.6, 0.2); // Dark green for trees
            default:
                console.warn(`Unknown type "${type}", using default brown color`);
                return new BABYLON.Color3(0.4, 0.3, 0.2); // Default brown
        }
    }

    /**
     * Get standardized default color for all drawing tools
     */
    getDefaultDrawingColor() {
        return new BABYLON.Color3(0.4, 0.3, 0.2); // Consistent brown for all drawing tools
    }

    /**
     * Get standardized preview color for all drawing tools
     */
    getDefaultPreviewColor() {
        return new BABYLON.Color3(0.4, 0.3, 0.2); // Same brown for preview
    }

    /**
     * Get standardized preview alpha for all drawing tools
     */
    getDefaultPreviewAlpha() {
        return 0.5; // Consistent transparency for all previews
    }

    /**
     * Get hex color for a specific type
     */
    getHexColorByType(type) {
        const color = this.getColorByType(type);
        return this.rgbToHex(Math.round(color.r * 255), Math.round(color.g * 255), Math.round(color.b * 255));
    }

    /**
     * Save shape properties
     */
    saveShapeProperties() {
        // Use currentShape if available, otherwise try to find by name
        let shape = this.currentShape;
        
        if (!shape) {
            // Fallback: try to find by name from input field
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
            shape = scene.getMeshByName(shapeName);
        if (!shape) {
            console.warn('Cannot save properties: shape not found in scene:', shapeName);
            return;
        }

            // Set currentShape for future use
        this.currentShape = shape;
        }

        // Get the height value from the popup
        const height = Math.max(parseFloat(document.getElementById('shapeHeight').value) || 0, 0.001);
        
        // Apply height changes now (this is the only time height is applied)
        this.applyHeightChanges(shape, height);

        // Final update to ensure everything is saved
        this.updateShapeInRealTime();

        // After saving, select both the shape and its extrusion (if exists)
        this.selectShapeAndExtrusionAfterSave();

        // Dispatch event to update object list
        this.dispatchSceneChangeEvent();
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
            previewMaterial.backFaceCulling = false; // 2-sided
            previewMaterial.twoSidedLighting = true; // Enable lighting on both sides
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
            // TODO: Implement new extrusion method
        } else {
            // TODO: Implement new extrusion removal method
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
     * Convert hex to RGB (returns values 0-1 for Babylon.js)
     */
    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16) / 255,
            g: parseInt(result[2], 16) / 255,
            b: parseInt(result[3], 16) / 255
        } : { r: 0.4, g: 0.3, b: 0.2 }; // Default brown
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
            if (!obj || !obj.dispose) return;
            
            // Check if it's an imported STL object (including STL trees)
            const isImportedSTL = obj.userData && obj.userData.isImportedSTL;
            
            if (isImportedSTL) {
                // Handle imported STL objects (including trees)
                this.deleteImportedSTLObject(obj);
            }
            // Check if it's a tree (regular trees, not STL imported)
            else if (this.treeManager && this.isTree(obj)) {
                    // Find the tree object in the tree manager
                    const tree = this.treeManager.trees.find(t => t.parent === obj);
                    if (tree) {
                        this.treeManager.removeTree(tree);
                    } else {
                        // Fallback: just dispose the object
                    this.deleteImportedSTLObject(obj);
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
        });

        // Clear selection after deletion
        this.selectionManager.clearSelection();
        
        // Dispatch event to update object list
        this.dispatchSceneChangeEvent();
        
        console.log('Selected objects deleted and selection cleared');
    }

    /**
     * Delete an imported STL object (including STL trees)
     * @param {BABYLON.Mesh} obj - The STL object to delete
     */
    deleteImportedSTLObject(obj) {
        if (!obj) return;
        
        const scene = this.sceneManager ? this.sceneManager.getScene() : null;
        if (!scene) {
            console.warn('Scene not available for deleting STL object');
            return;
        }
        
        // Remove from selection manager first
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(obj);
        }
        
        // Remove from SceneManager if it's a building
        if (obj.userData && obj.userData.type === 'building' && this.sceneManager) {
            try {
                // Find and remove building from SceneManager
                const buildings = this.sceneManager.getBuildings();
                const buildingIndex = buildings.findIndex(b => {
                    // Buildings can be stored as {mesh: ...} or directly as mesh
                    return (b.mesh && b.mesh === obj) || (b === obj);
                });
                if (buildingIndex !== -1) {
                    buildings.splice(buildingIndex, 1);
                }
            } catch (error) {
                console.warn('Error removing building from SceneManager:', error);
            }
        }
        
        // Remove from scene
        try {
            scene.removeMesh(obj);
        } catch (error) {
            console.warn('Error removing mesh from scene:', error);
        }
        
        // Dispose material if not shared
        if (obj.material) {
            // Check if this material is used by other meshes in the scene
            const isMaterialShared = scene.meshes.some(otherMesh => 
                otherMesh !== obj && 
                otherMesh.material === obj.material &&
                !otherMesh.isDisposed()
            );
            
            // Only dispose the material if it's not shared
            if (!isMaterialShared) {
                try {
                    obj.material.dispose();
                } catch (error) {
                    console.warn('Error disposing material:', error);
                }
            }
        }
        
        // Dispose the mesh
        try {
            obj.dispose();
        } catch (error) {
            console.warn('Error disposing mesh:', error);
        }
        
        console.log(`Deleted imported STL object: ${obj.name}`);
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
     * Check if object is a tree
     */
    isTree(obj) {
        if (!obj || !obj.name) return false;
        
        // Check if it's a tree by name pattern
        const isTreeByName = obj.name.startsWith('tree_') || 
               obj.name.includes('_tree_') || 
                           obj.name.startsWith('simple_tree_') ||
                           (obj.name.startsWith('tree') && /^\d+$/.test(obj.name.substring(4)));
        
        // Also check if it's a TransformNode that's a tree parent
        if (!isTreeByName && obj instanceof BABYLON.TransformNode && this.treeManager) {
            const treeData = this.treeManager.trees.find(t => t.parent === obj);
            return treeData !== undefined;
        }
        
        return isTreeByName;
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

    /**
     * Update circle in real-time based on popup values
     */
    updateCircleInRealTime() {
        if (!this.currentShape) return;

        // Store current focus element to restore it after update
        const activeElement = document.activeElement;
        const wasInputFocused = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' ||
            activeElement.isContentEditable
        );
        const focusedInputId = wasInputFocused ? activeElement.id : null;

        // Get current values from popup
        const type = document.getElementById('circleType').value;
        // Color is now automatically determined by type, not from color picker
        
        // Get diameter value (same for all types)
        const diameter = Math.max(parseFloat(document.getElementById('circleDiameter').value) || 1.0, 0.1);
        const diameterTop = diameter;
        const diameterBottom = diameter;
        
        // For all types except 'building', height should be 0
        const isBuilding = type?.toLowerCase() === 'building';
        const heightInput = document.getElementById('circleHeight');
        let height;
        if (isBuilding) {
            // Only building type can have height > 0
            // IMPORTANT: Don't modify input value while user is typing
            // Only read the current value, don't format it
            height = Math.max(parseFloat(heightInput?.value || 0.1) || 0.1, 0.1);
        } else {
            // All other types (ground, grass, waterway, highway, etc.) should have height = 0
            height = 0;
            // IMPORTANT: Only update height input to 0 if user is not currently typing in it
            // This prevents interference while user is entering values
            if (heightInput && document.activeElement !== heightInput) {
                heightInput.value = 0;
            }
        }
        
        // IMPORTANT: Don't round values - use them as-is to allow any precision
        // This allows users to enter any number they want without forced rounding
        const roundedDiameterTop = diameterTop;
        const roundedDiameterBottom = diameterBottom;
        const roundedHeight = height;
        
        // Log height for non-building types
        if (!isBuilding) {
            console.log(`[HEIGHT] Circle type="${type}" height=${roundedHeight} (should be 0 for non-building types)`);
        }

        // Get color automatically based on type (user cannot change color manually)
        const newColor = this.getColorByType(type);
        
        // Update material color immediately for visual feedback
        if (this.currentShape.material && this.currentShape.material.diffuseColor) {
            this.currentShape.material.diffuseColor = newColor;
        }
        
        // Also update extrusion color if it exists (for circles with extrusion)
        if (this.currentShape.extrusion && this.currentShape.extrusion.material) {
            this.currentShape.extrusion.material.diffuseColor = newColor;
        }

        // Check if type actually changed before updating userData
        const currentType = this.currentShape.userData.type;
        const typeChanged = currentType !== type;
        
        // Update userData
        this.currentShape.userData.type = type;
        this.currentShape.userData.shapeType = type === 'building' ? 'building' : 'circle';
        
        // Only generate new name if type actually changed
        if (typeChanged) {
            const newName = this.generateUniqueNameByType(type);
            this.currentShape.name = newName;
            document.getElementById('circleName').value = newName;
            
            // Update userData.name to match the new name
            if (this.currentShape.userData) {
                this.currentShape.userData.name = newName;
            }
            
            // Update object list to reflect the name change
            if (this.objectListManager && this.objectListManager.updateObjectList) {
                this.objectListManager.updateObjectList();
            }
            
            // Dispatch scene change event
            this.dispatchSceneChangeEvent();
        }
        
        // Update circle geometry - pass type to ensure correct color and userData
        // Note: wasSelected check is now done in CircleManager.updateCircle and passed to onCircleCreated
        const newCircle = this.circleManager.updateCircle(this.currentShape, roundedDiameterTop, roundedDiameterBottom, roundedHeight, type);
        if (newCircle) {
            this.currentShape = newCircle;
            // Update dimensions in userData (type is already set in updateCircle)
            this.currentShape.userData.dimensions.diameterTop = roundedDiameterTop;
            this.currentShape.userData.dimensions.diameterBottom = roundedDiameterBottom;
            this.currentShape.userData.dimensions.height = roundedHeight;
            this.currentShape.userData.type = type; // Ensure type is set
            this.currentShape.userData.shapeType = type === 'building' ? 'building' : 'circle';
            console.log('Circle updated successfully, userData:', this.currentShape.userData);
            // Note: onCircleCreated callback will handle adding to selection manager and restoring selection
        }
        
        // Restore focus to the input field if it was focused before
        if (wasInputFocused && focusedInputId) {
            // Use setTimeout to ensure DOM is updated
            setTimeout(() => {
                const inputElement = document.getElementById(focusedInputId);
                if (inputElement) {
                    // IMPORTANT: setSelectionRange only works for text inputs, not number inputs
                    // Check if input type supports selection before trying to restore cursor position
                    const inputType = inputElement.type;
                    if (inputType === 'text' || inputType === 'textarea' || inputElement.isContentEditable) {
                        const cursorPosition = inputElement.selectionStart || 0;
                        inputElement.focus();
                        // Try to restore cursor position (only for text inputs)
                        if (inputElement.setSelectionRange) {
                            try {
                                inputElement.setSelectionRange(cursorPosition, cursorPosition);
                            } catch (e) {
                                // Ignore error if setSelectionRange fails
                                console.debug('Could not restore cursor position for input type:', inputType);
                            }
                        }
                    } else {
                        // For number inputs, just focus without trying to restore cursor position
                        inputElement.focus();
                    }
                }
            }, 0);
        }
    }

    /**
     * Save circle properties
     */
    saveCircleProperties() {
        if (!this.currentShape) return;

        // Apply all changes
        this.updateCircleInRealTime();

        // Dispatch event to update object list
        this.dispatchSceneChangeEvent();
    }

    /**
     * Show polygon properties popup
     */
    showPolygonPropertiesPopup(polygon) {
        this.currentShape = polygon;
        this.currentPolygon = polygon; // Store polygon reference for name validation
        
        // Store original values for cancel functionality
        const type = polygon.userData?.type || 'ground';
        const color = this.getShapeColor(polygon);
        
        // Store original values in userData
        polygon.userData.originalName = polygon.name;
        polygon.userData.originalType = type;
        polygon.userData.originalColor = color;
        
        // Set type
        const polygonTypeSelect = document.getElementById('polygonType');
        polygonTypeSelect.value = type;
        // Store the initial type value for change detection
        polygonTypeSelect.setAttribute('data-previous-value', type);
        
        // Use current polygon name (don't generate new name)
        document.getElementById('polygonName').value = polygon.name;
        
        // Color is now automatically determined by type (no color picker)
        
        // Show/hide height field based on type
        const heightGroup = document.getElementById('polygonHeightGroup');
        if (type === 'building') {
            heightGroup.style.display = 'block';
            // Set current height for building
            const currentHeight = polygon.userData?.currentHeight || 1;
            document.getElementById('polygonHeight').value = currentHeight;
        } else {
            heightGroup.style.display = 'none';
        }
        
        // Set triangle count
        const triangleCount = this.getPolygonTriangleCount(polygon);
        document.getElementById('polygonTriangles').value = triangleCount;
        
        // Show popup
        const popup = document.getElementById('polygonPropertiesPopup');
        popup.classList.add('show');
        // Adjust position based on object list visibility
        this.adjustPropertiesPopupPositionForElement(popup);
    }

    /**
     * Get triangle count for polygon
     */
    getPolygonTriangleCount(polygon) {
        if (!polygon || !polygon.userData || !polygon.userData.points) {
            return '0';
        }
        
        const points = polygon.userData.points;
        if (points.length < 3) {
            return '0';
        }
        
        // For simple polygons, triangle count = vertices - 2
        // For complex polygons with holes, it's more complex
        const vertexCount = points.length;
        const triangleCount = vertexCount - 2;
        
        return triangleCount.toString();
    }

    /**
     * Hide polygon properties popup
     */
    hidePolygonPropertiesPopup() {
        document.getElementById('polygonPropertiesPopup').classList.remove('show');
        this.currentShape = null;
        
        // IMPORTANT: Reset polygonType dropdown to 'ground' so new polygons default to ground
        // This prevents new polygons from inheriting the type of the previously edited polygon
        const polygonTypeSelect = document.getElementById('polygonType');
        if (polygonTypeSelect) {
            polygonTypeSelect.value = 'ground';
            polygonTypeSelect.removeAttribute('data-previous-value');
        }
    }

    /**
     * Save polygon properties
     */
    savePolygonProperties() {
        if (!this.currentShape) return;

        // Get values from popup
        const name = document.getElementById('polygonName').value.trim();
        const type = document.getElementById('polygonType').value;
        // Color is now automatically determined by type, not from color picker
        
        // Validate name (should already be validated by blur event, but double-check)
        if (!name || name === '') {
            console.warn('Cannot save polygon properties: name is empty');
            return;
        }
        
        // Check if name is unique (should already be validated, but double-check)
        if (!this.isNameUnique(name, this.currentShape)) {
            console.warn('Cannot save polygon properties: name is duplicate');
            return;
        }
        
        // Get height only for building type
        let height = undefined;
        if (type === 'building') {
            height = parseFloat(document.getElementById('polygonHeight').value) || 1;
        }

        // Update polygon name (only if it changed)
        if (this.currentShape.name !== name) {
        this.currentShape.name = name;
            // Also update extrusion name if exists
            if (this.currentShape.extrusion) {
                this.currentShape.extrusion.name = `${name}_extrusion`;
            }
        }

        // Get color automatically based on type (user cannot change color manually)
        const colorFromType = this.getColorByType(type);
        
        // Update polygon properties
        this.updatePolygonProperties(this.currentShape, {
            type: type,
            color: colorFromType,
            height: height
        });

        // Dispatch event to update object list
        this.dispatchSceneChangeEvent();
    }

    /**
     * Save tree properties
     */
    saveTreeProperties() {
        if (!this.currentShape) return;

        console.log('Saving tree properties');
        
        // Get scale value from input
        const scaleValue = parseFloat(document.getElementById('treeScale').value);
        
        // Validate scale value
        if (scaleValue < 1) {
            alert('Scale must be at least 1.0');
            return;
        }
        
        // IMPORTANT: Preserve the sign of original scaling to prevent tree from flipping
        // Get the original scaling signs to maintain orientation
        const originalScaling = this.currentShape.scaling;
        const signX = originalScaling.x >= 0 ? 1 : -1;
        const signY = originalScaling.y >= 0 ? 1 : -1;
        const signZ = originalScaling.z >= 0 ? 1 : -1;
        
        // Apply scaling with preserved signs
        this.currentShape.scaling = new BABYLON.Vector3(
            scaleValue * signX,
            scaleValue * signY,
            scaleValue * signZ
        );
        
        console.log(`[Tree Scale] Saved scaling for ${this.currentShape.name}:`, {
            original: `X:${originalScaling.x}, Y:${originalScaling.y}, Z:${originalScaling.z}`,
            new: `X:${this.currentShape.scaling.x}, Y:${this.currentShape.scaling.y}, Z:${this.currentShape.scaling.z}`,
            signs: `X:${signX}, Y:${signY}, Z:${signZ}`
        });
        
        // Update wireframes if they exist
        if (this.selectionManager) {
            this.selectionManager.updateWireframeTransforms(this.currentShape);
        }
        
        // Dispatch event to update object list
        this.dispatchSceneChangeEvent();
    }

    /**
     * Update tree scale in real-time
     */
    updateTreeScaleInRealTime(scaleValue) {
        if (!this.currentShape) return;
        
        // Validate scale value
        if (scaleValue < 1) {
            return; // Don't update if below minimum
        }
        
        // IMPORTANT: Preserve the sign of original scaling to prevent tree from flipping
        // Get the original scaling signs to maintain orientation
        const originalScaling = this.currentShape.scaling;
        const signX = originalScaling.x >= 0 ? 1 : -1;
        const signY = originalScaling.y >= 0 ? 1 : -1;
        const signZ = originalScaling.z >= 0 ? 1 : -1;
        
        // Apply scaling with preserved signs
        this.currentShape.scaling = new BABYLON.Vector3(
            scaleValue * signX,
            scaleValue * signY,
            scaleValue * signZ
        );
        
        console.log(`[Tree Scale] Updated scaling for ${this.currentShape.name}:`, {
            original: `X:${originalScaling.x}, Y:${originalScaling.y}, Z:${originalScaling.z}`,
            new: `X:${this.currentShape.scaling.x}, Y:${this.currentShape.scaling.y}, Z:${this.currentShape.scaling.z}`,
            signs: `X:${signX}, Y:${signY}, Z:${signZ}`
        });
        
        // Update wireframes if they exist
        if (this.selectionManager) {
            this.selectionManager.updateWireframeTransforms(this.currentShape);
        }
    }



    /**
     * Get the desired base Y position for a polygon (stores it if missing)
     */
    getPolygonBaseWorldY(polygon) {
        if (!polygon) return 0;

        // IMPORTANT: If polygon has extrusion, get base Y from extrusion, not polygon
        // The extrusion is the actual 3D mesh, polygon is just a container
        if (polygon.extrusion) {
            polygon.extrusion.computeWorldMatrix(true);
            const extrusionBoundingInfo = polygon.extrusion.getBoundingInfo();
            if (extrusionBoundingInfo && extrusionBoundingInfo.boundingBox) {
                const rawMinY = extrusionBoundingInfo.boundingBox.minimumWorld.y;
                const normalizedMinY = Math.abs(rawMinY) < 0.0001 ? 0 : rawMinY;
                
                const userData = polygon.userData = polygon.userData || {};
                if (userData.baseY === undefined || Math.abs(userData.baseY - normalizedMinY) > 0.0001) {
                    userData.baseY = normalizedMinY;
                }
                return userData.baseY;
            }
        }

        // For polygons without extrusion, use polygon's own bounding box
        polygon.computeWorldMatrix(true);
        const boundingInfo = polygon.getBoundingInfo();
        if (!boundingInfo || !boundingInfo.boundingBox) {
            return 0;
        }

        const rawMinY = boundingInfo.boundingBox.minimumWorld.y;
        const normalizedMinY = Math.abs(rawMinY) < 0.0001 ? 0 : rawMinY;

        const userData = polygon.userData = polygon.userData || {};
        const previousBaseY = userData.baseY;

        if (previousBaseY === undefined || Math.abs(previousBaseY - normalizedMinY) > 0.0001) {
            userData.baseY = normalizedMinY;
        }

        return userData.baseY;
    }

    /**
     * Realign a polygon so its base stays anchored at the specified world Y level
     */
    realignPolygonBase(polygon, baseY) {
        if (!polygon) return;

        // IMPORTANT: If polygon has extrusion, adjust polygon position to keep extrusion base at baseY
        // The extrusion is the actual 3D mesh, polygon is just a container
        if (polygon.extrusion) {
            polygon.extrusion.computeWorldMatrix(true);
            const extrusionBoundingInfo = polygon.extrusion.getBoundingInfo();
            if (extrusionBoundingInfo && extrusionBoundingInfo.boundingBox) {
                const minWorldY = extrusionBoundingInfo.boundingBox.minimumWorld.y;
                const normalizedMinY = Math.abs(minWorldY) < 0.0001 ? 0 : minWorldY;
                const normalizedBaseY = Math.abs(baseY) < 0.0001 ? 0 : baseY;
                const deltaY = normalizedBaseY - normalizedMinY;

                if (Math.abs(deltaY) > 0.0001) {
                    // Adjust polygon position to move extrusion base to baseY
                    polygon.position.y += deltaY;
                    polygon.computeWorldMatrix(true);
                    polygon.extrusion.computeWorldMatrix(true);
                }
            }
        } else {
            // For polygons without extrusion, use polygon's own bounding box
            polygon.computeWorldMatrix(true);
            const boundingInfo = polygon.getBoundingInfo();
            if (!boundingInfo || !boundingInfo.boundingBox) {
                return;
            }

            const minWorldY = boundingInfo.boundingBox.minimumWorld.y;
            const normalizedMinY = Math.abs(minWorldY) < 0.0001 ? 0 : minWorldY;
            const normalizedBaseY = Math.abs(baseY) < 0.0001 ? 0 : baseY;
            const deltaY = normalizedBaseY - normalizedMinY;

            if (Math.abs(deltaY) > 0.0001) {
                polygon.position.y += deltaY;
                polygon.computeWorldMatrix(true);
            }
        }

        polygon.userData = polygon.userData || {};
        polygon.userData.baseY = baseY;

        if (this.selectionManager) {
            this.selectionManager.updateWireframeTransforms(polygon);
        }
    }



    /**
     * Update polygon properties
     */
    updatePolygonProperties(polygon, properties) {
        // IMPORTANT: Create a new userData object to avoid reference sharing issues
        const oldUserData = polygon.userData || {};
        const oldType = oldUserData.type;
        
        // Create new userData object with spread operator to avoid reference sharing
        polygon.userData = {
            ...oldUserData,
            type: properties.type
        };
        
        console.log(`[UPDATE_POLYGON_PROPERTIES] Updated polygon "${polygon.name}" type from "${oldType}" to "${properties.type}"`);

        // Update material color and type
        if (polygon.material) {
            // Color is now automatically determined by type
            this.updatePolygonMaterialColorByType(polygon, properties.type);
        }
        
        // Update height based on type (not just for building)
        // If height is explicitly provided and type is building, use it
        // Otherwise, use updatePolygonMaterialByType to set height based on type
        if (properties.height !== undefined && properties.type === 'building') {
            // IMPORTANT: For extrusion, we need to scale extrusion, not polygon
            // Do NOT use realignPolygonBase as it changes polygon position
            if (polygon.extrusion) {
                // IMPORTANT: Keep polygon at its current Y position
                // Do NOT move polygon - preserve its current position
                const polygonY = polygon.position.y;
                
                // Calculate originalHeight from current scaling to preserve position correctly
                let originalHeight = polygon.userData?.originalHeight;
                if (!originalHeight || originalHeight <= 0) {
                    // If originalHeight is not set, calculate it from current extrusion scaling
                    const currentScaling = polygon.extrusion.scaling.y;
                    const currentHeight = polygon.userData?.currentHeight || properties.height;
                    originalHeight = currentHeight / currentScaling;
                    if (originalHeight <= 0) originalHeight = 1; // Fallback to 1
                    // Store it for future use
                    if (!polygon.userData) polygon.userData = {};
                    polygon.userData.originalHeight = originalHeight;
                }
                
                const scaleFactor = properties.height / originalHeight;
                
                // IMPORTANT: Get current base world Y BEFORE scaling
                // This is the world Y position of the extrusion's base that we want to preserve
                // Since extrusion is NOT a child of polygon, position is in world space
                polygon.extrusion.computeWorldMatrix(true);
                const extrusionBoundingInfoBefore = polygon.extrusion.getBoundingInfo();
                const baseWorldYBefore = extrusionBoundingInfoBefore && extrusionBoundingInfoBefore.boundingBox ? 
                    extrusionBoundingInfoBefore.boundingBox.minimumWorld.y : polygonY;
                
                // Scale extrusion (NOT the polygon)
                polygon.extrusion.scaling.y = scaleFactor;
                
                // IMPORTANT: After scaling, extrusion base will move because scaling happens around the mesh center
                // We need to adjust extrusion position to keep the base at the same world Y
                // Since extrusion is in world space, we adjust position.y directly
                polygon.extrusion.computeWorldMatrix(true);
                const extrusionBoundingInfoAfter = polygon.extrusion.getBoundingInfo();
                const baseWorldYAfter = extrusionBoundingInfoAfter && extrusionBoundingInfoAfter.boundingBox ? 
                    extrusionBoundingInfoAfter.boundingBox.minimumWorld.y : baseWorldYBefore;
                
                // Calculate the delta - how much the base moved
                const deltaY = baseWorldYAfter - baseWorldYBefore;
                
                // Adjust extrusion position to compensate for the base movement
                // Move extrusion down by deltaY to bring base back to original position
                if (Math.abs(deltaY) > 0.001) {
                    polygon.extrusion.position.y = polygon.extrusion.position.y - deltaY;
                    polygon.extrusion.computeWorldMatrix(true);
                }
                
                // IMPORTANT: Do NOT scale the polygon itself - only the extrusion
                polygon.scaling.y = 1; // Keep polygon scaling at 1
                
                // Update userData to reflect the new height
                if (!polygon.userData) polygon.userData = {};
                polygon.userData.currentHeight = properties.height;
                
                // IMPORTANT: Do NOT adjust polygon position - keep it fixed
                // The extrusion position adjustment handles keeping the base at the correct world Y
            } else {
                // For polygons without extrusion (shouldn't happen for building type)
                const originalHeight = polygon.userData?.originalHeight || 0.05;
                const scaleFactor = properties.height / originalHeight;
                const baseY = this.getPolygonBaseWorldY(polygon);
                
                polygon.scaling.y = scaleFactor;
                this.realignPolygonBase(polygon, baseY);
            }
            
            polygon.userData.currentHeight = properties.height;
            
            // NOTE: When using scaling, normals are automatically scaled correctly by Babylon.js
            // We should NOT recalculate normals when height changes via scaling, as this causes shadow issues
            // Only update normals if the mesh geometry itself is recreated (not when scaling changes)
            // Removed updateExtrusionNormals calls to prevent shadow artifacts
        } else if (oldType !== properties.type) {
            // Type changed - update height based on new type using updatePolygonMaterialByType
            this.updatePolygonMaterialByType(polygon, properties.type);
        }

    }

    /**
     * Generate unique polygon name based on type
     */
    generateUniquePolygonName(type) {
        const scene = this.sceneManager.getScene();
        const existingNames = new Set();
        
        // Collect all existing polygon names
        scene.meshes.forEach(mesh => {
            if (mesh.name && mesh.name.startsWith(type) && /^\d+$/.test(mesh.name.substring(type.length))) {
                existingNames.add(mesh.name);
            }
        });
        
        // Find the next available number
        let counter = 1;
        let newName;
        do {
            newName = `${type}${counter}`;
            counter++;
        } while (existingNames.has(newName));
        
        return newName;
    }

    /**
     * Update polygon color picker based on type
     */
    updatePolygonColorByType(type) {
        // Color is now automatically determined by type (no color picker)
        // This function is kept for compatibility but does nothing
    }

    /**
     * Update polygon material color based on type - Use standardized colors
     */
    updatePolygonMaterialColorByType(polygon, type) {
        if (!polygon.material) return;

        // Use standardized color system for consistency with other drawing tools
        const standardizedColor = this.getColorByType(type);
        polygon.material.diffuseColor = standardizedColor;
        
        // Also update extrusion color if it exists
        if (polygon.extrusion && polygon.extrusion.material) {
            polygon.extrusion.material.diffuseColor = standardizedColor;
        }
    }

    /**
     * Update polygon material based on type - Use standardized colors
     */
    updatePolygonMaterialByType(polygon, type) {
        if (!polygon.material) return;

        // Update color using standardized system
        this.updatePolygonMaterialColorByType(polygon, type);
        
        // IMPORTANT: Update renderingGroupId based on new type
        const newRenderingGroupId = SceneManager.getRenderingGroupId(type);
        if (polygon.renderingGroupId !== newRenderingGroupId) {
            console.log(`[POLYGON_TYPE_CHANGE] Updating renderingGroupId for polygon "${polygon.name}": ${polygon.renderingGroupId} -> ${newRenderingGroupId} (type: ${type})`);
            polygon.renderingGroupId = newRenderingGroupId;
        }

        // Set height automatically based on type
        // For all types except 'building', convert to 2D mesh (no height)
        const isBuilding = type?.toLowerCase() === 'building';
        let targetHeight;
        if (isBuilding) {
            targetHeight = 1; // Building height (scale 1)
        } else {
            targetHeight = 0; // 2D for non-building types (will convert to 2D mesh)
        }

        // Check if polygon has extrusion (3D) or is just a 2D mesh
        // IMPORTANT: Check hasExtrusion BEFORE any conversions to ensure we can create extrusion if needed
        const hasExtrusion = polygon.extrusion !== undefined && polygon.extrusion !== null;
        const is3D = polygon.userData?.is3D || hasExtrusion;
        
        // IMPORTANT: For building type, create 3D extrusion and hide 2D polygon
        // For other types, remove extrusion and show 2D polygon
        // This preserves the 2D drawing mode while allowing 3D visualization for buildings
        console.log(`[POLYGON_TYPE_CHANGE] Polygon "${polygon.name}": type="${type}", isBuilding=${isBuilding}, hasExtrusion=${hasExtrusion}, is3D=${is3D}`);
        
        // IMPORTANT: Handle building type FIRST - create extrusion if needed
        // IMPORTANT: If extrusion already exists, dispose it first to prevent duplicate extrusions
        if (hasExtrusion && polygon.extrusion) {
            console.log(`[POLYGON_EXTRUSION] Disposing existing extrusion for polygon "${polygon.name}" before creating new one`);
            // Remove from selection manager if it's there
            if (this.selectionManager) {
                this.selectionManager.removeSelectableObject(polygon.extrusion);
            }
            // Dispose material if it exists
            if (polygon.extrusion.material && polygon.extrusion.material !== this.sceneManager.getScene().defaultMaterial) {
                try {
                    const material = polygon.extrusion.material;
                    polygon.extrusion.material = null;
                    material.dispose();
                } catch (error) {
                    console.warn(`[POLYGON_EXTRUSION] Error disposing material:`, error);
                }
            }
            // Dispose geometry if it exists
            if (polygon.extrusion.geometry) {
                try {
                    polygon.extrusion.geometry.dispose();
                } catch (error) {
                    console.warn(`[POLYGON_EXTRUSION] Error disposing geometry:`, error);
                }
            }
            // Dispose the mesh itself
            try {
                polygon.extrusion.dispose();
            } catch (error) {
                console.warn(`[POLYGON_EXTRUSION] Error disposing old extrusion:`, error);
            }
            polygon.extrusion = null;
        }
        
        if (isBuilding && !hasExtrusion) {
            console.log(`[POLYGON_EXTRUSION] Creating 3D extrusion for polygon "${polygon.name}" (type changed to building)`);
            
            // Get points from userData
            const points = polygon.userData?.points || [];
            if (points.length < 3) {
                console.warn(`[POLYGON_EXTRUSION] Cannot create extrusion: polygon has less than 3 points`);
                return;
            }
            
            // Calculate center and relative points
            const center = BABYLON.Vector3.Zero();
            points.forEach(point => center.addInPlace(point));
            center.scaleInPlace(1 / points.length);
            center.y = 0;
            
            const relativePoints = points.map(point => point.subtract(center));
            const pointsForExtrusion = relativePoints.map(p => new BABYLON.Vector3(p.x, 0, p.z));
            
            // Create extrusion with initial height 1 (default building height)
            const extrusionName = `${polygon.name}_extrusion`;
            const initialExtrusionHeight = 1; // Default building height
            const extrusion = this.createCustomPolygonExtrusion(extrusionName, pointsForExtrusion, initialExtrusionHeight);
            
            if (extrusion) {
                // Link extrusion to polygon (but don't set as parent to avoid visibility issues)
                polygon.extrusion = extrusion;
                extrusion.basePolygon = polygon;
                // IMPORTANT: Don't set parent - keep extrusion independent so it remains visible when polygon is hidden
                // extrusion.setParent(polygon);
                
                // Position extrusion in world space (same position as polygon)
                // Extrusion is created with base at Y=0 in local space, so we need to position it at polygon Y
                extrusion.position.x = polygon.position.x;
                extrusion.position.y = polygon.position.y + initialExtrusionHeight / 2; // Base at polygon Y, center at polygon Y + height/2
                extrusion.position.z = polygon.position.z;
                
                // Verify and fix: ensure extrusion base is at polygon Y
                extrusion.computeWorldMatrix(true);
                const extrusionBoundingInfo = extrusion.getBoundingInfo();
                if (extrusionBoundingInfo && extrusionBoundingInfo.boundingBox) {
                    const extrusionBaseWorldY = extrusionBoundingInfo.boundingBox.minimumWorld.y;
                    const polygonWorldY = polygon.position.y;
                    const deltaY = extrusionBaseWorldY - polygonWorldY;
                    if (Math.abs(deltaY) > 0.01) {
                        extrusion.position.y = extrusion.position.y - deltaY;
                        console.log(`[EXTRUSION_CREATE] Fixed extrusion base: was ${extrusionBaseWorldY.toFixed(3)}, should be ${polygonWorldY.toFixed(3)}, adjusted position.y by ${-deltaY.toFixed(3)}`);
                    }
                }
                
                // Ensure extrusion is visible and enabled
                extrusion.setEnabled(true);
                extrusion.isVisible = true;
                
                // IMPORTANT: Make extrusion pickable so it can be selected by clicking on walls
                extrusion.isPickable = true;
                
                // IMPORTANT: Make sure extrusion is in the scene and visible
                const scene = this.sceneManager.getScene();
                if (!scene.meshes.includes(extrusion)) {
                    scene.addMesh(extrusion);
                    console.log(`[EXTRUSION_CREATE] Added extrusion to scene: ${extrusionName}`);
                }
                
                // IMPORTANT: Double-check visibility and material
                if (!extrusion.isVisible) {
                    console.warn(`[EXTRUSION_CREATE] Extrusion ${extrusionName} is not visible, fixing...`);
                    extrusion.isVisible = true;
                }
                if (!extrusion.isEnabled()) {
                    console.warn(`[EXTRUSION_CREATE] Extrusion ${extrusionName} is not enabled, fixing...`);
                    extrusion.setEnabled(true);
                }
                if (!extrusion.material) {
                    console.warn(`[EXTRUSION_CREATE] Extrusion ${extrusionName} has no material, creating default material...`);
                    const defaultMaterial = new BABYLON.StandardMaterial(`${extrusionName}_defaultMaterial`, scene);
                    defaultMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
                    defaultMaterial.backFaceCulling = false;
                    defaultMaterial.twoSidedLighting = true;
                    extrusion.material = defaultMaterial;
                }
                
                // Log extrusion visibility status
                console.log(`[EXTRUSION_CREATE] Extrusion visibility: isVisible=${extrusion.isVisible}, enabled=${extrusion.isEnabled()}, hasMaterial=${!!extrusion.material}, inScene=${scene.meshes.includes(extrusion)}, position=(${extrusion.position.x.toFixed(2)}, ${extrusion.position.y.toFixed(2)}, ${extrusion.position.z.toFixed(2)})`);
                console.log(`[EXTRUSION_CREATE] Polygon visibility: isVisible=${polygon.isVisible}, enabled=${polygon.isEnabled()}, position=(${polygon.position.x.toFixed(2)}, ${polygon.position.y.toFixed(2)}, ${polygon.position.z.toFixed(2)})`);
                
                // Copy material from polygon with proper settings
                if (polygon.material) {
                    const newMaterial = new BABYLON.StandardMaterial(`${extrusionName}Material`, this.sceneManager.getScene());
                    newMaterial.diffuseColor = polygon.material.diffuseColor ? polygon.material.diffuseColor.clone() : new BABYLON.Color3(1, 1, 1);
                    newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                    newMaterial.emissiveColor = new BABYLON.Color3(0, 0, 0);
                    newMaterial.roughness = 0.7;
                    newMaterial.backFaceCulling = false; // 2-sided
                    newMaterial.twoSidedLighting = true; // Enable lighting on both sides
                    extrusion.material = newMaterial;
                } else {
                    extrusion.material = polygon.material;
                }
                extrusion.receiveShadows = true;
                extrusion.castShadows = true;
                extrusion.renderingGroupId = SceneManager.getRenderingGroupId(type);
                
                // Update userData
                if (!polygon.userData) polygon.userData = {};
                polygon.userData.is3D = true;
                polygon.userData.originalHeight = initialExtrusionHeight;
                polygon.userData.currentHeight = initialExtrusionHeight;
                polygon.userData.sideWallNormalsFlipped = true;
                
                // IMPORTANT: Hide 2D polygon FIRST before adding extrusion to selection
                // This ensures polygon is not selectable when extrusion is added
                polygon.isVisible = false;
                polygon.setEnabled(false);
                polygon.isPickable = false; // Make polygon non-pickable
                
                // IMPORTANT: Remove polygon from selectable objects since it's now hidden
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(polygon);
                    console.log(`[POLYGON_EXTRUSION] Removed 2D polygon from selectable objects (now hidden), isPickable=${polygon.isPickable}, isVisible=${polygon.isVisible}, enabled=${polygon.isEnabled()}, inSelectableObjects=${this.selectionManager.selectableObjects.includes(polygon)}`);
                }
                
                // IMPORTANT: Add extrusion to selection manager so it can be selected and shown in object list
                if (this.selectionManager) {
                    // Ensure extrusion is pickable
                    extrusion.isPickable = true;
                    this.selectionManager.addSelectableObject(extrusion);
                    console.log(`[POLYGON_EXTRUSION] Added extrusion to selection manager: ${extrusionName}, isPickable=${extrusion.isPickable}, isVisible=${extrusion.isVisible}, enabled=${extrusion.isEnabled()}, inSelectableObjects=${this.selectionManager.selectableObjects.includes(extrusion)}`);
                    
                    // IMPORTANT: Always select the extrusion when polygon is converted to building
                    // This ensures the 3D building model is selected in the scene
                    const wasPolygonSelected = this.selectionManager.selectedObjects.includes(polygon);
                    if (wasPolygonSelected) {
                        console.log(`[POLYGON_EXTRUSION] Polygon was selected, deselecting polygon and selecting extrusion`);
                        // Remove polygon from selection (it's now hidden)
                        this.selectionManager.deselectObject(polygon);
                    }
                    // Always select extrusion (whether polygon was selected or not)
                    this.selectionManager.selectObject(extrusion, false, false);
                    console.log(`[POLYGON_EXTRUSION] Extrusion selected: ${extrusionName}, isSelected=${this.selectionManager.selectedObjects.includes(extrusion)}`);
                }
                
                // Enable shadows
                if (this.lightingManager && this.lightingManager.updateShadowsForNewObject) {
                    this.lightingManager.updateShadowsForNewObject(extrusion);
                }
                
                // Update height input field
                const polygonHeightInput = document.getElementById('polygonHeight');
                if (polygonHeightInput) {
                    polygonHeightInput.value = initialExtrusionHeight;
                }
                
                // IMPORTANT: Dispatch scene change event to update object list
                this.dispatchSceneChangeEvent();
                
                console.log(`[POLYGON_EXTRUSION] Extrusion created successfully for polygon "${polygon.name}", 2D polygon hidden`);
            } else {
                console.warn(`[POLYGON_EXTRUSION] Failed to create extrusion for polygon "${polygon.name}"`);
                return;
            }
        }
        
        // IMPORTANT: Re-check hasExtrusion after potentially creating it
        const hasExtrusionNow = polygon.extrusion !== undefined && polygon.extrusion !== null;
        
        // IMPORTANT: Remove extrusion if type is not building (show 2D polygon instead)
        console.log(`[POLYGON_TYPE_CHANGE] After extrusion check: hasExtrusionNow=${hasExtrusionNow}, isBuilding=${isBuilding}`);
        if (!isBuilding && hasExtrusionNow) {
            console.log(`[POLYGON_EXTRUSION] Removing extrusion from polygon "${polygon.name}" (type changed from building to ${type}), showing 2D polygon`);
            
            // IMPORTANT: Mark that polygon had extrusion before removal
            // This will be used to determine if polygon needs conversion to 2D
            const hadExtrusionBefore = true;
            
            // Remove from selection manager
            if (this.selectionManager) {
                // Deselect extrusion if it was selected
                this.selectionManager.deselectObject(polygon.extrusion);
                this.selectionManager.removeSelectableObject(polygon.extrusion);
            }
            
            // Dispose extrusion
            if (polygon.extrusion.geometry) {
                polygon.extrusion.geometry.dispose();
            }
            if (polygon.extrusion.material && polygon.extrusion.material !== this.sceneManager.getScene().defaultMaterial) {
                try {
                    const material = polygon.extrusion.material;
                    // Unlink material from mesh before disposing to prevent WebGL errors
                    polygon.extrusion.material = null;
                    material.dispose();
                } catch (error) {
                    // Ignore WebGL errors during material disposal (timing issues)
                }
            }
            try {
                polygon.extrusion.dispose();
            } catch (error) {
                // Ignore WebGL errors during extrusion disposal
            }
            polygon.extrusion = null;
            
            // Show 2D polygon again (it was hidden when extrusion was created)
            polygon.isVisible = true;
            polygon.setEnabled(true);
            
            // IMPORTANT: Make polygon pickable again so it can be selected
            polygon.isPickable = true;
            
            // IMPORTANT: Re-add polygon to selectable objects since it's now visible
            // And select it so the user stays in selection after converting from building
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(polygon);
                this.selectionManager.selectObject(polygon, false, false);
                console.log(`[POLYGON_EXTRUSION] Re-added 2D polygon to selectable objects and selected it (now visible), isPickable=${polygon.isPickable}, isVisible=${polygon.isVisible}, enabled=${polygon.isEnabled()}`);
            }
            
            // Update userData
            if (!polygon.userData) polygon.userData = {};
            polygon.userData.hadExtrusion = true;
            polygon.userData.is3D = false;
        }

        // Ensure 2D polygon remains selected after converting from building to other types
        if (!isBuilding && this.selectionManager) {
            const isPolygonSelected = this.selectionManager.selectedObjects.includes(polygon);
            if (!isPolygonSelected) {
                this.selectionManager.selectObject(polygon, false, false);
                console.log(`[POLYGON_TYPE_CHANGE] Polygon "${polygon.name}" re-selected after reverting to 2D`);
            }
        }
        
        // IMPORTANT: If building type with extrusion, ensure 2D polygon is hidden
        if (isBuilding && hasExtrusionNow) {
            polygon.isVisible = false;
            polygon.setEnabled(false);
            polygon.isPickable = false; // Make polygon non-pickable
            
            // IMPORTANT: Ensure polygon is removed from selectable objects
            if (this.selectionManager) {
                this.selectionManager.removeSelectableObject(polygon);
                console.log(`[POLYGON_EXTRUSION] Polygon "${polygon.name}" is building with extrusion, 2D polygon hidden, isPickable=${polygon.isPickable}`);
            }
        }
        
        // IMPORTANT: For non-building types, ensure polygon is 2D and visible
        // For building types with extrusion, polygon is hidden and extrusion is shown
        if (!isBuilding) {
            // For non-building types, ensure polygon is 2D and visible
            // IMPORTANT: After removing extrusion, we need to check if polygon needs conversion
            // A polygon that had extrusion (was building) needs to be converted to 2D mesh
            // Check if polygon is already 2D (created with createPolygonMesh)
            const isAlready2D = !polygon.userData?.is3D || polygon.userData?.currentHeight === 0;
            
            // IMPORTANT: Always convert to 2D if polygon had extrusion (was building)
            // Even if isAlready2D is true, we need to ensure the polygon is properly 2D
            // Check if polygon had extrusion before (was 3D building)
            const hadExtrusion = polygon.userData?.hadExtrusion === true || polygon.userData?.is3D === true;
            const needsConversion = !isAlready2D || hadExtrusion;
            
            if (needsConversion && polygon.userData?.points && polygon.userData.points.length >= 3) {
                // Convert 3D polygon to 2D mesh
                console.log(`[POLYGON_CONVERSION] Converting polygon "${polygon.name}" from 3D to 2D (type: ${type})`);
                const wasSelected = this.selectionManager && this.selectionManager.isSelected(polygon);
                const currentName = polygon.name;
                const currentMaterial = polygon.material;
                const currentPoints = polygon.userData.points.map(p => 
                    p instanceof BABYLON.Vector3 ? p.clone() : new BABYLON.Vector3(p.x, p.y || 0, p.z)
                );
                const currentPosition = polygon.position.clone();
                const currentUserData = JSON.parse(JSON.stringify(polygon.userData || {}));
                
                // IMPORTANT: Ensure points are world coordinates, not relative
                // If points are relative (centered at origin), convert them to world coordinates
                // by adding the original polygon position
                const pointsCenter = BABYLON.Vector3.Zero();
                currentPoints.forEach(point => {
                    const p = point instanceof BABYLON.Vector3 ? point : new BABYLON.Vector3(point.x, point.y || 0, point.z);
                    pointsCenter.addInPlace(p);
                });
                pointsCenter.scaleInPlace(1 / currentPoints.length);
                
                // Check if points are relative (center is at origin)
                const pointsAreRelative = Math.abs(pointsCenter.x) < 0.001 && Math.abs(pointsCenter.z) < 0.001;
                
                if (pointsAreRelative) {
                    // Convert relative points to world coordinates
                    console.log(`[POLYGON_CONVERSION] Converting relative points to world coordinates for "${currentName}"`);
                    currentPoints = currentPoints.map(point => {
                        const p = point instanceof BABYLON.Vector3 ? point : new BABYLON.Vector3(point.x, point.y || 0, point.z);
                        return new BABYLON.Vector3(
                            p.x + currentPosition.x,
                            p.y + currentPosition.y,
                            p.z + currentPosition.z
                        );
                    });
                }
                
                // Update userData
                currentUserData.type = type;
                currentUserData.shapeType = 'polygon';
                currentUserData.is3D = false;
                currentUserData.originalHeight = 0;
                currentUserData.currentHeight = 0;
                // IMPORTANT: Store world coordinates in userData
                currentUserData.points = currentPoints.map(p => p.clone());
                
                // Remove from selection manager before disposing
                if (this.selectionManager) {
                    this.selectionManager.removeSelectableObject(polygon);
                }
                
                // Dispose old 3D polygon
                if (polygon.geometry) {
                    polygon.geometry.dispose();
                }
                if (polygon.material && polygon.material !== this.sceneManager.getScene().defaultMaterial) {
                    // Check if material is shared
                    const scene = this.sceneManager.getScene();
                    const meshesUsingMaterial = scene.meshes.filter(m => m.material === polygon.material && m !== polygon);
                    if (meshesUsingMaterial.length === 0) {
                        try {
                            polygon.material.dispose();
                        } catch (error) {
                            // Ignore disposal errors
                        }
                    }
                }
                polygon.setEnabled(false);
                try {
                    polygon.dispose();
                } catch (error) {
                    // Ignore disposal errors
                }
                
                // Create new material with correct color for the new type
                const scene = this.sceneManager.getScene();
                const newMaterial = new BABYLON.StandardMaterial(`${currentName}Material`, scene);
                const standardizedColor = this.getColorByType(type);
                newMaterial.diffuseColor = standardizedColor;
                        newMaterial.backFaceCulling = false; // 2-sided
                    newMaterial.twoSidedLighting = true; // Enable lighting on both sides
                newMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
                
                // Create new 2D polygon mesh with new material
                const newPolygon = this.createPolygonMesh(currentName, currentPoints, currentPosition, newMaterial, currentUserData);
                
                if (!newPolygon) {
                    console.error(`[POLYGON_CONVERSION] Failed to create 2D polygon mesh for "${currentName}"`);
                    return;
                }
                
                // Ensure material is set (createPolygonMesh might override it)
                newPolygon.material = newMaterial;
                
                // IMPORTANT: Ensure renderingGroupId is set correctly based on type
                const correctRenderingGroupId = SceneManager.getRenderingGroupId(type);
                if (newPolygon.renderingGroupId !== correctRenderingGroupId) {
                    console.log(`[POLYGON_CONVERSION] Updating renderingGroupId for converted polygon "${currentName}": ${newPolygon.renderingGroupId} -> ${correctRenderingGroupId} (type: ${type})`);
                    newPolygon.renderingGroupId = correctRenderingGroupId;
                }
                
                // Ensure polygon is visible and enabled
                newPolygon.setEnabled(true);
                newPolygon.isVisible = true;
                
                // Ensure mesh is in the scene (scene already defined above)
                if (!scene.meshes.includes(newPolygon)) {
                    scene.addMesh(newPolygon);
                }
                
                // IMPORTANT: createPolygonMesh calculates center from points and sets position
                // However, if points are relative (centered at origin), the calculated center will be (0,0,0)
                // So we need to check if the calculated center is at origin, and if so, use the original position
                // Calculate center from points (as createPolygonMesh does)
                const calculatedCenter = BABYLON.Vector3.Zero();
                currentPoints.forEach(point => {
                    const p = point instanceof BABYLON.Vector3 ? point : new BABYLON.Vector3(point.x, point.y || 0, point.z);
                    calculatedCenter.addInPlace(p);
                });
                calculatedCenter.scaleInPlace(1 / currentPoints.length);
                
                // Check if calculated center is at origin (indicating points are relative, not world coordinates)
                const isAtOrigin = Math.abs(calculatedCenter.x) < 0.001 && Math.abs(calculatedCenter.z) < 0.001;
                
                if (isAtOrigin) {
                    // Points are relative, use original polygon position
                    // But we need to add the original position to the calculated center
                    // Since points are relative to center, and center should be at original position
                    calculatedCenter.x = currentPosition.x;
                    calculatedCenter.z = currentPosition.z;
                    console.log(`[POLYGON_CONVERSION] Points are relative for "${currentName}", using original position (${currentPosition.x.toFixed(2)}, ${currentPosition.z.toFixed(2)})`);
                } else {
                    // Points are world coordinates, use calculated center
                    console.log(`[POLYGON_CONVERSION] Points are world coordinates for "${currentName}", using calculated center (${calculatedCenter.x.toFixed(2)}, ${calculatedCenter.z.toFixed(2)})`);
                }
                
                calculatedCenter.y = 0.001; // 2D polygon offset
                
                // Use the calculated center (which matches what createPolygonMesh does)
                newPolygon.position = calculatedCenter;
                
                // Ensure mesh has proper rendering settings
                newPolygon.receiveShadows = true;
                newPolygon.castShadows = true;
                newPolygon.renderingGroupId = SceneManager.getRenderingGroupId(type);
                
                // Add to selection manager
                if (this.selectionManager) {
                    this.selectionManager.addSelectableObject(newPolygon);
                }
                
                // If polygon was selected, select the new one
                if (wasSelected && this.selectionManager) {
                    this.selectionManager.selectObject(newPolygon, false);
                }
                
                // Update currentShape reference
                if (this.currentShape === polygon) {
                    this.currentShape = newPolygon;
                }
                
                // Update object list
                if (this.objectListManager && this.objectListManager.updateObjectList) {
                    this.objectListManager.updateObjectList();
                }
                
                console.log(`[POLYGON_CONVERSION] Successfully converted polygon "${currentName}" to 2D at position (${newPolygon.position.x.toFixed(2)}, ${newPolygon.position.y.toFixed(2)}, ${newPolygon.position.z.toFixed(2)})`);
                return; // Done - polygon converted to 2D
            } else {
                // Already 2D or no points available, just update properties
                if (!polygon.userData) polygon.userData = {};
                polygon.userData.type = type;
                polygon.userData.is3D = false;
                polygon.userData.currentHeight = 0;
                polygon.userData.originalHeight = 0;
                
                // Update material color for the new type
                this.updatePolygonMaterialColorByType(polygon, type);
                
                // Ensure position Y is at ground level
                polygon.position.y = 0.001; // Minimal offset to prevent z-fighting (2D polygon)
                
                return; // Done for non-building types
            }
        }

        // Update height using scaling method (only if has extrusion)
        // Use hasExtrusionNow to ensure we have the latest state (after potentially creating extrusion)
        if (hasExtrusionNow) {
            // IMPORTANT: Calculate originalHeight from current scaling to preserve position correctly
            // This is the same approach used in height change listener
            let originalHeight = polygon.userData?.originalHeight;
            if (!originalHeight || originalHeight <= 0) {
                // If originalHeight is not set, calculate it from current extrusion scaling
                if (polygon.extrusion) {
                    const currentScaling = polygon.extrusion.scaling.y;
                    const currentHeight = polygon.userData?.currentHeight || targetHeight;
                    originalHeight = currentHeight / currentScaling;
                    if (originalHeight <= 0) originalHeight = 1; // Fallback to 1
                    // Store it for future use
                    if (!polygon.userData) polygon.userData = {};
                    polygon.userData.originalHeight = originalHeight;
                } else {
                    originalHeight = 1; // Default fallback
                }
            }
            
            const scaleFactor = targetHeight / originalHeight;
            
            // IMPORTANT: Preserve sideWallNormalsFlipped flag before scaling
            const sideWallNormalsFlipped = polygon.userData?.sideWallNormalsFlipped || false;
            
            // IMPORTANT: For extrusion, we need to preserve the current base world Y position
            // Since extrusion is NOT a child of polygon, we need to:
            // 1. Get current base world Y BEFORE scaling
            // 2. Scale extrusion
            // 3. Adjust extrusion position to keep base at the same world Y
            
            if (polygon.extrusion) {
                // IMPORTANT: Keep polygon at its current Y position
                // Do NOT move polygon - preserve its current position
                const polygonY = polygon.position.y;
                
                // IMPORTANT: Get current base world Y BEFORE scaling
                // This is the world Y position of the extrusion's base that we want to preserve
                // Since extrusion is NOT a child of polygon, position is in world space
                // IMPORTANT: Use polygon.position.y as the base, not extrusion bounding box
                // This ensures that if polygon was moved, we preserve its current position
                // The extrusion base should always be at polygon.position.y (not at Y=0)
                const baseWorldYBefore = polygonY; // Use polygon Y as the base (not extrusion bounding box)
                
                // Scale extrusion (NOT the polygon, since extrusion is the 3D part)
                polygon.extrusion.scaling.y = scaleFactor;
                
                // IMPORTANT: After scaling, extrusion base will move because scaling happens around the mesh center
                // We need to adjust extrusion position to keep the base at the same world Y
                // Since extrusion is in world space, we adjust position.y directly
                polygon.extrusion.computeWorldMatrix(true);
                const extrusionBoundingInfoAfter = polygon.extrusion.getBoundingInfo();
                const baseWorldYAfter = extrusionBoundingInfoAfter && extrusionBoundingInfoAfter.boundingBox ? 
                    extrusionBoundingInfoAfter.boundingBox.minimumWorld.y : baseWorldYBefore;
                
                // Calculate the delta - how much the base moved
                const deltaY = baseWorldYAfter - baseWorldYBefore;
                
                // Adjust extrusion position to compensate for the base movement
                // Move extrusion down by deltaY to bring base back to original position
                if (Math.abs(deltaY) > 0.001) {
                    polygon.extrusion.position.y = polygon.extrusion.position.y - deltaY;
                    polygon.extrusion.computeWorldMatrix(true);
                }
                
                // IMPORTANT: Do NOT scale the polygon itself - only the extrusion
                // The polygon is just a container/TransformNode for the extrusion
                polygon.scaling.y = 1; // Keep polygon scaling at 1
            } else {
                // If no extrusion, scale polygon directly (shouldn't happen for building type)
                const baseY = this.getPolygonBaseWorldY(polygon);
                polygon.scaling.y = scaleFactor;
                this.realignPolygonBase(polygon, baseY);
            }
            
            // Update userData
            polygon.userData.currentHeight = targetHeight;
            // Update originalHeight if it was not set correctly
            if (!polygon.userData.originalHeight || polygon.userData.originalHeight <= 0) {
                polygon.userData.originalHeight = originalHeight;
            }
            // IMPORTANT: Preserve sideWallNormalsFlipped flag after scaling
            if (!polygon.userData) {
                polygon.userData = {};
            }
            polygon.userData.sideWallNormalsFlipped = sideWallNormalsFlipped;
            
            // NOTE: When using scaling, normals are automatically scaled correctly by Babylon.js
            // We should NOT recalculate normals when height changes via scaling, as this causes shadow issues
            // Only update normals if the mesh geometry itself is recreated (not when scaling changes)
            // The sideWallNormalsFlipped flag ensures we don't accidentally flip normals again
        } else if (!isBuilding) {
            // For 2D polygons (non-building), ensure height is 0
            if (!polygon.userData) polygon.userData = {};
            polygon.userData.originalHeight = 0;
            polygon.userData.currentHeight = 0;
            polygon.userData.is3D = false;
            polygon.userData.sideWallNormalsFlipped = false;
            polygon.scaling.y = 1;
            polygon.position.y = 0;
        }

        // Material settings are now normal since bottom faces are removed

        // Update shadows for the polygon
        if (this.lightingManager) {
            this.lightingManager.addShadowCaster(polygon);
            this.lightingManager.addShadowReceiver(polygon);
        }
        
        // Update wireframe if exists
        if (this.selectionManager) {
            this.selectionManager.updateWireframeTransforms(polygon);
        }
    }


    /**
     * Create test circle with radius 5 and height 8
     */
    createTestCircle() {
        console.log('Creating test circle with radius 5 and height 8...');
        
        if (!this.circleManager) {
            console.error('CircleManager not available');
            return;
        }

        // Create circle at center of scene
        const circle = this.circleManager.createCircle(
            5, // radius
            new BABYLON.Vector3(0, 0, 0), // position at center
            new BABYLON.Color3(0.4, 0.3, 0.2), // brown
            8, // height
            'ground' // type
        );

        // Add to selection manager
        if (this.selectionManager) {
            this.selectionManager.addSelectableObject(circle);
        }

        // Add to scene - only add to buildings list if type is 'building'
        if (this.sceneManager) {
            const circleType = circle.userData?.type || 'ground';
            if (circleType.toLowerCase() === 'building') {
                // addBuilding expects an object with mesh property
                this.sceneManager.addBuilding({ mesh: circle });
            }
            // For non-building types, the circle is already in the scene
        }

        console.log('Test circle created:', circle.name);
        console.log('Circle position:', circle.position);
        console.log('Circle userData:', circle.userData);
    }

    /**
     * Initialize the object list manager
     */
    initializeObjectListManager() {
        try {
            this.objectListManager = new ObjectListManager(this.sceneManager, this.selectionManager, this.treeManager);
            // console.log('ObjectListManager initialized successfully');
        } catch (error) {
            console.error('Error initializing ObjectListManager:', error);
        }
    }


    /**
     * Get the object list manager
     */
    getObjectListManager() {
        return this.objectListManager;
    }

    /**
     * Dispatch scene change event to update object list
     */
    dispatchSceneChangeEvent() {
        const event = new CustomEvent('sceneChanged', {
            detail: { timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Setup listener for object list visibility changes
     */
    setupObjectListVisibilityListener() {
        document.addEventListener('objectListVisibilityChanged', (event) => {
            const isHidden = event.detail.isHidden;
            this.adjustPropertiesPopupPosition(isHidden);
        });
    }

    /**
     * Adjust properties popup position based on object list visibility
     */
    adjustPropertiesPopupPosition(objectListHidden) {
        // Get all properties popups
        const propertiesPopups = [
            document.getElementById('propertiesPopup'),
            document.getElementById('circlePropertiesPopup'),
            document.getElementById('polygonPropertiesPopup'),
            document.getElementById('treePropertiesPopup')
        ];

        propertiesPopups.forEach(popup => {
            if (!popup) return;

            // Check if popup is currently visible
            const isVisible = popup.classList.contains('show');
            
            if (isVisible) {
                this.adjustPropertiesPopupPositionForElement(popup);
            }
        });
    }

    /**
     * Adjust position for a specific properties popup element
     */
    adjustPropertiesPopupPositionForElement(popup) {
        if (!popup) return;

        // Check if object list is hidden
        const objectListPanel = document.querySelector('.object-list-panel');
        const objectListHidden = objectListPanel && objectListPanel.classList.contains('hidden');

        // If object list is hidden, move properties to right edge (right: 0)
        // Otherwise, keep it at right: 250px (left of object list)
        if (objectListHidden) {
            popup.style.right = '0px';
        } else {
            popup.style.right = '250px';
        }
    }

    /**
     * Setup hierarchy button event listener
     */
    setupHierarchyButton() {
        const hierarchyButton = document.getElementById('hierarchyButton');
        if (hierarchyButton) {
            hierarchyButton.addEventListener('click', () => {
                this.toggleObjectList();
            });
        }
    }

    /**
     * Toggle object list visibility
     */
    toggleObjectList() {
        if (this.objectListManager) {
            this.objectListManager.toggleVisibility();
        }
    }

    /**
     * Show object list
     */
    showObjectList() {
        if (this.objectListManager) {
            this.objectListManager.show();
        }
    }

    /**
     * Hide object list
     */
    hideObjectList() {
        if (this.objectListManager) {
            this.objectListManager.hide();
        }
    }

    /**
     * Update object list
     */
    updateObjectList() {
        if (this.objectListManager) {
            this.objectListManager.updateObjectList();
        }
    }

    /**
     * Setup transform input fields (X, Y, Z position inputs at bottom of screen)
     */
    setupTransformInputFields() {
        // Delegated to TransformInputManager
        if (this.transformInputManager) {
            // TransformInputManager handles this
            return;
        }
        // Fallback if TransformInputManager not available (should not happen)
        console.warn('TransformInputManager not available, transform input fields not set up');
    }

    /**
     * Update transform input fields visibility based on active transform tool
     */
    updateTransformInputFieldsVisibility() {
        // Delegated to TransformInputManager
        if (this.transformInputManager) {
            return this.transformInputManager.updateVisibility();
        }
        // Fallback if TransformInputManager not available
        const transformInputPanel = document.getElementById('transformInputPanel');
        if (!transformInputPanel) return;

        const isTransformEditingToolActive = this.isTransformEditingToolActive();
        
        if (isTransformEditingToolActive) {
            transformInputPanel.style.display = 'flex';
        } else {
            transformInputPanel.style.display = 'none';
        }
    }

    /**
     * Update transform input fields values from selected object transform
     */
    updateTransformInputFieldsValues() {
        // Delegated to TransformInputManager
        if (this.transformInputManager) {
            return this.transformInputManager.updateValues();
        }
        // Fallback if TransformInputManager not available
        console.warn('TransformInputManager not available, cannot update transform input fields values');
    }

    /**
     * Handle transform input field change - update object transform
     */
    handleTransformInputChange(axis, value) {
        // Delegated to TransformInputManager
        if (this.transformInputManager) {
            return this.transformInputManager.handleTransformInputChange(axis, value);
        }
        // Fallback if TransformInputManager not available
        console.warn('TransformInputManager not available, cannot handle transform input change');
    }

    /**
     * Get the currently active transform tool
     */
    getActiveTransformTool() {
        // Delegated to ToolManager
        if (this.toolManager) {
            return this.toolManager.getActiveTransformTool();
        }
        // Fallback if ToolManager not available
        const activeTool = document.querySelector('#transformPanel .tool-item.active:not([data-tool="coordinate-toggle"])');
        if (activeTool) {
            return activeTool.getAttribute('data-tool');
        }
        return 'select';
    }
}

