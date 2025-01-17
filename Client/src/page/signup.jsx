import { useState } from 'react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, getFirestore } from 'firebase/firestore';
import { auth, app } from '../../firebase';

import '../css/signup.css'

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

      // save user info to firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: user.email,
        name: name,
        birthday: birthday,
        createdAt: new Date(),
      });

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
