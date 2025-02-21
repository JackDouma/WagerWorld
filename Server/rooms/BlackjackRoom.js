const { Room } = require("@colyseus/core");
const {
  Card,
  BlackjackPlayer,
  BlackjackState,
} = require("../schema/BlackjackSchema");
const { ArraySchema } = require("@colyseus/schema");

class BlackjackRoom extends Room {
  onCreate(options) {
    this.setState(new BlackjackState());

    this.maxClients = options.maxPlayers || 8;

    // Add timeout that destroys room if no players join (needed for /create-room endpoint)
    this.emptyRoomTimeout = setTimeout(() => {
      if (this.clients.length === 0) {
        console.log(`Room ${this.roomId} destroyed due to inactivity.`);
        this.disconnect();
      }
    }, 30000);

    // Add logging to track player count
    console.log(
      `Room created. Current player count: ${this.state.players.size}`
    );

    // Initialize deck
    this.initializeDeck();

    // Handle "ready" message
    this.onMessage("ready", (client, message) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = true;
        this.checkGameStart();
      }
    });

    this.onMessage("bet", (client, message) => {
        console.log("betting " + message.value)
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.bet = message.value
          player.isReady = true;
          this.checkGameStart();
        }
    })

    this.onMessage("hit", (client, message) => {
      console.log(client.sessionId + " is hitting")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
        }
        this.broadcast("hitResult", { sessionId: client.sessionId, hand: player.hand, result: this.calculateHandValue(player.hand), index: message.index })
      }
    })

    this.onMessage("playerBusts", (client, message) => {
      console.log(client.sessionId + " busts")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.nextTurn()
      }
    })

    this.onMessage("stand", (client, message) => {
      console.log(client.sessionId + " stands")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.nextTurn()
      }
    })

    this.onMessage("dealerTurn", (client, message) => {
      if (this.state.gamePhase == "playing")
        this.dealerTurn()
    })

    this.onMessage("endGame", (client, message) => {
      this.state.gamePhase = "done";
    })

    // Handle "playCard" message
    this.onMessage("playCard", (client, message) => {
      if (this.state.currentTurn !== client.sessionId) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      const cardIndex = player.hand.findIndex(
        (card) => card.id === message.cardId
      );
      if (cardIndex === -1) {
        console.log("Invalid card ID:", message.cardId);
        return;
      }

      // Move card from hand to discard pile
      const [card] = player.hand.splice(cardIndex, 1);
      card.faceUp = true;
      this.state.discardPile.push(card);

      this.nextTurn();
      this.broadcastGameStateUpdate();
    });

    // Handle "drawCard" message
    this.onMessage("drawCard", (client, message) => {
      console.log("drawCard", client.sessionId);
      if (this.state.currentTurn !== client.sessionId) return;

      const player = this.state.players.get(client.sessionId);
      if (!player) return;

      if (this.state.deck.length === 0) {
        console.log("Deck is empty!");
        // Optionally reshuffle discard pile into deck
        if (this.state.discardPile.length > 0) {
          this.reshuffleDeck();
        } else {
          console.log("No cards left to draw.");
          return;
        }
      }

      const card = this.state.deck.pop();
      player.hand.push(card);

      this.broadcastGameStateUpdate();
    });

    // Debugging tool
    this.onMessage("debug", (client, message) => {
      console.log("Current Room State:", this.state.toJSON());
    });
  }

  initializeDeck() {
    const suits = ["hearts", "diamonds", "clubs", "spades"];
    const ranks = [
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

    let id = 0;
    const deckArray = [];

    for (const suit of suits) {
      for (const rank of ranks) {
        deckArray.push(new Card(suit, rank, `${id++}`));
      }
    }

    // Shuffle using a regular array first
    for (let i = deckArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deckArray[i], deckArray[j]] = [deckArray[j], deckArray[i]];
    }

    // Convert to ArraySchema
    this.state.deck = new ArraySchema(...deckArray);
  }

  checkGameStart() {
    const allReady = Array.from(this.state.players.values()).every(
      (player) => player.isReady
    );
    // check which players are ready
    for (const player of this.state.players.values()) {
      console.log(`Player ${player.name} is ready: ${player.isReady}`);
    }
    console.log(`All players ready: ${allReady}`);
    // if (allReady && this.state.players.size >= 2) {
      console.log("Starting game...");
      this.startGame();
    // }
  }

  startGame() {
    this.state.gamePhase = "dealing";

    const playerIds = Array.from(this.state.players.keys());

    // Deal initial cards with a slight delay
    const dealCards = async () => {
      for (const playerId of playerIds) {
        const player = this.state.players.get(playerId);
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
        }
      }

      this.state.dealer.hand.push(this.state.deck.pop());

      for (const playerId of playerIds) {
        const player = this.state.players.get(playerId);
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
          player.handValue = this.calculateHandValue(player.hand)
        }
      }

      this.state.dealer.hand.push(this.state.deck.pop());

      // Start the first turn after dealing
      this.state.currentTurn = playerIds[0];
      this.state.gamePhase = "playing";
      console.log("Game started");
    };

    dealCards();
  }

  // manages all blackjack counting logic :)
  calculateHandValue(hand) {
    let value = 0
    let aces = 0

    hand.forEach((card) => {
      if (['jack', 'queen', 'king'].includes(card.rank)) {
        value += 10
      } else if (card.rank === 'ace') {
        value += 11
        aces += 1
      } else {
        value += parseInt(card.rank, 10)
      }
    })

    while (value > 21 && aces > 0) {
      value -= 10
      aces -= 1
    }

    return value || 0
  }

  nextTurn() {
    const playerIds = Array.from(this.state.players.keys());
    const currentIndex = playerIds.indexOf(this.state.currentTurn);
    if (currentIndex === playerIds.length - 1)
      this.state.currentTurn = "dealer"
    else
      this.state.currentTurn = playerIds[currentIndex + 1];

    this.broadcast("standResult", { nextPlayer: this.state.currentTurn });
    // if (this.state.currentTurn == "dealer")
      // this.dealerTurn()
  }

  dealerTurn() {
    let dealerValue = this.calculateHandValue(this.state.dealer.hand)
    const allPlayersLower = [...this.state.players.values()].every(player =>
      this.calculateHandValue(player.hand) < dealerValue
    );
    if (!allPlayersLower) {
      while (dealerValue < 17) {
        console.log("Dealer hits")

        if (this.state.deck.length === 0) {
          console.log("Deck is empty! Dealer cannot draw more cards.");
          break;
        }

        const card = this.state.deck.pop();
        if (!card) {
          console.log("Error: Drew an undefined card. Stopping dealer turn.");
          break;
        }
        this.state.dealer.hand.push(card);
        dealerValue = this.calculateHandValue(this.state.dealer.hand)
        console.log(dealerValue)
      }
    }

    const results = {}
    const payouts = {}

    this.state.players.keys().forEach((item) => {
      const playerValue = this.calculateHandValue(this.state.players.get(item).hand)
      if (playerValue > 21) {
        results[item] = 3
        this.state.players.get(item).totalCredits -= this.state.players.get(item).bet
      }
      else if (dealerValue > 21 || playerValue > dealerValue){
        results[item] = 0
        this.state.players.get(item).totalCredits += this.state.players.get(item).bet
      }
      else if (playerValue < dealerValue) {
        results[item] = 1
        this.state.players.get(item).totalCredits -= this.state.players.get(item).bet
      }
      else if (playerValue == dealerValue)
        results[item] = 2
      this.state.players.get(item).bet = 0
      payouts[item] = this.state.players.get(item).totalCredits
    })

    this.broadcast("dealerResult", { dealerHand: this.state.dealer.hand, playerResults: results, winnings: payouts })
  }

  onJoin(client, options) {
    if(this.state.players.has(client.sessionId)) return
    const player = new BlackjackPlayer();
    player.name = options.name || `Player ${client.sessionId}`;
    player.totalCredits = 10_000
    this.state.players.set(client.sessionId, player);

    console.log(
      `Player joined: ${player.name}. Current player count: ${this.state.players.size}`
    );
    this.broadcast("playerJoin", { sessionId: client.sessionId, size: this.state.players.size, totalCredits: player.totalCredits });
  }

  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      // Return player's cards to the deck
      for (const card of player.hand) {
        this.state.deck.push(card);
      }
      this.state.players.delete(client.sessionId);
    }

    console.log(`Player left. Remaining players: ${this.state.players.size}`);

    this.broadcast("playerLeft", { sessionId: client.sessionId, size: this.state.players.size });

    // End the game if there aren't enough players
    if (this.state.players.size < 2 && this.state.gamePhase === "playing") {
      console.log("Not enough players to continue. Ending game...");
      this.state.gamePhase = "ended";
      this.broadcast("gameEnded", { reason: "Not enough players" });
    }
  }

  reshuffleDeck() {
    console.log("Reshuffling discard pile into deck...");
    const shuffledDiscardPile = [...this.state.discardPile];
    this.state.discardPile.clear();

    // Shuffle the discard pile
    for (let i = shuffledDiscardPile.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledDiscardPile[i], shuffledDiscardPile[j]] = [
        shuffledDiscardPile[j],
        shuffledDiscardPile[i],
      ];
    }

    // Add shuffled cards back to the deck
    this.state.deck.push(...shuffledDiscardPile);
  }

  broadcastGameStateUpdate() {
    this.broadcast("stateUpdate", this.state.toJSON());
  }
}

module.exports = { BlackjackRoom };
