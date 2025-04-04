import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Client } from "colyseus.js";
import { Typography, Box, Button, Card } from "@mui/material";
import Grid from '@mui/material/Grid2';
import { useTheme } from "@mui/material/styles";

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
    const [playersInLobby, setPlayersInLobby] = useState([]);
    const theme = useTheme();

    useEffect(() => {
        const joinRoom = async () => {
            try {
                const token = localStorage.getItem('firebaseIdToken');
                const joinedRoom = await client.joinById(roomId, { playerId: token });
                setRoom(joinedRoom);
                if (location.state && location.state.lobbyType) {
                    setRoomType(location.state.lobbyType);
                }

                // send the playerJoined message to the server
                joinedRoom.send('playerJoined', { playerId: token });

                joinedRoom.onMessage('updatePlayersInLobby', (playersInLobby) => {
                    setPlayersInLobby(playersInLobby);
                });

                joinedRoom.onStateChange((state) => {
                    console.log("State changed:", state);
                    setGamePhase(state.gamePhase);
                });

                joinedRoom.onLeave(() => navigate("/signin"));

                joinedRoom.onMessage('owner', () => {
                    setIsOwner(true);
                });

                joinedRoom.onMessage('rooms', (message) => {
                    setGames([]);
                    if (typeof message.blackjack !== 'undefined' && message.blackjack.length > 0) {
                        for (let i = 0; i < message.blackjack.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                {
                                    name: message.blackjack.length > 1 ? `Blackjack (${i + 1})` : "Blackjack",
                                    path: `/blackjack/${message.blackjack[i]}`,
                                    description: "Beat the dealer by getting closer to 21 with your hand of cards. Just don't go over! It can be played solo or with up to 8 total players."
                                }
                            ]);
                        }
                    }
                    if (typeof message.poker !== 'undefined' && message.poker.length > 0) {
                        for (let i = 0; i < message.poker.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                {
                                    name: message.poker.length > 1 ? `Poker (${i + 1})` : "Poker",
                                    path: `/poker/${message.poker[i]}`,
                                    description: "Beat the other players around you by making the best 5-card hand out of your cards and the river. Play with up to 8 players in this classic casino game."
                                }
                            ]);
                        }
                    }
                    if (typeof message.horseracing !== 'undefined' && message.horseracing.length > 0) {
                        for (let i = 0; i < message.horseracing.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                {
                                    name: message.horseracing.length > 1 ? `Horse Racing (${i + 1})` : "Horse Racing",
                                    path: `/horseracing/${message.horseracing[i]}`,
                                    description: "Choose one of five horses and pray that they win! It's a game of betting the odds and good old-fashioned luck."
                                }
                            ]);
                        }
                    }
                    if (typeof message.roulette !== 'undefined' && message.roulette.length > 0) {
                        for (let i = 0; i < message.roulette.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                {
                                    name: message.roulette.length > 1 ? `Roulette (${i + 1})` : "Roulette",
                                    path: `/roulette/${message.roulette[i]}`,
                                    description: "Pick a number, colour, or any assortment of selections that you think the ball will land in. Nothing but prayers to Lady Luck in this one!"
                                }
                            ]);
                        }
                    }
                    if (typeof message.baccarat !== 'undefined' && message.baccarat.length > 0) {
                        for (let i = 0; i < message.baccarat.length; i++) {
                            setGames(prevGames => [
                                ...prevGames,
                                {
                                    name: message.baccarat.length > 1 ? `Baccarat (${i + 1})` : "Baccarat",
                                    path: `/baccarat/${message.baccarat[i]}`,
                                    description: "Bet on or against the banker (or a tie if you're feeling lucky!) and watch your luck unfold before you as cards are dealt. The highest score wins!"
                                }
                            ]);
                        }
                    }
                    setLoading(false);
                });

                joinedRoom.send('getRooms');

                // cleanup function to handle player leaving
                const handlePlayerLeave = () => {
                    joinedRoom.send('playerLeft', { playerId: token });
                    joinedRoom.leave();
                };

                window.addEventListener('beforeunload', handlePlayerLeave);

                return () => {
                    handlePlayerLeave();
                    window.removeEventListener('beforeunload', handlePlayerLeave);
                };
            }
            catch (error) {
                console.error("ERROR: ", error);
                navigate(`/signin`);
            }
        };

        joinRoom();
    }, [roomId, navigate]);

    useEffect(() => {
        document.body.style.backgroundColor = "#ffe5bd";
        return () => {
            document.body.style.backgroundColor = '';
        };
    }, []);

    function destroyRoom() {
        var token = localStorage.getItem("firebaseIdToken");
        room.send('destroyLobby', { playerId: token });
        navigate('/signin');
    }



    return (

        <Box component="main" sx={{ padding: 0 }}>
            <Grid container spacing={0}
                sx={{
                    width: '100%',
                    height: '100%',
                    paddingTop: '8px',
                }}
            >

                {/* Games - left side */}
                <Grid size={4.5}>
                    {!loading && games.map((game, index) => (
                        index % 2 === 0 && (
                            <Card
                                key={index}
                                sx={{
                                    margin: '16px 8px 8px 16px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'start',
                                    height: '150px',
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.3s ease-in-out',
                                    '&:hover': {
                                        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
                                    },
                                }}
                                onClick={() => navigate(game.path)}
                            >
                                <Typography variant="heading"
                                    sx={{
                                        fontSize: '1.5vw',
                                        color: theme.palette.primary.main,
                                    }}
                                >
                                    {game.name}
                                </Typography>

                                <Typography variant="general"
                                    sx={{
                                        color: theme.palette.primary.contrastText,
                                        textAlign: 'left'
                                    }}
                                >
                                    {game.description}
                                </Typography>
                            </Card>
                        )
                    ))}
                </Grid>

                {/* Games - right side */}
                <Grid size={4.5}>
                    {!loading && games.map((game, index) => (
                        index % 2 !== 0 && (
                            <Card
                                key={index}
                                sx={{
                                    margin: '16px 8px 8px 8px',
                                    padding: '16px',
                                    borderRadius: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'start',
                                    height: '150px',
                                    cursor: 'pointer',
                                    transition: 'box-shadow 0.3s ease-in-out',
                                    '&:hover': {
                                        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.2)',
                                    },
                                }}
                                onClick={() => navigate(game.path)}
                            >
                                <Typography variant="heading"
                                    sx={{
                                        fontSize: '1.5vw',
                                        color: theme.palette.primary.main,
                                    }}
                                >
                                    {game.name}
                                </Typography>

                                <Typography variant="general"
                                    sx={{
                                        color: theme.palette.primary.contrastText,
                                        textAlign: 'left'
                                    }}
                                >
                                    {game.description}
                                </Typography>
                            </Card>
                        )
                    ))}
                </Grid>

                <Grid size={3}>
                    <Card
                        sx={{
                            margin: '16px 16px 8px 8px',
                            padding: '16px',
                            borderRadius: '12px',
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >


                        {!loading && isOwner ?
                            <>
                                <Typography variant="heading"
                                    sx={{
                                        fontSize: '2vw',
                                        color: theme.palette.primary.main,
                                    }}
                                >
                                    Lobby Info
                                </Typography>

                                <Typography variant="general"
                                    sx={{
                                        color: theme.palette.primary.contrastText,
                                        fontSize: '1.2vw',
                                        fontWeight: 'bold',
                                        marginTop: '10px',
                                    }}
                                >
                                    Type: {roomType}
                                </Typography>

                                <Button variant="contained" size="large" onClick={destroyRoom}
                                    sx={{
                                        backgroundColor: 'lightgray',
                                        color: theme.palette.secondary.contrastText,
                                        "&:hover": { backgroundColor: theme.palette.error.main },
                                        borderRadius: "40px",
                                        textTransform: "none",
                                        padding: "5px 30px",
                                        fontSize: "1.4rem",
                                        marginTop: "10px",
                                        marginBottom: "30px",
                                        width: "auto",
                                        alignSelf: "center",
                                    }}
                                >
                                    <Typography variant="btn">Delete Lobby</Typography>
                                </Button>
                            </>
                            :
                            ""
                        }



                        <Typography variant="heading"
                            sx={{
                                fontSize: '2vw',
                                color: theme.palette.primary.main,
                            }}
                        >
                            In Lobby:
                        </Typography>

                        <Typography variant="general"
                            sx={{
                                color: theme.palette.primary.contrastText,
                                fontSize: '1.2vw',
                                fontWeight: 'bold',
                                marginTop: '10px',
                            }}
                        >
                            {playersInLobby.length > 0 ? (
                                playersInLobby.map((player, index) => (
                                    <Typography key={index} variant="general" sx={{ display: 'block' }}>
                                        {player}
                                    </Typography>
                                ))
                            ) : (
                                "No players in the lobby yet."
                            )}
                        </Typography>

                    </Card>
                </Grid>

            </Grid>
        </Box>
    );
}

export default RoomPage;
