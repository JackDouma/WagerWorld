const { Room } = require("@colyseus/core");
const admin = require("../firebase");
const { BaccaratPlayer, BaccaratState } = require("../schema/BaccaratSchema");
const { ArraySchema } = require("@colyseus/schema");

class BaccaratRoom extends Room {
  constructor(firestore) {
    super();
    this.firestore = firestore;
    this.players = []; // List to store player names
    this.readyPlayers = new Set(); // Set to store ready player IDs
  }

  onCreate(options) {
    this.autoDispose = false;
    // this.maxClients = options.maxPlayers || 5;

    this.onMessage('playerReady', (client, message) => {
      const playerId = message.playerId;

      if (!this.readyPlayers.has(client.id)) {
        this.readyPlayers.add(client.id);
        console.log(`Player ${playerId} is ready.`);
      } else {
        console.log(`Player ${playerId} was already marked as ready.`);
      }

      // check if all players are ready
      const allPlayerIds = this.players.map(player => player.id);
      if (allPlayerIds.length > 0 && allPlayerIds.every(id => this.readyPlayers.has(id))) {
        console.log("All players are ready!");
        this.broadcast("allPlayersReady", { message: "All players are ready!" });
      }
    });
  }

  // handles when a player joins
  async onJoin(client, options) {
    const playerId = options.playerId || client.id;
    const playerName = options.playerName || "Anonymous";

    const playerExists = this.players.some((player) => player.id === client.id);
    if (!playerExists) {
      this.players.push({ id: client.id, name: playerName });

      this.broadcast("playerListUpdate", { players: this.players });

      console.log("Current players:", this.players);
    } else {
      console.log(`Player with id ${client.id} is already in the list.`);
    }
  }

  onLeave(client, options) {
    const playerIndex = this.players.findIndex(
      (player) => player.id === client.id
    );
    if (playerIndex !== -1) {
      this.players.splice(playerIndex, 1);
    }

    // remove the player from the ready list if they leave
    if (this.readyPlayers.has(client.id)) {
      this.readyPlayers.delete(client.id);
      console.log(`Player ${client.id} removed from ready list.`);
    }

    this.broadcast("playerListUpdate", { players: this.players });
    console.log("Current players after leave:", this.players);
  }
}

module.exports = { BaccaratRoom };
