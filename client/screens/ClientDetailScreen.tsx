import React, { useState, useMemo, useEffect } from 'react';
import { Picker } from '@react-native-picker/picker';
import * as DocumentPicker from 'expo-document-picker';
import { Audio } from 'expo-av';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Image,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { RazorpayPayment } from '@/components/RazorpayPayment';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { ProjectFile, PaymentStage, Appointment, Client, Transaction, PaymentRequest } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';

type RouteProps = RouteProp<RootStackParamList, 'ClientDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'overview' | 'files' | 'photos' | 'payments' | 'appointments';

interface PaymentOption {
  id: string;
  name: string;
  icon: keyof typeof Feather.glyphMap;
  type: 'upi' | 'bank';
}
const SITE_DISPLAY_OPTIONS = [
  'Show on Site',
  'Hide from Site',
];

const STAGE_OPTIONS = [
  'Foundation',
  'Plinth',
  'Superstructure',
  'Roof',
  'Finishing',
  'Final',
];


const PAYMENT_OPTIONS: PaymentOption[] = [
  { id: 'gpay', name: 'Google Pay', icon: 'smartphone', type: 'upi' },
  { id: 'phonepe', name: 'PhonePe', icon: 'smartphone', type: 'upi' },
  { id: 'paytm', name: 'Paytm', icon: 'smartphone', type: 'upi' },
  { id: 'upi', name: 'Other UPI', icon: 'credit-card', type: 'upi' },
  { id: 'neft', name: 'NEFT', icon: 'briefcase', type: 'bank' },
  { id: 'rtgs', name: 'RTGS', icon: 'briefcase', type: 'bank' },
  { id: 'netbanking', name: 'Net Banking', icon: 'globe', type: 'bank' },
];


export default function ClientDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
const {
  projectFiles,
  transactions,
  appointments,
  addProjectFile,
  deleteProjectFile,
  addTransaction,
  addAppointment,
  deleteClient,
} = useData();

const [fileTitle, setFileTitle] = useState('');
const [uploadType, setUploadType] =
  useState<'plan' | 'agreement' | 'photo' | null>(null);

const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [client, setClient] = useState<Client | null>(null);
const [loadingClient, setLoadingClient] = useState(true);

const [sites, setSites] = useState<Client[]>([]);
const [selectedSiteId, setSelectedSiteId] = useState('');

  const { clientId } = route.params;
  
useEffect(() => {
  if (!clientId) {
    console.error('❌ clientId is missing');
    setLoadingClient(false);
    return;
  }

  // 1️⃣ Listen to selected client
  const clientRef = doc(db, 'clients', clientId);

  const unsubClient = onSnapshot(
    clientRef,
    snap => {
      if (snap.exists()) {
        setClient({ id: snap.id, ...(snap.data() as Client) });
      } else {
        setClient(null);
      }
      setLoadingClient(false);
    },
    error => {
      console.error('🔥 Client snapshot error:', error);
      setLoadingClient(false);
    }
  );

  // 2️⃣ Listen to all sites
  const sitesQuery = query(
    collection(db, 'clients'),
    orderBy('projectName')
  );

  const unsubSites = onSnapshot(
    sitesQuery,
    snap => {
      const list: Client[] = [];
      snap.forEach(docSnap => {
        list.push({ id: docSnap.id, ...(docSnap.data() as Client) });
      });
      setSites(list);
    },
    error => {
      console.error('🔥 Sites snapshot error:', error);
    }
  );

  return () => {
    unsubClient();
    unsubSites();
  };
}, [clientId]);


const [selectedStage, setSelectedStage] = useState('');
const [siteDisplay, setSiteDisplay] = useState('');


const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  // Payment request states
const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
const [dismissedRequests, setDismissedRequests] = useState<string[]>([]);
  const [dismissedNotifications, setDismissedNotifications] = useState<string[]>([]);
  const [declinedRequests, setDeclinedRequests] = useState<Record<string, number>>({});
const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditMode, setIsEditMode] = useState(false);
const [editedStages, setEditedStages] = useState<Record<string, { 
  name?: string; 
  amount?: number; 
  status?: 'paid' | 'pending';
}>>({});

  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageAmount, setNewStageAmount] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
const [showPreviewModal, setShowPreviewModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<ProjectFile | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRazorpayModal, setShowRazorpayModal] = useState(false);
  const [selectedStageForPayment, setSelectedStageForPayment] = useState<PaymentStage | null>(null);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // editable client fields
const [editedProjectName, setEditedProjectName] = useState('');
const [editedClientName, setEditedClientName] = useState('');
const [editedOwnerPhone, setEditedOwnerPhone] = useState('');

useEffect(() => {
  if (client) {
    setEditedProjectName(client.projectName || '');
    setEditedClientName(client.name || '');
    setEditedOwnerPhone(client.ownerPhone || '');
  }
}, [client]);

 const clientAppointments = useMemo(() => {
    return appointments.filter(a => a.clientId === clientId);
  }, [appointments, clientId]);
  const canEdit = user?.role === 'admin' || user?.role === 'engineer';

  const canPay = user?.role === 'client';
const notificationAppointments = useMemo(() => {
  return clientAppointments.filter(
    (apt) =>
      (apt.status === 'accepted' || apt.status === 'declined') &&
      !dismissedNotifications.includes(apt.id)
  );
}, [clientAppointments, dismissedNotifications]);

const handleDismissNotification = (id: string) => {
  setDismissedNotifications((prev) => [...prev, id]);
};
const activePaymentRequests = useMemo(() => {
  const now = Date.now();
  return paymentRequests.filter(req => {
    if (req.status !== 'pending' || dismissedRequests.includes(req.id)) return false;
    
    const declinedAt = declinedRequests[req.id];
    if (declinedAt && now - declinedAt < 30 * 60 * 1000) {
      return false;
    }
    
    return true;
  });
}, [paymentRequests, dismissedRequests, declinedRequests]);


useEffect(() => {
  if (activePaymentRequests.length > 0 || notificationAppointments.length > 0) {
    playNotificationSound();
  }
}, [activePaymentRequests.length, notificationAppointments.length]);
  // Check if the logged-in user is the client owner
  const isClientOwner = useMemo(() => {
    // If user is a client, check if this is their client record
    if (user?.role === 'client') {
      // Assuming user has a clientId field or email matches client's email
      return user?.email === client?.email || user?.clientId === clientId;
    }
    return false;
  }, [user, client, clientId]);
// Fetch payment requests from Firestore for this client
useEffect(() => {
  if (!isClientOwner) return; // Only fetch for client owners

  const requestsRef = collection(db, 'requests');
  const q = query(
    requestsRef,
    where('clientId', '==', clientId),
    where('type', '==', 'payment'),
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const requests: PaymentRequest[] = [];
      snapshot.forEach((docSnap) => {
        requests.push({ id: docSnap.id, ...docSnap.data() } as PaymentRequest);
      });
      setPaymentRequests(requests);
    },
    (error) => {
      console.error('Error fetching payment requests:', error);
    }
  );

  return () => unsubscribe();
}, [clientId, isClientOwner]);

// Filter out dismissed requests and only show pending ones

const handleDismissPaymentRequest = async (requestId: string) => {
  setDismissedRequests(prev => [...prev, requestId]);
  
  // Optionally update the status in Firestore
  try {
    const requestRef = doc(db, 'requests', requestId);
    await updateDoc(requestRef, { 
      status: 'read',
      readAt: new Date().toISOString() 
    });
  } catch (error) {
    console.error('Error updating request status:', error);
  }
};
  const handleAcceptPaymentRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, 'requests', requestId);
    await updateDoc(requestRef, { 
      status: 'accepted',
      acceptedAt: new Date().toISOString() 
    });
    setDismissedRequests(prev => [...prev, requestId]);
    Alert.alert('Success', 'Payment request accepted. Please proceed with the payment.');
  } catch (error) {
    console.error('Error accepting request:', error);
    Alert.alert('Error', 'Failed to accept request. Please try again.');
  }
};

const handleDeclinePaymentRequest = async (requestId: string) => {
  try {
    const requestRef = doc(db, 'requests', requestId);
    await updateDoc(requestRef, { 
      status: 'declined',
      declinedAt: new Date().toISOString() 
    });
    
    setDeclinedRequests(prev => ({ ...prev, [requestId]: Date.now() }));
    
    Alert.alert('Declined', 'Payment request declined. It will reappear after 30 minutes.');
  } catch (error) {
    console.error('Error declining request:', error);
    Alert.alert('Error', 'Failed to decline request. Please try again.');
  }
};

const playNotificationSound = async () => {
  try {
    const { sound: newSound } = await Audio.Sound.createAsync(
      { uri: 'https://cdn.pixabay.com/download/audio/2022/03/15/audio_c2d6c8d5f7.mp3' },
      { shouldPlay: true }
    );
    setSound(newSound);
  } catch (error) {
    console.error('Error playing sound:', error);
  }
};
  const handleLogout = async () => {
    console.log('Logout button pressed!');
    await logout();
  };
useEffect(() => {
  return sound
    ? () => {
        sound.unloadAsync();
      }
    : undefined;
}, [sound]);
  const clientFiles = useMemo(() => {
    return projectFiles.filter(f => f.clientId === clientId);
  }, [projectFiles, clientId]);
  
  const clientPhotos = useMemo(() => {
    return projectFiles.filter(
      f => f.clientId === clientId && f.type === 'photo'
    );
  }, [projectFiles, clientId]);

  const clientStages = useMemo(() => {
  return client?.stages || [];
}, [client]);



 

const totalAmount = useMemo(() => {
  return clientStages.reduce((sum, s) => sum + (s.amount || 0), 0);
}, [clientStages]);

const paidAmount = useMemo(() => {
  return clientStages.reduce(
    (sum, s) => (s.status === 'paid' ? sum + s.amount : sum),
    0
  );
}, [clientStages]);


  const pendingAmount = totalAmount - paidAmount;
  const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: 'home' },
    { key: 'files', label: 'Files', icon: 'folder' },
    { key: 'photos', label: 'Photos', icon: 'image' },
    { key: 'payments', label: 'Payments', icon: 'credit-card' },
    { key: 'appointments', label: 'Schedule', icon: 'calendar' },
  ];

 const handlePickDocument = async () => {
  if (!uploadType || !fileTitle.trim()) {
    Alert.alert('Missing title', 'Please enter a file title');
    return;
  }

  const result = await DocumentPicker.getDocumentAsync({
    type: '*/*', // ✅ ALL FILE TYPES
    multiple: true,
  });

  if (result.canceled) return;

  for (const file of result.assets) {
    const newFile: ProjectFile = {
      id: Date.now().toString(),
      clientId,

      title: fileTitle,
      name: file.name,
      type: uploadType,

      uri: file.uri,
      mimeType: file.mimeType || '',

      uploadedByRole: user?.role!,
      uploadedByName: user?.name || 'Unknown',

      uploadedAt: new Date().toISOString(),
    };

    await addProjectFile(newFile);
  }

  setFileTitle('');
  setUploadType(null);
setShowUploadModal(false);

  Alert.alert('Success', 'File uploaded successfully');
};


  const handleDeleteFile = async (fileId: string) => {
    Alert.alert(
      'Delete File',
      'Are you sure you want to delete this file?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteProjectFile(fileId);
          }
        }
      ]
    );
  };

  const handleDeleteClient = () => {
    if (!client) return;
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}'s project "${client.projectName}"? This will permanently remove all associated payments, files, and appointments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteClient(clientId);
            navigation.goBack();
            Alert.alert('Deleted', 'Client has been removed successfully.');
          },
        },
      ]
    );
  };

  const handlePayNow = (stage: PaymentStage) => {
    setSelectedStageForPayment(stage);
    setShowRazorpayModal(true);
  };

  

  const handleRazorpayFailure = (error: string) => {
    setShowRazorpayModal(false);
    setSelectedStageForPayment(null);
    Alert.alert('Payment Failed', error || 'Your payment could not be processed. Please try again.');
  };

 

  const handleStageAmountChange = (stageId: string, value: string) => {
    const numValue = parseInt(value.replace(/,/g, ''), 10) || 0;
    setEditedStages(prev => ({ 
      ...prev, 
      [stageId]: { ...prev[stageId], amount: numValue } 
    }));
  };

  const handleStageNameChange = (stageId: string, name: string) => {
    setEditedStages(prev => ({ 
      ...prev, 
      [stageId]: { ...prev[stageId], name } 
    }));
  };

  const handleSaveEdits = async () => {
  if (!client) return;

  const updatedStages = client.stages.map(stage => {
    const edited = editedStages[stage.id];
    return {
      ...stage,
      name: edited?.name ?? stage.name,
      amount: edited?.amount ?? stage.amount,
    };
  });

  await updateDoc(doc(db, 'clients', clientId), {
    stages: updatedStages,
  });

  setEditedStages({});
  setIsEditMode(false);
};

const handleStageStatusToggle = async (stage: PaymentStage) => {
  if (!client) return;

  const updatedStages = client.stages.map(s =>
    s.id === stage.id
      ? { ...s, status: s.status === 'paid' ? 'pending' : 'paid' }
      : s
  );

  await updateDoc(doc(db, 'clients', clientId), {
    stages: updatedStages,
  });
};


const handleDeleteStage = async (stageId: string, stageName: string) => {
  Alert.alert(
    'Delete Stage',
    `Delete "${stageName}" stage?`,
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!client) return;

          const updatedStages = client.stages.filter(s => s.id !== stageId);

          await updateDoc(doc(db, 'clients', clientId), {
            stages: updatedStages,
          });
        },
      },
    ]
  );
};

const handleAddNewStage = async () => {
  if (!selectedStage || !newStageAmount || !selectedSiteId || !client) {
    Alert.alert('Missing fields');
    return;
  }

  const site = sites.find(s => s.id === selectedSiteId);

  const newStage: PaymentStage = {
    id: Date.now().toString(),
    name: selectedStage,
    amount: parseInt(newStageAmount, 10),
    status: 'pending',
    siteId: selectedSiteId,
    siteName: site?.projectName || '',
    siteDisplay: siteDisplay || 'show',
  };

  await updateDoc(doc(db, 'clients', clientId), {
    stages: [...client.stages, newStage],
  });

  setSelectedStage('');
  setSelectedSiteId('');
  setSiteDisplay('');
  setNewStageAmount('');
  setShowAddStageModal(false);
};

const handlePaymentOptionSelect = (option: PaymentOption) => {
  setShowPaymentModal(false);
  setShowRazorpayModal(true);
};
const handleRazorpaySuccess = async (paymentData: any) => {
  if (!selectedStageForPayment || !client) return;

  const updatedStages = client.stages.map(s =>
    s.id === selectedStageForPayment.id
      ? { ...s, status: 'paid' }
      : s
  );

  await updateDoc(doc(db, 'clients', clientId), {
    stages: updatedStages,
  });

  await addTransaction({
  id: Date.now().toString(),
  clientId,
  stageId: selectedStageForPayment.id, // ✅ ADD THIS
  amount: selectedStageForPayment.amount,
  method: 'Razorpay',
  date: new Date().toISOString(),
});


  setShowRazorpayModal(false);
  setSelectedStageForPayment(null);

  Alert.alert('Payment Success', 'Stage marked as paid');
};


  const handleCancelEdits = () => {
    setEditedStages({});
    setIsEditMode(false);
  };

  const handleSubmitAppointment = async () => {
    if (!appointmentDate || !appointmentTime || !appointmentReason) {
      Alert.alert('Missing Fields', 'Please fill in all fields.');
      return;
    }

   await addAppointment({
  id: String(Date.now()),
  clientId,
  date: appointmentDate,
  time: appointmentTime,
  reason: appointmentReason,
  status: 'pending',
  archived: false, // ✅ ADD THIS
});


    setAppointmentDate('');
    setAppointmentTime('');
    setAppointmentReason('');
    setShowAppointmentModal(false);
    Alert.alert('Success', 'Appointment request submitted!');
  };

  const DonutChart = ({ size, strokeWidth, progress: chartProgress }: { size: number; strokeWidth: number; progress: number }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - (chartProgress / 100) * circumference;

    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          <G rotation="-90" origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={theme.backgroundSecondary}
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={Colors.light.primary}
              strokeWidth={strokeWidth}
              fill="transparent"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <ThemedText type="h2" style={{ color: Colors.light.primary, fontWeight: '700' }}>{Math.round(chartProgress)}%</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Complete</ThemedText>
        </View>
      </View>
    );
  };
const paidStagesCount = clientStages.filter(s => s.status === 'paid').length;
const pendingStagesCount = clientStages.filter(s => s.status !== 'paid').length;

const nextPendingStage = clientStages.find(s => s.status !== 'paid');

  const lastTransaction = transactions.filter(t => t.clientId === clientId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
      <LinearGradient
        colors={[Colors.light.primary + '15', Colors.light.primary + '05']}
        style={styles.heroCard}
      >
        <View style={styles.heroHeader}>
          <View style={styles.heroInfo}>
            <View style={[styles.statusBadge, { backgroundColor: client?.status === 'active' ? Colors.light.success + '20' : Colors.light.warning + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: client?.status === 'active' ? Colors.light.success : Colors.light.warning }]} />
              <ThemedText type="small" style={{ color: client?.status === 'active' ? Colors.light.success : Colors.light.warning, fontWeight: '600', textTransform: 'capitalize' }}>
                {client?.status}
              </ThemedText>
            </View>
            {isEditMode ? (
              <View style={{ width: '100%' }}>
                <TextInput
                  value={editedProjectName}
                  onChangeText={setEditedProjectName}
                  placeholder="Project name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                />
                <TextInput
                  value={editedClientName}
                  onChangeText={setEditedClientName}
                  placeholder="Client name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, marginTop: Spacing.xs }]}
                />
                <TextInput
                  value={editedOwnerPhone}
                  onChangeText={setEditedOwnerPhone}
                  placeholder="Owner phone (e.g., 919876543210)"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, marginTop: Spacing.xs }]}
                />
              </View>
            ) : (
              <>
                <ThemedText type="h3" style={{ marginTop: Spacing.md }}>{client?.projectName}</ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>{client?.name}</ThemedText>
                
                {/* Only show credentials to the client owner */}
                {isClientOwner && client?.username && client?.password ? (
                  <View style={{ marginTop: Spacing.md, backgroundColor: theme.backgroundSecondary, borderRadius: 10, padding: Spacing.md }}>
                    <ThemedText type="small" style={{ color: theme.textSecondary, fontWeight: '600' }}>Your Login Credentials</ThemedText>
                    <ThemedText type="body" style={{ color: theme.text, marginTop: 2 }}>
                      Username: <ThemedText style={{ fontWeight: 'bold' }}>{client.username}</ThemedText>
                    </ThemedText>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                      <ThemedText type="body" style={{ color: theme.text }}>
                        Password: <ThemedText style={{ fontWeight: 'bold' }}>
                          {showPassword ? client.password : '••••••••'}
                        </ThemedText>
                      </ThemedText>
                      <Pressable 
                        onPress={() => setShowPassword(!showPassword)}
                        style={{ marginLeft: Spacing.sm }}
                      >
                        <Feather name={showPassword ? 'eye-off' : 'eye'} size={16} color={Colors.light.primary} />
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </>
            )}
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Value</ThemedText>
            <ThemedText type="h3" style={{ color: theme.text }}>{totalAmount.toLocaleString()}</ThemedText>
          </View>
          <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.heroStatItem}>
            <ThemedText type="small" style={{ color: Colors.light.success }}>Received</ThemedText>
            <ThemedText type="h3" style={{ color: Colors.light.success }}>{paidAmount.toLocaleString()}</ThemedText>
          </View>
          <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.heroStatItem}>
            <ThemedText type="small" style={{ color: Colors.light.warning }}>Pending</ThemedText>
            <ThemedText type="h3" style={{ color: Colors.light.warning }}>{pendingAmount.toLocaleString()}</ThemedText>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.insightsRow}>
        <View style={[styles.insightCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.insightIconBg, { backgroundColor: Colors.light.success + '15' }]}>
            <Feather name="check-circle" size={20} color={Colors.light.success} />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>{paidStagesCount}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Paid Stages</ThemedText>
        </View>
        <View style={[styles.insightCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.insightIconBg, { backgroundColor: Colors.light.warning + '15' }]}>
            <Feather name="clock" size={20} color={Colors.light.warning} />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>{pendingStagesCount}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Pending</ThemedText>
        </View>
        <View style={[styles.insightCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.insightIconBg, { backgroundColor: Colors.light.primary + '15' }]}>
            <Feather name="folder" size={20} color={Colors.light.primary} />
          </View>
          <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>{clientFiles.length}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Files</ThemedText>
        </View>
      </View>

      {nextPendingStage ? (
        <View style={[styles.nextMilestoneCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.milestoneHeader}>
            <View style={[styles.milestoneIconBg, { backgroundColor: Colors.light.warning + '15' }]}>
              <Feather name="target" size={18} color={Colors.light.warning} />
            </View>
            <ThemedText type="body" style={{ fontWeight: '600', marginLeft: Spacing.sm }}>Next Milestone</ThemedText>
          </View>
          <View style={styles.milestoneContent}>
            <View>
              <ThemedText type="h4">{nextPendingStage.name}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Stage {clientStages.indexOf(nextPendingStage) + 1} of {clientStages.length}
              </ThemedText>
            </View>
            <View style={styles.milestoneAmount}>
              <ThemedText type="h3" style={{ color: Colors.light.primary }}>{nextPendingStage.amount.toLocaleString()}</ThemedText>
            </View>
          </View>
        </View>
      ) : null}

      {lastTransaction ? (
        <View style={[styles.activityCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.activityHeader}>
            <View style={[styles.activityIconBg, { backgroundColor: Colors.light.success + '15' }]}>
              <Feather name="activity" size={18} color={Colors.light.success} />
            </View>
            <ThemedText type="body" style={{ fontWeight: '600', marginLeft: Spacing.sm }}>Last Activity</ThemedText>
          </View>
          <View style={styles.activityContent}>
            <View style={styles.activityItem}>
              <Feather name="check" size={14} color={Colors.light.success} />
              <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>
                Payment of {lastTransaction.amount.toLocaleString()} via {lastTransaction.method}
              </ThemedText>
            </View>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs, marginLeft: Spacing.xl }}>
              {new Date(lastTransaction.date).toLocaleDateString()}
            </ThemedText>
          </View>
        </View>
      ) : null}

      <View style={[styles.timelineCard, { backgroundColor: theme.backgroundDefault }]}>
        <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.md }}>Project Timeline</ThemedText>
        {clientStages.map((stage, index) => (
          <View key={stage.id} style={styles.timelineItem}>
          

<View style={styles.timelineLeft}>
  <View style={[
    styles.timelineNode,
    { backgroundColor: stage.status === 'paid' ? Colors.light.success : theme.backgroundSecondary }
  ]}>
    {stage.status === 'paid' ? (
      <Feather name="check" size={12} color="#FFFFFF" />
    ) : (
      <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>
        {index + 1}
      </ThemedText>
    )}
  </View>   {/* ✅ THIS WAS MISSING */}

  <View
    style={[
      styles.timelineLine,
      { backgroundColor: stage.status === 'paid' ? Colors.light.success : theme.border },
    ]}
  />


              
            </View>
            <View style={styles.timelineContent}>
              <ThemedText
  type="body"
  style={{
    fontWeight: stage.status === 'paid' ? '600' : '400',
    color: stage.status === 'paid' ? theme.text : theme.textSecondary,
  }}
>
  {stage.name}
</ThemedText>

            {stage.status === 'paid' ? (
  <View style={styles.timelineStatus}>
    <Feather name="check-circle" size={12} color={Colors.light.success} />
    <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: Spacing.xs }}>
      Completed
    </ThemedText>
  </View>
) : (
  <View style={styles.timelineStatus}>
    <Feather name="clock" size={12} color={Colors.light.warning} />
    <ThemedText type="small" style={{ color: Colors.light.warning, marginLeft: Spacing.xs }}>
      Pending
    </ThemedText>
  </View>
)}

            </View>
          </View>
        ))}
      </View>

      {canEdit ? (
        <Pressable
          onPress={handleDeleteClient}
          style={[styles.deleteClientBtn, { backgroundColor: Colors.light.error + '15' }]}
        >
          <Feather name="trash-2" size={18} color={Colors.light.error} />
          <ThemedText type="body" style={{ color: Colors.light.error, marginLeft: Spacing.sm }}>
            Delete Client
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

 const renderFilesTab = () => {
  const plans = clientFiles.filter(f => f.type === 'plan');
  const agreements = clientFiles.filter(f => f.type === 'agreement');

  return (
    <View style={styles.tabContent}>
      <View style={styles.fileSection}>
        <View style={styles.fileSectionHeader}>
          <ThemedText type="body" style={{ fontWeight: '600' }}>Plans</ThemedText>
          {canEdit ? (
            <Pressable
              onPress={() => {
                setUploadType('plan');
                setShowUploadModal(true);
              }}
              style={styles.uploadButton}
            >
              <Feather name="plus" size={18} color={Colors.light.primary} />
              <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs }}>Add</ThemedText>
            </Pressable>
          ) : null}
        </View>
        {plans.length === 0 ? (
          <View style={[styles.emptyFileCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="file-text" size={24} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>No plans</ThemedText>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fileScroll}>
            {plans.map(file => (
              <Pressable
                key={file.id}
                onPress={() => { 
                  setSelectedFile(file); 
                  setShowPreviewModal(true); 
                }}
                style={[styles.fileCard, { backgroundColor: theme.backgroundDefault }]}
              >
                {file.mimeType?.startsWith('image') ? (
                  <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                ) : (
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                    <Feather name="file-text" size={32} color={theme.textSecondary} />
                    <ThemedText
                      type="small"
                      style={{ marginTop: 8, textAlign: 'center' }}
                      numberOfLines={2}
                    >
                      {file.title}
                    </ThemedText>
                  </View>
                )}
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.fileSection}>
        <View style={styles.fileSectionHeader}>
          <ThemedText type="body" style={{ fontWeight: '600' }}>Agreements</ThemedText>
          {canEdit ? (
            <Pressable
              onPress={() => {
                setUploadType('agreement');
                setShowUploadModal(true);
              }}
              style={styles.uploadButton}
            >
              <Feather name="plus" size={18} color={Colors.light.primary} />
              <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs }}>Add</ThemedText>
            </Pressable>
          ) : null}
        </View>
        {agreements.length === 0 ? (
          <View style={[styles.emptyFileCard, { backgroundColor: theme.backgroundDefault }]}>
            <Feather name="file" size={24} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>No agreements</ThemedText>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fileScroll}>
            {agreements.map(file => (
              <Pressable
                key={file.id}
                onPress={() => { 
                  setSelectedFile(file); 
                  setShowPreviewModal(true);
                }}
                style={[styles.fileCard, { backgroundColor: theme.backgroundDefault }]}
              >
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 8 }}>
                  <Feather name="file-text" size={32} color={theme.textSecondary} />
                  <ThemedText 
                    type="small" 
                    numberOfLines={2} 
                    style={{ marginTop: 8, textAlign: 'center' }}
                  >
                    {file.title}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
};

  const renderPhotosTab = () => (
    <View style={styles.tabContent}>
      {canEdit && (
        <Pressable
      onPress={() => {
  setUploadType('photo');
  setShowUploadModal(true);
}}


          style={styles.uploadButton}
        >
          <Feather name="plus" size={18} color={Colors.light.primary} />
          <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs }}>
            Add Photos
          </ThemedText>
        </Pressable>
      )}

      {clientPhotos.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="image" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            No photos uploaded
          </ThemedText>
        </View>
      ) : (
       <View style={styles.photosGrid}>
  {clientPhotos.map(photo => (
    <Pressable
      key={photo.id}
      onPress={() => {
        setSelectedFile(photo);
        setShowPreviewModal(true);
      }}
      style={styles.photoCard}
    >
      <Image source={{ uri: photo.uri }} style={styles.photoImage} />
      {canEdit && (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleDeleteFile(photo.id);
          }}
          style={styles.deleteButton}
        >
          <Feather name="x" size={12} color="#fff" />
        </Pressable>
      )}
    </Pressable>
  ))}
</View>
      )}
    </View>
  );

  const renderPaymentsTab = () => {
    return (
      <View style={styles.tabContent}>
        {canEdit ? (
          <View style={styles.editModeToggle}>
            {isEditMode ? (
              <View style={styles.editModeActions}>
                <Pressable onPress={handleCancelEdits} style={[styles.editModeButton, { backgroundColor: theme.backgroundSecondary }]}>
                  <Feather name="x" size={16} color={theme.text} />
                  <ThemedText type="small" style={{ marginLeft: Spacing.xs }}>Cancel</ThemedText>
                </Pressable>
                <Pressable onPress={handleSaveEdits} style={[styles.editModeButton, { backgroundColor: Colors.light.primary }]}>
                  <Feather name="check" size={16} color="#FFFFFF" />
                  <ThemedText type="small" style={{ color: '#FFFFFF', marginLeft: Spacing.xs }}>Save</ThemedText>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setIsEditMode(true)} style={[styles.editModeButton, { backgroundColor: theme.backgroundDefault }]}>
                <Feather name="edit-2" size={16} color={Colors.light.primary} />
                <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs }}>Edit</ThemedText>
              </Pressable>
            )}
          </View>
        ) : null}

        <View style={[styles.paymentSummary, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.paymentSummaryRow}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>Total Project</ThemedText>
            <ThemedText type="h4">{totalAmount.toLocaleString()}</ThemedText>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.paymentSummaryRow}>
            <ThemedText type="body" style={{ color: Colors.light.success }}>Paid Amount</ThemedText>
            <ThemedText type="h4" style={{ color: Colors.light.success }}>{paidAmount.toLocaleString()}</ThemedText>
          </View>
          <View style={styles.paymentSummaryRow}>
            <ThemedText type="body" style={{ color: Colors.light.warning }}>Pending Amount</ThemedText>
            <ThemedText type="h4" style={{ color: Colors.light.warning }}>{pendingAmount.toLocaleString()}</ThemedText>
          </View>
          <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary, marginTop: Spacing.md }]}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
          <ThemedText type="small" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.sm }}>
            {Math.round(progress)}% Complete
          </ThemedText>
        </View>

        <View style={styles.stageHeaderRow}>
          <ThemedText type="body" style={{ fontWeight: '600' }}>
            Stage-wise Payments
          </ThemedText>
          {isEditMode ? (
            <Pressable onPress={() => setShowAddStageModal(true)} style={[styles.addStageButton, { backgroundColor: Colors.light.primary }]}>
              <Feather name="plus" size={16} color="#FFFFFF" />
              <ThemedText type="small" style={{ color: '#FFFFFF', marginLeft: Spacing.xs }}>Add Stage</ThemedText>
            </Pressable>
          ) : null}
        </View>

        {clientStages.map((stage, index) => {
          const edited = editedStages[stage.id];
          const currentName = edited?.name !== undefined ? edited.name : stage.name;
          const currentAmount = edited?.amount !== undefined ? edited.amount : stage.amount;
          const currentIsPaid = stage.status === 'paid';


          return (
            <View key={stage.id} style={[styles.paymentStageCard, { backgroundColor: theme.backgroundDefault }]}>
              <View style={styles.paymentStageHeader}>
                <View style={styles.paymentStageTitle}>
                  <View style={[styles.stageIndicator, { backgroundColor: currentIsPaid ? Colors.light.success : Colors.light.warning }]} />
                  {isEditMode ? (
                    <TextInput
                      style={[styles.stageNameInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                      value={currentName}
                      onChangeText={(value) => handleStageNameChange(stage.id, value)}
                      placeholder="Stage name"
                      placeholderTextColor={theme.textSecondary}
                    />
                  ) : (
                    <ThemedText type="body" style={{ fontWeight: '600' }}>Stage {index + 1}: {stage.name}</ThemedText>
                  )}
                </View>
                {isEditMode ? (
                  <View style={styles.editStageActions}>
                    <Pressable
                      onPress={() => handleStageStatusToggle(stage)}
                      style={[
                        styles.statusToggleButton,
                        { backgroundColor: currentIsPaid ? Colors.light.success + '15' : Colors.light.warning + '15' }
                      ]}
                    >
                      <Feather name={currentIsPaid ? 'check-circle' : 'circle'} size={14} color={currentIsPaid ? Colors.light.success : Colors.light.warning} />
                      <ThemedText type="small" style={{ color: currentIsPaid ? Colors.light.success : Colors.light.warning, marginLeft: Spacing.xs }}>
                        {currentIsPaid ? 'Paid' : 'Pending'}
                      </ThemedText>
                    </Pressable>
                    <Pressable onPress={() => handleDeleteStage(stage.id, stage.name)} style={styles.deleteStageButton}>
                      <Feather name="trash-2" size={16} color={Colors.light.error} />
                    </Pressable>
                  </View>
                ) : (
                <Pressable
  onPress={() => handleStageStatusToggle(stage)}
  style={[
    styles.statusPill,
    {
      backgroundColor:
        stage.status === 'paid'
          ? Colors.light.success + '15'
          : Colors.light.warning + '15',
    },
  ]}
>
  <ThemedText
    type="small"
    style={{
      color:
        stage.status === 'paid'
          ? Colors.light.success
          : Colors.light.warning,
      fontWeight: '600',
    }}
  >
    {stage.status === 'paid' ? 'Completed' : 'Pending'}
  </ThemedText>
</Pressable>

                )}
              </View>

              <View style={styles.paymentStageContent}>
                {isEditMode ? (
                  <View style={styles.editAmountContainer}>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Amount</ThemedText>
                    <TextInput
                      style={[styles.amountInput, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                      value={currentAmount.toString()}
                      onChangeText={(value) => handleStageAmountChange(stage.id, value)}
                      keyboardType="numeric"
                    />
                  </View>
                ) : (
                  <View>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>Amount</ThemedText>
                    <ThemedText type="h3" style={{ color: Colors.light.primary }}>{currentAmount.toLocaleString()}</ThemedText>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderAppointmentsTab = () => (
    <View style={styles.tabContent}>
      {clientAppointments.length > 0 ? (
        clientAppointments.map(apt => (
          <View key={apt.id} style={[styles.appointmentCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.appointmentInfo}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>{apt.reason}</ThemedText>
              <View style={styles.appointmentMeta}>
                <Feather name="calendar" size={14} color={theme.textSecondary} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                  {apt.date}
                </ThemedText>
                <Feather name="clock" size={14} color={theme.textSecondary} style={{ marginLeft: Spacing.md }} />
                <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
                  {apt.time}
                </ThemedText>
              </View>
            </View>
            <View style={[
              styles.statusPill,
              { backgroundColor: apt.status === 'accepted' ? Colors.light.success + '15' : apt.status === 'declined' ? Colors.light.error + '15' : Colors.light.warning + '15' }
            ]}>
              <ThemedText
                type="small"
                style={{
                  color: apt.status === 'accepted' ? Colors.light.success : apt.status === 'declined' ? Colors.light.error : Colors.light.warning,
                  textTransform: 'capitalize',
                  fontWeight: '600'
                }}
              >
                {apt.status}
              </ThemedText>
            </View>
          </View>
        ))
      ) : (
        <View style={styles.emptyState}>
          <Feather name="calendar" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            No appointments scheduled
          </ThemedText>
        </View>
      )}

      <Button onPress={() => setShowAppointmentModal(true)} style={{ marginTop: Spacing.lg }}>
        Request Appointment
      </Button>
    </View>
  );

if (loadingClient) {
  return (
    <ThemedView style={[styles.container, styles.centered]}>
      <ThemedText>Loading client...</ThemedText>
    </ThemedView>
  );
}

if (!client) {
  return (
    <ThemedView style={[styles.container, styles.centered]}>
      <ThemedText>Client not found</ThemedText>
    </ThemedView>
  );
}


  return (
    <ThemedView style={styles.container}>
      <View style={[styles.appHeader, { 
        backgroundColor: theme.backgroundDefault,
        paddingTop: insets.top,
        borderBottomColor: theme.border 
      }]}>
        <View style={styles.appHeaderContent}>
          <View style={styles.userInfo}>
            <View style={[styles.userAvatar, { backgroundColor: Colors.light.primary + '20' }]}>
              <ThemedText type="body" style={{ color: Colors.light.primary, fontWeight: '700' }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </ThemedText>
            </View>
            <View style={styles.userDetails}>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>Logged in as</ThemedText>
              <ThemedText type="body" style={{ fontWeight: '600' }}>{user?.name || 'User'}</ThemedText>
            </View>
          </View>

          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Feather name="log-out" size={20} color={Colors.light.error} />
          </Pressable>
        </View>
      </View>

      <View style={[styles.tabBar, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
        {tabs.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[
              styles.tab,
              activeTab === tab.key && styles.activeTab
            ]}
          >
            <Feather
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? Colors.light.primary : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: activeTab === tab.key ? Colors.light.primary : theme.textSecondary,
                marginTop: Spacing.xs,
                fontWeight: activeTab === tab.key ? '600' : '400'
              }}
            >
              {tab.label}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Request Notifications */}
  {isClientOwner && activePaymentRequests.length > 0 && (
    <View style={styles.notificationsContainer}>
      {activePaymentRequests.map((request) => (
        <Animated.View
          key={request.id}
          entering={FadeInDown}
          exiting={FadeOutUp}
          style={[
            styles.notificationBanner,
            {
              borderLeftColor: Colors.light.warning,
              backgroundColor: theme.backgroundDefault,
            },
          ]}
        >
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <Feather name="alert-circle" size={18} color={Colors.light.warning} />
              <ThemedText
                type="body"
                style={{
                  fontWeight: '600',
                  color: Colors.light.warning,
                  marginLeft: 8,
                }}
              >
                Payment Request
              </ThemedText>
            </View>

            <ThemedText type="small" style={{ color: theme.text, marginTop: 4 }}>
              {request.message}
            </ThemedText>

            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 4 }}>
              From: {request.sentBy} • {new Date(request.createdAt).toLocaleDateString()}
            </ThemedText>

            <View style={styles.notificationActions}>
              <Pressable 
                onPress={() => handleAcceptPaymentRequest(request.id)}
                style={[styles.actionButton, { backgroundColor: Colors.light.success }]}
              >
                <Feather name="check" size={16} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: '#FFFFFF', marginLeft: 6, fontWeight: '600' }}>
                  Accept
                </ThemedText>
              </Pressable>

              <Pressable 
                onPress={() => handleDeclinePaymentRequest(request.id)}
                style={[styles.actionButton, { backgroundColor: Colors.light.error }]}
              >
                <Feather name="x" size={16} color="#FFFFFF" />
                <ThemedText type="small" style={{ color: '#FFFFFF', marginLeft: 6, fontWeight: '600' }}>
                  Decline
                </ThemedText>
              </Pressable>
            </View>
          </View>

          <Pressable onPress={() => handleDismissPaymentRequest(request.id)} style={{ marginLeft: 8 }}>
            <Feather name="x" size={18} color={theme.textSecondary} />
          </Pressable>
        </Animated.View>
      ))}
    </View>
  )}
       {notificationAppointments.length > 0 && (
  <View style={styles.notificationsContainer}>
    {notificationAppointments.map((apt) => (
   <Animated.View
  key={apt.id}
  entering={FadeInDown}
  exiting={FadeOutUp}
  style={[
    styles.notificationBanner,
    {
      borderLeftColor:
        apt.status === 'accepted'
          ? Colors.light.success
          : Colors.light.error,
      backgroundColor: theme.backgroundDefault,
    },
  ]}
>
  <View style={{ flex: 1 }}>
    <ThemedText
      type="body"
      style={{
        fontWeight: '600',
        color:
          apt.status === 'accepted'
            ? Colors.light.success
            : Colors.light.error,
      }}
    >
      {apt.status === 'accepted'
        ? 'Appointment Accepted'
        : 'Appointment Declined'}
    </ThemedText>

    <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
      {apt.status === 'accepted'
        ? 'Your appointment request has been accepted.'
        : 'Your appointment request has been declined.'}
    </ThemedText>

    <ThemedText type="small" style={{ marginTop: 4 }}>
      {apt.date} • {apt.time}
    </ThemedText>
  </View>

  <Pressable onPress={() => handleDismissNotification(apt.id)}>
    <Feather name="x" size={18} color={theme.textSecondary} />
  </Pressable>
</Animated.View>


    ))}
  </View>
)}

        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'files' && renderFilesTab()}
        {activeTab === 'payments' && renderPaymentsTab()}
        {activeTab === 'appointments' && renderAppointmentsTab()}
        {activeTab === 'photos' && renderPhotosTab()}
      </ScrollView>
<Modal
  visible={showUploadModal && !!uploadType}

  transparent
  animationType="slide"
  onRequestClose={() => setShowUploadModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={{ backgroundColor: '#fff', padding: 20, borderRadius: 12, width: '90%' }}>
      
      <ThemedText type="body" style={{ fontWeight: '600', marginBottom: 10 }}>
        Enter File Title
      </ThemedText>

      <TextInput
        value={fileTitle}
        onChangeText={setFileTitle}
        placeholder="Eg: Ground Floor Plan"
        style={[
          styles.input,
          { backgroundColor: '#f5f5f5', marginBottom: 16 }
        ]}
      />

      <Button onPress={handlePickDocument}>
        Select File
      </Button>

     <Button
  onPress={() => setShowUploadModal(false)}
  style={{ marginTop: 10 }}
  variant="secondary"
>
  Cancel
</Button>


    </View>
  </View>
</Modal>

 <Modal
  visible={showPreviewModal}
  animationType="fade"
  transparent
  onRequestClose={() => setShowPreviewModal(false)}
>
  <View style={styles.modalOverlay}>
    <Pressable 
      style={StyleSheet.absoluteFill}
      onPress={() => setShowPreviewModal(false)}
    />
    
    <View style={styles.filePreviewContainer}>
      {/* Header */}
      <View style={styles.filePreviewHeader}>
        <Pressable 
          onPress={() => setShowPreviewModal(false)}
          style={styles.closeButton}
        >
          <Feather name="x" size={24} color={theme.text} />
        </Pressable>
        
        <View style={styles.fileTitleContainer}>
          <Feather name="file" size={18} color={Colors.light.primary} />
          <ThemedText 
            type="body" 
            style={{ fontWeight: '600', marginLeft: Spacing.sm, flex: 1 }} 
            numberOfLines={1}
          >
            {selectedFile?.title || 'File Preview'}
          </ThemedText>
        </View>
        
        {canEdit && selectedFile && (
          <Pressable
            onPress={() => {
              console.log('Delete button pressed!');
              setShowDeleteConfirm(true);
            }}
            style={styles.deleteButtonHeader}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="trash-2" size={20} color={Colors.light.error} />
          </Pressable>
        )}
      </View>

      {/* Delete Confirmation Overlay */}
      {showDeleteConfirm && (
        <View style={styles.deleteConfirmOverlay}>
          <View style={styles.deleteConfirmBox}>
            <Feather name="alert-circle" size={48} color={Colors.light.error} />
            <ThemedText type="h4" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
              Delete File?
            </ThemedText>
            <ThemedText type="body" style={{ marginTop: Spacing.sm, textAlign: 'center', color: theme.textSecondary }}>
              Are you sure you want to delete "{selectedFile?.title}"? This action cannot be undone.
            </ThemedText>
            
            <View style={styles.deleteConfirmActions}>
              <Pressable
                onPress={() => setShowDeleteConfirm(false)}
                style={[styles.deleteConfirmButton, { backgroundColor: theme.backgroundSecondary }]}
              >
                <ThemedText type="body" style={{ fontWeight: '600' }}>Cancel</ThemedText>
              </Pressable>
              
              <Pressable
              onPress={async () => {
  if (!selectedFile) return;

  await deleteProjectFile(selectedFile.id);

  setShowDeleteConfirm(false);
  setShowPreviewModal(false);
  setSelectedFile(null); // 🔥 THIS WAS MISSING
}}

                style={[styles.deleteConfirmButton, { backgroundColor: Colors.light.error }]}
              >
                <ThemedText type="body" style={{ color: '#FFFFFF', fontWeight: '600' }}>Delete</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* File content */}
      <ScrollView style={styles.filePreviewContent} contentContainerStyle={{ flexGrow: 1 }}>
        {selectedFile?.mimeType?.startsWith('image') ? (
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: selectedFile.uri }} 
              style={styles.previewImage}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View style={styles.nonImageContainer}>
            <View style={styles.fileIconContainer}>
              <Feather name="file-text" size={80} color={Colors.light.primary} />
            </View>
            <ThemedText type="h4" style={{ marginTop: Spacing.lg, textAlign: 'center' }}>
              {selectedFile?.title}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs, textAlign: 'center' }}>
              {selectedFile?.mimeType || 'Document'}
            </ThemedText>
            <Pressable
              onPress={() => {
                Linking.openURL(selectedFile?.uri || '');
              }}
              style={{
                marginTop: Spacing.xl,
                paddingHorizontal: Spacing.xl,
                paddingVertical: Spacing.md,
                backgroundColor: Colors.light.primary,
                borderRadius: BorderRadius.md,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              <Feather name="external-link" size={18} color="#FFFFFF" />
              <ThemedText type="body" style={{ color: '#FFFFFF', marginLeft: Spacing.sm, fontWeight: '600' }}>
                Open File
              </ThemedText>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* Footer info */}
      <View style={styles.filePreviewFooter}>
        <View style={styles.footerItem}>
          <Feather name="user" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
            {selectedFile?.uploadedByName}
          </ThemedText>
        </View>
        <View style={styles.footerItem}>
          <Feather name="calendar" size={14} color={theme.textSecondary} />
          <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}>
            {selectedFile?.uploadedAt ? new Date(selectedFile.uploadedAt).toLocaleDateString() : 'N/A'}
          </ThemedText>
        </View>
      </View>
    </View>
  </View>
</Modal>

      <Modal
        visible={showPaymentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <ThemedView style={styles.paymentModalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowPaymentModal(false)}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Select Payment Method</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView contentContainerStyle={styles.paymentOptionsContainer}>
            {selectedStageForPayment ? (
              <View style={[styles.paymentAmountCard, { backgroundColor: theme.backgroundDefault }]}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>Amount to Pay</ThemedText>
                <ThemedText type="h2" style={{ color: Colors.light.primary }}>{selectedStageForPayment.amount.toLocaleString()}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                  {selectedStageForPayment.name}
                </ThemedText>
              </View>
            ) : null}

            <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.md }}>UPI Options</ThemedText>
            <View style={styles.paymentGrid}>
              {PAYMENT_OPTIONS.filter(o => o.type === 'upi').map(option => (
                <Pressable
                  key={option.id}
                  onPress={() => handlePaymentOptionSelect(option)}
                  style={[styles.paymentOptionCard, { backgroundColor: theme.backgroundDefault }]}
                >
                  <View style={[styles.paymentOptionIcon, { backgroundColor: Colors.light.primary + '15' }]}>
                    <Feather name={option.icon} size={24} color={Colors.light.primary} />
                  </View>
                  <ThemedText type="small" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>{option.name}</ThemedText>
                </Pressable>
              ))}
            </View>

            <ThemedText type="body" style={{ fontWeight: '600', marginTop: Spacing.xl, marginBottom: Spacing.md }}>Banking Options</ThemedText>
            <View style={styles.paymentGrid}>
              {PAYMENT_OPTIONS.filter(o => o.type === 'bank').map(option => (
                <Pressable
                  key={option.id}
                  onPress={() => handlePaymentOptionSelect(option)}
                  style={[styles.paymentOptionCard, { backgroundColor: theme.backgroundDefault }]}
                >
                  <View style={[styles.paymentOptionIcon, { backgroundColor: Colors.light.success + '15' }]}>
                    <Feather name={option.icon} size={24} color={Colors.light.success} />
                  </View>
                  <ThemedText type="small" style={{ marginTop: Spacing.sm, textAlign: 'center' }}>{option.name}</ThemedText>
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </ThemedView>
      </Modal>

      <Modal
        visible={showAppointmentModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAppointmentModal(false)}
      >
        <ThemedView style={styles.appointmentModalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowAppointmentModal(false)}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Request Appointment</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.appointmentForm, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Date</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={appointmentDate}
                onChangeText={setAppointmentDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Time</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={appointmentTime}
                onChangeText={setAppointmentTime}
                placeholder="HH:MM AM/PM"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Reason</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={appointmentReason}
                onChangeText={setAppointmentReason}
                placeholder="Describe the reason for appointment"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <Button onPress={handleSubmitAppointment} style={{ marginTop: Spacing.xl }}>
              Submit Request
            </Button>
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
      </Modal>

     <Modal
  visible={showAddStageModal}
  animationType="slide"
  presentationStyle="pageSheet"
  onRequestClose={() => setShowAddStageModal(false)}
>
  <ThemedView style={styles.appointmentModalContainer}>
    <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
      <Pressable onPress={() => setShowAddStageModal(false)}>
        <ThemedText type="body" style={{ color: Colors.light.primary }}>
          Cancel
        </ThemedText>
      </Pressable>
      <ThemedText type="body" style={{ fontWeight: '600' }}>
        Add New Stage
      </ThemedText>
      <View style={{ width: 50 }} />
    </View>

    <KeyboardAwareScrollViewCompat contentContainerStyle={styles.appointmentForm}>

  <View style={[styles.stageFormCard, { backgroundColor: theme.backgroundDefault }]}>

    {/* Stage */}
    <View style={styles.inputGroup}>
      <ThemedText type="small" style={styles.label}>Stage</ThemedText>
      <View style={[styles.pickerWrapper, { borderColor: theme.border }]}>
        <Feather name="layers" size={18} color={theme.textSecondary} />
        <Picker
          selectedValue={selectedStage}
          onValueChange={setSelectedStage}
          style={styles.picker}
        >
          <Picker.Item label="Select Stage" value="" />
          {STAGE_OPTIONS.map(stage => (
            <Picker.Item key={stage} label={stage} value={stage} />
          ))}
        </Picker>
      </View>
    </View>

    {/* Site */}
    <View style={styles.inputGroup}>
      <ThemedText type="small" style={styles.label}>Site</ThemedText>
      <View style={[styles.pickerWrapper, { borderColor: theme.border }]}>
        <Feather name="map-pin" size={18} color={theme.textSecondary} />
        <Picker
          selectedValue={selectedSiteId}
          onValueChange={setSelectedSiteId}
          style={styles.picker}
        >
          <Picker.Item label="Select Site" value="" />
          {sites.map(site => (
            <Picker.Item
              key={site.id}
              label={site.projectName}
              value={site.id}
            />
          ))}
        </Picker>
      </View>
    </View>

    {/* Amount */}
    <View style={styles.inputGroup}>
      <ThemedText type="small" style={styles.label}>Amount</ThemedText>
      <View style={[styles.inputWithIcon, { borderColor: theme.border }]}>
        <Feather name="credit-card" size={18} color={theme.textSecondary} />
        <TextInput
          style={[styles.amountInputField, { color: theme.text }]}
          value={newStageAmount}
          onChangeText={setNewStageAmount}
          keyboardType="numeric"
          placeholder="Enter amount"
          placeholderTextColor={theme.textSecondary}
        />
      </View>
    </View>

  </View>

  <Button
    onPress={handleAddNewStage}
    style={styles.primaryActionButton}
  >
    Add Stage
  </Button>

</KeyboardAwareScrollViewCompat>

  </ThemedView>
</Modal>


      {selectedStageForPayment && client ? (
        <RazorpayPayment
          visible={showRazorpayModal}
          onClose={() => {
            setShowRazorpayModal(false);
            setSelectedStageForPayment(null);
          }}
          amount={selectedStageForPayment.amount}
          clientName={client.name}
          stageName={selectedStageForPayment.name}
          clientId={clientId}
          stageId={selectedStageForPayment.id}
          userId={user?.name || 'user'}
          onPaymentSuccess={handleRazorpaySuccess}
          onPaymentFailure={handleRazorpayFailure}
        />
      ) : null}
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
  appHeader: {
    borderBottomWidth: 1,
  },
  appHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: Spacing.md,
  },
  userAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  logoutButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  header: {
    padding: Spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.light.primary,
  },
  tabContent: {
    padding: Spacing.lg,
  },
  summaryCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  progressCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    marginVertical: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryItem: {
    flex: 1,
  },
  progressBar: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.light.success,
    borderRadius: 4,
  },
  stageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  stageNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.light.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  stageInfo: {
    flex: 1,
  },
  stageStatusBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileSection: {
    marginBottom: Spacing.xl,
  },
  fileSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  fileScroll: {
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  emptyFileCard: {
    height: 100,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileCard: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginRight: Spacing.md,
  },
  fileThumbnail: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.light.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editModeToggle: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: Spacing.lg,
  },
  editModeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  editModeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  paymentSummary: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  paymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  paymentStageCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  paymentStageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  paymentStageTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  paymentStageContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  editAmountContainer: {
    flex: 1,
  },
  amountInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 18,
    fontWeight: '600',
    marginTop: Spacing.xs,
  },
  stageNameInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 14,
    fontWeight: '500',
  },
  stageHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.xl,
    marginBottom: Spacing.md,
  },
  addStageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  editStageActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  deleteStageButton: {
    padding: Spacing.xs,
  },
  payNowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  appointmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  appointmentInfo: {
    flex: 1,
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  paymentModalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  paymentOptionsContainer: {
    padding: Spacing.lg,
  },
  paymentAmountCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  paymentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  paymentOptionCard: {
    width: '30%',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  paymentOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appointmentModalContainer: {
    flex: 1,
  },
  appointmentForm: {
    padding: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
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
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
  },
  deleteClientBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
  },
  heroCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xl,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatDivider: {
    width: 1,
    height: '100%',
  },
  insightsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  insightCard: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  insightIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextMilestoneCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  milestoneIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  milestoneContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  milestoneAmount: {
    alignItems: 'flex-end',
  },
  activityCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  activityIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {},
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  timelineNode: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginTop: Spacing.xs,
  },
  timelineContent: {
    flex: 1,
    paddingBottom: Spacing.md,
  },
  timelineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  photoCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  notificationsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  notificationBanner: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  notificationActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  stageFormCard: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  pickerWrapper: {
    height: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  picker: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  inputWithIcon: {
    height: 52,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
  },
  amountInputField: {
    flex: 1,
    fontSize: 16,
    marginLeft: Spacing.sm,
  },
  primaryActionButton: {
    marginTop: Spacing.md,
    borderRadius: BorderRadius.md,
    height: 52,
    justifyContent: 'center',
  },
  fileActionRow: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    flexDirection: 'row',
    gap: 6,
  },
  iconBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 3,
  },
  // File Preview Modal Styles
  filePreviewContainer: {
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  filePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: '#F5F5F5',
  },
  fileTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: Spacing.md,
  },
  deleteButtonHeader: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.error + '10',
  },
  filePreviewContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    flex: 1,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    borderRadius: BorderRadius.md,
  },
  nonImageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  fileIconContainer: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.light.primary + '10',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filePreviewFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FAFAFA',
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteConfirmOverlay: {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
},
deleteConfirmBox: {
  backgroundColor: '#FFFFFF',
  borderRadius: BorderRadius.lg,
  padding: Spacing.xl,
  width: '80%',
  maxWidth: 400,
  alignItems: 'center',
},
deleteConfirmActions: {
  flexDirection: 'row',
  gap: Spacing.md,
  marginTop: Spacing.xl,
  width: '100%',
},
deleteConfirmButton: {
  flex: 1,
  paddingVertical: Spacing.md,
  borderRadius: BorderRadius.md,
  alignItems: 'center',
},
});