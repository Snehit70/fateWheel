import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCENZ46GxsiZ-omgxi_StBq8CKC2Ip0fsY",
    authDomain: "roulette-ebfbb.firebaseapp.com",
    projectId: "roulette-ebfbb",
    storageBucket: "roulette-ebfbb.firebasestorage.app",
    messagingSenderId: "728578604950",
    appId: "1:728578604950:web:145f5c40f68f7fc895e7b7",
    measurementId: "G-SFX2PJL72Q"
};

import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

if (location.hostname === 'localhost') {
    connectFunctionsEmulator(functions, 'localhost', 5001);
}

export { auth, db, functions };
