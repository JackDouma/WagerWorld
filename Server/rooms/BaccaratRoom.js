const { Room } = require("@colyseus/core");
const admin = require("../firebase");
const { BaccaratPlayer, BaccaratState } = require("../schema/BaccaratSchema");
const { ArraySchema } = require("@colyseus/schema");

class BaccaratRoom extends Room {
  constructor(firestore) {
    super();
    this.firestore = firestore;
    this.winningBetType = "";
  }

  onCreate(options) {
    this.customRoomId = options.customRoomId;
    this.autoDispose = false;
    this.setState(new BaccaratState());

    this.maxClients = options.maxPlayers || 5;

    console.log(
      `Room ${this.roomId} created. Current player count: ${this.state.players.size}`
    );

    this.state.gamePhase = "waiting";

    this.onMessage("setWinningBetType", (client, message) => {
      // TODO message should be just a string of the winner
      this.winningBetType = message;
    });

    // when a bet is made take the clients money and put them in ready state
    this.onMessage("bet", (client, message) => {
      //TODO: message should be: "500 on player", "100 on tie", "5 on banker"

      console.log(client.sessionId + " is betting " + message.value);
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.bet = message.value.split(" ")[0];
        player.totalCredits -= player.bet;
        player.betType = message.value.split(" ").pop();
        player.isReady = true;
        this.checkGameStart(client.sessionId);
      }
    });

    // once the disconnection has been fully handled, open up any additional disconnection messages coming in
    this.onMessage("disconnectionHandled", (client) => {
      this.state.disconnectCheck = false;
    });

    // once the game is reset, reset the owner as well
    this.onMessage("newGame", (client) => {
      // const waiters = this.state.waitingRoom
      const waitingPlayers = Array.from(this.state.waitingRoom.keys());
      console.log("waiters", waitingPlayers);
      while (
        waitingPlayers.length > 0 &&
        this.state.players.size < this.maxClients
      ) {
        const nextPlayerId = waitingPlayers.shift();
        const player = this.state.waitingRoom.get(nextPlayerId);
        if (player) {
          this.state.players.set(nextPlayerId, player);
          this.state.waitingRoom.delete(nextPlayerId);
          //   player.hand = new ArraySchema();
          this.broadcast("playerJoin", {
            playerName: player.name,
            sessionId: nextPlayerId,
            totalCredits: player.totalCredits,
            players: this.state.players,
            waitingRoom: this.state.waitingRoom,
          });
        }
      }
      this.broadcast("newGame", { waitingRoom: this.state.waitingRoom });
    });
  }

  // make sure each player is ready and has a bet in before starting
  checkGameStart(sessionId) {
    // boolean expression to see if each player is ready
    const allReady = Array.from(this.state.players.values()).every(
      (player) => player.isReady
    );
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
      console.log("waiting...");
      this.broadcast("waitForOthers", { user: sessionId });
    }
  }

  startGame() {
    this.state.gamePhase = "playing";
    console.log("Game started");
    this.broadcast("gameStart", {
      owner: this.state.owner,
      gamePhase: this.state.gamePhase,
    });
  }

  winCheck() {
    // // initializing results
    // const results = {};
    // const payouts = {};

    // for each player, get their winnings and number results, where 0 = win, 1 = dealer wins, 2 = push, 3 = player busts

    this.state.players.forEach((player, sessionId) => {
      console.log(
        player.name +
          " started with " +
          (player.totalCredits + player.bet) +
          " and bet " +
          player.bet +
          " on " +
          player.betType
      );

      //   if (playerValue > 21) {
      //     results[sessionId] = 3;
      //   } else if (dealerValue > 21 || playerValue > dealerValue) {
      //     results[sessionId] = 0;
      //     player.totalCredits += (player.bet * 2);
      //   } else if (playerValue < dealerValue) {
      //     results[sessionId] = 1;
      //   } else if (playerValue === dealerValue) {
      //     results[sessionId] = 2;
      //     player.totalCredits += player.bet;
      //   }
      //   player.bet = 0;
      //   payouts[sessionId] = player.totalCredits;
    });

    if (player.betType === this.winningBetType) {
      player.totalCredits += player.bet;
    }

    // set game phase to 'done', and broadcast the results back to the clients
    // this.state.gamePhase = "done"
    // this.broadcast("dealerResult", { dealerHand: this.state.dealer.hand, playerResults: results, winnings: payouts })

    this.state.gamePhase = "waiting";
    // this.state.dealer = new BlackjackPlayer()
    // this.initializeDeck()

    this.state.players.forEach((player) => {
      player.bet = 0;
      player.betType = "";
      //   player.hand = new ArraySchema()
      //   player.handValue = 0
      player.isReady = false;
    });
  }

  onGameFinished() {
    console.log(`Room ${this.customRoomId} Finished.`);

    this.clients.forEach((client) => {
      const player = this.state.players.get(client.sessionId);

      if (player && this.firestore) {
        this.firestore
          .collection("players")
          .doc(client.id)
          .update({
            totalCredits: admin.firestore.FieldValue.increment(
              player.totalCredits
            ),
          })
          .then(() => {
            console.log(`Player ${client.id} credits updated in Firestore.`);
          })
          .catch((error) => {
            console.error(
              `Error updating player ${client.id} credits in Firestore:`,
              error
            );
          });
      } else {
        console.warn(
          `Player ${client.id} not found in room state or Firestore not initialized.`
        );
      }
    });
  }

  async onJoin(client, options) {
    console.log(options);
    console.log(this.playerId);
    if (
      this.state.players.has(client.sessionId) ||
      this.state.waitingRoom.has(client.sessionId)
    )
      return;

    const player = new BaccaratPlayer();

    var playerName = "";
    if (options.playerId || this.playerId) {
      try {
        const playerDoc = await admin.firestore
          .collection("users")
          .doc(options.playerId)
          .get();
        if (playerDoc.exists) {
          player.fireBaseId = options.playerId;
          playerName = playerDoc.data().name;
          player.name = playerName;
          console.log(`${playerName} joined!`);
        } else {
          console.log(`Player with ID ${options.playerId} not found.`);
        }
      } catch (error) {
        console.error("Error fetching player data:", error);
      }

      player.totalCredits = options.balance || 10_000;

      // if the game is currently in progress, put them in the waiting room
      if (this.state.gamePhase == "playing")
        this.state.waitingRoom.set(client.sessionId, player);
      // otherwise add like normal, and if they're the room creator, make them the owner
      else {
        this.state.players.set(client.sessionId, player);
        if (this.state.owner == "" || this.state.owner === undefined) {
          this.state.owner = client.sessionId; // set the first player to join as the owner
        }
      }

      // log and broadcast that a new player has joined
      console.log(
        `Player joined: ${player.name}. Current player count: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`
      );
      console.log(player.totalCredits);
      this.broadcast("playerJoin", {
        playerName: player.name,
        sessionId: client.sessionId,
        totalCredits: player.totalCredits,
        players: this.state.players,
        waitingRoom: this.state.waitingRoom,
      });
    }
  }
}

module.exports = { BaccaratRoom };
