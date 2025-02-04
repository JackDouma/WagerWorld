// schema/CardGameSchema.js
const schema = require('@colyseus/schema');
const { Schema, MapSchema, ArraySchema, type } = schema;

class Card extends Schema {
    constructor(suit, rank, id) {
        super();
        this.suit = suit;
        this.rank = rank;
        this.id = id;
        this.faceUp = false;
    }
}
schema.defineTypes(Card, {
    suit: "string",
    rank: "string",
    id: "string",
    faceUp: "boolean"
});

class Player extends Schema {
    constructor() {
        super();
        this.name = '';
        this.hand = new ArraySchema();
        this.isReady = false;
        this.score = 0;
    }
}
schema.defineTypes(Player, {
    name: "string",
    hand: [ Card ],
    isReady: "boolean",
    score: "number"
});

class CardGameState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.deck = new ArraySchema();
        this.discardPile = new ArraySchema();
        this.currentTurn = '';
        this.gamePhase = 'waiting';
        this.lastAction = '';
    }
}
schema.defineTypes(CardGameState, {
    players: { map: Player },
    deck: [ Card ],
    discardPile: [ Card ],
    currentTurn: "string",
    gamePhase: "string",
    lastAction: "string"
});

module.exports = { Card, Player, CardGameState };