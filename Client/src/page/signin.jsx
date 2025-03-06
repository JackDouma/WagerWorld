import { useState, useEffect } from "react";
import { signInWithEmailAndPassword, onAuthStateChanged } from "firebase/auth";
import { auth } from "../../firebase";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, getFirestore } from "firebase/firestore";

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

  // check if the user is already signed in, and redirect to their org page if so
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
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
    if (!email || !password) {
      setError("ERROR: Field is Empty.");
      return;
    }

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
      // handle signin errors
      if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      ) {
        setError("ERROR: Incorrect email or password.");
      } else {
        setError(`ERROR: ${err.message}`);
      }
    }
  };

  if (!userSignedIn) {
    return (
      <main>
        <h1>Sign In</h1>

        <div className="form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button onClick={signInButton}>Sign In</button>
        </div>
        {error && <p className="error">{error}</p>}
      </main>
    );
  }
}

export default Signin;
