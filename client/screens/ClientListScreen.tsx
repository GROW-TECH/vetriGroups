import React, { useState, useEffect, useMemo } from 'react';

import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';


import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { Client } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';
import { PAYMENT_STAGES_TEMPLATE } from '@/types';
import { db } from '@/firebaseConfig';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function ClientListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user } = useAuth();

  const [clients, setClients] = useState<Client[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    const q = query(collection(db, 'clients'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: Client[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Client, 'id'>),
      }));

      setClients(list);
    });

    return () => unsubscribe();
  }, []);

  // Filter clients based on search query
  const filteredClients = useMemo(() => {
    if (!searchQuery.trim()) {
      return clients;
    }

    const query = searchQuery.toLowerCase();
    return clients.filter((client) => 
      client.name.toLowerCase().includes(query) ||
      client.projectName.toLowerCase().includes(query) ||
      client.location?.toLowerCase().includes(query) ||
      client.username?.toLowerCase().includes(query)
    );
  }, [clients, searchQuery]);

  const canAdd = user?.role === 'admin' || user?.role === 'engineer';

  const totalAmount = parseInt(newTotalAmount.replace(/,/g, ''), 10) || 0;

  const [stagePercentages, setStagePercentages] = useState<Record<string, number>>(
    PAYMENT_STAGES_TEMPLATE.reduce((acc, s) => {
      acc[s.name] = s.percentage;
      return acc;
    }, {} as Record<string, number>)
  );

  const calculatedStages = PAYMENT_STAGES_TEMPLATE.map((stage) => {
    const percentage = stagePercentages[stage.name] ?? stage.percentage;
    const amount = Math.round((percentage / 100) * totalAmount);
    return { ...stage, percentage, amount };
  });

  const stageTotal = calculatedStages.reduce((sum, s) => sum + s.amount, 0);

  const handleStagePercentageChange = (stageName: string, value: string) => {
    let newVal = parseFloat(value) || 0;
    if (newVal < 0) newVal = 0;
    if (newVal > 100) newVal = 100;

    const others = PAYMENT_STAGES_TEMPLATE.filter((s) => s.name !== stageName);
    const remaining = 100 - newVal;

    const totalOthers = others.reduce(
      (sum, s) => sum + (stagePercentages[s.name] ?? s.percentage),
      0
    );

    const updated: Record<string, number> = {
      ...stagePercentages,
      [stageName]: newVal,
    };

    others.forEach((s) => {
      const current = stagePercentages[s.name] ?? s.percentage;
      updated[s.name] =
        totalOthers === 0
          ? remaining / others.length
          : (current / totalOthers) * remaining;
    });

    setStagePercentages(updated);
  };

  const handleStageAmountChange = (stageName: string, value: string) => {
    const newAmount = parseInt(value.replace(/,/g, ''), 10) || 0;
    
    if (totalAmount === 0) return;

    // Calculate the new percentage based on the amount
    const newPercentage = (newAmount / totalAmount) * 100;
    
    // Use the existing percentage change handler to maintain consistency
    handleStagePercentageChange(stageName, String(newPercentage));
  };

  const handleAddClient = async () => {
    if (!newClientName.trim() || !newProjectName.trim() || !newTotalAmount.trim() || !newUsername.trim() || !newPassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setIsSaving(true);

    try {
      const stagesData = calculatedStages.map((stage, index) => ({
        id: Date.now().toString() + '_' + index,   // ✅ UNIQUE ID
        name: stage.name,
        percentage: stage.percentage,
        amount: stage.amount,
        paid: 0,
        status: 'pending',
      }));

      await addDoc(collection(db, 'clients'), {
        name: newClientName.trim(),
        projectName: newProjectName.trim(),
        location: newLocation.trim() || '',
        totalAmount: stageTotal,
        status: 'active',
        username: newUsername.trim(),
        password: newPassword.trim(),
        stages: stagesData,
        createdAt: serverTimestamp(),
      });

      if (Platform.OS === 'android') {
        ToastAndroid.show('Client saved successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Client added successfully.');
      }

      setShowAddModal(false);
      setNewClientName('');
      setNewProjectName('');
      setNewLocation('');
      setNewTotalAmount('');
      setNewUsername('');
      setNewPassword('');
    } catch (error) {
      console.error('Error adding client:', error);
      Alert.alert('Error', 'Failed to save client. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const statusColors: Record<string, string> = {
    active: Colors.light.success,
    completed: Colors.light.primary,
    pending: Colors.light.warning,
  };

  const renderClient = ({ item }: { item: Client }) => (
    <Pressable
      onPress={() => navigation.navigate('ClientDetail', { clientId: item.id })}
      style={({ pressed }) => [
        styles.clientCard,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
        Shadows.sm,
      ]}
    >
      <View style={[styles.projectIcon, { backgroundColor: Colors.light.primary + '15' }]}>
        <Feather name="briefcase" size={24} color={Colors.light.primary} />
      </View>
      <View style={styles.clientInfo}>
        <ThemedText type="body" style={{ fontWeight: '600' }}>
          {item.projectName}
        </ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
          {item.name}
        </ThemedText>
        {item.location && (
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={10} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4, fontSize: 11 }}>
              {item.location}
            </ThemedText>
          </View>
        )}
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] }]} />
        <ThemedText
          type="small"
          style={{ color: statusColors[item.status], fontWeight: '500', textTransform: 'capitalize' }}
        >
          {item.status}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.backgroundDefault, borderBottomColor: theme.border }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: theme.backgroundSecondary }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search clients, projects, or locations..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      <FlatList
        data={filteredClients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl + 70 },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name={searchQuery ? "search" : "briefcase"} size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              {searchQuery ? 'No clients found' : 'No clients yet'}
            </ThemedText>
            {searchQuery && (
              <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                Try a different search term
              </ThemedText>
            )}
          </View>
        )}
      />

      {canAdd && (
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={[styles.fab, { bottom: insets.bottom + Spacing.xl }, Shadows.md]}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      )}

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>
                Cancel
              </ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>
              New Client
            </ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Username
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text },
                ]}
                value={newUsername}
                onChangeText={setNewUsername}
                placeholder="Enter username for client login"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Password
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text },
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter password for client login"
                placeholderTextColor={theme.textSecondary}
                secureTextEntry
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Client Name
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text },
                ]}
                value={newClientName}
                onChangeText={setNewClientName}
                placeholder="Enter client name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Project Name
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text },
                ]}
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder="Enter project name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Location
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text },
                ]}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Enter project location"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>
                Total Discussed Amount
              </ThemedText>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text },
                ]}
                value={newTotalAmount}
                onChangeText={setNewTotalAmount}
                placeholder="Enter total amount"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {totalAmount > 0 && (
              <View style={styles.stagesSection}>
                <View style={styles.stagesSectionHeader}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>
                    Stage-wise Payment Details
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                    Edit percentage or amount — both sync automatically
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Total: {stageTotal.toLocaleString()}
                  </ThemedText>
                </View>
                {calculatedStages.map((stage, index) => (
                  <View key={stage.name} style={[styles.stageRow, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
                    <View style={styles.stageHeader}>
                      <View style={[styles.stageIndex, { backgroundColor: Colors.light.primary + '15' }]}>
                        <ThemedText type="small" style={{ color: Colors.light.primary, fontWeight: '700' }}>
                          {index + 1}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" style={{ fontWeight: '600', flex: 1 }}>
                        {stage.name}
                      </ThemedText>
                    </View>
                    <View style={styles.stageInputsContainer}>
                      <View style={styles.stageInputGroup}>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 6 }}>
                          Percentage
                        </ThemedText>
                        <View style={styles.percentageInputWrapper}>
                          <TextInput
                            style={[styles.stagePercentageInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                            value={String(Math.round(stage.percentage * 100) / 100)}
                            onChangeText={(v) => handleStagePercentageChange(stage.name, v)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                            placeholderTextColor={theme.textSecondary}
                          />
                          <ThemedText type="body" style={{ position: 'absolute', right: 12, color: theme.textSecondary, fontWeight: '500' }}>
                            %
                          </ThemedText>
                        </View>
                      </View>
                      <View style={styles.stageInputGroup}>
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: 6 }}>
                          Amount (₹)
                        </ThemedText>
                        <View style={styles.amountInputWrapper}>
                          <ThemedText type="body" style={{ position: 'absolute', left: 12, color: theme.textSecondary, fontWeight: '500', zIndex: 1 }}>
                            ₹
                          </ThemedText>
                          <TextInput
                            style={[styles.stageAmountInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.backgroundSecondary }]}
                            value={String(stage.amount)}
                            onChangeText={(v) => handleStageAmountChange(stage.name, v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={theme.textSecondary}
                          />
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Button onPress={handleAddClient} disabled={isSaving} style={{ marginTop: Spacing.xl }}>
              {isSaving ? 'Saving...' : 'Add Client'}
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 4,
  },
  listContent: {
    padding: Spacing.lg,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  projectIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  clientInfo: {
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['5xl'],
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
  },
  modalContent: {
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
  stagesSection: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  stagesSectionHeader: {
    marginBottom: Spacing.md,
  },
  stageRow: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.md,
    borderWidth: 1,
  },
  stageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  stageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  stageIndex: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageInputsContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  stageInputGroup: {
    flex: 1,
  },
  percentageInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  amountInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  stageCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stageRight: {
    alignItems: 'flex-end',
    flex: 1,
  },
  stagePercentageInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    paddingRight: 36,
    fontSize: 15,
    fontWeight: '600',
  },
  stageAmountInput: {
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingLeft: 32,
    paddingRight: Spacing.md,
    fontSize: 15,
    fontWeight: '600',
  },
});