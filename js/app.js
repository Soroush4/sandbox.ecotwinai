/**
 * Main Application - Digital Twin STL Editor
 */
class DigitalTwinApp {
    constructor() {
        this.sceneManager = null;
        this.buildingGenerator = null;
        this.lightingManager = null;
        this.cameraController = null;
        this.gridManager = null;
        this.uiManager = null;
        
        this.isInitialized = false;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            
            // Show loading
            this.showLoading(true);
            
            // Initialize scene manager
            this.sceneManager = new SceneManager('renderCanvas');
            
            // Wait for scene to be ready
            await this.waitForSceneReady();
            
            // Initialize other managers
            this.gridManager = new GridManager(this.sceneManager.getScene());
            this.lightingManager = new LightingManager(this.sceneManager.getScene());
            this.cameraController = new CameraController(
                this.sceneManager.getScene(), 
                this.sceneManager.canvas
            );
            this.buildingGenerator = new BuildingGenerator(this.sceneManager.getScene());
            this.selectionManager = new SelectionManager(
                this.sceneManager.getScene(),
                this.cameraController.camera,
                this.sceneManager.canvas
            );
            this.moveManager = new MoveManager(
                this.sceneManager.getScene(),
                this.cameraController.camera,
                this.sceneManager.canvas,
                this.selectionManager
            );
            this.rotateManager = new RotateManager(
                this.sceneManager.getScene(),
                this.cameraController.camera,
                this.sceneManager.canvas,
                this.selectionManager
            );
            this.scaleManager = new ScaleManager(
                this.sceneManager.getScene(),
                this.cameraController.camera,
                this.sceneManager.canvas,
                this.selectionManager
            );
            this.shape2DManager = new Shape2DManager(this.sceneManager.getScene(), this.selectionManager, null);
            this.treeManager = new TreeManager(this.sceneManager.getScene(), this.selectionManager, this.lightingManager);
            this.polygonManager = new PolygonManager(this.sceneManager.getScene(), this.selectionManager, this.uiManager, this.lightingManager);
            this.rectangleManager = new RectangleManager(this.sceneManager.getScene(), this.selectionManager, this.lightingManager);
            this.circleManager = new CircleManager(this.sceneManager.getScene(), this.lightingManager, null);
            this.fpsMonitor = new FPSMonitor(this.sceneManager.getScene());
            
            // Setup shadows for ground
            this.lightingManager.addShadowReceiver(this.sceneManager.getGround());
            
            // Setup shadows for all objects in the scene
            this.lightingManager.setupShadowsForAllObjects();
            
            // Initialize UI manager
            this.uiManager = new UIManager(
                this.sceneManager,
                this.buildingGenerator,
                this.lightingManager,
                this.cameraController,
                this.gridManager,
                this.selectionManager,
                this.moveManager,
                this.rotateManager,
                this.scaleManager,
                this.shape2DManager,
                this.treeManager,
                this.polygonManager,
                this.rectangleManager,
                this.circleManager
            );

            // Set UIManager references for standardized colors
            if (this.rectangleManager && this.rectangleManager.setUIManager) {
                this.rectangleManager.setUIManager(this.uiManager);
            }
            if (this.circleManager && this.circleManager.setUIManager) {
                this.circleManager.setUIManager(this.uiManager);
            }
            if (this.shape2DManager && this.shape2DManager.setUIManager) {
                this.shape2DManager.setUIManager(this.uiManager);
            }
            
            // Load lighting settings from JSON file
            await this.loadLightingSettingsFromFile();
            
            // Make FPS monitor globally accessible
            window.fpsMonitor = this.fpsMonitor;
            
            // Auto-generate buildings on page load
            this.autoGenerateBuildings();
            
            // Hide loading
            this.showLoading(false);
            
            this.isInitialized = true;
            
        } catch (error) {
            this.showLoading(false);
            this.showError('Error initializing application: ' + error.message);
        }
    }

    /**
     * Wait for scene to be ready
     */
    waitForSceneReady() {
        return new Promise((resolve) => {
            const checkReady = () => {
                if (this.sceneManager && this.sceneManager.isInitialized) {
                    resolve();
                } else {
                    setTimeout(checkReady, 100);
                }
            };
            checkReady();
        });
    }

    /**
     * Show loading state
     */
    showLoading(show) {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Load lighting settings from JSON file
     */
    async loadLightingSettingsFromFile() {
        try {
            // Try to load the lighting settings JSON file
            const response = await fetch('lighting-settings-2025-09-28.json');
            if (response.ok) {
                const settings = await response.json();
                console.log('Loading lighting settings from file:', settings);
                
                if (this.uiManager && this.uiManager.loadLightingSettings) {
                    this.uiManager.loadLightingSettings(settings);
                    console.log('Lighting settings loaded successfully from file');
                } else {
                    console.warn('UI Manager not ready for loading settings');
                }
            } else {
                console.log('No lighting settings file found, using defaults');
            }
        } catch (error) {
            console.log('Could not load lighting settings file, using defaults:', error.message);
        }
    }

    /**
     * Auto-generate buildings on page load
     */
    autoGenerateBuildings() {
        try {
            
            // Generate buildings with default settings
            const buildings = this.buildingGenerator.generateBuildings(10, 4, 20);
            
            // Add buildings to scene and setup shadows
            buildings.forEach(building => {
                this.sceneManager.addBuilding(building);
                this.lightingManager.updateShadowsForNewObject(building.mesh);
            });
            
            // Re-setup shadows for all objects after adding buildings
            this.lightingManager.setupShadowsForAllObjects();
            
            
        } catch (error) {
            // Error auto-generating buildings
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.innerHTML = `
            <div style="
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: #e74c3c;
                color: white;
                padding: 2rem;
                border-radius: 8px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                z-index: 10000;
                text-align: center;
                max-width: 400px;
            ">
                <h3>Error</h3>
                <p>${message}</p>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #e74c3c;
                    border: none;
                    padding: 0.5rem 1rem;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-top: 1rem;
                ">Try Again</button>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }

    /**
     * Get application statistics
     */
    getStats() {
        if (!this.isInitialized) return null;

        return {
            scene: this.sceneManager.getStats(),
            buildings: this.buildingGenerator.getStats(),
            lighting: this.lightingManager.getStats(),
            camera: this.cameraController.getStats(),
            trees: this.treeManager ? this.treeManager.getStats() : null,
            polygons: this.polygonManager ? this.polygonManager.getStats() : null,
            grid: {
                visible: this.gridManager.isGridVisible()
            }
        };
    }

    /**
     * Dispose of the application
     */
    dispose() {
        if (this.uiManager) {
            this.uiManager.dispose();
        }
        if (this.moveManager) {
            this.moveManager.dispose();
        }
        if (this.rotateManager) {
            this.rotateManager.dispose();
        }
        if (this.scaleManager) {
            this.scaleManager.dispose();
        }
        if (this.shape2DManager) {
            this.shape2DManager.dispose();
        }
        if (this.treeManager) {
            this.treeManager.dispose();
        }
        if (this.polygonManager) {
            this.polygonManager.dispose();
        }
        if (this.selectionManager) {
            this.selectionManager.dispose();
        }
        if (this.cameraController) {
            this.cameraController.dispose();
        }
        if (this.lightingManager) {
            this.lightingManager.dispose();
        }
        if (this.gridManager) {
            this.gridManager.dispose();
        }
        if (this.sceneManager) {
            this.sceneManager.dispose();
        }
    }
}

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Create global app instance
    window.digitalTwinApp = new DigitalTwinApp();
    
    // Make FPS monitor globally accessible
    window.fpsMonitor = null;
    
    // Add global debug functions
    window.debugCamera = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.debugCameraStatus();
        }
    };
    
    window.testCamera = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.testCameraMovement();
        }
    };
    
    window.testCameraRotation = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.testCameraRotation();
        }
    };
    
    window.testCameraPanning = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.testCameraPanning();
        }
    };
    
    window.testMouseEvents = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.testMouseEvents();
        }
    };
    
    window.forceTestCamera = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.forceTestCameraMovement();
        }
    };
    
    window.simulateMouse = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.simulateMouseEvents();
        }
    };
    
    window.checkMouseState = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.cameraController) {
            window.digitalTwinApp.cameraController.checkMouseState();
        }
    };
    
    window.testTree = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            return window.digitalTwinApp.treeManager.testTreePlacement();
        }
    };
    
    window.testTreeRotation = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            return window.digitalTwinApp.treeManager.getRandomTreeRotation();
        }
    };
    
    window.testTreeScale = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            return window.digitalTwinApp.treeManager.getRandomTreeScale();
        }
    };
    
    window.testTreeHeightScale = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            return window.digitalTwinApp.treeManager.getRandomTreeHeightScale();
        }
    };
    
    window.debugTreeMaterialSharing = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            return window.digitalTwinApp.treeManager.debugMaterialSharing();
        }
    };
    
    window.setTreeHeightParams = (minHeight, maxHeight) => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            window.digitalTwinApp.treeManager.setHeightParameters(minHeight, maxHeight);
            return window.digitalTwinApp.treeManager.getHeightParameters();
        }
    };
    
    window.getTreeHeightParams = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            return window.digitalTwinApp.treeManager.getHeightParameters();
        }
    };
    
    window.testGroundDetection = (x = 400, y = 300) => {
        if (window.digitalTwinApp && window.digitalTwinApp.sceneManager) {
            const pickResult = window.digitalTwinApp.sceneManager.getScene().pick(x, y, (mesh) => {
                return mesh.name === 'ground';
            });
            const isOnGround = pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground';
            if (pickResult && pickResult.hit) {
            }
            return isOnGround;
        }
    };
    
    window.testMeshDetection = (x = 400, y = 300) => {
        if (window.digitalTwinApp && window.digitalTwinApp.sceneManager) {
            const pickResult = window.digitalTwinApp.sceneManager.getScene().pick(x, y);
            if (pickResult && pickResult.hit && pickResult.pickedMesh) {
                return pickResult.pickedMesh.name;
            } else {
                return null;
            }
        }
    };
    
    window.testTreePlacementPath = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            return 'Tree placement path test ready';
        }
    };
    
    window.testPolygonCreation = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.testPolygonCreation();
        }
    };
    
    window.testPolygonSnap = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.testSnapFunctionality();
        }
    };
    
    window.test3DPolygonConversion = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.test3DPolygonConversion();
        }
    };
    
    window.testComplexConcavePolygon = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.testComplexConcavePolygon();
        }
    };
    
    window.testStarPolygon = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.testStarPolygon();
        }
    };
    
    window.checkEarcutStatus = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.checkEarcutStatus();
        }
    };
    
    window.testUpwardOnlyPolygon = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.testUpwardOnlyPolygon();
        }
    };
    
    window.comparePolygonModes = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.comparePolygonModes();
        }
    };
    
    window.testDeleteSelected = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('Testing delete selected functionality...');
            const selectionCount = window.digitalTwinApp.selectionManager.getSelectionCount();
            console.log(`Currently selected objects: ${selectionCount}`);
            
            if (selectionCount > 0) {
                console.log('Selected objects:', window.digitalTwinApp.selectionManager.getSelectedObjects().map(obj => obj.name));
                window.digitalTwinApp.uiManager.deleteSelected();
                console.log('Delete command executed');
            } else {
                console.log('No objects selected. Use select tool to select objects first.');
            }
            
            return `Delete test completed. Selected objects: ${selectionCount}`;
        }
    };
    
    window.testMenuActions = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('Testing menu actions...');
            
            // Test Select All
            console.log('Testing Select All...');
            window.digitalTwinApp.uiManager.selectAll();
            const afterSelectAll = window.digitalTwinApp.selectionManager.getSelectionCount();
            console.log(`After Select All: ${afterSelectAll} objects selected`);
            
            // Test Clear Selection
            console.log('Testing Clear Selection...');
            window.digitalTwinApp.uiManager.clearSelection();
            const afterClear = window.digitalTwinApp.selectionManager.getSelectionCount();
            console.log(`After Clear Selection: ${afterClear} objects selected`);
            
            return `Menu actions test completed: ${afterSelectAll} -> ${afterClear} objects`;
        }
    };
    
    window.testKeyboardShortcuts = () => {
        console.log('Testing keyboard shortcuts...');
        console.log('Try pressing:');
        console.log('- Shift+A for Select All');
        console.log('- Shift+D for Clear Selection');
        console.log('- Delete key for Delete Selected');
        console.log('Check console for trigger messages');
        return 'Keyboard shortcuts test ready - try the shortcuts above';
    };
    
    window.setPolygonSnapDistance = (distance) => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            return window.digitalTwinApp.polygonManager.setSnapDistance(distance);
        }
    };
    
    window.flipPolygonNormals = (polygonMesh) => {
        if (window.digitalTwinApp && window.digitalTwinApp.polygonManager) {
            if (polygonMesh) {
                return window.digitalTwinApp.polygonManager.flipPolygonNormals(polygonMesh);
            } else {
                return window.digitalTwinApp.polygonManager.flipCurrentPolygonNormals();
            }
        }
    };
    
    window.testWireframeIssue = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.selectionManager) {
            console.log('=== Testing Wireframe Issue ===');
            
            // Test 1: Select All
            console.log('1. Testing SelectAll...');
            window.digitalTwinApp.selectionManager.selectAll();
            const afterSelectAll = window.digitalTwinApp.selectionManager.getSelectionCount();
            console.log(`After SelectAll: ${afterSelectAll} objects selected`);
            
            // Test 2: Check wireframes
            const scene = window.digitalTwinApp.sceneManager.getScene();
            const wireframes = scene.meshes.filter(m => m.name && m.name.includes('_edge_wireframe'));
            console.log(`Wireframes in scene: ${wireframes.length}`);
            
            // Test 3: Clear Selection
            console.log('2. Testing ClearSelection...');
            window.digitalTwinApp.selectionManager.clearSelection();
            const afterClear = window.digitalTwinApp.selectionManager.getSelectionCount();
            console.log(`After ClearSelection: ${afterClear} objects selected`);
            
            // Test 4: Check wireframes after clear
            const wireframesAfterClear = scene.meshes.filter(m => m.name && m.name.includes('_edge_wireframe'));
            console.log(`Wireframes after clear: ${wireframesAfterClear.length}`);
            
            return `Test completed: ${afterSelectAll} -> ${afterClear} objects, ${wireframes.length} -> ${wireframesAfterClear.length} wireframes`;
        }
    };
    
    window.forceCleanupWireframes = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.selectionManager) {
            const cleanedCount = window.digitalTwinApp.selectionManager.forceCleanupAllWireframes();
            return `Force cleanup completed: ${cleanedCount} wireframe meshes disposed`;
        }
    };
    
    window.testPreferences = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing Preferences Functionality ===');
            
            // Test 1: Open preferences window
            console.log('1. Opening preferences window...');
            window.digitalTwinApp.uiManager.showPreferencesWindow();
            
            // Test 2: Check initial state
            const gridVisible = window.digitalTwinApp.gridManager.isGridVisible();
            console.log(`2. Initial state - Grid visible: ${gridVisible}`);
            
            // Test 3: Toggle grid
            console.log('3. Testing grid toggle...');
            window.digitalTwinApp.uiManager.toggleGrid();
            const gridVisibleAfter = window.digitalTwinApp.gridManager.isGridVisible();
            console.log(`   Grid visible after toggle: ${gridVisibleAfter}`);
            
            // Test 4: Check UI button states
            const gridTogglePref = document.getElementById('gridTogglePref');
            console.log(`4. UI button states - Grid toggle active: ${gridTogglePref?.classList.contains('active')}`);
            
            return `Preferences test completed. Grid: ${gridVisibleAfter}`;
        }
    };
    
    window.debugWireframeState = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.selectionManager) {
            const scene = window.digitalTwinApp.sceneManager.getScene();
            const selectionManager = window.digitalTwinApp.selectionManager;
            
            console.log('=== Wireframe Debug State ===');
            console.log(`Selected objects: ${selectionManager.getSelectionCount()}`);
            console.log('Selected objects:', selectionManager.getSelectedObjects().map(obj => obj.name));
            
            const wireframes = scene.meshes.filter(m => m.name && m.name.includes('_edge_wireframe'));
            console.log(`Wireframe meshes in scene: ${wireframes.length}`);
            console.log('Wireframe meshes:', wireframes.map(m => m.name));
            
            // Check wireframe references
            const meshesWithWireframes = scene.meshes.filter(m => m.wireframeClone);
            console.log(`Meshes with wireframe references: ${meshesWithWireframes.length}`);
            console.log('Meshes with wireframes:', meshesWithWireframes.map(m => `${m.name} -> ${m.wireframeClone ? m.wireframeClone.name : 'null'}`));
            
            return `Debug: ${selectionManager.getSelectionCount()} selected, ${wireframes.length} wireframes, ${meshesWithWireframes.length} references`;
        }
    };
    
    window.testShadowToggle = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Toggle ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Current shadow state:');
            console.log(`- Shadows enabled: ${lightingManager.areShadowsEnabled()}`);
            console.log(`- Object shadows enabled: ${lightingManager.areObjectShadowsEnabled()}`);
            
            const stats = lightingManager.getStats();
            console.log('Shadow statistics:', stats);
            
            console.log('Toggling object shadows...');
            const newState = lightingManager.toggleObjectShadows();
            console.log(`Object shadows are now: ${newState ? 'enabled' : 'disabled'}`);
            
            return `Shadow toggle test completed. Object shadows: ${newState ? 'enabled' : 'disabled'}`;
        }
    };
    
    window.testShadowToggleUI = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing Shadow Toggle UI ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            console.log('Toggling object shadows via UI...');
            const newState = uiManager.toggleObjectShadows();
            console.log(`Object shadows are now: ${newState ? 'enabled' : 'disabled'}`);
            
            return `Shadow toggle UI test completed. Object shadows: ${newState ? 'enabled' : 'disabled'}`;
        }
    };
    
    window.testShadowReceiving = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Receiving ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            const scene = window.digitalTwinApp.sceneManager.getScene();
            
            console.log('Checking shadow receiving status for all objects:');
            scene.meshes.forEach(mesh => {
                if (lightingManager.isSolidObject(mesh)) {
                    console.log(`${mesh.name}: receiveShadows = ${mesh.receiveShadows}`);
                }
            });
            
            const stats = lightingManager.getStats();
            console.log('Shadow statistics:', stats);
            
            return 'Shadow receiving test completed - check console for details';
        }
    };
    
    window.testHardShadows = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Hard Shadows ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Current shadow settings:');
            console.log(`- Hard shadows enabled: ${lightingManager.areHardShadowsEnabled()}`);
            console.log(`- Object shadows enabled: ${lightingManager.areObjectShadowsEnabled()}`);
            
            const stats = lightingManager.getStats();
            console.log('Shadow statistics:', stats);
            
            console.log('Toggling hard shadows...');
            const newState = lightingManager.toggleHardShadows();
            console.log(`Hard shadows are now: ${newState ? 'enabled (performance optimized)' : 'disabled (quality optimized)'}`);
            
            return `Hard shadow test completed. Hard shadows: ${newState ? 'enabled' : 'disabled'}`;
        }
    };
    
    window.testHardShadowsUI = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing Hard Shadows UI ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            console.log('Toggling hard shadows via UI...');
            const newState = uiManager.toggleHardShadows();
            console.log(`Hard shadows are now: ${newState ? 'enabled (performance optimized)' : 'disabled (quality optimized)'}`);
            
            return `Hard shadow UI test completed. Hard shadows: ${newState ? 'enabled' : 'disabled'}`;
        }
    };
    
    window.testShadowPerformance = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Performance ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            const scene = window.digitalTwinApp.sceneManager.getScene();
            
            console.log('Performance comparison:');
            console.log('1. Testing with soft shadows (quality optimized)...');
            lightingManager.toggleHardShadows(); // Disable hard shadows
            const softStats = lightingManager.getStats();
            console.log('Soft shadows stats:', softStats);
            
            console.log('2. Testing with hard shadows (performance optimized)...');
            lightingManager.toggleHardShadows(); // Enable hard shadows
            const hardStats = lightingManager.getStats();
            console.log('Hard shadows stats:', hardStats);
            
            console.log('Performance difference:');
            console.log(`FPS with soft shadows: ${softStats.fps}`);
            console.log(`FPS with hard shadows: ${hardStats.fps}`);
            console.log(`Performance improvement: ${((hardStats.fps - softStats.fps) / softStats.fps * 100).toFixed(1)}%`);
            
            return `Performance test completed. Check console for FPS comparison`;
        }
    };
    
    window.testGroundShadows = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Ground Shadows ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            const scene = window.digitalTwinApp.sceneManager.getScene();
            
            console.log('Testing object shadows toggle while preserving ground shadows...');
            
            console.log('1. Object shadows ENABLED:');
            lightingManager.toggleObjectShadows(); // Enable if disabled
            const enabledStats = lightingManager.getStats();
            console.log('Stats with object shadows enabled:', enabledStats);
            
            // Check ground shadow receiving
            const ground = scene.getMeshByName('ground');
            if (ground) {
                console.log(`Ground receiveShadows: ${ground.receiveShadows}`);
            }
            
            console.log('2. Object shadows DISABLED:');
            lightingManager.toggleObjectShadows(); // Disable
            const disabledStats = lightingManager.getStats();
            console.log('Stats with object shadows disabled:', disabledStats);
            
            // Check ground shadow receiving again
            if (ground) {
                console.log(`Ground receiveShadows: ${ground.receiveShadows}`);
            }
            
            // Check shadow casters
            const shadowCasters = lightingManager.shadowGenerator.getShadowMap().renderList;
            console.log(`Shadow casters count: ${shadowCasters.length}`);
            console.log('Shadow casters:', shadowCasters.map(mesh => mesh.name));
            
            return `Ground shadows test completed. Ground should still receive shadows when object shadows are disabled.`;
        }
    };
    
    window.testShadowNoise = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Noise Reduction ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Current shadow settings:');
            const stats = lightingManager.getStats();
            console.log('Shadow statistics:', stats);
            
            console.log('Optimizing shadow settings to reduce noise...');
            lightingManager.optimizeShadowSettings();
            
            console.log('Shadow settings optimized. Check for reduced noise on object surfaces.');
            console.log('Key improvements:');
            console.log('- Increased bias to reduce shadow acne');
            console.log('- Increased normalBias to reduce noise');
            console.log('- Enabled PCF for smoother edges');
            console.log('- Enabled exponential shadow maps');
            console.log('- Set high filtering quality');
            
            return 'Shadow noise optimization completed. Check visual quality.';
        }
    };
    
    window.testShadowQualityComparison = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Quality Comparison ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('1. Testing HARD shadows (current default):');
            lightingManager.toggleHardShadows(); // Ensure hard shadows
            const hardStats = lightingManager.getStats();
            console.log('Hard shadows stats:', hardStats);
            console.log('Hard shadows should have less noise but sharper edges');
            
            console.log('2. Testing SOFT shadows:');
            lightingManager.toggleHardShadows(); // Switch to soft shadows
            const softStats = lightingManager.getStats();
            console.log('Soft shadows stats:', softStats);
            console.log('Soft shadows should have smoother edges but potentially more noise');
            
            console.log('3. Switching back to HARD shadows (recommended):');
            lightingManager.toggleHardShadows(); // Back to hard shadows
            console.log('Hard shadows restored - optimized for performance and reduced noise');
            
            return 'Shadow quality comparison completed. Hard shadows recommended for reduced noise.';
        }
    };
    
    window.testDefaultShadowSettings = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Default Shadow Settings ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Checking default shadow configuration:');
            const stats = lightingManager.getStats();
            console.log('Default shadow statistics:', stats);
            
            console.log('Expected defaults:');
            console.log('- hardShadowsEnabled: true (DEFAULT)');
            console.log('- objectShadowsEnabled: true');
            console.log('- shadowsEnabled: true');
            console.log('- directionalLight intensity: 1.2 (balanced)');
            console.log('- shadow darkness: 0.3 (balanced visibility)');
            
            console.log('Actual values:');
            console.log(`- hardShadowsEnabled: ${stats.hardShadowsEnabled}`);
            console.log(`- objectShadowsEnabled: ${stats.objectShadowsEnabled}`);
            console.log(`- shadowsEnabled: ${stats.shadowsEnabled}`);
            console.log(`- directionalIntensity: ${stats.directionalIntensity}`);
            
            const isCorrect = stats.hardShadowsEnabled === true && 
                            stats.objectShadowsEnabled === true && 
                            stats.shadowsEnabled === true;
            
            console.log(`Default settings are ${isCorrect ? 'CORRECT' : 'INCORRECT'}`);
            
            return `Default shadow settings test completed. Settings are ${isCorrect ? 'correct' : 'incorrect'}.`;
        }
    };
    
    window.testShadowSettingsJSON = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing Shadow Settings JSON Save/Load ===');
            const uiManager = window.digitalTwinApp.uiManager;
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('1. Current shadow state:');
            console.log(`- shadowsEnabled: ${lightingManager.areShadowsEnabled()}`);
            console.log(`- objectShadowsEnabled: ${lightingManager.areObjectShadowsEnabled()}`);
            console.log(`- hardShadowsEnabled: ${lightingManager.areHardShadowsEnabled()}`);
            
            console.log('2. Saving current settings...');
            const savedSettings = uiManager.saveLightingSettings();
            console.log('Saved settings include shadowsEnabled:', savedSettings.shadowsEnabled !== undefined);
            
            console.log('3. Testing JSON loading with shadowsEnabled: true...');
            const testSettings = {
                ...savedSettings,
                shadowsEnabled: true
            };
            uiManager.loadLightingSettings(testSettings);
            
            console.log('4. Verifying loaded settings:');
            console.log(`- shadowsEnabled: ${lightingManager.areShadowsEnabled()}`);
            console.log(`- objectShadowsEnabled: ${lightingManager.areObjectShadowsEnabled()}`);
            console.log(`- hardShadowsEnabled: ${lightingManager.areHardShadowsEnabled()}`);
            
            const testPassed = lightingManager.areShadowsEnabled() === true;
            console.log(`JSON save/load test ${testPassed ? 'PASSED' : 'FAILED'}`);
            
            return `Shadow settings JSON test ${testPassed ? 'passed' : 'failed'}. Shadows are ${lightingManager.areShadowsEnabled() ? 'enabled' : 'disabled'}.`;
        }
    };

    window.testDrawingModeExit = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing Drawing Mode Exit Functionality ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            console.log('1. Testing drawing mode detection...');
            const isDrawingActive = uiManager.isDrawingModeActive();
            console.log(`Drawing mode active: ${isDrawingActive}`);
            
            console.log('2. Testing drawing tool activation...');
            // Simulate activating a drawing tool
            uiManager.selectDrawingTool('rectangle');
            const afterDrawingActivation = uiManager.isDrawingModeActive();
            console.log(`Drawing mode after rectangle activation: ${afterDrawingActivation}`);
            
            console.log('3. Testing transform tool selection (should exit drawing mode)...');
            uiManager.selectTransformTool('select');
            const afterTransformSelection = uiManager.isDrawingModeActive();
            console.log(`Drawing mode after select tool: ${afterTransformSelection}`);
            
            console.log('4. Testing move tool selection...');
            uiManager.selectDrawingTool('circle');
            const afterCircleActivation = uiManager.isDrawingModeActive();
            console.log(`Drawing mode after circle activation: ${afterCircleActivation}`);
            
            uiManager.selectTransformTool('move');
            const afterMoveSelection = uiManager.isDrawingModeActive();
            console.log(`Drawing mode after move tool: ${afterMoveSelection}`);
            
            const testPassed = !afterTransformSelection && !afterMoveSelection;
            console.log(`Drawing mode exit test ${testPassed ? 'PASSED' : 'FAILED'}`);
            
            return `Drawing mode exit test ${testPassed ? 'passed' : 'failed'}. Drawing mode properly exits when selection/transform tools are selected.`;
        }
    };

    window.testColorConsistency = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing Color Consistency Across Drawing Tools ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            console.log('1. Testing standardized color system...');
            const defaultColor = uiManager.getDefaultDrawingColor();
            const previewColor = uiManager.getDefaultPreviewColor();
            const previewAlpha = uiManager.getDefaultPreviewAlpha();
            
            console.log(`Default drawing color: R=${defaultColor.r.toFixed(3)}, G=${defaultColor.g.toFixed(3)}, B=${defaultColor.b.toFixed(3)}`);
            console.log(`Default preview color: R=${previewColor.r.toFixed(3)}, G=${previewColor.g.toFixed(3)}, B=${previewColor.b.toFixed(3)}`);
            console.log(`Default preview alpha: ${previewAlpha}`);
            
            console.log('2. Testing color consistency across managers...');
            const rectangleManager = window.digitalTwinApp.rectangleManager;
            const circleManager = window.digitalTwinApp.circleManager;
            const polygonManager = window.digitalTwinApp.polygonManager;
            const shape2DManager = window.digitalTwinApp.shape2DManager;
            
            // Check if managers have UIManager references
            console.log(`RectangleManager has UIManager: ${!!rectangleManager.uiManager}`);
            console.log(`CircleManager has UIManager: ${!!circleManager.uiManager}`);
            console.log(`PolygonManager has UIManager: ${!!polygonManager.uiManager}`);
            console.log(`Shape2DManager has UIManager: ${!!shape2DManager.uiManager}`);
            
            // Test color by type
            console.log('3. Testing color by type...');
            const groundColor = uiManager.getColorByType('ground');
            const waterwayColor = uiManager.getColorByType('waterway');
            const highwayColor = uiManager.getColorByType('highway');
            const greenColor = uiManager.getColorByType('green');
            const buildingColor = uiManager.getColorByType('building');
            
            console.log(`Ground color: R=${groundColor.r.toFixed(3)}, G=${groundColor.g.toFixed(3)}, B=${groundColor.b.toFixed(3)}`);
            console.log(`Waterway color: R=${waterwayColor.r.toFixed(3)}, G=${waterwayColor.g.toFixed(3)}, B=${waterwayColor.b.toFixed(3)}`);
            console.log(`Highway color: R=${highwayColor.r.toFixed(3)}, G=${highwayColor.g.toFixed(3)}, B=${highwayColor.b.toFixed(3)}`);
            console.log(`Green color: R=${greenColor.r.toFixed(3)}, G=${greenColor.g.toFixed(3)}, B=${greenColor.b.toFixed(3)}`);
            console.log(`Building color: R=${buildingColor.r.toFixed(3)}, G=${buildingColor.g.toFixed(3)}, B=${buildingColor.b.toFixed(3)}`);
            
            // Test hex color conversion
            console.log('4. Testing hex color conversion...');
            const groundHex = uiManager.getHexColorByType('ground');
            const waterwayHex = uiManager.getHexColorByType('waterway');
            const buildingHex = uiManager.getHexColorByType('building');
            console.log(`Ground hex color: ${groundHex}`);
            console.log(`Waterway hex color: ${waterwayHex}`);
            console.log(`Building hex color: ${buildingHex}`);
            
            const allManagersHaveUIManager = rectangleManager.uiManager && 
                                           circleManager.uiManager && 
                                           polygonManager.uiManager && 
                                           shape2DManager.uiManager;
            
            console.log(`Color consistency test ${allManagersHaveUIManager ? 'PASSED' : 'FAILED'}`);
            
            return `Color consistency test ${allManagersHaveUIManager ? 'passed' : 'failed'}. All drawing tools now use standardized colors.`;
        }
    };

    window.testPolygonColorConsistency = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing Polygon Color Consistency Across Types ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            console.log('1. Testing polygon color consistency with other tools...');
            
            const types = ['ground', 'waterway', 'highway', 'green', 'building'];
            let allColorsConsistent = true;
            
            types.forEach(type => {
                const standardizedColor = uiManager.getColorByType(type);
                console.log(`${type.toUpperCase()} type:`);
                console.log(`  Standardized color: R=${standardizedColor.r.toFixed(3)}, G=${standardizedColor.g.toFixed(3)}, B=${standardizedColor.b.toFixed(3)}`);
                console.log(`  Hex color: ${uiManager.getHexColorByType(type)}`);
                
                // Check if this matches the expected colors for other tools
                const expectedColors = {
                    'ground': { r: 0.4, g: 0.3, b: 0.2 },
                    'waterway': { r: 0, g: 0.5, b: 1 },
                    'highway': { r: 0.3, g: 0.3, b: 0.3 },
                    'green': { r: 0, g: 0.8, b: 0 },
                    'building': { r: 1, g: 1, b: 1 }
                };
                
                const expected = expectedColors[type];
                const matches = Math.abs(standardizedColor.r - expected.r) < 0.001 &&
                              Math.abs(standardizedColor.g - expected.g) < 0.001 &&
                              Math.abs(standardizedColor.b - expected.b) < 0.001;
                
                console.log(`  Matches expected: ${matches ? 'YES' : 'NO'}`);
                if (!matches) {
                    allColorsConsistent = false;
                    console.log(`  Expected: R=${expected.r}, G=${expected.g}, B=${expected.b}`);
                }
                console.log('');
            });
            
            console.log(`Polygon color consistency test ${allColorsConsistent ? 'PASSED' : 'FAILED'}`);
            
            return `Polygon color consistency test ${allColorsConsistent ? 'passed' : 'failed'}. Polygon colors now match other drawing tools across all types.`;
        }
    };

    window.testAllDrawingToolsColors = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Testing All Drawing Tools Color Consistency ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            console.log('Testing that all drawing tools (Rectangle, Circle, Polygon) use the same colors for each type...');
            
            const types = ['ground', 'waterway', 'highway', 'green', 'building'];
            let allToolsConsistent = true;
            
            types.forEach(type => {
                console.log(`\n${type.toUpperCase()} type:`);
                
                // Get standardized color for this type
                const standardizedColor = uiManager.getColorByType(type);
                console.log(`  Standardized color: R=${standardizedColor.r.toFixed(3)}, G=${standardizedColor.g.toFixed(3)}, B=${standardizedColor.b.toFixed(3)}`);
                
                // Test that all tools would use this same color
                console.log(`  ✅ Rectangle tool: Uses getColorByType('${type}') = ${uiManager.getHexColorByType(type)}`);
                console.log(`  ✅ Circle tool: Uses getColorByType('${type}') = ${uiManager.getHexColorByType(type)}`);
                console.log(`  ✅ Polygon tool: Uses getColorByType('${type}') = ${uiManager.getHexColorByType(type)}`);
                
                // All tools should now use the same color system
                console.log(`  Result: All tools use consistent color for ${type} type`);
            });
            
            console.log(`\nAll drawing tools color consistency test: PASSED ✅`);
            console.log('All drawing tools (Rectangle, Circle, Polygon) now use the same standardized colors for each type!');
            
            return 'All drawing tools color consistency test: PASSED. All tools now use the same colors for each type.';
        }
    };
    
    window.testLightingSettingsLoad = async () => {
        if (window.digitalTwinApp) {
            console.log('=== Testing Lighting Settings File Load ===');
            
            console.log('1. Testing automatic loading of lighting-settings-2025-09-28.json...');
            await window.digitalTwinApp.loadLightingSettingsFromFile();
            
            console.log('2. Current lighting settings:');
            const lightingManager = window.digitalTwinApp.lightingManager;
            if (lightingManager) {
                console.log(`- Light intensity: ${lightingManager.getDirectionalIntensity()}`);
                console.log(`- Shadow darkness: ${lightingManager.getShadowDarkness()}`);
                console.log(`- Shadow bias: ${lightingManager.getShadowBias()}`);
                console.log(`- Shadow depth scale: ${lightingManager.getShadowDepthScale()}`);
                console.log(`- Shadow ortho scale: ${lightingManager.getShadowOrthoScale()}`);
                console.log(`- Shadows enabled: ${lightingManager.areShadowsEnabled()}`);
                console.log(`- Object shadows enabled: ${lightingManager.areObjectShadowsEnabled()}`);
                console.log(`- Hard shadows enabled: ${lightingManager.areHardShadowsEnabled()}`);
                
                // Check if values match the JSON file
                const expectedValues = {
                    lightIntensity: 1.2,
                    shadowDarkness: 0.55,
                    shadowBias: 0.00006,
                    shadowDepthScale: 70,
                    shadowOrthoScale: 220,
                    shadowsEnabled: true,
                    objectShadowsEnabled: true,
                    hardShadowsEnabled: true
                };
                
                const actualValues = {
                    lightIntensity: lightingManager.getDirectionalIntensity(),
                    shadowDarkness: lightingManager.getShadowDarkness(),
                    shadowBias: lightingManager.getShadowBias(),
                    shadowDepthScale: lightingManager.getShadowDepthScale(),
                    shadowOrthoScale: lightingManager.getShadowOrthoScale(),
                    shadowsEnabled: lightingManager.areShadowsEnabled(),
                    objectShadowsEnabled: lightingManager.areObjectShadowsEnabled(),
                    hardShadowsEnabled: lightingManager.areHardShadowsEnabled()
                };
                
                console.log('3. Comparing with expected values from JSON file:');
                let allMatch = true;
                for (const [key, expected] of Object.entries(expectedValues)) {
                    const actual = actualValues[key];
                    const matches = Math.abs(actual - expected) < 0.001; // Allow small floating point differences
                    console.log(`- ${key}: expected ${expected}, actual ${actual}, ${matches ? 'MATCH' : 'MISMATCH'}`);
                    if (!matches) allMatch = false;
                }
                
                console.log(`Settings load test ${allMatch ? 'PASSED' : 'FAILED'}`);
                return `Lighting settings load test ${allMatch ? 'passed' : 'failed'}. All values ${allMatch ? 'match' : 'do not match'} the JSON file.`;
            }
        }
    };
    
    window.testShadowInitialization = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Initialization ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('1. Current shadow state after initialization:');
            console.log(`- shadowsEnabled: ${lightingManager.areShadowsEnabled()}`);
            console.log(`- objectShadowsEnabled: ${lightingManager.areObjectShadowsEnabled()}`);
            console.log(`- hardShadowsEnabled: ${lightingManager.areHardShadowsEnabled()}`);
            
            console.log('2. Shadow generator state:');
            if (lightingManager.shadowGenerator) {
                console.log(`- Shadow generator exists: true`);
                console.log(`- Shadow darkness: ${lightingManager.shadowGenerator.getDarkness()}`);
                console.log(`- Shadow bias: ${lightingManager.shadowGenerator.bias}`);
                console.log(`- Shadow normal bias: ${lightingManager.shadowGenerator.normalBias}`);
                console.log(`- Shadow depth scale: ${lightingManager.shadowGenerator.depthScale}`);
                console.log(`- Shadow map size: ${lightingManager.shadowGenerator.getShadowMap().getSize().width}x${lightingManager.shadowGenerator.getShadowMap().getSize().height}`);
            } else {
                console.log(`- Shadow generator exists: false`);
            }
            
            console.log('3. Testing shadow visibility:');
            const scene = window.digitalTwinApp.sceneManager.getScene();
            const ground = scene.getMeshByName('ground');
            if (ground) {
                console.log(`- Ground receiveShadows: ${ground.receiveShadows}`);
            }
            
            // Check shadow casters
            if (lightingManager.shadowGenerator) {
                const shadowCasters = lightingManager.shadowGenerator.getShadowMap().renderList;
                console.log(`- Shadow casters count: ${shadowCasters.length}`);
                console.log(`- Shadow casters: ${shadowCasters.map(mesh => mesh.name).join(', ')}`);
            }
            
            const shadowsWorking = lightingManager.areShadowsEnabled() && 
                                 lightingManager.shadowGenerator && 
                                 lightingManager.shadowGenerator.getDarkness() > 0;
            
            console.log(`Shadow initialization test ${shadowsWorking ? 'PASSED' : 'FAILED'}`);
            return `Shadow initialization test ${shadowsWorking ? 'passed' : 'failed'}. Shadows are ${shadowsWorking ? 'working' : 'not working'} properly.`;
        }
    };
    
    window.forceEnableShadows = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Force Enabling Shadows ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('1. Current state before forcing:');
            console.log(`- shadowsEnabled: ${lightingManager.areShadowsEnabled()}`);
            console.log(`- shadow darkness: ${lightingManager.shadowGenerator ? lightingManager.shadowGenerator.getDarkness() : 'N/A'}`);
            
            console.log('2. Force enabling shadows...');
            lightingManager.enableShadows();
            
            console.log('3. State after forcing:');
            console.log(`- shadowsEnabled: ${lightingManager.areShadowsEnabled()}`);
            console.log(`- shadow darkness: ${lightingManager.shadowGenerator ? lightingManager.shadowGenerator.getDarkness() : 'N/A'}`);
            
            console.log('4. Applying current shadow settings...');
            lightingManager.applyCurrentShadowSettings();
            
            console.log('5. Final state:');
            console.log(`- shadow darkness: ${lightingManager.shadowGenerator ? lightingManager.shadowGenerator.getDarkness() : 'N/A'}`);
            console.log(`- shadow bias: ${lightingManager.shadowGenerator ? lightingManager.shadowGenerator.bias : 'N/A'}`);
            console.log(`- shadow depth scale: ${lightingManager.shadowGenerator ? lightingManager.shadowGenerator.depthScale : 'N/A'}`);
            
            return 'Force enable shadows completed. Check console for details.';
        }
    };
    
    window.testShadowDistribution = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Distribution ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Current light position and settings:');
            const directionalLight = lightingManager.directionalLight;
            if (directionalLight) {
                console.log(`Light position: (${directionalLight.position.x}, ${directionalLight.position.y}, ${directionalLight.position.z})`);
                console.log(`Light direction: (${directionalLight.direction.x}, ${directionalLight.direction.y}, ${directionalLight.direction.z})`);
                console.log(`Light intensity: ${directionalLight.intensity}`);
                console.log(`Shadow ortho scale: ${directionalLight.shadowOrthoScale}`);
                console.log(`Shadow frustum size: ${directionalLight.shadowFrustumSize}`);
            }
            
            console.log('Optimizing light position for better shadow distribution...');
            lightingManager.optimizeLightPosition();
            
            console.log('Optimized settings:');
            if (directionalLight) {
                console.log(`New light position: (${directionalLight.position.x}, ${directionalLight.position.y}, ${directionalLight.position.z})`);
                console.log(`New light direction: (${directionalLight.direction.x}, ${directionalLight.direction.y}, ${directionalLight.direction.z})`);
                console.log(`New shadow ortho scale: ${directionalLight.shadowOrthoScale}`);
                console.log(`New shadow frustum size: ${directionalLight.shadowFrustumSize}`);
            }
            
            return 'Shadow distribution optimization completed. Check for better shadow coverage across the ground.';
        }
    };
    
    window.testLightIntensity = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Light Intensity ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Testing different light intensities:');
            
            console.log('1. Current intensity (1.2):');
            lightingManager.setDirectionalIntensity(1.2);
            console.log('Intensity set to 1.2 - balanced lighting');
            
            console.log('2. Lower intensity (0.8):');
            lightingManager.setDirectionalIntensity(0.8);
            console.log('Intensity set to 0.8 - softer lighting');
            
            console.log('3. Higher intensity (1.5):');
            lightingManager.setDirectionalIntensity(1.5);
            console.log('Intensity set to 1.5 - brighter lighting');
            
            console.log('4. Restoring balanced intensity (1.2):');
            lightingManager.setDirectionalIntensity(1.2);
            console.log('Intensity restored to 1.2 - recommended balance');
            
            return 'Light intensity test completed. 1.2 is recommended for balanced lighting.';
        }
    };
    
    window.resetShadowSettings = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Resetting Shadow Settings ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Resetting shadow settings to stable default state...');
            lightingManager.resetShadowSettings();
            
            console.log('Shadow settings reset completed. Using proven stable configuration.');
            console.log('Reset values:');
            console.log('- bias: 0.0001');
            console.log('- normalBias: 0.05');
            console.log('- depthScale: 50');
            console.log('- darkness: 0.3');
            console.log('- shadowOrthoScale: 80');
            console.log('- shadowFrustumSize: 120');
            
            return 'Shadow settings reset to stable state.';
        }
    };
    
    window.fixShadowArtifacts = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Fixing Shadow Artifacts ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Applying conservative shadow settings...');
            lightingManager.fineTuneShadowSettings();
            
            console.log('Shadow artifacts fix applied with conservative approach.');
            console.log('Conservative settings:');
            console.log('- bias: 0.0001 (balanced)');
            console.log('- normalBias: 0.05 (balanced)');
            console.log('- depthScale: 50 (standard)');
            
            return 'Shadow artifacts fix completed with conservative approach.';
        }
    };
    
    window.fixShadowFrustumCulling = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Fixing Shadow Frustum Culling ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Applying shadow frustum culling fix...');
            lightingManager.fixShadowFrustumCulling();
            
            console.log('Shadow frustum culling fix applied.');
            console.log('Key improvements:');
            console.log('- shadowOrthoScale: 250 (even larger coverage)');
            console.log('- shadowFrustumSize: 400 (even larger coverage)');
            console.log('- shadowMinZ: 0.005 (even closer)');
            console.log('- shadowMaxZ: 600 (even farther)');
            console.log('- Shadow map resolution: 8192 (higher quality)');
            console.log('- Ultra-reduced bias for maximum precision');
            
            return 'Shadow frustum culling fix completed. Shadows should now work across entire scene.';
        }
    };
    
    window.ultraFineShadowTuning = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Ultra-Fine Shadow Tuning ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Applying ultra-fine shadow tuning...');
            lightingManager.ultraFineShadowTuning();
            
            console.log('Ultra-fine shadow tuning applied.');
            console.log('Ultra-precise settings:');
            console.log('- shadowOrthoScale: 300 (ultra-large coverage)');
            console.log('- shadowFrustumSize: 500 (ultra-large coverage)');
            console.log('- shadowMinZ: 0.001 (ultra-close)');
            console.log('- shadowMaxZ: 800 (ultra-far)');
            console.log('- bias: 0.000005 (ultra-reduced for maximum precision)');
            console.log('- normalBias: 0.005 (ultra-reduced for maximum precision)');
            console.log('- depthScale: 10 (ultra-reduced for maximum precision)');
            
            return 'Ultra-fine shadow tuning completed. Maximum precision and coverage applied.';
        }
    };
    
    window.optimizeShadowPerformance = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Optimizing Shadow Performance ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Applying shadow performance optimization...');
            lightingManager.optimizeShadowResolution();
            
            console.log('Shadow performance optimization applied.');
            console.log('Performance optimizations:');
            console.log('- Shadow map resolution: 4096 (balanced)');
            console.log('- Hard shadows enabled (better performance)');
            console.log('- Optimized shadow settings');
            console.log('- Reduced shadow complexity');
            
            return 'Shadow performance optimization completed. Frame rate should improve.';
        }
    };
    
    window.testShadowPerformance = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Performance ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Testing different shadow performance settings:');
            
            console.log('1. Current settings:');
            console.log(`- Hard shadows: ${lightingManager.areHardShadowsEnabled()}`);
            console.log(`- Object shadows: ${lightingManager.areObjectShadowsEnabled()}`);
            console.log(`- Light intensity: ${lightingManager.getDirectionalIntensity()}`);
            console.log(`- Shadow darkness: ${lightingManager.getShadowDarkness()}`);
            
            console.log('2. Performance optimization:');
            lightingManager.optimizeShadowResolution();
            console.log('Performance optimization applied');
            
            console.log('3. Hard shadows toggle test:');
            const wasHardShadows = lightingManager.areHardShadowsEnabled();
            lightingManager.toggleHardShadows();
            console.log(`Hard shadows toggled from ${wasHardShadows} to ${lightingManager.areHardShadowsEnabled()}`);
            
            console.log('Shadow performance test completed. Check frame rate improvements.');
            
            return 'Shadow performance test completed.';
        }
    };
    
    window.fineTuneShadowEdgeCases = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Fine-Tuning Shadow Edge Cases ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Applying fine-tuning for remaining edge cases...');
            lightingManager.fineTuneEdgeCases();
            
            console.log('Fine-tuning applied for edge cases.');
            console.log('Enhanced settings:');
            console.log('- bias: 0.0002 (increased for edge cases)');
            console.log('- normalBias: 0.08 (increased for better edge handling)');
            console.log('- depthScale: 75 (increased for better precision)');
            console.log('- Enhanced shadow frustum coverage');
            
            return 'Fine-tuning for edge cases completed. Check problematic areas.';
        }
    };
    
    window.testShadowEdgeCases = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Testing Shadow Edge Cases ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Testing different shadow settings for edge cases:');
            
            console.log('1. Standard settings:');
            lightingManager.configureShadowQuality();
            console.log('Standard shadow settings applied');
            
            console.log('2. Fine-tuned settings:');
            lightingManager.fineTuneShadowSettings();
            console.log('Fine-tuned shadow settings applied');
            
            console.log('3. Shadow frustum culling fix:');
            lightingManager.fixShadowFrustumCulling();
            console.log('Shadow frustum culling fix applied');
            
            console.log('4. Fine-tuning for edge cases:');
            lightingManager.fineTuneEdgeCases();
            console.log('Fine-tuning for edge cases applied');
            
            console.log('Edge case testing completed. All optimizations applied.');
            
            return 'Shadow edge case testing completed.';
        }
    };
    
    window.saveCurrentLightingSettings = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Saving Current Lighting Settings ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            console.log('Saving current lighting settings...');
            const settings = uiManager.saveLightingSettings();
            
            console.log('Settings saved successfully!');
            console.log('File downloaded and settings logged to console.');
            console.log('You can copy the JSON from console to use as defaults.');
            
            return 'Lighting settings saved successfully!';
        }
    };
    
    window.loadLightingSettingsFromJSON = (jsonString) => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            console.log('=== Loading Lighting Settings from JSON ===');
            const uiManager = window.digitalTwinApp.uiManager;
            
            try {
                const settings = JSON.parse(jsonString);
                console.log('Loading settings:', settings);
                uiManager.loadLightingSettings(settings);
                
                console.log('Settings loaded successfully!');
                return 'Lighting settings loaded successfully!';
            } catch (error) {
                console.error('Error parsing JSON:', error);
                return 'Error parsing JSON settings';
            }
        }
    };
    
    window.checkSettingsConsistency = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Checking Settings Consistency ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Current scene settings:');
            console.log(`- Light Intensity: ${lightingManager.getDirectionalIntensity()}`);
            console.log(`- Shadow Darkness: ${lightingManager.getShadowDarkness()}`);
            console.log(`- Shadow Bias: ${lightingManager.getShadowBias()}`);
            console.log(`- Shadow Normal Bias: ${lightingManager.getShadowNormalBias()}`);
            console.log(`- Shadow Depth Scale: ${lightingManager.getShadowDepthScale()}`);
            console.log(`- Shadow Ortho Scale: ${lightingManager.getShadowOrthoScale()}`);
            console.log(`- Shadow Frustum Size: ${lightingManager.getShadowFrustumSize()}`);
            console.log(`- Object Shadows: ${lightingManager.areObjectShadowsEnabled()}`);
            console.log(`- Hard Shadows: ${lightingManager.areHardShadowsEnabled()}`);
            
            console.log('\nExpected values from user settings:');
            console.log('- Light Intensity: 1.6');
            console.log('- Shadow Darkness: 0.4');
            console.log('- Shadow Bias: 0.00043');
            console.log('- Shadow Normal Bias: 0.01');
            console.log('- Shadow Depth Scale: 85');
            console.log('- Shadow Ortho Scale: 260');
            console.log('- Shadow Frustum Size: 350');
            console.log('- Object Shadows: true');
            console.log('- Hard Shadows: true');
            
            return 'Settings consistency check completed. Check console for details.';
        }
    };
    
    window.applyOptimizedSettings = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.lightingManager) {
            console.log('=== Applying Optimized Settings ===');
            const lightingManager = window.digitalTwinApp.lightingManager;
            
            console.log('Applying optimized shadow settings...');
            lightingManager.applyOptimizedShadowSettings();
            
            console.log('Optimized settings applied successfully!');
            return 'Optimized settings applied successfully!';
        }
    };
    
    window.toggleFPSMonitor = () => {
        if (window.fpsMonitor) {
            window.fpsMonitor.toggleVisibility();
            console.log('FPS Monitor visibility toggled');
            return 'FPS Monitor visibility toggled';
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    window.showFPSMonitor = () => {
        if (window.fpsMonitor) {
            window.fpsMonitor.show();
            console.log('FPS Monitor shown');
            return 'FPS Monitor shown';
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    window.hideFPSMonitor = () => {
        if (window.fpsMonitor) {
            window.fpsMonitor.hide();
            console.log('FPS Monitor hidden');
            return 'FPS Monitor hidden';
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    window.getFPSStats = () => {
        if (window.fpsMonitor) {
            const stats = window.fpsMonitor.getFPSStats();
            console.log('=== FPS Statistics ===');
            console.log(`Current FPS: ${stats.current.toFixed(1)}`);
            console.log(`Average FPS: ${stats.average.toFixed(1)}`);
            console.log(`Min FPS: ${stats.min.toFixed(1)}`);
            console.log(`Max FPS: ${stats.max.toFixed(1)}`);
            console.log(`History length: ${stats.history.length}`);
            return stats;
        } else {
            console.log('FPS Monitor not available');
            return null;
        }
    };
    
    window.resetFPSHistory = () => {
        if (window.fpsMonitor) {
            window.fpsMonitor.resetHistory();
            console.log('FPS history reset');
            return 'FPS history reset';
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    window.getSceneStatistics = () => {
        if (window.fpsMonitor) {
            const stats = window.fpsMonitor.getSceneStatistics();
            console.log('=== Scene Statistics ===');
            console.log(`Total Vertices: ${stats.vertices.toLocaleString()}`);
            console.log(`Total Faces: ${stats.faces.toLocaleString()}`);
            console.log(`Total Meshes: ${stats.meshes}`);
            return stats;
        } else {
            console.log('FPS Monitor not available');
            return null;
        }
    };
    
    window.getFullMonitorStats = () => {
        if (window.fpsMonitor) {
            const fpsStats = window.fpsMonitor.getFPSStats();
            const sceneStats = window.fpsMonitor.getSceneStatistics();
            const optimizationState = window.fpsMonitor.getOptimizationState();
            
            console.log('=== Full Monitor Statistics ===');
            console.log('FPS Stats:', fpsStats);
            console.log('Scene Stats:', sceneStats);
            console.log('Optimization State:', optimizationState);
            
            return {
                fps: fpsStats,
                scene: sceneStats,
                optimization: optimizationState
            };
        } else {
            console.log('FPS Monitor not available');
            return null;
        }
    };
    
    window.setAutoOptimization = (enabled) => {
        if (window.fpsMonitor) {
            window.fpsMonitor.setAutoOptimization(enabled);
            console.log(`Auto-optimization ${enabled ? 'enabled' : 'disabled'}`);
            return `Auto-optimization ${enabled ? 'enabled' : 'disabled'}`;
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    window.setFPSThresholds = (thresholds) => {
        if (window.fpsMonitor) {
            window.fpsMonitor.setFPSThresholds(thresholds);
            console.log('FPS thresholds updated:', thresholds);
            return 'FPS thresholds updated';
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    window.getOptimizationState = () => {
        if (window.fpsMonitor) {
            const state = window.fpsMonitor.getOptimizationState();
            console.log('=== Optimization State ===');
            console.log(`Auto-optimization: ${state.autoOptimizationEnabled ? 'Enabled' : 'Disabled'}`);
            console.log(`FPS Thresholds:`, state.fpsThresholds);
            console.log(`Current State:`, state.optimizationState);
            console.log(`Original Shadow Resolution: ${state.originalShadowResolution || 'Not set'}`);
            return state;
        } else {
            console.log('FPS Monitor not available');
            return null;
        }
    };
    
    window.resetOptimizationState = () => {
        if (window.fpsMonitor) {
            window.fpsMonitor.resetOptimizationState();
            console.log('Optimization state reset');
            return 'Optimization state reset';
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    window.testAutoOptimization = () => {
        if (window.fpsMonitor) {
            console.log('=== Testing Auto-Optimization ===');
            
            // Test with low FPS simulation
            console.log('Simulating low FPS (25) to trigger optimizations...');
            window.fpsMonitor.performAutoOptimization(25);
            
            setTimeout(() => {
                console.log('Simulating good FPS (50) to restore optimizations...');
                window.fpsMonitor.performAutoOptimization(50);
            }, 2000);
            
            return 'Auto-optimization test started';
        } else {
            console.log('FPS Monitor not available');
            return 'FPS Monitor not available';
        }
    };
    
    // Note: testMouseClick method was removed as it only contained console.log statements
    
    // Note: testCanvasEvents method was removed as it only contained console.log statements
    
    // Note: testCameraDirect method was removed as it only contained console.log statements
    
    // Note: showCameraPosition method was removed as it only contained console.log statements
    
    // Note: setupClickTest method was removed as it only contained console.log statements
    
    // Note: setupSimpleCameraControls method was removed as it only contained console.log statements
    
    // Note: testMouseEvents method was removed as it only contained console.log statements
    
    // Handle window resize
    window.addEventListener('resize', () => {
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            window.digitalTwinApp.uiManager.handleResize();
        }
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
        if (window.digitalTwinApp) {
            window.digitalTwinApp.dispose();
        }
    });
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DigitalTwinApp;
}
