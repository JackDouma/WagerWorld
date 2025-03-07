const { Room } = require("@colyseus/core");
const {
  Card,
  PokerPlayer,
  PokerState,
} = require("../schema/PokerSchema");
const { ArraySchema } = require("@colyseus/schema");

class PokerRoom extends Room {
  onCreate(options) {
    this.setState(new PokerState());

    this.dealerRaceCheck = false;
    this.maxClients = options.maxPlayers || 8;

    // Add timeout that destroys room if no players join (needed for /create-room endpoint)
    this.emptyRoomTimeout = setTimeout(() => {
      if (this.clients.length === 0) {
        console.log(`Room ${this.roomId} destroyed due to inactivity.`);
        this.disconnect();
      }
    }, 30000);

    // Add logging to track player count
    console.log(`Room ${this.roomId} created. Current player count: ${this.state.players.size}`);
    this.state.gamePhase = 'waiting'

    // Initialize deck
    this.initializeDeck();

    // when a bet is made take the clients money and put them in ready state
    this.onMessage("readyUp", (client) => {
      console.log(client.sessionId + " is ready")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.isReady = true;
        this.checkGameStart(client.sessionId);
      }
    })

    // when a bet is made take the clients money and put them in ready state
    this.onMessage("bet", (client, message) => {
      console.log(client.sessionId + " is betting " + message.value)
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.totalCredits -= message.value - player.bet
        this.state.pot += message.value - player.bet
        player.bet = message.value
        if (player.bet > this.state.highestBet) {
          this.state.highestBet = player.bet
          player.lastAction = 'raise'
          this.nextTurn('raise')
        }
        else {
          player.lastAction = 'call'
          this.nextTurn('call')
        }
      }
    })

    // when a player checks, pass to the next player
    this.onMessage("check", (client, message) => {
      console.log(client.sessionId + " checks")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.lastAction = 'check'
        this.nextTurn('check')
      }
    })

    this.onMessage("fold", (client, message) => {
      console.log(client.sessionId + " folded")
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.lastAction = 'fold'
        this.nextTurn('fold')
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
      if (this.state.gamePhase.includes("playing"))
        this.dealerTurn()
    })

    // once the dealer's operation has been fully handled, open up any additional dealer's Turn messages coming in
    this.onMessage("dealerTurnHandled", (client) => {
      this.dealerRaceCheck = false
    })

    this.onMessage('newGame', (client) => {
      console.log('NEW GAME WAS CALLED BY', client.sessionId, 'WHEN IT SHOULD HAVE BEEN', this.state.owner)
      console.log('SB=', Array.from(this.state.players.values()).find(player => player.blind === 1).name, 'BB=', Array.from(this.state.players.values()).find(player => player.blind === 2).name)
      this.broadcast('newGame')
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
    if (allReady && this.state.players.size >= 2) {
      console.log("Starting game...");
      this.startGame();
    }
    // otherwise, signal the client that readied up to wait for everyone else
    else {
      console.log("Not enough players. Waiting...")
      this.broadcast("waitForOthers", { user: sessionId })
    }
  }

  // starting the game by deling out the cards
  startGame() {
    this.state.gamePhase = "dealing";

    const playerIds = Array.from(this.state.players.keys());

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

      // each player's second card
      for (const playerId of playerIds) {
        const player = this.state.players.get(playerId);
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
          player.handValue = this.calculateHandValue(player.hand)
        }
      }

      const smallBlind = Array.from(this.state.players.values()).find(player => player.blind === 1);
      if (smallBlind) {
        smallBlind.bet = 5
        smallBlind.totalCredits -= smallBlind.bet
        this.state.pot += smallBlind.bet
      }

      const bigBlind = Array.from(this.state.players.values()).find(player => player.blind === 2);
      if (bigBlind) {
        bigBlind.bet = 10
        bigBlind.totalCredits -= bigBlind.bet
        this.state.pot += bigBlind.bet
      }

      this.state.highestBet = Array.from(this.state.players.values()).reduce((max, player) => Math.max(max, player.bet), 0);

      // Start the first turn after dealing
      this.state.currentTurn = playerIds[(Array.from(this.state.players.values()).indexOf(bigBlind) + 1) % playerIds.length];
      this.state.gamePhase = "playing1";
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

  // allowing the next client in line to go
  nextTurn(action) {
    const prevTurn = this.state.currentTurn
    const playerIds = Array.from(this.state.players.keys())

    let nextIndex = (playerIds.indexOf(this.state.currentTurn) + 1) % playerIds.length

    while (this.state.players.get(playerIds[nextIndex]).lastAction === 'fold')
      nextIndex = (nextIndex + 1) % playerIds.length;

    this.state.currentTurn = playerIds[nextIndex];

    // broadcast to the clients that the next person can go
    this.broadcast("nextTurn", { dealerTurn: this.checkBettingRoundEnd(), nextPlayer: this.state.currentTurn, prevPlayer: prevTurn, pot: this.state.pot, highestBet: this.state.highestBet, currentBet: this.state.players.get(prevTurn).bet, action: action });

    const activePlayers = playerIds.filter(id => this.state.players.get(id).lastAction !== 'fold')

    if (activePlayers.length === 1)
        this.endGame(activePlayers[0])
  }

  // method to check if the betting round it done
  checkBettingRoundEnd() {
    // first get all the players that have not folded
    const activePlayers = Array.from(this.state.players.values()).filter(player => player.lastAction !== 'fold')
    // check if all the players have made an action (raise, call, check)
    const allHaveActed = activePlayers.every(player => player.lastAction !== "none")
    // check if all the players have an equal bet made to the highest bet
    const highestBet = Math.max(...activePlayers.map(p => p.bet || 0))
    const allBetsEqual = activePlayers.every(player => player.bet === highestBet)
    // check both conditions above, and that the game has more than 1 player in it
    return allBetsEqual && allHaveActed && activePlayers.length > 1
  }

  // handling the dealer's turn
  dealerTurn() {
    if (!this.dealerRaceCheck) {
      this.dealerRaceCheck = true
      // always burn a card at the start
      this.state.deck.pop();
      const gamePhase = parseInt(this.state.gamePhase.replace(/\D/g, ""), 10)
      if(gamePhase == 1) {
        for (var i = 0; i < 3; i++) {
          const card = this.state.deck.pop()
          if (card)
            this.state.dealer.push(card)
        }
      }
      else if (gamePhase == 2 || gamePhase == 3) {
        const card = this.state.deck.pop()
        if (card)
          this.state.dealer.push(card)
      }
      const activePlayers = Array.from(this.state.players.values()).filter(player => player.lastAction !== 'fold')
      activePlayers.forEach((item) => item.lastAction = 'none')
      this.state.gamePhase = `playing${gamePhase + 1}`
      this.broadcast("dealerResult", { result: this.state.dealer, nextTurn: this.state.currentTurn })
    }
  }

  // method to end the game and show results
  endGame(winnerId) {
    const winner = this.state.players.get(winnerId);
    if (winner) {
        console.log(`Game Over! Winner: ${winner.name}`)

        winner.totalCredits += this.state.pot

        this.broadcast("endGame", { winner: winnerId, winnings: this.state.pot })

        this.state.pot = 0
        this.state.highestBet = 0
        this.state.gamePhase = "waiting"
        this.state.dealer = new ArraySchema()
        
        this.state.players.forEach(player => {
            player.bet = 0
            player.hand = new ArraySchema()
            player.lastAction = "none"
            player.isReady = false
        })

        this.rotateBlinds()

        console.log("Game has been reset, waiting for players to ready up.");
    } else {
        console.log("Error: Winner not found in state.");
    }
  }

  rotateBlinds() {
    const playerIds = Array.from(this.state.players.keys());

    if (playerIds.length < 2) {
        console.log("Not enough players to rotate blinds.");
        return;
    }

    // find the current small and big blinds
    let sbIndex = playerIds.findIndex(id => this.state.players.get(id).blind === 1);
    let bbIndex = playerIds.findIndex(id => this.state.players.get(id).blind === 2);

    // reset previous blinds
    if (sbIndex !== -1) this.state.players.get(playerIds[sbIndex]).blind = 0;
    if (bbIndex !== -1) this.state.players.get(playerIds[bbIndex]).blind = 0;

    // move over to the next player in line
    const newSbIndex = (sbIndex + 1) % playerIds.length;
    const newBbIndex = (bbIndex + 1) % playerIds.length;

    // assign new blind values to the players
    this.state.players.get(playerIds[newSbIndex]).blind = 1
    this.state.players.get(playerIds[newBbIndex]).blind = 2
  }

  // handles when a player joins
  onJoin(client, options) {
    // ignore if a duplicate ID shows up, otherwise create a new player
    if(this.state.players.has(client.sessionId) || this.state.waitingRoom.has(client.sessionId)) return
    const player = new PokerPlayer();
    // NEED TO LINK TO THE FIREBASE AUTH TO GET ACTUAL NAME AND BALANCE
    player.name = options.name || `Player ${client.sessionId}`;
    player.totalCredits = options.balance || 10_000

    // if the game is currently in progress, put them in the waiting room
    if(this.state.gamePhase.includes("playing"))
      this.state.waitingRoom.set(client.sessionId, player);
    // otherwise add like normal, and if they're the room creator, make them the owner
    else {
      // assign blinds to players, if only 1 or 2 players exist, then set automatically
      if (this.state.players.size == 0)
        player.blind = 1;
      else if (this.state.players.size == 1)
        player.blind = 2;

      this.state.players.set(client.sessionId, player);

      if (this.state.players.size > 2)
        this.assignBlinds()
      
      if (this.state.owner == '') {
        this.state.owner = client.sessionId; // set the first player to join as the owner
      }
    }

    // log and broadcast that a new player has joined
    console.log(`Player joined: ${player.name}. Current player count: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`);
    this.broadcast("playerJoin", { sessionId: client.sessionId, totalCredits: player.totalCredits, players: this.state.players, waitingRoom: this.state.waitingRoom });
  }

  assignBlinds() {
    const playerIds = Array.from(this.state.players.keys());
    console.log("???")

    if (playerIds.length < 2) {
        console.log("Not enough players for blinds.");
        return;
    }

    if (this.state.players.get(playerIds[0]).blind != 0 && this.state.players.get(playerIds[1]).blind != 0) {
      this.state.players.forEach(player => player.blind = 0)

      this.state.players.get(playerIds[0]).blind = 1
      this.state.players.get(playerIds[1]).blind = 2

      console.log(`New Small Blind: ${playerIds[0]}, New Big Blind: ${playerIds[1]}`)
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
        if (player.blind != 0)
          this.state.players.get(nextKey).blind = player.blind
      }
      // remove player
      this.state.players.delete(client.sessionId);
    }
    // if not found, check the watiting room and remove from there
    else {
      const waitingPlayer = this.state.waitingRoom.get(client.sessionId);
      if(waitingPlayer)
        this.state.waitingRoom.delete(client.sessionId)
    }
    // if the room owner was the one that left, then make the next guy in line the owner
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

module.exports = { PokerRoom };
