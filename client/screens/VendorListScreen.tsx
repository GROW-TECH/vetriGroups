import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, Pressable, TextInput, Alert, Modal, ScrollView } from 'react-native';
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
import { Vendor, VendorMaterial, MATERIAL_CATEGORIES, MaterialCategory } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';
import { RootStackParamList } from '@/navigation/RootStackNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

interface CustomCategory {
  id: string;
  name: string;
  color: string;
}

export default function VendorListScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavProp>();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { vendors, addVendor, deleteVendor } = useData();

  const [showAddModal, setShowAddModal] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [materials, setMaterials] = useState<VendorMaterial[]>([]);
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [materialCategory, setMaterialCategory] = useState<MaterialCategory | ''>('');
  const [customCategoryName, setCustomCategoryName] = useState('');
  const [materialName, setMaterialName] = useState('');
  const [materialPrice, setMaterialPrice] = useState('');
  const [materialUnit, setMaterialUnit] = useState('');
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [allCategories, setAllCategories] = useState(MATERIAL_CATEGORIES);

  const canAdd = user?.role === 'admin' || user?.role === 'engineer';

  // Update allCategories when customCategories change
  useEffect(() => {
    setAllCategories([...customCategories, ...MATERIAL_CATEGORIES]);
  }, [customCategories]);

  const getCategoryLabel = (category: string) => {
    // Check custom categories first
    const customCat = customCategories.find(c => c.id === category);
    if (customCat) return customCat.name;

    const labels: Record<string, string> = {
      steel: 'Steel',
      m_sand: 'M-Sand',
      p_sand: 'P-Sand',
      cement: 'Cement',
      aggregate: 'Aggregate',
      bricks: 'Bricks',
      tiles: 'Tiles',
      electrical: 'Electrical',
      plumbing: 'Plumbing',
      paint: 'Paint',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    // Check custom categories first
    const customCat = customCategories.find(c => c.id === category);
    if (customCat) return customCat.color;

    const colors: Record<string, string> = {
      steel: '#6366F1',
      m_sand: '#F59E0B',
      p_sand: '#EAB308',
      cement: '#64748B',
      aggregate: '#78716C',
      bricks: '#EF4444',
      tiles: '#06B6D4',
      electrical: '#10B981',
      plumbing: '#3B82F6',
      paint: '#EC4899',
      other: '#8B5CF6',
    };
    return colors[category] || '#64748B';
  };

  const generateCategoryId = (name: string) => {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  };

  const getRandomColor = () => {
    const colors = ['#6366F1', '#F59E0B', '#EF4444', '#06B6D4', '#10B981', '#EC4899', '#8B5CF6', '#F97316'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const handleAddMaterial = () => {
    // Handle custom category creation
    if (materialCategory === 'other' && customCategoryName.trim()) {
      const categoryId = generateCategoryId(customCategoryName.trim());
      const newCategory: CustomCategory = {
        id: categoryId,
        name: customCategoryName.trim(),
        color: getRandomColor(),
      };
      
      // Add to custom categories if not already exists
      if (!customCategories.find(c => c.id === categoryId)) {
        setCustomCategories([newCategory, ...customCategories]);
      }
      
      // Validate other fields
      if (!materialName.trim() || !materialPrice.trim() || !materialUnit.trim()) {
        Alert.alert('Missing Fields', 'Please fill in all material details.');
        return;
      }

      const newMaterial: VendorMaterial = {
        category: categoryId as MaterialCategory,
        name: materialName.trim(),
        unitPrice: parseFloat(materialPrice) || 0,
        unit: materialUnit.trim(),
      };

      setMaterials([...materials, newMaterial]);
      setMaterialCategory('');
      setCustomCategoryName('');
      setMaterialName('');
      setMaterialPrice('');
      setMaterialUnit('');
      setShowMaterialModal(false);
      return;
    }

    // Validate category selection
    if (!materialCategory || materialCategory === 'other') {
      Alert.alert('Missing Category', 'Please select a category or enter a custom category name.');
      return;
    }

    if (!materialName.trim() || !materialPrice.trim() || !materialUnit.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all material details.');
      return;
    }

    const newMaterial: VendorMaterial = {
      category: materialCategory as MaterialCategory,
      name: materialName.trim(),
      unitPrice: parseFloat(materialPrice) || 0,
      unit: materialUnit.trim(),
    };

    setMaterials([...materials, newMaterial]);
    setMaterialCategory('');
    setCustomCategoryName('');
    setMaterialName('');
    setMaterialPrice('');
    setMaterialUnit('');
    setShowMaterialModal(false);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setVendorName('');
    setContactPerson('');
    setPhone('');
    setEmail('');
    setAddress('');
    setGstNumber('');
    setNotes('');
    setMaterials([]);
    setCustomCategoryName('');
  };

  const handleAddVendor = async () => {
  if (!vendorName.trim() || !phone.trim()) {
    Alert.alert('Missing Fields', 'Please enter vendor name and phone number.');
    return;
  }

  if (materials.length === 0) {
    Alert.alert('No Materials', 'Please add at least one material with pricing.');
    return;
  }

  const newVendor: Vendor = {
    id: String(Date.now()),
    name: vendorName.trim(),
    contactPerson: contactPerson.trim() || "",
    phone: phone.trim(),
    email: email.trim() || "",
    address: address.trim() || "",
    gstNumber: gstNumber.trim() || "",
    materials,
    notes: notes.trim() || "",
    createdAt: new Date().toISOString().split('T')[0],
  };

  console.log("NEW VENDOR DATA:", newVendor); // 👈 KEEP FOR DEBUG

  await addVendor(newVendor);
  resetForm();
  setShowAddModal(false);
  Alert.alert('Success', 'Vendor added successfully!');
};


  const handleDeleteVendor = (vendor: Vendor) => {
    Alert.alert(
      'Delete Vendor',
      `Are you sure you want to delete ${vendor.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteVendor(vendor.id);
          },
        },
      ]
    );
  };

  const renderVendor = ({ item }: { item: Vendor }) => {
    const categories = [...new Set(item.materials.map(m => m.category))];
    
    return (
      <Pressable
        onPress={() => navigation.navigate('VendorDetail', { vendorId: item.id })}
        onLongPress={() => handleDeleteVendor(item)}
        style={({ pressed }) => [
          styles.vendorCard,
          { backgroundColor: theme.backgroundDefault, opacity: pressed ? 0.7 : 1 },
          Shadows.sm,
        ]}
      >
        <View style={[styles.vendorIcon, { backgroundColor: Colors.light.roleVendor + '15' }]}>
          <Feather name="truck" size={24} color={Colors.light.roleVendor} />
        </View>
        <View style={styles.vendorInfo}>
          <ThemedText type="body" style={{ fontWeight: '600' }}>{item.name}</ThemedText>
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
          </View>
        </View>
        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <FlatList
        data={vendors}
        keyExtractor={(item) => item.id}
        renderItem={renderVendor}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl + 70 },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="truck" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
              No vendors yet
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
              Add vendors to manage material suppliers
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
            <Pressable onPress={() => { resetForm(); setShowAddModal(false); }}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>New Vendor</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Vendor Name *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={vendorName}
                onChangeText={setVendorName}
                placeholder="Enter vendor/company name"
                placeholderTextColor={theme.textSecondary}
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
              />
            </View>

            <View style={styles.materialsSection}>
              <View style={styles.materialsSectionHeader}>
                <ThemedText type="body" style={{ fontWeight: '600' }}>Materials & Pricing *</ThemedText>
                <Pressable
                  onPress={() => setShowMaterialModal(true)}
                  style={[styles.addMaterialBtn, { backgroundColor: Colors.light.primary + '15' }]}
                >
                  <Feather name="plus" size={16} color={Colors.light.primary} />
                  <ThemedText type="small" style={{ color: Colors.light.primary, fontWeight: '500' }}>Add</ThemedText>
                </Pressable>
              </View>

              {materials.length === 0 ? (
                <View style={[styles.noMaterials, { backgroundColor: theme.backgroundDefault }]}>
                  <Feather name="package" size={24} color={theme.textSecondary} />
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: Spacing.xs }}>
                    No materials added yet
                  </ThemedText>
                </View>
              ) : (
                materials.map((material, index) => (
                  <View key={index} style={[styles.materialItem, { backgroundColor: theme.backgroundDefault }]}>
                    <View style={styles.materialItemInfo}>
                      <View style={[styles.materialCategoryBadge, { backgroundColor: getCategoryColor(material.category) + '20' }]}>
                        <ThemedText type="small" style={{ color: getCategoryColor(material.category), fontWeight: '500', fontSize: 10 }}>
                          {getCategoryLabel(material.category)}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" style={{ fontWeight: '500' }}>{material.name}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        Rs.{material.unitPrice} / {material.unit}
                      </ThemedText>
                    </View>
                    <Pressable onPress={() => handleRemoveMaterial(index)}>
                      <Feather name="x-circle" size={20} color={Colors.light.error} />
                    </Pressable>
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
              />
            </View>

            <Button onPress={handleAddVendor} style={{ marginTop: Spacing.xl }}>
              Add Vendor
            </Button>
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
      </Modal>

      <Modal
        visible={showMaterialModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowMaterialModal(false)}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Add Material</ThemedText>
            <Pressable onPress={handleAddMaterial}>
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
                  {allCategories.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setMaterialCategory(cat.id)}
                      style={[
                        styles.categoryOption,
                        { 
                          backgroundColor: materialCategory === cat.id ? getCategoryColor(cat.id) : getCategoryColor(cat.id) + '15',
                          borderColor: getCategoryColor(cat.id),
                        },
                      ]}
                    >
                      <ThemedText 
                        type="small" 
                        style={{ 
                          color: materialCategory === cat.id ? '#FFFFFF' : getCategoryColor(cat.id),
                          fontWeight: '500',
                        }}
                      >
                        {cat.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                  <Pressable
                    onPress={() => setMaterialCategory('other')}
                    style={[
                      styles.categoryOption,
                      { 
                        backgroundColor: materialCategory === 'other' ? '#8B5CF6' : '#8B5CF6' + '15',
                        borderColor: '#8B5CF6',
                      },
                    ]}
                  >
                    <ThemedText 
                      type="small" 
                      style={{ 
                        color: materialCategory === 'other' ? '#FFFFFF' : '#8B5CF6',
                        fontWeight: '500',
                      }}
                    >
                      Other
                    </ThemedText>
                  </Pressable>
                </View>
              </ScrollView>
            </View>

            {materialCategory === 'other' && (
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.label}>Custom Category Name *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                  value={customCategoryName}
                  onChangeText={setCustomCategoryName}
                  placeholder="e.g., Hardware, Timber, Glass"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <ThemedText type="small" style={styles.label}>Material Name *</ThemedText>
              <TextInput
                style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                value={materialName}
                onChangeText={setMaterialName}
                placeholder="e.g., TMT Steel Bars 12mm"
                placeholderTextColor={theme.textSecondary}
              />
            </View>

            <View style={styles.inputRow}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                <ThemedText type="small" style={styles.label}>Price (Rs.) *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                  value={materialPrice}
                  onChangeText={setMaterialPrice}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="numeric"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <ThemedText type="small" style={styles.label}>Unit *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.backgroundDefault, borderColor: theme.border, color: theme.text }]}
                  value={materialUnit}
                  onChangeText={setMaterialUnit}
                  placeholder="kg, cft, bag"
                  placeholderTextColor={theme.textSecondary}
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
  listContent: {
    padding: Spacing.lg,
  },
  vendorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
  },
  vendorIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  vendorInfo: {
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
    backgroundColor: Colors.light.roleVendor,
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
  materialsSection: {
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  materialsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  addMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  noMaterials: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  materialItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
  },
  materialItemInfo: {
    flex: 1,
    gap: 2,
  },
  materialCategoryBadge: {
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