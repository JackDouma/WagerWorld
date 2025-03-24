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

class PokerPlayer extends Schema {
    constructor() {
        super();
        this.name = '';
        this.hand = new ArraySchema();
        this.fireBaseId = '';
        this.isReady = false;
        this.lastAction = "none"
        this.blind = 0;
        this.bet = 0;
        this.totalCredits = 0;
    }
}
schema.defineTypes(PokerPlayer, {
    name: "string",
    hand: [ Card ],
    isReady: "boolean",
    lastAction: "string",
    blind: "number",
    bet: "number",
    totalCredits: "number"
});

class PokerState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.waitingRoom = new MapSchema();
        this.dealer = new ArraySchema();
        this.deck = new ArraySchema();
        this.currentTurn = '';
        this.gamePhase = 'waiting';
        this.owner = '';
        this.pot = 0;
        this.highestBet = 0;
        this.disconnectCheck = false;
    }
}
schema.defineTypes(PokerState, {
    players: { map: PokerPlayer },
    waitingRoom: { map: PokerPlayer },
    dealer: [ Card ],
    deck: [ Card ],
    currentTurn: "string",
    gamePhase: "string",
    owner: "string",
    pot: "number",
    highestBet: "number",
    disconnectCheck: "boolean"
});

module.exports = { Card, PokerPlayer, PokerState };