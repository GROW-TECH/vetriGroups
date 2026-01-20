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
import { EmployeeRole } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { EmployeesService } from '@/firebaseServices/employeesService';
import { uploadEmployeeProfilePhoto } from '@/lib/photos';

// Define all employee roles including site_engineer
const ALL_EMPLOYEE_ROLES: EmployeeRole[] = [
  'labor',
  'mason',
  'engineer',
  'site_engineer',
  'supervisor'
];

// Role labels
const ROLE_LABELS: Record<EmployeeRole, string> = {
  'labor': 'Labor',
  'mason': 'Mason',
  'engineer': 'Engineer',
  'site_engineer': 'Site Engineer',
  'supervisor': 'Supervisor'
};

export default function AddEmployeeScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();

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
  const [uploadProgress, setUploadProgress] = useState(0);

  const isSiteEngineer = role === 'site_engineer';

  const handleTakePhoto = async () => {
    console.log('📸 Taking photo...');
    
    if (Platform.OS === 'web') {
      // Web: Use file input
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      
      input.onchange = async (event: any) => {
        const file = event.target.files?.[0];
        if (file) {
          const imageUrl = URL.createObjectURL(file);
          setFaceImage(imageUrl);
          console.log('🌐 Web image selected:', imageUrl);
        }
      };
      
      input.click();
      return;
    }

    // Mobile: Request camera permission
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setFaceImage(result.assets[0].uri);
      console.log('📱 Mobile image captured:', result.assets[0].uri);
    }
  };

  const handleEnrollFace = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Web Limitation', 'Face enrollment requires a mobile device with camera access.');
      return;
    }

    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera permission is needed');
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
      Alert.alert('Face Enrolled', 'Face data captured successfully');
    }
  };

  const handleEnrollFingerprint = async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Web Limitation', 'Fingerprint enrollment requires a mobile device.');
      return;
    }

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) {
      Alert.alert('Not Supported', 'Device does not support fingerprint');
      return;
    }

    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    if (!isEnrolled) {
      Alert.alert('No Fingerprint', 'Please setup fingerprint in device settings');
      return;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enroll fingerprint',
      fallbackLabel: 'Use passcode',
    });

    if (result.success) {
      setFingerprintEnrolled(true);
      Alert.alert('Fingerprint Enrolled', 'Fingerprint enrolled successfully');
    } else {
      Alert.alert('Enrollment Failed', 'Fingerprint enrollment failed');
    }
  };

  const handleSubmit = async () => {
    try {
      // Validate inputs
      if (!name.trim()) {
        Alert.alert('Error', 'Please enter employee name');
        return;
      }

      if (!email.trim()) {
        Alert.alert('Error', 'Please enter email address');
        return;
      }

      if (!salary.trim() || parseFloat(salary) <= 0) {
        Alert.alert('Error', 'Please enter valid salary');
        return;
      }

      setIsSubmitting(true);
      setUploadProgress(10);

      console.log('🚀 Starting employee creation process...');
      console.log('📋 Employee data:', { name, email, role, salary });

      // Step 1: Convert salary to number
      const salaryNumber = parseFloat(salary);
      console.log('💰 Salary converted:', salaryNumber);

      let profileImageUrl: string | null = null;
      
      // Step 2: Upload image if exists
      if (faceImage) {
        try {
          console.log('🖼️ Starting image upload...');
          setUploadProgress(30);
          
          // Create temporary ID for upload
          const tempId = 'temp_' + Date.now();
          profileImageUrl = await uploadEmployeeProfilePhoto(faceImage, tempId);
          
          setUploadProgress(70);
          console.log('✅ Image uploaded:', profileImageUrl);
        } catch (uploadError: any) {
          console.error('❌ Image upload failed:', uploadError);
          
          const userChoice = await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Image Upload Failed',
              'Continue without profile image?',
              [
                { text: 'Cancel', onPress: () => resolve(false), style: 'cancel' },
                { text: 'Continue', onPress: () => resolve(true) }
              ]
            );
          });
          
          if (!userChoice) {
            setIsSubmitting(false);
            setUploadProgress(0);
            return;
          }
        }
      }

      // Step 3: Prepare employee data
      const employeeData = {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        role,
        salary: salaryNumber,
        profileImage: profileImageUrl,
        faceImage: profileImageUrl,
        faceEnrolled,
        fingerprintEnrolled,
      };

      console.log('📦 Final employee data:', employeeData);
      setUploadProgress(90);

      // Step 4: Add to Firebase
      const employeeId = await EmployeesService.add(employeeData);
      console.log('✅ Employee created with ID:', employeeId);

      // Step 5: If we uploaded with temp ID, update with actual ID
      if (profileImageUrl && profileImageUrl.includes('temp_')) {
        try {
          console.log('🔄 Re-uploading image with actual employee ID...');
          const finalImageUrl = await uploadEmployeeProfilePhoto(faceImage!, employeeId);
          await EmployeesService.update(employeeId, {
            profileImage: finalImageUrl,
            faceImage: finalImageUrl,
          });
          console.log('✅ Image updated with actual ID');
        } catch (updateError) {
          console.warn('⚠️ Could not update image URL:', updateError);
        }
      }

      setUploadProgress(100);

      // Success
      Alert.alert(
        'Success 🎉',
        `Employee "${name}" added successfully!\n\nRole: ${ROLE_LABELS[role]}\nSalary: ₹${salaryNumber}/day${profileImageUrl ? '\nProfile image uploaded' : ''}`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );

      // Reset form
      setName('');
      setEmail('');
      setPhone('');
      setAddress('');
      setRole('labor');
      setSalary('');
      setFaceImage(undefined);
      setFaceEnrolled(false);
      setFingerprintEnrolled(false);

    } catch (error: any) {
      console.error('❌ Error creating employee:', error);
      Alert.alert(
        'Error ❌',
        `Failed to add employee: ${error.message || 'Unknown error'}\n\nPlease check your connection and try again.`
      );
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
    }
  };

  const getRoleDescription = (role: EmployeeRole) => {
    switch (role) {
      case 'site_engineer': return 'Manages sites, approves work, monitors progress';
      case 'engineer': return 'Technical planning, design, supervision';
      case 'supervisor': return 'Oversees daily operations, coordinates workers';
      case 'mason': return 'Skilled in brickwork, concrete, masonry';
      case 'labor': return 'General construction work, site maintenance';
      default: return '';
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Bar */}
        {isSubmitting && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
            <ThemedText type="small" style={styles.progressText}>
              {uploadProgress < 100 ? 'Processing...' : 'Complete!'}
            </ThemedText>
          </View>
        )}

        {/* Profile Image Section */}
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
            {faceImage ? 'Tap to change photo' : 'Tap to add profile photo'}
          </ThemedText>
          {faceImage && (
            <ThemedText type="small" style={{ color: Colors.light.success, marginTop: 4 }}>
              ✓ Photo ready for upload
            </ThemedText>
          )}
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Full Name *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter full name"
              placeholderTextColor={theme.textSecondary}
              editable={!isSubmitting}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Email Address *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={email}
              onChangeText={setEmail}
              placeholder="employee@company.com"
              placeholderTextColor={theme.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Phone Number</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={phone}
              onChangeText={setPhone}
              placeholder="+91 9876543210"
              placeholderTextColor={theme.textSecondary}
              keyboardType="phone-pad"
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Address</ThemedText>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={address}
              onChangeText={setAddress}
              placeholder="Complete address"
              placeholderTextColor={theme.textSecondary}
              multiline
              numberOfLines={2}
              editable={!isSubmitting}
            />
          </View>

          <View style={styles.inputGroup}>
            <ThemedText type="small" style={styles.label}>Role *</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              {getRoleDescription(role)}
            </ThemedText>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleButtonsContainer}>
              {ALL_EMPLOYEE_ROLES.map((r) => (
                <Pressable
                  key={r}
                  onPress={() => setRole(r)}
                  disabled={isSubmitting}
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
            <ThemedText type="small" style={styles.label}>Daily Salary (₹) *</ThemedText>
            <TextInput
              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
              value={salary}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9.]/g, '');
                const parts = cleaned.split('.');
                if (parts.length <= 2) setSalary(cleaned);
              }}
              placeholder="e.g., 500"
              placeholderTextColor={theme.textSecondary}
              keyboardType="numeric"
              editable={!isSubmitting}
            />
          </View>

          {/* Role-specific info */}
          {(role === 'engineer' || role === 'site_engineer') && (
            <View style={styles.infoBox}>
              <Feather name="shield" size={16} color={Colors.light.primary} />
              <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs, flex: 1 }}>
                {isSiteEngineer 
                  ? 'Site Engineer: Can manage sites, approve work, access reports'
                  : 'Engineer: Access to technical features and reports'
                }
              </ThemedText>
            </View>
          )}

          {/* Biometric Enrollment */}
          <View style={styles.inputGroup}>
            <View style={styles.sectionHeader}>
              <Feather name="user-check" size={20} color={Colors.light.primary} />
              <ThemedText type="h4" style={{ marginLeft: Spacing.sm, color: Colors.light.primary }}>
                Biometric Enrollment
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.sm }}>
              Optional: Enroll for attendance verification
            </ThemedText>
            <View style={styles.biometricButtons}>
              <Pressable
                onPress={handleEnrollFace}
                disabled={isSubmitting || Platform.OS === 'web'}
                style={[
                  styles.biometricButton,
                  { borderColor: faceEnrolled ? Colors.light.success : theme.border },
                  faceEnrolled && { backgroundColor: Colors.light.success + '15' },
                  Platform.OS === 'web' && { opacity: 0.5 }
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
                {faceEnrolled && (
                  <Feather name="check-circle" size={16} color={Colors.light.success} style={{ marginTop: Spacing.xs }} />
                )}
                {Platform.OS === 'web' && (
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                    (Mobile only)
                  </ThemedText>
                )}
              </Pressable>

              <Pressable
                onPress={handleEnrollFingerprint}
                disabled={isSubmitting || Platform.OS === 'web'}
                style={[
                  styles.biometricButton,
                  { borderColor: fingerprintEnrolled ? Colors.light.success : theme.border },
                  fingerprintEnrolled && { backgroundColor: Colors.light.success + '15' },
                  Platform.OS === 'web' && { opacity: 0.5 }
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
                {fingerprintEnrolled && (
                  <Feather name="check-circle" size={16} color={Colors.light.success} style={{ marginTop: Spacing.xs }} />
                )}
                {Platform.OS === 'web' && (
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10, marginTop: 2 }}>
                    (Mobile only)
                  </ThemedText>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <Button 
          onPress={handleSubmit} 
          disabled={isSubmitting || !name.trim() || !email.trim() || !salary.trim()}
          style={styles.submitButton}
        >
          {isSubmitting ? 'Adding Employee...' : 'Add Employee'}
        </Button>

        {/* Debug Info (Remove in production) */}
        {__DEV__ && (
          <View style={styles.debugSection}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Debug: {faceImage ? 'Image set' : 'No image'} | Platform: {Platform.OS}
            </ThemedText>
          </View>
        )}
      </KeyboardAwareScrollViewCompat>
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
  progressContainer: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 2,
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: Colors.light.primary,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 4,
    color: Colors.light.primary,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
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
    borderRadius: 60,
  },
  form: {
    gap: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontWeight: '600',
    marginLeft: Spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
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
  submitButton: {
    marginTop: Spacing.xl,
  },
  debugSection: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: BorderRadius.sm,
  },
});