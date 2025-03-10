import { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { Typography, Box, TextField, Button, FormControl, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Link, CircularProgress, AppBar, Toolbar, IconButton } from "@mui/material";
import MenuIcon from '@mui/icons-material/Menu';
import Grid from '@mui/material/Grid2';
import { useTheme } from "@mui/material/styles";
import { useLocation } from 'react-router-dom';

const db = getFirestore();

function Header() {
  const theme = useTheme();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userOrg, setUserOrg] = useState(null);

  // check if logged in or not
  useEffect(() => {
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
  }, []);

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
    <header
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
                // fontSize: "2vw",
                fontSize: "40px",
              }}
            >
              WagerWorld
            </Link>
          </Grid>

          {/* Context text (center) */}
          {(location.pathname === '/room' ||
            location.pathname === '/roomPage') && (
              <Grid size={6}>
                <Typography variant="heading" sx={{ color: theme.palette.primary.contrastText, fontSize: "1.5rem" }}>
                  Room: Room Name Here
                </Typography>
                <br />
                <Link variant="general" href="/joinroom" sx={{ color: theme.palette.primary.contrastText, textDecoration: 'underline' }}>Join a different room</Link>
              </Grid>
            )}
          {/* TODO: Add paths, game name conditional statements for all games here */}
          {(location.pathname === '/blackjack' ||
            location.pathname === '/blackjackbyid') && (
              <Grid size={6}>
                {location.pathname === '/blackjack' && (
                  <Typography variant="heading" sx={{ color: theme.palette.primary.contrastText, fontSize: "1.5rem" }}>
                    Blackjack
                  </Typography>
                )}
                <br />
                <Link variant="general" href="/roomPage" sx={{ color: theme.palette.primary.contrastText, textDecoration: 'underline' }}>Exit game</Link>
              </Grid>
            )}

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
                padding: '8px',
                alignContent: 'center',
              }}
            >
              {/* user name */}

              {/* user points */}

              {/* users and owners: my org button (use an icon) */}

              <Link href="/index" onClick={signOutPress}
                sx={{
                  fontSize: "30px",
                  color: theme.palette.primary.contrastText,
                  paddingLeft: "10px"
                }}>
                <i className="fas fa-sign-out-alt"></i>
              </Link>
            </Box>
          </Grid>
        </Grid>
      </nav>
    </header>
  );

  // return (
  //   <header>
  //     <nav>
  //       <ul>
  //         <li><a href="/index">Home</a></li>
  //         {/* <li><a href="/blackjack">Blackjack</a></li> */}
  //         <li><a href="/poker">Poker</a></li>
  //         <li><a href="/horseracing">Horse Racing</a></li>
  //         {!user ? (
  //           // not logged in
  //           <div className="right">
  //             <li><a href="/signin"><i className="fas fa-sign-in-alt"></i> Sign In</a></li>
  //             <li><a href="/signup"><i className="fas fa-user-plus"></i> Sign Up</a></li>
  //           </div>
  //         ) : (
  //           // logged in
  //           <>

  //             {isAdmin && (
  //               <li><a href="/admin">Admin</a></li>
  //             )}

  //             {userOrg && (
  //               <li><a href={`/org/${userOrg.orgId}`}>My ORG</a></li>
  //             )}

  //             {isOwner && (
  //               <li><a href={`/orgsettings/${userOrg.orgId}`}>ORG Settings</a></li>
  //             )}

  //             <div className="right">
  //               <l1><a href={`/user/${user?.uid}`} ><i class="fa-solid fa-user"></i></a></l1>
  //               <li><a href="/index" onClick={signOutPress}><i className="fas fa-sign-out-alt"></i> Sign Out</a></li>
  //             </div>
  //           </>
  //         )}
  //       </ul>
  //     </nav>
  //   </header>
  // );
}

export default Header;
