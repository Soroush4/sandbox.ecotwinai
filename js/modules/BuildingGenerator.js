/**
 * BuildingGenerator - Generates random buildings in the scene
 */
class BuildingGenerator {
    constructor(scene) {
        this.scene = scene;
        this.buildings = [];
        this.buildingCount = 10;
        this.minHeight = 4;
        this.maxHeight = 20;
        this.groundSize = 100;
        this.buildingSpacing = 8; // Minimum distance between buildings
    }

    /**
     * Generate random buildings
     */
    generateBuildings(count = null, minHeight = null, maxHeight = null) {
        // Use provided parameters or defaults
        const numBuildings = count || this.buildingCount;
        const minH = minHeight || this.minHeight;
        const maxH = maxHeight || this.maxHeight;

        // Clear existing buildings
        this.clearBuildings();

        // Generate building positions
        const positions = this.generateBuildingPositions(numBuildings);

        // Create buildings
        for (let i = 0; i < numBuildings; i++) {
            const building = this.createBuilding(positions[i], minH, maxH);
            this.buildings.push(building);
        }

        return this.buildings;
    }

    /**
     * Generate valid building positions
     */
    generateBuildingPositions(count) {
        const positions = [];
        const maxAttempts = count * 10; // Prevent infinite loops
        let attempts = 0;

        while (positions.length < count && attempts < maxAttempts) {
            const x = (Math.random() - 0.5) * (this.groundSize - 10);
            const z = (Math.random() - 0.5) * (this.groundSize - 10);
            
            // Check if position is valid (not too close to other buildings)
            if (this.isValidPosition(x, z, positions)) {
                positions.push({ x, z });
            }
            attempts++;
        }

        // If we couldn't place all buildings, place them anyway
        while (positions.length < count) {
            const x = (Math.random() - 0.5) * (this.groundSize - 10);
            const z = (Math.random() - 0.5) * (this.groundSize - 10);
            positions.push({ x, z });
        }

        return positions;
    }

    /**
     * Check if a position is valid (not too close to other buildings)
     */
    isValidPosition(x, z, existingPositions) {
        for (const pos of existingPositions) {
            const distance = Math.sqrt((x - pos.x) ** 2 + (z - pos.z) ** 2);
            if (distance < this.buildingSpacing) {
                return false;
            }
        }
        return true;
    }

    /**
     * Create a single building
     */
    createBuilding(position, minHeight, maxHeight) {
        // Random dimensions
        const width = 2 + Math.random() * 4; // 2-6 meters
        const depth = 2 + Math.random() * 4; // 2-6 meters
        const height = minHeight + Math.random() * (maxHeight - minHeight);

        // Create building mesh
        const building = BABYLON.MeshBuilder.CreateBox(`building_${this.buildings.length}`, {
            width: width,
            height: height,
            depth: depth
        }, this.scene);

        // Position building
        building.position.x = position.x;
        building.position.y = height / 2; // Center on ground
        building.position.z = position.z;

        // Set higher rendering priority than ground
        building.renderingGroupId = 1;

        // Create building material
        const material = this.createBuildingMaterial(height);

        // Apply material
        building.material = material;

        // Enable shadows
        building.receiveShadows = true;
        building.castShadows = true;

        // Add some variation with rotation
        building.rotation.y = Math.random() * Math.PI / 4; // Random rotation up to 45 degrees

        return {
            mesh: building,
            width: width,
            depth: depth,
            height: height,
            position: position
        };
    }

    /**
     * Create building material - simple white boxes
     */
    createBuildingMaterial(height) {
        const material = new BABYLON.StandardMaterial(`buildingMaterial_${this.buildings.length}`, this.scene);
        
        // White color for all buildings
        material.diffuseColor = new BABYLON.Color3(1, 1, 1); // Pure white
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.roughness = 0.7;

        // No texture - just solid white color

        return material;
    }

    /**
     * Create solid white texture
     */
    createSolidWhiteTexture() {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Solid white color
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, 64, 64);

        return new BABYLON.Texture(canvas.toDataURL(), this.scene);
    }

    /**
     * Clear all buildings
     */
    clearBuildings() {
        this.buildings.forEach(building => {
            if (building.mesh) {
                this.scene.removeMesh(building.mesh);
                building.mesh.dispose();
            }
        });
        this.buildings = [];
    }

    /**
     * Set building parameters
     */
    setParameters(count, minHeight, maxHeight) {
        this.buildingCount = count;
        this.minHeight = minHeight;
        this.maxHeight = maxHeight;
    }

    /**
     * Get building statistics
     */
    getStats() {
        return {
            count: this.buildings.length,
            totalHeight: this.buildings.reduce((sum, b) => sum + b.height, 0),
            averageHeight: this.buildings.length > 0 ? 
                this.buildings.reduce((sum, b) => sum + b.height, 0) / this.buildings.length : 0
        };
    }

    /**
     * Get all buildings
     */
    getBuildings() {
        return this.buildings;
    }
}
