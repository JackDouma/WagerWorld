const { Room } = require("@colyseus/core");
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
          player.bet = 0
          player.totalCredits -= 10
          player.chipAlphas[payload.chipIndex] = 100
          this.checkGameStart(client.sessionId);
        }
        this.broadcast("betPlaced", {player: player.name, chipIndex: payload.chipIndex})
    })

    // once the game is reset, reset the owner as well
    this.onMessage("resetGame", (client) => {
      console.log("Resetting Game...")
      this.state.owner = ''
      const player = this.state.players.get(client.sessionId);
      for (var i=0; i<48; i++) {
        player.chipAlphas[i] = 0.01
      }
      this.broadcast("resetGame", {client: client.sessionId})
    })
  }

  // make sure each player is ready before starting
  checkGameStart(sessionId) {
    // boolean expression to see if each player is ready
    const allReady = Array.from(this.state.players.values()).every((player) => player.isReady);
    // check which players are ready
    for (const player of this.state.players.values()) {
      console.log(`Player ${player.name} is ready: ${player.isReady}`);
    }
    console.log(`All players ready: ${allReady}`);
    // if all are ready, signal to the clients to start the game
    if (allReady) {
      console.log("Starting game...");
      this.startGame();
    }
    // otherwise, signal the client that readied up to wait for everyone else
    else {
      console.log("waiting...")
      this.broadcast("waitForOthers", { user: sessionId })
    }
  }

  // handles when a player joins
  onJoin(client, options) {
    // ignore if a duplicate ID shows up, otherwise create a new player
    if(this.state.players.has(client.sessionId) || this.state.waitingRoom.has(client.sessionId)) return
    const player = new RoulettePlayer();

    // NEED TO LINK TO THE FIREBASE AUTH TO GET ACTUAL NAME AND BALANCE
    player.name = options.name || client.sessionId;
    player.totalCredits = options.balance || 10_000
    
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
          console.log(sessionId, Array.from(player.chipAlphas))
          otherPlayers.push({
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
