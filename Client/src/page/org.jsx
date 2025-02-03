import { useEffect, useState } from 'react';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

import '../css/org.css';

const db = getFirestore();
const auth = getAuth();

function ViewOrg() 
{
  return (
    <main>
      <h1>Organization Required</h1>
    </main>
  );
}

export default ViewOrg;
