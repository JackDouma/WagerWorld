import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Client } from "colyseus.js";

const client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);

function RoomPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(true);
    const [room, setRoom] = useState(null);
    const [gamePhase, setGamePhase] = useState("waiting");
    const [games, setGames] = useState([]);
    const [roomType, setRoomType] = useState(null);
    const [isOwner, setIsOwner] = useState(false);

    useEffect(() => {
        const joinRoom = async () => {
            try {
                const token = localStorage.getItem('firebaseIdToken');
                const joinedRoom = await client.joinById(roomId, { playerId: token });
                setRoom(joinedRoom);
                if (location.state && location.state.lobbyType) {
                    setRoomType(location.state.lobbyType);
                }


                joinedRoom.onStateChange((state) => {
                    console.log("State changed:", state);
                    setGamePhase(state.gamePhase);
                });

                joinedRoom.onLeave(() => navigate("/signin")); // redirects to org page if signed in

                joinedRoom.onMessage('owner', () => {
                    setIsOwner(true);
                });

                joinedRoom.onMessage('rooms', (message) => {
                    setGames([]);
                    if (typeof message.blackjack !== 'undefined' && message.blackjack.length > 0) {
                        for (let i = 0; i < message.blackjack.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                { name: "Blackjack", path: `/blackjack/${message.blackjack[i]}` }
                            ]);
                        }
                    }
                    if (typeof message.poker !== 'undefined' && message.poker.length > 0) {
                        for (let i = 0; i < message.poker.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                { name: "Poker", path: `/poker/${message.poker[i]}` }
                            ]);
                        }
                    }
                    if (typeof message.horseracing !== 'undefined' && message.horseracing.length > 0) {
                        for (let i = 0; i < message.horseracing.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                { name: "Horse Racing", path: `/horseracing/${message.horseracing[i]}` }
                            ]);
                        }
                    }
                    if (typeof message.roulette !== 'undefined' && message.roulette.length > 0) {
                        for (let i = 0; i < message.roulette.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                { name: "Roulette", path: `/roulette/${message.roulette[i]}` }
                            ]);
                        }
                    }
                    setLoading(false);
                });
                
                joinedRoom.send('getRooms');
            } 
            catch (error) 
            {
                console.error("ERROR: ", error);
                navigate(`/signin`);
            }
        };

        joinRoom();
    }, [roomId, navigate]);

    function destroyRoom() {
        var token = localStorage.getItem("firebaseIdToken");
        room.send('destroyLobby', { playerId: token });
        navigate('/signin');
    }

    /*
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
    */

    return (
        <div>
            <h1>Room ID: {roomId}</h1>
            <h2>Room Type: {roomType}</h2>
            <h2>Select a Game:</h2>
            
            <div className="games">
                {!loading && games.map((game, index) => (
                    <button key={index} onClick={() => navigate(game.path)}>
                        {game.name}
                    </button>
                ))}
            </div>
            <div>
                {!loading && isOwner ? <button onClick={() => destroyRoom()}>Delete Lobby</button> : ""}
            </div>
            <input type="hidden" id="headerRoomId" value={roomId} />
        </div>
    );
}

export default RoomPage;
