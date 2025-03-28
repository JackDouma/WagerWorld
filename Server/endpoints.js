// endpoints.js
const express = require('express');
const router = express.Router();
const { matchMaker } = require('@colyseus/core');

// Example: POST endpoint for creating rooms
router.post('/create-room', async (req, res) => {
  try {
    const room = await matchMaker.createRoom('blackjack', { maxPlayers: 8 });
    res.json({ roomId: room.roomId });
  } catch (error) {
    res.status(400).json({ ERROR: error.message });
  }
});

router.post('/save-game-result', async (req, res) => {
  try {
    const { userId, result } = req.body;
    await req.firestore.collection('gameResults').doc(userId).set({
      result,
      timestamp: req.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save game result' });
  }
});

module.exports = router;