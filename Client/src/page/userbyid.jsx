import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, deleteDoc, getFirestore } from "firebase/firestore";
import { auth } from "../../firebase";
import { signOut, deleteUser, onAuthStateChanged } from "firebase/auth";
import { Typography, Box, TextField, Button, Card, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const db = getFirestore();

function ViewUserById() {
    const { userId } = useParams();
    const navigate = useNavigate();

    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userOrg, setUserOrg] = useState("");
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [isAccountOwner, setIsAccountOwner] = useState(false);
    const [gameHistory, setGameHistory] = useState([]);
    const theme = useTheme();

    useEffect(() => {
        // check if user is the account owner
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user?.uid === userId) {
                setIsAccountOwner(true);
            }
        });

        async function fetchUser() {
            try {
                const userDoc = await getDoc(doc(db, "users", userId));

                // found user
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUserName(userData.name || "");
                    setUserEmail(userData.email || "");
                    setUserOrg(userData.org || "");
                    setGameHistory(userData.gameHistory || []);
                }
                // user not found
                else {
                    console.error("User not found");
                    navigate("/");
                }
            }
            catch (error) {
                console.error("Error fetching user:", error);
            }
            finally {
                setLoading(false);
            }
        }
        fetchUser();
    }, [userId, navigate]);

    // update name
    const handleSaveName = async () => {
        try {
            await updateDoc(doc(db, "users", userId), { name: userName });
            setEditMode(false);
            alert("Name updated!");
        }
        catch (error) {
            console.error("ERROR: ", error);
        }
    };

    // Delete user account
    const handleDeleteAccount = async () => {
        const confirmDelete = window.confirm("Are you sure you want to delete your account? This action cannot be undone.");

        if (!confirmDelete) {
            return;
        }

        try {
            await deleteDoc(doc(db, "users", userId));
            await deleteUser(auth.currentUser);
            alert("Account deleted.");
            navigate("/");
        }
        catch (error) {
            console.error("Error deleting account:", error);
        }
    };

    // Sign out user
    const handleLogout = async () => {
        try {
            await signOut(auth);
            alert("Signed out.");
            navigate("/signin");
        }
        catch (error) {
            console.error("ERROR: ", error);
        }
    };

    useEffect(() => {
        document.body.style.backgroundColor = "#ffe5bd";
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    if (loading) return <p>Loading...</p>;

    return (
        <Box component="main">
            <Card
                sx={{
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                }}
            >

                <Typography variant="heading"
                    sx={{
                        fontSize: '2.5vw',
                        color: theme.palette.primary.main,
                    }}
                >
                    User Profile
                </Typography>

                {isAccountOwner && editMode ? (
                    <Box display='flex' justifyContent='center' alignItems='center' flexDirection='row' sx={{ marginBottom: '10px' }}>
                        <TextField label="Name" margin="dense" variant="outlined" type="text" value={userName} onChange={(e) => setUserName(e.target.value)}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.85)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />
                        <Button variant="contained" size="large" onClick={handleSaveName}
                            sx={{
                                backgroundColor: theme.palette.secondary.main,
                                color: theme.palette.secondary.contrastText,
                                "&:hover": { backgroundColor: "#FFC700" },
                                borderRadius: "40px",
                                textTransform: "none",
                                fontSize: "1.5rem",
                                marginLeft: '10px',
                                height: '46px',
                            }}
                        >
                            <Typography variant="btn">Save</Typography>
                        </Button>

                    </Box>
                ) : (
                    <Typography variant="general" sx={{ fontSize: '1.5rem', marginBottom: '10px', marginTop: '10px' }} >
                        <strong>Name:</strong> {userName} {isAccountOwner && <i class="far fa-edit" style={{ cursor: 'pointer' }} onClick={() => setEditMode(true)}></i>}
                    </Typography>
                )}

                {isAccountOwner && (
                    <Typography variant="general" sx={{ fontSize: '1.5rem', marginBottom: '30px', }}><strong>Email:</strong> {userEmail}</Typography>
                )}

                <Typography variant="heading"
                    sx={{
                        fontSize: '1.5vw',
                        color: theme.palette.primary.main,
                        marginBottom: '10px',
                    }}
                >
                    Game History
                </Typography>

                <TableContainer sx={{ borderRadius: '8px' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: theme.palette.secondary.main }}>
                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Game</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Result</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Date</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {gameHistory.map((game, index) => (
                                <TableRow key={index} sx={{ backgroundColor: "#fffced", '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>{game.gameName}</TableCell>
                                    <TableCell>{game.result}</TableCell>
                                    <TableCell>{game.date.toDate().toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                {isAccountOwner && (
                    <Box display={"flex"} sx={{ marginTop: '20px' }}>

                        <Button variant="contained" size="large" onClick={handleDeleteAccount}
                            sx={{
                                backgroundColor: 'lightgray',
                                color: theme.palette.secondary.contrastText,
                                "&:hover": { backgroundColor: "red" },
                                borderRadius: "40px",
                                textTransform: "none",
                                padding: "5px 30px",
                                fontSize: "1.5rem",
                                marginTop: "20px",
                                marginRight: '10px',
                            }}
                        >
                            <Typography variant="btn">Delete Account</Typography>
                        </Button>

                        <Button variant="contained" size="large" onClick={handleLogout}
                            sx={{
                                backgroundColor: theme.palette.secondary.main,
                                color: theme.palette.secondary.contrastText,
                                "&:hover": { backgroundColor: "#FFC700" },
                                borderRadius: "40px",
                                textTransform: "none",
                                padding: "5px 30px",
                                fontSize: "1.5rem",
                                marginTop: "20px",
                                marginLeft: '10px',
                            }}
                        >
                            <Typography variant="btn">Log Out</Typography>
                        </Button>

                    </Box>
                )}
            </Card>
        </Box >
    );
}

export default ViewUserById;
