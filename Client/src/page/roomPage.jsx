import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Client } from "colyseus.js";

const client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);

function RoomPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [room, setRoom] = useState(null);
    const [gamePhase, setGamePhase] = useState("waiting");

    useEffect(() => {
        const joinRoom = async () => {
            try {
                const joinedRoom = await client.joinById(roomId);
                setRoom(joinedRoom);

                // listener
                joinedRoom.onStateChange((state) => {
                    console.log("State changed:", state);
                    setGamePhase(state.gamePhase);
                });

                joinedRoom.onLeave(() => navigate("/"));
            } catch (error) {
                console.error("Error joining room:", error);
                navigate("/");
            }
        };

        joinRoom();
    }, [roomId, navigate]);

    const games = [
        { name: "Blackjack", path: `/blackjack/${roomId}` },
        { name: "Poker", path: `/poker/${roomId}` },
        { name: "Horse Racing", path: `/horseracing/${roomId}` }
    ];

    return (
        <div>
            <h1>Room ID: {roomId}</h1>
            <h2>Select a Game:</h2>
            <div className="games">
                {games.map((game, index) => (
                    <button key={index} onClick={() => navigate(game.path)}>
                        {game.name}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default RoomPage;