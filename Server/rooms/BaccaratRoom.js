const { Room } = require("@colyseus/core");
const { BaccaratPlayer, BaccaratState } = require("../schema/BaccaratSchema");
const { ArraySchema } = require("@colyseus/schema");
const { firestore, admin } = require("../firebase");
const FieldValue = require("firebase-admin").firestore.FieldValue;

class BaccaratRoom extends Room {
  constructor(firestore) {
    super();
    this.firestore = firestore;
    this.players = [];
    this.readyPlayers = new Set();
    this.bets = [];
    this.playerCards = [];
    this.bankerCards = [];
    this.results = [];
    this.gameReset = true;
    this.ongoingGame = false;
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
    this.autoDispose = false;

    this.onMessage("playerReady", (client, message) => {
      const playerId = message.playerId;

      if (!this.readyPlayers.has(client.id)) {
        this.readyPlayers.add(client.id);
      }

      // check if all players are ready
      const allPlayerIds = this.players.map((player) => player.id);
      if (
        allPlayerIds.length > 0 &&
        allPlayerIds.every((id) => this.readyPlayers.has(id))
      ) {
        this.broadcast("allPlayersReady", {
          message: "All players are ready!",
        });
      }
    });

    this.onMessage("resetGame", (client, message) => {
      if (this.gameReset) {
        this.gameReset = false;
        this.players = [];
        this.readyPlayers = new Set();
        this.bets = [];
        this.playerCards = [];
        this.bankerCards = [];
        this.results = [];
        this.ongoingGame = false;
      }
    });

    this.onMessage("bet", (client, message) => {
      const { playerId, playerName, betAmount, betOption } = message;

      // add the bet to the bets list
      this.bets.push({ playerId, playerName, betAmount, betOption });

      // check if the number of bets equals the number of ready players
      if (this.bets.length === this.readyPlayers.size) {
        this.broadcast("allBetsPlaced", {
          message: "All players have placed their bets!",
        });
      }
    });

    this.onMessage("dealInitial", (client, message) => {
      if (!this.playerCards.length && !this.bankerCards.length) {
        const dealtCards = new Set();

        const generateUniqueCard = () => {
          let card;
          do {
            const cardValue =
              this.values[Math.floor(Math.random() * this.values.length)];
            const cardSuit =
              this.suits[Math.floor(Math.random() * this.suits.length)];
            card = `${cardValue}_of_${cardSuit}`;
          } while (dealtCards.has(card));
          dealtCards.add(card);
          return card;
        };

        // generate cards for the player and banker
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
      this.gameReset = true;

      const { playerId, initialBalance, betAmount, winningBetOption } = message;

      // find the player's bet in the bets list
      const playerBet = this.bets.find((bet) => bet.playerId === playerId);

      // determine if the winningBetOption matches the player's betOption
      const isBetCorrect =
        playerBet && playerBet.betOption === winningBetOption;

      // calculate the updated balance
      const updatedBalance = isBetCorrect
        ? initialBalance + betAmount
        : initialBalance - betAmount;

      // push the player's result to the results list using playerName
      const resultEntry = {
        playerName: playerBet.playerName,
        result: isBetCorrect ? betAmount : -betAmount,
      };
      this.results.push(resultEntry);

      // update the player's balance in Firebase
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
            result: isBetCorrect ? betAmount : -betAmount,
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
      // return results list with player names
      this.broadcast("allResults", {
        results: this.results,
      });
    });

    this.onMessage("startOngoingGame", (client, message) => {
      this.ongoingGame = true;
    });
  }

  // handles when a player joins
  async onJoin(client, options) {
    if (!this.ongoingGame) {
      const playerId = options.playerId || client.id;
      const playerName = options.playerName || "Anonymous";

      const playerExists = this.players.some(
        (player) => player.id === client.id
      );
      if (!playerExists) {
        this.players.push({ id: client.id, name: playerName });

        this.broadcast("playerListUpdate", { players: this.players });
      }
    }
    else {
      client.send("cannotJoin", { message: `Game ongoing! Please wait for the current game to finish first.` });
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
    }

    this.broadcast("playerListUpdate", { players: this.players });
  }
}

module.exports = { BaccaratRoom };
