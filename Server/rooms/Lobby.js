// rooms/Lobby.js
const { Room } = require('@colyseus/core');
const { matchMaker } = require('@colyseus/core');
const { firestore, admin } = require("../firebase");

class Lobby extends Room {
  constructor(firestore) {
    super();
    this.firestore = firestore;
  }

  async destroyLobby(message) {
    if (message.playerId) {
      try {
        const playerDoc = await firestore.collection("users").doc(message.playerId).get();

        if (!playerDoc.exists) return;

        if (message.playerId === this.owner) {
          console.log("Player ID matches owner of room, continuing with destroy...");
          for (const [key, value] of Object.entries(this.rooms)) {
            for (const item of value) {
              // Destroy all child rooms for each game.
              await matchMaker.remoteRoomCall(item, "disconnect");
            }
          }
          console.log("Destroying lobby...");
          this.disconnect();
        }
      } catch (e) {
          console.error(e);
          return;
      }
    }
  }

  onCreate(options) {
    this.autoDispose = false;
    console.log('Lobby ' + this.roomId + ' created!', options);

    this.rooms = {
      "blackjack": [],
      "poker": [],
      "horseracing": [],
      "roulette": [],
      "baccarat": []
    }
    console.log(options.owner);
    this.owner = options.owner;

    this.createRooms(options);

    this.onMessage('getRooms', (client, message) => {
      console.log('Received message from', client.sessionId, ':', message);
      client.send('rooms', this.rooms);
    });

    this.onMessage('destroyLobby', (client, message) => {
      console.log('Destroy lobby request received from ', client.sessionId);

      this.destroyLobby(message);
    })
  }

  onJoin(client, options) {
    console.log('Client joined!', client.sessionId);
    if (options.playerId === this.owner) client.send("owner");
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
            case "roulette":
              room = await matchMaker.createRoom("roulette", {});
              break;
            case "baccarat":
              room = await matchMaker.createRoom("baccarat", {});
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
