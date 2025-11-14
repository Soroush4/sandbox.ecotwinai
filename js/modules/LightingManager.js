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
        this.lightHelper = null; // Helper to visualize light position
        this.lightHelperVisible = false; // Default: hidden
        
        this.setupLighting();
    }

    /**
     * Setup lighting system
     */
    setupLighting() {
        // Create hemispheric light for ambient lighting (Montreal sky)
        this.hemisphericLight = new BABYLON.HemisphericLight("hemisphericLight", 
            new BABYLON.Vector3(0, 1, 0), this.scene);
        this.hemisphericLight.intensity = 0.6; // Default from lighting-settings-2025-11-14.json
        this.hemisphericLight.diffuse = new BABYLON.Color3(0.9, 0.95, 1.0); // Cool blue sky
        this.hemisphericLight.specular = new BABYLON.Color3(0.1, 0.1, 0.1);

        // Create directional light (sun) for Montreal (45.5°N latitude)
        // Sun position for Montreal: southeast direction, afternoon sun - optimized for hard shadows
        // Default direction from lighting-settings-2025-11-14.json
        this.directionalLight = new BABYLON.DirectionalLight("directionalLight", 
            new BABYLON.Vector3(0.508603759091104, -0.809755046388385, 0.29260721297832526), this.scene);
        this.directionalLight.intensity = 1.4; // Default from lighting-settings-2025-11-14.json
        this.directionalLight.diffuse = new BABYLON.Color3(1, 0.98, 0.85); // Warm sunlight
        this.directionalLight.specular = new BABYLON.Color3(1, 0.98, 0.85);

        // Position the directional light - Default from lighting-settings-2025-11-14.json
        this.directionalLight.position = new BABYLON.Vector3(-100, 200, -100);
        
        // Optimize directional light for better shadows and reduced noise
        // Use default values from lighting-settings-2025-11-14.json
        this.directionalLight.shadowMinZ = 0.008;
        this.directionalLight.shadowMaxZ = 1590.990257669732; // Extended range for large scenes
        // Start with larger frustum to cover 500x500 scene (diagonal ~707m, so need at least 1000m)
        this.directionalLight.shadowOrthoScale = 1000; // Default from lighting-settings-2025-11-14.json
        this.directionalLight.shadowFrustumSize = 1000; // Default from lighting-settings-2025-11-14.json
        
        // Enable auto-update of shadow frustum based on scene content
        // This ensures shadow frustum automatically adjusts to cover all objects
        this.directionalLight.autoUpdateExtends = true;
        
        // Setup a scene observer to update shadow frustum when objects move
        // This ensures shadows work correctly even when objects are moved to different parts of the scene
        this.setupShadowFrustumUpdateObserver();

        // Setup shadows
        this.setupShadows();
        
        // Set default shadow quality to high with hard shadows
        this.setShadowQuality('high');
        this.configureShadowQuality(); // Ensure hard shadows are applied
        
        // Apply optimized shadow settings from user preferences
        this.applyOptimizedShadowSettings();
        
        // Create light helper to visualize light position
        this.createLightHelper();
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
            this.shadowGenerator.usePercentageCloserFiltering = true; // Enable PCF for smoother edges
        } else {
            // Soft shadows - optimized for quality
            this.shadowGenerator.useBlurExponentialShadowMap = true;
            this.shadowGenerator.blurKernel = 64; // Increased for smoother shadows
            this.shadowGenerator.useContactHardeningShadow = true;
            this.shadowGenerator.contactHardeningLightSizeUVRatio = 0.1;
            this.shadowGenerator.usePercentageCloserFiltering = true; // Enable PCF
        }

        // Apply current shadow settings (don't override with hardcoded values)
        this.applyCurrentShadowSettings();
    }

    /**
     * Apply current shadow settings to shadow generator
     */
    applyCurrentShadowSettings() {
        if (!this.shadowGenerator) return;

        // Apply current shadow settings from getter methods
        this.shadowGenerator.setDarkness(this.getShadowDarkness());
        this.shadowGenerator.bias = this.getShadowBias();
        this.shadowGenerator.normalBias = this.getShadowNormalBias();
        this.shadowGenerator.depthScale = this.getShadowDepthScale();
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
            // Don't override darkness here - let it be set by configureShadowQuality
            // this.shadowGenerator.setDarkness(0.3);
            this.shadowGenerator.useBlurExponentialShadowMap = true;
            this.shadowGenerator.useKernelBlur = true;
            this.shadowGenerator.blurKernel = 32;
            // Re-enable shadow receiving on all meshes
            this.enableShadowReceivingOnAllMeshes();
            // Reconfigure shadow quality to apply proper settings
            this.configureShadowQuality();
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
        return this.shadowGenerator ? this.shadowGenerator.getDarkness() : 0.25;
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
        return this.shadowGenerator ? this.shadowGenerator.bias : 0.001;
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
        return this.shadowGenerator ? this.shadowGenerator.normalBias : 0.2;
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
        return this.shadowGenerator ? this.shadowGenerator.depthScale : 200;
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
        return this.directionalLight ? this.directionalLight.shadowOrthoScale : 500;
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
        return this.directionalLight ? this.directionalLight.shadowFrustumSize : 600;
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
     * Uses default values from lighting-settings-2025-11-13.json
     */
    optimizeShadowSettings() {
        if (!this.shadowGenerator) return;
        
        // Use default values from lighting-settings-2025-11-13.json
        this.shadowGenerator.bias = 0.001;
        this.shadowGenerator.normalBias = 0.2;
        this.shadowGenerator.depthScale = 200;
        
        // Enable PCF for smoother shadow edges
        this.shadowGenerator.usePercentageCloserFiltering = true;
        
        // Use exponential shadow maps for better quality
        this.shadowGenerator.useExponentialShadowMap = true;
        
        // Adjust shadow map filtering
        this.shadowGenerator.filteringQuality = BABYLON.Constants.TEXTURE_FILTERING_QUALITY_HIGH;
        
        // Disable kernel blur for hard shadows
        this.shadowGenerator.useKernelBlur = false;
        
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
        
        // Apply optimized shadow settings from lighting-settings-2025-11-14.json
        this.shadowGenerator.setDarkness(0.1);
        this.shadowGenerator.bias = 0.001;
        this.shadowGenerator.normalBias = 0.11;
        this.shadowGenerator.depthScale = 115;
        
        // Apply optimized shadow frustum settings from lighting-settings-2025-11-14.json
        this.directionalLight.shadowOrthoScale = 1000;
        this.directionalLight.shadowFrustumSize = 1000;
        this.directionalLight.shadowMinZ = 0.008;
        this.directionalLight.shadowMaxZ = 1590.990257669732; // Extended range for large scenes
        
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
            
            // If autoUpdateExtends is enabled, the shadow frustum will automatically adjust
            // Otherwise, we can manually trigger an update
            if (this.directionalLight && this.directionalLight.autoUpdateExtends) {
                // Shadow frustum will auto-update, but we can also force a manual update
                // by calling autoAdjustShadowFrustum after a short delay
                setTimeout(() => {
                    this.autoAdjustShadowFrustum();
                }, 100);
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
     * Debug shadow frustum coverage - helps identify shadow issues
     * Call this function from browser console to see shadow frustum information
     */
    debugShadowFrustum() {
        if (!this.directionalLight || !this.shadowGenerator) {
            console.warn('Shadow system not initialized');
            return;
        }
        
        console.log('=== Shadow Frustum Debug Information ===');
        console.log(`Shadow Ortho Scale: ${this.directionalLight.shadowOrthoScale}`);
        console.log(`Shadow Frustum Size: ${this.directionalLight.shadowFrustumSize}`);
        console.log(`Shadow Min Z: ${this.directionalLight.shadowMinZ}`);
        console.log(`Shadow Max Z: ${this.directionalLight.shadowMaxZ}`);
        console.log(`Shadow Map Size: ${this.shadowGenerator.getShadowMap().getSize().width}x${this.shadowGenerator.getShadowMap().getSize().height}`);
        console.log(`Shadow Bias: ${this.shadowGenerator.bias}`);
        console.log(`Shadow Normal Bias: ${this.shadowGenerator.normalBias}`);
        console.log(`Shadow Depth Scale: ${this.shadowGenerator.depthScale}`);
        
        // Calculate coverage area
        const coverageX = this.directionalLight.shadowFrustumSize;
        const coverageZ = this.directionalLight.shadowFrustumSize;
        console.log(`\nShadow Coverage Area: ${coverageX}m x ${coverageZ}m`);
        console.log(`Coverage Radius: ${Math.sqrt(coverageX * coverageX + coverageZ * coverageZ) / 2}m from center`);
        
        // Check scene bounds
        if (this.scene) {
            const meshes = this.scene.meshes.filter(m => m.name && !m.name.includes('_wireframe') && !m.name.includes('_helper'));
            if (meshes.length > 0) {
                let minX = Infinity, maxX = -Infinity;
                let minZ = Infinity, maxZ = -Infinity;
                
                meshes.forEach(mesh => {
                    const boundingBox = mesh.getBoundingInfo();
                    const min = boundingBox.boundingBox.minimumWorld;
                    const max = boundingBox.boundingBox.maximumWorld;
                    
                    minX = Math.min(minX, min.x);
                    maxX = Math.max(maxX, max.x);
                    minZ = Math.min(minZ, min.z);
                    maxZ = Math.max(maxZ, max.z);
                });
                
                const sceneWidth = maxX - minX;
                const sceneDepth = maxZ - minZ;
                const sceneRadius = Math.sqrt(sceneWidth * sceneWidth + sceneDepth * sceneDepth) / 2;
                
                console.log(`\nScene Bounds:`);
                console.log(`  X: ${minX.toFixed(2)} to ${maxX.toFixed(2)} (width: ${sceneWidth.toFixed(2)}m)`);
                console.log(`  Z: ${minZ.toFixed(2)} to ${maxZ.toFixed(2)} (depth: ${sceneDepth.toFixed(2)}m)`);
                console.log(`  Scene Radius: ${sceneRadius.toFixed(2)}m from center`);
                
                const coverageRadius = Math.sqrt(coverageX * coverageX + coverageZ * coverageZ) / 2;
                if (coverageRadius < sceneRadius) {
                    console.warn(`\n⚠️ WARNING: Shadow coverage (${coverageRadius.toFixed(2)}m) is smaller than scene radius (${sceneRadius.toFixed(2)}m)!`);
                    console.warn(`   Objects beyond ${coverageRadius.toFixed(2)}m from center may have incorrect shadows.`);
                    console.warn(`   Recommended: Increase shadowOrthoScale and shadowFrustumSize to at least ${(sceneRadius * 1.2).toFixed(0)}`);
                } else {
                    console.log(`\n✓ Shadow coverage (${coverageRadius.toFixed(2)}m) is sufficient for scene (${sceneRadius.toFixed(2)}m)`);
                }
            }
        }
        
        console.log('\n=== End Shadow Debug ===');
    }

    /**
     * Auto-adjust shadow frustum based on scene bounds
     * This ensures shadow frustum is centered on the actual scene content
     */
    autoAdjustShadowFrustum() {
        if (!this.directionalLight || !this.scene) return;
        
        // Find scene bounds - include ALL meshes including TransformNodes (trees)
        const meshes = this.scene.meshes.filter(m => 
            m.name && 
            !m.name.includes('_wireframe') && 
            !m.name.includes('_helper') && 
            m.name !== 'earth' && 
            m.name !== 'grid' &&
            m.isEnabled()
        );
        
        // Also include TransformNodes (like tree parents)
        const transformNodes = this.scene.transformNodes.filter(node => 
            node.name && 
            (node.name.startsWith('tree_') || node.name.startsWith('simple_tree_')) &&
            node.isEnabled()
        );
        
        if (meshes.length === 0 && transformNodes.length === 0) {
            console.warn('No meshes or transform nodes found for shadow frustum adjustment');
            return;
        }
        
        let minX = Infinity, maxX = -Infinity;
        let minZ = Infinity, maxZ = -Infinity;
        
        // Process meshes
        meshes.forEach(mesh => {
            try {
                const boundingBox = mesh.getBoundingInfo();
                if (boundingBox && boundingBox.boundingBox) {
                    const min = boundingBox.boundingBox.minimumWorld;
                    const max = boundingBox.boundingBox.maximumWorld;
                    
                    minX = Math.min(minX, min.x);
                    maxX = Math.max(maxX, max.x);
                    minZ = Math.min(minZ, min.z);
                    maxZ = Math.max(maxZ, max.z);
                }
            } catch (e) {
                // Skip meshes with invalid bounding boxes
            }
        });
        
        // Process TransformNodes (trees)
        transformNodes.forEach(node => {
            try {
                const childMeshes = node.getChildMeshes();
                if (childMeshes.length > 0) {
                    childMeshes.forEach(mesh => {
                        const boundingBox = mesh.getBoundingInfo();
                        if (boundingBox && boundingBox.boundingBox) {
                            const min = boundingBox.boundingBox.minimumWorld;
                            const max = boundingBox.boundingBox.maximumWorld;
                            
                            minX = Math.min(minX, min.x);
                            maxX = Math.max(maxX, max.x);
                            minZ = Math.min(minZ, min.z);
                            maxZ = Math.max(maxZ, max.z);
                        }
                    });
                } else {
                    // If no child meshes, use node position
                    const pos = node.getAbsolutePosition();
                    if (pos) {
                        minX = Math.min(minX, pos.x - 5); // Assume 5m radius for trees
                        maxX = Math.max(maxX, pos.x + 5);
                        minZ = Math.min(minZ, pos.z - 5);
                        maxZ = Math.max(maxZ, pos.z + 5);
                    }
                }
            } catch (e) {
                // Skip invalid transform nodes
            }
        });
        
        // Check if we have valid bounds
        if (minX === Infinity || maxX === -Infinity || minZ === Infinity || maxZ === -Infinity) {
            console.warn('Invalid scene bounds for shadow frustum adjustment');
            return;
        }
        
        const sceneWidth = maxX - minX;
        const sceneDepth = maxZ - minZ;
        const sceneCenterX = (minX + maxX) / 2;
        const sceneCenterZ = (minZ + maxZ) / 2;
        const sceneRadius = Math.sqrt(sceneWidth * sceneWidth + sceneDepth * sceneDepth) / 2;
        
        // For a 500x500 scene, we need to ensure full coverage including corners
        // Calculate diagonal distance to ensure all corners are covered
        const diagonalDistance = Math.sqrt(sceneWidth * sceneWidth + sceneDepth * sceneDepth);
        
        // Set frustum size to cover scene with 40% margin (increased for safety)
        // Use diagonal distance to ensure corners are covered, especially for 500x500 scene
        // For 500x500: diagonal = sqrt(500^2 + 500^2) = ~707m, so need at least 1000m
        const frustumSize = Math.max(1000, Math.max(diagonalDistance * 1.4, sceneRadius * 2.8));
        
        // Update shadow frustum parameters
        this.directionalLight.shadowOrthoScale = frustumSize;
        this.directionalLight.shadowFrustumSize = frustumSize;
        this.directionalLight.shadowMaxZ = Math.max(1500, sceneRadius * 5);
        
        // CRITICAL: Enable auto-update of shadow frustum
        // This ensures shadow frustum automatically adjusts to cover all objects
        this.directionalLight.autoUpdateExtends = true;
        
        // IMPORTANT: For directional lights, the shadow frustum needs to be properly centered
        // autoUpdateExtends should handle this, but we can also manually ensure proper centering
        // by forcing the shadow map to recalculate its projection matrix
        
        // Force a shadow map refresh to apply the new frustum settings
        if (this.shadowGenerator) {
            // Force shadow map to recalculate with new frustum
            this.shadowGenerator.forceCompilation = true;
            
            // Get shadow map and force it to update its projection
            try {
                const shadowMap = this.shadowGenerator.getShadowMap();
                if (shadowMap) {
                    // Force shadow map to recalculate projection matrix
                    shadowMap.render();
                    
                    // Also try to force update the light's shadow projection
                    // This ensures the frustum is properly centered on the scene
                    if (this.directionalLight.getShadowGenerator) {
                        const lightShadowGen = this.directionalLight.getShadowGenerator();
                        if (lightShadowGen && lightShadowGen.forceCompilation !== undefined) {
                            lightShadowGen.forceCompilation = true;
                        }
                    }
                }
            } catch (e) {
                // Shadow map render might fail if scene is not ready, that's okay
                console.warn('Could not force shadow map render:', e);
            }
        }
        
        // Additional step: Ensure the directional light's shadow projection is updated
        // This is critical for proper shadow frustum centering
        if (this.directionalLight) {
            // Force the light to recalculate its shadow projection matrix
            // This ensures the frustum is centered on the actual scene content
            this.directionalLight.autoUpdateExtends = true;
            
            // Trigger a scene render to force shadow map update
            if (this.scene) {
                // Schedule shadow map update for next frame
                this.scene.onBeforeRenderObservable.addOnce(() => {
                    if (this.shadowGenerator) {
                        try {
                            this.shadowGenerator.getShadowMap().render();
                        } catch (e) {
                            // Ignore errors
                        }
                    }
                });
            }
        }
        
        console.log(`Auto-adjusted shadow frustum: ${frustumSize.toFixed(2)}m (scene radius: ${sceneRadius.toFixed(2)}m, center: X=${sceneCenterX.toFixed(2)}, Z=${sceneCenterZ.toFixed(2)})`);
        console.log(`Scene bounds: X[${minX.toFixed(2)}, ${maxX.toFixed(2)}] Z[${minZ.toFixed(2)}, ${maxZ.toFixed(2)}]`);
        console.log(`Scene size: ${sceneWidth.toFixed(2)}m x ${sceneDepth.toFixed(2)}m`);
        console.log(`Diagonal distance: ${diagonalDistance.toFixed(2)}m`);
        console.log(`Shadow coverage: ${frustumSize.toFixed(2)}m x ${frustumSize.toFixed(2)}m`);
        
        // Warn if coverage might be insufficient
        if (frustumSize < diagonalDistance * 1.2) {
            console.warn(`⚠️ Shadow frustum might be too small! Frustum: ${frustumSize.toFixed(2)}m, Diagonal: ${diagonalDistance.toFixed(2)}m`);
            console.warn(`   Recommended: Increase frustum size to at least ${(diagonalDistance * 1.4).toFixed(0)}m`);
        } else {
            console.log(`✓ Shadow frustum is sufficient to cover the entire scene`);
        }
    }

    /**
     * Setup observer to update shadow frustum when objects move
     * This ensures shadows work correctly across the entire scene
     */
    setupShadowFrustumUpdateObserver() {
        if (!this.scene || !this.directionalLight) return;
        
        // Use a debounce mechanism to avoid updating too frequently
        let updateTimeout = null;
        const updateShadowFrustum = () => {
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            updateTimeout = setTimeout(() => {
                this.autoAdjustShadowFrustum();
            }, 500); // Update after 500ms of no changes
        };
        
        // Observe scene changes and update shadow frustum
        this.scene.onBeforeRenderObservable.add(() => {
            // Check if any objects have moved significantly
            // This is a lightweight check that runs every frame
            // The actual frustum update is debounced
            if (this.directionalLight.autoUpdateExtends) {
                // autoUpdateExtends should handle this automatically
                // But we can also manually trigger updates if needed
            }
        });
        
        // Also update when new meshes are added
        this.scene.onNewMeshAddedObservable.add((mesh) => {
            if (this.isSolidObject(mesh)) {
                updateShadowFrustum();
            }
        });
    }

    /**
     * Create a visual helper to show light position and direction
     */
    createLightHelper() {
        if (!this.directionalLight) return;
        
        // Remove existing helper if any
        if (this.lightHelper) {
            this.lightHelper.dispose();
        }
        
        // Create a sphere to represent the light position
        const lightSphere = BABYLON.MeshBuilder.CreateSphere("lightPositionHelper", {
            diameter: 3,
            segments: 16
        }, this.scene);
        
        // Create a bright yellow material for the light
        const lightMaterial = new BABYLON.StandardMaterial("lightHelperMaterial", this.scene);
        lightMaterial.emissiveColor = new BABYLON.Color3(1, 0.9, 0.3); // Bright yellow
        lightMaterial.diffuseColor = new BABYLON.Color3(1, 0.9, 0.3);
        lightMaterial.specularColor = new BABYLON.Color3(1, 1, 1);
        lightMaterial.emissiveIntensity = 1.0;
        // Don't disable lighting - let it be affected by scene lighting like other objects
        // This ensures consistent rendering priority with other models
        lightSphere.material = lightMaterial;
        
        // Position the sphere at the light position
        lightSphere.position = this.directionalLight.position.clone();
        
        // Set same rendering priority as other models (renderingGroupId = 1)
        lightSphere.renderingGroupId = 1;
        
        // Create an arrow to show light direction
        // Calculate a point in the direction of the light (100m away)
        const lightDirection = this.directionalLight.direction.normalize();
        const arrowLength = 50; // 50 meters
        const arrowEnd = lightSphere.position.add(lightDirection.scale(arrowLength));
        
        // Create arrow using a cylinder and cone
        const arrowBody = BABYLON.MeshBuilder.CreateCylinder("lightDirectionBody", {
            height: arrowLength * 0.8,
            diameter: 0.5
        }, this.scene);
        
        const arrowHead = BABYLON.MeshBuilder.CreateCylinder("lightDirectionHead", {
            height: arrowLength * 0.2,
            diameterTop: 0,
            diameterBottom: 2
        }, this.scene);
        
        // Position arrow body
        const midPoint = BABYLON.Vector3.Lerp(lightSphere.position, arrowEnd, 0.4);
        arrowBody.position = midPoint;
        
        // Position arrow head at the end
        arrowHead.position = arrowEnd;
        
        // Rotate arrow to point in light direction
        const up = new BABYLON.Vector3(0, 1, 0);
        const rotationAxis = BABYLON.Vector3.Cross(up, lightDirection);
        const rotationAngle = Math.acos(BABYLON.Vector3.Dot(up, lightDirection));
        
        if (rotationAxis.length() > 0.001) {
            arrowBody.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, rotationAngle);
            arrowHead.rotationQuaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, rotationAngle);
        }
        
        // Apply same material to arrow
        arrowBody.material = lightMaterial;
        arrowHead.material = lightMaterial;
        
        // Set same rendering priority as other models (renderingGroupId = 1)
        arrowBody.renderingGroupId = 1;
        arrowHead.renderingGroupId = 1;
        
        // Create a parent mesh to group all helper parts
        this.lightHelper = new BABYLON.TransformNode("lightHelper", this.scene);
        lightSphere.parent = this.lightHelper;
        arrowBody.parent = this.lightHelper;
        arrowHead.parent = this.lightHelper;
        
        // Store references for later updates
        this.lightHelper.sphere = lightSphere;
        this.lightHelper.arrowBody = arrowBody;
        this.lightHelper.arrowHead = arrowHead;
        
        // Set initial visibility
        this.lightHelper.setEnabled(this.lightHelperVisible);
        
        // Mark as helper so it's excluded from shadow calculations
        // Ensure userData exists before setting properties
        if (!lightSphere.userData) lightSphere.userData = {};
        if (!arrowBody.userData) arrowBody.userData = {};
        if (!arrowHead.userData) arrowHead.userData = {};
        
        lightSphere.userData.isHelper = true;
        arrowBody.userData.isHelper = true;
        arrowHead.userData.isHelper = true;
        
        // Don't cast shadows
        if (this.shadowGenerator) {
            this.shadowGenerator.removeShadowCaster(lightSphere);
            this.shadowGenerator.removeShadowCaster(arrowBody);
            this.shadowGenerator.removeShadowCaster(arrowHead);
        }
        
        console.log('Light helper created at position:', this.directionalLight.position);
    }
    
    /**
     * Update light helper position and direction
     */
    updateLightHelper() {
        if (!this.lightHelper || !this.directionalLight) return;
        
        // Update sphere position
        if (this.lightHelper.sphere) {
            this.lightHelper.sphere.position = this.directionalLight.position.clone();
        }
        
        // Update arrow direction
        if (this.lightHelper.arrowBody && this.lightHelper.arrowHead) {
            const lightDirection = this.directionalLight.direction.normalize();
            const arrowLength = 50;
            const arrowEnd = this.directionalLight.position.add(lightDirection.scale(arrowLength));
            
            const midPoint = BABYLON.Vector3.Lerp(this.directionalLight.position, arrowEnd, 0.4);
            this.lightHelper.arrowBody.position = midPoint;
            this.lightHelper.arrowHead.position = arrowEnd;
            
            // Rotate arrow to point in light direction
            const up = new BABYLON.Vector3(0, 1, 0);
            const rotationAxis = BABYLON.Vector3.Cross(up, lightDirection);
            const rotationAngle = Math.acos(BABYLON.Vector3.Dot(up, lightDirection));
            
            if (rotationAxis.length() > 0.001) {
                const quaternion = BABYLON.Quaternion.RotationAxis(rotationAxis, rotationAngle);
                this.lightHelper.arrowBody.rotationQuaternion = quaternion.clone();
                this.lightHelper.arrowHead.rotationQuaternion = quaternion.clone();
            }
        }
    }
    
    /**
     * Toggle light helper visibility
     */
    toggleLightHelper() {
        this.lightHelperVisible = !this.lightHelperVisible;
        if (this.lightHelper) {
            this.lightHelper.setEnabled(this.lightHelperVisible);
        }
        return this.lightHelperVisible;
    }
    
    /**
     * Show light helper
     */
    showLightHelper() {
        this.lightHelperVisible = true;
        if (this.lightHelper) {
            this.lightHelper.setEnabled(true);
        }
    }
    
    /**
     * Hide light helper
     */
    hideLightHelper() {
        this.lightHelperVisible = false;
        if (this.lightHelper) {
            this.lightHelper.setEnabled(false);
        }
    }

    /**
     * Dispose of lighting
     */
    dispose() {
        // Stop performance monitoring (if enabled)
        this.stopPerformanceMonitoring();
        
        // Dispose light helper
        if (this.lightHelper) {
            this.lightHelper.dispose();
            this.lightHelper = null;
        }
        
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
