import { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

import '../css/header.css'

const db = getFirestore();

function Header() {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('')

  // check if logged in or not
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) 
      {
        setUser(currentUser);

        // get users name from Firestore
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));

        if (userDoc.exists()) 
        {
          setUserName(userDoc.data().name);
        }
      } 
      else 
      {
        setUser(null);
        setUserName('');
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
    catch (error) 
    {
      console.error('ERROR:', error);
    }
  };

  return (
    <header>
      <nav>
        <ul>
          <li><a href="/index">Home</a></li>
          <div className="right">
            {!user ? 
            (
              <>
                <li><a href="/signin"><i className="fas fa-sign-in-alt"></i>Sign In</a></li>
                <li><a href="/signup"><i className="fas fa-user-plus"></i>Sign Up</a></li>
              </>
            ) 
            : (
              <>
                <li>Welcome, {userName}</li>
                <li><a href="/index" onClick={signOutPress}><i className="fas fa-sign-out-alt"></i>Sign Out</a></li>
              </>
            )}
          </div>
        </ul>
      </nav>
    </header>
  );
}

export default Header
