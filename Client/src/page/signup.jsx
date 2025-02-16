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
      // Create JSON object for user details
      let userJSON = {
        email: email,
        name: name,
        birthday: birthday,
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
      if (orgExists) 
      {
        const orgDocSnapshot = orgQuerySnapshot.docs[0];
        const orgData = orgDocSnapshot.data()
        orgRef = doc(db, "orgs", orgDocSnapshot.id);

        userJSON.org = {
          joinedAt: new Date(),
          orgId: orgDocSnapshot.id,
          orgName: orgData.name
        }

        // Check if user is of age for organization. Set error if not.
        if (!is18OrOlder(birthday) && orgData.adultOnly) {
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
