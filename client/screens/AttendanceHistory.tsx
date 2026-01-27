import React, { useState, useMemo } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
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
    return d;
  });
  const [toDate, setToDate] = useState(new Date());
  const [showFromCalendar, setShowFromCalendar] = useState(false);
  const [showToCalendar, setShowToCalendar] = useState(false);

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
    let records = attendance.filter((a) => a.status === "present");

    // Filter by date range
    records = records.filter((a) => {
      const recordDate = new Date(a.date);
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      return recordDate >= from && recordDate <= to;
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
    return dateWiseAttendance.reduce((sum, d) => sum + d.totalSalary, 0);
  }, [dateWiseAttendance]);

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

  // Calendar Component
  const CalendarPicker = ({
    visible,
    onClose,
    selectedDate,
    onSelect,
    title,
  }: {
    visible: boolean;
    onClose: () => void;
    selectedDate: Date;
    onSelect: (date: Date) => void;
    title: string;
  }) => {
    const [viewDate, setViewDate] = useState(selectedDate);
    const month = viewDate.getMonth();
    const year = viewDate.getFullYear();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const days: (number | null)[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }

    const isSelected = (day: number) => {
      return (
        selectedDate.getDate() === day &&
        selectedDate.getMonth() === month &&
        selectedDate.getFullYear() === year
      );
    };

    const handleSelect = (day: number) => {
      const newDate = new Date(year, month, day);
      onSelect(newDate);
      onClose();
    };

    return (
      <Modal visible={visible} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <View
            style={[
              styles.calendarModal,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <ThemedText type="h4" style={styles.calendarTitle}>
              {title}
            </ThemedText>

            <View style={styles.calendarNav}>
              <Pressable
                onPress={() => setViewDate(new Date(year, month - 1, 1))}
              >
                <Feather name="chevron-left" size={24} color={theme.text} />
              </Pressable>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {viewDate.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </ThemedText>
              <Pressable
                onPress={() => setViewDate(new Date(year, month + 1, 1))}
              >
                <Feather name="chevron-right" size={24} color={theme.text} />
              </Pressable>
            </View>

            <View style={styles.weekDays}>
              {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                <ThemedText key={i} type="small" style={styles.weekDayText}>
                  {d}
                </ThemedText>
              ))}
            </View>

            <View style={styles.daysGrid}>
              {days.map((day, index) => (
                <Pressable
                  key={index}
                  style={[
                    styles.dayCell,
                    day !== null && isSelected(day)
                      ? styles.dayCellSelected
                      : undefined,
                  ]}
                  onPress={() => day !== null && handleSelect(day)}
                  disabled={day === null}
                >
                  {day !== null && (
                    <ThemedText
                      type="small"
                      style={[
                        styles.dayText,
                        isSelected(day) ? styles.dayTextSelected : undefined,
                      ]}
                    >
                      {day}
                    </ThemedText>
                  )}
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.calendarCloseBtn} onPress={onClose}>
              <ThemedText type="body" style={{ color: Colors.light.primary }}>
                Close
              </ThemedText>
            </Pressable>
          </View>
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
            <Feather name="search" size={14} color={theme.textSecondary} />
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
                <Feather name="x" size={14} color={theme.textSecondary} />
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
                      style={{ color: "#fff", fontWeight: "600", fontSize: 10 }}
                    >
                      {emp.name.charAt(0).toUpperCase()}
                    </ThemedText>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <ThemedText type="small" style={{ fontWeight: "500" }}>
                      {emp.name}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, fontSize: 10 }}
                    >
                      {emp.role} • ₹{emp.salary}/day
                    </ThemedText>
                  </View>
                  <Feather
                    name="arrow-up-left"
                    size={12}
                    color={theme.textSecondary}
                  />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Date Range Selector */}
        <View style={styles.dateRangeContainer}>
          <Pressable
            style={[
              styles.datePickerBtn,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            onPress={() => setShowFromCalendar(true)}
          >
            <Feather name="calendar" size={12} color={Colors.light.primary} />
            <View>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, fontSize: 9 }}
              >
                From
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {formatDate(fromDate)}
              </ThemedText>
            </View>
          </Pressable>

          <Feather name="arrow-right" size={14} color={theme.textSecondary} />

          <Pressable
            style={[
              styles.datePickerBtn,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            onPress={() => setShowToCalendar(true)}
          >
            <Feather name="calendar" size={12} color={Colors.light.primary} />
            <View>
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, fontSize: 9 }}
              >
                To
              </ThemedText>
              <ThemedText type="small" style={{ fontWeight: "600" }}>
                {formatDate(toDate)}
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Site Filter */}
        <Pressable
          style={[
            styles.filterBtn,
            { backgroundColor: theme.backgroundSecondary },
          ]}
          onPress={() => setShowSiteFilter(!showSiteFilter)}
        >
          <View style={styles.filterLeft}>
            <Feather name="map-pin" size={12} color={Colors.light.primary} />
            <ThemedText type="small" style={{ marginLeft: 4 }}>
              {siteOptions.find((s) => s.id === selectedSite)?.name ||
                "All Sites"}
            </ThemedText>
          </View>
          <Feather
            name={showSiteFilter ? "chevron-up" : "chevron-down"}
            size={14}
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
                    size={14}
                    color={Colors.light.primary}
                  />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {/* Summary Card */}
        <LinearGradient
          colors={["#6366F1", "#8B5CF6"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.summaryCard}
        >
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={styles.summaryLabel}>
                Present
              </ThemedText>
              <ThemedText type="body" style={styles.summaryValue}>
                {totalPresentDays}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={styles.summaryLabel}>
                Employees
              </ThemedText>
              <ThemedText type="body" style={styles.summaryValue}>
                {uniqueEmployees}
              </ThemedText>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <ThemedText type="small" style={styles.summaryLabel}>
                Total Salary
              </ThemedText>
              <ThemedText type="body" style={styles.summaryValue}>
                ₹{totalSalary.toLocaleString("en-IN")}
              </ThemedText>
            </View>
          </View>
        </LinearGradient>

        {/* Export Buttons */}
        <View style={styles.exportButtonsRow}>
          <Pressable
            style={[styles.exportButton, { backgroundColor: "#10B981" }]}
            onPress={() => exportToExcel(false)}
          >
            <Feather name="download" size={14} color="#fff" />
            <ThemedText type="small" style={styles.exportButtonText}>
              Download
            </ThemedText>
          </Pressable>
          <Pressable
            style={[styles.exportButton, { backgroundColor: "#6366F1" }]}
            onPress={() => exportToExcel(true)}
          >
            <Feather name="share-2" size={14} color="#fff" />
            <ThemedText type="small" style={styles.exportButtonText}>
              Share
            </ThemedText>
          </Pressable>
        </View>

        {/* Attendance by Date */}
        <ThemedText type="small" style={styles.sectionTitle}>
          Attendance by Date ({dateWiseAttendance.length} days)
        </ThemedText>

        {dateWiseAttendance.length === 0 ? (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: theme.backgroundSecondary },
            ]}
          >
            <Feather name="calendar" size={32} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: Spacing.sm }}
            >
              No attendance records found
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2, fontSize: 10 }}
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
                  <Feather name="calendar" size={14} color="#fff" />
                </LinearGradient>
                <View style={styles.dateInfo}>
                  <ThemedText type="small" style={styles.dateText}>
                    {formatDateFull(dateGroup.date)}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary, fontSize: 10 }}
                  >
                    {dateGroup.dayName}
                  </ThemedText>
                </View>
                <View style={styles.dateStats}>
                  <View style={styles.statBadge}>
                    <ThemedText type="small" style={styles.statBadgeText}>
                      {dateGroup.records.length} present
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={styles.salaryText}>
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
                    <View style={styles.empAvatar}>
                      <ThemedText
                        type="small"
                        style={{
                          color: "#fff",
                          fontWeight: "600",
                          fontSize: 10,
                        }}
                      >
                        {employee.name.charAt(0).toUpperCase()}
                      </ThemedText>
                    </View>
                    <View style={styles.empInfo}>
                      <ThemedText type="small" style={{ fontWeight: "500" }}>
                        {employee.name}
                      </ThemedText>
                      <View style={styles.empMeta}>
                        <Feather
                          name="map-pin"
                          size={8}
                          color={Colors.light.primary}
                        />
                        <ThemedText
                          type="small"
                          style={{
                            color: theme.textSecondary,
                            marginLeft: 2,
                            fontSize: 9,
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
                          <Feather name="log-in" size={8} color="#10B981" />
                          <ThemedText type="small" style={styles.timeText}>
                            {record.checkInTime}
                          </ThemedText>
                        </View>
                      )}
                      {record.checkOutTime && (
                        <View style={styles.timeChip}>
                          <Feather name="log-out" size={8} color="#EF4444" />
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
                          fontSize: 9,
                        }}
                      >
                        P
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="small"
                      style={{
                        color: "#10B981",
                        fontWeight: "600",
                        minWidth: 40,
                        textAlign: "right",
                        fontSize: 10,
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

      {/* Calendar Modals */}
      <CalendarPicker
        visible={showFromCalendar}
        onClose={() => setShowFromCalendar(false)}
        selectedDate={fromDate}
        onSelect={setFromDate}
        title="Select From Date"
      />
      <CalendarPicker
        visible={showToCalendar}
        onClose={() => setShowToCalendar(false)}
        selectedDate={toDate}
        onSelect={setToDate}
        title="Select To Date"
      />
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
    padding: Spacing.sm,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    paddingVertical: 2,
  },
  suggestionsDropdown: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
    gap: Spacing.xs,
  },
  suggestionAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dateRangeContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
    marginBottom: Spacing.sm,
    gap: 4,
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: 4,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    marginBottom: 4,
  },
  filterLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  siteDropdown: {
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  siteOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  siteOptionText: {
    fontSize: 12,
  },
  summaryCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  summaryItem: {
    alignItems: "center",
  },
  summaryLabel: {
    color: "rgba(255,255,255,0.8)",
    marginBottom: 2,
    fontSize: 10,
  },
  summaryValue: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
    fontWeight: "600",
    fontSize: 14,
  },
  emptyState: {
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  dateCard: {
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  dateIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  dateInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  dateText: {
    fontWeight: "600",
    marginBottom: 1,
    fontSize: 13,
  },
  dateStats: {
    alignItems: "flex-end",
  },
  statBadge: {
    backgroundColor: Colors.light.primary + "20",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: BorderRadius.full,
    marginBottom: 2,
  },
  statBadgeText: {
    color: Colors.light.primary,
    fontWeight: "600",
    fontSize: 9,
  },
  salaryText: {
    fontWeight: "700",
    color: "#10B981",
    fontSize: 12,
  },
  employeesList: {
    gap: 2,
  },
  employeeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    gap: 4,
  },
  empAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6366F1",
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
    gap: 2,
  },
  timeChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.04)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
    gap: 1,
  },
  timeText: {
    fontSize: 8,
    fontWeight: "500",
  },
  statusBadge: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.md,
  },
  calendarModal: {
    width: "100%",
    maxWidth: 300,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
  },
  calendarTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
    fontSize: 14,
  },
  calendarNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  weekDays: {
    flexDirection: "row",
    marginBottom: 4,
  },
  weekDayText: {
    flex: 1,
    textAlign: "center",
    fontWeight: "600",
    color: "#6B7280",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  dayCell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCellSelected: {
    backgroundColor: Colors.light.primary,
    borderRadius: 14,
  },
  dayText: {
    fontSize: 12,
    fontWeight: "500",
  },
  dayTextSelected: {
    color: "#fff",
  },
  calendarCloseBtn: {
    marginTop: Spacing.sm,
    alignItems: "center",
    padding: 4,
  },
  exportButtonsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  exportButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: BorderRadius.md,
  },
  exportButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
});

