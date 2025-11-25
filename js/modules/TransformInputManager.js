/**
 * TransformInputManager - Manages transform input fields (position, rotation, scale)
 */
class TransformInputManager {
    constructor(uiManager, sceneManager, selectionManager) {
        this.uiManager = uiManager;
        this.sceneManager = sceneManager;
        this.selectionManager = selectionManager;
        
        this.isUpdatingFromInput = false;
        this.lastTransforms = new Map();
        
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for transform input fields
     */
    setupEventListeners() {
        const transformX = document.getElementById('transformX');
        const transformY = document.getElementById('transformY');
        const transformZ = document.getElementById('transformZ');
        
        if (!transformX || !transformY || !transformZ) {
            console.warn('Transform input fields not found');
            return;
        }

        // Listen for input changes - update object transform
        transformX.addEventListener('input', () => {
            this.handleTransformInputChange('x', parseFloat(transformX.value) || 0);
        });
        
        transformY.addEventListener('input', () => {
            this.handleTransformInputChange('y', parseFloat(transformY.value) || 0);
        });
        
        transformZ.addEventListener('input', () => {
            this.handleTransformInputChange('z', parseFloat(transformZ.value) || 0);
        });

        // Listen for transform changes from gizmos via scene render loop
        const scene = this.sceneManager.getScene();
        
        // Check transform changes in render loop
        scene.onBeforeRenderObservable.add(() => {
            if (this.isTransformEditingToolActive() && this.selectionManager && !this.isUpdatingFromInput) {
                const selectedObjects = this.selectionManager.getSelectedObjects();
                if (selectedObjects.length === 1) {
                    const obj = selectedObjects[0];
                    const activeTool = this.getActiveTransformTool();
                    
                    // Get current transform values based on active tool
                    let currentTransform;
                    if (activeTool === 'move') {
                        currentTransform = obj.position;
                    } else if (activeTool === 'rotate') {
                        currentTransform = obj.rotation;
                    } else if (activeTool === 'scale') {
                        currentTransform = obj.scaling;
                    } else {
                        currentTransform = obj.position;
                    }
                    
                    const lastTransform = this.lastTransforms.get(obj);
                    
                    // Check if transform changed significantly
                    if (!lastTransform || 
                        Math.abs(currentTransform.x - lastTransform.x) > 0.01 ||
                        Math.abs(currentTransform.y - lastTransform.y) > 0.01 ||
                        Math.abs(currentTransform.z - lastTransform.z) > 0.01) {
                        this.updateValues();
                        this.lastTransforms.set(obj, currentTransform.clone());
                    }
                } else {
                    // Clear last transforms if selection changed
                    this.lastTransforms.clear();
                }
            }
        });
    }

    /**
     * Update transform input fields visibility based on active transform tool
     */
    updateVisibility() {
        const transformInputPanel = document.getElementById('transformInputPanel');
        if (!transformInputPanel) return;

        // Only show fields for move, rotate, scale tools (not select or drawing tools)
        const isTransformEditingToolActive = this.isTransformEditingToolActive();
        
        if (isTransformEditingToolActive) {
            transformInputPanel.style.display = 'flex';
            // Update values if object is selected
            this.updateValues();
        } else {
            transformInputPanel.style.display = 'none';
        }
    }

    /**
     * Update transform input fields values from selected object transform
     */
    updateValues() {
        if (this.isUpdatingFromInput) return;
        
        const transformX = document.getElementById('transformX');
        const transformY = document.getElementById('transformY');
        const transformZ = document.getElementById('transformZ');
        
        if (!transformX || !transformY || !transformZ) return;

        if (!this.selectionManager) return;
        
        const selectedObjects = this.selectionManager.getSelectedObjects();
        
        if (selectedObjects.length === 1) {
            const obj = selectedObjects[0];
            const activeTool = this.getActiveTransformTool();
            
            // For trees, if obj is a child mesh, get position/rotation/scale from TransformNode parent
            let targetObj = obj;
            if (obj instanceof BABYLON.Mesh && obj.parent instanceof BABYLON.TransformNode) {
                const parentName = obj.parent.name.toLowerCase();
                const isOldTreeName = parentName.includes('tree_') || parentName.includes('simple_tree_');
                const isNewTreeName = /^tree\d+$/.test(parentName);
                
                if (isOldTreeName || isNewTreeName) {
                    // Use parent TransformNode for tree meshes
                    targetObj = obj.parent;
                    console.log(`[UpdateTransformFields] Using tree parent TransformNode: ${targetObj.name}`);
                }
            }
            
            let x, y, z;
            
            if (activeTool === 'move') {
                // Position values - for TransformNodes, position is already in world space
                // For child meshes of trees, we need to get position from parent TransformNode
                x = targetObj.position.x;
                y = targetObj.position.y;
                z = targetObj.position.z;
                console.log(`[UpdateTransformFields] Position for ${targetObj.name}:`, { x, y, z });
            } else if (activeTool === 'rotate') {
                // Rotation values (convert from radians to degrees)
                x = targetObj.rotation.x * (180 / Math.PI);
                y = targetObj.rotation.y * (180 / Math.PI);
                z = targetObj.rotation.z * (180 / Math.PI);
            } else if (activeTool === 'scale') {
                // Scale values
                x = targetObj.scaling.x;
                y = targetObj.scaling.y;
                z = targetObj.scaling.z;
            } else {
                // Default to position
                x = targetObj.position.x;
                y = targetObj.position.y;
                z = targetObj.position.z;
            }
            
            // Round to 2 decimal places
            transformX.value = Math.round(x * 100) / 100;
            transformY.value = Math.round(y * 100) / 100;
            transformZ.value = Math.round(z * 100) / 100;
        } else if (selectedObjects.length > 1) {
            // For multiple objects, leave empty
            transformX.value = '';
            transformY.value = '';
            transformZ.value = '';
        } else {
            // No selection - clear fields
            transformX.value = '';
            transformY.value = '';
            transformZ.value = '';
        }
    }

    /**
     * Handle transform input field change - update object transform
     */
    handleTransformInputChange(axis, value) {
        if (!this.selectionManager) return;
        
        const selectedObjects = this.selectionManager.getSelectedObjects();
        if (selectedObjects.length !== 1) return;

        const obj = selectedObjects[0];
        const activeTool = this.getActiveTransformTool();
        
        // Set flag to prevent circular update
        this.isUpdatingFromInput = true;
        
        // Update transform based on active tool and axis
        if (activeTool === 'move') {
            // Update position
            if (axis === 'x') {
                obj.position.x = value;
            } else if (axis === 'y') {
                obj.position.y = value;
            } else if (axis === 'z') {
                obj.position.z = value;
            }
        } else if (activeTool === 'rotate') {
            // Update rotation (convert from degrees to radians)
            const radians = value * (Math.PI / 180);
            if (axis === 'x') {
                obj.rotation.x = radians;
            } else if (axis === 'y') {
                obj.rotation.y = radians;
            } else if (axis === 'z') {
                obj.rotation.z = radians;
            }
        } else if (activeTool === 'scale') {
            // Update scale
            if (axis === 'x') {
                obj.scaling.x = value;
            } else if (axis === 'y') {
                obj.scaling.y = value;
            } else if (axis === 'z') {
                obj.scaling.z = value;
            }
        } else {
            // Default to position
            if (axis === 'x') {
                obj.position.x = value;
            } else if (axis === 'y') {
                obj.position.y = value;
            } else if (axis === 'z') {
                obj.position.z = value;
            }
        }
        
        // Update wireframe if exists
        if (this.selectionManager) {
            this.selectionManager.updateWireframeTransforms(obj);
        }
        
        // Reset flag after a short delay
        setTimeout(() => {
            this.isUpdatingFromInput = false;
        }, 100);
    }

    /**
     * Check if a transform editing tool is active (move, rotate, scale - excluding select)
     */
    isTransformEditingToolActive() {
        // Delegated to ToolManager via uiManager
        if (this.uiManager && this.uiManager.toolManager) {
            return this.uiManager.toolManager.isTransformEditingToolActive();
        }
        // Fallback if ToolManager not available
        const activeTool = document.querySelector('#transformPanel .tool-item.active');
        if (!activeTool) return false;
        
        const toolName = activeTool.getAttribute('data-tool');
        return ['move', 'rotate', 'scale'].includes(toolName);
    }

    /**
     * Get active transform tool
     */
    getActiveTransformTool() {
        // Delegated to ToolManager via uiManager
        if (this.uiManager && this.uiManager.toolManager) {
            return this.uiManager.toolManager.getActiveTransformTool();
        }
        // Fallback if ToolManager not available
        const activeTool = document.querySelector('#transformPanel .tool-item.active:not([data-tool="coordinate-toggle"])');
        if (activeTool) {
            return activeTool.getAttribute('data-tool');
        }
        return 'select';
    }
}

