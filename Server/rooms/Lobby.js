// rooms/Lobby.js
const { Room } = require('@colyseus/core');
const { matchMaker } = require('@colyseus/core');

class Lobby extends Room {
  onCreate(options) {
    this.autoDispose = false;
    console.log('Lobby ' + this.roomId + ' created!', options);

    this.rooms = {
      "blackjack": [],
      "poker": [],
      "horseracing": []
    }

    this.createRooms(options);

    this.onMessage('getRooms', (client, message) => {
      console.log('Received message from', client.sessionId, ':', message);
      client.send('rooms', this.rooms);
    });
  }

  onJoin(client, options) {
    console.log('Client joined!', client.sessionId);
  }

  onLeave(client) {
    console.log('Client left!', client.sessionId);
    delete this.state.players[client.sessionId];
  }

  // Disposing is not implemented yet. Will need to add later once Colyseus authentication is implemented.
  onDispose() {
    console.log('Lobby disposed!');
  }

  async createRooms(options) {
    for (var key in options) {
      // Make sure the value of options[key] can be used as a maximum for the loop.
      if (!Number.isInteger(options[key])) continue;

      for (let i = 0; i < options[key]; i++) {
        if (key in this.rooms) {
          console.log(key);
          var room = null;
          switch(key) {
            case "blackjack":
              room = await matchMaker.createRoom("blackjack", { maxPlayers: 8 });
              break;
            case "poker":
              room = await matchMaker.createRoom("poker", {});
              break;
            case "horseracing":
              room = await matchMaker.createRoom("horse_racing", {});
              break;
            default:
              // Key was in rooms but did not match a case. Move to next item in options.
              continue;
          }

          this.rooms[key].push(room.roomId);
        }
      }
    }
  }
}

module.exports = { Lobby };
