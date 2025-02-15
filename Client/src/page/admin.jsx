import { useState, useEffect } from 'react';
import { collection, getDocs, getFirestore, deleteDoc, doc } from 'firebase/firestore';
import { auth, app } from '../../firebase';
import { useNavigate } from "react-router-dom";
import { getAuth, deleteUser } from 'firebase/auth';

const db = getFirestore(app);

function AdminPage() 
{
    const [orgs, setOrgs] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrgs = async () => {
        try {
            const orgsCollection = collection(db, 'orgs');
            const orgsSnapshot = await getDocs(orgsCollection);
            const orgsData = orgsSnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
            }));
            setOrgs(orgsData);
        } 
        catch (error)
        {
            console.error('Error fetching orgs:', error);
        }
        };

        fetchOrgs();
    }, []);

    const handleDelete = async (id, ownerId) => {
        try {
            const orgDoc = doc(db, 'orgs', id);
            const userDoc = doc(db, 'users', ownerId);
            const authUser = getAuth().currentUser;

            // delete org and owner account
            await deleteDoc(orgDoc);
            await deleteDoc(userDoc);
            
            
            // delete the user auth account
            if (authUser && authUser.uid === ownerId) 
            {
                await deleteUser(authUser);
            }

            // remove deleted org from state
            setOrgs(orgs.filter((org) => org.id !== id));
        } 
        catch (error) 
        {
            console.error('ERROR: ', error);
        }
    };

    return (
        <main className="admin-page">
            <h1>Admin</h1>

            <button onClick={() => navigate("/createorg")}>Create Org</button>

            <table>
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Created At</th>
                        <th>Members</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {orgs.map((org) => (
                        <tr key={org.id}>
                            <td>{org.name}</td>
                            <td>{new Date(org.createdAt?.seconds * 1000).toLocaleDateString()}</td>
                            <td>{org.memberCount}</td>
                            <td>
                                <a onClick={() => handleDelete(org.id, org.owner.ownerId)} className="link">Delete</a> | <a onClick={() => handleEdit(org.id)} className="link">Edit</a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </main>
    );
}

export default AdminPage;
