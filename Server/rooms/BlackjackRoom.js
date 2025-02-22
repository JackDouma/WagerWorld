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
          player.totalCredits -= player.bet
          player.isReady = true;
          this.checkGameStart(client.sessionId);
        }
    })

    this.onMessage("hit", (client, message) => {
      console.log(client.sessionId + " is hitting")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
          player.handValue = this.calculateHandValue(player.hand)
        }
        this.broadcast("hitResult", { sessionId: client.sessionId, hand: player.hand, index: message.index })
      }
    })

    this.onMessage("playerBusts", (client, message) => {
      console.log(client.sessionId + " busts")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.nextTurn(true)
      }
    })

    this.onMessage("stand", (client, message) => {
      console.log(client.sessionId + " stands")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.nextTurn(false)
      }
    })

    this.onMessage("currentTurnDisconnect", (client, message) => {
      console.log("DC: " + this.state.currentTurn)
      const playerIds = Array.from(this.state.players.keys());
      const currentIndex = playerIds.indexOf(this.state.currentTurn);
      console.log("DC INDEX: " + currentIndex)
      if (currentIndex === playerIds.length - 1)
        this.state.currentTurn = "dealer"
      else
        this.state.currentTurn = message.nextPlayer

      console.log(this.state.currentTurn)

      this.broadcast("handleDisconnection", { nextPlayer: this.state.currentTurn });

    })

    this.onMessage("dealerTurn", (client, message) => {
      if (this.state.gamePhase == "playing")
        this.dealerTurn()
    })

    this.onMessage("endGame", (client, message) => {
      this.state.gamePhase = "done";
    })

    this.onMessage("resetGame", (client) => {
      console.log("resetting...")
      this.state.owner = ''
      this.broadcast("resetGame", {client: client.sessionId})
    })
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

  checkGameStart(sessionId) {
    const allReady = Array.from(this.state.players.values()).every(
      (player) => player.isReady
    );
    // check which players are ready
    for (const player of this.state.players.values()) {
      console.log(`Player ${player.name} is ready: ${player.isReady}`);
    }
    console.log(`All players ready: ${allReady}`);
    if (allReady) {
      console.log("Starting game...");
      this.startGame();
    }
    else {
      console.log("waiting...")
      this.broadcast("waitForOthers", { user: sessionId })
    }
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
          console.log(player.handValue)
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

  nextTurn(playerBusts) {
    const prevTurn = this.state.currentTurn
    const playerIds = Array.from(this.state.players.keys());
    const currentIndex = playerIds.indexOf(this.state.currentTurn);
    if (currentIndex === playerIds.length - 1)
      this.state.currentTurn = "dealer"
    else
      this.state.currentTurn = playerIds[currentIndex + 1];

    console.log(this.state.currentTurn)

    this.broadcast("nextTurn", { nextPlayer: this.state.currentTurn, busted: playerBusts, prevPlayer: prevTurn, score: this.state.players.get(prevTurn).handValue });
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
      console.log(item + " started with " + (this.state.players.get(item).totalCredits + this.state.players.get(item).bet) + " and bet " + this.state.players.get(item).bet)
      const playerValue = this.calculateHandValue(this.state.players.get(item).hand)
      if (playerValue > 21)
        results[item] = 3
      else if (dealerValue > 21 || playerValue > dealerValue){
        results[item] = 0
        this.state.players.get(item).totalCredits += (this.state.players.get(item).bet * 2)
      }
      else if (playerValue < dealerValue)
        results[item] = 1
      else if (playerValue == dealerValue) {
        results[item] = 2
        this.state.players.get(item).totalCredits += this.state.players.get(item).bet
      }
      this.state.players.get(item).bet = 0
      payouts[item] = this.state.players.get(item).totalCredits
    })

    this.broadcast("dealerResult", { dealerHand: this.state.dealer.hand, playerResults: results, winnings: payouts })
  }

  onJoin(client, options) {
    if(this.state.players.has(client.sessionId)) return
    if(this.state.gamePhase == "playing") return
    const player = new BlackjackPlayer();
    player.name = options.name || `Player ${client.sessionId}`;
    player.totalCredits = 10_000 // NEED TO LINK TO THE FIREBASE AUTH TO GET ACTUAL NUMBER
    this.state.players.set(client.sessionId, player);
    if (this.state.owner == '') {
      this.state.owner = client.sessionId; // set the first player to join as the owner
    }

    console.log(`Player joined: ${player.name}. Current player count: ${this.state.players.size}. Room owner is ${this.state.owner}`);
    // console.log(this.state.players)
    this.broadcast("playerJoin", { sessionId: client.sessionId, totalCredits: player.totalCredits, players: this.state.players });
  }

  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    const keys = Array.from(this.state.players.keys())
    let nextKey = "dealer"
    let currentIndex
    if (player) {
      // Return player's cards to the deck
      for (const card of player.hand) {
        this.state.deck.push(card);
      }
      currentIndex = keys.indexOf(client.sessionId);

      if (currentIndex !== -1 && currentIndex < keys.length - 1) {
          nextKey = keys[currentIndex + 1]; // Set next player if available
      }
      this.state.players.delete(client.sessionId);
    }

    if (!this.state.players.has(this.state.owner))
      this.state.owner = this.state.players.keys().next().value

    console.log(`Player left. Remaining players: ${this.state.players.size}. Room owner is ${this.state.owner}`);

    this.broadcast("playerLeft", { sessionId: client.sessionId, players: this.state.players, nextPlayer: nextKey, index: currentIndex});
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
