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
        
        for (const treeType of treeTypes) {
            try {
                const model = await this.loadTreeModel(`assets/Models/Trees/${treeType}.glb`);
                this.treeModels.set(treeType, model);
            } catch (error) {
                // console.error(`Failed to load tree model ${treeType}:`, error);
            }
        }
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

        // Remove from selection manager
        if (this.selectionManager) {
            this.selectionManager.removeSelectableObject(tree.parent);
        }

        // Dispose all meshes
        tree.meshes.forEach(mesh => {
            if (mesh.material) {
                mesh.material.dispose();
            }
            mesh.dispose();
        });

        // Dispose parent
        tree.parent.dispose();

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
        this.trees.forEach(tree => {
            this.removeTree(tree);
        });
        this.trees = [];
        // console.log('All trees cleared');
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
     * Dispose of tree manager
     */
    dispose() {
        this.clearAllTrees();
        this.treeModels.clear();
    }
}
