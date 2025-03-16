const { Room } = require("@colyseus/core");
const admin = require("../firebase");
const {
  Card,
  BlackjackPlayer,
  BlackjackState,
} = require("../schema/BlackjackSchema");
const { ArraySchema } = require("@colyseus/schema");

class BlackjackRoom extends Room {
  constructor(firestore) {
    super();
    this.firestore = firestore;
  }

  onCreate(options) {
    // Custom room ID (if provided)
    this.customRoomId = options.customRoomId;
    this.playerId = options.playerId;

    // Initialize room state
    this.setState(new BlackjackState());

    // Set max clients (default to 8 if not provided)
    this.maxClients = options.maxPlayers || 8;

    // Add timeout to destroy room if no players join
    this.emptyRoomTimeout = setTimeout(() => {
      if (this.clients.length === 0) {
        console.log(`Room ${this.customRoomId} destroyed due to inactivity.`);
        this.disconnect();
      }
    }, 30000);

    

    // Add logging to track player count
    console.log(`Room ${this.roomId} created. Current player count: ${this.state.players.size}`);
    this.state.gamePhase = 'waiting'

    // Initialize deck
    this.initializeDeck();

    // when a bet is made take the clients money and put them in ready state
    this.onMessage("bet", (client, message) => {
        console.log(client.sessionId + " is betting " + message.value)
        const player = this.state.players.get(client.sessionId);
        if (player) {
          player.bet = message.value
          player.totalCredits -= player.bet
          player.isReady = true;
          this.checkGameStart(client.sessionId);
        }
    })

    // when a hit is made, draw a card and broadcast the results back to the client
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

    // if a player busts, pass to the next player
    this.onMessage("playerBusts", (client, message) => {
      console.log(client.sessionId + " busts")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.nextTurn(true)
      }
    })

    // if a player stands, pass to the next player
    this.onMessage("stand", (client, message) => {
      console.log(client.sessionId + " stands")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        this.nextTurn(false)
      }
    })

    // if a disconnection happens during that player's turn, make the next player in line go
    this.onMessage("currentTurnDisconnect", (client, message) => {
      // boolean check for when multiple clients send a message. makes sure it only runs once per disconnect
      if (!this.state.disconnectCheck) {
        this.state.disconnectCheck = true
        const playerIds = Array.from(this.state.players.keys());
        const currentIndex = playerIds.indexOf(this.state.currentTurn);
        if (currentIndex === playerIds.length - 1)
          this.state.currentTurn = "dealer"
        else
          this.state.currentTurn = message.nextPlayer
        this.broadcast("handleDisconnection", { nextPlayer: this.state.currentTurn });
      }
    })

    // once the disconnection has been fully handled, open up any additional disconnection messages coming in
    this.onMessage("disconnectionHandled", (client) => {
      this.state.disconnectCheck = false
    })

    // once its the dealer's turn, make him draw cards
    this.onMessage("dealerTurn", (client, message) => {
      if (this.state.gamePhase == "playing")
        this.dealerTurn()
    })

    // once the game is reset, reset the owner as well
    this.onMessage("newGame", (client) => {
      // const waiters = this.state.waitingRoom
      const waitingPlayers = Array.from(this.state.waitingRoom.keys());
      console.log('waiters', waitingPlayers)
      while (waitingPlayers.length > 0 && this.state.players.size < this.maxClients) {
        const nextPlayerId = waitingPlayers.shift()
        const player = this.state.waitingRoom.get(nextPlayerId)
        if (player) {
          this.state.players.set(nextPlayerId, player)
          this.state.waitingRoom.delete(nextPlayerId)
          player.hand = new ArraySchema()
          this.broadcast("playerJoin", { sessionId: nextPlayerId, totalCredits: player.totalCredits, players: this.state.players, waitingRoom: this.state.waitingRoom });
        }
      }
      this.broadcast('newGame', { waitingRoom: this.state.waitingRoom })
    })
  }

  // creatig and shuffling the deck
  initializeDeck() {
    const suits = [ "hearts", "diamonds", "clubs", "spades" ];
    const ranks = [ "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace", ];

    let id = 0;
    const deckArray = [];

    for (const suit of suits)
      for (const rank of ranks)
        deckArray.push(new Card(suit, rank, `${id++}`));

    // Shuffle using a regular array first
    for (let i = deckArray.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deckArray[i], deckArray[j]] = [deckArray[j], deckArray[i]];
    }

    // Convert to ArraySchema
    this.state.deck = new ArraySchema(...deckArray);
  }

  // make sure each player is ready and has a bet in before starting
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

  // starting the game by deling out the cards
  startGame() {
    this.state.gamePhase = "dealing";

    const playerIds = Array.from(this.state.players.keys());
    const hands = {}

    // Deal initial cards with a slight delay
    const dealCards = async () => {
      // each player's first card
      for (const playerId of playerIds) {
        const player = this.state.players.get(playerId);
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
        }
      }

      // dealer's first card
      this.state.dealer.hand.push(this.state.deck.pop());

      // each player's second card
      for (const playerId of playerIds) {
        const player = this.state.players.get(playerId);
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
          player.handValue = this.calculateHandValue(player.hand)
        }
        hands[playerId] = this.state.players.get(playerId).hand
      }

      // dealer's second card
      this.state.dealer.hand.push(this.state.deck.pop());

      // Start the first turn after dealing
      this.state.currentTurn = playerIds[0];
      this.state.gamePhase = "playing";
      console.log("Game started");
    };

    dealCards();
    console.log(this.state.dealer.hand)
    this.broadcast('gameStart', { hands, dealerHand: this.state.dealer.hand, owner: this.state.owner, gamePhase: this.state.gamePhase })
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

  // allowing the next client in line to go. pass in true if the player busted and lost, false for the if the player stands
  nextTurn(playerBusts) {
    const prevTurn = this.state.currentTurn
    const playerIds = Array.from(this.state.players.keys());
    const currentIndex = playerIds.indexOf(this.state.currentTurn)
    // if the calculated index is the last one, make the dealer go
    if (currentIndex === playerIds.length - 1)
      this.state.currentTurn = "dealer"
    // otherwise, proceed as normal
    else
      this.state.currentTurn = playerIds[currentIndex + 1]
    // broadcast to the clients that the next person can go
    this.broadcast("nextTurn", { nextPlayer: this.state.currentTurn, busted: playerBusts, prevPlayer: prevTurn, score: this.state.players.get(prevTurn).handValue })
  }

  // handling the dealer's turn
  dealerTurn() {
    let dealerValue = this.calculateHandValue(this.state.dealer.hand)
    // if for some reason all the player's decided to stand on a smaller value than the dealer, then skip the loop
    const allPlayersLower = [...this.state.players.values()].every(player => this.calculateHandValue(player.hand) < dealerValue)
    if (!allPlayersLower) {
      // make the dealer draw cards until they get above a 17
      while (dealerValue < 17) {
        console.log("Dealer hits")

        const card = this.state.deck.pop();
        if (card) {
          this.state.dealer.hand.push(card);
          dealerValue = this.calculateHandValue(this.state.dealer.hand)
          console.log("Dealer is at " + dealerValue)
        }
      }
    }

    // initializing results
    const results = {}
    const payouts = {}

    // for each player, get their winnings and number results, where 0 = win, 1 = dealer wins, 2 = push, 3 = player busts
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

    // set game phase to 'done', and broadcast the results back to the clients
    // this.state.gamePhase = "done"
    this.broadcast("dealerResult", { dealerHand: this.state.dealer.hand, playerResults: results, winnings: payouts })

    this.state.gamePhase = "waiting"
    this.state.dealer = new BlackjackPlayer()
    this.initializeDeck()
        
    this.state.players.forEach(player => {
      player.bet = 0
      player.hand = new ArraySchema()
      player.handValue = 0
      player.isReady = false
    })
  }

  onGameFinished() {
    console.log(`Room ${this.customRoomId} Finished.`);

    this.clients.forEach(client => {
      const player = this.state.players.get(client.sessionId);

      if (player && this.firestore) {
        this.firestore.collection('players').doc(client.id).update({
          totalCredits: admin.firestore.FieldValue.increment(player.totalCredits)
        })
        .then(() => {
          console.log(`Player ${client.id} credits updated in Firestore.`);
        })
        .catch((error) => {
          console.error(`Error updating player ${client.id} credits in Firestore:`, error);
        });
      } else {
        console.warn(`Player ${client.id} not found in room state or Firestore not initialized.`);
      }
    });
  }

  // handles when a player joins
  async onJoin(client, options) {
    console.log(options)
    console.log(this.playerId)
    // ignore if a duplicate ID shows up, otherwise create a new player
    if(this.state.players.has(client.sessionId) || this.state.waitingRoom.has(client.sessionId)) return
    const player = new BlackjackPlayer();
    // NEED TO LINK TO THE FIREBASE AUTH TO GET ACTUAL NAME AND BALANCE
    var playerName = "";
    if (options.playerId || this.playerId) {
          try {
            const playerDoc = await admin.firestore
              .collection("users")
              .doc(options.playerId)
              .get();
            if (playerDoc.exists) {
              client.sessionId = options.playerId;
              playerName = playerDoc.data().name;
              player.name = playerName; 
              console.log(`${playerName} joined!`);
            } else {
              console.log(`Player with ID ${options.playerId} not found.`);
            }
          } catch (error) {
            console.error("Error fetching player data:", error);
          }
          
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
    this.broadcast("playerJoin", { sessionId: client.sessionId, totalCredits: player.totalCredits, players: this.state.players, waitingRoom: this.state.waitingRoom });
  }
}

  // handles when a player leaves
  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    const keys = Array.from(this.state.players.keys())
    // initialize nextKey and dealer (important)
    let nextKey = "dealer"
    let currentIndex
    // if the player was found in the active players
    if (player) {
      // return player's cards to the deck
      for (const card of player.hand) {
        this.state.deck.push(card)
      }
      // get the index of the client that left, if its not the last player at the table, set teh nextKey to be the next guy, otherwise it will stay as the dealer
      currentIndex = keys.indexOf(client.sessionId)
      if (currentIndex !== -1 && currentIndex < keys.length - 1) {
          nextKey = keys[currentIndex + 1]
      }
      // remove player
      this.state.players.delete(client.sessionId);
      // Remove player from players map
      this.state.players.delete(client.sessionId);
      
          // Update isInGame to false
      admin.firestore.collection("users").doc(client.sessionId).update({
          isInGame: false,
      });
      
      // console log to show that the player has left the game
      console.log(`Player with ID ${client.sessionId} has left the game.`);
    }
    // if not found, check the watiting room and remove from there
    else {
      const waitingPlayer = this.state.waitingRoom.get(client.sessionId);
      if(waitingPlayer){
        this.state.waitingRoom.delete(client.sessionId)
        admin.firestore.collection("users").doc(client.sessionId).update({
          isInGame: false,
      });
      
      // console log to show that the player has left the game
      console.log(`Player with ID ${client.sessionId} has left the game.`);
      }
      
    }
    // if the room owner was the once that left, then make the next guy in line the owner
    if (!this.state.players.has(this.state.owner))
      this.state.owner = this.state.players.keys().next().value

    console.log(`Player left. Remaining players: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`);

    // if there is nobody left in the room, then destroy it
    if(this.state.players.size == 0) {
      console.log("No players left, destroying room")
      this.broadcast("roomDestroyed")
      this.disconnect()
    }
    // otherwise tell the clients that someone left
    else
      this.broadcast("playerLeft", { sessionId: client.sessionId, players: this.state.players, nextPlayer: nextKey, index: currentIndex});
  }
}

module.exports = { BlackjackRoom };
