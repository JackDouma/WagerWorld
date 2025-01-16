import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';

import '../css/signin.css'

function Signin() 
{
  //////////////
  // BACK END //
  //////////////

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // on sign in button press
  const signInButton = async () => {
    setError('');

    // if not all fields are entered 
    if (!email || !password) 
    {
      setError('ERROR: Field is Empty.');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // on success bring to home
      document.location.href="/";
    } 
    // handle signin errors
    catch (err) 
    {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') 
      {
        setError('ERROR: Incorrect email or password.');
      } 
      else 
      {
        setError(`ERROR: ${err.message}`);
      }
    }
  };

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

export default Signin
