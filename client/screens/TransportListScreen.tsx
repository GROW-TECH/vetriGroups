import React, { useEffect, useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  ActivityIndicator,
  RefreshControl,
  TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type TransportListNavProp = NativeStackNavigationProp<RootStackParamList, 'TransportList'>;

interface Transport {
  id: string;
  name: string;
  phone: string;
  from: string;
  to: string;
  materialType: string;
  weight: string;
  payment: 'paid' | 'pending';
  createdAt: any;
}

export default function TransportListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TransportListNavProp>();
  const { theme, isDark } = useTheme();

  const [transports, setTransports] = useState<Transport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    fetchTransports();
  }, []);

  const fetchTransports = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'transports'));
      const transportData: Transport[] = [];
      querySnapshot.forEach((doc) => {
        transportData.push({ id: doc.id, ...doc.data() } as Transport);
      });
      // Sort by created date, newest first
      transportData.sort((a, b) => {
        const dateA = a.createdAt?.toDate?.() || new Date(0);
        const dateB = b.createdAt?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
      setTransports(transportData);
    } catch (error) {
      console.error('Error fetching transports:', error);
      Alert.alert('Error', 'Failed to load transport records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTransports();
  };

  const handleDelete = async (transportId: string, transportName: string) => {
    Alert.alert(
      'Delete Transport',
      `Are you sure you want to delete ${transportName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'transports', transportId));
              setTransports(transports.filter((t) => t.id !== transportId));
              Alert.alert('Success', 'Transport deleted successfully');
            } catch (error) {
              console.error('Error deleting transport:', error);
              Alert.alert('Error', 'Failed to delete transport');
            }
          },
        },
      ]
    );
  };

  const filteredTransports = useMemo(() => {
    if (!searchText.trim()) {
      return transports;
    }

    const searchLower = searchText.toLowerCase();
    return transports.filter(item =>
      item.name.toLowerCase().includes(searchLower) ||
      item.phone.toLowerCase().includes(searchLower) ||
      item.materialType.toLowerCase().includes(searchLower) ||
      item.from.toLowerCase().includes(searchLower) ||
      item.to.toLowerCase().includes(searchLower) ||
      item.weight.toLowerCase().includes(searchLower) ||
      item.payment.toLowerCase().includes(searchLower)
    );
  }, [transports, searchText]);

  const renderTransportCard = ({ item, index }: { item: Transport; index: number }) => (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Pressable
        onPress={() => navigation.navigate('TransportDetail', { transportId: item.id })}
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.cardBackground },
          pressed && { opacity: 0.7 },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#F97316' + '20' }]}>
            <Feather name="navigation" size={24} color="#F97316" />
          </View>
          <View style={styles.cardInfo}>
            <ThemedText type="subtitle" style={styles.transportName}>
              {item.name}
            </ThemedText>
            <View style={styles.routeContainer}>
              <Feather name="map-pin" size={14} color={theme.textSecondary} />
              <ThemedText type="small" style={[styles.route, { color: theme.textSecondary }]}>
                {item.from} → {item.to}
              </ThemedText>
            </View>
          </View>
          <Pressable
            onPress={() => handleDelete(item.id, item.name)}
            hitSlop={8}
            style={styles.deleteButton}
          >
            <Feather name="trash-2" size={18} color="#EF4444" />
          </Pressable>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Feather name="phone" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.phone}
            </ThemedText>
          </View>
          <View style={styles.detailItem}>
            <Feather name="package" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.materialType}
            </ThemedText>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailItem}>
            <Feather name="activity" size={14} color={theme.textSecondary} />
            <ThemedText type="small" style={[styles.detailText, { color: theme.textSecondary }]}>
              {item.weight}
            </ThemedText>
          </View>
          <View style={styles.paymentRow}>
            <View
              style={[
                styles.paymentBadge,
                { backgroundColor: item.payment === 'paid' ? '#10B981' : '#F59E0B' },
              ]}
            >
              <ThemedText type="small" style={styles.paymentText}>
                {item.payment === 'paid' ? 'Paid' : 'Pending'}
              </ThemedText>
            </View>
            <Pressable
              onPress={() => navigation.navigate('TransportDetail', { transportId: item.id })}
              hitSlop={8}
              style={styles.editButton}
            >
              <Feather name="edit-2" size={16} color="#3B82F6" />
            </Pressable>
          </View>
        </View>

        <View style={styles.chevronContainer}>
          <Feather name="chevron-right" size={20} color={theme.textSecondary} />
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Feather name="navigation" size={64} color={theme.textSecondary} />
      <ThemedText type="subtitle" style={[styles.emptyText, { color: theme.textSecondary }]}>
        {searchText ? 'No Matching Transports' : 'No Transport Records'}
      </ThemedText>
      <ThemedText type="small" style={[styles.emptySubtext, { color: theme.textSecondary }]}>
        {searchText ? 'Try a different search term' : 'Add your first transport record'}
      </ThemedText>
    </View>
  );

  const clearSearch = () => {
    setSearchText('');
  };

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
      </ThemedView>
    );
  }

  return (
    <LinearGradient
      colors={isDark ? ['#111827', '#1F2937'] : ['#F8FAFC', '#E2E8F0']}
      style={styles.container}
    >
      {/* Search Container */}
      <View style={[styles.searchContainer, { backgroundColor: theme.cardBackground }]}>
        <View style={[styles.searchInputContainer, { backgroundColor: isDark ? '#374151' : '#F3F4F6' }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            placeholder="Search transports..."
            placeholderTextColor={theme.textSecondary}
            value={searchText}
            onChangeText={setSearchText}
            style={[styles.searchInput, { color: theme.text }]}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <Pressable onPress={clearSearch} hitSlop={8}>
              <Feather name="x-circle" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>
        
        {/* Results Count */}
        {searchText.length > 0 && (
          <View style={styles.resultsCount}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {filteredTransports.length} result{filteredTransports.length !== 1 ? 's' : ''} found
            </ThemedText>
          </View>
        )}
      </View>

      {/* Transport List */}
      <FlatList
        data={filteredTransports}
        renderItem={renderTransportCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={Colors.light.primary}
          />
        }
        ListEmptyComponent={renderEmptyComponent}
      />

      {/* Floating Action Button */}
      <Pressable
        onPress={() => navigation.navigate('TransportDetail', { transportId: 'new' })}
        style={styles.fab}
      >
        <LinearGradient colors={['#F97316', '#EA580C']} style={styles.fabGradient}>
          <Feather name="plus" size={28} color="#fff" />
        </LinearGradient>
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    height: 48,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  resultsCount: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  listContent: {
    padding: Spacing.md,
  },
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  cardInfo: {
    flex: 1,
  },
  transportName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  routeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  route: {
    fontSize: 13,
  },
  deleteButton: {
    padding: Spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: Spacing.sm,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 13,
  },
  paymentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  paymentText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  chevronContainer: {
    position: 'absolute',
    right: Spacing.md,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl * 2,
  },
  emptyText: {
    marginTop: Spacing.md,
    fontWeight: '600',
  },
  emptySubtext: {
    marginTop: Spacing.xs,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    borderRadius: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
});