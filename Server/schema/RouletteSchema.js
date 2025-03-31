// schema/CardGameSchema.js
const schema = require('@colyseus/schema');
const { Schema, MapSchema, ArraySchema, type } = schema;

class RoulettePlayer extends Schema {
    constructor() {
        super();
        this.name = '';
        this.isReady = false;
        this.chipAlphas = new ArraySchema(0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01,0.01)
        this.bet = 0;
        this.total = 0; // winnings over session
    }
}
schema.defineTypes(RoulettePlayer, {
    name: "string",
    isReady: "boolean",
    chipAlphas: ["number"],
    bet: "number",
    total: "number"
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