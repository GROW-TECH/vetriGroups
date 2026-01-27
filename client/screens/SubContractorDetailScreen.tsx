import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Alert, Modal, TextInput, Image, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, G } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { SubContractor, SubContractorFile, PaymentStage, Appointment, Transaction } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type RouteProps = RouteProp<RootStackParamList, 'SubContractorDetail'>;
type NavProp = NativeStackNavigationProp<RootStackParamList>;

type TabType = 'overview' | 'files' | 'photos' | 'payments';

export default function SubContractorDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProps>();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    subContractors,
    subContractorFiles,
    paymentStages,
    transactions,
    appointments,
    addSubContractorFile,
    deleteSubContractorFile,
    updatePaymentStage,
    addPaymentStage,
    deletePaymentStage,
    addTransaction,
    addAppointment,
    deleteSubContractor,
  } = useData();

  const { subContractorId } = route.params;
  const subContractor = subContractors.find(c => c.id === subContractorId);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedStages, setEditedStages] = useState<Record<string, { name?: string; amount?: number; isPaid?: boolean }>>({});
  const [showAddStageModal, setShowAddStageModal] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [newStageAmount, setNewStageAmount] = useState('');
  const [showFileModal, setShowFileModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<SubContractorFile | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [appointmentTime, setAppointmentTime] = useState('');
  const [appointmentReason, setAppointmentReason] = useState('');

  // editable fields
  const [editedCompanyName, setEditedCompanyName] = useState(subContractor?.companyName || '');
  const [editedContactPerson, setEditedContactPerson] = useState(subContractor?.contactPerson || '');
  const [editedPhone, setEditedPhone] = useState(subContractor?.phone || '');
  const [editedWorkType, setEditedWorkType] = useState(subContractor?.workType || '');
  const [editedSpecialization, setEditedSpecialization] = useState(subContractor?.specialization || '');

  const canEdit = user?.role === 'admin' || user?.role === 'engineer';

  const subContractorFilesList = useMemo(() => {
    return subContractorFiles.filter(f => f.subContractorId === subContractorId);
  }, [subContractorFiles, subContractorId]);

  const subContractorPhotos = useMemo(() => {
    return subContractorFiles.filter(
      f => f.subContractorId === subContractorId && f.type === 'photo'
    );
  }, [subContractorFiles, subContractorId]);

  const subContractorStages = useMemo(() => {
    return paymentStages.filter(s => s.subContractorId === subContractorId);
  }, [paymentStages, subContractorId]);

  const subContractorAppointments = useMemo(() => {
    return appointments.filter(a => a.subContractorId === subContractorId);
  }, [appointments, subContractorId]);

  const totalAmount = useMemo(() => {
    return subContractorStages.reduce((sum, s) => {
      const edited = editedStages[s.id];
      const amount = edited?.amount !== undefined ? edited.amount : s.amount;
      return sum + amount;
    }, 0);
  }, [subContractorStages, editedStages]);

  const paidAmount = useMemo(() => {
    return subContractorStages.reduce((sum, s) => {
      const edited = editedStages[s.id];
      const isPaid = edited?.isPaid !== undefined ? edited.isPaid : s.isPaid;
      const amount = edited?.amount !== undefined ? edited.amount : s.amount;
      return isPaid ? sum + amount : sum;
    }, 0);
  }, [subContractorStages, editedStages]);

  const pendingAmount = totalAmount - paidAmount;
  const progress = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0;

  // Updated tabs without 'appointments'
  const tabs: { key: TabType; label: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: 'overview', label: 'Overview', icon: 'home' },
    { key: 'files', label: 'Files', icon: 'folder' },
    { key: 'photos', label: 'Photos', icon: 'image' },
    { key: 'payments', label: 'Payments', icon: 'credit-card' },
  ];

  const handleUploadFile = async (type: 'contract' | 'agreement' | 'photo') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission required', 'Media library permission is required to select files.');

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsMultipleSelection: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        for (const asset of result.assets) {
          const newFile: SubContractorFile = {
            id: String(Date.now()) + '-' + Math.random().toString(36).slice(2),
            subContractorId,
            type,
            name: `${type}-${Date.now()}.jpg`,
            uri: asset.uri,
            uploadedAt: new Date().toISOString(),
          };
          await addSubContractorFile(newFile);
        }
        Alert.alert('Success', `${result.assets.length} file(s) uploaded successfully!`);
      }
    } catch (error: any) {
      Alert.alert('Error', `Failed to upload file: ${error?.message || String(error)}`);
    }
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
            await deleteSubContractorFile(fileId);
          }
        }
      ]
    );
  };

  const handleDeleteSubContractor = () => {
    if (!subContractor) return;
    Alert.alert(
      'Delete Sub-Contractor',
      `Are you sure you want to delete ${subContractor.companyName}? This will permanently remove all associated payments, files, and appointments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteSubContractor(subContractorId);
            navigation.goBack();
            Alert.alert('Deleted', 'Sub-contractor has been removed successfully.');
          },
        },
      ]
    );
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

  const handleStageStatusToggle = (stageId: string, currentStatus: boolean) => {
    setEditedStages(prev => ({ 
      ...prev, 
      [stageId]: { ...prev[stageId], isPaid: !currentStatus } 
    }));
  };

  const handleAddNewStage = async () => {
    if (!newStageName.trim()) {
      Alert.alert('Error', 'Please enter a stage name.');
      return;
    }
    const amount = parseInt(newStageAmount.replace(/,/g, ''), 10) || 0;
    if (amount <= 0) {
      Alert.alert('Error', 'Please enter a valid amount.');
      return;
    }

    const newStage: PaymentStage = {
      id: `${subContractorId}-stage-${Date.now()}`,
      subContractorId,
      name: newStageName.trim(),
      amount,
      isPaid: false,
    };

    await addPaymentStage(newStage);
    setNewStageName('');
    setNewStageAmount('');
    setShowAddStageModal(false);
    Alert.alert('Success', 'New stage added!');
  };

  const handleDeleteStage = async (stageId: string, stageName: string) => {
    Alert.alert(
      'Delete Stage',
      `Are you sure you want to delete "${stageName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deletePaymentStage(stageId);
          }
        }
      ]
    );
  };

  const handleSaveEdits = async () => {
    for (const stage of subContractorStages) {
      const edited = editedStages[stage.id];
      if (edited) {
        const updatedStage = {
          ...stage,
          name: edited.name !== undefined ? edited.name : stage.name,
          amount: edited.amount !== undefined ? edited.amount : stage.amount,
          isPaid: edited.isPaid !== undefined ? edited.isPaid : stage.isPaid,
        };
        if (updatedStage.name !== stage.name || updatedStage.amount !== stage.amount || updatedStage.isPaid !== stage.isPaid) {
          await updatePaymentStage(updatedStage);
        }
      }
    }

    setEditedStages({});
    setIsEditMode(false);
    Alert.alert('Success', 'Changes saved successfully!');
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
      subContractorId,
      date: appointmentDate,
      time: appointmentTime,
      reason: appointmentReason,
      status: 'pending',
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

  const paidStagesCount = subContractorStages.filter(s => s.isPaid).length;
  const pendingStagesCount = subContractorStages.filter(s => !s.isPaid).length;
  const nextPendingStage = subContractorStages.find(s => !s.isPaid);
  const lastTransaction = transactions.filter(t => t.subContractorId === subContractorId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const renderOverviewTab = () => (
    <View style={styles.tabContent}>
   <LinearGradient
  colors={['#EAF3FF', '#F6F9FF']}
  style={styles.heroCard}
>

        <View style={styles.heroHeader}>
          <View style={styles.heroInfo}>
            <View style={[styles.statusBadge, { backgroundColor: subContractor?.status === 'active' ? Colors.light.success + '20' : Colors.light.warning + '20' }]}>
              <View style={[styles.statusDot, { backgroundColor: subContractor?.status === 'active' ? Colors.light.success : Colors.light.warning }]} />
              <ThemedText type="small" style={{ color: subContractor?.status === 'active' ? Colors.light.success : Colors.light.warning, fontWeight: '600', textTransform: 'capitalize' }}>
                {subContractor?.status}
              </ThemedText>
            </View>
            {isEditMode ? (
              <View style={{ width: '100%' }}>
                <TextInput
                  value={editedCompanyName}
                  onChangeText={setEditedCompanyName}
                  placeholder="Company name"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text }]}
                />
                <TextInput
                  value={editedContactPerson}
                  onChangeText={setEditedContactPerson}
                  placeholder="Contact person"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, marginTop: Spacing.xs }]}
                />
                <TextInput
                  value={editedPhone}
                  onChangeText={setEditedPhone}
                  placeholder="Phone number"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, marginTop: Spacing.xs }]}
                />
                <TextInput
                  value={editedWorkType}
                  onChangeText={setEditedWorkType}
                  placeholder="Work type"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, marginTop: Spacing.xs }]}
                />
                <TextInput
                  value={editedSpecialization}
                  onChangeText={setEditedSpecialization}
                  placeholder="Specialization"
                  placeholderTextColor={theme.textSecondary}
                  style={[styles.input, { backgroundColor: theme.backgroundSecondary, color: theme.text, marginTop: Spacing.xs }]}
                />
              </View>
            ) : (
              <>
                <ThemedText type="h3" style={{ marginTop: Spacing.md }}>{subContractor?.companyName}</ThemedText>
                <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>{subContractor?.contactPerson}</ThemedText>
                <View style={{ marginTop: Spacing.md }}>
                  <View style={styles.infoRow}>
                    <Feather name="phone" size={16} color={theme.textSecondary} />
                    <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>{subContractor?.phone}</ThemedText>
                  </View>
                  {subContractor?.workType && (
                    <View style={styles.infoRow}>
                      <Feather name="tool" size={16} color={theme.textSecondary} />
                      <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>{subContractor.workType}</ThemedText>
                    </View>
                  )}
                  {subContractor?.specialization && (
                    <View style={styles.infoRow}>
                      <Feather name="award" size={16} color={theme.textSecondary} />
                      <ThemedText type="body" style={{ marginLeft: Spacing.sm }}>{subContractor.specialization}</ThemedText>
                    </View>
                  )}
                </View>
              </>
            )}
          </View>
        </View>

        <View style={styles.heroStats}>
          <View style={styles.heroStatItem}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Contract</ThemedText>
            <ThemedText type="h3" style={{ color: theme.text }}>{totalAmount.toLocaleString()}</ThemedText>
          </View>
          <View style={[styles.heroStatDivider, { backgroundColor: theme.border }]} />
          <View style={styles.heroStatItem}>
            <ThemedText type="small" style={{ color: Colors.light.success }}>Paid</ThemedText>
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
          <ThemedText type="h3" style={{ marginTop: Spacing.sm }}>{subContractorFilesList.length}</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Files</ThemedText>
        </View>
      </View>

      {nextPendingStage ? (
        <View style={[styles.nextMilestoneCard, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.milestoneHeader}>
            <View style={[styles.milestoneIconBg, { backgroundColor: Colors.light.warning + '15' }]}>
              <Feather name="target" size={18} color={Colors.light.warning} />
            </View>
            <ThemedText type="body" style={{ fontWeight: '600', marginLeft: Spacing.sm }}>Next Payment</ThemedText>
          </View>
          <View style={styles.milestoneContent}>
            <View>
              <ThemedText type="h4">{nextPendingStage.name}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Stage {subContractorStages.indexOf(nextPendingStage) + 1} of {subContractorStages.length}
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
        <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.md }}>Payment Timeline</ThemedText>
        {subContractorStages.map((stage, index) => (
          <View key={stage.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={[
                styles.timelineNode,
                { backgroundColor: stage.isPaid ? Colors.light.success : theme.backgroundSecondary }
              ]}>
                {stage.isPaid ? (
                  <Feather name="check" size={12} color="#FFFFFF" />
                ) : (
                  <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 10 }}>{index + 1}</ThemedText>
                )}
              </View>
              {index < subContractorStages.length - 1 ? (
                <View style={[styles.timelineLine, { backgroundColor: stage.isPaid ? Colors.light.success : theme.border }]} />
              ) : null}
            </View>
            <View style={styles.timelineContent}>
              <ThemedText type="body" style={{ fontWeight: stage.isPaid ? '600' : '400', color: stage.isPaid ? theme.text : theme.textSecondary }}>
                {stage.name}
              </ThemedText>
              {stage.isPaid ? (
                <View style={styles.timelineStatus}>
                  <Feather name="check-circle" size={12} color={Colors.light.success} />
                  <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: Spacing.xs }}>Completed</ThemedText>
                </View>
              ) : (
                <View style={styles.timelineStatus}>
                  <Feather name="clock" size={12} color={Colors.light.warning} />
                  <ThemedText type="small" style={{ color: Colors.light.warning, marginLeft: Spacing.xs }}>Pending</ThemedText>
                </View>
              )}
            </View>
          </View>
        ))}
      </View>

      {canEdit ? (
        <Pressable
          onPress={handleDeleteSubContractor}
          style={[styles.deleteButton, { backgroundColor: Colors.light.error + '15' }]}
        >
          <Feather name="trash-2" size={18} color={Colors.light.error} />
          <ThemedText type="body" style={{ color: Colors.light.error, marginLeft: Spacing.sm }}>
            Delete Sub-Contractor
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );

  const renderFilesTab = () => {
    const contracts = subContractorFilesList.filter(f => f.type === 'contract');
    const agreements = subContractorFilesList.filter(f => f.type === 'agreement');

    return (
      <View style={styles.tabContent}>
        <View style={styles.fileSection}>
          <View style={styles.fileSectionHeader}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Contracts</ThemedText>
            {canEdit ? (
              <Pressable onPress={() => handleUploadFile('contract')} style={styles.uploadButton}>
                <Feather name="plus" size={18} color={Colors.light.primary} />
                <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs }}>Add</ThemedText>
              </Pressable>
            ) : null}
          </View>
          {contracts.length === 0 ? (
            <View style={[styles.emptyFileCard, { backgroundColor: theme.backgroundDefault }]}>
              <Feather name="file-text" size={24} color={theme.textSecondary} />
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.sm }}>No contracts</ThemedText>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.fileScroll}>
              {contracts.map(file => (
                <Pressable
                  key={file.id}
                  onPress={() => { setSelectedFile(file); setShowFileModal(true); }}
                  style={[styles.fileCard, { backgroundColor: theme.backgroundDefault }]}
                >
                  <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                  {canEdit ? (
                    <Pressable onPress={() => handleDeleteFile(file.id)} style={styles.deleteFileButton}>
                      <Feather name="x" size={12} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.fileSection}>
          <View style={styles.fileSectionHeader}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Agreements</ThemedText>
            {canEdit ? (
              <Pressable onPress={() => handleUploadFile('agreement')} style={styles.uploadButton}>
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
                  onPress={() => { setSelectedFile(file); setShowFileModal(true); }}
                  style={[styles.fileCard, { backgroundColor: theme.backgroundDefault }]}
                >
                  <Image source={{ uri: file.uri }} style={styles.fileThumbnail} />
                  {canEdit ? (
                    <Pressable onPress={() => handleDeleteFile(file.id)} style={styles.deleteFileButton}>
                      <Feather name="x" size={12} color="#FFFFFF" />
                    </Pressable>
                  ) : null}
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
          onPress={() => handleUploadFile('photo')}
          style={styles.uploadButton}
        >
          <Feather name="plus" size={18} color={Colors.light.primary} />
          <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.xs }}>
            Add Photos
          </ThemedText>
        </Pressable>
      )}

      {subContractorPhotos.length === 0 ? (
        <View style={styles.emptyState}>
          <Feather name="image" size={48} color={theme.textSecondary} />
          <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
            No photos uploaded
          </ThemedText>
        </View>
      ) : (
        <View style={styles.photosGrid}>
          {subContractorPhotos.map(photo => (
            <Pressable
              key={photo.id}
              onPress={() => {
                setSelectedFile(photo);
                setShowFileModal(true);
              }}
              style={styles.photoCard}
            >
              <Image source={{ uri: photo.uri }} style={styles.photoImage} />
              {canEdit && (
                <Pressable
                  onPress={() => handleDeleteFile(photo.id)}
                  style={styles.deleteFileButton}
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
            <ThemedText type="body" style={{ color: theme.textSecondary }}>Total Contract</ThemedText>
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

        {subContractorStages.map((stage, index) => {
          const edited = editedStages[stage.id];
          const currentName = edited?.name !== undefined ? edited.name : stage.name;
          const currentAmount = edited?.amount !== undefined ? edited.amount : stage.amount;
          const currentIsPaid = edited?.isPaid !== undefined ? edited.isPaid : stage.isPaid;

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
                      onPress={() => handleStageStatusToggle(stage.id, currentIsPaid)}
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
                  <View style={[
                    styles.statusPill,
                    { backgroundColor: stage.isPaid ? Colors.light.success + '15' : Colors.light.warning + '15' }
                  ]}>
                    <ThemedText type="small" style={{ color: stage.isPaid ? Colors.light.success : Colors.light.warning, fontWeight: '600' }}>
                      {stage.isPaid ? 'Paid' : 'Pending'}
                    </ThemedText>
                  </View>
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

  if (!subContractor) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText>Sub-contractor not found</ThemedText>
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
            <View style={[styles.userAvatar, { backgroundColor: '#8B5CF6' + '20' }]}>
              <ThemedText type="body" style={{ color: '#8B5CF6', fontWeight: '700' }}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </ThemedText>
            </View>
            <View style={styles.userDetails}>
              <ThemedText type="small" style={{ color: theme.textSecondary, fontSize: 11 }}>Logged in as</ThemedText>
              <ThemedText type="body" style={{ fontWeight: '600' }}>{user?.name || 'User'}</ThemedText>
            </View>
          </View>

          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="x" size={24} color={theme.text} />
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
              color={activeTab === tab.key ? '#8B5CF6' : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: activeTab === tab.key ? '#8B5CF6' : theme.textSecondary,
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
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'files' && renderFilesTab()}
        {activeTab === 'payments' && renderPaymentsTab()}
        {activeTab === 'photos' && renderPhotosTab()}
      </ScrollView>

      <Modal
        visible={showFileModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowFileModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowFileModal(false)}>
          <View style={styles.fileModalContent}>
            {selectedFile ? (
              <Image source={{ uri: selectedFile.uri }} style={styles.fullImage} resizeMode="contain" />
            ) : null}
          </View>
        </Pressable>
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
            <ThemedText type="body" style={{ fontWeight: '600' }}>Schedule Appointment</ThemedText>
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
            <Pressable onPress={() => { setShowAddStageModal(false); setNewStageName(''); setNewStageAmount(''); }}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Add New Stage</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.appointmentForm, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Stage Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={newStageName}
                onChangeText={setNewStageName}
                placeholder="e.g., Foundation Work, Electrical Wiring"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Amount</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={newStageAmount}
                onChangeText={setNewStageAmount}
                placeholder="Enter amount"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            <Button onPress={handleAddNewStage} style={{ marginTop: Spacing.xl }}>
              Add Stage
            </Button>
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
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
    borderBottomColor: '#8B5CF6',
  },
  tabContent: {
    padding: Spacing.lg,
  },
heroCard: {
  borderRadius: BorderRadius.lg,
  padding: Spacing.lg,
  marginBottom: Spacing.md,
  backgroundColor: 'transparent',
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
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
heroStats: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: Spacing.xl,
  paddingTop: Spacing.lg,
  borderTopWidth: 1,
  borderTopColor: '#E3ECFF', // light blue line
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
  deleteFileButton: {
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
  divider: {
    height: 1,
    marginVertical: Spacing.md,
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
  backgroundColor: 'rgba(220,235,255,0.9)', // light blue overlay
  alignItems: 'center',
  justifyContent: 'center',
},

  fileModalContent: {
    width: '90%',
    height: '80%',
  },
  fullImage: {
    width: '100%',
    height: '100%',
  },
  appointmentModalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
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
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.lg,
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
});