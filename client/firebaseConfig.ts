import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyBs6R2p3-pcq0Kb345MAQ0m6NYDF_Q0-G0",
  authDomain: "construction-mt.firebaseapp.com",
  projectId: "construction-mt",
storageBucket: "construction-mt.appspot.com",
  messagingSenderId: "717714009624",
  appId: "1:717714009624:web:9011f2ef8f17fba7395d6d",
  measurementId: "G-H61VSYKYCH",
  databaseURL: "https://construction-mt-default-rtdb.firebaseio.com/",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const rtdb = getDatabase(app);

export { app };
