/**
 * FPSMonitor - Real-time FPS monitoring and display
 */
class FPSMonitor {
    constructor(scene) {
        this.scene = scene;
        this.fpsElement = null;
        this.fpsHistory = [];
        this.maxHistoryLength = 60; // Keep 60 frames of history
        this.updateInterval = null;
        this.isVisible = false;
        
        // Auto-optimization settings
        this.autoOptimizationEnabled = true;
        this.fpsThresholds = {
            disableObjectShadows: 40,
            reduceShadowResolution: 30
        };
        this.optimizationState = {
            objectShadowsDisabled: false,
            shadowResolutionReduced: false
        };
        
        this.init();
    }

    /**
     * Initialize FPS monitor
     */
    init() {
        this.createFPSElement();
        this.startMonitoring();
    }

    /**
     * Create FPS display element
     */
    createFPSElement() {
        // Create FPS display container
        this.fpsElement = document.createElement('div');
        this.fpsElement.id = 'fps-monitor';
        this.fpsElement.style.cssText = `
            position: fixed;
            top: 40px;
            left: calc(33.33% - 100px);
            background: rgba(0, 0, 0, 0.8);
            color: #00ff00;
            padding: 8px 12px;
            border-radius: 6px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            font-weight: bold;
            z-index: 1000;
            border: 1px solid #00ff00;
            box-shadow: 0 2px 8px rgba(0, 255, 0, 0.3);
            min-width: 160px;
            text-align: center;
            user-select: none;
            transition: all 0.3s ease;
        `;

        // Add click to toggle visibility
        this.fpsElement.addEventListener('click', () => {
            this.toggleVisibility();
        });

        // Add hover effects
        this.fpsElement.addEventListener('mouseenter', () => {
            this.fpsElement.style.background = 'rgba(0, 0, 0, 0.9)';
            this.fpsElement.style.transform = 'scale(1.05)';
        });

        this.fpsElement.addEventListener('mouseleave', () => {
            this.fpsElement.style.background = 'rgba(0, 0, 0, 0.8)';
            this.fpsElement.style.transform = 'scale(1)';
        });

        // Initial display
        this.fpsElement.innerHTML = `
            <div style="font-size: 12px; color: #888; margin-bottom: 2px;">FPS</div>
            <div id="fps-value">--</div>
            <div id="fps-avg" style="font-size: 10px; color: #666; margin-top: 2px;">Avg: --</div>
            <div style="border-top: 1px solid #333; margin: 4px 0; padding-top: 4px;">
                <div style="font-size: 10px; color: #888; margin-bottom: 1px;">Vertices</div>
                <div id="vertex-count" style="font-size: 11px; color: #00ff88;">--</div>
            </div>
            <div style="margin-bottom: 2px;">
                <div style="font-size: 10px; color: #888; margin-bottom: 1px;">Faces</div>
                <div id="face-count" style="font-size: 11px; color: #00ff88;">--</div>
            </div>
            <div style="border-top: 1px solid #333; margin: 4px 0; padding-top: 4px;">
                <div style="font-size: 9px; color: #888; margin-bottom: 1px;">Auto-Opt</div>
                <div id="optimization-status" style="font-size: 10px; color: #00ff88;">ON</div>
            </div>
        `;

        document.body.appendChild(this.fpsElement);
        
        // Start hidden since isVisible is false by default
        this.fpsElement.style.display = 'none';
        this.fpsElement.style.opacity = '0';
    }

    /**
     * Start FPS monitoring
     */
    startMonitoring() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        // Update FPS every 100ms for smooth display
        this.updateInterval = setInterval(() => {
            this.updateFPS();
        }, 100);
    }

    /**
     * Update FPS display
     */
    updateFPS() {
        if (!this.scene || !this.scene.getEngine()) {
            return;
        }

        const currentFPS = this.scene.getEngine().getFps();
        
        // Add to history
        this.fpsHistory.push(currentFPS);
        if (this.fpsHistory.length > this.maxHistoryLength) {
            this.fpsHistory.shift();
        }

        // Calculate average FPS
        const avgFPS = this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;

        // Calculate scene statistics
        const sceneStats = this.getSceneStatistics();

        // Auto-optimization based on FPS
        if (this.autoOptimizationEnabled) {
            this.performAutoOptimization(currentFPS);
        }

        // Update display
        if (this.fpsElement && this.isVisible) {
            const fpsValueElement = document.getElementById('fps-value');
            const fpsAvgElement = document.getElementById('fps-avg');
            const vertexCountElement = document.getElementById('vertex-count');
            const faceCountElement = document.getElementById('face-count');

            if (fpsValueElement) {
                fpsValueElement.textContent = Math.round(currentFPS);
                
                // Color coding based on FPS
                if (currentFPS >= 60) {
                    fpsValueElement.style.color = '#00ff00'; // Green
                } else if (currentFPS >= 30) {
                    fpsValueElement.style.color = '#ffff00'; // Yellow
                } else {
                    fpsValueElement.style.color = '#ff0000'; // Red
                }
            }

            if (fpsAvgElement) {
                fpsAvgElement.textContent = `Avg: ${Math.round(avgFPS)}`;
            }

            if (vertexCountElement) {
                vertexCountElement.textContent = sceneStats.vertices.toLocaleString();
            }

            if (faceCountElement) {
                faceCountElement.textContent = sceneStats.faces.toLocaleString();
            }

            // Update optimization status
            const optimizationStatusElement = document.getElementById('optimization-status');
            if (optimizationStatusElement) {
                if (this.autoOptimizationEnabled) {
                    optimizationStatusElement.textContent = 'ON';
                    optimizationStatusElement.style.color = '#00ff88';
                } else {
                    optimizationStatusElement.textContent = 'OFF';
                    optimizationStatusElement.style.color = '#ff6666';
                }
            }
        }
    }

    /**
     * Toggle FPS monitor visibility
     */
    toggleVisibility() {
        this.isVisible = !this.isVisible;
        
        if (this.fpsElement) {
            if (this.isVisible) {
                this.fpsElement.style.display = 'block';
                this.fpsElement.style.opacity = '1';
            } else {
                this.fpsElement.style.display = 'none';
                this.fpsElement.style.opacity = '0';
            }
        }
    }

    /**
     * Show FPS monitor
     */
    show() {
        this.isVisible = true;
        if (this.fpsElement) {
            this.fpsElement.style.display = 'block';
            this.fpsElement.style.opacity = '1';
        }
    }

    /**
     * Hide FPS monitor
     */
    hide() {
        this.isVisible = false;
        if (this.fpsElement) {
            this.fpsElement.style.display = 'none';
            this.fpsElement.style.opacity = '0';
        }
    }

    /**
     * Get current FPS
     */
    getCurrentFPS() {
        return this.scene ? this.scene.getEngine().getFps() : 0;
    }

    /**
     * Get average FPS
     */
    getAverageFPS() {
        if (this.fpsHistory.length === 0) return 0;
        return this.fpsHistory.reduce((sum, fps) => sum + fps, 0) / this.fpsHistory.length;
    }

    /**
     * Perform auto-optimization based on FPS
     */
    performAutoOptimization(currentFPS) {
        if (!window.digitalTwinApp || !window.digitalTwinApp.lightingManager) {
            return;
        }

        const lightingManager = window.digitalTwinApp.lightingManager;

        // Check if FPS is below 40 - disable object shadows
        if (currentFPS < this.fpsThresholds.disableObjectShadows) {
            if (!this.optimizationState.objectShadowsDisabled && lightingManager.areObjectShadowsEnabled()) {
                lightingManager.toggleObjectShadows();
                this.optimizationState.objectShadowsDisabled = true;
                
                // Update UI if preferences window is open
                this.updateOptimizationUI();
            }
        } else {
            // FPS is good, re-enable object shadows if they were auto-disabled
            if (this.optimizationState.objectShadowsDisabled && !lightingManager.areObjectShadowsEnabled()) {
                lightingManager.toggleObjectShadows();
                this.optimizationState.objectShadowsDisabled = false;
                
                // Update UI if preferences window is open
                this.updateOptimizationUI();
            }
        }

        // Check if FPS is below 30 - reduce shadow resolution
        if (currentFPS < this.fpsThresholds.reduceShadowResolution) {
            if (!this.optimizationState.shadowResolutionReduced) {
                this.reduceShadowResolution();
                this.optimizationState.shadowResolutionReduced = true;
            }
        } else {
            // FPS is good, restore shadow resolution if it was auto-reduced
            if (this.optimizationState.shadowResolutionReduced) {
                this.restoreShadowResolution();
                this.optimizationState.shadowResolutionReduced = false;
            }
        }
    }

    /**
     * Reduce shadow resolution for performance
     */
    reduceShadowResolution() {
        if (!window.digitalTwinApp || !window.digitalTwinApp.lightingManager) {
            return;
        }

        const lightingManager = window.digitalTwinApp.lightingManager;
        
        // Store current resolution for restoration
        if (!this.originalShadowResolution) {
            this.originalShadowResolution = 4096; // Default resolution
        }

        // Reduce to 2048
        lightingManager.setShadowMapResolution(2048);
    }

    /**
     * Restore shadow resolution
     */
    restoreShadowResolution() {
        if (!window.digitalTwinApp || !window.digitalTwinApp.lightingManager) {
            return;
        }

        const lightingManager = window.digitalTwinApp.lightingManager;
        
        // Restore to original resolution
        const resolution = this.originalShadowResolution || 4096;
        lightingManager.setShadowMapResolution(resolution);
    }

    /**
     * Update optimization UI state
     */
    updateOptimizationUI() {
        // Update preferences window if it's open
        if (window.digitalTwinApp && window.digitalTwinApp.uiManager) {
            window.digitalTwinApp.uiManager.syncPreferencesState();
        }
    }

    /**
     * Get scene statistics (vertices and faces)
     */
    getSceneStatistics() {
        if (!this.scene) {
            return { vertices: 0, faces: 0, meshes: 0 };
        }

        let totalVertices = 0;
        let totalFaces = 0;
        let meshCount = 0;

        // Count all meshes in the scene
        this.scene.meshes.forEach(mesh => {
            // Skip non-geometry meshes
            if (mesh.geometry && mesh.isEnabled()) {
                meshCount++;
                
                // Get vertex count
                if (mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind)) {
                    const positions = mesh.getVerticesData(BABYLON.VertexBuffer.PositionKind);
                    totalVertices += positions.length / 3; // 3 components per vertex
                }
                
                // Get face count (indices / 3)
                if (mesh.getIndices()) {
                    const indices = mesh.getIndices();
                    totalFaces += indices.length / 3; // 3 indices per face
                }
            }
        });

        return {
            vertices: Math.round(totalVertices),
            faces: Math.round(totalFaces),
            meshes: meshCount
        };
    }

    /**
     * Get FPS statistics
     */
    getFPSStats() {
        if (this.fpsHistory.length === 0) {
            return {
                current: 0,
                average: 0,
                min: 0,
                max: 0,
                history: []
            };
        }

        return {
            current: this.getCurrentFPS(),
            average: this.getAverageFPS(),
            min: Math.min(...this.fpsHistory),
            max: Math.max(...this.fpsHistory),
            history: [...this.fpsHistory]
        };
    }

    /**
     * Reset FPS history
     */
    resetHistory() {
        this.fpsHistory = [];
    }

    /**
     * Set FPS monitor position
     */
    setPosition(top = '20px', right = '20px') {
        if (this.fpsElement) {
            this.fpsElement.style.top = top;
            this.fpsElement.style.right = right;
        }
    }

    /**
     * Set FPS monitor style
     */
    setStyle(style) {
        if (this.fpsElement && style) {
            Object.assign(this.fpsElement.style, style);
        }
    }

    /**
     * Enable/disable auto-optimization
     */
    setAutoOptimization(enabled) {
        this.autoOptimizationEnabled = enabled;
    }

    /**
     * Set FPS thresholds for optimization
     */
    setFPSThresholds(thresholds) {
        if (thresholds.disableObjectShadows !== undefined) {
            this.fpsThresholds.disableObjectShadows = thresholds.disableObjectShadows;
        }
        if (thresholds.reduceShadowResolution !== undefined) {
            this.fpsThresholds.reduceShadowResolution = thresholds.reduceShadowResolution;
        }
    }

    /**
     * Get current optimization state
     */
    getOptimizationState() {
        return {
            autoOptimizationEnabled: this.autoOptimizationEnabled,
            fpsThresholds: { ...this.fpsThresholds },
            optimizationState: { ...this.optimizationState },
            originalShadowResolution: this.originalShadowResolution
        };
    }

    /**
     * Reset optimization state
     */
    resetOptimizationState() {
        this.optimizationState = {
            objectShadowsDisabled: false,
            shadowResolutionReduced: false
        };
        this.originalShadowResolution = null;
    }

    /**
     * Dispose FPS monitor
     */
    dispose() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        if (this.fpsElement && this.fpsElement.parentNode) {
            this.fpsElement.parentNode.removeChild(this.fpsElement);
            this.fpsElement = null;
        }

        this.fpsHistory = [];
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FPSMonitor;
}
