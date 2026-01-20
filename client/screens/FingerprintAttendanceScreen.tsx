import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Alert, Platform, Pressable, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { Employee } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';

const DEVICE_EMPLOYEE_KEY = '@construction_erp_device_employee';

export default function FingerprintAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { employees, markAttendance } = useData();

  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [hasHardware, setHasHardware] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [linkedEmployee, setLinkedEmployee] = useState<Employee | null>(null);
  const [isLoadingLinked, setIsLoadingLinked] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [attendanceMarked, setAttendanceMarked] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const enrolledEmployees = employees.filter(e => e.fingerprintEnrolled);

  const pulseScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  useEffect(() => {
    checkBiometricCapabilities();
    loadLinkedEmployee();
  }, []);

  useEffect(() => {
    if (!isAuthenticating && hasHardware && isEnrolled && !attendanceMarked) {
      pulseScale.value = withRepeat(
        withTiming(1.05, { duration: 1000 }),
        -1,
        true
      );
    } else {
      pulseScale.value = withSpring(1);
    }
  }, [isAuthenticating, hasHardware, isEnrolled, attendanceMarked]);

  const loadLinkedEmployee = async () => {
    try {
      const storedId = await AsyncStorage.getItem(DEVICE_EMPLOYEE_KEY);
      if (storedId) {
        const employee = employees.find(e => e.id === storedId);
        if (employee && employee.fingerprintEnrolled) {
          setLinkedEmployee(employee);
        } else {
          await AsyncStorage.removeItem(DEVICE_EMPLOYEE_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading linked employee:', error);
    } finally {
      setIsLoadingLinked(false);
    }
  };

  // Prevent repeated reload loops by guarding with a ref
  const reloadGuardRef = useRef(false);
  useEffect(() => {
    if (!isLoadingLinked && !reloadGuardRef.current) {
      reloadGuardRef.current = true;
      loadLinkedEmployee();
    }
  }, [isLoadingLinked]);

  const checkBiometricCapabilities = async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setHasHardware(compatible);

      if (compatible) {
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setIsEnrolled(enrolled);
      }
    } catch (error) {
      console.error('Error checking biometric capabilities:', error);
    }
  };

  const handleScanFingerprint = async () => {
    if (!hasHardware || !isEnrolled) {
      Alert.alert(
        'Fingerprint Not Available',
        'Please ensure fingerprint authentication is set up on your device.'
      );
      return;
    }

    setIsAuthenticating(true);

    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: linkedEmployee 
          ? `Verify fingerprint for ${linkedEmployee.name}` 
          : 'Scan fingerprint to set up attendance',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
        fallbackLabel: 'Use Passcode',
      });

      if (result.success) {
        if (linkedEmployee) {
          await markAttendance(linkedEmployee.id, today, 'present');
          setAttendanceMarked(true);
          Alert.alert(
            'Attendance Marked',
            `${linkedEmployee.name} marked present for today.`,
            [{ text: 'OK', onPress: () => setAttendanceMarked(false) }]
          );
        } else {
          setShowSetupModal(true);
        }
      } else if (result.error !== 'user_cancel') {
        Alert.alert('Authentication Failed', 'Please try again.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to authenticate. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLinkEmployee = async (employee: Employee) => {
    try {
      await AsyncStorage.setItem(DEVICE_EMPLOYEE_KEY, employee.id);
      setLinkedEmployee(employee);
      setShowSetupModal(false);
      
      await markAttendance(employee.id, today, 'present');
      setAttendanceMarked(true);
      
      Alert.alert(
        'Setup Complete',
        `This device is now linked to ${employee.name}. Future scans will automatically mark attendance.`,
        [{ text: 'OK', onPress: () => setAttendanceMarked(false) }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to link employee to device.');
    }
  };

  const handleUnlinkEmployee = () => {
    Alert.alert(
      'Unlink Device',
      `Remove ${linkedEmployee?.name} from this device? You will need to set up again.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlink',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.removeItem(DEVICE_EMPLOYEE_KEY);
            setLinkedEmployee(null);
          },
        },
      ]
    );
  };

  const handleCancelSetup = () => {
    setShowSetupModal(false);
  };

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
            Fingerprint attendance requires Expo Go app on your mobile device.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (isLoadingLinked) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText type="body" style={{ color: theme.textSecondary }}>Loading...</ThemedText>
      </ThemedView>
    );
  }

  if (!hasHardware) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={styles.permissionContent}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.light.error + '15' }]}>
            <Feather name="alert-circle" size={48} color={Colors.light.error} />
          </View>
          <ThemedText type="h4" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            Fingerprint Not Supported
          </ThemedText>
          <ThemedText type="body" style={{ textAlign: 'center', color: theme.textSecondary, marginTop: Spacing.sm }}>
            This device does not have fingerprint hardware.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!isEnrolled) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={styles.permissionContent}>
          <View style={[styles.iconContainer, { backgroundColor: Colors.light.warning + '15' }]}>
            <Feather name="alert-triangle" size={48} color={Colors.light.warning} />
          </View>
          <ThemedText type="h4" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            No Fingerprints Enrolled
          </ThemedText>
          <ThemedText type="body" style={{ textAlign: 'center', color: theme.textSecondary, marginTop: Spacing.sm }}>
            Please register at least one fingerprint in your device settings.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (enrolledEmployees.length === 0) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <View style={styles.permissionContent}>
          <View style={[styles.iconContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <Feather name="users" size={48} color={theme.textSecondary} />
          </View>
          <ThemedText type="h4" style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            No Employees Enrolled
          </ThemedText>
          <ThemedText type="body" style={{ textAlign: 'center', color: theme.textSecondary, marginTop: Spacing.sm }}>
            Please enroll employee fingerprints first from the Add Employee screen.
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, styles.centered]}>
      <View style={styles.scanContent}>
        {linkedEmployee ? (
          <View style={styles.linkedHeader}>
            <View style={[styles.linkedAvatar, { backgroundColor: Colors.light.success + '20' }]}>
              <ThemedText type="h2" style={{ color: Colors.light.success }}>
                {linkedEmployee.name.charAt(0)}
              </ThemedText>
            </View>
            <ThemedText type="h4" style={{ textAlign: 'center', marginTop: Spacing.md }}>
              {linkedEmployee.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'capitalize' }}>
              {linkedEmployee.role}
            </ThemedText>
            <Pressable onPress={handleUnlinkEmployee} style={styles.unlinkBtn}>
              <Feather name="link-2" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                Change Employee
              </ThemedText>
            </Pressable>
          </View>
        ) : (
          <>
            <ThemedText type="h3" style={{ textAlign: 'center', marginBottom: Spacing.sm }}>
              Setup Device
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginBottom: Spacing.lg }}>
              Scan fingerprint to link your identity to this device
            </ThemedText>
          </>
        )}

        <Pressable onPress={handleScanFingerprint} disabled={isAuthenticating}>
          <Animated.View
            style={[
              styles.fingerprintButton,
              { 
                backgroundColor: attendanceMarked 
                  ? Colors.light.success + '15' 
                  : isAuthenticating 
                    ? Colors.light.primary + '30' 
                    : Colors.light.primary + '15' 
              },
              animatedStyle
            ]}
          >
            <View style={[
              styles.fingerprintInner, 
              { 
                backgroundColor: attendanceMarked 
                  ? Colors.light.success + '25' 
                  : isAuthenticating 
                    ? Colors.light.primary + '50' 
                    : Colors.light.primary + '25' 
              }
            ]}>
              <Feather 
                name={attendanceMarked ? "check" : "unlock"} 
                size={64} 
                color={attendanceMarked ? Colors.light.success : Colors.light.primary} 
              />
            </View>
          </Animated.View>
        </Pressable>

        <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xl }}>
          {isAuthenticating 
            ? 'Scanning...' 
            : attendanceMarked 
              ? 'Attendance marked for today' 
              : linkedEmployee 
                ? 'Tap to mark attendance' 
                : 'Tap to setup'}
        </ThemedText>

        {linkedEmployee ? (
          <View style={[styles.autoModeTag, { backgroundColor: Colors.light.success + '15' }]}>
            <Feather name="zap" size={14} color={Colors.light.success} />
            <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: Spacing.xs, fontWeight: '600' }}>
              Auto Mode Active
            </ThemedText>
          </View>
        ) : (
          <View style={styles.enrolledInfo}>
            <Feather name="users" size={16} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
              {enrolledEmployees.length} employees available
            </ThemedText>
          </View>
        )}
      </View>

      <Modal
        visible={showSetupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCancelSetup}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.successIcon, { backgroundColor: Colors.light.primary + '15' }]}>
                <Feather name="link" size={32} color={Colors.light.primary} />
              </View>
              <ThemedText type="h4" style={{ marginTop: Spacing.md }}>
                Link Your Identity
              </ThemedText>
              <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
                Select yourself to link this device. Future scans will auto-mark attendance.
              </ThemedText>
            </View>

            <ScrollView style={styles.employeeList} showsVerticalScrollIndicator={false}>
              {enrolledEmployees.map((employee) => (
                <Pressable
                  key={employee.id}
                  onPress={() => handleLinkEmployee(employee)}
                  style={[styles.employeeItem, { backgroundColor: theme.backgroundSecondary }]}
                >
                  <View style={[styles.avatar, { backgroundColor: Colors.light.primary + '15' }]}>
                    <ThemedText type="h4" style={{ color: Colors.light.primary }}>
                      {employee.name.charAt(0)}
                    </ThemedText>
                  </View>
                  <View style={styles.employeeInfo}>
                    <ThemedText type="body" style={{ fontWeight: '600' }}>{employee.name}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'capitalize' }}>
                      {employee.role}
                    </ThemedText>
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={handleCancelSetup}
              style={[styles.cancelButton, { borderColor: theme.border }]}
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
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
  scanContent: {
    alignItems: 'center',
    paddingHorizontal: Spacing['2xl'],
  },
  linkedHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  linkedAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unlinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  fingerprintButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fingerprintInner: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  enrolledInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  autoModeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing['2xl'],
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
    maxHeight: '80%',
  },
  modalHeader: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeList: {
    paddingHorizontal: Spacing.lg,
    maxHeight: 300,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  cancelButton: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
});
