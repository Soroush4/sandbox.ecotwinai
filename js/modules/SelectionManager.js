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
        
        this.setupHighlightMaterial();
        this.setupEventListeners();
    }

    /**
     * Setup highlight material for selected objects
     */
    setupHighlightMaterial() {
        // Create highlight material (no wireframe)
        this.highlightMaterial = new BABYLON.StandardMaterial("highlightMaterial", this.scene);
        this.highlightMaterial.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1.0); // Blue highlight
        this.highlightMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.3, 0.5);
        this.highlightMaterial.specularColor = new BABYLON.Color3(0.5, 0.5, 0.5);
        this.highlightMaterial.alpha = 0.8;
        this.highlightMaterial.wireframe = false; // No wireframe

        // Create outline material (no wireframe)
        this.outlineMaterial = new BABYLON.StandardMaterial("outlineMaterial", this.scene);
        this.outlineMaterial.diffuseColor = new BABYLON.Color3(0, 0.8, 1.0); // Bright blue outline
        this.outlineMaterial.emissiveColor = new BABYLON.Color3(0, 0.4, 0.5);
        this.outlineMaterial.wireframe = false; // No wireframe
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

        // Perform raycast
        const pickResult = this.scene.pick(x, y, (mesh) => {
            // Select building meshes, 2D shapes, and extrusions, not ground or other utility meshes
            return mesh.name && (
                mesh.name.startsWith('building_') ||
                mesh.name.includes('rectangle') ||
                mesh.name.includes('circle') ||
                mesh.name.includes('triangle') ||
                mesh.name.includes('text') ||
                mesh.name.includes('polygon') ||
                mesh.name.startsWith('polyline') ||
                mesh.name.startsWith('line') ||
                mesh.name.includes('_extrusion') // Include extrusion meshes
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
        this.selectedObjects.forEach(mesh => {
            this.removeHighlight(mesh);
        });
        this.selectedObjects = [];
        this.onSelectionChanged();
    }

    /**
     * Highlight an object
     */
    highlightObject(mesh) {
        
        // Always store current material as original (in case it was changed)
        this.originalMaterials.set(mesh, mesh.material);

        // Apply highlight material
        mesh.material = this.highlightMaterial;
    }

    /**
     * Remove highlight from an object
     */
    removeHighlight(mesh) {
        
        // Restore original material
        const originalMaterial = this.originalMaterials.get(mesh);
        if (originalMaterial) {
            mesh.material = originalMaterial;
            this.originalMaterials.delete(mesh);
        }
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
     * Select all building objects
     */
    selectAll() {
        this.clearSelection();
        
        // Find all building meshes
        const buildingMeshes = this.scene.meshes.filter(mesh => 
            mesh.name && mesh.name.startsWith('building_')
        );
        
        buildingMeshes.forEach(mesh => {
            this.selectedObjects.push(mesh);
            this.highlightObject(mesh);
        });
        
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
        
        if (this.highlightMaterial) {
            this.highlightMaterial.dispose();
        }
        if (this.outlineMaterial) {
            this.outlineMaterial.dispose();
        }
    }
}
