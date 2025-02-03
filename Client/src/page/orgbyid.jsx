import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { useParams } from 'react-router-dom';

const db = getFirestore();
const auth = getAuth();

function ViewOrgById() {
  const [orgName, setOrgName] = useState('');
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { orgCode } = useParams();

  useEffect(() => {
    const fetchOrgData = async () => {
      try {
        const currentUser = auth.currentUser;

        const orgDocRef = doc(db, 'orgs', orgCode);
        const orgDoc = await getDoc(orgDocRef);

        if (orgDoc.exists()) {
          const orgData = orgDoc.data();

          setOrgName(orgData.name || 'Unknown Organization');

          setMembers(
            (orgData.member || []).map((member) => ({
              ...member,
              // convert firestore data to JS date
              joinedAt: member.joinedAt?.toDate(),
            }))
          );
        }
      } catch (err) {
        console.error('ERROR:', err);
        setError('Error loading organization data');
      } finally {
        setLoading(false);
      }
    };

    fetchOrgData();
  }, [orgCode]);

  return (
    <main>
      <h1>{orgName}</h1>

      <div className="roomOptions">
        <button>Create Room</button>
        <button>Join Room</button>
      </div>

      <div>
          <h2>Available Rooms</h2>
          <table>
            <thead>
              <tr>
                <th>Host</th>
                <th>Type</th>
                <th>Players</th>
                <th>Games</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
                <tr>
                  <td>Justin</td>
                  <td>Public</td>
                  <td>7/20</td>
                  <td>Poker(2), Blackjack(2), Crazy 8s(1)</td>
                  <td>Join</td>
                </tr>
                <tr>
                  <td>Eric</td>
                  <td>Private</td>
                  <td>4/20</td>
                  <td>Poker(1), Blackjack(1)</td>
                  <td>Join</td>
                </tr>
            </tbody>
          </table>
        </div>

      {loading && <p>Loading...</p>}
      {error && <p>{error}</p>}
      {!loading && members.length > 0 && (
        <div>
          <h2>Members</h2>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Joined At</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member, index) => (
                <tr key={index}>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{new Date(member.joinedAt).toLocaleDateString()}</td>
                  <td>0</td> {/* Assuming balance is 0 for now */}
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
