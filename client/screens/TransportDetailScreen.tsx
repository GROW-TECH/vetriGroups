import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  getDocs,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type TransportDetailNavProp = NativeStackNavigationProp<RootStackParamList, 'TransportDetail'>;
type TransportDetailRouteProp = RouteProp<RootStackParamList, 'TransportDetail'>;

interface MaterialCategory {
  id: string;
  name: string;
  color: string;
}

export default function TransportDetailScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<TransportDetailNavProp>();
  const route = useRoute<TransportDetailRouteProp>();
  const { theme, isDark } = useTheme();

  const { transportId } = route.params;
  const isNewTransport = transportId === 'new';

  const [loading, setLoading] = useState(!isNewTransport);
  const [saving, setSaving] = useState(false);
  const [materialCategories, setMaterialCategories] = useState<MaterialCategory[]>([]);
  const [showMaterialPicker, setShowMaterialPicker] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    from: '',
    to: '',
    materialType: '',
    weight: '',
    amount:'',
    payment: 'pending' as 'paid' | 'pending',
  });

  useEffect(() => {
    fetchMaterialCategories();
    if (!isNewTransport) {
      fetchTransportData();
    }
  }, []);

  const fetchMaterialCategories = async () => {
    try {
      const categoriesSnapshot = await getDocs(collection(db, 'materialCategories'));
      const categories: MaterialCategory[] = [];
      categoriesSnapshot.forEach((doc) => {
        const data = doc.data();
        categories.push({
          id: doc.id,
          name: data.name,
          color: data.color,
        });
      });
      setMaterialCategories(categories);
    } catch (error) {
      console.error('Error fetching material categories:', error);
    }
  };

  const fetchTransportData = async () => {
    try {
      const docRef = doc(db, 'transports', transportId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        setFormData({
          name: data.name || '',
          phone: data.phone || '',
          from: data.from || '',
          to: data.to || '',
          materialType: data.materialType || '',
          weight: data.weight || '',
          payment: data.payment || 'pending',
        });
      } else {
        Alert.alert('Error', 'Transport record not found');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error fetching transport:', error);
      Alert.alert('Error', 'Failed to load transport details');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.amount.trim()) {
  Alert.alert('Validation Error', 'Please enter transport amount');
  return;
}

    if (!formData.name.trim()) {
      Alert.alert('Validation Error', 'Please enter driver/company name');
      return;
    }
    if (!formData.phone.trim()) {
      Alert.alert('Validation Error', 'Please enter phone number');
      return;
    }
    if (!formData.from.trim()) {
      Alert.alert('Validation Error', 'Please enter origin location');
      return;
    }
    if (!formData.to.trim()) {
      Alert.alert('Validation Error', 'Please enter destination location');
      return;
    }
    if (!formData.materialType.trim()) {
      Alert.alert('Validation Error', 'Please select material type');
      return;
    }
    if (!formData.weight.trim()) {
      Alert.alert('Validation Error', 'Please enter weight/quantity');
      return;
    }

    setSaving(true);
    try {
      const transportData = {
        ...formData,
        updatedAt: Timestamp.now(),
      };

      if (isNewTransport) {
        const newDocRef = doc(collection(db, 'transports'));
        await setDoc(newDocRef, {
          ...transportData,
          createdAt: Timestamp.now(),
        });
        Alert.alert('Success', 'Transport record created successfully');
      } else {
        const docRef = doc(db, 'transports', transportId);
        await updateDoc(docRef, transportData);
        Alert.alert('Success', 'Transport record updated successfully');
      }

      navigation.goBack();
    } catch (error) {
      console.error('Error saving transport:', error);
      Alert.alert('Error', 'Failed to save transport record');
    } finally {
      setSaving(false);
    }
  };

  const selectMaterial = (materialName: string) => {
    setFormData({ ...formData, materialType: materialName });
    setShowMaterialPicker(false);
  };

  if (loading) {
    return (
      <LinearGradient
        colors={['#F97316', '#EA580C']}
        style={styles.centered}
      >
        <ActivityIndicator size="large" color="#fff" />
        <ThemedText type="body" style={styles.loadingText}>
          Loading transport details...
        </ThemedText>
      </LinearGradient>
    );
  }

  return (
    <View style={styles.container}>
      {/* Animated Header with Gradient */}
    

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Driver/Company Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              style={styles.sectionIconBg}
            >
              <Feather name="user" size={20} color="#fff" />
            </LinearGradient>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Driver/Company Details
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                Name *
              </ThemedText>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
              }]}>
                <View style={[styles.inputIcon, { backgroundColor: '#3B82F620' }]}>
                  <Feather name="user" size={18} color="#3B82F6" />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter driver/company name"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                Phone Number *
              </ThemedText>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
              }]}>
                <View style={[styles.inputIcon, { backgroundColor: '#10B98120' }]}>
                  <Feather name="phone" size={18} color="#10B981" />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.phone}
                  onChangeText={(text) => setFormData({ ...formData, phone: text })}
                  placeholder="Enter phone number"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        </View>

        {/* Route Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#8B5CF6', '#7C3AED']}
              style={styles.sectionIconBg}
            >
              <Feather name="map-pin" size={20} color="#fff" />
            </LinearGradient>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Route Information
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                From (Origin) *
              </ThemedText>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
              }]}>
                <View style={[styles.inputIcon, { backgroundColor: '#8B5CF620' }]}>
                  <Feather name="map-pin" size={18} color="#8B5CF6" />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.from}
                  onChangeText={(text) => setFormData({ ...formData, from: text })}
                  placeholder="Enter origin location"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>

            <View style={styles.routeArrow}>
              <Feather name="arrow-down" size={24} color="#8B5CF6" />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                To (Destination) *
              </ThemedText>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
              }]}>
                <View style={[styles.inputIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Feather name="navigation" size={18} color="#F59E0B" />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.to}
                  onChangeText={(text) => setFormData({ ...formData, to: text })}
                  placeholder="Enter destination location"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>
          </View>
        </View>

        {/* Material Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#EC4899', '#DB2777']}
              style={styles.sectionIconBg}
            >
              <Feather name="package" size={20} color="#fff" />
            </LinearGradient>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Material Details
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                Material Type *
              </ThemedText>
              <Pressable
                onPress={() => setShowMaterialPicker(true)}
                style={[styles.inputContainer, { 
                  backgroundColor: isDark ? '#374151' : '#F3F4F6',
                }]}
              >
                <View style={[styles.inputIcon, { backgroundColor: '#EC489920' }]}>
                  <Feather name="package" size={18} color="#EC4899" />
                </View>
                <ThemedText
                  type="body"
                  style={[
                    styles.input,
                    !formData.materialType && { color: theme.textSecondary },
                  ]}
                >
                  {formData.materialType || 'Select material type'}
                </ThemedText>
                <Feather name="chevron-down" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
                Weight/Quantity *
              </ThemedText>
              <View style={[styles.inputContainer, { 
                backgroundColor: isDark ? '#374151' : '#F3F4F6',
              }]}>
                <View style={[styles.inputIcon, { backgroundColor: '#06B6D420' }]}>
                  <Feather name="activity" size={18} color="#06B6D4" />
                </View>
                <TextInput
                  style={[styles.input, { color: theme.text }]}
                  value={formData.weight}
                  onChangeText={(text) => setFormData({ ...formData, weight: text })}
                  placeholder="e.g., 5 tons, 100 bags"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            </View>
          </View>
        </View>


{/* Amount Section */}
<View style={styles.sectionContainer}>
  <View style={styles.sectionHeader}>
    <LinearGradient
      colors={['#F97316', '#EA580C']}
      style={styles.sectionIconBg}
    >
      <Feather name="credit-card" size={20} color="#fff" />
    </LinearGradient>
    <ThemedText type="subtitle" style={styles.sectionTitle}>
      Amount Details
    </ThemedText>
  </View>

  <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
    <View style={styles.inputGroup}>
      <ThemedText type="small" style={[styles.label, { color: theme.textSecondary }]}>
        Transport Amount *
      </ThemedText>

      <View
        style={[
          styles.inputContainer,
          { backgroundColor: isDark ? '#374151' : '#F3F4F6' },
        ]}
      >
        <View style={[styles.inputIcon, { backgroundColor: '#F9731620' }]}>
          <Feather name="dollar-sign" size={18} color="#F97316" />
        </View>

        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={formData.amount}
          onChangeText={(text) =>
            setFormData({ ...formData, amount: text })
          }
          placeholder="Enter amount (e.g. 25000)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="numeric"
        />
      </View>
    </View>
  </View>
</View>

        {/* Payment Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              style={styles.sectionIconBg}
            >
              <Feather name="dollar-sign" size={20} color="#fff" />
            </LinearGradient>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Payment Status
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.paymentOptions}>
              <Pressable
                onPress={() => setFormData({ ...formData, payment: 'pending' })}
                style={({ pressed }) => [
                  styles.paymentOption,
                  formData.payment === 'pending' && styles.paymentOptionActivePending,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <LinearGradient
                  colors={formData.payment === 'pending' ? ['#F59E0B', '#D97706'] : ['transparent', 'transparent']}
                  style={styles.paymentGradient}
                >
                  <View style={[
                    styles.paymentIconBg,
                    { backgroundColor: formData.payment === 'pending' ? 'rgba(255,255,255,0.3)' : '#F59E0B20' }
                  ]}>
                    <Feather name="clock" size={24} color={formData.payment === 'pending' ? '#fff' : '#F59E0B'} />
                  </View>
                  <ThemedText 
                    type="body" 
                    style={[
                      styles.paymentText,
                      formData.payment === 'pending' && { color: '#fff' }
                    ]}
                  >
                    Pending
                  </ThemedText>
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => setFormData({ ...formData, payment: 'paid' })}
                style={({ pressed }) => [
                  styles.paymentOption,
                  formData.payment === 'paid' && styles.paymentOptionActivePaid,
                  pressed && { opacity: 0.7 }
                ]}
              >
                <LinearGradient
                  colors={formData.payment === 'paid' ? ['#10B981', '#059669'] : ['transparent', 'transparent']}
                  style={styles.paymentGradient}
                >
                  <View style={[
                    styles.paymentIconBg,
                    { backgroundColor: formData.payment === 'paid' ? 'rgba(255,255,255,0.3)' : '#10B98120' }
                  ]}>
                    <Feather name="check-circle" size={24} color={formData.payment === 'paid' ? '#fff' : '#10B981'} />
                  </View>
                  <ThemedText 
                    type="body" 
                    style={[
                      styles.paymentText,
                      formData.payment === 'paid' && { color: '#fff' }
                    ]}
                  >
                    Paid
                  </ThemedText>
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Floating Save Button */}
      <View style={[styles.fabContainer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={handleSave}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveButton,
            pressed && { transform: [{ scale: 0.95 }] }
          ]}
        >
          <LinearGradient
            colors={['#F97316', '#EA580C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveButtonGradient}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Feather name="check" size={22} color="#fff" />
                <ThemedText type="body" style={styles.saveButtonText}>
                  {isNewTransport ? 'Create Transport' : 'Update Transport'}
                </ThemedText>
              </>
            )}
          </LinearGradient>
        </Pressable>
      </View>

      {/* Material Picker Modal */}
      <Modal
        visible={showMaterialPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMaterialPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowMaterialPicker(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
            <LinearGradient
              colors={['#EC4899', '#DB2777']}
              style={styles.modalHeader}
            >
              <ThemedText type="subtitle" style={{ color: '#fff' }}>
                Select Material Type
              </ThemedText>
              <Pressable onPress={() => setShowMaterialPicker(false)} hitSlop={8}>
                <Feather name="x" size={24} color="#fff" />
              </Pressable>
            </LinearGradient>
            <FlatList
              data={materialCategories}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => selectMaterial(item.name)}
                  style={({ pressed }) => [
                    styles.materialItem,
                    pressed && { backgroundColor: isDark ? '#374151' : '#F3F4F6' },
                    formData.materialType === item.name && styles.materialItemSelected
                  ]}
                >
                  <LinearGradient
                    colors={[item.color + 'CC', item.color]}
                    style={styles.materialColor}
                  >
                    <Feather name="package" size={16} color="#fff" />
                  </LinearGradient>
                  <ThemedText type="body" style={{ flex: 1 }}>
                    {item.name}
                  </ThemedText>
                  {formData.materialType === item.name && (
                    <View style={styles.checkIconBg}>
                      <Feather name="check" size={18} color="#10B981" />
                    </View>
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: Spacing.md,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
    borderBottomLeftRadius: BorderRadius.xl,
    borderBottomRightRadius: BorderRadius.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  headerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 20,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontSize: 13,
  },
  content: {
    padding: Spacing.md,
  },
  sectionContainer: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  sectionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontWeight: '700',
    fontSize: 17,
  },
  card: {
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  label: {
    marginBottom: Spacing.xs,
    fontWeight: '600',
    fontSize: 13,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.sm,
    height: 56,
    gap: Spacing.sm,
  },
  inputIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  routeArrow: {
    alignItems: 'center',
    marginVertical: Spacing.xs,
  },
  paymentOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  paymentOption: {
    flex: 1,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  paymentOptionActivePending: {
    borderColor: '#F59E0B',
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentOptionActivePaid: {
    borderColor: '#10B981',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  paymentGradient: {
    padding: Spacing.md,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  paymentIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentText: {
    fontWeight: '700',
    fontSize: 15,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
    backgroundColor: 'transparent',
  },
  saveButton: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    shadowColor: '#F97316',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md + 2,
    gap: Spacing.sm,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xxl,
    borderTopRightRadius: BorderRadius.xxl,
    maxHeight: '70%',
    overflow: 'hidden',
      backgroundColor: '#F9FAFB', // 🌟 soft off-white

  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
materialItem: {
  flexDirection: 'row',
  alignItems: 'center',
  padding: Spacing.md,
  gap: Spacing.sm,
  marginHorizontal: Spacing.md,
  marginVertical: Spacing.xs,
  borderRadius: BorderRadius.lg,
  backgroundColor: '#FFFFFF',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.06,
  shadowRadius: 6,
  elevation: 3,
},

  materialItemSelected: {
    backgroundColor: '#10B98110',
  },
  materialColor: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkIconBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10B98120',
    alignItems: 'center',
    justifyContent: 'center',
  },
});