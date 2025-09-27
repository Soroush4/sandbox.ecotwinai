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
            this.shape2DManager = new Shape2DManager(this.sceneManager.getScene(), this.selectionManager);
            this.treeManager = new TreeManager(this.sceneManager.getScene(), this.selectionManager, this.lightingManager);
            this.polygonManager = new PolygonManager(this.sceneManager.getScene(), this.selectionManager);
            
            // Setup shadows for ground
            this.lightingManager.addShadowReceiver(this.sceneManager.getGround());
            
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
                this.polygonManager
            );
            
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
     * Auto-generate buildings on page load
     */
    autoGenerateBuildings() {
        try {
            
            // Generate buildings with default settings
            const buildings = this.buildingGenerator.generateBuildings(10, 4, 20);
            
            // Add buildings to scene and setup shadows
            buildings.forEach(building => {
                this.sceneManager.addBuilding(building);
                this.lightingManager.addShadowCaster(building.mesh);
            });
            
            
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
            console.log('Random tree rotation:', window.digitalTwinApp.treeManager.getRandomTreeRotation());
            return window.digitalTwinApp.treeManager.getRandomTreeRotation();
        }
    };
    
    window.testTreeScale = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            console.log('Random tree scale:', window.digitalTwinApp.treeManager.getRandomTreeScale());
            return window.digitalTwinApp.treeManager.getRandomTreeScale();
        }
    };
    
    window.testGroundDetection = (x = 400, y = 300) => {
        if (window.digitalTwinApp && window.digitalTwinApp.sceneManager) {
            const pickResult = window.digitalTwinApp.sceneManager.getScene().pick(x, y, (mesh) => {
                return mesh.name === 'ground';
            });
            const isOnGround = pickResult && pickResult.hit && pickResult.pickedMesh && pickResult.pickedMesh.name === 'ground';
            console.log(`Point (${x}, ${y}) is on ground:`, isOnGround);
            if (pickResult && pickResult.hit) {
                console.log('Hit mesh:', pickResult.pickedMesh.name);
            }
            return isOnGround;
        }
    };
    
    window.testMeshDetection = (x = 400, y = 300) => {
        if (window.digitalTwinApp && window.digitalTwinApp.sceneManager) {
            const pickResult = window.digitalTwinApp.sceneManager.getScene().pick(x, y);
            if (pickResult && pickResult.hit && pickResult.pickedMesh) {
                console.log(`Point (${x}, ${y}) is over mesh:`, pickResult.pickedMesh.name);
                return pickResult.pickedMesh.name;
            } else {
                console.log(`Point (${x}, ${y}) is over: nothing`);
                return null;
            }
        }
    };
    
    window.testTreePlacementPath = () => {
        if (window.digitalTwinApp && window.digitalTwinApp.treeManager) {
            console.log('Testing tree placement path...');
            console.log('1. Start tree placement mode first by clicking tree tool');
            console.log('2. Then test these coordinates:');
            console.log('   - Ground area: testMeshDetection(400, 300)');
            console.log('   - Building area: testMeshDetection(200, 200)');
            console.log('   - Empty area: testMeshDetection(50, 50)');
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
