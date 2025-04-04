const schema = require("@colyseus/schema");
const { Schema, MapSchema, ArraySchema, type } = schema;

class BaccaratPlayer extends Schema {
}

class BaccaratState extends Schema {
}

module.exports = { BaccaratPlayer, BaccaratState };