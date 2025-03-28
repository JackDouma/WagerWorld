const schema = require("@colyseus/schema");
const { Schema, MapSchema, ArraySchema, type } = schema;

class BaccaratPlayer extends Schema {
  constructor() {
    super();
    this.name = "";
    this.fireBaseId = "";
    // this.hand = new ArraySchema();
    this.betType = "";
    this.isReady = false;
    this.bet = 0;
    // this.handValue = 0;
    this.totalCredits = 0;
  }
}
schema.defineTypes(BaccaratPlayer, {
  name: "string",
  // hand: [ Card ],
  betType: "string",
  isReady: "boolean",
  bet: "number",
  // handValue: "number",
  totalCredits: "number",
});

class BaccaratState extends Schema {
  constructor() {
    super();
    this.players = new MapSchema();
    this.waitingRoom = new MapSchema();
    // this.dealer = new BlackjackPlayer();
    // this.deck = new ArraySchema();
    // this.currentTurn = "";
    this.gamePhase = "waiting";
    this.owner = "";
    this.disconnectCheck = false;
  }
}
schema.defineTypes(BaccaratState, {
    players: { map: BaccaratState },
    waitingRoom: { map: BaccaratPlayer },
    // dealer: BlackjackPlayer,
    // deck: [ Card ],
    // currentTurn: "string",
    gamePhase: "string",
    owner: "string",
    disconnectCheck: "boolean"
});

module.exports = { BaccaratPlayer, BaccaratState };
