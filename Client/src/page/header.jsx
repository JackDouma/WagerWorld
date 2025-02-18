import { useState, useEffect } from 'react';
import { auth } from '../../firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, getFirestore } from 'firebase/firestore';

const db = getFirestore();

function Header() 
{
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userOrg, setUserOrg] = useState(null);

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
          const userData = userDoc.data();
          setUserName(userData.name || '');
          setIsAdmin(userData.admin === true);
          setIsOwner(userData.owner === true);
          setUserOrg(userData.org || null);
        }
      } 
      else 
      {
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
          <li><a href="/blackjack">Blackjack</a></li>
          <li><a href="/poker">Poker</a></li>
          {!user ? (
            // not logged in
            <div className="right">
              <li><a href="/signin"><i className="fas fa-sign-in-alt"></i> Sign In</a></li>
              <li><a href="/signup"><i className="fas fa-user-plus"></i> Sign Up</a></li>
            </div>
          ) : (
            // logged in
            <>
              
              {isAdmin && (
                <li><a href="/admin">Admin</a></li>
              )}

              {userOrg && (
                <li><a href={`/org/${userOrg.orgId}`}>My ORG</a></li>
              )}

              {isOwner && (
                <li><a href={`/orgsettings/${userOrg.orgId}`}>ORG Settings</a></li>
              )}

              <div className="right">
                <li>Welcome, {userName}</li>
                <li><a href="/index" onClick={signOutPress}><i className="fas fa-sign-out-alt"></i> Sign Out</a></li>
              </div>
            </>
          )}
        </ul>
      </nav>
    </header>
  );
}

export default Header;
