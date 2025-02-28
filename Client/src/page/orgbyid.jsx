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

    const { orgId } = useParams();

    useEffect(() => {
        const colyseusClient = new Client(`${import.meta.env.VITE_COLYSEUS_URL}`);

        setClient(colyseusClient);

        // Get initial room listing
        fetchAvailableRooms(colyseusClient);

        // Refresh room list periodically
        const interval = setInterval(() => {
            fetchAvailableRooms(colyseusClient);
        }, 5000);
        
        const fetchOrgData = async () => {
        try {
            const currentUser = auth.currentUser;

            const orgDocRef = doc(db, "orgs", orgId);
            const orgDoc = await getDoc(orgDocRef);

            if (orgDoc.exists()) {
            const orgData = orgDoc.data();

            setOrgName(orgData.name || "Unknown Organization");

            setMembers(
                (orgData.member || []).map((member) => ({
                ...member,
                // convert firestore data to JS date
                joinedAt: member.joinedAt?.toDate(),
                }))
            );
            }
        } catch (err) {
            console.error("ERROR:", err);
            setError("Error loading organization data");
        } finally {
            setLoading(false);
        }
        };

        fetchOrgData();
    }, [orgId]);

    const [roomId, setRoomId] = useState("");
    const [availableRooms, setAvailableRooms] = useState([]);
    const [client, setClient] = useState(null);
    const navigate = useNavigate();

    const createRoom = async () => {
        const currentUser = auth.currentUser;

        if (!currentUser) 
        {
            console.error("User is not authenticated");
            return;
        }
    
        const postData = {
            roomType: "card_room",
            maxPlayers: 8,
            creatorId: currentUser.uid,
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
    
            if (response.ok && jsonResponse.roomId) 
            {
                navigate(`/room/${jsonResponse.roomId}`);
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
            
            // room must be from same org
            const memberIds = members.map(member => member.id);
            const filteredRooms = rooms.filter(room => memberIds.includes(room.metadata?.creatorId));
    
            setAvailableRooms(filteredRooms);
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
                <button onClick={createRoom}>Create Room</button>
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
        </main>
    );
}

export default ViewOrgById;
