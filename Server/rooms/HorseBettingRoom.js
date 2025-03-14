const { Room } = require("@colyseus/core");
const { Schema, type, MapSchema, ArraySchema } = require("@colyseus/schema");
const admin = require("../firebase");

class Horse extends Schema {
  constructor() {
    super();
    this.x = 50;
    this.speed = 0;
    this.finished = false;
    this.color = "red";
  }
}

type("number")(Horse.prototype, "x");
type("number")(Horse.prototype, "speed");
type("boolean")(Horse.prototype, "finished");
type("string")(Horse.prototype, "color");

class RaceState extends Schema {
  constructor() {
    super();
    this.horses = new ArraySchema();
    this.raceStarted = false;
    this.bets = new MapSchema();
    this.players = new MapSchema();
  }
}

type([Horse])(RaceState.prototype, "horses");
type("boolean")(RaceState.prototype, "raceStarted");
type({ map: "number" })(RaceState.prototype, "bets");
type({ map: "string" })(RaceState.prototype, "players");

class HorseRacingRoom extends Room {
  onCreate() {
    this.maxClients = 10;
    this.setState(new RaceState());

    // Initialize horses
    for (let i = 0; i < 5; i++) {
      const horse = new Horse();
      this.state.horses.push(horse);
    }

    this.onMessage("placeBet", (client, data) => {
      if (
        !this.state.raceStarted &&
        data.horseIndex >= 0 &&
        data.horseIndex < 5
      ) {
        this.state.bets.set(client.sessionId, data.horseIndex);
      }
    });

    this.onMessage("startRace", () => {
      if (!this.state.raceStarted) {
        this.state.raceStarted = true;
        this.startRace();
      }
    });
  }

  startRace() {
    // Assign random speeds to horses
    this.state.horses.forEach((horse) => {
      horse.x = 50;
      horse.speed = 1 + Math.random() * 2;
      horse.finished = false;
    });

    // Update horse positions every 50ms
    const interval = setInterval(() => {
      let allFinished = true;

      this.state.horses.forEach((horse) => {
        if (!horse.finished) {
          horse.x += horse.speed;

          if (horse.x >= 700) {
            horse.finished = true;
            horse.color = "green";
          } else {
            allFinished = false;
          }
        }
      });

      if (allFinished) {
        clearInterval(interval);
        this.endRace();
      }
    }, 50);
  }

  endRace() {
    const winningHorseIndex = this.state.horses.findIndex(
      (horse) => horse.x >= 700
    );

    console.log("winningHorseIndex", winningHorseIndex);

    this.state.bets.forEach((betHorseIndex, clientId) => {
      if (betHorseIndex === winningHorseIndex) {
        const client = this.clients.find((c) => c.sessionId === clientId);
        if (client) {
          console.log("won", clientId);
          client.send("raceResult", {
            won: true,
            horseIndex: winningHorseIndex,
          });
        }
      }
    });

    setTimeout(() => {
      this.state.raceStarted = false;
      this.state.bets.clear();
    }, 3000);
  }

  async onJoin(client, options) {
    // Set player ID from options when client joins
    if (options.playerId) {
      try {
        // console.log('Firebase Admin:', admin); // Should show initialized app
        // console.log('Firestore:', admin.firestore); // Should show function

        const playerDoc = await admin.firestore
          .collection("users")
          .doc(options.playerId)
          .get();
        if (playerDoc.exists) {
          const playerName = playerDoc.data().name;
          client.sessionId = options.playerId;
          this.state.players.set(client.sessionId, playerName);
          console.log(`${playerName} joined!`);
        } else {
          console.log(`Player with ID ${options.playerId} not found.`);
        }
      } catch (error) {
        console.error("Error fetching player data:", error);
      }

      console.log(options.playerId, "joined!");
    }
  }

  onLeave(client) {
    console.log(client.sessionId, "left!");
    this.state.bets.delete(client.sessionId);
    // Remove player from players map
    this.state.players.delete(client.sessionId);

    // Update isInGame to false
    admin.firestore.collection("users").doc(client.sessionId).update({
      isInGame: false,
    });

    // console log to show that the player has left the game
    console.log(`Player with ID ${client.sessionId} has left the game.`);
  }

  onDispose() {
    // make sure all clients are set to not in game
    this.state.players.forEach((player, clientId) => {
      admin.firestore.collection("users").doc(clientId).update({
        isInGame: false,
      });
    });
  }
}

module.exports = HorseRacingRoom;
