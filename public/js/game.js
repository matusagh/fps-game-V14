// Main game initialization and loop

// Game Configuration
const CONFIG = {
    fps: {
        target: 144,
        interval: 1000 / 144
    },
    camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        smoothing: {
            position: {
                current: new THREE.Vector3(),
                target: new THREE.Vector3(),
                velocity: new THREE.Vector3(),
                smoothTime: 0.1,
                maxSpeed: 30.0
            }
        }
    },
    jumpPad: {
        detectionRange: 0.5,
        cooldown: 1000,
        boostForce: 0.3
    }
};

// Global game objects
window.scene = null;
window.camera = null;
window.renderer = null;
window.playerModel = null;
window.ground = null;
window.walls = [];
window.jumpPads = [];
window.platforms = [];

// Initialize sounds
window.sounds = {
    footstep: new Audio('https://www.myinstants.com/media/sounds/footstep.mp3'),
    jumpPad: new Audio('https://www.myinstants.com/media/sounds/jump-boing.mp3'),
    topPad: new Audio('https://www.myinstants.com/media/sounds/my-movie-6_0RlWMvM.mp3'),
    shootLeft: new Audio('https://freesound.org/data/previews/163/163457_2263027-lq.mp3'),
    shootRight: new Audio('https://github.com/matusagh/cursor-fps-game/raw/refs/heads/main/sounds/energy-drink-effect-230559.mp3'),
    soccerKick: new Audio('https://github.com/matusagh/cursor-fps-game/raw/refs/heads/main/sounds/soccer-ball-kick.mp3'),
    explosionSounds: [
        new Audio('https://www.myinstants.com/media/sounds/roblox-death-sound-effect.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/lego-breaking.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/rizz-sounds.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/classic_hurt.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/fart-with-reverb.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/old-spice-whistle-hq.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/jolanda-a-jeje.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/gay-echo.mp3'),
        new Audio('https://www.myinstants.com/media/sounds/bombaclaaat.mp3')
    ],
    explosionSoundIndex: 0
};

// Configure sounds
Object.values(window.sounds).forEach(sound => {
    if (Array.isArray(sound)) {
        sound.forEach(s => {
            s.volume = 0.2;
            s.onerror = (e) => console.warn('Sound loading error:', e);
        });
    } else if (sound instanceof Audio) {
        sound.volume = 0.2;
        sound.onerror = (e) => console.warn('Sound loading error:', e);
    }
});

// Initialize player state
window.player = {
    velocity: new THREE.Vector3(),
    canJump: true,
    isGrounded: true,
    direction: new THREE.Vector3(0, 0, -1)
};

// Initialize player position
window.playerPosition = new THREE.Vector3(0, 2.2, 10);

// Add FPS tracking variables
let lastFpsUpdate = 0;
let frameCount = 0;
let currentFps = 0;
let lastFrameTime = 0;

// Make collision types globally available
window.CollisionType = {
    SOLID: 'solid',
    WALKABLE: 'walkable',
    RAMP: 'ramp',
    TRIGGER: 'trigger',
    PLAYER: 'player'
};

// Initialize game
function initGame() {
    // Create scene
    window.scene = new THREE.Scene();
    window.scene.background = new THREE.Color(0x87ceeb); // Sky blue
    
    // Create camera with better initial settings
    window.camera = new THREE.PerspectiveCamera(
        CONFIG.camera.fov,                                     // FOV
        window.innerWidth / window.innerHeight, // Aspect ratio
        CONFIG.camera.near,                                    // Near plane
        CONFIG.camera.far                                    // Far plane
    );
    
    // Initialize game systems in correct order
    window.gameWorld.initWorld();
    window.gamePlayer.initPlayer?.() || window.gamePlayer;  // Initialize player first if method exists
    window.gameControls.initControls();  // This will call init() internally
    window.gameNetworking.initNetworking();
    
    // Set initial camera and player positions
    window.camera.position.copy(window.playerPosition);
    window.camera.rotation.set(0, 0, 0);
    
    // Create renderer with proper settings
    initRenderer();
    
    // Create compass scene and camera
    const compassContainer = document.getElementById('compass-container');
    if (!compassContainer) {
        console.error('Compass container not found in HTML');
        return;
    }

    const compassScene = new THREE.Scene();
    const compassCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 10);
    compassCamera.position.set(0, 0, 3);
    
    // Create compass renderer
    const compassRenderer = new THREE.WebGLRenderer({ alpha: true });
    compassRenderer.setSize(100, 100);
    compassContainer.appendChild(compassRenderer.domElement);

    // Create compass axes with thicker lines
    const axesHelper = new THREE.AxesHelper(1);
    axesHelper.position.y = -0.3; // Move the axes helper down
    // Make the axes lines thicker and brighter
    if (axesHelper.material) {
        axesHelper.material.linewidth = 4;
        // Make axes colors brighter and more vibrant
        axesHelper.material.vertexColors = true;
        const colors = axesHelper.geometry.attributes.color;
        // X axis (bright red)
        colors.setXYZ(0, 1, 0, 0); // Pure red
        colors.setXYZ(1, 1, 0, 0);
        // Y axis (bright green)
        colors.setXYZ(2, 0, 1, 0); // Pure green
        colors.setXYZ(3, 0, 1, 0);
        // Z axis (bright blue)
        colors.setXYZ(4, 0, 0.7, 1); // Bright blue with slight cyan tint
        colors.setXYZ(5, 0, 0.7, 1);
        colors.needsUpdate = true;
    }
    compassScene.add(axesHelper);

    // Add labels for axes
    const createLabel = (text, color, position) => {
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = color;
        // Add text shadow for better visibility
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 32, 16);

        const texture = new THREE.CanvasTexture(canvas);
        const material = new THREE.SpriteMaterial({ 
            map: texture,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: false
        });
        const sprite = new THREE.Sprite(material);
        sprite.position.copy(position);
        sprite.scale.set(0.18, 0.09, 1);
        return sprite;
    };

    // Add axis labels with adjusted positions and brighter colors
    const xLabel = createLabel('X', '#ff5555', new THREE.Vector3(1.2, -0.3, 0)); // Adjusted Y position
    const yLabel = createLabel('Y', '#55ff55', new THREE.Vector3(0, 0.9, 0)); // Y label stays high
    const zLabel = createLabel('Z', '#00b3ff', new THREE.Vector3(0, -0.3, 1.2)); // Changed color to match axis
    
    compassScene.add(xLabel);
    compassScene.add(yLabel);
    compassScene.add(zLabel);

    // Store compass objects globally
    window.compass = {
        scene: compassScene,
        camera: compassCamera,
        renderer: compassRenderer,
        labels: { xLabel, yLabel, zLabel }
    };
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize, false);
    
    // Initialize weapon HUD
    window.gameWeapons.state.currentWeapon = 'primary';
    window.gameWeapons.config.primary.lastFired = 0;
    window.gameWeapons.config.boost.lastFired = 0;
    WeaponUI.updateHUD();
    
    // Create favicon to prevent 404 error
    createFavicon();
    
    // Initialize sounds on first interaction
    document.addEventListener('click', function initSound() {
        Object.entries(window.sounds).forEach(([key, sound]) => {
            if (Array.isArray(sound)) {
                sound.forEach(s => {
                    s.play().catch(() => {});
                    s.pause();
                    s.currentTime = 0;
                });
            } else if (sound instanceof Audio) {
                sound.play().catch(() => {});
                sound.pause();
                sound.currentTime = 0;
            }
        });
        document.removeEventListener('click', initSound);
    }, { once: true });
    
    // Start game loop
    requestAnimationFrame(animate);
}

// Create dynamic favicon
function createFavicon() {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    
    // Draw background
    ctx.fillStyle = '#2C3E50';
    ctx.fillRect(0, 0, 32, 32);
    
    // Draw crosshair
    ctx.strokeStyle = '#ECF0F1';
    ctx.lineWidth = 2;
    
    // Outer circle
    ctx.beginPath();
    ctx.arc(16, 16, 12, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center dot
    ctx.beginPath();
    ctx.arc(16, 16, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#E74C3C';
    ctx.fill();
    
    // Create favicon link
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = canvas.toDataURL();
    document.getElementsByTagName('head')[0].appendChild(link);
}

// Handle window resize
function onWindowResize() {
    window.camera.aspect = window.innerWidth / window.innerHeight;
    window.camera.updateProjectionMatrix();
    window.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Update game info display
function updateGameInfo() {
    try {
        // Update FPS counter
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdate > 1000) { // Update every second
            currentFps = Math.round(frameCount * 1000 / (now - lastFpsUpdate));
            frameCount = 0;
            lastFpsUpdate = now;
        }

        // Update info display
        const fpsSpan = document.getElementById('fps');
        const latencySpan = document.getElementById('latency');
        const positionSpan = document.getElementById('position');
        const velocitySpan = document.getElementById('velocity');
        const directionSpan = document.getElementById('direction');
        const activeKeysSpan = document.getElementById('activeKeys');
        const bulletsSpan = document.getElementById('bullets');
        const particlesSpan = document.getElementById('particles');
        const otherPlayersSpan = document.getElementById('otherPlayers');

        if (fpsSpan) fpsSpan.textContent = currentFps;
        if (latencySpan) latencySpan.textContent = `${window.gameNetworking?.latency || 0} ms`;
        if (positionSpan) positionSpan.textContent = `${window.playerPosition.x.toFixed(1)}, ${window.playerPosition.y.toFixed(1)}, ${window.playerPosition.z.toFixed(1)}`;
        if (velocitySpan) velocitySpan.textContent = window.player.velocity.length().toFixed(2);
        if (directionSpan) directionSpan.textContent = `${(window.camera.rotation.y * (180/Math.PI)).toFixed(0)}°`;
        if (activeKeysSpan && window.gameControls?.getActiveKeys) {
            const keys = window.gameControls.getActiveKeys();
            activeKeysSpan.textContent = keys || 'None';
        }
        if (bulletsSpan) bulletsSpan.textContent = window.gameWeapons?.state?.bullets?.length || 0;
        if (particlesSpan) particlesSpan.textContent = window.gameEffects?.getParticleCount() || 0;
        if (otherPlayersSpan && window.worldObjects?.players) {
            const allPlayers = Array.from(window.worldObjects.players.keys());
            const localPlayerId = window.gameNetworking?.playerId;
            const otherPlayers = allPlayers.filter(id => id !== localPlayerId);
            
            // Show only first 6 characters of each player ID
            const shortenedIds = otherPlayers.map(id => id.substring(0, 6));
            otherPlayersSpan.textContent = shortenedIds.length > 0 ? shortenedIds.join(', ') : 'None';
        }
    } catch (error) {
        console.error('Info update error:', error);
    }
}

// Update the animation loop
function animate(currentTime) {
    requestAnimationFrame(animate);
    
    // Calculate delta time and limit frame rate
    const deltaTime = currentTime - lastFrameTime;
    if (deltaTime < CONFIG.fps.interval) return;
    
    // Smooth delta time to prevent stuttering
    const smoothDelta = Math.min(deltaTime, 32);
    const dt = smoothDelta * 0.001; // Convert to seconds
    
    // Update game systems in correct order
    updateGameInfo();
    window.gameControls?.updateCamera();
    window.gamePlayer?.updatePlayer(smoothDelta);
    window.gameWeapons?.updateBullets(smoothDelta);
    window.gameWorld?.updateWorld(smoothDelta);
    window.gameEffects?.updateEffects();
    window.gameNetworking?.updatePlayers();
    
    // Update camera position smoothly
    if (window.gameControls?.cameraConfig.firstPerson) {
        CONFIG.camera.smoothing.position.target.copy(window.playerPosition);
        smoothDampVector(
            camera.position,
            CONFIG.camera.smoothing.position.target,
            CONFIG.camera.smoothing.position.velocity,
            CONFIG.camera.smoothing.position.smoothTime,
            CONFIG.camera.smoothing.position.maxSpeed,
            dt
        );
    }
    
    // Update sky and clouds
    window.gameWorld?.updateSky(dt);
    
    // Update compass
    updateCompass();
    
    // Render the scene
    renderer.render(scene, camera);
    lastFrameTime = currentTime - (deltaTime % CONFIG.fps.interval);
}

// Separate compass update function for clarity
function updateCompass() {
    if (!window.compass) return;
    
    window.compass.scene.rotation.y = -window.camera.rotation.y;
    window.compass.scene.rotation.x = -window.camera.rotation.x;
    
    // Update label rotations to face camera
    const quaternion = window.compass.camera.quaternion;
    window.compass.labels.xLabel.quaternion.copy(quaternion);
    window.compass.labels.yLabel.quaternion.copy(quaternion);
    window.compass.labels.zLabel.quaternion.copy(quaternion);
    
    window.compass.renderer.render(window.compass.scene, window.compass.camera);
}

// Add these renderer optimizations
function initRenderer() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true
    });
    
    // Optimize renderer settings
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Disable automatic color adjustments
    renderer.outputEncoding = THREE.LinearEncoding;  // Use linear encoding
    renderer.toneMapping = THREE.NoToneMapping;      // Disable tone mapping
    renderer.toneMappingExposure = 1.0;             // Reset exposure
    
    // Enable WebGL optimizations
    renderer.physicallyCorrectLights = false;        // Disable physical lights
    renderer.gammaFactor = 1.0;                     // Reset gamma
    
    document.body.appendChild(renderer.domElement);
}

// Simplified smooth damping helper functions
function smoothDampVector(current, target, velocity, smoothTime, maxSpeed, deltaTime) {
    smoothDampAxis('x');
    smoothDampAxis('y');
    smoothDampAxis('z');
    
    function smoothDampAxis(axis) {
        const omega = 2 / smoothTime;
        const x = omega * deltaTime;
        const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
        
        const change = current[axis] - target[axis];
        const maxChange = maxSpeed * smoothTime;
        const clampedChange = Math.min(Math.max(change, -maxChange), maxChange);
        
        const temp = (velocity[axis] + omega * clampedChange) * deltaTime;
        velocity[axis] = (velocity[axis] - omega * temp) * exp;
        current[axis] = target[axis] + (clampedChange + temp) * exp;
    }
}

// Start the game
initGame();

// Simplified debug toggle
window.toggleDebug = () => {
    window.debugMode = !window.debugMode;
    console.log('Debug mode:', window.debugMode ? 'enabled' : 'disabled');
    if (window.debugMode) {
        console.log('Current networking state:', {
            socket: window.gameNetworking?.socket?.connected,
            playerId: window.gameNetworking?.playerId,
            players: window.gameNetworking?.players,
            worldPlayers: window.gameWorld?.worldObjects?.players
        });
    }
};

// Change debug key to backtick
document.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === 'Backquote') {  // Support both key representations
        window.toggleDebug();
    }
});

// Debug command to check player states
window.checkPlayers = () => {
    const players = worldObjects.players;
    console.log('Current players:', {
        networkingPlayers: Object.keys(window.gameNetworking.players || {}),
        worldPlayers: Array.from(players.keys()),
        models: Array.from(players.values()).map(player => ({
            id: player.userData.playerId,
            position: player.position.clone(),
            hasHead: player.children.some(child => 
                Array.isArray(child.material) && child.material.length === 6
            ),
            children: player.children.map(child => ({
                type: child.type,
                materials: Array.isArray(child.material) ? 
                    child.material.map(m => ({
                        hasTexture: !!m.map,
                        textureLoaded: m.map?.image?.complete
                    })) : 'single material'
            }))
        }))
    });
};

function initWorld() {
    // Create the ground
    window.gameWorld.createGround();
    
    // Create some walls
    window.gameWorld.createWalls();
    
    // Create platforms
    window.gameWorld.createPlatforms();
    
    // Create jump pads
    window.gameWorld.createJumpPads();
    
    // Create some destructible crates
    window.gameWorld.createDestructibleCrate(3, 0.25, 3);
    window.gameWorld.createDestructibleCrate(-4, 0.25, 2);
    window.gameWorld.createDestructibleCrate(0, 0.25, -5);
    window.gameWorld.createDestructibleCrate(5, 2.25, -3);  // On a platform
    window.gameWorld.createDestructibleCrate(-3, 2.25, -4); // On a platform
} 