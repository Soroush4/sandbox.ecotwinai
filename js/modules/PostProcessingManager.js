/**
 * PostProcessingManager - Manages post-processing effects for the scene
 */
class PostProcessingManager {
    constructor(scene) {
        this.scene = scene;
        this.engine = scene.getEngine();
        this.pipeline = null;
        this.ssaoPipeline = null; // Separate SSAO pipeline if needed
        this.ssaoAvailable = true; // Track if SSAO is available
        this.effects = {
            bloom: null,
            blur: null,
            chromaticAberration: null,
            colorCorrection: null,
            depthOfField: null,
            fxaa: null,
            grain: null,
            sharpen: null,
            vignette: null,
            ssao: null
        };
        
        // Settings
        this.settings = {
            bloom: {
                enabled: false,
                threshold: 0.9,
                weight: 0.3,
                kernelSize: 64,
                scale: 0.5
            },
            blur: {
                enabled: false,
                kernel: 32
            },
            chromaticAberration: {
                enabled: false,
                aberrationAmount: 0.5,
                radialIntensity: 0.5,
                direction: new BABYLON.Vector2(1.0, 1.0)
            },
            colorCorrection: {
                enabled: false,
                exposure: 1.0,
                contrast: 1.0,
                saturation: 1.0
            },
            depthOfField: {
                enabled: false,
                focusDistance: 10.0,
                lensSize: 0.1,
                fStop: 1.4
            },
            fxaa: {
                enabled: true
            },
            grain: {
                enabled: false,
                intensity: 0.5,
                animated: true
            },
            sharpen: {
                enabled: false,
                edgeAmount: 0.3
            },
            vignette: {
                enabled: false,
                color: new BABYLON.Color4(0, 0, 0, 1),
                scale: 0.5,
                power: 0.5
            },
            ssao: {
                enabled: false,
                radius: 2.0,
                samples: 16,
                strength: 1.0
            }
        };
        
        this.init();
    }
    
    /**
     * Initialize post-processing pipeline
     */
    init() {
        try {
            // Create default rendering pipeline
            this.pipeline = new BABYLON.DefaultRenderingPipeline(
                "defaultPipeline",
                true,
                this.scene,
                [this.scene.activeCamera]
            );
            
            // Initialize SSAO using SSAO2RenderingPipeline (separate pipeline)
            // This is the recommended way to use SSAO in Babylon.js
            try {
                if (typeof BABYLON.SSAO2RenderingPipeline !== 'undefined') {
                    // Create SSAO2RenderingPipeline - this is a separate pipeline that works independently
                    this.ssaoPipeline = new BABYLON.SSAO2RenderingPipeline(
                        "ssaoPipeline",
                        this.scene,
                        {
                            ssaoRatio: 0.5,      // Ratio for SSAO (0.5 = half resolution for performance)
                            combineRatio: 1.0     // Ratio for combining SSAO with original image
                        },
                        [this.scene.activeCamera]
                    );
                    
                    // Set default values
                    this.ssaoPipeline.radius = this.settings.ssao.radius;
                    this.ssaoPipeline.samples = this.settings.ssao.samples;
                    this.ssaoPipeline.totalStrength = this.settings.ssao.strength;
                    
                    // Start with SSAO disabled
                    this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                    
                    this.effects.ssao = this.ssaoPipeline;
                    this.ssaoAvailable = true;
                    // console.log('SSAO2RenderingPipeline created successfully');
                } else {
                    console.warn('SSAO2RenderingPipeline not available in this version of Babylon.js');
                    this.ssaoAvailable = false;
                    this.settings.ssao.enabled = false;
                }
            } catch (error) {
                console.warn('Error creating SSAO2RenderingPipeline:', error);
                this.ssaoAvailable = false;
                this.settings.ssao.enabled = false;
            }
            
            // Initialize all effects
            this.setupEffects();
            
            // console.log('PostProcessingManager initialized');
        } catch (error) {
            console.error('Error initializing PostProcessingManager:', error);
        }
    }
    
    /**
     * Setup all post-processing effects
     */
    setupEffects() {
        // FXAA (Fast Approximate Anti-Aliasing)
        this.pipeline.fxaaEnabled = this.settings.fxaa.enabled;
        this.effects.fxaa = this.pipeline.fxaa;
        
        // Bloom
        this.pipeline.bloomEnabled = this.settings.bloom.enabled;
        if (this.pipeline.bloom) {
            this.pipeline.bloom.threshold = this.settings.bloom.threshold;
            this.pipeline.bloom.weight = this.settings.bloom.weight;
            this.pipeline.bloom.kernelSize = this.settings.bloom.kernelSize;
            this.pipeline.bloom.scale = this.settings.bloom.scale;
        }
        
        // Image Processing (includes color correction, grain, etc.)
        this.pipeline.imageProcessingEnabled = true;
        const imageProcessing = this.pipeline.imageProcessing;
        
        if (imageProcessing) {
            // Color Correction
            imageProcessing.exposure = this.settings.colorCorrection.exposure;
            imageProcessing.contrast = this.settings.colorCorrection.contrast;
            imageProcessing.saturation = this.settings.colorCorrection.saturation;
            
            // Grain
            imageProcessing.grainEnabled = this.settings.grain.enabled;
            imageProcessing.grainIntensity = this.settings.grain.intensity;
            imageProcessing.grainAnimated = this.settings.grain.animated;
            
            // Vignette
            imageProcessing.vignetteEnabled = this.settings.vignette.enabled;
            imageProcessing.vignetteColor = this.settings.vignette.color;
            imageProcessing.vignetteWeight = this.settings.vignette.scale;
            imageProcessing.vignetteBlendMode = BABYLON.ImageProcessingConfiguration.VIGNETTEMODE_MULTIPLY;
        }
        
        // Chromatic Aberration
        if (this.pipeline.chromaticAberration) {
            this.pipeline.chromaticAberrationEnabled = this.settings.chromaticAberration.enabled;
            this.pipeline.chromaticAberration.aberrationAmount = this.settings.chromaticAberration.aberrationAmount;
            this.pipeline.chromaticAberration.radialIntensity = this.settings.chromaticAberration.radialIntensity;
            this.pipeline.chromaticAberration.direction = this.settings.chromaticAberration.direction;
        }
        
        // Depth of Field
        if (this.pipeline.depthOfField) {
            this.pipeline.depthOfFieldEnabled = this.settings.depthOfField.enabled;
            this.pipeline.depthOfField.focusDistance = this.settings.depthOfField.focusDistance;
            this.pipeline.depthOfField.lensSize = this.settings.depthOfField.lensSize;
            this.pipeline.depthOfField.fStop = this.settings.depthOfField.fStop;
        }
        
        // Sharpen
        if (this.pipeline.sharpen) {
            this.pipeline.sharpenEnabled = this.settings.sharpen.enabled;
            this.pipeline.sharpen.edgeAmount = this.settings.sharpen.edgeAmount;
        }
        
        // SSAO (Screen Space Ambient Occlusion)
        // Use SSAO2RenderingPipeline (separate pipeline)
        if (this.ssaoPipeline) {
            try {
                if (this.settings.ssao.enabled) {
                    // Attach SSAO pipeline to camera
                    this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                } else {
                    // Detach SSAO pipeline from camera
                    this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                }
                
                // Update SSAO parameters
                this.ssaoPipeline.radius = this.settings.ssao.radius;
                this.ssaoPipeline.samples = this.settings.ssao.samples;
                this.ssaoPipeline.totalStrength = this.settings.ssao.strength;
            } catch (ssaoError) {
                console.warn('Error setting up SSAO:', ssaoError);
                this.settings.ssao.enabled = false;
                if (this.ssaoPipeline) {
                    this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                }
            }
        }
    }
    
    /**
     * Enable/Disable Bloom effect
     */
    setBloomEnabled(enabled) {
        this.settings.bloom.enabled = enabled;
        if (this.pipeline) {
            this.pipeline.bloomEnabled = enabled;
        }
    }
    
    /**
     * Set Bloom parameters
     */
    setBloomSettings(threshold, weight, kernelSize, scale) {
        this.settings.bloom.threshold = threshold;
        this.settings.bloom.weight = weight;
        this.settings.bloom.kernelSize = kernelSize;
        this.settings.bloom.scale = scale;
        
        if (this.pipeline && this.pipeline.bloom) {
            this.pipeline.bloom.threshold = threshold;
            this.pipeline.bloom.weight = weight;
            this.pipeline.bloom.kernelSize = kernelSize;
            this.pipeline.bloom.scale = scale;
        }
    }
    
    /**
     * Enable/Disable FXAA
     */
    setFXAAEnabled(enabled) {
        this.settings.fxaa.enabled = enabled;
        if (this.pipeline) {
            this.pipeline.fxaaEnabled = enabled;
        }
    }
    
    /**
     * Enable/Disable Chromatic Aberration
     */
    setChromaticAberrationEnabled(enabled) {
        this.settings.chromaticAberration.enabled = enabled;
        if (this.pipeline) {
            this.pipeline.chromaticAberrationEnabled = enabled;
        }
    }
    
    /**
     * Set Chromatic Aberration parameters
     */
    setChromaticAberrationSettings(aberrationAmount, radialIntensity) {
        this.settings.chromaticAberration.aberrationAmount = aberrationAmount;
        this.settings.chromaticAberration.radialIntensity = radialIntensity;
        
        if (this.pipeline && this.pipeline.chromaticAberration) {
            this.pipeline.chromaticAberration.aberrationAmount = aberrationAmount;
            this.pipeline.chromaticAberration.radialIntensity = radialIntensity;
        }
    }
    
    /**
     * Set Color Correction parameters
     */
    setColorCorrectionSettings(exposure, contrast, saturation) {
        this.settings.colorCorrection.exposure = exposure;
        this.settings.colorCorrection.contrast = contrast;
        this.settings.colorCorrection.saturation = saturation;
        
        if (this.pipeline && this.pipeline.imageProcessing) {
            this.pipeline.imageProcessing.exposure = exposure;
            this.pipeline.imageProcessing.contrast = contrast;
            this.pipeline.imageProcessing.saturation = saturation;
        }
    }
    
    /**
     * Enable/Disable Depth of Field
     */
    setDepthOfFieldEnabled(enabled) {
        this.settings.depthOfField.enabled = enabled;
        if (this.pipeline) {
            this.pipeline.depthOfFieldEnabled = enabled;
        }
    }
    
    /**
     * Set Depth of Field parameters
     */
    setDepthOfFieldSettings(focusDistance, lensSize, fStop) {
        this.settings.depthOfField.focusDistance = focusDistance;
        this.settings.depthOfField.lensSize = lensSize;
        this.settings.depthOfField.fStop = fStop;
        
        if (this.pipeline && this.pipeline.depthOfField) {
            this.pipeline.depthOfField.focusDistance = focusDistance;
            this.pipeline.depthOfField.lensSize = lensSize;
            this.pipeline.depthOfField.fStop = fStop;
        }
    }
    
    /**
     * Enable/Disable Grain
     */
    setGrainEnabled(enabled) {
        this.settings.grain.enabled = enabled;
        if (this.pipeline && this.pipeline.imageProcessing) {
            this.pipeline.imageProcessing.grainEnabled = enabled;
        }
    }
    
    /**
     * Set Grain parameters
     */
    setGrainSettings(intensity, animated) {
        this.settings.grain.intensity = intensity;
        this.settings.grain.animated = animated;
        
        if (this.pipeline && this.pipeline.imageProcessing) {
            this.pipeline.imageProcessing.grainIntensity = intensity;
            this.pipeline.imageProcessing.grainAnimated = animated;
        }
    }
    
    /**
     * Enable/Disable Sharpen
     */
    setSharpenEnabled(enabled) {
        this.settings.sharpen.enabled = enabled;
        if (this.pipeline) {
            this.pipeline.sharpenEnabled = enabled;
        }
    }
    
    /**
     * Set Sharpen parameters
     */
    setSharpenSettings(edgeAmount) {
        this.settings.sharpen.edgeAmount = edgeAmount;
        
        if (this.pipeline && this.pipeline.sharpen) {
            this.pipeline.sharpen.edgeAmount = edgeAmount;
        }
    }
    
    /**
     * Enable/Disable Vignette
     */
    setVignetteEnabled(enabled) {
        this.settings.vignette.enabled = enabled;
        if (this.pipeline && this.pipeline.imageProcessing) {
            this.pipeline.imageProcessing.vignetteEnabled = enabled;
        }
    }
    
    /**
     * Set Vignette parameters
     */
    setVignetteSettings(scale, power, color) {
        this.settings.vignette.scale = scale;
        this.settings.vignette.power = power;
        if (color) {
            this.settings.vignette.color = color;
        }
        
        if (this.pipeline && this.pipeline.imageProcessing) {
            this.pipeline.imageProcessing.vignetteWeight = scale;
            if (color) {
                this.pipeline.imageProcessing.vignetteColor = color;
            }
        }
    }
    
    /**
     * Enable/Disable SSAO
     */
    setSSAOEnabled(enabled) {
        if (!this.ssaoAvailable || !this.ssaoPipeline) {
            console.warn('SSAO is not available');
            this.settings.ssao.enabled = false;
            return;
        }
        
        this.settings.ssao.enabled = enabled;
        try {
            if (enabled) {
                // Attach SSAO pipeline to camera
                this.scene.postProcessRenderPipelineManager.attachCamerasToRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                console.log('SSAO enabled');
            } else {
                // Detach SSAO pipeline from camera
                this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                console.log('SSAO disabled');
            }
        } catch (error) {
            console.warn('Error toggling SSAO:', error);
            this.settings.ssao.enabled = false;
            if (this.ssaoPipeline) {
                try {
                    this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                } catch (detachError) {
                    console.warn('Error detaching SSAO:', detachError);
                }
            }
        }
    }
    
    /**
     * Set SSAO parameters
     */
    setSSAOSettings(radius, samples, strength) {
        if (!this.ssaoAvailable || !this.ssaoPipeline) {
            return;
        }
        
        this.settings.ssao.radius = radius;
        this.settings.ssao.samples = samples;
        this.settings.ssao.strength = strength;
        
        try {
            this.ssaoPipeline.radius = radius;
            this.ssaoPipeline.samples = samples;
            this.ssaoPipeline.totalStrength = strength;
        } catch (error) {
            console.warn('Error setting SSAO parameters:', error);
        }
    }
    
    /**
     * Check if SSAO is available
     */
    isSSAOAvailable() {
        return this.ssaoAvailable;
    }
    
    /**
     * Get current settings
     */
    getSettings() {
        return JSON.parse(JSON.stringify(this.settings));
    }
    
    /**
     * Apply settings from object
     */
    applySettings(settings) {
        if (settings.bloom) {
            this.setBloomEnabled(settings.bloom.enabled);
            if (settings.bloom.enabled) {
                this.setBloomSettings(
                    settings.bloom.threshold,
                    settings.bloom.weight,
                    settings.bloom.kernelSize,
                    settings.bloom.scale
                );
            }
        }
        
        if (settings.fxaa) {
            this.setFXAAEnabled(settings.fxaa.enabled);
        }
        
        if (settings.chromaticAberration) {
            this.setChromaticAberrationEnabled(settings.chromaticAberration.enabled);
            if (settings.chromaticAberration.enabled) {
                this.setChromaticAberrationSettings(
                    settings.chromaticAberration.aberrationAmount,
                    settings.chromaticAberration.radialIntensity
                );
            }
        }
        
        if (settings.colorCorrection) {
            this.setColorCorrectionSettings(
                settings.colorCorrection.exposure,
                settings.colorCorrection.contrast,
                settings.colorCorrection.saturation
            );
        }
        
        if (settings.depthOfField) {
            this.setDepthOfFieldEnabled(settings.depthOfField.enabled);
            if (settings.depthOfField.enabled) {
                this.setDepthOfFieldSettings(
                    settings.depthOfField.focusDistance,
                    settings.depthOfField.lensSize,
                    settings.depthOfField.fStop
                );
            }
        }
        
        if (settings.grain) {
            this.setGrainEnabled(settings.grain.enabled);
            if (settings.grain.enabled) {
                this.setGrainSettings(settings.grain.intensity, settings.grain.animated);
            }
        }
        
        if (settings.sharpen) {
            this.setSharpenEnabled(settings.sharpen.enabled);
            if (settings.sharpen.enabled) {
                this.setSharpenSettings(settings.sharpen.edgeAmount);
            }
        }
        
        if (settings.vignette) {
            this.setVignetteEnabled(settings.vignette.enabled);
            if (settings.vignette.enabled) {
                this.setVignetteSettings(
                    settings.vignette.scale,
                    settings.vignette.power,
                    settings.vignette.color ? new BABYLON.Color4(
                        settings.vignette.color.r,
                        settings.vignette.color.g,
                        settings.vignette.color.b,
                        settings.vignette.color.a
                    ) : null
                );
            }
        }
        
        if (settings.ssao) {
            this.setSSAOEnabled(settings.ssao.enabled);
            if (settings.ssao.enabled) {
                this.setSSAOSettings(
                    settings.ssao.radius,
                    settings.ssao.samples,
                    settings.ssao.strength
                );
            }
        }
    }
    
    /**
     * Dispose of the pipeline
     */
    dispose() {
        // Disable and dispose SSAO pipeline before disposing
        if (this.ssaoPipeline) {
            try {
                this.scene.postProcessRenderPipelineManager.detachCamerasFromRenderPipeline("ssaoPipeline", this.scene.activeCamera);
                this.ssaoPipeline.dispose();
                this.ssaoPipeline = null;
            } catch (error) {
                console.warn('Error disposing SSAO pipeline:', error);
            }
        }
        
        if (this.pipeline) {
            this.pipeline.dispose();
            this.pipeline = null;
        }
    }
}

