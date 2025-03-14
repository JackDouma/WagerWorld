import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, getFirestore, arrayUnion, updateDoc, increment } from 'firebase/firestore';
import { auth, app } from '../../firebase';
import { Link, Typography, Box, TextField, Button, Divider, CircularProgress } from "@mui/material";
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useTheme } from "@mui/material/styles";

const db = getFirestore(app)

function Signup() {
  //////////////
  // BACK END //
  //////////////

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  // Returns true if birthday is before today - 18 years.
  function is18OrOlder(birthday) {
    const birthdayAsDate = new Date(Date.parse(birthday));
    const todayMinus18Years = new Date();
    todayMinus18Years.setFullYear((new Date()).getFullYear() - 18);

    return birthdayAsDate <= todayMinus18Years;
  }

  // on create account button press
  const createAccountButton = async () => {
    setError('');

    // if not all fields are entered 
    if (!email || !name || !password || !birthday) {
      setError('ERROR: All fields are required.');
      return;
    }

    // if passwords are not the same
    if (password != passwordConfirm) {
      setError('ERROR: Passwords are not the same.');
      return;
    }

    // format the birthday to a string to match Firestore setup
    const formattedBirthday = birthday ? birthday.toISOString().split('T')[0] : '';

    setIsLoading(true);

    try {
      // Create JSON object for user details
      let userJSON = {
        email: email,
        name: name,
        birthday: formattedBirthday,
        createdAt: new Date(),
      };

      // Check Firestore for an organization with a domain matching the users email.
      const emailDomain = email.split("@")[1];
      const orgCollectionRef = collection(db, "orgs");
      const orgQuerySnapshot = await getDocs(query(orgCollectionRef, where("domain", "==", emailDomain)));

      const orgExists = !orgQuerySnapshot.empty;

      // I had to move the account create logic since it should only happen if the user meets age requirements of the org if one exists.
      // Because of this the if statement needed to be broken up so that the first half runs before account creation and the second half runs after.
      // This is a pretty hacky fix, as orgRef is not properly initialized if the org doesn't exist. I'll fix it later -Tyler.
      var orgRef;
      if (orgExists) {
        const orgDocSnapshot = orgQuerySnapshot.docs[0];
        const orgData = orgDocSnapshot.data()
        orgRef = doc(db, "orgs", orgDocSnapshot.id);

        userJSON.org = {
          joinedAt: new Date(),
          orgId: orgDocSnapshot.id,
          orgName: orgData.name
        }

        // Check if user is of age for organization. Set error if not.
        if (!is18OrOlder(formattedBirthday) && orgData.adultOnly) {
          setIsLoading(false);
          setError("ERROR: You must be 18 or older to create an account with this organization.");
          return;
        }
      }

      // create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (orgExists) {
        // add 1 to org members
        await updateDoc(orgRef, {
          memberCount: increment(1),
          member: arrayUnion({
            id: user.uid,
            name: name,
            email: email,
            joinedAt: new Date(),
          }),
        });
      }

      // save user info to firestore
      await setDoc(doc(db, 'users', user.uid), userJSON);

      // display success and empty field info
      setEmail('');
      setName('');
      setPassword('');
      setPasswordConfirm('');
      setBirthday('');

      // on success bring to my org page
      document.location.href = "/org/" + userJSON.org.orgId;
    }
    // handle firebase errors
    catch (err) {
      setIsLoading(false);
      if (err.code === 'auth/email-already-in-use') {
        setError('ERROR: This email is already in use.');
      } else if (err.code === 'auth/invalid-email' || err.code === 'invalid-argument') {
        setError('ERROR: Invalid email format.');
      } else if (err.code === 'auth/weak-password') {
        setError('ERROR: Password should be at least 6 characters.')
      } else if (err.message === 'Cannot read properties of undefined (reading \'orgId\')') { // temporary else if block for orgRef not being initialized properly bug
        setError('ERROR: Your organization is not registered with WagerWorld yet.');
      } else {
        setError(`ERROR: ${err.message}, CODE: ${err.code}`);
      }
    }
  };

  ///////////////
  // FRONT END //
  ///////////////

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
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
            Signup
          </Typography>

          <div className="form">
            <TextField variant="outlined" margin="none" type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)}
              sx={{
                width: '400px',
                '& .MuiInputLabel-root': {
                  ...theme.typography.general,
                  '&.Mui-focused, &.MuiFormLabel-filled': {
                    transform: 'translate(14px, -8px) scale(0.70)',
                  },
                },
                '& .MuiInputBase-input': {
                  ...theme.typography.general,
                }
              }}
            />

            <TextField variant="outlined" margin="none" type="text" label="Name" value={name} onChange={(e) => setName(e.target.value)}
              sx={{
                width: '400px',
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

            <TextField variant="outlined" margin="none" type="password" label="Password" value={password} onChange={(e) => setPassword(e.target.value)}
              sx={{
                width: '400px',
                '& .MuiInputLabel-root': {
                  ...theme.typography.general,
                  '&.Mui-focused, &.MuiFormLabel-filled': {
                    transform: 'translate(14px, -8px) scale(0.70)',
                  },
                },
                '& .MuiInputBase-input': {
                  ...theme.typography.general,
                }
              }}
            />

            <TextField variant="outlined" margin="none" type="password" label="Confirm Password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
              sx={{
                width: '400px',
                '& .MuiInputLabel-root': {
                  ...theme.typography.general,
                  '&.Mui-focused, &.MuiFormLabel-filled': {
                    transform: 'translate(14px, -8px) scale(0.65)',
                  },
                },
                '& .MuiInputBase-input': {
                  ...theme.typography.general,
                }
              }}
            />

            <DatePicker
              label="Birthday"
              value={birthday ? new Date(birthday) : null}
              onChange={(date) => setBirthday(date)}
              format="yyyy-MM-dd"
              slotProps={{
                textField: {
                  sx: {
                    width: '400px',
                    '& .MuiInputLabel-root': {
                      ...theme.typography.general,
                      '&.Mui-focused, &.MuiFormLabel-filled': {
                        transform: 'translate(14px, -7px) scale(0.60)',
                      },
                    },
                    '& .MuiInputBase-input': {
                      ...theme.typography.general,
                    },
                    '& .MuiInputBase-inputAdornedEnd': {
                      ...theme.typography.general,
                    },
                  },
                },
              }}
            />

            {error && <Typography variant="general" className="error">{error}</Typography>}

            <Button onClick={createAccountButton} variant="contained" size="large" disabled={isLoading}
              sx={{
                backgroundColor: theme.palette.secondary.main,
                color: theme.palette.secondary.contrastText,
                "&:hover": { backgroundColor: "#FFC700" },
                borderRadius: "40px",
                textTransform: "none",
                padding: "5px 32px",
                fontSize: "1.5rem",
                margin: "10px 0px",
              }}
            >
              {isLoading ? <CircularProgress size={42} /> : <Typography variant="btn">Create Account</Typography>}
            </Button>

          </div>
          <Typography variant="general" color="primary.main">Already have an account? <Link href="/signin" color="primary.main"><strong>Click here to sign in.</strong></Link></Typography>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}

export default Signup;
