/**
 * BuildingGenerator - Generates random buildings in the scene
 */
class BuildingGenerator {
    constructor(scene, rectangleManager = null, polygonManager = null, uiManager = null, treeManager = null, circleManager = null) {
        this.scene = scene;
        this.rectangleManager = rectangleManager;
        this.polygonManager = polygonManager;
        this.uiManager = uiManager;
        this.treeManager = treeManager;
        this.circleManager = circleManager;
        this.buildings = [];
        this.roads = []; // Store road meshes
        this.polygons = []; // Store polygon meshes
        this.buildingCount = 70;
        this.minHeight = 5; // Minimum height: 5 meters
        this.maxHeight = 35; // Maximum height: 35 meters
        this.minWidth = 10; // Minimum width: 10 meters
        this.maxWidth = 20; // Maximum width: 20 meters
        this.minDepth = 10; // Minimum depth: 10 meters
        this.maxDepth = 20; // Maximum depth: 20 meters
        this.groundSize = 500; // Large ground size for drawing
        this.centerAreaSize = 100; // Smaller area for building placement near center
        this.buildingSpacing = 25; // Minimum distance between buildings (increased for better spacing)
        
        // Road parameters
        this.minRoadWidth = 8; // Minimum road width: 8 meters
        this.maxRoadWidth = 12; // Maximum road width: 12 meters
        this.minRoadSpacing = 30; // Minimum distance between parallel roads: 30 meters
        this.maxRoadSpacing = 60; // Maximum distance between parallel roads: 60 meters
        this.minRoadsX = 3; // Minimum roads in X direction
        this.maxRoadsX = 5; // Maximum roads in X direction
        this.minRoadsZ = 3; // Minimum roads in Z direction
        this.maxRoadsZ = 5; // Maximum roads in Z direction
    }

    /**
     * Generate random buildings
     */
    generateBuildings(count = null, minHeight = null, maxHeight = null, useLargeArea = false) {
        // Use provided parameters or defaults
        const numBuildings = count || this.buildingCount;
        const minH = minHeight || this.minHeight;
        const maxH = maxHeight || this.maxHeight;

        // Clear existing buildings, roads, and polygons
        this.clearBuildings();
        this.clearRoads();
        this.clearPolygons();
        
        // Also clean up any unwanted polygons (water_1 without type) before generating new ones
        this.cleanupUnwantedPolygons();

        // First, generate roads (perpendicular streets in X and Z directions)
        this.generateRoads();

        // Then, generate building positions in empty spaces between roads
        const positions = this.generateBuildingPositionsInEmptySpaces(numBuildings, minH, maxH);

        // Create buildings with collision checking
        const roadBoundaries = this.getRoadBoundaries();
        let createdCount = 0;
        let maxRetries = count * 10; // Maximum retries for collision-free placement
        let retryCount = 0;
        
        while (createdCount < count && retryCount < maxRetries) {
            // Generate random building dimensions
            const buildingWidth = this.minWidth + Math.random() * (this.maxWidth - this.minWidth);
            const buildingDepth = this.minDepth + Math.random() * (this.maxDepth - this.minDepth);
            
            // Generate random position
            const x = (Math.random() - 0.5) * (this.groundSize * 0.8);
            const z = (Math.random() - 0.5) * (this.groundSize * 0.8);
            
            // Check if position is valid (not colliding with roads or existing buildings)
            // Handle both cases: building can be a mesh directly or an object with .mesh property
            const existingBuildingPositions = this.buildings.map(b => {
                const mesh = (b && b.mesh) ? b.mesh : b;
                if (!mesh || !mesh.userData || !mesh.userData.dimensions) {
                    return null;
                }
                return {
                    x: mesh.position.x,
                    z: mesh.position.z,
                    width: mesh.userData.dimensions.width,
                    depth: mesh.userData.dimensions.depth
                };
            }).filter(pos => pos !== null);
            
            if (this.isValidBuildingPosition(x, z, buildingWidth, buildingDepth, roadBoundaries, existingBuildingPositions)) {
                // Create building
                const pos = { x, z, width: buildingWidth, depth: buildingDepth };
                const building = this.createBuilding(pos, minH, maxH, buildingWidth, buildingDepth);
                
                // Double-check collision after creation (in case of floating point issues)
                // building is an object with .mesh property
                const buildingMesh = building.mesh || building;
                if (buildingMesh && this.checkBuildingCollision(buildingMesh, roadBoundaries, this.buildings)) {
                    // Building collides, remove it and try again
                    console.log(`Building at (${x.toFixed(2)}, ${z.toFixed(2)}) collides, removing and retrying...`);
                    this.scene.removeMesh(buildingMesh);
                    if (buildingMesh.material) {
                        buildingMesh.material.dispose();
                    }
                    retryCount++;
                    continue;
                }
                
                // Ensure building has a valid type
                if (building && building.userData) {
                    if (!building.userData.type || building.userData.type === undefined || building.userData.type === null) {
                        building.userData.type = 'building';
                        console.warn(`Building ${building.name} had no type, set to 'building'`);
                    }
                }
                
                this.buildings.push(building);
                createdCount++;
            } else {
                retryCount++;
            }
        }
        
        console.log(`Created ${createdCount} buildings (attempted ${retryCount} times)`);

        // Generate polygons in empty spaces between roads
        this.generatePolygonsInEmptySpaces();
        
        // Clean up any unwanted polygons (water_1 without type) - call multiple times to ensure cleanup
        this.cleanupUnwantedPolygons();
        
        // Call cleanup again after a short delay to catch any that might have been created during polygon generation
        setTimeout(() => {
            this.cleanupUnwantedPolygons();
        }, 100);
        
        return this.buildings;
    }

    /**
     * Generate perpendicular roads in X and Z directions
     */
    generateRoads() {
        // Generate number of roads in each direction (3-5)
        const numRoadsX = this.minRoadsX + Math.floor(Math.random() * (this.maxRoadsX - this.minRoadsX + 1));
        const numRoadsZ = this.minRoadsZ + Math.floor(Math.random() * (this.maxRoadsZ - this.minRoadsZ + 1));

        // Calculate road positions
        const roadPositionsX = this.generateRoadPositions(numRoadsX, 'x');
        const roadPositionsZ = this.generateRoadPositions(numRoadsZ, 'z');

        // Create roads in X direction (parallel to X axis)
        roadPositionsX.forEach(zPos => {
            const roadWidth = this.minRoadWidth + Math.random() * (this.maxRoadWidth - this.minRoadWidth);
            const road = this.createRoad('x', zPos, roadWidth);
            if (road) {
                this.roads.push(road);
            }
        });

        // Create roads in Z direction (parallel to Z axis)
        roadPositionsZ.forEach(xPos => {
            const roadWidth = this.minRoadWidth + Math.random() * (this.maxRoadWidth - this.minRoadWidth);
            const road = this.createRoad('z', xPos, roadWidth);
            if (road) {
                this.roads.push(road);
            }
        });

        console.log(`Generated ${this.roads.length} roads (${numRoadsX} in X direction, ${numRoadsZ} in Z direction)`);
    }

    /**
     * Generate road positions with spacing between 30-60 meters
     */
    generateRoadPositions(count, direction) {
        const positions = [];
        const areaSize = this.groundSize * 0.8; // Use 80% of ground size
        const startPos = -areaSize / 2;
        
        // Calculate total spacing needed
        let totalSpacing = 0;
        for (let i = 0; i < count - 1; i++) {
            totalSpacing += this.minRoadSpacing + Math.random() * (this.maxRoadSpacing - this.minRoadSpacing);
        }
        
        // Distribute roads evenly with random spacing
        let currentPos = startPos + (areaSize - totalSpacing) / 2;
        positions.push(currentPos);
        
        for (let i = 1; i < count; i++) {
            const spacing = this.minRoadSpacing + Math.random() * (this.maxRoadSpacing - this.minRoadSpacing);
            currentPos += spacing;
            positions.push(currentPos);
        }
        
        return positions;
    }

    /**
     * Create a road rectangle
     */
    createRoad(direction, position, width) {
        if (!this.rectangleManager) {
            console.warn('RectangleManager not available, cannot create roads');
            return null;
        }

        const roadLength = this.groundSize * 0.9; // Road length (90% of ground size)
        const roadHeight = 0.05; // Very low height for roads
        
        let roadWidth, roadDepth, roadX, roadZ;
        
        if (direction === 'x') {
            // Road parallel to X axis (extends in X direction)
            roadWidth = roadLength;
            roadDepth = width;
            roadX = 0; // Center in X
            roadZ = position;
        } else {
            // Road parallel to Z axis (extends in Z direction)
            roadWidth = width;
            roadDepth = roadLength;
            roadX = position;
            roadZ = 0; // Center in Z
        }

        const roadPosition = new BABYLON.Vector3(roadX, roadHeight / 2, roadZ);
        const road = this.rectangleManager.createRectangle(
            roadWidth,
            roadDepth,
            roadPosition,
            null, // Use default color from UIManager
            roadHeight,
            'highway' // Type: highway
        );

        // Ensure road has a valid type
        if (road && road.userData) {
            if (!road.userData.type || road.userData.type === undefined || road.userData.type === null) {
                road.userData.type = 'highway';
                console.warn(`Road ${road.name} had no type, set to 'highway'`);
            }
        }

        return road;
    }

    /**
     * Generate building positions in empty spaces between roads
     */
    generateBuildingPositionsInEmptySpaces(count, minHeight, maxHeight) {
        const positions = [];
        const maxAttempts = count * 50; // Increased attempts for better placement
        let attempts = 0;
        
        // Get road boundaries with expanded margins (considering building dimensions)
        const roadBoundaries = this.getRoadBoundaries();
        
        while (positions.length < count && attempts < maxAttempts) {
            // Generate random building dimensions first
            const buildingWidth = this.minWidth + Math.random() * (this.maxWidth - this.minWidth);
            const buildingDepth = this.minDepth + Math.random() * (this.maxDepth - this.minDepth);
            
            // Generate random position
            const x = (Math.random() - 0.5) * (this.groundSize * 0.8);
            const z = (Math.random() - 0.5) * (this.groundSize * 0.8);
            
            // Check if position is valid (considering building dimensions and road boundaries)
            if (this.isValidBuildingPosition(x, z, buildingWidth, buildingDepth, roadBoundaries, positions)) {
                positions.push({ x, z, width: buildingWidth, depth: buildingDepth });
            }
            attempts++;
        }

        return positions;
    }

    /**
     * Get road boundaries for collision detection
     */
    getRoadBoundaries() {
        const boundaries = [];
        
        this.roads.forEach(road => {
            if (road && road.userData) {
                const dims = road.userData.dimensions;
                const pos = road.position;
                
                // Calculate road bounds
                const halfWidth = dims.width / 2;
                const halfDepth = dims.depth / 2;
                
                boundaries.push({
                    minX: pos.x - halfWidth,
                    maxX: pos.x + halfWidth,
                    minZ: pos.z - halfDepth,
                    maxZ: pos.z + halfDepth
                });
            }
        });
        
        return boundaries;
    }

    /**
     * Check if a building position is valid (not on roads, considering building dimensions)
     */
    isValidBuildingPosition(x, z, buildingWidth, buildingDepth, roadBoundaries, existingPositions) {
        // Calculate building bounds (considering building dimensions)
        const halfWidth = buildingWidth / 2;
        const halfDepth = buildingDepth / 2;
        const buildingMinX = x - halfWidth;
        const buildingMaxX = x + halfWidth;
        const buildingMinZ = z - halfDepth;
        const buildingMaxZ = z + halfDepth;
        
        // Check if building overlaps with any road (considering full building area)
        for (const boundary of roadBoundaries) {
            // Check if building rectangle overlaps with road rectangle
            if (!(buildingMaxX < boundary.minX || buildingMinX > boundary.maxX ||
                  buildingMaxZ < boundary.minZ || buildingMinZ > boundary.maxZ)) {
                return false; // Building overlaps with a road
            }
        }
        
        // Check if position is too close to other buildings (considering both building dimensions)
        for (const pos of existingPositions) {
            const otherHalfWidth = (pos.width || this.maxWidth) / 2;
            const otherHalfDepth = (pos.depth || this.maxDepth) / 2;
            
            // Calculate distance between building centers
            const centerDistanceX = Math.abs(x - pos.x);
            const centerDistanceZ = Math.abs(z - pos.z);
            
            // Calculate minimum required distance (half width + half depth + spacing)
            const minDistanceX = halfWidth + otherHalfWidth + this.buildingSpacing;
            const minDistanceZ = halfDepth + otherHalfDepth + this.buildingSpacing;
            
            // Check if buildings are too close
            if (centerDistanceX < minDistanceX && centerDistanceZ < minDistanceZ) {
                return false; // Buildings are too close
            }
        }
        
        return true;
    }
    
    /**
     * Check if a created building collides with roads or other buildings
     * @param {BABYLON.Mesh} building - The building mesh to check
     * @param {Array} roadBoundaries - Array of road boundary objects
     * @param {Array} existingBuildings - Array of existing building meshes
     * @returns {boolean} - True if building collides, false otherwise
     */
    checkBuildingCollision(building, roadBoundaries, existingBuildings) {
        if (!building || !building.userData || !building.userData.dimensions) {
            return false; // Invalid building, don't consider it as collision
        }
        
        const dims = building.userData.dimensions;
        const pos = building.position;
        const halfWidth = dims.width / 2;
        const halfDepth = dims.depth / 2;
        
        const buildingMinX = pos.x - halfWidth;
        const buildingMaxX = pos.x + halfWidth;
        const buildingMinZ = pos.z - halfDepth;
        const buildingMaxZ = pos.z + halfDepth;
        
        // Check collision with roads
        for (const boundary of roadBoundaries) {
            if (!(buildingMaxX < boundary.minX || buildingMinX > boundary.maxX ||
                  buildingMaxZ < boundary.minZ || buildingMinZ > boundary.maxZ)) {
                return true; // Building overlaps with a road
            }
        }
        
        // Check collision with other buildings
        for (const otherBuilding of existingBuildings) {
            // Handle both cases: building can be a mesh directly or an object with .mesh property
            let otherMesh = otherBuilding;
            if (otherBuilding && otherBuilding.mesh) {
                otherMesh = otherBuilding.mesh;
            }
            
            if (otherMesh === building) continue; // Skip self
            
            if (!otherMesh || !otherMesh.userData || !otherMesh.userData.dimensions) {
                continue; // Skip invalid buildings
            }
            
            const otherDims = otherMesh.userData.dimensions;
            const otherPos = otherMesh.position;
            const otherHalfWidth = otherDims.width / 2;
            const otherHalfDepth = otherDims.depth / 2;
            
            const otherMinX = otherPos.x - otherHalfWidth;
            const otherMaxX = otherPos.x + otherHalfWidth;
            const otherMinZ = otherPos.z - otherHalfDepth;
            const otherMaxZ = otherPos.z + otherHalfDepth;
            
            // Check if rectangles overlap
            if (!(buildingMaxX < otherMinX || buildingMinX > otherMaxX ||
                  buildingMaxZ < otherMinZ || buildingMinZ > otherMaxZ)) {
                return true; // Buildings overlap
            }
        }
        
        return false; // No collision
    }

    /**
     * Clear all roads
     */
    clearRoads() {
        this.roads.forEach(road => {
            if (road && road.dispose) {
                this.scene.removeMesh(road);
                road.dispose();
            }
        });
        this.roads = [];
    }

    /**
     * Generate polygons in empty spaces between roads
     */
    generatePolygonsInEmptySpaces() {
        if (!this.uiManager) {
            console.warn('UIManager not available, cannot create polygons');
            return;
        }

        // Get road boundaries
        const roadBoundaries = this.getRoadBoundaries();
        
        // Get building boundaries
        const buildingBoundaries = this.getBuildingBoundaries();
        
        // Define grid for empty space detection
        const gridSize = 20; // Grid cell size in meters
        const areaSize = this.groundSize * 0.8;
        const gridCellsX = Math.floor(areaSize / gridSize);
        const gridCellsZ = Math.floor(areaSize / gridSize);
        
        // Check each grid cell
        for (let i = 0; i < gridCellsX; i++) {
            for (let j = 0; j < gridCellsZ; j++) {
                const cellX = -areaSize / 2 + i * gridSize + gridSize / 2;
                const cellZ = -areaSize / 2 + j * gridSize + gridSize / 2;
                
                // Check if cell center is in empty space (not on road or building)
                if (this.isCellEmpty(cellX, cellZ, gridSize, roadBoundaries, buildingBoundaries)) {
                    // Randomly decide to create a polygon (70% chance)
                    if (Math.random() < 0.7) {
                        // Randomly select polygon type (ground, green, or waterway)
                        const types = ['ground', 'green', 'waterway'];
                        const type = types[Math.floor(Math.random() * types.length)];
                        
                        // Ensure type is valid before creating polygon
                        if (type && type !== undefined && type !== null) {
                            // Create polygon in this cell
                            this.createPolygonInCell(cellX, cellZ, gridSize, type);
                        } else {
                            console.warn('Invalid polygon type generated, skipping polygon creation');
                        }
                    }
                }
            }
        }
        
        console.log(`Generated ${this.polygons.length} polygons in empty spaces`);
    }

    /**
     * Check if a grid cell is empty (not on road or building)
     */
    isCellEmpty(cellX, cellZ, cellSize, roadBoundaries, buildingBoundaries) {
        const halfSize = cellSize / 2;
        const cellMinX = cellX - halfSize;
        const cellMaxX = cellX + halfSize;
        const cellMinZ = cellZ - halfSize;
        const cellMaxZ = cellZ + halfSize;
        
        // Check if cell overlaps with any road
        for (const boundary of roadBoundaries) {
            if (!(cellMaxX < boundary.minX || cellMinX > boundary.maxX ||
                  cellMaxZ < boundary.minZ || cellMinZ > boundary.maxZ)) {
                return false; // Cell overlaps with a road
            }
        }
        
        // Check if cell overlaps with any building
        for (const boundary of buildingBoundaries) {
            if (!(cellMaxX < boundary.minX || cellMinX > boundary.maxX ||
                  cellMaxZ < boundary.minZ || cellMinZ > boundary.maxZ)) {
                return false; // Cell overlaps with a building
            }
        }
        
        return true;
    }

    /**
     * Get building boundaries for collision detection
     */
    getBuildingBoundaries() {
        const boundaries = [];
        
        this.buildings.forEach(building => {
            if (building.mesh && building.mesh.userData) {
                const dims = building.mesh.userData.dimensions;
                const pos = building.mesh.position;
                
                // Calculate building bounds (considering rotation)
                const rotation = building.mesh.rotation.y || 0;
                const width = dims.width || building.width || this.maxWidth;
                const depth = dims.depth || building.depth || this.maxDepth;
                
                // For simplicity, use axis-aligned bounding box (may be slightly larger than actual)
                const halfWidth = Math.max(width, depth) / 2;
                const halfDepth = Math.max(width, depth) / 2;
                
                boundaries.push({
                    minX: pos.x - halfWidth,
                    maxX: pos.x + halfWidth,
                    minZ: pos.z - halfDepth,
                    maxZ: pos.z + halfDepth
                });
            }
        });
        
        return boundaries;
    }

    /**
     * Create a polygon in a grid cell
     */
    createPolygonInCell(cellX, cellZ, cellSize, type) {
        if (!this.uiManager) return;
        
        // Create a simple rectangular polygon (4 points)
        // Points must be in counter-clockwise order (when viewed from above) for correct normal direction
        const halfSize = cellSize * 0.4; // Use 80% of cell size to leave some margin
        const points = [
            new BABYLON.Vector3(cellX - halfSize, 0, cellZ - halfSize), // Bottom-left
            new BABYLON.Vector3(cellX - halfSize, 0, cellZ + halfSize), // Top-left
            new BABYLON.Vector3(cellX + halfSize, 0, cellZ + halfSize), // Top-right
            new BABYLON.Vector3(cellX + halfSize, 0, cellZ - halfSize)  // Bottom-right
        ];
        
        // Create material based on type
        const material = new BABYLON.StandardMaterial(`polygon_${type}_${this.polygons.length}`, this.scene);
        const color = this.uiManager.getColorByType(type);
        material.diffuseColor = color;
        material.backFaceCulling = false;
        material.twoSidedLighting = true;
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        material.roughness = 0.8;
        
        // Create userData
        const userData = {
            type: type,
            shapeType: 'polygon',
            dimensions: {
                width: halfSize * 2,
                depth: halfSize * 2,
                height: 0.1
            },
            originalHeight: 0.1,
            baseY: 0
        };
        
        // Generate unique name
        const polygonName = `polygon_${type}_${this.polygons.length + 1}`;
        
        // Create polygon mesh using UIManager (center will be calculated from points)
        this.uiManager.createPolygonMesh(polygonName, points, new BABYLON.Vector3(0, 0, 0), material, userData);
        
        // Store polygon reference and verify it was created correctly
        const polygonMesh = this.scene.getMeshByName(polygonName);
        if (polygonMesh) {
            // Ensure material is set correctly
            if (polygonMesh.material !== material) {
                polygonMesh.material = material;
            }
            
            // Ensure userData is set correctly and has a valid type
            if (!polygonMesh.userData || !polygonMesh.userData.type || polygonMesh.userData.type === undefined || polygonMesh.userData.type === null) {
                polygonMesh.userData = userData;
            } else if (polygonMesh.userData.type !== type) {
                // Update type if it doesn't match
                polygonMesh.userData.type = type;
            }
            
            // Final check: ensure type is valid
            if (!polygonMesh.userData.type || polygonMesh.userData.type === undefined || polygonMesh.userData.type === null) {
                polygonMesh.userData.type = 'ground'; // Default fallback
                console.warn(`Polygon ${polygonName} had no type, set to 'ground'`);
            }
            
            // Ensure name is correct
            if (polygonMesh.name !== polygonName) {
                polygonMesh.name = polygonName;
            }
            
            this.polygons.push(polygonMesh);
            console.log(`Created polygon: ${polygonName}, type: ${polygonMesh.userData.type}, color: R=${color.r.toFixed(2)}, G=${color.g.toFixed(2)}, B=${color.b.toFixed(2)}`);
            
            // Add trees on ground and green polygons (not on waterway)
            if ((type === 'ground' || type === 'green') && this.treeManager) {
                this.addTreesOnPolygon(polygonMesh, halfSize * 2);
            }
        } else {
            console.warn(`Failed to create polygon: ${polygonName}`);
        }
    }
    
    /**
     * Add trees on a polygon (ground or green)
     * @param {BABYLON.Mesh} polygon - The polygon mesh
     * @param {number} polygonSize - Size of the polygon (width/depth)
     */
    addTreesOnPolygon(polygon, polygonSize) {
        if (!this.treeManager || !polygon) return;
        
        // Random number of trees: 3 to 6
        const numTrees = 3 + Math.floor(Math.random() * 4); // 3, 4, 5, or 6
        
        // Tree size range: 2.5 to 5
        const minTreeSize = 2.5;
        const maxTreeSize = 5;
        
        // Get polygon center and bounds
        const polygonCenter = polygon.position.clone();
        const halfSize = polygonSize / 2;
        
        // Create trees randomly distributed on the polygon
        for (let i = 0; i < numTrees; i++) {
            // Random position within polygon bounds (with margin to avoid edges)
            const margin = halfSize * 0.2; // 20% margin from edges
            const randomX = polygonCenter.x + (Math.random() - 0.5) * (polygonSize - margin * 2);
            const randomZ = polygonCenter.z + (Math.random() - 0.5) * (polygonSize - margin * 2);
            
            // Tree position (on ground level)
            const treePosition = new BABYLON.Vector3(randomX, 0, randomZ);
            
            // Create tree with random size
            const treeSize = minTreeSize + Math.random() * (maxTreeSize - minTreeSize);
            
            // Use placeTreeAtPosition which uses models from assets and selects random type
            const treeData = this.treeManager.placeTreeAtPosition(treePosition, treeSize);
            
            // Override scaling if tree was created (to ensure exact size)
            if (treeData && treeData.parent) {
                // Scale tree to desired size (treeSize / 3 because placeTree uses /3 scaling)
                const scaleFactor = treeSize / 3;
                treeData.parent.scaling = new BABYLON.Vector3(scaleFactor, scaleFactor, scaleFactor);
            }
        }
        
        console.log(`Added ${numTrees} trees on polygon ${polygon.name}`);
    }

    /**
     * Clear all polygons
     */
    clearPolygons() {
        this.polygons.forEach(polygon => {
            if (polygon && polygon.dispose) {
                this.scene.removeMesh(polygon);
                polygon.dispose();
            }
        });
        this.polygons = [];
    }

    /**
     * Clean up unwanted polygons (water_1 without type, etc.)
     * This method removes ALL meshes with name water_* that don't have a valid type
     */
    cleanupUnwantedPolygons() {
        if (!this.scene) return;
        
        // Find ALL meshes with name starting with 'water_' that don't have a valid type
        // This is a comprehensive cleanup that catches all unwanted water_* meshes
        const unwantedMeshes = this.scene.meshes.filter(mesh => {
            if (!mesh.name || !mesh.name.startsWith('water_')) return false;
            
            // Check if mesh has no type in userData or type is invalid
            const hasNoType = !mesh.userData || !mesh.userData.type || mesh.userData.type === undefined || mesh.userData.type === null || mesh.userData.type === '';
            
            // Also check if it's a rectangle (not a polygon) with water name
            // We only want polygon type meshes with water type, not rectangles
            const isRectangleNotPolygon = mesh.userData && mesh.userData.shapeType === 'rectangle';
            
            // Remove if: has no type OR is a rectangle (not polygon)
            return hasNoType || isRectangleNotPolygon;
        });
        
        if (unwantedMeshes.length > 0) {
            console.log(`Found ${unwantedMeshes.length} unwanted meshes with 'water_' prefix (without proper type), removing...`);
            
            unwantedMeshes.forEach(mesh => {
                console.log(`Removing unwanted mesh: ${mesh.name} (type: ${mesh.userData?.type || 'none'}, shapeType: ${mesh.userData?.shapeType || 'none'})`);
                
                // Remove from polygons array if it exists
                const index = this.polygons.indexOf(mesh);
                if (index !== -1) {
                    this.polygons.splice(index, 1);
                }
                
                // Remove from scene (this also removes from selection manager automatically)
                try {
                    this.scene.removeMesh(mesh);
                } catch (e) {
                    console.warn(`Error removing mesh ${mesh.name}:`, e);
                }
                
                // Dispose material
                try {
                    if (mesh.material && mesh.material.dispose) {
                        mesh.material.dispose();
                    }
                } catch (e) {
                    console.warn(`Error disposing material for ${mesh.name}:`, e);
                }
                
                // Dispose mesh
                try {
                    if (mesh.dispose) {
                        mesh.dispose();
                    }
                } catch (e) {
                    console.warn(`Error disposing mesh ${mesh.name}:`, e);
                }
            });
            
            console.log(`Removed ${unwantedMeshes.length} unwanted meshes`);
        }
        
        // Always log all remaining water_* meshes for debugging
        const allWaterMeshes = this.scene.meshes.filter(mesh => mesh.name && mesh.name.startsWith('water_'));
        if (allWaterMeshes.length > 0) {
            console.log(`Remaining ${allWaterMeshes.length} meshes with 'water_' prefix in scene:`);
            allWaterMeshes.forEach(mesh => {
                console.log(`  - ${mesh.name}: type=${mesh.userData?.type || 'none'}, shapeType=${mesh.userData?.shapeType || 'none'}, enabled=${mesh.isEnabled()}`);
            });
        } else {
            console.log('No meshes with "water_" prefix found in scene (cleanup successful)');
        }
    }

    /**
     * Generate buildings on the large invisible area
     */
    generateBuildingsOnLargeArea(count = null, minHeight = null, maxHeight = null) {
        return this.generateBuildings(count, minHeight, maxHeight, true);
    }

    /**
     * Generate valid building positions
     */
    generateBuildingPositions(count, useLargeArea = false) {
        const positions = [];
        const maxAttempts = count * 10; // Prevent infinite loops
        let attempts = 0;
        
        // Use appropriate area size based on type
        // Default: center area (100x100), Large area: full ground (500x500)
        const areaSize = useLargeArea ? this.groundSize : this.centerAreaSize;
        
        console.log(`Generating buildings on ${useLargeArea ? 'large' : 'center'} area:`, {
            areaSize: areaSize,
            count: count,
            useLargeArea: useLargeArea,
            groundSize: this.groundSize,
            centerAreaSize: this.centerAreaSize
        });

        while (positions.length < count && attempts < maxAttempts) {
            const x = (Math.random() - 0.5) * (areaSize - 10);
            const z = (Math.random() - 0.5) * (areaSize - 10);
            
            // Check if position is valid (not too close to other buildings)
            if (this.isValidPosition(x, z, positions)) {
                positions.push({ x, z });
            }
            attempts++;
        }

        // If we couldn't place all buildings, place them anyway
        while (positions.length < count) {
            const x = (Math.random() - 0.5) * (areaSize - 10);
            const z = (Math.random() - 0.5) * (areaSize - 10);
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
     * Generate unique building name
     */
    generateUniqueBuildingName() {
        // Count existing buildings in the scene
        let maxBuildingNumber = 0;
        
        // Check all meshes in the scene for building names
        this.scene.meshes.forEach(mesh => {
            if (mesh.name && mesh.name.startsWith('building_')) {
                const match = mesh.name.match(/building_(\d+)/);
                if (match) {
                    const number = parseInt(match[1]);
                    if (number > maxBuildingNumber) {
                        maxBuildingNumber = number;
                    }
                }
            }
        });
        
        // Return next available number
        return `building_${maxBuildingNumber + 1}`;
    }

    /**
     * Create a single building using rectangle method (same as RectangleManager)
     */
    createBuilding(position, minHeight, maxHeight, width = null, depth = null) {
        // Use provided dimensions or generate random ones, rounded to 2 decimal places
        const buildingWidth = width || Math.round((this.minWidth + Math.random() * (this.maxWidth - this.minWidth)) * 100) / 100; // 10-20 meters
        const buildingDepth = depth || Math.round((this.minDepth + Math.random() * (this.maxDepth - this.minDepth)) * 100) / 100; // 10-20 meters
        const height = Math.round((minHeight + Math.random() * (maxHeight - minHeight)) * 100) / 100; // 5-35 meters

        // Randomly decide between rectangle and circle (30% chance for circle)
        const useCircle = Math.random() < 0.3; // 30% chance for circle buildings

        let building;
        let radius = null;
        if (useCircle) {
            // Create circular building
            // For circle, use average of width and depth as diameter, or use smaller dimension as diameter
            radius = Math.round((Math.min(buildingWidth, buildingDepth) / 2) * 100) / 100; // Use smaller dimension as diameter, so radius is half
            building = this.createBuildingCircle(radius, position, height);
        } else {
            // Create building using rectangle method (same structure as RectangleManager)
            building = this.createBuildingRectangle(buildingWidth, buildingDepth, position, height);

            // Add rotation in 90-degree increments for regular patterns (0, 90, 180, 270 degrees)
            const rotationOptions = [0, Math.PI / 2, Math.PI, Math.PI * 3 / 2]; // 0, 90, 180, 270 degrees
            const randomIndex = Math.floor(Math.random() * rotationOptions.length);
            building.rotation.y = rotationOptions[randomIndex];
        }

        return {
            mesh: building,
            width: useCircle ? radius * 2 : buildingWidth,
            depth: useCircle ? radius * 2 : buildingDepth,
            height: height,
            position: position
        };
    }

    /**
     * Create building rectangle using same method as RectangleManager
     * This ensures consistent structure with drawing tools
     */
    createBuildingRectangle(width, depth, position, height, type = 'building') {
        // Generate unique building name
        const buildingName = this.generateUniqueBuildingName();
        
        // Create a 3D box (same as RectangleManager.createRectangle)
        const rectangle = BABYLON.MeshBuilder.CreateBox(buildingName, {
            width: width,
            height: height,
            depth: depth
        }, this.scene);
        
        // Position the rectangle so its bottom face is on the ground (same as RectangleManager)
        // Handle both {x, z} objects and Vector3 objects
        const posY = (position.y !== undefined) ? position.y : 0;
        const finalY = posY + height / 2; // Center the box vertically (Y=0 is ground level)
        rectangle.position = new BABYLON.Vector3(
            position.x,
            finalY,
            position.z
        );
        
        // Ensure mesh is visible and enabled
        rectangle.setEnabled(true);
        rectangle.isVisible = true;
        
        // Debug log
        console.log(`Building created: ${buildingName} at (${position.x.toFixed(2)}, ${finalY.toFixed(2)}, ${position.z.toFixed(2)}) with size (${width.toFixed(2)}, ${height.toFixed(2)}, ${depth.toFixed(2)})`);
        
        rectangle.renderingGroupId = 1; // Higher rendering priority than ground
        
        // Create material (same structure as RectangleManager)
        const material = new BABYLON.StandardMaterial(`${buildingName}Material`, this.scene);
        // Use white color for buildings (as per original design)
        material.diffuseColor = new BABYLON.Color3(1, 1, 1); // Pure white for buildings
        material.backFaceCulling = false; // Make it 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        material.roughness = 0.7;
        rectangle.material = material;
        
        // Anti-flickering mesh settings (same as RectangleManager)
        rectangle.enableEdgesRendering();
        rectangle.edgesWidth = 1.0;
        rectangle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Ensure type is valid (default to 'building' if not provided or invalid)
        const validType = (type && type !== undefined && type !== null && type !== '') ? type : 'building';
        
        // Store rectangle properties in userData (same structure as RectangleManager)
        rectangle.userData = {
            type: validType,
            shapeType: 'building', // Mark as building but use rectangle structure
            dimensions: {
                width: width,
                depth: depth,
                height: height
            },
            originalHeight: height // Store original height for reference
        };
        
        // Final validation: ensure type is set
        if (!rectangle.userData.type || rectangle.userData.type === undefined || rectangle.userData.type === null) {
            rectangle.userData.type = 'building';
            console.warn(`Building ${buildingName} had no type after creation, set to 'building'`);
        }
        
        // Enable shadows - buildings should both cast and receive shadows
        rectangle.receiveShadows = true;
        rectangle.castShadows = true;
        
        return rectangle;
    }

    /**
     * Create building circle using same method as CircleManager
     * This ensures consistent structure with drawing tools
     */
    createBuildingCircle(radius, position, height, type = 'building') {
        // Generate unique building name
        const buildingName = this.generateUniqueBuildingName();
        const diameter = radius * 2;
        
        // Create a 3D cylinder (same as CircleManager.createCircle)
        const circle = BABYLON.MeshBuilder.CreateCylinder(buildingName, {
            height: height,
            diameterTop: diameter,
            diameterBottom: diameter,
            tessellation: 32
        }, this.scene);
        
        // Position the cylinder so its bottom face is on the ground (same as CircleManager)
        // Handle both {x, z} objects and Vector3 objects
        const posY = (position.y !== undefined) ? position.y : 0;
        const finalY = posY + height / 2; // Center the cylinder vertically (Y=0 is ground level)
        circle.position = new BABYLON.Vector3(
            position.x,
            finalY,
            position.z
        );
        
        // Ensure mesh is visible and enabled
        circle.setEnabled(true);
        circle.isVisible = true;
        
        // Debug log
        console.log(`Building (circle) created: ${buildingName} at (${position.x.toFixed(2)}, ${finalY.toFixed(2)}, ${position.z.toFixed(2)}) with radius ${radius.toFixed(2)} and height ${height.toFixed(2)}`);
        
        circle.renderingGroupId = 1; // Higher rendering priority than ground
        
        // Create material (same structure as CircleManager)
        const material = new BABYLON.StandardMaterial(`${buildingName}Material`, this.scene);
        // Use white color for buildings (as per original design)
        material.diffuseColor = new BABYLON.Color3(1, 1, 1); // Pure white for buildings
        material.backFaceCulling = false; // Make it 2-sided
        material.twoSidedLighting = true; // Enable lighting on both sides
        material.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1); // Reduce specular to prevent flickering
        material.roughness = 0.7;
        circle.material = material;
        
        // Anti-flickering mesh settings (same as CircleManager)
        circle.enableEdgesRendering();
        circle.edgesWidth = 2.0; // Thicker edges for better visibility
        circle.edgesColor = new BABYLON.Color4(0, 0, 0, 1);
        
        // Ensure type is valid (default to 'building' if not provided or invalid)
        const validType = (type && type !== undefined && type !== null && type !== '') ? type : 'building';
        
        // Store circle properties in userData (same structure as CircleManager)
        // For collision detection, we need width and depth (both equal to diameter for circles)
        circle.userData = {
            type: validType,
            shapeType: 'circle', // Mark as circle
            dimensions: {
                diameterTop: diameter,
                diameterBottom: diameter,
                height: height,
                radius: radius,
                width: diameter, // For collision detection
                depth: diameter  // For collision detection
            },
            originalHeight: height // Store original height for reference
        };
        
        // Final validation: ensure type is set
        if (!circle.userData.type || circle.userData.type === undefined || circle.userData.type === null) {
            circle.userData.type = 'building';
            console.warn(`Building (circle) ${buildingName} had no type after creation, set to 'building'`);
        }
        
        // Enable shadows - buildings should both cast and receive shadows
        circle.receiveShadows = true;
        circle.castShadows = true;
        
        return circle;
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
        // Also clear roads and polygons when clearing buildings
        this.clearRoads();
        this.clearPolygons();
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
