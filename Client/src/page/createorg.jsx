import { useState } from 'react';
import { doc, setDoc, updateDoc, getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, app } from '../../firebase';

import '../css/createorg.css'

const db = getFirestore(app);

function CreateOrg() 
{
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [user] = useAuthState(auth);

  // when the user presses the create org button
  const createOrg = async () => {
    setError('');

    // if field is not filled
    if (!orgName) 
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
      // check if the org name already taken
      const orgsCollection = collection(db, 'orgs');
      const q = query(orgsCollection, where('name', '==', orgName));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) 
      {
        setError(`The organization name "${orgName}" is already in use.`);
        return;
      }

      // create 8 digit code
      const orgCode = Array(8)
        .fill(0)
        .map(() => Math.random().toString(36).charAt(2).toUpperCase())
        .join('');

      // save org to orgs collection on firestore
      const orgRef = doc(db, 'orgs', orgCode);
      await setDoc(orgRef, {
        name: orgName,
        code: orgCode,
        createdBy: user.uid,
        createdAt: new Date(),
      });

      // add org to the user
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        org: {
          name: orgName,
          code: orgCode,
          owner: true, // TODO test if this works, just added it
          joinedAt: new Date(),
        },
      });

      setOrgName('');

      // on success bring to home
      document.location.href="/";
    } 
    catch (err) 
    {
      console.error(err);
      setError('Failed to create organization.');
    }
  };

  return (
    <main>
      <h1>Create Organization</h1>

      <div className="form">
        <input
          type="text"
          placeholder="Enter organization name"
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
        />

        <button onClick={createOrg}>Create Organization</button>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}

export default CreateOrg