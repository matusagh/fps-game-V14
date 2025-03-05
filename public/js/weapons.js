// ==========================================
// 1. CONFIGURATION
// ==========================================
const CONSTANTS = {
    BULLET_LIFETIME: 12000, // 7 seconds in milliseconds
    MAX_ACTIVE_BALLS: 50,
    MAX_SOUNDS: 10
};

const weaponConfig = {
    primary: {
        automatic: true,
        fireRate: 100,
        recoilAmount: 0.005,
        recoilRecovery: 0.90,
        maxRecoil: 0.1,
        lastFired: 0,
        name: "Primary"
    },
    bouncer: {
        automatic: false,
        name: "Soccer Ball",
        minSpeed: 0.01,      // Faster minimum speed
        maxSpeed: 0.8,      // Much more powerful max speed
        chargeTime: 600,    // Keep fast charge time
        chargeStart: 0,
        isCharging: false,
        projectileConfig: {
            size: 0.2,           // Soccer ball size
            color: 0xffffff,     // White color
            maxBounces: 50,      // More bounces
            gravity: 0.0006,     // Adjusted gravity
            bounce: 0.92         // More bouncy (92% energy retention)
        },
        showTrajectory: false  // Default to hidden
    },
    boost: {
        cooldown: 800,
        lastFired: 0,
        force: 0.3,
        recoilAmount: 0.01,
        maxBoostSpeed: 8,
        verticalLimit: 0.02
    }
};

const bulletConfig = {
    speed: 8.0,
    size: 0.03,
    range: 1000,
    color: 0xffff00,
    damage: 25
};

// ==========================================
// 2. STATE MANAGEMENT
// ==========================================
const WeaponState = {
    bullets: [],
    currentWeapon: 'primary',
    recoil: {
        current: 0,
        x: 0,
        y: 0
    },
    isShooting: false,
    currentSoundIndex: 0,
    frameCount: 0
};

// ==========================================
// 3. UI MANAGEMENT
// ==========================================
const WeaponUI = {
    initStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #charge-indicator {
            position: fixed;
            bottom: 50px;
            left: 50%;
            transform: translateX(-50%);
            width: 200px;
            height: 10px;
            background: rgba(0, 0, 0, 0.5);
            border-radius: 5px;
            display: none;
        }

        #charge-fill {
            width: 0%;
            height: 100%;
            background: #4f4;
            border-radius: 5px;
            transition: width 0.05s linear;
        }
    `;
    document.head.appendChild(style);

    // Create charge indicator
    const chargeIndicator = document.createElement('div');
    chargeIndicator.id = 'charge-indicator';
    chargeIndicator.innerHTML = '<div id="charge-fill"></div>';
    document.body.appendChild(chargeIndicator);
    },

    updateHUD() {
    let weaponSlots = document.getElementById('weapon-slots');
    if (!weaponSlots) {
        weaponSlots = document.createElement('div');
        weaponSlots.id = 'weapon-slots';
        document.body.appendChild(weaponSlots);
        
        // Create left click slot
        const leftSlot = document.createElement('div');
        leftSlot.className = 'weapon-slot left-click';
        leftSlot.innerHTML = `
            <span class="name"></span>
            <span class="key">[1] to toggle</span>
        `;
        weaponSlots.appendChild(leftSlot);
        
        // Create right click slot (placeholder for now)
        const rightSlot = document.createElement('div');
        rightSlot.className = 'weapon-slot right-click';
        rightSlot.innerHTML = `
            <span class="name">Secondary</span>
            <span class="key">[2] to toggle</span>
        `;
        weaponSlots.appendChild(rightSlot);
    }
    
    // Update left weapon slot
    const leftSlot = weaponSlots.querySelector('.left-click');
        const weapon = weaponConfig[WeaponState.currentWeapon];
    leftSlot.querySelector('.name').textContent = weapon.name;
    
    // Update classes
        leftSlot.className = `weapon-slot left-click ${WeaponState.currentWeapon}`;
        leftSlot.classList.add('active');
    },

    updateChargeBar() {
        const weapon = weaponConfig[WeaponState.currentWeapon];
    if (weapon.isCharging) {
        const chargeTime = Date.now() - weapon.chargeStart;
        const chargeBonus = Math.min(1, chargeTime / weapon.chargeTime);
        
        // Update charge bar
        const chargePercent = chargeBonus * 100;
        document.getElementById('charge-fill').style.width = `${chargePercent}%`;
        
        // Continue updating while charging
            requestAnimationFrame(WeaponUI.updateChargeBar);
    }
    },

    updateCrosshairPosition() {
        if (WeaponState.currentWeapon !== 'bouncer') return;
    
    const crosshair = document.getElementById('crosshair');
    if (!crosshair) return;

    // Fixed right offset of 10px, no vertical movement
    crosshair.style.transform = `translate(calc(-50% + 10px), -50%)`;
}
};

// ==========================================
// 4. WEAPON SYSTEMS
// ==========================================
const WeaponSystems = {
    // Primary weapon functions
    primary: {
        shoot() {
            try {
                window.sounds.shootLeft.currentTime = 0;
                window.sounds.shootLeft.play();
            } catch (e) {
                console.debug('Sound error:', e);
            }
            
            // Visual feedback
        const crosshair = document.getElementById('crosshair');
            crosshair.classList.add('firing');
            setTimeout(() => crosshair.classList.remove('firing'), 100);

            // Create bullet
            const bulletGeometry = new THREE.SphereGeometry(bulletConfig.size);
            const bulletMaterial = new THREE.MeshBasicMaterial({ color: bulletConfig.color });
            const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);

            // Set bullet starting position exactly at camera position
            bullet.position.copy(window.camera.position);

            // Get exact camera direction
            const direction = new THREE.Vector3(0, 0, -1);
            direction.applyQuaternion(window.camera.quaternion);

            // Apply minimal spread
            const isMoving = window.gameControls.inputManager.keys['KeyW'] || 
                            window.gameControls.inputManager.keys['KeyS'] || 
                            window.gameControls.inputManager.keys['KeyA'] || 
                            window.gameControls.inputManager.keys['KeyD'];
            const baseSpread = 0.001;
            const spread = isMoving ? baseSpread * 1.2 : baseSpread;
            
            direction.x += (Math.random() - 0.5) * spread;
            direction.y += (Math.random() - 0.5) * spread;
            direction.normalize();

            bullet.userData.direction = direction;
            bullet.userData.distanceTraveled = 0;
            bullet.userData.createdAt = Date.now();

            window.scene.add(bullet);
            WeaponState.bullets.push(bullet);

            // Apply recoil
            if (typeof window.gameControls.actualRotationX === 'number' && 
                typeof window.gameControls.actualRotationY === 'number') {
                
                WeaponState.recoil.current = Math.min(
                    WeaponState.recoil.current + weaponConfig.primary.recoilAmount, 
                    weaponConfig.primary.maxRecoil
                );
                WeaponState.recoil.y += weaponConfig.primary.recoilAmount * 0.6;
                WeaponState.recoil.x += (Math.random() - 0.5) * weaponConfig.primary.recoilAmount * 0.3;
                
                window.camera.rotation.x = window.gameControls.actualRotationX - WeaponState.recoil.y;
                window.camera.rotation.y = window.gameControls.actualRotationY - WeaponState.recoil.x;
            }
        }
    },
    
    // Bouncer weapon functions
    bouncer: {
        shoot(chargePower) {
    // Check if we've hit the ball limit
            const activeBalls = WeaponState.bullets.filter(b => b.userData.type === 'bouncer');
            if (activeBalls.length >= CONSTANTS.MAX_ACTIVE_BALLS) {
        // Remove oldest ball if at limit
        const oldestBall = activeBalls[0];
        window.scene.remove(oldestBall);
                const idx = WeaponState.bullets.indexOf(oldestBall);
        if (idx > -1) {
                    WeaponState.bullets.splice(idx, 1);
        }
    }

    const config = weaponConfig.bouncer.projectileConfig;
    const weapon = weaponConfig.bouncer;
    
    const chargeBonus = Math.pow(chargePower || 0, 1.5);
    const speed = weapon.minSpeed + ((weapon.maxSpeed - weapon.minSpeed) * chargeBonus);
    
            // Get starting position
            const position = this.getStartPosition(
        window.camera.position,
        window.camera.quaternion,
        chargeBonus
    );
    
    // Get initial direction and apply upward angle
    const direction = new THREE.Vector3(0, 0, -1)
        .applyQuaternion(window.camera.quaternion);
    
            // Calculate upward angle
            const baseAngle = 0.02;
    const weakThrowBonus = chargeBonus < 0.4 ? 
                0.5 * (1 - (chargeBonus / 0.4)) : 
        0;
    
    const upwardAngle = baseAngle + weakThrowBonus;
    
    // Apply angle to direction
    direction.y += upwardAngle;
    direction.normalize();
    
    const velocity = direction.multiplyScalar(speed);

    // Create local ball
            const ball = this.createBall(position, velocity);

    // Send to other players
    const ballData = {
        position: position.toArray(),
        velocity: velocity.toArray(),
        id: ball.userData.id
    };

    if (window.gameNetworking?.socket?.connected) {
        window.gameNetworking.socket.emit('ballShot', ballData);
    }

            // Play kick sound
    try {
        window.sounds.soccerKick.currentTime = 0.09;
        window.sounds.soccerKick.volume = 0.2;
        window.sounds.soccerKick.play();
    } catch (e) {
        console.debug('Sound error:', e);
    }
        },

        getStartPosition(cameraPos, cameraQuat, chargeBonus) {
            const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(cameraQuat);
            const right = new THREE.Vector3(1, 0, 0).applyQuaternion(cameraQuat);
            
            return cameraPos.clone()
                .add(new THREE.Vector3(0, 0, 0))
                .add(right.multiplyScalar(0.15))
                .add(forward.multiplyScalar(0.3));
        },

        createBall(position, velocity, isNetworked = false, senderId = null) {
            const config = weaponConfig.bouncer.projectileConfig;
            
            const geometry = new THREE.SphereGeometry(config.size, 32, 32);
            const material = new THREE.MeshPhongMaterial({ 
                color: config.color,
                shininess: 30,
                specular: 0x333333,
                map: this.createBallTexture()
            });
            
            const ball = new THREE.Mesh(geometry, material);
            ball.position.copy(position);

            // Add collision sphere for better collision detection
            ball.userData = {
                type: 'bouncer',
                isShootable: true,
                velocity: velocity.clone(),
                bounceCount: 0,
                createdAt: Date.now(),
                id: Date.now(),
                isNetworked,
                senderId,
                collisionRadius: config.size,
                onHit: (damage, hitPoint, normal) => {
                    // Apply force from bullet impact
                    const bulletDirection = new THREE.Vector3(0, 0, -1)
                        .applyQuaternion(window.camera.quaternion)
                        .normalize();
                    
                    const impactForce = 0.1;
                    const addedVelocity = bulletDirection.multiplyScalar(bulletConfig.speed * impactForce);
                    ball.userData.velocity.add(addedVelocity);

                    // Create hit effect
                    if (window.gameEffects?.createHitEffect) {
                        window.gameEffects.createHitEffect(hitPoint);
                    }
                }
            };

            window.scene.add(ball);
            WeaponState.bullets.push(ball);

            return ball;
        },

        createBallTexture() {
            const textureLoader = new THREE.TextureLoader();
            
            const texture = textureLoader.load('https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/textures/soccer-ball.jpg', (texture) => {
                const imageWidth = 370;
                const imageHeight = 320;
                const aspectRatio = imageWidth / imageHeight;
                
                if (aspectRatio > 1) {
                    texture.repeat.set(1, imageHeight / imageWidth);
                    texture.offset.set(0, (1 - imageHeight / imageWidth) / 2);
                } else {
                    texture.repeat.set(imageWidth / imageHeight, 1);
                    texture.offset.set((1 - imageWidth / imageHeight) / 2, 0);
                }
            });
            
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.magFilter = THREE.LinearFilter;
            texture.minFilter = THREE.LinearMipmapLinearFilter;
            texture.anisotropy = 16;
            
            return texture;
        }
    },
    
    // Boost functions
    boost: {
        activate() {
    const now = Date.now();
    
    if (now - weaponConfig.boost.lastFired < weaponConfig.boost.cooldown) {
        return;
    }
    
    // Get camera direction
    const direction = new THREE.Vector3(0, 0, 1);
    direction.applyQuaternion(window.camera.quaternion);
    direction.normalize();
    
    // Apply boost force
    window.player.velocity.x += direction.x * weaponConfig.boost.force;
    window.player.velocity.z += direction.z * weaponConfig.boost.force;
    window.player.velocity.y += direction.y * weaponConfig.boost.force;
    
    // Cap maximum velocity
    const currentSpeed = Math.sqrt(
        window.player.velocity.x * window.player.velocity.x + 
        window.player.velocity.z * window.player.velocity.z +
        window.player.velocity.y * window.player.velocity.y
    );
    
    if (currentSpeed > weaponConfig.boost.maxBoostSpeed) {
        const scaleFactor = weaponConfig.boost.maxBoostSpeed / currentSpeed;
        window.player.velocity.x *= scaleFactor;
        window.player.velocity.z *= scaleFactor;
        window.player.velocity.y *= scaleFactor;
    }
    
    // Play boost sound
    window.sounds.shootRight.currentTime = 0;
    window.sounds.shootRight.play().catch(error => {
        console.error("Error playing boost sound:", error);
    });
    
    // Create boost visual effect
            this.createEffect(window.camera.position, direction);
            
            // Apply visual recoil
            WeaponState.recoil.current = Math.min(
                WeaponState.recoil.current + weaponConfig.boost.recoilAmount * 0.2, 
        weaponConfig.primary.maxRecoil
    );
            WeaponState.recoil.y += weaponConfig.boost.recoilAmount * 0.1;
            window.camera.rotation.x = window.gameControls.actualRotationX - WeaponState.recoil.y;
    
    weaponConfig.boost.lastFired = now;
        },

        createEffect(position, direction) {
    const particleProps = {
        count: 10,
        speed: 0.3,
        size: 0.05,
        lifetime: 200,
        color: 0x3399ff,
        sizeVariation: 0.5,
        opacity: 0.7
    };
    
    for (let i = 0; i < particleProps.count; i++) {
        const spreadDirection = direction.clone();
        spreadDirection.x += (Math.random() - 0.5) * 0.3;
        spreadDirection.y += (Math.random() - 0.5) * 0.3;
        spreadDirection.z += (Math.random() - 0.5) * 0.3;
        spreadDirection.normalize();
        
        const offset = direction.clone().multiplyScalar(0.8);
        const particlePosition = position.clone().add(offset);
        
        window.gameEffects.createImpactEffect(particlePosition, spreadDirection, {
            ...particleProps,
            speed: particleProps.speed + Math.random() * 0.3,
            size: particleProps.size + Math.random() * 0.05,
            lifetime: particleProps.lifetime + Math.random() * 150
        });
    }
}
    }
};

// ==========================================
// 5. COLLISION HANDLING
// ==========================================
const CollisionSystem = {
    handleBulletCollision(bullet, intersection) {
        try {
            const hitObject = intersection.object;
            const hitPoint = intersection.point;
            const normal = intersection.face.normal.clone();
            normal.applyQuaternion(hitObject.getWorldQuaternion(new THREE.Quaternion()));

            // Handle different types of hits
            if (hitObject.userData.type === 'bouncer') {
                this.handleBallHit(hitObject, bullet, hitPoint, normal);
                this.createHitEffects(hitPoint, normal, hitObject);
            } else if (hitObject.userData.isPlayer) {
                this.handlePlayerHit(hitObject, bullet, hitPoint);
                this.createHitEffects(hitPoint, normal, hitObject);
            } else if (hitObject.userData.isShootable) {
                this.handleShootableHit(hitObject, bullet, hitPoint, normal);
                this.createHitEffects(hitPoint, normal, hitObject);
            } else {
                // Create effects for all other objects (walls, platforms, etc.)
                this.createHitEffects(hitPoint, normal, hitObject);
            }

            // Remove the bullet
            this.removeBullet(bullet);
        } catch (error) {
            console.error('[COLLISION] Fatal error in handleBulletCollision:', error);
        }
    },

    createHitEffects(hitPoint, normal, hitObject) {
        try {
            // Create spark effect
            if (window.gameEffects?.createSparkEffect) {
                window.gameEffects.createSparkEffect(hitPoint, normal);
            }

            // Create impact flash
            const flashGeometry = new THREE.SphereGeometry(0.03);
            const flashMaterial = new THREE.MeshBasicMaterial({
                color: 0xffffaa,
                transparent: true,
                opacity: 0.8
            });
            const flash = new THREE.Mesh(flashGeometry, flashMaterial);
            flash.position.copy(hitPoint);
            window.scene.add(flash);

            // Animate flash
            const startTime = Date.now();
            const flashDuration = 100;
            function updateFlash() {
                const age = Date.now() - startTime;
                if (age < flashDuration) {
                    flash.material.opacity = 0.8 * (1 - (age / flashDuration));
                    flash.scale.multiplyScalar(1.05);
                    requestAnimationFrame(updateFlash);
                } else {
                    window.scene.remove(flash);
                    flash.geometry.dispose();
                    flash.material.dispose();
                }
            }
            updateFlash();

            // Create impact effect based on material type
            const materialType = this.determineMaterialType(hitObject);
            if (window.gameEffects?.createImpactEffect) {
                window.gameEffects.createImpactEffect(hitPoint, normal, {
                    color: this.getImpactColor(materialType),
                    size: 0.05,
                    count: 8,
                    speed: 0.2,
                    lifetime: 300
                });
            }
        } catch (error) {
            console.error('[COLLISION] Error creating hit effects:', error);
        }
    },

    handleBallHit(ball, bullet, hitPoint, normal) {
        try {
            // Apply force to the ball based on bullet impact
            const bulletVelocity = bullet.userData.direction.multiplyScalar(bulletConfig.speed);
            const impactForce = 0.1; // Adjust this value to control how much bullets affect balls
            
            // Calculate new velocity for the ball
            const newVelocity = ball.userData.velocity.clone()
                .add(bulletVelocity.multiplyScalar(impactForce));
            
            // Apply the new velocity
            ball.userData.velocity.copy(newVelocity);

            // Create special ball hit effect
            if (window.gameEffects?.createHitEffect) {
                window.gameEffects.createHitEffect(hitPoint, ball);
            }

            // Create impact effect
            if (window.gameEffects?.createImpactEffect) {
                window.gameEffects.createImpactEffect(hitPoint, normal, {
                    color: 0xffffff,
                    size: 0.08,
                    count: 12,
                    speed: 0.3,
                    lifetime: 400
                });
            }
        } catch (error) {
            console.error('[COLLISION] Error handling ball hit:', error);
        }
    },

    handlePlayerHit(player, bullet, hitPoint) {
        try {
            // Create visual hit effect
            window.gameEffects?.createHitEffect(hitPoint, player);
            
            // Apply hit effect locally
            window.gameWorld?.handlePlayerHit(player, bulletConfig.damage);
            
            // Send hit event to network
            window.gameNetworking?.socket?.emit('playerHit', {
                playerId: player.userData.playerId,
                damage: bulletConfig.damage
            });
            
            if (window.debugMode) {
                const parentInfo = player.userData.parent ? {
                    type: player.userData.parent.userData?.type || 'unknown',
                    isPlayer: player.userData.parent.userData?.isPlayer,
                    playerId: player.userData.parent.userData?.playerId
                } : 'no parent';

                console.log('[WEAPONS] Player hit:', {
                    player: player.userData.playerId,
                    damage: bulletConfig.damage,
                    hitPoint: hitPoint.toArray(),
                    partType: player.userData.isPlayerPart ? 'player part' : 'unknown',
                    partId: player.userData.partId,
                    isBodyPart: player.userData.isBodyPart,
                    isLocalPlayer: player.userData.isLocalPlayer,
                    parent: parentInfo,
                    geometry: player.geometry ? {
                        type: player.geometry.type,
                        parameters: player.geometry.parameters
                    } : 'no geometry'
                });
            }
        } catch (error) {
            console.error('[COLLISION] Error handling player hit:', error);
        }
    },

    handleShootableHit(object, bullet, hitPoint, normal) {
        try {
            if (typeof object.userData.onHit === 'function') {
                object.userData.onHit.call(object.userData, bulletConfig.damage, hitPoint, normal);
            }
        } catch (error) {
            console.error('[COLLISION] Error handling shootable hit:', error);
        }
    },

    removeBullet(bullet) {
        try {
            window.scene.remove(bullet);
            const bulletIndex = WeaponState.bullets.indexOf(bullet);
            if (bulletIndex > -1) {
                WeaponState.bullets.splice(bulletIndex, 1);
            }
        } catch (error) {
            console.error('[COLLISION] Error removing bullet:', error);
        }
    },

    determineMaterialType(object) {
        if (object.userData?.type === 'bouncer') return 'ball';
        if (object.userData?.isPlayer) return 'player';
        if (object.material?.name?.includes('metal')) return 'metal';
        if (object.material?.name?.includes('wood')) return 'wood';
        return 'default';
    },

    getImpactColor(materialType) {
        const colors = {
            ball: 0xffffff,
            player: 0xff0000,
            metal: 0xcccccc,
            wood: 0x8b4513,
            default: 0xffaa00
        };
        return colors[materialType] || colors.default;
    },

    handleBallCollision(ball, intersection, object) {
        // Calculate reflection
        const velocity = ball.userData.velocity;
        const normal = intersection.normal;
        const reflection = velocity.clone().reflect(normal);
        reflection.multiplyScalar(0.8); // Reduce velocity on bounce
        
        // Update ball
        ball.position.copy(intersection.point.clone().add(normal.multiplyScalar(0.3)));
        ball.userData.velocity.copy(reflection);
        ball.userData.bounceCount = (ball.userData.bounceCount || 0) + 1;
    },

    checkBallCollision(ball, object) {
        // Get world positions
        const ballPos = ball.position;
        const objectPos = new THREE.Vector3();
        object.getWorldPosition(objectPos);
        
        // Simple sphere collision check
        const distance = ballPos.distanceTo(objectPos);
        const combinedRadius = ball.geometry.parameters.radius + 0.3; // Add some buffer
        
        if (distance < combinedRadius) {
            return {
                point: objectPos,
                normal: new THREE.Vector3().subVectors(ballPos, objectPos).normalize()
            };
        }
        return null;
    }
};

// ==========================================
// 6. CORE WEAPON LOGIC
// ==========================================
const WeaponCore = {
    startShooting() {
        const weapon = weaponConfig[WeaponState.currentWeapon];
        
        if (WeaponState.currentWeapon === 'bouncer') {
            if (!weapon.isCharging) {
                weapon.isCharging = true;
                weapon.chargeStart = Date.now();
                document.getElementById('charge-indicator').style.display = 'block';
            }
            
            // Calculate current charge bonus
            const chargeTime = Date.now() - weapon.chargeStart;
            const chargeBonus = Math.min(1, chargeTime / weapon.chargeTime);
            
            // Update UI
            WeaponUI.updateCrosshairPosition();
            WeaponUI.updateChargeBar();
        } else {
            WeaponState.isShooting = true;
            this.shoot();
        }
    },

    stopShooting() {
        const weapon = weaponConfig[WeaponState.currentWeapon];
        
        if (WeaponState.currentWeapon === 'bouncer' && weapon.isCharging) {
            const chargeTime = Date.now() - weapon.chargeStart;
            const chargeBonus = Math.min(1, chargeTime / weapon.chargeTime);
            
            // Reset charging state and UI
            weapon.isCharging = false;
            weapon.chargeStart = 0;
            
            const chargeIndicator = document.getElementById('charge-indicator');
            const chargeFill = document.getElementById('charge-fill');
            chargeIndicator.style.display = 'none';
            chargeFill.style.width = '0%';
            
            // Reset crosshair
            WeaponUI.updateCrosshairPosition();
            
            // Shoot the ball
            WeaponSystems.bouncer.shoot(chargeBonus);
        }
        WeaponState.isShooting = false;
    },

    shoot() {
        const now = Date.now();
        const weapon = weaponConfig[WeaponState.currentWeapon];
        
        if (now - weapon.lastFired < weapon.fireRate) {
            return;
        }

        if (WeaponState.currentWeapon === 'bouncer') {
            WeaponSystems.bouncer.shoot();
        } else {
            WeaponSystems.primary.shoot();
        }
        
        weapon.lastFired = now;
    },

    updateBullets(deltaTime) {
    // Update each bullet
        for (let i = WeaponState.bullets.length - 1; i >= 0; i--) {
            const bullet = WeaponState.bullets[i];
        
        // Check bullet lifetime (only for regular bullets, not bouncers)
        if (bullet.userData.type !== 'bouncer') {
            const age = Date.now() - bullet.userData.createdAt;
                if (age > CONSTANTS.BULLET_LIFETIME) {
                window.scene.remove(bullet);
                    WeaponState.bullets.splice(i, 1);
                continue;
            }
        }
        
        // Handle different bullet types
        if (bullet.userData.type === 'bouncer') {
                this.updateBouncer(bullet, i);
            continue;
        }
        
        // Regular bullet update logic
        const prevPosition = bullet.position.clone();
        const bulletVelocity = bullet.userData.direction.clone().multiplyScalar(bulletConfig.speed);
        bullet.position.add(bulletVelocity);
        
        // Collision detection
        const raycaster = new THREE.Raycaster(
            prevPosition,
            bullet.userData.direction,
            0,
            bulletVelocity.length()
        );
        
            // Get all collidable objects
            const collidableObjects = [
                ...worldObjects.walls,
                ...worldObjects.platforms,
                ...worldObjects.jumpPads,
                // Filter out local player from players array
                ...Array.from(worldObjects.players.values()).filter(player => {
                    const isLocalPlayer = player.userData?.isLocalPlayer || 
                                        player.userData?.playerId === window.gameNetworking?.playerId;
                    if (window.debugMode && isLocalPlayer) {
                        console.log('[COLLISION] Excluding local player model:', {
                            id: player.userData?.playerId,
                            networkId: window.gameNetworking?.playerId,
                            isLocalPlayer: player.userData?.isLocalPlayer,
                            type: player.userData?.type
                        });
                    }
                    return !isLocalPlayer;
                }),
                // Only include visible destructible objects
                ...(worldObjects.destructibles || []).filter(obj => obj.visible),
                ...(worldObjects.pictures || []),
                ...WeaponState.bullets.filter(b => b.userData.type === 'bouncer'),  // Add bouncer balls
                ...worldObjects.collidables.filter(obj => {
                    // Skip null objects
                    if (!obj) return false;
                    
                    // Always include bouncer balls for ball-to-ball collisions
                    if (obj.userData?.type === 'bouncer') return true;
                    
                    // Skip any destroyed or invisible destructible objects
                    if (obj.userData?.isShootable && !obj.visible) {
                        return false;
                    }
                    
                    // Skip invisible objects except pictures (which need collision even when not visible)
                    if (!obj.visible && !obj.userData?.isPicture) {
                        return false;
                    }

                    // Skip local player model parts
                    if (obj.userData?.isPlayer || obj.userData?.isPlayerPart) {
                        const isLocalPlayer = obj.userData?.isLocalPlayer || 
                                            obj.parent?.userData?.isLocalPlayer;
                        if (isLocalPlayer) {
                            if (window.debugMode) {
                                console.log('[COLLISION] Skipping local player part:', {
                                    object: obj.uuid,
                                    playerId: obj.userData?.playerId,
                                    networkId: window.gameNetworking?.playerId,
                                    isLocalPlayer: obj.userData?.isLocalPlayer,
                                    parentIsLocalPlayer: obj.parent?.userData?.isLocalPlayer,
                                    partType: obj.userData?.partType
                                });
                            }
                            return false;
                        }
                    }
                    
                    // Include all other objects
                    return true;
                })
            ];
            
            const hits = raycaster.intersectObjects(collidableObjects, true);
            
            if (hits.length > 0) {
                const hit = hits[0];
                const hitObject = hit.object;
                
                // Get the root object if it's part of a model
                const rootObject = hitObject.parent?.userData?.type ? 
                                 hitObject.parent : 
                                 hitObject;

                // Calculate correct normal based on object's world rotation first
                const normal = hit.face.normal.clone();
                const objectQuaternion = new THREE.Quaternion();
                hitObject.getWorldQuaternion(objectQuaternion);
                normal.applyQuaternion(objectQuaternion);

                // Debug logging for bullet hits - moved after normal calculation
                if (window.debugMode) {
                    // Get detailed mesh information
                    const meshInfo = {
                        position: hitObject.position.toArray(),
                        rotation: hitObject.rotation.toArray(),
                        scale: hitObject.scale.toArray(),
                        materialDetails: hitObject.material ? {
                            type: hitObject.material.type,
                            color: hitObject.material.color?.getHex(),
                            map: hitObject.material.map ? 'has texture' : 'no texture',
                            transparent: hitObject.material.transparent,
                            opacity: hitObject.material.opacity
                        } : 'no material'
                    };

                    // Get parent hierarchy
                    let parentChain = [];
                    let currentParent = hitObject.parent;
                    while (currentParent) {
                        parentChain.push({
                            type: currentParent.type,
                            name: currentParent.name || 'unnamed',
                            isPlayer: currentParent.userData?.isPlayer,
                            playerId: currentParent.userData?.playerId,
                            position: currentParent.position.toArray()
                        });
                        currentParent = currentParent.parent;
                    }

                    console.log('[BULLET_HIT] Detailed Info:', {
                        hitObject: {
                            // Basic info
                            type: rootObject.userData?.type || hitObject.userData?.type || 'unknown',
                            name: hitObject.name || 'unnamed',
                            isShootable: rootObject.userData?.isShootable || hitObject.userData?.isShootable,
                            isPicture: rootObject.userData?.isPicture || hitObject.userData?.isPicture,
                            isPlayer: rootObject.userData?.isPlayer || hitObject.userData?.isPlayer,
                            isBouncer: rootObject.userData?.type === 'bouncer',
                            
                            // Detailed mesh info
                            mesh: meshInfo,
                            
                            // Player-specific info
                            playerPart: {
                                type: hitObject.userData?.isPlayerPart ? 'player part' : 'unknown',
                                partId: hitObject.userData?.partId,
                                isBodyPart: hitObject.userData?.isBodyPart,
                                isLocalPlayer: hitObject.userData?.isLocalPlayer,
                                health: hitObject.userData?.health,
                                visibility: {
                                    meshVisible: hitObject.visible,
                                    parentVisible: hitObject.parent?.visible,
                                    rootVisible: rootObject.visible
                                },
                                modelInfo: {
                                    isLocalPlayerModel: hitObject.parent === window.playerModel,
                                    modelId: hitObject.parent?.userData?.playerId,
                                    modelType: hitObject.parent?.userData?.type,
                                    distanceFromCamera: hitObject.position.distanceTo(window.camera.position)
                                }
                            },
                            
                            // Geometry info
                            geometry: hitObject.geometry ? {
                                type: hitObject.geometry.type,
                                parameters: hitObject.geometry.parameters,
                                vertexCount: hitObject.geometry.attributes?.position?.count || 'unknown'
                            } : 'no geometry',
                            
                            // Parent hierarchy
                            parentChain: parentChain,
                            
                            // Hit location
                            worldPosition: hit.point.toArray(),
                            localPosition: hitObject.worldToLocal(hit.point.clone()).toArray()
                        },
                        impact: {
                            bulletVelocity: bulletVelocity.length(),
                            hitDistance: hit.distance,
                            normal: normal.toArray(),
                            face: hit.face ? {
                                normal: hit.face.normal.toArray(),
                                materialIndex: hit.face.materialIndex
                            } : 'no face data',
                            camera: {
                                position: window.camera.position.toArray(),
                                rotation: window.camera.rotation.toArray()
                            }
                        }
                    });
                }
                
                // Handle shootable objects - check isShootable and visible state
                if (rootObject.userData?.onHit && rootObject.userData.isShootable && rootObject.visible) {
                    if (window.debugMode) {
                        console.log('[BULLET_DAMAGE]', {
                            type: rootObject.userData.type,
                            damage: bulletConfig.damage,
                            currentHealth: rootObject.userData.health,
                            position: hit.point.toArray()
                        });
                    }
                    rootObject.userData.onHit(bulletConfig.damage, hit.point);
                }

                // Create spark effect at hit point for all collisions
                if (window.gameEffects?.createSparkEffect) {
                    if (window.debugMode) {
                        console.log('[SPARK_EFFECT]', {
                            position: hit.point.toArray(),
                            normal: normal.toArray(),
                            material: hitObject.material ? {
                                type: hitObject.material.type,
                                color: hitObject.material.color?.getHex()
                            } : 'no material'
                        });
                    }
                    window.gameEffects.createSparkEffect(hit.point, normal);
                }

                // Create impact flash
                const flashGeometry = new THREE.SphereGeometry(0.03);
                const flashMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffaa,
                    transparent: true,
                    opacity: 0.8
                });
                const flash = new THREE.Mesh(flashGeometry, flashMaterial);
                flash.position.copy(hit.point);
                window.scene.add(flash);

                // Animate and remove flash
                const startTime = Date.now();
                const flashDuration = 100;
                function updateFlash() {
                    const age = Date.now() - startTime;
                    if (age < flashDuration) {
                        flash.material.opacity = 0.8 * (1 - (age / flashDuration));
                        flash.scale.multiplyScalar(1.05);
                        requestAnimationFrame(updateFlash);
                    } else {
                        window.scene.remove(flash);
                        flash.geometry.dispose();
                        flash.material.dispose();
                    }
                }
                updateFlash();
                
                // Remove the bullet
                window.scene.remove(bullet);
                WeaponState.bullets.splice(i, 1);
                break;
            }
    }
    
    // Update recoil recovery
        if (WeaponState.recoil.current > 0) {
            const weapon = weaponConfig[WeaponState.currentWeapon];
            const recovery = weapon.recoilRecovery || 0.90;

            // Smoothly reduce recoil values
            WeaponState.recoil.current *= recovery;
            WeaponState.recoil.y *= recovery;
            WeaponState.recoil.x *= recovery;

            // Only update camera if we have valid rotation values
            if (typeof window.gameControls.actualRotationX === 'number' && 
                typeof window.gameControls.actualRotationY === 'number') {
                
                // Ensure the camera rotation stays within reasonable bounds
                const newRotX = window.gameControls.actualRotationX - WeaponState.recoil.y;
                const newRotY = window.gameControls.actualRotationY - WeaponState.recoil.x;

                // Clamp rotation values to prevent extreme angles
                window.camera.rotation.x = Math.max(Math.min(newRotX, Math.PI/2), -Math.PI/2);
                window.camera.rotation.y = newRotY;

                // Reset recoil if it's very small
                if (Math.abs(WeaponState.recoil.current) < 0.0001) {
                    WeaponState.recoil.current = 0;
                    WeaponState.recoil.x = 0;
                    WeaponState.recoil.y = 0;
                }
            }
        }
    
        // Handle automatic weapon firing
        if (WeaponState.isShooting && weaponConfig.primary.automatic) {
            this.shoot();
        }
    },

    updateBouncer(bouncer, index) {
        const config = weaponConfig.bouncer.projectileConfig;
        const prevPosition = bouncer.position.clone();
        
        // Initialize frame counter if not exists
        if (typeof bouncer.userData.frameCount === 'undefined') {
            bouncer.userData.frameCount = 0;
        }
        bouncer.userData.frameCount++;
        
        // Apply gravity
        bouncer.userData.velocity.y -= config.gravity * 2;
        
        // Update position
        const movement = bouncer.userData.velocity.clone();
        const newPosition = bouncer.position.clone().add(movement);
        
        // Check for collisions with walls and other objects first
        const raycaster = new THREE.Raycaster(
            prevPosition,
            bouncer.userData.velocity.clone().normalize(),
            0,
            movement.length() + config.size
        );
        
        // Get all collidable objects except other balls
        const collidableObjects = [
            ...worldObjects.walls,
            ...worldObjects.platforms,
            ...worldObjects.jumpPads,
            ...Array.from(worldObjects.players.values()),
            ...(worldObjects.destructibles || []),
            ...(worldObjects.pictures || []),
            ...worldObjects.collidables
        ].filter(obj => {
            if (!obj) return false;
            if (obj.userData?.type === 'bouncer') return false;
            if (obj.userData?.isShootable === false && !obj.userData.isPicture) return false;
            if (obj.userData?.type && !obj.visible && obj.userData.type !== 'bouncer') return false;
            return true;
        });

        const hits = raycaster.intersectObjects(collidableObjects, true);
        
        if (hits.length > 0) {
            const hit = hits[0];
            const hitObject = hit.object;
            
            // Calculate bounce
            const normal = hit.face.normal.clone();
            const objectQuaternion = new THREE.Quaternion();
            hitObject.getWorldQuaternion(objectQuaternion);
            normal.applyQuaternion(objectQuaternion);
            
            const velocity = bouncer.userData.velocity.clone();
            const speed = velocity.length();
            
            // Only bounce if moving fast enough
            if (speed > 0.03) {
                const reflection = velocity.clone().reflect(normal);
                // Use higher bounce coefficient for pictures
                const bounceCoefficient = hitObject.userData.isPicture ? config.bounce * 1.1 : config.bounce;
                reflection.multiplyScalar(bounceCoefficient);
                
                // Move slightly away from surface
                const safePosition = hit.point.clone()
                    .add(normal.multiplyScalar(config.size * 1.1));
                
                bouncer.position.copy(safePosition);
                bouncer.userData.velocity.copy(reflection);
                bouncer.userData.bounceCount++;
            } else {
                // Ball has stopped
                bouncer.userData.velocity.set(0, 0, 0);
                bouncer.position.copy(hit.point.clone().add(normal.multiplyScalar(config.size)));
            }
        } else {
            // No wall collision, update position
            bouncer.position.copy(newPosition);
        }
        
        // Check for ball-to-ball collisions
        const otherBalls = WeaponState.bullets.filter(
            bullet => bullet.userData.type === 'bouncer' && bullet !== bouncer
        );
        
        for (const otherBall of otherBalls) {
            const distance = bouncer.position.distanceTo(otherBall.position);
            const combinedRadius = bouncer.userData.collisionRadius + otherBall.userData.collisionRadius;
            
            if (distance < combinedRadius) {
                // Calculate collision normal
                const normal = new THREE.Vector3()
                    .subVectors(bouncer.position, otherBall.position)
                    .normalize();

                // Calculate relative velocity
                const relativeVel = new THREE.Vector3()
                    .subVectors(bouncer.userData.velocity, otherBall.userData.velocity);
                
                // Check if balls are moving towards each other
                const velAlongNormal = relativeVel.dot(normal);
                
                if (velAlongNormal < 0) {
                    // Calculate impulse
                    const restitution = 0.92;
                    const j = -(1 + restitution) * velAlongNormal;
                    const impulse = normal.multiplyScalar(j * 0.5); // Half impulse for each ball

                    // Apply impulse
                    bouncer.userData.velocity.add(impulse);
                    otherBall.userData.velocity.sub(impulse);
                    
                    // Separate balls
                    const overlap = combinedRadius - distance;
                    const separation = normal.clone().multiplyScalar(overlap * 0.5);
                    bouncer.position.add(separation);
                    otherBall.position.sub(separation);
                }
            }
        }
        
        // Add rotation based on movement
        const horizontalVelocity = bouncer.userData.velocity.clone();
        horizontalVelocity.y = 0;
        
        if (horizontalVelocity.length() > 0.001) {
            const rotationAxis = new THREE.Vector3()
                .crossVectors(horizontalVelocity.normalize(), new THREE.Vector3(0, 1, 0))
                .normalize();
            
            const speed = bouncer.userData.velocity.length();
            const rotationAmount = -Math.sqrt(speed) * 0.2;
            
            bouncer.rotateOnAxis(rotationAxis, rotationAmount);
        }
    }
};

// ==========================================
// 7. EVENT HANDLERS
// ==========================================
const WeaponEvents = {
    onKeyDown(e) {
        if (e.key === '1') {
            WeaponState.currentWeapon = WeaponState.currentWeapon === 'primary' ? 'bouncer' : 'primary';
            WeaponUI.updateHUD();
            
            const crosshair = document.getElementById('crosshair');
            if (WeaponState.currentWeapon === 'bouncer') {
                crosshair.style.transform = 'translate(calc(-50% + 10px), -50%)';
            } else {
                crosshair.style.transform = 'translate(-50%, -50%)';
            }
        } else if (e.key === '2') {
            console.log('Right weapon toggle not implemented yet');
        }
    },

    onDebugToggle() {
    window.debugMode = !window.debugMode;
    console.log('Debug mode:', window.debugMode ? 'enabled' : 'disabled');
    
        if (WeaponState.currentWeapon === 'bouncer' && weaponConfig.bouncer.isCharging) {
        if (window.debugMode) {
                WeaponCore.startShooting();
        } else {
            if (weaponConfig.bouncer.trajectoryGroup) {
                window.scene.remove(weaponConfig.bouncer.trajectoryGroup);
                weaponConfig.bouncer.trajectoryGroup.traverse(child => {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) child.material.dispose();
                });
                weaponConfig.bouncer.trajectoryGroup = null;
            }
        }
    }
    }
};

// ==========================================
// 8. PUBLIC API
// ==========================================
window.gameWeapons = {
    // State
    get state() { return WeaponState; },
    get config() { return weaponConfig; },
    get bulletConfig() { return bulletConfig; },
    
    // Core functions
    startShooting: WeaponCore.startShooting.bind(WeaponCore),
    stopShooting: WeaponCore.stopShooting.bind(WeaponCore),
    updateBullets: WeaponCore.updateBullets.bind(WeaponCore),
    
    // Weapon specific functions
    boost: WeaponSystems.boost.activate.bind(WeaponSystems.boost),
    createBouncerBall: WeaponSystems.bouncer.createBall.bind(WeaponSystems.bouncer)
};

// ==========================================
// 9. INITIALIZATION
// ==========================================
function initWeapons() {
    WeaponUI.initStyles();
    WeaponUI.updateHUD();
    document.addEventListener('keydown', WeaponEvents.onKeyDown);
}

// Initialize weapons system
initWeapons(); 