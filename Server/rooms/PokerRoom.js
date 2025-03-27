const { Room } = require("@colyseus/core");
const { firestore, admin } = require("../firebase");
const FieldValue = require('firebase-admin').firestore.FieldValue;

const {
  Card,
  PokerPlayer,
  PokerState,
} = require("../schema/PokerSchema");
const { ArraySchema } = require("@colyseus/schema");

class PokerRoom extends Room {
  onCreate(options) {
    this.customRoomId = options.customRoomId;

    this.autoDispose = false;
    this.setState(new PokerState());

    this.dealerRaceCheck = false;
    this.maxClients = options.maxPlayers || 8;

    this.suits = [ "hearts", "diamonds", "clubs", "spades" ];
    this.ranks = [ "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king", "ace", ];

    // Add timeout that destroys room if no players join (needed for /create-room endpoint). Disabled for lobby implementation.
    /*
    this.emptyRoomTimeout = setTimeout(() => {
      if (this.clients.length === 0) {
        console.log(`Room ${this.roomId} destroyed due to inactivity.`);
        this.disconnect();
      }
    }, 30000);
    */

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
        console.log('this guys turn', this.state.currentTurn, Array.from(this.state.players.values()).filter(player => player.lastAction !== 'fold').length)
        this.broadcast("handleDisconnection", { nextPlayer: this.state.currentTurn, dc: Array.from(this.state.players.values()).filter(player => player.lastAction !== 'fold').length === 1});
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
      // const waiters = this.state.waitingRoom
      const waitingPlayers = Array.from(this.state.waitingRoom.keys());
      while (waitingPlayers.length > 0 && this.state.players.size < this.maxClients) {
        const nextPlayerId = waitingPlayers.shift()
        const player = this.state.waitingRoom.get(nextPlayerId)
        if (player) {
          this.state.players.set(nextPlayerId, player)
          this.state.waitingRoom.delete(nextPlayerId)
          player.hand = new ArraySchema()
          if (this.state.players.size == 0)
            player.blind = 1;
          else if (this.state.players.size == 1)
            player.blind = 2;
          else if (this.state.players.size == 2) {
            const playerIds = Array.from(this.state.players.keys());
            if (this.state.players.get(playerIds[1]).blind === 1 && this.state.players.get(playerIds[0]).blind === 2) {
              player.blind = 2
              this.state.players.get(playerIds[0]).blind = 0
            }
          }
          this.broadcast("playerJoin", { sessionId: nextPlayerId, totalCredits: player.totalCredits, players: this.state.players, waitingRoom: this.state.waitingRoom });
        }
      }
      this.broadcast('newGame', { players: this.state.players, waitingRoom: this.state.waitingRoom })
    })
  }

  // creatig and shuffling the deck
  initializeDeck() {
    let id = 0;
    const deckArray = [];

    for (const suit of this.suits)
      for (const rank of this.ranks)
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
    const hands = {}

    // Deal initial cards with a slight delay
    const dealCards = async () => {
      // each player's first card
      for (const playerId of playerIds) {
        const player = this.state.players.get(playerId);
        const card = this.state.deck.pop();
        if (card)
          player.hand.push(card);
      }

      // each player's second card
      for (const playerId of playerIds) {
        const player = this.state.players.get(playerId);
        const card = this.state.deck.pop();
        if (card) {
          player.hand.push(card);
          hands[playerId] = this.state.players.get(playerId).hand
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
    this.broadcast('gameStart', { hands, players: this.state.players, dealerHand: this.state.dealer.hand, currentTurn: this.state.currentTurn, gamePhase: this.state.gamePhase, pot: this.state.pot })
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
      this.endGame()
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
    console.log("HERE", this.dealerRaceCheck)
    if (!this.dealerRaceCheck) {
      const gamePhase = parseInt(this.state.gamePhase.replace(/\D/g, ""), 10)
      if (gamePhase < 4) {
        this.dealerRaceCheck = true
        // always burn a card at the start
        this.state.deck.pop();
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
        console.log(gamePhase)
        this.broadcast("dealerResult", { result: this.state.dealer, nextTurn: this.state.currentTurn })
      }
      else
        this.endGame()
    }
  }

  onGameFinished() 
  {
    this.clients.forEach(client => {
        const player = this.state.players.get(client.sessionId);
    
        if (player && player.fireBaseId) 
        {
          firestore.collection('users').doc(player.fireBaseId).get()
            .then(doc => {
              if (!doc.exists) 
              {
                console.warn(`User doc not found for ${player.fireBaseId}`);
                return;
              }
    
              const previousBalance = doc.data().balance || 0;
              const result = player.totalCredits - previousBalance;
    
              const historyEntry = {
                date: new Date(),
                gameName: "Poker",
                result: result
              };
    
              return firestore.collection('users').doc(player.fireBaseId).update({
                balance: player.totalCredits,
                gameHistory: FieldValue.arrayUnion(historyEntry)
              });
            })
            .then(() => {
              console.log(`Balance and game history updated for ${player.fireBaseId}`);
            })
            .catch((error) => {
              console.error(`Error updating user ${player.fireBaseId}:`, error);
            });
    
        } 
        else 
        {
          console.warn(`Player missing ${client.sessionId}`);
        }
      });
  }

  // method to end the game and show results
  endGame(res) {
    const activePlayers = Array.from(this.state.players.entries()).filter(([id, player]) => player.lastAction !== "fold");

    let winnerId, winner, result;

    if (activePlayers.length === 1) {
        // ✅ If only one player remains, they win automatically
        [winnerId, winner] = activePlayers[0];
        result = res ? res : 'folded'
    } else {
        // ✅ Determine the winner at showdown
        [winner, result] = this.determineWinner(activePlayers.map(([id, player]) => player), this.state.dealer);
        console.log(winner.name, result);

        // ✅ Find the session ID (key) of the winner in `this.state.players`
        winnerId = activePlayers.find(([id, player]) => player === winner)?.[0];
    }

    if (winner) {
        console.log(`Game Over! Winner: ${winner.name} with a ${result}`)

        winner.totalCredits += this.state.pot

        this.broadcast("endGame", { winner: winnerId, winnings: this.state.pot, result: result })

        this.state.pot = 0
        this.state.highestBet = 0
        this.state.gamePhase = "waiting"
        this.state.dealer = new ArraySchema()
        this.initializeDeck()

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
    
    this.onGameFinished()
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

    console.log('blinds after rotation:', playerIds[newSbIndex], playerIds[newBbIndex])
  }

  evaluateHand(playerHand, communityCards) {
    const fullHand = [...playerHand, ...communityCards]; // Combine hole + community cards
    const suits = {}; // To track suits
    const counts = {}; // To track card frequencies
    let isFlush = false, isStraight = false, straightHigh = 0;

    // ✅ Count occurrences of ranks & suits
    fullHand.forEach(card => {
        const rank = card.rank;
        const suit = card.suit;

        counts[rank] = (counts[rank] || 0) + 1
        suits[suit] = (suits[suit] || 0) + 1

        if (suits[suit] >= 5) isFlush = true; // Check for Flush
    });

    // ✅ Convert ranks into sorted numeric values
    let rankValues = fullHand.map(card => this.ranks.indexOf(card.rank)).sort((a, b) => b - a);
    let highCard = rankValues[0]; // Track the highest card for tie-breaking
    console.log(rankValues)

    // ✅ Check for Straight
    let sequence = [];
    for (let i = 1; i < rankValues.length; i++) {
        if (rankValues[i] === rankValues[i - 1] - 1) sequence.push(rankValues[i]);
        else if (rankValues[i] !== rankValues[i - 1]) sequence = [];
    }
    if (sequence.length >= 5) {
      isStraight = true;
      straightHigh = sequence[sequence.length - 1]; // High card of straight
    }

    // FIND HIGHEST CARD IN A FLUSH TODO

    // ✅ Determine hand rankings
    const pairs = Object.entries(counts).filter(([rank, count]) => count === 2).map(([rank]) => rank)
    const threeOfAKind = Object.entries(counts).filter(([rank, count]) => count === 3).map(([rank]) => rank)
    const fourOfAKind = Object.entries(counts).filter(([rank, count]) => count === 4).map(([rank]) => rank)
    const fullHouse = threeOfAKind.size > 0 && pairs.size > 0;

    if (isFlush && isStraight && straightHigh === 12) return { rank: 1, name: "Royal Flush", highCard };
    if (isFlush && isStraight) return { rank: 2, name: "Straight Flush", highCard: straightHigh };
    if (fourOfAKind.length !== 0) return { rank: 3, name: "Four of a Kind", highCard: fourOfAKind[0] };
    if (fullHouse) return { rank: 4, name: "Full House", highCard: threeOfAKind[0] };
    if (isFlush) return { rank: 5, name: "Flush", highCard };
    if (isStraight) return { rank: 6, name: "Straight", highCard: straightHigh };
    if (threeOfAKind.length !== 0) return { rank: 7, name: "Three of a Kind", highCard: threeOfAKind[0] };
    if (pairs.length === 2) return { rank: 8, name: "Two Pair", highCard: pairs };
    if (pairs.length === 1) return { rank: 9, name: "One Pair", highCard: pairs[0] };
    return { rank: 10, name: "High Card", highCard };
  }

  determineWinner(players, communityCards) {
    let bestHand = { rank: 11, highCard: -1 }; // Higher rank means worse hand
    let winner = null;

    players.forEach(player => {
        const handResult = this.evaluateHand(player.hand, communityCards);
        console.log(`${player.name} has ${handResult.name} with high card ${handResult.highCard}`);

        // ✅ The lowest rank value is the best hand
        if (handResult.rank < bestHand.rank) {
            bestHand = handResult;
            winner = player;
        } else if (handResult.rank === bestHand.rank) {
            // ✅ If tied, compare high cards
            if (Array.isArray(handResult.highCard) && Array.isArray(bestHand.highCard)) {
                if (handResult.highCard[0] > bestHand.highCard[0]) {
                  bestHand = handResult;
                  winner = player;
                }
                else if (handResult.highCard[0] == bestHand.highCard[0]) {
                  if (handResult.highCard[1] > bestHand.highCard[1]) {
                    bestHand = handResult;
                    winner = player;
                  }
                }
            }
            else {
              if (handResult.highCard > bestHand.highCard) {
                bestHand = handResult;
                winner = player;
              }
            }
        }
    });

    console.log(`Winner is ${winner.name} with ${bestHand.name}. (High Card: ${bestHand.highCard})`);
    return [winner, bestHand.name];
  }



  // handles when a player joins
  async onJoin(client, options) {
    // ignore if a duplicate ID shows up, otherwise create a new player
    if(this.state.players.has(client.sessionId) || this.state.waitingRoom.has(client.sessionId)) return
    const player = new PokerPlayer();
    console.log(options)
    // NEED TO LINK TO THE FIREBASE AUTH TO GET ACTUAL NAME AND BALANCE
    var playerName = "";
    if (options.playerId || this.playerId) {
          try {
            const playerDoc = await firestore.collection("users").doc(options.playerId).get();

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
          player.totalCredits = options.balance || 10_000
  // log and broadcast that a new player has joined
  console.log(`Player joined: ${player.name}. Current player count: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`);
  console.log(player.totalCredits);
  this.broadcast("playerJoin", { playerName: player.name,  sessionId: client.sessionId, totalCredits: player.totalCredits, players: this.state.players, waitingRoom: this.state.waitingRoom });
          }
      
        
        
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
      else if (this.state.players.size == 2) {
        const playerIds = Array.from(this.state.players.keys());
        if (this.state.players.get(playerIds[1]).blind === 1 && this.state.players.get(playerIds[0]).blind === 2) {
          player.blind = 2
          this.state.players.get(playerIds[0]).blind = 0
        }
      }

      this.state.players.set(client.sessionId, player);

      if (this.state.owner == '' || this.state.owner === undefined) {
        this.state.owner = client.sessionId; // set the first player to join as the owner
      }
    }

    // log and broadcast that a new player has joined
    console.log(`Player joined: ${player.name}. Current player count: ${this.state.players.size}. Current Waiting Room count: ${this.state.waitingRoom.size}. Room owner is ${this.state.owner}`);
    this.broadcast("playerJoin", { sessionId: client.sessionId, totalCredits: player.totalCredits, players: this.state.players, waitingRoom: this.state.waitingRoom });
  }

  // assignBlinds() {
  //   const playerIds = Array.from(this.state.players.keys());
  //   console.log("???")

  //   if (playerIds.length < 2) {
  //       console.log("Not enough players for blinds.");
  //       return;
  //   }

  //   if (this.state.players.get(playerIds[0]).blind != 0 && this.state.players.get(playerIds[1]).blind != 0) {
  //     this.state.players.forEach(player => player.blind = 0)

  //     this.state.players.get(playerIds[0]).blind = 1
  //     this.state.players.get(playerIds[1]).blind = 2

  //     console.log(`New Small Blind: ${playerIds[0]}, New Big Blind: ${playerIds[1]}`)
  //   }

  // }

  // handles when a player leaves
  onLeave(client) {
    const player = this.state.players.get(client.sessionId);
    const keys = Array.from(this.state.players.keys())
    // initialize nextKey and dealer (important)
    let nextKey = "dealer"
    let currentIndex
    // if the player was found in the active players
    if (player) {
      // get the index of the client that left, if its not the last player at the table, set teh nextKey to be the next guy, otherwise it will stay as the dealer
      currentIndex = keys.indexOf(client.sessionId)
      // console.log(currentIndex !== -1, !this.checkBettingRoundEnd())
      if (currentIndex !== -1 && !this.checkBettingRoundEnd()) {
        console.log('maybe')
        nextKey = keys[(currentIndex + 1) % keys.length]
        console.log('next key', nextKey)
      }
      // ✅ If the player was the Small Blind, shift the blinds
      if (player.blind === 1) {
        console.log("Small Blind disconnected, rotating blinds...");
        if (keys.length > 1) { // More than 2 players
            const newSB = keys[(currentIndex + 1) % keys.length]; // Big Blind becomes Small Blind
            this.state.players.get(newSB).blind = 1;
            console.log(newSB)
            const newBB = keys[(currentIndex + 2) % keys.length]; // Next player becomes Big Blind
            this.state.players.get(newBB).blind = 2;
        }
      }
      // ✅ If the player was the Big Blind, shift the big blind
      else if (player.blind === 2) {
          console.log("Big Blind disconnected, shifting big blind...");
          if (keys.length > 1) { // More than 2 players
              const newBB = keys[(currentIndex + 1) % keys.length]; // Next player becomes Big Blind
              this.state.players.get(newBB).blind = 2;
          }
          // If only 2 players remain, do nothing (SB remains SB)
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

    // if there is nobody left in the room, then destroy it. Disabled for lobby implementation.
    /*
    if(this.state.players.size == 0) {
      console.log("No players left, destroying room")
      this.broadcast("roomDestroyed")
      this.disconnect()
    }
    */

    if (false) {} // Just here to make sure the following code still happens.
    // otherwise tell the clients that someone left
    else {
      this.broadcast("playerLeft", { sessionId: client.sessionId, players: this.state.players, nextPlayer: nextKey, index: currentIndex});
      if (this.state.gamePhase.includes('playing') && Array.from(this.state.players.values()).filter((player) => player.lastAction !== "fold").length === 1)
        this.endGame('disconnect')
    }
  }
}

module.exports = { PokerRoom };
