/**
 * SelectionManager - Manages object selection in the 3D scene
 */
class SelectionManager {
    constructor(scene, camera, canvas) {
        this.scene = scene;
        this.camera = camera;
        this.canvas = canvas;
        
        this.selectedObjects = [];
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
        
        this.setupHighlightMaterial();
        this.setupEventListeners();
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
        edgeMaterial.backFaceCulling = false;
        edgeMaterial.cullBackFaces = false;
        
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
        if (object && !this.selectableObjects) {
            this.selectableObjects = [];
        }
        
        if (object && this.selectableObjects && !this.selectableObjects.includes(object)) {
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
            // Select building meshes, 2D shapes, extrusions, and trees, not ground or other utility meshes
            // Exclude wireframe clones from selection
            return mesh.name && 
                   !mesh.name.includes('_wireframe') && // Exclude wireframe clones
                   !mesh.name.includes('_edge_wireframe') && // Exclude edge wireframe clones
                   (
                       mesh.name.startsWith('building_') ||
                       mesh.name.includes('rectangle') ||
                       mesh.name.includes('circle') ||
                       mesh.name.includes('triangle') ||
                       mesh.name.includes('text') ||
                       mesh.name.includes('polygon') ||
                       mesh.name.startsWith('polyline') ||
                       mesh.name.startsWith('line') ||
                       mesh.name.includes('_extrusion') || // Include extrusion meshes
                       mesh.name.startsWith('tree_') || // Include tree parent nodes
                       mesh.name.includes('_tree_') || // Include tree meshes
                       mesh.name.startsWith('simple_tree_') // Include simple tree meshes
                   );
        });

        if (pickResult.hit) {
            
            // If extrusion is selected, select the parent shape instead
            let selectedObject = pickResult.pickedMesh;
            if (selectedObject.name.includes('_extrusion')) {
                // Find the parent shape
                const baseShapeName = selectedObject.name.replace('_extrusion', '');
                const baseShape = this.scene.getMeshByName(baseShapeName);
                if (baseShape) {
                    selectedObject = baseShape;
                }
            }
            
            // Handle double-click: zoom to extent
            if (isDoubleClick) {
                console.log(`Double-click detected on: ${selectedObject.name}`);
                console.log(`Selected object type:`, selectedObject.constructor.name);
                this.zoomToMeshExtent(selectedObject);
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
            console.log(`Found original mesh: ${originalName} from wireframe: ${wireframeMesh.name}`);
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
                console.log(`Using original mesh for zoom: ${originalMesh.name}`);
                return originalMesh;
            }
        }
        
        // For tree parent nodes, get the actual child meshes
        if (mesh.name && mesh.name.startsWith('tree_') && mesh.getChildMeshes) {
            const childMeshes = mesh.getChildMeshes();
            if (childMeshes.length > 0) {
                // Return the parent node but we'll use child meshes for bounding calculation
                return mesh;
            }
        }
        
        // For other meshes, return as-is
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
            console.log(`Attempting to zoom to mesh: ${mesh.name}`);
            console.log(`Mesh type:`, mesh.constructor.name);
            console.log(`Mesh position:`, mesh.position);
            
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
        
        // Clear previous selection if not in multi-select mode
        if (!isMultiSelect) {
            this.clearSelection();
        }

        // Add to selection if not already selected
        if (!this.selectedObjects.includes(mesh)) {
            this.selectedObjects.push(mesh);
            this.highlightObject(mesh);
            
            // If this is a 2D shape with extrusion and includeExtrusion is true, also select the extrusion
            if (includeExtrusion && mesh.extrusion && !this.selectedObjects.includes(mesh.extrusion)) {
                this.selectedObjects.push(mesh.extrusion);
                this.highlightObject(mesh.extrusion);
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
        console.log(`Clearing selection of ${this.selectedObjects.length} objects`);
        this.selectedObjects.forEach(mesh => {
            this.removeHighlight(mesh);
        });
        this.selectedObjects = [];
        this.onSelectionChanged();
        console.log('Selection cleared');
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
     * Highlight an object with edge-only wireframe overlay (dual rendering)
     */
    highlightObject(mesh) {
        if (!mesh) {
            console.warn('Cannot highlight: mesh is null or undefined');
            return;
        }
        
        // Don't create wireframe if one already exists
        if (mesh.wireframeClone) {
            console.log(`Wireframe already exists for ${mesh.name}, skipping`);
            return;
        }
        
        // Store current material as original
        this.originalMaterials.set(mesh, mesh.material);

        // Create an edge wireframe clone of the mesh
        const wireframeClone = mesh.clone(`${mesh.name}_edge_wireframe`);
        
        // Apply edge-only wireframe shader to the clone
        const edgeWireframeMaterial = this.edgeWireframeMaterial.clone(`edge_wireframe_${mesh.name}`);
        wireframeClone.material = edgeWireframeMaterial;
        
        // Set the wireframe clone to render in a different rendering group
        wireframeClone.renderingGroupId = mesh.renderingGroupId + 1;
        
        // Make the wireframe clone slightly larger to ensure it's visible
        wireframeClone.scaling = mesh.scaling.multiply(new BABYLON.Vector3(1.001, 1.001, 1.001));
        
        // Store the wireframe clone reference
        mesh.wireframeClone = wireframeClone;
        
        console.log(`Created wireframe for ${mesh.name}`);
    }

    /**
     * Remove highlight from an object
     */
    removeHighlight(mesh) {
        if (!mesh) {
            console.warn('Cannot remove highlight: mesh is null or undefined');
            return;
        }
        
        console.log(`Removing highlight from ${mesh.name}`);
        
        // Remove wireframe clone if it exists
        if (mesh.wireframeClone) {
            console.log(`Disposing wireframe clone for ${mesh.name}`);
            // Dispose of the wireframe clone's material
            if (mesh.wireframeClone.material) {
                mesh.wireframeClone.material.dispose();
            }
            // Dispose of the wireframe clone mesh
            mesh.wireframeClone.dispose();
            mesh.wireframeClone = null;
        }
        
        // Restore original material (the original mesh material should already be correct)
        const originalMaterial = this.originalMaterials.get(mesh);
        if (originalMaterial) {
            mesh.material = originalMaterial;
            this.originalMaterials.delete(mesh);
        }
        
        console.log(`Highlight removed from ${mesh.name}`);
    }


    /**
     * Get currently selected objects
     */
    getSelectedObjects() {
        return [...this.selectedObjects];
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
        
        // Find all selectable meshes (buildings, trees, 2D shapes, polygons, etc.) but exclude ground
        const selectableMeshes = this.scene.meshes.filter(mesh => {
            return mesh.name && 
                   !mesh.name.includes('_wireframe') && // Exclude wireframe clones
                   !mesh.name.includes('_edge_wireframe') && // Exclude edge wireframe clones
                   mesh.name !== 'ground' && // Exclude ground
                   (
                       mesh.name.startsWith('building_') ||
                       mesh.name.includes('rectangle') ||
                       mesh.name.includes('circle') ||
                       mesh.name.includes('triangle') ||
                       mesh.name.includes('text') ||
                       mesh.name.includes('polygon') ||
                       mesh.name.startsWith('polyline') ||
                       mesh.name.startsWith('line') ||
                       mesh.name.includes('_extrusion') || // Include extrusion meshes
                       mesh.name.startsWith('tree_') || // Include tree parent nodes
                       mesh.name.includes('_tree_') || // Include tree meshes
                       mesh.name.startsWith('simple_tree_') // Include simple tree meshes
                   );
        });
        
        // Add all selectable meshes to selection
        selectableMeshes.forEach(mesh => {
            this.selectedObjects.push(mesh);
            this.highlightObject(mesh);
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
            mesh.name && mesh.name.startsWith('building_')
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
