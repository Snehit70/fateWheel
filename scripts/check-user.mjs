import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCENZ46GxsiZ-omgxi_StBq8CKC2Ip0fsY",
  authDomain: "roulette-ebfbb.firebaseapp.com",
  projectId: "roulette-ebfbb",
  storageBucket: "roulette-ebfbb.firebasestorage.app",
  messagingSenderId: "728578604950",
  appId: "1:728578604950:web:145f5c40f68f7fc895e7b7",
  measurementId: "G-SFX2PJL72Q"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkUser() {
  const email = 'test@example.com';
  console.log(`Checking user: ${email}`);
  
  const timeout = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Operation timed out')), 5000)
  );

  try {
    const userRef = doc(db, 'users', email);
    const userSnap = await Promise.race([
      getDoc(userRef),
      timeout
    ]);

    if (userSnap.exists()) {
      console.log('User found:', userSnap.data());
    } else {
      console.log('User NOT found.');
    }
  } catch (error) {
    console.error('Error checking user:', error.message);
  }
  process.exit(0);
}

checkUser();
