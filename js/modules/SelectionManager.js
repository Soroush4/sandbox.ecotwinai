/**
 * SelectionManager - Manages object selection in the 3D scene
 */
class SelectionManager {
    constructor(scene, camera, canvas) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        
        this.selectedObjects = [];
        this.selectableObjects = [];
        this.highlightMaterial = null;
        this.outlineMaterial = null;
        this.originalMaterials = new Map();
        
        // Pointer interaction state
        this.pointerDown = false;
        this.pointerDownPosition = null;
        this.pointerDownTime = 0;
        
        // Double-click detection
        this.lastClickTime = 0;
        this.lastClickPosition = null;
        this.doubleClickThreshold = 300; // milliseconds
        this.doubleClickDistance = 5; // pixels
        
        // ObjectListManager reference (set later)
        this.objectListManager = null;
        
        this.setupHighlightMaterial();
        this.setupEventListeners();
        
        // Make test functions available globally for debugging
        window.testWireframeRotation = () => this.testWireframeRotation();
        window.testTransformToolsWireframe = () => this.testTransformToolsWireframe();
        window.fixTreeScaling = () => this.fixTreeScaling();
        window.debugTreeStructure = () => this.debugTreeStructure();
        window.findTreeMeshes = () => this.findTreeMeshes();
        window.selectCorrectTree = () => this.selectCorrectTree();
        window.autoSelectTransformNode = () => this.autoSelectTransformNode();
        window.testRotation = (degrees) => this.testRotation(degrees);
        window.recreateWireframe = () => this.recreateWireframe();
    }
    
    /**
     * Set the ObjectListManager reference
     * @param {ObjectListManager} objectListManager - The ObjectListManager instance
     */
    setObjectListManager(objectListManager) {
        this.objectListManager = objectListManager;
    }

    /**
     * Setup highlight material for selected objects
     */
    setupHighlightMaterial() {
        // Create edge-only wireframe shader material
        this.edgeWireframeMaterial = this.createEdgeWireframeShader();
        
        // Keep the old materials for backward compatibility (though not used)
        this.highlightMaterial = new BABYLON.StandardMaterial("highlightMaterial", this.scene);
        this.highlightMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1.0);
        this.highlightMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        this.highlightMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        this.highlightMaterial.alpha = 0.8;
        this.highlightMaterial.wireframe = false;

        this.outlineMaterial = new BABYLON.StandardMaterial("outlineMaterial", this.scene);
        this.outlineMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 1.0);
        this.outlineMaterial.emissiveColor = new BABYLON.Color3(0, 0.4, 0.5);
        this.outlineMaterial.wireframe = false;
    }

    /**
     * Create edge-only wireframe material that shows only mesh edges, not diagonals
     */
    createEdgeWireframeShader() {
        // Create a material specifically for edge rendering
        const edgeMaterial = new BABYLON.StandardMaterial("edgeWireframeMaterial", this.scene);
        edgeMaterial.diffuseColor = new BABYLON.Color3(0.0, 0.8, 1.0); // Bright blue edges
        edgeMaterial.wireframe = true;
        edgeMaterial.backFaceCulling = false; // 2-sided for wireframe visibility
        edgeMaterial.twoSidedLighting = true;
        edgeMaterial.cullBackFaces = true;
        
        // Use wireframe fill mode to show only edges
        edgeMaterial.fillMode = BABYLON.Material.WireFrameFillMode;
        
        // Set alpha to make it more visible
        edgeMaterial.alpha = 1.0;
        
        return edgeMaterial;
    }


    /**
     * Add an object to the list of selectable objects
     */
    addSelectableObject(object) {
        if (object && !this.selectableObjects.includes(object)) {
            // IMPORTANT: Allow extrusions to be selectable ONLY if their parent polygon is hidden
            // When a polygon is converted to building type, the 2D polygon is hidden and the 3D extrusion should be selectable
            if (object.name && object.name.includes('_extrusion')) {
                // Check if this extrusion has a parent polygon
                const basePolygon = object.basePolygon || (object.parent && object.parent.name && !object.parent.name.includes('_extrusion') ? object.parent : null);
                
                if (basePolygon) {
                    // Only allow extrusion to be selectable if parent polygon is hidden/disabled
                    if (basePolygon.isVisible && basePolygon.isEnabled()) {
                        console.log('Skipping extrusion from selectable objects (parent polygon is visible):', object.name);
                        return;
                    } else {
                        // Parent polygon is hidden, so extrusion should be selectable
                        console.log('Adding extrusion to selectable objects (parent polygon is hidden):', object.name);
                    }
                } else {
                    // No parent found, allow it to be selectable (might be standalone extrusion)
                    console.log('Adding extrusion to selectable objects (no parent found):', object.name);
                }
            }
            
            this.selectableObjects.push(object);
        }
    }

    /**
     * Remove an object from the list of selectable objects
     */
    removeSelectableObject(object) {
        if (object && this.selectableObjects) {
            const index = this.selectableObjects.indexOf(object);
            if (index > -1) {
                this.selectableObjects.splice(index, 1);
                console.log('Removed selectable object:', object.name);
            }
        }
        
        // Also remove from selected objects if it's currently selected
        this.deselectObject(object);
    }

    /**
     * Check if drawing mode is active
     */
    isDrawingModeActive() {
        // Check if any drawing tool is active
        const activeDrawingTool = document.querySelector('#drawingPanel .tool-item.active');
        return activeDrawingTool !== null;
    }

    /**
     * Setup event listeners for mouse interactions
     */
    setupEventListeners() {
        // Use pointer events instead of click to avoid conflicts with camera
        this.canvas.addEventListener("pointerdown", (event) => {
            this.handlePointerDown(event);
        });
        
        this.canvas.addEventListener("pointerup", (event) => {
            this.handlePointerUp(event);
        });
        
        // Prevent context menu on right click
        this.canvas.addEventListener("contextmenu", (event) => {
            event.preventDefault();
        });
    }

    /**
     * Handle pointer down event
     */
    handlePointerDown(event) {
        // Check if we're in drawing mode - if so, don't handle selection
        if (this.isDrawingModeActive()) {
            return;
        }

        // Only handle left mouse button for selection
        if (event.button === 0) {
            this.pointerDown = true;
            this.pointerDownPosition = {
                x: event.clientX,
                y: event.clientY
            };
            this.pointerDownTime = Date.now();
        }
    }

    /**
     * Handle pointer up event
     */
    handlePointerUp(event) {
        // Check if we're in drawing mode - if so, don't handle selection
        if (this.isDrawingModeActive()) {
            return;
        }

        // Only handle left mouse button for selection
        if (event.button === 0 && this.pointerDown) {
            const pointerUpTime = Date.now();
            const timeDiff = pointerUpTime - this.pointerDownTime;
            
            // Check if it was a quick tap (not a drag)
            if (timeDiff < 200) { // Less than 200ms
                const distance = Math.sqrt(
                    Math.pow(event.clientX - this.pointerDownPosition.x, 2) +
                    Math.pow(event.clientY - this.pointerDownPosition.y, 2)
                );
                
                // If mouse didn't move much, treat as click
                if (distance < 5) {
                    this.handleSelection(event);
                }
            }
            
            this.pointerDown = false;
        }
    }

    /**
     * Handle object selection logic
     */
    handleSelection(event) {
        
        // Get mouse position
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Check for double-click
        const currentTime = Date.now();
        const isDoubleClick = this.isDoubleClick(currentTime, { x: event.clientX, y: event.clientY });

        // Perform raycast
        const pickResult = this.scene.pick(x, y, (mesh) => {
            // IMPORTANT: Only process meshes, not TransformNodes or other node types
            // TransformNodes don't have geometry and can't be picked directly
            if (!(mesh instanceof BABYLON.Mesh)) {
                return false;
            }
            
            // IMPORTANT: Skip meshes that are explicitly non-pickable
            if (mesh.isPickable === false) {
                return false;
            }
            
            // IMPORTANT: Skip invisible meshes - they should not be selectable
            if (!mesh.isVisible || !mesh.isEnabled()) {
                return false;
            }
            
            // Check if mesh is in selectableObjects array
            if (this.selectableObjects.includes(mesh)) {
                // IMPORTANT: For extrusions, also verify that parent/basePolygon is hidden
                if (mesh.name && mesh.name.includes('_extrusion')) {
                    const basePolygon = mesh.basePolygon || (mesh.parent && mesh.parent.name && !mesh.parent.name.includes('_extrusion') ? mesh.parent : null);
                    if (basePolygon && basePolygon.isVisible && basePolygon.isEnabled()) {
                        // Parent is visible, skip this extrusion
                        return false;
                    }
                }
                return true;
            }
            
            // Fallback: Select building meshes, 2D shapes, and trees, not ground or other utility meshes
            // IMPORTANT: Allow extrusions to be selected if their parent polygon is hidden
            // Exclude wireframe clones from selection
            return mesh.name && 
                   !mesh.name.includes('_wireframe') && // Exclude wireframe clones
                   !mesh.name.includes('_edge_wireframe') && // Exclude edge wireframe clones
                   // IMPORTANT: Allow polygon extrusions to be selected (they're independent meshes when polygon is hidden)
                   // Only exclude extrusions that are children of visible polygons
                   // Check both parent and basePolygon to determine if extrusion should be selectable
                   (!mesh.name.includes('_extrusion') || 
                    (mesh.name.includes('_extrusion') && 
                     (() => {
                         // Check parent (if exists)
                         const parent = mesh.parent;
                         const parentVisible = parent && parent.isVisible && parent.isEnabled();
                         
                         // Check basePolygon (if exists)
                         const basePolygon = mesh.basePolygon;
                         const basePolygonVisible = basePolygon && basePolygon.isVisible && basePolygon.isEnabled();
                         
                         // Allow selection if neither parent nor basePolygon is visible
                         return !parentVisible && !basePolygonVisible;
                     })())) &&
                   (
                       // Include extrusions that are buildings (when parent is hidden)
                       (mesh.name.includes('_extrusion') && 
                        (() => {
                            const basePolygon = mesh.basePolygon || (mesh.parent && mesh.parent instanceof BABYLON.Mesh ? mesh.parent : null);
                            return !basePolygon || (!basePolygon.isVisible || !basePolygon.isEnabled());
                        })()) ||
                       (mesh.name.startsWith('building') && /^\d+$/.test(mesh.name.substring(8))) ||
                       (mesh.name.startsWith('ground') && /^\d+$/.test(mesh.name.substring(6))) ||
                       (mesh.name.startsWith('waterway') && /^\d+$/.test(mesh.name.substring(8))) ||
                       (mesh.name.startsWith('highway') && /^\d+$/.test(mesh.name.substring(7))) ||
                       (mesh.name.startsWith('grass') && /^\d+$/.test(mesh.name.substring(5))) ||
                       mesh.name.includes('rectangle') ||
                       mesh.name.includes('circle') ||
                       mesh.name.includes('triangle') ||
                       mesh.name.includes('text') ||
                       mesh.name.includes('polygon') ||
                       mesh.name.startsWith('polyline') ||
                       mesh.name.startsWith('line') ||
                       mesh.name.includes('_tree_') || // Include tree meshes (child meshes of TransformNode)
                       mesh.name.startsWith('simple_tree_') || // Include simple tree meshes (old format)
                       (mesh.name.startsWith('simple_tree') && /^\d+$/.test(mesh.name.substring(11))) || // Include simple tree meshes (new format)
                       // Include imported STL objects
                       (mesh.userData && mesh.userData.isImportedSTL) ||
                       // Include circles by checking userData
                       (mesh.userData && mesh.userData.shapeType === 'circle') ||
                       // Include buildings (both rectangular and circular)
                       (mesh.userData && mesh.userData.shapeType === 'building') ||
                       // Include rectangles by checking userData
                       (mesh.userData && mesh.userData.shapeType === 'rectangle')
                   );
        });

        if (pickResult.hit) {
            
            // IMPORTANT: For extrusions, check if parent polygon is hidden
            // If parent is hidden, select the extrusion itself (it's the visible object)
            // If parent is visible, select the parent (extrusion shouldn't be visible in this case)
            let selectedObject = pickResult.pickedMesh;
            if (selectedObject.name && selectedObject.name.includes('_extrusion')) {
                // Check if this extrusion has a base polygon
                const basePolygon = selectedObject.basePolygon || 
                    (selectedObject.parent && selectedObject.parent instanceof BABYLON.Mesh ? selectedObject.parent : null);
                
                if (basePolygon) {
                    // If parent polygon is hidden/disabled, select the extrusion itself
                    // If parent polygon is visible, select the parent (though this shouldn't happen)
                    if (!basePolygon.isVisible || !basePolygon.isEnabled()) {
                        // Parent is hidden, so extrusion is the visible object - select extrusion itself
                        selectedObject = pickResult.pickedMesh;
                    } else {
                        // Parent is visible, select parent instead (extrusion shouldn't be visible)
                        selectedObject = basePolygon;
                    }
                } else {
                    // No parent found, select extrusion itself
                    selectedObject = pickResult.pickedMesh;
                }
            }
            
            // Handle double-click: zoom to extent and scroll to object in list
            if (isDoubleClick) {
                // First select the object (this will auto-select TransformNode parent for trees)
                this.selectObject(selectedObject, false, false);
                
                // Get the actually selected object (might be TransformNode parent for trees)
                const actuallySelectedObjects = this.getSelectedObjects();
                const objectToScroll = actuallySelectedObjects.length > 0 ? actuallySelectedObjects[0] : selectedObject;
                
                // Zoom to mesh extent
                this.zoomToMeshExtent(objectToScroll);
                
                // Scroll to object in list
                if (this.objectListManager && this.objectListManager.scrollToObjectInList) {
                    this.objectListManager.scrollToObjectInList(objectToScroll);
                }
                
                return; // Don't process as regular selection
            }
            
            // Clicked on a model
            // Check if select tool is active
            const isSelectToolActive = this.isSelectToolActive();
            
            if (event.ctrlKey) {
                // Ctrl + click: add to selection
                this.selectObject(selectedObject, true, !isSelectToolActive);
            } else {
                // Normal click: select only this object
                this.selectObject(selectedObject, false, !isSelectToolActive);
            }
        } else {
            // Clicked on empty space
            if (event.ctrlKey) {
                // Ctrl + click on empty space: do nothing
            } else {
                // Normal click on empty space: clear selection
                this.clearSelection();
            }
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
     * Check if current click is a double-click
     */
    isDoubleClick(currentTime, currentPosition) {
        const timeDiff = currentTime - this.lastClickTime;
        const positionDiff = this.lastClickPosition ? 
            Math.sqrt(
                Math.pow(currentPosition.x - this.lastClickPosition.x, 2) +
                Math.pow(currentPosition.y - this.lastClickPosition.y, 2)
            ) : 0;

        const isDoubleClick = timeDiff < this.doubleClickThreshold && 
                             positionDiff < this.doubleClickDistance;

        // Update last click info
        this.lastClickTime = currentTime;
        this.lastClickPosition = currentPosition;

        return isDoubleClick;
    }

    /**
     * Find the original mesh from a wireframe clone
     */
    findOriginalMeshFromWireframe(wireframeMesh) {
        if (!wireframeMesh || !wireframeMesh.name) return null;
        
        // Extract original mesh name from wireframe clone name
        let originalName = wireframeMesh.name;
        
        // Remove wireframe suffixes
        originalName = originalName.replace('_edge_wireframe', '');
        originalName = originalName.replace('_wireframe', '');
        
        // Find the original mesh in the scene
        const originalMesh = this.scene.getMeshByName(originalName);
        if (originalMesh) {
            return originalMesh;
        }
        
        return null;
    }

    /**
     * Get the best mesh for zoom calculation
     */
    getBestMeshForZoom(mesh) {
        if (!mesh) return null;
        
        // If this is a wireframe clone, find the original mesh
        if (mesh.name && (mesh.name.includes('_wireframe') || mesh.name.includes('_edge_wireframe'))) {
            const originalMesh = this.findOriginalMeshFromWireframe(mesh);
            if (originalMesh) {
                return originalMesh;
            }
        }
        
        // For TransformNode (trees or buildings), try to get child meshes
        if (mesh instanceof BABYLON.TransformNode) {
            // For trees, return the TransformNode (we'll use child meshes for bounding calculation)
            if (mesh.name && (mesh.name.startsWith('tree_') || /^tree\d+$/.test(mesh.name))) {
                const childMeshes = mesh.getChildMeshes();
                if (childMeshes.length > 0) {
                    return mesh; // Return parent node, calculateMeshBoundingBox will handle child meshes
                }
            }
            
            // For buildings that are TransformNodes, try to find the actual mesh
            // Buildings should be regular meshes, but if they're TransformNodes, get child meshes
            if (mesh.name && mesh.name.startsWith('building')) {
                const childMeshes = mesh.getChildMeshes();
                if (childMeshes.length > 0) {
                    // Return the first child mesh (the actual building mesh)
                    return childMeshes[0];
                }
                // If no child meshes, try to find the mesh in scene by name
                const actualMesh = this.scene.getMeshByName(mesh.name);
                if (actualMesh && actualMesh instanceof BABYLON.Mesh) {
                    return actualMesh;
                }
            }
        }
        
        // For regular meshes, return as-is
        return mesh;
    }

    /**
     * Calculate world-space bounding box for a mesh (handles different mesh types)
     */
    calculateMeshBoundingBox(mesh) {
        if (!mesh) return null;
        
        let boundingBox = null;
        
        // For tree parent nodes, calculate bounding box from all child meshes
        if (mesh.name && mesh.name.startsWith('tree_') && mesh.getChildMeshes) {
            const childMeshes = mesh.getChildMeshes();
            if (childMeshes.length > 0) {
                // Calculate combined world-space bounding box of all child meshes
                let minX = Infinity, minY = Infinity, minZ = Infinity;
                let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
                
                childMeshes.forEach(childMesh => {
                    if (childMesh.getBoundingInfo) {
                        childMesh.refreshBoundingInfo();
                        const childBounding = childMesh.getBoundingInfo();
                        
                        // Get world-space bounding box
                        const worldMatrix = childMesh.getWorldMatrix();
                        const localMin = childBounding.boundingBox.minimum;
                        const localMax = childBounding.boundingBox.maximum;
                        
                        // Transform local bounding box to world space
                        const worldMin = BABYLON.Vector3.TransformCoordinates(localMin, worldMatrix);
                        const worldMax = BABYLON.Vector3.TransformCoordinates(localMax, worldMatrix);
                        
                        minX = Math.min(minX, worldMin.x);
                        minY = Math.min(minY, worldMin.y);
                        minZ = Math.min(minZ, worldMin.z);
                        maxX = Math.max(maxX, worldMax.x);
                        maxY = Math.max(maxY, worldMax.y);
                        maxZ = Math.max(maxZ, worldMax.z);
                    }
                });
                
                if (minX !== Infinity) {
                    const center = new BABYLON.Vector3(
                        (minX + maxX) / 2,
                        (minY + maxY) / 2,
                        (minZ + maxZ) / 2
                    );
                    const size = new BABYLON.Vector3(
                        maxX - minX,
                        maxY - minY,
                        maxZ - minZ
                    );
                    boundingBox = { center, size };
                }
            }
        } else {
            // For regular meshes, use world-space bounding info
            if (mesh.getBoundingInfo) {
                mesh.refreshBoundingInfo();
                const boundingInfo = mesh.getBoundingInfo();
                
                // Get world-space bounding box
                const worldMatrix = mesh.getWorldMatrix();
                const localMin = boundingInfo.boundingBox.minimum;
                const localMax = boundingInfo.boundingBox.maximum;
                
                // Transform local bounding box to world space
                const worldMin = BABYLON.Vector3.TransformCoordinates(localMin, worldMatrix);
                const worldMax = BABYLON.Vector3.TransformCoordinates(localMax, worldMatrix);
                
                // Calculate world-space center and size
                const center = new BABYLON.Vector3(
                    (worldMin.x + worldMax.x) / 2,
                    (worldMin.y + worldMax.y) / 2,
                    (worldMin.z + worldMax.z) / 2
                );
                const size = new BABYLON.Vector3(
                    worldMax.x - worldMin.x,
                    worldMax.y - worldMin.y,
                    worldMax.z - worldMin.z
                );
                
                boundingBox = { center, size };
            }
        }
        
        return boundingBox;
    }

    /**
     * Zoom camera to mesh extent
     */
    zoomToMeshExtent(mesh) {
        if (!mesh || !this.camera) {
            console.warn('Cannot zoom to mesh: mesh or camera is null');
            return;
        }

        try {
            
            // Get the best mesh for zoom calculation
            const targetMesh = this.getBestMeshForZoom(mesh);
            if (!targetMesh) {
                console.warn('No valid mesh found for zoom');
                return;
            }
            
            // Calculate bounding box
            const boundingBox = this.calculateMeshBoundingBox(targetMesh);
            if (!boundingBox) {
                console.warn('Could not calculate bounding box, using fallback');
                const fallbackCenter = mesh.position || new BABYLON.Vector3(0, 0, 0);
                this.animateCameraToTarget(fallbackCenter, 15);
                return;
            }
            
            const { center, size } = boundingBox;
            const maxSize = Math.max(size.x, size.y, size.z);
            
            // Ensure we have valid dimensions
            if (maxSize <= 0) {
                console.warn('Invalid mesh size, using fallback');
                const fallbackCenter = mesh.position || new BABYLON.Vector3(0, 0, 0);
                this.animateCameraToTarget(fallbackCenter, 15);
                return;
            }
            
            // Calculate appropriate camera distance (closer zoom)
            const distance = Math.max(maxSize * 2, 3); // Closer zoom, minimum distance of 3 units
            
            // Animate camera to new position
            this.animateCameraToTarget(center, distance);
            
            console.log(`Zooming to mesh: ${targetMesh.name}`);
            console.log(`World-space center:`, center);
            console.log(`World-space size:`, size);
            console.log(`Max size:`, maxSize);
            console.log(`Distance:`, distance);
            console.log(`Mesh world position:`, targetMesh.position);
            console.log(`Mesh world matrix:`, targetMesh.getWorldMatrix());
            
        } catch (error) {
            console.error('Error zooming to mesh extent:', error);
            // Fallback: zoom to mesh position
            const fallbackCenter = mesh.position || new BABYLON.Vector3(0, 0, 0);
            this.animateCameraToTarget(fallbackCenter, 15);
        }
    }

    /**
     * Zoom camera to extent of selected objects
     * Works for both single and multiple selected objects
     */
    zoomToSelectedExtent() {
        if (!this.camera) {
            console.warn('Cannot zoom to extent: camera is null');
            return;
        }

        const selectedObjects = this.getSelectedObjects();
        
        if (selectedObjects.length === 0) {
            // No objects selected - zoom to ground
            console.log('No objects selected, zooming to ground');
            if (this.scene) {
                const ground = this.scene.getMeshByName("earth");
                if (ground) {
                    const groundSize = 500;
                    const halfSize = groundSize / 2;
                    const requiredRadius = Math.sqrt(halfSize * halfSize + halfSize * halfSize) * 1.2;
                    // No upper limit check - allow unlimited zoom out
                    this.camera.radius = requiredRadius;
                    this.camera.setTarget(new BABYLON.Vector3(0, 0, 0));
                }
            }
            return;
        }

        if (selectedObjects.length === 1) {
            // Single object - use existing zoomToMeshExtent
            this.zoomToMeshExtent(selectedObjects[0]);
            return;
        }

        // Multiple objects - calculate combined bounding box
        try {
            let minX = Infinity, minY = Infinity, minZ = Infinity;
            let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
            let validObjects = 0;

            selectedObjects.forEach(obj => {
                if (!obj) {
                    console.log(`[zoomToSelectedExtent] Skipping null object`);
                    return;
                }

                // Check if object is disposed - handle both Mesh and TransformNode
                let isDisposed = false;
                if (obj instanceof BABYLON.Mesh || obj instanceof BABYLON.AbstractMesh) {
                    isDisposed = obj.isDisposed ? obj.isDisposed() : false;
                } else if (obj instanceof BABYLON.TransformNode) {
                    // For TransformNode, check if it's still in the scene
                    isDisposed = !this.scene.transformNodes.includes(obj);
                } else {
                    // For other types, try to check if disposed method exists
                    isDisposed = (obj.isDisposed && typeof obj.isDisposed === 'function') ? obj.isDisposed() : false;
                }

                if (isDisposed) {
                    console.log(`[zoomToSelectedExtent] Skipping disposed object: ${obj?.name || 'unknown'}`);
                    return;
                }

                // Get the best mesh for zoom calculation
                const targetMesh = this.getBestMeshForZoom(obj);
                if (!targetMesh) {
                    console.log(`[zoomToSelectedExtent] No valid target mesh for: ${obj.name || 'unknown'}`);
                    return;
                }

                // Calculate bounding box for this object
                const boundingBox = this.calculateMeshBoundingBox(targetMesh);
                if (!boundingBox) {
                    console.log(`[zoomToSelectedExtent] Could not calculate bounding box for: ${targetMesh.name || 'unknown'}`);
                    return;
                }

                const { center, size } = boundingBox;
                const halfSize = size.clone().scale(0.5);
                
                // Calculate world-space bounds (use clone to avoid mutating center)
                const worldMin = center.clone().subtract(halfSize);
                const worldMax = center.clone().add(halfSize);

                minX = Math.min(minX, worldMin.x);
                minY = Math.min(minY, worldMin.y);
                minZ = Math.min(minZ, worldMin.z);
                maxX = Math.max(maxX, worldMax.x);
                maxY = Math.max(maxY, worldMax.y);
                maxZ = Math.max(maxZ, worldMax.z);
                
                validObjects++;
                console.log(`[zoomToSelectedExtent] Processed object ${validObjects}: ${targetMesh.name || 'unknown'}, bounds: [${worldMin.x.toFixed(2)}, ${worldMin.y.toFixed(2)}, ${worldMin.z.toFixed(2)}] to [${worldMax.x.toFixed(2)}, ${worldMax.y.toFixed(2)}, ${worldMax.z.toFixed(2)}]`);
            });

            if (validObjects === 0) {
                console.warn('No valid objects found for zoom');
                return;
            }

            // Calculate combined bounding box center and size
            const combinedCenter = new BABYLON.Vector3(
                (minX + maxX) / 2,
                (minY + maxY) / 2,
                (minZ + maxZ) / 2
            );
            
            const combinedSize = new BABYLON.Vector3(
                maxX - minX,
                maxY - minY,
                maxZ - minZ
            );
            
            const maxSize = Math.max(combinedSize.x, combinedSize.y, combinedSize.z);
            
            // Ensure we have valid dimensions
            if (maxSize <= 0) {
                console.warn('Invalid combined size, using fallback');
                const fallbackCenter = combinedCenter || new BABYLON.Vector3(0, 0, 0);
                this.animateCameraToTarget(fallbackCenter, 15);
                return;
            }
            
            // Calculate appropriate camera distance
            const distance = Math.max(maxSize * 2, 3); // Minimum distance of 3 units
            
            // Animate camera to new position
            this.animateCameraToTarget(combinedCenter, distance);
            
            console.log(`Zooming to ${validObjects} selected objects`);
            console.log(`Combined center:`, combinedCenter);
            console.log(`Combined size:`, combinedSize);
            console.log(`Max size:`, maxSize);
            console.log(`Distance:`, distance);
            
        } catch (error) {
            console.error('Error zooming to selected extent:', error);
            // Fallback: zoom to center of selected objects
            const center = BABYLON.Vector3.Zero();
            let count = 0;
            selectedObjects.forEach(obj => {
                if (obj && !obj.isDisposed && obj.position) {
                    center.addInPlace(obj.position);
                    count++;
                }
            });
            if (count > 0) {
                center.scaleInPlace(1 / count);
                this.animateCameraToTarget(center, 15);
            }
        }
    }

    /**
     * Animate camera to target position and distance
     */
    animateCameraToTarget(target, distance) {
        if (!this.camera) return;

        const currentTarget = this.camera.getTarget();
        const currentRadius = this.camera.radius;
        
        // Create faster animation to new target
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraTargetAnimation",
            this.camera,
            "target",
            60, // fps (higher for smoother animation)
            30, // frames (0.5 seconds - faster)
            currentTarget,
            target,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.CubicEase()
        );

        // Create faster animation to new radius
        BABYLON.Animation.CreateAndStartAnimation(
            "cameraRadiusAnimation",
            this.camera,
            "radius",
            60, // fps (higher for smoother animation)
            30, // frames (0.5 seconds - faster)
            currentRadius,
            distance,
            BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT,
            new BABYLON.CubicEase()
        );
    }

    /**
     * Select an object
     */
    selectObject(mesh, isMultiSelect = false, includeExtrusion = true) {
        
        // Auto-select TransformNode parent for tree meshes
        // Check for both old naming (tree_, simple_tree_) and new naming (tree1, tree2, ...)
        if (mesh.parent && mesh.parent instanceof BABYLON.TransformNode) {
            const parentName = mesh.parent.name.toLowerCase();
            const isOldTreeName = parentName.includes('tree_') || parentName.includes('simple_tree_');
            const isNewTreeName = /^tree\d+$/.test(parentName);
            
            if (isOldTreeName || isNewTreeName) {
                console.log(`Auto-selecting TransformNode parent: ${mesh.parent.name}`);
                mesh = mesh.parent; // Select the parent TransformNode instead
            }
        }
        
        // Additional debugging for different object types
        if (mesh instanceof BABYLON.TransformNode) {
            
            // Try to get child meshes immediately
            try {
                const childMeshes = mesh.getChildMeshes();
            } catch (error) {
                console.error('Error getting child meshes:', error);
            }
        } else if (mesh instanceof BABYLON.Mesh) {
            console.log(`Mesh details:`, {
                name: mesh.name,
                position: mesh.position,
                rotation: mesh.rotation,
                scaling: mesh.scaling,
                hasMaterial: !!mesh.material,
                renderingGroupId: mesh.renderingGroupId
            });
        }
        
        // Clear previous selection if not in multi-select mode
        if (!isMultiSelect) {
            this.clearSelection();
        }

        // Add to selection if not already selected
        if (!this.selectedObjects.includes(mesh)) {
            // IMPORTANT: Don't select invisible objects - they should remain invisible
            // Only select if the object is visible and enabled
            if (!mesh.isVisible || !mesh.isEnabled()) {
                console.warn(`[SELECT] Cannot select invisible or disabled mesh: ${mesh.name}`);
                return; // Don't select invisible objects
            }
            
            // IMPORTANT: TransformNodes cannot be added with addMesh, they're already in the scene
            if (mesh instanceof BABYLON.TransformNode) {
                // TransformNodes are already in scene.transformNodes, don't try to add them
                if (!this.scene.transformNodes.includes(mesh)) {
                    console.warn(`[SELECT] TransformNode ${mesh.name} is not in scene.transformNodes, but this shouldn't happen`);
                }
            } else if (mesh instanceof BABYLON.Mesh) {
                // Only check and add regular meshes
                if (!this.scene.meshes.includes(mesh)) {
                    console.warn(`[SELECT] Mesh ${mesh.name} is not in scene, adding...`);
                    this.scene.addMesh(mesh);
                }
            }
            
            this.selectedObjects.push(mesh);
            this.highlightObject(mesh);
            
            // IMPORTANT: Only add extrusion separately if it's NOT parented to the mesh
            // If extrusion is a child of the mesh (via setParent), it will be selected automatically
            // Adding it separately causes duplicate selection issues
            if (includeExtrusion && mesh.extrusion && !this.selectedObjects.includes(mesh.extrusion)) {
                // Check if extrusion is parented to mesh
                const isExtrusionParented = mesh.extrusion.parent === mesh;
                
                // Only add extrusion separately if it's NOT parented
                // If it's parented, the gizmo will work with the parent and child automatically
                if (!isExtrusionParented) {
                    // IMPORTANT: Ensure extrusion is visible and enabled before selecting
                    if (!mesh.extrusion.isVisible) {
                        console.warn(`[SELECT] Extrusion ${mesh.extrusion.name} is not visible, fixing...`);
                        mesh.extrusion.isVisible = true;
                    }
                    if (!mesh.extrusion.isEnabled()) {
                        console.warn(`[SELECT] Extrusion ${mesh.extrusion.name} is not enabled, fixing...`);
                        mesh.extrusion.setEnabled(true);
                    }
                    // Extrusions are always meshes, not TransformNodes
                    if (mesh.extrusion instanceof BABYLON.Mesh && !this.scene.meshes.includes(mesh.extrusion)) {
                        console.warn(`[SELECT] Extrusion ${mesh.extrusion.name} is not in scene, adding...`);
                        this.scene.addMesh(mesh.extrusion);
                    }
                    
                    this.selectedObjects.push(mesh.extrusion);
                    this.highlightObject(mesh.extrusion);
                }
            }
        }

        this.onSelectionChanged();
    }

    /**
     * Deselect an object
     */
    deselectObject(mesh) {
        const index = this.selectedObjects.indexOf(mesh);
        if (index > -1) {
            this.selectedObjects.splice(index, 1);
            this.removeHighlight(mesh);
            
            // If this is a 2D shape with extrusion, also deselect the extrusion
            if (mesh.extrusion) {
                const extrusionIndex = this.selectedObjects.indexOf(mesh.extrusion);
                if (extrusionIndex > -1) {
                    this.selectedObjects.splice(extrusionIndex, 1);
                    this.removeHighlight(mesh.extrusion);
                }
            }
            
            this.onSelectionChanged();
        }
    }

    /**
     * Clear all selections
     */
    clearSelection() {
        this.selectedObjects.forEach(mesh => {
            this.removeHighlight(mesh);
        });
        this.selectedObjects = [];
        this.onSelectionChanged();
    }
    
    /**
     * Force cleanup all wireframe meshes in the scene
     */
    forceCleanupAllWireframes() {
        const wireframeMeshes = this.scene.meshes.filter(mesh => 
            mesh.name && mesh.name.includes('_edge_wireframe')
        );
        
        console.log(`Force cleaning up ${wireframeMeshes.length} wireframe meshes`);
        wireframeMeshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });
        
        // Also clear any remaining wireframe references
        this.scene.meshes.forEach(mesh => {
            if (mesh.wireframeClone) {
                mesh.wireframeClone = null;
            }
        });
        
        return wireframeMeshes.length;
    }

    /**
     * Highlight an object by changing its material to shaded + wireframe
     */
    highlightObject(mesh) {
        if (!mesh) {
            console.warn('Cannot highlight: mesh is null or undefined');
            return;
        }
        
        // IMPORTANT: Ensure mesh is visible and enabled
        if (!mesh.isVisible) {
            console.warn(`Cannot highlight: mesh ${mesh.name} is not visible`);
            mesh.isVisible = true;
        }
        if (!mesh.isEnabled()) {
            console.warn(`Cannot highlight: mesh ${mesh.name} is not enabled`);
            mesh.setEnabled(true);
        }
        
        // IMPORTANT: Ensure mesh is in the scene
        // IMPORTANT: In Babylon.js, Mesh extends TransformNode, so we need to check if it's actually a Mesh
        // A Mesh is both instanceof Mesh AND instanceof TransformNode, but a pure TransformNode is NOT instanceof Mesh
        const isActuallyMesh = mesh instanceof BABYLON.Mesh;
        const isPureTransformNode = mesh instanceof BABYLON.TransformNode && !(mesh instanceof BABYLON.Mesh);
        
        console.log(`[SELECT] Type check for ${mesh.name}: isActuallyMesh=${isActuallyMesh}, isPureTransformNode=${isPureTransformNode}, constructor=${mesh.constructor.name}`);
        
        if (isPureTransformNode) {
            // Pure TransformNodes (not Meshes) are already in scene.transformNodes
            if (!this.scene.transformNodes.includes(mesh)) {
                console.warn(`[SELECT] Cannot highlight: TransformNode ${mesh.name} is not in scene.transformNodes, but this shouldn't happen`);
            }
        } else if (isActuallyMesh) {
            // Meshes are in scene.meshes
            if (!this.scene.meshes.includes(mesh)) {
                console.warn(`[SELECT] Cannot highlight: mesh ${mesh.name} is not in scene, adding it`);
                this.scene.addMesh(mesh);
            }
        } else {
            // If it's neither Mesh nor TransformNode, log a warning
            console.warn(`[SELECT] Cannot highlight: ${mesh.name} is neither Mesh nor TransformNode, type: ${mesh.constructor.name}`);
        }
        
        // Don't modify material if already highlighted
        // But first check if wireframe clone exists (it should if already highlighted)
        if (this.originalMaterials.has(mesh)) {
            // If wireframe clone doesn't exist but mesh is marked as highlighted, something went wrong
            if (!mesh.wireframeClone) {
                console.warn(`Mesh ${mesh.name} is marked as highlighted but has no wireframe clone, cleaning up and re-highlighting`);
                this.originalMaterials.delete(mesh);
                // Continue to create new highlight
            } else {
                console.log(`Mesh ${mesh.name} is already highlighted, skipping`);
                return;
            }
        }
        
        // Handle TransformNodes (like tree parents) by highlighting their children
        // IMPORTANT: Check if it's actually a pure TransformNode (not a Mesh)
        // In Babylon.js, Mesh extends TransformNode, so we need to check if it's NOT a Mesh
        // Use the already checked variables from above
        console.log(`[SELECT] TransformNode check for ${mesh.name}: isActuallyMesh=${isActuallyMesh}, isPureTransformNode=${isPureTransformNode}`);
        
        if (isPureTransformNode) {
            // Check if it has child meshes
            let childMeshes = [];
            if (mesh.getChildMeshes) {
                try {
                    childMeshes = mesh.getChildMeshes();
                } catch (error) {
                    console.warn(`Error getting child meshes for TransformNode ${mesh.name}:`, error);
                }
            }
            
            // Also try alternative method to find child meshes
            if (childMeshes.length === 0) {
                childMeshes = this.scene.meshes.filter(m => 
                    m.parent === mesh && m instanceof BABYLON.Mesh
                );
            }
            
            if (childMeshes.length > 0) {
                console.log(`TransformNode ${mesh.name} has ${childMeshes.length} child meshes, highlighting them`);
                this.highlightTransformNode(mesh);
                return;
            } else {
                console.warn(`TransformNode ${mesh.name} has no child meshes to highlight`);
                return; // Can't highlight a TransformNode without children
            }
        }
        
        // If it's a Mesh (even if it was incorrectly identified as TransformNode), continue with normal highlighting
        
        // IMPORTANT: For extrusions and buildings, ensure they have material
        if (!mesh.material) {
            const isExtrusion = mesh.name && mesh.name.includes('_extrusion');
            const isBuilding = mesh.userData?.type === 'building' || mesh.userData?.shapeType === 'building';
            
            if (isExtrusion || isBuilding) {
                console.warn(`Mesh ${mesh.name} (${isExtrusion ? 'extrusion' : 'building'}) has no material, creating default material`);
                const defaultMaterial = new BABYLON.StandardMaterial(`${mesh.name}_defaultMaterial`, this.scene);
                defaultMaterial.diffuseColor = new BABYLON.Color3(1, 1, 1);
                defaultMaterial.backFaceCulling = false;
                defaultMaterial.twoSidedLighting = true;
                mesh.material = defaultMaterial;
            } else {
                console.warn(`Mesh ${mesh.name} has no material, cannot highlight`);
                return;
            }
        }
        
        // IMPORTANT: Ensure mesh has geometry
        if (!mesh.geometry) {
            console.error(`Cannot highlight: mesh ${mesh.name} has no geometry`);
            return;
        }
        
        // Store original material and renderingGroupId
        this.originalMaterials.set(mesh, mesh.material);
        const originalRenderingGroupId = mesh.renderingGroupId;
        
        // ========== LOG: وضعیت مدل اصلی قبل از highlight ==========
        console.log(`[SELECT] ========== وضعیت مدل اصلی (${mesh.name}) قبل از highlight ==========`);
        console.log(`[SELECT] - Material: ${mesh.material ? mesh.material.name : 'null'}`);
        console.log(`[SELECT] - Material type: ${mesh.material ? mesh.material.constructor.name : 'null'}`);
        if (mesh.material instanceof BABYLON.StandardMaterial) {
            console.log(`[SELECT] - Material wireframe: ${mesh.material.wireframe}`);
            console.log(`[SELECT] - Material diffuseColor:`, mesh.material.diffuseColor);
        }
        console.log(`[SELECT] - isVisible: ${mesh.isVisible}`);
        console.log(`[SELECT] - isEnabled: ${mesh.isEnabled()}`);
        console.log(`[SELECT] - renderingGroupId: ${mesh.renderingGroupId}`);
        console.log(`[SELECT] - in scene.meshes: ${this.scene.meshes.includes(mesh)}`);
        console.log(`[SELECT] ==========================================================`);
        
        // NEW APPROACH: Create a wireframe clone overlay for shaded + wireframe effect
        // Keep the original mesh with its material (shaded), and add a wireframe clone on top
        try {
            // Create wireframe clone
            const wireframeClone = mesh.clone(`${mesh.name}_wireframe_overlay`);
            
            // Create wireframe material
            const wireframeMaterial = new BABYLON.StandardMaterial(`${mesh.name}_wireframe_material`, this.scene);
            wireframeMaterial.wireframe = true;
            wireframeMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Black wireframe
            wireframeMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Slight glow
            wireframeMaterial.backFaceCulling = false;
            wireframeMaterial.twoSidedLighting = true;
            wireframeMaterial.alpha = 1.0;
            
            // Apply wireframe material to clone
            wireframeClone.material = wireframeMaterial;
            
            // Set renderingGroupId to be higher than original (so it renders on top)
            // But keep it in the same rendering group range for consistency
            wireframeClone.renderingGroupId = originalRenderingGroupId;
            
            // Make clone slightly larger to ensure it's visible
            wireframeClone.scaling = mesh.scaling.clone();
            
            // Ensure clone is visible and enabled
            wireframeClone.isVisible = true;
            wireframeClone.setEnabled(true);
            
            // Store wireframe clone reference
            mesh.wireframeClone = wireframeClone;
            
            // Add clone to scene
            if (!this.scene.meshes.includes(wireframeClone)) {
                this.scene.addMesh(wireframeClone);
            }
            
            // ========== LOG: وضعیت مدل اصلی بعد از highlight ==========
            console.log(`[SELECT] ========== وضعیت مدل اصلی (${mesh.name}) بعد از highlight ==========`);
            console.log(`[SELECT] - Material: ${mesh.material ? mesh.material.name : 'null'}`);
            console.log(`[SELECT] - Material type: ${mesh.material ? mesh.material.constructor.name : 'null'}`);
            if (mesh.material instanceof BABYLON.StandardMaterial) {
                console.log(`[SELECT] - Material wireframe: ${mesh.material.wireframe}`);
                console.log(`[SELECT] - Material diffuseColor:`, mesh.material.diffuseColor);
            }
            console.log(`[SELECT] - isVisible: ${mesh.isVisible}`);
            console.log(`[SELECT] - isEnabled: ${mesh.isEnabled()}`);
            console.log(`[SELECT] - renderingGroupId: ${mesh.renderingGroupId}`);
            console.log(`[SELECT] - in scene.meshes: ${this.scene.meshes.includes(mesh)}`);
            console.log(`[SELECT] ==========================================================`);
            
            // ========== LOG: وضعیت clone ==========
            console.log(`[SELECT] ========== وضعیت clone (${wireframeClone.name}) ==========`);
            console.log(`[SELECT] - Material: ${wireframeClone.material ? wireframeClone.material.name : 'null'}`);
            console.log(`[SELECT] - Material type: ${wireframeClone.material ? wireframeClone.material.constructor.name : 'null'}`);
            if (wireframeClone.material instanceof BABYLON.StandardMaterial) {
                console.log(`[SELECT] - Material wireframe: ${wireframeClone.material.wireframe}`);
                console.log(`[SELECT] - Material diffuseColor:`, wireframeClone.material.diffuseColor);
            }
            console.log(`[SELECT] - isVisible: ${wireframeClone.isVisible}`);
            console.log(`[SELECT] - isEnabled: ${wireframeClone.isEnabled()}`);
            console.log(`[SELECT] - renderingGroupId: ${wireframeClone.renderingGroupId}`);
            console.log(`[SELECT] - in scene.meshes: ${this.scene.meshes.includes(wireframeClone)}`);
            console.log(`[SELECT] - position:`, wireframeClone.position);
            console.log(`[SELECT] - scaling:`, wireframeClone.scaling);
            console.log(`[SELECT] ==========================================================`);
            
            console.log(`[SELECT] ✓ Highlighted ${mesh.name} with shaded + wireframe overlay`);
        } catch (error) {
            console.error(`[SELECT] ✗ Failed to create wireframe clone for ${mesh.name}:`, error);
            // Fallback: just keep the original mesh as is
        }
    }

    /**
     * Highlight a TransformNode by creating wireframes for its child meshes
     */
    highlightTransformNode(transformNode) {
        if (!transformNode || !transformNode.getChildMeshes) {
            console.warn('Cannot highlight TransformNode: invalid object');
            return;
        }
        
        // Skip wireframe creation for trees - they don't need wireframes
        // if (transformNode.name.includes('tree_') || transformNode.name.includes('simple_tree_')) {
        //     console.log(`Skipping wireframe creation for tree: ${transformNode.name}`);
        //     return;
        // }
        
        // Get all child meshes
        const childMeshes = transformNode.getChildMeshes();
        console.log(`TransformNode ${transformNode.name} has ${childMeshes.length} child meshes:`, childMeshes.map(m => m.name));
        
        if (childMeshes.length === 0) {
            console.warn(`TransformNode ${transformNode.name} has no child meshes to highlight`);
            
            // Try alternative method to find child meshes
            const scene = this.scene;
            const allMeshes = scene.meshes.filter(mesh => 
                mesh.parent === transformNode && mesh instanceof BABYLON.Mesh
            );
            console.log(`Alternative method found ${allMeshes.length} child meshes:`, allMeshes.map(m => m.name));
            
            // Debug: Check all meshes in scene and their parents
            console.log(`Total meshes in scene: ${scene.meshes.length}`);
            const meshesWithParents = scene.meshes.filter(mesh => mesh.parent);
            console.log(`Meshes with parents: ${meshesWithParents.length}`);
            meshesWithParents.forEach(mesh => {
                if (mesh.parent && mesh.parent.name && mesh.parent.name.includes('tree_')) {
                    console.log(`Mesh ${mesh.name} has parent ${mesh.parent.name}`);
                }
            });
            
            // Debug: Check all meshes in scene that might be related to this tree
            const relatedMeshes = scene.meshes.filter(mesh => 
                mesh.name && mesh.name.includes(transformNode.name.replace('tree_', '').replace('simple_tree_', ''))
            );
            console.log(`Related meshes in scene: ${relatedMeshes.length}`, relatedMeshes.map(m => `${m.name} (parent: ${m.parent ? m.parent.name : 'none'})`));
            
            // Debug: Check if meshes are disposed
            const disposedMeshes = relatedMeshes.filter(mesh => mesh.isDisposed());
            console.log(`Disposed related meshes: ${disposedMeshes.length}`, disposedMeshes.map(m => m.name));
            
            if (allMeshes.length === 0) {
                console.warn(`No child meshes found for TransformNode ${transformNode.name} using any method`);
                
                // For TransformNodes without child meshes, don't create a bounding box wireframe
                // This prevents the issue where buildings (which are regular meshes) get incorrect wireframes
                console.log(`Skipping wireframe creation for TransformNode ${transformNode.name} - no child meshes found`);
                return;
            }
            
            // Use the alternative method
            this.createWireframesForMeshes(transformNode, allMeshes);
            return;
        }
        
        // Create wireframes for all child meshes
        this.createWireframesForMeshes(transformNode, childMeshes);
    }

    /**
     * Create a simple bounding box wireframe for TransformNodes without child meshes
     * NOTE: This is a fallback - normally we highlight child meshes directly
     */
    createBoundingBoxWireframe(transformNode) {
        console.log(`Creating bounding box wireframe for TransformNode ${transformNode.name} (fallback)`);
        
        // Get the renderingGroupId from child meshes if available
        let targetRenderingGroupId = 0;
        if (transformNode.getChildMeshes) {
            const childMeshes = transformNode.getChildMeshes();
            if (childMeshes.length > 0) {
                // Get renderingGroupId from first child mesh
                const firstChild = childMeshes[0];
                if (firstChild instanceof BABYLON.Mesh) {
                    targetRenderingGroupId = firstChild.renderingGroupId;
                }
            }
        }
        
        // If no child meshes, try to get from userData or determine from name
        if (targetRenderingGroupId === 0) {
            if (transformNode.userData && transformNode.userData.type) {
                targetRenderingGroupId = SceneManager.getRenderingGroupId(transformNode.userData.type);
            } else if (transformNode.name) {
                // Try to determine from name (e.g., tree1, tree2, etc.)
                const name = transformNode.name.toLowerCase();
                if (name.includes('tree')) {
                    targetRenderingGroupId = SceneManager.getRenderingGroupId('tree');
                } else if (name.includes('building')) {
                    targetRenderingGroupId = SceneManager.getRenderingGroupId('building');
                }
            }
        }
        
        // Create a simple box wireframe as fallback
        const boxSize = 2; // Default size for trees
        const wireframeBox = BABYLON.MeshBuilder.CreateBox(`${transformNode.name}_wireframe_box`, {
            size: boxSize
        }, this.scene);
        
        // Apply wireframe material
        const edgeWireframeMaterial = this.edgeWireframeMaterial.clone(`edge_wireframe_${transformNode.name}_box`);
        wireframeBox.material = edgeWireframeMaterial;
        
        // IMPORTANT: Set rendering group to match the original mesh's renderingGroupId
        wireframeBox.renderingGroupId = targetRenderingGroupId;
        
        // Parent to the TransformNode to inherit its transforms
        wireframeBox.setParent(transformNode);
        
        // Position at center
        wireframeBox.position = BABYLON.Vector3.Zero();
        
        // Store reference
        transformNode.wireframeClones = [wireframeBox];
        
        console.log(`Created bounding box wireframe for TransformNode ${transformNode.name} with renderingGroupId: ${targetRenderingGroupId} (same as original)`);
    }

    /**
     * Create wireframes for a list of meshes by applying shaded + wireframe material directly
     */
    createWireframesForMeshes(transformNode, meshes) {
        meshes.forEach(childMesh => {
            if (childMesh instanceof BABYLON.Mesh) {
                // Don't modify if already highlighted
                if (this.originalMaterials.has(childMesh)) {
                    return;
                }
                
                // Store original material and renderingGroupId
                this.originalMaterials.set(childMesh, childMesh.material);
                const originalRenderingGroupId = childMesh.renderingGroupId;
                
                // NEW APPROACH: Create a wireframe clone overlay for shaded + wireframe effect
                try {
                    // Create wireframe clone
                    const wireframeClone = childMesh.clone(`${childMesh.name}_wireframe_overlay`);
                    
                    // Create wireframe material
                    const wireframeMaterial = new BABYLON.StandardMaterial(`${childMesh.name}_wireframe_material`, this.scene);
                    wireframeMaterial.wireframe = true;
                    wireframeMaterial.diffuseColor = new BABYLON.Color3(0, 0, 0); // Black wireframe
                    wireframeMaterial.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2); // Slight glow
                    wireframeMaterial.backFaceCulling = false;
                    wireframeMaterial.twoSidedLighting = true;
                    wireframeMaterial.alpha = 1.0;
                    
                    // Apply wireframe material to clone
                    wireframeClone.material = wireframeMaterial;
                    
                    // Set renderingGroupId to be same as original
                    wireframeClone.renderingGroupId = originalRenderingGroupId;
                    
                    // Make clone slightly larger to ensure it's visible
                    wireframeClone.scaling = childMesh.scaling.clone();
                    
                    // Ensure clone is visible and enabled
                    wireframeClone.isVisible = true;
                    wireframeClone.setEnabled(true);
                    
                    // Store wireframe clone reference
                    childMesh.wireframeClone = wireframeClone;
                    
                    // Add clone to scene
                    if (!this.scene.meshes.includes(wireframeClone)) {
                        this.scene.addMesh(wireframeClone);
                    }
                } catch (error) {
                    console.error(`Failed to create wireframe clone for ${childMesh.name}:`, error);
                }
            }
        });
        
        console.log(`Applied shaded + wireframe material to ${meshes.length} child meshes of TransformNode ${transformNode.name} (renderingGroupId preserved)`);
    }

    /**
     * Remove highlight from an object
     */
    removeHighlight(mesh) {
        if (!mesh) {
            console.warn('Cannot remove highlight: mesh is null or undefined');
            return;
        }
        
        console.log(`[DESELECT] ========== شروع deselect برای ${mesh.name} ==========`);
        
        // ========== LOG: وضعیت قبل از deselect ==========
        console.log(`[DESELECT] وضعیت مدل اصلی (${mesh.name}) قبل از deselect:`);
        console.log(`[DESELECT] - Material: ${mesh.material ? mesh.material.name : 'null'}`);
        console.log(`[DESELECT] - Material type: ${mesh.material ? mesh.material.constructor.name : 'null'}`);
        if (mesh.material instanceof BABYLON.StandardMaterial) {
            console.log(`[DESELECT] - Material wireframe: ${mesh.material.wireframe}`);
            console.log(`[DESELECT] - Material diffuseColor:`, mesh.material.diffuseColor);
        }
        console.log(`[DESELECT] - isVisible: ${mesh.isVisible}`);
        console.log(`[DESELECT] - isEnabled: ${mesh.isEnabled()}`);
        console.log(`[DESELECT] - has wireframeClone: ${!!mesh.wireframeClone}`);
        if (mesh.wireframeClone) {
            console.log(`[DESELECT] - wireframeClone name: ${mesh.wireframeClone.name}`);
            console.log(`[DESELECT] - wireframeClone isVisible: ${mesh.wireframeClone.isVisible}`);
            console.log(`[DESELECT] - wireframeClone in scene: ${this.scene.meshes.includes(mesh.wireframeClone)}`);
            if (mesh.wireframeClone.material instanceof BABYLON.StandardMaterial) {
                console.log(`[DESELECT] - wireframeClone material wireframe: ${mesh.wireframeClone.material.wireframe}`);
            }
        }
        
        // Handle TransformNodes (like tree parents) - restore materials for child meshes
        // IMPORTANT: Check if it's actually a pure TransformNode (not a Mesh)
        const deselectIsMesh = mesh instanceof BABYLON.Mesh;
        const deselectIsPureTransformNode = mesh instanceof BABYLON.TransformNode && !deselectIsMesh;
        
        console.log(`[DESELECT] TransformNode check for ${mesh.name}: isMesh=${deselectIsMesh}, isPureTransformNode=${deselectIsPureTransformNode}`);
        
        if (deselectIsPureTransformNode) {
            console.log(`[DESELECT] Removing highlight from TransformNode ${mesh.name}`);
            
            // Get child meshes using multiple methods
            let childMeshes = [];
            if (mesh.getChildMeshes) {
                try {
                    childMeshes = mesh.getChildMeshes();
                } catch (error) {
                    console.warn(`Error getting child meshes for TransformNode ${mesh.name}:`, error);
                }
            }
            
            // Also try alternative method to find child meshes
            if (childMeshes.length === 0) {
                childMeshes = this.scene.meshes.filter(m => 
                    m.parent === mesh && m instanceof BABYLON.Mesh
                );
            }
            
            childMeshes.forEach(childMesh => {
                    if (childMesh instanceof BABYLON.Mesh) {
                        // IMPORTANT: Remove wireframe clone if it exists
                        // This is the key step: when deselecting, we must remove the clone so only the original mesh is visible
                        if (childMesh.wireframeClone) {
                            console.log(`[DESELECT] Removing wireframe clone for child mesh ${childMesh.name}`);
                            const clone = childMesh.wireframeClone;
                            
                            // Dispose of wireframe clone material first
                            if (clone.material) {
                                clone.material.dispose();
                                clone.material = null;
                            }
                            
                            // Remove from scene before disposing
                            if (this.scene.meshes.includes(clone)) {
                                this.scene.removeMesh(clone);
                            }
                            
                            // Dispose of wireframe clone mesh
                            if (!clone.isDisposed()) {
                                clone.dispose();
                            }
                            
                            // Clear the reference
                            childMesh.wireframeClone = null;
                        }
                    
                    const originalMaterial = this.originalMaterials.get(childMesh);
                    if (originalMaterial) {
                        // Only restore if material was changed (shouldn't be with new approach)
                        if (childMesh.material && childMesh.material !== originalMaterial) {
                            childMesh.material.dispose();
                            childMesh.material = originalMaterial;
                        }
                        this.originalMaterials.delete(childMesh);
                    }
                }
            });
            return;
        }
        
        // IMPORTANT: Remove wireframe clone if it exists
        // This is the key step: when deselecting, we must remove the clone so only the original mesh is visible
        if (mesh.wireframeClone) {
            console.log(`[DESELECT] ✓ Found wireframe clone, removing it...`);
            const clone = mesh.wireframeClone;
            
            console.log(`[DESELECT] - Clone name: ${clone.name}`);
            console.log(`[DESELECT] - Clone isVisible: ${clone.isVisible}`);
            console.log(`[DESELECT] - Clone in scene: ${this.scene.meshes.includes(clone)}`);
            console.log(`[DESELECT] - Clone isDisposed: ${clone.isDisposed()}`);
            if (clone.material instanceof BABYLON.StandardMaterial) {
                console.log(`[DESELECT] - Clone material wireframe: ${clone.material.wireframe}`);
            }
            
            // Dispose of wireframe clone material first
            if (clone.material) {
                console.log(`[DESELECT] - Disposing clone material: ${clone.material.name}`);
                clone.material.dispose();
                clone.material = null;
            }
            
            // Remove from scene before disposing
            if (this.scene.meshes.includes(clone)) {
                console.log(`[DESELECT] - Removing clone from scene`);
                this.scene.removeMesh(clone);
                console.log(`[DESELECT] - Clone removed from scene, still in scene: ${this.scene.meshes.includes(clone)}`);
            }
            
            // Dispose of wireframe clone mesh
            if (!clone.isDisposed()) {
                console.log(`[DESELECT] - Disposing clone mesh`);
                clone.dispose();
            }
            
            // Clear the reference
            mesh.wireframeClone = null;
            console.log(`[DESELECT] - Clone reference cleared`);
        } else {
            console.log(`[DESELECT] ⚠ No wireframe clone found for ${mesh.name}`);
        }
        
        // IMPORTANT: Also check scene for any remaining wireframe clones with this name (safety check)
        const wireframeCloneName = `${mesh.name}_wireframe_overlay`;
        const remainingClone = this.scene.getMeshByName(wireframeCloneName);
        if (remainingClone) {
            console.log(`[DESELECT] ⚠ Found remaining wireframe clone ${wireframeCloneName} in scene, force removing it`);
            if (remainingClone.material) {
                remainingClone.material.dispose();
            }
            if (this.scene.meshes.includes(remainingClone)) {
                this.scene.removeMesh(remainingClone);
            }
            if (!remainingClone.isDisposed()) {
                remainingClone.dispose();
            }
        } else {
            console.log(`[DESELECT] ✓ No remaining clone found in scene with name: ${wireframeCloneName}`);
        }
        
        // Restore original material (mesh should already have original material, but ensure it)
        const originalMaterial = this.originalMaterials.get(mesh);
        if (originalMaterial) {
            // Only restore if material was changed (shouldn't be with new approach, but just in case)
            if (mesh.material && mesh.material !== originalMaterial) {
                console.log(`[DESELECT] - Restoring original material: ${originalMaterial.name}`);
                mesh.material.dispose();
                mesh.material = originalMaterial;
            }
            this.originalMaterials.delete(mesh);
        } else {
            console.warn(`[DESELECT] ⚠ No original material found for ${mesh.name}`);
        }
        
        // ========== LOG: وضعیت بعد از deselect ==========
        console.log(`[DESELECT] وضعیت مدل اصلی (${mesh.name}) بعد از deselect:`);
        console.log(`[DESELECT] - Material: ${mesh.material ? mesh.material.name : 'null'}`);
        console.log(`[DESELECT] - Material type: ${mesh.material ? mesh.material.constructor.name : 'null'}`);
        if (mesh.material instanceof BABYLON.StandardMaterial) {
            console.log(`[DESELECT] - Material wireframe: ${mesh.material.wireframe}`);
            console.log(`[DESELECT] - Material diffuseColor:`, mesh.material.diffuseColor);
        }
        console.log(`[DESELECT] - isVisible: ${mesh.isVisible}`);
        console.log(`[DESELECT] - isEnabled: ${mesh.isEnabled()}`);
        console.log(`[DESELECT] - has wireframeClone: ${!!mesh.wireframeClone}`);
        const checkClone = this.scene.getMeshByName(wireframeCloneName);
        console.log(`[DESELECT] - Clone still in scene (by name): ${checkClone !== null}`);
        console.log(`[DESELECT] ========== پایان deselect برای ${mesh.name} ==========`);
    }

    /**
     * Update wireframe transforms to match the original mesh
     */
    updateWireframeTransforms(mesh) {
        if (!mesh || !mesh.wireframeClone) {
            return;
        }
        
        // Sync wireframe clone transforms with original mesh
        const clone = mesh.wireframeClone;
        clone.position = mesh.position.clone();
        clone.rotation = mesh.rotation.clone();
        clone.scaling = mesh.scaling.clone();
        
        // Sync rotation quaternion if exists
        if (mesh.rotationQuaternion && clone.rotationQuaternion) {
            clone.rotationQuaternion = mesh.rotationQuaternion.clone();
        }
    }

    /**
     * Update wireframe transforms for all selected objects
     */
    updateAllWireframeTransforms() {
        this.selectedObjects.forEach(mesh => {
            this.updateWireframeTransforms(mesh);
        });
    }

    /**
     * Test wireframe rotation issues - comprehensive debugging
     */
    testWireframeRotation() {
        console.log("=== WIREFRAME ROTATION TEST START ===");
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected for testing");
            return;
        }

        selectedObjects.forEach((obj, index) => {
            console.log(`\n--- Testing Object ${index + 1}: ${obj.name} ---`);
            console.log(`Object type: ${obj.constructor.name}`);
            console.log(`Is TransformNode: ${obj instanceof BABYLON.TransformNode}`);
            
            // Test 1: Object's own transforms
            console.log(`Object position:`, obj.position);
            console.log(`Object rotation:`, obj.rotation);
            console.log(`Object scaling:`, obj.scaling);
            
            // Test 2: World matrix
            const worldMatrix = obj.getWorldMatrix();
            console.log(`Object world matrix:`, worldMatrix);
            
            // Test 3: Child meshes (for TransformNodes)
            if (obj instanceof BABYLON.TransformNode) {
                const childMeshes = obj.getChildMeshes();
                console.log(`Child meshes count: ${childMeshes.length}`);
                
                childMeshes.forEach((child, childIndex) => {
                    console.log(`  Child ${childIndex + 1}: ${child.name}`);
                    console.log(`    Child position:`, child.position);
                    console.log(`    Child rotation:`, child.rotation);
                    console.log(`    Child scaling:`, child.scaling);
                    console.log(`    Child world position:`, child.getAbsolutePosition());
                    
                    // Test 4: Wireframe clone if exists
                    if (child.wireframeClone) {
                        console.log(`    Wireframe clone exists: ${child.wireframeClone.name}`);
                        console.log(`    Wireframe position:`, child.wireframeClone.position);
                        console.log(`    Wireframe rotation:`, child.wireframeClone.rotation);
                        console.log(`    Wireframe scaling:`, child.wireframeClone.scaling);
                        console.log(`    Wireframe parent:`, child.wireframeClone.parent ? child.wireframeClone.parent.name : 'none');
                        
                        // Test 5: Rotation comparison
                        const rotationDiff = child.rotation.subtract(child.wireframeClone.rotation);
                        console.log(`    Rotation difference:`, rotationDiff);
                        console.log(`    Rotation difference magnitude:`, rotationDiff.length());
                        
                        // Test 6: Position comparison
                        const positionDiff = child.getAbsolutePosition().subtract(child.wireframeClone.getAbsolutePosition());
                        console.log(`    Position difference:`, positionDiff);
                        console.log(`    Position difference magnitude:`, positionDiff.length());
                    } else {
                        console.log(`    No wireframe clone found`);
                    }
                });
            } else {
                // Test 4: Regular mesh wireframe
                if (obj.wireframeClone) {
                    console.log(`Wireframe clone exists: ${obj.wireframeClone.name}`);
                    console.log(`Wireframe position:`, obj.wireframeClone.position);
                    console.log(`Wireframe rotation:`, obj.wireframeClone.rotation);
                    console.log(`Wireframe scaling:`, obj.wireframeClone.scaling);
                    
                    // Test 5: Rotation comparison
                    const rotationDiff = obj.rotation.subtract(obj.wireframeClone.rotation);
                    console.log(`Rotation difference:`, rotationDiff);
                    console.log(`Rotation difference magnitude:`, rotationDiff.length());
                } else {
                    console.log(`No wireframe clone found`);
                }
            }
            
            // Test 7: Scene mesh analysis
            const scene = this.scene;
            const relatedMeshes = scene.meshes.filter(mesh => 
                mesh.name && mesh.name.includes(obj.name.replace('tree_', '').replace('simple_tree_', ''))
            );
            console.log(`Related meshes in scene: ${relatedMeshes.length}`);
            relatedMeshes.forEach(mesh => {
                console.log(`  Related mesh: ${mesh.name} (parent: ${mesh.parent ? mesh.parent.name : 'none'})`);
            });
        });
        
        console.log("\n=== WIREFRAME ROTATION TEST END ===");
    }

    /**
     * Test transform tools wireframe behavior
     */
    testTransformToolsWireframe() {
        console.log("=== TRANSFORM TOOLS WIREFRAME TEST START ===");
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected for transform testing");
            return;
        }

        selectedObjects.forEach((obj, index) => {
            console.log(`\n--- Transform Test Object ${index + 1}: ${obj.name} ---`);
            
            // Test before transform
            console.log("BEFORE TRANSFORM:");
            this.logObjectTransforms(obj);
            
            // Simulate a small rotation
            const originalRotation = obj.rotation.clone();
            obj.rotation.y += 0.1; // Small rotation
            
            console.log("AFTER ROTATION:");
            this.logObjectTransforms(obj);
            
            // Update wireframes
            this.updateWireframeTransforms(obj);
            
            console.log("AFTER WIREFRAME UPDATE:");
            this.logObjectTransforms(obj);
            
            // Restore original rotation
            obj.rotation = originalRotation;
            this.updateWireframeTransforms(obj);
            
            console.log("AFTER RESTORE:");
            this.logObjectTransforms(obj);
        });
        
        console.log("\n=== TRANSFORM TOOLS WIREFRAME TEST END ===");
    }

    /**
     * Helper function to log object transforms
     */
    logObjectTransforms(obj) {
        console.log(`  Object ${obj.name}:`);
        console.log(`    Position:`, obj.position);
        console.log(`    Rotation:`, obj.rotation);
        console.log(`    Scaling:`, obj.scaling);
        
        if (obj instanceof BABYLON.TransformNode) {
            const childMeshes = obj.getChildMeshes();
            childMeshes.forEach((child, index) => {
                console.log(`    Child ${index + 1} ${child.name}:`);
                console.log(`      Position:`, child.position);
                console.log(`      Rotation:`, child.rotation);
                console.log(`      Scaling:`, child.scaling);
                
                if (child.wireframeClone) {
                    console.log(`      Wireframe Position:`, child.wireframeClone.position);
                    console.log(`      Wireframe Rotation:`, child.wireframeClone.rotation);
                    console.log(`      Wireframe Scaling:`, child.wireframeClone.scaling);
                    
                    // Calculate differences
                    const posDiff = child.getAbsolutePosition().subtract(child.wireframeClone.getAbsolutePosition());
                    const rotDiff = child.rotation.subtract(child.wireframeClone.rotation);
                    console.log(`      Position Diff:`, posDiff);
                    console.log(`      Rotation Diff:`, rotDiff);
                }
            });
        } else if (obj.wireframeClone) {
            console.log(`    Wireframe Position:`, obj.wireframeClone.position);
            console.log(`    Wireframe Rotation:`, obj.wireframeClone.rotation);
            console.log(`    Wireframe Scaling:`, obj.wireframeClone.scaling);
            
            // Calculate differences
            const posDiff = obj.getAbsolutePosition().subtract(obj.wireframeClone.getAbsolutePosition());
            const rotDiff = obj.rotation.subtract(obj.wireframeClone.rotation);
            console.log(`    Position Diff:`, posDiff);
            console.log(`    Rotation Diff:`, rotDiff);
        }
    }

    /**
     * Fix tree scaling issue - make Y scaling positive
     */
    fixTreeScaling() {
        console.log("=== FIXING TREE SCALING ===");
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected for scaling fix");
            return;
        }

        selectedObjects.forEach((obj, index) => {
            if (obj instanceof BABYLON.TransformNode) {
                console.log(`Fixing scaling for ${obj.name}:`);
                console.log(`Before:`, obj.scaling);
                
                // Make Y scaling positive if it's negative
                if (obj.scaling.y < 0) {
                    obj.scaling.y = Math.abs(obj.scaling.y);
                    console.log(`Fixed Y scaling to:`, obj.scaling.y);
                }
                
                console.log(`After:`, obj.scaling);
                
                // Update wireframes after fixing scaling
                this.updateWireframeTransforms(obj);
                
                // Test if child meshes are now found
                const childMeshes = obj.getChildMeshes();
                console.log(`Child meshes found after fix: ${childMeshes.length}`);
            }
        });
        
        console.log("=== SCALING FIX COMPLETE ===");
    }

    /**
     * Debug tree structure to understand why getChildMeshes() returns 0
     */
    debugTreeStructure() {
        console.log("=== DEBUGGING TREE STRUCTURE ===");
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected for structure debugging");
            return;
        }

        selectedObjects.forEach((obj, index) => {
            if (obj instanceof BABYLON.TransformNode) {
                console.log(`\n--- Debugging Tree: ${obj.name} ---`);
                
                // Method 1: getChildMeshes()
                const childMeshes1 = obj.getChildMeshes();
                console.log(`Method 1 - getChildMeshes(): ${childMeshes1.length} meshes`);
                
                // Method 2: Direct children check
                const directChildren = obj.getChildren();
                console.log(`Method 2 - getChildren(): ${directChildren.length} children`);
                directChildren.forEach((child, i) => {
                    console.log(`  Child ${i + 1}: ${child.name} (type: ${child.constructor.name})`);
                });
                
                // Method 3: Scene mesh filtering
                const scene = this.scene;
                const allMeshes = scene.meshes;
                console.log(`Method 3 - Total scene meshes: ${allMeshes.length}`);
                
                const meshesWithParents = allMeshes.filter(mesh => mesh.parent);
                console.log(`Meshes with parents: ${meshesWithParents.length}`);
                
                const treeMeshes = meshesWithParents.filter(mesh => 
                    mesh.parent && mesh.parent.name === obj.name
                );
                console.log(`Meshes with this tree as parent: ${treeMeshes.length}`);
                treeMeshes.forEach((mesh, i) => {
                    console.log(`  Tree mesh ${i + 1}: ${mesh.name} (type: ${mesh.constructor.name})`);
                });
                
                // Method 4: Check for meshes with similar names
                const similarNameMeshes = allMeshes.filter(mesh => 
                    mesh.name && mesh.name.includes(obj.name.replace('tree_', '').replace('simple_tree_', ''))
                );
                console.log(`Meshes with similar names: ${similarNameMeshes.length}`);
                similarNameMeshes.forEach((mesh, i) => {
                    console.log(`  Similar mesh ${i + 1}: ${mesh.name} (parent: ${mesh.parent ? mesh.parent.name : 'none'})`);
                });
                
                // Method 5: Check TransformNode properties
                console.log(`TransformNode properties:`);
                console.log(`  - hasGetChildMeshes: ${typeof obj.getChildMeshes === 'function'}`);
                console.log(`  - hasGetChildren: ${typeof obj.getChildren === 'function'}`);
                console.log(`  - children: ${obj.children ? obj.children.length : 'undefined'}`);
                console.log(`  - _children: ${obj._children ? obj._children.length : 'undefined'}`);
                
                // Method 6: Check if meshes are actually in the scene
                const allMeshNames = allMeshes.map(m => m.name).filter(name => name);
                const treeRelatedNames = allMeshNames.filter(name => 
                    name.includes('4_') || name.includes('tree_')
                );
                console.log(`All tree-related mesh names:`, treeRelatedNames);
            }
        });
        
        console.log("\n=== TREE STRUCTURE DEBUG COMPLETE ===");
    }

    /**
     * Find all tree meshes in the scene
     */
    findTreeMeshes() {
        console.log("=== FINDING ALL TREE MESHES ===");
        
        const scene = this.scene;
        const allMeshes = scene.meshes;
        
        console.log(`Total meshes in scene: ${allMeshes.length}`);
        
        // Find all meshes with "tree" in their name
        const treeMeshes = allMeshes.filter(mesh => 
            mesh.name && mesh.name.toLowerCase().includes('tree')
        );
        
        console.log(`Tree-related meshes: ${treeMeshes.length}`);
        treeMeshes.forEach((mesh, i) => {
            console.log(`  Tree mesh ${i + 1}: ${mesh.name}`);
            console.log(`    Type: ${mesh.constructor.name}`);
            console.log(`    Parent: ${mesh.parent ? mesh.parent.name : 'none'}`);
            console.log(`    Position:`, mesh.position);
            console.log(`    Scaling:`, mesh.scaling);
            console.log(`    Enabled: ${mesh.isEnabled()}`);
            console.log(`    Visible: ${mesh.isVisible}`);
        });
        
        // Find all TransformNodes
        const transformNodes = scene.transformNodes;
        console.log(`\nTotal TransformNodes: ${transformNodes.length}`);
        transformNodes.forEach((node, i) => {
            console.log(`  TransformNode ${i + 1}: ${node.name}`);
            console.log(`    Children: ${node.getChildren().length}`);
            console.log(`    Child Meshes: ${node.getChildMeshes().length}`);
        });
        
        // Check if there are any meshes that should be children of our selected tree
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length > 0) {
            const selectedTree = selectedObjects[0];
            console.log(`\nSelected tree: ${selectedTree.name}`);
            
            // Look for meshes that might belong to this tree
            const potentialChildren = allMeshes.filter(mesh => 
                mesh.name && (
                    mesh.name.includes(selectedTree.name) ||
                    mesh.name.includes('4_') ||
                    mesh.name.includes('tree_4')
                )
            );
            
            console.log(`Potential children for ${selectedTree.name}: ${potentialChildren.length}`);
            potentialChildren.forEach((mesh, i) => {
                console.log(`  Potential child ${i + 1}: ${mesh.name}`);
                console.log(`    Parent: ${mesh.parent ? mesh.parent.name : 'none'}`);
                console.log(`    Should be child of: ${selectedTree.name}`);
            });
        }
        
        console.log("\n=== TREE MESH SEARCH COMPLETE ===");
    }

    /**
     * Select the correct TransformNode instead of the mesh
     */
    selectCorrectTree() {
        console.log("=== SELECTING CORRECT TREE ===");
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected");
            return;
        }

        const selectedMesh = selectedObjects[0];
        console.log(`Currently selected: ${selectedMesh.name} (type: ${selectedMesh.constructor.name})`);
        
        if (selectedMesh.parent && selectedMesh.parent instanceof BABYLON.TransformNode) {
            const correctTransformNode = selectedMesh.parent;
            console.log(`Found correct TransformNode: ${correctTransformNode.name}`);
            console.log(`Child meshes: ${correctTransformNode.getChildMeshes().length}`);
            
            // Clear current selection
            this.clearSelection();
            
            // Select the correct TransformNode
            this.selectObject(correctTransformNode);
            
            console.log(`Now selected: ${correctTransformNode.name}`);
            console.log("You can now run testWireframeRotation() to see the correct results!");
        } else {
            console.log("Selected object has no TransformNode parent");
        }
        
        console.log("=== CORRECT TREE SELECTION COMPLETE ===");
    }

    /**
     * Automatically select TransformNode when a tree mesh is selected
     */
    autoSelectTransformNode() {
        console.log("=== AUTO SELECTING TRANSFORM NODE ===");
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected");
            return;
        }

        const selectedMesh = selectedObjects[0];
        console.log(`Currently selected: ${selectedMesh.name} (type: ${selectedMesh.constructor.name})`);
        
        // If it's a mesh with a TransformNode parent, select the parent instead
        if (selectedMesh.parent && selectedMesh.parent instanceof BABYLON.TransformNode) {
            const transformNode = selectedMesh.parent;
            console.log(`Found TransformNode parent: ${transformNode.name}`);
            
            // Clear current selection
            this.clearSelection();
            
            // Select the TransformNode
            this.selectObject(transformNode);
            
            console.log(`Now selected TransformNode: ${transformNode.name}`);
        } else {
            console.log("Selected object has no TransformNode parent");
        }
        
        console.log("=== AUTO SELECTION COMPLETE ===");
    }

    /**
     * Test different rotation values quickly
     */
    testRotation(degrees) {
        console.log(`=== TESTING ROTATION: ${degrees} DEGREES ===`);
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected");
            return;
        }

        const obj = selectedObjects[0];
        if (obj instanceof BABYLON.TransformNode && obj.wireframeClones) {
            const childMeshes = obj.getChildMeshes();
            childMeshes.forEach(childMesh => {
                if (childMesh.wireframeClone) {
                    const radians = (degrees * Math.PI) / 180;
                    childMesh.wireframeClone.rotation = new BABYLON.Vector3(radians, 0, 0);
                    console.log(`Set wireframe rotation to: ${degrees} degrees (${radians} radians)`);
                }
            });
        }
        
        console.log("=== ROTATION TEST COMPLETE ===");
    }

    /**
     * Recreate wireframe with correct rotation
     */
    recreateWireframe() {
        console.log("=== RECREATING WIREFRAME ===");
        
        const selectedObjects = this.getSelectedObjects();
        if (selectedObjects.length === 0) {
            console.log("No objects selected");
            return;
        }

        const obj = selectedObjects[0];
        if (obj instanceof BABYLON.TransformNode) {
            // Remove existing wireframes
            this.removeHighlight(obj);
            
            // Recreate wireframes
            this.highlightTransformNode(obj);
            
            console.log("Wireframe recreated");
        }
        
        console.log("=== WIREFRAME RECREATION COMPLETE ===");
    }


    /**
     * Get currently selected objects
     */
    getSelectedObjects() {
        // Filter out extrusions that are parented to another selected object
        // This prevents duplicate selection when both parent and child are selected
        const filtered = this.selectedObjects.filter(obj => {
            // If this is an extrusion with a parent
            if (obj.name && obj.name.includes('_extrusion') && obj.parent) {
                // Check if the parent is also in selectedObjects
                const parentIsSelected = this.selectedObjects.includes(obj.parent);
                // If parent is selected, exclude this extrusion (it's handled by parent)
                if (parentIsSelected) {
                    return false;
                }
            }
            return true;
        });
        return filtered;
    }

    /**
     * Check if an object is selected
     */
    isSelected(mesh) {
        return this.selectedObjects.includes(mesh);
    }

    /**
     * Get selection count
     */
    getSelectionCount() {
        return this.selectedObjects.length;
    }

    /**
     * Select all 3D models except ground
     */
    selectAll() {
        // Clear previous selection first (without calling onSelectionChanged)
        this.selectedObjects.forEach(mesh => {
            this.removeHighlight(mesh);
        });
        this.selectedObjects = [];
        
        // Find all selectable meshes using the same logic as isSelectable
        // This includes buildings, trees, 2D shapes, polygons, ground, grass, waterway, highway, and imported STL objects
        const selectableMeshes = this.scene.meshes.filter(mesh => {
            return mesh.name && 
                   !mesh.isDisposed() &&
                   !mesh.name.includes('_wireframe') && // Exclude wireframe clones
                   !mesh.name.includes('_edge_wireframe') && // Exclude edge wireframe clones
                   mesh.name !== 'ground' && // Exclude default ground mesh
                   (
                       // Buildings (new format: building1, building2, ...)
                       (mesh.name.startsWith('building') && /^\d+$/.test(mesh.name.substring(8))) ||
                       // Ground, grass, waterway, highway (new format: ground1, grass1, waterway1, highway1, ...)
                       (mesh.name.startsWith('ground') && /^\d+$/.test(mesh.name.substring(6))) ||
                       (mesh.name.startsWith('waterway') && /^\d+$/.test(mesh.name.substring(8))) ||
                       (mesh.name.startsWith('highway') && /^\d+$/.test(mesh.name.substring(7))) ||
                       (mesh.name.startsWith('grass') && /^\d+$/.test(mesh.name.substring(5))) ||
                       // Trees (both old format with underscore and new format without)
                       mesh.name.startsWith('tree_') || // Include tree parent nodes (old format)
                       (mesh.name.startsWith('tree') && /^\d+$/.test(mesh.name.substring(4))) || // Include tree parent nodes (new format: tree1, tree2, ...)
                       mesh.name.includes('_tree_') || // Include tree meshes
                       mesh.name.startsWith('simple_tree_') || // Include simple tree meshes (old format)
                       (mesh.name.startsWith('simple_tree') && /^\d+$/.test(mesh.name.substring(11))) || // Include simple tree meshes (new format)
                       // 2D shapes
                       mesh.name.includes('rectangle') ||
                       mesh.name.includes('circle') ||
                       mesh.name.includes('triangle') ||
                       mesh.name.includes('text') ||
                       mesh.name.includes('polygon') ||
                       mesh.name.startsWith('polyline') ||
                       mesh.name.startsWith('line') ||
                       mesh.name.includes('_extrusion') || // Include extrusion meshes
                       // Include by userData (for shapes created via managers)
                       (mesh.userData && mesh.userData.shapeType === 'circle') ||
                       (mesh.userData && mesh.userData.shapeType === 'building') || // Include all buildings (both rectangular and circular)
                       (mesh.userData && mesh.userData.shapeType === 'rectangle') ||
                       // Include imported STL objects (including STL trees)
                       (mesh.userData && mesh.userData.isImportedSTL)
                   );
        });
        
        // Also include TransformNodes that are STL objects or trees
        const selectableTransformNodes = this.scene.transformNodes.filter(transformNode => {
            return transformNode.name && 
                   !transformNode.isDisposed() &&
                   (
                       // Regular trees (TransformNodes)
                       transformNode.name.startsWith('tree_') ||
                       (transformNode.name.startsWith('tree') && /^\d+$/.test(transformNode.name.substring(4))) ||
                       // STL trees stored as TransformNodes
                       (transformNode.userData && transformNode.userData.isImportedSTL)
                   );
        });
        
        // Add all selectable meshes to selection
        selectableMeshes.forEach(mesh => {
            this.selectedObjects.push(mesh);
            this.highlightObject(mesh);
        });
        
        // Add all selectable TransformNodes to selection
        selectableTransformNodes.forEach(transformNode => {
            this.selectedObjects.push(transformNode);
            this.highlightObject(transformNode);
        });
        
        // Notify that selection has changed (only once at the end)
        this.onSelectionChanged();
    }

    /**
     * Callback when selection changes
     */
    onSelectionChanged() {
        
        // Dispatch custom event
        const event = new CustomEvent('selectionChanged', {
            detail: {
                selectedObjects: this.getSelectedObjects(),
                count: this.getSelectionCount()
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Test method to verify selection manager is working
     */
    testSelection() {
        
        // Find all building meshes
        const buildingMeshes = this.scene.meshes.filter(mesh => 
            mesh.name && mesh.name.startsWith('building') && /^\d+$/.test(mesh.name.substring(8))
        );
        
        if (buildingMeshes.length > 0) {
            this.selectObject(buildingMeshes[0], false);
        }
    }

    /**
     * Dispose of the selection manager
     */
    dispose() {
        this.clearSelection();
        
        if (this.edgeWireframeMaterial) {
            this.edgeWireframeMaterial.dispose();
        }
        if (this.highlightMaterial) {
            this.highlightMaterial.dispose();
        }
        if (this.outlineMaterial) {
            this.outlineMaterial.dispose();
        }
    }
}
