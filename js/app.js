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
                this.shape2DManager
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
