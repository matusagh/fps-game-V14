// ==========================================
// Camera Configuration
// ==========================================

const cameraConfig = {
    // View modes
    firstPerson: true,
    transitionActive: false,
    
    // Third person settings
    thirdPersonDistance: 8,
    thirdPersonHeight: 1.5,
    targetDistance: 8,
    
    // Camera constraints
    minDistance: 3,
    maxDistance: 15,
    
    // Smoothing
    smooth: 0.1,
    zoomSmoothness: 0.1,
    
    // Position offset
    offset: new THREE.Vector3(0, 1.5, -5)
};

// ==========================================
// Camera Controller
// ==========================================

class CameraController {
    constructor() {
        this._rotation = new THREE.Euler(0, 0, 0, 'YXZ');
        this.sensitivity = 0.002;
    }

    get rotation() {
        return this._rotation;
    }

    updateRotation(dx, dy) {
        this._rotation.y -= dx * this.sensitivity;
        this._rotation.x -= dy * this.sensitivity;
        
        // Clamp vertical rotation
        this._rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this._rotation.x));
        
        // Apply to camera
        if (window.camera) {
            window.camera.rotation.copy(this._rotation);
        }
    }

    getDirection() {
        const direction = new THREE.Vector3(0, 0, -1);
        direction.applyEuler(this._rotation);
        return direction;
    }

    getRightVector() {
        const right = new THREE.Vector3(1, 0, 0);
        right.applyEuler(this._rotation);
        return right;
    }
}

const cameraController = new CameraController();

// ==========================================
// Input State
// ==========================================

class InputManager {
    constructor() {
        this.keys = {};
        this.mouseButtons = new Set();
        this.initListeners();
    }

    initListeners() {
        // Keyboard
        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            
            // Handle camera toggle
            if (e.code === 'KeyT') {
                switchCameraMode(!cameraConfig.firstPerson);
            }
        });
        document.addEventListener('keyup', e => this.keys[e.code] = false);
        
        // Mouse
        document.addEventListener('mousedown', e => {
            e.preventDefault();
            this.mouseButtons.add(e.button);
            this.handleMouseDown(e);
        });
        
        document.addEventListener('mouseup', e => {
            e.preventDefault();
            this.mouseButtons.delete(e.button);
            this.handleMouseUp(e);
        });
        
        document.addEventListener('mousemove', e => this.handleMouseMove(e));
        document.addEventListener('contextmenu', e => e.preventDefault());
        
        // Mouse wheel zoom
        document.addEventListener('wheel', e => {
            if (!cameraConfig.firstPerson) {
                e.preventDefault();
                const zoomSpeed = 0.5;
                cameraConfig.targetDistance = Math.max(
                    cameraConfig.minDistance,
                    Math.min(
                        cameraConfig.maxDistance,
                        cameraConfig.targetDistance + (e.deltaY > 0 ? zoomSpeed : -zoomSpeed)
                    )
                );
            }
        }, { passive: false });
        
        // Mouse lock
        document.addEventListener('click', () => {
            if (!document.pointerLockElement) {
                document.body.requestPointerLock();
            }
        });
    }

    handleMouseMove(e) {
        if (document.pointerLockElement === document.body) {
            cameraController.updateRotation(e.movementX, e.movementY);
        }
    }

    handleMouseDown(e) {
        if (document.pointerLockElement === document.body) {
            if (e.button === 0) {
                window.gameWeapons?.startShooting();
            } else if (e.button === 2) {
                window.gameWeapons?.boost();
            }
        }
    }

    handleMouseUp(e) {
        if (document.pointerLockElement === document.body && e.button === 0) {
            window.gameWeapons?.stopShooting();
        }
    }

    getMovementInput() {
        let moveX = 0;
        let moveZ = 0;
        
        if (this.keys['KeyW']) moveZ -= 1;
        if (this.keys['KeyS']) moveZ += 1;
        if (this.keys['KeyA']) moveX -= 1;
        if (this.keys['KeyD']) moveX += 1;
        
        // Normalize diagonal movement
        if (moveX !== 0 && moveZ !== 0) {
            const magnitude = Math.sqrt(moveX * moveX + moveZ * moveZ);
            moveX /= magnitude;
            moveZ /= magnitude;
        }
        
        return {
            x: moveX,
            z: moveZ,
            sprint: this.keys['ShiftLeft'],
            jump: this.keys['Space']
        };
    }

    getActiveKeys() {
        return Object.keys(this.keys).filter(key => this.keys[key]).join(', ') || 'None';
    }
}

const inputManager = new InputManager();

// ==========================================
// Camera Mode Management
// ==========================================

function switchCameraMode(toFirstPerson) {
    const currentPos = window.playerPosition.clone();
    cameraConfig.firstPerson = toFirstPerson;
    
    if (!cameraConfig.firstPerson) {
        window.player.velocity.set(0, 0, 0);
        
        const cameraOffset = new THREE.Vector3(0, 0, cameraConfig.thirdPersonDistance);
        cameraOffset.applyEuler(cameraController.rotation);
        
        window.camera.position.set(
            currentPos.x + cameraOffset.x,
            currentPos.y + cameraConfig.thirdPersonHeight,
            currentPos.z + cameraOffset.z
        );
    } else {
        window.camera.position.copy(currentPos);
    }
    
    window.playerModel.visible = !cameraConfig.firstPerson;
    document.getElementById('crosshair').style.display = 'block';
}

function updateThirdPersonCamera() {
    const direction = cameraController.getDirection();
    
    // Update player model rotation
    window.playerModel.rotation.y = cameraController.rotation.y;
    
    // Calculate camera orbit position
    const horizontalDistance = cameraConfig.thirdPersonDistance * 
        Math.cos(cameraController.rotation.x);
    
    const cameraOrbitX = Math.sin(cameraController.rotation.y) * horizontalDistance;
    const cameraOrbitZ = Math.cos(cameraController.rotation.y) * horizontalDistance;
    const cameraOrbitY = cameraConfig.thirdPersonDistance * 
        Math.sin(cameraController.rotation.x);
    
    // Update camera position
    window.camera.position.set(
        window.playerPosition.x + cameraOrbitX,
        window.playerPosition.y + cameraConfig.thirdPersonHeight - cameraOrbitY,
        window.playerPosition.z + cameraOrbitZ
    );
    
    // Smooth camera zoom
    cameraConfig.thirdPersonDistance += (cameraConfig.targetDistance - cameraConfig.thirdPersonDistance) 
        * cameraConfig.zoomSmoothness;
}

// ==========================================
// Public API
// ==========================================

window.gameControls = {
    // Initialization
    init() {
        document.body.requestPointerLock = document.body.requestPointerLock || 
                                         document.body.mozRequestPointerLock;
    },
    
    // Maintain backward compatibility
    initControls() {
        this.init();
    },
    
    // Update loop
    updateCamera() {
        if (!cameraConfig.firstPerson) {
            updateThirdPersonCamera();
        }
    },
    
    // Input methods
    getMovementInput: () => inputManager.getMovementInput(),
    getActiveKeys: () => inputManager.getActiveKeys(),
    
    // State access
    get cameraConfig() { return cameraConfig; },
    get cameraController() { return cameraController; },
    get inputManager() { return inputManager; },
    
    // Compatibility getters
    get actualRotationX() { return cameraController.rotation.x; },
    get actualRotationY() { return cameraController.rotation.y; }
}; 