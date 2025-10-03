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
            // Create Babylon.js engine
            this.engine = new BABYLON.Engine(this.canvas, true, {
                preserveDrawingBuffer: true,
                stencil: true
            });

            // Create scene
            this.scene = new BABYLON.Scene(this.engine);
            this.scene.clearColor = new BABYLON.Color3(0.8, 0.8, 0.9);

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
        this.ground = BABYLON.MeshBuilder.CreateGround("earth", {
            width: 500,  // Large area for drawing
            height: 500, // Large area for drawing
            subdivisions: 50 // Good subdivisions for smooth drawing
        }, this.scene);

        // Create slightly transparent ground material with grid texture
        const groundMaterial = new BABYLON.StandardMaterial("groundMaterial", this.scene);
        groundMaterial.diffuseColor = new BABYLON.Color3(0.7, 0.7, 0.7); // Light gray color
        groundMaterial.specularColor = new BABYLON.Color3(0.1, 0.1, 0.1);
        groundMaterial.roughness = 0.8;
        groundMaterial.alpha = 0.8; // Slightly transparent
        
        // Add grid texture
        groundMaterial.diffuseTexture = new BABYLON.Texture("data:image/svg+xml;base64," + 
            btoa(`<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
                <rect width="100" height="100" fill="#b0b0b0"/>
                <defs>
                    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="#888888" stroke-width="0.3"/>
                    </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)"/>
            </svg>`), this.scene);
        groundMaterial.diffuseTexture.uScale = 20; // Scale for larger ground
        groundMaterial.diffuseTexture.vScale = 20;

        this.ground.material = groundMaterial;
        this.ground.receiveShadows = true;
        this.ground.isPickable = true; // Make it pickable for drawing

        // Position ground
        this.ground.position.y = 0;
        
        console.log('Created large transparent ground for drawing:', {
            name: this.ground.name,
            size: '500x500',
            position: this.ground.position,
            alpha: groundMaterial.alpha,
            isPickable: this.ground.isPickable
        });
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
        this.engine.runRenderLoop(() => {
            if (this.scene) {
                this.scene.render();
            }
        });
    }

    /**
     * Add building to scene
     */
    addBuilding(building) {
        if (building && building.mesh) {
            this.buildings.push(building);
            this.scene.addMesh(building.mesh);
            
            // Dispatch scene change event
            this.dispatchSceneChangeEvent();
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
}
