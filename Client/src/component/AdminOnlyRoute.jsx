import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { auth } from '../../firebase';
import { onAuthStateChanged } from 'firebase/auth';
const db = getFirestore();

function AdminOnlyRoute({ children }) 
{
    const [isLoading, setIsLoading] = useState(true);
    const [isAdmin, setAdmin] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {

        if (!user) 
        {
            setIsLoading(false);
            return;
        }

        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (userDoc.exists() && userDoc.data().admin === true) 
            {
                setAdmin(true);
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

    // redirect to 404 if the user is not admin
    if (!isAdmin) 
    {
        return <Navigate to="/404" />;
    }

  return children;
}

export default AdminOnlyRoute;
