import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { Typography, Box, Button, Card, TableContainer, Table, TableHead, TableRow, TableCell, TableBody } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import Grid from '@mui/material/Grid2';

const db = getFirestore();

function LeaderboardById() {
    const { orgId } = useParams();
    const [leaderboardHistory, setLeaderboardHistory] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const theme = useTheme();

    useEffect(() => {
        // get leaderboard history
        const fetchLeaderboardHistory = async () => {
            try {
                const orgRef = doc(db, "orgs", orgId);
                const orgSnap = await getDoc(orgRef);

                const history = orgSnap.data().leaderboardHistory || [];
                history.sort((a, b) => b.date.seconds - a.date.seconds);
                setLeaderboardHistory(history);
            }
            catch (error) {
                console.error("ERROR: ", error);
            }
        };

        fetchLeaderboardHistory();
    }, [orgId]);

    // when left arrow is pressed, go to previous leaderboard
    const handlePrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
    };

    // when right arrow is pressed, go to next leaderboard
    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex < leaderboardHistory.length - 1 ? prevIndex + 1 : prevIndex));
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
                        marginBottom: '20px'
                    }}
                >
                    Leaderboard History
                </Typography>

                {leaderboardHistory.length > 0 ? (
                    <Grid container spacing={0}>

                        <Grid size={2}
                            sx={{
                                display: 'flex',
                                alignItems: 'center'
                            }}
                        >
                            <Button
                                onClick={handlePrevious}
                                variant="contained"
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    borderRadius: '50px',
                                    "&:hover": {
                                        backgroundColor: theme.palette.primary.dark,
                                    },
                                }}
                            >
                                <Typography variant="btn" fontSize={'30px'}>←</Typography>
                            </Button>
                        </Grid>

                        <Grid size={8}>
                            <TableContainer sx={{ borderRadius: '8px' }}>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: theme.palette.secondary.main }}>
                                            <TableCell align="center" colSpan={2} sx=
                                                {{
                                                    fontWeight: 'bold',
                                                    fontFamily: 'Source Code Pro',
                                                    border: 0,
                                                    fontSize: '26px',
                                                    padding: '12px'
                                                }}
                                            >
                                                {currentIndex + 1} - {new Date(leaderboardHistory[currentIndex].date.seconds * 1000).toLocaleDateString()}
                                            </TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableHead>
                                        <TableRow sx={{ backgroundColor: theme.palette.secondary.main }}>
                                            <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold', fontFamily: 'Source Code Pro' }}>Balance</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {leaderboardHistory[currentIndex].members.map((member, index) => (
                                            <TableRow
                                                key={index}
                                                sx={{ backgroundColor: "#fffced", '&:last-child td, &:last-child th': { border: 0 } }}
                                            >
                                                <TableCell sx={{ fontFamily: 'Source Code Pro' }}>{member.name}</TableCell>
                                                <TableCell sx={{ fontFamily: 'Source Code Pro' }}>{member.balance.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Grid>

                        <Grid size={2}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'end'
                            }}
                        >
                            <Button
                                onClick={handleNext}
                                variant="contained"
                                sx={{
                                    backgroundColor: theme.palette.primary.main,
                                    color: theme.palette.primary.contrastText,
                                    borderRadius: '50px',
                                    "&:hover": {
                                        backgroundColor: theme.palette.primary.dark,
                                    },
                                }}
                            >
                                <Typography variant="btn" fontSize={'30px'}>→</Typography>
                            </Button>
                        </Grid>

                    </Grid>
                ) : (
                    <Typography variant="general">No leaderboard history available.</Typography>
                )}

            </Card>
        </Box >
    );
}

export default LeaderboardById;