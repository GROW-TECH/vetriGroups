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
  'site-engineer',
  'supervisor'
];

// Role labels
const ROLE_LABELS: Record<EmployeeRole, string> = {
  labor: 'Labor',
  mason: 'Mason',
  engineer: 'Engineer',
  'site-engineer': 'Site Engineer',
  supervisor: 'Supervisor'
};

export default function AddEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { addEmployee, employees } = useData();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [aadhaarNo, setAadhaarNo] = useState('');
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
  
  // Check if role requires login credentials
  const isSiteEngineer = role === 'site-engineer';
  const isLoginRole = role === 'engineer' || role === 'site-engineer' || role === 'supervisor';

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

  // Validate Aadhaar number format (12 digits)
  const validateAadhaar = (aadhaar: string): boolean => {
    const aadhaarRegex = /^\d{12}$/;
    return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
  };

  const handleAadhaarChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, '');  // Remove ALL non-digits
    const limited = digitsOnly.slice(0, 12);      // Limit to 12
    setAadhaarNo(limited);                         // Store WITHOUT spaces
  };

  const handleSubmit = async () => {
    // Basic validation
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter employee name');
      return;
    }
    
    if (isLoginRole && !username.trim()) {
      Alert.alert(
        'Validation Error',
        `Please enter username for ${getRoleDisplayName(role)}`
      );
      return;
    }

    if (isLoginRole && password.trim().length < 4) {
      Alert.alert(
        'Validation Error',
        'Password must be at least 4 characters'
      );
      return;
    }

    // Aadhaar validation (only if provided)
    if (aadhaarNo.trim() && !validateAadhaar(aadhaarNo)) {
      Alert.alert(
        'Validation Error',
        'Please enter a valid 12-digit Aadhaar number'
      );
      return;
    }

    if (!salary.trim()) {
      Alert.alert('Validation Error', 'Please enter employee salary');
      return;
    }

    setIsSubmitting(true);

    try {
      const cleanedAadhaar = aadhaarNo.trim() ? aadhaarNo.replace(/\s/g, '') : '';
      
      console.log('🧪 Submitting employee with data:', {
        name: name.trim(),
        role,
        aadhaarNo: cleanedAadhaar,
        phone: phone.trim(),
        address: address.trim(),
        hasLoginCredentials: isLoginRole,
      });

      const newEmployee: any = {
        name: name.trim(),
        role,
        phone: phone.trim() || '',
        address: address.trim() || 'No address',
        aadhaarNo: cleanedAadhaar,
        salary: parseInt(salary, 10) || 500,
        age: 25,
        faceImage: faceImage || '',
        faceEnrolled: faceEnrolled || false,
        fingerprintEnrolled: fingerprintEnrolled || false,
      };

      // Add login credentials for engineer, site-engineer, and supervisor
      if (isLoginRole) {
        newEmployee.username = username.trim().toLowerCase();
        newEmployee.password = password;
      }

      console.log('📋 Final employee object:', newEmployee);

      await addEmployee(newEmployee);
      
      console.log('✅ Employee added successfully');
      setShowSuccessPopup(true);
    } catch (error) {
      console.error('❌ Error adding employee:', error);
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
      case 'site-engineer':
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
          
          {/* USERNAME - FOR ENGINEER, SITE-ENGINEER, AND SUPERVISOR */}
          {isLoginRole && (
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Username *
              </ThemedText>

              <TextInput
                style={[styles.input, {
                  backgroundColor: theme.backgroundDefault,
                  borderColor: theme.border,
                  color: theme.text,
                }]}
                value={username}
                onChangeText={setUsername}
                placeholder="Enter username"
                autoCapitalize="none"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          )}

          {/* PASSWORD - FOR ENGINEER, SITE-ENGINEER, AND SUPERVISOR */}
          {isLoginRole && (
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Login Password *
              </ThemedText>

              <View
                style={[
                  styles.passwordContainer,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.passwordInput, { flex: 1, color: theme.text }]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter login password"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry={!showPassword}
                />

                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                >
                  <Feather
                    name={showPassword ? 'eye-off' : 'eye'}
                    size={18}
                    color={theme.textSecondary}
                  />
                </Pressable>
              </View>
            </View>
          )}

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

          {/* AADHAAR NUMBER FIELD */}
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Aadhaar Number</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs, fontSize: 12 }}>
              12-digit unique identification number
            </ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={aadhaarNo}
              onChangeText={handleAadhaarChange}
              placeholder="123456789012"
              keyboardType="numeric"
              maxLength={12}
              placeholderTextColor={theme.textSecondary}
            />
            {aadhaarNo && !validateAadhaar(aadhaarNo) && (
              <ThemedText type="small" style={{ color: Colors.light.error, marginTop: Spacing.xs }}>
                Please enter a valid 12-digit Aadhaar number
              </ThemedText>
            )}
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

          {/* Login Role Permissions Info */}
          {isLoginRole && (
            <View style={styles.infoBox}>
              <Feather name="shield" size={16} color={Colors.light.primary} />
              <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs, flex: 1 }}>
                {role === 'site-engineer' 
                  ? 'Site Engineer will have permission to manage sites, approve work, and access reports.'
                  : role === 'engineer'
                  ? 'Engineer will have access to technical features and reports.'
                  : 'Supervisor will have permission to oversee daily operations and worker coordination.'
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
              {`${getRoleDisplayName(role)} "${name}" added successfully!`}
            </ThemedText>
            
            {aadhaarNo && (
              <ThemedText
                style={{
                  marginVertical: 10,
                  textAlign: 'center',
                  color: theme.textSecondary,
                  fontSize: 12,
                }}
              >
                Aadhaar: {aadhaarNo}
              </ThemedText>
            )}

            {isLoginRole && (
              <ThemedText
                style={{
                  marginVertical: 10,
                  textAlign: 'center',
                  color: theme.textSecondary,
                  fontStyle: 'italic',
                }}
              >
                {role === 'site-engineer'
                  ? 'Site Engineer can now manage sites, approve work, and access reports.'
                  : role === 'engineer'
                  ? 'Engineer can now access technical features and reports.'
                  : 'Supervisor can now oversee daily operations and worker coordination.'}
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