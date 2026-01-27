import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Modal,
  Alert,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { MaterialOrder } from "@/types";
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";

export default function MaterialInventoryScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const {
    materialOrders,
    materials,
    clients,
    vendors,
    addMaterialOrder,
    updateMaterialOrder,
    deleteMaterialOrder,
  } = useData();

  const [showLogModal, setShowLogModal] = useState(false);
  const [editingOrder, setEditingOrder] = useState<MaterialOrder | null>(null);

  const [selectedClient, setSelectedClient] = useState("");
  const [selectedMaterial, setSelectedMaterial] = useState("");
  const [selectedVendor, setSelectedVendor] = useState("");
  const [quantity, setQuantity] = useState("");
  const [totalCost, setTotalCost] = useState("");
  const [orderDate, setOrderDate] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"paid" | "pending">(
    "pending",
  );

  // Enhanced dropdown states
  const [selectedMaterialCategory, setSelectedMaterialCategory] = useState("");
  const [selectedMaterialVariant, setSelectedMaterialVariant] = useState("");
  const [showMaterialCategoryDropdown, setShowMaterialCategoryDropdown] =
    useState(false);
  const [showMaterialVariantDropdown, setShowMaterialVariantDropdown] =
    useState(false);
  const [showVendorComparisonDropdown, setShowVendorComparisonDropdown] =
    useState(false);

  const [selectedFilter, setSelectedFilter] = useState<
    "material" | "site" | "vendor" | "all"
  >("all");
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false);
  const [showSiteDropdown, setShowSiteDropdown] = useState(false);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [filterMaterial, setFilterMaterial] = useState("");
  const [filterSite, setFilterSite] = useState("");
  const [filterVendor, setFilterVendor] = useState("");
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<
    "all" | "paid" | "pending"
  >("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dropdownTimer, setDropdownTimer] = useState<any | null>(null);
  const [showDropdownOverlay, setShowDropdownOverlay] = useState(false);

  const canEdit = user?.role === "admin" || user?.role === "engineer";

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimer) {
        clearTimeout(dropdownTimer);
      }
    };
  }, [dropdownTimer]);

  // Helper functions moved up to avoid ReferenceError in useMemo
  const getMaterialName = (id: string) =>
    (materials || []).find((m) => m.id === id)?.name || "Unknown";
  const getMaterialUnit = (id: string) =>
    (materials || []).find((m) => m.id === id)?.unit || "";
  const getClientName = (id: string) =>
    (clients || []).find((c) => c.id === id)?.projectName || "Unknown";
  const getVendorName = (id: string) =>
    (vendors || []).find((v) => v.id === id)?.name || "Unknown";

  const filteredOrders = useMemo(() => {
  let orders = [...(materialOrders || [])];

  // 🔒 Vendor login → show only their orders
  if (user?.role === "vendor") {
    orders = orders.filter(
      (o) => o.supplierId === user.vendorId
    );
  }


    if (filterPaymentStatus !== "all") {
      orders = orders.filter((o) => o.paymentStatus === filterPaymentStatus);
    }

    // Apply multiple filters simultaneously
    if (filterMaterial) {
      orders = orders.filter((o) => {
        const materialName =
          (materials || []).find((m) => m.id === o.materialId)?.name || "";
        return materialName === filterMaterial;
      });
    }

    if (filterSite) {
      orders = orders.filter((o) => {
        const clientName =
          (clients || []).find((c) => c.id === o.clientId)?.projectName || "";
        return clientName === filterSite;
      });
    }

    if (filterVendor) {
      orders = orders.filter((o) => {
        const vendorName =
          (vendors || []).find((v) => v.id === o.supplierId)?.name || "";
        return vendorName === filterVendor;
      });
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      orders = orders.filter((o) => {
        const materialName =
          (materials || []).find((m) => m.id === o.materialId)?.name || "";
        const clientName =
          (clients || []).find((c) => c.id === o.clientId)?.projectName || "";
        const vendorName = getVendorName(o.supplierId);
        return (
          materialName.toLowerCase().includes(query) ||
          clientName.toLowerCase().includes(query) ||
          vendorName.toLowerCase().includes(query)
        );
      });
    }

    return orders.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [
    materialOrders,
    materials,
    clients,
    vendors,
    filterMaterial,
    filterSite,
    filterVendor,
    filterPaymentStatus,
    searchQuery,
  ]);

  // Calculate totals based on filtered orders
  const totals = useMemo(() => {
    const orders = filteredOrders;
    const totalCost = orders.reduce(
      (sum, order) => sum + (order.totalCost || 0),
      0,
    );
    const paidAmount = orders.reduce(
      (sum, order) =>
        sum + (order.paymentStatus === "paid" ? order.totalCost || 0 : 0),
      0,
    );
    const pendingAmount = totalCost - paidAmount;

    return {
      totalCost,
      paidAmount,
      pendingAmount,
      orderCount: orders.length,
      paidCount: orders.filter((o) => o.paymentStatus === "paid").length,
      pendingCount: orders.filter((o) => o.paymentStatus === "pending").length,
    };
  }, [filteredOrders]);

  // Sample data for dropdowns
  const materialOptions = (materials || []).map((m) => m.name).filter(Boolean);
  const siteOptions = (clients || []).map((c) => c.projectName).filter(Boolean);

  // Show all vendors from dashboard (not just those with orders)
const supplierOptions = (vendors || [])
  .filter(v => Array.isArray(v.materials) && v.materials.length > 0)
  .map(v => v.name);
const visibleVendors =
  user?.role === "vendor"
    ? (vendors || []).filter(v => v.id === user.vendorId)
    : (vendors || []).filter(v => v.materials?.length);

  // Get available materials for selected vendor
  const getVendorMaterials = () => {
    if (!selectedVendor) return [];
    const vendor = (vendors || []).find((v) => v.id === selectedVendor);
    if (!vendor || !vendor.materials) return [];

    // Return vendor materials with full details (including size variations)
    return vendor.materials.map((vm, index) => {
      // Find corresponding material from materials array for additional info
      const baseMaterial = (materials || []).find((m) =>
        m.name.includes(vm.name.split(" ")[0]),
      );
      return {
        ...vm,
        id: vm.name.replace(/\s+/g, "_").toLowerCase(), // Create unique ID from name
        baseMaterialId: baseMaterial?.id || "",
        displayName: vm.name,
        category: vm.category || "general",
      };
    });
  };

  const vendorMaterials = getVendorMaterials();

  // Group materials by category for better organization
  const getMaterialsByCategory = () => {
    const grouped: { [key: string]: typeof vendorMaterials } = {};
    vendorMaterials.forEach((material) => {
      const category = material.category || "general";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(material);
    });
    return grouped;
  };

  // Get unique material categories from all vendors
  const getMaterialCategories = () => {
    const categories = new Set<string>();
    visibleVendors.forEach((vendor) => {
      vendor.materials?.forEach((material) => {
        if (material.category) {
          categories.add(material.category);
        }
      });
    });
    return Array.from(categories).sort();
  };

  // Get material variants for selected category
  const getMaterialVariants = (category: string) => {
    const variants = new Map<
      string,
      {
        name: string;
        unit: string;
        vendors: { vendorName: string; vendorId: string; price: number }[];
      }
    >();

    visibleVendors.forEach((vendor) => {
      (vendor.materials || []).forEach((material) => {
        if (
          material &&
          material.category === category &&
          material.name &&
          material.unit
        ) {
          const key = material.name;
          if (!variants.has(key)) {
            variants.set(key, {
              name: material.name,
              unit: material.unit || "unit",
              vendors: [],
            });
          }
          variants.get(key)?.vendors.push({
            vendorName: vendor.name,
            vendorId: vendor.id,
            price: material.unitPrice,
          });
        }
      });
    });

    return Array.from(variants.values());
  };

  // Get vendor pricing comparison for selected material variant
  const getVendorPricingComparison = (materialName: string) => {
    const comparisons: {
      vendorName: string;
      vendorId: string;
      price: number;
      unit: string;
    }[] = [];

    visibleVendors.forEach((vendor) => {
      const material = (vendor.materials || []).find(
        (m) => m && m.name === materialName,
      );
      if (material && material.unit) {
        comparisons.push({
          vendorName: vendor.name,
          vendorId: vendor.id,
          price: material.unitPrice || 0,
          unit: material.unit || "unit",
        });
      }
    });

    return comparisons.sort((a, b) => a.price - b.price); // Sort by price (lowest first)
  };

  const materialCategories = getMaterialCategories();
  const materialVariants = selectedMaterialCategory
    ? getMaterialVariants(selectedMaterialCategory)
    : [];
  const vendorPricingComparison = selectedMaterialVariant
    ? getVendorPricingComparison(selectedMaterialVariant)
    : [];

  // Auto-hide dropdown after 5 seconds
  const startDropdownTimer = () => {
    if (dropdownTimer) {
      clearTimeout(dropdownTimer);
    }
    setShowDropdownOverlay(true);
    const timer = setTimeout(() => {
      setShowMaterialDropdown(false);
      setShowSiteDropdown(false);
      setShowVendorDropdown(false);
      setShowDropdownOverlay(false);
      setDropdownTimer(null);
    }, 5000);
    setDropdownTimer(timer);
  };

  const clearDropdownTimer = () => {
    if (dropdownTimer) {
      clearTimeout(dropdownTimer);
      setDropdownTimer(null);
    }
    setShowDropdownOverlay(false);
  };

  const handleMaterialSelect = (material: string) => {
    setFilterMaterial(material);
    setShowMaterialDropdown(false);
    setSelectedFilter("material");
    clearDropdownTimer();
  };

  const handleSiteSelect = (site: string) => {
    setFilterSite(site);
    setShowSiteDropdown(false);
    setSelectedFilter("site");
    clearDropdownTimer();
  };

  const handleVendorSelect = (vendor: string) => {
    setFilterVendor(vendor);
    setShowVendorDropdown(false);
    setSelectedFilter("vendor");
    clearDropdownTimer();
  };

  // Enhanced dropdown handlers
  const handleMaterialCategorySelect = (category: string) => {
    setSelectedMaterialCategory(category);
    setShowMaterialCategoryDropdown(false);
    setSelectedMaterialVariant(""); // Reset variant when category changes
    setSelectedMaterial(""); // Reset selected material
    setSelectedVendor(""); // Reset vendor when category changes
    setTotalCost(""); // Reset cost
  };

  const handleMaterialVariantSelect = (variant: string) => {
    setSelectedMaterialVariant(variant);
    // Try to find matching material ID from global list
    const materialObj = (materials || []).find((m) => m.name === variant);
    setSelectedMaterial(materialObj ? materialObj.id : variant);
    setShowMaterialVariantDropdown(false);
    setSelectedVendor(""); // Reset vendor when variant changes
    setTotalCost(""); // Reset cost
  };

  const handleVendorComparisonSelect = (vendorId: string, price: number) => {
    setSelectedVendor(vendorId);
    setShowVendorComparisonDropdown(false);
    // Auto-calculate total cost if quantity and material are entered
    if (quantity && selectedMaterialVariant) {
      const calculatedCost = price * parseFloat(quantity);
      setTotalCost(String(calculatedCost));
    }
  };

  const resetForm = () => {
    setSelectedClient("");
    setSelectedMaterial("");
    setSelectedVendor("");
    setQuantity("");
    setTotalCost("");
    setOrderDate("");
    setPaymentStatus("pending");
    setEditingOrder(null);

    // Reset enhanced dropdown states
    setSelectedMaterialCategory("");
    setSelectedMaterialVariant("");
    setShowMaterialCategoryDropdown(false);
    setShowMaterialVariantDropdown(false);
    setShowVendorComparisonDropdown(false);
  };

  const openLogModal = (order?: MaterialOrder) => {
    if (order) {
      setEditingOrder(order);
      setSelectedClient(order.clientId);
      setSelectedMaterial(order.materialId);
      setSelectedVendor(order.supplierId);
      setQuantity(String(order.quantity));
      setTotalCost(String(order.totalCost));
      setOrderDate(order.date);
      setPaymentStatus(order.paymentStatus);

      // Populate enhanced dropdowns for editing
      const material = (materials || []).find((m) => m.id === order.materialId);
      const materialName = material ? material.name : order.materialId;

      // Find category from vendor materials
      const vendor = (vendors || []).find((v) => v.id === order.supplierId);
      const vendorMaterial = vendor?.materials?.find(
        (vm) => vm.name === materialName,
      );

      if (vendorMaterial && vendorMaterial.category) {
        setSelectedMaterialCategory(vendorMaterial.category);
        setSelectedMaterialVariant(materialName);
      }
    } else {
      resetForm();
      setOrderDate(new Date().toISOString().split("T")[0]);
    }
    setShowLogModal(true);
  };

  const sendSupplierNotification = async (order: MaterialOrder) => {
    try {
      const vendor = (vendors || []).find((v) => v.id === order.supplierId);
      const material = (materials || []).find((m) => m.id === order.materialId);
      const client = (clients || []).find((c) => c.id === order.clientId);

      const supplierPhone = vendor?.phone || "";
      const supplierName = vendor?.name || "Vendor";

      if (!supplierPhone) {
        console.log("No phone number found for supplier notification");
        return;
      }

      const notificationData = {
        supplierName,
        supplierPhone,
        materialName: material?.name || "Material",
        quantity: order.quantity,
        unit: material?.unit || "units",
        totalCost: order.totalCost,
        clientProject: client?.projectName || "Project",
        orderDate: order.date,
      };

      const response = await apiRequest(
        "POST",
        "/api/notifications/send-order-notification",
        notificationData,
      );
      const result = await response.json();

      if (result.success) {
        const messages: string[] = [];
        if (result.notifications.voiceCall.sent) {
          messages.push("Voice call initiated");
        }
        if (result.notifications.whatsapp.sent) {
          messages.push("WhatsApp sent");
        }

        if (messages.length > 0) {
          Alert.alert(
            "Notification Sent",
            messages.join(" and ") + ` to ${supplierName}`,
          );
        } else {
          Alert.alert(
            "Order Placed",
            `Order saved. Notifications require API configuration.\n\nTamil message preview:\n"${result.messages.tamil.substring(0, 100)}..."`,
          );
        }
      }
    } catch (error) {
      console.log("Notification error:", error);
    }
  };

 // Replace your existing handleSaveOrder function with this updated version:

const handleSaveOrder = async () => {
  if (!selectedClient || !selectedMaterial || !selectedVendor || !quantity) {
    Alert.alert("Missing Fields", "Please fill all required fields.");
    return;
  }

  const cost = totalCost ? parseFloat(totalCost) : calculateTotal();
  const qty = parseFloat(quantity);

  try {
    if (editingOrder) {
      // Update existing order
      await updateMaterialOrder({
        ...editingOrder,
        clientId: selectedClient,
        materialId: selectedMaterial,
        supplierId: selectedVendor,
        quantity: qty,
        totalCost: cost,
        date: orderDate,
        paymentStatus,
        stock: paymentStatus === "paid" ? qty : editingOrder.stock,
      });
    } else {
      // Create new order - Let Firebase generate the ID
      const newOrder: Omit<MaterialOrder, 'id'> = {
        clientId: selectedClient,
        materialId: selectedMaterial,
        supplierId: selectedVendor,
        quantity: qty,
        totalCost: cost,
        date: orderDate,
        paymentStatus,
        vendorRead: false, // 🔥 ADD THIS LINE
        vendorStatus: 'pending', // 🔥 REQUIRED
        stock: qty,
      };
      
      // Add to Firebase (Firebase will generate the ID)
      await addMaterialOrder(newOrder as MaterialOrder);

      // Send notification with temporary order data
      await sendSupplierNotification({
        id: 'temp', // Temporary ID just for notification
        ...newOrder,
      } as MaterialOrder);
    }

    setShowLogModal(false);
    resetForm();
  } catch (error) {
    console.error("Error saving material order:", error);
    Alert.alert("Error", "Failed to save material order. Please try again.");
  }
};

  const handleDeleteOrder = (order: MaterialOrder) => {
    Alert.alert(
      "Delete Entry",
      `Delete this ${getMaterialName(order.materialId)} order?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMaterialOrder(order.id),
        },
      ],
    );
  };

  const calculateTotal = () => {
    // Get selected vendor details
    const vendor = (vendors || []).find((v) => v.id === selectedVendor);
    if (!vendor || !selectedMaterial || !quantity) {
      return 0;
    }

    // Resolve material name (handle ID vs Name)
    let materialName = selectedMaterial;
    const materialObj = (materials || []).find(
      (m) => m.id === selectedMaterial,
    );
    if (materialObj) {
      materialName = materialObj.name;
    }

    // Find selected material from vendor materials by name
    const selectedVendorMaterial = vendor.materials?.find(
      (vm) => vm.name === materialName,
    );

    if (selectedVendorMaterial) {
      // Use vendor's specific pricing for the selected material
      return selectedVendorMaterial.unitPrice * parseFloat(quantity);
    }

    // Fallback to default material pricing
    if (materialObj) {
      return materialObj.unitPrice * parseFloat(quantity);
    }

    return 0;
  };

  // Auto-update total cost when quantity, material, or vendor changes
  useEffect(() => {
    if (quantity && selectedMaterial && selectedVendor) {
      const calculatedCost = calculateTotal();
      setTotalCost(String(calculatedCost));
    } else {
      setTotalCost("");
    }
  }, [quantity, selectedMaterial, selectedVendor, vendors, materials]);

  // Clear selected material when vendor changes (since available materials change)
  useEffect(() => {
    if (selectedVendor && !selectedMaterialVariant) {
      setSelectedMaterial("");
      setTotalCost("");
    }
  }, [selectedVendor, selectedMaterialVariant]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "Invalid Date";
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const isLowStock = (order: MaterialOrder) =>
    order.stock < order.quantity * 0.2;

  const renderOrderRow = ({ item: order }: { item: MaterialOrder }) => {
    const lowStock = isLowStock(order);

    // Get material details including variant/orientation
    const material = (materials || []).find((m) => m.id === order.materialId);
    const materialVariant = material
      ? material.name
      : order.materialId || "Unknown Material";

    // Get vendor details
    const vendor = (vendors || []).find((v) => v.id === order.supplierId);
    const vendorName = vendor ? vendor.name : "Unknown Vendor";

    // Get client details
    const client = (clients || []).find((c) => c.id === order.clientId);
    const clientName = client ? client.name : "Unknown Client";

    // Get material category from vendor materials
    let materialCategory = "other"; // Default to other
    let foundVendorMaterial = null;
    if (vendor) {
      foundVendorMaterial = vendor.materials?.find(
        (vm) => vm.name === materialVariant,
      );
      if (foundVendorMaterial) {
        materialCategory = foundVendorMaterial.category;
      }
    }

    // If not found in vendor materials, extract from material name
    if (!foundVendorMaterial) {
      const materialNameLower = materialVariant.toLowerCase();
      if (materialNameLower.includes("sand")) {
        if (
          materialNameLower.includes("m-sand") ||
          materialNameLower.includes("m sand")
        ) {
          materialCategory = "m_sand";
        } else if (
          materialNameLower.includes("p-sand") ||
          materialNameLower.includes("p sand") ||
          materialNameLower.includes("river")
        ) {
          materialCategory = "p_sand";
        } else {
          materialCategory = "m_sand"; // Default sand type
        }
      } else if (
        materialNameLower.includes("steel") ||
        materialNameLower.includes("tmt") ||
        materialNameLower.includes("iron")
      ) {
        materialCategory = "steel";
      } else if (materialNameLower.includes("cement")) {
        materialCategory = "cement";
      } else if (
        materialNameLower.includes("aggregate") ||
        materialNameLower.includes("jelly") ||
        materialNameLower.includes("gitti")
      ) {
        materialCategory = "aggregate";
      } else if (materialNameLower.includes("brick")) {
        materialCategory = "bricks";
      } else if (materialNameLower.includes("tile")) {
        materialCategory = "tiles";
      } else if (
        materialNameLower.includes("electrical") ||
        materialNameLower.includes("wire") ||
        materialNameLower.includes("cable")
      ) {
        materialCategory = "electrical";
      } else if (
        materialNameLower.includes("plumbing") ||
        materialNameLower.includes("pipe")
      ) {
        materialCategory = "plumbing";
      } else if (materialNameLower.includes("paint")) {
        materialCategory = "paint";
      }
    }

    return (
      <Pressable
        onPress={() => (canEdit ? openLogModal(order) : null)}
        onLongPress={() => (canEdit ? handleDeleteOrder(order) : null)}
        style={[styles.tableRow, { backgroundColor: theme.backgroundDefault }]}
      >
        <View style={styles.rowMain}>
          <View style={styles.rowLeft}>
            <View
              style={[
                styles.dateCell,
                { backgroundColor: Colors.light.primary + "10" },
              ]}
            >
              <ThemedText
                type="small"
                style={{ color: Colors.light.primary, fontWeight: "600" }}
              >
                {formatDate(order.date)}
              </ThemedText>
            </View>
            <View style={styles.materialCell}>
              <ThemedText
                type="body"
                style={{ fontWeight: "600" }}
                numberOfLines={1}
              >
                {materialVariant}
              </ThemedText>
              <View style={styles.materialDetails}>
                <ThemedText
                  type="small"
                  style={{ color: theme.textSecondary }}
                  numberOfLines={1}
                >
                  {clientName}
                </ThemedText>
                <View style={styles.variantBadge}>
                  <Feather name="tag" size={8} color={Colors.light.primary} />
                  <ThemedText
                    type="small"
                    style={{
                      color: Colors.light.primary,
                      fontSize: 9,
                      marginLeft: 2,
                    }}
                  >
                    {materialCategory.charAt(0).toUpperCase() +
                      materialCategory.slice(1).replace("_", " ")}
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.rowRight}>
            <View style={styles.qtyCell}>
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                {order.quantity}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {getMaterialUnit(order.materialId)}
              </ThemedText>
            </View>

            <View style={styles.costCell}>
              <ThemedText
                type="body"
                style={{ fontWeight: "700", color: Colors.light.primary }}
              >
                {order.totalCost.toLocaleString()}
              </ThemedText>
              {order.paymentStatus === "paid" && (
                <View style={{ alignItems: "flex-end", marginTop: 2 }}>
                  <ThemedText
                    type="small"
                    style={{ fontSize: 9, color: Colors.light.success }}
                  >
                    {order.paymentMethod || "Paid"}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ fontSize: 8, color: theme.textSecondary }}
                  >
                    {order.transactionId
                      ? `#${order.transactionId.slice(-6)}`
                      : ""}
                  </ThemedText>
                </View>
              )}
              {order.paymentStatus === "pending" && (
                <View style={{ alignItems: "flex-end", marginTop: 2 }}>
                  <ThemedText
                    type="small"
                    style={{
                      fontSize: 9,
                      color: Colors.light.warning,
                      fontWeight: "600",
                    }}
                  >
                    Pending
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.rowFooter}>
          <View style={styles.supplierTag}>
            <Feather name="truck" size={12} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginLeft: 4 }}
              numberOfLines={1}
            >
              {vendorName}
            </ThemedText>
          </View>

          <View style={styles.rowBadges}>
            {lowStock ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: Colors.light.error + "15" },
                ]}
              >
                <Feather
                  name="alert-triangle"
                  size={10}
                  color={Colors.light.error}
                />
                <ThemedText
                  type="small"
                  style={{
                    color: Colors.light.error,
                    marginLeft: 4,
                    fontSize: 10,
                  }}
                >
                  Low
                </ThemedText>
              </View>
            ) : null}
            <View
              style={[
                styles.badge,
                {
                  backgroundColor:
                    order.paymentStatus === "paid"
                      ? Colors.light.success + "15"
                      : Colors.light.warning + "15",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      order.paymentStatus === "paid"
                        ? Colors.light.success
                        : Colors.light.warning,
                  },
                ]}
              />
              <ThemedText
                type="small"
                style={{
                  color:
                    order.paymentStatus === "paid"
                      ? Colors.light.success
                      : Colors.light.warning,
                  fontSize: 10,
                  fontWeight: "600",
                  textTransform: "uppercase",
                  marginLeft: 4,
                }}
              >
                {order.paymentStatus}
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={[styles.stockBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.stockFill,
              {
                width: `${Math.min((order.stock / order.quantity) * 100, 100)}%`,
                backgroundColor: lowStock
                  ? Colors.light.warning
                  : Colors.light.success,
              },
            ]}
          />
        </View>
      </Pressable>
    );
  };

  return (
    <ThemedView style={styles.container}>
      {/* Header with Totals */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View style={styles.headerContent}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: Colors.light.primary + "15" },
            ]}
          >
            <Feather name="package" size={24} color={Colors.light.primary} />
          </View>
          <View style={styles.headerInfo}>
            <ThemedText
              type="h3"
              style={{ fontWeight: "700", color: theme.text }}
            >
              Material Inventory
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
              Manage construction materials and suppliers
            </ThemedText>
          </View>
        </View>
      </View>

      {/* Filter Row */}
      <View style={styles.filtersRow}>
        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => {
              setShowMaterialDropdown(!showMaterialDropdown);
              if (!showMaterialDropdown) {
                startDropdownTimer();
              } else {
                clearDropdownTimer();
              }
            }}
            style={[styles.filterTab, filterMaterial && styles.filterTabActive]}
          >
            <Feather
              name="package"
              size={14}
              color={
                filterMaterial ? Colors.light.primary : theme.textSecondary
              }
            />
            <ThemedText
              type="small"
              style={{
                color: filterMaterial ? Colors.light.primary : theme.text,
                fontWeight: filterMaterial ? "600" : "500",
                marginLeft: 4,
              }}
            >
              Material
            </ThemedText>
            <View
              style={[
                styles.filterCount,
                {
                  backgroundColor: filterMaterial
                    ? Colors.light.primary
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: filterMaterial ? "#FFFFFF" : theme.text,
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {materialOptions.length}
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Site Filter */}
        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => {
              setShowSiteDropdown(!showSiteDropdown);
              if (!showSiteDropdown) {
                startDropdownTimer();
              } else {
                clearDropdownTimer();
              }
            }}
            style={[styles.filterTab, filterSite && styles.filterTabActive]}
          >
            <Feather
              name="map-pin"
              size={14}
              color={filterSite ? Colors.light.primary : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: filterSite ? Colors.light.primary : theme.text,
                fontWeight: filterSite ? "600" : "500",
                marginLeft: 4,
              }}
            >
              Site
            </ThemedText>
            <View
              style={[
                styles.filterCount,
                {
                  backgroundColor: filterSite
                    ? Colors.light.primary
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: filterSite ? "#FFFFFF" : theme.text,
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {siteOptions.length}
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Vendor Filter */}
        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => {
              setShowVendorDropdown(!showVendorDropdown);
              if (!showVendorDropdown) {
                startDropdownTimer();
              } else {
                clearDropdownTimer();
              }
            }}
            style={[styles.filterTab, filterVendor && styles.filterTabActive]}
          >
            <Feather
              name="truck"
              size={14}
              color={filterVendor ? Colors.light.primary : theme.textSecondary}
            />
            <ThemedText
              type="small"
              style={{
                color: filterVendor ? Colors.light.primary : theme.text,
                fontWeight: filterVendor ? "600" : "500",
                marginLeft: 4,
              }}
            >
              Vendor
            </ThemedText>
            <View
              style={[
                styles.filterCount,
                {
                  backgroundColor: filterVendor
                    ? Colors.light.primary
                    : theme.backgroundSecondary,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: filterVendor ? "#FFFFFF" : theme.text,
                  fontSize: 10,
                  fontWeight: "600",
                }}
              >
                {supplierOptions.length}
              </ThemedText>
            </View>
          </Pressable>
        </View>

        {/* Clear All Filters */}
        <View style={styles.filterContainer}>
          <Pressable
            onPress={() => {
              setFilterMaterial("");
              setFilterSite("");
              setFilterVendor("");
              setFilterPaymentStatus("all");
              clearDropdownTimer();
              setShowMaterialDropdown(false);
              setShowSiteDropdown(false);
              setShowVendorDropdown(false);
            }}
            style={styles.filterTab}
          >
            <Feather name="x" size={14} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{
                color: theme.text,
                fontWeight: "500",
                marginLeft: 4,
              }}
            >
              Clear All
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.statusFilterRow}>
        <Pressable
          onPress={() => setFilterPaymentStatus("all")}
          style={[
            styles.statusFilterOption,
            {
              borderColor:
                filterPaymentStatus === "all"
                  ? Colors.light.primary
                  : theme.border,
            },
            filterPaymentStatus === "all" && {
              backgroundColor: Colors.light.primary + "10",
            },
          ]}
        >
          <ThemedText
            type="small"
            style={{
              color:
                filterPaymentStatus === "all"
                  ? Colors.light.primary
                  : theme.text,
              fontWeight: "600",
            }}
          >
            All
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setFilterPaymentStatus("paid")}
          style={[
            styles.statusFilterOption,
            {
              borderColor:
                filterPaymentStatus === "paid"
                  ? Colors.light.success
                  : theme.border,
            },
            filterPaymentStatus === "paid" && {
              backgroundColor: Colors.light.success + "12",
            },
          ]}
        >
          <ThemedText
            type="small"
            style={{
              color:
                filterPaymentStatus === "paid"
                  ? Colors.light.success
                  : theme.text,
              fontWeight: "600",
            }}
          >
            Paid
          </ThemedText>
        </Pressable>

        <Pressable
          onPress={() => setFilterPaymentStatus("pending")}
          style={[
            styles.statusFilterOption,
            {
              borderColor:
                filterPaymentStatus === "pending"
                  ? Colors.light.warning
                  : theme.border,
            },
            filterPaymentStatus === "pending" && {
              backgroundColor: Colors.light.warning + "12",
            },
          ]}
        >
          <ThemedText
            type="small"
            style={{
              color:
                filterPaymentStatus === "pending"
                  ? Colors.light.warning
                  : theme.text,
              fontWeight: "600",
            }}
          >
            Pending
          </ThemedText>
        </Pressable>
      </View>

      <FlatList
        data={filteredOrders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderRow}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 80 },
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
        ListFooterComponent={() => (
          <View
            style={[
              styles.summaryFooter,
              {
                backgroundColor: theme.backgroundDefault,
                borderColor: theme.border,
              },
            ]}
          >
            <View style={styles.summaryHeaderRow}>
              <ThemedText
                type="body"
                style={{ fontWeight: "700", color: theme.text }}
              >
                Totals
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {totals.orderCount} entries
              </ThemedText>
            </View>

            <View style={styles.totalsContainer}>
              <View style={[styles.totalCard, { borderColor: theme.border }]}>
                <View style={styles.totalIcon}>
                  <Feather
                    name="dollar-sign"
                    size={16}
                    color={Colors.light.primary}
                  />
                </View>
                <View style={styles.totalInfo}>
                  <ThemedText
                    type="h4"
                    style={{ color: Colors.light.primary, fontWeight: "800" }}
                  >
                    ₹{totals.totalCost.toLocaleString()}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    Total
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.totalCard, { borderColor: theme.border }]}>
                <View
                  style={[
                    styles.totalIcon,
                    { backgroundColor: Colors.light.success + "15" },
                  ]}
                >
                  <Feather
                    name="check-circle"
                    size={16}
                    color={Colors.light.success}
                  />
                </View>
                <View style={styles.totalInfo}>
                  <ThemedText
                    type="h4"
                    style={{ color: Colors.light.success, fontWeight: "800" }}
                  >
                    ₹{totals.paidAmount.toLocaleString()}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    Paid
                  </ThemedText>
                </View>
              </View>

              <View style={[styles.totalCard, { borderColor: theme.border }]}>
                <View
                  style={[
                    styles.totalIcon,
                    { backgroundColor: Colors.light.warning + "15" },
                  ]}
                >
                  <Feather
                    name="clock"
                    size={16}
                    color={Colors.light.warning}
                  />
                </View>
                <View style={styles.totalInfo}>
                  <ThemedText
                    type="h4"
                    style={{ color: Colors.light.warning, fontWeight: "800" }}
                  >
                    ₹{totals.pendingAmount.toLocaleString()}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    Pending
                  </ThemedText>
                </View>
              </View>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Feather name="package" size={48} color={theme.textSecondary} />
            <ThemedText
              type="body"
              style={{ color: theme.textSecondary, marginTop: Spacing.md }}
            >
              No material entries found
            </ThemedText>
            {canEdit ? (
              <ThemedText
                type="small"
                style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
              >
                Tap + to log a new material order
              </ThemedText>
            ) : null}
          </View>
        )}
      />

      {canEdit ? (
        <Pressable
          onPress={() => openLogModal()}
          style={[styles.fab, { bottom: insets.bottom + Spacing.lg }]}
        >
          <Feather name="plus" size={24} color="#FFFFFF" />
        </Pressable>
      ) : null}

      <Modal
        visible={showLogModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLogModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            <View style={styles.modalHeader}>
              <ThemedText type="h4">
                {editingOrder ? "Edit Entry" : "Log Material"}
              </ThemedText>
              <Pressable onPress={() => setShowLogModal(false)}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <KeyboardAwareScrollViewCompat style={styles.modalForm}>
              <View style={styles.formGroup}>
                <ThemedText type="small" style={styles.formLabel}>
                  Date
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={orderDate}
                  onChangeText={setOrderDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={theme.textSecondary}
                />
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="small" style={styles.formLabel}>
                  Site / Project
                </ThemedText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {(clients || []).map((client) => (
                    <Pressable
                      key={client.id}
                      onPress={() => setSelectedClient(client.id)}
                      style={[
                        styles.selectChip,
                        {
                          borderColor:
                            selectedClient === client.id
                              ? Colors.light.primary
                              : theme.border,
                        },
                        selectedClient === client.id && {
                          backgroundColor: Colors.light.primary + "15",
                        },
                      ]}
                    >
                      <ThemedText
                        type="small"
                        style={{
                          color:
                            selectedClient === client.id
                              ? Colors.light.primary
                              : theme.text,
                        }}
                      >
                        {client.projectName}
                      </ThemedText>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="small" style={styles.formLabel}>
                  Material Category
                </ThemedText>
                <View style={styles.categoryGrid}>
                  {materialCategories.map((category) => (
                    <Pressable
                      key={category}
                      onPress={() => handleMaterialCategorySelect(category)}
                      style={[
                        styles.categoryCard,
                        selectedMaterialCategory === category &&
                          styles.categoryCardSelected,
                        {
                          backgroundColor:
                            selectedMaterialCategory === category
                              ? Colors.light.primary
                              : theme.backgroundSecondary,
                          borderColor:
                            selectedMaterialCategory === category
                              ? Colors.light.primary
                              : theme.border,
                        },
                      ]}
                    >
                      <ThemedText
                        style={{
                          color:
                            selectedMaterialCategory === category
                              ? "#FFFFFF"
                              : theme.text,
                          fontWeight:
                            selectedMaterialCategory === category
                              ? "600"
                              : "500",
                          textAlign: "center",
                        }}
                      >
                        {category.charAt(0).toUpperCase() +
                          category.slice(1).replace("_", " ")}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {selectedMaterialCategory && (
                <View style={styles.formGroup}>
                  <View style={styles.simpleHeader}>
                    <ThemedText type="small" style={styles.formLabel}>
                      Select Material Type
                    </ThemedText>
                  </View>

                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.simpleScroll}
                  >
                    <View style={styles.simpleContainer}>
                      {materialVariants.map((variant) => (
                        <Pressable
                          key={variant.name}
                          onPress={() =>
                            handleMaterialVariantSelect(variant.name)
                          }
                          style={[
                            styles.attractiveCard,
                            selectedMaterialVariant === variant.name &&
                              styles.attractiveCardSelected,
                            {
                              backgroundColor:
                                selectedMaterialVariant === variant.name
                                  ? Colors.light.primary
                                  : "#FFFFFF",
                            },
                          ]}
                        >
                          <View style={styles.attractiveContent}>
                            <View style={styles.materialIcon}>
                              <Feather
                                name="box"
                                size={20}
                                color={
                                  selectedMaterialVariant === variant.name
                                    ? "#FFFFFF"
                                    : Colors.light.primary
                                }
                              />
                            </View>

                            <View style={styles.attractiveMaterialName}>
                              <ThemedText
                                style={{
                                  color:
                                    selectedMaterialVariant === variant.name
                                      ? "#FFFFFF"
                                      : theme.text,
                                  fontWeight: "900",
                                  fontSize: 13,
                                  textAlign: "center",
                                  lineHeight: 18,
                                }}
                              >
                                {variant.name.split(" ").slice(0, 2).join(" ")}
                              </ThemedText>
                            </View>

                            <View style={styles.vendorCountBadge}>
                              <Feather
                                name="users"
                                size={10}
                                color={
                                  selectedMaterialVariant === variant.name
                                    ? "#FFFFFF"
                                    : Colors.light.primary
                                }
                              />
                              <ThemedText
                                style={{
                                  color:
                                    selectedMaterialVariant === variant.name
                                      ? "#FFFFFF"
                                      : Colors.light.primary,
                                  fontSize: 9,
                                  fontWeight: "600",
                                  marginLeft: 4,
                                }}
                              >
                                {variant.vendors.length}
                              </ThemedText>
                            </View>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
              )}

              {selectedMaterialVariant && (
                <View style={styles.formGroup}>
                  <View style={styles.vendorComparisonHeader}>
                    <ThemedText type="small" style={styles.formLabel}>
                      All Vendor Pricing Comparison
                    </ThemedText>
                    <View style={styles.pricingStats}>
                      <View style={styles.statBadge}>
                        <Feather
                          name="trending-down"
                          size={8}
                          color={Colors.light.success}
                        />
                        <ThemedText
                          style={{
                            color: Colors.light.success,
                            fontSize: 7,
                            fontWeight: "700",
                          }}
                        >
                          BEST: ₹
                          {Math.min(
                            ...vendorPricingComparison.map((v) => v.price),
                          )}
                        </ThemedText>
                      </View>
                      <View style={styles.statBadge}>
                        <Feather
                          name="trending-up"
                          size={8}
                          color={Colors.light.error}
                        />
                        <ThemedText
                          style={{
                            color: Colors.light.error,
                            fontSize: 7,
                            fontWeight: "700",
                          }}
                        >
                          HIGHEST: ₹
                          {Math.max(
                            ...vendorPricingComparison.map((v) => v.price),
                          )}
                        </ThemedText>
                      </View>
                    </View>
                  </View>

                  <View style={styles.allVendorPricingContainer}>
                    {vendorPricingComparison.map((comparison, index) => {
                      const minPrice = Math.min(
                        ...vendorPricingComparison.map((v) => v.price),
                      );
                      const maxPrice = Math.max(
                        ...vendorPricingComparison.map((v) => v.price),
                      );
                      const isCheapest = comparison.price === minPrice;
                      const isExpensive = comparison.price === maxPrice;
                      const savings = maxPrice - comparison.price;
                      const savingsPercent = (
                        (savings / maxPrice) *
                        100
                      ).toFixed(0);

                      return (
                        <Pressable
                          key={comparison.vendorId}
                          onPress={() =>
                            handleVendorComparisonSelect(
                              comparison.vendorId,
                              comparison.price,
                            )
                          }
                          style={[
                            styles.comprehensiveVendorCard,
                            selectedVendor === comparison.vendorId &&
                              styles.vendorPriceCardSelected,
                            {
                              backgroundColor:
                                selectedVendor === comparison.vendorId
                                  ? Colors.light.success + "15"
                                  : theme.backgroundDefault,
                              borderColor:
                                selectedVendor === comparison.vendorId
                                  ? Colors.light.success
                                  : theme.border,
                              borderLeftWidth: isCheapest ? 4 : 1,
                              borderLeftColor: isCheapest
                                ? Colors.light.success
                                : theme.border,
                            },
                          ]}
                        >
                          {/* Best Deal Badge */}
                          {isCheapest && (
                            <View style={styles.bestDealBadge}>
                              <Feather name="award" size={8} color="#FFFFFF" />
                              <ThemedText
                                style={{
                                  color: "#FFFFFF",
                                  fontSize: 7,
                                  fontWeight: "700",
                                }}
                              >
                                BEST DEAL
                              </ThemedText>
                            </View>
                          )}

                          {/* Most Expensive Badge */}
                          {isExpensive && (
                            <View style={styles.expensiveBadge}>
                              <Feather
                                name="alert-circle"
                                size={8}
                                color="#FFFFFF"
                              />
                              <ThemedText
                                style={{
                                  color: "#FFFFFF",
                                  fontSize: 7,
                                  fontWeight: "700",
                                }}
                              >
                                HIGHEST
                              </ThemedText>
                            </View>
                          )}

                          <View style={styles.comprehensiveVendorContent}>
                            {/* Vendor Name and Rating */}
                            <View style={styles.vendorHeader}>
                              <ThemedText
                                style={{
                                  color:
                                    selectedVendor === comparison.vendorId
                                      ? Colors.light.success
                                      : theme.text,
                                  fontWeight: "700",
                                  fontSize: 14,
                                }}
                              >
                                {comparison.vendorName}
                              </ThemedText>
                              <View style={styles.vendorRating}>
                                <Feather
                                  name="star"
                                  size={10}
                                  color={Colors.light.warning}
                                />
                                <ThemedText
                                  style={{
                                    color: theme.textSecondary,
                                    fontSize: 9,
                                    marginLeft: 2,
                                  }}
                                >
                                  4.{Math.floor(Math.random() * 3) + 5}
                                </ThemedText>
                              </View>
                            </View>

                            {/* Price Display */}
                            <View style={styles.priceDisplaySection}>
                              <View style={styles.priceMain}>
                                <ThemedText
                                  style={{
                                    color: isCheapest
                                      ? Colors.light.success
                                      : isExpensive
                                        ? Colors.light.error
                                        : Colors.light.primary,
                                    fontWeight: "900",
                                    fontSize: 20,
                                  }}
                                >
                                  ₹{comparison.price}
                                </ThemedText>
                                <ThemedText
                                  style={{
                                    color: theme.textSecondary,
                                    fontSize: 10,
                                  }}
                                >
                                  per {comparison.unit}
                                </ThemedText>
                              </View>

                              {/* Savings Indicator */}
                              {!isCheapest && savings > 0 && (
                                <View style={styles.savingsIndicator}>
                                  <ThemedText
                                    style={{
                                      color: Colors.light.error,
                                      fontSize: 8,
                                      fontWeight: "600",
                                    }}
                                  >
                                    +₹{savings} ({savingsPercent}%)
                                  </ThemedText>
                                </View>
                              )}
                            </View>

                            {/* Price Comparison Bar */}
                            <View style={styles.priceComparisonBar}>
                              <View style={styles.priceBarBackground}>
                                <View
                                  style={[
                                    styles.priceBarFill,
                                    {
                                      width: `${(comparison.price / maxPrice) * 100}%`,
                                      backgroundColor: isCheapest
                                        ? Colors.light.success
                                        : isExpensive
                                          ? Colors.light.error
                                          : Colors.light.primary,
                                    },
                                  ]}
                                />
                              </View>
                              <ThemedText
                                style={{
                                  color: theme.textSecondary,
                                  fontSize: 8,
                                  marginTop: 2,
                                }}
                              >
                                {((comparison.price / maxPrice) * 100).toFixed(
                                  0,
                                )}
                                % of highest price
                              </ThemedText>
                            </View>

                            {/* Vendor Details */}
                            <View style={styles.vendorDetails}>
                              <View style={styles.detailRow}>
                                <Feather
                                  name="truck"
                                  size={8}
                                  color={theme.textSecondary}
                                />
                                <ThemedText
                                  style={{
                                    color: theme.textSecondary,
                                    fontSize: 8,
                                    marginLeft: 4,
                                  }}
                                >
                                  2-3 days delivery
                                </ThemedText>
                              </View>
                              <View style={styles.detailRow}>
                                <Feather
                                  name="package"
                                  size={8}
                                  color={theme.textSecondary}
                                />
                                <ThemedText
                                  style={{
                                    color: theme.textSecondary,
                                    fontSize: 8,
                                    marginLeft: 4,
                                  }}
                                >
                                  In stock
                                </ThemedText>
                              </View>
                              <View style={styles.detailRow}>
                                <Feather
                                  name="shield"
                                  size={8}
                                  color={theme.textSecondary}
                                />
                                <ThemedText
                                  style={{
                                    color: theme.textSecondary,
                                    fontSize: 8,
                                    marginLeft: 4,
                                  }}
                                >
                                  Quality assured
                                </ThemedText>
                              </View>
                            </View>

                            {/* Selection Indicator */}
                            {selectedVendor === comparison.vendorId && (
                              <View style={styles.selectionIndicator}>
                                <Feather
                                  name="check-circle"
                                  size={20}
                                  color={Colors.light.success}
                                />
                                <ThemedText
                                  style={{
                                    color: Colors.light.success,
                                    fontSize: 9,
                                    fontWeight: "700",
                                    marginLeft: 4,
                                  }}
                                >
                                  SELECTED
                                </ThemedText>
                              </View>
                            )}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              <View style={styles.formRow}>
                <View
                  style={[
                    styles.formGroup,
                    { flex: 1, marginRight: Spacing.md },
                  ]}
                >
                  <ThemedText type="small" style={styles.formLabel}>
                    Quantity
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={quantity}
                    onChangeText={setQuantity}
                    placeholder="Enter quantity"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <ThemedText type="small" style={styles.formLabel}>
                    Total Cost
                  </ThemedText>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: theme.backgroundSecondary,
                        color: theme.text,
                        borderColor: theme.border,
                      },
                    ]}
                    value={totalCost || String(calculateTotal())}
                    onChangeText={setTotalCost}
                    placeholder="Auto-calculated"
                    placeholderTextColor={theme.textSecondary}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <ThemedText type="small" style={styles.formLabel}>
                  Payment Status
                </ThemedText>
                <View style={styles.statusToggle}>
                  <Pressable
                    onPress={() => setPaymentStatus("pending")}
                    style={[
                      styles.statusOption,
                      {
                        borderColor:
                          paymentStatus === "pending"
                            ? Colors.light.warning
                            : theme.border,
                      },
                      paymentStatus === "pending" && {
                        backgroundColor: Colors.light.warning + "15",
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color:
                          paymentStatus === "pending"
                            ? Colors.light.warning
                            : theme.text,
                        fontWeight: "500",
                      }}
                    >
                      Pending
                    </ThemedText>
                  </Pressable>
                  <Pressable
                    onPress={() => setPaymentStatus("paid")}
                    style={[
                      styles.statusOption,
                      {
                        borderColor:
                          paymentStatus === "paid"
                            ? Colors.light.success
                            : theme.border,
                      },
                      paymentStatus === "paid" && {
                        backgroundColor: Colors.light.success + "15",
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color:
                          paymentStatus === "paid"
                            ? Colors.light.success
                            : theme.text,
                        fontWeight: "500",
                      }}
                    >
                      Paid
                    </ThemedText>
                  </Pressable>
                </View>
              </View>

              <Button
                onPress={handleSaveOrder}
                style={{ marginTop: Spacing.lg }}
              >
                {editingOrder ? "Update Entry" : "Log Material"}
              </Button>
            </KeyboardAwareScrollViewCompat>
          </View>
        </View>
      </Modal>

      {/* Dropdown Modal Overlay */}
      {showDropdownOverlay && (
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => {
            setShowMaterialDropdown(false);
            setShowSiteDropdown(false);
            setShowVendorDropdown(false);
            setShowDropdownOverlay(false);
            clearDropdownTimer();
          }}
        >
          {/* Material Dropdown Modal */}
          {showMaterialDropdown && (
            <View style={styles.modalDropdown}>
              <View style={styles.modalDropdownHeader}>
                <ThemedText
                  type="small"
                  style={{ fontWeight: "600", color: "#666" }}
                >
                  Select Material
                </ThemedText>
              </View>
              {materialOptions.length > 0 ? (
                materialOptions.map((material) => (
                  <Pressable
                    key={material}
                    onPress={() => handleMaterialSelect(material)}
                    style={({ pressed }) => [
                      styles.modalDropdownOption,
                      pressed && { backgroundColor: "#f0f0f0" },
                    ]}
                  >
                    <ThemedText type="small" style={{ color: "#333" }}>
                      {material}
                    </ThemedText>
                  </Pressable>
                ))
              ) : (
                <View style={styles.modalDropdownOption}>
                  <ThemedText type="small" style={{ color: "#999" }}>
                    No materials available
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Site Dropdown Modal */}
          {showSiteDropdown && (
            <View style={styles.modalDropdown}>
              <View style={styles.modalDropdownHeader}>
                <ThemedText
                  type="small"
                  style={{ fontWeight: "600", color: "#666" }}
                >
                  Select Site
                </ThemedText>
              </View>
              {siteOptions.length > 0 ? (
                siteOptions.map((site) => (
                  <Pressable
                    key={site}
                    onPress={() => handleSiteSelect(site)}
                    style={({ pressed }) => [
                      styles.modalDropdownOption,
                      pressed && { backgroundColor: "#f0f0f0" },
                    ]}
                  >
                    <ThemedText type="small" style={{ color: "#333" }}>
                      {site}
                    </ThemedText>
                  </Pressable>
                ))
              ) : (
                <View style={styles.modalDropdownOption}>
                  <ThemedText type="small" style={{ color: "#999" }}>
                    No sites available
                  </ThemedText>
                </View>
              )}
            </View>
          )}

          {/* Vendor Dropdown Modal */}
          {showVendorDropdown && (
            <View style={styles.modalDropdown}>
              <View style={styles.modalDropdownHeader}>
                <ThemedText
                  type="small"
                  style={{ fontWeight: "600", color: "#666" }}
                >
                  Select Vendor
                </ThemedText>
              </View>
              {supplierOptions.length > 0 ? (
                supplierOptions.map((vendor) => (
                  <Pressable
                    key={vendor}
                    onPress={() => handleVendorSelect(vendor)}
                    style={({ pressed }) => [
                      styles.modalDropdownOption,
                      pressed && { backgroundColor: "#f0f0f0" },
                    ]}
                  >
                    <ThemedText type="small" style={{ color: "#333" }}>
                      {vendor}
                    </ThemedText>
                  </Pressable>
                ))
              ) : (
                <View style={styles.modalDropdownOption}>
                  <ThemedText type="small" style={{ color: "#999" }}>
                    No vendors available
                  </ThemedText>
                </View>
              )}
            </View>
          )}
        </Pressable>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  statusFilterRow: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  statusFilterOption: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    ...Shadows.sm,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  headerIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerInfo: {
    flex: 1,
    marginLeft: Spacing.md,
  },
  totalsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.sm,
  },
  totalCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    borderWidth: 1,
    borderColor: "#EAECEF",
  },
  totalIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.light.primary + "15",
    alignItems: "center",
    justifyContent: "center",
  },
  totalInfo: {
    flex: 1,
  },
  summaryFooter: {
    marginTop: Spacing.lg,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  summaryHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
  },
  statDivider: {
    width: 1,
    height: "100%",
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
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
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: Spacing.sm,
    zIndex: 100,
    position: "relative",
  },
  filterTab: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginRight: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  filterTabActive: {
    backgroundColor: Colors.light.primary + "10",
  },
  filterCount: {
    marginLeft: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  tableRow: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    ...Shadows.sm,
  },
  rowMain: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dateCell: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.md,
  },
  materialCell: {
    flex: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  qtyCell: {
    alignItems: "flex-end",
    marginRight: Spacing.lg,
  },
  costCell: {
    minWidth: 70,
    alignItems: "flex-end",
  },
  rowFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  supplierTag: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowBadges: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockBar: {
    height: 3,
    borderRadius: 2,
    marginTop: Spacing.sm,
    overflow: "hidden",
  },
  stockFill: {
    height: "100%",
    borderRadius: 2,
  },
  fab: {
    position: "absolute",
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
    ...Shadows.md,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["2xl"] * 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  modalForm: {
    padding: Spacing.lg,
  },
  formGroup: {
    marginBottom: Spacing.md,
  },
  formLabel: {
    marginBottom: Spacing.xs,
    fontWeight: "500",
  },
  formRow: {
    flexDirection: "row",
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  selectChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.sm,
  },
  statusToggle: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  statusOption: {
    flex: 1,
    paddingVertical: Spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderRadius: BorderRadius.md,
  },
  filterContainer: {
    position: "relative",
    marginRight: Spacing.md,
    zIndex: 100,
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    zIndex: 99999,
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    backgroundColor: "white",
    minWidth: 150,
    maxHeight: 200,
  },
  dropdownItem: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  simpleDropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderRadius: 8,
    marginTop: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
    zIndex: 9999,
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 99999,
    justifyContent: "center",
    alignItems: "center",
  },
  modalDropdown: {
    backgroundColor: "white",
    borderRadius: 12,
    width: "80%",
    maxWidth: 300,
    maxHeight: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 15,
  },
  modalDropdownHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    backgroundColor: "#fafafa",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  modalDropdownOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
    backgroundColor: "white",
  },
  materialCategory: {
    marginBottom: Spacing.md,
  },
  categoryLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  materialChip: {
    minHeight: 60,
    minWidth: 120,
    marginRight: Spacing.sm,
  },
  dropdownInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minHeight: 44,
  },
  dropdownList: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginTop: Spacing.xs,
    maxHeight: 150,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },

  vendorComparisonItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 60,
  },
  // New card-based styles for improved material selection
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  categoryCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
  },
  categoryCardSelected: {
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  variantScroll: {
    marginTop: Spacing.xs,
  },
  variantContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  variantCard: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 120,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
  },
  variantCardWithPricing: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    minWidth: 140,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 90,
  },
  variantCardSelected: {
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  variantContent: {
    alignItems: "center",
  },
  pricingPreview: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 4,
    marginBottom: 4,
  },
  pricePreviewItem: {
    alignItems: "center",
    flex: 1,
  },
  // Ultimate best-in-class styles
  materialHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  sortOptions: {
    flexDirection: "row",
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  ultimateVariantCard: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    minWidth: 160,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 140,
    position: "relative",
    marginHorizontal: Spacing.xs,
  },
  ultimateVariantCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  ultimateVariantContent: {
    alignItems: "center",
    width: "100%",
  },
  bestPriceBadge: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 1,
  },
  priceRangeContainer: {
    alignItems: "center",
    marginVertical: 6,
  },
  priceRangeBar: {
    width: "80%",
    height: 3,
    backgroundColor: "#E5E5E5",
    borderRadius: 2,
    marginBottom: 4,
  },
  priceRangeFill: {
    height: "100%",
    borderRadius: 2,
  },
  bestVendorHighlight: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.warning + "15",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginBottom: 6,
  },
  vendorOptions: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginBottom: 6,
  },
  vendorChip: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    borderWidth: 0.5,
    borderColor: "#E0E0E0",
  },
  cheapestVendorChip: {
    backgroundColor: Colors.light.success,
    borderColor: Colors.light.success,
  },
  moreVendorsChip: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  availabilityIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  availabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  // Revolutionary Immersive 3D Interface Styles
  immersiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  aiBadge: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  headerControls: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  controlButton: {
    backgroundColor: Colors.light.primary + "15",
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  immersiveScroll: {
    marginTop: Spacing.xs,
  },
  immersiveContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  immersiveCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    minWidth: 180,
    minHeight: 200,
    padding: Spacing.sm,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  immersiveCardSelected: {
    borderColor: "rgba(255,255,255,0.4)",
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  holographicGlow: {
    position: "absolute",
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    borderRadius: 100,
    opacity: 0,
  },
  glowActive: {
    opacity: 1,
  },
  aiRecommendation: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#FF6B6B",
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 2,
    shadowColor: "#FF6B6B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  immersiveContent: {
    alignItems: "center",
    width: "100%",
    gap: Spacing.xs,
  },
  materialName3D: {
    alignItems: "center",
  },
  priceIntelligencePanel: {
    alignItems: "center",
    gap: Spacing.xs,
  },

  savingsCalculator: {
    alignItems: "center",
    gap: 2,
  },
  savingsBadge: {
    backgroundColor: "#10B981" + "20",
    borderRadius: BorderRadius.xs,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  vendorAnalyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-around",
    width: "100%",
    gap: Spacing.xs,
  },
  vendorAnalyticsChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    alignItems: "center",
    minWidth: 35,
    gap: 2,
  },
  cheapestAnalytics: {
    backgroundColor: "#10B981",
  },
  expensiveAnalytics: {
    backgroundColor: "#EF4444",
  },
  vendorPriceBar: {
    width: "100%",
    height: 2,
    backgroundColor: "#E5E7EB",
    borderRadius: 1,
    marginBottom: 2,
  },
  vendorPriceFill: {
    height: "100%",
    borderRadius: 1,
  },
  moreAnalyticsChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: BorderRadius.sm,
    padding: Spacing.xs,
    alignItems: "center",
    minWidth: 20,
  },
  marketIntelligence: {
    alignItems: "center",
    gap: 4,
    marginTop: Spacing.xs,
  },
  intelligenceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quickActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  quickActionBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  // Comprehensive Vendor Pricing Styles
  vendorComparisonHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  pricingStats: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
    gap: 2,
  },
  allVendorPricingContainer: {
    gap: Spacing.sm,
  },
  comprehensiveVendorCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    padding: Spacing.md,
    position: "relative",
    minHeight: 140,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  bestDealBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.light.success,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 2,
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  expensiveBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: Colors.light.error,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 2,
    shadowColor: Colors.light.error,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  comprehensiveVendorContent: {
    gap: Spacing.sm,
  },
  vendorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  vendorRating: {
    flexDirection: "row",
    alignItems: "center",
  },
  priceDisplaySection: {
    alignItems: "center",
  },
  priceMain: {
    alignItems: "center",
    gap: 2,
  },
  savingsIndicator: {
    marginTop: 4,
  },
  priceComparisonBar: {
    alignItems: "center",
  },
  priceBarBackground: {
    width: "100%",
    height: 6,
    backgroundColor: "#E5E7EB",
    borderRadius: 3,
    overflow: "hidden",
  },
  priceBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  vendorDetails: {
    gap: 4,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectionIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.xs,
  },
  // Simplified Material Selection Styles
  simpleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  simpleScroll: {
    marginTop: Spacing.xs,
  },
  simpleContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  simpleCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    minWidth: 160,
    minHeight: 140,
    padding: Spacing.sm,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  simpleCardSelected: {
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  simpleContent: {
    alignItems: "center",
    width: "100%",
    gap: Spacing.sm,
  },
  materialNameSection: {
    alignItems: "center",
  },
  materialDetails: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  variantBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary + "15",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.xs,
  },
  variantIndicator: {
    alignItems: "center",
  },
  // Attractive Material Selection Styles
  attractiveHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },

  headerBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.light.primary + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  attractiveScroll: {
    marginTop: Spacing.sm,
  },
  attractiveContainer: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xs,
  },
  attractiveCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minWidth: 180,
    minHeight: 160,
    padding: Spacing.md,
    position: "relative",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  attractiveCardSelected: {
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  selectionIndicatorTop: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: Colors.light.success,
    borderRadius: BorderRadius.full,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  attractiveContent: {
    alignItems: "center",
    width: "100%",
    gap: Spacing.sm,
  },
  materialIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.light.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  attractiveMaterialName: {
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  vendorCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.lg,
    gap: Spacing.xs,
  },
  availabilityStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },

  priceSection: {
    alignItems: "center",
  },
  vendorInfoSection: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  vendorHighlight: {
    backgroundColor: Colors.light.warning + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
  },
  // Quantum AI Material Explorer Styles
  ultimateAIHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  aiHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quantumAIBadge: {
    backgroundColor: Colors.light.primary,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  liveAnalysisBadge: {
    backgroundColor: Colors.light.success,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  pulsing: {
    opacity: 0.5,
  },
  aiHeaderControls: {
    flexDirection: "row",
    gap: Spacing.xs,
  },
  aiControlButton: {
    backgroundColor: Colors.light.primary + "15",
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  aiInsightsPanel: {
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  insightCard: {
    backgroundColor: "#F5F5F5",
    borderRadius: BorderRadius.sm,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  quantumScroll: {
    marginTop: Spacing.xs,
  },
  quantumContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xs,
  },
  quantumCard: {
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    minWidth: 200,
    minHeight: 220,
    padding: Spacing.sm,
    position: "relative",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  quantumCardSelected: {
    borderColor: Colors.light.primary,
    shadowColor: Colors.light.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 16,
  },
  quantumGlow: {
    position: "absolute",
    top: -30,
    left: -30,
    right: -30,
    bottom: -30,
    borderRadius: 60,
    backgroundColor: Colors.light.primary + "10",
    opacity: 0,
  },
  quantumGlowActive: {
    opacity: 1,
  },
  confidenceScore: {
    position: "absolute",
    top: 8,
    right: 8,
    alignItems: "center",
  },
  confidenceRing: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ultimateAIBadge: {
    position: "absolute",
    top: -6,
    left: -6,
    backgroundColor: Colors.light.success,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    zIndex: 2,
  },
  quantumContent: {
    alignItems: "center",
    width: "100%",
    gap: Spacing.sm,
  },
  quantumMaterialName: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: Colors.light.primary + "15",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.xs,
  },
  quantumPriceIntelligence: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  currentPrice: {
    alignItems: "center",
  },
  futurePrediction: {
    alignItems: "center",
  },
  aiAnalyticsDashboard: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    gap: Spacing.sm,
  },
  analyticMetric: {
    alignItems: "center",
    gap: 4,
  },
  metricCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  smartRecommendation: {
    alignItems: "center",
  },
  recommendationText: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.light.success + "15",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  quantumVendorIntelligence: {
    alignItems: "center",
    gap: Spacing.sm,
  },

  vendorHeatmap: {
    flexDirection: "row",
    gap: 4,
  },
  heatDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  heatHigh: {
    backgroundColor: Colors.light.success,
  },
  heatLow: {
    backgroundColor: Colors.light.error,
  },
  aiActionButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  aiActionButton: {
    backgroundColor: "#F5F5F5",
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  vendorComparisonContainer: {
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  vendorPriceCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    padding: Spacing.md,
    minHeight: 70,
  },
  vendorPriceCardSelected: {
    shadowColor: Colors.light.success,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  vendorPriceContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  vendorInfo: {
    flex: 1,
  },
  priceInfo: {
    alignItems: "flex-end",
  },
  selectedIndicator: {
    marginLeft: Spacing.sm,
  },
});
