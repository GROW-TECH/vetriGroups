import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, FlatList, Modal, Alert, Switch, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { LinearGradient } from 'expo-linear-gradient';

import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import { Employee, EmployeeRole, EMPLOYEE_ROLES } from '@/types';
import { Spacing, BorderRadius, Colors, Shadows } from '@/constants/theme';

export default function AttendanceSheetScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { employees, attendance, markAttendance, deleteAttendance } = useData();

  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<EmployeeRole | 'all'>('all');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showEmployeeDetail, setShowEmployeeDetail] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [editModeEnabled, setEditModeEnabled] = useState(false);
  // ================= ROLE NORMALIZATION =================
const normalizeRole = (role?: string): EmployeeRole | null => {
  if (!role) return null;

  return role
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_') as EmployeeRole;
};


const hasEditPermission =
  user?.role === 'admin' ||
  user?.role === 'engineer' ||
  user?.role === 'site_engineer';

  const canEdit = hasEditPermission && editModeEnabled;

  const currentMonth = selectedDate.getMonth();
  const currentYear = selectedDate.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;

const filteredEmployees = useMemo(() => {
  return employees.filter(e => {
    const employeeRole = normalizeRole(e.role);

    const matchesRole =
      selectedRole === 'all' ||
      employeeRole === selectedRole;

    const matchesSearch = e.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());

    return matchesRole && matchesSearch;
  });
}, [employees, selectedRole, searchQuery]);


  const dayStats = useMemo(() => {
    const present = filteredEmployees.filter(e => {
      const record = attendance.find(a => a.employeeId === e.id && a.date === dateStr);
      return record?.status === 'present';
    }).length;
    const absent = filteredEmployees.filter(e => {
      const record = attendance.find(a => a.employeeId === e.id && a.date === dateStr);
      return record?.status === 'absent';
    }).length;
    const notMarked = filteredEmployees.length - present - absent;
    
    // Calculate total daily salary
    const totalDailySalary = filteredEmployees.reduce((total, emp) => {
      const record = attendance.find(a => a.employeeId === emp.id && a.date === dateStr);
      return record?.status === 'present' ? total + emp.salary : total;
    }, 0);
    
    return { present, absent, notMarked, total: filteredEmployees.length, totalDailySalary };
  }, [filteredEmployees, attendance, dateStr]);

  const getAttendanceStatus = (employeeId: string): 'present' | 'absent' | null => {
    const record = attendance.find(a => a.employeeId === employeeId && a.date === dateStr);
    return record?.status || null;
  };

  const toggleAttendance = async (employeeId: string) => {
    if (!canEdit) return;
    const currentStatus = getAttendanceStatus(employeeId);
    if (currentStatus === 'present') {
      await markAttendance(employeeId, dateStr, 'absent');
    } else if (currentStatus === 'absent') {
      await deleteAttendance(employeeId, dateStr);
    } else {
      await markAttendance(employeeId, dateStr, 'present');
    }
  };

  const markAllPresent = async () => {
    if (!canEdit) return;
    Alert.alert(
      'Mark All Present',
      `Mark all ${filteredEmployees.length} employees as present for this day?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            for (const emp of filteredEmployees) {
              await markAttendance(emp.id, dateStr, 'present');
            }
          },
        },
      ]
    );
  };

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

const roleLabels: Record<string, string> = {
  all: 'All',
  mason: 'Mason',
  labor: 'Labor',
  engineer: 'Engineer',
  site_engineer: 'Site Engineer',
  supervisor: 'Supervisor',
};

  const getEmployeeMonthStats = (employeeId: string) => {
    let present = 0;
    let absent = 0;
    let totalSalary = 0;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const d = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const record = attendance.find(a => a.employeeId === employeeId && a.date === d);
      const employee = employees.find(e => e.id === employeeId);
      
      if (record?.status === 'present') {
        present++;
        totalSalary += employee?.salary || 0;
      } else if (record?.status === 'absent') {
        absent++;
      }
    }
    return { present, absent, totalSalary };
  };

  // Get monthly totals for all employees
  const getMonthlyTotals = useMemo(() => {
    let totalPresentDays = 0;
    let totalAbsentDays = 0;
    let totalMonthlySalary = 0;
    
    filteredEmployees.forEach(emp => {
      const stats = getEmployeeMonthStats(emp.id);
      totalPresentDays += stats.present;
      totalAbsentDays += stats.absent;
      totalMonthlySalary += stats.totalSalary;
    });
    
    return {
      totalPresentDays,
      totalAbsentDays,
      totalMonthlySalary
    };
  }, [filteredEmployees, currentMonth, currentYear]);

  const getAttendanceForDay = (employeeId: string, day: number): 'present' | 'absent' | null => {
    const d = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const record = attendance.find(a => a.employeeId === employeeId && a.date === d);
    return record?.status || null;
  };

  const toggleMonthlyAttendance = async (employeeId: string, day: number) => {
    if (!canEdit) return;
    const d = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    const currentStatus = getAttendanceForDay(employeeId, day);
    if (currentStatus === 'present') {
      await markAttendance(employeeId, d, 'absent');
    } else if (currentStatus === 'absent') {
      await deleteAttendance(employeeId, d);
    } else {
      await markAttendance(employeeId, d, 'present');
    }
  };

  const calculateTotalSalary = (employee: Employee) => {
    const stats = getEmployeeMonthStats(employee.id);
    return stats.totalSalary;
  };

  const isSundayDay = (day: number) => {
    const date = new Date(currentYear, currentMonth, day);
    return date.getDay() === 0;
  };

  const openEmployeeDetail = (employee: Employee) => {
    setSelectedEmployee(employee);
    setShowEmployeeDetail(true);
  };

  const generateCSVContent = () => {
    const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let csv = `Attendance Report - ${monthName}\n\n`;
    
    if (viewMode === 'daily') {
      csv += `Date,${selectedDate.toLocaleDateString('en-IN')}\n\n`;
      csv += `Employee Name,Role,Daily Salary,Status,Amount\n`;
      filteredEmployees.forEach(emp => {
        const status = getAttendanceStatus(emp.id);
        const amount = status === 'present' ? emp.salary : 0;
        csv += `${emp.name},${emp.role},${emp.salary},${status || 'Not Marked'},${amount}\n`;
      });
      csv += `\nSummary\n`;
      csv += `Present,${dayStats.present}\n`;
      csv += `Absent,${dayStats.absent}\n`;
      csv += `Not Marked,${dayStats.notMarked}\n`;
      csv += `Total Daily Salary,${dayStats.totalDailySalary}\n`;
    } else {
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      csv += `Employee Name,Role,Daily Salary,${days.join(',')},Present Days,Total Salary\n`;
      filteredEmployees.forEach(emp => {
        const stats = getEmployeeMonthStats(emp.id);
        const totalSalary = calculateTotalSalary(emp);
        const dayStatuses = days.map(day => {
          const status = getAttendanceForDay(emp.id, day);
          return status === 'present' ? 'P' : status === 'absent' ? 'A' : '-';
        });
        csv += `${emp.name},${emp.role},${emp.salary},${dayStatuses.join(',')},${stats.present},${totalSalary}\n`;
      });
      csv += `\nMonthly Totals\n`;
      csv += `Total Present Days,${getMonthlyTotals.totalPresentDays}\n`;
      csv += `Total Absent Days,${getMonthlyTotals.totalAbsentDays}\n`;
      csv += `Total Monthly Salary,${getMonthlyTotals.totalMonthlySalary}\n`;
    }
    
    return csv;
  };

  const generateHTMLContent = () => {
    const monthName = selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    let html = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; text-align: center; }
            h3 { color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #4A90D9; color: white; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .present { color: #22C55E; font-weight: bold; }
            .absent { color: #EF4444; font-weight: bold; }
            .summary { margin-top: 20px; padding: 15px; background: #f5f5f5; border-radius: 8px; }
            .total-row { background-color: #e3f2fd !important; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Attendance Report - ${monthName}</h1>
    `;
    
    if (viewMode === 'daily') {
      html += `<h3>Date: ${selectedDate.toLocaleDateString('en-IN')}</h3>`;
      html += `<table><tr><th>Employee Name</th><th>Role</th><th>Daily Salary</th><th>Status</th><th>Amount</th></tr>`;
      filteredEmployees.forEach(emp => {
        const status = getAttendanceStatus(emp.id);
        const statusClass = status === 'present' ? 'present' : status === 'absent' ? 'absent' : '';
        const amount = status === 'present' ? emp.salary : 0;
        html += `<tr><td>${emp.name}</td><td>${emp.role}</td><td>${emp.salary}</td><td class="${statusClass}">${status || 'Not Marked'}</td><td>${amount}</td></tr>`;
      });
      html += `<tr class="total-row"><td colspan="4"><strong>Total Daily Salary</strong></td><td><strong>${dayStats.totalDailySalary}</strong></td></tr>`;
      html += `</table>`;
      html += `<div class="summary"><strong>Summary:</strong> Present: ${dayStats.present} | Absent: ${dayStats.absent} | Not Marked: ${dayStats.notMarked}</div>`;
    } else {
      const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
      html += `<table><tr><th>Employee</th><th>Role</th><th>Daily Salary</th>`;
      days.forEach(d => html += `<th>${d}</th>`);
      html += `<th>Days</th><th>Total Salary</th></tr>`;
      
      filteredEmployees.forEach(emp => {
        const stats = getEmployeeMonthStats(emp.id);
        const salary = calculateTotalSalary(emp);
        html += `<tr><td>${emp.name}</td><td>${emp.role}</td><td>${emp.salary}</td>`;
        days.forEach(day => {
          const status = getAttendanceForDay(emp.id, day);
          const statusClass = status === 'present' ? 'present' : status === 'absent' ? 'absent' : '';
          html += `<td class="${statusClass}">${status === 'present' ? 'P' : status === 'absent' ? 'A' : '-'}</td>`;
        });
        html += `<td class="present">${stats.present}</td><td>${salary.toLocaleString()}</td></tr>`;
      });
      
      // Add monthly totals row
      html += `<tr class="total-row"><td colspan="3"><strong>Monthly Totals</strong></td>`;
      days.forEach(() => html += `<td></td>`);
      html += `<td><strong>${getMonthlyTotals.totalPresentDays}</strong></td><td><strong>${getMonthlyTotals.totalMonthlySalary.toLocaleString()}</strong></td></tr>`;
      
      html += `</table>`;
    }
    
    html += `</body></html>`;
    return html;
  };

  const exportToExcel = async () => {
    try {
      const csvContent = generateCSVContent();
      const fileName = `attendance_${viewMode}_${selectedDate.toISOString().split('T')[0]}.csv`;
      
      if (Platform.OS === 'web') {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Download Started', 'Your attendance file is being downloaded.');
      } else {
        const htmlContent = generateHTMLContent();
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Export Attendance Report'
          });
        } else {
          Alert.alert('Saved', 'PDF saved successfully!');
        }
      }
    } catch (error) {
      console.log('Export error:', error);
      Alert.alert('Export Failed', 'Could not export the attendance data. Please try again.');
    }
  };

  const shareAttendance = async () => {
    try {
      if (Platform.OS === 'web') {
        const csvContent = generateCSVContent();
        try {
          await navigator.clipboard.writeText(csvContent);
          Alert.alert('Copied!', 'Attendance data has been copied to your clipboard.');
        } catch (clipboardError) {
          Alert.alert('Share Failed', 'Could not copy to clipboard.');
        }
      } else {
        const htmlContent = generateHTMLContent();
        const { uri } = await Print.printToFileAsync({ html: htmlContent });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: 'application/pdf',
            dialogTitle: 'Share Attendance Report'
          });
        } else {
          Alert.alert('Not Available', 'Sharing is not available on this device.');
        }
      }
    } catch (error) {
      console.log('Share error:', error);
      Alert.alert('Share Failed', 'Could not share the attendance data. Please try again.');
    }
  };

  const renderEmployee = ({ item }: { item: Employee }) => {
    const status = getAttendanceStatus(item.id);
    const monthStats = getEmployeeMonthStats(item.id);

    return (
      <Pressable
        onPress={() => canEdit ? toggleAttendance(item.id) : openEmployeeDetail(item)}
        onLongPress={() => openEmployeeDetail(item)}
        style={[styles.employeeCard, { backgroundColor: theme.backgroundDefault }, Shadows.sm]}
      >
        <View style={styles.employeeLeft}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: status === 'present' ? Colors.light.success : status === 'absent' ? Colors.light.error : theme.border }
          ]} />
          <View style={styles.employeeInfo}>
            <ThemedText type="body" style={{ fontWeight: '600' }}>{item.name}</ThemedText>
            <View style={styles.employeeMeta}>
              <View style={[styles.roleBadge, { backgroundColor: Colors.light.primary + '10' }]}>
                <ThemedText type="small" style={{ color: Colors.light.primary, fontSize: 10, textTransform: 'capitalize' }}>
                 {roleLabels[normalizeRole(item.role) ?? item.role]}

                </ThemedText>
              </View>
              <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: Spacing.sm, fontWeight: '500' }}>
                ₹{item.salary}/day
              </ThemedText>
            </View>
            <View style={styles.employeeMeta}>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                This month: {monthStats.present}P / ₹{monthStats.totalSalary}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.employeeRight}>
          <ThemedText type="small" style={{ color: Colors.light.primary, fontWeight: '600', marginBottom: 4 }}>
            ₹{status === 'present' ? item.salary : 0}
          </ThemedText>
          <Pressable
            onPress={() => canEdit ? toggleAttendance(item.id) : null}
            style={[
              styles.statusButton,
              {
                backgroundColor: status === 'present' 
                  ? Colors.light.success 
                  : status === 'absent' 
                    ? Colors.light.error 
                    : theme.backgroundSecondary,
              }
            ]}
          >
            {status === 'present' ? (
              <Feather name="check" size={20} color="#FFFFFF" />
            ) : status === 'absent' ? (
              <Feather name="x" size={20} color="#FFFFFF" />
            ) : (
              <Feather name="minus" size={20} color={theme.textSecondary} />
            )}
          </Pressable>
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { backgroundColor: theme.backgroundDefault }]}>
        <View style={styles.topActionsRow}>
          {hasEditPermission ? (
            <View style={styles.editToggleRow}>
              <View style={styles.editToggleLeft}>
                <Feather 
                  name={editModeEnabled ? "unlock" : "lock"} 
                  size={16} 
                  color={editModeEnabled ? Colors.light.success : theme.textSecondary} 
                />
                <ThemedText type="body" style={{ marginLeft: Spacing.sm, fontWeight: '500' }}>
                  Edit Mode
                </ThemedText>
              </View>
              <Switch
                value={editModeEnabled}
                onValueChange={setEditModeEnabled}
                trackColor={{ false: theme.border, true: Colors.light.success + '50' }}
                thumbColor={editModeEnabled ? Colors.light.success : theme.textSecondary}
              />
            </View>
          ) : null}
          
          <View style={styles.exportShareRow}>
            <Pressable onPress={exportToExcel} style={styles.actionBtn}>
              <Feather name="download" size={18} color={Colors.light.primary} />
              <ThemedText type="small" style={{ marginLeft: 4, color: Colors.light.primary, fontWeight: '600' }}>
                Export
              </ThemedText>
            </Pressable>
            <Pressable onPress={shareAttendance} style={styles.actionBtn}>
              <Feather name="share-2" size={18} color={Colors.light.success} />
              <ThemedText type="small" style={{ marginLeft: 4, color: Colors.light.success, fontWeight: '600' }}>
                Share
              </ThemedText>
            </Pressable>
          </View>
        </View>

        {/* View Toggle - 📅 Daily View 📆 Monthly View */}
        <View style={styles.viewToggleContainer}>
          <Pressable
            onPress={() => setViewMode('daily')}
            style={[
              styles.viewToggleButton,
              viewMode === 'daily' && styles.viewToggleButtonActive
            ]}
          >
            <Feather name="calendar" size={16} color={viewMode === 'daily' ? '#FFFFFF' : Colors.light.primary} />
            <ThemedText 
              type="body" 
              style={[
                styles.viewToggleText,
                { color: viewMode === 'daily' ? '#FFFFFF' : Colors.light.primary }
              ]}
            >
              📅 Daily View
            </ThemedText>
          </Pressable>
          
          <Pressable
            onPress={() => setViewMode('monthly')}
            style={[
              styles.viewToggleButton,
              viewMode === 'monthly' && styles.viewToggleButtonActive
            ]}
          >
            <Feather name="grid" size={16} color={viewMode === 'monthly' ? '#FFFFFF' : Colors.light.primary} />
            <ThemedText 
              type="body" 
              style={[
                styles.viewToggleText,
                { color: viewMode === 'monthly' ? '#FFFFFF' : Colors.light.primary }
              ]}
            >
              📆 Monthly View
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.dateNav}>
          <Pressable onPress={() => viewMode === 'daily' ? changeDate(-1) : setSelectedDate(new Date(currentYear, currentMonth - 1, 1))} style={styles.navButton}>
            <Feather name="chevron-left" size={24} color={theme.text} />
          </Pressable>
          
          <Pressable onPress={() => setShowCalendar(true)} style={styles.dateDisplay}>
            <Feather name="calendar" size={18} color={Colors.light.primary} />
            <View style={styles.dateText}>
              {viewMode === 'daily' ? (
                <>
                  <ThemedText type="h4" style={{ textAlign: 'center' }}>
                    {selectedDate.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })}
                  </ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary }}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </ThemedText>
                </>
              ) : (
                <ThemedText type="h4" style={{ textAlign: 'center' }}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                </ThemedText>
              )}
            </View>
            {viewMode === 'daily' && isToday ? (
              <View style={[styles.todayBadge, { backgroundColor: Colors.light.primary }]}>
                <ThemedText type="small" style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '600' }}>TODAY</ThemedText>
              </View>
            ) : null}
          </Pressable>

          <Pressable onPress={() => viewMode === 'daily' ? changeDate(1) : setSelectedDate(new Date(currentYear, currentMonth + 1, 1))} style={styles.navButton}>
            <Feather name="chevron-right" size={24} color={theme.text} />
          </Pressable>
        </View>

        {/* Daily View Stats */}
        {viewMode === 'daily' ? (
          <View style={styles.statsRow}>
            <View style={[styles.statItem, { backgroundColor: Colors.light.success + '10' }]}>
              <ThemedText type="h4" style={{ color: Colors.light.success }}>{dayStats.present}</ThemedText>
              <ThemedText type="small" style={{ color: Colors.light.success }}>Present</ThemedText>
            </View>
            <View style={[styles.statItem, { backgroundColor: Colors.light.error + '10' }]}>
              <ThemedText type="h4" style={{ color: Colors.light.error }}>{dayStats.absent}</ThemedText>
              <ThemedText type="small" style={{ color: Colors.light.error }}>Absent</ThemedText>
            </View>
            <View style={[styles.statItem, { backgroundColor: theme.backgroundSecondary }]}>
              <ThemedText type="h4" style={{ color: theme.textSecondary }}>{dayStats.notMarked}</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Pending</ThemedText>
            </View>
            <View style={[styles.statItem, { backgroundColor: '#F59E0B10' }]}>
              <ThemedText type="h4" style={{ color: '#F59E0B' }}>₹{dayStats.totalDailySalary}</ThemedText>
              <ThemedText type="small" style={{ color: '#F59E0B' }}>Daily Salary</ThemedText>
            </View>
          </View>
        ) : null}

        <View style={[styles.searchRow, { borderColor: theme.border }]}>
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search employees..."
            placeholderTextColor={theme.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.roleFilter}>
          {(['all', ...EMPLOYEE_ROLES] as const).map((role) => (
            <Pressable
              key={role}
              onPress={() => setSelectedRole(role)}
              style={[
                styles.roleChip,
                selectedRole === role && { backgroundColor: Colors.light.primary },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: selectedRole === role ? '#FFFFFF' : theme.text,
                  fontWeight: selectedRole === role ? '600' : '400',
                }}
              >
                {roleLabels[role]}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {viewMode === 'daily' && canEdit && dayStats.notMarked > 0 ? (
        <Pressable onPress={markAllPresent} style={[styles.quickAction, { backgroundColor: Colors.light.success + '15' }]}>
          <Feather name="check-circle" size={18} color={Colors.light.success} />
          <ThemedText type="small" style={{ color: Colors.light.success, marginLeft: Spacing.sm, fontWeight: '500' }}>
            Mark all {dayStats.notMarked} as Present
          </ThemedText>
        </Pressable>
      ) : null}

{viewMode === 'daily' ? (
  <FlatList
    data={filteredEmployees}
    keyExtractor={(item) => item.id}
    renderItem={renderEmployee}
    contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Spacing.xl }]}
    showsVerticalScrollIndicator={false}
    ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
    ListEmptyComponent={() => (
      <View style={styles.emptyState}>
        <Feather name="users" size={48} color={theme.textSecondary} />
        <ThemedText type="body" style={{ color: theme.textSecondary, marginTop: Spacing.md }}>
          No employees found
        </ThemedText>
      </View>
    )}
  />
) : (
  <View style={{ flex: 1 }}>
    <LinearGradient
      colors={['#F8FAFC', '#EEF2FF', '#F0FDF4']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      {/* Outer container with both scrolls */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={true}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          style={{ flex: 1 }}
        >
          <View style={styles.monthlyTable}>
            <View style={styles.monthlyHeader}>
              <View style={styles.monthlyNameCell}>
                <LinearGradient
                  colors={[Colors.light.primary, Colors.light.primary + 'DD']}
                  style={styles.monthlyHeaderGradient}
                >
                  <ThemedText type="small" style={{ fontWeight: '700', color: '#FFFFFF' }}>Employee</ThemedText>
                </LinearGradient>
              </View>
              <View style={styles.dailySalaryCell}>
                <LinearGradient
                  colors={['#F59E0B', '#F59E0BDD']}
                  style={styles.monthlyHeaderGradient}
                >
                  <ThemedText type="small" style={{ fontWeight: '700', fontSize: 10, color: '#FFFFFF' }}>Day ₹</ThemedText>
                </LinearGradient>
              </View>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                <View
                  key={day}
                  style={styles.monthlyDayCell}
                >
                  <LinearGradient
                    colors={[Colors.light.primary + '15', Colors.light.primary + '08']}
                    style={styles.dayCellGradient}
                  >
                    <ThemedText type="small" style={{ fontWeight: '700', fontSize: 12, color: Colors.light.primary }}>
                      {day}
                    </ThemedText>
                  </LinearGradient>
                </View>
              ))}
              <View style={styles.monthlyTotalCell}>
                <LinearGradient
                  colors={[Colors.light.success, Colors.light.success + 'DD']}
                  style={styles.monthlyHeaderGradient}
                >
                  <ThemedText type="small" style={{ fontWeight: '700', fontSize: 10, color: '#FFFFFF' }}>Days</ThemedText>
                </LinearGradient>
              </View>
              <View style={styles.monthlyTotalCell}>
                <LinearGradient
                  colors={['#F59E0B', '#F59E0BDD']}
                  style={styles.monthlyHeaderGradient}
                >
                  <ThemedText type="small" style={{ fontWeight: '700', fontSize: 10, color: '#FFFFFF' }}>Total ₹</ThemedText>
                </LinearGradient>
              </View>
            </View>

            {filteredEmployees.map((employee, index) => {
              const monthStats = getEmployeeMonthStats(employee.id);
              const salary = calculateTotalSalary(employee);
              return (
                <View
                  key={employee.id}
                  style={[styles.monthlyRow, index % 2 === 0 ? styles.monthlyRowEven : styles.monthlyRowOdd]}
                >
                  <Pressable
                    onPress={() => openEmployeeDetail(employee)}
                    style={styles.monthlyNameCell}
                  >
                    <View style={styles.employeeNameBadge}>
                      <View style={[styles.employeeAvatar, { backgroundColor: Colors.light.primary + '20' }]}>
                        <ThemedText type="small" style={{ color: Colors.light.primary, fontWeight: '700', fontSize: 10 }}>
                          {employee.name.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      <ThemedText type="small" numberOfLines={1} style={{ color: Colors.light.primary, fontWeight: '600', flex: 1 }}>
                        {employee.name.split(' ')[0]}
                      </ThemedText>
                    </View>
                  </Pressable>
                  
                  {/* Daily Salary Cell */}
                  <View style={styles.dailySalaryCell}>
                    <View style={[styles.salaryBadge, { backgroundColor: '#F59E0B20' }]}>
                      <ThemedText type="small" style={{ fontWeight: '700', color: '#F59E0B', fontSize: 10 }}>
                        ₹{employee.salary}
                      </ThemedText>
                    </View>
                  </View>
                  
                  {/* Day Cells */}
                  {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                    const status = getAttendanceForDay(employee.id, day);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => toggleMonthlyAttendance(employee.id, day)}
                        disabled={!canEdit}
                        style={styles.monthlyDayCell}
                      >
                        <View style={[
                          styles.attendanceBadge,
                          status === 'present' ? styles.presentBadge :
                          status === 'absent' ? styles.absentBadge : styles.emptyBadge
                        ]}>
                          <ThemedText
                            type="small"
                            style={{
                              fontSize: 11,
                              fontWeight: '700',
                              color: status === 'present' ? '#FFFFFF' :
                                status === 'absent' ? '#FFFFFF' : theme.textSecondary
                            }}
                          >
                            {status === 'present' ? 'P' : status === 'absent' ? 'A' : '-'}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                  
                  {/* Present Days Cell */}
                  <View style={styles.monthlyTotalCell}>
                    <View style={[styles.totalBadge, { backgroundColor: Colors.light.success + '20' }]}>
                      <ThemedText type="small" style={{ fontWeight: '700', color: Colors.light.success }}>
                        {monthStats.present}
                      </ThemedText>
                    </View>
                  </View>
                  
                  {/* Total Salary Cell */}
                  <View style={styles.monthlyTotalCell}>
                    <View style={[styles.totalBadge, { backgroundColor: '#F59E0B20' }]}>
                      <ThemedText type="small" style={{ fontWeight: '700', color: '#F59E0B', fontSize: 10 }}>
                        ₹{salary >= 1000 ? `${(salary/1000).toFixed(0)}K` : salary}
                      </ThemedText>
                    </View>
                  </View>
                </View>
              );
            })}
            
            {/* Monthly Totals Row */}
            <View style={[styles.monthlyRow, styles.monthlyTotalsRow]}>
              <View style={styles.monthlyNameCell}>
                <View style={[styles.totalLabelBadge, { backgroundColor: Colors.light.primary + '20' }]}>
                  <ThemedText type="small" style={{ fontWeight: '700', color: Colors.light.primary, fontSize: 10 }}>
                    MONTHLY TOTALS
                  </ThemedText>
                </View>
              </View>
              
              <View style={styles.dailySalaryCell}>
                <View style={[styles.totalValueBadge, { backgroundColor: '#F59E0B20' }]}>
                  <ThemedText type="small" style={{ fontWeight: '700', color: '#F59E0B', fontSize: 10 }}>
                    -
                  </ThemedText>
                </View>
              </View>
              
              {/* Empty cells for days */}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
                <View key={`total-${day}`} style={styles.monthlyDayCell} />
              ))}
              
              {/* Total Present Days */}
              <View style={styles.monthlyTotalCell}>
                <View style={[styles.totalValueBadge, { backgroundColor: Colors.light.success + '20' }]}>
                  <ThemedText type="small" style={{ fontWeight: '700', color: Colors.light.success }}>
                    {getMonthlyTotals.totalPresentDays}
                  </ThemedText>
                </View>
              </View>
              
              {/* Total Monthly Salary */}
              <View style={styles.monthlyTotalCell}>
                <View style={[styles.totalValueBadge, { backgroundColor: '#F59E0B20' }]}>
                  <ThemedText type="small" style={{ fontWeight: '700', color: '#F59E0B', fontSize: 10 }}>
                    ₹{getMonthlyTotals.totalMonthlySalary >= 1000 ? `${(getMonthlyTotals.totalMonthlySalary/1000).toFixed(0)}K` : getMonthlyTotals.totalMonthlySalary}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </ScrollView>
    </LinearGradient>
  </View>
)}
      {viewMode === 'daily' ? (
        <View style={[styles.legend, { backgroundColor: theme.backgroundDefault, paddingBottom: insets.bottom + Spacing.md }]}>
          <ThemedText type="small" style={{ color: theme.textSecondary, marginRight: Spacing.md }}>Tap to cycle:</ThemedText>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: theme.border }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Not Marked</ThemedText>
          </View>
          <Feather name="arrow-right" size={12} color={theme.textSecondary} style={{ marginHorizontal: 4 }} />
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.light.success }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Present</ThemedText>
          </View>
          <Feather name="arrow-right" size={12} color={theme.textSecondary} style={{ marginHorizontal: 4 }} />
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.light.error }]} />
            <ThemedText type="small" style={{ color: theme.textSecondary }}>Absent</ThemedText>
          </View>
        </View>
      ) : null}

      <Modal
        visible={showCalendar}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCalendar(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.calendarModal, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.calendarHeader}>
              <Pressable onPress={() => {
                const prev = new Date(selectedDate);
                prev.setMonth(prev.getMonth() - 1);
                setSelectedDate(prev);
              }}>
                <Feather name="chevron-left" size={24} color={theme.text} />
              </Pressable>
              <ThemedText type="h4">
                {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </ThemedText>
              <Pressable onPress={() => {
                const next = new Date(selectedDate);
                next.setMonth(next.getMonth() + 1);
                setSelectedDate(next);
              }}>
                <Feather name="chevron-right" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.weekDays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <ThemedText key={day} type="small" style={[styles.weekDay, { color: theme.textSecondary }]}>
                  {day}
                </ThemedText>
              ))}
            </View>

            <View style={styles.calendarGrid}>
              {(() => {
                const firstDay = new Date(currentYear, currentMonth, 1).getDay();
                const days = [];
                for (let i = 0; i < firstDay; i++) {
                  days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
                }
                for (let day = 1; day <= daysInMonth; day++) {
                  const date = new Date(currentYear, currentMonth, day);
                  const isSelected = day === selectedDate.getDate();
                  const isCurrentDay = date.toDateString() === new Date().toDateString();
                  days.push(
                    <Pressable
                      key={day}
                      onPress={() => {
                        setSelectedDate(new Date(currentYear, currentMonth, day));
                        setShowCalendar(false);
                      }}
                      style={[
                        styles.calendarDay,
                        isSelected && { backgroundColor: Colors.light.primary },
                      ]}
                    >
                      <ThemedText
                        type="body"
                        style={{
                          fontWeight: isSelected || isCurrentDay ? '700' : '400',
                          color: isSelected ? '#FFFFFF' : theme.text,
                        }}
                      >
                        {day}
                      </ThemedText>
                      {isCurrentDay && !isSelected ? (
                        <View style={[styles.currentDayDot, { backgroundColor: Colors.light.primary }]} />
                      ) : null}
                    </Pressable>
                  );
                }
                return days;
              })()}
            </View>

            <Pressable
              onPress={() => {
                setSelectedDate(new Date());
                setShowCalendar(false);
              }}
              style={[styles.todayButton, { borderColor: Colors.light.primary }]}
            >
              <ThemedText type="body" style={{ color: Colors.light.primary, fontWeight: '600' }}>Go to Today</ThemedText>
            </Pressable>

            <Pressable onPress={() => setShowCalendar(false)} style={styles.closeButton}>
              <ThemedText type="body" style={{ color: theme.textSecondary }}>Close</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showEmployeeDetail}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmployeeDetail(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailModal, { backgroundColor: theme.backgroundDefault }]}>
            {selectedEmployee ? (
              <>
                <View style={styles.detailHeader}>
                  <View style={[styles.detailAvatar, { backgroundColor: Colors.light.primary + '15' }]}>
                    <ThemedText type="h2" style={{ color: Colors.light.primary }}>
                      {selectedEmployee.name.charAt(0)}
                    </ThemedText>
                  </View>
                  <ThemedText type="h4" style={{ marginTop: Spacing.md }}>{selectedEmployee.name}</ThemedText>
                  <ThemedText type="small" style={{ color: theme.textSecondary, textTransform: 'capitalize' }}>
                    {selectedEmployee.role} | ₹{selectedEmployee.salary}/day
                  </ThemedText>
                </View>

                <View style={styles.detailStats}>
                  <View style={[styles.detailStat, { backgroundColor: Colors.light.success + '10' }]}>
                    <ThemedText type="h3" style={{ color: Colors.light.success }}>
                      {getEmployeeMonthStats(selectedEmployee.id).present}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: Colors.light.success }}>Present</ThemedText>
                  </View>
                  <View style={[styles.detailStat, { backgroundColor: Colors.light.error + '10' }]}>
                    <ThemedText type="h3" style={{ color: Colors.light.error }}>
                      {getEmployeeMonthStats(selectedEmployee.id).absent}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: Colors.light.error }}>Absent</ThemedText>
                  </View>
                  <View style={[styles.detailStat, { backgroundColor: '#F59E0B10' }]}>
                    <ThemedText type="h4" style={{ color: '#F59E0B' }}>
                      ₹{(getEmployeeMonthStats(selectedEmployee.id).present * selectedEmployee.salary).toLocaleString()}
                    </ThemedText>
                    <ThemedText type="small" style={{ color: '#F59E0B' }}>Salary</ThemedText>
                  </View>
                </View>

                <ThemedText type="body" style={{ fontWeight: '600', marginTop: Spacing.xl, marginBottom: Spacing.md }}>
                  {selectedDate.toLocaleDateString('en-US', { month: 'long' })} Attendance
                </ThemedText>

                <ScrollView style={styles.monthGrid} showsVerticalScrollIndicator={false}>
                  <View style={styles.monthDays}>
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                      const d = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      const record = attendance.find(a => a.employeeId === selectedEmployee.id && a.date === d);
                      const status = record?.status || null;

                      return (
                        <Pressable
                          key={day}
                          onPress={() => {
                            if (!canEdit) return;
                            if (status === 'present') {
                              markAttendance(selectedEmployee.id, d, 'absent');
                            } else if (status === 'absent') {
                              deleteAttendance(selectedEmployee.id, d);
                            } else {
                              markAttendance(selectedEmployee.id, d, 'present');
                            }
                          }}
                          style={[
                            styles.monthDay,
                            { backgroundColor: status === 'present' ? Colors.light.success + '15' : status === 'absent' ? Colors.light.error + '15' : theme.backgroundSecondary }
                          ]}
                        >
                          <ThemedText type="small" style={{ fontWeight: '600', color: theme.text }}>
                            {day}
                          </ThemedText>
                          <ThemedText
                            type="small"
                            style={{
                              fontSize: 10,
                              color: status === 'present' ? Colors.light.success : status === 'absent' ? Colors.light.error : theme.textSecondary
                            }}
                          >
                            {status === 'present' ? 'P' : status === 'absent' ? 'A' : '-'}
                          </ThemedText>
                          {status === 'present' && (
                            <ThemedText type="small" style={{ fontSize: 8, color: Colors.light.success, marginTop: 2 }}>
                              ₹{selectedEmployee.salary}
                            </ThemedText>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>

                <Pressable onPress={() => setShowEmployeeDetail(false)} style={styles.closeButton}>
                  <ThemedText type="body" style={{ color: theme.textSecondary }}>Close</ThemedText>
                </Pressable>
              </>
            ) : null}
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
    ...Shadows.sm,
  },
  editToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.light.primary + '08',
    borderRadius: BorderRadius.md,
  },
  editToggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  navButton: {
    padding: Spacing.sm,
  },
  dateDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dateText: {
    marginLeft: Spacing.sm,
  },
  todayBadge: {
    marginLeft: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
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
  roleFilter: {
    marginBottom: Spacing.md,
  },
  roleChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
    backgroundColor: 'transparent',
  },
  quickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  employeeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  employeeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  employeeRight: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: Spacing.md,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  roleBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 4,
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
  calendarModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.full,
  },
  currentDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    bottom: 6,
  },
  todayButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  closeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  detailModal: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
    maxHeight: '80%',
  },
  detailHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  detailAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  detailStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  monthGrid: {
    maxHeight: 200,
  },
  monthDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  monthDay: {
    width: '13%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BorderRadius.sm,
  },
  // View Toggle Styles
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: BorderRadius.lg,
    padding: 4,
    marginBottom: Spacing.md,
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  viewToggleButtonActive: {
    backgroundColor: Colors.light.primary,
  },
  viewToggleText: {
    marginLeft: Spacing.sm,
    fontWeight: '600',
    fontSize: 14,
  },
  monthlyContainer: {
    flex: 1,
  },
  monthlyTable: {
    margin: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  monthlyHeader: {
    flexDirection: 'row',
  },
  monthlyHeaderGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  monthlyRow: {
    flexDirection: 'row',
  },
  monthlyRowEven: {
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  monthlyRowOdd: {
    backgroundColor: 'rgba(248,250,252,0.9)',
  },
  monthlyTotalsRow: {
    backgroundColor: 'rgba(74, 144, 217, 0.1) !important',
    borderTopWidth: 2,
    borderTopColor: Colors.light.primary + '40',
  },
  monthlyNameCell: {
    width: 100,
    justifyContent: 'center',
  },
  dailySalaryCell: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  employeeNameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  employeeAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthlyDayCell: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCellGradient: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  attendanceBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presentBadge: {
    backgroundColor: Colors.light.success,
  },
  absentBadge: {
    backgroundColor: Colors.light.error,
  },
  emptyBadge: {
    backgroundColor: 'transparent',
  },
  monthlyTotalCell: {
    width: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
  },
  salaryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  totalBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  totalLabelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    alignItems: 'center',
  },
  totalValueBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    minWidth: 36,
    alignItems: 'center',
  },
  topActionsRow: {
    marginBottom: Spacing.sm,
  },
  exportShareRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
}); 