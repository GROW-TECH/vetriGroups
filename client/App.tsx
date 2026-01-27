import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { Feather } from '@expo/vector-icons';
import * as SplashScreen from 'expo-splash-screen';

import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/query-client';
import { storage, db, auth } from '@/firebaseConfig';
import { signInAnonymously, signInWithEmailAndPassword } from 'firebase/auth';
import { DEV_AUTH_EMAIL, DEV_AUTH_PASSWORD } from '@/config/devAuth';
import RootStackNavigator from '@/navigation/RootStackNavigator';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';

const linking = {
  prefixes: [
    'constructionerp://',
    'http://localhost:8081',
    'http://localhost:19006',
  ],
  config: {
    screens: {
      PhotoGroup: 'photo-group/:groupId',
    },
  },
};




export default function App() {
  console.log("✅ Firebase Storage Loaded:", storage);
  const [isReady, setIsReady] = useState(false);
  const [fontsLoaded, fontError] = useFonts({
    ...Feather.font,
  });
  const hasHiddenRef = useRef(false);

  // Initialize splash + Firebase once
  useEffect(() => {
    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch (e) {
        console.warn('SplashScreen.preventAutoHideAsync failed:', e);
      }

      try {
        if (!auth.currentUser) {
          if (DEV_AUTH_EMAIL && DEV_AUTH_PASSWORD) {
            await signInWithEmailAndPassword(auth, DEV_AUTH_EMAIL, DEV_AUTH_PASSWORD);
            console.log('✅ Signed in to Firebase with email/password');
          } else {
            await signInAnonymously(auth);
            console.log('✅ Signed in to Firebase anonymously for development');
          }
        }
      } catch (err) {
        console.warn('Firebase sign-in failed (enable Anonymous or provide dev credentials):', err);
      }

      // Diagnostic connectivity check for Firebase
      try {
        console.log('Firebase storage object:', storage);
        console.log('Firebase auth currentUser:', auth?.currentUser || null);
        const { collection, query, limit, getDocs } = await import('firebase/firestore');
        const q = query(collection(db, 'photos'), limit(1));
        const snap = await getDocs(q);
        console.log('Firestore read success, docs:', snap.size);
      } catch (err) {
        console.error('Firebase connectivity check failed:', err);
      }
    })();
  }, []);

  // Hide splash when fonts ready, with guarded fallback timings
  useEffect(() => {
    let hideTimer: NodeJS.Timeout | null = null;
    let fallbackTimer: NodeJS.Timeout | null = null;

    const ensureHide = async () => {
      if (hasHiddenRef.current) return;
      hasHiddenRef.current = true;
      setIsReady(true);
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('SplashScreen.hideAsync failed:', e);
      }
    };

    if (fontsLoaded || fontError) {
      ensureHide();
    } else {
      hideTimer = setTimeout(() => {
        ensureHide();
      }, 3000);
      fallbackTimer = setTimeout(() => {
        console.warn('Splash screen fallback timer triggered');
        ensureHide();
      }, 7000);
    }

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      if (fallbackTimer) clearTimeout(fallbackTimer);
    };
  }, [fontsLoaded, fontError]);

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={styles.root}>
            <KeyboardProvider>
              <AuthProvider>
                <DataProvider>
                  <NavigationContainer linking={linking} fallback={<ActivityIndicator />}>
                    <RootStackNavigator />
                  </NavigationContainer>
                </DataProvider>
              </AuthProvider>
              <StatusBar style="auto" />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
});
