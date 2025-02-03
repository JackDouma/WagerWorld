import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
const db = getFirestore();

function OrgRestrictedRoute({ children }) 
{
    const [isLoading, setIsLoading] = useState(true);
    const [isInOrg, setIsInOrg] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {

        if (!user) 
        {
            setIsLoading(false);
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (userDoc.exists() && userDoc.data().org) 
            {
                setIsInOrg(true);
            }
        } 
        catch (error) 
        {
            console.error('ERROR:', error);
        }

        setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (isLoading) 
    {
        return <div>Loading...</div>;
    }

    // redirect to 404 if the user is not in org
    if (!isInOrg) 
    {
        return <Navigate to="/notfound" />;
    }

  return children;
}

export default OrgRestrictedRoute;
