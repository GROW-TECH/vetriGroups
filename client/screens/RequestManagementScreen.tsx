import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useHeaderHeight } from '@react-navigation/elements';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  collection,
  query,
  getDocs,
  addDoc,
  serverTimestamp,
  where,
  Timestamp,
  onSnapshot,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius } from '@/constants/theme';

interface Client {
  id: string;
  name?: string;
  siteName?: string;
  username: string;
  paymentStatus?: 'paid' | 'unpaid' | 'pending';
  phone?: string;
  email?: string;
}

interface Request {
  id: string;
  clientId: string;
  type: 'payment' | 'general';
  status: 'pending' | 'read' | 'resolved';
  createdAt: any;
}

export default function RequestManagementScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { isDark } = useTheme();

  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [requestMessage, setRequestMessage] = useState('');
  const [requestType, setRequestType] = useState<'payment' | 'general'>('payment');
  const [sending, setSending] = useState(false);
  const [sentRequests, setSentRequests] = useState<Record<string, Request>>({});

  useEffect(() => {
    fetchClients();
    fetchSentRequests();
  }, []);

  const fetchSentRequests = async () => {
    try {
      const requestsRef = collection(db, 'requests');
      const q = query(requestsRef, orderBy('createdAt', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requestsMap: Record<string, Request> = {};
        
        snapshot.docs.forEach((doc) => {
          const data = doc.data();
          const clientId = data.clientId;
          
          // Keep only the most recent request for each client
          if (!requestsMap[clientId]) {
            requestsMap[clientId] = {
              id: doc.id,
              clientId,
              type: data.type,
              status: data.status,
              createdAt: data.createdAt,
            };
          }
        });
        
        setSentRequests(requestsMap);
      });

      return () => unsubscribe();
    } catch (error) {
      console.error('Error fetching sent requests:', error);
    }
  };

  const fetchClients = async () => {
    try {
      setLoading(true);
      const clientsRef = collection(db, 'clients');
      const querySnapshot = await getDocs(clientsRef);

      const clientsData: Client[] = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        siteName: doc.data().siteName,
        username: doc.data().username,
        paymentStatus: doc.data().paymentStatus || 'unpaid',
        phone: doc.data().phone,
        email: doc.data().email,
      }));

      setClients(clientsData);
    } catch (error) {
      console.error('Error fetching clients:', error);
      Alert.alert('Error', 'Failed to load clients');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedClient) return;
    if (!requestMessage.trim()) {
      Alert.alert('Error', 'Please enter a message');
      return;
    }

    try {
      setSending(true);
      const requestsRef = collection(db, 'requests');

      // Create the request data
      const requestData = {
        clientId: selectedClient.id,
        clientName: selectedClient.name || selectedClient.siteName || 'Unknown',
        clientUsername: selectedClient.username,
        type: requestType,
        message: requestMessage.trim(),
        status: 'pending',
        sentBy: 'admin',
        createdAt: serverTimestamp(),
        readAt: null,
        resolvedAt: null,
      };

      console.log('Sending request with data:', requestData);

      // Add request to Firestore
      const docRef = await addDoc(requestsRef, requestData);

      console.log('Request sent successfully with ID:', docRef.id);
      
      // Close modal first
      setModalVisible(false);
      
      // Show success alert
      Alert.alert(
        'Request Sent Successfully! ✅',
        `Your ${requestType === 'payment' ? 'payment reminder' : 'message'} has been sent to ${selectedClient.name || selectedClient.siteName}.`,
        [{ text: 'OK', style: 'default' }]
      );
      
      // Reset form
      setRequestMessage('');
      setSelectedClient(null);
      setRequestType('payment');
    } catch (error: any) {
      console.error('Error sending request:', error);
      console.error('Error details:', error.message, error.code);
      Alert.alert('Error', `Failed to send request: ${error.message || 'Please try again.'}`);
    } finally {
      setSending(false);
    }
  };

  const openRequestModal = (client: Client, type: 'payment' | 'general' = 'payment') => {
    setSelectedClient(client);
    setRequestType(type);
    setRequestMessage(
      type === 'payment'
        ? `Dear ${client.name || client.siteName}, your payment is pending. Please complete the payment at your earliest convenience.`
        : ''
    );
    setModalVisible(true);
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case 'paid':
        return '#10B981';
      case 'pending':
        return '#F59E0B';
      default:
        return '#EF4444';
    }
  };

  const hasRecentRequest = (clientId: string, type: 'payment' | 'general') => {
    const request = sentRequests[clientId];
    if (!request) return false;
    
    // Check if request was sent in the last 24 hours
    if (request.createdAt) {
      try {
        const createdDate = request.createdAt.toDate ? request.createdAt.toDate() : new Date(request.createdAt);
        const hoursSince = (new Date().getTime() - createdDate.getTime()) / (1000 * 60 * 60);
        return hoursSince < 24 && request.type === type;
      } catch {
        return false;
      }
    }
    return false;
  };

  const getRequestButtonLabel = (clientId: string, type: 'payment' | 'general') => {
    if (hasRecentRequest(clientId, type)) {
      return type === 'payment' ? 'Reminder Sent ✓' : 'Message Sent ✓';
    }
    return type === 'payment' ? 'Payment Reminder' : 'Custom Message';
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3B82F6" />
        <ThemedText type="body" style={{ marginTop: Spacing.md }}>
          Loading clients...
        </ThemedText>
      </ThemedView>
    );
  }

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
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={[styles.headerIconBg, { backgroundColor: 'rgba(99, 102, 241, 0.15)' }]}>
              <Feather name="send" size={24} color="#6366F1" />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="subtitle" lightColor="#1F2937" darkColor="#F9FAFB">
                Request Management
              </ThemedText>
              <ThemedText style={styles.headerSubtext} lightColor="#6B7280" darkColor="#9CA3AF">
                Send payment reminders and notifications
              </ThemedText>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          style={styles.statsContainer}
        >
          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#fff' }]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEE2E2' }]}>
              <Feather name="alert-circle" size={20} color="#EF4444" />
            </View>
            <ThemedText style={styles.statValue}>
              {clients.filter((c) => c.paymentStatus === 'unpaid').length}
            </ThemedText>
            <ThemedText style={styles.statLabel} lightColor="#6B7280" darkColor="#9CA3AF">
              Unpaid
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#fff' }]}>
            <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
              <Feather name="clock" size={20} color="#F59E0B" />
            </View>
            <ThemedText style={styles.statValue}>
              {clients.filter((c) => c.paymentStatus === 'pending').length}
            </ThemedText>
            <ThemedText style={styles.statLabel} lightColor="#6B7280" darkColor="#9CA3AF">
              Pending
            </ThemedText>
          </View>

          <View style={[styles.statCard, { backgroundColor: isDark ? '#1F2937' : '#fff' }]}>
            <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
              <Feather name="check-circle" size={20} color="#10B981" />
            </View>
            <ThemedText style={styles.statValue}>
              {clients.filter((c) => c.paymentStatus === 'paid').length}
            </ThemedText>
            <ThemedText style={styles.statLabel} lightColor="#6B7280" darkColor="#9CA3AF">
              Paid
            </ThemedText>
          </View>
        </Animated.View>

        {/* Clients List */}
        <View style={styles.clientsList}>
          {clients.map((client, index) => (
            <Animated.View
              key={client.id}
              entering={FadeInDown.delay(100 + index * 50).springify()}
              style={[
                styles.clientCard,
                { backgroundColor: isDark ? '#1F2937' : '#fff' },
              ]}
            >
              <View style={styles.clientHeader}>
                <View style={styles.clientInfo}>
                  <View
                    style={[
                      styles.clientAvatar,
                      {
                        backgroundColor:
                          client.paymentStatus === 'unpaid' ? '#FEE2E2' : '#E0E7FF',
                      },
                    ]}
                  >
                    <Feather
                      name="user"
                      size={24}
                      color={client.paymentStatus === 'unpaid' ? '#EF4444' : '#6366F1'}
                    />
                  </View>
                  <View style={styles.clientDetails}>
                    <ThemedText type="body" style={styles.clientName}>
                      {client.name || client.siteName || 'Unnamed Client'}
                    </ThemedText>
                    <ThemedText
                      style={styles.clientUsername}
                      lightColor="#6B7280"
                      darkColor="#9CA3AF"
                    >
                      @{client.username}
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.paymentBadge,
                    {
                      backgroundColor: `${getPaymentStatusColor(client.paymentStatus)}20`,
                    },
                  ]}
                >
                  <ThemedText
                    style={[
                      styles.paymentBadgeText,
                      { color: getPaymentStatusColor(client.paymentStatus) },
                    ]}
                  >
                    {client.paymentStatus || 'unpaid'}
                  </ThemedText>
                </View>
              </View>

              {client.paymentStatus !== 'paid' && (
                <View style={styles.clientActions}>
                  <Pressable
                    style={[
                      styles.actionButton,
                      hasRecentRequest(client.id, 'payment') ? styles.sentButton : styles.paymentButton
                    ]}
                    onPress={() => openRequestModal(client, 'payment')}
                    disabled={hasRecentRequest(client.id, 'payment')}
                  >
                    <Feather 
                      name={hasRecentRequest(client.id, 'payment') ? 'check-circle' : 'dollar-sign'} 
                      size={16} 
                      color="#fff" 
                    />
                    <ThemedText style={styles.actionButtonText}>
                      {getRequestButtonLabel(client.id, 'payment')}
                    </ThemedText>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.actionButton,
                      hasRecentRequest(client.id, 'general') ? styles.sentGeneralButton : styles.generalButton
                    ]}
                    onPress={() => openRequestModal(client, 'general')}
                    disabled={hasRecentRequest(client.id, 'general')}
                  >
                    <Feather 
                      name={hasRecentRequest(client.id, 'general') ? 'check-circle' : 'message-circle'} 
                      size={16} 
                      color={hasRecentRequest(client.id, 'general') ? '#fff' : '#6366F1'} 
                    />
                    <ThemedText style={[
                      styles.actionButtonText, 
                      { color: hasRecentRequest(client.id, 'general') ? '#fff' : '#6366F1' }
                    ]}>
                      {getRequestButtonLabel(client.id, 'general')}
                    </ThemedText>
                  </Pressable>
                </View>
              )}
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      {/* Send Request Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: isDark ? '#1F2937' : '#fff' }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle">
                Send {requestType === 'payment' ? 'Payment Reminder' : 'Custom Request'}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather name="x" size={24} color={isDark ? '#9CA3AF' : '#6B7280'} />
              </Pressable>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.clientPreview}>
                <ThemedText style={styles.modalLabel} lightColor="#6B7280" darkColor="#9CA3AF">
                  To:
                </ThemedText>
                <ThemedText type="body">
                  {selectedClient?.name || selectedClient?.siteName}
                </ThemedText>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={styles.modalLabel} lightColor="#6B7280" darkColor="#9CA3AF">
                  Message
                </ThemedText>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: isDark ? '#111827' : '#F9FAFB',
                      color: isDark ? '#F9FAFB' : '#1F2937',
                    },
                  ]}
                  value={requestMessage}
                  onChangeText={setRequestMessage}
                  placeholder="Enter your message..."
                  placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />
              </View>
            </View>

            <View style={styles.modalFooter}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </Pressable>

              <Pressable
                style={[styles.modalButton, styles.sendButton]}
                onPress={handleSendRequest}
                disabled={sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="send" size={16} color="#fff" />
                    <ThemedText style={styles.sendButtonText}>Send Request</ThemedText>
                  </>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIconBg: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
  },
  headerSubtext: {
    fontSize: 13,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
  },
  clientsList: {
    gap: Spacing.md,
  },
  clientCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  clientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  clientAvatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientDetails: {
    flex: 1,
  },
  clientName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  clientUsername: {
    fontSize: 13,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  clientActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  paymentButton: {
    backgroundColor: '#EF4444',
  },
  generalButton: {
    backgroundColor: '#E0E7FF',
  },
  sentButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  sentGeneralButton: {
    backgroundColor: '#9CA3AF',
    opacity: 0.7,
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#fff',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  modalBody: {
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  clientPreview: {
    padding: Spacing.md,
    backgroundColor: '#F9FAFB',
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  inputGroup: {
    gap: 4,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
    minHeight: 120,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: BorderRadius.md,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
  },
  sendButton: {
    backgroundColor: '#6366F1',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});