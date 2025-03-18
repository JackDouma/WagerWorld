import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, getFirestore } from "firebase/firestore";
import { Link, Typography, Box, TextField, Button, Divider, CircularProgress } from "@mui/material";
import { useTheme } from "@mui/material/styles";

const db = getFirestore();

function Signin() {
  //////////////
  // BACK END //
  //////////////

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [userSignedIn, setUserSignedIn] = useState(true);
  const navigate = useNavigate();
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // check if the user is already signed in, and redirect to their org page if so
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const userIsAdmin = userData.admin;
          const userOrgId = userData.org?.orgId;
          const idToken = await user.getIdToken();
          localStorage.setItem('firebaseIdToken', user.uid);
          if (userIsAdmin) {
            navigate("/admin");
          } else {
            navigate(`/org/${userOrgId}`);
          }
        }
      } else {
        setUserSignedIn(false);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  // on sign in button press
  const signInButton = async () => {
    setError("");

    // if not all fields are entered
    if (!email && !password) {
      setError("ERROR: Enter your credentials.");
      return;
    } else if (!email || !password) {
      setError(`ERROR: Enter your ${!email ? "email" : "password"}.`);
      return;
    }

    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // redirect based on user role
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const userIsAdmin = userData.admin;
        const userOrgId = userData.org?.orgId;

        if (userIsAdmin) {
          navigate("/admin");
        } else {
          navigate(`/org/${userOrgId}`);
        }
      } else {
        setError("ERROR: User data not found in database.")
      }

    } catch (err) {
      setIsLoading(false);
      // handle signin errors
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("ERROR: Incorrect email or password.");
      } else if (err.code === "auth/invalid-email") {
        setError("ERROR: Invalid email format.");
      }
      else {
        setError(`ERROR: ${err.message}`);
      }
    }
  };

  if (!userSignedIn) {
    return (
      <Box
        sx={{
          backgroundImage: 'url(/auth-pages-background.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: "100vh",
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <Box component="main" sx={{ marginTop: '-60px' }}>

          <Link
            href="/"
            variant="heading"
            sx={{
              color: theme.palette.primary.main,
              fontSize: "5rem",
              textDecoration: 'none',
            }}
          >
            WagerWorld
          </Link>

          <Divider
            sx={{
              borderColor: theme.palette.primary.light,
              width: '100%',
              marginBottom: '10px'
            }}
          />

          <Typography
            variant="general"
            sx={{
              color: theme.palette.primary.contrastText,
              fontSize: "2rem",
              marginBottom: "10px",
              fontWeight: 600,
            }}
          >
            Signin
          </Typography>

          <div className="form" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <TextField variant="outlined" margin="dense" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              sx={{
                width: '400px',
                '& .MuiInputLabel-root': {
                  ...theme.typography.general,
                },
                '& .MuiInputBase-input': {
                  ...theme.typography.general,
                }
              }}
            />

            <TextField variant="outlined" margin="dense" type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              sx={{
                width: '400px',
                '& .MuiInputLabel-root': {
                  ...theme.typography.general,
                },
                '& .MuiInputBase-input': {
                  ...theme.typography.general,
                },
              }}
            />

            {error && <Typography variant="general" className="error">{error}</Typography>}

            <Button onClick={signInButton} variant="contained" size="large" disabled={isLoading}
              sx={{
                backgroundColor: theme.palette.secondary.main,
                color: theme.palette.secondary.contrastText,
                "&:hover": { backgroundColor: "#FFC700" },
                borderRadius: "40px",
                textTransform: "none",
                padding: "5px 32px",
                fontSize: "1.5rem",
                margin: "10px 0px",
                width: "fit-content",
              }}
            >
              {isLoading ? <CircularProgress size={42} /> : <Typography variant="btn">Sign In</Typography>}
            </Button>

          </div>
          <Typography variant="general" marginTop="10px" color="primary.main">Don't have an account yet? <Link href="/signup" color="primary.main"><strong>Click here to sign up.</strong></Link></Typography>
        </Box>
      </Box>
    );
  }
}

export default Signin;
