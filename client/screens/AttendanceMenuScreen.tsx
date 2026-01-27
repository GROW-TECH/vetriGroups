import React from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '@/context/AuthContext';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface MenuItemProps {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  gradient: [string, string];
  onPress: () => void;
  index: number;
}

function MenuItem({ icon, title, subtitle, gradient, onPress, index }: MenuItemProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={styles.menuItemWrapper}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.menuItem,
          { opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.menuGradient}
        >
          <View style={styles.menuIconContainer}>
            <Feather name={icon} size={28} color="#fff" />
          </View>
          <View style={styles.menuContent}>
            <ThemedText
              type="body"
              style={styles.menuTitle}
              lightColor="#fff"
              darkColor="#fff"
            >
              {title}
            </ThemedText>
            <ThemedText
              type="small"
              style={styles.menuSubtitle}
              lightColor="rgba(255,255,255,0.85)"
              darkColor="rgba(255,255,255,0.85)"
            >
              {subtitle}
            </ThemedText>
          </View>
          <View style={styles.chevronContainer}>
            <Feather name="chevron-right" size={24} color="rgba(255,255,255,0.7)" />
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

export default function AttendanceMenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { isDark } = useTheme();
  const { user } = useAuth();

  const menuItems =
    user?.role === 'site-engineer'
      ? [
          {
            icon: 'edit-3' as const,
            title: 'Manual Entry',
            subtitle: 'Mark attendance manually',
            gradient: ['#10B981', '#059669'] as [string, string],
            screen: 'ManualAttendance' as const,
          },
          {
            icon: 'grid' as const,
            title: 'View Attendance',
            subtitle: 'See attendance records',
            gradient: ['#EC4899', '#DB2777'] as [string, string],
            screen: 'AttendanceSheet' as const,
          },
        ]
      : [
          {
            icon: 'user-plus' as const,
            title: 'Add User',
            subtitle: 'Register new employee',
            gradient: ['#8B5CF6', '#7C3AED'] as [string, string],
            screen: 'AddEmployee' as const,
          },
          {
            icon: 'edit-3' as const,
            title: 'Manual Entry',
            subtitle: 'Mark attendance manually',
            gradient: ['#10B981', '#059669'] as [string, string],
            screen: 'ManualAttendance' as const,
          },
          {
            icon: 'camera' as const,
            title: 'Face Scan',
            subtitle: 'Capture face for attendance',
            gradient: ['#F59E0B', '#D97706'] as [string, string],
            screen: 'FaceScan' as const,
          },
          {
            icon: 'unlock' as const,
            title: 'Fingerprint',
            subtitle: 'Use fingerprint for attendance',
            gradient: ['#3B82F6', '#2563EB'] as [string, string],
            screen: 'FingerprintAttendance' as const,
          },
        {
  icon: 'clock' as const,
  title: 'Attendance History',
  subtitle: 'Search & filter records with salary',
  gradient: ['#A78BFA', '#8B5CF6'] as [string, string],
  screen: 'AttendanceHistory' as const,  // <- CHANGED
},
          {
            icon: 'users' as const,
            title: 'Employees List',
            subtitle: 'View all employees',
            gradient: ['#06B6D4', '#0891B2'] as [string, string],
            screen: 'EmployeeList' as const,
          },
        ];

  return (
    <LinearGradient
      colors={isDark ? ['#111827', '#1F2937'] : ['#F8FAFC', '#E2E8F0']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item, index) => (
          <MenuItem
            key={item.screen}
            icon={item.icon}
            title={item.title}
            subtitle={item.subtitle}
            gradient={item.gradient}
            onPress={() => navigation.navigate(item.screen)}
            index={index}
          />
        ))}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  menuItemWrapper: {
    marginBottom: Spacing.md,
  },
  menuItem: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  menuGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    minHeight: 90,
  },
  menuIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuContent: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  chevronContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});