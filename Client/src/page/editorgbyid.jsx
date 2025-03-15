import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, getFirestore, updateDoc } from "firebase/firestore";
import { app } from "../../firebase";

const db = getFirestore(app)

function EditOrgById() 
{
    const { orgId } = useParams();
    const navigate = useNavigate();
    const [orgName, setOrgName] = useState('');
    const [domain, setDomain] = useState('');
    const [adultOnly, setAdultOnly] = useState(false);
    const [allowBlackJack, setAllowBlackJack] = useState(false);
    const [allowCrazy8s, setAllowCrazy8s] = useState(false);
    const [allowPoker, setAllowPoker] = useState(false);
    const [allowRoulette, setAllowRoulette] = useState(false);
    const [error, setError] = useState('');
    
    // get current saved data from firebase
    useEffect(() => {
        const fetchOrg = async () => {
            try {
                const orgRef = doc(db, 'orgs', orgId);
                const orgDoc = await getDoc(orgRef);

                if (orgDoc.exists()) 
                {
                    const orgData = orgDoc.data();
                    setOrgName(orgData.name);
                    setDomain(orgData.domain);
                    setAdultOnly(orgData.adultOnly);
                    setAllowBlackJack(orgData.allowBlackJack);
                    setAllowCrazy8s(orgData.allowCrazy8s);
                    setAllowPoker(orgData.allowPoker);
                    setAllowRoulette(orgData.allowRoulette);
                } 
            } 
            catch (error) 
            {
                console.error("ERROR: ", error);
            }
        };
        
        fetchOrg();
    }, [orgId]);

    const handleSave = async (e) => {
        e.preventDefault();

        if (!orgName || !domain) 
        {
            setError('All fields are required.');
            return;
        }

        // update firebase with the edits
        try {
            const orgRef = doc(db, 'orgs', orgId);

            await updateDoc(orgRef, {
                name: orgName,
                domain: domain,
                adultOnly,
                allowBlackJack,
                allowCrazy8s,
                allowPoker,
                allowRoulette
            });

            navigate("/admin");
        } 
        catch (error) 
        {
            console.error("ERROR: ", error);
        }
    };

    return (
        <main>
            <h1>Edit Organization</h1>
            {error && <p style={{ color: 'red' }}>{error}</p>}

            {/* TODO: Note - form styling removed in styles.css - add back temporarily to see original */}
            <form className="form" onSubmit={handleSave}> 
                <div>
                    <label htmlFor="orgName">Organization Name</label>
                    <input
                        type="text"
                        id="orgName"
                        placeholder="Name"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="domain">Domain</label>
                    <input
                        type="text"
                        id="domain"
                        placeholder="Domain"
                        value={domain}
                        onChange={(e) => setDomain(e.target.value)}
                        required
                    />
                </div>

                <div>
                    <label htmlFor="adultOnly">Adult Only</label>
                    <input
                        type="checkbox"
                        id="adultOnly"
                        checked={adultOnly}
                        onChange={(e) => setAdultOnly(e.target.checked)}
                    />
                </div>

                <div>
                    <label htmlFor="allowBlackJack">Allow BlackJack</label>
                    <input
                        type="checkbox"
                        id="allowBlackJack"
                        checked={allowBlackJack}
                        onChange={(e) => setAllowBlackJack(e.target.checked)}
                    />
                </div>

                <div>
                    <label htmlFor="allowCrazy8s">Allow Crazy 8s</label>
                    <input
                        type="checkbox"
                        id="allowCrazy8s"
                        checked={allowCrazy8s}
                        onChange={(e) => setAllowCrazy8s(e.target.checked)}
                    />
                </div>

                <div>
                    <label htmlFor="allowPoker">Allow Poker</label>
                    <input
                        type="checkbox"
                        id="allowPoker"
                        checked={allowPoker}
                        onChange={(e) => setAllowPoker(e.target.checked)}
                    />
                </div>

                <div>
                    <label htmlFor="allowRoulette">Allow Roulette</label>
                    <input
                        type="checkbox"
                        id="allowRoulette"
                        checked={allowRoulette}
                        onChange={(e) => setAllowRoulette(e.target.checked)}
                    />
                </div>

                <button type="submit">Save</button>
            </form>
        </main>
    );
}

export default EditOrgById;