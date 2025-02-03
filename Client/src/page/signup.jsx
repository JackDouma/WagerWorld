import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getDoc, getDocs, collection, query, where, getFirestore, arrayUnion, updateDoc, increment } from 'firebase/firestore';
import { auth, app } from '../../firebase';


const db = getFirestore(app)

function Signup() 
{
  //////////////
  // BACK END //
  //////////////

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [birthday, setBirthday] = useState('');
  const [error, setError] = useState('');

  // on create account button press
  const createAccountButton = async () => {
    setError('');

    // if not all fields are entered 
    if (!email || !password || !birthday) 
    {
      setError('ERROR: Field is Empty.');
      return;
    }

    // if passwords are not the same
    if (password != passwordConfirm)
    {
      setError('ERROR: Passwords are not the same.');
      return;
    }

    try {
      // create user with email and password
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create JSON object for user details
      let userJSON = {
        email: user.email,
        name: name,
        birthday: birthday,
        createdAt: new Date(),
      };

      // Check Firestore for an organization with a domain matching the users email.
      const emailDomain = user.email.split("@")[1];
      const orgCollectionRef = collection(db, "orgs");
      const orgQuerySnapshot = await getDocs(query(orgCollectionRef, where("domain", "==", emailDomain)));

      if (!orgQuerySnapshot.empty) 
      {
        const orgDocSnapshot = orgQuerySnapshot.docs[0];
        const orgData = orgDocSnapshot.data()
        const orgRef = doc(db, "orgs", orgDocSnapshot.id);

        userJSON.org = {
          joinedAt: new Date(),
          orgId: orgDocSnapshot.id,
          orgName: orgData.name
        }

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

      // on success bring to home
      document.location.href="/";
    } 
    // handle firebase errors
    catch (err) 
    {
      if (err.code === 'auth/email-already-in-use') 
      {
        setError('ERROR: This email is already in use.');
      } 
      else 
      {
        setError(`ERROR: ${err.message}`);
      }
    }
  };

  ///////////////
  // FRONT END //
  ///////////////

  return (
    <main>
      <h1>Signup</h1>

      <div className="form">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="text"
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)}
        />

        <input
          type="date"
          placeholder="Birthday"
          value={birthday}
          onChange={(e) => setBirthday(e.target.value)}
        />

        <button onClick={createAccountButton}>Create Account</button>
      </div>
      {error && <p className="error">{error}</p>}
    </main>
  );
}

export default Signup
