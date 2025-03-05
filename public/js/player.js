// ==========================================
// Player Configuration
// ==========================================

const PLAYER_CONFIG = {
    physics: {
        radius: 0.5,
        height: 2.2,
        gravity: 0.004,
        maxFallSpeed: 0.35,
        groundLevel: 2.2,
        groundCheckOffset: 2.3
    },
    movement: {
        speed: 0.09,
        sprintSpeed: 0.12,
        acceleration: 0.04,
        deceleration: 0.25,
        jumpForce: 0.15
    },
    stepSmoothing: {
        duration: 100
    },
    startPosition: new THREE.Vector3(0, 2.2, 10)
};

// ==========================================
// Player State
// ==========================================

window.player = {
    // Movement state
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(0, 0, -1),
    
    // Jump state
    canJump: true,
    jumpKeyReleased: true,
    isGrounded: true,
    
    // Step smoothing state
    stepSmoothing: {
        active: false,
        startY: 0,
        targetY: 0,
        startTime: 0,
        duration: PLAYER_CONFIG.stepSmoothing.duration
    }
};

// Global player position (used by camera and other systems)
window.playerPosition = PLAYER_CONFIG.startPosition.clone();

// ==========================================
// Sound State
// ==========================================

let lastFootstep = 0;

// ==========================================
// Core Movement Functions
// ==========================================

// Update player physics and movement
function updatePlayer() {
    // Save old position for collision detection
    const oldPosition = window.gameControls.cameraConfig.firstPerson ? 
        window.camera.position.clone() : 
        window.playerPosition.clone();
    let newPosition = oldPosition.clone();
    
    // Get current time
    const now = Date.now();

    // Get movement input
    const input = window.gameControls.getMovementInput();
    
    // Calculate movement direction based on camera angle
    const angle = window.camera.rotation.y;
    const forward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const right = new THREE.Vector3(Math.sin(angle + Math.PI/2), 0, Math.cos(angle + Math.PI/2));
    
    // Calculate movement vector
    const moveVector = new THREE.Vector3();
    if (input.z !== 0) {
        moveVector.add(forward.multiplyScalar(input.z));
    }
    if (input.x !== 0) {
        moveVector.add(right.multiplyScalar(input.x));
    }
    
    // Normalize and apply speed with smoother acceleration
    if (moveVector.length() > 0) {
        moveVector.normalize();
        const targetSpeed = input.sprint ? window.player.sprintSpeed : window.player.speed;
        const targetVelocity = moveVector.multiplyScalar(targetSpeed);
        
        // Smoothly interpolate to target velocity
        window.player.velocity.x += (targetVelocity.x - window.player.velocity.x) * window.player.acceleration;
        window.player.velocity.z += (targetVelocity.z - window.player.velocity.z) * window.player.acceleration;
    } else {
        // Apply smoother deceleration when no input
        window.player.velocity.x *= (1 - window.player.deceleration);
        window.player.velocity.z *= (1 - window.player.deceleration);
        
        // Clean up very small velocities to prevent sliding
        if (Math.abs(window.player.velocity.x) < 0.001) window.player.velocity.x = 0;
        if (Math.abs(window.player.velocity.z) < 0.001) window.player.velocity.z = 0;
    }

    // Jump handling
    if (input.jump) {
        if (window.player.canJump && window.player.jumpKeyReleased) {
            window.player.velocity.y = window.player.jumpForce;
            window.player.canJump = false;
            window.player.isGrounded = false;
            window.player.jumpKeyReleased = false;  // Mark jump key as pressed
        }
    } else {
        window.player.jumpKeyReleased = true;  // Mark jump key as released when spacebar is up
    }
    
    // Apply gravity if not grounded
    if (!window.player.isGrounded) {
        window.player.velocity.y -= window.player.gravity;
        if (window.player.velocity.y < -window.player.maxFallSpeed) {
            window.player.velocity.y = -window.player.maxFallSpeed;
        }
    }

    // Calculate new position with horizontal movement only
    const horizontalPosition = newPosition.clone();
    horizontalPosition.y = oldPosition.y; // Keep old Y position for horizontal collision check
    horizontalPosition.add(new THREE.Vector3(window.player.velocity.x, 0, window.player.velocity.z));

    // Update collision checks to remove crate references
    const { horizontalCollision, canWalkOn } = checkCollisions(horizontalPosition);

    // Update position based on collision check
    if (horizontalCollision) {
        // Update position without the blocked movement
        newPosition.copy(oldPosition);
        newPosition.add(new THREE.Vector3(window.player.velocity.x, window.player.velocity.y, window.player.velocity.z));
    } else {
        // No horizontal collision, apply full movement
        newPosition.add(window.player.velocity);
    }

    // Ground collision check
    const rayCaster = new THREE.Raycaster();
    rayCaster.ray.origin.copy(newPosition);
    rayCaster.ray.origin.y += 0.1;
    rayCaster.ray.direction.set(0, -1, 0);
    
    // Check for jump pad collisions FIRST
    const jumpPadIntersects = rayCaster.intersectObjects(worldObjects.jumpPads);
    
    if (jumpPadIntersects.length > 0) {
        const intersection = jumpPadIntersects[0];
        const jumpPad = intersection.object;
        const hitPoint = intersection.point;
        
        const heightDiff = Math.abs(newPosition.y - jumpPad.position.y);
        const detectionRange = jumpPad.position.y > 80 ? 4.0 : 2.0;
        
        if (intersection.distance < detectionRange && heightDiff < 3.0) {
            const boostForce = 0.5;
            window.player.velocity.y = boostForce;
            window.player.isGrounded = false;
            
            if (jumpPad.userData.isTopJumpPad) {
                playTopPadSound();
            } else {
                playJumpPadSound();
            }
            
            jumpPad.material.emissiveIntensity = 1.0;
            setTimeout(() => {
                if (jumpPad && jumpPad.material) {
                    jumpPad.material.emissiveIntensity = 0.7;
                }
            }, 200);
            
            window.gameEffects.createJumpPadEffect(hitPoint);
            jumpPad.userData.lastUsed = now;
        }
    }
    
    // Then check ground collision
    const walkableObjects = worldObjects.collidables.filter(obj => 
        obj && obj.userData && obj.userData.collision && (
            obj.userData.collision.type === CollisionType.WALKABLE ||
            obj.userData.collision.type === CollisionType.RAMP ||
            obj.userData.isPlatform
        )
    );
    
    const groundIntersects = rayCaster.intersectObjects(walkableObjects);
    const distanceToGround = groundIntersects.length > 0 ? groundIntersects[0].distance : Infinity;

    // Update grounded state and handle height changes smoothly
    if (distanceToGround < window.player.groundCheckOffset) {
        window.player.isGrounded = true;
        window.player.canJump = true;
        
        const hitObject = groundIntersects[0].object;
        const targetY = groundIntersects[0].point.y + window.player.groundLevel;
        const heightDiff = targetY - newPosition.y;

        // Smooth height changes when stepping up
        if (heightDiff > 0.1) {
            window.player.velocity.y = Math.min(0.1, heightDiff * 0.2);
            newPosition.y += window.player.velocity.y;
        } else if (heightDiff < -0.1) {
            newPosition.y = targetY;
            window.player.velocity.y = 0;
        } else {
            newPosition.y = targetY;
            window.player.velocity.y = 0;
        }
    } else {
        window.player.isGrounded = false;
    }

    // Update positions
    if (window.gameControls.cameraConfig.firstPerson) {
        window.camera.position.copy(newPosition);
        window.playerPosition.copy(newPosition);
    } else {
        window.playerPosition.copy(newPosition);
        window.playerModel.position.copy(window.playerPosition);
    }
    
    // Handle footstep sounds
    const isMoving = Math.abs(window.player.velocity.x) > 0.01 || Math.abs(window.player.velocity.z) > 0.01;
    if (isMoving && Math.abs(window.player.velocity.y) < 0.001 && now - lastFootstep > PLAYER_CONFIG.movement.footstepDelay) {
        playFootstepSound();
        lastFootstep = now;
    }
}

// ==========================================
// Collision Detection System
// ==========================================

// Collision detection
function checkCollision(position, radius = 0.5, height = 2) {
    // Check all collidable objects
    for (const object of worldObjects.collidables) {
        const collision = object.userData.collision;
        
        switch (collision.type) {
            case CollisionType.SOLID:
                if (checkSolidCollision(position, object, radius, height)) {
                    return true;
                }
                break;
                
            case CollisionType.WALKABLE:
                if (checkWalkableCollision(position, object, radius)) {
                    adjustPositionToWalkable(position, object);
                }
                break;
                
            case CollisionType.RAMP:
                if (checkRampCollision(position, object, radius)) {
                    adjustPositionToRamp(position, object);
                }
                break;
                
            case CollisionType.TRIGGER:
                if (checkTriggerCollision(position, object, radius)) {
                    collision.onContact?.(object, Date.now());
                }
                break;
        }
    }
}

// Handle jump pad boost
function handleJumpPadBoost(jumpPad, now) {
    window.player.velocity.y = window.jumpPadProperties.boostForce;
    window.player.isGrounded = false;
    
    if (jumpPad.userData.isTopJumpPad) {
        playTopPadSound();
    } else {
        playJumpPadSound();
    }
    
    // Visual effect
    jumpPad.material.emissiveIntensity = 1.0;
    setTimeout(() => {
        if (jumpPad && jumpPad.material) {
            jumpPad.material.emissiveIntensity = 0.7;
        }
    }, 200);
    
    window.gameEffects.createJumpPadEffect(jumpPad.position.clone());
    jumpPad.userData.lastUsed = now;
}

// ==========================================
// Collision Type Handlers
// ==========================================

// Add these collision check functions
function checkSolidCollision(position, object, radius = 0.85, height = 2) {
    const margin = 0.1;
    const box = new THREE.Box3().setFromObject(object);
    box.min.add(new THREE.Vector3(margin, margin, margin));
    box.max.sub(new THREE.Vector3(margin, margin, margin));

    const playerBox = new THREE.Box3().set(
        new THREE.Vector3(
            position.x - radius,
            position.y - height/2,
            position.z - radius
        ),
        new THREE.Vector3(
            position.x + radius,
            position.y + height/2,
            position.z + radius
        )
    );

    return box.intersectsBox(playerBox);
}

function checkWalkableCollision(position, object, radius) {
    const box = new THREE.Box3().setFromObject(object);
    const playerBottom = position.y - window.player.groundLevel;
    
    return (
        position.x + radius > box.min.x &&
        position.x - radius < box.max.x &&
        position.z + radius > box.min.z &&
        position.z - radius < box.max.z &&
        playerBottom <= box.max.y + 0.5 &&
        playerBottom >= box.min.y - 0.5  // Increased range for smoother detection
    );
}

function checkRampCollision(position, object, radius) {
    const box = new THREE.Box3().setFromObject(object);
    return (
        position.x + radius > box.min.x &&
        position.x - radius < box.max.x &&
        position.z + radius > box.min.z &&
        position.z - radius < box.max.z
    );
}

function checkTriggerCollision(position, object, radius) {
    const box = new THREE.Box3().setFromObject(object);
    return (
        position.x + radius > box.min.x &&
        position.x - radius < box.max.x &&
        position.z + radius > box.min.z &&
        position.z - radius < box.max.z &&
        position.y > box.min.y &&
        position.y < box.max.y
    );
}

// ==========================================
// Position Adjustment Functions
// ==========================================

function adjustPositionToWalkable(position, object) {
    const box = new THREE.Box3().setFromObject(object);
    const targetY = box.max.y + window.player.groundLevel;
    const heightDiff = targetY - position.y;

    if (heightDiff > 0.1) {
        // Apply a gentle upward adjustment
        position.y += Math.min(0.1, heightDiff * 0.2);
    } else {
        position.y = targetY;
    }
}

function adjustPositionToRamp(position, object) {
    const box = new THREE.Box3().setFromObject(object);
    const slope = object.userData.collision.slope;
    const relativeZ = position.z - box.min.z;
    const heightAtPoint = box.min.y + Math.abs(Math.sin(slope)) * relativeZ;
    
    if (position.y <= heightAtPoint + window.player.groundLevel) {
        position.y = heightAtPoint + window.player.groundLevel;
    }
}

// ==========================================
// Sound Effects
// ==========================================

// Sound effects
function playFootstepSound() {
    window.sounds.footstep.currentTime = 0;
    window.sounds.footstep.play().catch(() => {});
}

function playJumpPadSound() {
    if (window.sounds.jumpPad) {
        window.sounds.jumpPad.currentTime = 0;
        window.sounds.jumpPad.play().catch(err => console.log('Error playing jump sound:', err));
    }
}

function playTopPadSound() {
    window.sounds.topPad.currentTime = 0;
    window.sounds.topPad.play().catch(error => {
        console.error("Error playing top pad sound:", error);
    });
}

// ==========================================
// Collision Helpers
// ==========================================

// Update collision checks to remove crate references
function checkCollisions(newPosition) {
    // Check for horizontal collisions with walls and other solid objects
    const horizontalCollision = worldObjects.collidables.some(obj => {
        if (!obj.userData.collision) return false;
        
        // Skip non-solid objects
        if (obj.userData.collision.type !== CollisionType.SOLID) return false;
        
        // Calculate collision bounds
        const bounds = calculateBounds(obj);
        const playerBounds = {
            minX: newPosition.x - PLAYER_CONFIG.physics.radius,
            maxX: newPosition.x + PLAYER_CONFIG.physics.radius,
            minZ: newPosition.z - PLAYER_CONFIG.physics.radius,
            maxZ: newPosition.z + PLAYER_CONFIG.physics.radius
        };
        
        return checkBoundsCollision(playerBounds, bounds);
    });
    
    // Check if we can walk on the surface
    const canWalkOn = worldObjects.collidables.some(obj => {
        if (!obj.userData.collision) return false;
        
        // Only check walkable surfaces and ramps
        if (obj.userData.collision.type !== CollisionType.WALKABLE && 
            obj.userData.collision.type !== CollisionType.RAMP) return false;
        
        // Calculate collision bounds
        const bounds = calculateBounds(obj);
        const playerBounds = {
            minX: newPosition.x - PLAYER_CONFIG.physics.radius,
            maxX: newPosition.x + PLAYER_CONFIG.physics.radius,
            minZ: newPosition.z - PLAYER_CONFIG.physics.radius,
            maxZ: newPosition.z + PLAYER_CONFIG.physics.radius
        };
        
        // Check if player is above the surface
        return checkBoundsCollision(playerBounds, bounds) && 
               newPosition.y > obj.position.y;
    });
    
    return { horizontalCollision, canWalkOn };
}

// Add these helper functions before checkCollisions
function calculateBounds(object) {
    const box = new THREE.Box3().setFromObject(object);
    return {
        minX: box.min.x,
        maxX: box.max.x,
        minY: box.min.y,
        maxY: box.max.y,
        minZ: box.min.z,
        maxZ: box.max.z
    };
}

function checkBoundsCollision(bounds1, bounds2) {
    return !(
        bounds1.maxX < bounds2.minX ||
        bounds1.minX > bounds2.maxX ||
        bounds1.maxZ < bounds2.minZ ||
        bounds1.minZ > bounds2.maxZ
    );
}

// ==========================================
// Player Initialization
// ==========================================

/**
 * Initialize the player system
 */
function initPlayer() {
    // Initialize player state with config values
    window.player = {
        // Movement state
        velocity: new THREE.Vector3(),
        direction: new THREE.Vector3(0, 0, -1),
        speed: PLAYER_CONFIG.movement.speed,
        sprintSpeed: PLAYER_CONFIG.movement.sprintSpeed,
        acceleration: PLAYER_CONFIG.movement.acceleration,
        deceleration: PLAYER_CONFIG.movement.deceleration,
        
        // Physics state
        gravity: PLAYER_CONFIG.physics.gravity,
        maxFallSpeed: PLAYER_CONFIG.physics.maxFallSpeed,
        groundLevel: PLAYER_CONFIG.physics.groundLevel,
        groundCheckOffset: PLAYER_CONFIG.physics.groundCheckOffset,
        
        // Jump state
        canJump: true,
        jumpForce: PLAYER_CONFIG.movement.jumpForce,
        jumpKeyReleased: true,
        isGrounded: true,
        
        // Step smoothing state
        stepSmoothing: {
            active: false,
            startY: 0,
            targetY: 0,
            startTime: 0,
            duration: PLAYER_CONFIG.stepSmoothing.duration
        }
    };

    // Initialize player position
    window.playerPosition = PLAYER_CONFIG.startPosition.clone();
    
    // Initialize player tracking
    if (!window.worldObjects) window.worldObjects = {};
    if (!window.worldObjects.players) window.worldObjects.players = new Map();
    
    // Create player model for first person view
    window.playerModel = window.gameWorld.createPlayerModel(window.gameNetworking.playerId);
    window.playerModel.visible = false;  // Hide in first person
    
    // Add collision properties to player model parts
    window.playerModel.traverse(child => {
        if (child.isMesh) {
            if (window.debugMode) {
                console.log('[PLAYER] Adding collision to local player part:', {
                    id: window.gameNetworking.playerId,
                    part: child.uuid,
                    position: child.position.toArray()
                });
            }

            window.gameWorld.addCollisionProperties(child, window.CollisionType.PLAYER, {
                isPlayer: true,
                playerId: window.gameNetworking.playerId,
                isBodyPart: true,
                isLocalPlayer: true
            });
        }
    });
    
    return window.player;
}

// ==========================================
// Public API
// ==========================================

window.gamePlayer = {
    initPlayer,
    player: window.player,
    playerPosition: window.playerPosition,
    updatePlayer
}; 