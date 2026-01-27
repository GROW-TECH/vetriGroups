import { initializeApp } from 'firebase/app';

// Test with minimal configuration first
const testConfig = {
  apiKey: "AIzaSyBs6R2p3-pcq0Kb345MAQ0m6NYDF_Q0-G0",
  authDomain: "construction-mt.firebaseapp.com",
  projectId: "construction-mt",
  storageBucket: "construction-mt.firebasestorage.app",
  messagingSenderId: "717714009624",
  appId: "1:717714009624:web:9011f2ef8f17fba7395d6d",
  measurementId: "G-H61VSYKYCH"
};

export function testFirebaseInitialization() {
  try {
    console.log('Testing Firebase initialization with config:', testConfig);
    const app = initializeApp(testConfig, 'test-app');
    console.log('✅ Firebase app initialized successfully');
    return app;
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    throw error;
  }
}
