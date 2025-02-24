import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc, getFirestore } from "firebase/firestore";
import { auth } from "../../firebase";
import { signOut, deleteUser, onAuthStateChanged } from "firebase/auth";

const db = getFirestore();

function ViewUserById() 
{
    const { userId } = useParams();
    const navigate = useNavigate();

    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userOrg, setUserOrg] = useState("");
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [isAccountOwner, setIsAccountOwner] = useState(false);
    const [gameHistory, setGameHistory] = useState([]);

    useEffect(() => {
        // check if user is the account owner
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user?.uid === userId) 
            {
                setIsAccountOwner(true);
            }
        });

        async function fetchUser() 
        {
            try {
                const userDoc = await getDoc(doc(db, "users", userId));

                // found user
                if (userDoc.exists()) 
                {
                    const userData = userDoc.data();
                    setUserName(userData.name || "");
                    setUserEmail(userData.email || "");
                    setUserOrg(userData.org || "");
                    setGameHistory(userData.gameHistory || []);
                } 
                // user not found
                else 
                {
                    console.error("User not found");
                    navigate("/");
                }
            } 
            catch (error) 
            {
                console.error("Error fetching user:", error);
            } 
            finally 
            {
                setLoading(false);
            }
        }
        fetchUser();
    }, [userId, navigate]);

    // update name
    const handleSaveName = async () => {
        try 
        {
            await updateDoc(doc(db, "users", userId), { name: userName });
            setEditMode(false);
            alert("Name updated!");
        } 
        catch (error) 
        {
            console.error("ERROR: ", error);
        }
    };

    // Delete user account
    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");

        if (!confirmDelete)
        {
            return;
        }

        try 
        {
            await deleteDoc(doc(db, "users", userId));
            await deleteUser(auth.currentUser);
            alert("Account deleted.");
            navigate("/");
        } 
        catch (error) 
        {
            console.error("Error deleting account:", error);
        }
    };

    // Sign out user
    const handleLogout = async () => {
        try 
        {
            await signOut(auth);
            alert("Signed out.");
            navigate("/signin");
        } 
        catch (error) 
        {
            console.error("ERROR: ", error);
        }
    };

    if (loading) return <p>Loading...</p>;

    return (
        <main>
        <h1>User Profile</h1>
        
        <div>
            {isAccountOwner && editMode ? (
                
                <>
                    <input 
                        type="text" 
                        value={userName} 
                        onChange={(e) => setUserName(e.target.value)}
                    />
                    <button onClick={handleSaveName}>Save</button>
                </>
                ) : (
                <>
                    <h2>Name: {userName}</h2>
                    {isAccountOwner && <button onClick={() => setEditMode(true)}>Edit Name</button>}
                </>
            )}

            {isAccountOwner && (
                <h2>Email: {userEmail}</h2>
            )}
        </div>

        <h2>Game History</h2>
        <table>
            <thead>
            <tr>
                <th>Game</th>
                <th>Result</th>
                <th>Date</th>
            </tr>
            </thead>
            <tbody>
            {gameHistory.map((game, index) => (
                <tr key={index}>
                    <td>{game.gameName}</td>
                    <td>{game.result}</td>
                    <td>{game.date.toDate().toLocaleString()}</td>
                </tr>
            ))}
            </tbody>
        </table>

        {isAccountOwner && (
            <>
                <button onClick={handleLogout}>Log Out</button>
                <button onClick={handleDeleteAccount} style={{ background: "red" }}>Delete Account</button>
            </>
        )}
        </main>
    );
}

export default ViewUserById;
