import { useState } from 'react';
import { doc, getDoc, updateDoc, getFirestore, arrayUnion } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, app } from '../../firebase';

import '../css/joinorg.css'

const db = getFirestore(app);

function JoinOrg() 
{
    const [orgCode, setOrgCode] = useState('');
    const [error, setError] = useState('');
    const [user] = useAuthState(auth);

    // when the user presses the join org button
    const joinOrg = async () => {
        setError('');
    
        // if field is not filled
        if (!orgCode.trim()) 
        {
            setError('Field is empty.');
            return;
        }
    
        // this shouldn't be possible, but might as well double check
        if (!user) 
        {
            setError('Not logged in.');
            return;
        }
    
        try {
            // check if the user is already in an org
            const userRef = doc(db, 'users', user.uid);
            const userSnapshot = await getDoc(userRef);
    
            if (!userSnapshot.exists()) 
            {
                setError('User data not found in Firestore.');
                return;
            }
    
            const userData = userSnapshot.data();
    
            // check if user is already in org
            if (userData.org && userData.org.name) 
            {
                setError('You are already in an organization.');
                return;
            }
    
            // find the organization by code
            const orgRef = doc(db, 'orgs', orgCode);
            const orgSnapshot = await getDoc(orgRef);
    
            if (!orgSnapshot.exists()) {
                setError('Organization not found. Please double-check the code.');
                return;
            }
    
            const orgData = orgSnapshot.data();
            const orgName = orgData.name;
    
            // add org to the user
            await updateDoc(userRef, {
                org: {
                    name: orgName,
                    code: orgCode,
                    joinedAt: new Date(),
                },
            });
    
            // add user to org
            await updateDoc(orgRef, {
                members: arrayUnion({
                    uid: user.uid,
                    name: userData.name,
                    joinedAt: new Date(),
                }),
            });
    
            setOrgCode('');
    
            // on success bring to home
            document.location.href = '/';
      } 
      catch (err) 
      {
          console.error(err);
          setError('Failed to join the organization.');
      }
  };

    return (
      <main>
        <h1>Join Organization</h1>

        <div className="form">
          <input
            type="text"
            placeholder="Enter organization code"
            value={orgCode}
            onChange={(e) => setOrgCode(e.target.value)}
          />

          <button onClick={joinOrg}>Join Organization</button>
          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
}

export default JoinOrg