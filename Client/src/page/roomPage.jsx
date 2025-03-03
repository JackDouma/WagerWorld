import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Client } from "colyseus.js";

const client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);

function RoomPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [room, setRoom] = useState(null);
    const [gamePhase, setGamePhase] = useState("waiting");

    // get selected games
    const selectedGames = location.state?.games || { blackjack: 1, poker: 1, horseRacing: 1 };

    useEffect(() => {
        const joinRoom = async () => {
            try {
                const joinedRoom = await client.joinById(roomId);
                setRoom(joinedRoom);

                joinedRoom.onStateChange((state) => {
                    console.log("State changed:", state);
                    setGamePhase(state.gamePhase);
                });

                joinedRoom.onLeave(() => navigate("/"));
            } 
            catch (error) 
            {
                console.error("ERROR: ", error);
                navigate("/");
            }
        };

        joinRoom();
    }, [roomId, navigate]);

    // create game buttons
    const games = [];

    if (selectedGames.blackjack > 0) 
    {
        for (let i = 0; i < selectedGames.blackjack; i++) 
        {
            games.push({ name: "Blackjack", path: `/blackjack/${roomId}` });
        }
    }
    if (selectedGames.poker > 0) 
    {
        for (let i = 0; i < selectedGames.poker; i++) 
        {
            games.push({ name: "Poker", path: `/poker/${roomId}` });
        }
    }
    if (selectedGames.horseRacing > 0) 
    {
        for (let i = 0; i < selectedGames.horseRacing; i++) 
        {
            games.push({ name: "Horse Racing", path: `/horseracing/${roomId}` });
        }
    }

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
