import React, { useState, useMemo } from 'react';
import { View, StyleSheet, Pressable, TextInput, Modal, Alert, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Button } from '@/components/Button';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { MaterialOrder } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';
import { apiRequest } from '@/lib/query-client';

export default function MaterialInventoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    clients,
    materials,
    suppliers,
    materialOrders,
    vendors,
    addMaterialOrder,
    updateMaterialOrder,
    deleteMaterialOrder,
  } = useData();

  const [showLogModal, setShowLogModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<MaterialOrder | null>(null);

  const [selectedClient, setSelectedClient] = useState('');
  const [selectedMaterial, setSelectedMaterial] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [quantity, setQuantity] = useState('');
  const [totalCost, setTotalCost] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'paid' | 'pending'>('pending');

  // Dropdown filters
  const [filterClient, setFilterClient] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterVendor, setFilterVendor] = useState('');

  const canEdit = user?.role === 'admin' || user?.role === 'engineer';

  const filteredOrders = useMemo(() => {
    let orders = [...materialOrders];

    // Apply dropdown filters
    if (filterClient) {
      orders = orders.filter(o => o.clientId === filterClient);
    }
    if (filterMaterial) {
      orders = orders.filter(o => o.materialId === filterMaterial);
    }
    if (filterVendor) {
      orders = orders.filter(o => o.supplierId === filterVendor);
    }

    return orders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [materialOrders, filterClient, filterMaterial, filterVendor]);

  const stats = useMemo(() => {
    const total = filteredOrders.reduce((sum, o) => sum + o.totalCost, 0);
    const paid = filteredOrders.filter(o => o.paymentStatus === 'paid').reduce((sum, o) => sum + o.totalCost, 0);
    const pending = filteredOrders.filter(o => o.paymentStatus === 'pending').reduce((sum, o) => sum + o.totalCost, 0);
    const lowStock = filteredOrders.filter(o => o.stock < o.quantity * 0.2).length;
    return { total, paid, pending, lowStock, count: filteredOrders.length };
  }, [filteredOrders]);

  const getMaterialName = (id: string) => materials.find(m => m.id === id)?.name || 'Unknown';
  const getMaterialUnit = (id: string) => materials.find(m => m.id === id)?.unit || '';
  const getClientName = (id: string) => clients.find(c => c.id === id)?.projectName || 'Unknown';
  const getSupplierName = (id: string) => suppliers.find(s => s.id === id)?.name || 'Unknown';

  const resetForm = () => {
    setSelectedClient('');
    setSelectedMaterial('');
    setSelectedSupplier('');
    setQuantity('');
    setTotalCost('');
    setOrderDate('');
    setPaymentStatus('pending');
    setEditingOrder(null);
  };

  const openLogModal = (order?: MaterialOrder) => {
    if (order) {
      setEditingOrder(order);
      setSelectedClient(order.clientId);
      setSelectedMaterial(order.materialId);
      setSelectedSupplier(order.supplierId);
      setQuantity(String(order.quantity));
      setTotalCost(String(order.totalCost));
      setOrderDate(order.date);
      setPaymentStatus(order.paymentStatus);
    } else {
      resetForm();
      setOrderDate(new Date().toISOString().split('T')[0]);
    }
    setShowLogModal(true);
  };

  const sendSupplierNotification = async (order: MaterialOrder) => {
    try {
      const supplier = suppliers.find(s => s.id === order.supplierId);
      const vendor = vendors.find(v => v.id === order.supplierId);
      const material = materials.find(m => m.id === order.materialId);
      const client = clients.find(c => c.id === order.clientId);

      const supplierPhone = vendor?.phone || '';
      const supplierName = vendor?.name || supplier?.name || 'Supplier';

      if (!supplierPhone) {
        console.log('No phone number found for supplier notification');
        return;
      }

      const notificationData = {
        supplierName,
        supplierPhone,
        materialName: material?.name || 'Material',
        quantity: order.quantity,
        unit: material?.unit || 'units',
        totalCost: order.totalCost,
        clientProject: client?.projectName || 'Project',
        orderDate: order.date
      };

      const response = await apiRequest('POST', '/api/notifications/send-order-notification', notificationData);
      const result = await response.json();

      if (result.success) {
        const messages: string[] = [];
        if (result.notifications.voiceCall.sent) {
          messages.push('Voice call initiated');
        }
        if (result.notifications.whatsapp.sent) {
          messages.push('WhatsApp sent');
        }
        
        if (messages.length > 0) {
          Alert.alert('Notification Sent', messages.join(' and ') + ` to ${supplierName}`);
        } else {
          Alert.alert(
            'Order Placed',
            `Order saved. Notifications require API configuration.\n\nTamil message preview:\n"${result.messages.tamil.substring(0, 100)}..."`
          );
        }
      }
    } catch (error) {
      console.log('Notification error:', error);
    }
  };

  const handleSaveOrder = async () => {
    if (!selectedClient || !selectedMaterial || !selectedSupplier || !quantity) {
      Alert.alert('Missing Fields', 'Please fill all required fields.');
      return;
    }

    const cost = totalCost ? parseInt(totalCost, 10) : calculateTotal();
    const qty = parseInt(quantity, 10);

    if (editingOrder) {
      await updateMaterialOrder({
        ...editingOrder,
        clientId: selectedClient,
        materialId: selectedMaterial,
        supplierId: selectedSupplier,
        quantity: qty,
        totalCost: cost,
        date: orderDate,
        paymentStatus,
        stock: paymentStatus === 'paid' ? qty : editingOrder.stock,
      });
    } else {
      const newOrder: MaterialOrder = {
        id: `mo_${Date.now()}`,
        clientId: selectedClient,
        materialId: selectedMaterial,
        supplierId: selectedSupplier,
        quantity: qty,
        totalCost: cost,
        date: orderDate,
        paymentStatus,
        stock: qty,
      };
      await addMaterialOrder(newOrder);
      
      await sendSupplierNotification(newOrder);
    }

    setShowLogModal(false);
    resetForm();
  };

  const handleDeleteOrder = (order: MaterialOrder) => {
    Alert.alert(
      'Delete Entry',
      `Delete this ${getMaterialName(order.materialId)} order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMaterialOrder(order.id),
        },
      ]
    );
  };

  const calculateTotal = () => {
    const material = materials.find(m => m.id === selectedMaterial);
    if (!material || !quantity) return 0;
    return material.unitPrice * parseInt(quantity, 10);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) {
      return `${(amount / 100000).toFixed(1)}L`;
    } else if (amount >= 1000) {
      return `${(amount / 1000).toFixed(1)}K`;
    }
    return amount.toLocaleString();
  };

  const isLowStock = (order: MaterialOrder) => order.stock < order.quantity * 0.2;

  const renderOrderRow = ({ item: order }: { item: MaterialOrder }) => {
    const lowStock = isLowStock(order);
    return (
      <Pressable
        onPress={() => canEdit ? openLogModal(order) : null}
        onLongPress={() => canEdit ? handleDeleteOrder(order) : null}
        style={[styles.tableRow, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.rowMain}>
          <View style={styles.rowLeft}>
            <View style={[styles.dateCell, { backgroundColor: Colors.light.primary + '10' }]}> 
              <ThemedText type="small" style={{ color: Colors.light.primary, fontWeight: '600' }}>
                {formatDate(order.date)}
              </ThemedText>
            </View>
            <View style={styles.materialCell}>
              <ThemedText type="body" style={{ fontWeight: '600' }} numberOfLines={1}>
                {getMaterialName(order.materialId)}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }} numberOfLines={1}>
                {getClientName(order.clientId)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.rowRight}>
            <View style={styles.qtyCell}>
              <ThemedText type="body" style={{ fontWeight: '600' }}>
                {order.quantity}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {getMaterialUnit(order.materialId)}
              </ThemedText>
            </View>
            <View style={styles.costCell}>
              <ThemedText type="body" style={{ fontWeight: '700', color: Colors.light.primary }}>
                {order.totalCost.toLocaleString()}
              </ThemedText>
            </View>
          </View>
        </View>
        <View style={styles.rowFooter}>
          <View style={styles.supplierTag}>
            <Feather name="truck" size={12} color={theme.textSecondary} />
            <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }} numberOfLines={1}>
              {getSupplierName(order.supplierId)}
            </ThemedText>
          </View>
          <View style={styles.rowBadges}>
            {lowStock ? (
              <View style={[styles.badge, { backgroundColor: Colors.light.error + '15' }]}> 
                <Feather name="alert-triangle" size={10} color={Colors.light.error} />
                <ThemedText type="small" style={{ color: Colors.light.error, marginLeft: 4, fontSize: 10 }}>
                  Low
                </ThemedText>
              </View>
            ) : null}
            <View style={[
              styles.badge,
              { backgroundColor: order.paymentStatus === 'paid' ? Colors.light.success + '15' : Colors.light.warning + '15' }
            ]}>
              <ThemedText type="small" style={{ color: order.paymentStatus === 'paid' ? Colors.light.success : Colors.light.warning, fontSize: 10, fontWeight: '600' }}>
                {order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}
              </ThemedText>
            </View>
          </View>
        </View>
      </Pressable>
    );
  };

  // Main return for the screen
  return (
    <ThemedView style={styles.container}>
      {/* Filters Row */}
      <View style={{ flexDirection: 'row', margin: 12, gap: 8 }}>
        <View style={{ flex: 1, marginRight: 4 }}>
          <Picker
            selectedValue={filterClient}
            onValueChange={setFilterClient}
            style={{ backgroundColor: theme.backgroundSecondary }}
          >
            <Picker.Item label="All Sites" value="" />
            {clients.map(c => (
              <Picker.Item key={c.id} label={c.projectName} value={c.id} />
            ))}
          </Picker>
        </View>
        <View style={{ flex: 1, marginRight: 4 }}>
          <Picker
            selectedValue={filterMaterial}
            onValueChange={setFilterMaterial}
            style={{ backgroundColor: theme.backgroundSecondary }}
          >
            <Picker.Item label="All Materials" value="" />
            {materials.map(m => (
              <Picker.Item key={m.id} label={m.name} value={m.id} />
            ))}
          </Picker>
        </View>
        <View style={{ flex: 1 }}>
          <Picker
            selectedValue={filterVendor}
            onValueChange={setFilterVendor}
            style={{ backgroundColor: theme.backgroundSecondary }}
          >
            <Picker.Item label="All Vendors" value="" />
            {suppliers.map(s => (
              <Picker.Item key={s.id} label={s.name} value={s.id} />
            ))}
          </Picker>
        </View>
      </View>

      {/* FlatList of Orders */}
      <FlatList
        data={filteredOrders}
        renderItem={renderOrderRow}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText type="body" style={{ color: theme.textSecondary }}>
              No material orders found.
            </ThemedText>
          </View>
        }
      />


      {/* Floating Action Button for manual order add (moved to bottom right) */}
      <View style={{ position: 'absolute', right: 24, bottom: 32 + insets.bottom, alignItems: 'center', zIndex: 10 }}>
        <Pressable
          style={({ pressed }) => [
            styles.fab,
            { position: 'relative', right: 0, bottom: 0 },
            pressed && { transform: [{ scale: 0.95 }], opacity: 0.85 },
            { elevation: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 }
          ]}
          onPress={() => openLogModal()}
        >
          <Feather name="plus" size={32} color="#fff" />
        </Pressable>
        <ThemedText type="small" style={{ marginTop: 6, color: Colors.light.primary, fontWeight: '600', backgroundColor: '#fff', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2, elevation: 2, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 2 }}>
          Add Order
        </ThemedText>
      </View>

      {/* Beautiful Summary Card at the very bottom */}
      <View style={{ width: '100%', alignItems: 'center', paddingBottom: insets.bottom + 16, marginTop: 8 }}>
        <View style={{
          flexDirection: 'column',
          alignItems: 'center',
          borderRadius: 20,
          paddingVertical: 20,
          paddingHorizontal: 32,
          minWidth: 220,
          shadowColor: '#000',
          shadowOpacity: 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
          elevation: 8,
          backgroundColor: '#f8fafc',
          borderWidth: 0,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Feather name="bar-chart-2" size={20} color={Colors.light.primary} style={{ marginRight: 8 }} />
            <ThemedText type="body" style={{ color: Colors.light.primary, fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 }}>Total: ₹{stats.total.toLocaleString()}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Feather name="check-circle" size={20} color={Colors.light.success} style={{ marginRight: 8 }} />
            <ThemedText type="body" style={{ color: Colors.light.success, fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 }}>Paid: ₹{stats.paid.toLocaleString()}</ThemedText>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Feather name="clock" size={20} color={Colors.light.warning} style={{ marginRight: 8 }} />
            <ThemedText type="body" style={{ color: Colors.light.warning, fontWeight: 'bold', fontSize: 18, letterSpacing: 0.5 }}>Pending: ₹{stats.pending.toLocaleString()}</ThemedText>
          </View>
        </View>
      </View>

      {/* Modal for manual order entry */}
      <Modal visible={showLogModal} animationType="slide" transparent onRequestClose={() => setShowLogModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.backgroundDefault }]}> 
            <View style={styles.modalHeader}>
              <ThemedText type="h4">
                {editingOrder ? 'Edit Entry' : 'Log Material'}
              </ThemedText>
              <Pressable onPress={() => setShowLogModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>
            <KeyboardAwareScrollViewCompat style={styles.modalForm}>
              {/* ...existing code for modal form... */}
            </KeyboardAwareScrollViewCompat>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    ...Shadows.sm,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: '100%',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  searchInput: {
    flex: 1,
    marginLeft: Spacing.sm,
    fontSize: 14,
  },
  filterScroll: {
    marginBottom: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterTabActive: {
    backgroundColor: Colors.light.primary + '10',
  },
  filterCount: {
    marginLeft: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  tableRow: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  rowMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateCell: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  materialCell: {
    flex: 1,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qtyCell: {
    alignItems: 'flex-end',
    marginRight: Spacing.lg,
  },
  costCell: {
    minWidth: 70,
    alignItems: 'flex-end',
  },
  rowFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  supplierTag: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rowBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockBar: {
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  stockFill: {
    height: '100%',
    borderRadius: 2,
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
    ...Shadows.md,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'] * 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  modalForm: {
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    marginBottom: Spacing.xs,
    fontWeight: '500',
  },
  formRow: {
    flexDirection: 'row',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  selectChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  statusToggle: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  statusOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
});
