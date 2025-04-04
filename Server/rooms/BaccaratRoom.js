const { Room } = require("@colyseus/core");
// const admin = require("../firebase");
const { BaccaratPlayer, BaccaratState } = require("../schema/BaccaratSchema");
const { ArraySchema } = require("@colyseus/schema");
// const { FieldValue } = require("firebase-admin/firestore"); // Add this import
// const { Room } = require("@colyseus/core");
const { firestore, admin } = require("../firebase");
const FieldValue = require("firebase-admin").firestore.FieldValue;

class BaccaratRoom extends Room {
  constructor(firestore) {
    super();
    this.firestore = firestore;
    this.players = []; // List to store player names
    this.readyPlayers = new Set(); // Set to store ready player IDs
    this.bets = []; // List to store bets
    this.playerCards = [];
    this.bankerCards = [];
    this.results = [];
    // this.resetGame = true;
    this.gameReset = true;
    this.values = [
      "2",
      "3",
      "4",
      "5",
      "6",
      "7",
      "8",
      "9",
      "10",
      "jack",
      "queen",
      "king",
      "ace",
    ];
    this.suits = ["spades", "clubs", "diamonds", "hearts"];
  }

  onCreate(options) {
    // if (this.resetGame) {
    //   console.log("***** GAME HAS BEEN RESET! *****");
    //   this.resetGame = false;
    //   this.players = [];
    //   this.readyPlayers = new Set();
    //   this.bets = [];
    //   this.playerCards = [];
    //   this.bankerCards = [];
    //   this.results = [];
    // }
    // console.log("FIRESTORE INSTANCE: ", this.firestore);

    this.autoDispose = false;
    // this.maxClients = options.maxPlayers || 5;

    this.onMessage("playerReady", (client, message) => {
      const playerId = message.playerId;

      if (!this.readyPlayers.has(client.id)) {
        this.readyPlayers.add(client.id);
        // console.log(`Player ${playerId} is ready.`);
      } else {
        // console.log(`Player ${playerId} was already marked as ready.`);
      }

      // check if all players are ready
      const allPlayerIds = this.players.map((player) => player.id);
      if (
        allPlayerIds.length > 0 &&
        allPlayerIds.every((id) => this.readyPlayers.has(id))
      ) {
        // console.log("All players are ready!");
        this.broadcast("allPlayersReady", {
          message: "All players are ready!",
        });
      }
    });

    this.onMessage("resetGame", (client, message) => {
      if (this.gameReset) {
        console.log("GAMERESET: FALSE (reset game)");
        this.gameReset = false;
        this.players = [];
        this.readyPlayers = new Set();
        this.bets = [];
        this.playerCards = [];
        this.bankerCards = [];
        this.results = [];
      }
    });

    this.onMessage("bet", (client, message) => {
      const { playerId, playerName, betAmount, betOption } = message;

      // Add the bet to the bets list
      this.bets.push({ playerId, playerName, betAmount, betOption });

      // console.log(`Player ${playerId} placed a bet:`, { betAmount, betOption });

      // Check if the number of bets equals the number of ready players
      if (this.bets.length === this.readyPlayers.size) {
        // console.log("All players have placed their bets!");

        // Broadcast to all clients that all bets are placed
        this.broadcast("allBetsPlaced", {
          message: "All players have placed their bets!",
        });
      }
    });

    this.onMessage("dealInitial", (client, message) => {
      if (!this.playerCards.length && !this.bankerCards.length) {
        const dealtCards = new Set();

        // Helper function to generate a unique card
        const generateUniqueCard = () => {
          let card;
          do {
            const cardValue =
              this.values[Math.floor(Math.random() * this.values.length)];
            const cardSuit =
              this.suits[Math.floor(Math.random() * this.suits.length)];
            card = `${cardValue}_of_${cardSuit}`;
          } while (dealtCards.has(card)); // Ensure the card has not been dealt
          dealtCards.add(card); // Mark the card as dealt
          return card;
        };

        // Generate cards for the player and banker
        this.playerCards = [
          generateUniqueCard(),
          generateUniqueCard(),
          generateUniqueCard(),
        ];

        this.bankerCards = [
          generateUniqueCard(),
          generateUniqueCard(),
          generateUniqueCard(),
        ];
      }

      // Broadcast the same dealt cards to all clients
      this.broadcast("initialCardsDealt", {
        playerCard1: this.playerCards[0],
        playerCard2: this.playerCards[1],
        playerCard3: this.playerCards[2],
        bankerCard1: this.bankerCards[0],
        bankerCard2: this.bankerCards[1],
        bankerCard3: this.bankerCards[2],
      });
    });

    this.onMessage("getPlayerBets", (client, message) => {
      this.broadcast("playerBets", {
        bets: this.bets,
      });
    });

    this.onMessage("gameFinished", (client, message) => {
      console.log("GAMERESET: TRUE");
      this.gameReset = true;
      
      const { playerId, initialBalance, betAmount, winningBetOption } = message;

      // Find the player's bet in the bets list
      const playerBet = this.bets.find((bet) => bet.playerId === playerId);

      // console.log("INITIAL BALANCE:", initialBalance);
      // console.log("PLAYER'S BET WAS:", playerBet.betOption);
      // console.log("WINNING BET IS:", winningBetOption);

      // Determine if the winningBetOption matches the player's betOption
      const isBetCorrect =
        playerBet && playerBet.betOption === winningBetOption;

      // console.log("IS BET CORRECT:", isBetCorrect);

      // Calculate the updated balance
      const updatedBalance = isBetCorrect
        ? initialBalance + betAmount // Bet matches, add betAmount
        : initialBalance - betAmount; // Bet does not match, subtract betAmount

      // console.log("UPDATED BALANCE:", updatedBalance);

      // Push the player's result to the results list using playerName
      const resultEntry = {
        playerName: playerBet.playerName, // Use playerName instead of playerId
        result: isBetCorrect ? betAmount : -betAmount, // Positive for win, negative for loss
      };
      this.results.push(resultEntry);

      // console.log("RESULTS LIST:", this.results);

      // Update the player's balance in Firebase
      firestore
        .collection("users")
        .doc(playerId)
        .get()
        .then((doc) => {
          if (!doc.exists) {
            console.warn(`User doc not found for ${playerId}`);
            return;
          }

          const historyEntry = {
            date: new Date(),
            gameName: "Baccarat",
            result: isBetCorrect ? betAmount : -betAmount, // Log positive for win, negative for loss
          };

          return firestore
            .collection("users")
            .doc(playerId)
            .update({
              balance: updatedBalance,
              gameHistory: FieldValue.arrayUnion(historyEntry),
            });
        })
        .then(() => {
          // console.log(
          //   `Balance updated for player ${playerId}. New balance: ${updatedBalance}`
          // );
        })
        .catch((error) => {
          console.error(
            `Error updating balance for player ${playerId}:`,
            error
          );
        });
    });

    this.onMessage("getResults", (client, message) => {
      // this.gameReset = false;

      // Return results list with player names
      this.broadcast("allResults", {
        results: this.results,
      });
    });

    // this.onMessage("setGameReset", (client, message) => {
    //   this.gameReset = false;
    // });

    // this.onMessage("clearPlayers", (client, message) => {
    //   console.log("ENTERED GAME RESET...")
    //   if (!this.gameReset) {
    //     console.log("GAME RESET.")
    //     this.gameReset = true;
    //     if (message.roomId === this.roomId) {
    //       // Clear all players and ready players
    //       this.players = [];
    //       this.readyPlayers.clear();
    //       this.bets = [];
    //       this.playerCards = [];
    //       this.bankerCards = [];
    //       this.results = [];

    //       // this.broadcast("playersCleared", {});
    //     }
    //   }
    // });
  }

  // handles when a player joins
  async onJoin(client, options) {
    const playerId = options.playerId || client.id;
    const playerName = options.playerName || "Anonymous";

    const playerExists = this.players.some((player) => player.id === client.id);
    if (!playerExists) {
      this.players.push({ id: client.id, name: playerName });

      this.broadcast("playerListUpdate", { players: this.players });

      // console.log("Current players:", this.players);
    } else {
      // console.log(`Player with id ${client.id} is already in the list.`);
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
      // console.log(`Player ${client.id} removed from ready list.`);
    }

    this.broadcast("playerListUpdate", { players: this.players });
    // console.log("Current players after leave:", this.players);
  }
}

module.exports = { BaccaratRoom };
