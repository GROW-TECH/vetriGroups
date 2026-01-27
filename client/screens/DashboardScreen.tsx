import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, ActivityIndicator, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import BudgetOverview from '@/components/BudgetOverview';

import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';


import { collection, query, where, getDocs, doc, updateDoc, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { DASHBOARD_CARDS } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const springConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type DashboardNavProp = NativeStackNavigationProp<RootStackParamList>;

interface Appointment {
  id: string;
  clientId: string;
  clientName?: string;
  date: string;
  time: string;
  reason: string;
  status: 'pending' | 'accepted' | 'declined' | 'read';
  createdAt: any;
}

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
  'Transport': 'truck',
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
  'Transport': ['#FDE68A', '#F97316'],
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
const SwipeRightActions = ({ onRead, onAccept }: any) => (
  <View style={styles.swipeRight}>
    {onRead && (
      <Pressable style={styles.swipeBtnRead} onPress={onRead}>
        <Feather name="eye" size={18} color="#fff" />
        <ThemedText style={styles.swipeText}>Read</ThemedText>
      </Pressable>
    )}
    {onAccept && (
      <Pressable style={styles.swipeBtnAccept} onPress={onAccept}>
        <Feather name="check" size={18} color="#fff" />
        <ThemedText style={styles.swipeText}>Accept</ThemedText>
      </Pressable>
    )}
  </View>
);

const SwipeLeftActions = ({ onDecline }: any) => (
  <View style={styles.swipeLeft}>
    <Pressable style={styles.swipeBtnDecline} onPress={onDecline}>
      <Feather name="x" size={18} color="#fff" />
      <ThemedText style={styles.swipeText}>Decline</ThemedText>
    </Pressable>
  </View>
);

interface NotificationCardProps {
  appointment: Appointment;
  onMarkAsRead: () => void;
  onAccept: () => void;
  onDecline: () => void;
  index: number;
}

function NotificationCard({ appointment, onMarkAsRead, onAccept, onDecline, index }: NotificationCardProps) {
  const { theme, isDark } = useTheme();
  const [actionLoading, setActionLoading] = useState(false);

  const getStatusColor = () => {
    switch (appointment.status) {
      case 'accepted':
        return '#10B981';
      case 'declined':
        return '#EF4444';
      case 'read':
        return '#6B7280';
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = () => {
    switch (appointment.status) {
      case 'accepted':
        return 'check-circle';
      case 'declined':
        return 'x-circle';
      case 'read':
        return 'eye';
      default:
        return 'clock';
    }
  };

  const getTimeAgo = () => {
    if (!appointment.createdAt) return '';
    
    try {
      const createdDate = appointment.createdAt.toDate ? appointment.createdAt.toDate() : new Date(appointment.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - createdDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      return `${diffDays}d ago`;
    } catch (error) {
      return '';
    }
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 80).springify()}
      style={[
        styles.notificationCard,
        { backgroundColor: isDark ? '#1F2937' : '#fff' },
        appointment.status === 'pending' && styles.notificationCardUnread
      ]}
    >
      <View style={[
        styles.notificationIconContainer,
        { backgroundColor: appointment.status === 'pending' ? '#FEF3C7' : '#F3F4F6' }
      ]}>
        <Feather name="calendar" size={24} color={getStatusColor()} />
      </View>

      <View style={styles.notificationContent}>
        <View style={styles.notificationHeader}>
          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={styles.notificationTitle}>
              {appointment.reason || 'Appointment Request'}
            </ThemedText>
            <ThemedText style={styles.notificationClient} lightColor="#6B7280" darkColor="#9CA3AF">
              {appointment.clientName || 'Unknown Client'}
            </ThemedText>
          </View>
          <View style={styles.notificationMeta}>
            <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
              <Feather name={getStatusIcon()} size={12} color={getStatusColor()} />
              <ThemedText style={[styles.statusText, { color: getStatusColor() }]}>
                {appointment.status}
              </ThemedText>
            </View>
            {getTimeAgo() && (
              <ThemedText style={styles.timeAgo} lightColor="#9CA3AF" darkColor="#6B7280">
                {getTimeAgo()}
              </ThemedText>
            )}
          </View>
        </View>

        <View style={styles.notificationDetails}>
          <View style={styles.detailItem}>
            <Feather name="calendar" size={14} color="#6B7280" />
            <ThemedText style={styles.detailText} lightColor="#6B7280" darkColor="#9CA3AF">
              {appointment.date}
            </ThemedText>
          </View>
          <View style={styles.detailItem}>
            <Feather name="clock" size={14} color="#6B7280" />
            <ThemedText style={styles.detailText} lightColor="#6B7280" darkColor="#9CA3AF">
              {appointment.time}
            </ThemedText>
          </View>
        </View>

        {appointment.status === 'pending' && (
          <View style={styles.notificationActions}>
            <Pressable
              style={[styles.actionButton, styles.readButton]}
              onPress={async () => {
                setActionLoading(true);
                await onMarkAsRead();
                setActionLoading(false);
              }}
              disabled={actionLoading}
            >
              <Feather name="eye" size={16} color="#6B7280" />
              <ThemedText style={[styles.actionButtonText, { color: '#6B7280' }]}>
                Mark as Read
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.acceptButton]}
              onPress={async () => {
                setActionLoading(true);
                await onAccept();
                setActionLoading(false);
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="check" size={16} color="#fff" />
                  <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
                    Accept
                  </ThemedText>
                </>
              )}
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.declineButton]}
              onPress={async () => {
                setActionLoading(true);
                await onDecline();
                setActionLoading(false);
              }}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="x" size={16} color="#fff" />
                  <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
                    Decline
                  </ThemedText>
                </>
              )}
            </Pressable>
          </View>
        )}

        {appointment.status === 'read' && (
          <View style={styles.notificationActions}>
            <Pressable
              style={[styles.actionButton, styles.acceptButton]}
              onPress={async () => {
                setActionLoading(true);
                await onAccept();
                setActionLoading(false);
              }}
              disabled={actionLoading}
            >
              <Feather name="check" size={16} color="#fff" />
              <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
                Accept
              </ThemedText>
            </Pressable>

            <Pressable
              style={[styles.actionButton, styles.declineButton]}
              onPress={async () => {
                setActionLoading(true);
                await onDecline();
                setActionLoading(false);
              }}
              disabled={actionLoading}
            >
              <Feather name="x" size={16} color="#fff" />
              <ThemedText style={[styles.actionButtonText, { color: '#fff' }]}>
                Decline
              </ThemedText>
            </Pressable>
          </View>
        )}
      </View>
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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [acceptedVendorOrders, setAcceptedVendorOrders] = useState<any[]>([]);

const [vendorOrders, setVendorOrders] = useState<any[]>([]);

  const [paymentRequests, setPaymentRequests] = useState<any[]>([]);

  const [showAllNotifications, setShowAllNotifications] = useState(false);
const [hiddenRequests, setHiddenRequests] = useState<Set<string>>(new Set());
const [hiddenAppointments, setHiddenAppointments] = useState<Set<string>>(new Set());
const cards = user ? DASHBOARD_CARDS[user.role] : [];

  // Fetch appointments in real-time for admin
  useEffect(() => {
    if (user?.role === 'admin') {
      const appointmentsRef = collection(db, 'appointments');
      const q = query(
        appointmentsRef,
        orderBy('createdAt', 'desc')
      );

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const appointmentsData: Appointment[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          
          // Fetch client name
          let clientName = 'Unknown Client';
          if (data.clientId) {
            try {
              const clientDoc = await getDocs(
                query(collection(db, 'clients'), where('__name__', '==', data.clientId))
              );
              if (!clientDoc.empty) {
                const clientData = clientDoc.docs[0].data();
                clientName = clientData.name || clientData.siteName || 'Unknown Client';
              }
            } catch (error) {
              console.error('Error fetching client name:', error);
            }
          }

          appointmentsData.push({
            id: docSnap.id,
            clientId: data.clientId,
            clientName,
            date: data.date,
            time: data.time,
            reason: data.reason,
            status: data.status || 'pending',
            createdAt: data.createdAt,
          });
        }
        
        setAppointments(appointmentsData);
      }, (error) => {
        console.error('Error fetching appointments:', error);
      });

      return () => unsubscribe();
    }
  }, [user]);

useEffect(() => {
  if (user?.role !== 'vendor' || !user.vendorId) return;

  console.log('🔥 vendorId from auth:', user.vendorId);

  const q = query(
    collection(db, 'materialOrders'),
    where('supplierId', '==', String(user.vendorId)) // 👈 TEMP
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    console.log('🔥 materialOrders docs:', snapshot.size);

    const list: any[] = [];
    snapshot.forEach(docSnap => {
      console.log('🔥 order:', docSnap.data());
      list.push({ id: docSnap.id, ...docSnap.data() });
    });

    setVendorOrders(list);
  });

  return () => unsubscribe();
}, [user]);


 // Fetch client data and navigate to ClientDetail for client users
  useEffect(() => {
    if (user?.role === 'client') {
      // Get clientId from user's additional data or find by username
      const clientId = user?.clientId || user?.additionalData?.clientId;
      
      if (clientId) {
        // If we have clientId, navigate directly
        navigation.replace('ClientDetail', { clientId });
      } else if (user?.name) {
        // Otherwise, fetch by username
        fetchClientDataAndNavigate(user.name);
      }
    }
  }, [user]);
useEffect(() => {
  if (user?.role !== 'admin') return;

  const q = query(
  collection(db, 'requests'),
  where('type', '==', 'payment'),
);


  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: any[] = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      list.push({
        id: docSnap.id,
        clientName: data.clientName,
        message: data.message,
        status: data.status, // 🔥 accepted / declined / read
        createdAt: data.createdAt,
      });
    });

    setPaymentRequests(list);
  });

  return () => unsubscribe();
}, [user]);
useEffect(() => {
  if (user?.role !== 'admin') return;

  const q = query(
    collection(db, 'materialOrders'),
    where('vendorStatus', '==', 'accepted')
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: any[] = [];
    snapshot.forEach(docSnap => {
      list.push({ id: docSnap.id, ...docSnap.data() });
    });
    setAcceptedVendorOrders(list);
  });

  return () => unsubscribe();
}, [user]);

  const fetchClientDataAndNavigate = async (username: string) => {
    setLoading(true);
    try {
      const clientsRef = collection(db, 'clients');
      const q = query(clientsRef, where('username', '==', username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const clientId = querySnapshot.docs[0].id;
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

  const handleAppointmentAction = async (appointmentId: string, action: 'read' | 'accepted' | 'declined') => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        status: action,
        updatedAt: new Date(),
      });
      
      const actionText = action === 'read' ? 'marked as read' : action;
      Alert.alert('Success', `Appointment ${actionText} successfully`);
    } catch (error) {
      console.error('Error updating appointment:', error);
      Alert.alert('Error', 'Failed to update appointment');
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
        navigation.navigate('MaterialOrderShop');
        break;
      case 'Vendor':
        navigation.navigate('VendorList');
        break;
     case 'Request Management':
  navigation.navigate('RequestManagement');
  break;
      case 'Look Ahead':
        navigation.navigate('LookAhead');
        break;
      case 'Sub Contractor':
        navigation.navigate('SubContractorList');
        break;
        case 'Management':
  navigation.navigate('ManagementScreen' as never);
  break;

      case 'Transport':
        navigation.navigate('TransportList');
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
const getPaymentStatusUI = (status: string) => {
  switch (status) {
    case 'accepted':
      return { color: '#10B981', bg: '#ECFDF5', icon: 'check-circle' };
    case 'declined':
      return { color: '#EF4444', bg: '#FEF2F2', icon: 'x-circle' };
    case 'pending':
      return { color: '#F59E0B', bg: '#FFFBEB', icon: 'clock' };
    default:
      return { color: '#6B7280', bg: '#F3F4F6', icon: 'eye' };
  }
};
const hidePaymentRequest = (requestId: string) => {
  setHiddenRequests(prev => new Set([...prev, requestId]));
  };
  const hideAppointment = (appointmentId: string) => {
  setHiddenAppointments(prev => new Set([...prev, appointmentId]));
};
const visibleAppointments = appointments.filter(a => !hiddenAppointments.has(a.id));
const pendingAppointments = visibleAppointments.filter(a => a.status === 'pending');
const displayedAppointments = showAllNotifications ? visibleAppointments : visibleAppointments.slice(0, 4);
const unreadCount =
  user?.role === 'admin' ? pendingAppointments.length : 0;
const visiblePaymentRequests = paymentRequests.filter(req => !hiddenRequests.has(req.id));
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

        
        {user?.role === 'admin' && visiblePaymentRequests.length > 0 && (
          <View style={{ marginBottom: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: '#FEF3C7',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <Feather name="dollar-sign" size={16} color="#F59E0B" />
      </View>

      <ThemedText type="body" style={{ fontWeight: '700' }}>
        Payment Notifications
      </ThemedText>
    </View>

            {visiblePaymentRequests.map((req) => {
              const ui = getPaymentStatusUI(req.status);

  return (
    <Swipeable
      key={req.id}
      onSwipeableOpen={() => hidePaymentRequest(req.id)}
      renderRightActions={() => (
        <View style={{ 
          backgroundColor: '#10B981', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: 80,
        }}>
          <Feather name="check" size={20} color="#fff" />
        </View>
      )}
      renderLeftActions={() => (
        <View style={{ 
          backgroundColor: '#EF4444', 
          justifyContent: 'center', 
          alignItems: 'center',
          width: 80,
        }}>
          <Feather name="x" size={20} color="#fff" />
        </View>
      )}
    >
      <View
        style={{
          flexDirection: 'row',
          padding: 14,
          borderRadius: 14,
          backgroundColor: '#fff',
          marginBottom: 12,
        }}
      >
        {/* Status Icon */}
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: ui.bg,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <Feather name={ui.icon as any} size={20} color={ui.color} />
        </View>

        {/* Content */}
        <View style={{ flex: 1 }}>
          <ThemedText style={{ fontWeight: '600', fontSize: 14 }}>
            {req.clientName}
          </ThemedText>

          <ThemedText
            numberOfLines={2}
            style={{ marginTop: 2, fontSize: 12, color: '#6B7280' }}
          >
            {req.message}
          </ThemedText>

          <View
            style={{
              alignSelf: 'flex-start',
              marginTop: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 999,
              backgroundColor: ui.bg,
            }}
          >
            <ThemedText
              style={{
                fontSize: 11,
                fontWeight: '700',
                color: ui.color,
              }}
            >
              {req.status.toUpperCase()}
            </ThemedText>
          </View>
        </View>
      </View>
    </Swipeable>
  );
})}

  </View>
)}

        {/* Vendor Accepted Orders (Admin) */}
{user?.role === 'admin' && acceptedVendorOrders.length > 0 && (
  <View style={{ marginBottom: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: '#ECFDF5',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <Feather name="check-circle" size={16} color="#10B981" />
      </View>

      <ThemedText type="body" style={{ fontWeight: '700' }}>
        Vendor Accepted Orders
      </ThemedText>
    </View>

    {acceptedVendorOrders.map(order => (
      <View
        key={order.id}
        style={{
          backgroundColor: '#fff',
          padding: 14,
          borderRadius: 14,
          marginBottom: 10,
        }}
      >
        <ThemedText style={{ fontWeight: '600' }}>
          Material: {order.materialId}
        </ThemedText>

        <ThemedText style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>
          Qty: {order.quantity} • ₹{order.totalCost}
        </ThemedText>

        <View
          style={{
            marginTop: 8,
            alignSelf: 'flex-start',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 999,
            backgroundColor: '#ECFDF5',
          }}
        >
          <ThemedText style={{ fontSize: 11, fontWeight: '700', color: '#10B981' }}>
            ACCEPTED BY VENDOR
          </ThemedText>
        </View>
      </View>
    ))}
  </View>
)}

{/* Vendor Order Notifications */}
{user?.role === 'vendor' && vendorOrders.length > 0 && (
  <View style={{ marginBottom: 24 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          backgroundColor: '#FEF3C7',
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
        }}
      >
        <Feather name="shopping-cart" size={16} color="#F59E0B" />
      </View>

      <ThemedText type="body" style={{ fontWeight: '700' }}>
        New Material Orders
      </ThemedText>
    </View>

   {vendorOrders.map(order => (
  <View
    key={order.id}
    style={{
      backgroundColor: '#fff',
      padding: 14,
      borderRadius: 14,
      marginBottom: 12,
    }}
  >
    <View style={{ marginBottom: 10 }}>
      <ThemedText style={{ fontWeight: '600' }}>
        Material: {order.materialId}
      </ThemedText>

      <ThemedText style={{ fontSize: 12, color: '#6B7280' }}>
        Qty: {order.quantity} • ₹{order.totalCost}
      </ThemedText>
    </View>

    {/* ACTION BUTTONS */}
    {/* STATUS / ACTION */}
{order.vendorStatus === 'pending' ? (
  <View style={{ flexDirection: 'row', gap: 10 }}>
    {/* ACCEPT */}
    <Pressable
      style={{
        flex: 1,
        backgroundColor: '#10B981',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
      }}
      onPress={async () => {
        await updateDoc(doc(db, 'materialOrders', order.id), {
          vendorStatus: 'accepted',
          vendorRead: true,
        });
      }}
    >
      <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
        Accept
      </ThemedText>
    </Pressable>

    {/* DECLINE */}
    <Pressable
      style={{
        flex: 1,
        backgroundColor: '#EF4444',
        paddingVertical: 10,
        borderRadius: 10,
        alignItems: 'center',
      }}
      onPress={async () => {
        await updateDoc(doc(db, 'materialOrders', order.id), {
          vendorStatus: 'declined',
          vendorRead: true,
        });
      }}
    >
      <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
        Decline
      </ThemedText>
    </Pressable>
  </View>
) : (
  <View
    style={{
      alignSelf: 'flex-start',
      paddingHorizontal: 14,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor:
        order.vendorStatus === 'accepted' ? '#ECFDF5' : '#FEF2F2',
    }}
  >
    <ThemedText
      style={{
        fontSize: 12,
        fontWeight: '700',
        color:
          order.vendorStatus === 'accepted' ? '#10B981' : '#EF4444',
      }}
    >
      {order.vendorStatus.toUpperCase()}
    </ThemedText>
  </View>
)}

  </View>
))}

  </View>
)}

        {/* Notifications Section (Admin only) */}
        {user?.role === 'admin' && visibleAppointments.length > 0 && (
          <Animated.View entering={FadeInDown.springify()} style={styles.notificationsSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionIconBg, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Feather name="bell" size={16} color="#EF4444" />
                  {unreadCount > 0 && (
                    <View style={styles.notificationBadge}>
                      <ThemedText style={styles.notificationBadgeText}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <ThemedText
                  type="body"
                  style={styles.sectionTitle}
                  lightColor="#1F2937"
                  darkColor="#F9FAFB"
                >
                  Appointment Notifications
                </ThemedText>
              </View>
          {visibleAppointments.length > 4 && (
  <Pressable onPress={() => setShowAllNotifications(!showAllNotifications)}>
    <ThemedText style={styles.viewAllText} lightColor="#3B82F6" darkColor="#60A5FA">
      {showAllNotifications ? 'Show Less' : `View All (${visibleAppointments.length})`}
    </ThemedText>
  </Pressable>
)}
            </View>

            <View style={styles.notificationsList}>
            {displayedAppointments.map((appointment, index) => (
  <Swipeable
    key={appointment.id}
    onSwipeableOpen={() => hideAppointment(appointment.id)}
    renderRightActions={() => (
      <View style={{ 
        backgroundColor: '#10B981', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: 80,
      }}>
        <Feather name="check" size={20} color="#fff" />
      </View>
    )}
    renderLeftActions={() => (
      <View style={{ 
        backgroundColor: '#EF4444', 
        justifyContent: 'center', 
        alignItems: 'center',
        width: 80,
      }}>
        <Feather name="x" size={20} color="#fff" />
      </View>
    )}
  >
    <NotificationCard
      appointment={appointment}
      onMarkAsRead={() => handleAppointmentAction(appointment.id, 'read')}
      onAccept={() => handleAppointmentAction(appointment.id, 'accepted')}
      onDecline={() => handleAppointmentAction(appointment.id, 'declined')}
      index={index}
    />
  </Swipeable>
))}


            </View>
          </Animated.View>
        )}

        {/* Budget Overview (Admin only) */}
        {user?.role === 'admin' && (
          <Animated.View entering={FadeInDown.delay(100).springify()}>
            <BudgetOverview />
          </Animated.View>
        )}

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
    swipeRight: {
    flexDirection: 'row',
    height: '100%',
  },

  swipeLeft: {
    height: '100%',
    justifyContent: 'center',
  },

  swipeBtnRead: {
    backgroundColor: '#6B7280',
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },

  swipeBtnAccept: {
    backgroundColor: '#10B981',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  swipeBtnDecline: {
    backgroundColor: '#EF4444',
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  swipeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },

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
  // Notifications Section
  notificationsSection: {
    marginBottom: Spacing.xl,
  },
  notificationsList: {
    gap: Spacing.md,
  },
  notificationCard: {
    flexDirection: 'row',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  notificationCardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
  },
  notificationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  notificationMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  notificationTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  notificationClient: {
    fontSize: 13,
    fontWeight: '500',
  },
  notificationDetails: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  timeAgo: {
    fontSize: 11,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    borderRadius: BorderRadius.sm,
    flex: 1,
  },
  readButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: '600',
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