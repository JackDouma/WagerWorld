// rooms/CardRoom.js
const { Room } = require('@colyseus/core');
const { Card, Player, CardGameState } = require('../schema/CardGameSchema');
const { ArraySchema } = require('@colyseus/schema');

class CardRoom extends Room {
    onCreate(options) {
        this.setState(new CardGameState());
        this.maxClients = options.maxPlayers || 4;
        
        // Add logging to track player count
        console.log(`Room created. Current player count: ${this.state.players.length}`);

        // Initialize deck
        this.initializeDeck();

        this.onMessage("ready", (client, message) => {
            const player = this.state.players.get(client.sessionId);
            if (player) {
                player.isReady = true;
                this.checkGameStart();
            }
        });

        this.onMessage("playCard", (client, message) => {
            if (this.state.currentTurn !== client.sessionId) return;
            const player = this.state.players.get(client.sessionId);

            if (!player) return;

            const cardIndex = player.hand.findIndex(card => card.id === message.cardId);
            if (cardIndex === -1) return;

            // Move card from hand to discard pile
            const [card] = player.hand.splice(cardIndex, 1);
            card.faceUp = true;
            this.state.discardPile.push(card);
            this.nextTurn();
        });

        this.onMessage("drawCard", (client, message) => {
            if (this.state.currentTurn !== client.sessionId) return;
            const player = this.state.players.get(client.sessionId);
            console.log('players hand', player.hand);
            console.log('deck', this.state.deck);
            console.log('player', player);
            if (!player) return;

            if (this.state.deck.length > 0) {
                const card = this.state.deck.pop();
                player.hand.push(card);
            }



        });


    }

    initializeDeck() {
        const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
        const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
        
        const deck = new ArraySchema();
        let id = 0;
        
        for (const suit of suits) {
            for (const rank of ranks) {
                deck.push(new Card(suit, rank, `${id++}`));
            }
        }

        // Shuffle deck
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const temp = deck[i];
            deck[i] = deck[j];
            deck[j] = temp;
        }

        this.state.deck = deck;
    }

    checkGameStart() {
        const allReady = Array.from(this.state.players.values()).every(player => player.isReady);
        if (allReady && this.state.players.size >= 2) {
            this.startGame();
        }
    }

    startGame() {
        this.state.gamePhase = 'dealing';
        
        // Deal initial cards (e.g., 5 cards each)
        const playerIds = Array.from(this.state.players.keys());
        for (let i = 0; i < 5; i++) {
            for (const playerId of playerIds) {
                const player = this.state.players.get(playerId);
                const card = this.state.deck.pop();
                if (card) {
                    player.hand.push(card);
                }
            }
        }

        // Start first turn
        this.state.currentTurn = playerIds[0];
        this.state.gamePhase = 'playing';
        console.log('Game started');

        
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
    }

    onLeave(client) {
        const player = this.state.players.get(client.sessionId);
        if (player) {
            // Return player's cards to deck
            for (const card of player.hand) {
                this.state.deck.push(card);
            }
            this.state.players.delete(client.sessionId);
        }

        // If game is in progress, might want to pause or end it
        if (this.state.gamePhase === 'playing') {
            this.state.gamePhase = 'waiting';
        }
    }
}

module.exports = { CardRoom };