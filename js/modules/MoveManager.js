/**
 * MoveManager - Manages object movement in the 3D scene using Babylon.js GizmoManager
 */
class MoveManager {
    constructor(scene, camera, canvas, selectionManager) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.selectionManager = selectionManager;
        
        this.isActive = false;
        this.selectedObjects = [];
        
        // Use Babylon.js GizmoManager instead of custom gizmo
        this.gizmoManager = new BABYLON.GizmoManager(scene);
        this.gizmoManager.usePointerToAttachGizmos = false;
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        
        // Move constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
        this.snapToGrid = false;
        this.gridSize = 1;
        
        this.setupEventListeners();
        
        // Coordinate mode (false = local, true = global)
        this.isGlobalMode = false;
        
        // Observer setup flags
        this.observersSetup = false;
    }


    /**
     * Setup event listeners for move operations
     */
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener("keydown", (event) => {
            this.handleKeyDown(event);
        });
        
        // Setup persistence for transform changes
        this.setupPersistence();
        
        // Listen for selection changes to update gizmo
        window.addEventListener('selectionChanged', (event) => {
            this.onSelectionChanged(event.detail);
        });
    }

    /**
     * Setup persistence for transform changes
     */
    setupPersistence() {
        // Setup observers when gizmos are available
        this.setupGizmoObservers();
    }

    /**
     * Setup gizmo observers
     */
    setupGizmoObservers() {
        // Wait for gizmos to be available
        setTimeout(() => {
            if (this.gizmoManager.gizmos.positionGizmo && !this.observersSetup) {
                // Position persistence - real-time updates
                this.gizmoManager.gizmos.positionGizmo.onDragStartObservable.add(() => {
                    this.onDragStart();
                });

                this.gizmoManager.gizmos.positionGizmo.onDragObservable.add(() => {
                    this.onDrag();
                });

                this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(() => {
                    this.onDragEnd();
                });

                this.observersSetup = true;
            }

        }, 100);
    }

    /**
     * Handle drag start
     */
    onDragStart() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1 && this.multiObjectCenter) {
            // Store original positions for multi-object movement
            this.originalPositions = new Map();
            selectedObjects.forEach(obj => {
                // Store positions for all objects (including extrusions)
                this.originalPositions.set(obj, obj.position.clone());
                
                // If this is an extrusion, also store parent shape position
                if (obj.name.includes('_extrusion')) {
                    const parentShape = obj.parent;
                    if (parentShape && !this.originalPositions.has(parentShape)) {
                        this.originalPositions.set(parentShape, parentShape.position.clone());
                    }
                }
            });
            this.originalCenter = this.multiObjectCenter.position.clone();
        } else if (selectedObjects.length === 1) {
        }
    }

    /**
     * Handle drag (real-time updates)
     */
    onDrag() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1 && this.multiObjectCenter && this.originalPositions) {
            // Calculate center movement delta
            const centerDelta = this.multiObjectCenter.position.subtract(this.originalCenter);
            
            // Apply movement to all selected objects
            selectedObjects.forEach(obj => {
                const originalPos = this.originalPositions.get(obj);
                if (originalPos) {
                    const newPos = originalPos.add(centerDelta);
                    obj.position = newPos;
                    
                    // If this is an extrusion, also move the parent shape
                    if (obj.name.includes('_extrusion')) {
                        const parentShape = obj.parent;
                        if (parentShape) {
                            // Get parent original position, or use current position if not stored
                            let parentOriginalPos = this.originalPositions.get(parentShape);
                            if (!parentOriginalPos) {
                                // If parent position not stored, use current position as original
                                parentOriginalPos = parentShape.position.clone();
                                this.originalPositions.set(parentShape, parentOriginalPos);
                            }
                            parentShape.position = parentOriginalPos.add(centerDelta);
                        }
                    }
                }
            });
        } else {
        }
        
        // Update wireframe transforms to match the moved objects
        this.selectionManager.updateAllWireframeTransforms();
    }

    /**
     * Handle drag end
     */
    onDragEnd() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1) {
            // Update original positions for next drag
            selectedObjects.forEach(obj => {
                // Update positions for all objects (including extrusions)
                this.originalPositions.set(obj, obj.position.clone());
                
                // If this is an extrusion, also update parent shape position
                if (obj.name.includes('_extrusion')) {
                    const parentShape = obj.parent;
                    if (parentShape) {
                        this.originalPositions.set(parentShape, parentShape.position.clone());
                    }
                }
            });
            this.originalCenter = this.multiObjectCenter.position.clone();
        }
    }





    /**
     * Handle selection changes
     */
    onSelectionChanged(selectionDetail) {
        if (!this.isActive) return;
        
        const { selectedObjects, count } = selectionDetail;
        
        if (count > 0) {
            // Setup gizmo based on current coordinate mode
            if (this.isGlobalMode) {
                this.setupGlobalGizmo();
            } else {
                this.setupLocalGizmo();
            }
            
            // For multiple objects, create a temporary parent to move them together
            if (count > 1) {
                this.setupMultiObjectGizmo(selectedObjects);
            } else {
                // Single object - attach gizmo directly
                this.gizmoManager.attachToMesh(selectedObjects[0]);
                // Clear multi-object data
                this.originalPositions = null;
                this.originalCenter = null;
            }
        } else {
            // Detach gizmo if no objects selected
            this.gizmoManager.attachToMesh(null);
        }
    }

    /**
     * Setup gizmo for multiple objects
     */
    setupMultiObjectGizmo(selectedObjects) {
        // Create a temporary transform node at the center of selected objects
        const center = BABYLON.Vector3.Zero();
        let objectCount = 0;
        
        selectedObjects.forEach(obj => {
            // For extrusions, use their actual position for center calculation
            if (obj.name.includes('_extrusion')) {
                center.addInPlace(obj.position);
                objectCount++;
            } else {
                // For regular shapes, calculate center based on shape type
                let shapeCenter = obj.position.clone();
                
                // For rectangles, calculate center position for gizmo
                if (obj.userData && obj.userData.shapeType === 'rectangle') {
                    const dimensions = obj.userData.dimensions;
                    if (dimensions) {
                        // Calculate center position for gizmo (same as extrusion center)
                        shapeCenter.x += dimensions.width / 2;
                        shapeCenter.z += dimensions.height / 2;
                    }
                }
                
                center.addInPlace(shapeCenter);
                objectCount++;
            }
        });
        
        if (objectCount > 0) {
            center.scaleInPlace(1 / objectCount);
        }
        
        // Create a temporary mesh at the center for gizmo attachment
        if (!this.multiObjectCenter) {
            this.multiObjectCenter = BABYLON.MeshBuilder.CreateSphere("multiObjectCenter", {
                diameter: 0.1
            }, this.scene);
            this.multiObjectCenter.material = new BABYLON.StandardMaterial("multiObjectCenterMaterial", this.scene);
            this.multiObjectCenter.material.alpha = 0; // Invisible
            this.multiObjectCenter.isPickable = false;
            this.multiObjectCenter.renderingGroupId = 1; // Ensure it renders on top
        }
        
        this.multiObjectCenter.position = center;
        
        // Set gizmo based on coordinate mode for multiple objects
        if (this.isGlobalMode) {
            this.setupGlobalGizmo();
        } else {
            this.setupLocalGizmo();
        }
        
        // Attach to center mesh
        this.gizmoManager.attachToMesh(this.multiObjectCenter);
        
        // Store original positions for multi-object movement
        this.originalPositions = new Map();
        selectedObjects.forEach(obj => {
            this.originalPositions.set(obj, obj.position.clone());
        });
        this.originalCenter = center.clone();
    }

    /**
     * Setup gizmo for global space movement
     */
    setupGlobalGizmo() {
        if (this.gizmoManager.gizmos.positionGizmo) {
            // Disable planar gizmo (XY, XZ, YZ planes)
            this.gizmoManager.gizmos.positionGizmo.planarGizmoEnabled = false;
            
            // Enable individual axis gizmos (X, Y, Z)
            this.gizmoManager.gizmos.positionGizmo.xGizmoEnabled = true;
            this.gizmoManager.gizmos.positionGizmo.yGizmoEnabled = true;
            this.gizmoManager.gizmos.positionGizmo.zGizmoEnabled = true;
            
            // Set gizmo to world space (global coordinates)
            this.gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = false;
        }
    }

    /**
     * Setup gizmo for local space movement
     */
    setupLocalGizmo() {
        if (this.gizmoManager.gizmos.positionGizmo) {
            // Enable planar gizmo (XY, XZ, YZ planes)
            this.gizmoManager.gizmos.positionGizmo.planarGizmoEnabled = true;
            
            // Enable individual axis gizmos (X, Y, Z)
            this.gizmoManager.gizmos.positionGizmo.xGizmoEnabled = true;
            this.gizmoManager.gizmos.positionGizmo.yGizmoEnabled = true;
            this.gizmoManager.gizmos.positionGizmo.zGizmoEnabled = true;
            
            // Set gizmo to local space (object coordinates)
            this.gizmoManager.gizmos.positionGizmo.updateGizmoRotationToMatchAttachedMesh = true;
        }
    }

    /**
     * Set coordinate mode (local/global)
     */
    setCoordinateMode(isGlobal) {
        this.isGlobalMode = isGlobal;
        
        if (this.isActive) {
            // Reconfigure gizmo based on new mode
            if (this.isGlobalMode) {
                this.setupGlobalGizmo();
            } else {
                this.setupLocalGizmo();
            }
            
            // If we have multiple objects selected, re-setup the multi-object gizmo
            const selectedObjects = this.selectionManager.getSelectedObjects();
            if (selectedObjects.length > 1) {
                this.setupMultiObjectGizmo(selectedObjects);
            }
        }
    }

    /**
     * Handle keyboard events
     */
    handleKeyDown(event) {
        if (!this.isActive) return;
        
        switch (event.key.toLowerCase()) {
            case 'x':
                this.toggleConstraint('x');
                break;
            case 'y':
                this.toggleConstraint('y');
                break;
            case 'z':
                this.toggleConstraint('z');
                break;
            case 'g':
                this.toggleSnapToGrid();
                break;
        }
    }

    /**
     * Toggle axis constraint
     */
    toggleConstraint(axis) {
        // Reset all constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
        
        // Set selected constraint
        let dragAxis = null;
        switch (axis) {
            case 'x':
                this.constrainToX = true;
                dragAxis = new BABYLON.Vector3(1, 0, 0);
                break;
            case 'y':
                this.constrainToY = true;
                dragAxis = new BABYLON.Vector3(0, 1, 0);
                break;
            case 'z':
                this.constrainToZ = true;
                dragAxis = new BABYLON.Vector3(0, 0, 1);
                break;
            default:
                break;
        }
        
        if (this.gizmoManager.gizmos.positionGizmo) {
            this.gizmoManager.gizmos.positionGizmo.setDragBehavior(new BABYLON.PointerDragBehavior({ dragAxis: dragAxis }));
        }
    }

    /**
     * Toggle snap to grid
     */
    toggleSnapToGrid() {
        this.snapToGrid = !this.snapToGrid;
    }

    /**
     * Activate move mode
     */
    activate() {
        this.isActive = true;
        
        // Enable position gizmo
        this.gizmoManager.positionGizmoEnabled = true;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        
        // Setup gizmo based on current coordinate mode
        if (this.isGlobalMode) {
            this.setupGlobalGizmo();
        } else {
            this.setupLocalGizmo();
        }
        
        // Setup observers after gizmo is enabled
        this.setupGizmoObservers();
        
        // Attach to current selection if any
        this.selectedObjects = this.selectionManager.getSelectedObjects();
        if (this.selectedObjects.length > 0) {
            if (this.selectedObjects.length > 1) {
                this.setupMultiObjectGizmo(this.selectedObjects);
            } else {
                this.gizmoManager.attachToMesh(this.selectedObjects[0]);
            }
        }
        
        this.canvas.style.cursor = 'grab';
    }

    /**
     * Deactivate move mode
     */
    deactivate() {
        this.isActive = false;
        
        // Disable all gizmos
        this.gizmoManager.attachToMesh(null);
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;
        
        // Clean up multi-object center
        if (this.multiObjectCenter) {
            this.multiObjectCenter.dispose();
            this.multiObjectCenter = null;
        }
        
        // Clear multi-object data
        this.originalPositions = null;
        this.originalCenter = null;
        
        this.canvas.style.cursor = 'default';
        
        // Reset constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
    }

    /**
     * Get move statistics
     */
    getStats() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        return {
            isActive: this.isActive,
            selectedObjects: selectedObjects.length,
            isGlobalMode: selectedObjects.length > 1,
            constraints: {
                x: this.constrainToX,
                y: this.constrainToY,
                z: this.constrainToZ
            },
            snapToGrid: this.snapToGrid,
            gridSize: this.gridSize
        };
    }


    /**
     * Dispose of move manager
     */
    dispose() {
        this.deactivate();
        
        // Clean up multi-object center
        if (this.multiObjectCenter) {
            this.multiObjectCenter.dispose();
            this.multiObjectCenter = null;
        }
        
        // Clear multi-object data
        this.originalPositions = null;
        this.originalCenter = null;
    }
}