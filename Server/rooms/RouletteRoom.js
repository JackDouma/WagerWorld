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
  constructor(firestore) {
    super();
    this.firestore = firestore;
  }

  onCreate(options) {
    this.setState(new RouletteState());
    this.autoDispose = false;

    this.maxClients = options.maxPlayers || 3;

    // Add timeout that destroys room if no players join (needed for /create-room endpoint)
    // this.emptyRoomTimeout = setTimeout(() => {
    //   if (this.clients.length === 0) {
    //     console.log(`Room ${this.roomId} destroyed due to inactivity.`);
    //     this.disconnect();
    //   }
    // }, 30000);

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
      if (player) {
        console.log(player.totalCredits)
        player.totalCredits -= player.bet
        console.log(player.totalCredits)
        firestore.collection('users').doc(player.fireBaseId).get()
        .then(doc => {
          if (!doc.exists) 
          {
            console.warn(`User doc not found for ${player.fireBaseId}`);
            return;
          }
          return firestore.collection('users').doc(player.fireBaseId).update({
            balance: player.totalCredits,
          });
        })
        .then(() => {
          console.log(`Balance updated for ${player.fireBaseId}`);
        })
        .catch((error) => {
          console.error(`Error updating user ${player.fireBaseId}:`, error);
        });
        player.isReady = true
        this.broadcast("playerReady", {sessionId: client.sessionId, isReady: player.isReady})
        this.checkGameStart()      
      }
    })

    // once the game is reset, reset the owner as well
    this.onMessage("resetGame", (client, payload) => {
      console.log("Resetting Game...")
      this.state.owner = ''
      const player = this.state.players.get(client.sessionId);
      player.startingCredits += payload.profit
      firestore.collection('users').doc(player.fireBaseId).get()
          .then(doc => {
            if (!doc.exists) 
            {
              console.warn(`User doc not found for ${player.fireBaseId}`);
              return;
            }
  
            const result = player.totalCredits - player.startingCredits;
  
            const historyEntry = {
              date: new Date(),
              gameName: "Roulette",
              result: result
            };

            console.log(player.startingCredits, payload.profit, result)
  
            return firestore.collection('users').doc(player.fireBaseId).update({
              balance: player.startingCredits,
              gameHistory: FieldValue.arrayUnion(historyEntry)
            });
          })
          .then(() => {
            console.log(`Balance and game history updated for ${player.fireBaseId}`);
          })
          .catch((error) => {
            console.error(`Error updating user ${player.fireBaseId}:`, error);
          });

      player.isReady = false
      player.bet = 0
      player.total += payload.profit
      player.startingCredits = player.totalCredits
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
  async onJoin(client, options) {
    // ignore if a duplicate ID shows up, otherwise create a new player
    if(this.state.players.has(client.sessionId) || this.state.waitingRoom.has(client.sessionId)) return
    const player = new RoulettePlayer();

    var playerName = "";
    if (options.playerId || this.playerId) {
      try {
        const playerDoc = await firestore.collection("users").doc(options.playerId).get();
        if (playerDoc.exists) {
          player.fireBaseId = options.playerId;
          playerName = playerDoc.data().name;
          player.name = playerName;
          player.total = 0 // this is total profit/loss on session
          console.log(`${playerName} joined!`);
        } else {
          console.log(`Player with ID ${options.playerId} not found.`);
        }
      } catch (error) {
        console.error("Error fetching player data:", error);
      }
    }

    player.totalCredits = options.balance || 10_000
    player.startingCredits = player.totalCredits
    
    // if the game is currently in progress, put them in the waiting room
    if(this.state.gamePhase == "playing")
      this.state.waitingRoom.set(client.sessionId, player);
    // otherwise add like normal, and if they're the room creator, make them the owner
    else {
      this.state.players.set(client.sessionId, player);
      if (this.state.owner == '' || this.state.owner === undefined) {
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

      // Update isInGame to false
      firestore.collection("users").doc(player.fireBaseId).update({
          isInGame: false,
      });
    }
    // if not found, check the watiting room and remove from there
    else {
      const waitingPlayer = this.state.waitingRoom.get(client.sessionId);
      if(waitingPlayer)
      {
        this.state.waitingRoom.delete(client.sessionId)
        firestore.collection("users").doc(client.sessionId).update({
          isInGame: false,
        });
      }
    }
    // if the room owner was the once that left, then make the next guy in line the owner
    if (!this.state.players.has(this.state.owner))
      this.state.owner = this.state.players.keys().next().value

    console.log(`Player left. Remaining players: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`);

    // if there is nobody remaining in the room, then destroy it
    // if(this.state.players.size == 0) {
    //   console.log("No players remain, destroying room")
    //   this.broadcast("roomDestroyed")
    //   this.disconnect()
    // }
    // otherwise tell the clients that someone left
    // else
    this.broadcast("playerLeft", { sessionId: client.sessionId, players: this.state.players});
  }

  // handles when the room is disposed
  onDispose() {
    console.log("Here disposing...")
    // make sure all clients are set to not in game
    this.state.players.forEach((player) => {
      firestore.collection("users").doc(player.fireBaseId).update({
        isInGame: false,
      });
    });
  }
}

module.exports = { RouletteRoom };
