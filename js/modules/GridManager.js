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
     * Create the grid
     */
    createGrid() {
        // Create grid material
        const gridMaterial = new BABYLON.StandardMaterial("gridMaterial", this.scene);
        gridMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        gridMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        gridMaterial.alpha = 0.8;
        gridMaterial.wireframe = true;

        // Create grid mesh
        this.grid = BABYLON.MeshBuilder.CreateGround("grid", {
            width: 100,
            height: 100,
            subdivisions: 50
        }, this.scene);

        this.grid.material = gridMaterial;
        this.grid.position.y = 0.01; // Slightly above ground to avoid z-fighting
        this.grid.isPickable = false;
        this.grid.setEnabled(this.isVisible); // Set initial visibility
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
     */
    updateGrid(size = 100, subdivisions = 50) {
        if (this.grid) {
            this.grid.dispose();
        }
        
        // Create new grid with updated properties
        const gridMaterial = new BABYLON.StandardMaterial("gridMaterial", this.scene);
        gridMaterial.diffuseColor = new BABYLON.Color3(0.3, 0.3, 0.3);
        gridMaterial.emissiveColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        gridMaterial.alpha = 0.8;
        gridMaterial.wireframe = true;

        this.grid = BABYLON.MeshBuilder.CreateGround("grid", {
            width: size,
            height: size,
            subdivisions: subdivisions
        }, this.scene);

        this.grid.material = gridMaterial;
        this.grid.position.y = 0.01;
        this.grid.isPickable = false;
        this.grid.setEnabled(this.isVisible);
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
