// Game world management and environment

//-----------------------------------------------------------------------------
// Constants and Configurations
//-----------------------------------------------------------------------------

// World objects containers
const worldObjects = {
    walls: [],
    targets: [],
    platforms: [],
    jumpPads: [],
    decorations: [],
    players: new Map(),
    clouds: [],
    collidables: [],
    destructibles: [],
    pictures: []
};

// World properties
const worldConfig = {
    gravity: 9.81,
    ambientLight: 0.7,
    fogDensity: 0.007,
    groundSize: 200,
    wallHeight: 5,
    platformThickness: 0.3
};

// Material definitions
const materials = {
    ground: new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.8,
        metalness: 0.2,
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/refs/heads/dev/examples/textures/terrain/grasslight-big.jpg', texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(100, 100);
            texture.anisotropy = 16;
        })
    }),
    wall: new THREE.MeshStandardMaterial({
        color: 0x505050,
        roughness: 0.7,
        metalness: 0.3,
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/brick_diffuse.jpg', texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(2, 2);
        })
    }),
    platform: new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        metalness: 0.8,
        transparent: false,
        opacity: 1,
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/textures/wood-1.jpg', texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(10, 10);
            texture.anisotropy = 16;
        })
    }),
    stairs: new THREE.MeshStandardMaterial({
        color: 0x808080,
        roughness: 0.7,
        metalness: 0.3,
        map: new THREE.TextureLoader().load('https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/textures/wood-1.jpg', texture => {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(0.5, 3);
            texture.rotation = Math.PI / 2;  // Rotate 90 degrees
            texture.center.set(0.5, 0.5);    // Set rotation center to middle of texture
            texture.anisotropy = 16;
        })
    }),
    jumpPad: new THREE.MeshStandardMaterial({
        color: 0x00FF00,
        emissive: 0x00FF00,
        emissiveIntensity: 0.7,
        roughness: 0.4,
        metalness: 0.6
    }),
    player: new THREE.MeshPhongMaterial({
        color: 0x4287f5,
        shininess: 50,
        specular: 0x444444
    })
};

// Add texture loading without debug
const playerTextures = {
    face: new THREE.TextureLoader().load(
        'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/textures/face_texture.jpeg',
        (texture) => {
            // Force update all existing player models
            worldObjects.players.forEach((player, id) => {
                const head = player.children.find(child => 
                    Array.isArray(child.material) && child.material.length === 6
                );
                if (head && head.material[4]) {
                    head.material[4].map = texture;
                    head.material[4].needsUpdate = true;
                }
            });
        },
        undefined,
        (error) => console.error('Error loading face texture:', error)
    ),
    body: materials.player.clone()
};

// Add sky configuration
const skyConfig = {
    cloudSpeed: 0.00005
};

// Update cloud configuration
const cloudConfig = {
    count: 25,              
    minHeight: 120,
    maxHeight: 220,
    spread: 1000,           
    moveSpeed: 0.05,        
    bobSpeed: 0.0001,       // Reduced from 0.0002 - slower bobbing
    bobAmount: 0.01,        // Reduced from 0.2 - much smaller vertical movement
    rotateSpeed: 0.00005,   
    gridSize: 5,            
    positionJitter: 80,     
    minCloudSize: 0.6,
    maxCloudSize: 1.2
};

// Add pictures configuration
const pictures = [
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/1.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/2.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/4.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/5.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/6.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/7.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/8.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/9.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/10.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/11.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/12.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/13.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/14.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/15.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/16.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/17.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/18.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/19.jpg',
    'https://raw.githubusercontent.com/matusagh/cursor-fps-game/refs/heads/main/pics/20.jpg'
];

// Track loaded pictures
let loadedPictureCount = 0;
const totalPictures = pictures.length;

// Function to load and position pictures
function loadPictures() {
    pictures.forEach((pictureSrc, index) => {
        const textureLoader = new THREE.TextureLoader();
        
        textureLoader.load(
            pictureSrc,
            function(texture) {
                loadedPictureCount++;
                
                const imageWidth = texture.image.width;
                const imageHeight = texture.image.height;
                const aspectRatio = imageWidth / imageHeight;
                
                texture.encoding = THREE.LinearEncoding;
                
                const pictureMaterial = new THREE.MeshBasicMaterial({ 
                    map: texture,
                    side: THREE.DoubleSide,
                    fog: false,
                    color: 0xffffff,
                    toneMapped: false
                });
                
                const sizeVariation = 0.8 + (Math.random() * 0.1);
                const baseSize = 25 * sizeVariation;
                
                let pictureWidth, pictureHeight;
                
                if (aspectRatio >= 1) {
                    pictureWidth = baseSize;
                    pictureHeight = baseSize / aspectRatio;
                } else {
                    pictureWidth = baseSize * aspectRatio;
                    pictureHeight = baseSize;
                }
                
                const pictureGeometry = new THREE.PlaneGeometry(pictureWidth, pictureHeight);
                const picturePlane = new THREE.Mesh(pictureGeometry, pictureMaterial);
                
                const playerStartPos = new THREE.Vector3(0, 2.2, -20);
                const radius = 70;
                
                const angleStep = (2 * Math.PI) / totalPictures;
                const angle = index * angleStep;
                
                const radiusVariation = radius * (0.95 + Math.random() * 0.1);
                const x = playerStartPos.x + radiusVariation * Math.cos(angle);
                const z = playerStartPos.z + radiusVariation * Math.sin(angle);
                
                const bottomEdgeHeight = 0.1;
                const heightVariation = bottomEdgeHeight + (pictureHeight / 2) + (Math.random() * 0.2);
                
                picturePlane.position.set(x, heightVariation, z);
                
                const directionToPlayer = new THREE.Vector3().subVectors(
                    playerStartPos,
                    picturePlane.position
                ).normalize();
                
                const rotationY = Math.atan2(directionToPlayer.x, directionToPlayer.z);
                picturePlane.rotation.y = rotationY;
                
                picturePlane.rotation.x = (Math.random() - 0.5) * 0.1;
                picturePlane.rotation.z = (Math.random() - 0.5) * 0.1;
                
                picturePlane.userData.isPicture = true;
                
                // Add collision properties to the picture
                addCollisionProperties(picturePlane, CollisionType.SOLID, {
                    isPicture: true,
                    isStatic: true
                });
                
                // Add to world objects
                if (!worldObjects.pictures) {
                    worldObjects.pictures = [];
                }
                worldObjects.pictures.push(picturePlane);
                
                window.scene.add(picturePlane);
            },
            undefined,
            function(error) {
                console.error(`Error loading picture ${index + 1}: ${pictureSrc}`, error);
            }
        );
    });
}

// Add this near the top of world.js, after worldConfig and before other functions
function addCollisionProperties(object, type, options = {}) {
    if (window.debugMode) {
        console.log('[WORLD] Adding collision to:', {
            type,
            options,
            object: object.uuid
        });
    }

    if (!object.userData) object.userData = {};
    object.userData.collision = {
        type,
        ...options
    };
    
    // Add to collidables array if not already present
    if (!worldObjects.collidables) worldObjects.collidables = [];
    if (!worldObjects.collidables.includes(object)) {
    worldObjects.collidables.push(object);
    }
}

// Create dynamic sky
function createDynamicSky() {
    // Create sky geometry
    const skyGeometry = new THREE.SphereGeometry(500, 32, 32);
    
    // Create sky material with natural mountains
    const skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 }
        },
        side: THREE.BackSide,
        vertexShader: `
            varying vec3 vWorldPosition;
            
            void main() {
                vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                vWorldPosition = worldPosition.xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            varying vec3 vWorldPosition;
            
            // Improved hash function
            float hash(vec2 p) {
                p = fract(p * vec2(234.34, 435.345));
                p += dot(p, p + 34.23);
                return fract(p.x * p.y);
            }
            
            // Simplified noise function for cleaner curves
            float smoothNoise(vec2 p) {
                vec2 i = floor(p);
                vec2 f = fract(p);
                f = f * f * (3.0 - 2.0 * f); // Smoother interpolation
                
                float a = hash(i);
                float b = hash(i + vec2(1.0, 0.0));
                float c = hash(i + vec2(0.0, 1.0));
                float d = hash(i + vec2(1.0, 1.0));
                
                return mix(
                    mix(a, b, f.x),
                    mix(c, d, f.x),
                    f.y
                );
            }
            
            // Clean mountain shape function
            float mountainShape(float x) {
                // Create seamless pattern by using modulo and smooth interpolation
                float period = 6.28318530718; // 2 * PI
                float x1 = mod(x, period);
                float x2 = mod(x + period, period);
                
                // Smooth transition between segments
                float t = smoothstep(0.0, 1.0, fract(x / period));
                
                // Base shape calculation with extreme peaks
                float shape1 = pow(abs(sin(x1)), 2.0) * pow(abs(cos(x1 * 0.5)), 1.5);
                float shape2 = pow(abs(sin(x2)), 2.0) * pow(abs(cos(x2 * 0.5)), 1.5);
                
                return mix(shape1, shape2, t);
            }
            
            // Forest color function
            vec3 getForestColor(float height, float snowLine) {
                vec3 grassColor = vec3(0.2, 0.3, 0.1);    // Dark forest green
                vec3 rockColor = vec3(0.4, 0.4, 0.4);     // Grey rock
                vec3 snowColor = vec3(0.95, 0.95, 0.95);  // Snow white
                
                // Mix forest and rock
                float rockMix = smoothstep(0.3, 0.7, height);
                vec3 baseColor = mix(grassColor, rockColor, rockMix);
                
                // Add snow on peaks
                float snowMix = smoothstep(snowLine - 0.1, snowLine, height);
                return mix(baseColor, snowColor, snowMix);
            }
            
            void main() {
                vec3 skyColor = vec3(0.53, 0.81, 0.92);  // Original sky color
                vec3 iceColor = vec3(0.68, 0.85, 0.95);  // Baby blue for mountains
                
                // Get normalized direction
                vec3 dir = normalize(vWorldPosition);
                float height = dir.y;
                
                // Create ice mountain range with very sharp edges - increased height cutoff
                if (height < 0.35) {  // Increased from 0.25 to allow even taller mountains
                    float angle = atan(dir.x, dir.z);
                    
                    // Create extremely steep and tall mountain shapes
                    float baseAngle = angle * 2.0;
                    float mountain1 = pow(abs(mountainShape(baseAngle)), 2.5) * 0.65;         // Increased from 0.45 to 0.65
                    float mountain2 = pow(abs(mountainShape(baseAngle * 1.5 + 2.1)), 2.5) * 0.55;  // Increased from 0.38 to 0.55
                    float mountain3 = pow(abs(mountainShape(baseAngle * 2.0 + 4.2)), 2.5) * 0.45;  // Increased from 0.32 to 0.45
                    
                    // Blend mountains with extreme steepness
                    float mountainHeight = max(mountain1, max(mountain2, mountain3));
                    mountainHeight = pow(mountainHeight, 1.7); // Slightly reduced power for better proportions at extreme height
                    
                    // Create extremely sharp edge transition
                    if (height < mountainHeight) {
                        float edge = step(mountainHeight - 0.0005, height); // Keep sharp transition
                        gl_FragColor = vec4(mix(iceColor, skyColor, edge), 1.0);
                        return;
                    }
                }
                
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `
    });
    
    // Create sky mesh
    const sky = new THREE.Mesh(skyGeometry, skyMaterial);
    window.scene.add(sky);
    
    // Store reference for animation
    window.gameWorld.sky = sky;
    
    return sky;
}

// Update sky animation
function updateSky(deltaTime) {
    if (window.gameWorld.sky && window.gameWorld.sky.material.uniforms) {
        window.gameWorld.sky.material.uniforms.time.value += deltaTime * 0.001;
    }
}

// Platform positions configuration
const platformPositions = [
    // Starter platforms near player's starting position (z=10)
    {x: 5, y: 0, z: -10},       // First starter platform - at ground level directly in front of player
    {x: 20, y: 15, z: -20},     // Second starter platform - one level higher and to the right
    
    // Ground level platforms (height 0)
    {x: -40, y: 0, z: -40},
    {x: 40, y: 0, z: -40},
    {x: 0, y: 0, z: -80},
    {x: -60, y: 0, z: 0},
    {x: 60, y: 0, z: 0},
    
    // Level 1 platforms (height 20)
    {x: -30, y: 20, z: -40},
    {x: 30, y: 20, z: -40},
    {x: 0, y: 20, z: -70},
    {x: -50, y: 20, z: -10},
    {x: 50, y: 20, z: -10},
    
    // Level 2 platforms (height 40)
    {x: -16, y: 40, z: -40},
    {x: 16, y: 40, z: -40},
    {x: 0, y: 40, z: -56},
    {x: -30, y: 40, z: -24},
    {x: 30, y: 40, z: -24},
    
    // Level 3 platforms (height 60)
    {x: -20, y: 60, z: -40},
    {x: 20, y: 60, z: -40},
    {x: 0, y: 60, z: -60},
    {x: 0, y: 60, z: -20},
    {x: -40, y: 60, z: -70},
    {x: 40, y: 60, z: -70},
    {x: -60, y: 60, z: -50},
    {x: 60, y: 60, z: -50},
    
    // Level 4 platforms (height 80)
    {x: -10, y: 80, z: -50},
    {x: 10, y: 80, z: -50},
    {x: -10, y: 80, z: -30},
    {x: 10, y: 80, z: -30},
    {x: 0, y: 80, z: -40},
    
    // Level 5 platforms (height 100)
    {x: -24, y: 100, z: -40},
    {x: 24, y: 100, z: -40},
    {x: 0, y: 100, z: -64},
    {x: 0, y: 100, z: -16},
    
    // Level 6 platforms (height 120)
    {x: -12, y: 120, z: -40},
    {x: 12, y: 120, z: -40},
    {x: 0, y: 120, z: -52},
    {x: 0, y: 120, z: -28},
    
    // Final level platform (height 140)
    {x: 0, y: 140, z: -40}
];

// Standard platform dimensions
const platformConfig = {
    width: 5,
    height: 0.5,
    depth: 5
};

// Standardize the platform creation function
function createPlatform(x, y, z) {
    const geometry = new THREE.BoxGeometry(
        platformConfig.width,
        platformConfig.height,
        platformConfig.depth
    );
    
    const platform = new THREE.Mesh(geometry, materials.platform);
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    
    // Change collision type from SOLID to WALKABLE
    addCollisionProperties(platform, CollisionType.WALKABLE, {
        height: platformConfig.height,
        isStatic: true,
        isBouncy: true,
        restitution: 0.92
    });
    
    scene.add(platform);
    worldObjects.platforms.push(platform);
    worldObjects.collidables.push(platform);
    
    return platform;
}

// Jump pad configuration
const jumpPadConfig = {
    color: 0x00ffff,        // Cyan color
    emissive: 0x0088aa,     // Slight glow
    emissiveIntensity: 0.7,
    metalness: 0.8,
    roughness: 0.2,
    width: 3,               // Standard width
    height: 0.3,            // Standard height
    depth: 3,               // Standard depth
    boostForce: 0.3,        // Jump boost force
    cooldown: 250,          // Cooldown between jumps
    detectionRange: 4.0     // Detection range
};

// Jump pad positions - matches exact positions from original code
const jumpPadPositions = platformPositions.map(pos => ({
    ...pos,
    y: pos.y + 0.15  // Position slightly above platform
}));

// Create a jump pad
function createJumpPad(x, y, z, isTopPad = false) {
    const geometry = new THREE.BoxGeometry(
        jumpPadConfig.width,
        jumpPadConfig.height,
        jumpPadConfig.depth
    );
    
    const material = new THREE.MeshStandardMaterial({
        color: isTopPad ? 0xff0000 : jumpPadConfig.color,
        emissive: isTopPad ? 0xff0000 : jumpPadConfig.emissive,
        emissiveIntensity: isTopPad ? 1.0 : jumpPadConfig.emissiveIntensity,
        metalness: jumpPadConfig.metalness,
        roughness: jumpPadConfig.roughness
    });

    const jumpPad = new THREE.Mesh(geometry, material);
    
    // Position jump pad slightly higher above platform to avoid intersection
    jumpPad.position.set(x, y + 0.3, z); // Increased from 0.15 to 0.3
    
    // Add user data
    jumpPad.userData = {
        isJumpPad: true,
        isTopJumpPad: isTopPad,
        lastUsed: 0,
        pulseDirection: 1,
        pulseValue: 1.0
    };

    // Set up collision properties
    addCollisionProperties(jumpPad, CollisionType.SOLID, {
        height: jumpPadConfig.height,
        isStatic: true,
        isBouncy: true,
        restitution: 0.92,
        isJumpPad: true,
        // Add specific flag for jump pad collision detection
        isJumpPadTrigger: true
    });

    // Add shadows
    jumpPad.castShadow = true;
    jumpPad.receiveShadow = true;

    // Make top pad slightly larger
    if (isTopPad) {
        jumpPad.scale.set(1.2, 1.2, 1.2);
    }

    scene.add(jumpPad);
    worldObjects.jumpPads.push(jumpPad);
    worldObjects.collidables.push(jumpPad);
    
    if (window.debugMode) {
        console.log('Created Jump Pad:', {
            position: jumpPad.position.clone(),
            isTopPad,
            height: jumpPadConfig.height,
            platformHeight: y
        });
    }
    
    return jumpPad;
}

// Update jump pads animation
function updateJumpPads(deltaTime) {
    for (const jumpPad of worldObjects.jumpPads) {
        if (jumpPad.userData.isTopJumpPad) {
            // Pulse the emissive intensity
            if (jumpPad.userData.pulseDirection > 0) {
                jumpPad.userData.pulseValue += 0.02;
                if (jumpPad.userData.pulseValue >= 1.5) {
                    jumpPad.userData.pulseDirection = -1;
                }
            } else {
                jumpPad.userData.pulseValue -= 0.02;
                if (jumpPad.userData.pulseValue <= 0.8) {
                    jumpPad.userData.pulseDirection = 1;
                }
            }

            // Apply pulse to jump pad
            jumpPad.material.emissiveIntensity = jumpPad.userData.pulseValue;
        }
    }
}

// Create all jump pads
function createAllJumpPads() {
    jumpPadPositions.forEach(pos => {
        // Check if this is the top platform (at height 140)
        const isTopPad = pos.y >= 140;
        createJumpPad(pos.x, pos.y, pos.z, isTopPad);
    });
}

// Add beach configuration
const beachConfig = {
    groundSize: 210,
    beachWidth: 10,
    sandColor: 0x7a6952,
    sandRoughness: 0.8,
    sandMetalness: 0.1
};

// Add sea configuration
const seaConfig = {
    color: 0x0066cc,         // Darker, more saturated blue
    opacity: 0.7,            // Consistent transparency
    waveSpeedX: 0.015,       // Gentle wave movement
    waveSpeedY: 0.01,
    size: null               // Will be calculated based on ground size
};

// Helper function to create beach sides
function createBeachSide(side, groundSize, width, material) {
    let x = 0, z = 0, rotation = 0;
    let length = groundSize + 10;
    
    switch(side) {
        case 'north':
            z = -groundSize/2;
            rotation = 0;
            break;
        case 'east':
            x = groundSize/2;
            rotation = Math.PI/2;
            break;
        case 'south':
            z = groundSize/2;
            rotation = Math.PI;
            break;
        case 'west':
            x = -groundSize/2;
            rotation = -Math.PI/2;
            break;
    }
    
    const beachGeometry = new THREE.PlaneGeometry(length, width);
    const beach = new THREE.Mesh(beachGeometry, material);
    beach.rotation.x = -Math.PI / 2;
    beach.rotation.z = rotation;
    beach.position.set(x, 0, z);
    beach.name = `beach-${side}`;
    
    // Add collision properties to make beach walkable
    addCollisionProperties(beach, CollisionType.WALKABLE, {
        height: 0.1,
        isStatic: true,
        isBouncy: true,
        restitution: 0.6
    });
    
    // Adjust UVs to prevent texture stretching
    const uvAttribute = beach.geometry.attributes.uv;
    for (let i = 0; i < uvAttribute.count; i++) {
        if (side === 'north' || side === 'south') {
            uvAttribute.setXY(i, 
                uvAttribute.getX(i) * length / width, 
                uvAttribute.getY(i)
            );
        } else {
            uvAttribute.setXY(i, 
                uvAttribute.getX(i), 
                uvAttribute.getY(i) * length / width
            );
        }
    }
    
    window.scene.add(beach);
    worldObjects.collidables.push(beach);  // Add to collidables
    return beach;
}

// Function to create beach and sea
function createBeachAndSea() {
    // Calculate sea size
    seaConfig.size = beachConfig.groundSize + beachConfig.beachWidth * 2 + 500;
    
    const textureLoader = new THREE.TextureLoader();
    
    // Load sand texture
    const sandTexture = textureLoader.load('https://i0.wp.com/www.creativeswall.com/wp-content/uploads/2014/06/seamless_beach_sand_texture_by_hhh316-d4hr45u-e1403956653252.jpg');
    sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(4, 5);
    
    // Create beach material
    const beachMaterial = new THREE.MeshStandardMaterial({
        map: sandTexture,
        color: beachConfig.sandColor,
        roughness: beachConfig.sandRoughness,
        metalness: beachConfig.sandMetalness,
        side: THREE.DoubleSide
    });
    
    // Create beaches on all sides
    createBeachSide('north', beachConfig.groundSize, beachConfig.beachWidth, beachMaterial);
    createBeachSide('east', beachConfig.groundSize, beachConfig.beachWidth, beachMaterial);
    createBeachSide('south', beachConfig.groundSize, beachConfig.beachWidth, beachMaterial);
    createBeachSide('west', beachConfig.groundSize, beachConfig.beachWidth, beachMaterial);
    
    // Create sea with simpler material
    const seaGeometry = new THREE.PlaneGeometry(seaConfig.size, seaConfig.size);
    const seaMaterial = new THREE.MeshStandardMaterial({
        color: seaConfig.color,
        transparent: true,
        opacity: seaConfig.opacity,
        side: THREE.DoubleSide,
        depthWrite: false,
        roughness: 0.2,
        metalness: 0.0
    });
    
    const sea = new THREE.Mesh(seaGeometry, seaMaterial);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.1;
    sea.name = 'sea';
    
    // Add collision properties to make sea walkable
    addCollisionProperties(sea, CollisionType.WALKABLE, {
        height: 0.1,
        isStatic: true,
        isBouncy: true,
        restitution: 0.8
    });
    
    // Store reference for animation
    window.gameWorld.sea = sea;
    
    window.scene.add(sea);
    worldObjects.collidables.push(sea);
}

// Update sea animation function
function updateSea(deltaTime) {
    if (window.gameWorld.sea) {
        const time = Date.now() * 0.001;
        
        // Simple color shift animation
        const baseColor = new THREE.Color(seaConfig.color);
        const brightness = 1.0 + Math.sin(time * 0.5) * 0.1;
        window.gameWorld.sea.material.color.setRGB(
            baseColor.r * brightness,
            baseColor.g * brightness,
            baseColor.b * brightness
        );
        
        // Subtle opacity animation
        window.gameWorld.sea.material.opacity = seaConfig.opacity + Math.sin(time * 0.3) * 0.05;
    }
}

// Unified model update function
function updateDestructibleModels(deltaTime) {
    if (!worldObjects.decorations) return;
    
    worldObjects.decorations.forEach(decoration => {
        if (!decoration.userData?.type) return;

        // Update animation if exists
        if (decoration.userData.mixer) {
            const speed = decoration.userData.type === 'gnoll' ? 
                (window.gnollConfig?.animationSpeed || 1) : 1;
            decoration.userData.mixer.update(deltaTime * speed);
        }
        
        // Add model-specific updates
        switch (decoration.userData.type) {
            case 'gnoll':
                // Rotate the gnoll model
                if (decoration.userData.rotationSpeed) {
                    decoration.rotation.y += decoration.userData.rotationSpeed;
                }
                break;
        }
    });
}

// Update world state
function updateWorld(deltaTime) {
    updateSky(deltaTime);
    updateJumpPads(deltaTime);
    updateDebris(deltaTime);
    updateSea(deltaTime);
    updateDestructibleModels(deltaTime);
}

// Add ramp creation function
function createRamp(position, width, depth, height, angle) {
    // Create ramp geometry
    const rampGeometry = new THREE.BoxGeometry(width, height, depth);
    const ramp = new THREE.Mesh(rampGeometry, materials.wall.clone());
    
    // Position the ramp
    ramp.position.copy(position);
    
    // Rotate the ramp to create slope
    ramp.rotation.x = angle;
    
    // Add shadows
    ramp.castShadow = true;
    ramp.receiveShadow = true;
    
    // Add collision properties
    addCollisionProperties(ramp, window.CollisionType.RAMP, {
        slope: angle,
        walkable: true
    });
    
    window.scene.add(ramp);
    worldObjects.walls.push(ramp);
    return ramp;
}

// Add stair creation function
function createStairs(startPosition, width, stepDepth, stepHeight, numSteps) {
    const stairs = [];
    
    // Create central platform first
    const platformWidth = width * 2;
    const platformDepth = width * 2;
    const platformHeight = 0.5;
    const totalHeight = numSteps * stepHeight;  // Height of the central platform
    
    // Create platform at the top
    const platformGeometry = new THREE.BoxGeometry(platformWidth, platformHeight, platformDepth);
    const platform = new THREE.Mesh(platformGeometry, materials.stairs.clone());

    // Position platform at the top
    platform.position.set(
        startPosition.x,
        totalHeight + platformHeight/2,  // Platform at the highest point
        startPosition.z
    );

    // Add collision properties for the platform
    addCollisionProperties(platform, window.CollisionType.WALKABLE, {
        height: platformHeight,
        isStatic: true,
        isBouncy: true,
        restitution: 0.6
    });

    window.scene.add(platform);
    worldObjects.walls.push(platform);
    worldObjects.collidables.push(platform);

    // Create first set of stairs (going forward from platform)
    for (let i = 0; i < numSteps; i++) {
        const stepGeometry = new THREE.BoxGeometry(width, stepHeight, stepDepth);
        const step = new THREE.Mesh(stepGeometry, materials.stairs.clone());
        
        // Position steps going down and forward from the platform
        step.position.set(
            startPosition.x,
            totalHeight - (i * stepHeight) - stepHeight/2,  // Start from platform top
            startPosition.z + (i * stepDepth) + 4.5
        );
        
        // Add shadows
        step.castShadow = true;
        step.receiveShadow = true;
        
        // Add collision properties
        addCollisionProperties(step, window.CollisionType.WALKABLE, {
            height: stepHeight,
            isStatic: true,
            isBouncy: true,
            restitution: 0.6
        });
        
        window.scene.add(step);
        worldObjects.walls.push(step);
        worldObjects.collidables.push(step);
        stairs.push(step);
    }

    // Create second set of stairs (going backward from platform)
    for (let i = 0; i < numSteps; i++) {
        const stepGeometry = new THREE.BoxGeometry(width, stepHeight, stepDepth);
        const step = new THREE.Mesh(stepGeometry, materials.stairs.clone());
        
        // Position steps going down and backward from the platform
        step.position.set(
        startPosition.x,
            totalHeight - (i * stepHeight) - stepHeight/2,  // Start from platform top
            startPosition.z - (i * stepDepth) - 4.5
        );
        
        // Add shadows
        step.castShadow = true;
        step.receiveShadow = true;
        
        // Add collision properties
        addCollisionProperties(step, window.CollisionType.WALKABLE, {
            height: stepHeight,
            isStatic: true,
            isBouncy: true,
            restitution: 0.6
        });
        
        window.scene.add(step);
        worldObjects.walls.push(step);
        worldObjects.collidables.push(step);
        stairs.push(step);
    }
    
    return { stairs, platform };
}

// Add player model creation function
function createPlayerModel(id) {
    const playerGroup = new THREE.Group();
    playerGroup.userData = {
        isPlayer: true,
        playerId: id,
        isLocalPlayer: id === window.gameNetworking?.playerId,
        health: 100
    };
    
    // Use the same colors as main player
    const colors = {
        head: 0xe6b080,
        body: 0x4287f5,
        legs: 0x2b4c91,
        arms: 0x4287f5
    };
    
    // Head with face texture
    const headGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.2);
    const headMaterials = [
        new THREE.MeshStandardMaterial({ color: colors.head, roughness: 0.6, metalness: 0.2 }), // right
        new THREE.MeshStandardMaterial({ color: colors.head, roughness: 0.6, metalness: 0.2 }), // left
        new THREE.MeshStandardMaterial({ color: colors.head, roughness: 0.6, metalness: 0.2 }), // top
        new THREE.MeshStandardMaterial({ color: colors.head, roughness: 0.6, metalness: 0.2 }), // bottom
        new THREE.MeshStandardMaterial({ color: colors.head, roughness: 0.6, metalness: 0.2 }), // back
        new THREE.MeshStandardMaterial({ // front - face texture
            color: 0xffffff,
            map: playerTextures.face,
            roughness: 0.6,
            metalness: 0.2,
            transparent: true
        })
    ];
    
    const head = new THREE.Mesh(headGeometry, headMaterials);
    head.userData = { 
        isPlayer: true, 
        playerId: id, 
        isPlayerPart: true,
        isLocalPlayer: id === window.gameNetworking?.playerId,
        partType: 'head'
    };
    playerGroup.add(head);
    
    // Body
    const bodyGeometry = new THREE.BoxGeometry(0.7, 1.05, 0.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
        color: colors.body,
        roughness: 0.6,
        metalness: 0.2
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = -0.85;
    body.userData = { 
        isPlayer: true, 
        playerId: id, 
        isPlayerPart: true,
        isLocalPlayer: id === window.gameNetworking?.playerId,
        partType: 'body'
    };
    playerGroup.add(body);
    
    // Arms
    const armGeometry = new THREE.BoxGeometry(0.2, 1.05, 0.2);
    const armMaterial = new THREE.MeshStandardMaterial({ 
        color: colors.arms,
        roughness: 0.6,
        metalness: 0.2
    });
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-0.5, -0.85, 0);
    leftArm.userData = { 
        isPlayer: true, 
        playerId: id, 
        isPlayerPart: true,
        isLocalPlayer: id === window.gameNetworking?.playerId,
        partType: 'leftArm'
    };
    playerGroup.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial);
    rightArm.position.set(0.5, -0.85, 0);
    rightArm.userData = { 
        isPlayer: true, 
        playerId: id, 
        isPlayerPart: true,
        isLocalPlayer: id === window.gameNetworking?.playerId,
        partType: 'rightArm'
    };
    playerGroup.add(rightArm);
    
    // Legs
    const legGeometry = new THREE.BoxGeometry(0.3, 0.75, 0.2);
    const legMaterial = new THREE.MeshStandardMaterial({ 
        color: colors.legs,
        roughness: 0.6,
        metalness: 0.2
    });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-0.18, -1.75, 0);
    leftLeg.userData = { 
        isPlayer: true, 
        playerId: id, 
        isPlayerPart: true,
        isLocalPlayer: id === window.gameNetworking?.playerId,
        partType: 'leftLeg'
    };
    playerGroup.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(0.18, -1.75, 0);
    rightLeg.userData = { 
        isPlayer: true, 
        playerId: id, 
        isPlayerPart: true,
        isLocalPlayer: id === window.gameNetworking?.playerId,
        partType: 'rightLeg'
    };
    playerGroup.add(rightLeg);
    
    // Store original materials for hit effect
    playerGroup.children.forEach(part => {
        if (Array.isArray(part.material)) {
            part.userData.originalMaterials = part.material.map(mat => ({
                color: mat.color.clone(),
                emissive: new THREE.Color(0x000000)
            }));
        } else {
            part.userData.originalColor = part.material.color.clone();
            part.userData.originalEmissive = new THREE.Color(0x000000);
        }
    });
    
    // Set initial position
    playerGroup.position.y = 2.2;
    
    // Add to scene and tracking
    window.scene.add(playerGroup);
    worldObjects.players.set(id, playerGroup);
    
    // Add collision properties to each body part
    playerGroup.traverse(child => {
        if (child.isMesh) {
            if (window.debugMode) {
                console.log('[WORLD] Adding collision to player part:', {
                    id,
                    part: child.uuid,
                    position: child.position.toArray(),
                    isLocalPlayer: id === window.gameNetworking?.playerId,
                    partType: child.userData.partType
                });
            }

            addCollisionProperties(child, window.CollisionType.PLAYER, {
                isPlayer: true,
                playerId: id,
                isBodyPart: true,
                isLocalPlayer: id === window.gameNetworking?.playerId,
                partType: child.userData.partType
            });
        }
    });

    return playerGroup;
}

// Update player hit handling
function handlePlayerHit(playerObject, damage = 25) {
    const debug = true;
    
    if (debug) {
        console.log('[PLAYER_HIT] Starting hit handling:', {
            playerId: playerObject?.userData?.playerId,
            damage: damage
        });
    }

    // Initialize health if not exists
    if (typeof playerObject.userData.health === 'undefined') {
        playerObject.userData.health = 100;
    }

    // Update health
    playerObject.userData.health = Math.max(0, playerObject.userData.health - damage);

    // Clear any existing flash timeout
    if (playerObject.userData.flashTimeout) {
        clearTimeout(playerObject.userData.flashTimeout);
    }

    // Apply flash effect to all player parts
    playerObject.traverse((child) => {
        if (child.isMesh) {
            if (Array.isArray(child.material)) {
                child.material.forEach(mat => {
                    if (!mat) return;
                    if (!mat.emissive) mat.emissive = new THREE.Color();
                    mat.emissive.setHex(0xff0000);
                    mat.emissiveIntensity = 0.5;
                });
            } else if (child.material) {
                if (!child.material.emissive) child.material.emissive = new THREE.Color();
                child.material.emissive.setHex(0xff0000);
                child.material.emissiveIntensity = 0.5;
            }
        }
    });

    // Reset flash effect after 100ms
    playerObject.userData.flashTimeout = setTimeout(() => {
        playerObject.traverse((child) => {
            if (child.isMesh) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (!mat) return;
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                    });
                } else if (child.material) {
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            }
        });
    }, 100);

    // Create hit effect
    const hitPosition = playerObject.position.clone();
    hitPosition.y += 1;
    if (window.gameEffects?.createHitEffect) {
        window.gameEffects.createHitEffect(hitPosition);
    }

    // Handle respawn if health reaches 0
    if (playerObject.userData.health <= 0) {
        playerObject.userData.health = 100;
        playerObject.position.set(0, 2.2, 10);
    }
}

// Add cloud creation function
function createCloud(x, y, z) {
    const cloudGroup = new THREE.Group();
    
    // Optimized geometries
    const geometries = [
        new THREE.SphereGeometry(18, 16, 16),    // Large core
        new THREE.SphereGeometry(14, 12, 12),    // Medium
        new THREE.SphereGeometry(10, 10, 10),    // Small
    ];

    // Single shared material instance
    const cloudMaterial = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.35,
        side: THREE.DoubleSide,
        fog: false
    });

    // Create dense core
    const createCore = () => {
        const core = new THREE.Group();
        
        // Center sphere
        const centerPuff = new THREE.Mesh(geometries[0], cloudMaterial);
        centerPuff.scale.set(1, 0.8, 1);  // Slightly flattened
        core.add(centerPuff);

        // Add dense inner layer
        const innerCount = 6;
        for (let i = 0; i < innerCount; i++) {
            const puff = new THREE.Mesh(geometries[0], cloudMaterial);
            const angle = (i / innerCount) * Math.PI * 2;
            const radius = 8;
            
            puff.position.set(
                Math.cos(angle) * radius,
                Math.random() * 3 - 1.5,
                Math.sin(angle) * radius
            );
            puff.scale.set(0.7, 0.6, 0.7);
            core.add(puff);
        }

        return core;
    };

    // Add dense core
    const core = createCore();
    cloudGroup.add(core);

    // Add outer fluffy layer
    const puffCount = 8;  // Reduced count but larger puffs
    for (let i = 0; i < puffCount; i++) {
        const puff = new THREE.Mesh(geometries[1], cloudMaterial);
        
        const angle = (i / puffCount) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 16 + Math.random() * 6;
        const height = Math.random() * 6 - 3;
        
        puff.position.set(
            Math.cos(angle) * radius,
            height,
            Math.sin(angle) * radius
        );

        puff.scale.set(
            1 + Math.random() * 0.3,
            0.7 + Math.random() * 0.3,
            1 + Math.random() * 0.3
        );
        
        cloudGroup.add(puff);
    }

    // Add top detail puffs
    for (let i = 0; i < 4; i++) {
        const puff = new THREE.Mesh(geometries[2], cloudMaterial);
        puff.position.set(
            Math.random() * 24 - 12,
            6 + Math.random() * 3,
            Math.random() * 24 - 12
        );
        puff.scale.set(0.8, 0.6, 0.8);
        cloudGroup.add(puff);
    }

    cloudGroup.position.set(x, y, z);
    window.scene.add(cloudGroup);
    return cloudGroup;
}

// Update cloud formation function
function createCloudFormations() {
    const gridCells = cloudConfig.gridSize;
    const cellSize = cloudConfig.spread / gridCells;
    
    // Create a grid of positions
    for (let x = 0; x < gridCells; x++) {
        for (let z = 0; z < gridCells; z++) {
            // Calculate base position in grid
            const baseX = (x * cellSize) - (cloudConfig.spread / 2) + (cellSize / 2);
            const baseZ = (z * cellSize) - (cloudConfig.spread / 2) + (cellSize / 2);
            
            // Add random offset from grid position
            const jitterX = (Math.random() - 0.5) * cloudConfig.positionJitter;
            const jitterZ = (Math.random() - 0.5) * cloudConfig.positionJitter;
            
            // Calculate final position
            const posX = baseX + jitterX;
            const posZ = baseZ + jitterZ;
            
            // Vary height based on position from center for natural look
            const distanceFromCenter = Math.sqrt(posX * posX + posZ * posZ) / (cloudConfig.spread / 2);
            const heightRange = cloudConfig.maxHeight - cloudConfig.minHeight;
            const y = cloudConfig.minHeight + 
                     (Math.random() * heightRange * (1 - distanceFromCenter * 0.3));
            
            // Vary size based on height and distance from center
            const heightFactor = (y - cloudConfig.minHeight) / heightRange;
            const sizeFactor = (1 - distanceFromCenter * 0.2) * (0.8 + heightFactor * 0.4);
            const scale = cloudConfig.minCloudSize + 
                         (cloudConfig.maxCloudSize - cloudConfig.minCloudSize) * sizeFactor;
            
            // Create cloud
            const cloud = createCloud(posX, y, posZ);
            cloud.scale.multiplyScalar(scale);
            worldObjects.clouds.push(cloud);
        }
    }
}

// Call cleanup when initializing world
function initWorld() {
    // Create scene basics
    createGround();
    createBoundaryWalls();
    setupLighting();
    createDynamicSky();
    setupFog();
    createCloudFormations();
    loadPictures();
    createBeachAndSea();
    loadGnollModel();  // Load Gnoll model
    loadChickenModel(); // Load Chicken model
    loadMurlocModel();  // Load Murloc model
    loadLampPostModel(); // Load Lamp Post models
    loadGuardTower();  // Load Guard Tower
    loadElwynnTree();  // Load Elwynn Trees
    
    // Create platforms
    platformPositions.forEach(pos => {
        createPlatform(pos.x, pos.y, pos.z);
    });
    
    // Create jump pads
    createAllJumpPads();

    // Create stairs
    createStairs(
        new THREE.Vector3(20, 0, 0),  // Position
        4,                            // Width
        1,                            // Step depth
        0.5,                         // Step height
        8                            // Number of steps
    );

    createStairs(
        new THREE.Vector3(-20, 0, 0), // Position
        4,                            // Width
        1,                            // Step depth
        0.5,                         // Step height
        8                            // Number of steps
    );

    // Create ramps
    createRamp(
        new THREE.Vector3(30, 0, 10),  // Position
        8,                             // Width
        12,                            // Depth
        4,                             // Height
        Math.PI / 6                    // Angle (30 degrees)
    );

    createRamp(
        new THREE.Vector3(-30, 0, 10), // Position
        8,                             // Width
        12,                            // Depth
        4,                             // Height
        Math.PI / 6                    // Angle (30 degrees)
    );

    // Create some destructible crates
    createDestructibleCrate(5, 0, 0);
    createDestructibleCrate(-5, 0, 0);
    createDestructibleCrate(0, 0, -5);
    createDestructibleCrate(3, 0, 3);
    createDestructibleCrate(-3, 0, 3);
}

// Create ground plane
function createGround() {
    const groundGeometry = new THREE.BoxGeometry(
        worldConfig.groundSize, 
        0.5,  // Same thickness as stairs
        worldConfig.groundSize
    );
    const ground = new THREE.Mesh(groundGeometry, materials.ground);
    ground.position.y = -0.25;  // Half of thickness to align surface at y=0
    ground.receiveShadow = true;
    
    // Add collision properties for both walking and ball bouncing
    addCollisionProperties(ground, window.CollisionType.WALKABLE, {
        height: 0.5,
        isStatic: true,
        isBouncy: true,  // Allow balls to bounce
        restitution: 0.6 // Bounce factor
    });
    
    window.scene.add(ground);
    window.ground = ground;
    
    // Add to both walls and collidables arrays
    worldObjects.walls.push(ground);
    if (!worldObjects.collidables) worldObjects.collidables = [];
    worldObjects.collidables.push(ground);
}

// Create boundary walls
function createBoundaryWalls() {    
    const wallHeight = worldConfig.wallHeight;
    const groundSize = worldConfig.groundSize;
    const wallThickness = 1;

    // Create wall geometry
    const wallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, groundSize);

    // Create only the left wall
    const wall = new THREE.Mesh(wallGeometry, materials.wall);
    wall.position.set(-groundSize/2, wallHeight/2, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;

    // Add collision properties
    addCollisionProperties(wall, window.CollisionType.SOLID, {
        isStatic: true
    });

    if (window.debugMode) {
        console.log('Created boundary wall:', {
            position: wall.position.clone(),
            size: {
                width: wallGeometry.parameters.width,
                height: wallGeometry.parameters.height,
                depth: wallGeometry.parameters.depth
            }
        });
    }

    scene.add(wall);
    worldObjects.walls.push(wall);

    // Make walls accessible globally
    window.walls = worldObjects.walls;
}

// Setup world lighting
function setupLighting() {
    const sunLight = new THREE.DirectionalLight(0xffffff, 0.8);
    sunLight.position.set(-10, 20, -10);
    sunLight.castShadow = true;
    
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 50;
    sunLight.shadow.camera.left = -25;
    sunLight.shadow.camera.right = 25;
    sunLight.shadow.camera.top = 25;
    sunLight.shadow.camera.bottom = -25;
    sunLight.shadow.bias = -0.0001;
    
    const ambientLight = new THREE.AmbientLight(0xb8c6df, 0.6);
    const hemiLight = new THREE.HemisphereLight(0xffeeb1, 0x080820, 0.5);
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(10, 10, 10);
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.2);
    rimLight.position.set(0, 5, -10);
    
    scene.add(sunLight);
    scene.add(ambientLight);
    scene.add(hemiLight);
    scene.add(fillLight);
    scene.add(rimLight);
    
    materials.ground.roughness = 0.9;
    materials.ground.metalness = 0.1;
    materials.wall.roughness = 0.8;
    materials.wall.metalness = 0.2;
}

// Setup fog
function setupFog() {
    scene.fog = new THREE.FogExp2(0xcccccc, worldConfig.fogDensity);
}

// Add removeObject function
function removeObject(object) {
    if (!object) return;
    
    scene.remove(object);
    
    // Remove from appropriate container
    for (const [key, container] of Object.entries(worldObjects)) {
        if (Array.isArray(container)) {
            const index = container.indexOf(object);
            if (index !== -1) {
                container.splice(index, 1);
                break;
            }
        }
    }
    
    // Clean up geometry and material
    if (object.geometry) object.geometry.dispose();
    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
        } else {
            object.material.dispose();
        }
    }
}

// Update debris physics and lifetime
function updateDebris(deltaTime) {
    if (!window.worldObjects.debris) return;

    const gravity = 0.01;
    const lifetime = 2000; // 2 seconds

    for (let i = window.worldObjects.debris.length - 1; i >= 0; i--) {
        const debris = window.worldObjects.debris[i];
        
        // Check lifetime
        if (Date.now() - debris.userData.createdAt > lifetime) {
            window.scene.remove(debris);
            window.worldObjects.debris.splice(i, 1);
            continue;
        }

        // Update position
        debris.position.add(debris.userData.velocity);
        debris.userData.velocity.y -= gravity;

        // Update rotation
        debris.rotation.x += debris.userData.rotationSpeed.x;
        debris.rotation.y += debris.userData.rotationSpeed.y;
        debris.rotation.z += debris.userData.rotationSpeed.z;

        // Check ground collision
        if (debris.position.y < 0) {
            debris.position.y = 0;
            debris.userData.velocity.set(0, 0, 0);
            debris.userData.rotationSpeed.set(0, 0, 0);
        }
    }
}

// Export world management functions
window.gameWorld = {
    initWorld,
    createGround,
    createBoundaryWalls,
    setupLighting,
    createDynamicSky,
    setupFog,
    createCloudFormations,
    loadPictures,
    createPlatform,
    createJumpPad,
    createStairs,
    createRamp,
    createDestructibleCrate,
    updateDebris,
    addCollisionProperties,
    createPlayerModel,
    handlePlayerHit,
    updateWorld,
    updateSky,
    updateJumpPads,
    worldObjects,
    materials,
    loadGnollModel,
    loadChickenModel,
    loadMurlocModel,
    loadLampPostModel,
    loadGuardTower
};

// Unified texture creation utility
function createProceduralTexture(config = {}) {
    const {
        baseColor = '#8B4513',
        grainColor = '#654321',
        width = 256,
        height = 256,
        grainCount = 20,
        noiseCount = 5000,
        noiseOpacity = 0.1
    } = config;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Add grain
    ctx.strokeStyle = grainColor;
    for (let i = 0; i < grainCount; i++) {
        ctx.lineWidth = 1 + Math.random() * 2;
        const x = Math.random() * canvas.width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(
            x + Math.random() * 20 - 10, canvas.height * 0.33,
            x + Math.random() * 20 - 10, canvas.height * 0.66,
            x + Math.random() * 40 - 20, canvas.height
        );
        ctx.stroke();
    }

    // Add noise
    for (let i = 0; i < noiseCount; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * noiseOpacity})`;
        ctx.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
}

// Replace createWoodTexture with a call to createProceduralTexture
function createWoodTexture() {
    return createProceduralTexture({
        baseColor: '#8B4513',
        grainColor: '#654321',
        grainCount: 20,
        noiseCount: 5000,
        noiseOpacity: 0.1
    });
}

// Generic Destructible Model System
const DestructibleModelConfig = {
    defaultHealth: {
        max: 300,
        hitsToDestroy: 3,
        damagePerHit: 100
    },
    effects: {
        flash: {
            color: 0xff0000,
            baseIntensity: 0.3,
            hitIntensity: 0.8,
            duration: 200
        },
        explosion: {
            scale: 2.5
        }
    },
    respawn: {
        delay: 3000
    },
    materials: {
        baseColor: new THREE.Color().setHex(0x333333),
        emissiveBase: 0.3,
        emissivePerHit: 0.2,
        brightness: 3,
        roughness: 0.5,
        metalness: 0.5,
        aoMapIntensity: 0.1,
        envMapIntensity: 1.0
    }
};

// DestructibleModel class definition
class DestructibleModel {
    constructor(modelType, config = {}) {
        this.modelType = modelType;
        this.modelConfig = config;
        this.state = {
            isShootable: true,
            health: this.modelConfig.health || DestructibleModelConfig.defaultHealth.max,
            flashTimeout: null
        };
    }

    load() {
        if (this.modelConfig.type === 'fbx') {
            this.loadFBXModel();
        } else if (this.modelConfig.type === 'box') {
            this.createBoxModel();
        }
    }

    loadFBXModel() {
        const loader = new THREE.FBXLoader();
        loader.load(this.modelConfig.modelPath, (fbx) => {
            this.setupModel(fbx);
            this.setupMaterials(fbx);
            this.setupState(fbx);
            this.addToWorld(fbx);
            
            if (window.debugMode) {
                this.logSetup(fbx);
            }
        });
    }

    createBoxModel() {
        const geometry = new THREE.BoxGeometry(
            this.modelConfig.size,
            this.modelConfig.size,
            this.modelConfig.size
        );
        
        const texture = createWoodTexture();
        const material = new THREE.MeshStandardMaterial({
        map: texture,
        bumpMap: texture,
            bumpScale: this.modelConfig.materials.bumpScale,
            roughness: this.modelConfig.materials.roughness,
            metalness: this.modelConfig.materials.metalness
        });
        
        const box = new THREE.Mesh(geometry, material);
        this.setupModel(box);
        this.setupState(box);
        this.addToWorld(box);
    }

    setupMaterials(model) {
        model.traverse((child) => {
            if (!child.isMesh) return;
            
            try {
                // Store original textures before cleanup
                const originalTextures = {};
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((mat, index) => {
                            if (mat) {
                                originalTextures[`${index}_map`] = mat.map;
                                originalTextures[`${index}_normalMap`] = mat.normalMap;
                                originalTextures[`${index}_roughnessMap`] = mat.roughnessMap;
                                originalTextures[`${index}_metalnessMap`] = mat.metalnessMap;
                                originalTextures[`${index}_aoMap`] = mat.aoMap;
                            }
                        });
                    } else {
                        originalTextures.map = child.material.map;
                        originalTextures.normalMap = child.material.normalMap;
                        originalTextures.roughnessMap = child.material.roughnessMap;
                        originalTextures.metalnessMap = child.material.metalnessMap;
                        originalTextures.aoMap = child.material.aoMap;
                    }
                }

                // Clean up old material
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat && typeof mat.dispose === 'function') {
                                mat.dispose();
                            }
                        });
                    } else if (typeof child.material.dispose === 'function') {
                        child.material.dispose();
                    }
                }

                // Check for part-specific materials
                let partConfig = null;
                if (this.modelConfig.materials?.parts) {
                    // Try to match part name
                    const partName = child.name.toLowerCase();
                    Object.entries(this.modelConfig.materials.parts).forEach(([key, config]) => {
                        if (partName.includes(key.toLowerCase())) {
                            partConfig = config;
                        }
                    });
                }

                // Create new material with either part-specific or default configuration
                const materialConfig = partConfig || this.modelConfig.materials || {};
                const createMaterial = () => new THREE.MeshStandardMaterial({
                    color: materialConfig.baseColor || 0xffffff,
                    roughness: materialConfig.roughness || 0.5,
                    metalness: materialConfig.metalness || 0.5,
                    side: THREE.DoubleSide,
                    transparent: materialConfig.transparent || false,
                    opacity: materialConfig.opacity || 1.0,
                    emissive: new THREE.Color(materialConfig.emissive || 0x000000),
                    emissiveIntensity: materialConfig.emissiveIntensity || 0
                });

                if (Array.isArray(child.material)) {
                    // If it was originally an array of materials, create a new array
                    const materials = [];
                    const materialCount = child.material.length;
                    
                    for (let i = 0; i < materialCount; i++) {
                        const material = createMaterial();
                        if (originalTextures[`${i}_map`]) material.map = originalTextures[`${i}_map`];
                        if (originalTextures[`${i}_normalMap`]) material.normalMap = originalTextures[`${i}_normalMap`];
                        if (originalTextures[`${i}_roughnessMap`]) material.roughnessMap = originalTextures[`${i}_roughnessMap`];
                        if (originalTextures[`${i}_metalnessMap`]) material.metalnessMap = originalTextures[`${i}_metalnessMap`];
                        if (originalTextures[`${i}_aoMap`]) material.aoMap = originalTextures[`${i}_aoMap`];
                        
                        // Ensure emissive is set
                        if (!material.emissive) {
                            material.emissive = new THREE.Color(0x000000);
                        }
                        
                        materials.push(material);
                    }
                    child.material = materials;
                } else {
                    const material = createMaterial();
                    // Restore textures to single material
                    if (originalTextures.map) material.map = originalTextures.map;
                    if (originalTextures.normalMap) material.normalMap = originalTextures.normalMap;
                    if (originalTextures.roughnessMap) material.roughnessMap = originalTextures.roughnessMap;
                    if (originalTextures.metalnessMap) material.metalnessMap = originalTextures.metalnessMap;
                    if (originalTextures.aoMap) material.aoMap = originalTextures.aoMap;
                    
                    // Ensure emissive is set
                    if (!material.emissive) {
                        material.emissive = new THREE.Color(0x000000);
                    }
                    
                    child.material = material;
                }

                // Set other properties
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (mat) {
                            mat.envMapIntensity = materialConfig.envMapIntensity || 1;
                            mat.aoMapIntensity = materialConfig.aoMapIntensity || 1;
                            mat.needsUpdate = true;
                        }
                    });
                } else if (child.material) {
                    child.material.envMapIntensity = materialConfig.envMapIntensity || 1;
                    child.material.aoMapIntensity = materialConfig.aoMapIntensity || 1;
                    child.material.needsUpdate = true;
                }

                // Apply brightness if specified
                if (DestructibleModelConfig.materials.brightness > 1 && !partConfig) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (mat && mat.color) {
                                mat.color.multiplyScalar(DestructibleModelConfig.materials.brightness);
                            }
                        });
                    } else if (child.material && child.material.color) {
                        child.material.color.multiplyScalar(DestructibleModelConfig.materials.brightness);
                    }
                }

                child.castShadow = true;
                child.receiveShadow = true;

            } catch (error) {
                console.error(`[${this.modelType}] Error setting up materials:`, error);
                // Create a simple fallback material with emissive property
                const fallbackMaterial = new THREE.MeshBasicMaterial({
                    color: 0x888888,
                    emissive: new THREE.Color(0x000000)
                });
                child.material = fallbackMaterial;
            }
        });
    }

    setupModel(model) {
        const position = this.modelConfig.positions[0];
        model.position.set(
            position.x,
            position.y + (this.modelConfig.type === 'box' ? this.modelConfig.size/2 : 0),
            position.z
        );
        model.rotation.set(...this.modelConfig.rotation);
        model.scale.setScalar(this.modelConfig.scale);
        model.castShadow = true;
        model.receiveShadow = true;
    }

    setupState(model) {
        model.userData = {
            type: this.modelType,
        isShootable: true,
            health: this.state.health,
            initialPosition: model.position.clone(),
            initialRotation: model.rotation.clone(),
            originalY: model.position.y,
            onHit: (damage, hitPoint) => this.handleHit(model, damage, hitPoint)
        };
    }

    handleHit(model, damage, hitPoint) {
        if (!model.userData.isShootable || !model.visible) {
            if (window.debugMode) {
                console.log(`[${this.modelType.toUpperCase()}] Hit ignored - not shootable or not visible`);
            }
            return;
        }

        model.userData.health -= damage;
        this.createHitEffects(model, hitPoint);

        if (model.userData.health <= 0) {
            this.destroy(model, hitPoint);
        }
    }

    createHitEffects(model, hitPoint) {
        if (window.gameEffects?.createHitEffect) {
            window.gameEffects.createHitEffect(hitPoint);
        }

        if (model.userData.flashTimeout) {
            clearTimeout(model.userData.flashTimeout);
        }

        model.traverse((child) => {
            if (!child.isMesh || !child.material) return;

            try {
                // Handle array materials
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (!mat) return;
                        
                        // Create emissive property if it doesn't exist
                        if (!mat.emissive) {
                            mat.emissive = new THREE.Color(0x000000);
                        }
                        
                        mat.emissive.setHex(DestructibleModelConfig.effects.flash.color);
                        mat.emissiveIntensity = DestructibleModelConfig.effects.flash.hitIntensity;
                    });
                }
                // Handle single material
                else {
                    // Create emissive property if it doesn't exist
                    if (!child.material.emissive) {
                        child.material.emissive = new THREE.Color(0x000000);
                    }
                    
                    child.material.emissive.setHex(DestructibleModelConfig.effects.flash.color);
                    child.material.emissiveIntensity = DestructibleModelConfig.effects.flash.hitIntensity;
                }
            } catch (error) {
                console.warn(`[${this.modelType}] Error applying hit effect to material:`, error);
                // Create a new material with proper emissive properties
                const fallbackMaterial = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    emissive: new THREE.Color(0xff0000),
                    emissiveIntensity: DestructibleModelConfig.effects.flash.hitIntensity
                });
                child.material = fallbackMaterial;
            }
        });

        model.userData.flashTimeout = setTimeout(() => {
            if (!model.userData.isShootable) return;
            
            model.traverse((child) => {
                if (!child.isMesh || !child.material) return;

                try {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => {
                            if (!mat || !mat.emissive) return;
                            mat.emissive.setHex(0x000000);
                            mat.emissiveIntensity = 0;
                        });
                    } else if (child.material.emissive) {
                        child.material.emissive.setHex(0x000000);
                        child.material.emissiveIntensity = 0;
                    }
                } catch (error) {
                    console.warn(`[${this.modelType}] Error resetting hit effect:`, error);
                }
            });
        }, DestructibleModelConfig.effects.flash.duration);
    }

    destroy(model, hitPoint) {
        model.userData.isShootable = false;
        model.visible = false;

        if (window.gameEffects?.createExplosion) {
            const explosionScale = this.modelConfig.explosionScale || DestructibleModelConfig.effects.explosion.scale;
            window.gameEffects.createExplosion(hitPoint, explosionScale);
        }

        const respawnDelay = this.modelConfig.respawnDelay || DestructibleModelConfig.respawn.delay;
        setTimeout(() => this.respawn(model), respawnDelay);
    }

    respawn(model) {
        model.position.copy(model.userData.initialPosition);
        model.rotation.copy(model.userData.initialRotation);
        model.visible = true;
        model.userData.health = this.state.health;

        model.traverse((child) => {
            if (!child.isMesh || !child.material) return;

            try {
                if (Array.isArray(child.material)) {
                    child.material.forEach(mat => {
                        if (!mat) return;
                        if (!mat.emissive) {
                            mat.emissive = new THREE.Color(0x000000);
                        }
                        mat.emissive.setHex(0x000000);
                        mat.emissiveIntensity = 0;
                    });
                } else {
                    if (!child.material.emissive) {
                        child.material.emissive = new THREE.Color(0x000000);
                    }
                    child.material.emissive.setHex(0x000000);
                    child.material.emissiveIntensity = 0;
                }
            } catch (error) {
                console.warn(`[${this.modelType}] Error resetting material in respawn:`, error);
                // Create a new material with default properties
                const fallbackMaterial = new THREE.MeshStandardMaterial({
                    color: 0x888888,
                    emissive: new THREE.Color(0x000000),
                    emissiveIntensity: 0
                });
                child.material = fallbackMaterial;
            }
        });

        model.userData.isShootable = true;
    }

    addToWorld(model) {
        addCollisionProperties(model, CollisionType.SOLID, {
            isShootable: true,
            type: this.modelType
        });

        scene.add(model);
        worldObjects.collidables.push(model);
        worldObjects.decorations.push(model);
    }

    logSetup(model) {
        console.log(`[${this.modelType.toUpperCase()}] Model loaded and added to scene:`, {
            position: model.position.toArray(),
            rotation: model.rotation.toArray(),
            scale: model.scale.toArray(),
            isShootable: model.userData.isShootable,
            inCollidables: worldObjects.collidables.includes(model),
            collisionSetup: model.userData.collision
        });
    }
}

// Model-specific configurations
const ModelConfigs = {
    // Base configuration that other models can extend
    baseModel: {
        scale: 0.04,
        type: 'fbx',
        health: 100,
        respawnDelay: 3000,
        explosionScale: 1.0,
        rotation: [0, 0, 0],
        positions: [{ x: 0, y: 0, z: 0 }],
        materials: {
            roughness: 0.7,
            metalness: 0.1,
            bumpScale: 0.1
        }
    },

    // Add Elwynn Tree configuration
    elwynnTree: {
        type: 'fbx',
        scale: 0.015,  // Smaller scale for the tree
        positions: [
            { x: 35, y: 0, z: -35 },  // First tree position
            { x: -35, y: 0, z: -35 },  // Second tree position
            { x: 35, y: 0, z: 35 },   // Third tree position
            { x: -35, y: 0, z: 35 }   // Fourth tree position
        ],
        rotation: [0, 0, 0],
        modelPath: '/resources/elwynn-tree.fbx',
        materials: {
            roughness: 0.8,         // More rough for natural look
            metalness: 0.0,         // No metalness for organic material
            bumpScale: 1.0,         // Strong bump mapping for bark texture
            envMapIntensity: 0.8,   // Subtle environment reflections
            aoMapIntensity: 1.5,    // Strong ambient occlusion for depth
            // Add specific part materials
            parts: {
                'leaves': {
                    roughness: 0.9,
                    metalness: 0.0,
                    transparent: true,
                    opacity: 1.0,
                    side: THREE.DoubleSide,
                    alphaTest: 0.1,       // Lower alpha test threshold
                    depthWrite: false      // Disable depth writing for better transparency
                },
                'trunk': {
                    roughness: 0.9,
                    metalness: 0.0,
                    bumpScale: 1.2        // Extra bump for bark
                }
            }
        }
    },

    // Add guard tower configuration
    guardTower: {
        type: 'fbx',
        scale: 0.02,  // Adjust scale as needed
        positions: [{ x: 50, y: 0, z: -25 }],  // Position it away from other models
        rotation: [0, Math.PI/4, 0],  // Rotate it 45 degrees for better view
        modelPath: '/resources/human-guard-tower.fbx',
        materials: {
            roughness: 0.5,         // Reduced roughness for more light reflection
            metalness: 0.2,         // Reduced metalness for less dark metal look
            baseColor: 0xffffff,    // Pure white base to let original textures show through
            bumpScale: 0.6,
            envMapIntensity: 3.5,   // Increased environment map intensity
            brightness: 3.5,        // Added brightness multiplier
            aoMapIntensity: 1.3     // Reduced ambient occlusion for less dark shadows
        }
    },

    // Specific model configurations that extend the base
    gnoll: {
        extends: 'baseModel',
        positions: [{ x: -10, y: 0, z: -15 }],
        rotation: [0, -Math.PI/2, 0],
        modelPath: '/resources/gnoll.fbx'
    },

    chicken: {
        extends: 'baseModel',
        positions: [{ x: 0, y: 0, z: 0 }],
        rotation: [0, -Math.PI/2, 0],
        modelPath: '/resources/chicken.fbx'
    },

    murloc: {
        extends: 'baseModel',
        positions: [{ x: -5, y: 0, z: -15 }],  // Opposite side from gnoll
        rotation: [0, -Math.PI/2, 0],  // Facing the other way
        modelPath: '/resources/murloc.fbx'
    },

    lampPost: {
        extends: 'baseModel',
        scale: 0.02,  // Smaller scale since it's a tall object
        positions: [
            { x: 15, y: 0, z: -15 }   // Second lamp post
        ],
        rotation: [0, Math.PI/2, 0],
        modelPath: '/resources/lamp-post.fbx',
        health: 150,  // More durable than other objects
        respawnDelay: 5000,  // Longer respawn time
        explosionScale: 1.5,  // Larger explosion effect
        materials: {
            roughness: 0.7,      // More smooth/glossy
            metalness: 0.3,      // More metallic
            bumpScale: 0.1,
            baseColor: 0xffffff, // Light gray color for the metal parts
            // Add emissive properties for the lamp parts
            emissive: 0xffffcc,  // Warm orange light color
            emissiveIntensity: 0.1,
            // Add specific part materials
            parts: {
                'lamp_glass': {
                    baseColor: 0xfff8e1,  // Very light warm color
                    emissive: 0xff9800,   // Warm orange
                    emissiveIntensity: 1.5,
                    transparent: true,
                    opacity: 0.8,
                    roughness: 0.1,
                    metalness: 0.0
                },
                'lamp_bulb': {
                    baseColor: 0xfff8e1,  // Very light warm color
                    emissive: 0xff9800,   // Warm orange
                    emissiveIntensity: 2.0,
                    roughness: 0.1,
                    metalness: 0.0
                }
            }
        }
    },

    crate: {
        extends: 'baseModel',
        scale: 1.0,
        type: 'box',
        size: 1.0,
        respawnDelay: 5000,
        positions: [
            { x: 5, y: 0, z: 0 },
            { x: -5, y: 0, z: 0 },
            { x: 0, y: 0, z: -5 },
            { x: 3, y: 0, z: 3 },
            { x: -3, y: 0, z: 3 }
        ]
    }
};

// Helper function to register new model types
function registerModelType(name, config) {
    if (window.debugMode) {
        console.log(`[MODEL_SYSTEM] Registering new model type: ${name}`, config);
    }
    
    // Ensure the config extends baseModel if not specified
    if (!config.extends) {
        config.extends = 'baseModel';
    }
    
    ModelConfigs[name] = config;
}

// Helper function to get resolved model config
function getModelConfig(modelType) {
    const config = ModelConfigs[modelType];
    if (!config) {
        throw new Error(`Model type '${modelType}' not found in configurations`);
    }

    // If this config extends another, merge them
    if (config.extends) {
        const baseConfig = getModelConfig(config.extends);
        return { ...baseConfig, ...config };
    }

    return config;
}

// Unified model loading function with enhanced error handling
function loadModel(modelType, config = {}) {
    try {
        const baseConfig = getModelConfig(modelType);
        const mergedConfig = { ...baseConfig, ...config };
        
        if (window.debugMode) {
            console.log(`[MODEL_SYSTEM] Loading model: ${modelType}`, mergedConfig);
        }

        const model = new DestructibleModel(modelType, mergedConfig);
        model.load();
        return model;
    } catch (error) {
        console.error(`[MODEL_SYSTEM] Error loading model ${modelType}:`, error);
        return null;
    }
}

// Example of how to register a new model type:
/*
registerModelType('troll', {
    extends: 'baseModel',
    positions: [{ x: 15, y: 0, z: -15 }],
    rotation: [0, Math.PI/2, 0],
    modelPath: '/resources/troll.fbx',
    scale: 0.05,
    health: 150
});
*/

// Specific model loading functions that maintain external API
function loadGnollModel() {
    return loadModel('gnoll');
}

function loadChickenModel() {
    return loadModel('chicken');
}

function loadMurlocModel() {
    return loadModel('murloc');
}

function loadLampPostModel() {
    return loadModel('lampPost');
}

function createDestructibleCrate(x, y, z) {
    return loadModel('crate', {
        positions: [{ x, y, z }]
    });
}

// Add guard tower loading function
function loadGuardTower() {
    const loader = new THREE.FBXLoader();
    const config = ModelConfigs.guardTower;
    
    loader.load(config.modelPath, (model) => {
        // Set up model position, rotation, and scale
        const position = config.positions[0];
        model.position.set(position.x, position.y, position.z);
        model.rotation.set(...config.rotation);
        model.scale.setScalar(config.scale);
        
        // Set up materials
        model.traverse((child) => {
            if (!child.isMesh) return;
            
            try {
                // Store original textures and materials before cleanup
                let originalMaterial = child.material;
                let originalTextures = {};
                
                if (originalMaterial) {
                    if (Array.isArray(originalMaterial)) {
                        originalMaterial = originalMaterial[0]; // Use first material as reference
                    }
                    
                    // Create a promise array for texture loading
                    const texturePromises = [];
                    
                    // Function to safely load texture
                    const loadTexture = (texture) => {
                        if (!texture) return null;
                        return new Promise((resolve) => {
                            // Clone the texture to avoid conflicts
                            const newTexture = texture.clone();
                            newTexture.needsUpdate = true;
                            
                            // Set up loading callback
                            newTexture.onload = () => {
                                resolve(newTexture);
                            };
                            
                            // Set up error handling
                            newTexture.onerror = () => {
                                console.warn('[GUARD_TOWER] Failed to load texture:', texture);
                                resolve(null);
                            };
                        });
                    };
                    
                    // Queue texture loading
                    if (originalMaterial.map) {
                        texturePromises.push(loadTexture(originalMaterial.map)
                            .then(tex => originalTextures.map = tex));
                    }
                    if (originalMaterial.normalMap) {
                        texturePromises.push(loadTexture(originalMaterial.normalMap)
                            .then(tex => originalTextures.normalMap = tex));
                    }
                    if (originalMaterial.roughnessMap) {
                        texturePromises.push(loadTexture(originalMaterial.roughnessMap)
                            .then(tex => originalTextures.roughnessMap = tex));
                    }
                    if (originalMaterial.metalnessMap) {
                        texturePromises.push(loadTexture(originalMaterial.metalnessMap)
                            .then(tex => originalTextures.metalnessMap = tex));
                    }
                    if (originalMaterial.aoMap) {
                        texturePromises.push(loadTexture(originalMaterial.aoMap)
                            .then(tex => originalTextures.aoMap = tex));
                    }
                    
                    // Wait for all textures to load
                    Promise.all(texturePromises).then(() => {
                        // Create base material properties
                        const materialProps = {
                            color: config.materials.baseColor,
                            roughness: config.materials.roughness,
                            metalness: config.materials.metalness,
                            side: THREE.DoubleSide,
                            envMapIntensity: config.materials.envMapIntensity || 1.0
                        };

                        // Only add texture maps that were successfully loaded
                        if (originalTextures.map) {
                            materialProps.map = originalTextures.map;
                            materialProps.map.encoding = THREE.LinearEncoding;
                            materialProps.map.needsUpdate = true;
                        }
                        if (originalTextures.normalMap) {
                            materialProps.normalMap = originalTextures.normalMap;
                            materialProps.normalMap.needsUpdate = true;
                        }
                        if (originalTextures.roughnessMap) {
                            materialProps.roughnessMap = originalTextures.roughnessMap;
                            materialProps.roughnessMap.needsUpdate = true;
                        }
                        if (originalTextures.metalnessMap) {
                            materialProps.metalnessMap = originalTextures.metalnessMap;
                            materialProps.metalnessMap.needsUpdate = true;
                        }
                        if (originalTextures.aoMap) {
                            materialProps.aoMap = originalTextures.aoMap;
                            materialProps.aoMapIntensity = config.materials.aoMapIntensity || 0.5;
                            materialProps.aoMap.needsUpdate = true;
                        }

                        // Create new material
                        const material = new THREE.MeshStandardMaterial(materialProps);

                        // Apply brightness multiplier to the material color
                        if (config.materials.brightness) {
                            material.color.multiplyScalar(config.materials.brightness);
                        }

                        // Ensure emissive property exists for hit effects
                        material.emissive = new THREE.Color(0x000000);
                        material.emissiveIntensity = 0;
                        
                        // Apply the new material
                        child.material = material;
                        child.castShadow = true;
                        child.receiveShadow = true;

                        // Force material update
                        material.needsUpdate = true;
                    });
                }
            } catch (error) {
                console.warn('[GUARD_TOWER] Error setting up materials:', error);
                // Create fallback material
                const fallbackMaterial = new THREE.MeshStandardMaterial({
                    color: config.materials.baseColor,
                    roughness: 0.7,
                    metalness: 0.3,
                    emissive: new THREE.Color(0x000000)
                });
                child.material = fallbackMaterial;
            }
        });
        
        // Add collision properties but mark as not shootable
        model.userData = {
            type: 'guardTower',
            isShootable: false,  // Not destructible
        onHit: (damage, hitPoint, normal) => {
                // Create hit effects but don't take damage
                if (window.gameEffects?.createSparkEffect) {
                    window.gameEffects.createSparkEffect(hitPoint, normal);
                }
                if (window.gameEffects?.createHitEffect) {
                    window.gameEffects.createHitEffect(hitPoint);
                }
            }
        };
        
        // Add to scene and collision system
        addCollisionProperties(model, CollisionType.SOLID, {
            isStatic: true,
            isBouncy: true,
            restitution: 0.8
        });
        
        scene.add(model);
        worldObjects.collidables.push(model);
        worldObjects.decorations.push(model);
        
        if (window.debugMode) {
            console.log('[GUARD_TOWER] Model loaded:', {
                position: model.position.toArray(),
                rotation: model.rotation.toArray(),
                scale: model.scale.toArray()
            });
        }
    });
}

// Add Elwynn Tree loading function
function loadElwynnTree() {
    const config = ModelConfigs.elwynnTree;
    
    // Load trees at each position
    config.positions.forEach(position => {
        const loader = new THREE.FBXLoader();
        loader.load(config.modelPath, (model) => {
            // Set up model position, rotation, and scale
            model.position.set(position.x, position.y, position.z);
            model.rotation.set(...config.rotation);
            model.scale.setScalar(config.scale);
            
            // Set up materials
            model.traverse((child) => {
                if (!child.isMesh) return;
                
                try {
                    // Store original textures and materials before cleanup
                    let originalMaterial = child.material;
                    let originalTextures = {};
                    
                    if (originalMaterial) {
                        if (Array.isArray(originalMaterial)) {
                            originalMaterial = originalMaterial[0];
                        }
                        
                        // Create a promise array for texture loading
                        const texturePromises = [];
                        
                        // Function to safely load texture
                        const loadTexture = (texture) => {
                            if (!texture) return null;
                            return new Promise((resolve) => {
                                const newTexture = texture.clone();
                                newTexture.needsUpdate = true;
                                
                                newTexture.onload = () => {
                                    resolve(newTexture);
                                };
                                
                                newTexture.onerror = () => {
                                    console.warn('[ELWYNN_TREE] Failed to load texture:', texture);
                                    resolve(null);
                                };
                            });
                        };
                        
                        // Queue texture loading
                        if (originalMaterial.map) {
                            texturePromises.push(loadTexture(originalMaterial.map)
                                .then(tex => originalTextures.map = tex));
                        }
                        if (originalMaterial.normalMap) {
                            texturePromises.push(loadTexture(originalMaterial.normalMap)
                                .then(tex => originalTextures.normalMap = tex));
                        }
                        if (originalMaterial.roughnessMap) {
                            texturePromises.push(loadTexture(originalMaterial.roughnessMap)
                                .then(tex => originalTextures.roughnessMap = tex));
                        }
                        if (originalMaterial.aoMap) {
                            texturePromises.push(loadTexture(originalMaterial.aoMap)
                                .then(tex => originalTextures.aoMap = tex));
                        }
                        
                        // Wait for all textures to load
                        Promise.all(texturePromises).then(() => {
                            // Check for part-specific materials
                            let partConfig = null;
                            if (config.materials?.parts) {
                                const partName = child.name.toLowerCase();
                                Object.entries(config.materials.parts).forEach(([key, conf]) => {
                                    if (partName.includes(key.toLowerCase())) {
                                        partConfig = conf;
                                    }
                                });
                            }

                            // Create base material properties
                            const materialProps = {
                                color: (partConfig || config.materials).baseColor,
                                roughness: (partConfig || config.materials).roughness,
                                metalness: (partConfig || config.materials).metalness,
                                side: THREE.DoubleSide,
                                transparent: true,
                                alphaTest: 0.5,
                                opacity: 0,
                                depthWrite: true,
                                envMapIntensity: config.materials.envMapIntensity || 1.0
                            };

                            // Set up texture properties for all parts
                            if (originalTextures.map) {
                                originalTextures.map.generateMipmaps = true;
                                originalTextures.map.minFilter = THREE.LinearMipmapLinearFilter;
                                originalTextures.map.magFilter = THREE.LinearFilter;
                                originalTextures.map.format = THREE.RGBAFormat;
                                originalTextures.map.encoding = THREE.sRGBEncoding;
                                materialProps.map = originalTextures.map;
                                materialProps.alphaMap = originalTextures.map;
                                materialProps.map.needsUpdate = true;
                            }

                            // Additional settings for leaves
                            if (partConfig && child.name.toLowerCase().includes('leaves')) {
                                materialProps.alphaTest = 0.3;  // Slightly lower threshold for leaves
                                materialProps.depthWrite = false;  // Disable depth writing for leaves
                            }

                            if (originalTextures.normalMap) {
                                materialProps.normalMap = originalTextures.normalMap;
                                materialProps.normalMap.needsUpdate = true;
                            }
                            if (originalTextures.roughnessMap) {
                                materialProps.roughnessMap = originalTextures.roughnessMap;
                                materialProps.roughnessMap.needsUpdate = true;
                            }
                            if (originalTextures.aoMap) {
                                materialProps.aoMap = originalTextures.aoMap;
                                materialProps.aoMapIntensity = config.materials.aoMapIntensity || 0.5;
                                materialProps.aoMap.needsUpdate = true;
                            }

                            // Create new material
                            const material = new THREE.MeshStandardMaterial(materialProps);

                            // Ensure emissive property exists
                            material.emissive = new THREE.Color(0x000000);
                            material.emissiveIntensity = 0;
                            
                            // Apply the new material
                            child.material = material;
                            child.castShadow = true;
                            child.receiveShadow = true;

                            // Force material update
                            material.needsUpdate = true;
                        });
                    }
                } catch (error) {
                    console.warn('[ELWYNN_TREE] Error setting up materials:', error);
                    const fallbackMaterial = new THREE.MeshStandardMaterial({
                        color: config.materials.baseColor,
                        roughness: 0.8,
                        metalness: 0.0,
                        emissive: new THREE.Color(0x000000)
                    });
                    child.material = fallbackMaterial;
                }
            });
            
            // Add collision properties
            model.userData = {
                type: 'elwynnTree',
                isShootable: false,  // Trees are not destructible
                onHit: (damage, hitPoint, normal) => {
                    // Create hit effects but don't take damage
                    if (window.gameEffects?.createSparkEffect) {
                        window.gameEffects.createSparkEffect(hitPoint, normal);
                    }
                    if (window.gameEffects?.createHitEffect) {
                        window.gameEffects.createHitEffect(hitPoint);
                    }
                }
            };
            
            // Add to scene and collision system
            addCollisionProperties(model, CollisionType.SOLID, {
                isStatic: true,
                isBouncy: false
            });
            
            scene.add(model);
            worldObjects.collidables.push(model);
            worldObjects.decorations.push(model);
            
            if (window.debugMode) {
                console.log('[ELWYNN_TREE] Tree loaded:', {
                    position: model.position.toArray(),
                    rotation: model.rotation.toArray(),
                    scale: model.scale.toArray()
                });
            }
        });
    });
}
