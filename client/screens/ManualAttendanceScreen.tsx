import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { Employee } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';

export default function ManualAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { employees, markAttendance, attendance, isLoading } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  const selectedDateString = selectedDate.toISOString().split('T')[0];

  const filteredEmployees = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return employees;
    return employees.filter(e =>
      e.name.toLowerCase().includes(query)
    );
  }, [searchQuery, employees]);

  const getAttendanceStatus = (employeeId: string) => {
    return attendance.find(
      a =>
        a.employeeId === employeeId &&
        a.date === selectedDateString
    )?.status;
  };

  const handleMarkAttendance = async (
    employee: Employee,
    status: 'present' | 'absent'
  ) => {
    await markAttendance(employee.id, selectedDateString, status);
    Alert.alert(
      'Success',
      `${employee.name} marked ${status}`
    );
  };

  const roleLabels: Record<string, string> = {
    mason: 'Mason',
    labor: 'Labor',
    engineer: 'Engineer',
    supervisor: 'Supervisor',
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const currentStatus = getAttendanceStatus(item.id);

    return (
      <View
        style={[
          styles.employeeCard,
          { backgroundColor: theme.backgroundDefault },
        ]}
      >
        <View style={styles.employeeInfo}>
          <View
            style={[
              styles.avatar,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="user" size={20} color={theme.textSecondary} />
          </View>

          <View>
            <ThemedText type="body" style={{ fontWeight: '600' }}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {roleLabels[item.role]}
            </ThemedText>
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => handleMarkAttendance(item, 'present')}
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  currentStatus === 'present'
                    ? Colors.light.success
                    : theme.backgroundSecondary,
              },
            ]}
          >
            <Feather
              name="check"
              size={18}
              color={currentStatus === 'present' ? '#fff' : theme.text}
            />
          </Pressable>

          <Pressable
            onPress={() => handleMarkAttendance(item, 'absent')}
            style={[
              styles.actionButton,
              {
                backgroundColor:
                  currentStatus === 'absent'
                    ? Colors.light.error
                    : theme.backgroundSecondary,
              },
            ]}
          >
            <Feather
              name="x"
              size={18}
              color={currentStatus === 'absent' ? '#fff' : theme.text}
            />
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* SEARCH + DATE */}
      <View style={[styles.searchContainer, { paddingTop: Spacing.lg }]}>
        <View
          style={[
            styles.searchBox,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search employee by name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <Pressable
          onPress={() => setShowCalendar(true)}
          style={[
            styles.dateContainer,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <Feather name="calendar" size={16} color={theme.textSecondary} />
          <ThemedText type="small" style={{ marginLeft: Spacing.xs }}>
            {selectedDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </ThemedText>
        </Pressable>
      </View>

      {/* LIST */}
      {isLoading ? (
        <View style={styles.emptyState}>
          <ThemedText>Loading employees...</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={item => item.id}
          renderItem={renderEmployee}
          contentContainerStyle={{
            padding: Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          }}
        />
      )}

      {/* CALENDAR MODAL */}
      <Modal visible={showCalendar} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.calendarCard}>
            <Calendar
              onDayPress={day => {
                setSelectedDate(new Date(day.dateString));
                setShowCalendar(false);
              }}
              markedDates={{
                [selectedDateString]: {
                  selected: true,
                  selectedColor: Colors.light.primary,
                },
              }}
            />

            <Pressable
              style={styles.closeBtn}
              onPress={() => setShowCalendar(false)}
            >
              <ThemedText>Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },

  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },

  searchInput: {
    flex: 1,
    fontSize: 16,
  },

  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.sm,
  },

  employeeCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },

  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },

  actions: {
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

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: '#00000066',
    justifyContent: 'center',
  },

  calendarCard: {
    margin: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
  },

  closeBtn: {
    alignItems: 'center',
    padding: 10,
  },
});
