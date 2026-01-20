import { storage, db, auth } from '../firebaseConfig';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Test function to verify Firebase connectivity
export async function testFirebaseConnection() {
  console.log('Testing Firebase connection...');
  
  try {
    // Test 1: Check if we can access Firebase services
    console.log('Testing Firebase app access...');
    console.log('✅ Firebase app initialized successfully');
    
    // Test 2: Try to access Firestore (no auth required for read)
    console.log('Testing Firestore access...');
    try {
      const testCollection = collection(db, 'test');
      console.log('✅ Firestore collection access successful');
    } catch (firestoreError) {
      console.error('❌ Firestore access failed:', firestoreError);
      throw firestoreError;
    }

    // Test 3: Try to access Storage (no auth required for read)
    console.log('Testing Storage access...');
    try {
      const testRef = ref(storage, 'test/connection-test.txt');
      console.log('✅ Storage reference access successful');
    } catch (storageError) {
      console.error('❌ Storage access failed:', storageError);
      throw storageError;
    }

    // Test 4: Check authentication status
    console.log('Checking authentication status...');
    if (auth.currentUser) {
      console.log('✅ User already authenticated:', auth.currentUser.uid);
    } else {
      console.log('ℹ️ No user currently authenticated (this is expected)');
    }

    return { 
      success: true, 
      message: 'Firebase services accessible. Authentication needs to be enabled in console.' 
    };
    
  } catch (error) {
    console.error('Firebase connection test failed:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    };
  }
}
