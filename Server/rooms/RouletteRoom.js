const { Room } = require("@colyseus/core");
const { firestore, admin } = require("../firebase");
const FieldValue = require('firebase-admin').firestore.FieldValue;

const {
  RoulettePlayer,
  RouletteState,
} = require("../schema/RouletteSchema");
const { ArraySchema } = require("@colyseus/schema");
//const { default: RouletteGame } = require("../../Client/src/page/roulette");

class RouletteRoom extends Room {
  onCreate(options) {
    this.setState(new RouletteState());

    this.maxClients = options.maxPlayers || 3;

    // Add timeout that destroys room if no players join (needed for /create-room endpoint)
    this.emptyRoomTimeout = setTimeout(() => {
      if (this.clients.length === 0) {
        console.log(`Room ${this.roomId} destroyed due to inactivity.`);
        this.disconnect();
      }
    }, 30000);

    // Add logging to track player count
    console.log(`Room created. Current player count: ${this.state.players.size}`);
    this.state.gamePhase = 'waiting'

    // when a bet is made, display where the chip was placed
    this.onMessage("bet", (client, payload) => {
        console.log(client.sessionId + " placed chip at " + payload.chipIndex)
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.bet += 10
          player.chipAlphas[payload.chipIndex] = 100
        }
        this.broadcast("betPlaced", {sessionId: client.sessionId, bet: player.bet, chipIndex: payload.chipIndex})
    })

    // a player readied up
    this.onMessage("ready", (client) => {
      const player = this.state.players.get(client.sessionId);
      player.isReady = true
      this.broadcast("playerReady", {sessionId: client.sessionId, isReady: player.isReady})
      this.checkGameStart()
    })

    // once the game is reset, reset the owner as well
    this.onMessage("resetGame", (client, payload) => {
      console.log("Resetting Game...")
      this.state.owner = ''
      const player = this.state.players.get(client.sessionId);
      player.isReady = false
      player.bet = 0
      player.total += payload.profit
      for (var i=0; i<48; i++) {
        player.chipAlphas[i] = 0.01
      }
      this.broadcast("resetGame", {sessionId: client.sessionId, profit: payload.profit, total: player.total})
    })
  }

  // make sure each player is ready before starting
  checkGameStart() {
    // boolean expression to see if each player is ready
    const allReady = Array.from(this.state.players.values()).every((player) => player.isReady);
    // check which players are ready
    for (const player of this.state.players.values()) {
      console.log(`Player ${player.name} is ready: ${player.isReady}`);
    }
    console.log(`All players ready: ${allReady}`);
    // if all are ready, call spinWheel function
    if (allReady) {
      console.log("Spinning wheel...");
      this.spinWheel();
    }
  }

  getRandInt(min, max) {
    return Math.floor(Math.random() * (max-min+1)) + min
  }
  // "spin the wheel": randomly select values to pass to and signal clients to start the wheel animation
  spinWheel() {
    // number of "slices" around wheel
    var slices = 37
    // number of rotations
    var rounds = this.getRandInt(2, 4);
    // randomly selected stopping point
    var degrees = this.getRandInt(0, 360);
    var spinResult = slices - 1 - Math.floor(degrees / (360 / slices));

    // send data to clients; animation and payout will be handled at clients
    this.broadcast("spinWheel", {rounds: rounds, degrees: degrees, spinResult: spinResult})
  }

  // handles when a player joins
  onJoin(client, options) {
    // ignore if a duplicate ID shows up, otherwise create a new player
    if(this.state.players.has(client.sessionId) || this.state.waitingRoom.has(client.sessionId)) return
    const player = new RoulettePlayer();

    // NEED TO LINK TO THE FIREBASE AUTH TO GET ACTUAL NAME
    player.name = options.name || client.sessionId;
    player.total = 0 // this is total profit/loss on session
    
    // if the game is currently in progress, put them in the waiting room
    if(this.state.gamePhase == "playing")
      this.state.waitingRoom.set(client.sessionId, player);
    // otherwise add like normal, and if they're the room creator, make them the owner
    else {
      this.state.players.set(client.sessionId, player);
      if (this.state.owner == '') {
        this.state.owner = client.sessionId; // set the first player to join as the owner
      }
    }

    // log and broadcast that a new player has joined
    console.log(`Player joined: ${player.name}. Current player count: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`);
    var otherPlayers = []
    if (this.state.players.size > 1) {
      this.state.players.forEach((player, sessionId) => {
        if (sessionId == client.sessionId) {
          // continue
        }
        else {
          // send session ID and what his current bet table looks like
          console.log(player.name)
          otherPlayers.push({
            name: player.name,
            isReady: player.isReady,
            bet: player.bet,
            total: player.total,
            sessionId: sessionId,
            chipAlphas: Array.from(player.chipAlphas)})
        }
      })
    }
    client.send("joinConfirm", {
      sessionId: client.sessionId,
      otherPlayers: otherPlayers
    })
    //this.broadcast("playerJoin", { sessionId: client.sessionId, totalCredits: player.totalCredits, players: this.state.players, waitingRoom: this.state.waitingRoom });
  }

  // handles when a player leaves
  onLeave(client) {
    const player = this.state.players.get(client.sessionId);

    // if the player was found in the active players
    if (player) {
      // remove player
      this.state.players.delete(client.sessionId);
    }
    // if not found, check the watiting room and remove from there
    else {
      const waitingPlayer = this.state.waitingRoom.get(client.sessionId);
      if(waitingPlayer)
        this.state.waitingRoom.delete(client.sessionId)
    }
    // if the room owner was the once that left, then make the next guy in line the owner
    if (!this.state.players.has(this.state.owner))
      this.state.owner = this.state.players.keys().next().value

    console.log(`Player left. Remaining players: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`);

    // if there is nobody remaining in the room, then destroy it
    if(this.state.players.size == 0) {
      console.log("No players remain, destroying room")
      this.broadcast("roomDestroyed")
      this.disconnect()
    }
    // otherwise tell the clients that someone left
    else
      this.broadcast("playerLeft", { sessionId: client.sessionId, players: this.state.players});
  }
}

module.exports = { RouletteRoom };
