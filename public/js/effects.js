// Visual Effects System Configuration
const EFFECTS_CONFIG = {
    particles: {
        impact: {
            count: 15,
            speed: 0.4,
            size: 0.03,
            lifetime: 800,
            color: 0xff4400,
            sizeVariation: 0.5
        },
        spark: {
            count: 8,
            size: 0.03,
            speed: 0.15,
            lifetime: 300,
            color: 0xffd700,
            fadeSpeed: 0.06,
            gravity: 0.0008,
            spread: 0.2,
            trail: {
                length: 3,
                fadeStep: 0.2,
                scale: 0.7
            }
        },
        jumpPad: {
            count: 15,
            speed: 0.2,
            size: 0.05,
            lifetime: 600,
            color: 0x00ffff,
            sizeVariation: 0.5
        }
    },
    effects: {
        impact: {
            flash: {
                size: 0.3,
                duration: 150,
                color: 0xffff00
            },
            sparks: {
                count: 12,
                speed: 0.7,
                size: 0.015,
                lifetime: 500,
                color: 0xffffcc
            },
            shockwave: {
                size: 0.1,
                maxSize: 1.5,
                duration: 300,
                color: 0xffffaa
            },
            debris: {
                count: 6,
                speed: 0.3,
                size: 0.05,
                lifetime: 1200,
                color: 0x888888
            }
        },
        explosion: {
            flash: {
                size: 2,
                duration: 300,
                color: 0xffaa00
            },
            particles: {
                count: 30,
                speed: 0.4,
                size: 0.15,
                lifetime: 1000,
                color: 0xff4400
            },
            smoke: {
                count: 15,
                speed: 0.2,
                size: 0.3,
                lifetime: 1500,
                color: 0x444444
            },
            shockwave: {
                size: 0.5,
                maxSize: 4,
                duration: 400,
                color: 0xffaa44
            }
        },
        jumpPad: {
            shockwave: {
                size: 0.5,
                maxSize: 2.0,
                duration: 300,
                color: 0x00ffff
            }
        }
    },
    hitEffect: {
        duration: 100,
        color: 0xff0000
    }
};

// Effect Classes
class ImpactParticle {
    constructor(position, normal, properties) {
        const sizeVariation = properties.sizeVariation || 0;
        const particleSize = properties.size * (1 - sizeVariation + Math.random() * sizeVariation * 2);
        
        const geometry = new THREE.SphereGeometry(particleSize);
        
        // Add color variation
        const hue = Math.random() * 0.1 - 0.05;
        const color = new THREE.Color(properties.color);
        color.offsetHSL(hue, 0, Math.random() * 0.2);
        
        const material = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        
        // Store direction and properties
        this.direction = normal.clone();
        this.speed = properties.speed * (0.5 + Math.random() * 0.8);
        this.rotationSpeed = Math.random() * 0.2 - 0.1;
        this.createdAt = Date.now();
        this.lifetime = properties.lifetime * (0.8 + Math.random() * 0.4);
        this.gravity = properties.gravity || 0.002;
        
        // Trail properties
        this.trail = [];
        this.trailLength = properties.trailLength || 0;
        this.trailFadeStep = properties.trailFadeStep || 0.1;
        this.trailScale = properties.trailScale || 0.9;
        
        window.scene.add(this.mesh);
    }

    update(deltaTime) {
        const age = Date.now() - this.createdAt;
        
        if (age > 5000) {
            this.cleanup();
            return false;
        }
        
        const lifeRatio = age / this.lifetime;
        
        if (lifeRatio >= 1) {
            this.cleanup();
            return false;
        }
        
        // Store previous position for trail
        if (this.trailLength > 0) {
            this.trail.unshift({
                position: this.mesh.position.clone(),
                opacity: 1
            });
            
            // Limit trail length
            if (this.trail.length > this.trailLength) {
                const removed = this.trail.pop();
                if (removed.mesh) {
                    window.scene.remove(removed.mesh);
                    if (removed.mesh.geometry) removed.mesh.geometry.dispose();
                    if (removed.mesh.material) removed.mesh.material.dispose();
                }
            }
            
            // Update trail segments
            this.trail.forEach((segment, index) => {
                if (!segment.mesh) {
                    const scale = Math.pow(this.trailScale, index);
                    const geometry = this.mesh.geometry.clone().scale(scale, scale, scale);
                    const material = this.mesh.material.clone();
                    segment.mesh = new THREE.Mesh(geometry, material);
                    segment.mesh.position.copy(segment.position);
                    window.scene.add(segment.mesh);
                }
                
                segment.opacity -= this.trailFadeStep;
                if (segment.opacity <= 0) {
                    window.scene.remove(segment.mesh);
                    segment.mesh.geometry.dispose();
                    segment.mesh.material.dispose();
                    this.trail.splice(index, 1);
                } else {
                    segment.mesh.material.opacity = segment.opacity;
                }
            });
        }
        
        // Update position with physics
        this.direction.y -= this.gravity; // Apply gravity
        this.mesh.position.add(this.direction.clone().multiplyScalar(this.speed));
        
        // Add rotation
        this.mesh.rotation.x += this.rotationSpeed;
        this.mesh.rotation.y += this.rotationSpeed;
        
        // Fade out with pulsing
        const pulse = Math.sin(lifeRatio * Math.PI * 6) * 0.15 + 0.85;
        this.mesh.material.opacity = (1 - lifeRatio) * pulse;
        
        return true;
    }

    cleanup() {
        // Remove main particle
        window.scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        
        // Remove trail segments
        this.trail.forEach(segment => {
            if (segment.mesh) {
                window.scene.remove(segment.mesh);
                segment.mesh.geometry.dispose();
                segment.mesh.material.dispose();
            }
        });
        this.trail = [];
    }
}

class ShockwaveEffect {
    constructor(position, normal, properties) {
        const ringGeometry = new THREE.RingGeometry(
            properties.size,
            properties.size * 1.2,
            16
        );
        
        const material = new THREE.MeshBasicMaterial({
            color: properties.color,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });
        
        this.mesh = new THREE.Mesh(ringGeometry, material);
        this.mesh.lookAt(normal);
        
        const surfaceOffset = 0.01;
        this.mesh.position.copy(position).addScaledVector(normal, surfaceOffset);
        
        this.maxSize = properties.maxSize;
        this.duration = properties.duration;
        this.createdAt = Date.now();
        
        window.scene.add(this.mesh);
    }
    
    update() {
        const age = Date.now() - this.createdAt;
        
        if (age > this.duration || age > 5000) {
            window.scene.remove(this.mesh);
            return false;
        }
        
        const progress = age / this.duration;
        const scale = this.maxSize * progress;
        
        this.mesh.scale.set(scale, scale, scale);
        this.mesh.material.opacity = 0.9 * (1 - progress);
        
        return true;
    }
}

// State Management
const state = {
    particles: [],
    shockwaves: [],
    hitEffects: new Map(),
    particleCount: 0
};

// Utility Functions
const utils = {
    removeParticle(index) {
        const particle = state.particles[index];
        if (particle && particle.group) {
            particle.group.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            window.scene.remove(particle.group);
        }
        state.particles.splice(index, 1);
    },

    createFlashEffect(position, config) {
        const flashGeo = new THREE.SphereGeometry(config.size);
        const flashMat = new THREE.MeshBasicMaterial({
            color: config.color,
            transparent: true,
            opacity: 0.8
        });
        const flash = new THREE.Mesh(flashGeo, flashMat);
        flash.position.copy(position);
        window.scene.add(flash);

        const startTime = Date.now();
        function updateFlash() {
            const age = Date.now() - startTime;
            if (age < config.duration) {
                flash.material.opacity = 0.8 * (1 - (age / config.duration));
                flash.scale.multiplyScalar(1.05);
                requestAnimationFrame(updateFlash);
            } else {
                window.scene.remove(flash);
                flash.geometry.dispose();
                flash.material.dispose();
            }
        }
        updateFlash();
    }
};

// Effect Creation Functions
function createImpactEffect(position, direction, options = {}) {
    const config = {
        color: options.color || 0xffffff,
        size: options.size || 0.1,
        duration: options.duration || 200
    };

    utils.createFlashEffect(position, {
        size: config.size * 2,
        color: config.color,
        duration: config.duration
    });
}

function createExplosion(position, scale = 1.0) {
    const config = EFFECTS_CONFIG.effects.explosion;
    
    // Play explosion sound
    if (window.sounds?.explosionSounds) {
        const sound = window.sounds.explosionSounds[window.sounds.explosionSoundIndex];
        if (sound) {
            sound.currentTime = 0;
            sound.volume = Math.min(0.3, scale);
            sound.play().catch(error => console.debug('Sound play error:', error));
            window.sounds.explosionSoundIndex = 
                (window.sounds.explosionSoundIndex + 1) % window.sounds.explosionSounds.length;
        }
    }

    // Create flash effect
    utils.createFlashEffect(position, {
        size: config.flash.size * scale,
        color: config.flash.color,
        duration: config.flash.duration
    });

    // Create particles
    createExplosionParticles(position, scale, config);
    
    // Create shockwave
    createExplosionShockwave(position, scale, config);
}

function createHitEffect(position, hitObject) {
    if (!hitObject?.material) return;

    // Generate unique ID for this part
    hitObject.userData.partId = hitObject.userData.partId || 
        Math.random().toString(36).substr(2, 9);

    // Clear existing effect
    const existingEffect = state.hitEffects.get(hitObject.userData.partId);
    if (existingEffect) {
        clearTimeout(existingEffect.timeout);
    }

    // Ensure unique material
    ensureUniqueHitObjectMaterial(hitObject);

    // Apply hit effect
    applyHitEffect(hitObject);
}

// Hit Effect Functions
function ensureUniqueHitObjectMaterial(object) {
    if (Array.isArray(object.material)) {
        // Handle multi-material objects
        object.material = object.material.map(mat => {
            if (!mat.userData.isCloned) {
                const clonedMat = mat.clone();
                clonedMat.userData.isCloned = true;
                clonedMat.userData.originalColor = mat.color.getHex();
                return clonedMat;
            }
            return mat;
        });
    } else if (object.material && !object.material.userData.isCloned) {
        // Handle single material objects
        const clonedMat = object.material.clone();
        clonedMat.userData.isCloned = true;
        clonedMat.userData.originalColor = object.material.color.getHex();
        object.material = clonedMat;
    }
}

function applyHitEffect(object) {
    const config = EFFECTS_CONFIG.hitEffect;
    const materials = Array.isArray(object.material) ? object.material : [object.material];

    // Store original colors and create flash effect
    materials.forEach(material => {
        if (!material) return;

        const originalColor = material.userData.originalColor;
        if (!originalColor) return;

        // Create flash effect
        material.color.setHex(config.color);
        
        // Set up recovery
        const timeout = setTimeout(() => {
            material.color.setHex(originalColor);
            state.hitEffects.delete(object.userData.partId);
        }, config.duration);

        // Store effect data
        state.hitEffects.set(object.userData.partId, {
            timeout,
            originalColor
        });
    });
}

// Effect Update Functions
function updateEffects(deltaTime) {
    updateParticles(deltaTime);
    updateShockwaves();
    state.particleCount = getParticleCount();
}

function updateParticles(deltaTime) {
    for (let i = state.particles.length - 1; i >= 0; i--) {
        const particle = state.particles[i];
        if (!particle.update(deltaTime)) {
            utils.removeParticle(i);
        }
    }
}

function updateShockwaves() {
    for (let i = state.shockwaves.length - 1; i >= 0; i--) {
        if (!state.shockwaves[i].update()) {
            state.shockwaves.splice(i, 1);
        }
    }
}

// Particle Creation Functions
function createSparkParticles(position, normal, config) {
    for (let i = 0; i < config.count; i++) {
        // Calculate spread direction based on config
        const spreadAngle = config.spread * Math.PI;
        const theta = Math.random() * Math.PI * 2;  // Random angle around normal
        const phi = Math.random() * spreadAngle;    // Angle from normal
        
        // Create spread direction vector
        const direction = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.sin(phi) * Math.sin(theta),
            Math.cos(phi)
        );
        
        // Create rotation matrix to align with inverted normal
        const rotationMatrix = new THREE.Matrix4();
        rotationMatrix.lookAt(
            new THREE.Vector3(),
            normal.clone().negate(),  // Invert the normal direction
            new THREE.Vector3(0, 1, 0)
        );
        
        // Apply rotation to direction
        direction.applyMatrix4(rotationMatrix);
        
        // Create particle with calculated direction
        const particle = new ImpactParticle(
            position.clone(),
            direction,  // Use calculated direction instead of normal
            {
                size: config.size * (0.8 + Math.random() * 0.4),
                speed: config.speed * (0.7 + Math.random() * 0.6),
                lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                color: config.color,
                sizeVariation: 0.3,
                gravity: config.gravity || 0.002  // Use config gravity or default
            }
        );
        
        // Add trail effect if configured
        if (config.trail) {
            particle.trailLength = config.trail.length;
            particle.trailFadeStep = config.trail.fadeStep;
            particle.trailScale = config.trail.scale;
        }
        
        state.particles.push(particle);
    }
}

function createExplosionParticles(position, scale, config) {
    // Core explosion particles
    for (let i = 0; i < config.particles.count; i++) {
        const direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize();

        state.particles.push(new ImpactParticle(
            position.clone(),
            direction,
            {
                size: config.particles.size * scale,
                speed: config.particles.speed * (0.5 + Math.random() * 0.5),
                lifetime: config.particles.lifetime,
                color: config.particles.color,
                sizeVariation: 0.5
            }
        ));
    }

    // Smoke particles
    for (let i = 0; i < config.smoke.count; i++) {
        const direction = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 1,  // Bias upward
            Math.random() * 2 - 1
        ).normalize();

        state.particles.push(new ImpactParticle(
            position.clone(),
            direction,
            {
                size: config.smoke.size * scale,
                speed: config.smoke.speed * (0.5 + Math.random() * 0.5),
                lifetime: config.smoke.lifetime,
                color: config.smoke.color,
                sizeVariation: 0.7
            }
        ));
    }
}

function createExplosionShockwave(position, scale, config) {
    state.shockwaves.push(new ShockwaveEffect(
        position,
        new THREE.Vector3(0, 1, 0),
        {
            size: config.shockwave.size * scale,
            maxSize: config.shockwave.maxSize * scale,
            duration: config.shockwave.duration,
            color: config.shockwave.color
        }
    ));
}

function createJumpPadParticles(position, config) {
    const upVector = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < config.count; i++) {
        state.particles.push(new ImpactParticle(
            position.clone(),
            upVector,
            {
                size: config.size,
                speed: config.speed * (0.5 + Math.random()),
                lifetime: config.lifetime * (0.8 + Math.random() * 0.4),
                color: config.color,
                sizeVariation: config.sizeVariation
            }
        ));
    }
}

function createJumpPadShockwave(position) {
    const config = EFFECTS_CONFIG.effects.jumpPad.shockwave;
    state.shockwaves.push(new ShockwaveEffect(
        position,
        new THREE.Vector3(0, 1, 0),
        config
    ));
}

// Helper Functions
function getParticleCount() {
    return state.particles.length + 
           state.shockwaves.length + 
           (window.particles?.length || 0);
}

function createSparkEffect(position, normal) {
    const config = EFFECTS_CONFIG.particles.spark;
    createSparkParticles(position, normal, config);
}

function createJumpPadEffect(position) {
    const config = EFFECTS_CONFIG.particles.jumpPad;
    createJumpPadParticles(position, config);
    createJumpPadShockwave(position);
}

// Export API
window.gameEffects = {
    createImpactEffect,
    createExplosion,
    createHitEffect,
    createSparkEffect,
    createJumpPadEffect,
    updateEffects,
    getParticleCount: () => state.particleCount
}; 