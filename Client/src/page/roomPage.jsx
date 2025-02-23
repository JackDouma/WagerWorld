import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Client } from 'colyseus.js';

const client = new Client("ws://localhost:2567"); // Replace with your Colyseus server URL

function RoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [room, setRoom] = useState(null);
  const [playerHand, setPlayerHand] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [gamePhase, setGamePhase] = useState('waiting');
  const [discardPile, setDiscardPile] = useState([]);

  useEffect(() => {
    const joinRoom = async () => {
      try {
        const joinedRoom = await client.joinById(roomId);
        setRoom(joinedRoom);

        // Listen for state changes
        joinedRoom.onStateChange((state) => {
          console.log("State changed:", state);
          const player = state.players[joinedRoom.sessionId];
          console.log(player)
          if (player) {
            setPlayerHand(player.hand || []);
          }
          setCurrentTurn(state.currentTurn);
          setGamePhase(state.gamePhase);
          setDiscardPile(state.discardPile || []);
        });

        // Listen for custom events
        joinedRoom.onMessage("stateUpdate", (message) => {
          console.log("Received state update:", message);
        });

        joinedRoom.onMessage("gameEnded", (message) => {
          console.log("Game ended:", message.reason);
          alert(`Game ended: ${message.reason}`);
          navigate('/');
        });

        // Handle disconnection
        joinedRoom.onLeave((code) => {
          console.log("Left room with code:", code);
          navigate('/');
        });
      } catch (error) {
        console.error("Error joining room:", error);
        navigate('/');
      }
    };

    joinRoom();
  }, [roomId, navigate]);

  const drawCard = () => {
    if (room && gamePhase === 'playing' && room.sessionId === currentTurn) {
      room.send("drawCard");
    } else {
      alert("It's not your turn or the game hasn't started yet.");
    }
  };

  const playCard = (cardId) => {
    if (room && gamePhase === 'playing' && room.sessionId === currentTurn) {
      room.send("playCard", { cardId });
    } else {
      alert("It's not your turn or the game hasn't started yet.");
    }
  };

    const ready = () => {
    if (room && gamePhase === 'waiting') {
      room.send("ready");
    } else {
      alert("It's not your turn or the game hasn't started yet.");
        }
    };

  return (
    <div>
      <h1>Room ID: {roomId}</h1>
      <p>Game Phase: {gamePhase}</p>
      <p>Current Turn: {currentTurn}</p>
      {gamePhase === 'waiting' && (
      <>
        <p>Waiting for players...</p>
        <button onClick={ready}>Ready</button>
      </>
    )}
      <div>
        <h2>Your Hand:</h2>
        <ul>
          {playerHand.map((card) => (
            <li key={card.id}>
              {card.rank} of {card.suit}{' '}
              <button onClick={() => playCard(card.id)} disabled={gamePhase !== 'playing' || room.sessionId !== currentTurn}>
                Play
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div>
        <h2>Discard Pile:</h2>
        <ul>
          {discardPile.map((card) => (
            <li key={card.id}>
              {card.faceUp ? `${card.rank} of ${card.suit}` : 'Face Down'}
            </li>
          ))}
        </ul>
      </div>

      <button onClick={drawCard} disabled={gamePhase !== 'playing' || room.sessionId !== currentTurn}>
        Draw Card
      </button>
    </div>
  );
}

export default RoomPage;
