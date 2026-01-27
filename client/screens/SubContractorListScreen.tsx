// screens/SubContractorListScreen.tsx
import React, { useState, useEffect } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  TextInput, 
  Alert, 
  Modal, 
  ScrollView,
  ActivityIndicator
} from 'react-native';
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
import { SubContractor, SubContractorService } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

// Service categories for sub-contractors
const SERVICE_CATEGORIES = [
  { id: 'structural', name: 'Structural Work', color: '#6366F1' },
  { id: 'electrical', name: 'Electrical', color: '#10B981' },
  { id: 'plumbing', name: 'Plumbing', color: '#3B82F6' },
  { id: 'carpentry', name: 'Carpentry', color: '#F59E0B' },
  { id: 'painting', name: 'Painting', color: '#EC4899' },
  { id: 'tiling', name: 'Tiling', color: '#06B6D4' },
  { id: 'plastering', name: 'Plastering', color: '#78716C' },
  { id: 'excavation', name: 'Excavation', color: '#EF4444' },
  { id: 'concrete', name: 'Concrete Work', color: '#64748B' },
  { id: 'other', name: 'Other', color: '#8B5CF6' },
];

export default function SubContractorListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { subContractors, addSubContractor, deleteSubContractor, isLoading } = useData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [workType, setWorkType] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [services, setServices] = useState<SubContractorService[]>([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceCategory, setServiceCategory] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [serviceRate, setServiceRate] = useState('');
  const [serviceUnit, setServiceUnit] = useState('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [saving, setSaving] = useState(false);

  const canAdd = user?.role === 'admin' || user?.role === 'engineer';

  const getCategoryLabel = (category: string) => {
    const cat = SERVICE_CATEGORIES.find(c => c.id === category);
    return cat ? cat.name : category;
  };

  const getCategoryColor = (category: string) => {
    const cat = SERVICE_CATEGORIES.find(c => c.id === category);
    return cat ? cat.color : '#64748B';
  };

  const handleAddService = () => {
    // Handle custom category creation
    if (serviceCategory === 'other' && customCategoryName.trim()) {
      if (!serviceName.trim() || !serviceRate.trim() || !serviceUnit.trim()) {
        Alert.alert('Missing Fields', 'Please fill in all service details.');
        return;
      }

      const newService: SubContractorService = {
        category: customCategoryName.trim(),
        name: serviceName.trim(),
        rate: parseFloat(serviceRate) || 0,
        unit: serviceUnit.trim(),
      };

      setServices([...services, newService]);
    } else if (!serviceCategory || serviceCategory === 'other') {
      Alert.alert('Missing Category', 'Please select a category or enter a custom category name.');
      return;
    } else if (!serviceName.trim() || !serviceRate.trim() || !serviceUnit.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all service details.');
      return;
    } else {
      const newService: SubContractorService = {
        category: serviceCategory,
        name: serviceName.trim(),
        rate: parseFloat(serviceRate) || 0,
        unit: serviceUnit.trim(),
      };

      setServices([...services, newService]);
    }

    // Reset form
    setServiceCategory('');
    setCustomCategoryName('');
    setServiceName('');
    setServiceRate('');
    setServiceUnit('');
    setShowServiceModal(false);
  };

  const handleRemoveService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setCompanyName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setWorkType('');
    setSpecialization('');
    setAddress('');
    setGstNumber('');
    setLicenseNumber('');
    setNotes('');
    setServices([]);
    setCustomCategoryName('');
  };

  const handleAddSubContractor = async () => {
    if (!companyName.trim() || !phone.trim() || !workType.trim()) {
      Alert.alert('Missing Fields', 'Please enter company name, phone number, and work type.');
      return;
    }

    if (services.length === 0) {
      Alert.alert('No Services', 'Please add at least one service with rate.');
      return;
    }

    setSaving(true);
    
    try {
      const newSubContractor: Omit<SubContractor, 'id' | 'createdAt'> = {
        companyName: companyName.trim(),
        contactPerson: contactPerson.trim() || "",
        phone: phone.trim(),
        email: email.trim() || "",
        workType: workType.trim(),
        specialization: specialization.trim() || "",
        address: address.trim() || "",
        gstNumber: gstNumber.trim() || "",
        licenseNumber: licenseNumber.trim() || "",
        status: 'active',
        services,
        notes: notes.trim() || "",
      };

      console.log("ADDING SUB-CONTRACTOR TO FIREBASE:", newSubContractor);

      await addSubContractor(newSubContractor);
      resetForm();
      setShowAddModal(false);
      setSaving(false);
      Alert.alert('Success', 'Sub-Contractor added successfully!');
    } catch (error: any) {
      console.error('Error adding sub-contractor:', error);
      setSaving(false);
      Alert.alert('Error', `Failed to add sub-contractor: ${error.message || 'Unknown error'}`);
    }
  };

  const handleDeleteSubContractor = (subContractor: SubContractor) => {
    Alert.alert(
      'Delete Sub-Contractor',
      `Are you sure you want to delete ${subContractor.companyName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteSubContractor(subContractor.id);
              Alert.alert('Success', 'Sub-Contractor deleted successfully!');
            } catch (error: any) {
              Alert.alert('Error', `Failed to delete sub-contractor: ${error.message || 'Unknown error'}`);
            }
          },
        },
      ]
    );
  };

  const renderSubContractor = ({ item }: { item: SubContractor }) => {
    // Safely handle services which might be undefined
    const itemServices = item.services || [];
    const categories = [...new Set(itemServices.map(s => s.category))];
    
    return (
      <Pressable
        onPress={() => navigation.navigate('SubContractorDetail', { subContractorId: item.id })}
        onLongPress={() => handleDeleteSubContractor(item)}
        style={({ pressed }) => [
          styles.subContractorCard,
          { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
          Shadows.sm,
        ]}
      >
        <View style={[styles.subContractorIcon, { backgroundColor: '#8B5CF6' + '15' }]}>
          <Feather name="tool" size={24} color="#8B5CF6" />
        </View>
        <View style={styles.subContractorInfo}>
          <ThemedText type="body" style={{ fontWeight: '600' }}>{item.companyName}</ThemedText>
          {item.contactPerson ? (
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
              {item.contactPerson}
            </ThemedText>
          ) : null}
          <View style={styles.categoryTags}>
            {categories.slice(0, 3).map((cat, idx) => (
              <View key={idx} style={[styles.categoryTag, { backgroundColor: getCategoryColor(cat) + '20' }]}>
                <ThemedText type="small" style={{ color: getCategoryColor(cat), fontSize: 10, fontWeight: '500' }}>
                  {getCategoryLabel(cat)}
                </ThemedText>
              </View>
            ))}
            {categories.length > 3 ? (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                +{categories.length - 3}
              </ThemedText>
            ) : null}
            {categories.length === 0 && (
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                No services
              </ThemedText>
            )}
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
    );
  };

  // Show loading while data is being fetched
  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.light.primary} />
        <ThemedText type="body" style={{ marginTop: Spacing.md, color: theme.textSecondary }}>
          Loading sub-contractors...
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={subContractors}
        keyExtractor={(item) => item.id}
        renderItem={renderSubContractor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl + 70 },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="tool" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No sub-contractors yet
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Add sub-contractors to manage service providers
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
            <Pressable onPress={() => { resetForm(); setShowAddModal(false); }} disabled={saving}>
              <ThemedText type="body" style={{ color: saving ? theme.textSecondary : Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>New Sub-Contractor</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Company Name *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={companyName}
                onChangeText={setCompanyName}
                placeholder="Enter company name"
                placeholderTextColor={theme.textSecondary}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Contact Person</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={contactPerson}
                onChangeText={setContactPerson}
                placeholder="Enter contact person name"
                placeholderTextColor={theme.textSecondary}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Phone *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={phone}
                onChangeText={setPhone}
                placeholder="Enter phone number"
                placeholderTextColor={theme.textSecondary}
                keyboardType="phone-pad"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Email</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter email address"
                placeholderTextColor={theme.textSecondary}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Work Type *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={workType}
                onChangeText={setWorkType}
                placeholder="e.g., Electrical, Plumbing, Concrete"
                placeholderTextColor={theme.textSecondary}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Specialization</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={specialization}
                onChangeText={setSpecialization}
                placeholder="e.g., Industrial Wiring, PVC Plumbing"
                placeholderTextColor={theme.textSecondary}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Address</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Enter address"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>GST Number</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={gstNumber}
                onChangeText={setGstNumber}
                placeholder="Enter GST number"
                placeholderTextColor={theme.textSecondary}
                autoCapitalize="characters"
                editable={!saving}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>License Number</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={licenseNumber}
                onChangeText={setLicenseNumber}
                placeholder="Enter license number"
                placeholderTextColor={theme.textSecondary}
                editable={!saving}
              />
            </View>

            <View style={styles.servicesSection}>
              <View style={styles.servicesSectionHeader}>
                <ThemedText type="body" style={{ fontWeight: '600' }}>Services & Rates *</ThemedText>
                <Pressable
                  onPress={() => setShowServiceModal(true)}
                  style={[styles.addServiceBtn, { backgroundColor: Colors.light.primary + '15' }]}
                  disabled={saving}
                >
                  <Feather name="plus" size={16} color={saving ? theme.textSecondary : Colors.light.primary} />
                  <ThemedText type="small" style={{ color: saving ? theme.textSecondary : Colors.light.primary, fontWeight: '500' }}>Add</ThemedText>
                </Pressable>
              </View>

              {services.length === 0 ? (
                <View style={[styles.noServices, { backgroundColor: theme.backgroundDefault }]}>
                  <Feather name="briefcase" size={24} color={theme.textSecondary} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    No services added yet
                  </ThemedText>
                </View>
              ) : (
                services.map((service, index) => (
                  <View key={index} style={[styles.serviceItem, { backgroundColor: theme.backgroundDefault }]}>
                    <View style={styles.serviceItemInfo}>
                      <View style={[styles.serviceCategoryBadge, { backgroundColor: getCategoryColor(service.category) + '20' }]}>
                        <ThemedText type="small" style={{ color: getCategoryColor(service.category), fontWeight: '500', fontSize: 10 }}>
                          {getCategoryLabel(service.category)}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" style={{ fontWeight: '500' }}>{service.name}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        Rs.{service.rate} / {service.unit}
                      </ThemedText>
                    </View>
                    {!saving && (
                      <Pressable onPress={() => handleRemoveService(index)}>
                        <Feather name="x-circle" size={20} color={Colors.light.error} />
                      </Pressable>
                    )}
                  </View>
                ))
              )}
            </View>

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Notes</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes"
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={3}
                editable={!saving}
              />
            </View>

            <Button 
              onPress={handleAddSubContractor} 
              style={{ marginTop: Spacing.xl }}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                'Add Sub-Contractor'
              )}
            </Button>
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
      </Modal>

      <Modal
        visible={showServiceModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowServiceModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowServiceModal(false)}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Add Service</ThemedText>
            <Pressable onPress={handleAddService}>
              <ThemedText type="body" style={{ color: Colors.light.primary, fontWeight: '600' }}>Done</ThemedText>
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Category *</ThemedText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                <View style={styles.categoryOptions}>
                  {SERVICE_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setServiceCategory(cat.id)}
                      style={[
                        styles.categoryOption,
                        { 
                          backgroundColor: serviceCategory === cat.id ? cat.color : cat.color + '15',
                          borderColor: cat.color,
                        },
                      ]}
                      disabled={saving}
                    >
                      <ThemedText 
                        type="small" 
                        style={{ 
                          color: serviceCategory === cat.id ? '#FFFFFF' : cat.color,
                          fontWeight: '500',
                        }}
                      >
                        {cat.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </View>

            {serviceCategory === 'other' && (
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.label}>Custom Category Name *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                  value={customCategoryName}
                  onChangeText={setCustomCategoryName}
                  placeholder="e.g., Landscaping, HVAC, Roofing"
                  placeholderTextColor={theme.textSecondary}
                  editable={!saving}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Service Name *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={serviceName}
                onChangeText={setServiceName}
                placeholder="e.g., Electrical Wiring, Concrete Pouring"
                placeholderTextColor={theme.textSecondary}
                editable={!saving}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <ThemedText type="small" style={styles.label}>Rate (Rs.) *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                  value={serviceRate}
                  onChangeText={setServiceRate}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                  editable={!saving}
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText type="small" style={styles.label}>Unit *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                  value={serviceUnit}
                  onChangeText={setServiceUnit}
                  placeholder="sq.ft, day, unit"
                  placeholderTextColor={theme.textSecondary}
                  editable={!saving}
                />
              </View>
            </View>
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
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    padding: Spacing.lg,
  },
  subContractorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  subContractorIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  subContractorInfo: {
    flex: 1,
  },
  categoryTags: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  categoryTag: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
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
    backgroundColor: '#8B5CF6',
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
  inputRow: {
    flexDirection: 'row',
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
    height: 80,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
  },
  servicesSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  servicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addServiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  noServices: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  serviceItemInfo: {
    flex: 1,
    gap: 2,
  },
  serviceCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginBottom: 2,
  },
  categoryScroll: {
    marginTop: Spacing.xs,
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  categoryOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});