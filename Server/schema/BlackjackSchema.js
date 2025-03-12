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

class BlackjackPlayer extends Schema {
    constructor() {
        super();
        this.name = '';
        this.hand = new ArraySchema();
        this.isReady = false;
        this.bet = 0;
        this.handValue = 0;
        this.totalCredits = 0;
    }
}
schema.defineTypes(BlackjackPlayer, {
    name: "string",
    hand: [ Card ],
    isReady: "boolean",
    bet: "number",
    handValue: "number",
    totalCredits: "number"
});

class BlackjackState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.waitingRoom = new MapSchema();
        this.dealer = new BlackjackPlayer();
        this.deck = new ArraySchema();
        this.currentTurn = '';
        this.gamePhase = 'waiting';
        this.owner = '';
        this.disconnectCheck = false;
    }
}
schema.defineTypes(BlackjackState, {
    players: { map: BlackjackPlayer },
    waitingRoom: { map: BlackjackPlayer },
    dealer: BlackjackPlayer,
    deck: [ Card ],
    currentTurn: "string",
    gamePhase: "string",
    owner: "string",
    disconnectCheck: "boolean"
});

module.exports = { Card, BlackjackPlayer, BlackjackState };