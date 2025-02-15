import { useState } from 'react';
import { doc, setDoc, collection, addDoc, getFirestore, arrayUnion } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';


const db = getFirestore();

function CreateOrg() 
{
    const [orgName, setOrgName] = useState('');
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [ownerPassword, setOwnerPassword] = useState('');
    const [domain, setDomain] = useState('');
    const [error, setError] = useState('');

    const createOrg = async () => {
        setError('');

        // check
        if (!orgName || !ownerName || !ownerEmail || !ownerPassword || !domain) 
        {
            setError('All fields are required.');
            return;
        }

        try {
            // save current user to log back info afre
            const currentUser = auth.currentUser;
            const currentUserEmail = currentUser.email;
            const currentUserPassword = "test1234"; // maybe not the best security but i want to get this working

            const userCredential = await createUserWithEmailAndPassword(getAuth(), ownerEmail, ownerPassword);
            const ownerId = userCredential.user.uid;

            // add org
            const orgRef = await addDoc(collection(db, 'orgs'), {
                name: orgName,
                domain,
                createdAt: new Date(),
                adultOnly: true,
                allowPoker: true,
                allowRoulette: true,
                allowBlackJack: true,
                allowCrazy8s: true,
                memberCount: 1,
                owner: {
                    ownerId: ownerId,
                    ownerName: ownerName,
                    ownerEmail: ownerEmail,
                },
                member: arrayUnion({
                    id: ownerId,
                    name: ownerName,
                    email: ownerEmail,
                    joinedAt: new Date(),
                }),
            });

            // add owner
            await setDoc(doc(db, 'users', ownerId), {
                name: ownerName,
                email: ownerEmail,
                owner: true,
                createdAt: new Date(),
                org: {
                    orgId: orgRef.id,
                    orgName: orgName,
                    joinedAt: new Date(),
                },
            });


             // sign back into the admin account before going back to admin page
            await signInWithEmailAndPassword(auth, currentUserEmail, currentUserPassword);
            window.location.href = '/admin';
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
                    placeholder="Organization Name"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Owner Name"
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                />
                <input
                    type="email"
                    placeholder="Owner Email"
                    value={ownerEmail}
                    onChange={(e) => setOwnerEmail(e.target.value)}
                />
                <input
                    type="password"
                    placeholder="Owner Password"
                    value={ownerPassword}
                    onChange={(e) => setOwnerPassword(e.target.value)}
                />
                <input
                    type="text"
                    placeholder="Domain"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                />
                
                <button onClick={createOrg}>Create</button>
                {error && <p className="error">{error}</p>}
            </div>
        </main>
    );
}

export default CreateOrg;
