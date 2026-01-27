import React, { useState, useMemo, useEffect } from "react";

import { db } from "../firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc, // ✅ ADD
} from "firebase/firestore";

import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform } from 'react-native';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface Plan {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "in-progress" | "completed";
  assignedTo?: string;
  createdAt: string;
}

const priorityColors = {
  high: "#EF4444",
  medium: "#F59E0B",
  low: "#10B981",
};

const statusColors = {
  pending: "#6B7280",
  "in-progress": "#3B82F6",
  completed: "#10B981",
};

const initialPlans: Plan[] = [
  {
    id: "1",
    title: "Foundation Work - Block A",
    description:
      "Complete foundation laying for Block A including reinforcement",
    startDate: "2026-01-20",
    endDate: "2026-01-25",
    priority: "high",
    status: "pending",
    assignedTo: "Team Alpha",
    createdAt: "2026-01-16",
  },
  {
    id: "2",
    title: "Electrical Wiring - Floor 1",
    description: "Install electrical conduits and wiring for first floor",
    startDate: "2026-01-22",
    endDate: "2026-01-28",
    priority: "medium",
    status: "in-progress",
    assignedTo: "Electrical Team",
    createdAt: "2026-01-15",
  },
  {
    id: "3",
    title: "Plumbing Installation",
    description: "Complete plumbing work for bathrooms and kitchen",
    startDate: "2026-01-25",
    endDate: "2026-02-01",
    priority: "low",
    status: "pending",
    assignedTo: "Plumbing Team",
    createdAt: "2026-01-14",
  },
];

export default function LookAheadScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme, isDark } = useTheme();
  const { user } = useAuth();

const [plans, setPlans] = useState<Plan[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");
const [showStartPicker, setShowStartPicker] = useState(false);
const [showEndPicker, setShowEndPicker] = useState(false);
useEffect(() => {
  const q = query(
    collection(db, "plans"),
    orderBy("createdAt", "desc")
  );

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const list: Plan[] = snapshot.docs.map(doc => ({
      id: doc.id,
      ...(doc.data() as Omit<Plan, "id">),
    }));

    setPlans(list);
  });

  return () => unsubscribe();
}, []);

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
    const [assignedTo, setAssignedTo] = useState("");
    
    const [status, setStatus] = useState<
  "pending" | "in-progress" | "completed"
>("pending");


const formatISODate = (date: Date) =>
  date.toISOString().split('T')[0];

    
    
    
  const filteredPlans = useMemo(() => {
    if (filterStatus === "all") return plans;
    return plans.filter((p) => p.status === filterStatus);
  }, [plans, filterStatus]);

  const resetForm = () => {
  setTitle("");
  setDescription("");
  setStartDate("");
  setEndDate("");
  setPriority("medium");
  setStatus("pending"); // ✅ ADD
  setAssignedTo("");
  setEditingPlan(null);
};


  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

 const openEditModal = (plan: Plan) => {
  setEditingPlan(plan);
  setTitle(plan.title);
  setDescription(plan.description);
  setStartDate(plan.startDate);
  setEndDate(plan.endDate);
  setPriority(plan.priority);
  setAssignedTo(plan.assignedTo || "");
  setStatus(plan.status); // ✅ ADD
  setModalVisible(true);
};


 const handleSave = async () => {
  if (!title.trim()) {
    Alert.alert("Error", "Please enter a title");
    return;
  }

  try {
    if (editingPlan) {
      const ref = doc(db, "plans", editingPlan.id);

      await updateDoc(ref, {
        title,
        description,
        startDate,
        endDate,
        priority,
        status,        // ✅ UPDATED
        assignedTo,
      });

      Alert.alert("Updated", "Plan updated successfully");
    } else {
      await addDoc(collection(db, "plans"), {
        title,
        description,
        startDate,
        endDate,
        priority,
        status: "pending",
        assignedTo,
        createdAt: serverTimestamp(),
        createdBy: user?.id || null,
      });

      Alert.alert("Success", "Plan added successfully");
    }

    setModalVisible(false);
    resetForm();
  } catch (error) {
    console.error("Firestore error:", error);
    Alert.alert("Error", "Failed to save plan");
  }
};



const handleDelete = async (plan: Plan) => {
  const confirmed = window.confirm(`Are you sure you want to delete "${plan.title}"?`);
  
  if (!confirmed) return;
  
  try {
    const docRef = doc(db, "plans", plan.id);
    await deleteDoc(docRef);
    console.log("Plan deleted successfully");
  } catch (error) {
    console.error("Delete error:", error);
    alert("Failed to delete plan. Please try again.");
  }
};


  const handleShare = (plan: Plan) => {
  const shareText = `
📋 Plan: ${plan.title}
📝 ${plan.description}
📅 ${formatDate(plan.startDate)} - ${formatDate(plan.endDate)}
⚡ Priority: ${plan.priority.toUpperCase()}
📊 Status: ${plan.status.replace("-", " ").toUpperCase()}
${plan.assignedTo ? `👥 Assigned to: ${plan.assignedTo}` : ''}
  `.trim();

  if (navigator.share) {
    // Use native Web Share API if available
    navigator.share({
      title: plan.title,
      text: shareText,
    }).catch(err => console.log('Share cancelled'));
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard.writeText(shareText).then(() => {
      alert('Plan details copied to clipboard!');
    }).catch(() => {
      // Final fallback: show share options
      const choice = prompt(`Share "${plan.title}" via:\n1. WhatsApp\n2. Email\n\nEnter 1 or 2:`);
      
      if (choice === '1') {
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
        window.open(whatsappUrl, '_blank');
      } else if (choice === '2') {
        const mailtoUrl = `mailto:?subject=${encodeURIComponent(plan.title)}&body=${encodeURIComponent(shareText)}`;
        window.location.href = mailtoUrl;
      }
    });
  }
};

  const handleStatusChange = (plan: Plan) => {
    const statuses: ("pending" | "in-progress" | "completed")[] = [
      "pending",
      "in-progress",
      "completed",
    ];
    const currentIndex = statuses.indexOf(plan.status);
    const nextStatus = statuses[(currentIndex + 1) % statuses.length];

    setPlans((prev) =>
      prev.map((p) => (p.id === plan.id ? { ...p, status: nextStatus } : p)),
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const renderPlanCard = (plan: Plan, index: number) => (
    <Animated.View
      key={plan.id}
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.planCard, isDark && styles.planCardDark]}
    >
      <View style={styles.planHeader}>
        <View
          style={[
            styles.priorityBadge,
            { backgroundColor: priorityColors[plan.priority] + "20" },
          ]}
        >
          <View
            style={[
              styles.priorityDot,
              { backgroundColor: priorityColors[plan.priority] },
            ]}
          />
          <ThemedText
            type="small"
            style={[
              styles.priorityText,
              { color: priorityColors[plan.priority] },
            ]}
          >
            {plan.priority.toUpperCase()}
          </ThemedText>
        </View>
        <Pressable
          style={[
            styles.statusBadge,
            { backgroundColor: statusColors[plan.status] + "20" },
          ]}
          onPress={() => handleStatusChange(plan)}
        >
          <ThemedText
            type="small"
            style={[styles.statusText, { color: statusColors[plan.status] }]}
          >
            {plan.status.replace("-", " ").toUpperCase()}
          </ThemedText>
        </Pressable>
      </View>

      <ThemedText
        type="body"
        style={[styles.planTitle, isDark && { color: "#F9FAFB" }]}
      >
        {plan.title}
      </ThemedText>

      <ThemedText
        type="small"
        style={[styles.planDescription, isDark && { color: "#9CA3AF" }]}
        numberOfLines={2}
      >
        {plan.description}
      </ThemedText>

      <View style={styles.planMeta}>
        <View style={styles.metaItem}>
          <Feather name="calendar" size={12} color="#6B7280" />
          <ThemedText type="small" style={styles.metaText}>
            {formatDate(plan.startDate)} - {formatDate(plan.endDate)}
          </ThemedText>
        </View>
        {plan.assignedTo && (
          <View style={styles.metaItem}>
            <Feather name="users" size={12} color="#6B7280" />
            <ThemedText type="small" style={styles.metaText}>
              {plan.assignedTo}
            </ThemedText>
          </View>
        )}
      </View>

      <View style={styles.planActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => openEditModal(plan)}
        >
          <Feather name="edit-2" size={16} color="#3B82F6" />
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleShare(plan)}
        >
          <Feather name="share-2" size={16} color="#8B5CF6" />
        </Pressable>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleDelete(plan)}
        >
          <Feather name="trash-2" size={16} color="#EF4444" />
        </Pressable>
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient
      colors={isDark ? ["#111827", "#1F2937"] : ["#F8FAFC", "#E2E8F0"]}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight,
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Stats */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.statsContainer}
        >
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <ThemedText
              type="h4"
              style={[styles.statNumber, { color: "#3B82F6" }]}
            >
              {plans.length}
            </ThemedText>
            <ThemedText type="small" style={styles.statLabel}>
              Total
            </ThemedText>
          </View>
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <ThemedText
              type="h4"
              style={[styles.statNumber, { color: "#F59E0B" }]}
            >
              {plans.filter((p) => p.status === "in-progress").length}
            </ThemedText>
            <ThemedText type="small" style={styles.statLabel}>
              Active
            </ThemedText>
          </View>
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <ThemedText
              type="h4"
              style={[styles.statNumber, { color: "#10B981" }]}
            >
              {plans.filter((p) => p.status === "completed").length}
            </ThemedText>
            <ThemedText type="small" style={styles.statLabel}>
              Done
            </ThemedText>
          </View>
        </Animated.View>

        {/* Filter Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          {["all", "pending", "in-progress", "completed"].map((status) => (
            <Pressable
              key={status}
              style={[
                styles.filterTab,
                filterStatus === status && styles.filterTabActive,
                isDark && styles.filterTabDark,
                filterStatus === status && isDark && styles.filterTabActiveDark,
              ]}
              onPress={() => setFilterStatus(status)}
            >
              <ThemedText
                type="small"
                style={[
                  styles.filterText,
                  filterStatus === status && styles.filterTextActive,
                ]}
              >
                {status === "all"
                  ? "All"
                  : status.replace("-", " ").charAt(0).toUpperCase() +
                    status.replace("-", " ").slice(1)}
              </ThemedText>
            </Pressable>
          ))}
        </ScrollView>

        {/* Plans List */}
        <View style={styles.plansList}>
          {filteredPlans.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="calendar" size={48} color="#9CA3AF" />
              <ThemedText type="body" style={styles.emptyText}>
                No plans found
              </ThemedText>
              <ThemedText type="small" style={styles.emptySubtext}>
                Tap + to add a new plan
              </ThemedText>
            </View>
          ) : (
            filteredPlans.map((plan, index) => renderPlanCard(plan, index))
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <Pressable style={styles.fab} onPress={openAddModal}>
        <LinearGradient
          colors={["#3B82F6", "#1E40AF"]}
          style={styles.fabGradient}
        >
          <Feather name="plus" size={24} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[styles.modalContent, isDark && styles.modalContentDark]}
          >
            <View style={styles.modalHeader}>
              <ThemedText
                type="h4"
                style={[styles.modalTitle, isDark && { color: "#F9FAFB" }]}
              >
                {editingPlan ? "Edit Plan" : "Add New Plan"}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalForm}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Title *
                </ThemedText>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Enter plan title"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Description
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    styles.textArea,
                    isDark && styles.inputDark,
                  ]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Enter description"
                  placeholderTextColor="#9CA3AF"
                  multiline
                  numberOfLines={3}
                />
              </View>
<View style={styles.formGroup}>
  <ThemedText type="small" style={styles.formLabel}>
    Start Date
  </ThemedText>

  {Platform.OS === "web" ? (
    <TextInput
      style={styles.input}
      value={startDate}
      placeholder="YYYY-MM-DD"
      onChangeText={setStartDate}
      accessibilityRole="textbox"
      {...({ type: "date" } as any)}
    />
  ) : (
    <>
      <Pressable
        style={styles.input}
        onPress={() => setShowStartPicker(true)}
      >
        <ThemedText>
          {startDate || "Select start date"}
        </ThemedText>
      </Pressable>

      {showStartPicker && (
        <DateTimePicker
          value={startDate ? new Date(startDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => {
            setShowStartPicker(false);
            if (date) setStartDate(formatISODate(date));
          }}
        />
      )}
    </>
  )}
</View>


<View style={styles.formGroup}>
  <ThemedText type="small" style={styles.formLabel}>
    End Date
  </ThemedText>

  {Platform.OS === "web" ? (
    <TextInput
      style={styles.input}
      value={endDate}
      placeholder="YYYY-MM-DD"
      onChangeText={setEndDate}
      accessibilityRole="textbox"
      {...({ type: "date" } as any)}
    />
  ) : (
    <>
      <Pressable
        style={styles.input}
        onPress={() => setShowEndPicker(true)}
      >
        <ThemedText>
          {endDate || "Select end date"}
        </ThemedText>
      </Pressable>

      {showEndPicker && (
        <DateTimePicker
          value={endDate ? new Date(endDate) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(_, date) => {
            setShowEndPicker(false);
            if (date) setEndDate(formatISODate(date));
          }}
        />
      )}
    </>
  )}
</View>


              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Priority
                </ThemedText>
                <View style={styles.prioritySelector}>
                  {(["low", "medium", "high"] as const).map((p) => (
                    <Pressable
                      key={p}
                      style={[
                        styles.priorityOption,
                        priority === p && {
                          backgroundColor: priorityColors[p] + "20",
                          borderColor: priorityColors[p],
                        },
                      ]}
                      onPress={() => setPriority(p)}
                    >
                      <View
                        style={[
                          styles.priorityDot,
                          { backgroundColor: priorityColors[p] },
                        ]}
                      />
                      <ThemedText
                        type="small"
                        style={{ color: priorityColors[p] }}
                      >
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>
<View style={styles.formGroup}>
  <ThemedText type="small" style={styles.formLabel}>
    Status
  </ThemedText>

  <View style={styles.prioritySelector}>
    {(["pending", "in-progress", "completed"] as const).map((s) => (
      <Pressable
        key={s}
        style={[
          styles.priorityOption,
          status === s && {
            backgroundColor: statusColors[s] + "20",
            borderColor: statusColors[s],
          },
        ]}
        onPress={() => setStatus(s)}
      >
        <ThemedText style={{ color: statusColors[s] }}>
          {s.replace("-", " ").toUpperCase()}
        </ThemedText>
      </Pressable>
    ))}
  </View>
</View>

              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Assigned To
                </ThemedText>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={assignedTo}
                  onChangeText={setAssignedTo}
                  placeholder="Team or person name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText type="body" style={styles.cancelButtonText}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <ThemedText type="body" style={styles.saveButtonText}>
                  {editingPlan ? "Update" : "Add Plan"}
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  // Stats
  statsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    alignItems: "center",
  },
  statCardDark: {
    backgroundColor: "#1F2937",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  // Filter
  filterContainer: {
    marginBottom: Spacing.md,
  },
  filterTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "#fff",
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterTabDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  filterTabActive: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterTabActiveDark: {
    backgroundColor: "#3B82F6",
    borderColor: "#3B82F6",
  },
  filterText: {
    fontSize: 12,
    color: "#6B7280",
  },
  filterTextActive: {
    color: "#fff",
    fontWeight: "600",
  },
  // Plans List
  plansList: {
    gap: Spacing.sm,
  },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  planCardDark: {
    backgroundColor: "#1F2937",
  },
  planHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  priorityBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    gap: 4,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: "700",
  },
  statusBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: 9,
    fontWeight: "600",
  },
  planTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginBottom: 4,
  },
  planDescription: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
    marginBottom: Spacing.xs,
  },
  planMeta: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.xs,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#6B7280",
  },
  planActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.sm,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  actionButton: {
    padding: Spacing.xs,
  },
  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyText: {
    fontSize: 16,
    color: "#6B7280",
    marginTop: Spacing.md,
  },
  emptySubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: Spacing.xs,
  },
  // FAB
  fab: {
    position: "absolute",
    bottom: 24,
    right: 16,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "85%",
  },
  modalContentDark: {
    backgroundColor: "#111827",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalForm: {
    padding: Spacing.md,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formRow: {
    flexDirection: "row",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#374151",
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: "#F3F4F6",
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    fontSize: 14,
    color: "#1F2937",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  inputDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
    color: "#F9FAFB",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  prioritySelector: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  priorityOption: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: Spacing.xs,
  },
  modalActions: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  modalButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  saveButton: {
    backgroundColor: "#3B82F6",
  },
  saveButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});
