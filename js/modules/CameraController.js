/**
 * CameraController - Manages camera movement and controls
 */
class CameraController {
    constructor(scene, canvas) {
        this.scene = scene;
        this.canvas = canvas;
        this.camera = null;
        this.initialPosition = null;
        this.initialTarget = null;
        
        this.setupCamera();
        this.setupControls();
    }

    /**
     * Setup the camera
     */
    setupCamera() {
        // Create arc rotate camera positioned from south to north at an angle
        this.camera = new BABYLON.ArcRotateCamera("camera", 
            Math.PI, Math.PI / 2.5, 100, 
            new BABYLON.Vector3(0, 0, 0), this.scene);

        // Set camera limits like in my-twin project
        this.camera.lowerRadiusLimit = 1;
        this.camera.upperRadiusLimit = 200;
        this.camera.minZ = 0.01; // Very close near clipping plane for extreme close-up viewing

        // Enable mouse controls
        this.camera.useNaturalPinchZoom = true;
        this.camera.panningAxis = new BABYLON.Vector3(1, 1, 0);
        this.camera.panningInertia = 0.9;
        this.camera.inertia = 0.9;

        // Store initial position
        this.initialPosition = this.camera.position.clone();
        this.initialTarget = this.camera.getTarget().clone();

        // Attach camera to canvas (will be done in setupControls)
    }

    /**
     * Setup camera controls
     */
    setupControls() {
        // Enable smooth camera movement
        this.camera.inertia = 0.9;
        this.camera.angularSensibilityX = 1000;  // Reduced for better control
        this.camera.angularSensibilityY = 1000;  // Reduced for better control
        this.camera.panningSensibility = 200;  // Increased sensitivity for better pan movement
        this.camera.wheelDeltaPercentage = 0.01;
        this.camera.pinchDeltaPercentage = 0.01;

        // Enable panning with middle mouse button
        this.camera.useNaturalPinchZoom = true;
        this.camera.panningAxis = new BABYLON.Vector3(1, 1, 0);
        this.camera.panningInertia = 0.9;

        // Setup mouse controls
        this.setupMouseControls();
        
        // Attach camera to canvas with proper error handling
        this.attachCameraToCanvas();
    }

    /**
     * Attach camera to canvas with proper error handling
     */
    attachCameraToCanvas() {
        try {
            
            // Ensure canvas is ready
            if (!this.canvas) {
                throw new Error('Canvas not found');
            }
            
            // Set camera as active camera
            this.scene.activeCamera = this.camera;
            
            // Use attachControl (not attachControls) like in my-twin project
            this.camera.attachControl(this.canvas, true);
            
        } catch (error) {
            this.setupManualControls();
        }
    }

    /**
     * Setup mouse controls
     */
    setupMouseControls() {
        // Prevent default wheel behavior to allow zoom
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
        }, { passive: false });

        // Ensure canvas can receive mouse events
        this.canvas.style.cursor = 'grab';
        
        // Add mouse cursor feedback
        this.canvas.addEventListener('mousedown', () => {
            this.canvas.style.cursor = 'grabbing';
        });

        this.canvas.addEventListener('mouseup', () => {
            this.canvas.style.cursor = 'grab';
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.canvas.style.cursor = 'grab';
        });

        // Add keyboard controls
        this.setupKeyboardControls();
        
        // Setup compass
        this.setupCompass();
    }

    /**
     * Setup manual controls as fallback (not needed with attachControl)
     */
    setupManualControls() {
        // Manual controls not needed - using built-in attachControl
    }

    /**
     * Setup compass that follows camera rotation
     */
    setupCompass() {
        this.compassNeedle = document.getElementById('compassNeedle');
        if (!this.compassNeedle) {
            console.warn('Compass needle element not found');
            return;
        }

        // Update compass on camera rotation
        this.scene.onBeforeRenderObservable.add(() => {
            this.updateCompass();
        });
    }

    /**
     * Update compass needle rotation based on camera alpha
     */
    updateCompass() {
        if (!this.compassNeedle || !this.camera) return;

        // Convert camera alpha to compass rotation
        // Camera alpha: 0 = north, Math.PI/2 = east, Math.PI = south, -Math.PI/2 = west
        // Compass needle should point to north (opposite of camera direction)
        const compassRotation = -this.camera.alpha * (180 / Math.PI);
        
        this.compassNeedle.style.transform = `translate(-50%, -100%) rotate(${compassRotation}deg)`;
    }

    /**
     * Setup pointer events as fallback
     */
    setupPointerEvents() {
        
        let isPointerDown = false;
        let lastPointerX = 0;
        let lastPointerY = 0;
        
        // Pointer down event
        this.canvas.addEventListener('pointerdown', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            isPointerDown = true;
            lastPointerX = event.clientX;
            lastPointerY = event.clientY;
            this.canvas.style.cursor = 'grabbing';
            
            if (event.button === 0) {
                // Pan mode activated
            } else if (event.button === 2) {
                // Rotation mode activated
            }
        });
        
        // Pointer move event
        this.canvas.addEventListener('pointermove', (event) => {
            if (isPointerDown) {
                const deltaX = event.clientX - lastPointerX;
                const deltaY = event.clientY - lastPointerY;
                
                // Only move if there's significant movement
                if (Math.abs(deltaX) > 1 || Math.abs(deltaY) > 1) {
                    // For pointer events, we'll use pan by default (left click behavior)
                    // Pan camera with simpler calculation
                    const target = this.camera.getTarget();
                    const panSpeed = 0.08;  // Increased pan speed for better responsiveness
                    
                    // Calculate pan direction based on camera orientation
                    const forward = this.camera.getDirection(BABYLON.Vector3.Forward());
                    const right = BABYLON.Vector3.Cross(forward, BABYLON.Vector3.Up());
                    right.normalize();
                    
                    // Pan horizontally and vertically
                    target.addInPlace(right.scale(-deltaX * panSpeed));
                    target.addInPlace(BABYLON.Vector3.Up().scale(deltaY * panSpeed));
                    
                    this.camera.setTarget(target);
                    
                    lastPointerX = event.clientX;
                    lastPointerY = event.clientY;
                }
            }
        });
        
        // Pointer up event
        this.canvas.addEventListener('pointerup', (event) => {
            event.preventDefault();
            event.stopPropagation();
            
            isPointerDown = false;
            this.canvas.style.cursor = 'grab';
        });
        
        // Pointer leave event
        this.canvas.addEventListener('pointerleave', () => {
            isPointerDown = false;
            this.canvas.style.cursor = 'grab';
        });
    }

    /**
     * Setup keyboard controls
     */
    setupKeyboardControls() {
        document.addEventListener('keydown', (event) => {
            const speed = 2;
            const camera = this.camera;

            // Don't rotate camera with A/D when Shift is pressed (for selection shortcuts)
            if (event.shiftKey && (event.key.toLowerCase() === 'a' || event.key.toLowerCase() === 'd')) {
                return; // Let UIManager handle Shift+A and Shift+D
            }

            switch (event.key.toLowerCase()) {
                case 'w':
                case 'arrowup':
                    camera.beta -= 0.1;  // Fixed: beta for vertical rotation
                    break;
                case 's':
                case 'arrowdown':
                    camera.beta += 0.1;  // Fixed: beta for vertical rotation
                    break;
                case 'a':
                case 'arrowleft':
                    camera.alpha -= 0.1;  // Fixed: alpha for horizontal rotation
                    break;
                case 'd':
                case 'arrowright':
                    camera.alpha += 0.1;  // Fixed: alpha for horizontal rotation
                    break;
                case 'q':
                    camera.radius += speed;
                    break;
                case 'e':
                    camera.radius -= speed;
                    break;
                case 'r':
                    this.resetCamera();
                    break;
            }
            
            // Clamp beta to prevent camera flipping
            camera.beta = Math.max(0.1, Math.min(Math.PI / 2.2, camera.beta));
        });
    }

    /**
     * Reset camera to initial position
     */
    resetCamera() {
        if (this.initialPosition && this.initialTarget) {
            // Smooth transition to initial position
            BABYLON.Animation.CreateAndStartAnimation(
                "cameraReset",
                this.camera,
                "position",
                30,
                60,
                this.camera.position,
                this.initialPosition,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );

            BABYLON.Animation.CreateAndStartAnimation(
                "cameraTargetReset",
                this.camera,
                "target",
                30,
                60,
                this.camera.getTarget(),
                this.initialTarget,
                BABYLON.Animation.ANIMATIONLOOPMODE_CONSTANT
            );
        }
    }

    /**
     * Set camera target
     */
    setTarget(target) {
        if (this.camera && target) {
            this.camera.setTarget(target);
        }
    }

    /**
     * Get camera position
     */
    getPosition() {
        return this.camera ? this.camera.position : null;
    }

    /**
     * Get camera target
     */
    getTarget() {
        return this.camera ? this.camera.getTarget() : null;
    }

    /**
     * Set camera position
     */
    setPosition(position) {
        if (this.camera && position) {
            this.camera.position = position;
        }
    }

    /**
     * Focus on a specific mesh
     */
    focusOnMesh(mesh) {
        if (this.camera && mesh) {
            const boundingInfo = mesh.getBoundingInfo();
            const center = boundingInfo.boundingBox.center;
            const size = boundingInfo.boundingBox.extendSize;
            const maxSize = Math.max(size.x, size.y, size.z);
            
            // Set target to mesh center
            this.camera.setTarget(center);
            
            // Set radius to show the mesh properly
            this.camera.radius = maxSize * 3;
        }
    }

    /**
     * Set camera sensitivity
     */
    setSensitivity(rotation, panning, zoom) {
        if (this.camera) {
            if (rotation !== undefined) {
                this.camera.angularSensibilityX = rotation;
                this.camera.angularSensibilityY = rotation;
            }
            if (panning !== undefined) {
                this.camera.panningSensibility = panning;
            }
            if (zoom !== undefined) {
                this.camera.wheelDeltaPercentage = zoom;
            }
        }
    }

    /**
     * Enable/disable camera controls
     */
    setControlsEnabled(enabled) {
        if (this.camera) {
            if (enabled) {
                if (typeof this.camera.attachControls === 'function') {
                    this.camera.attachControls(this.canvas, true);
                } else {
                    this.setupManualControls();
                }
            } else {
                if (typeof this.camera.detachControls === 'function') {
                    this.camera.detachControls(this.canvas);
                }
            }
        }
    }

    /**
     * Get camera statistics
     */
    getStats() {
        if (!this.camera) return null;

        return {
            position: this.camera.position,
            target: this.camera.getTarget(),
            radius: this.camera.radius,
            alpha: this.camera.alpha,
            beta: this.camera.beta
        };
    }

    /**
     * Get camera control instructions
     */
    getControlInstructions() {
        return {
            mouse: {
                leftClick: "Pan camera (move view)",
                rightClick: "Rotate camera around target",
                middleClick: "Pan camera (alternative)",
                wheel: "Zoom in/out"
            },
            keyboard: {
                wasd: "Rotate camera",
                qe: "Zoom in/out",
                r: "Reset camera position"
            }
        };
    }

    // Note: debugCameraStatus method was removed as it only contained console.log statements

    // Note: testCameraMovement method was removed as it only contained console.log statements

    // Note: testCameraRotation method was removed as it only contained console.log statements

    // Note: testCameraPanning method was removed as it only contained console.log statements

    // Note: testMouseEvents method was removed as it only contained console.log statements

    // Note: forceTestCameraMovement method was removed as it only contained console.log statements

    // Note: simulateMouseEvents method was removed as it only contained console.log statements

    // Note: checkMouseState method was removed as it only contained console.log statements

    /**
     * Dispose of camera
     */
    dispose() {
        if (this.camera) {
            if (typeof this.camera.detachControls === 'function') {
                this.camera.detachControls(this.canvas);
            }
            this.camera.dispose();
        }
    }
}
