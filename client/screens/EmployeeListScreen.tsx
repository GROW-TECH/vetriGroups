import React, { useState, useMemo } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  TextInput, 
  Pressable, 
  Modal, 
  Alert, 
  Share, 
  Platform, 
  Linking,
  RefreshControl 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import { Button } from '@/components/Button';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { useAuth } from '@/context/AuthContext';
import { Employee, EmployeeRole } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';

// Update role labels to include site_engineer
const ROLE_LABELS: Record<EmployeeRole | 'all', string> = {
  'all': 'All',
  'mason': 'Mason',
  'labor': 'Labor',
  'engineer': 'Engineer',
  'site_engineer': 'Site Engineer',
  'supervisor': 'Supervisor'
};

// Define all roles for filtering
const ALL_ROLES: (EmployeeRole | 'all')[] = ['all', 'labor', 'mason', 'engineer', 'site_engineer', 'supervisor'];

export default function EmployeeListScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { employees, updateEmployee, deleteEmployee } = useData();
  const { user } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  const [menuEmployee, setMenuEmployee] = useState<Employee | null>(null);
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editSalary, setEditSalary] = useState('');
  const [editRole, setEditRole] = useState<EmployeeRole>('labor');
  const [refreshing, setRefreshing] = useState(false);

  const refreshEmployees = async () => {
    console.log('🔄 Refreshing employees...');
    setRefreshing(true);
    // Implement actual refresh logic here
    setTimeout(() => {
      setRefreshing(false);
      console.log('✅ Employees refreshed');
    }, 1000);
  };

  const canEdit = user?.role === 'admin' || user?.role === 'engineer' || user?.role === 'site_engineer';

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      if (!e || !e.name) return false;
      
      const matchesRole = selectedRole === 'all' || e.role === selectedRole;
      const matchesSearch = e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.phone && e.phone.includes(searchQuery)) ||
        (e.email && e.email.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesRole && matchesSearch;
    });
  }, [employees, selectedRole, searchQuery]);

  const roleColors: Record<EmployeeRole, string> = {
    'mason': '#F59E0B',
    'labor': '#10B981',
    'engineer': '#3B82F6',
    'site_engineer': '#8B5CF6',
    'supervisor': '#EF4444'
  };

  const handleOpenMenu = (employee: Employee) => {
    setMenuEmployee(employee);
  };

  const handleCloseMenu = () => {
    setMenuEmployee(null);
  };

  const handleEdit = () => {
    if (!menuEmployee) return;
    setEditEmployee(menuEmployee);
    setEditName(menuEmployee.name || '');
    setEditPhone(menuEmployee.phone || '');
    setEditSalary(String(menuEmployee.salary || ''));
    setEditRole(menuEmployee.role || 'labor');
    handleCloseMenu();
  };

  const handleSaveEdit = async () => {
    if (!editEmployee) return;
    if (!editName.trim()) {
      Alert.alert('Error', 'Please enter employee name');
      return;
    }
    
    const salary = parseFloat(editSalary);
    if (isNaN(salary) || salary <= 0) {
      Alert.alert('Error', 'Please enter a valid salary');
      return;
    }

    try {
      await updateEmployee({
        ...editEmployee,
        name: editName.trim(),
        phone: editPhone.trim() || '',
        salary,
        role: editRole,
      });
      Alert.alert('Success', 'Employee updated successfully');
      setEditEmployee(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update employee');
      console.error('Update error:', error);
    }
  };

  const handleShare = async () => {
    if (!menuEmployee) return;
    handleCloseMenu();
    
    const message = `Employee Details:\n\nName: ${menuEmployee.name || 'N/A'}\nRole: ${ROLE_LABELS[menuEmployee.role || 'labor']}\nEmail: ${menuEmployee.email || 'N/A'}\n${menuEmployee.phone ? `Phone: ${menuEmployee.phone}\n` : ''}Daily Salary: ₹${(menuEmployee.salary || 0).toLocaleString()}`;
    
    try {
      await Share.share({
        message,
        title: `${menuEmployee.name || 'Employee'} - Employee Details`,
      });
    } catch (error) {
      console.error('Error sharing:', error);
      Alert.alert('Error', 'Failed to share employee details');
    }
  };

  const handleDelete = () => {
    if (!menuEmployee || !canEdit) return;
    handleCloseMenu();
    
    Alert.alert(
      'Delete Employee',
      `Are you sure you want to delete ${menuEmployee.name || 'this employee'}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteEmployee(menuEmployee.id);
              Alert.alert('Success', 'Employee deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete employee');
              console.error('Delete error:', error);
            }
          },
        },
      ]
    );
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    // Add defensive checks for all properties
    const employeeName = item?.name || 'Unknown';
    const employeeRole = item?.role || 'labor';
    const employeeEmail = item?.email || 'No email';
    const employeePhone = item?.phone;
    const employeeSalary = item?.salary || 0;
    const hasAccountAccess = item?.hasAccountAccess || false;

    return (
      <View style={[styles.employeeCard, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
        <View style={[styles.avatar, { backgroundColor: roleColors[employeeRole] + '20' }]}>
          <Feather 
            name={hasAccountAccess ? 'user-check' : 'user'} 
            size={24} 
            color={roleColors[employeeRole]} 
          />
        </View>
        <View style={styles.employeeInfo}>
          <View style={styles.nameRow}>
            <ThemedText type="body" style={{ fontWeight: '600', flex: 1 }}>{employeeName}</ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: roleColors[employeeRole] + '15' }]}>
              <ThemedText type="small" style={{ color: roleColors[employeeRole], fontWeight: '500' }}>
                {ROLE_LABELS[employeeRole]}
              </ThemedText>
            </View>
          </View>
          
          <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
            {employeeEmail}
          </ThemedText>
          
          {employeePhone ? (
            <Pressable
              onPress={() => Linking.openURL(`tel:${employeePhone}`)}
              style={styles.phoneRow}
            >
              <Feather name="phone" size={12} color={Colors.light.success} />
              <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: Spacing.xs }}>
                {employeePhone}
              </ThemedText>
            </Pressable>
          ) : null}
          
          <View style={styles.detailsRow}>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Salary: <ThemedText type="small" style={{ fontWeight: '600', color: Colors.light.primary }}>
                ₹{employeeSalary.toLocaleString()}/day
              </ThemedText>
            </ThemedText>
            
            {hasAccountAccess && (
              <View style={styles.accountBadge}>
                <Feather name="shield" size={10} color={Colors.light.primary} />
                <ThemedText type="extraSmall" style={{ color: Colors.light.primary, marginLeft: 2 }}>
                  Account
                </ThemedText>
              </View>
            )}
          </View>
        </View>
        <Pressable
          onPress={() => handleOpenMenu(item)}
          style={styles.menuButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Feather name="more-vertical" size={20} color={theme.textSecondary} />
        </Pressable>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Search and Filter Section */}
      <View style={styles.filters}>
        <View style={[styles.searchBox, { backgroundColor: theme.backgroundDefault, borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search employees..."
            placeholderTextColor={theme.textSecondary}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          )}
        </View>

        <FlatList
          horizontal
          data={ALL_ROLES}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.roleList}
          renderItem={({ item: role }) => (
            <Pressable
              onPress={() => setSelectedRole(role)}
              style={[
                styles.roleChip,
                { 
                  borderColor: selectedRole === role ? Colors.light.primary : theme.border,
                  backgroundColor: selectedRole === role ? Colors.light.primary + '15' : theme.backgroundDefault
                }
              ]}
            >
              <ThemedText
                type="small"
                style={{ 
                  color: selectedRole === role ? Colors.light.primary : theme.text, 
                  fontWeight: selectedRole === role ? '600' : '400' 
                }}
              >
                {ROLE_LABELS[role]}
              </ThemedText>
            </Pressable>
          )}
        />
      </View>

      {/* Employee List */}
      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item?.id || Math.random().toString()}
        renderItem={renderEmployee}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshEmployees}
            colors={[Colors.light.primary]}
            tintColor={Colors.light.primary}
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="users" size={48} color={theme.textSecondary} />
            <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md, textAlign: 'center' }}>
              {employees.length === 0 
                ? 'No employees added yet. Add your first employee!'
                : 'No employees match your search criteria'}
            </ThemedText>
          </View>
        )}
      />

      {/* Context Menu Modal */}
      <Modal
        visible={menuEmployee !== null}
        animationType="fade"
        transparent={true}
        onRequestClose={handleCloseMenu}
      >
        <Pressable style={styles.menuOverlay} onPress={handleCloseMenu}>
          <View style={[styles.menuContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.menuHeader}>
              <View style={[styles.menuAvatar, { backgroundColor: menuEmployee ? roleColors[menuEmployee.role || 'labor'] + '20' : theme.backgroundSecondary }]}>
                <Feather name="user" size={20} color={menuEmployee ? roleColors[menuEmployee.role || 'labor'] : theme.textSecondary} />
              </View>
              <View style={{ marginLeft: Spacing.md, flex: 1 }}>
                <ThemedText type="body" style={{ fontWeight: '600' }}>
                  {menuEmployee?.name || 'Employee'}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {menuEmployee ? ROLE_LABELS[menuEmployee.role || 'labor'] : ''}
                </ThemedText>
              </View>
            </View>

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <Pressable style={styles.menuItem} onPress={handleEdit}>
              <Feather name="edit-2" size={20} color={theme.text} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md }}>Edit Details</ThemedText>
            </Pressable>

            <Pressable style={styles.menuItem} onPress={handleShare}>
              <Feather name="share-2" size={20} color={theme.text} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md }}>Share Details</ThemedText>
            </Pressable>

            {canEdit ? (
              <Pressable style={styles.menuItem} onPress={handleDelete}>
                <Feather name="trash-2" size={20} color={Colors.light.error} />
                <ThemedText type="body" style={{ marginLeft: Spacing.md, color: Colors.light.error }}>Delete Employee</ThemedText>
              </Pressable>
            ) : null}

            <View style={[styles.menuDivider, { backgroundColor: theme.border }]} />

            <Pressable style={styles.menuItem} onPress={handleCloseMenu}>
              <Feather name="x" size={20} color={theme.textSecondary} />
              <ThemedText type="body" style={{ marginLeft: Spacing.md, color: theme.textSecondary }}>Cancel</ThemedText>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* Edit Employee Modal */}
      <Modal
        visible={editEmployee !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditEmployee(null)}
      >
        <View style={styles.editOverlay}>
          <View style={[styles.editContent, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.editHeader}>
              <ThemedText type="h4">Edit Employee</ThemedText>
              <Pressable onPress={() => setEditEmployee(null)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <KeyboardAwareScrollViewCompat showsVerticalScrollIndicator={false}>
              <View style={styles.editForm}>
                <View style={styles.inputGroup}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Name *</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Employee name"
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Phone Number</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                    value={editPhone}
                    onChangeText={setEditPhone}
                    placeholder="Phone number"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="phone-pad"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Daily Salary *</ThemedText>
                  <TextInput
                    style={[styles.input, { backgroundColor: theme.backgroundSecondary, borderColor: theme.border, color: theme.text }]}
                    value={editSalary}
                    onChangeText={setEditSalary}
                    placeholder="Salary per day"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <ThemedText type="small" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Role</ThemedText>
                  <View style={styles.roleOptions}>
                    {['labor', 'mason', 'engineer', 'site_engineer', 'supervisor'].map((role) => (
                      <Pressable
                        key={role}
                        onPress={() => setEditRole(role as EmployeeRole)}
                        style={[
                          styles.roleOption,
                          { 
                            borderColor: editRole === role ? roleColors[role as EmployeeRole] : theme.border,
                            backgroundColor: editRole === role ? roleColors[role as EmployeeRole] + '15' : theme.backgroundSecondary
                          }
                        ]}
                      >
                        <ThemedText
                          type="small"
                          style={{ 
                            color: editRole === role ? roleColors[role as EmployeeRole] : theme.text, 
                            fontWeight: editRole === role ? '600' : '400' 
                          }}
                        >
                          {ROLE_LABELS[role as EmployeeRole]}
                        </ThemedText>
                      </Pressable>
                    ))}
                  </View>
                </View>

                <Button
                  onPress={handleSaveEdit}
                  style={{ marginTop: Spacing.lg }}
                >
                  Save Changes
                </Button>
                
                <Button
                  onPress={() => setEditEmployee(null)}
                  variant="outline"
                  style={{ marginTop: Spacing.sm }}
                >
                  Cancel
                </Button>
              </View>
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
  filters: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  roleList: {
    gap: Spacing.sm,
  },
  roleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  employeeInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    marginLeft: Spacing.sm,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  accountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.primary + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  menuButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing['4xl'],
    paddingHorizontal: Spacing.xl,
  },
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  menuContent: {
    width: '100%',
    maxWidth: 320,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  menuHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  menuAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  editOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  editContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingTop: Spacing.lg,
    maxHeight: '80%',
  },
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  editForm: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  inputGroup: {
    marginBottom: Spacing.md,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  roleOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  roleOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
});