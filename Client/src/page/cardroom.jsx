import React, { useState, useEffect } from 'react';
import { Client } from 'colyseus.js';
import { useParams, useNavigate } from 'react-router-dom';

const CardRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [client] = useState(new Client(`ws://${import.meta.env.VITE_COLYSEUS_HOST}:${import.meta.env.VITE_COLYSEUS_PORT}`));
  const [currentRoom, setCurrentRoom] = useState(null);
  const [error, setError] = useState('');
  const [cards, setCards] = useState([]);

  useEffect(() => {
    const joinRoom = async () => {
      try {
        const room = await client.joinById(roomId);
        setCurrentRoom(room);
        
        room.onLeave(() => {
          navigate('/');
        });

        room.onStateChange((state) => {
          const player = state.players.get(room.sessionId);
          if (player?.hand) {
            setCards([...player.hand]);
          }
        });

      } catch (error) {
        setError('Failed to join room');
        navigate('/');
      }
    };

    joinRoom();

    return () => {
      if (currentRoom) {
        currentRoom.leave();
      }
    };
  }, [roomId]);

  const handleReady = () => {
    currentRoom.send('ready');
  };

  const handleDrawCard = () => {
    currentRoom.send('drawCard');
  };

  const handleLeaveRoom = () => {
    navigate('/');
  };

  if (error) {
    return (
      <div className="p-4 max-w-md mx-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Card Room: {roomId}</h1>
      
      <div className="bg-green-100 border border-green-400 p-4 rounded mb-4">
        <div className="flex justify-between items-center mb-4">
          <button 
            onClick={handleLeaveRoom}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Leave Room
          </button>
          <div className="space-x-2">
            <button 
              onClick={handleReady}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Ready
            </button>
            <button 
              onClick={handleDrawCard}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Draw Card
            </button>
          </div>
        </div>

        <div className="mt-4">
          <h2 className="text-xl font-semibold mb-2">Your Cards:</h2>
          <ul className="list-disc list-inside">
            {cards.map((card, index) => (
              <li key={index}>
                {card.rank} of {card.suit}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default CardRoom;
