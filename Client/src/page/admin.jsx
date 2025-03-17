import { useState, useEffect } from 'react';
import { collection, getDocs, getFirestore, deleteDoc, doc } from 'firebase/firestore';
import { auth, app } from '../../firebase';
import { useNavigate } from "react-router-dom";
import { getAuth, deleteUser } from 'firebase/auth';
import { Typography, Box, Button, Link, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Card } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const db = getFirestore(app);

function AdminPage() {
    const [orgs, setOrgs] = useState([]);
    const navigate = useNavigate();
    const theme = useTheme();

    useEffect(() => {
        const fetchOrgs = async () => {
            try {
                const orgsCollection = collection(db, 'orgs');
                const orgsSnapshot = await getDocs(orgsCollection);
                const orgsData = orgsSnapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setOrgs(orgsData);
            }
            catch (error) {
                console.error('Error fetching orgs:', error);
            }
        };

        fetchOrgs();
    }, []);

    useEffect(() => {
        document.body.style.backgroundColor = "#ffe5bd";
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    const handleDelete = async (id, ownerId) => {
        try {
            const orgDoc = doc(db, 'orgs', id);
            const userDoc = doc(db, 'users', ownerId);
            const authUser = getAuth().currentUser;

            // delete org and owner account
            await deleteDoc(orgDoc);
            await deleteDoc(userDoc);

            // delete the user auth account
            if (authUser && authUser.uid === ownerId) {
                await deleteUser(authUser);
            }

            // remove deleted org from state
            setOrgs(orgs.filter((org) => org.id !== id));
        }
        catch (error) {
            console.error('ERROR: ', error);
        }
    };

    return (
        <Box component="main" className="admin-page">
            <Card
                sx={{
                    padding: '30px',
                    borderRadius: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography variant="heading"
                    sx={{
                        fontSize: '2.5vw',
                        color: theme.palette.primary.main,
                    }}
                >
                    Admin
                </Typography>

                <Button onClick={() => navigate("/createorg")} variant="contained" size="large"
                    sx={{
                        backgroundColor: theme.palette.secondary.main,
                        color: theme.palette.secondary.contrastText,
                        "&:hover": {
                            backgroundColor: theme.palette.secondary.dark,
                        },
                        borderRadius: "40px",
                        textTransform: "none",
                        padding: "5px 32px",
                        fontSize: "1.5rem",
                        margin: "10px 0 20px 0",
                        width: "fit-content",
                    }}
                >
                    <Typography variant="btn">Create Org</Typography>
                </Button>

                <Typography variant="general" sx={{ fontSize: '1.2rem', marginBottom: '10px', }}>Organizations:</Typography>

                <TableContainer sx={{ borderRadius: '8px' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow sx={{ backgroundColor: theme.palette.secondary.main, '&:last-child td, &:last-child th': { border: 0 } }}>
                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Name</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Created At</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Members</TableCell>
                                <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Action</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {orgs.map((org) => (
                                <TableRow key={org.id} sx={{ backgroundColor: "#fffced", '&:last-child td, &:last-child th': { border: 0 } }}>
                                    <TableCell>{org.name}</TableCell>
                                    <TableCell>{new Date(org.createdAt?.seconds * 1000).toLocaleDateString()}</TableCell>
                                    <TableCell>{org.memberCount}</TableCell>
                                    <TableCell>
                                        <Link
                                            onClick={() => handleDelete(org.id, org.owner.ownerId)}
                                            sx={{ color: "#998100", cursor: 'pointer', textDecorationColor: "#d9b800", fontFamily: 'Source Code Pro' }}
                                        >
                                            Delete
                                        </Link> | <Link
                                            href={`/editorg/${org.id}`}
                                            sx={{ color: "#998100", cursor: 'pointer', textDecorationColor: "#d9b800", fontFamily: 'Source Code Pro' }}
                                        >
                                            Edit
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>
        </Box>
    );
}

export default AdminPage;
