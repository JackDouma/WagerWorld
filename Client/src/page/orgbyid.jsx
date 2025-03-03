import { useEffect, useState } from "react";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { useParams } from "react-router-dom";
import { useNavigate } from 'react-router-dom';
import { Client } from 'colyseus.js';

const db = getFirestore();
const auth = getAuth();

function ViewOrgById() {
    const [orgName, setOrgName] = useState("");
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [client, setClient] = useState(null);
    const { orgId } = useParams();

    useEffect(() => {
        const colyseusClient = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);
        setClient(colyseusClient);
        fetchAvailableRooms(colyseusClient);

        // Refresh room list periodically
        const interval = setInterval(() => {
            fetchAvailableRooms(colyseusClient);
        }, 5000);
        
        
        const fetchOrgData = async () => {
            try {
                const orgDocRef = doc(db, "orgs", orgId);
                const orgDoc = await getDoc(orgDocRef);

                if (orgDoc.exists()) 
                {
                    const orgData = orgDoc.data();
                    setOrgName(orgData.name || "Unknown Organization");

                    setMembers(
                        (orgData.member || []).map((member) => ({
                            ...member,
                            joinedAt: member.joinedAt?.toDate(),
                        }))
                    );
                }
            } 
            catch (err) 
            {
                console.error("ERROR:", err);
                setError("Error loading organization data");
            } 
            finally 
            {
                setLoading(false);
            }
        };

        fetchOrgData();
        return () => clearInterval(interval);
    }, [orgId]);

    const [roomId, setRoomId] = useState("");
    const [availableRooms, setAvailableRooms] = useState([]);
    const navigate = useNavigate();

    const [showGames, setShowGames] = useState(false);

    const [gameSelections, setGameSelections] = useState({
        blackjack: 0,
        poker: 0,
        horseRacing: 0,
    });

    // open game selection screen when user presses create room
    const openGameSelection = () => {
        setShowGames(true);
    };

    // when the user is okay with the games selected
    const handleConfirm = async () => {
        const totalRooms = gameSelections.blackjack + gameSelections.poker + gameSelections.horseRacing;
        const currentUser = auth.currentUser;

        // if no games are chosen, return and give error message
        if (totalRooms < 1) 
        {
            alert("You must select at least one room.");
            return;
        }

        const postData = {
            roomType: "card_room",
            maxPlayers: 8,
            hostId: currentUser.uid,
            games: gameSelections,
        };
    
        try {
            const response = await fetch(`${import.meta.env.VITE_COLYSEUS_HTTP_URL}/create-room`, {
                method: 'POST',

                headers: {
                    'Content-Type': 'application/json'
                },

                body: JSON.stringify(postData)
            });
    
            const jsonResponse = await response.json();
    
            // pass games to room
            if (response.ok && jsonResponse.roomId) 
            {
                navigate(`/room/${jsonResponse.roomId}`, { state: { games: gameSelections } });
            } 
            else 
            {
                console.error("ERROR: ", jsonResponse);
            }
        } 
        catch (error) 
        {
            console.error('ERROR: ', error);
        }
    };

    // when game value changes
    const handleGameChange = (game, value) => {
        const intVal = Math.max(0, Math.min(3, parseInt(value) || 0));

        setGameSelections(prev => ({
            ...prev,
            [game]: intVal,
        }));
    };

    const joinRoom = () => {
        if (roomId) 
        {
            navigate(`/room/${roomId}`);
        } 
        else 
        {
            alert("Please enter a valid room ID.");
        }
    };

    const fetchAvailableRooms = async (client) => {
        try {
            const rooms = await client.getAvailableRooms('card_room');
            setAvailableRooms(rooms);
        } 
        catch (e) 
        {
            setError('ERROR: failed to fetch rooms');
        }
    };

    return (
        <main>
            <h1>{orgName}</h1>

            <div>
                <div>
                    <h2>Create New Room</h2>
                    <button onClick={openGameSelection}>Create Room</button>
                </div>

                <div>
                    <h2>Public Rooms</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Type</th>
                                <th>Host</th>
                                <th>Game</th>
                                <th>Players</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {availableRooms.length > 0 ? (
                                availableRooms.map((room) => (
                                    <tr key={room.roomId}>
                                        {/* TODO: Make all of these dynamic */}
                                        <td>Public</td>
                                        <td>Temp</td>
                                        <td>Temp</td>
                                        <td>{room.clients}</td>
                                        <td><a href={`/room/${room.roomId}`}>Join</a></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5">No public rooms available.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div>
                    <h2>Join Room by Code</h2>
                    <div>
                        <input
                            type="text"
                            value={roomId}
                            onChange={(e) => setRoomId(e.target.value)}
                            placeholder="Enter Room ID"
                        />
                        <button onClick={() => joinRoom(roomId)}>Join</button>
                    </div>
                </div>
            </div>
            
            {loading && <p>Loading...</p>}
            {error && <p>{error}</p>}
            {!loading && members.length > 0 && (
                <div>
                    <h2>Members</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Joined At</th>
                                <th>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.map((member, index) => (
                                <tr key={index}>
                                    <td><a href={`/user/${member.id}`}>{member.name}</a></td>
                                    <td>{member.email}</td>
                                    <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                                    <td>0</td> {/* TODO: Add Balance leaderboard */}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {!loading && members.length === 0 && <p>No members found.</p>}

            {/* when user selects create room, show this */}
            {showGames&& (
                <div style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    backgroundColor: "rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}>
                    <div style={{
                        backgroundColor: "#fff",
                        padding: "20px",
                        borderRadius: "5px",
                        width: "300px"
                    }}>
                        <h2>Select Games</h2>
                        <div>
                            <label>
                                Blackjack:
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="3"
                                    value={gameSelections.blackjack}
                                    onChange={(e) => handleGameChange("blackjack", e.target.value)}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Poker:
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="3"
                                    value={gameSelections.poker}
                                    onChange={(e) => handleGameChange("poker", e.target.value)}
                                />
                            </label>
                        </div>
                        <div>
                            <label>
                                Horse Racing:
                                <input 
                                    type="number" 
                                    min="0" 
                                    max="3"
                                    value={gameSelections.horseRacing}
                                    onChange={(e) => handleGameChange("horseRacing", e.target.value)}
                                />
                            </label>
                        </div>
                        <div style={{ marginTop: "20px", display: "flex", justifyContent: "space-between" }}>
                        <button onClick={handleConfirm}>Confirm</button>
                            <button onClick={() => setShowGames(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default ViewOrgById;
