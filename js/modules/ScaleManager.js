/**
 * ScaleManager - Manages object scaling in the 3D scene
 */
class ScaleManager {
    constructor(scene, camera, canvas, selectionManager) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        this.selectionManager = selectionManager;

        this.isActive = false;
        this.selectedObjects = [];

        // Use Babylon.js GizmoManager for scaling
        this.gizmoManager = new BABYLON.GizmoManager(scene);
        this.gizmoManager.usePointerToAttachGizmos = false;
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = false;

        // Scale constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
        this.uniformScale = false;
        this.snapToScale = false;
        this.snapScale = 0.1;

        this.setupEventListeners();
        
        // Coordinate mode (false = local, true = global)
        this.isGlobalMode = false;
        
        // Observer setup flags
        this.observersSetup = false;
        this.positionObserversSetup = false;
        this.rotationObserversSetup = false;
    }

    /**
     * Setup event listeners for scale operations
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
            if (this.gizmoManager.gizmos.scaleGizmo && !this.observersSetup) {
                // Scale persistence - real-time updates
                this.gizmoManager.gizmos.scaleGizmo.onDragStartObservable.add(() => {
                    this.onDragStart();
                });

                this.gizmoManager.gizmos.scaleGizmo.onDragObservable.add(() => {
                    this.onDrag();
                });

                this.gizmoManager.gizmos.scaleGizmo.onDragEndObservable.add(() => {
                    this.onDragEnd();
                });

                this.observersSetup = true;
            }

            if (this.gizmoManager.gizmos.positionGizmo && !this.positionObserversSetup) {
                this.gizmoManager.gizmos.positionGizmo.onDragEndObservable.add(() => {
                    this.persistPosition();
                });
                this.positionObserversSetup = true;
            }

            if (this.gizmoManager.gizmos.rotationGizmo && !this.rotationObserversSetup) {
                this.gizmoManager.gizmos.rotationGizmo.onDragEndObservable.add(() => {
                    this.persistRotation();
                });
                this.rotationObserversSetup = true;
            }
        }, 100);
    }

    /**
     * Handle drag start
     */
    onDragStart() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        
        if (selectedObjects.length > 1 && this.multiObjectCenter) {
            // Store original scales for multi-object scaling
            this.originalScales = new Map();
            selectedObjects.forEach(obj => {
                // Store scales for all objects (including extrusions)
                this.originalScales.set(obj, obj.scaling.clone());
                
                // If this is an extrusion, also store parent shape scale
                if (obj.name.includes('_extrusion')) {
                    const parentShape = obj.parent;
                    if (parentShape && !this.originalScales.has(parentShape)) {
                        this.originalScales.set(parentShape, parentShape.scaling.clone());
                    }
                }
            });
            this.originalCenter = this.multiObjectCenter.position.clone();
            this.originalCenterScale = this.multiObjectCenter.scaling.clone();
        }
    }

    /**
     * Handle drag (real-time updates)
     */
    onDrag() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1 && this.multiObjectCenter && this.originalScales) {
            // Calculate scale delta from the center gizmo
            const scaleDelta = this.multiObjectCenter.scaling.subtract(this.originalCenterScale);
            
            
            // Apply scaling to all selected objects
            selectedObjects.forEach(obj => {
                const originalScale = this.originalScales.get(obj);
                if (originalScale) {
                    if (this.isGlobalMode) {
                        // Global mode: scale uniformly in world space
                        if (this.uniformScale) {
                            const avgScale = (scaleDelta.x + scaleDelta.y + scaleDelta.z) / 3;
                            obj.scaling = originalScale.add(new BABYLON.Vector3(avgScale, avgScale, avgScale));
                        } else {
                            obj.scaling = originalScale.add(scaleDelta);
                        }
                    } else {
                        // Local mode: scale in object's local space
                        if (this.uniformScale) {
                            const avgScale = (scaleDelta.x + scaleDelta.y + scaleDelta.z) / 3;
                            obj.scaling = originalScale.add(new BABYLON.Vector3(avgScale, avgScale, avgScale));
                        } else {
                            obj.scaling = originalScale.add(scaleDelta);
                        }
                    }
                    
                    // If this is an extrusion, also scale the parent shape
                    if (obj.name.includes('_extrusion')) {
                        const parentShape = obj.parent;
                        if (parentShape) {
                            // Get parent original scale, or use current scale if not stored
                            let parentOriginalScale = this.originalScales.get(parentShape);
                            if (!parentOriginalScale) {
                                // If parent scale not stored, use current scale as original
                                parentOriginalScale = parentShape.scaling.clone();
                                this.originalScales.set(parentShape, parentOriginalScale);
                            }
                            if (this.isGlobalMode) {
                                if (this.uniformScale) {
                                    const avgScale = (scaleDelta.x + scaleDelta.y + scaleDelta.z) / 3;
                                    parentShape.scaling = parentOriginalScale.add(new BABYLON.Vector3(avgScale, avgScale, avgScale));
                                } else {
                                    parentShape.scaling = parentOriginalScale.add(scaleDelta);
                                }
                            } else {
                                if (this.uniformScale) {
                                    const avgScale = (scaleDelta.x + scaleDelta.y + scaleDelta.z) / 3;
                                    parentShape.scaling = parentOriginalScale.add(new BABYLON.Vector3(avgScale, avgScale, avgScale));
                                } else {
                                    parentShape.scaling = parentOriginalScale.add(scaleDelta);
                                }
                            }
                        }
                    }
                }
            });
        }
        
        // Update wireframe transforms to match the scaled objects
        this.selectionManager.updateAllWireframeTransforms();
    }

    /**
     * Handle drag end
     */
    onDragEnd() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1) {
            // Update original scales for next drag
            selectedObjects.forEach(obj => {
                // Only update scales for base shapes, not extrusions
                if (!obj.name.includes('_extrusion')) {
                    this.originalScales.set(obj, obj.scaling.clone());
                }
            });
            this.originalCenter = this.multiObjectCenter.position.clone();
            this.originalCenterScale = this.multiObjectCenter.scaling.clone();
        } else {
            // Single object scale
            selectedObjects.forEach(obj => {
                // Scale saved
            });
        }
    }

    /**
     * Persist scale changes (legacy method)
     */
    persistScale() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length > 1 && this.multiObjectCenter) {
            // Multi-object scale
            selectedObjects.forEach(obj => {
                // Only log scales for base shapes, not extrusions
                if (!obj.name.includes('_extrusion')) {
                    // Scale saved
                }
            });
        } else {
            // Single object scale
            selectedObjects.forEach(obj => {
                // Only log scales for base shapes, not extrusions
                if (!obj.name.includes('_extrusion')) {
                    // Scale saved
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
     * Persist rotation changes (placeholder)
     */
    persistRotation() {
        const selectedObjects = this.selectionManager.getSelectedObjects();
        selectedObjects.forEach(obj => {
            // Rotation saved
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
            
            // For multiple objects, create a temporary parent to scale them together
            if (count > 1) {
                this.setupMultiObjectGizmo(selectedObjects);
            } else {
                // Single object - check if it needs special positioning (like rectangles with extrusions)
                const selectedObject = selectedObjects[0];
                
                // For rectangles with extrusions, position gizmo at the center of the rectangle
                if (selectedObject.userData && selectedObject.userData.shapeType === 'rectangle' && selectedObject.extrusion) {
                    this.setupSingleObjectGizmo(selectedObject);
                } else {
                    // Regular single object - attach gizmo directly
                    this.gizmoManager.attachToMesh(selectedObject);
                    // Clear multi-object data
                    this.originalScales = null;
                    this.originalCenter = null;
                    this.originalCenterScale = null;
                }
            }
        } else {
            // Detach gizmo if no objects selected
            this.gizmoManager.attachToMesh(null);
        }
    }

    /**
     * Setup gizmo for single object with special positioning (like rectangles with extrusions)
     */
    setupSingleObjectGizmo(selectedObject) {
        // Calculate center position for the gizmo
        let center = selectedObject.position.clone();
        
        // For rectangles, use the same position as the rectangle (same as extrusion position)
        if (selectedObject.userData && selectedObject.userData.shapeType === 'rectangle') {
            // No offset needed - use rectangle position directly
        }
        
        // Create a temporary mesh at the center for gizmo attachment
        if (!this.singleObjectCenter) {
            this.singleObjectCenter = BABYLON.MeshBuilder.CreateSphere("singleObjectCenter", {
                diameter: 0.1
            }, this.scene);
            this.singleObjectCenter.material = new BABYLON.StandardMaterial("singleObjectCenterMaterial", this.scene);
            this.singleObjectCenter.material.alpha = 0; // Invisible
            this.singleObjectCenter.isPickable = false;
            this.singleObjectCenter.renderingGroupId = 1; // Ensure it renders on top
        }
        
        this.singleObjectCenter.position = center;
        
        // Attach gizmo to the center mesh
        this.gizmoManager.attachToMesh(this.singleObjectCenter);
        
        // Store original scale for single object scaling
        this.originalScale = selectedObject.scaling.clone();
        this.originalCenter = center.clone();
        this.originalCenterScale = this.singleObjectCenter.scaling.clone();
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
                
                // For rectangles, use the same position as the rectangle (same as extrusion position)
                if (obj.userData && obj.userData.shapeType === 'rectangle') {
                    // No offset needed - use rectangle position directly
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
        
        // Store original scales for multi-object scaling
        this.originalScales = new Map();
        selectedObjects.forEach(obj => {
            this.originalScales.set(obj, obj.scaling.clone());
        });
        this.originalCenter = center.clone();
        this.originalCenterScale = this.multiObjectCenter.scaling.clone();
        
        
        // Show mode feedback
        if (this.isGlobalMode) {
            this.showGlobalModeFeedback();
        }
    }

    /**
     * Setup gizmo for global space scaling
     */
    setupGlobalGizmo() {
        if (this.gizmoManager.gizmos.scaleGizmo) {
            // Set gizmo to world space (global coordinates)
            this.gizmoManager.gizmos.scaleGizmo.updateGizmoRotationToMatchAttachedMesh = false;
            
            // Force gizmo to refresh by temporarily detaching and re-attaching
            const attachedMesh = this.gizmoManager.attachedMesh;
            if (attachedMesh) {
                this.gizmoManager.attachToMesh(null);
                // Use setTimeout to ensure the detach is processed
                setTimeout(() => {
                    this.gizmoManager.attachToMesh(attachedMesh);
                }, 0);
            }
        }
    }

    /**
     * Setup gizmo for local space scaling
     */
    setupLocalGizmo() {
        if (this.gizmoManager.gizmos.scaleGizmo) {
            // Set gizmo to local space (object coordinates)
            this.gizmoManager.gizmos.scaleGizmo.updateGizmoRotationToMatchAttachedMesh = true;
            
            // Force gizmo to refresh by temporarily detaching and re-attaching
            const attachedMesh = this.gizmoManager.attachedMesh;
            if (attachedMesh) {
                this.gizmoManager.attachToMesh(null);
                // Use setTimeout to ensure the detach is processed
                setTimeout(() => {
                    this.gizmoManager.attachToMesh(attachedMesh);
                }, 0);
            }
        }
    }

    /**
     * Set coordinate mode (local/global)
     */
    setCoordinateMode(isGlobal) {
        this.isGlobalMode = isGlobal;
        
        if (this.isActive) {
            // Get current selection
            const selectedObjects = this.selectionManager.getSelectedObjects();
            
            if (selectedObjects.length === 0) {
                // No objects selected, just update gizmo configuration
                if (this.isGlobalMode) {
                    this.setupGlobalGizmo();
                } else {
                    this.setupLocalGizmo();
                }
            } else if (selectedObjects.length === 1) {
                // Single object - reconfigure gizmo and re-setup
                if (this.isGlobalMode) {
                    this.setupGlobalGizmo();
                } else {
                    this.setupLocalGizmo();
                }
                // Re-setup single object gizmo to apply new coordinate mode
                const selectedObject = selectedObjects[0];
                // Check if it needs special positioning (like rectangles with extrusions)
                if (selectedObject.userData && selectedObject.userData.shapeType === 'rectangle' && selectedObject.extrusion) {
                    this.setupSingleObjectGizmo(selectedObject);
                } else {
                    // Regular single object - attach gizmo directly
                    this.gizmoManager.attachToMesh(selectedObject);
                }
            } else {
                // Multiple objects - reconfigure gizmo and re-setup
                if (this.isGlobalMode) {
                    this.setupGlobalGizmo();
                } else {
                    this.setupLocalGizmo();
                }
                // Re-setup multi-object gizmo to apply new coordinate mode
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
     * Toggle uniform scaling
     */
    toggleUniformScale() {
        this.uniformScale = !this.uniformScale;
        this.showUniformScaleFeedback();
    }

    /**
     * Toggle snap to scale
     */
    toggleSnapToScale() {
        this.snapToScale = !this.snapToScale;
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
            case 'u':
                this.toggleUniformScale();
                break;
            case 's':
                this.toggleSnapToScale();
                break;
            case 'escape':
                this.cancelScale();
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
     * Show uniform scale feedback
     */
    showUniformScaleFeedback() {
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
     * Activate scale mode
     */
    activate() {
        this.isActive = true;
        
        // Force scale mode to local (scale only works in local mode)
        this.isGlobalMode = false;
        
        // Enable scale gizmo
        this.gizmoManager.positionGizmoEnabled = false;
        this.gizmoManager.rotationGizmoEnabled = false;
        this.gizmoManager.scaleGizmoEnabled = true;
        
        // Setup observers after gizmo is enabled
        this.setupGizmoObservers();
        
        // Always use local mode for scale
        this.setupLocalGizmo();
        
        // Attach to current selection if any
        this.selectedObjects = this.selectionManager.getSelectedObjects();
        if (this.selectedObjects.length > 0) {
            if (this.selectedObjects.length > 1) {
                this.setupMultiObjectGizmo(this.selectedObjects);
            } else {
                // Attach mesh first, then setup gizmo configuration
                const selectedObject = this.selectedObjects[0];
                
                // Check if it needs special positioning (like rectangles with extrusions)
                if (selectedObject.userData && selectedObject.userData.shapeType === 'rectangle' && selectedObject.extrusion) {
                    this.setupSingleObjectGizmo(selectedObject);
                } else {
                    // Regular single object - attach gizmo directly
                    this.gizmoManager.attachToMesh(selectedObject);
                }
            }
        }
        
        this.canvas.style.cursor = 'grab';
    }

    /**
     * Deactivate scale mode
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
        this.originalScales = null;
        this.originalCenter = null;
        this.originalCenterScale = null;
        
        this.canvas.style.cursor = 'default';
        
        // Reset constraints
        this.constrainToX = false;
        this.constrainToY = false;
        this.constrainToZ = false;
    }

    // Note: cancelScale method was removed as it only contained placeholder console.log

    /**
     * Get scale statistics
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
            uniformScale: this.uniformScale,
            snapToScale: this.snapToScale,
            snapScale: this.snapScale
        };
    }

    /**
     * Dispose of scale manager
     */
    dispose() {
        this.deactivate();
        
        // Clean up multi-object center
        if (this.multiObjectCenter) {
            this.multiObjectCenter.dispose();
            this.multiObjectCenter = null;
        }
        
        // Clear multi-object data
        this.originalScales = null;
        this.originalCenter = null;
        this.originalCenterScale = null;
    }
}
