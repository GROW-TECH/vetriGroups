import React, { useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, TextInput, Alert, Modal, Platform, ToastAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Client } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

import { PAYMENT_STAGES_TEMPLATE } from '@/types';

export default function ClientListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { clients, addClient, deleteClient } = useData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newProjectName, setNewProjectName] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [stageAmounts, setStageAmounts] = useState<Record<string, string>>({});
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const canAdd = user?.role === 'admin' || user?.role === 'engineer';

  const statusColors: Record<string, string> = {
    active: Colors.light.success,
    completed: Colors.light.primary,
    pending: Colors.light.warning,
  };

  const totalAmount = parseInt(newTotalAmount.replace(/,/g, ''), 10) || 0;
const [stagePercentages, setStagePercentages] = useState<Record<string, number>>(
  PAYMENT_STAGES_TEMPLATE.reduce((acc, s) => {
    acc[s.name] = s.percentage;
    return acc;
  }, {} as Record<string, number>)
);

 const calculatedStages = PAYMENT_STAGES_TEMPLATE.map(stage => {
  const percentage = stagePercentages[stage.name] ?? stage.percentage;
  const amount = Math.round((percentage / 100) * totalAmount);
  return { ...stage, percentage, amount };
});


  const stageTotal = calculatedStages.reduce((sum, s) => sum + s.amount, 0);

 const handleStagePercentageChange = (stageName: string, value: string) => {
  let newVal = parseFloat(value) || 0;
  if (newVal < 0) newVal = 0;
  if (newVal > 100) newVal = 100;

  const others = PAYMENT_STAGES_TEMPLATE.filter(s => s.name !== stageName);
  const remaining = 100 - newVal;

  const totalOthers = others.reduce(
    (sum, s) => sum + (stagePercentages[s.name] ?? s.percentage),
    0
  );

  const updated: Record<string, number> = {
    ...stagePercentages,
    [stageName]: newVal,
  };

  others.forEach(s => {
    const current = stagePercentages[s.name] ?? s.percentage;
    updated[s.name] =
      totalOthers === 0
        ? remaining / others.length
        : (current / totalOthers) * remaining;
  });

  setStagePercentages(updated);
};


  const handleAddClient = async () => {

    console.log('[ClientList] Submit add client clicked');
    if (!newClientName.trim() || !newProjectName.trim() || !newTotalAmount.trim() || !newUsername.trim() || !newPassword.trim()) {
      Alert.alert('Missing Fields', 'Please fill in client name, project name, total amount, username, and password.');
      return;
    }

    setIsSaving(true);
    const newClient: Client = {
      id: String(clients.length + 1 + Date.now()),
      name: newClientName.trim(),
      projectName: newProjectName.trim(),
      location: newLocation.trim() || undefined,
      totalAmount: stageTotal,
      status: 'active',
      username: newUsername.trim(),
      password: newPassword.trim(),
    };

    const customStages = calculatedStages.map(stage => ({
      name: stage.name,
      amount: stageAmounts[stage.name] ? parseInt(stageAmounts[stage.name].replace(/,/g, ''), 10) || stage.amount : stage.amount,
    }));

    try {
      console.log('[ClientList] Before addClient, clients length:', clients.length);
      const result = await addClient(newClient, totalAmount > 0 ? customStages : undefined);
      console.log('[ClientList] After addClient (expected +1), clients length:', clients.length + 1);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Client saved successfully!', ToastAndroid.SHORT);
      } else {
        Alert.alert('Success', 'Client added successfully.');
      }
      setNewClientName('');
      setNewProjectName('');
      setNewLocation('');
      setNewTotalAmount('');
      setStageAmounts({});
      setShowAddModal(false);
      setNewUsername('');
      setNewPassword('');
    } catch (e: any) {
      console.error('[ClientList] addClient failed:', e);
      if (Platform.OS === 'android') {
        ToastAndroid.show(e?.message || 'Failed to add client', ToastAndroid.LONG);
      } else {
        Alert.alert('Error', e?.message || 'Failed to add client');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = (client: Client) => {
    Alert.alert(
      'Delete Client',
      `Are you sure you want to delete ${client.name}'s project "${client.projectName}"? This will also delete all associated payments, files, and appointments.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteClient(client.id);
            Alert.alert('Deleted', 'Client has been removed successfully.');
          },
        },
      ]
    );
  };

  const renderClient = ({ item }: { item: Client }) => (
    <Pressable
      onPress={() => navigation.navigate('ClientDetail', { clientId: item.id })}
      onLongPress={() => canAdd && handleDeleteClient(item)}
      delayLongPress={500}
      style={({ pressed }) => [
        styles.clientCard,
        { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
        Shadows.sm
      ]}
    >
      <View style={[styles.projectIcon, { backgroundColor: Colors.light.primary + '15' }]}>
        <Feather name="briefcase" size={24} color={Colors.light.primary} />
      </View>
      <View style={styles.clientInfo}>
        <ThemedText type="body" style={{ fontWeight: '600' }}>{item.projectName}</ThemedText>
        <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
          {item.name}
        </ThemedText>
      </View>
      <View style={[styles.statusBadge, { backgroundColor: statusColors[item.status] + '15' }]}>
        <View style={[styles.statusDot, { backgroundColor: statusColors[item.status] }]} />
        <ThemedText type="small" style={{ color: statusColors[item.status], fontWeight: '500', textTransform: 'capitalize' }}>
          {item.status}
        </ThemedText>
      </View>
    </Pressable>
  );

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={clients}
        keyExtractor={(item) => item.id}
        renderItem={renderClient}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl + 70 }
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="briefcase" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No clients yet
            </ThemedText>
          </View>
        )}
      />

      {canAdd ? (
        <Pressable
          onPress={() => setShowAddModal(true)}
          style={[styles.fab, { bottom: insets.bottom + Spacing.xl }, Shadows.md]}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAddModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowAddModal(false)}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>New Client</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.inputGroup}>
                          <View style={styles.inputGroup}>
                            <ThemedText type="small" style={styles.label}>Username</ThemedText>
                            <TextInput
                              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                              value={newUsername}
                              onChangeText={setNewUsername}
                              placeholder="Enter username for client login"
                              placeholderTextColor={theme.textSecondary}
                              autoCapitalize="none"
                            />
                          </View>

                          <View style={styles.inputGroup}>
                            <ThemedText type="small" style={styles.label}>Password</ThemedText>
                            <TextInput
                              style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                              value={newPassword}
                              onChangeText={setNewPassword}
                              placeholder="Enter password for client login"
                              placeholderTextColor={theme.textSecondary}
                              secureTextEntry
                              autoCapitalize="none"
                            />
                          </View>
              <ThemedText type="small" style={styles.label}>Client Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={newClientName}
                onChangeText={setNewClientName}
                placeholder="Enter client name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Project Name</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={newProjectName}
                onChangeText={setNewProjectName}
                placeholder="Enter project name"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Location</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Enter project location"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Total Discussed Amount</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={newTotalAmount}
                onChangeText={setNewTotalAmount}
                placeholder="Enter total amount"
                placeholderTextColor={theme.textSecondary}
                keyboardType="numeric"
              />
            </View>

            {totalAmount > 0 ? (
              <View style={styles.stagesSection}>
                <View style={styles.stagesSectionHeader}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>Stage-wise Payment Details</ThemedText>
               <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
  Edit percentage — amount updates automatically
</ThemedText>
   <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    Total: {stageTotal.toLocaleString()}
                  </ThemedText>
                </View>
                {calculatedStages.map((stage, index) => (
                  <View key={stage.name} style={[styles.stageRow, { backgroundColor: theme.backgroundDefault }]}>
                  {/* LEFT */}
<View style={styles.stageLeft}>
  <View style={[styles.stageIndex, { backgroundColor: Colors.light.primary + '15' }]}>
    <ThemedText type="small" style={{ color: Colors.light.primary, fontWeight: '700' }}>
      {index + 1}
    </ThemedText>
  </View>

  <View>
    <ThemedText type="body" style={{ fontWeight: '600' }}>
      {stage.name}
    </ThemedText>
    <ThemedText type="small" style={{ color: theme.textSecondary }}>
      Percentage
    </ThemedText>
  </View>
</View>

{/* CENTER */}
<View style={styles.stageCenter}>
  <TextInput
    style={[styles.stagePercentageInput, { color: theme.text }]}
    value={String(Math.round(stage.percentage))}
    onChangeText={(v) => handleStagePercentageChange(stage.name, v)}
    keyboardType="numeric"
  />
  <ThemedText type="small" style={{ marginLeft: 4 }}>%</ThemedText>
</View>

{/* RIGHT */}
<View style={styles.stageRight}>
  <ThemedText type="small" style={{ color: theme.textSecondary }}>
    Amount
  </ThemedText>
  <ThemedText type="body" style={{ fontWeight: '700' }}>
    {stage.amount.toLocaleString()}
  </ThemedText>
</View>

                  </View>
                ))}
              </View>
            ) : null}

            <Button onPress={handleAddClient} disabled={isSaving} style={{ marginTop: Spacing.xl }}>
              {isSaving ? 'Adding…' : 'Add Client'}
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
    gap: Spacing.md,
  },
  stagesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  stageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  stageRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  stageIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  stageRowInfo: {
    flex: 1,
  },
  stageAmountInput: {
    width: 100,
    height: 40,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    fontSize: 14,
    textAlign: 'right',
  },
  stagePercentageInput: {
  width: 48,
  height: 32,
  borderBottomWidth: 1,
  borderColor: Colors.light.primary,
  textAlign: 'center',
  fontSize: 14,
  fontWeight: '600',
  },
  stageLeft: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: Spacing.sm,
  flex: 1.3,
},

stageCenter: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 0.8,
},

stageRight: {
  alignItems: 'flex-end',
  flex: 1,
},

});
