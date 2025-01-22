import { useState, useEffect } from 'react';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { auth, app } from '../../firebase';

import '../css/admin.css';

const db = getFirestore(app);

function AdminPage() 
{
    const [orgs, setOrgs] = useState([]);

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

    return (
        <main className="admin-page">
        <h1>Admin</h1>

        <div className="create-org-container">
            <a href="/createorg" className="create-org-button">Create Org</a>
        </div>

        <table className="orgs-table">
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
                <td>{org.members?.length || 0}</td>
                <td>Delete | Edit</td>
                </tr>
            ))}
            </tbody>
        </table>
        </main>
    );
}

export default AdminPage;
