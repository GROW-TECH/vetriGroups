import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Alert, Modal, Linking, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
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

type VendorDetailRouteProp = RouteProp<RootStackParamList, 'VendorDetail'>;

export default function VendorDetailScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<VendorDetailRouteProp>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { vendors, updateVendor, deleteVendor } = useData();

  const vendor = vendors.find((v) => v.id === route.params.vendorId);

  const [showEditModal, setShowEditModal] = useState(false);
  const [vendorName, setVendorName] = useState(vendor?.name || '');
  const [contactPerson, setContactPerson] = useState(vendor?.contactPerson || '');
  const [phone, setPhone] = useState(vendor?.phone || '');
  const [email, setEmail] = useState(vendor?.email || '');
  const [address, setAddress] = useState(vendor?.address || '');
  const [gstNumber, setGstNumber] = useState(vendor?.gstNumber || '');
  const [notes, setNotes] = useState(vendor?.notes || '');
  const [materials, setMaterials] = useState<VendorMaterial[]>(vendor?.materials || []);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);
  const [materialCategory, setMaterialCategory] = useState<MaterialCategory | ''>('');
  const [materialName, setMaterialName] = useState('');
  const [materialPrice, setMaterialPrice] = useState('');
  const [materialUnit, setMaterialUnit] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'engineer';

  const getCategoryLabel = (category: string) => {
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

  if (!vendor) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather name="alert-circle" size={48} color={theme.textSecondary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
          Vendor not found
        </ThemedText>
      </ThemedView>
    );
  }

  const handleCall = () => {
    Linking.openURL(`tel:${vendor.phone}`);
  };

  const handleEmail = () => {
    if (vendor.email) {
      Linking.openURL(`mailto:${vendor.email}`);
    }
  };

  const openEditModal = () => {
    setVendorName(vendor.name);
    setContactPerson(vendor.contactPerson || '');
    setPhone(vendor.phone);
    setEmail(vendor.email || '');
    setAddress(vendor.address || '');
    setGstNumber(vendor.gstNumber || '');
    setNotes(vendor.notes || '');
    setMaterials([...vendor.materials]);
    setShowEditModal(true);
  };

  const handleAddMaterial = () => {
    if (!materialCategory || !materialName.trim() || !materialPrice.trim() || !materialUnit.trim()) {
      Alert.alert('Missing Fields', 'Please fill in all material details.');
      return;
    }

    const newMaterial: VendorMaterial = {
      category: materialCategory as MaterialCategory,
      name: materialName.trim(),
      unitPrice: parseFloat(materialPrice) || 0,
      unit: materialUnit.trim(),
    };

    if (editingMaterialIndex !== null) {
      const updated = [...materials];
      updated[editingMaterialIndex] = newMaterial;
      setMaterials(updated);
    } else {
      setMaterials([...materials, newMaterial]);
    }

    setMaterialCategory('');
    setMaterialName('');
    setMaterialPrice('');
    setMaterialUnit('');
    setEditingMaterialIndex(null);
    setShowMaterialModal(false);
  };

  const openEditMaterial = (index: number) => {
    const material = materials[index];
    setEditingMaterialIndex(index);
    setMaterialCategory(material.category);
    setMaterialName(material.name);
    setMaterialPrice(material.unitPrice.toString());
    setMaterialUnit(material.unit);
    setShowMaterialModal(true);
  };

  const handleRemoveMaterial = (index: number) => {
    Alert.alert('Remove Material', 'Are you sure you want to remove this material?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => setMaterials(materials.filter((_, i) => i !== index)) },
    ]);
  };

  const handleUpdateVendor = async () => {
    if (!vendorName.trim() || !phone.trim()) {
      Alert.alert('Missing Fields', 'Please enter vendor name and phone number.');
      return;
    }

    if (materials.length === 0) {
      Alert.alert('No Materials', 'Please add at least one material with pricing.');
      return;
    }

    const updatedVendor: Vendor = {
      ...vendor,
      name: vendorName.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      gstNumber: gstNumber.trim() || undefined,
      materials,
      notes: notes.trim() || undefined,
      createdAt: vendor.createdAt,
    };

    await updateVendor(updatedVendor);
    setShowEditModal(false);
    Alert.alert('Success', 'Vendor updated successfully!');
  };

  const handleDeleteVendor = () => {
    Alert.alert('Delete Vendor', `Are you sure you want to delete ${vendor.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteVendor(vendor.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const groupedMaterials = vendor.materials.reduce((acc, mat) => {
    if (!acc[mat.category]) {
      acc[mat.category] = [];
    }
    acc[mat.category].push(mat);
    return acc;
  }, {} as Record<string, VendorMaterial[]>);

  return (
    <ThemedView style={styles.container}>
    <ScrollView
  contentContainerStyle={[
    styles.scrollContent,
    { paddingBottom: insets.bottom + Spacing.xl }
  ]}
  showsVerticalScrollIndicator={false}
      >
         <View style={styles.pageWrapper}>
        <View style={[styles.headerCard, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
          <View style={[styles.vendorIconLarge, { backgroundColor: Colors.light.roleVendor + '15' }]}>
            <Feather name="truck" size={32} color={Colors.light.roleVendor} />
          </View>
          <ThemedText type="h4" style={{ marginTop: Spacing.md, textAlign: 'center' }}>
            {vendor.name}
          </ThemedText>
          {vendor.contactPerson ? (
            <ThemedText type="body" style={{ color: theme.textSecondary, textAlign: 'center', marginTop: Spacing.xs }}>
              {vendor.contactPerson}
            </ThemedText>
          ) : null}

          <View style={styles.contactButtons}>
            <Pressable
              onPress={handleCall}
              style={[styles.contactBtn, { backgroundColor: Colors.light.success + '15' }]}
            >
              <Feather name="phone" size={20} color={Colors.light.success} />
              <ThemedText type="small" style={{ color: Colors.light.success, fontWeight: '500' }}>
                Call
              </ThemedText>
            </Pressable>
            {vendor.email ? (
              <Pressable
                onPress={handleEmail}
                style={[styles.contactBtn, { backgroundColor: Colors.light.primary + '15' }]}
              >
                <Feather name="mail" size={20} color={Colors.light.primary} />
                <ThemedText type="small" style={{ color: Colors.light.primary, fontWeight: '500' }}>
                  Email
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>
</View>
        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
          <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.md }}>
            Contact Details
          </ThemedText>
          <View style={styles.infoRow}>
            <Feather name="phone" size={18} color={theme.textSecondary} />
            <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{vendor.phone}</ThemedText>
          </View>
          {vendor.email ? (
            <View style={styles.infoRow}>
              <Feather name="mail" size={18} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md }}>{vendor.email}</ThemedText>
            </View>
          ) : null}
          {vendor.address ? (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={18} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md, flex: 1 }}>{vendor.address}</ThemedText>
            </View>
          ) : null}
          {vendor.gstNumber ? (
            <View style={styles.infoRow}>
              <Feather name="file-text" size={18} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md }}>GST: {vendor.gstNumber}</ThemedText>
            </View>
          ) : null}
        </View>

        <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
          <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.md }}>
            Materials & Pricing
          </ThemedText>
          {Object.entries(groupedMaterials).map(([category, mats]) => (
            <View key={category} style={styles.categoryGroup}>
              <View style={[styles.categoryHeader, { backgroundColor: getCategoryColor(category) + '15' }]}>
                <ThemedText type="small" style={{ color: getCategoryColor(category), fontWeight: '600' }}>
                  {getCategoryLabel(category)}
                </ThemedText>
                <ThemedText type="small" style={{ color: getCategoryColor(category) }}>
                  {mats.length} item{mats.length > 1 ? 's' : ''}
                </ThemedText>
              </View>
              {mats.map((mat, idx) => (
                <View key={idx} style={[styles.materialRow, { borderBottomColor: theme.border }]}>
                  <ThemedText type="body" style={{ flex: 1 }}>{mat.name}</ThemedText>
                  <ThemedText type="body" style={{ color: Colors.light.success, fontWeight: '600' }}>
                    Rs.{mat.unitPrice}/{mat.unit}
                  </ThemedText>
                </View>
              ))}
            </View>
          ))}
        </View>

        {vendor.notes ? (
          <View style={[styles.section, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}>
            <ThemedText type="body" style={{ fontWeight: '600', marginBottom: Spacing.md }}>
              Notes
            </ThemedText>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>{vendor.notes}</ThemedText>
          </View>
        ) : null}

        {canEdit ? (
          <View style={styles.actionButtons}>
            <Button onPress={openEditModal} style={{ flex: 1 }}>
              Edit Vendor
            </Button>
            <Pressable onPress={handleDeleteVendor} style={styles.deleteBtn}>
              <Feather name="trash-2" size={20} color={Colors.light.error} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Pressable onPress={() => setShowEditModal(false)}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: '600' }}>Edit Vendor</ThemedText>
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
                  onPress={() => {
                    setEditingMaterialIndex(null);
                    setMaterialCategory('');
                    setMaterialName('');
                    setMaterialPrice('');
                    setMaterialUnit('');
                    setShowMaterialModal(true);
                  }}
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
                    <Pressable onPress={() => openEditMaterial(index)} style={styles.materialItemInfo}>
                      <View style={[styles.materialCategoryBadge, { backgroundColor: getCategoryColor(material.category) + '20' }]}>
                        <ThemedText type="small" style={{ color: getCategoryColor(material.category), fontWeight: '500', fontSize: 10 }}>
                          {getCategoryLabel(material.category)}
                        </ThemedText>
                      </View>
                      <ThemedText type="body" style={{ fontWeight: '500' }}>{material.name}</ThemedText>
                      <ThemedText type="small" style={{ color: theme.textSecondary }}>
                        Rs.{material.unitPrice} / {material.unit}
                      </ThemedText>
                    </Pressable>
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

            <Button onPress={handleUpdateVendor} style={{ marginTop: Spacing.xl }}>
              Update Vendor
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
            <ThemedText type="body" style={{ fontWeight: '600' }}>
              {editingMaterialIndex !== null ? 'Edit Material' : 'Add Material'}
            </ThemedText>
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
                  {MATERIAL_CATEGORIES.map((cat) => (
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
                </View>
              </ScrollView>
            </View>

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
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  headerCard: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  vendorIconLarge: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  contactBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  section: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
  },
  categoryGroup: {
    marginBottom: Spacing.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.xs,
    marginBottom: Spacing.xs,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderBottomWidth: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  deleteBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.error + '15',
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
  pageWrapper: {
  width: '100%',
  maxWidth: 720,
  alignSelf: 'center',
},

});
