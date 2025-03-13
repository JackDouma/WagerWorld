const { Room } = require('@colyseus/core');
const { Schema, type, MapSchema, ArraySchema } = require("@colyseus/schema");

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
  }
}

type([Horse])(RaceState.prototype, "horses");
type("boolean")(RaceState.prototype, "raceStarted");
type({ map: "number" })(RaceState.prototype, "bets");

class HorseRacingRoom extends Room {
  onCreate() {
    this.autoDispose = false;
    this.maxClients = 10;
    this.setState(new RaceState());

    // Initialize horses
    for (let i = 0; i < 5; i++) {
      const horse = new Horse();
      this.state.horses.push(horse);
    }

    this.onMessage("placeBet", (client, data) => {
      if (!this.state.raceStarted && data.horseIndex >= 0 && data.horseIndex < 5) {
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
    this.state.horses.forEach(horse => {
      horse.x = 50;
      horse.speed = 1 + Math.random() * 2;
      horse.finished = false;
    });

    // Update horse positions every 50ms
    const interval = setInterval(() => {
      let allFinished = true;

      this.state.horses.forEach(horse => {
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
    const winningHorseIndex = this.state.horses.findIndex(horse =>
      horse.x >= 700
    );

    console.log("winningHorseIndex", winningHorseIndex);

    this.state.bets.forEach((betHorseIndex, clientId) => {
      if (betHorseIndex === winningHorseIndex) {
        const client = this.clients.find(c => c.sessionId === clientId);
        if (client) {
            console.log("won", clientId);
          client.send("raceResult", {
            won: true,
            horseIndex: winningHorseIndex
          });
        }
      }
    });

    setTimeout(() => {
      this.state.raceStarted = false;
      this.state.bets.clear();
    }, 3000);
  }

  onJoin(client) {
    console.log(client.sessionId, "joined!");
  }

  onLeave(client) {
    console.log(client.sessionId, "left!");
    this.state.bets.delete(client.sessionId);
  }
}

module.exports = HorseRacingRoom;
