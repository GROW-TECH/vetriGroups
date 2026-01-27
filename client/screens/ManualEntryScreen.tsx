import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, Pressable, FlatList, Alert, Modal, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { EmployeeRole, EMPLOYEE_ROLES, Employee, Client } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';

export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { employees, clients, isLoading, markAttendance, attendance } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Site selection modal state
  const [siteModalVisible, setSiteModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  // Filter logic: Matches name AND role
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter(emp => {
      const matchesSearch = !query || emp.name.toLowerCase().includes(query);
      const matchesRole = selectedRole === 'all' || emp.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, selectedRole]);

  const roleLabels: Record<EmployeeRole | 'all', string> = {
    all: 'All',
    mason: 'Mason',
    labor: 'Labor',
    engineer: 'Engineer',
    supervisor: 'Supervisor',
  };

  const getAttendanceInfo = (employeeId: string) => {
    return attendance.find(
      a => a.employeeId === employeeId && a.date === date
    );
  };

  const handlePresentClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    setSiteModalVisible(true);
  };

  const handleSiteSelection = async (site: Client) => {
    if (!selectedEmployee) return;

    try {
      const timeNow = new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
      });

      await markAttendance(selectedEmployee.id, date, "present", {
        siteId: site.id,
        siteName: site.projectName,
        checkInTime: timeNow,
      });

      setSiteModalVisible(false);
      setSelectedEmployee(null);
      
      Alert.alert('Success', `Marked ${selectedEmployee.name} as present at ${site.projectName}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    }
  };

  const handleAbsentClick = async (employee: Employee) => {
    Alert.alert(
      'Mark Absent',
      `Mark ${employee.name} as absent for ${date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await markAttendance(employee.id, date, "absent");
              Alert.alert('Success', `Marked ${employee.name} as absent`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark attendance');
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerTop}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Manual Entry</ThemedText>
        </View>

        {/* Date Selection */}
        <View style={styles.dateRow}>
          <ThemedText>Date:</ThemedText>
          <View style={[styles.dateInputContainer, { borderColor: theme.border }]}>
            <TextInput
              style={[styles.dateInput, { color: theme.text }]}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={theme.textSecondary}
            />
            <Feather name="calendar" size={16} color={theme.textSecondary} />
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color={theme.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by name..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Role Filters */}
      <View style={styles.filters}>
        <FlatList
          horizontal
          data={['all', ...EMPLOYEE_ROLES]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedRole(item as any)}
              style={[
                styles.filterChip,
                {
                  borderColor: selectedRole === item ? Colors.light.primary : theme.border,
                  backgroundColor: selectedRole === item ? Colors.light.primary + '15' : 'transparent'
                }
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: selectedRole === item ? Colors.light.primary : theme.text,
                  fontWeight: selectedRole === item ? '600' : '400'
                }}
              >
                {item === 'all' ? roleLabels['all'] : roleLabels[item as EmployeeRole]}
              </ThemedText>
            </Pressable>
          )}
        />
      </View>

      {/* Employee List */}
      <FlatList
        data={filteredEmployees}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}
        renderItem={({ item }) => {
          const attendanceInfo = getAttendanceInfo(item.id);
          const isPresent = attendanceInfo?.status === 'present';
          const isAbsent = attendanceInfo?.status === 'absent';

          return (
            <View
              style={[styles.employeeCard, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
            >
              <View style={styles.employeeInfo}>
                <View style={styles.employeeAvatar}>
                  <Feather name="user" size={20} color={theme.textSecondary} />
                </View>
                <View style={styles.employeeDetails}>
                  <ThemedText type="body" style={{ fontWeight: '600' }}>{item.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>{roleLabels[item.role]}</ThemedText>
                  {isPresent && attendanceInfo?.siteName && (
                    <View style={styles.siteTag}>
                      <Feather name="map-pin" size={10} color={Colors.light.success} />
                      <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: 4, fontSize: 11 }}>
                        {attendanceInfo.siteName}
                      </ThemedText>
                    </View>
                  )}
                </View>
              </View>
              <View style={styles.actionButtons}>
                <Pressable
                  style={[
                    styles.actionButton, 
                    styles.presentButton,
                    isPresent && { opacity: 1 }
                  ]}
                  onPress={() => handlePresentClick(item)}
                >
                  <Feather name="check" size={20} color="#fff" />
                </Pressable>
                <Pressable
                  style={[
                    styles.actionButton, 
                    styles.absentButton,
                    isAbsent && { opacity: 1 }
                  ]}
                  onPress={() => handleAbsentClick(item)}
                >
                  <Feather name="x" size={20} color="#fff" />
                </Pressable>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText style={{ color: theme.textSecondary }}>
              {isLoading ? 'Loading employees...' : 'No employees found'}
            </ThemedText>
          </View>
        }
      />

      {/* Site Selection Modal */}
      <Modal
        visible={siteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setSiteModalVisible(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setSiteModalVisible(false)}
        >
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeader}>
              <ThemedText type="h4">Select Site</ThemedText>
              <Pressable onPress={() => setSiteModalVisible(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {selectedEmployee && (
              <View style={styles.employeePreview}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>
                  Marking attendance for:
                </ThemedText>
                <ThemedText type="body" style={{ fontWeight: '600', marginTop: 4 }}>
                  {selectedEmployee.name}
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary, marginTop: 2 }}>
                  {roleLabels[selectedEmployee.role]}
                </ThemedText>
              </View>
            )}

            <ScrollView style={styles.siteList}>
              {clients.map((site) => (
                <Pressable
                  key={site.id}
                  style={[styles.siteItem, { borderColor: theme.border }]}
                  onPress={() => handleSiteSelection(site)}
                >
                  <View style={styles.siteInfo}>
                    <ThemedText type="body" style={{ fontWeight: '600' }}>
                      {site.projectName}
                    </ThemedText>
                    {site.location && (
                      <View style={styles.locationRow}>
                        <Feather name="map-pin" size={12} color={theme.textSecondary} />
                        <ThemedText type="small" style={{ color: theme.textSecondary, marginLeft: 4 }}>
                          {site.location}
                        </ThemedText>
                      </View>
                    )}
                  </View>
                  <Feather name="chevron-right" size={20} color={theme.textSecondary} />
                </Pressable>
              ))}
              {clients.length === 0 && (
                <View style={styles.emptyState}>
                  <ThemedText style={{ color: theme.textSecondary }}>
                    No sites available
                  </ThemedText>
                </View>
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
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
    paddingBottom: Spacing.md,
    gap: Spacing.md,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
  },
  dateInput: {
    minWidth: 100,
    marginRight: Spacing.xs,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 16,
  },
  filters: {
    marginBottom: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(150, 150, 150, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeDetails: {
    gap: 4,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentButton: {
    backgroundColor: '#10b981',
  },
  absentButton: {
    backgroundColor: '#ef4444',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.xl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: '80%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  employeePreview: {
    padding: Spacing.lg,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  siteList: {
    flex: 1,
  },
  siteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  siteInfo: {
    flex: 1,
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  siteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
});