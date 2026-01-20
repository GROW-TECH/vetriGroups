import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  onPress: () => void;
}

function MenuItem({ icon, title, subtitle, onPress }: MenuItemProps) {
  const { theme } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.menuItem,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 }
      ]}
    >
      <View style={[styles.menuIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Feather name={icon} size={24} color={theme.text} />
      </View>
      <View style={styles.menuContent}>
        <ThemedText type="body" style={{ fontWeight: '600' }}>{title}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary }}>{subtitle}</ThemedText>
      </View>
      <Feather name="chevron-right" size={20} color={theme.textSecondary} />
    </Pressable>
  );
}

export default function AttendanceMenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
const { user } = useAuth();

  const menuItems =
  user?.role === 'site-engineer'
    ? [
        {
          icon: 'edit-3' as const,
          title: 'Manual Entry',
          subtitle: 'Mark attendance manually',
          screen: 'ManualAttendance' as const,
        },
        {
          icon: 'grid' as const,
          title: 'View Attendance',
          subtitle: 'See attendance records',
          screen: 'AttendanceSheet' as const,
        },
      ]
    : [
        {
          icon: 'user-plus' as const,
          title: 'Add User',
          subtitle: 'Register new employee',
          screen: 'AddEmployee' as const,
        },
        {
          icon: 'edit-3' as const,
          title: 'Manual Entry',
          subtitle: 'Mark attendance manually',
          screen: 'ManualAttendance' as const,
        },
        {
          icon: 'camera' as const,
          title: 'Face Scan',
          subtitle: 'Capture face for attendance',
          screen: 'FaceScan' as const,
        },
        {
          icon: 'unlock' as const,
          title: 'Fingerprint',
          subtitle: 'Use fingerprint for attendance',
          screen: 'FingerprintAttendance' as const,
        },
        {
          icon: 'grid' as const,
          title: 'View Attendance',
          subtitle: 'See attendance records',
          screen: 'AttendanceSheet' as const,
        },
        {
          icon: 'users' as const,
          title: 'Employees List',
          subtitle: 'View all employees',
          screen: 'EmployeeList' as const,
        },
      ];


  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.xl, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item, index) => (
          <React.Fragment key={item.screen}>
            <MenuItem
              icon={item.icon}
              title={item.title}
              subtitle={item.subtitle}
              onPress={() => navigation.navigate(item.screen)}
            />
            {index < menuItems.length - 1 ? (
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
            ) : null}
          </React.Fragment>
        ))}
      </ScrollView>
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
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  menuIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.lg,
  },
});
