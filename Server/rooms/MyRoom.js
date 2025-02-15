// rooms/MyRoom.js
const { Room } = require('@colyseus/core');

class MyRoom extends Room {
  onCreate(options) {
    console.log('Room created!', options);

    this.setState({
      players: {},
      // Add your game state here
    });

    this.onMessage('type', (client, message) => {
      console.log('Received message from', client.sessionId, ':', message);
      // Handle client messages
    });
  }

  onJoin(client, options) {
    console.log('Client joined!', client.sessionId);
  }

  onLeave(client) {
    console.log('Client left!', client.sessionId);
    delete this.state.players[client.sessionId];
  }

  onDispose() {
    console.log('Room disposed!');
  }
}

module.exports = { MyRoom };