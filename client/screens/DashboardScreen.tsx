import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
  FadeInDown,
} from 'react-native-reanimated';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { DASHBOARD_CARDS, UserRole, Client } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DashboardNavProp = NativeStackNavigationProp<RootStackParamList>;

const cardIcons: Record<string, keyof typeof Feather.glyphMap> = {
  'Attendance': 'user-check',
  'Material': 'layers',
  'Order Material': 'shopping-cart',
  'Client': 'home',
  'Vendor': 'truck',
  'Sub Contractor': 'tool',
  'Request Management': 'send',
  'Photo': 'image',
  'Look Ahead': 'trending-up',
  'App Integration': 'share-2',
  'Management': 'sliders',
  'Plan': 'layout',
  'Agreement': 'file-text',
  'Payment': 'dollar-sign',
  'Appointment': 'calendar',
};

const cardGradients: Record<string, [string, string]> = {
  'Attendance': ['#FCD34D', '#F59E0B'],
  'Material': ['#6EE7B7', '#10B981'],
  'Order Material': ['#60A5FA', '#1E40AF'],
  'Client': ['#93C5FD', '#3B82F6'],
  'Vendor': ['#FCA5A5', '#EF4444'],
  'Sub Contractor': ['#C4B5FD', '#8B5CF6'],
  'Request Management': ['#A5B4FC', '#6366F1'],
  'Photo': ['#F9A8D4', '#EC4899'],
  'Look Ahead': ['#67E8F9', '#06B6D4'],
  'App Integration': ['#A5B4FC', '#6366F1'],
  'Management': ['#CBD5E1', '#64748B'],
  'Plan': ['#93C5FD', '#3B82F6'],
  'Agreement': ['#6EE7B7', '#10B981'],
  'Payment': ['#FCD34D', '#F59E0B'],
  'Appointment': ['#C4B5FD', '#8B5CF6'],
};

interface DashboardCardProps {
  title: string;
  onPress: () => void;
  index: number;
}

function DashboardCard({ title, onPress, index }: DashboardCardProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const icon = cardIcons[title] || 'grid';
  const gradient = cardGradients[title] || ['#93C5FD', '#3B82F6'];

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={styles.cardWrapper}
    >
      <AnimatedPressable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.92, springConfig);
        }}
        onPressOut={() => {
          scale.value = withSpring(1, springConfig);
        }}
        style={[styles.card, animatedStyle]}
      >
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardGradient}
        >
          <View style={styles.cardIconContainer}>
            <Feather name={icon} size={22} color="#fff" />
          </View>
          <ThemedText
            type="small"
            style={styles.cardTitle}
            numberOfLines={2}
            lightColor="#fff"
            darkColor="#fff"
          >
            {title}
          </ThemedText>
        </LinearGradient>
      </AnimatedPressable>
    </Animated.View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation = useNavigation<DashboardNavProp>();
  const { user } = useAuth();
  const { theme, isDark } = useTheme();

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
      case 'Order Material':
        // Navigate to Material Order List screen
        navigation.navigate('MaterialOrderShop');
        break;
      case 'Vendor':
        navigation.navigate('VendorList');
        break;
      case 'Management':
        navigation.navigate('Management');
        break;
      case 'Look Ahead':
        navigation.navigate('LookAhead');
        break;
      case 'Request Management':
        navigation.navigate('RequestManagement');
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

  // Show loading for client users while fetching data
  if (user?.role === 'client' && loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText
          type="body"
          style={{ marginTop: Spacing.md, color: theme.textSecondary }}
        >
          Loading your project details...
        </ThemedText>
      </ThemedView>
    );
  }

  // Regular dashboard for non-client users
  return (
    <LinearGradient
      colors={isDark ? ['#111827', '#1F2937'] : ['#F8FAFC', '#E2E8F0']}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + Spacing.sm,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Quick Actions Section */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.modulesSection}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionIconBg}>
                <Feather name="grid" size={16} color="#10B981" />
              </View>
              <ThemedText
                type="body"
                style={styles.sectionTitle}
                lightColor="#1F2937"
                darkColor="#F9FAFB"
              >
                Quick Actions
              </ThemedText>
            </View>
          </View>

          <View style={styles.grid}>
            {cards.map((card, index) => (
              <DashboardCard
                key={card}
                title={card}
                onPress={() => handleCardPress(card)}
                index={index}
              />
            ))}
          </View>
        </Animated.View>
      </ScrollView>
    </LinearGradient>
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
    paddingHorizontal: Spacing.md,
  },
  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  sectionIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  // Modules Section
  modulesSection: {
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  cardWrapper: {
    width: (SCREEN_WIDTH - Spacing.md * 2 - Spacing.sm * 3) / 4,
  },
  card: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  cardGradient: {
    padding: Spacing.sm,
    alignItems: 'center',
    aspectRatio: 0.85,
    justifyContent: 'center',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  cardTitle: {
    fontWeight: '600',
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
  },
});