const { Room } = require("@colyseus/core");
const { Schema, type, MapSchema, ArraySchema } = require("@colyseus/schema");
const admin = require("../firebase");
const { firestore } = require("firebase-admin");
const FieldValue = require('firebase-admin').firestore.FieldValue;

class Horse extends Schema {
  constructor(id) {
    super();
    this.id = id;
    this.x = 50;
    this.speed = 0;
    this.finished = false;
    this.color = this.getRandomColor();
    this.stamina = Math.random() * 0.5 + 0.9;
    this.acceleration = Math.random() * 0.5 + 0.9;
    this.consistency = Math.random() * 0.5 + 0.9;
    this.odds = 0;
  }

  getRandomColor() {
    const colors = ["red", "blue", "green", "yellow", "purple"];
    return colors[Math.floor(Math.random() * colors.length)];
  }
}

type("string")(Horse.prototype, "id");
type("number")(Horse.prototype, "x");
type("number")(Horse.prototype, "speed");
type("boolean")(Horse.prototype, "finished");
type("string")(Horse.prototype, "color");
type("number")(Horse.prototype, "stamina");
type("number")(Horse.prototype, "acceleration");
type("number")(Horse.prototype, "consistency");
type("number")(Horse.prototype, "odds");

class Player extends Schema {
  constructor() {
    super();
    this.name = "";
    this.totalCredits = 1000;
    this.betAmount = 0;
    this.isReady = false;
    this.firebaseId = "";
  }
}



type("string")(Player.prototype, "name");
type("number")(Player.prototype, "totalCredits");
type("number")(Player.prototype, "betAmount");
type("boolean")(Player.prototype, "isReady");
type("string")(Player.prototype, "firebaseId");



class RaceState extends Schema {
  constructor() {
    super();
    this.horses = new ArraySchema();
    this.raceStarted = false;
    this.gamePhase = "waiting";
    this.bets = new MapSchema();
    this.players = new MapSchema();
    this.winners = new ArraySchema();
  }
}

type([Horse])(RaceState.prototype, "horses");
type("boolean")(RaceState.prototype, "raceStarted");
type("string")(RaceState.prototype, "gamePhase");
type({ map: "string" })(RaceState.prototype, "bets");
type({ map: Player })(RaceState.prototype, "players"); // Fixed here
type(["string"])(RaceState.prototype, "winners");



class HorseRacingRoom extends Room {
  onCreate(options) {
    this.autoDispose = false;
    this.maxClients = 10;
    this.setState(new RaceState());

    for (let i = 0; i < 5; i++) {
      this.state.horses.push(new Horse(`${i}`));
    }
    this.calculateOdds();

    /**
     * when server recieves a placeBet message from the client
     *  checks if the game phase is waiting
     * checks if the horse index is valid
     * checks if the bet amount is valid
     * checks if the player has enough credits
     */
    this.onMessage("placeBet", (client, data) => {
      if (this.state.gamePhase === "waiting" && 
          data.horseIndex >= 0 && 
          data.horseIndex < 5 && 
          data.amount > 0) {
        const player = this.state.players.get(client.sessionId);
        if (player && player.totalCredits >= data.amount) {
          player.betAmount = data.amount;
          player.isReady = true;
          player.totalCredits -= data.amount;
          this.state.bets.set(client.sessionId, JSON.stringify({
            horseIndex: data.horseIndex,
            amount: data.amount
          }));
          this.broadcast("betPlaced", {
            sessionId: client.sessionId,
            horseIndex: data.horseIndex,
            amount: data.amount
          });
          this.checkRaceStart();
        }
      }
    });

    this.onMessage("startRace", (client) => {
      if (this.state.gamePhase === "waiting" && this.state.players.get(client.sessionId)) {
        this.startRace();
      }
    });

    this.onMessage("getHorseStats", (client) => {
      client.send("horseStats", this.getHorseStatsAndOdds());
    });
  }

  calculateOdds() {
    const totalScore = this.state.horses.reduce((sum, horse) => {
      const score = (horse.stamina + horse.acceleration + horse.consistency) / 3;
      return sum + score;
    }, 0);

    this.state.horses.forEach(horse => {
      const avgStat = (horse.stamina + horse.acceleration + horse.consistency) / 3;
      horse.odds = Math.max(1.5, (totalScore / avgStat).toFixed(2));
    });
  }

  /**
   * returns the stats and odds of all horses
   * used to sync the stats with the client
   **/ 
  getHorseStatsAndOdds() {
    return this.state.horses.map(horse => ({
      id: horse.id,
      color: horse.color,
      stats: {
        stamina: horse.stamina,
        acceleration: horse.acceleration,
        consistency: horse.consistency
      },
      odds: horse.odds
    }));
  }
  /**
   * checks if all players are ready
   * if waiting for bets is true broadcasts the number of players
   **/
  checkRaceStart() {
    const allReady = Array.from(this.state.players.values()).every(p => p.isReady);
    if (allReady && this.state.players.size > 0) {
      this.startRace();
    } else {
      this.broadcast("waitingForBets", { readyCount: Array.from(this.state.players.values()).filter(p => p.isReady).length });
    }
  }
  /**
   * updates state of game
   * sets the game phase to racing
   * constantly updates the horses position 
   * and speed
   */
  startRace() {
    this.state.gamePhase = "racing";
    this.state.raceStarted = true;

    this.state.horses.forEach((horse) => {
      horse.x = 50;
      const baseSpeed = 1 + Math.random() * 2;
      horse.speed = baseSpeed * horse.acceleration * horse.stamina * (0.8 + horse.consistency * 0.8);
      horse.finished = false;
    });

    const interval = setInterval(() => {
      let allFinished = true;

      this.state.horses.forEach((horse) => {
        if (!horse.finished) {
          horse.speed *= (0.98 + horse.stamina * 0.02);
          horse.x += horse.speed;
          if (horse.x >= 700) {
            horse.finished = true;
            if (!this.state.winners.includes(horse.id)) {
              this.state.winners.push(horse.id);
            }
          } else {
            allFinished = false;
          }
        }
      });

      this.broadcast("raceUpdate", {
        horses: this.state.horses,
        winners: this.state.winners
      });

      if (allFinished) {
        clearInterval(interval);
        this.endRace();
      }
    }, 50);
  }
  /**
   * calls after rands ends
   * broadcasts the result to all players
   * updates the players balance in firestore
   */
  endRace() {
    this.state.gamePhase = "results";
    
    const payouts = {};
    this.state.bets.forEach((betStr, clientId) => {
      const bet = JSON.parse(betStr);
      const player = this.state.players.get(clientId);
      if (player) {
        const winningHorseId = this.state.winners[0];
        const won = parseInt(winningHorseId) === bet.horseIndex;
        const payout = won ? Math.floor(bet.amount * this.state.horses[bet.horseIndex].odds) : 0;
        payouts[clientId] = {
          won,
          amount: payout,
          horseIndex: bet.horseIndex,
          odds: this.state.horses[bet.horseIndex].odds
        };
        player.totalCredits += payout;
        this.updatePlayerFirestore(clientId, player, won, bet.amount, payout);
      }
    });

    this.broadcast("raceResult", {
      winners: this.state.winners,
      payouts,
      horseStats: this.getHorseStatsAndOdds()
    });

    setTimeout(() => {
      this.resetRace();
    }, 5000);
  }

  async updatePlayerFirestore(clientId, player, won, betAmount, payout) {
    try {
      // Update the player's balance and game history in Firestore
      // do the result based on if the player won or lost 
      // if won, add the payout to the balance, else subtract the bet amount
      const result = won ? payout - betAmount : -betAmount;
      player.totalCredits += result;
      await admin.firestore.collection("users").doc(clientId).update({
        balance: player.totalCredits,
        gameHistory: FieldValue.arrayUnion({
          date: new Date(),
          gameName: "HorseRacing",
          result,
          bet: betAmount,
          payout: won ? payout : 0
        })
      });
      const client = this.clients.find(c => c.sessionId === clientId);
      this.broadcast("playerUpdate", {
        sessionId: client.sessionId,
        totalCredits: player.totalCredits,
      });
    } catch (error) {
      console.error(`Error updating player ${clientId}:`, error);
    }
  }
  /**
   * sets game phase to waiting
   * resets the horses positions
   * resets the bets and winners  
   * resets the players bets
   * calculates the odds
   * broadcasts the horse stats to all players
   */
  async resetRace() {
    this.state.gamePhase = "waiting";
    this.state.raceStarted = false;
    this.state.bets.clear();
    this.state.winners.clear();
    this.state.horses.forEach(horse => {
      horse.x = 50;
      horse.speed = 0;
      horse.finished = false;
      horse.stamina = Math.random() * 0.5 + 0.9;
      horse.acceleration = Math.random() * 0.5 + 0.9;
      horse.consistency = Math.random() * 0.5 + 0.9;
    });
    this.calculateOdds();
    
    this.state.players.forEach(async player => {
      player.betAmount = 0;
      player.isReady = false;

    });
    this.broadcast("raceReset", { horseStats: this.getHorseStatsAndOdds() });
  }

  /**
   * called when a player joins
   * checks if the player is already in the game
   * if not, adds the player to the state
   * updates the firestore
   * broadcasts the player join event to all players
   * sends the horse stats to the player
   **/
  async onJoin(client, options) {
    if (this.state.players.has(client.sessionId)) return;

    const player = new Player();
    try {
      const playerDoc = await admin.firestore
        .collection("users")
        .doc(options.playerId)
        .get();
      
      if (playerDoc.exists) {
        const data = playerDoc.data();
        player.name = data.name;
        player.totalCredits = options.balance || 10_000;
        player.firebaseId = options.playerId;
        client.sessionId = options.playerId;
        this.state.players.set(client.sessionId, player);
        console.log(`${player.name} joined! Credits: ${player.totalCredits}`);
        
        await admin.firestore
          .collection("users")
          .doc(client.sessionId)
          .update({ isInGame: true });
      }
    } catch (error) {
      console.error("Error in onJoin:", error);
    }

    this.broadcast("playerJoin", {
      sessionId: client.sessionId,
      name: player.name,
      totalCredits: player.totalCredits,
      horseStats: this.getHorseStatsAndOdds()
    });
  }

  /**
   * called when a player leaves
   * removes the player from the state
   * updates the firestore
   * broadcasts the player leave event to all players
   */
  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      this.state.players.delete(client.sessionId);
      this.state.bets.delete(client.sessionId);
      
      admin.firestore.collection("users").doc(player.firebaseId).update({
        isInGame: false
      });
      
      console.log(`${player.name} left!`);
      this.broadcast("playerLeft", { sessionId: client.sessionId });
    }

    if (this.state.players.size === 0) {
      this.resetRace();
    }
  }

  onDispose() {
    
    this.state.players.forEach((_) => {
      console.log("Player left + " + _.firebaseId);
      admin.firestore().collection("users").doc(_.firebaseId).update({
        isInGame: false
      });
    });
    console.log("Room disposed");
    // delete room

  }
}

module.exports = HorseRacingRoom;