import React, { useState } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { Spacing, BorderRadius, Colors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface SettingItemProps {
  icon: keyof typeof Feather.glyphMap;
  iconColor: string;
  iconBgColor: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  rightElement?: React.ReactNode;
  showChevron?: boolean;
}

function SettingItem({
  icon,
  iconColor,
  iconBgColor,
  title,
  subtitle,
  onPress,
  rightElement,
  showChevron = true,
}: SettingItemProps) {
  return (
    <Pressable
      style={styles.settingItem}
      onPress={onPress}
      disabled={!onPress && !rightElement}
    >
      <View style={[styles.settingIcon, { backgroundColor: iconBgColor }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.settingContent}>
        <ThemedText
          type="body"
          style={styles.settingTitle}
          lightColor="#1F2937"
          darkColor="#F9FAFB"
        >
          {title}
        </ThemedText>
        {subtitle && (
          <ThemedText
            type="small"
            style={styles.settingSubtitle}
            lightColor="#6B7280"
            darkColor="#9CA3AF"
          >
            {subtitle}
          </ThemedText>
        )}
      </View>
      {rightElement}
      {showChevron && onPress && (
        <Feather name="chevron-right" size={20} color="#9CA3AF" />
      )}
    </Pressable>
  );
}

interface SettingSectionProps {
  title: string;
  children: React.ReactNode;
  delay?: number;
}

function SettingSection({ title, children, delay = 0 }: SettingSectionProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).springify()}
      style={styles.section}
    >
      <ThemedText
        type="small"
        style={styles.sectionTitle}
        lightColor="#6B7280"
        darkColor="#9CA3AF"
      >
        {title}
      </ThemedText>
      <View style={styles.sectionContent}>{children}</View>
    </Animated.View>
  );
}

export default function ManagementScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { theme, isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: logout },
    ]);
  };

  const handleCreateAccount = () => {
    navigation.navigate("AccountManagement");
  };

  const handleManageUsers = () => {
    navigation.navigate("AccountManagement");
  };

  const handleBackupData = () => {
    Alert.alert(
      "Backup Data",
      "Your data will be backed up to the cloud. Continue?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Backup",
          onPress: () => Alert.alert("Success", "Data backed up successfully!"),
        },
      ],
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      "Clear Cache",
      "This will clear temporary data. Your saved data will not be affected.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => Alert.alert("Success", "Cache cleared!"),
        },
      ],
    );
  };

  const handleAbout = () => {
    Alert.alert(
      "About",
      "Construction ERP v1.0.0\n\nBuilt with React Native & Expo\n\n© 2026 Vettri Groups",
      [{ text: "OK" }],
    );
  };

  const handlePrivacy = () => {
    Alert.alert(
      "Privacy Policy",
      "Your privacy is important to us. We collect minimal data necessary to provide our services.",
      [{ text: "OK" }],
    );
  };

  const handleHelp = () => {
    Alert.alert(
      "Help & Support",
      "For support, contact:\n\nEmail: support@vettrigroups.com\nPhone: +91 XXXXX XXXXX",
      [{ text: "OK" }],
    );
  };

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
        {/* Profile Card */}
        <Animated.View
          entering={FadeInDown.springify()}
          style={styles.profileSection}
        >
          <LinearGradient
            colors={["#667EEA", "#764BA2"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.profileCard}
          >
            <View style={styles.profileAvatar}>
              <Feather
                name={
                  user?.role === "admin"
                    ? "award"
                    : user?.role === "engineer"
                      ? "compass"
                      : user?.role === "client"
                        ? "home"
                        : "truck"
                }
                size={32}
                color="#fff"
              />
            </View>
            <View style={styles.profileInfo}>
              <ThemedText
                type="h4"
                style={styles.profileName}
                lightColor="#fff"
                darkColor="#fff"
              >
                {user?.name || "User"}
              </ThemedText>
              <View style={styles.roleBadge}>
                <ThemedText
                  type="small"
                  style={styles.roleText}
                  lightColor="#fff"
                  darkColor="#fff"
                >
                  {user?.role?.charAt(0).toUpperCase()}
                  {user?.role?.slice(1)}
                </ThemedText>
              </View>
            </View>
            <Pressable style={styles.editButton}>
              <Feather name="edit-2" size={18} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </LinearGradient>
        </Animated.View>

        {/* Account Section */}
        {user?.role === "admin" && (
          <SettingSection title="ACCOUNT MANAGEMENT" delay={100}>
          
            <SettingItem
              icon="users"
              iconColor="#3B82F6"
              iconBgColor="rgba(59, 130, 246, 0.15)"
              title="Manage Users"
              subtitle="View and edit user accounts"
              onPress={handleManageUsers}
            />
          </SettingSection>
        )}

        {/* Preferences Section */}
        <SettingSection title="PREFERENCES" delay={150}>
          <SettingItem
            icon="bell"
            iconColor="#F59E0B"
            iconBgColor="rgba(245, 158, 11, 0.15)"
            title="Notifications"
            subtitle="Push notifications"
            showChevron={false}
            rightElement={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                thumbColor="#fff"
              />
            }
          />
          <SettingItem
            icon="moon"
            iconColor="#8B5CF6"
            iconBgColor="rgba(139, 92, 246, 0.15)"
            title="Dark Mode"
            subtitle={isDark ? "Dark theme active" : "Light theme active"}
            showChevron={false}
            rightElement={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                thumbColor="#fff"
              />
            }
          />
          <SettingItem
            icon="smartphone"
            iconColor="#EC4899"
            iconBgColor="rgba(236, 72, 153, 0.15)"
            title="Biometric Login"
            subtitle="Use fingerprint or face ID"
            showChevron={false}
            rightElement={
              <Switch
                value={biometricEnabled}
                onValueChange={setBiometricEnabled}
                trackColor={{ false: "#D1D5DB", true: "#3B82F6" }}
                thumbColor="#fff"
              />
            }
          />
        </SettingSection>

        {/* Data Section */}
        <SettingSection title="DATA & STORAGE" delay={200}>
          <SettingItem
            icon="cloud"
            iconColor="#06B6D4"
            iconBgColor="rgba(6, 182, 212, 0.15)"
            title="Backup Data"
            subtitle="Backup to cloud storage"
            onPress={handleBackupData}
          />
         
        </SettingSection>

        {/* About Section */}
        <SettingSection title="ABOUT" delay={250}>
          <SettingItem
            icon="info"
            iconColor="#6366F1"
            iconBgColor="rgba(99, 102, 241, 0.15)"
            title="About App"
            subtitle="Version 1.0.0"
            onPress={handleAbout}
          />
          <SettingItem
            icon="shield"
            iconColor="#14B8A6"
            iconBgColor="rgba(20, 184, 166, 0.15)"
            title="Privacy Policy"
            onPress={handlePrivacy}
          />
          <SettingItem
            icon="help-circle"
            iconColor="#F97316"
            iconBgColor="rgba(249, 115, 22, 0.15)"
            title="Help & Support"
            onPress={handleHelp}
          />
        </SettingSection>

        {/* Logout Section */}
        <SettingSection title="SESSION" delay={300}>
          <Pressable style={styles.logoutButton} onPress={handleLogout}>
            <Feather name="log-out" size={20} color="#EF4444" />
            <ThemedText
              type="body"
              style={styles.logoutText}
              lightColor="#EF4444"
              darkColor="#EF4444"
            >
              Logout
            </ThemedText>
          </Pressable>
        </SettingSection>
      </ScrollView>
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
  // Profile Section
  profileSection: {
    marginBottom: Spacing.md,
  },
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  profileName: {
    fontWeight: "700",
    marginBottom: 4,
  },
  roleBadge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  // Section Styles
  section: {
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  sectionContent: {
    backgroundColor: "#fff",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  // Setting Item Styles
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  settingIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 13,
    fontWeight: "500",
  },
  settingSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  // Logout Button
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  logoutText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
