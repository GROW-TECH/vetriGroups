import React, { useState, useRef } from 'react';
import { View, StyleSheet, Alert, Platform, Pressable, Modal, ScrollView, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { Employee } from '@/types';

import * as Sharing from 'expo-sharing';
import { TextInput } from 'react-native';
import { uploadPhotoAndCreateDoc } from '@/lib/photos';
import { useAuth } from '@/context/AuthContext';
import { Linking } from 'react-native';

export default function FaceScanScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { employees, markAttendance, attendance } = useData();
  const cameraRef = useRef<CameraView>(null);
  const { user } = useAuth();

  const [permission, requestPermission] = useCameraPermissions();
  const [isScanning, setIsScanning] = useState(false);
  const [showEmployeeSelector, setShowEmployeeSelector] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [scannedEmployee, setScannedEmployee] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerPhoneInput, setOwnerPhoneInput] = useState('');
  const [autoDetectedEmployee, setAutoDetectedEmployee] = useState<Employee | null>(null);

  // current date in YYYY-MM-DD used for attendance records
  const today = new Date().toISOString().split('T')[0];

  // Treat employees with either faceEnrolled flag or an existing faceImage as enrolled
  const enrolledEmployees = employees.filter(e => e.faceEnrolled || !!e.faceImage);

  const isAlreadyMarked = (employeeId: string) => {
    return attendance.some(a => a.employeeId === employeeId && a.date === today);
  };

  // Simple identification stub: if exactly one enrolled employee is not marked today,
  // auto select that employee. This is a safe fallback until face recognition is added.
  const identifyBestMatch = async (_photoUri: string): Promise<Employee | null> => {
    try {
      const candidates = enrolledEmployees.filter(e => !isAlreadyMarked(e.id));
      if (candidates.length === 1) {
        return candidates[0];
      }
      return null;
    } catch {
      return null;
    }
  };

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    if (enrolledEmployees.length === 0) {
      Alert.alert(
        'No Enrolled Employees',
        'Please enroll employee faces first from the Add Employee screen.'
      );
      return;
    }

    setIsScanning(true);
    try {
      const photo = await cameraRef.current.takePictureAsync();
      
      if (photo?.uri) {
        setCapturedPhoto(photo.uri);
        // Try auto-identification when there is a single eligible candidate
        const best = await identifyBestMatch(photo.uri);
        if (best) {
          setAutoDetectedEmployee(best);
          await handleSelectEmployee(best);
        } else {
          setAutoDetectedEmployee(null);
          setShowEmployeeSelector(true);
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture face. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleSelectEmployee = async (employee: Employee) => {
    if (isAlreadyMarked(employee.id)) {
      setShowEmployeeSelector(false);
      setCapturedPhoto(null);
      Alert.alert(
        'Already Marked',
        `${employee.name} has already been marked present today.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setShowEmployeeSelector(false);
    setScannedEmployee(employee.name);
    await markAttendance(employee.id, today, 'present');
    
    Alert.alert(
      'Attendance Marked',
      `${employee.name} has been marked present for today.`,
      [{ text: 'OK', onPress: () => {
        setScannedEmployee(null);
        setCapturedPhoto(null);
      }}]
    );
  };

  const cancelSelection = () => {
    setShowEmployeeSelector(false);
    setCapturedPhoto(null);
    setAutoDetectedEmployee(null);
  };

  if (!permission) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText>Loading camera...</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={styles.permissionContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="camera-off" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h4" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            Camera Permission Required
          </ThemedText>
          <ThemedText type="body" style={{ textAlign: 'center', color: theme.textSecondary, marginTop: Spacing.sm }}>
            We need camera access to scan faces for attendance tracking.
          </ThemedText>
          <Button onPress={requestPermission} style={{ marginTop: Spacing.xl }}>
            Grant Permission
          </Button>
        </View>
      </ThemedView>
    );
  }

  if (Platform.OS === 'web') {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={styles.permissionContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="smartphone" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h4" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            Run in Expo Go
          </ThemedText>
          <ThemedText type="body" style={{ textAlign: 'center', color: theme.textSecondary, marginTop: Spacing.sm }}>
            Face scan feature requires Expo Go app on your mobile device.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
      />
      <View style={[styles.overlay, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF">
            Position face and capture
          </ThemedText>
        </View>

        <View style={styles.frameContainer}>
          <View style={styles.frame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
        </View>

        <View style={styles.controls}>
          {scannedEmployee ? (
            <View style={styles.resultBadge}>
              <Feather name="check-circle" size={20} color={Colors.light.success} />
              <ThemedText type="body" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ marginLeft: Spacing.sm }}>
                {scannedEmployee}
              </ThemedText>
            </View>
          ) : null}

          {autoDetectedEmployee ? (
            <View style={styles.resultBadge}>
              <Feather name="zap" size={20} color={Colors.light.success} />
              <ThemedText type="small" lightColor="#FFFFFF" darkColor="#FFFFFF" style={{ marginLeft: Spacing.sm }}>
                Auto-detected {autoDetectedEmployee.name}
              </ThemedText>
            </View>
          ) : null}

          <Pressable
            onPress={handleCapture}
            disabled={isScanning}
            style={[styles.captureButton, isScanning && { opacity: 0.5 }]}
          >
            <View style={styles.captureButtonInner}>
              {isScanning ? (
                <ThemedText type="small" lightColor="#FFFFFF">Scanning...</ThemedText>
              ) : (
                <Feather name="camera" size={28} color="#FFFFFF" />
              )}
            </View>
          </Pressable>

          <ThemedText type="small" lightColor="#FFFFFF" style={{ opacity: 0.7, textAlign: 'center', marginTop: Spacing.sm }}>
            Tap to capture; auto-selects if one match
          </ThemedText>
        </View>
      </View>

      <Modal
        visible={showEmployeeSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={cancelSelection}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.selectorModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Select Employee</ThemedText>
              <Pressable onPress={cancelSelection} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {capturedPhoto ? (
              <View style={styles.capturedPhotoContainer}>
                <Image source={{ uri: capturedPhoto }} style={styles.capturedPhoto} />

                <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.md, marginTop: Spacing.md }}>
                  <Button onPress={async () => {
                    // Upload and open WhatsApp directly with prefilled message + photo URL
                    try {
                      setIsUploading(true);

                      const uploader = { name: user?.name || 'Unknown' };
                      const siteName = 'Unknown Site';
                      const siteId = null;

                      const url = await uploadPhotoAndCreateDoc({ uri: capturedPhoto, uploader, siteId: siteId || 'unknown', siteName: siteName || 'Unknown Site' });

                      const now = new Date();
                      const dateStr = now.toLocaleDateString('en-GB');
                      const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                      const message = `📸 Site Update\nSite: ${siteName}\nDate: ${dateStr}\nTime: ${timeStr}\nPosted by: ${uploader.name}\n\n${url}`;

                      // Try to open WhatsApp app directly
                      const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
                      const opened = await Linking.canOpenURL(waUrl);

                      if (opened) {
                        await Linking.openURL(waUrl);
                      } else {
                        // fallback to share sheet
                        const canShare = await Sharing.isAvailableAsync();
                        if (canShare) {
                          await Sharing.shareAsync(capturedPhoto, { dialogTitle: 'Share photo with your team' });
                        } else {
                          Alert.alert('Share Unavailable', 'Cannot open WhatsApp or share sheet on this device');
                        }
                      }
                    } catch (err) {
                      console.error('Share to WhatsApp failed', err);
                      Alert.alert('Share Failed', 'Could not share the photo to WhatsApp.');
                    } finally {
                      setIsUploading(false);
                    }
                  }} style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginRight: Spacing.sm }}>
                    <ThemedText type="body">Share to Team</ThemedText>
                  </Button>

                  <Button onPress={() => setShowOwnerModal(true)} style={{ paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm }}>
                    <ThemedText type="body">Send to Owner</ThemedText>
                  </Button>
                </View>

                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm, textAlign: 'center', paddingHorizontal: Spacing.lg }}>
                  Verify the captured face and select the matching employee to mark attendance
                </ThemedText>
              </View>
            ) : null}

            <ScrollView style={styles.employeeList} showsVerticalScrollIndicator={false}>
              {enrolledEmployees.map((employee) => {
                const alreadyMarked = isAlreadyMarked(employee.id);
                return (
                  <Pressable
                    key={employee.id}
                    onPress={() => handleSelectEmployee(employee)}
                    style={[
                      styles.employeeItem,
                      { backgroundColor: alreadyMarked ? theme.backgroundSecondary : theme.backgroundDefault },
                      alreadyMarked && { opacity: 0.6 }
                    ]}
                  >
                    {employee.faceImage ? (
                      <Image source={{ uri: employee.faceImage }} style={styles.employeePhoto} />
                    ) : (
                      <View style={[styles.employeePhoto, styles.placeholderPhoto, { backgroundColor: Colors.light.primary + '20' }]}>
                        <ThemedText type="h4" style={{ color: Colors.light.primary }}>
                          {employee.name.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                    )}
                    <View style={styles.employeeInfo}>
                      <ThemedText type="body" style={{ fontWeight: '600' }}>{employee.name}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'capitalize' }}>
                        {employee.role}
                      </ThemedText>
                    </View>
                    {alreadyMarked ? (
                      <View style={[styles.markedBadge, { backgroundColor: Colors.light.success + '20' }]}>
                        <Feather name="check" size={14} color={Colors.light.success} />
                        <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: 4 }}>
                          Present
                        </ThemedText>
                      </View>
                    ) : (
                      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                    )}
                  </Pressable>
                );
              })}

              {enrolledEmployees.length === 0 ? (
                <View style={styles.emptyState}>
                  <Feather name="users" size={40} color={theme.textSecondary} />
                  <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: 'center' }}>
                    No employees enrolled yet
                  </ThemedText>
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showOwnerModal} animationType="slide" transparent={true} onRequestClose={() => setShowOwnerModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.selectorModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Send Photo to Owner via WhatsApp</ThemedText>
              <Pressable onPress={() => setShowOwnerModal(false)} style={styles.closeBtn}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ThemedText type="small" style={{ marginTop: Spacing.md }}>Enter owner's phone number (international format, no +)</ThemedText>
            <TextInput
              value={ownerPhoneInput}
              onChangeText={setOwnerPhoneInput}
              placeholder="e.g., 919876543210"
              keyboardType="phone-pad"
              style={[styles.input, { marginTop: Spacing.md }]}
            />

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md }}>
              <Pressable onPress={() => setShowOwnerModal(false)} style={[styles.actionBtn, { marginRight: Spacing.md }]}>
                <ThemedText type="body">Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={async () => {
                const phone = ownerPhoneInput.trim();
                if (!phone) {
                  Alert.alert('Missing', 'Please enter owner phone number');
                  return;
                }

                try {
                  setIsUploading(true);
                  const uploader = { name: user?.name || 'Unknown' };
                  const now = new Date();
                  const dateStr = now.toLocaleDateString('en-GB');
                  const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

                  const url = await uploadPhotoAndCreateDoc({ uri: capturedPhoto!, uploader, siteId: 'unknown', siteName: 'Unknown Site' });

                  const message = `📸 Site Update\nSite: ${'Unknown Site'}\nDate: ${dateStr}\nTime: ${timeStr}\nPosted by: ${uploader.name}\n\n${url}`;
                  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

                  await Linking.openURL(waUrl);
                  Alert.alert('Done', 'Uploaded and opened WhatsApp chat.');
                  setShowOwnerModal(false);
                  setOwnerPhoneInput('');
                } catch (err) {
                  console.error('Owner share error:', err);
                  Alert.alert('Share Failed', 'Could not send to owner.');
                } finally {
                  setIsUploading(false);
                }
              }} style={styles.actionBtn}>
                <ThemedText type="body">Send</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  permissionContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  camera: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  header: {
    alignItems: 'center',
    paddingTop: Spacing['3xl'],
  },
  backButton: {
    position: 'absolute',
    top: Spacing.lg,
    left: Spacing.lg,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  frame: {
    width: 250,
    height: 300,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: '#FFFFFF',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  controls: {
    alignItems: 'center',
    paddingBottom: Spacing['3xl'],
    gap: Spacing.lg,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  selectorModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  closeBtn: {
    padding: Spacing.sm,
  },
  capturedPhotoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  capturedPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: Colors.light.primary,
  },
  employeeList: {
    maxHeight: 400,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  employeePhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderPhoto: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  markedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  input: {
    height: 44,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)'
  },
  actionBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
});
