import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { doc, getDoc, getFirestore} from "firebase/firestore";

const db = getFirestore();

function LeaderboardById() 
{
    const { orgId } = useParams();
    const [leaderboardHistory, setLeaderboardHistory] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        // get leaderboard history
        const fetchLeaderboardHistory = async () => {
            try 
            {
                const orgRef = doc(db, "orgs", orgId);
                const orgSnap = await getDoc(orgRef);

                const history = orgSnap.data().leaderboardHistory || [];
                history.sort((a, b) => b.date.seconds - a.date.seconds);
                setLeaderboardHistory(history);
            } 
            catch (error) 
            {
                console.error("ERROR: ", error);
            }
        };

        fetchLeaderboardHistory();
    }, [orgId]);

    // when left arrow is pressed, go to previous leaderboard
    const handlePrevious = () => {
        setCurrentIndex((prevIndex) => (prevIndex > 0 ? prevIndex - 1 : prevIndex));
    };

    // when right arrow is pressed, go to next leaderboard
    const handleNext = () => {
        setCurrentIndex((prevIndex) => (prevIndex < leaderboardHistory.length - 1 ? prevIndex + 1 : prevIndex));
    };

    return (
        <main>
            <h1>Leaderboard History</h1>

            {leaderboardHistory.length > 0 ? (
                <div>
                    <div>
                        <button onClick={handlePrevious}>←</button>
                        <button onClick={handleNext}>→</button>
                        <h2>{currentIndex + 1} - {new Date(leaderboardHistory[currentIndex].date.seconds * 1000).toLocaleDateString()}</h2>
                    </div>

                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Balance</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaderboardHistory[currentIndex].members.map((member, index) => (
                                <tr key={index}>
                                    <td>{member.name}</td>
                                    <td>{member.balance}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p>No leaderboard history available.</p>
            )}
        </main>
    );
}

export default LeaderboardById;