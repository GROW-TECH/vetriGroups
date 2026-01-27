import React, { useState, useMemo, useEffect } from "react";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";

import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Modal,
  TextInput,
  Share,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useData } from "@/context/DataContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";

interface UserAccount {
  id: string;
  username: string;
  password: string;
  name: string;
  role: "admin" | "engineer" | "client" | "vendor";
  vendorId?: string;
  clientId?: string;
  createdAt: string;
}

const roleConfig = {
  admin: { icon: "award", color: Colors.light.roleAdmin, label: "Admin" },
  engineer: {
    icon: "compass",
    color: Colors.light.roleEngineer,
    label: "Engineer",
  },
  client: { icon: "home", color: Colors.light.roleClient, label: "Client" },
  vendor: { icon: "truck", color: Colors.light.roleVendor, label: "Vendor" },
};

// Base accounts (admin, engineer, vendor - no generic client anymore)
const baseAccounts: UserAccount[] = [
  {
    id: "1",
    username: "admin",
    password: "admin123",
    name: "Administrator",
    role: "admin",
    createdAt: "2026-01-01",
  },
  {
    id: "2",
    username: "engineer",
    password: "engineer123",
    name: "Site Engineer",
    role: "engineer",
    createdAt: "2026-01-01",
  },
  {
    id: "4",
    username: "vendor",
    password: "vendor123",
    name: "Vendor User",
    role: "vendor",
    vendorId: "v1",
    createdAt: "2026-01-01",
  },
  {
    id: "5",
    username: "kumar",
    password: "kumar@123",
    name: "Kumaresan",
    role: "admin",
    createdAt: "2026-01-05",
  },
  {
    id: "6",
    username: "bala",
    password: "bala@123",
    name: "Balamurugan",
    role: "engineer",
    createdAt: "2026-01-08",
  },
  {
    id: "8",
    username: "muthu",
    password: "muthu@123",
    name: "Muthu Steel",
    role: "vendor",
    vendorId: "v2",
    createdAt: "2026-01-12",
  },
];

export default function AccountManagementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { isDark } = useTheme();
  const { clients } = useData();

  // Combine base accounts with client accounts from DataContext
  const allAccounts = useMemo(() => {
    const clientAccounts: UserAccount[] = clients
      .filter((c) => c.username && c.password)
      .map((c, index) => ({
        id: `client-${c.id}`,
        username: c.username!,
        password: c.password!,
        name: c.name,
        role: "client" as const,
        clientId: c.id,
        createdAt: "2026-01-14",
      }));
    return [...baseAccounts, ...clientAccounts];
  }, [clients]);

  const [accounts, setAccounts] = useState<UserAccount[]>(allAccounts);
  const [firestoreAccounts, setFirestoreAccounts] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<UserAccount | null>(null);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [filterRole, setFilterRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Form state
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formName, setFormName] = useState("");
  const [formRole, setFormRole] = useState<"admin">("admin");

  // Load accounts from Firestore on mount
  useEffect(() => {
    const loadFirestoreAccounts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, "accounts"));
        const loadedAccounts: UserAccount[] = querySnapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            username: data.username || "",
            password: data.password || "",
            name: data.name || "",
            role: data.role || "admin",
            createdAt: data.createdAt?.toDate?.()?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0],
          };
        });
        setFirestoreAccounts(loadedAccounts);
      } catch (error) {
        console.error("Error loading accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadFirestoreAccounts();
  }, []);

  // Combine base accounts, client accounts, and Firestore accounts for display
  const displayAccounts = useMemo(() => {
    const clientAccounts: UserAccount[] = clients
      .filter((c) => c.username && c.password)
      .map((c, index) => ({
        id: `client-${c.id}`,
        username: c.username!,
        password: c.password!,
        name: c.name,
        role: "client" as const,
        clientId: c.id,
        createdAt: "2026-01-14",
      }));
    return [...baseAccounts, ...clientAccounts, ...firestoreAccounts];
  }, [clients, firestoreAccounts]);

  // Filter accounts by role and search query
  const filteredAccounts = displayAccounts.filter((a) => {
    const matchesRole = filterRole === "all" || a.role === filterRole;
    const matchesSearch =
      !searchQuery.trim() ||
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const resetForm = () => {
    setFormUsername("");
    setFormPassword("");
    setFormName("");
    setFormRole("admin");
    setEditingAccount(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (account: UserAccount) => {
    setEditingAccount(account);
    setFormUsername(account.username);
    setFormPassword(account.password);
    setFormName(account.name);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!formUsername.trim() || !formPassword.trim() || !formName.trim()) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }

    // Check for duplicate username in displayAccounts
    const duplicate = displayAccounts.find(
      (a) =>
        a.username.toLowerCase() === formUsername.toLowerCase() &&
        a.id !== editingAccount?.id,
    );
    if (duplicate) {
      Alert.alert("Error", "Username already exists");
      return;
    }

    try {
      if (editingAccount) {
        // Edit existing account (only updates local state for now)
        setAccounts((prev) =>
          prev.map((a) =>
            a.id === editingAccount.id
              ? {
                  ...a,
                  username: formUsername,
                  password: formPassword,
                  name: formName,
                  role: "admin",
                }
              : a,
          ),
        );
        Alert.alert("Success", "Account updated successfully");
      } else {
        // Create new account in Firestore
        const docRef = await addDoc(collection(db, "accounts"), {
          name: formName,
          username: formUsername,
          password: formPassword, // ⚠️ Hash passwords in production!
          role: "admin",
          createdAt: serverTimestamp(),
        });

        // Add to Firestore accounts state
        const newAccount: UserAccount = {
          id: docRef.id,
          username: formUsername,
          password: formPassword,
          name: formName,
          role: "admin",
          createdAt: new Date().toISOString().split('T')[0],
        };

        setFirestoreAccounts((prev) => [...prev, newAccount]);
        Alert.alert("Success", "Admin account created and stored in Firestore");
      }

      setModalVisible(false);
      resetForm();
    } catch (error) {
      console.error("Firestore error:", error);
      Alert.alert("Error", "Failed to save account");
    }
  };

  const handleDelete = (account: UserAccount) => {
    if (account.username === "admin") {
      Alert.alert("Cannot Delete", "The main admin account cannot be deleted.");
      return;
    }

    Alert.alert(
      "Delete Account",
      `Are you sure you want to delete "${account.name}" (${account.username})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setAccounts((prev) => prev.filter((a) => a.id !== account.id));
            Alert.alert("Deleted", "Account deleted successfully");
          },
        },
      ],
    );
  };

  const handleShare = async (account: UserAccount) => {
    try {
      const message = `Account Details:\n\nName: ${account.name}\nUsername: ${account.username}\nPassword: ${account.password}\nRole: ${roleConfig[account.role].label}`;
      await Share.share({
        message,
        title: "Account Credentials",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share account details");
    }
  };

  const handleShareAll = async () => {
    try {
      const message = displayAccounts
        .map(
          (a) =>
            `${a.name}\nUsername: ${a.username}\nPassword: ${a.password}\nRole: ${roleConfig[a.role].label}`,
        )
        .join("\n\n---\n\n");

      await Share.share({
        message: `All Account Credentials:\n\n${message}`,
        title: "All Account Credentials",
      });
    } catch (error) {
      Alert.alert("Error", "Failed to share accounts");
    }
  };

  const togglePasswordVisibility = (id: string) => {
    setShowPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const renderAccountCard = (account: UserAccount, index: number) => {
    const config = roleConfig[account.role];
    const isPasswordVisible = showPasswords[account.id];

    return (
      <Animated.View
        key={account.id}
        entering={FadeInDown.delay(index * 50).springify()}
        style={[styles.accountCard, isDark && styles.accountCardDark]}
      >
        <View style={styles.accountHeader}>
          <View
            style={[styles.roleIcon, { backgroundColor: config.color + "20" }]}
          >
            <Feather name={config.icon as any} size={20} color={config.color} />
          </View>
          <View style={styles.accountInfo}>
            <ThemedText
              type="body"
              style={[styles.accountName, isDark && { color: "#F9FAFB" }]}
            >
              {account.name}
            </ThemedText>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: config.color + "15" },
              ]}
            >
              <ThemedText
                type="small"
                style={[styles.roleText, { color: config.color }]}
              >
                {config.label}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.credentialsRow}>
          <View style={styles.credentialItem}>
            <Feather name="user" size={14} color="#6B7280" />
            <ThemedText type="small" style={styles.credentialLabel}>
              Username
            </ThemedText>
            <ThemedText
              type="body"
              style={[styles.credentialValue, isDark && { color: "#F9FAFB" }]}
            >
              {account.username}
            </ThemedText>
          </View>
          <View style={styles.credentialItem}>
            <Feather name="lock" size={14} color="#6B7280" />
            <ThemedText type="small" style={styles.credentialLabel}>
              Password
            </ThemedText>
            <Pressable
              onPress={() => togglePasswordVisibility(account.id)}
              style={styles.passwordRow}
            >
              <ThemedText
                type="body"
                style={[styles.credentialValue, isDark && { color: "#F9FAFB" }]}
              >
                {isPasswordVisible ? account.password : "••••••••"}
              </ThemedText>
              <Feather
                name={isPasswordVisible ? "eye-off" : "eye"}
                size={14}
                color="#9CA3AF"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.accountActions}>
          <Pressable
            style={styles.actionBtn}
            onPress={() => openEditModal(account)}
          >
            <Feather name="edit-2" size={16} color="#3B82F6" />
            <ThemedText
              type="small"
              style={[styles.actionText, { color: "#3B82F6" }]}
            >
              Edit
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => handleShare(account)}
          >
            <Feather name="share-2" size={16} color="#8B5CF6" />
            <ThemedText
              type="small"
              style={[styles.actionText, { color: "#8B5CF6" }]}
            >
              Share
            </ThemedText>
          </Pressable>
          <Pressable
            style={styles.actionBtn}
            onPress={() => handleDelete(account)}
          >
            <Feather name="trash-2" size={16} color="#EF4444" />
            <ThemedText
              type="small"
              style={[styles.actionText, { color: "#EF4444" }]}
            >
              Delete
            </ThemedText>
          </Pressable>
        </View>
      </Animated.View>
    );
  };

  return (
    <LinearGradient
      colors={isDark ? ["#111827", "#1F2937"] : ["#F8FAFC", "#E2E8F0"]}
      style={styles.container}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Feather
            name="arrow-left"
            size={24}
            color={isDark ? "#F9FAFB" : "#1F2937"}
          />
        </Pressable>
        <ThemedText
          type="h3"
          style={[styles.headerTitle, isDark && { color: "#F9FAFB" }]}
        >
          Account Management
        </ThemedText>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.statsRow}
        >
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <ThemedText
              type="h4"
              style={[styles.statNumber, { color: "#3B82F6" }]}
            >
              {displayAccounts.length}
            </ThemedText>
            <ThemedText type="small" style={styles.statLabel}>
              Total
            </ThemedText>
          </View>
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <ThemedText
              type="h4"
              style={[styles.statNumber, { color: Colors.light.roleAdmin }]}
            >
              {displayAccounts.filter((a) => a.role === "admin").length}
            </ThemedText>
            <ThemedText type="small" style={styles.statLabel}>
              Admins
            </ThemedText>
          </View>
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <ThemedText
              type="h4"
              style={[styles.statNumber, { color: Colors.light.roleEngineer }]}
            >
              {displayAccounts.filter((a) => a.role === "engineer").length}
            </ThemedText>
            <ThemedText type="small" style={styles.statLabel}>
              Engineers
            </ThemedText>
          </View>
          <View style={[styles.statCard, isDark && styles.statCardDark]}>
            <ThemedText
              type="h4"
              style={[styles.statNumber, { color: Colors.light.roleVendor }]}
            >
              {
                displayAccounts.filter(
                  (a) => a.role === "client" || a.role === "vendor",
                ).length
              }
            </ThemedText>
            <ThemedText type="small" style={styles.statLabel}>
              Others
            </ThemedText>
          </View>
        </Animated.View>

        {/* Search Bar */}
        <Animated.View
          entering={FadeInDown.delay(50).springify()}
          style={[styles.searchContainer, isDark && styles.searchContainerDark]}
        >
          <Feather name="search" size={18} color="#9CA3AF" />
          <TextInput
            style={[styles.searchInput, isDark && styles.searchInputDark]}
            placeholder="Search by name, username or role..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Feather name="x-circle" size={18} color="#9CA3AF" />
            </Pressable>
          )}
        </Animated.View>

        {/* Filter & Actions */}
        <View style={styles.actionsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterScroll}
          >
            {["all", "admin", "engineer", "client", "vendor"].map((role) => (
              <Pressable
                key={role}
                style={[
                  styles.filterChip,
                  filterRole === role && styles.filterChipActive,
                  isDark && styles.filterChipDark,
                ]}
                onPress={() => setFilterRole(role)}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.filterText,
                    filterRole === role && styles.filterTextActive,
                  ]}
                >
                  {role === "all"
                    ? "All"
                    : roleConfig[role as keyof typeof roleConfig]?.label ||
                      role}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.shareAllBtn} onPress={handleShareAll}>
            <Feather name="share" size={18} color="#fff" />
          </Pressable>
        </View>

        {/* Accounts List */}
        <View style={styles.accountsList}>
          {filteredAccounts.map((account, index) =>
            renderAccountCard(account, index),
          )}
        </View>
      </ScrollView>

      {/* Add Button */}
      <Pressable style={styles.fab} onPress={openAddModal}>
        <LinearGradient
          colors={["#10B981", "#059669"]}
          style={styles.fabGradient}
        >
          <Feather name="user-plus" size={24} color="#fff" />
        </LinearGradient>
      </Pressable>

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
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
                {editingAccount ? "Edit Account" : "Create Account"}
              </ThemedText>
              <Pressable onPress={() => setModalVisible(false)}>
                <Feather
                  name="x"
                  size={24}
                  color={isDark ? "#9CA3AF" : "#6B7280"}
                />
              </Pressable>
            </View>

            <ScrollView style={styles.modalForm}>
              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Name *
                </ThemedText>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={formName}
                  onChangeText={setFormName}
                  placeholder="Full name"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Username *
                </ThemedText>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={formUsername}
                  onChangeText={setFormUsername}
                  placeholder="Username"
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Password *
                </ThemedText>
                <TextInput
                  style={[styles.input, isDark && styles.inputDark]}
                  value={formPassword}
                  onChangeText={setFormPassword}
                  placeholder="Password"
                  placeholderTextColor="#9CA3AF"
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText
                  type="small"
                  style={[styles.formLabel, isDark && { color: "#9CA3AF" }]}
                >
                  Role *
                </ThemedText>
                <View style={styles.roleSelector}>
                  <Pressable
                    style={[
                      styles.roleOption,
                      {
                        backgroundColor: roleConfig.admin.color + "20",
                        borderColor: roleConfig.admin.color,
                      },
                    ]}
                  >
                    <Feather
                      name={roleConfig.admin.icon as any}
                      size={16}
                      color={roleConfig.admin.color}
                    />
                    <ThemedText
                      type="small"
                      style={{ color: roleConfig.admin.color, fontWeight: "600" }}
                    >
                      {roleConfig.admin.label}
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <ThemedText type="body" style={styles.cancelBtnText}>
                  Cancel
                </ThemedText>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleSave}
              >
                <ThemedText type="body" style={styles.saveBtnText}>
                  {editingAccount ? "Update" : "Create"}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  // Stats
  statsRow: {
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
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: Spacing.sm,
  },
  searchContainerDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1F2937",
    paddingVertical: 0,
  },
  searchInputDark: {
    color: "#F9FAFB",
  },
  // Actions
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  filterScroll: {
    flex: 1,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    backgroundColor: "#fff",
    marginRight: Spacing.xs,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  filterChipDark: {
    backgroundColor: "#1F2937",
    borderColor: "#374151",
  },
  filterChipActive: {
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
  shareAllBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#8B5CF6",
    alignItems: "center",
    justifyContent: "center",
  },
  // Account Card
  accountsList: {
    gap: Spacing.sm,
  },
  accountCard: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.xs,
  },
  accountCardDark: {
    backgroundColor: "#1F2937",
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  roleIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1F2937",
  },
  roleBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
    marginTop: 4,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
  },
  credentialsRow: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  credentialItem: {
    flex: 1,
  },
  credentialLabel: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
  },
  credentialValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1F2937",
    marginTop: 2,
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  accountActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: Spacing.xs,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
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
    shadowColor: "#10B981",
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
    maxHeight: "80%",
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
  roleSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  roleOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  modalActions: {
    flexDirection: "row",
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  modalBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  cancelBtn: {
    backgroundColor: "#F3F4F6",
  },
  cancelBtnText: {
    color: "#6B7280",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#10B981",
  },
  saveBtnText: {
    color: "#fff",
    fontWeight: "600",
  },
});