import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from 'react-native-reanimated';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { DASHBOARD_CARDS, UserRole, Client } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';

// Create an extended type that includes SubContractorList
type ExtendedRootStackParamList = {
  Login: undefined;
  Dashboard: undefined;
  AttendanceMenu: undefined;
  AddEmployee: undefined;
  ManualAttendance: undefined;
  FaceScan: undefined;
  FingerprintAttendance: undefined;
  AttendanceSheet: undefined;
  EmployeeList: undefined;
  ClientList: undefined;
  ClientDetail: { clientId: string };
  MaterialInventory: undefined;
  VendorList: undefined;
  VendorDetail: { vendorId: string };
  Photo: undefined;
  SimpleTest: undefined;
  SubContractorList: undefined; // Add this
  SubContractorDetail: { subContractorId: string };
};

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DashboardNavProp = NativeStackNavigationProp<ExtendedRootStackParamList>;

const cardIcons: Record<string, keyof typeof Feather.glyphMap> = {
  'Attendance': 'user-check',
  'Material': 'layers',
  'Client': 'home',
  'Vendor': 'truck',
  'Sub Contractor': 'tool',
  'Photo': 'image',
  'Look Ahead': 'trending-up',
  'App Integration': 'share-2',
  'Management': 'sliders',
  'Plan': 'layout',
  'Agreement': 'file-text',
  'Payment': 'dollar-sign',
  'Appointment': 'calendar',
};

const cardColors: Record<string, string> = {
  'Attendance': '#F59E0B',
  'Material': '#10B981',
  'Client': '#3B82F6',
  'Vendor': '#EF4444',
  'Sub Contractor': '#8B5CF6',
  'Photo': '#EC4899',
  'Look Ahead': '#06B6D4',
  'App Integration': '#6366F1',
  'Management': '#64748B',
  'Plan': '#3B82F6',
  'Agreement': '#10B981',
  'Payment': '#F59E0B',
  'Appointment': '#8B5CF6',
};

interface DashboardCardProps {
  title: string;
  onPress: () => void;
}

function DashboardCard({ title, onPress }: DashboardCardProps) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const icon = cardIcons[title] || 'grid';
  const color = cardColors[title] || Colors.light.primary;

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => { scale.value = withSpring(0.97, springConfig); }}
      onPressOut={() => { scale.value = withSpring(1, springConfig); }}
      style={[
        styles.card,
        { backgroundColor: theme.backgroundDefault },
        Shadows.sm,
        animatedStyle,
      ]}
    >
      <View style={[styles.cardIcon, { backgroundColor: color + '20' }]}>
        <Feather name={icon} size={20} color={color} />
      </View>
      <ThemedText type="small" style={styles.cardTitle}>
        {title}
      </ThemedText>
    </AnimatedPressable>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<DashboardNavProp>();
  const { user } = useAuth();
  const { theme } = useTheme();

  const [clientData, setClientData] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);

  const cards = user ? DASHBOARD_CARDS[user.role] : [];

  // Fetch client data and navigate to ClientDetail for client users
  useEffect(() => {
    if (user?.role === 'client' && user?.name) {
      fetchClientDataAndNavigate(user.name);
    }
  }, [user]);

  const fetchClientDataAndNavigate = async (username: string) => {
    setLoading(true);
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const clientId = querySnapshot.docs[0].id;
        // Navigate to ClientDetail screen immediately
        navigation.replace('ClientDetail', { clientId });
      } else {
        Alert.alert('Error', 'No project found for your account');
      }
    } catch (error: any) {
      console.error('Error fetching client data:', error);
      Alert.alert('Error', 'Failed to load your project details');
    } finally {
      setLoading(false);
    }
  };

  const handleCardPress = (card: string) => {
    switch (card) {
      case 'Attendance':
        navigation.navigate('AttendanceMenu');
        break;
      case 'Client':
        navigation.navigate('ClientList');
        break;
      case 'Photo':
        navigation.navigate('Photo');
        break;
      case 'Material':
        navigation.navigate('MaterialInventory');
        break;
      case 'Vendor':
        navigation.navigate('VendorList');
        break;
      
      // Now this will work properly
      case 'Sub Contractor':
        navigation.navigate('SubContractorList');
        break;
      
      case 'Plan':
      case 'Agreement':
      case 'Payment':
      case 'Appointment':
        navigation.navigate('ClientList');
        break;
      default:
        Alert.alert('Coming Soon', `${card} module is under development.`);
    }
  };

  // Fixed: Added site_engineer to the colors object
  const getRoleBadgeColor = (role: UserRole) => {
    const colors = {
      admin: Colors.light.roleAdmin,
      engineer: Colors.light.roleEngineer,
      site_engineer: Colors.light.roleEngineer, // Added this
      supervisor: Colors.light.roleEngineer,
      client: Colors.light.roleClient,
      vendor: Colors.light.roleVendor,
    } as const;
    return colors[role];
  };

  // Show loading for client users while fetching data
  if (user?.role === 'client' && loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          Loading your project details...
        </ThemedText>
      </ThemedView>
    );
  }

  // Regular dashboard for non-client users
  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: headerHeight + Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {user ? (
          <View style={[styles.welcomeBadge, { backgroundColor: getRoleBadgeColor(user.role) + '15' }]}>
            <View style={[styles.badgeDot, { backgroundColor: getRoleBadgeColor(user.role) }]} />
            <ThemedText type="small" style={{ color: getRoleBadgeColor(user.role), fontWeight: '600' }}>
              Logged in as {user.name}
            </ThemedText>
          </View>
        ) : null}

        <View style={styles.grid}>
          {cards.map((card) => (
            <DashboardCard
              key={card}
              title={card}
              onPress={() => handleCardPress(card)}
            />
          ))}
        </View>
      </ScrollView>
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
  content: {
    paddingHorizontal: Spacing.lg,
  },
  welcomeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginBottom: Spacing.xl,
  },
  badgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '23%', // ✅ 4 per row
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontWeight: '600',
    textAlign: 'center',
  },
});