// server.js
const http = require('http');
const express = require('express');
const { Server } = require('@colyseus/core');
const { WebSocketTransport } = require('@colyseus/ws-transport');
const { MyRoom } = require('./rooms/MyRoom');
const { CardRoom } = require('./rooms/CardRoom');
const { BlackjackRoom } = require('./rooms/BlackjackRoom');

const app = express();
const port = process.env.PORT || 2567;

// Create HTTP & WebSocket servers
const server = http.createServer(app);
const gameServer = new Server({
  transport: new WebSocketTransport({
    server
  })
});

// Register your room handlers
gameServer.define('card_room', CardRoom);

gameServer.define('blackjack', BlackjackRoom);

// Express static file serving
app.use(express.static('public'));

// Listen on specified port
gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);