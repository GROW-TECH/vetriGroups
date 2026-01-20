import React, { useState, useMemo } from 'react';
import { View, StyleSheet, TextInput, Pressable, FlatList, Alert, Image } from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { Employee, EmployeeRole, EMPLOYEE_ROLES } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';

export default function ManualEntryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { employees, isLoading } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Filter logic: Matches name AND role
  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return employees.filter(emp => {
      const matchesSearch = !query || (emp.name && emp.name.toLowerCase().includes(query));
      const matchesRole = selectedRole === 'all' || emp.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [employees, searchQuery, selectedRole]);

  const roleLabels: Record<EmployeeRole | 'all', string> = {
    all: 'All',
    mason: 'Mason',
    labor: 'Labor',
    engineer: 'Engineer',
    site_engineer: 'Site Engineer',
    supervisor: 'Supervisor',
  };

  const roleColors: Record<EmployeeRole | 'all', string> = {
    all: Colors.light.primary,
    mason: '#F59E0B',
    labor: '#10B981',
    engineer: '#3B82F6',
    site_engineer: '#8B5CF6',
    supervisor: '#EF4444'
  };

  const handleMarkAttendance = (employee: Employee) => {
    Alert.alert(
      'Mark Attendance',
      `Mark attendance for ${employee.name || 'Unknown'} on ${date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark Present',
          onPress: () => {
            Alert.alert('Success', `Attendance marked for ${employee.name || 'Employee'}`);
          }
        },
        {
          text: 'Mark Absent',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Absent', `${employee.name || 'Employee'} marked as absent`);
          }
        }
      ]
    );
  };

  const renderEmployeeItem = ({ item }: { item: Employee }) => {
    const employeeName = item?.name || 'Unknown';
    // Ensure the role is a valid EmployeeRole
    const employeeRole = (EMPLOYEE_ROLES.includes(item?.role as EmployeeRole) 
      ? item.role 
      : 'labor') as EmployeeRole;
    const profileImage = item?.profileImage;
    const roleColor = roleColors[employeeRole] || Colors.light.primary;
    const roleLabel = roleLabels[employeeRole] || 'Unknown Role';

    return (
      <Pressable
        style={[styles.employeeCard, { borderColor: theme.border, backgroundColor: theme.backgroundDefault }]}
        onPress={() => handleMarkAttendance(item)}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {profileImage ? (
            <Image
              source={{ uri: profileImage }}
              style={styles.profileImage}
              onError={(e) => console.log('Failed to load profile image:', e.nativeEvent.error)}
            />
          ) : (
            <View
              style={[
                styles.avatarFallback,
                { backgroundColor: roleColor + '20' }
              ]}
            >
              <Feather name="user" size={18} color={roleColor} />
            </View>
          )}

          <View style={styles.employeeInfo}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>
              {employeeName}
            </ThemedText>
            <View style={[styles.roleBadge, { backgroundColor: roleColor + '15' }]}>
              <ThemedText type="small" style={{ color: roleColor, fontWeight: '500' }}>
                {roleLabel}
              </ThemedText>
            </View>
          </View>
        </View>

        <Feather name="chevron-right" size={20} color={theme.textSecondary} />
      </Pressable>
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
          data={['all', ...EMPLOYEE_ROLES] as (EmployeeRole | 'all')[]}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.lg, gap: Spacing.sm }}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedRole(item)}
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
                {roleLabels[item]}
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
        renderItem={renderEmployeeItem}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ThemedText style={{ color: theme.textSecondary }}>
              {isLoading ? 'Loading employees...' : 'No employees found'}
            </ThemedText>
          </View>
        }
      />
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
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeInfo: {
    flex: 1,
    gap: 4,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: Spacing.xl,
  },
});