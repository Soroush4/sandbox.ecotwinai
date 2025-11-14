/**
 * TreeManager - Manages tree placement and 3D model loading
 */
class TreeManager {
    constructor(scene, selectionManager, lightingManager = null) {
        this.scene = scene;
        this.selectionManager = selectionManager;
        this.lightingManager = lightingManager;
        this.trees = [];
        this.treeModels = new Map();
        this.isPlacingTree = false;
        this.selectedTreeType = null;
        this.treeCounter = 0;
        
        // Height parameters for random tree scaling
        this.minHeight = 5;
        this.maxHeight = 10;
        
        // Distance parameter for tree placement
        this.treeDistance = 2;
        
        this.init();
    }

    /**
     * Initialize tree manager
     */
    async init() {
        await this.loadTreeModels();
    }

    /**
     * Load all tree models
     */
    async loadTreeModels() {
        const treeTypes = ['1', '2', '3', '4'];
        
        console.log('Loading tree models...');
        for (const treeType of treeTypes) {
            try {
                const model = await this.loadTreeModel(`assets/Models/Trees/${treeType}.glb`);
                this.treeModels.set(treeType, model);
                console.log(`✓ Successfully loaded tree model: ${treeType}.glb`);
            } catch (error) {
                console.error(`✗ Failed to load tree model ${treeType}.glb:`, error);
            }
        }
        console.log(`Tree models loaded: ${this.treeModels.size} out of ${treeTypes.length}`);
        console.log(`Loaded types:`, Array.from(this.treeModels.keys()));
    }

    /**
     * Load a single tree model
     */
    async loadTreeModel(path) {
        return new Promise((resolve, reject) => {
            BABYLON.SceneLoader.ImportMeshAsync("", "", path, this.scene)
                .then((result) => {
                    result.meshes.forEach((mesh, index) => {
                        mesh.setEnabled(false);
                    });
                    resolve(result);
                })
                .catch((error) => {
                    // console.error(`Error loading tree model from ${path}:`, error);
                    reject(error);
                });
        });
    }

    /**
     * Start tree placement mode
     */
    startTreePlacement(treeType) {
        if (!this.treeModels.has(treeType)) {
            // console.error(`Tree model ${treeType} not loaded`);
            return;
        }

        this.isPlacingTree = true;
        this.selectedTreeType = treeType;
    }

    /**
     * Stop tree placement mode
     */
    stopTreePlacement() {
        this.isPlacingTree = false;
        this.selectedTreeType = null;
    }

    /**
     * Place a tree at the specified position with a random type
     * This method is used for automatic tree generation (e.g., on polygons)
     */
    placeTreeAtPosition(position, treeSize = null) {
        // All available tree types (1, 2, 3, 4)
        const allTreeTypes = ['1', '2', '3', '4'];
        
        // Get available tree types that are actually loaded
        const loadedTypes = Array.from(this.treeModels.keys());
        
        // Debug: log loaded types
        console.log(`Loaded tree types:`, loadedTypes);
        console.log(`Total loaded models:`, this.treeModels.size);
        
        // Filter to only use types that are actually loaded
        const availableTypes = allTreeTypes.filter(type => this.treeModels.has(type));
        
        if (availableTypes.length === 0) {
            // No models loaded, use simple tree
            console.log(`No tree models loaded, using simple tree as fallback`);
            return this.createSimpleTree(position);
        }
        
        // Randomly select a tree type from available loaded types
        const randomIndex = Math.floor(Math.random() * availableTypes.length);
        const randomType = availableTypes[randomIndex];
        
        console.log(`Placing tree of type ${randomType} (selected from ${availableTypes.length} available types: ${availableTypes.join(', ')}) at position:`, position);
        
        // Temporarily set tree type and placement mode
        const originalIsPlacing = this.isPlacingTree;
        const originalSelectedType = this.selectedTreeType;
        
        this.isPlacingTree = true;
        this.selectedTreeType = randomType;
        
        // Temporarily set height parameters if treeSize is provided
        const originalMinHeight = this.minHeight;
        const originalMaxHeight = this.maxHeight;
        
        if (treeSize !== null) {
            this.minHeight = treeSize;
            this.maxHeight = treeSize;
        }
        
        // Place the tree
        const treeData = this.placeTree(position);
        
        // Restore original state
        this.isPlacingTree = originalIsPlacing;
        this.selectedTreeType = originalSelectedType;
        this.minHeight = originalMinHeight;
        this.maxHeight = originalMaxHeight;
        
        return treeData;
    }

    /**
     * Place a tree at the specified position
     */
    placeTree(position) {
        if (!this.isPlacingTree || !this.selectedTreeType) {
            return null;
        }

        const treeModel = this.treeModels.get(this.selectedTreeType);
        if (!treeModel) {
            // console.error(`Tree model ${this.selectedTreeType} not found, creating simple tree instead`);
            return this.createSimpleTree(position);
        }

        try {
            // Clone the tree model
            const clonedMeshes = [];
            treeModel.meshes.forEach(mesh => {
                if (mesh.name !== '__root__') {
                    const clonedMesh = mesh.clone(`${mesh.name}_tree_${this.treeCounter}`);
                    clonedMesh.setEnabled(true);
                    
                    // Clone the material to avoid sharing material references
                    if (clonedMesh.material) {
                        const originalMaterial = clonedMesh.material;
                        const clonedMaterial = originalMaterial.clone(`${originalMaterial.name}_tree_${this.treeCounter}`);
                        clonedMesh.material = clonedMaterial;
                    }
                    
                    clonedMeshes.push(clonedMesh);
                }
            });

            // Create a parent mesh to group all tree parts
            const treeName = `tree_${this.selectedTreeType}_${this.treeCounter}`;
            const treeParent = new BABYLON.TransformNode(treeName, this.scene);
            treeParent.position = position.clone();

            // Parent all cloned meshes to the tree parent
            clonedMeshes.forEach(mesh => {
                mesh.setParent(treeParent);
                // Reset local position to 0,0,0 since parent handles positioning
                mesh.position = BABYLON.Vector3.Zero();
                // Set same rendering priority as buildings
                mesh.renderingGroupId = 1;
                // Enable shadows - trees should both cast and receive shadows
                mesh.receiveShadows = true;
                mesh.castShadows = true;
            });

            // Add random rotation around Y axis (vertical)
            treeParent.rotation.y = this.getRandomTreeRotation();
            
            // Add random height scale based on min/max height parameters (uniform on all axes)
            const randomHeightScale = this.getRandomTreeHeightScale();
            treeParent.scaling = new BABYLON.Vector3(randomHeightScale/3, randomHeightScale/3, randomHeightScale/3);

            // Store tree reference
            const treeData = {
                id: this.treeCounter,
                type: this.selectedTreeType,
                parent: treeParent,
                meshes: clonedMeshes,
                position: position.clone()
            };

            this.trees.push(treeData);
            this.treeCounter++;

            // Make tree selectable
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(treeParent);
            }

            // Dispatch scene change event
            this.dispatchSceneChangeEvent();

            // Add tree to shadow system
            if (this.lightingManager) {
                clonedMeshes.forEach(mesh => {
                    this.lightingManager.updateShadowsForNewObject(mesh);
                });
            }

            // console.log(`Tree uniform scale:`, randomHeightScale);
            // console.log(`Cloned meshes count:`, clonedMeshes.length);
            return treeData;

        } catch (error) {
            // console.error('Error placing tree:', error);
            return this.createSimpleTree(position);
        }
    }

    /**
     * Create a simple tree as fallback
     */
    createSimpleTree(position) {
        try {
            const treeName = `simple_tree_${this.selectedTreeType}_${this.treeCounter}`;
            
            // Create tree trunk (cylinder)
            const trunk = BABYLON.MeshBuilder.CreateCylinder(`${treeName}_trunk`, {
                height: 2,
                diameter: 0.3
            }, this.scene);
            
            // Create tree leaves (sphere)
            const leaves = BABYLON.MeshBuilder.CreateSphere(`${treeName}_leaves`, {
                diameter: 3
            }, this.scene);
            
            // Position the tree
            trunk.position = position.clone();
            leaves.position = position.clone();
            leaves.position.y += 1.5; // Leaves above trunk
            
            // Create materials
            const trunkMaterial = new BABYLON.StandardMaterial(`${treeName}_trunk_material`, this.scene);
            trunkMaterial.diffuseColor = new BABYLON.Color3(0.4, 0.2, 0.1); // Brown
            trunk.material = trunkMaterial;
            
            const leavesMaterial = new BABYLON.StandardMaterial(`${treeName}_leaves_material`, this.scene);
            leavesMaterial.diffuseColor = new BABYLON.Color3(0.1, 0.6, 0.1); // Green
            leaves.material = leavesMaterial;
            
            // Set same rendering priority as buildings
            trunk.renderingGroupId = 1;
            leaves.renderingGroupId = 1;
            
            // Enable shadows - trees should both cast and receive shadows
            trunk.receiveShadows = true;
            trunk.castShadows = true;
            leaves.receiveShadows = true;
            leaves.castShadows = true;
            
            // Create parent node
            const treeParent = new BABYLON.TransformNode(treeName, this.scene);
            treeParent.position = position.clone();
            
            // Add random rotation around Y axis (vertical)
            treeParent.rotation.y = this.getRandomTreeRotation();
            
            // Add random height scale based on min/max height parameters (uniform on all axes)
            const randomHeightScale = this.getRandomTreeHeightScale();
            treeParent.scaling = new BABYLON.Vector3(randomHeightScale/3, randomHeightScale/3, randomHeightScale/3);
            
            // Parent meshes to tree
            trunk.setParent(treeParent);
            leaves.setParent(treeParent);
            
            // Reset local positions
            trunk.position = BABYLON.Vector3.Zero();
            leaves.position = new BABYLON.Vector3(0, 1.5, 0);
            
            // Store tree reference
            const treeData = {
                id: this.treeCounter,
                type: this.selectedTreeType,
                parent: treeParent,
                meshes: [trunk, leaves],
                position: position.clone()
            };

            this.trees.push(treeData);
            this.treeCounter++;

            // Make tree selectable
            if (this.selectionManager) {
                this.selectionManager.addSelectableObject(treeParent);
            }

            // Add tree to shadow system
            if (this.lightingManager) {
                this.lightingManager.updateShadowsForNewObject(trunk);
                this.lightingManager.updateShadowsForNewObject(leaves);
            }

            // console.log(`Simple tree created at position:`, position);
            // console.log(`Simple tree rotation:`, treeParent.rotation.y, 'radians');
            // console.log(`Simple tree uniform scale:`, randomHeightScale);
            return treeData;
            
        } catch (error) {
            // console.error('Error creating simple tree:', error);
            return null;
        }
    }

    /**
     * Remove a tree
     */
    removeTree(tree) {
        if (!tree) return;

        // Remove from selection manager first
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(tree.parent);
        }

        // Remove all meshes from scene and dispose them
        if (tree.meshes && tree.meshes.length > 0) {
            tree.meshes.forEach(mesh => {
                if (mesh && !mesh.isDisposed()) {
                    // Remove from scene first
                    this.scene.removeMesh(mesh);
                    
                    // Dispose the material only if it's not shared with other meshes
                    if (mesh.material) {
                        // Check if this material is used by other meshes in the scene
                        const isMaterialShared = this.scene.meshes.some(otherMesh => 
                            otherMesh !== mesh && 
                            otherMesh.material === mesh.material &&
                            !otherMesh.isDisposed()
                        );
                        
                        // Only dispose the material if it's not shared
                        if (!isMaterialShared) {
                            mesh.material.dispose();
                        }
                    }
                    
                    // Dispose the mesh
                    mesh.dispose();
                }
            });
        }

        // Remove parent TransformNode from scene and dispose it
        if (tree.parent && !tree.parent.isDisposed()) {
            // Remove from scene
            this.scene.removeTransformNode(tree.parent);
            
            // Dispose parent
            tree.parent.dispose();
        }

        // Remove from trees array
        const index = this.trees.indexOf(tree);
        if (index > -1) {
            this.trees.splice(index, 1);
        }

        // console.log(`Tree removed: ${tree.parent.name}`);
    }

    /**
     * Clear all trees
     */
    clearAllTrees() {
        // Create a copy of the trees array to avoid issues during iteration
        const treesToRemove = [...this.trees];
        
        // Remove each tree
        treesToRemove.forEach(tree => {
            this.removeTree(tree);
        });
        
        // Clear the trees array
        this.trees = [];
        
        // Also find and remove any remaining tree meshes or TransformNodes from the scene
        // This is a safety measure in case some trees weren't properly tracked
        const scene = this.scene;
        if (scene) {
            // Find all TransformNodes with tree names
            const treeTransformNodes = scene.transformNodes.filter(node => 
                node.name && (node.name.startsWith('tree_') || node.name.startsWith('simple_tree_'))
            );
            
            treeTransformNodes.forEach(node => {
                // Get child meshes
                const childMeshes = node.getChildMeshes();
                childMeshes.forEach(mesh => {
                    if (mesh && !mesh.isDisposed()) {
                        scene.removeMesh(mesh);
                        if (mesh.material && !mesh.material.isDisposed()) {
                            mesh.material.dispose();
                        }
                        mesh.dispose();
                    }
                });
                
                // Remove and dispose the TransformNode
                if (!node.isDisposed()) {
                    scene.removeTransformNode(node);
                    node.dispose();
                }
            });
            
            // Also find any orphaned tree meshes (meshes with tree names but no parent)
            const orphanedTreeMeshes = scene.meshes.filter(mesh => 
                mesh.name && 
                (mesh.name.startsWith('tree_') || mesh.name.includes('_tree_') || mesh.name.startsWith('simple_tree_')) &&
                !mesh.isDisposed()
            );
            
            orphanedTreeMeshes.forEach(mesh => {
                scene.removeMesh(mesh);
                if (mesh.material && !mesh.material.isDisposed()) {
                    mesh.material.dispose();
                }
                mesh.dispose();
            });
        }
        
        console.log(`Cleared all trees from scene (removed ${treesToRemove.length} tracked trees)`);
    }

    /**
     * Get tree statistics
     */
    getStats() {
        return {
            totalTrees: this.trees.length,
            treeTypes: Array.from(this.treeModels.keys()),
            loadedModels: this.treeModels.size
        };
    }

    /**
     * Check if currently placing trees
     */
    isCurrentlyPlacing() {
        return this.isPlacingTree;
    }

    /**
     * Get current tree type
     */
    getCurrentTreeType() {
        return this.selectedTreeType;
    }

    /**
     * Get random rotation for trees
     */
    getRandomTreeRotation() {
        return Math.random() * Math.PI * 2; // 0 to 2π radians (0 to 360 degrees)
    }

    /**
     * Get random scale for trees (90% to 110%)
     */
    getRandomTreeScale() {
        return 0.9 + Math.random() * 0.2; // 0.9 to 1.1 (90% to 110%)
    }

    /**
     * Get random height scale for trees based on min/max height parameters
     */
    getRandomTreeHeightScale() {
        // Convert to numbers to ensure proper comparison
        const min = parseFloat(this.minHeight);
        const max = parseFloat(this.maxHeight);
        
        // If min and max are equal, always return the max value
        if (min === max) {
            console.log(`Min and max are equal, returning:`, max);
            return max;
        }
        
        // Generate random value between min and max
        else{
        const h = min + Math.random() * (max - min);
        console.log(`Random tree height scale ${min} and ${max}:`, h);
        return h;
        }
    }

    /**
     * Set height parameters for tree generation
     */
    setHeightParameters(minHeight, maxHeight) {
        // Ensure minHeight is not greater than maxHeight
        if (minHeight > maxHeight) {
            [minHeight, maxHeight] = [maxHeight, minHeight];
        }
        
        this.minHeight =  minHeight; // Minimum 0.1
        this.maxHeight =  maxHeight; // Maximum 3.0
        
        // console.log(`Tree height parameters updated: min=${this.minHeight}, max=${this.maxHeight}`);
    }

    /**
     * Get current height parameters
     */
    getHeightParameters() {
        return {
            minHeight: this.minHeight,
            maxHeight: this.maxHeight
        };
    }

    /**
     * Get random distance with ±10% variation
     */
    getRandomTreeDistance() {
        const variation = this.treeDistance * 0.1; // 10% variation
        return this.treeDistance + (Math.random() - 0.5) * 2 * variation;
    }

    /**
     * Set tree distance parameter
     */
    setTreeDistance(distance) {
        this.treeDistance = Math.max(0.1, Math.min(50, distance)); // Clamp between 0.1 and 50
        console.log(`Tree distance parameter updated: ${this.treeDistance}`);
    }

    /**
     * Get current tree distance
     */
    getTreeDistance() {
        return this.treeDistance;
    }

    /**
     * Test tree placement - creates a simple tree at origin
     */
    testTreePlacement() {
        // console.log('Testing tree placement...');
        this.selectedTreeType = '1';
        this.isPlacingTree = true;
        const testPosition = new BABYLON.Vector3(0, 0, 0);
        const result = this.placeTree(testPosition);
        this.isPlacingTree = false;
        this.selectedTreeType = null;
        return result;
    }

    /**
     * Dispatch scene change event
     */
    dispatchSceneChangeEvent() {
        const event = new CustomEvent('sceneChanged', {
            detail: {
                trees: this.trees
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Debug method to check material sharing between trees
     */
    debugMaterialSharing() {
        console.log('=== TREE MATERIAL SHARING DEBUG ===');
        
        const materialUsage = new Map();
        
        // Count material usage across all meshes
        this.scene.meshes.forEach(mesh => {
            if (mesh.material && mesh.name && mesh.name.includes('tree')) {
                const materialId = mesh.material.uniqueId || mesh.material.name;
                if (!materialUsage.has(materialId)) {
                    materialUsage.set(materialId, []);
                }
                materialUsage.get(materialId).push(mesh.name);
            }
        });
        
        console.log('Material usage analysis:');
        materialUsage.forEach((meshes, materialId) => {
            console.log(`Material ${materialId}: used by ${meshes.length} meshes`);
            if (meshes.length > 1) {
                console.log(`  Shared by: ${meshes.join(', ')}`);
            }
        });
        
        return materialUsage;
    }

    /**
     * Dispose of tree manager
     */
    dispose() {
        this.clearAllTrees();
        this.treeModels.clear();
    }
}
