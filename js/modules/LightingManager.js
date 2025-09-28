/**
 * LightingManager - Manages lighting and shadows in the scene
 */
class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.directionalLight = null;
        this.hemisphericLight = null;
        this.shadowGenerator = null;
        this.shadowsEnabled = true;
        this.objectShadowsEnabled = true; // New: control object-to-object shadows
        this.hardShadowsEnabled = true; // New: control hard vs soft shadows (default: true for performance)
        this.performanceCheckInterval = null;
        
        this.setupLighting();
    }

    /**
     * Setup lighting system
     */
    setupLighting() {
        // Create hemispheric light for ambient lighting (Montreal sky)
        this.hemisphericLight = new BABYLON.HemisphericLight("hemisphericLight", 
            new BABYLON.Vector3(0, 1, 0), this.scene);
        this.hemisphericLight.intensity = 0.8; // Increased from 0.4 to 0.8
        this.hemisphericLight.diffuse = new BABYLON.Color3(0.9, 0.95, 1.0); // Cool blue sky
        this.hemisphericLight.specular = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Create directional light (sun) for Montreal (45.5°N latitude)
        // Sun position for Montreal: southeast direction, afternoon sun - optimized for hard shadows
        this.directionalLight = new BABYLON.DirectionalLight("directionalLight", 
            new BABYLON.Vector3(0.5, -0.8, 0.3), this.scene);
        this.directionalLight.intensity = 1.6; // Optimized value from user settings
        this.directionalLight.diffuse = new BABYLON.Color3(1, 0.98, 0.85); // Warm sunlight
        this.directionalLight.specular = new BABYLON.Color3(1, 0.98, 0.85);

        // Position the directional light (sun position for Montreal - southeast)
        this.directionalLight.position = new BABYLON.Vector3(-30, 50, 20);
        
        // Optimize directional light for better shadows and reduced noise
        this.directionalLight.shadowMinZ = 0.1;
        this.directionalLight.shadowMaxZ = 200;
        this.directionalLight.shadowOrthoScale = 80; // Increased for better coverage
        this.directionalLight.shadowFrustumSize = 120; // Increased for better coverage

        // Setup shadows
        this.setupShadows();
        
        // Set default shadow quality to high with hard shadows
        this.setShadowQuality('high');
        this.configureShadowQuality(); // Ensure hard shadows are applied
        
        // Apply optimized shadow settings from user preferences
        this.applyOptimizedShadowSettings();
    }

    /**
     * Setup shadow system
     */
    setupShadows() {
        // Create shadow generator with high resolution for better quality and reduced noise
        this.shadowGenerator = new BABYLON.ShadowGenerator(4096, this.directionalLight);
        
        // Configure shadow generator based on hard/soft shadow setting
        this.configureShadowQuality();
        
        // Optimize shadow settings to reduce noise
        this.optimizeShadowSettings();
    }

    /**
     * Configure shadow quality based on hard/soft shadow setting
     */
    configureShadowQuality() {
        if (!this.shadowGenerator) return;

        if (this.hardShadowsEnabled) {
            // Hard shadows - optimized for performance and reduced noise (DEFAULT)
            this.shadowGenerator.useBlurExponentialShadowMap = false;
            this.shadowGenerator.useKernelBlur = false;
            this.shadowGenerator.useContactHardeningShadow = false;
            this.shadowGenerator.darkness = 0.4; // Optimized from user settings
            this.shadowGenerator.normalBias = 0.01; // Optimized from user settings
            this.shadowGenerator.depthScale = 85; // Optimized from user settings
            this.shadowGenerator.bias = 0.00043; // Optimized from user settings
            this.shadowGenerator.usePercentageCloserFiltering = true; // Enable PCF for smoother edges
        } else {
            // Soft shadows - optimized for quality
            this.shadowGenerator.useBlurExponentialShadowMap = true;
            this.shadowGenerator.blurKernel = 64; // Increased for smoother shadows
            this.shadowGenerator.darkness = 0.4; // Slightly darker shadows
            this.shadowGenerator.normalBias = 0.01; // Reduced for better contact
            this.shadowGenerator.depthScale = 50; // Better depth precision
            this.shadowGenerator.bias = 0.00001; // Minimal bias for accuracy
            this.shadowGenerator.useContactHardeningShadow = true;
            this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.1;
            this.shadowGenerator.usePercentageCloserFiltering = true; // Enable PCF
        }

        // Set shadow map size and quality
        this.shadowGenerator.setDarkness(this.hardShadowsEnabled ? 0.3 : 0.4);
    }

    /**
     * Add mesh to shadow casting
     */
    addShadowCaster(mesh) {
        if (this.shadowGenerator && mesh) {
            this.shadowGenerator.addShadowCaster(mesh, true);
            // Ensure the mesh can also receive shadows
            mesh.receiveShadows = true;
        }
    }

    /**
     * Remove mesh from shadow casting
     */
    removeShadowCaster(mesh) {
        if (this.shadowGenerator && mesh) {
            this.shadowGenerator.removeShadowCaster(mesh);
        }
    }

    /**
     * Add mesh to shadow receiving
     */
    addShadowReceiver(mesh) {
        if (mesh) {
            mesh.receiveShadows = true;
            // Also add to shadow casting if it's a solid object
            if (this.shadowGenerator && this.isSolidObject(mesh)) {
                this.shadowGenerator.addShadowCaster(mesh, true);
            }
        }
    }

    /**
     * Check if mesh is a solid object that should cast shadows
     */
    isSolidObject(mesh) {
        // Exclude ground, UI elements, and helper objects
        const excludeNames = ['ground', '__root__', 'grid', 'camera', 'light'];
        const excludePatterns = ['_edge_wireframe', '_helper', '_gizmo'];
        
        if (excludeNames.includes(mesh.name)) {
            return false;
        }
        
        for (const pattern of excludePatterns) {
            if (mesh.name.includes(pattern)) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Toggle shadows
     */
    toggleShadows() {
        this.shadowsEnabled = !this.shadowsEnabled;
        
        if (this.shadowGenerator) {
            if (this.shadowsEnabled) {
                // Enable shadows
                this.shadowGenerator.setDarkness(0.3);
                this.shadowGenerator.useBlurExponentialShadowMap = true;
                this.shadowGenerator.useKernelBlur = true;
                this.shadowGenerator.blurKernel = 32;
                // Re-enable shadow receiving on all meshes
                this.enableShadowReceivingOnAllMeshes();
            } else {
                // Disable shadows completely
                this.shadowGenerator.setDarkness(0);
                this.shadowGenerator.useBlurExponentialShadowMap = false;
                this.shadowGenerator.useKernelBlur = false;
                // Disable shadow receiving on all meshes
                this.disableShadowReceivingOnAllMeshes();
            }
        }
        
        return this.shadowsEnabled;
    }

    /**
     * Enable shadows
     */
    enableShadows() {
        this.shadowsEnabled = true;
        if (this.shadowGenerator) {
            this.shadowGenerator.setDarkness(0.3);
            this.shadowGenerator.useBlurExponentialShadowMap = true;
            this.shadowGenerator.useKernelBlur = true;
            this.shadowGenerator.blurKernel = 32;
            // Re-enable shadow receiving on all meshes
            this.enableShadowReceivingOnAllMeshes();
        }
    }

    /**
     * Disable shadows
     */
    disableShadows() {
        this.shadowsEnabled = false;
        if (this.shadowGenerator) {
            this.shadowGenerator.setDarkness(0);
            this.shadowGenerator.useBlurExponentialShadowMap = false;
            this.shadowGenerator.useKernelBlur = false;
            // Disable shadow receiving on all meshes
            this.disableShadowReceivingOnAllMeshes();
        }
    }

    /**
     * Check if shadows are enabled
     */
    areShadowsEnabled() {
        return this.shadowsEnabled;
    }

    /**
     * Toggle object-to-object shadows
     */
    toggleObjectShadows() {
        this.objectShadowsEnabled = !this.objectShadowsEnabled;
        
        if (this.shadowGenerator && this.scene) {
            if (this.objectShadowsEnabled) {
                // Enable object shadows - add all solid objects to shadow casting and receiving
                this.scene.meshes.forEach(mesh => {
                    if (this.isSolidObject(mesh)) {
                        this.shadowGenerator.addShadowCaster(mesh, true);
                        mesh.receiveShadows = true;
                    }
                });
            } else {
                // Disable object shadows - keep objects casting shadows on ground, but disable shadow receiving
                this.scene.meshes.forEach(mesh => {
                    if (this.isSolidObject(mesh)) {
                        if (mesh.name !== 'ground') {
                            // Keep objects as shadow casters (so they cast shadows on ground)
                            this.shadowGenerator.addShadowCaster(mesh, true);
                            // But disable shadow receiving (so they don't receive shadows from other objects)
                            mesh.receiveShadows = false;
                        } else {
                            // Keep ground receiving shadows
                            mesh.receiveShadows = true;
                            // Ground doesn't need to cast shadows
                            this.shadowGenerator.removeShadowCaster(mesh);
                        }
                    }
                });
            }
        }
        
        return this.objectShadowsEnabled;
    }

    /**
     * Check if object shadows are enabled
     */
    areObjectShadowsEnabled() {
        return this.objectShadowsEnabled;
    }

    /**
     * Toggle hard shadows (performance vs quality)
     */
    toggleHardShadows() {
        this.hardShadowsEnabled = !this.hardShadowsEnabled;
        
        // Reconfigure shadow quality
        this.configureShadowQuality();
        
        
        return this.hardShadowsEnabled;
    }

    /**
     * Check if hard shadows are enabled
     */
    areHardShadowsEnabled() {
        return this.hardShadowsEnabled;
    }

    /**
     * Get current directional light intensity
     */
    getDirectionalIntensity() {
        return this.directionalLight ? this.directionalLight.intensity : 1.6;
    }

    /**
     * Get current shadow darkness
     */
    getShadowDarkness() {
        return this.shadowGenerator ? this.shadowGenerator.getDarkness() : 0.4;
    }

    /**
     * Set shadow darkness
     */
    setShadowDarkness(darkness) {
        if (this.shadowGenerator) {
            this.shadowGenerator.setDarkness(darkness);
        }
    }

    /**
     * Get current shadow bias
     */
    getShadowBias() {
        return this.shadowGenerator ? this.shadowGenerator.bias : 0.00043;
    }

    /**
     * Set shadow bias
     */
    setShadowBias(bias) {
        if (this.shadowGenerator) {
            this.shadowGenerator.bias = bias;
        }
    }

    /**
     * Get current shadow normal bias
     */
    getShadowNormalBias() {
        return this.shadowGenerator ? this.shadowGenerator.normalBias : 0.01;
    }

    /**
     * Set shadow normal bias
     */
    setShadowNormalBias(normalBias) {
        if (this.shadowGenerator) {
            this.shadowGenerator.normalBias = normalBias;
        }
    }

    /**
     * Get current shadow depth scale
     */
    getShadowDepthScale() {
        return this.shadowGenerator ? this.shadowGenerator.depthScale : 85;
    }

    /**
     * Set shadow depth scale
     */
    setShadowDepthScale(depthScale) {
        if (this.shadowGenerator) {
            this.shadowGenerator.depthScale = depthScale;
        }
    }

    /**
     * Get current shadow ortho scale
     */
    getShadowOrthoScale() {
        return this.directionalLight ? this.directionalLight.shadowOrthoScale : 260;
    }

    /**
     * Set shadow ortho scale
     */
    setShadowOrthoScale(orthoScale) {
        if (this.directionalLight) {
            this.directionalLight.shadowOrthoScale = orthoScale;
        }
    }

    /**
     * Get current shadow frustum size
     */
    getShadowFrustumSize() {
        return this.directionalLight ? this.directionalLight.shadowFrustumSize : 350;
    }

    /**
     * Set shadow frustum size
     */
    setShadowFrustumSize(frustumSize) {
        if (this.directionalLight) {
            this.directionalLight.shadowFrustumSize = frustumSize;
        }
    }

    /**
     * Optimize shadow settings to reduce noise
     */
    optimizeShadowSettings() {
        if (!this.shadowGenerator) return;
        
        // Reduce shadow acne and noise with improved bias settings
        this.shadowGenerator.bias = this.hardShadowsEnabled ? 0.00043 : 0.00001;
        this.shadowGenerator.normalBias = this.hardShadowsEnabled ? 0.01 : 0.01;
        
        // Enable PCF for smoother shadow edges
        this.shadowGenerator.usePercentageCloserFiltering = true;
        
        // Use exponential shadow maps for better quality
        this.shadowGenerator.useExponentialShadowMap = true;
        
        // Adjust shadow map filtering
        this.shadowGenerator.filteringQuality = BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH;
        
        // Additional settings for edge case handling
        this.shadowGenerator.depthScale = 85; // Optimized from user settings
        this.shadowGenerator.useKernelBlur = false; // Disable for hard shadows
        
    }

    /**
     * Enable shadow receiving on all meshes in the scene
     */
    enableShadowReceivingOnAllMeshes() {
        if (this.scene) {
            this.scene.meshes.forEach(mesh => {
                if (this.isSolidObject(mesh)) {
                    if (this.objectShadowsEnabled) {
                        // Object shadows enabled - enable both receiving and casting
                        mesh.receiveShadows = true;
                        if (this.shadowGenerator) {
                            this.shadowGenerator.addShadowCaster(mesh, true);
                        }
                    } else {
                        // Object shadows disabled - objects cast shadows on ground, but don't receive shadows
                        if (mesh.name === 'earth') {
                            mesh.receiveShadows = true;
                        } else {
                            mesh.receiveShadows = false;
                            if (this.shadowGenerator) {
                                this.shadowGenerator.addShadowCaster(mesh, true);
                            }
                        }
                    }
                }
            });
        }
    }

    /**
     * Disable shadow receiving on all meshes in the scene
     */
    disableShadowReceivingOnAllMeshes() {
        if (this.scene) {
            this.scene.meshes.forEach(mesh => {
                if (this.isSolidObject(mesh)) {
                    mesh.receiveShadows = false;
                    // Also remove from shadow casting
                    if (this.shadowGenerator) {
                        this.shadowGenerator.removeShadowCaster(mesh);
                    }
                }
            });
        }
    }

    /**
     * Set shadow quality
     */
    setShadowQuality(quality) {
        if (!this.shadowGenerator) return;

        switch (quality) {
            case 'low':
                this.shadowGenerator.setDarkness(0.2);
                this.shadowGenerator.blurKernel = 16;
                this.shadowGenerator.useContactHardeningShadow = false;
                // Force hard shadows for low quality
                this.hardShadowsEnabled = true;
                this.configureShadowQuality();
                break;
            case 'medium':
                this.shadowGenerator.setDarkness(0.3);
                this.shadowGenerator.blurKernel = 32;
                this.shadowGenerator.useContactHardeningShadow = true;
                this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.15;
                // Force hard shadows for medium quality
                this.hardShadowsEnabled = true;
                this.configureShadowQuality();
                break;
            case 'high':
                this.shadowGenerator.setDarkness(0.4);
                this.shadowGenerator.blurKernel = 64;
                this.shadowGenerator.useContactHardeningShadow = true;
                this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.1;
                // Force hard shadows for high quality (default)
                this.hardShadowsEnabled = true;
                this.configureShadowQuality();
                break;
        }
    }

    /**
     * Update light direction (time of day simulation)
     */
    updateLightDirection(timeOfDay = 0.5) {
        if (!this.directionalLight) return;

        // Convert time of day (0-1) to sun position
        const angle = (timeOfDay - 0.5) * Math.PI; // -π/2 to π/2
        const x = Math.cos(angle) * 50;
        const y = Math.sin(angle) * 50 + 20;
        const z = 50;

        this.directionalLight.direction = new BABYLON.Vector3(-x, -y, -z).normalize();
        this.directionalLight.position = new BABYLON.Vector3(x, y, z);

        // Adjust intensity based on sun height
        const intensity = Math.max(0.1, Math.sin(angle + Math.PI/2));
        this.directionalLight.intensity = intensity;
    }

    /**
     * Set ambient light intensity
     */
    setAmbientIntensity(intensity) {
        if (this.hemisphericLight) {
            this.hemisphericLight.intensity = Math.max(0, Math.min(1, intensity));
        }
    }

    /**
     * Set directional light intensity
     */
    setDirectionalIntensity(intensity) {
        if (this.directionalLight) {
            this.directionalLight.intensity = Math.max(0, Math.min(2, intensity));
        }
    }

    /**
     * Set directional light position for better shadow distribution
     */
    setDirectionalLightPosition(x, y, z) {
        if (this.directionalLight) {
            this.directionalLight.position = new BABYLON.Vector3(x, y, z);
            // Update direction based on new position
            const direction = new BABYLON.Vector3(-x, -y, -z).normalize();
            this.directionalLight.direction = direction;
        }
    }

    /**
     * Optimize light position for even shadow distribution
     */
    optimizeLightPosition() {
        if (this.directionalLight) {
            // Position light for better shadow coverage across the entire ground
            this.directionalLight.position = new BABYLON.Vector3(-25, 45, 15);
            const direction = new BABYLON.Vector3(0.4, -0.9, 0.2).normalize();
            this.directionalLight.direction = direction;
            
            // Adjust shadow frustum for better coverage
            this.directionalLight.shadowOrthoScale = 80;
            this.directionalLight.shadowFrustumSize = 120;
            
        }
    }

    /**
     * Fine-tune shadow settings for problematic areas
     */
    fineTuneShadowSettings() {
        if (!this.shadowGenerator) return;
        
        // Conservative settings to avoid artifacts
        this.shadowGenerator.bias = 0.00043; // Optimized from user settings
        this.shadowGenerator.normalBias = 0.01; // Optimized from user settings
        this.shadowGenerator.depthScale = 85; // Optimized from user settings
        
        // Ensure PCF is enabled for smoother transitions
        this.shadowGenerator.usePercentageCloserFiltering = true;
        
        // Use exponential shadow maps for better quality
        this.shadowGenerator.useExponentialShadowMap = true;
        
    }

    /**
     * Reset shadow settings to default working state
     */
    resetShadowSettings() {
        if (!this.shadowGenerator) return;
        
        // Reset to proven working settings
        this.shadowGenerator.bias = 0.00043;
        this.shadowGenerator.normalBias = 0.01;
        this.shadowGenerator.depthScale = 85;
        this.shadowGenerator.darkness = 0.4;
        
        // Reset shadow frustum to standard values
        if (this.directionalLight) {
            this.directionalLight.shadowOrthoScale = 80;
            this.directionalLight.shadowFrustumSize = 120;
            this.directionalLight.shadowMinZ = 0.1;
            this.directionalLight.shadowMaxZ = 200;
        }
        
        // Ensure basic quality settings
        this.shadowGenerator.usePercentageCloserFiltering = true;
        this.shadowGenerator.useExponentialShadowMap = true;
        this.shadowGenerator.filteringQuality = BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH;
        
    }

    /**
     * Fix shadow frustum culling issues
     */
    fixShadowFrustumCulling() {
        if (!this.directionalLight || !this.shadowGenerator) return;
        
        // Increase shadow frustum size to cover entire scene
        this.directionalLight.shadowOrthoScale = 260; // Optimized from user settings
        this.directionalLight.shadowFrustumSize = 350; // Optimized from user settings
        
        // Extend shadow range
        this.directionalLight.shadowMinZ = 0.01; // Very close
        this.directionalLight.shadowMaxZ = 500; // Very far
        
        // Increase shadow map resolution for better quality
        this.shadowGenerator.setDarkness(0.4);
        
        // Optimize shadow generator settings for edge cases
        this.shadowGenerator.bias = 0.00043; // Optimized from user settings
        this.shadowGenerator.normalBias = 0.01; // Optimized from user settings
        this.shadowGenerator.depthScale = 85; // Optimized from user settings
        
        // Enable better shadow filtering
        this.shadowGenerator.usePercentageCloserFiltering = true;
        this.shadowGenerator.useExponentialShadowMap = true;
        this.shadowGenerator.filteringQuality = BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH;
        
    }

    /**
     * Fine-tune shadow settings for remaining edge cases
     */
    fineTuneEdgeCases() {
        if (!this.directionalLight || !this.shadowGenerator) return;
        
        // Additional fine-tuning for edge cases
        this.shadowGenerator.bias = 0.0002; // Increased for edge cases
        this.shadowGenerator.normalBias = 0.08; // Increased for better edge handling
        this.shadowGenerator.depthScale = 75; // Increased for better precision
        
        // Ensure PCF is enabled for smoother transitions
        this.shadowGenerator.usePercentageCloserFiltering = true;
        
        // Use exponential shadow maps for better quality
        this.shadowGenerator.useExponentialShadowMap = true;
        
    }

    /**
     * Apply optimized shadow settings from user preferences
     */
    applyOptimizedShadowSettings() {
        if (!this.directionalLight || !this.shadowGenerator) return;
        
        // Apply optimized shadow settings
        this.shadowGenerator.setDarkness(0.4);
        this.shadowGenerator.bias = 0.00043;
        this.shadowGenerator.normalBias = 0.01;
        this.shadowGenerator.depthScale = 85;
        
        // Apply optimized shadow frustum settings
        this.directionalLight.shadowOrthoScale = 260;
        this.directionalLight.shadowFrustumSize = 350;
        this.directionalLight.shadowMinZ = 0.01;
        this.directionalLight.shadowMaxZ = 500;
        
        // Ensure quality settings
        this.shadowGenerator.usePercentageCloserFiltering = true;
        this.shadowGenerator.useExponentialShadowMap = true;
        this.shadowGenerator.filteringQuality = BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH;
        
    }

    /**
     * Ultra-fine shadow tuning for remaining edge cases
     */
    ultraFineShadowTuning() {
        if (!this.directionalLight || !this.shadowGenerator) return;
        
        // Ultra-large shadow frustum for complete coverage
        this.directionalLight.shadowOrthoScale = 300; // Ultra-large coverage
        this.directionalLight.shadowFrustumSize = 500; // Ultra-large coverage
        
        // Ultra-extended shadow range
        this.directionalLight.shadowMinZ = 0.001; // Ultra-close
        this.directionalLight.shadowMaxZ = 800; // Ultra-far
        
        // Ultra-precise shadow generator settings
        this.shadowGenerator.bias = 0.000005; // Ultra-reduced for maximum precision
        this.shadowGenerator.normalBias = 0.005; // Ultra-reduced for maximum precision
        this.shadowGenerator.depthScale = 10; // Ultra-reduced for maximum precision
        
        // Ensure all quality settings are enabled
        this.shadowGenerator.usePercentageCloserFiltering = true;
        this.shadowGenerator.useExponentialShadowMap = true;
        this.shadowGenerator.filteringQuality = BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH;
        
        // Additional quality settings
        this.shadowGenerator.useKernelBlur = false; // Disable for hard shadows
        this.shadowGenerator.useBlurExponentialShadowMap = false; // Disable for hard shadows
        
    }

    /**
     * Optimize shadow resolution for better performance
     */
    optimizeShadowResolution() {
        if (!this.shadowGenerator) return;
        
        // Use balanced resolution for better performance
        // 4096 is a good balance between quality and performance
        this.shadowGenerator.setDarkness(0.3);
        
        // Ensure hard shadows are enabled for better performance
        if (!this.hardShadowsEnabled) {
            this.hardShadowsEnabled = true;
            this.configureShadowQuality();
        }
        
    }

    /**
     * Set shadow map resolution dynamically
     */
    setShadowMapResolution(resolution) {
        if (!this.shadowGenerator) return;
        
        // Resolution options: 1024, 2048, 4096, 8192
        const validResolutions = [1024, 2048, 4096, 8192];
        if (!validResolutions.includes(resolution)) {
            console.warn(`Invalid shadow resolution: ${resolution}. Using 4096.`);
            resolution = 4096;
        }
        
        // Note: ShadowGenerator resolution cannot be changed after creation
        // This method is for future use or recreation
    }

    /**
     * Setup shadows for all objects in the scene
     */
    setupShadowsForAllObjects() {
        if (!this.scene || !this.shadowGenerator) return;
        
        let shadowCasters = 0;
        let shadowReceivers = 0;
        
        this.scene.meshes.forEach(mesh => {
            if (this.isSolidObject(mesh)) {
                if (this.objectShadowsEnabled) {
                    // Object shadows enabled - enable both casting and receiving
                    mesh.receiveShadows = true;
                    this.shadowGenerator.addShadowCaster(mesh, true);
                    shadowCasters++;
                    shadowReceivers++;
                } else {
                    // Object shadows disabled - objects cast shadows on ground, but don't receive shadows
                    if (mesh.name === 'earth') {
                        mesh.receiveShadows = true;
                        shadowReceivers++;
                        // Ground doesn't cast shadows
                    } else {
                        mesh.receiveShadows = false;
                        this.shadowGenerator.addShadowCaster(mesh, true);
                        shadowCasters++;
                    }
                }
            }
        });
        
    }

    /**
     * Update shadows for a newly added object
     */
    updateShadowsForNewObject(mesh) {
        if (!this.shadowGenerator || !mesh) return;
        
        if (this.isSolidObject(mesh)) {
            if (this.objectShadowsEnabled) {
                // Object shadows enabled - enable both casting and receiving
                mesh.receiveShadows = true;
                this.shadowGenerator.addShadowCaster(mesh, true);
            } else {
                // Object shadows disabled - objects cast shadows on ground, but don't receive shadows
                if (mesh.name === 'earth') {
                    mesh.receiveShadows = true;
                    // Ground doesn't cast shadows
                } else {
                    mesh.receiveShadows = false;
                    this.shadowGenerator.addShadowCaster(mesh, true);
                }
            }
            
        }
    }

    /**
     * Start performance monitoring for shadow quality (disabled by default)
     */
    startPerformanceMonitoring() {
        // Performance monitoring is disabled by default
        // Uncomment the following lines to enable automatic quality adjustment:
        /*
        this.performanceCheckInterval = setInterval(() => {
            this.autoAdjustShadowQuality();
        }, 5000);
        */
    }

    /**
     * Stop performance monitoring
     */
    stopPerformanceMonitoring() {
        if (this.performanceCheckInterval) {
            clearInterval(this.performanceCheckInterval);
            this.performanceCheckInterval = null;
        }
    }

    /**
     * Auto-adjust shadow quality based on performance (disabled by default)
     */
    autoAdjustShadowQuality() {
        if (!this.shadowGenerator || !this.scene) return;
        
        const fps = this.scene.getEngine().getFps();
        const shadowCasters = this.shadowGenerator.getShadowMap().renderList.length;
        
        // Adjust quality based on FPS and number of shadow casters
        if (fps < 30 && shadowCasters > 20) {
            // Low performance - reduce quality
            this.setShadowQuality('low');
        } else if (fps < 45 && shadowCasters > 15) {
            // Medium performance - medium quality
            this.setShadowQuality('medium');
        } else {
            // Good performance - high quality
            this.setShadowQuality('high');
        }
    }

    /**
     * Get lighting statistics
     */
    getStats() {
        return {
            shadowsEnabled: this.shadowsEnabled,
            objectShadowsEnabled: this.objectShadowsEnabled,
            hardShadowsEnabled: this.hardShadowsEnabled,
            ambientIntensity: this.hemisphericLight ? this.hemisphericLight.intensity : 0,
            directionalIntensity: this.directionalLight ? this.directionalLight.intensity : 0,
            shadowMapSize: this.shadowGenerator ? 4096 : 0,
            shadowCasters: this.shadowGenerator ? this.shadowGenerator.getShadowMap().renderList.length : 0,
            fps: this.scene ? this.scene.getEngine().getFps() : 0
        };
    }

    /**
     * Dispose of lighting
     */
    dispose() {
        // Stop performance monitoring (if enabled)
        this.stopPerformanceMonitoring();
        
        if (this.shadowGenerator) {
            this.shadowGenerator.dispose();
        }
        if (this.directionalLight) {
            this.directionalLight.dispose();
        }
        if (this.hemisphericLight) {
            this.hemisphericLight.dispose();
        }
    }
}
