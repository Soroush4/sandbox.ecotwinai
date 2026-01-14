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
        } else if (selectedObjects.length === 1 && this.singleObjectCenter) {
            // Store original position for single object with special positioning
            const selectedObject = selectedObjects[0];
            this.originalPosition = selectedObject.position.clone();
            this.originalCenter = this.singleObjectCenter.position.clone();
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
        } else if (selectedObjects.length === 1 && this.singleObjectCenter && this.originalPosition && this.originalCenter) {
            // Handle single object with special positioning
            const selectedObject = selectedObjects[0];
            const centerDelta = this.singleObjectCenter.position.subtract(this.originalCenter);
            const newPos = this.originalPosition.add(centerDelta);
            selectedObject.position = newPos;
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
        } else if (selectedObjects.length === 1 && this.singleObjectCenter) {
            // Update original position for single object with special positioning
            const selectedObject = selectedObjects[0];
            this.originalPosition = selectedObject.position.clone();
            this.originalCenter = this.singleObjectCenter.position.clone();
        }
        
        // Update shadow frustum after objects are moved
        // This ensures shadows work correctly in all parts of the scene
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            setTimeout(() => {
                window.digitalTwinApp.lightingManager.autoAdjustShadowFrustum();
            }, 100);
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
                // Single object - check if it needs special positioning (like rectangles with extrusions)
                const selectedObject = selectedObjects[0];
                
                // For rectangles with extrusions, position gizmo at the center of the rectangle
                if (selectedObject.userData && selectedObject.userData.shapeType === 'rectangle' && selectedObject.extrusion) {
                    this.setupSingleObjectGizmo(selectedObject);
                } else {
                    // Regular single object - attach gizmo directly
                    this.gizmoManager.attachToMesh(selectedObject);
                    // Clear multi-object data
                    this.originalPositions = null;
                    this.originalCenter = null;
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
        
        // For imported STL meshes, calculate gizmo position from bounding box
        // Gizmo should be at center X/Z but at minimum Y (base of the object)
        if (selectedObject.userData && selectedObject.userData.isImportedSTL && selectedObject.userData.baseY !== undefined) {
            // This is an imported STL mesh - use mesh position for X/Z and baseY for Y
            center = new BABYLON.Vector3(
                selectedObject.position.x, // Center X
                selectedObject.userData.baseY, // Minimum Y (base of object) - already in world space
                selectedObject.position.z  // Center Z
            );
        }
        // For rectangles, use the same position as the rectangle (same as extrusion position)
        else if (selectedObject.userData && selectedObject.userData.shapeType === 'rectangle') {
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
        
        // Store original position for single object movement
        this.originalPosition = selectedObject.position.clone();
        this.originalCenter = center.clone();
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
            
            // Make plane gizmos more transparent
            this.setPlaneGizmoTransparency(0.3); // 30% opacity (70% transparent)
        }
    }
    
    /**
     * Set transparency for plane gizmos (XY, XZ, YZ planes)
     * @param {number} alpha - Alpha value (0 = fully transparent, 1 = fully opaque)
     */
    setPlaneGizmoTransparency(alpha = 0.3) {
        if (this.gizmoManager.gizmos.positionGizmo) {
            const positionGizmo = this.gizmoManager.gizmos.positionGizmo;
            
            // Use setTimeout to ensure gizmos are fully initialized
            setTimeout(() => {
                // Helper function to set material transparency
                const setMaterialTransparency = (material) => {
                    if (material && material instanceof BABYLON.Material) {
                        material.alpha = alpha;
                        // Enable transparency by setting transparency mode
                        material.transparencyMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                        // Alternative: use alphaMode if available (Babylon.js 5.0+)
                        if (material.alphaMode !== undefined) {
                            material.alphaMode = BABYLON.Material.MATERIAL_ALPHABLEND;
                        }
                        // Ensure back face culling is disabled for transparency to work properly
                        material.backFaceCulling = false; // 2-sided
                        material.twoSidedLighting = true; // Enable lighting on both sides
                        // Force material to be recompiled
                        material.markAsDirty(BABYLON.Material.AllDirtyFlag);
                    }
                };
                
                // Method 1: Try accessing plane gizmos directly
                const planeGizmoProperties = ['xPlaneGizmo', 'yPlaneGizmo', 'zPlaneGizmo', 
                                               'xPlane', 'yPlane', 'zPlane',
                                               'planarGizmo', 'planeGizmo'];
                
                planeGizmoProperties.forEach(prop => {
                    if (positionGizmo[prop]) {
                        const gizmo = positionGizmo[prop];
                        if (gizmo.material) {
                            setMaterialTransparency(gizmo.material);
                        }
                        // Check for child meshes
                        if (gizmo.getChildMeshes) {
                            gizmo.getChildMeshes().forEach(child => {
                                if (child.material) {
                                    setMaterialTransparency(child.material);
                                }
                            });
                        }
                    }
                });
                
                // Method 2: Access through _rootMesh or _gizmoMesh
                if (positionGizmo._rootMesh) {
                    const rootChildren = positionGizmo._rootMesh.getChildMeshes();
                    rootChildren.forEach(child => {
                        // Check if this is a plane gizmo by checking its name or properties
                        if (child.material && child.name && 
                            (child.name.toLowerCase().includes('plane') || 
                             child.name.includes('Plane') ||
                             child.name.includes('planar'))) {
                            setMaterialTransparency(child.material);
                        }
                    });
                }
                
                // Method 3: Find all meshes in the scene that are part of plane gizmos
                // Plane gizmos usually have names containing "plane" or specific patterns
                if (this.scene) {
                    this.scene.meshes.forEach(mesh => {
                        if (mesh.material && mesh.name) {
                            const nameLower = mesh.name.toLowerCase();
                            // Check for plane gizmo patterns
                            if (nameLower.includes('plane') || 
                                nameLower.includes('planar') ||
                                nameLower.includes('gizmo') && nameLower.includes('plane')) {
                                setMaterialTransparency(mesh.material);
                            }
                        }
                    });
                }
                
                // Method 4: Try to access through _attachedMesh and find plane gizmos in its children
                if (this.gizmoManager.attachedMesh) {
                    const attachedMesh = this.gizmoManager.attachedMesh;
                    // Plane gizmos might be children of the attached mesh's gizmo
                    if (attachedMesh.getChildMeshes) {
                        attachedMesh.getChildMeshes().forEach(child => {
                            if (child.material && child.name && 
                                child.name.toLowerCase().includes('plane')) {
                                setMaterialTransparency(child.material);
                            }
                        });
                    }
                }
                
                // Method 5: Try accessing through _rootMesh or _gizmoMesh directly
                if (positionGizmo._rootMesh) {
                    const allChildren = [];
                    const collectChildren = (mesh) => {
                        allChildren.push(mesh);
                        if (mesh.getChildMeshes) {
                            mesh.getChildMeshes().forEach(child => collectChildren(child));
                        }
                    };
                    collectChildren(positionGizmo._rootMesh);
                    
                    allChildren.forEach(mesh => {
                        if (mesh.material) {
                            // Check if this looks like a plane gizmo (usually has specific colors or patterns)
                            const material = mesh.material;
                            if (material.diffuseColor) {
                                const color = material.diffuseColor;
                                // Plane gizmos often have mixed colors (red+green, red+blue, green+blue)
                                // Or check by mesh geometry (usually planes)
                                if (mesh.geometry && mesh.geometry.positions) {
                                    // This is likely a plane gizmo
                                    setMaterialTransparency(material);
                                }
                            }
                        }
                    });
                }
                
                // Method 6: Try to find plane gizmos by iterating through all scene meshes and checking their properties
                if (this.scene) {
                    let foundPlaneMeshes = 0;
                    this.scene.meshes.forEach(mesh => {
                        if (mesh.material && mesh.geometry) {
                            // Check if this mesh is a plane (usually has 4 vertices forming a quad)
                            const positions = mesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                            if (positions && positions.length === 12) { // 4 vertices * 3 components = 12
                                // This might be a plane gizmo
                                const material = mesh.material;
                                // Check if material has gizmo-like colors (red, green, blue combinations)
                                if (material.diffuseColor) {
                                    const color = material.diffuseColor;
                                    // Plane gizmos often have specific color combinations
                                    const isRedGreen = (color.r > 0.5 && color.g > 0.5 && color.b < 0.3);
                                    const isRedBlue = (color.r > 0.5 && color.g < 0.3 && color.b > 0.5);
                                    const isGreenBlue = (color.r < 0.3 && color.g > 0.5 && color.b > 0.5);
                                    
                                    if (isRedGreen || isRedBlue || isGreenBlue) {
                                        setMaterialTransparency(material);
                                        foundPlaneMeshes++;
                                        console.log('[MoveManager] Found plane gizmo mesh:', mesh.name, 'color:', color);
                                    }
                                }
                            }
                        }
                    });
                    console.log('[MoveManager] Found', foundPlaneMeshes, 'plane gizmo meshes');
                }
                
                // Method 7: Try to access plane gizmos through the position gizmo's internal structure
                // In some versions of Babylon.js, plane gizmos are stored in _gizmoMesh or similar
                if (positionGizmo._gizmoMesh) {
                    const gizmoMesh = positionGizmo._gizmoMesh;
                    const allGizmoMeshes = [];
                    const collectAllMeshes = (node) => {
                        if (node instanceof BABYLON.Mesh) {
                            allGizmoMeshes.push(node);
                        }
                        if (node.getChildMeshes) {
                            node.getChildMeshes().forEach(child => collectAllMeshes(child));
                        }
                        if (node.getChildren) {
                            node.getChildren().forEach(child => {
                                if (child instanceof BABYLON.Mesh) {
                                    allGizmoMeshes.push(child);
                                }
                            });
                        }
                    };
                    collectAllMeshes(gizmoMesh);
                    
                    allGizmoMeshes.forEach(mesh => {
                        if (mesh.material) {
                            // Check if this is a plane (quad) by checking vertex count
                            const positions = mesh.geometry ? mesh.geometry.getVerticesData(BABYLON.VertexBuffer.PositionKind) : null;
                            if (positions && (positions.length === 12 || positions.length === 18)) { // Quad or triangle-based plane
                                setMaterialTransparency(mesh.material);
                                console.log('[MoveManager] Applied transparency to gizmo mesh:', mesh.name || 'unnamed');
                            }
                        }
                    });
                }
                
                // Debug - log all meshes to find plane gizmos
                console.log('[MoveManager] Attempting to set plane gizmo transparency, alpha:', alpha);
                console.log('[MoveManager] Position gizmo properties:', Object.keys(positionGizmo));
                if (positionGizmo._rootMesh) {
                    console.log('[MoveManager] _rootMesh children:', positionGizmo._rootMesh.getChildMeshes().length);
                }
                if (positionGizmo._gizmoMesh) {
                    console.log('[MoveManager] _gizmoMesh found');
                }
                
            }, 100); // Increased delay to ensure gizmos are fully initialized
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
            
            // Apply transparency to plane gizmos when switching to local mode
            if (!this.isGlobalMode) {
                setTimeout(() => {
                    this.setPlaneGizmoTransparency(0.3);
                }, 100);
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
        
        // Apply transparency to plane gizmos after attachment
        if (!this.isGlobalMode) {
            setTimeout(() => {
                this.setPlaneGizmoTransparency(0.3);
            }, 100);
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
        
        // Clean up single-object center
        if (this.singleObjectCenter) {
            this.singleObjectCenter.dispose();
            this.singleObjectCenter = null;
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
        
        // Clean up single-object center
        if (this.singleObjectCenter) {
            this.singleObjectCenter.dispose();
            this.singleObjectCenter = null;
        }
        
        // Clear multi-object data
        this.originalPositions = null;
        this.originalCenter = null;
    }
}