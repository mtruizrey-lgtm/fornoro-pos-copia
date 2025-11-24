
// @ts-ignore
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBBOZ3ShenE973NTOKuZMdGvifIA3HvIzQ",
  authDomain: "forno-rosso-pos.firebaseapp.com",
  projectId: "forno-rosso-pos",
  storageBucket: "forno-rosso-pos.firebasestorage.app",
  messagingSenderId: "698828526416",
  appId: "1:698828526416:web:ae7904c330eff1d27d9255"
};

let app;
let db: any = null;
let isConfigured = false;

try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  
  db = getFirestore(app);
  isConfigured = true;
  console.log("Firebase Initialized with static config");
} catch (error) {
  console.error("Firebase Init Error:", error);
  db = null;
  isConfigured = false;
}

export { db, isConfigured };
