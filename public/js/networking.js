// Multiplayer networking functionality

// Initialize socket connection first
const socket = io(window.location.origin, {
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 5
});

// Initialize global networking state
const networkingState = {
    players: {},
    connected: false,
    playerId: null,
    latency: 0
};

// Initialize global world objects if not exists
if (!window.worldObjects) {
    window.worldObjects = {
        walls: [],
        players: new Map(),
        collidables: []
    };
}

// Create player textures
function createPlayerTexture(type, color) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    switch(type) {
        case 'face':
            // Create face texture with gradient
            const gradient = ctx.createLinearGradient(0, 0, 0, 64);
            gradient.addColorStop(0, '#dba176');
            gradient.addColorStop(0.3, '#e6b080');
            gradient.addColorStop(1, '#f0c090');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, 64, 64);
            break;
            
        case 'body':
        case 'arm':
            // Create shirt/arm texture with pattern
            const bodyGradient = ctx.createLinearGradient(0, 0, 0, 64);
            bodyGradient.addColorStop(0, '#4287f5');
            bodyGradient.addColorStop(1, '#3264c8');
            ctx.fillStyle = bodyGradient;
            ctx.fillRect(0, 0, 64, 64);
            
            // Add pattern
            ctx.strokeStyle = '#5499ff';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.3;
            for(let i = -64; i < 64; i += 8) {
                ctx.beginPath();
                ctx.moveTo(i, 0);
                ctx.lineTo(i + 64, 64);
                ctx.stroke();
            }
            break;
            
        case 'leg':
            // Create pants texture
            const pantsGradient = ctx.createLinearGradient(0, 0, 0, 64);
            pantsGradient.addColorStop(0, '#2b4c91');
            pantsGradient.addColorStop(1, '#1d3a8f');
            ctx.fillStyle = pantsGradient;
            ctx.fillRect(0, 0, 64, 64);
            
            // Add subtle pattern
            ctx.strokeStyle = '#3264c8';
            ctx.lineWidth = 1;
            ctx.globalAlpha = 0.15;
            for(let i = 0; i < 64; i += 4) {
                ctx.beginPath();
                ctx.moveTo(0, i);
                ctx.lineTo(64, i);
                ctx.stroke();
            }
            break;
    }
    
    return new THREE.CanvasTexture(canvas);
}

// Helper Functions
function createNetworkedBall(data) {
    try {
        const config = window.gameWeapons.weaponConfig.bouncer.projectileConfig;
        const ball = new THREE.Mesh(
            new THREE.SphereGeometry(config.size),
            new THREE.MeshPhongMaterial({
                color: config.color,
                shininess: 30,
                specular: 0x333333,
                map: window.gameWeapons.createSoccerBallTexture()
            })
        );

        ball.position.fromArray(data.position);
        ball.userData = {
            type: 'bouncer',
            velocity: new THREE.Vector3().fromArray(data.velocity),
            bounceCount: 0,
            createdAt: Date.now(),
            id: data.id,
            isNetworked: true,
            senderId: data.senderId
        };

        return ball;
    } catch (error) {
        console.error('[NETWORK] Error creating ball:', error);
        return null;
    }
}

function addPlayer(id, position) {
    const playerModel = window.gameWorld.createPlayerModel(id);
    if (position) {
        playerModel.position.copy(position);
    }
    networkingState.players[id] = {
        position: position || new THREE.Vector3(),
        model: playerModel
    };
    window.worldObjects.players.set(id, playerModel);
    return playerModel;
}

function updatePlayerPosition(id, data) {
    const playerModel = window.worldObjects.players.get(id);
    if (!playerModel) return;

    if (networkingState.players[id]) {
        networkingState.players[id].position = new THREE.Vector3(data.x, data.y, data.z);
    }

    playerModel.position.set(data.x, data.y, data.z);
    playerModel.rotation.y = data.rotationY;
    
    const head = playerModel.children.find(child => 
        Array.isArray(child.material) && child.material.length === 6
    );
    if (head) {
        head.rotation.x = data.rotationX;
    }
}

function sendPlayerMove() {
    if (!networkingState.connected) return;
    
    const moveData = {
        x: window.playerPosition.x,
        y: window.playerPosition.y,
        z: window.playerPosition.z,
        rotationY: window.camera.rotation.y,
        rotationX: window.camera.rotation.x
    };
    socket.emit('playerMove', moveData);
}

// Main networking initialization
function initNetworking() {
    console.log('[NETWORK] Initializing networking...', {
        socketExists: !!socket,
        socketConnected: socket?.connected,
        socketId: socket?.id
    });

    // Socket event handlers
    socket.on('connect', () => {
        console.log('[NETWORK] Connected to server with ID:', socket.id);
        networkingState.connected = true;
        networkingState.playerId = socket.id;
        networkingState.players = {};
        window.worldObjects.players.clear();
    });

    socket.on('disconnect', () => {
        console.log('[NETWORK] Disconnected from server');
        networkingState.connected = false;
        networkingState.players = {};
        window.worldObjects.players.clear();
    });

    socket.on('ballShot', (data) => {
        try {
            const position = new THREE.Vector3().fromArray(data.position);
            const velocity = new THREE.Vector3().fromArray(data.velocity);
            
            const ball = window.gameWeapons.createBouncerBall(
                position,
                velocity,
                true,
                data.senderId
            );
        } catch (error) {
            console.error('[NETWORK] Ball creation error:', error);
        }
    });

    // Player management events
    socket.on('currentPlayers', (currentPlayers) => {
        console.log('[NETWORK] Current players received:', currentPlayers);
        networkingState.players = {};
        window.worldObjects.players.clear();
        
        for (const id in currentPlayers) {
            if (id !== socket.id) {
                addPlayer(id, currentPlayers[id].position);
            }
        }
    });

    socket.on('newPlayer', (data) => {
        console.log('[NETWORK] New player connected:', data.id);
        addPlayer(data.id, data.position);
    });

    socket.on('playerMoved', (data) => {
        const playerModel = window.worldObjects.players.get(data.id);
        if (playerModel) {
            updatePlayerPosition(data.id, data);
        }
    });

    socket.on('playerDisconnected', (data) => {
        console.log('[NETWORK] Player disconnected:', data.id);
        const playerModel = window.worldObjects.players.get(data.id);
        if (playerModel) {
            window.scene.remove(playerModel);
            window.worldObjects.players.delete(data.id);
        }
    });

    socket.on('playerHit', (data) => {
        const hitPlayer = window.worldObjects.players.get(data.playerId);
        if (hitPlayer) {
            window.gameWorld.handlePlayerHit(hitPlayer, data.damage);
        }
    });

    // Error handling
    socket.on('connect_error', (error) => {
        console.error('[NETWORK] Socket connection error:', error);
    });

    socket.on('connect_timeout', () => {
        console.error('[NETWORK] Socket connection timeout');
    });

    // Start update loops
    setInterval(sendPlayerMove, 10);
    setInterval(() => {
        const start = Date.now();
        socket.emit('ping', () => {
            networkingState.latency = Date.now() - start;
        });
    }, 2000);
}

// Export networking API
window.gameNetworking = {
    initNetworking,
    socket,
    updatePlayers,
    get playerId() { return networkingState.playerId; },
    get players() { return networkingState.players; },
    get connected() { return networkingState.connected; },
    get latency() { return networkingState.latency; }
};

// Update player interpolation
function updatePlayers() {
    window.worldObjects.players.forEach((playerModel, id) => {
        if (playerModel && playerModel.userData.targetPosition) {
            playerModel.position.lerp(playerModel.userData.targetPosition, 0.7);
        }
    });
} 