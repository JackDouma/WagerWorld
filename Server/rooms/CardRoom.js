const { Room } = require('@colyseus/core');
const { Card, Player, CardGameState } = require('../schema/CardGameSchema');
const { ArraySchema } = require('@colyseus/schema');

class CardRoom extends Room {
    onCreate(options) {
        this.setState(new CardGameState());
        this.maxClients = options.maxPlayers || 4;

        // Add timeout for room if nobody joins (needed for /create-room endpoint)
        this.emptyRoomTimeout = setTimeout(() => {
            if (this.clients.length === 0) {
                console.log(`Room ${this.roomId} destroyed due to inactivity.`);
                this.disconnect();
            }
        }, 30000) // 30 second timeout

        // Add logging to track player count
        console.log(`Room created. Current player count: ${this.state.players.size}`);

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

        // Handle "playCard" message
        this.onMessage("playCard", (client, message) => {
            if (this.state.currentTurn !== client.sessionId) return;

            const player = this.state.players.get(client.sessionId);
            if (!player) return;

            const cardIndex = player.hand.findIndex(card => card.id === message.cardId);
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
            console.log('drawCard', client.sessionId);
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
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

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
        const allReady = Array.from(this.state.players.values()).every(player => player.isReady);
        // check which players are ready
        for (const player of this.state.players.values()) {
            console.log(`Player ${player.name} is ready: ${player.isReady}`);
        }
        console.log(`All players ready: ${allReady}`);
        if (allReady && this.state.players.size >= 2) {
            console.log("Starting game...");
            this.startGame();
        }
    }

    startGame() {
        this.state.gamePhase = 'dealing';

        const playerIds = Array.from(this.state.players.keys());

        // Deal initial cards with a slight delay
        const dealCards = async () => {
            for (let i = 0; i < 5; i++) {
                for (const playerId of playerIds) {
                    await new Promise(resolve => setTimeout(resolve, 100)); // Simulate dealing delay
                    const player = this.state.players.get(playerId);
                    const card = this.state.deck.pop();
                    if (card) {
                        player.hand.push(card);
                    }
                }
            }

            // Start the first turn after dealing
            this.state.currentTurn = playerIds[0];
            this.state.gamePhase = 'playing';
            console.log('Game started');
        };

        dealCards();
    }

    nextTurn() {
        const playerIds = Array.from(this.state.players.keys());
        const currentIndex = playerIds.indexOf(this.state.currentTurn);
        const nextIndex = (currentIndex + 1) % playerIds.length;
        this.state.currentTurn = playerIds[nextIndex];
    }

    onJoin(client, options) {
        const player = new Player();
        player.name = options.name || `Player ${client.sessionId}`;
        this.state.players.set(client.sessionId, player);

        console.log(`Player joined: ${player.name}. Current player count: ${this.state.players.size}`);
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

        // End the game if there aren't enough players
        if (this.state.players.size < 2 && this.state.gamePhase === 'playing') {
            console.log("Not enough players to continue. Ending game...");
            this.state.gamePhase = 'ended';
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
            [shuffledDiscardPile[i], shuffledDiscardPile[j]] = [shuffledDiscardPile[j], shuffledDiscardPile[i]];
        }

        // Add shuffled cards back to the deck
        this.state.deck.push(...shuffledDiscardPile);
    }

    broadcastGameStateUpdate() {
        this.broadcast("stateUpdate", this.state.toJSON());
    }
}

module.exports = { CardRoom };
