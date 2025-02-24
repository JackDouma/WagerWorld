import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Client } from "colyseus.js";

<<<<<<< HEAD
const client = new Client("ws://localhost:2567"); // Replace with your Colyseus server URL
=======
const client = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);
>>>>>>> 7a0ecd3672acbbdee0806160e831d588ea79c157

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

                  // on game start
                  console.log("Updated gamePhase:", gamePhase);
                  if (state.gamePhase === "blackjack") {
                    console.log("Navigating to Blackjack");
                    navigate("/blackjack");
                  }
              });

              joinedRoom.onLeave(() => navigate("/"));
            } 
            catch (error) 
            {
                console.error("Error joining room:", error);
                navigate("/");
            }
        };

        joinRoom();
    }, [roomId, navigate]);

    const ready = () => {
        if (room && gamePhase === "waiting") 
        {
           room.send("ready");
        }
    };

    return (
        <div>
            <h1>Room ID: {roomId}</h1>
            <p>Game Phase: {gamePhase}</p>
            {gamePhase === "waiting" && (
                <>
                    <p>Waiting for players...</p>
                    <button onClick={ready}>Ready</button>
                </>
            )}
        </div>
    );
}

export default RoomPage;
