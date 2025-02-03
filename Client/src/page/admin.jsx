import { useState, useEffect } from 'react';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { auth, app } from '../../firebase';
import { useNavigate } from "react-router-dom";

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
                            <td>Delete | Edit</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </main>
    );
}

export default AdminPage;
