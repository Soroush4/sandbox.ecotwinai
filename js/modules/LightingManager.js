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
        // Sun position for Montreal: southeast direction, afternoon sun
        this.directionalLight = new BABYLON.DirectionalLight("directionalLight", 
            new BABYLON.Vector3(0.7, -0.7, -0.1), this.scene);
        this.directionalLight.intensity = 1.8; // Increased from 1.2 to 1.8
        this.directionalLight.diffuse = new BABYLON.Color3(1, 0.98, 0.85); // Warm sunlight
        this.directionalLight.specular = new BABYLON.Color3(1, 0.98, 0.85);

        // Position the directional light (sun position for Montreal - southeast)
        this.directionalLight.position = new BABYLON.Vector3(-40, 60, 30);

        // Setup shadows
        this.setupShadows();
    }

    /**
     * Setup shadow system
     */
    setupShadows() {
        // Create shadow generator
        this.shadowGenerator = new BABYLON.ShadowGenerator(2048, this.directionalLight);
        
        // Configure shadow generator
        this.shadowGenerator.useBlurExponentialShadowMap = true;
        this.shadowGenerator.blurKernel = 32;
        this.shadowGenerator.darkness = 0.3;
        this.shadowGenerator.normalBias = 0.02;

        // Set shadow map size
        this.shadowGenerator.setDarkness(0.3);
    }

    /**
     * Add mesh to shadow casting
     */
    addShadowCaster(mesh) {
        if (this.shadowGenerator && mesh) {
            this.shadowGenerator.addShadowCaster(mesh, true);
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
        }
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
     * Enable shadow receiving on all meshes in the scene
     */
    enableShadowReceivingOnAllMeshes() {
        if (this.scene) {
            this.scene.meshes.forEach(mesh => {
                if (mesh.name !== 'ground' && mesh.name !== '__root__') {
                    mesh.receiveShadows = true;
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
                if (mesh.name !== 'ground' && mesh.name !== '__root__') {
                    mesh.receiveShadows = false;
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
                break;
            case 'medium':
                this.shadowGenerator.setDarkness(0.3);
                this.shadowGenerator.blurKernel = 32;
                break;
            case 'high':
                this.shadowGenerator.setDarkness(0.4);
                this.shadowGenerator.blurKernel = 64;
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
     * Get lighting statistics
     */
    getStats() {
        return {
            shadowsEnabled: this.shadowsEnabled,
            ambientIntensity: this.hemisphericLight ? this.hemisphericLight.intensity : 0,
            directionalIntensity: this.directionalLight ? this.directionalLight.intensity : 0,
            shadowMapSize: this.shadowGenerator ? 2048 : 0
        };
    }

    /**
     * Dispose of lighting
     */
    dispose() {
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
