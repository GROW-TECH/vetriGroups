import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBs6R2p3-pcq0Kb345MAQ0m6NYDF_Q0-G0",
  authDomain: "construction-mt.firebaseapp.com",
  databaseURL: "https://construction-mt-default-rtdb.firebaseio.com",
  projectId: "construction-mt",
  storageBucket: "construction-mt.firebasestorage.app",
  messagingSenderId: "717714009624",
  appId: "1:717714009624:web:9011f2ef8f17fba7395d6d",
  measurementId: "G-H61VSYKYCH"
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export { app };
