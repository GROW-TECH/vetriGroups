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
      steel: '#2563EB',
      m_sand: '#D97706',
      p_sand: '#CA8A04',
      cement: '#475569',
      aggregate: '#57534E',
      bricks: '#DC2626',
      tiles: '#0891B2',
      electrical: '#059669',
      plumbing: '#2563EB',
      paint: '#DB2777',
      other: '#7C3AED',
    };
    return colors[category] || '#64748B';
  };

  if (!vendor) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather name="alert-circle" size={48} color={theme.text} />
        <ThemedText type="body" style={{ color: theme.text, marginTop: Spacing.md }}>
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
        {/* Hero Section */}
        <View style={[styles.heroSection, { backgroundColor: theme.backgroundDefault }]}>
          <View style={[styles.vendorIconWrapper, { backgroundColor: Colors.light.primary + '10' }]}>
            <Feather name="truck" size={40} color={Colors.light.primary} />
          </View>
          <ThemedText type="h3" style={styles.vendorName}>{vendor.name}</ThemedText>
          {vendor.contactPerson ? (
            <ThemedText type="body" style={styles.contactPerson}>{vendor.contactPerson}</ThemedText>
          ) : null}
          
          <View style={styles.contactButtons}>
            <Pressable
              onPress={handleCall}
              style={[styles.contactButton, styles.callButton]}
            >
              <Feather name="phone" size={18} color="#FFFFFF" />
              <ThemedText type="small" style={styles.contactButtonText}>Call</ThemedText>
            </Pressable>
            {vendor.email ? (
              <Pressable
                onPress={handleEmail}
                style={[styles.contactButton, styles.emailButton]}
              >
                <Feather name="mail" size={18} color="#FFFFFF" />
                <ThemedText type="small" style={styles.contactButtonText}>Email</ThemedText>
              </Pressable>
            ) : null}
          </View>
        </View>

        {/* Contact Details Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.cardHeader}>
            <Feather name="user" size={20} color={Colors.light.primary} />
            <ThemedText type="body" style={styles.cardTitle}>Contact Details</ThemedText>
          </View>
          
          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Feather name="phone" size={16} color={theme.text} />
              <ThemedText type="body" style={styles.detailLabel}>Phone</ThemedText>
              <ThemedText type="body" style={styles.detailValue}>{vendor.phone}</ThemedText>
            </View>
            
            {vendor.email ? (
              <View style={styles.detailItem}>
                <Feather name="mail" size={16} color={theme.text} />
                <ThemedText type="body" style={styles.detailLabel}>Email</ThemedText>
                <ThemedText type="body" style={styles.detailValue}>{vendor.email}</ThemedText>
              </View>
            ) : null}
            
            {vendor.address ? (
              <View style={styles.detailItem}>
                <Feather name="map-pin" size={16} color={theme.text} />
                <ThemedText type="body" style={styles.detailLabel}>Address</ThemedText>
                <ThemedText type="body" style={[styles.detailValue, styles.multiline]}>{vendor.address}</ThemedText>
              </View>
            ) : null}
            
            {vendor.gstNumber ? (
              <View style={styles.detailItem}>
                <Feather name="file-text" size={16} color={theme.text} />
                <ThemedText type="body" style={styles.detailLabel}>GST Number</ThemedText>
                <ThemedText type="body" style={styles.detailValue}>{vendor.gstNumber}</ThemedText>
              </View>
            ) : null}
          </View>
        </View>

        {/* Materials & Pricing Card */}
        <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
          <View style={styles.cardHeader}>
            <Feather name="package" size={20} color={Colors.light.primary} />
            <ThemedText type="body" style={styles.cardTitle}>Materials & Pricing</ThemedText>
            <View style={styles.materialCount}>
              <ThemedText type="small" style={{ color: Colors.light.primary }}>
                {vendor.materials.length} items
              </ThemedText>
            </View>
          </View>

          {Object.entries(groupedMaterials).map(([category, mats]) => (
            <View key={category} style={styles.materialCategory}>
              <View style={styles.categoryHeader}>
                <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(category) }]} />
                <ThemedText type="small" style={[styles.categoryLabel, { color: getCategoryColor(category) }]}>
                  {getCategoryLabel(category)}
                </ThemedText>
                <ThemedText type="small" style={styles.itemCount}>
                  {mats.length} item{mats.length > 1 ? 's' : ''}
                </ThemedText>
              </View>
              
              <View style={styles.materialList}>
                {mats.map((mat, idx) => (
                  <View key={idx} style={[styles.materialItem, { borderBottomColor: Colors.light.border }]}>
                    <View style={styles.materialInfo}>
                      <ThemedText type="body" style={styles.materialName}>{mat.name}</ThemedText>
                      <ThemedText type="small" style={styles.materialUnit}>{mat.unit}</ThemedText>
                    </View>
                    <ThemedText type="body" style={styles.materialPrice}>
                      Rs. {mat.unitPrice.toLocaleString()}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Notes Card */}
        {vendor.notes ? (
          <View style={[styles.card, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.cardHeader}>
              <Feather name="file-text" size={20} color={Colors.light.primary} />
              <ThemedText type="body" style={styles.cardTitle}>Notes</ThemedText>
            </View>
            <ThemedText type="body" style={styles.notesText}>{vendor.notes}</ThemedText>
          </View>
        ) : null}

        {/* Action Buttons */}
        {canEdit ? (
          <View style={styles.actionSection}>
            <Button
  onPress={openEditModal}
  style={[styles.contactButton, styles.callButton]}
  textStyle={styles.editButtonText}
>
  <Feather name="edit-2" size={18} color={Colors.light.primary} style={{ marginRight: 8 }} />
  Edit Vendor
</Button>
            <Pressable
              onPress={handleDeleteVendor}
              style={[styles.deleteButton, { borderColor: Colors.light.error }]}
            >
              <Feather name="trash-2" size={18} color={Colors.light.error} />
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      {/* Edit Vendor Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: Colors.light.border }]}>
            <Pressable onPress={() => setShowEditModal(false)} style={styles.modalCancelButton}>
              <ThemedText type="body" style={{ color: theme.text }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="h4" style={styles.modalTitle}>Edit Vendor</ThemedText>
            <View style={{ width: 50 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            {/* Form Fields */}
            <View style={styles.formSection}>
              <ThemedText type="subtitle" style={styles.formSectionTitle}>Basic Information</ThemedText>
              
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Vendor Name <ThemedText type="small" style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                  value={vendorName}
                  onChangeText={setVendorName}
                  placeholder="Enter vendor/company name"
                  placeholderTextColor={theme.text}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>Contact Person</ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                  value={contactPerson}
                  onChangeText={setContactPerson}
                  placeholder="Enter contact person name"
                  placeholderTextColor={theme.text}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                  <ThemedText type="small" style={styles.inputLabel}>
                    Phone <ThemedText type="small" style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="Enter phone number"
                    placeholderTextColor={theme.text}
                    keyboardType="phone-pad"
                  />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" style={styles.inputLabel}>Email</ThemedText>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="Enter email address"
                    placeholderTextColor={theme.text}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>Address</ThemedText>
                <TextInput
                  style={[styles.formInput, styles.textArea, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                  value={address}
                  onChangeText={setAddress}
                  placeholder="Enter complete address"
                  placeholderTextColor={theme.text}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>GST Number</ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                  value={gstNumber}
                  onChangeText={setGstNumber}
                  placeholder="Enter GST number"
                  placeholderTextColor={theme.text}
                  autoCapitalize="characters"
                />
              </View>
            </View>

            {/* Materials Section */}
            <View style={styles.formSection}>
              <View style={styles.sectionHeader}>
                <ThemedText type="subtitle" style={styles.formSectionTitle}>
                  Materials & Pricing <ThemedText type="small" style={styles.required}>*</ThemedText>
                </ThemedText>
                <Pressable
                  onPress={() => {
                    setEditingMaterialIndex(null);
                    setMaterialCategory('');
                    setMaterialName('');
                    setMaterialPrice('');
                    setMaterialUnit('');
                    setShowMaterialModal(true);
                  }}
                  style={[styles.addButton, { backgroundColor: Colors.light.primary }]}
                >
                  <Feather name="plus" size={16} color="#FFFFFF" />
                  <ThemedText type="small" style={{ color: '#FFFFFF', fontWeight: '600' }}>
                    Add Material
                  </ThemedText>
                </Pressable>
              </View>

              {materials.length === 0 ? (
                <View style={[styles.emptyState, { backgroundColor: theme.backgroundDefault }]}>
                  <Feather name="package" size={32} color={theme.text} />
                  <ThemedText type="body" style={{ color: theme.text, marginTop: Spacing.sm }}>
                    No materials added yet
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.text, textAlign: 'center', marginTop: Spacing.xs }}>
                    Add materials to show pricing information
                  </ThemedText>
                </View>
              ) : (
                materials.map((material, index) => (
                  <View key={index} style={[styles.editMaterialItem, { backgroundColor: theme.backgroundDefault }]}>
                    <Pressable onPress={() => openEditMaterial(index)} style={styles.editMaterialContent}>
                      <View style={styles.materialHeader}>
                        <View style={[styles.materialCategoryTag, { backgroundColor: getCategoryColor(material.category) + '20' }]}>
                          <ThemedText type="small" style={{ color: getCategoryColor(material.category), fontWeight: '600' }}>
                            {getCategoryLabel(material.category)}
                          </ThemedText>
                        </View>
                        <Pressable onPress={() => handleRemoveMaterial(index)}>
                          <Feather name="x" size={18} color={theme.text} />
                        </Pressable>
                      </View>
                      <ThemedText type="body" style={styles.editMaterialName}>{material.name}</ThemedText>
                      <View style={styles.materialPriceRow}>
                        <ThemedText type="body" style={styles.editMaterialPrice}>
                          Rs. {material.unitPrice.toLocaleString()}
                        </ThemedText>
                        <ThemedText type="small" style={{ color: theme.text }}>
                          per {material.unit}
                        </ThemedText>
                      </View>
                    </Pressable>
                  </View>
                ))
              )}
            </View>

            {/* Notes Section */}
            <View style={styles.formSection}>
              <ThemedText type="subtitle" style={styles.formSectionTitle}>Additional Notes</ThemedText>
              <View style={styles.inputGroup}>
                <TextInput
                  style={[styles.formInput, styles.textArea, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Any additional notes about this vendor"
                  placeholderTextColor={theme.text}
                  multiline
                  numberOfLines={4}
                />
              </View>
            </View>

            <Button onPress={handleUpdateVendor} style={styles.saveButton}>
              Save Changes
            </Button>
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
      </Modal>

      {/* Add/Edit Material Modal */}
      <Modal
        visible={showMaterialModal}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowMaterialModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={[styles.modalHeader, { borderBottomColor: Colors.light.border }]}>
            <Pressable onPress={() => setShowMaterialModal(false)} style={styles.modalCancelButton}>
              <ThemedText type="body" style={{ color: theme.text }}>Cancel</ThemedText>
            </Pressable>
            <ThemedText type="h4" style={styles.modalTitle}>
              {editingMaterialIndex !== null ? 'Edit Material' : 'New Material'}
            </ThemedText>
            <Pressable onPress={handleAddMaterial}>
              <ThemedText type="body" style={{ color: Colors.light.primary, fontWeight: '600' }}>Save</ThemedText>
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + Spacing.xl }]}
          >
            <View style={styles.formSection}>
              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Category <ThemedText type="small" style={styles.required}>*</ThemedText>
                </ThemedText>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryScrollContainer}
                >
                  {MATERIAL_CATEGORIES.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setMaterialCategory(cat.id)}
                      style={[
                        styles.categoryChip,
                        {
                          backgroundColor: materialCategory === cat.id ? getCategoryColor(cat.id) : Colors.light.backgroundDefault,
                          borderColor: getCategoryColor(cat.id),
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          color: materialCategory === cat.id ? '#FFFFFF' : getCategoryColor(cat.id),
                          fontWeight: '600',
                        }}
                      >
                        {cat.name}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText type="small" style={styles.inputLabel}>
                  Material Name <ThemedText type="small" style={styles.required}>*</ThemedText>
                </ThemedText>
                <TextInput
                  style={[styles.formInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                  value={materialName}
                  onChangeText={setMaterialName}
                  placeholder="e.g., TMT Steel Bars 12mm"
                  placeholderTextColor={theme.text}
                />
              </View>

              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: Spacing.md }]}>
                  <ThemedText type="small" style={styles.inputLabel}>
                    Price (Rs.) <ThemedText type="small" style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <View style={[styles.currencyInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border }]}>
                    <ThemedText type="body" style={{ color: theme.text, marginRight: 8 }}>₹</ThemedText>
                    <TextInput
                      style={[styles.formInput, { backgroundColor: 'transparent', borderWidth: 0, paddingHorizontal: 0, flex: 1, color: theme.text }]}
                      value={materialPrice}
                      onChangeText={setMaterialPrice}
                      placeholder="0.00"
                      placeholderTextColor={theme.text}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <ThemedText type="small" style={styles.inputLabel}>
                    Unit <ThemedText type="small" style={styles.required}>*</ThemedText>
                  </ThemedText>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: theme.backgroundDefault, borderColor: Colors.light.border, color: theme.text }]}
                    value={materialUnit}
                    onChangeText={setMaterialUnit}
                    placeholder="kg, cft, bag"
                    placeholderTextColor={theme.text}
                  />
                </View>
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
  
  // Hero Section
  heroSection: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  vendorIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  vendorName: {
    fontWeight: '700',
    fontSize: 24,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  contactPerson: {
    color: Colors.light.text,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  contactButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  callButton: {
    backgroundColor: Colors.light.success,
  },
  emailButton: {
    backgroundColor: Colors.light.primary,
  },
  contactButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  // Cards
  card: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.xs,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    fontWeight: '600',
    marginLeft: Spacing.sm,
    fontSize: 16,
  },
  materialCount: {
    marginLeft: 'auto',
    backgroundColor: Colors.light.primary + '10',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  
  // Details Grid
  detailsGrid: {
    gap: Spacing.md,
  },
  detailItem: {
    gap: 2,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.light.text,
    fontWeight: '500',
    marginTop: 4,
    opacity: 0.7,
  },
  detailValue: {
    fontWeight: '500',
  },
  multiline: {
    lineHeight: 20,
  },
  
  // Materials Section
  materialCategory: {
    marginBottom: Spacing.lg,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryIndicator: {
    width: 4,
    height: 16,
    borderRadius: BorderRadius.xs,
    marginRight: Spacing.sm,
  },
  categoryLabel: {
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemCount: {
    marginLeft: 'auto',
    color: Colors.light.text,
    opacity: 0.7,
  },
  materialList: {
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  materialItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    borderBottomWidth: 1,
  },
  materialInfo: {
    flex: 1,
  },
  materialName: {
    fontWeight: '500',
    marginBottom: 2,
  },
  materialUnit: {
    color: Colors.light.text,
    fontSize: 12,
    opacity: 0.7,
  },
  materialPrice: {
    fontWeight: '600',
    color: Colors.light.success,
  },
  
  // Notes
  notesText: {
    color: Colors.light.text,
    lineHeight: 22,
    opacity: 0.8,
  },
  
  // Action Section
  actionSection: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  editButton: {
    flex: 1,
    backgroundColor: Colors.light.primary + '10',
    borderWidth: 1,
    borderColor: Colors.light.primary,
  },
  editButtonText: {
    color: Colors.light.primary,
  },
  deleteButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Modals
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalCancelButton: {
    padding: Spacing.xs,
  },
  modalTitle: {
    fontWeight: '700',
  },
  modalContent: {
    padding: Spacing.lg,
  },
  
  // Form Styles
  formSection: {
    marginBottom: Spacing.xl,
  },
  formSectionTitle: {
    fontWeight: '600',
    marginBottom: Spacing.lg,
    fontSize: 15,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  inputGroup: {
    marginBottom: Spacing.lg,
  },
  inputRow: {
    flexDirection: 'row',
  },
  inputLabel: {
    fontWeight: '600',
    marginBottom: Spacing.xs,
    color: Colors.light.text,
    opacity: 0.8,
  },
  required: {
    color: Colors.light.error,
  },
  formInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  currencyInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: 'top',
    fontSize: 16,
  },
  
  // Add Button
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  
  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.md,
  },
  
  // Edit Material Items
  editMaterialItem: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  editMaterialContent: {
    padding: Spacing.md,
  },
  materialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  materialCategoryTag: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  editMaterialName: {
    fontWeight: '500',
    marginBottom: Spacing.xs,
  },
  materialPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editMaterialPrice: {
    fontWeight: '600',
    color: Colors.light.success,
  },
  
  // Save Button
  saveButton: {
    marginTop: Spacing.md,
  },
  
  // Category Chips
  categoryScrollContainer: {
    paddingRight: Spacing.lg,
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginRight: Spacing.sm,
  },
});