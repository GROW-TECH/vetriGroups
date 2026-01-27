import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as XLSX from "xlsx";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/context/DataContext";
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";

export default function AttendanceHistoryScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { employees, attendance, clients } = useData();

  // States
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSite, setSelectedSite] = useState<string>("all");
  const [showSiteFilter, setShowSiteFilter] = useState(false);
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [toDate, setToDate] = useState(() => {
    const d = new Date();
    d.setHours(23, 59, 59, 999);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'from' | 'to'>('from');

  // Get site options from clients
  const siteOptions = useMemo(() => {
    return [
      { id: "all", name: "All Sites" },
      ...clients.map((c) => ({ id: c.id, name: c.projectName })),
    ];
  }, [clients]);

  // Search suggestions
  const searchSuggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.length < 1) return [];
    const query = searchQuery.toLowerCase();
    return employees
      .filter((e) => e.name.toLowerCase().includes(query))
      .slice(0, 5);
  }, [searchQuery, employees]);

  // Filter attendance records
  const filteredAttendance = useMemo(() => {
    // Only get present records and validate they have required fields
    let records = attendance.filter((a) => 
      a.status === "present" && 
      a.employeeId && 
      a.date
    );

    // CRITICAL: Remove duplicates FIRST before any other filtering
    // Use a Map to ensure only one record per employee per date
    const uniqueMap = new Map<string, typeof records[0]>();
    
    records.forEach((record) => {
      const uniqueKey = `${record.employeeId}__${record.date}`;
      
      // Only keep the first occurrence of each unique combination
      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, record);
      }
    });
    
    // Convert back to array
    records = Array.from(uniqueMap.values());

    // Filter by date range - ensure proper date comparison
    records = records.filter((a) => {
      try {
        const recordDate = new Date(a.date);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        
        // Validate dates are valid
        if (isNaN(recordDate.getTime()) || isNaN(from.getTime()) || isNaN(to.getTime())) {
          return false;
        }
        
        // Set to start of day for from date
        from.setHours(0, 0, 0, 0);
        // Set to end of day for to date
        to.setHours(23, 59, 59, 999);
        // Set record date to start of day
        recordDate.setHours(0, 0, 0, 0);
        
        return recordDate >= from && recordDate <= to;
      } catch (error) {
        console.error('Date filtering error:', error);
        return false;
      }
    });

    // Filter by site
    if (selectedSite !== "all") {
      records = records.filter((a) => a.siteId === selectedSite);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      records = records.filter((a) => {
        const emp = employees.find((e) => e.id === a.employeeId);
        return emp?.name.toLowerCase().includes(query);
      });
    }

    // Sort by date descending
    records.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return records;
  }, [attendance, employees, selectedSite, searchQuery, fromDate, toDate]);

  // Group attendance by DATE
  const dateWiseAttendance = useMemo(() => {
    const grouped: Record<
      string,
      {
        date: string;
        dayName: string;
        records: {
          employee: (typeof employees)[0];
          record: (typeof filteredAttendance)[0];
        }[];
        totalSalary: number;
      }
    > = {};

    filteredAttendance.forEach((record) => {
      const emp = employees.find((e) => e.id === record.employeeId);
      if (!emp) return;

      if (!grouped[record.date]) {
        const d = new Date(record.date);
        grouped[record.date] = {
          date: record.date,
          dayName: d.toLocaleDateString("en-IN", { weekday: "long" }),
          records: [],
          totalSalary: 0,
        };
      }
      grouped[record.date].records.push({ employee: emp, record });
      grouped[record.date].totalSalary += emp.salary;
    });

    return Object.values(grouped).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [filteredAttendance, employees]);

  // Calculate totals
  const totalSalary = useMemo(() => {
    // Sum all salaries from filtered attendance
    let total = 0;
    let count = 0;
    
    filteredAttendance.forEach((record) => {
      const emp = employees.find((e) => e.id === record.employeeId);
      if (emp && typeof emp.salary === 'number' && emp.salary > 0 && emp.salary < 1000000) {
        total += emp.salary;
        count++;
      }
    });
    
    // Sanity check: if total seems unreasonable, return 0
    // Max reasonable: 100 employees * 10,000 per day * 30 days = 30,000,000
    if (total > 100000000) {
      console.error('Salary calculation error: Total exceeds reasonable limit', {
        total,
        recordCount: count,
        filteredCount: filteredAttendance.length
      });
      return 0;
    }
    
    return total;
  }, [filteredAttendance, employees]);

  const totalPresentDays = useMemo(() => {
    return filteredAttendance.length;
  }, [filteredAttendance]);

  const uniqueEmployees = useMemo(() => {
    const ids = new Set(filteredAttendance.map((a) => a.employeeId));
    return ids.size;
  }, [filteredAttendance]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short"
    });
  };

  const formatDateForFile = (date: Date) => {
    return date
      .toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, "-");
  };

  const formatDateFull = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Export to Excel
  const exportToExcel = async (shouldShare: boolean = false) => {
    try {
      if (dateWiseAttendance.length === 0) {
        Alert.alert("No Data", "No attendance records to export");
        return;
      }

      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryData = [
        ["ATTENDANCE REPORT"],
        [""],
        ["Report Period:", `${formatDate(fromDate)} to ${formatDate(toDate)}`],
        [
          "Site Filter:",
          siteOptions.find((s) => s.id === selectedSite)?.name || "All Sites",
        ],
        ["Search Filter:", searchQuery || "None"],
        [""],
        ["SUMMARY"],
        ["Total Present Count:", totalPresentDays],
        ["Unique Employees:", uniqueEmployees],
        ["Total Salary:", `₹${totalSalary.toLocaleString("en-IN")}`],
        [""],
        ["Generated On:", new Date().toLocaleString("en-IN")],
      ];
      const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
      summarySheet["!cols"] = [{ wch: 20 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      // Sheet 2: Detailed Attendance
      const detailedData: (string | number)[][] = [
        [
          "Date",
          "Day",
          "Employee Name",
          "Role",
          "Site",
          "Check In",
          "Check Out",
          "Status",
          "Daily Salary (₹)",
        ],
      ];

      dateWiseAttendance.forEach((dateGroup) => {
        dateGroup.records.forEach(({ employee, record }) => {
          detailedData.push([
            formatDateFull(dateGroup.date),
            dateGroup.dayName,
            employee.name,
            employee.role,
            record.siteName || "N/A",
            record.checkInTime || "-",
            record.checkOutTime || "-",
            "Present",
            employee.salary,
          ]);
        });
      });

      detailedData.push([]);
      detailedData.push(["", "", "", "", "", "", "", "TOTAL:", totalSalary]);

      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
      detailedSheet["!cols"] = [
        { wch: 15 },
        { wch: 12 },
        { wch: 20 },
        { wch: 15 },
        { wch: 20 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, detailedSheet, "Attendance Details");

      // Sheet 3: Employee Summary
      const empSummaryData: (string | number)[][] = [
        ["EMPLOYEE ATTENDANCE SUMMARY"],
        [""],
        [
          "Employee Name",
          "Role",
          "Daily Rate (₹)",
          "Days Present",
          "Total Salary (₹)",
        ],
      ];

      const empGroups: Record<
        string,
        { name: string; role: string; salary: number; days: number }
      > = {};
      dateWiseAttendance.forEach((dateGroup) => {
        dateGroup.records.forEach(({ employee }) => {
          if (!empGroups[employee.id]) {
            empGroups[employee.id] = {
              name: employee.name,
              role: employee.role,
              salary: employee.salary,
              days: 0,
            };
          }
          empGroups[employee.id].days += 1;
        });
      });

      Object.values(empGroups)
        .sort((a, b) => b.days - a.days)
        .forEach((emp) => {
          empSummaryData.push([
            emp.name,
            emp.role,
            emp.salary,
            emp.days,
            emp.salary * emp.days,
          ]);
        });

      empSummaryData.push([]);
      empSummaryData.push(["", "", "TOTAL:", totalPresentDays, totalSalary]);

      const empSheet = XLSX.utils.aoa_to_sheet(empSummaryData);
      empSheet["!cols"] = [
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, empSheet, "Employee Summary");

      // Generate file
      const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
      const fileName = `Attendance_${formatDateForFile(fromDate)}_to_${formatDateForFile(toDate)}.xlsx`;

      const file = new File(Paths.document, fileName);
      const binaryString = atob(wbout);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      file.write(bytes);

      const fileUri = file.uri;

      if (shouldShare) {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType:
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Share Attendance Report",
          });
        } else {
          Alert.alert(
            "Sharing not available",
            "Sharing is not available on this device"
          );
        }
      } else {
        Alert.alert(
          "Export Successful",
          `File saved as:\n${fileName}\n\nLocation: Documents folder`,
          [
            { text: "OK" },
            {
              text: "Share Now",
              onPress: async () => {
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType:
                      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    dialogTitle: "Share Attendance Report",
                  });
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error("Export error:", error);
      Alert.alert(
        "Export Failed",
        "Failed to export attendance data. Please try again."
      );
    }
  };

  const handleSelectSuggestion = (name: string) => {
    setSearchQuery(name);
    setShowSuggestions(false);
  };

  const openDatePicker = (mode: 'from' | 'to') => {
    setDatePickerMode(mode);
    setShowDatePicker(true);
  };

  // Enhanced Calendar Component
  const DateRangePicker = () => {
    const [viewDate, setViewDate] = useState(datePickerMode === 'from' ? fromDate : toDate);
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();

    const getDaysInMonth = (month: number, year: number) => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const firstDayOfWeek = new Date(year, month, 1).getDay();
      
      const days: (number | null)[] = [];
      for (let i = 0; i < firstDayOfWeek; i++) {
        days.push(null);
      }
      for (let i = 1; i <= daysInMonth; i++) {
        days.push(i);
      }
      return days;
    };

    const currentMonthDays = getDaysInMonth(month, year);
    const nextMonthDays = getDaysInMonth(month + 1, year);

    const isInRange = (day: number, currentMonth: number) => {
      const date = new Date(year, currentMonth, day);
      const from = new Date(fromDate);
      const to = new Date(toDate);
      from.setHours(0, 0, 0, 0);
      to.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      return date > from && date < to;
    };

    const isFromDate = (day: number, currentMonth: number) => {
      return (
        fromDate.getDate() === day &&
        fromDate.getMonth() === currentMonth &&
        fromDate.getFullYear() === year
      );
    };

    const isToDate = (day: number, currentMonth: number) => {
      return (
        toDate.getDate() === day &&
        toDate.getMonth() === currentMonth &&
        toDate.getFullYear() === year
      );
    };

    const handleSelectDate = (day: number, currentMonth: number) => {
      const newDate = new Date(year, currentMonth, day);
      
      if (datePickerMode === 'from') {
        newDate.setHours(0, 0, 0, 0);
        if (newDate > toDate) {
          Alert.alert('Invalid Date', 'From date cannot be after To date');
          return;
        }
        setFromDate(newDate);
      } else {
        newDate.setHours(23, 59, 59, 999);
        if (newDate < fromDate) {
          Alert.alert('Invalid Date', 'To date cannot be before From date');
          return;
        }
        setToDate(newDate);
      }
      setShowDatePicker(false);
    };

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    return (
      <Modal visible={showDatePicker} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setShowDatePicker(false)}>
          <Pressable style={styles.calendarContainer} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.calendarHeader}>
              <View style={styles.dateRangeDisplay}>
                <View style={styles.dateRangeItem}>
                  <ThemedText type="small" style={styles.dateLabel}>Check-in</ThemedText>
                  <ThemedText type="body" style={styles.dateValue}>{formatDateShort(fromDate)}</ThemedText>
                </View>
                <Feather name="arrow-right" size={20} color={theme.textSecondary} />
                <View style={styles.dateRangeItem}>
                  <ThemedText type="small" style={styles.dateLabel}>Check-out</ThemedText>
                  <ThemedText type="body" style={styles.dateValue}>{formatDateShort(toDate)}</ThemedText>
                </View>
              </View>
              <Pressable onPress={() => setShowDatePicker(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Current Month */}
              <View style={styles.monthContainer}>
                <View style={styles.monthHeader}>
                  <Pressable onPress={() => setViewDate(new Date(year, month - 1, 1))}>
                    <Feather name="chevron-left" size={24} color={theme.text} />
                  </Pressable>
                  <ThemedText type="body" style={styles.monthTitle}>
                    {monthNames[month]} {year}
                  </ThemedText>
                  <View style={{ width: 24 }} />
                </View>

                <View style={styles.weekDaysRow}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                    <ThemedText key={i} type="small" style={styles.weekDayText}>
                      {day}
                    </ThemedText>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {currentMonthDays.map((day, index) => {
                    const isFrom = day !== null && isFromDate(day, month);
                    const isTo = day !== null && isToDate(day, month);
                    const inRange = day !== null && isInRange(day, month);
                    
                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.dayCell,
                          (isFrom || isTo) && styles.dayCellSelected,
                          inRange && !isFrom && !isTo && styles.dayCellInRange,
                        ]}
                        onPress={() => day !== null && handleSelectDate(day, month)}
                        disabled={day === null}
                      >
                        {day !== null && (
                          <ThemedText
                            type="small"
                            style={[
                              styles.dayText,
                              (isFrom || isTo) && styles.dayTextSelected,
                            ]}
                          >
                            {day}
                          </ThemedText>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Next Month */}
              <View style={styles.monthContainer}>
                <View style={styles.monthHeader}>
                  <View style={{ width: 24 }} />
                  <ThemedText type="body" style={styles.monthTitle}>
                    {monthNames[(month + 1) % 12]} {month === 11 ? year + 1 : year}
                  </ThemedText>
                  <Pressable onPress={() => setViewDate(new Date(year, month + 2, 1))}>
                    <Feather name="chevron-right" size={24} color={theme.text} />
                  </Pressable>
                </View>

                <View style={styles.weekDaysRow}>
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, i) => (
                    <ThemedText key={i} type="small" style={styles.weekDayText}>
                      {day}
                    </ThemedText>
                  ))}
                </View>

                <View style={styles.daysGrid}>
                  {nextMonthDays.map((day, index) => {
                    const nextMonth = (month + 1) % 12;
                    const nextYear = month === 11 ? year + 1 : year;
                    const isFrom = day !== null && isFromDate(day, nextMonth);
                    const isTo = day !== null && isToDate(day, nextMonth);
                    const inRange = day !== null && isInRange(day, nextMonth);
                    
                    return (
                      <Pressable
                        key={index}
                        style={[
                          styles.dayCell,
                          (isFrom || isTo) && styles.dayCellSelected,
                          inRange && !isFrom && !isTo && styles.dayCellInRange,
                        ]}
                        onPress={() => day !== null && handleSelectDate(day, nextMonth)}
                        disabled={day === null}
                      >
                        {day !== null && (
                          <ThemedText
                            type="small"
                            style={[
                              styles.dayText,
                              (isFrom || isTo) && styles.dayTextSelected,
                            ]}
                          >
                            {day}
                          </ThemedText>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with Back Button */}
      <View style={[styles.headerContainer, { backgroundColor: theme.backgroundDefault, paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <Pressable 
            onPress={() => navigation.goBack()} 
            style={styles.backButton}
            hitSlop={8}
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3" style={styles.headerTitle}>
            Attendance History
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search Bar with Suggestions */}
        <View style={{ zIndex: 100 }}>
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="search" size={16} color={theme.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search employee name..."
              placeholderTextColor={theme.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                setShowSuggestions(text.length > 0);
              }}
              onFocus={() => setShowSuggestions(searchQuery.length > 0)}
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => {
                  setSearchQuery("");
                  setShowSuggestions(false);
                }}
              >
                <Feather name="x" size={16} color={theme.textSecondary} />
              </Pressable>
            )}
          </View>

          {/* Search Suggestions */}
          {showSuggestions && searchSuggestions.length > 0 && (
            <View
              style={[
                styles.suggestionsDropdown,
                { backgroundColor: theme.backgroundDefault },
                Shadows.md,
              ]}
            >
              {searchSuggestions.map((emp) => (
                <Pressable
                  key={emp.id}
                  style={styles.suggestionItem}
                  onPress={() => handleSelectSuggestion(emp.name)}
                >
                  <LinearGradient
                    colors={["#6366F1", "#8B5CF6"]}
                    style={styles.suggestionAvatar}
                  >
                    <ThemedText
                      type="small"
                      style={{ color: "#fff", fontWeight: "600", fontSize: 12 }}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: "600" }}>
                      {emp.name}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, fontSize: 11 }}
                    >
                      {emp.role} • ₹{emp.salary}/day
                    </ThemedText>
                  </View>
                  <Feather
                    name="arrow-up-left"
                    size={14}
                    color={theme.textSecondary}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Date Range Selector - Hotel Style */}
        <Pressable 
          style={[styles.dateRangeSelectorCard, { backgroundColor: theme.backgroundDefault }]}
          onPress={() => openDatePicker('from')}
        >
          <View style={styles.dateRangeRow}>
            <View style={styles.dateRangeColumn}>
              <ThemedText type="small" style={styles.dateRangeLabel}>From Date</ThemedText>
              <ThemedText type="body" style={styles.dateRangeValue}>{formatDateShort(fromDate)}</ThemedText>
              <ThemedText type="small" style={styles.dateRangeFull}>{formatDate(fromDate)}</ThemedText>
            </View>
            
            <View style={styles.dateRangeDivider}>
              <Feather name="arrow-right" size={20} color={Colors.light.primary} />
            </View>
            
            <View style={styles.dateRangeColumn}>
              <ThemedText type="small" style={styles.dateRangeLabel}>To Date</ThemedText>
              <ThemedText type="body" style={styles.dateRangeValue}>{formatDateShort(toDate)}</ThemedText>
              <ThemedText type="small" style={styles.dateRangeFull}>{formatDate(toDate)}</ThemedText>
            </View>
          </View>
          
          <View style={styles.dateRangeFooter}>
            <Feather name="calendar" size={14} color={Colors.light.primary} />
            <ThemedText type="small" style={{ color: Colors.light.primary, marginLeft: 4, fontSize: 11 }}>
              Tap to change dates
            </ThemedText>
          </View>
        </Pressable>

        {/* Site Filter */}
        <Pressable
          style={[
            styles.filterBtn,
            { backgroundColor: theme.backgroundSecondary },
          ]}
          onPress={() => setShowSiteFilter(!showSiteFilter)}
        >
          <View style={styles.filterLeft}>
            <Feather name="map-pin" size={14} color={Colors.light.primary} />
            <ThemedText type="small" style={{ marginLeft: 6, fontSize: 13 }}>
              {siteOptions.find((s) => s.id === selectedSite)?.name ||
                "All Sites"}
            </ThemedText>
          </View>
          <Feather
            name={showSiteFilter ? "chevron-up" : "chevron-down"}
            size={16}
            color={theme.textSecondary}
          />
        </Pressable>

        {/* Site Dropdown */}
        {showSiteFilter && (
          <View
            style={[
              styles.siteDropdown,
              { backgroundColor: theme.backgroundDefault },
              Shadows.md,
            ]}
          >
            {siteOptions.map((site) => (
              <Pressable
                key={site.id}
                style={[
                  styles.siteOption,
                  selectedSite === site.id && {
                    backgroundColor: Colors.light.primary + "15",
                  },
                ]}
                onPress={() => {
                  setSelectedSite(site.id);
                  setShowSiteFilter(false);
                }}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.siteOptionText,
                    selectedSite === site.id && {
                      color: Colors.light.primary,
                      fontWeight: "600",
                    },
                  ]}
                >
                  {site.name}
                </ThemedText>
                {selectedSite === site.id && (
                  <Feather
                    name="check"
                    size={16}
                    color={Colors.light.primary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Summary Card - Improved Salary Display */}
        <View style={[styles.summaryCard, { backgroundColor: theme.backgroundDefault }]}>
          <LinearGradient
            colors={totalSalary > 0 ? ["#10B981", "#059669"] : ["#EF4444", "#DC2626"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.salaryHighlight}
          >
            <Feather name="dollar-sign" size={20} color="#fff" />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <ThemedText type="small" style={styles.salaryLabel}>
                Total Salary
              </ThemedText>
              {totalSalary > 0 ? (
                <ThemedText type="h3" style={styles.salaryAmount}>
                  ₹{totalSalary.toLocaleString("en-IN")}
                </ThemedText>
              ) : (
                <View>
                  <ThemedText type="body" style={[styles.salaryAmount, { fontSize: 16 }]}>
                    Calculation Error
                  </ThemedText>
                  <ThemedText type="small" style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>
                    Please check data or filter by site
                  </ThemedText>
                </View>
              )}
            </View>
          </LinearGradient>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: "#DBEAFE" }]}>
                <Feather name="check-circle" size={16} color="#2563EB" />
              </View>
              <View style={{ marginLeft: 8 }}>
                <ThemedText type="small" style={styles.statLabel}>Present Days</ThemedText>
                <ThemedText type="body" style={styles.statValue}>{totalPresentDays}</ThemedText>
              </View>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: "#FCE7F3" }]}>
                <Feather name="users" size={16} color="#DB2777" />
              </View>
              <View style={{ marginLeft: 8 }}>
                <ThemedText type="small" style={styles.statLabel}>Employees</ThemedText>
                <ThemedText type="body" style={styles.statValue}>{uniqueEmployees}</ThemedText>
              </View>
            </View>
          </View>
        </View>

        {/* Export Buttons */}
        <View style={styles.exportButtonsRow}>
          <Pressable
            style={[styles.exportButton, { backgroundColor: "#10B981" }]}
            onPress={() => exportToExcel(false)}
          >
            <Feather name="download" size={16} color="#fff" />
            <ThemedText type="small" style={styles.exportButtonText}>
              Download Excel
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.exportButton, { backgroundColor: "#6366F1" }]}
            onPress={() => exportToExcel(true)}
          >
            <Feather name="share-2" size={16} color="#fff" />
            <ThemedText type="small" style={styles.exportButtonText}>
              Share
            </ThemedText>
          </Pressable>
        </View>

        {/* Attendance by Date */}
        <ThemedText type="body" style={styles.sectionTitle}>
          Daily Attendance ({dateWiseAttendance.length} days)
        </ThemedText>

        {dateWiseAttendance.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="calendar" size={40} color={theme.textSecondary} />
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, marginTop: Spacing.md, fontWeight: "600" }}
            >
              No attendance records found
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 4 }}
            >
              Try adjusting the filters or date range
            </ThemedText>
          </View>
        ) : (
          dateWiseAttendance.map((dateGroup) => (
            <View
              key={dateGroup.date}
              style={[
                styles.dateCard,
                { backgroundColor: theme.backgroundDefault },
                Shadows.sm,
              ]}
            >
              {/* Date Header */}
              <View style={styles.dateHeader}>
                <LinearGradient
                  colors={["#10B981", "#34D399"]}
                  style={styles.dateIcon}
                >
                  <Feather name="calendar" size={16} color="#fff" />
                </LinearGradient>
                <View style={styles.dateInfo}>
                  <ThemedText type="body" style={styles.dateText}>
                    {formatDateFull(dateGroup.date)}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, fontSize: 11 }}
                  >
                    {dateGroup.dayName}
                  </ThemedText>
                </View>
                <View style={styles.dateStats}>
                  <View style={styles.statBadge}>
                    <ThemedText type="small" style={styles.statBadgeText}>
                      {dateGroup.records.length} emp
                    </ThemedText>
                  </View>
                  <ThemedText type="body" style={styles.salaryText}>
                    ₹{dateGroup.totalSalary.toLocaleString("en-IN")}
                  </ThemedText>
                </View>
              </View>

              {/* Employee List */}
              <View style={styles.employeesList}>
                {dateGroup.records.map(({ employee, record }, idx) => (
                  <View
                    key={idx}
                    style={[styles.employeeRow, { borderColor: theme.border }]}
                  >
                    {record.photoUrl ? (
                      <Image
                        source={{ uri: record.photoUrl }}
                        style={styles.empImage}
                      />
                    ) : (
                      <LinearGradient
                        colors={["#6366F1", "#8B5CF6"]}
                        style={styles.empAvatar}
                      >
                        <ThemedText
                          type="small"
                          style={{
                            color: "#fff",
                            fontWeight: "600",
                            fontSize: 12,
                          }}
                        >
                          {employee.name.charAt(0).toUpperCase()}
                        </ThemedText>
                      </LinearGradient>
                    )}

                    <View style={styles.empInfo}>
                      <ThemedText type="small" style={{ fontWeight: "600", fontSize: 13 }}>
                        {employee.name}
                      </ThemedText>
                      <View style={styles.empMeta}>
                        <Feather
                          name="map-pin"
                          size={10}
                          color={Colors.light.primary}
                        />
                        <ThemedText
                          type="small"
                          style={{
                            color: theme.textSecondary,
                            marginLeft: 4,
                            fontSize: 10,
                          }}
                          numberOfLines={1}
                        >
                          {record.siteName || "N/A"}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={styles.timeInfo}>
                      {record.checkInTime && (
                        <View style={styles.timeChip}>
                          <Feather name="log-in" size={9} color="#10B981" />
                          <ThemedText type="small" style={styles.timeText}>
                            {record.checkInTime}
                          </ThemedText>
                        </View>
                      )}
                      {record.checkOutTime && (
                        <View style={styles.timeChip}>
                          <Feather name="log-out" size={9} color="#EF4444" />
                          <ThemedText type="small" style={styles.timeText}>
                            {record.checkOutTime}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        { backgroundColor: "#DEF7EC" },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          color: "#059669",
                          fontWeight: "600",
                          fontSize: 10,
                        }}
                      >
                        P
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="small"
                      style={{
                        color: "#10B981",
                        fontWeight: "700",
                        minWidth: 50,
                        textAlign: "right",
                        fontSize: 12,
                      }}
                    >
                      ₹{employee.salary}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Date Range Picker Modal */}
      <DateRangePicker />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
    ...Shadows.sm,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    padding: Spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 4,
  },
  suggestionsDropdown: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    gap: Spacing.sm,
  },
  suggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateRangeSelectorCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dateRangeColumn: {
    flex: 1,
  },
  dateRangeDivider: {
    paddingHorizontal: Spacing.md,
  },
  dateRangeLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateRangeValue: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 2,
  },
  dateRangeFull: {
    fontSize: 11,
    color: '#6B7280',
  },
  dateRangeFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xs,
  },
  filterLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  siteDropdown: {
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.md,
    overflow: "hidden",
  },
  siteOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  siteOptionText: {
    fontSize: 13,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.md,
  },
  salaryHighlight: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  salaryLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    marginBottom: 2,
  },
  salaryAmount: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
    fontWeight: "700",
    fontSize: 16,
  },
  emptyState: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  dateIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dateInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  dateText: {
    fontWeight: "700",
    marginBottom: 2,
    fontSize: 14,
  },
  dateStats: {
    alignItems: "flex-end",
  },
  statBadge: {
    backgroundColor: Colors.light.primary + "20",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginBottom: 4,
  },
  statBadgeText: {
    color: Colors.light.primary,
    fontWeight: "600",
    fontSize: 10,
  },
  salaryText: {
    fontWeight: "700",
    color: "#10B981",
    fontSize: 14,
  },
  employeesList: {
    gap: Spacing.xs,
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    gap: Spacing.sm,
  },
  empImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E5E7EB",
  },
  empAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  empInfo: {
    flex: 1,
  },
  empMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  timeInfo: {
    flexDirection: "row",
    gap: 4,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 2,
  },
  timeText: {
    fontSize: 9,
    fontWeight: "600",
  },
  statusBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  exportButtonsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },
  
  // Calendar Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  calendarContainer: {
    backgroundColor: "#fff",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  dateRangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  dateRangeItem: {
    alignItems: 'center',
  },
  dateLabel: {
    fontSize: 11,
    color: '#6B7280',
    marginBottom: 4,
  },
  dateValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  monthContainer: {
    padding: Spacing.lg,
  },
  monthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
    color: '#6B7280',
    fontSize: 12,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#0066FF',
  },
  dayCellInRange: {
    backgroundColor: '#E6F0FF',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
});