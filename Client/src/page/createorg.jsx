import { useState, useEffect } from 'react';
import { doc, setDoc, collection, addDoc, getFirestore, arrayUnion } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { Typography, Box, TextField, Button, Card, FormControl, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const db = getFirestore();

function CreateOrg() {
    const [orgName, setOrgName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ownerPassword, setOwnerPassword] = useState('');
    const [domain, setDomain] = useState('');
    const [error, setError] = useState('');
    const theme = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    const createOrg = async () => {
        setError('');

        // check
        if (!orgName || !ownerName || !ownerEmail || !ownerPassword || !domain) {
            setError('All fields are required.');
            return;
        }

        try {
            setIsLoading(true);
            // save current user to log back info afre
            const currentUser = auth.currentUser;
            const currentUserEmail = currentUser.email;
            const currentUserPassword = "test1234"; // maybe not the best security but i want to get this working

            const userCredential = await createUserWithEmailAndPassword(getAuth(), ownerEmail, ownerPassword);
            const ownerId = userCredential.user.uid;

            // add org
            const orgRef = await addDoc(collection(db, 'orgs'), {
                name: orgName,
                domain,
                createdAt: new Date(),
                adultOnly: true,
                allowPoker: true,
                allowRoulette: true,
                allowBlackJack: true,
                allowCrazy8s: true,
                allowHorseRacing: true,
                defaultBalance: 100000,
                memberCount: 1,
                owner: {
                    ownerId: ownerId,
                    ownerName: ownerName,
                    ownerEmail: ownerEmail,
                },
                member: arrayUnion({
                    id: ownerId,
                    name: ownerName,
                    email: ownerEmail,
                    joinedAt: new Date(),
                }),
            });

            // add owner
            await setDoc(doc(db, 'users', ownerId), {
                name: ownerName,
                email: ownerEmail,
                owner: true,
                createdAt: new Date(),
                org: {
                    orgId: orgRef.id,
                    orgName: orgName,
                    joinedAt: new Date(),
                },
            });


            // sign back into the admin account before going back to admin page
            await signInWithEmailAndPassword(auth, currentUserEmail, currentUserPassword);
            window.location.href = '/admin';
        }
        catch (err) {
            setIsLoading(false);
            console.error(err);
            setError('Failed to create organization.');
        }
    };

    useEffect(() => {
        document.body.style.backgroundColor = "#ffe5bd";
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

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
                        marginBottom: '10px',
                    }}
                >
                    Create Organization
                </Typography>

                <form>
                    <FormControl fullWidth>

                        <TextField label="Name" margin="dense" variant="outlined" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)}
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

                        <TextField label="Owner Name" margin="dense" variant="outlined" type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.75)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />

                        <TextField label="Owner Email" margin="dense" variant="outlined" type="text" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.65)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />

                        <TextField label="Owner Password" margin="dense" variant="outlined" type="text" value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.68)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />

                        <TextField label="Domain" margin="dense" variant="outlined" type="text" value={domain} onChange={(e) => setDomain(e.target.value)}
                            sx={{
                                '& .MuiInputLabel-root': {
                                    ...theme.typography.general,
                                    '&.Mui-focused, &.MuiFormLabel-filled': {
                                        transform: 'translate(14px, -10px) scale(0.75)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    ...theme.typography.general,
                                }
                            }}
                        />

                        <Button variant="contained" size="large" onClick={createOrg} disabled={isLoading}
                            sx={{
                                backgroundColor: theme.palette.secondary.main,
                                color: theme.palette.secondary.contrastText,
                                "&:hover": { backgroundColor: "#FFC700" },
                                borderRadius: "40px",
                                textTransform: "none",
                                padding: "5px 30px",
                                fontSize: "1.5rem",
                                marginTop: "20px",
                            }}
                        >
                            {isLoading ? <CircularProgress size={42} /> : <Typography variant="btn">Save</Typography>}
                        </Button>

                        {error && <p className="error">{error}</p>}

                    </FormControl>
                </form>
            </Card>
        </Box>
    );
}

export default CreateOrg;
