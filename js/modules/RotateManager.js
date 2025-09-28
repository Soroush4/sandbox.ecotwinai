/**
 * RotateManager - Manages object rotation in the 3D scene
 */
class RotateManager {
    constructor(scene, camera, canvas, selectionManager) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.selectionManager = selectionManager;

        this.isActive = false;
        this.selectedObjects = [];

        // Use Babylon.js GizmoManager for rotation
        this.gizmoManager = new BABYLON.GizmoManager(scene);
        this.gizmoManager.usePointerToAttachGizmos = false;
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;

        // Rotation constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
        this.snapToAngle = false;
        this.snapAngle = 15; // degrees

        this.setupEventListeners();
        
        // Coordinate mode (false = local, true = global)
        this.isGlobalMode = false;
        
        // Observer setup flags
        this.observersSetup = false;
        this.scaleObserversSetup = false;
        this.positionObserversSetup = false;
    }

    /**
     * Setup event listeners for rotation operations
     */
    setupEventListeners() {
        // Keyboard shortcuts
        document.addEventListener("keydown", (event) => {
            this.handleKeyDown(event);
        });
        
        // Listen for selection changes to update gizmo
        window.addEventListener('selectionChanged', (event) => {
            this.onSelectionChanged(event.detail);
        });
        
        // Setup persistence for transform changes
        this.setupPersistence();
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
            if (this.gizmoManager.gizmos.rotationGizmo && !this.observersSetup) {
                // Rotation persistence - real-time updates
                this.gizmoManager.gizmos.rotationGizmo.onDragStartObservable.add(() => {
                    this.onDragStart();
                });

                this.gizmoManager.gizmos.rotationGizmo.onDragObservable.add(() => {
                    this.onDrag();
                });

                this.gizmoManager.gizmos.rotationGizmo.onDragEndObservable.add(() => {
                    this.onDragEnd();
                });

                this.observersSetup = true;
            }

            if (this.gizmoManager.gizmos.scaleGizmo && !this.scaleObserversSetup) {
                this.gizmoManager.gizmos.scaleGizmo.onDragEndObservable.add(() => {
                    this.persistScale();
                });
                this.scaleObserversSetup = true;
            }

            if (this.gizmoManager.gizmos.positionGizmo && !this.positionObserversSetup) {
                this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(() => {
                    this.persistPosition();
                });
                this.positionObserversSetup = true;
            }
        }, 100);
    }

    /**
     * Handle drag start
     */
    onDragStart() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        
        if (selectedObjects.length > 1 && this.multiObjectCenter) {
            // Store original rotations for multi-object rotation
            this.originalRotations = new Map();
            selectedObjects.forEach(obj => {
                // Store rotations for all objects (including extrusions)
                this.originalRotations.set(obj, obj.rotation.clone());
                
                // If this is an extrusion, also store parent shape rotation
                if (obj.name.includes('_extrusion')) {
                    const parentShape = obj.parent;
                    if (parentShape && !this.originalRotations.has(parentShape)) {
                        this.originalRotations.set(parentShape, parentShape.rotation.clone());
                    }
                }
            });
            this.originalCenter = this.multiObjectCenter.position.clone();
            this.originalCenterRotation = this.multiObjectCenter.rotation.clone();
        }
    }

    /**
     * Handle drag (real-time updates)
     */
    onDrag() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1 && this.multiObjectCenter && this.originalRotations) {
            // Calculate rotation delta from the center gizmo
            const rotationDelta = this.multiObjectCenter.rotation.subtract(this.originalCenterRotation);
            
            
            // Apply rotation to all selected objects
            selectedObjects.forEach(obj => {
                const originalRot = this.originalRotations.get(obj);
                if (originalRot) {
                    if (this.isGlobalMode) {
                        // Global mode: rotate around world center
                        obj.rotation = originalRot.add(rotationDelta);
                    } else {
                        // Local mode: rotate around object's own center
                        obj.rotation = originalRot.add(rotationDelta);
                    }
                    
                    // If this is an extrusion, also rotate the parent shape
                    if (obj.name.includes('_extrusion')) {
                        const parentShape = obj.parent;
                        if (parentShape) {
                            // Get parent original rotation, or use current rotation if not stored
                            let parentOriginalRot = this.originalRotations.get(parentShape);
                            if (!parentOriginalRot) {
                                // If parent rotation not stored, use current rotation as original
                                parentOriginalRot = parentShape.rotation.clone();
                                this.originalRotations.set(parentShape, parentOriginalRot);
                            }
                            if (this.isGlobalMode) {
                                parentShape.rotation = parentOriginalRot.add(rotationDelta);
                            } else {
                                parentShape.rotation = parentOriginalRot.add(rotationDelta);
                            }
                        }
                    }
                }
            });
        }
        
        // Update wireframe transforms to match the rotated objects
        this.selectionManager.updateAllWireframeTransforms();
    }

    /**
     * Handle drag end
     */
    onDragEnd() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1) {
            // Update original rotations for next drag
            selectedObjects.forEach(obj => {
                // Only update rotations for base shapes, not extrusions
                if (!obj.name.includes('_extrusion')) {
                    this.originalRotations.set(obj, obj.rotation.clone());
                }
            });
            this.originalCenter = this.multiObjectCenter.position.clone();
            this.originalCenterRotation = this.multiObjectCenter.rotation.clone();
        } else {
            // Single object rotation
            selectedObjects.forEach(obj => {
                // Rotation saved
            });
        }
    }

    /**
     * Persist rotation changes (legacy method)
     */
    persistRotation() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1 && this.multiObjectCenter) {
            // Multi-object rotation
            selectedObjects.forEach(obj => {
                // Only log rotations for base shapes, not extrusions
                if (!obj.name.includes('_extrusion')) {
                    // Rotation saved
                }
            });
        } else {
            // Single object rotation
            selectedObjects.forEach(obj => {
                // Only log rotations for base shapes, not extrusions
                if (!obj.name.includes('_extrusion')) {
                    // Rotation saved
                }
            });
        }
    }

    /**
     * Persist position changes (placeholder)
     */
    persistPosition() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        selectedObjects.forEach(obj => {
            // Position saved
        });
    }

    /**
     * Persist scale changes (placeholder)
     */
    persistScale() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        selectedObjects.forEach(obj => {
            // Scale saved
        });
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
            
            // For multiple objects, create a temporary parent to rotate them together
            if (count > 1) {
                this.setupMultiObjectGizmo(selectedObjects);
            } else {
                // Single object - attach gizmo directly
                this.gizmoManager.attachToMesh(selectedObjects[0]);
                // Clear multi-object data
                this.originalRotations = null;
                this.originalCenter = null;
                this.originalCenterRotation = null;
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
        
        // Store original rotations for multi-object rotation
        this.originalRotations = new Map();
        selectedObjects.forEach(obj => {
            this.originalRotations.set(obj, obj.rotation.clone());
        });
        this.originalCenter = center.clone();
        this.originalCenterRotation = this.multiObjectCenter.rotation.clone();
        
        
        // Show mode feedback
        if (this.isGlobalMode) {
            this.showGlobalModeFeedback();
        }
    }

    /**
     * Setup gizmo for global space rotation
     */
    setupGlobalGizmo() {
        if (this.gizmoManager.gizmos.rotationGizmo) {
            // Set gizmo to world space (global coordinates)
            this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = false;
            
        }
    }

    /**
     * Setup gizmo for local space rotation
     */
    setupLocalGizmo() {
        if (this.gizmoManager.gizmos.rotationGizmo) {
            // Set gizmo to local space (object coordinates)
            this.gizmoManager.gizmos.rotationGizmo.updateGizmoRotationToMatchAttachedMesh = true;
            
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
     * Toggle axis constraint
     */
    toggleConstraint(axis) {
        // Reset all constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
        
        // Set selected constraint
        switch (axis) {
            case 'x':
                this.constrainToX = true;
                break;
            case 'y':
                this.constrainToY = true;
                break;
            case 'z':
                this.constrainToZ = true;
                break;
            default:
                break;
        }
        
        this.showConstraintFeedback(axis);
    }

    /**
     * Toggle snap to angle
     */
    toggleSnapToAngle() {
        this.snapToAngle = !this.snapToAngle;
        this.showSnapFeedback();
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
            case 'a':
                this.toggleSnapToAngle();
                break;
            case 'escape':
                this.cancelRotation();
                break;
        }
    }

    /**
     * Show constraint feedback
     */
    showConstraintFeedback(axis) {
        // Popup removed
    }

    /**
     * Show snap feedback
     */
    showSnapFeedback() {
        // Popup removed
    }

    /**
     * Show global mode feedback
     */
    showGlobalModeFeedback() {
        // Popup removed
    }

    /**
     * Activate rotate mode
     */
    activate() {
        this.isActive = true;
        
        // Enable rotation gizmo
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = true;
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
        } else {
        }
        
        this.canvas.style.cursor = 'grab';
    }

    /**
     * Deactivate rotate mode
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
        this.originalRotations = null;
        this.originalCenter = null;
        this.originalCenterRotation = null;
        
        this.canvas.style.cursor = 'default';
        
        // Reset constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
    }

    // Note: cancelRotation method was removed as it only contained placeholder console.log

    /**
     * Get rotation statistics
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
            snapToAngle: this.snapToAngle,
            snapAngle: this.snapAngle
        };
    }

    /**
     * Dispose of rotate manager
     */
    dispose() {
        this.deactivate();
        
        // Clean up multi-object center
        if (this.multiObjectCenter) {
            this.multiObjectCenter.dispose();
            this.multiObjectCenter = null;
        }
        
        // Clear multi-object data
        this.originalRotations = null;
        this.originalCenter = null;
        this.originalCenterRotation = null;
    }
}
