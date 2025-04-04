import { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { Typography, Box, Link, Tooltip } from "@mui/material";
import Grid from '@mui/material/Grid2';
import { useTheme } from "@mui/material/styles";
import { useLocation, useParams } from 'react-router-dom';

const db = getFirestore();

function Header() {
  const theme = useTheme();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userOrg, setUserOrg] = useState(null);
  const { roomId } = useParams();
  const [userBalance, setUserBalance] = useState(null);
  const [roomHistory, setRoomHistory] = useState(() => {
    const savedHistory = localStorage.getItem('roomHistory');
    return savedHistory ? JSON.parse(savedHistory) : [];
  });

  useEffect(() => {
    // clear roomHistory array if user goes back to the org page
    if (location.pathname.startsWith('/org/') && roomHistory.length > 0) {
      setRoomHistory([]);
      localStorage.removeItem('roomHistory');
      return;
    }

    // add roomId to roomHistory if it is not equal to the most recently added element
    if (roomId && roomHistory[roomHistory.length - 1] !== roomId) {
      const updatedHistory = [...roomHistory, roomId];
      setRoomHistory(updatedHistory);
      localStorage.setItem('roomHistory', JSON.stringify(updatedHistory));
    }

    // check if logged in or not
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);

        // get users name from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserName(userData.name || '');
          setIsAdmin(userData.admin === true);
          setIsOwner(userData.owner === true);
          setUserOrg(userData.org || null);
          setUserBalance(userData.balance || 0);
        }
      }
      else {
        setUser(null);
        setUserName('');
        setIsAdmin(false);
        setIsOwner(false);
        setUserOrg(null);
      }
    });

    return () => unsubscribe();
  }, [location, roomId, roomHistory]);

  // handle sign-out
  const signOutPress = async () => {
    try {
      await signOut(auth);
      alert('You have successfully signed out.');
    }
    catch (error) {
      console.error('ERROR:', error);
    }
  };

  return (
    (
      // all game paths to go here
      !location.pathname.startsWith('/blackjack') &&
      !location.pathname.startsWith('/horseracing') &&
      !location.pathname.startsWith('/poker') && 
      !location.pathname.startsWith('/roulette') &&
      !location.pathname.startsWith('/baccarat')
    ) &&
    (
      // header for non-game pages
      <header id="header"
        style={{
          borderBottomLeftRadius: '18px',
          borderBottomRightRadius: '18px',
          overflow: 'hidden',
          backgroundColor: theme.palette.primary.main,
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2 )',
          paddingRight: '8px',
        }}
      >
        <nav>
          <Grid container>
            {/* Logo (left side) */}
            <Grid size="grow"
              sx={{
                display: 'flex',
                alignItems: 'left'
              }}
            >
              <Link
                href="/"
                variant="heading"
                sx={{
                  textDecoration: 'none',
                  color: "#FFFFFF",
                  textShadow: "0px -4px 8px rgba(0, 0, 0, 0.5)",
                  WebkitTextStroke: `1px ${theme.palette.secondary.main}`,
                  fontSize: "40px",
                }}
              >
                WagerWorld
              </Link>
            </Grid>

            {/* Room name and exit link (center) */}
            <Grid size={3}>
              {location.pathname === (`/room/${roomId}`) &&
                <>
                  <Typography variant="heading"
                    sx={{
                      color: theme.palette.primary.contrastText,
                      fontSize: "1.5rem"
                    }}
                  >
                    {/* TODO: Replace with room name */}
                    Room: {roomId}
                  </Typography>
                  <br />
                  <Link variant="general" href='/signin'
                    sx={{
                      color: theme.palette.primary.contrastText,
                      textDecoration: 'underline'
                    }}
                  >
                    Exit room
                  </Link>
                </>
              }
            </Grid>

            {/* User details (right side) */}
            <Grid size="grow"
              sx={{
                display: 'flex',
                justifyContent: 'right',
              }}
            >
              <Box
                sx={{
                  borderRadius: '18px',
                  overflow: 'hidden',
                  backgroundColor: theme.palette.secondary.main,
                  boxShadow: '0 0px 2px rgba(0, 0, 0, 0.2)',
                  padding: '0px 6px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {!isAdmin && (
                  // non-admins see their points
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'start',
                      flexDirection: 'column',
                      marginLeft: '6px',
                      marginRight: '30px'
                    }}
                  >
                    <Link
                      variant="heading"
                      fontWeight={700}
                      fontSize={"20px"}
                      sx={{
                        textDecoration: "none",
                        color: theme.palette.primary.contrastText,
                        '&:hover': {
                          color: theme.palette.primary.dark,
                        }
                      }}
                      href={`/user/${user?.uid}`}
                    >
                      {userName}
                    </Link>

                    <Typography variant="heading" fontWeight={300}>
                      {userBalance?.toLocaleString()} Credits
                    </Typography>
                  </Box>
                )}

                {isAdmin && (
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'start',
                      marginLeft: '6px',
                      marginRight: '30px'
                    }}
                  >
                    <Link variant="heading" fontWeight={700} fontSize={"20px"} href={`/admin`}
                      sx={{
                        textDecoration: "none",
                        color: theme.palette.primary.contrastText,
                        '&:hover': {
                          color: theme.palette.primary.dark,
                        }
                      }}
                    >
                      {userName}
                    </Link>
                  </Box>
                )}

                {isOwner && (
                  // owners have a link to the org settings page
                  <Tooltip title="Organization Settings">
                    <Link href={`/orgsettings/${userOrg.orgId}`}
                      sx={{
                        fontSize: "32px",
                        color: theme.palette.primary.contrastText,
                        padding: "0 10px",
                        '&:hover': {
                          color: theme.palette.primary.dark,
                        }
                      }}
                    >
                      <i className="fa-solid fa-gears"></i>
                    </Link>
                  </Tooltip>
                )}

                {userOrg && (
                  <Box>
                    {/* users that belong to an org (non-admins) have a link to their org page */}
                    <Tooltip title="My Organization">
                      <Link href={`/org/${userOrg.orgId}`}
                        sx={{
                          fontSize: "32px",
                          color: theme.palette.primary.contrastText,
                          padding: "0 10px",
                          '&:hover': {
                            color: theme.palette.primary.dark,
                          }
                        }}
                      >
                        <i className="fa-solid fa-sitemap"></i>
                      </Link>
                    </Tooltip>

                    <Tooltip title="View Leaderboard">
                      <Link href={`/leaderboard/${userOrg.orgId}`}
                        sx={{
                          fontSize: "32px",
                          color: theme.palette.primary.contrastText,
                          padding: "0 10px",
                          '&:hover': {
                            color: theme.palette.primary.dark,
                          }
                        }}
                      >
                        <i className="fa-solid fa-trophy"></i>
                      </Link>
                    </Tooltip>
                  </Box>
                )}

                <Tooltip title="Sign Out">
                  <Link href="/index" onClick={signOutPress}
                    sx={{
                      fontSize: "32px",
                      color: theme.palette.primary.contrastText,
                      padding: "0 10px",
                      '&:hover': {
                        color: theme.palette.primary.dark,
                      }
                    }}>
                    <i className="fas fa-sign-out-alt"></i>
                  </Link>
                </Tooltip>
              </Box>
            </Grid>
          </Grid>
        </nav>
      </header>
    ) ||
    (
      // header for game pages (top left corner back button)
      <div
        style={{
          position: 'absolute',
          top: '10px',
          left: '10px',
          zIndex: 1000,
        }}
      >
        <Tooltip title="Leave game" placement="right">
          <Link
            href={`/room/${(() => {
              // find the most recent unique roomId in roomHistory array (need id of lobby room instead of game room)
              for (let i = roomHistory.length - 2; i >= 0; i--) {
                if (roomHistory[i] !== roomHistory[roomHistory.length - 1]) {
                  return roomHistory[i];
                }
              }
            })()
              }`}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              backgroundColor: theme.palette.primary.main,
              color: theme.palette.primary.contrastText,
              textDecoration: 'none',
              boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
              opacity: 0.5,
              '&:hover': {
                backgroundColor: theme.palette.primary.dark,
                opacity: 1,
              }
            }}
          >
            <i className="fas fa-arrow-left"></i>
          </Link>
        </Tooltip>
      </div>
    )
  );
}

export default Header;
