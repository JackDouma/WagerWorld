// schema/CardGameSchema.js
const schema = require('@colyseus/schema');
const { Schema, MapSchema, ArraySchema, type } = schema;

class RoulettePlayer extends Schema {
    constructor() {
        super();
        this.name = '';
        this.hand = new ArraySchema();
        this.isReady = false;
        this.score = 0;
        this.bet = 0;
        this.handValue = 0;
        this.totalCredits = 0;
    }
}
schema.defineTypes(RoulettePlayer, {
    name: "string",
    isReady: "boolean",
    score: "number",
    bet: "number",
    handValue: "number",
    totalCredits: "number"
});

class RouletteState extends Schema {
    constructor() {
        super();
        this.players = new MapSchema();
        this.waitingRoom = new MapSchema();
        this.gamePhase = 'waiting';
        this.owner = '';
        this.disconnectCheck = false;
    }
}
schema.defineTypes(RouletteState, {
    players: { map: RoulettePlayer },
    waitingRoom: { map: RoulettePlayer },
    gamePhase: "string",
    owner: "string",
    disconnectCheck: "boolean"
});

module.exports = { RoulettePlayer, RouletteState };