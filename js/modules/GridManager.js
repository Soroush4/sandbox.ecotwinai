/**
 * GridManager - Manages the grid display in the scene
 */
class GridManager {
    constructor(scene) {
        this.scene = scene;
        this.grid = null;
        this.isVisible = false; // Grid is hidden by default
        
        this.createGrid();
    }

    /**
     * Create the grid with infinite/extremely large size
     */
    createGrid() {
        // Create grid material
        const gridMaterial = new BABYLON.StandardMaterial("gridMaterial", this.scene);
        gridMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        gridMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        gridMaterial.alpha = 0.8;
        gridMaterial.wireframe = true;

        // Create extremely large grid mesh (effectively infinite for practical purposes)
        // Using 50000 units (50km) which should cover any reasonable zoom out distance
        // Subdivisions are kept reasonable to maintain performance
        const gridSize = 50000; // 50km - effectively infinite for most use cases
        const gridSubdivisions = 500; // More subdivisions for better grid detail at large scale
        
        this.grid = BABYLON.MeshBuilder.CreateGround("grid", {
            width: gridSize,
            height: gridSize,
            subdivisions: gridSubdivisions
        }, this.scene);

        this.grid.material = gridMaterial;
        this.grid.position.y = 0.01; // Slightly above ground to avoid z-fighting
        this.grid.isPickable = false;
        // IMPORTANT: Enable shadow receiving for grid
        this.grid.receiveShadows = true;
        // Set rendering priority to lowest (grid)
        this.grid.renderingGroupId = SceneManager.getRenderingGroupId('grid');
        this.grid.setEnabled(this.isVisible); // Set initial visibility
        
        // console.log(`Created infinite grid: ${gridSize}x${gridSize} units (${gridSize/1000}km)`);
    }

    /**
     * Toggle grid visibility
     */
    toggle() {
        this.isVisible = !this.isVisible;
        if (this.grid) {
            this.grid.setEnabled(this.isVisible);
        }
        return this.isVisible;
    }

    /**
     * Show grid
     */
    show() {
        this.isVisible = true;
        if (this.grid) {
            this.grid.setEnabled(true);
        }
    }

    /**
     * Hide grid
     */
    hide() {
        this.isVisible = false;
        if (this.grid) {
            this.grid.setEnabled(false);
        }
    }

    /**
     * Set grid visibility
     */
    setVisible(visible) {
        this.isVisible = visible;
        if (this.grid) {
            this.grid.setEnabled(visible);
        }
    }

    /**
     * Get grid visibility state
     */
    isGridVisible() {
        return this.isVisible;
    }

    /**
     * Update grid properties
     * @param {number} size - Grid size in units (default: 50000 for infinite-like grid)
     * @param {number} subdivisions - Number of subdivisions (default: 500 for large grids)
     */
    updateGrid(size = 50000, subdivisions = 500) {
        if (this.grid) {
            this.grid.dispose();
        }
        
        // Create new grid with updated properties
        const gridMaterial = new BABYLON.StandardMaterial("gridMaterial", this.scene);
        gridMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        gridMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        gridMaterial.alpha = 0.8;
        gridMaterial.wireframe = true;

        // Ensure minimum size for infinite-like behavior
        const gridSize = Math.max(size, 50000);
        // Adjust subdivisions based on size to maintain reasonable detail
        const gridSubdivisions = Math.min(subdivisions, Math.max(500, Math.floor(gridSize / 100)));

        this.grid = BABYLON.MeshBuilder.CreateGround("grid", {
            width: gridSize,
            height: gridSize,
            subdivisions: gridSubdivisions
        }, this.scene);

        this.grid.material = gridMaterial;
        this.grid.position.y = 0.01;
        this.grid.isPickable = false;
        // IMPORTANT: Enable shadow receiving for grid
        this.grid.receiveShadows = true;
        // Set rendering priority to lowest (grid)
        this.grid.renderingGroupId = SceneManager.getRenderingGroupId('grid');
        this.grid.setEnabled(this.isVisible);
        
        console.log(`Updated grid: ${gridSize}x${gridSize} units (${gridSize/1000}km) with ${gridSubdivisions} subdivisions`);
    }

    /**
     * Dispose of the grid
     */
    dispose() {
        if (this.grid) {
            this.grid.dispose();
            this.grid = null;
        }
    }
}
