import React, { useState, useEffect } from 'react';
import { Client } from 'colyseus.js';

const RoomConnection = () => {
  const [client, setClient] = useState(null);
  const [availableRooms, setAvailableRooms] = useState([]);
  const [currentRoom, setCurrentRoom] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const colyseusClient = new Client('ws://localhost:2567');
    setClient(colyseusClient);

    // Get initial room listing
    fetchAvailableRooms(colyseusClient);

    // Refresh room list periodically
    const interval = setInterval(() => {
      fetchAvailableRooms(colyseusClient);
    }, 5000);

    return () => {
      clearInterval(interval);
      if (currentRoom) {
        currentRoom.leave();
      }
    };
  }, []);

  useEffect(() => {

    if(!currentRoom) return;

    const handleStateChange = (state) => {
      // Get current player's hand
      const player = state.players.get(currentRoom.sessionId);
      if (player?.hand) {
        setCards([...player.hand]);
      }
    };


    currentRoom.onStateChange(handleStateChange);
    handleStateChange(currentRoom.state);
  
    return () => {
      currentRoom.onStateChange.remove(handleStateChange);
    };
  }, [currentRoom])

  const fetchAvailableRooms = async (client) => {
    try {
      const rooms = await client.getAvailableRooms('card_room');
      setAvailableRooms(rooms);
    } catch (e) {
      setError('Failed to fetch rooms');
    }
  };

  const createRoom = async () => {
    try {
      const room = await client.create('card_room');
      setCurrentRoom(room);
      setError('');

      room.onLeave(() => {
        setCurrentRoom(null);
      });
    } catch (e) {
      setError('Failed to create room');
    }
  };

  const joinRoom = async (roomId) => {
    try {
      const room = await client.joinById(roomId);
      navigate(`/room/${roomId}`);  // Navigate to CardRoom component
    } catch (e) {
      setError('Failed to join room');
    }
  };

  const leaveRoom = () => {
    if (currentRoom) {
      currentRoom.leave();
      setCurrentRoom(null);
    }
  };

  const drawCard = () => {
    if (currentRoom) {
      currentRoom.send('drawCard');
    }
  };

  const ready = () => {
    if (currentRoom) {
      currentRoom.send('ready');
    }
  };

  const cards = currentRoom?.state?.players?.get(client.sessionId)?.hand || [];

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Colyseus Rooms</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {currentRoom ? (
        <div className="bg-green-100 border border-green-400 p-4 rounded mb-4">
          <p className="font-semibold">Connected to room: {currentRoom.id}</p>
          <p className="mb-2">Players: {currentRoom.state?.players?.size}</p>
          <button
            onClick={leaveRoom}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
          >
            Leave Room
          </button>
          <button
            onClick={ready}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded ml-2"

          >
            Ready
          </button>
          <button
            onClick={drawCard}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded ml-2">
            Draw Card
          </button>
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
      ) : (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">Create New Room</h2>
            <button
              onClick={createRoom}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Create Room
            </button>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Join Existing Room</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Enter Room ID"
                className="border p-2 rounded flex-1"
              />
              <button
                onClick={() => joinRoom(roomId)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
              >
                Join
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Available Rooms</h2>
            <div className="space-y-2">
              {availableRooms.map((room) => (
                <div key={room.roomId} className="border p-2 rounded flex justify-between items-center">
                  <div>
                    <p className="font-medium">Room: {room.roomId}</p>
                    <p className="text-sm text-gray-600">Clients: {room.clients}</p>
                  </div>
                  <button
                    onClick={() => joinRoom(room.roomId)}
                    className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomConnection;