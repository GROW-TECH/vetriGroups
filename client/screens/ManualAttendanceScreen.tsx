import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { Calendar } from 'react-native-calendars';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { Employee, Client } from '@/types';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';

export default function ManualAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { employees, clients, markAttendance, attendance, isLoading } = useData();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showCalendar, setShowCalendar] = useState(false);

  // Site selection modal state
  const [siteModalVisible, setSiteModalVisible] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

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

      await markAttendance(selectedEmployee.id, selectedDateString, "present", {
        siteId: site.id,
        siteName: site.projectName,
        checkInTime: timeNow,
      });

      setSiteModalVisible(false);
      setSelectedEmployee(null);
      
      Alert.alert('Success', `${selectedEmployee.name} marked present at ${site.projectName}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to mark attendance');
    }
  };

  const handleMarkAbsent = async (employee: Employee) => {
    Alert.alert(
      'Mark Absent',
      `Mark ${employee.name} as absent for ${selectedDateString}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          style: 'destructive',
          onPress: async () => {
            try {
              await markAttendance(employee.id, selectedDateString, "absent");
              Alert.alert('Success', `${employee.name} marked absent`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to mark attendance');
            }
          }
        }
      ]
    );
  };

  const roleLabels: Record<string, string> = {
    mason: 'Mason',
    labor: 'Labor',
    engineer: 'Engineer',
    supervisor: 'Supervisor',
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const currentAttendance = getAttendanceStatus(item.id);
    const currentStatus = currentAttendance?.status;

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

          <View style={{ flex: 1 }}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>
              {item.name}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {roleLabels[item.role]}
            </ThemedText>
            {currentStatus === 'present' && currentAttendance?.siteName && (
              <View style={styles.siteTag}>
                <Feather name="map-pin" size={10} color={Colors.light.success} />
                <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: 4, fontSize: 11 }}>
                  {currentAttendance.siteName}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => handlePresentClick(item)}
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
            onPress={() => handleMarkAbsent(item)}
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

      {/* SITE SELECTION MODAL */}
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
          <Pressable style={styles.siteModalContent} onPress={(e) => e.stopPropagation()}>
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
    paddingVertical: Spacing.xl,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
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

  siteModalContent: {
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