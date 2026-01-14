/**
 * SceneManager - Manages the main Babylon.js scene
 */
class SceneManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.engine = null;
        this.scene = null;
        this.ground = null; // Large transparent ground for drawing
        this.buildings = [];
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the scene
     */
    init() {
        try {
            // IMPORTANT: Set max rendering groups BEFORE creating the engine/scene
            // Default is 4 (0-3), we increase to 6 (0-5) to have separate levels for each type
            // This must be set on BABYLON.RenderingManager.MAX_RENDERINGGROUPS before creating scene
            
            // Method 1: Set on BABYLON.RenderingManager static property (most reliable)
            if (BABYLON.RenderingManager && BABYLON.RenderingManager.MAX_RENDERINGGROUPS !== undefined) {
                BABYLON.RenderingManager.MAX_RENDERINGGROUPS = 6;
                // console.log('✓ Set BABYLON.RenderingManager.MAX_RENDERINGGROUPS to 6');
            } else {
                console.warn('⚠ BABYLON.RenderingManager.MAX_RENDERINGGROUPS not found, trying alternative methods');
            }
            
            // Create Babylon.js engine
            this.engine = new BABYLON.Engine(this.canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true
            });

            // Create scene
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.9);
            
            // Method 2: Set on scene property (for newer Babylon.js versions)
            if (this.scene.maxRenderingGroups !== undefined) {
                this.scene.maxRenderingGroups = 6;
                // console.log('✓ Set scene.maxRenderingGroups to 6');
            }
            
            // Method 3: Try accessing rendering manager via scene property
            if (this.scene.renderingManager) {
                if (this.scene.renderingManager.maxRenderingGroups !== undefined) {
                    this.scene.renderingManager.maxRenderingGroups = 6;
                    // console.log('✓ Set scene.renderingManager.maxRenderingGroups to 6');
                }
            }
            
            // Log the actual max rendering groups value for debugging
            // const staticMax = BABYLON.RenderingManager?.MAX_RENDERINGGROUPS;
            // const sceneMax = this.scene.maxRenderingGroups;
            // const managerMax = this.scene.renderingManager?.maxRenderingGroups;
            // const actualMax = staticMax || sceneMax || managerMax || 'unknown';
            
            // console.log(`Max rendering groups configured: ${actualMax} (target: 6, range: 0-${actualMax - 1})`);
            // console.log(`  - Static (RenderingManager.MAX_RENDERINGGROUPS): ${staticMax || 'N/A'}`);
            // console.log(`  - Scene (scene.maxRenderingGroups): ${sceneMax || 'N/A'}`);
            // console.log(`  - Manager (scene.renderingManager.maxRenderingGroups): ${managerMax || 'N/A'}`);

            // Disable physics for now - not needed for building visualization

            // Create large transparent ground
            this.createGround();

            // Setup scene events
            this.setupSceneEvents();

            // Start render loop
            this.startRenderLoop();

            this.isInitialized = true;

        } catch (error) {
            throw error;
        }
    }

    /**
     * Create a large transparent ground plane for drawing
     */
    createGround() {
        // Create large ground mesh for extended drawing area
        // Match grid size: 50000 units (50km) to align with grid
        const groundSize = 50000; // Same as grid size
        const groundSubdivisions = 500; // Same as grid subdivisions
        this.ground = BABYLON.MeshBuilder.CreateGround("earth", {
            width: groundSize,  // Match grid size: 50000 units (50km)
            height: groundSize, // Match grid size: 50000 units (50km)
            subdivisions: groundSubdivisions // Match grid subdivisions for consistency
        }, this.scene);

        // Use Babylon.js built-in GridMaterial for high-quality vector grid
        // GridMaterial provides crisp, scalable grid lines without texture artifacts
        const groundMaterial = new BABYLON.GridMaterial("groundMaterial", this.scene);
        
        // Grid appearance settings
        // For a 50000 unit ground, use fine grid pattern
        groundMaterial.majorUnitFrequency = 10; // Frequency of major grid lines (every 10 units)
        groundMaterial.minorUnitVisibility = 0.5; // Visibility of minor grid lines (0-1)
        groundMaterial.gridRatio = 1; // Ratio between major and minor lines
        groundMaterial.mainColor = new BABYLON.Color3(0.7, 0.7, 0.7); // Background color (light gray)
        groundMaterial.lineColor = new BABYLON.Color3(0.6, 0.6, 0.6); // Grid line color
        groundMaterial.opacity = 0.8; // Overall transparency
        groundMaterial.backFaceCulling = false; // Show grid on both sides
        groundMaterial.gridOffset = new BABYLON.Vector3(0, 0, 0); // Grid offset
        groundMaterial.useMaxLine = true; // Use maximum line thickness for better visibility

        this.ground.material = groundMaterial;
        this.ground.receiveShadows = true;
        this.ground.isPickable = true; // Make it pickable for drawing

        // Position ground
        this.ground.position.y = 0;
        
        // console.log(`Created large transparent ground for drawing: ${groundSize}x${groundSize} units (${groundSize/1000}km) with ${groundSubdivisions} subdivisions`, {
        //     name: this.ground.name,
        //     size: `${groundSize}x${groundSize}`,
        //     position: this.ground.position,
        //     alpha: groundMaterial.alpha,
        //     isPickable: this.ground.isPickable
        // });
    }

    /**
     * Setup scene events
     */
    setupSceneEvents() {
        // Handle window resize
        window.addEventListener('resize', () => {
            this.engine.resize();
        });

        // Handle canvas focus
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
    }

    /**
     * Start the render loop
     */
    startRenderLoop() {
        let cameraWarningShown = false;
        this.engine.runRenderLoop(() => {
            if (this.scene) {
                // Only render if camera exists
                if (this.scene.activeCamera) {
                    this.scene.render();
                    cameraWarningShown = false; // Reset warning flag once camera is set
                } else {
                    // If no camera, wait for it to be set
                    // Show warning only once to avoid console spam
                    if (!cameraWarningShown) {
                        console.warn('Waiting for camera to be initialized...');
                        cameraWarningShown = true;
                    }
                }
            }
        });
    }

    /**
     * Add building to scene
     */
    addBuilding(building) {
        if (building && building.mesh) {
            // Ensure mesh is in scene (CreateBox already adds it, but ensure it's there)
            if (!this.scene.meshes.includes(building.mesh)) {
                this.scene.addMesh(building.mesh);
            }
            
            // Ensure mesh is visible and enabled
            building.mesh.setEnabled(true);
            building.mesh.isVisible = true;
            
            this.buildings.push(building);
            
            // Debug log
            console.log(`Building added to scene: ${building.mesh.name} at (${building.mesh.position.x.toFixed(2)}, ${building.mesh.position.y.toFixed(2)}, ${building.mesh.position.z.toFixed(2)})`);
            
            // Dispatch scene change event
            this.dispatchSceneChangeEvent();
        } else {
            console.warn('addBuilding: Invalid building object', building);
        }
    }

    /**
     * Remove all buildings from scene
     */
    clearBuildings() {
        this.buildings.forEach(building => {
            if (building.mesh) {
                this.scene.removeMesh(building.mesh);
                building.mesh.dispose();
            }
        });
        this.buildings = [];
        
        // Dispatch scene change event
        this.dispatchSceneChangeEvent();
    }

    /**
     * Get scene statistics
     */
    getStats() {
        return {
            meshCount: this.scene.meshes.length,
            buildingCount: this.buildings.length,
            fps: this.engine.getFps()
        };
    }

    /**
     * Dispose of the scene
     */
    dispose() {
        if (this.ground) {
            this.ground.dispose();
        }
        if (this.scene) {
            this.scene.dispose();
        }
        if (this.engine) {
            this.engine.dispose();
        }
    }

    /**
     * Get the scene instance
     */
    getScene() {
        return this.scene;
    }

    /**
     * Get the engine instance
     */
    getEngine() {
        return this.engine;
    }

    /**
     * Get the ground mesh
     */
    getGround() {
        return this.ground;
    }

    /**
     * Get intersection point on ground at screen coordinates
     */
    getGroundIntersection(x, y) {
        const pickResult = this.scene.pick(x, y, (mesh) => {
            return mesh.name === 'earth';
        });
        
        if (pickResult && pickResult.hit && pickResult.pickedMesh && 
            pickResult.pickedMesh.name === 'earth') {
            return pickResult.pickedPoint;
        }
        
        return null;
    }

    /**
     * Get all buildings
     */
    getBuildings() {
        return this.buildings;
    }

    /**
     * Dispatch scene change event
     */
    dispatchSceneChangeEvent() {
        const event = new CustomEvent('sceneChanged', {
            detail: {
                scene: this.scene,
                buildings: this.buildings
            }
        });
        window.dispatchEvent(event);
    }

    /**
     * Get rendering group ID based on object type
     * Render priority (from lowest to highest, rendered bottom to top):
     * - Grid: 0 (lowest - rendered first, at bottom)
     * - Soil/Ground: 1 (lowest priority for terrain)
     * - Grass: 2 (above soil/ground)
     * - Water/Waterway: 3 (above grass)
     * - Roads/Highway: 4 (above water)
     * - Buildings and trees: 5 (highest - rendered last, on top, equal priority)
     * 
     * Display order (as requested):
     * 1. Buildings and trees (equal priority) - highest
     * 2. Roads
     * 3. Water
     * 4. Grass
     * 5. Soil/Ground - lowest
     * 
     * Note: In Babylon.js, higher renderingGroupId means rendered later (on top).
     * We use 6 rendering groups (0-5) to have separate levels for each type.
     * @param {string} type - Object type (building, tree, highway, road, waterway, water, grass, ground, soil, grid)
     * @returns {number} Rendering group ID (0-5)
     */
    static getRenderingGroupId(type) {
        if (!type) return 0; // Default to lowest priority
        
        const normalizedType = type.toLowerCase();
        
        // Grid: lowest priority (rendered first, at bottom)
        if (normalizedType === 'grid') {
            return 0;
        }
        
        // Soil and Ground: second lowest (lowest terrain priority)
        if (normalizedType === 'soil' || normalizedType === 'ground') {
            return 1;
        }
        
        // Grass: third (above soil/ground)
        if (normalizedType === 'grass') {
            return 2;
        }
        
        // Water and Waterway: fourth (above grass)
        if (normalizedType === 'water' || normalizedType === 'waterway') {
            return 3;
        }
        
        // Roads and Highway: fifth (above water)
        if (normalizedType === 'road' || normalizedType === 'highway') {
            return 4;
        }
        
        // Buildings and trees: highest priority (rendered last, on top, equal priority)
        if (normalizedType === 'building' || normalizedType === 'tree') {
            return 5;
        }
        
        // Default to lowest priority for unknown types
        return 0;
    }
    
    /**
     * Apply depth offset to mesh based on type to ensure correct render order
     * within the same renderingGroupId
     * Note: With 6 rendering groups (0-5), each type has its own level,
     * so depth offset is no longer needed. This function is kept for backward compatibility.
     * @param {BABYLON.Mesh} mesh - The mesh to apply depth offset to
     * @param {string} type - Object type
     */
    static applyDepthOffset(mesh, type) {
        // With separate renderingGroupId for each type (0-5), depth offset is no longer needed
        // Each type now has its own rendering group, so they will render in the correct order
        // This function is kept for backward compatibility but does nothing
        return;
    }
}
