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
    this.bets = []; // List to store bets
    this.playerCards = [];
    this.bankerCards = [];
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
    // this.maxClients = options.maxPlayers || 5;

    this.onMessage("playerReady", (client, message) => {
      const playerId = message.playerId;

      if (!this.readyPlayers.has(client.id)) {
        this.readyPlayers.add(client.id);
        console.log(`Player ${playerId} is ready.`);
      } else {
        console.log(`Player ${playerId} was already marked as ready.`);
      }

      // check if all players are ready
      const allPlayerIds = this.players.map((player) => player.id);
      if (
        allPlayerIds.length > 0 &&
        allPlayerIds.every((id) => this.readyPlayers.has(id))
      ) {
        console.log("All players are ready!");
        this.broadcast("allPlayersReady", {
          message: "All players are ready!",
        });
      }
    });

    this.onMessage("bet", (client, message) => {
      const { playerId, playerName, betAmount, betOption } = message;

      // Add the bet to the bets list
      this.bets.push({ playerId, playerName, betAmount, betOption });

      console.log(`Player ${playerId} placed a bet:`, { betAmount, betOption });

      // Check if the number of bets equals the number of ready players
      if (this.bets.length === this.readyPlayers.size) {
        console.log("All players have placed their bets!");

        // Broadcast to all clients that all bets are placed
        this.broadcast("allBetsPlaced", {
          message: "All players have placed their bets!",
        });
      }
    });

    this.onMessage("dealInitial", (client, message) => {
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

      // Broadcast the dealt cards back to all clients
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
