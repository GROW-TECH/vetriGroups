import React, { useState } from 'react';
import { View, StyleSheet, TextInput, Alert, Image, Pressable, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as LocalAuthentication from 'expo-local-authentication';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { EmployeeRole } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { EmployeesService } from '@/firebaseServices/employeesService';
import { uploadPhotoAndCreateDoc } from '@/lib/photos';

// Define all employee roles including site_engineer
const ALL_EMPLOYEE_ROLES: EmployeeRole[] = [
  'labor',
  'mason',
  'engineer',
  'site_engineer',  // Explicitly included
  'supervisor'
];

// Role labels
const ROLE_LABELS: Record<EmployeeRole, string> = {
  'labor': 'Labor',
  'mason': 'Mason',
  'engineer': 'Engineer',
  'site_engineer': 'Site Engineer',  // Make sure this is here
  'supervisor': 'Supervisor'
};

export default function AddEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { addEmployee, employees } = useData();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<EmployeeRole>('labor');
  const [salary, setSalary] = useState('');
  const [faceImage, setFaceImage] = useState<string | undefined>();
  const [faceEnrolled, setFaceEnrolled] = useState(false);
  const [fingerprintEnrolled, setFingerprintEnrolled] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [showErrorPopup, setShowErrorPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [showStatus, setShowStatus] = useState(false);
  
  // Check if role is site engineer
  const isSiteEngineer = role === 'site_engineer';

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to capture face image.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setFaceImage(result.assets[0].uri);
    }
  };

  const handleEnrollFace = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Face enrollment requires a mobile device. Please use Expo Go to enroll face data.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed to capture face for enrollment.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      cameraType: ImagePicker.CameraType.front,
    });

    if (!result.canceled && result.assets[0]) {
      setFaceImage(result.assets[0].uri);
      setFaceEnrolled(true);
      Alert.alert('Face Enrolled', 'Face data has been captured and enrolled successfully for attendance verification.');
    }
  };

  const handleEnrollFingerprint = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Not Available', 'Fingerprint enrollment requires a mobile device. Please use Expo Go to enroll fingerprint.');
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert('Not Supported', 'This device does not support fingerprint authentication.');
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      Alert.alert('No Fingerprint', 'No fingerprint is enrolled on this device. Please set up fingerprint in device settings first.');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enroll fingerprint for attendance',
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      setFingerprintEnrolled(true);
      Alert.alert('Fingerprint Enrolled', 'Fingerprint has been enrolled successfully for attendance verification.');
    } else {
      Alert.alert('Enrollment Failed', 'Fingerprint enrollment was cancelled or failed.');
    }
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter employee name');
      return;
    }
    
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter employee email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('Validation Error', 'Please enter a valid email address');
      return;
    }

    if (!salary.trim()) {
      Alert.alert('Validation Error', 'Please enter employee salary');
      return;
    }

    setIsSubmitting(true);

    try {
      const newEmployee = {
        id: 'emp-' + Date.now(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || '',
        address: address.trim() || 'No address',
        role: role,
        salary: parseInt(salary, 10) || 500,
        faceImage: faceImage,
        faceEnrolled: faceEnrolled,
        fingerprintEnrolled: fingerprintEnrolled,
        // Account access for engineers and site engineers only
        ...((role === 'engineer' || role === 'site_engineer') && {
          hasAccountAccess: true,
          accountCreated: new Date().toISOString(),
          canManageSite: isSiteEngineer, // Site engineers can manage sites
          canApproveWork: isSiteEngineer, // Site engineers can approve work
          canAccessReports: true, // All engineers can access reports
        }),
      };

      await addEmployee(newEmployee as any);
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('Error adding employee:', error);
      setErrorMessage('Failed to add employee. Please try again.');
      setShowErrorPopup(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuccessOk = () => {
    console.log('🧪 Success popup OK pressed, navigating back...');
    setShowSuccessPopup(false);
    navigation.goBack();
  };

  const handleErrorOk = () => {
    console.log('🧪 Error popup OK pressed');
    setShowErrorPopup(false);
    setErrorMessage('');
  };

  // Function to get role display name
  const getRoleDisplayName = (role: EmployeeRole) => {
    return ROLE_LABELS[role] || role;
  };

  // Function to get role description
  const getRoleDescription = (role: EmployeeRole) => {
    switch (role) {
      case 'site_engineer':
        return 'Manages construction site, approves work, and monitors progress';
      case 'engineer':
        return 'Technical planning, design, and project supervision';
      case 'supervisor':
        return 'Oversees daily operations and worker coordination';
      case 'mason':
        return 'Skilled in brickwork, concrete, and masonry tasks';
      case 'labor':
        return 'General construction work and site maintenance';
      default:
        return '';
    }
  };

  return (
    <ThemedView style={styles.container}>
      {/* Status Message - Always visible when shown */}
      {showStatus && (
        <View style={{
          position: 'absolute',
          top: 50,
          left: 20,
          right: 20,
          backgroundColor: statusMessage.includes('✅') ? '#10B981' : statusMessage.includes('❌') ? '#EF4444' : '#3B82F6',
          padding: 15,
          borderRadius: 8,
          zIndex: 1000,
        }}>
          <ThemedText style={{ 
            color: 'white', 
            textAlign: 'center',
            fontWeight: 'bold'
          }}>
            {statusMessage}
          </ThemedText>
        </View>
      )}

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarSection}>
          <Pressable onPress={handleTakePhoto} style={[styles.avatarContainer, { borderColor: theme.border }]}>
            {faceImage ? (
              <Image source={{ uri: faceImage }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: theme.backgroundSecondary }]}>
                <Feather name="camera" size={32} color={theme.textSecondary} />
              </View>
            )}
          </Pressable>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>
            Tap to capture face image
          </ThemedText>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Name *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter employee name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Email *</ThemedText>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  color: theme.text,
                },
              ]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter email address"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Phone Number</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="Enter phone number"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Address</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Enter address"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Role *</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              {getRoleDescription(role)}
            </ThemedText>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roleButtonsContainer}
            >
              {ALL_EMPLOYEE_ROLES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  style={[
                    styles.roleButton,
                    { borderColor: role === r ? Colors.light.primary : theme.border },
                    role === r && { backgroundColor: Colors.light.primary + '15' }
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{ 
                      color: role === r ? Colors.light.primary : theme.text, 
                      fontWeight: role === r ? '600' : '400' 
                    }}
                  >
                    {ROLE_LABELS[r]}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Salary per Day *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={salary}
              onChangeText={setSalary}
              placeholder="Enter daily salary"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
            />
          </View>

          {/* Engineer & Site Engineer Permissions Info */}
          {(role === 'engineer' || role === 'site_engineer') && (
            <View style={styles.infoBox}>
              <Feather name="shield" size={16} color={Colors.light.primary} />
              <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs, flex: 1 }}>
                {isSiteEngineer 
                  ? 'Site Engineer will have permission to manage sites, approve work, and access reports.'
                  : 'Engineer will have access to technical features and reports.'
                }
              </ThemedText>
            </View>
          )}

          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Feather name="user-check" size={20} color={Colors.light.primary} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm, color: Colors.light.primary }}>
                Biometric Enrollment
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              Enroll face or fingerprint for daily attendance verification
            </ThemedText>
            <View style={styles.biometricButtons}>
              <Pressable
                onPress={handleEnrollFace}
                style={[
                  styles.biometricButton,
                  { borderColor: faceEnrolled ? Colors.light.success : theme.border },
                  faceEnrolled && { backgroundColor: Colors.light.success + '15' }
                ]}
              >
                <Feather
                  name="user"
                  size={24}
                  color={faceEnrolled ? Colors.light.success : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: faceEnrolled ? Colors.light.success : theme.text, marginTop: Spacing.xs }}
                >
                  {faceEnrolled ? 'Face Enrolled' : 'Enroll Face'}
                </ThemedText>
                {faceEnrolled ? (
                  <Feather name="check-circle" size={16} color={Colors.light.success} style={{ marginTop: Spacing.xs }} />
                ) : null}
              </Pressable>

              <Pressable
                onPress={handleEnrollFingerprint}
                style={[
                  styles.biometricButton,
                  { borderColor: fingerprintEnrolled ? Colors.light.success : theme.border },
                  fingerprintEnrolled && { backgroundColor: Colors.light.success + '15' }
                ]}
              >
                <Feather
                  name="smartphone"
                  size={24}
                  color={fingerprintEnrolled ? Colors.light.success : theme.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: fingerprintEnrolled ? Colors.light.success : theme.text, marginTop: Spacing.xs }}
                >
                  {fingerprintEnrolled ? 'Fingerprint Enrolled' : 'Enroll Fingerprint'}
                </ThemedText>
                {fingerprintEnrolled ? (
                  <Feather name="check-circle" size={16} color={Colors.light.success} style={{ marginTop: Spacing.xs }} />
                ) : null}
              </Pressable>
            </View>
          </View>
        </View>

        <Button onPress={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? 'Adding...' : 'Add Employee'}
        </Button>
      </KeyboardAwareScrollViewCompat>

      {/* Success Popup Overlay */}
      {showSuccessPopup && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: theme.backgroundDefault,
            padding: 30,
            borderRadius: 10,
            alignItems: 'center',
            maxWidth: '80%',
          }}>
            <Feather name="check-circle" size={50} color="#10B981" style={{ marginBottom: 15 }} />
            <ThemedText type="h3" style={{ marginBottom: 10, textAlign: 'center' }}>
              🎉 SUCCESS!
            </ThemedText>
            <ThemedText style={{ marginBottom: 20, textAlign: 'center', color: theme.textSecondary }}>
              {isSiteEngineer 
                ? `Site Engineer "${name}" added successfully!`
                : `${getRoleDisplayName(role)} "${name}" added successfully!`
              }
            </ThemedText>
            
            {(role === 'engineer' || role === 'site_engineer') && (
              <ThemedText
                style={{
                  marginVertical: 10,
                  textAlign: 'center',
                  color: theme.textSecondary,
                  fontStyle: 'italic',
                }}
              >
                {isSiteEngineer
                  ? 'Site Engineer can now manage sites, approve work, and access reports.'
                  : 'Engineer can now access technical features and reports.'}
              </ThemedText>
            )}

            <Button onPress={handleSuccessOk}>OK</Button>
          </View>
        </View>
      )}

      {/* Error Popup Overlay */}
      {showErrorPopup && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: theme.backgroundDefault,
            padding: 30,
            borderRadius: 10,
            alignItems: 'center',
            maxWidth: '80%',
          }}>
            <Feather name="x-circle" size={50} color="#EF4444" style={{ marginBottom: 15 }} />
            <ThemedText type="h3" style={{ marginBottom: 10, textAlign: 'center' }}>
              ❌ FAILED
            </ThemedText>
            <ThemedText style={{ marginBottom: 20, textAlign: 'center', color: theme.textSecondary }}>
              {errorMessage}
            </ThemedText>
            <Button onPress={handleErrorOk}>OK</Button>
          </View>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: '500',
    marginLeft: Spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    overflow: 'hidden',
  },
  passwordInput: {
    height: 48,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  eyeButton: {
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  roleButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    minWidth: 100,
    alignItems: 'center',
  },
  biometricButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  biometricButton: {
    flex: 1,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.light.primary + '10',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.light.primary + '30',
    marginVertical: Spacing.sm,
  },
});