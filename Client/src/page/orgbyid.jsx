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
        const room = await client.create("card_room"); // Replace "your_room_name" with your room type
        navigate(`/room/${room.id}`);
    };

    const joinRoom = () => {
        if (roomId) {
        navigate(`/room/${roomId}`);
        } else {
        alert("Please enter a valid room ID.");
        }
    };

    const fetchAvailableRooms = async (client) => {
        try {
        const rooms = await client.getAvailableRooms('card_room');
        setAvailableRooms(rooms);
        } catch (e) {
        setError('Failed to fetch rooms');
        }
    };

        useEffect(() => {
        const colyseusClient = new Client('ws://localhost:2567');
        setClient(colyseusClient);
    
        // Get initial room listing
        fetchAvailableRooms(colyseusClient);
    
        // Refresh room list periodically
        const interval = setInterval(() => {
            fetchAvailableRooms(colyseusClient);
        }, 5000);
        }, []);



    return (
        <main>
        <h1>{orgName}</h1>

        <div className="roomOptions">
            <button>Create Room</button>
            <button>Join Room</button>
        </div>

        <div>
            <h2>Available Rooms</h2>
            <table>
            <thead>
                <tr>
                <th>Host</th>
                <th>Type</th>
                <th>Players</th>
                <th>Games</th>
                <th></th>
                </tr>
            </thead>
            <tbody>
                <tr>
                <td>Justin</td>
                <td>Public</td>
                <td>7/20</td>
                <td>Poker(2), Blackjack(2), Crazy 8s(1)</td>
                <td>Join</td>
                </tr>
                <tr>
                <td>Eric</td>
                <td>Private</td>
                <td>4/20</td>
                <td>Poker(1), Blackjack(1)</td>
                <td>Join</td>
                </tr>
            </tbody>
            </table>
        </div>
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
                    <td>0</td> {/* Assuming balance is 0 for now */}
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