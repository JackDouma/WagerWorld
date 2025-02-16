import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';

const db = getFirestore();

function OrgRestrictedRoute({ children }) {
    const [isLoading, setIsLoading] = useState(true);
    const [isInOrg, setIsInOrg] = useState(false);
    const [userOrgId, setUserOrgId] = useState(null);
    const { orgId } = useParams();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) 
            {
                setIsLoading(false);
                return;
            }

            try {
                // get user data
                const userDoc = await getDoc(doc(db, 'users', user.uid));

                if (userDoc.exists()) 
                {
                    const userData = userDoc.data();
                    const orgId = userData.org?.orgId;
                    setUserOrgId(orgId);

                    // check if user is in right org
                    if (orgId && orgId === orgId) 
                    {
                        setIsInOrg(true);
                    }
                }
            } 
            catch (error) 
            {
                console.error('ERROR:', error);
            }

            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [orgId]);

    if (isLoading) 
    {
        return <div>Loading...</div>;
    }

    // 404 if user is not logged in
    if (!auth.currentUser) 
    {
        return <Navigate to="/404" />;
    }

    // 404 if user is not part of org they are trying to go to
    if (!isInOrg || userOrgId !== orgId)
    {
        return <Navigate to="/404" />;
    }

    return children;
}

export default OrgRestrictedRoute;
