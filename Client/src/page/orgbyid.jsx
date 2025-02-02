import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useParams } from 'react-router-dom';

import '../css/org.css';

const db = getFirestore();
const auth = getAuth();

function ViewOrgById() {
  const [orgName, setOrgName] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
 
  const { orgCode } = useParams()

  useEffect(() => {
        const fetchOrgData = async () => {

        try {
            const currentUser = auth.currentUser;

            console.log(orgCode);
            
            // if (!currentUser) 
            // {
            //     document.location.href = '/';
            //     return;
            // }

            const orgDocRef = doc(db, 'orgs', orgCode);
            const orgDoc = await getDoc(orgDocRef);

            if (orgDoc.exists()) 
            {
                const orgData = orgDoc.data();

                setOrgName(orgData.name || 'Unknown Organization');
                setOrgCode(orgDoc.id || 'Unknown Code');

                setMembers(
                    (orgData.members || []).map((member) => ({
                    ...member,

                    // convert firestore data to JS date
                    joinedAt: member.joinedAt?.toDate(),
                    }))
                );
            } 
        } 
        catch (err)
        {
            console.error('ERROR:', err);
        } 
        finally 
        {
            setLoading(false);
        }
    };

    fetchOrgData();
  }, []);

  return (
    <main>
      <h1>Organization: {orgName}</h1>
      <h2>Code: {orgCode}</h2>
      {loading && <p>Loading...</p>}
      {!loading && members.length > 0 && (
        <div>
          <h3>Members:</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Joined At</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={index}>
                  <td>{member.name}</td>
                  <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                  <td>0</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!loading && members.length === 0 && <p>No members found.</p>}
    </main>
  );
}

export default ViewOrgById;
