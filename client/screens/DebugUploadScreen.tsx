import React, { useState } from 'react';
import { View, StyleSheet, Alert, Button, Text, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhotoAndCreateDoc } from '@/lib/photos';
import { testFirebaseConnection } from '@/lib/firebaseTest';
import { testFirebaseInitialization } from '@/lib/firebaseTestInit';

export default function DebugUploadScreen() {
  const { theme } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[Debug] ${message}`);
  };

  const testInitialization = async () => {
    addLog('Testing Firebase initialization...');
    try {
      const app = testFirebaseInitialization();
      addLog('✅ Firebase initialization successful');
    } catch (error) {
      addLog(`❌ Firebase initialization failed: ${error}`);
    }
  };

  const testConnection = async () => {
    addLog('Testing Firebase connection...');
    try {
      const result = await testFirebaseConnection();
      if (result.success) {
        addLog('✅ Firebase connection successful');
      } else {
        addLog(`❌ Firebase connection failed: ${result.error}`);
      }
    } catch (error) {
      addLog(`❌ Connection test error: ${error}`);
    }
  };

  const pickAndUploadImage = async () => {
    addLog('Starting image upload test...');
    
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        addLog('❌ Media library permission denied');
        return;
      }
      addLog('✅ Media library permission granted');

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.7,
        mediaTypes: ['images'],
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        addLog('❌ No image selected');
        return;
      }

      const uri = result.assets[0].uri;
      addLog(`✅ Image selected: ${uri}`);

      setIsUploading(true);
      addLog('Starting upload...');

      // Upload with test data
      const url = await uploadPhotoAndCreateDoc({
        uri,
        siteId: 'test-site',
        siteName: 'Test Site',
        uploader: { name: 'Debug User' },
      });

      addLog(`✅ Upload successful! URL: ${url}`);
      Alert.alert('Success', 'Image uploaded successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      addLog(`❌ Upload failed: ${errorMessage}`);
      Alert.alert('Upload Failed', errorMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="h2">Upload Debug</ThemedText>
      </View>

      <View style={styles.buttons}>
        <Button title="Test Firebase Initialization" onPress={testInitialization} />
        <Button title="Test Firebase Connection" onPress={testConnection} />
        <Button 
          title={isUploading ? "Uploading..." : "Pick & Upload Image"} 
          onPress={pickAndUploadImage} 
          disabled={isUploading}
        />
        <Button title="Clear Logs" onPress={clearLogs} />
      </View>

      <ScrollView style={styles.logContainer}>
        <ThemedText type="small" style={styles.logTitle}>Debug Logs:</ThemedText>
        {logs.map((log, index) => (
          <Text key={index} style={[styles.logEntry, { color: theme.text }]}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 20,
  },
  buttons: {
    gap: 10,
    marginBottom: 20,
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  logTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  logEntry: {
    fontFamily: 'monospace',
    fontSize: 12,
    marginBottom: 2,
  },
});
