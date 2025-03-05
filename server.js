const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Serve static files from the "public" directory
app.use(express.static('public'));

// Add CORS middleware
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

const players = {};

// Add state tracking for game objects
const gameState = {
    players: {},
    bullets: {},
    jumpPads: {},
    platforms: {}
};

io.on('connection', (socket) => {
    console.log('[SERVER] New connection:', socket.id);

    // Log all incoming events for debugging
    socket.onAny((eventName, ...args) => {
        console.log(`[SERVER] Received event '${eventName}' from ${socket.id}:`, args);
    });

    // Add new player
    players[socket.id] = { x: 0, y: 0, z: 0 }; // Initial position
    console.log('Current players:', players);

    // Send existing players to the new player
    socket.emit('currentPlayers', players);

    // Notify other players of the new player
    socket.broadcast.emit('newPlayer', { id: socket.id, ...players[socket.id] });

    // Send current game state to new players
    socket.emit('gameState', gameState);

    // Handle player movement and rotation
    socket.on('playerMove', (data) => {
        players[socket.id] = data;
        socket.broadcast.emit('playerMoved', { id: socket.id, ...data });
    });

    // Respond to ping for latency measurement
    socket.on('ping', (callback) => {
        callback();
    });

    // Handle player disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        delete players[socket.id];
        socket.broadcast.emit('playerDisconnected', { id: socket.id });
    });

    // Handle object destruction
    socket.on('objectDestroyed', (data) => {
        // Broadcast to all other clients
        socket.broadcast.emit('objectDestroyed', data);
        
        // Update server state
        const { type, id } = data;
        if (!gameState[type]) gameState[type] = {};
        gameState[type][id] = { destroyed: true, timestamp: Date.now() };
    });

    // Handle object respawn
    socket.on('objectRespawned', (data) => {
        const { type, id, position } = data;
        
        // Update server-side state
        if (gameState[type] && gameState[type][id]) {
            gameState[type][id].destroyed = false;
            delete gameState[type][id].respawnTime;
        }

        // Broadcast to all other players
        socket.broadcast.emit('objectRespawned', data);
    });

    // Handle ball shots with acknowledgment
    socket.on('ballShot', (data) => {
        console.log('[SERVER] Ball shot received from', socket.id, {
            dataReceived: !!data,
            position: data?.position,
            velocity: data?.velocity,
            id: data?.id
        });

        // Get list of other connected clients - Fix the way we get connected clients
        const otherClients = Object.keys(players).filter(id => id !== socket.id);
        console.log('[SERVER] Broadcasting to clients:', otherClients);

        // Broadcast to each client individually and verify
        otherClients.forEach(clientId => {
            io.to(clientId).emit('ballShot', {
                position: data.position,
                velocity: data.velocity,
                id: data.id,
                senderId: socket.id
            });
            console.log('[SERVER] Sent ball data to client:', clientId);
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});