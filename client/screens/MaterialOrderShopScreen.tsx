import {
  collection,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { getDoc } from "firebase/firestore";

import React, { useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  Pressable,
  TextInput,
  Modal,
  Alert,
  ScrollView,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Button } from "@/components/Button";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/context/AuthContext";
import { useData } from "@/context/DataContext";
import { MaterialCategory, Vendor, VendorMaterial } from "@/types";
import { Spacing, BorderRadius, Colors, Shadows } from "@/constants/theme";
import { apiRequest } from "@/lib/query-client";
import { useWindowDimensions, Platform } from "react-native";

type CartItem = {
  id: string;
  catalogItem: CatalogItem;
  vendorId: string;
  vendorName: string;
  unitPrice: number;
  unit: string;
  quantity: number;
  totalCost: number;
};

type VendorCartGroup = {
  vendorId: string;
  vendorName: string;
  items: CartItem[];
  subtotal: number;
};

type CatalogItem = {
  key: string;
  name: string;
  category: MaterialCategory;
  minPrice: number;
  unit: string;
  vendors: {
    vendorId: string;
    vendorName: string;
    unitPrice: number;
    unit: string;
  }[];
};

export default function MaterialOrderShopScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { user } = useAuth();
  const { vendors, clients, materials, addMaterialOrder, addNotification } =
    useData();
const { width } = useWindowDimensions();

const getColumns = () => {
  if (Platform.OS === "web") {
    if (width >= 1400) return 5;
    if (width >= 1100) return 4;
    if (width >= 800) return 3;
    return 2;
  }
  return width >= 700 ? 3 : 2;
};

  const canOrder = user?.role === "admin" || user?.role === "engineer";

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    MaterialCategory | "all"
  >("all");
  const [sortOption, setSortOption] = useState<
    "relevance" | "price_low_high" | "price_high_low" | "name"
  >("relevance");

  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);

  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [checkoutMode, setCheckoutMode] = useState<"buy" | "cart">("buy");
  const [checkoutPaymentStatus, setCheckoutPaymentStatus] = useState<
    "paid" | "pending"
  >("pending");
  const [cartPaymentStatus, setCartPaymentStatus] = useState<
    "paid" | "pending"
  >("pending");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);

  const resetCheckout = () => {
    setSelectedVendorId("");
    setSelectedClientId("");
    setQuantity("");
    setCheckoutPaymentStatus("pending");
  };

  const vendorMaterialCatalog = useMemo(() => {
    const map = new Map<string, CatalogItem>();

    (vendors || []).forEach((v: Vendor) => {
      (v.materials || []).forEach((m: VendorMaterial) => {
        const key = `${m.category}__${m.name}`;
        const existing = map.get(key);

        const entryVendor = {
          vendorId: v.id,
          vendorName: v.name,
          unitPrice: m.unitPrice,
          unit: m.unit,
        };

        if (!existing) {
          map.set(key, {
            key,
            name: m.name,
            category: m.category,
            minPrice: m.unitPrice,
            unit: m.unit,
            vendors: [entryVendor],
          });
        } else {
          existing.vendors.push(entryVendor);
          existing.minPrice = Math.min(existing.minPrice, m.unitPrice);
          if (m.unit && existing.unit !== m.unit) {
            existing.unit = m.unit;
          }
        }
      });
    });

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        vendors: item.vendors.sort((a, b) => a.unitPrice - b.unitPrice),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [vendors]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = vendorMaterialCatalog.filter((item) => {
      const matchesQuery = !q || item.name.toLowerCase().includes(q);
      const matchesCategory =
        selectedCategory === "all" || item.category === selectedCategory;
      return matchesQuery && matchesCategory;
    });
    if (sortOption === "price_low_high")
      return [...list].sort((a, b) => a.minPrice - b.minPrice);
    if (sortOption === "price_high_low")
      return [...list].sort((a, b) => b.minPrice - a.minPrice);
    if (sortOption === "name")
      return [...list].sort((a, b) => a.name.localeCompare(b.name));
    return list;
  }, [vendorMaterialCatalog, search, selectedCategory, sortOption]);

  const categoryOptions = useMemo(() => {
    const set = new Set<MaterialCategory>();
    vendorMaterialCatalog.forEach((i) => set.add(i.category));
    return Array.from(set.values()).sort();
  }, [vendorMaterialCatalog]);

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      steel: "Steel",
      m_sand: "M-Sand",
      p_sand: "P-Sand",
      cement: "Cement",
      aggregate: "Aggregate",
      bricks: "Bricks",
      tiles: "Tiles",
      electrical: "Electrical",
      plumbing: "Plumbing",
      paint: "Paint",
      other: "Other",
    };
    return labels[category] || category;
  };

  const categoryGradients: Record<string, [string, string]> = {
    steel: ["#6366F1", "#818CF8"],
    m_sand: ["#F59E0B", "#FBBF24"],
    p_sand: ["#F59E0B", "#FBBF24"],
    cement: ["#64748B", "#94A3B8"],
    aggregate: ["#8B5CF6", "#A78BFA"],
    bricks: ["#EF4444", "#F87171"],
    tiles: ["#14B8A6", "#2DD4BF"],
    electrical: ["#3B82F6", "#60A5FA"],
    plumbing: ["#06B6D4", "#22D3EE"],
    paint: ["#EC4899", "#F472B6"],
    other: ["#64748B", "#94A3B8"],
  };

  const getCategoryIcon = (category: string): keyof typeof Feather.glyphMap => {
    const icons: Record<string, keyof typeof Feather.glyphMap> = {
      steel: "tool",
      m_sand: "layers",
      p_sand: "layers",
      cement: "box",
      aggregate: "grid",
      bricks: "square",
      tiles: "layout",
      electrical: "zap",
      plumbing: "droplet",
      paint: "edit-3",
      other: "package",
    };
    return icons[category] || "package";
  };

  const resetCartStatus = () => {
    setCartPaymentStatus("pending");
  };

  const getVendorName = (vendorId: string): string => {
    const v = (vendors || []).find((v) => v.id === vendorId);
    return v?.name || "";
  };

  const getClientName = (clientId: string): string => {
    const client = clients.find((c) => c.id === clientId);
    return client?.projectName || "";
  };

  const openCheckout = (
    item: CatalogItem,
    opts?: { vendorId?: string; mode?: "buy" | "cart" },
  ) => {
    if (!canOrder) {
      Alert.alert(
        "Not Allowed",
        "Only Admin/Engineer can place material orders.",
      );
      return;
    }

    setSelectedItem(item);
    setShowCheckout(true);
    resetCheckout();
    const initialVendorId = opts?.vendorId || item.vendors[0]?.vendorId;
    if (initialVendorId) setSelectedVendorId(initialVendorId);
    if (clients[0]) {
      setSelectedClientId(clients[0].id);
    }
    setCheckoutMode(opts?.mode || "buy");
  };

  const getMaterialIdForCategory = (category: MaterialCategory) => {
    const lookup: Partial<Record<MaterialCategory, string>> = {
      cement: "Cement",
      steel: "Steel Bars",
      bricks: "Bricks",
      m_sand: "Sand",
      p_sand: "Sand",
      aggregate: "Aggregate",
      tiles: "Tiles",
    };

    const name = lookup[category];
    if (name) {
      const found = (materials || []).find((m) => m.name === name);
      if (found) return found.id;
    }

    return (materials || [])[0]?.id || "1";
  };

  const unitPrice = useMemo(() => {
    if (!selectedItem || !selectedVendorId) return 0;
    const v = selectedItem.vendors.find((x) => x.vendorId === selectedVendorId);
    return v?.unitPrice || selectedItem.minPrice || 0;
  }, [selectedItem, selectedVendorId]);

  const totalCost = useMemo(() => {
    const qty = parseInt(quantity || "0", 10);
    if (!qty || qty <= 0) return 0;
    return unitPrice * qty;
  }, [unitPrice, quantity]);

  // Send notification to vendor about the new order via WhatsApp
  const sendVendorNotification = async (orderDetails: {
    vendorId: string;
    materialName: string;
    quantity: number;
    unit: string;
    totalCost: number;
    clientId: string;
    orderDate: string;
  }) => {
    try {
      const vendor = (vendors || []).find(
        (v) => v.id === orderDetails.vendorId,
      );
      const client = (clients || []).find(
        (c) => c.id === orderDetails.clientId,
      );

      if (!vendor?.phone) {
        console.log("No phone number found for vendor notification");
        return;
      }

      // Format phone number (remove spaces, dashes and ensure country code)
      let phoneNumber = vendor.phone.replace(/[\s-]/g, "");
      if (phoneNumber.startsWith("0")) {
        phoneNumber = "91" + phoneNumber.substring(1);
      } else if (
        !phoneNumber.startsWith("+") &&
        !phoneNumber.startsWith("91")
      ) {
        phoneNumber = "91" + phoneNumber;
      }
      phoneNumber = phoneNumber.replace("+", "");

      // Create WhatsApp message
      const message = `🔔 *New Material Order*

📦 *Material:* ${orderDetails.materialName}
📊 *Quantity:* ${orderDetails.quantity} ${orderDetails.unit}
💰 *Total Amount:* ₹${orderDetails.totalCost.toLocaleString("en-IN")}
🏗️ *Project:* ${client?.projectName || "N/A"}
📅 *Order Date:* ${orderDetails.orderDate}

Please confirm the order and arrange for delivery.

Thank you! 🙏`;

      // Encode message for URL
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `whatsapp://send?phone=${phoneNumber}&text=${encodedMessage}`;

      // Check if WhatsApp can be opened
      const canOpen = await Linking.canOpenURL(whatsappUrl);

      if (canOpen) {
        Alert.alert(
          "Send Order to Vendor",
          `Send order details to ${vendor.name} via WhatsApp?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Open WhatsApp",
              onPress: () => Linking.openURL(whatsappUrl),
            },
          ],
        );
      } else {
        // Fallback to SMS if WhatsApp is not available
        const smsMessage = `New Order: ${orderDetails.materialName}, Qty: ${orderDetails.quantity} ${orderDetails.unit}, Total: ₹${orderDetails.totalCost.toLocaleString("en-IN")}, Project: ${client?.projectName || "N/A"}`;
        const smsUrl = `sms:${vendor.phone}?body=${encodeURIComponent(smsMessage)}`;

        Alert.alert(
          "WhatsApp Not Available",
          `Would you like to send SMS to ${vendor.name} instead?`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Send SMS",
              onPress: () => Linking.openURL(smsUrl),
            },
          ],
        );
      }
    } catch (error) {
      console.log("Vendor notification error:", error);
    }
  };



const saveCartItemToFirestore = async (item: CartItem) => {
  const ref = doc(db, "cart_orders", `${user!.id}_${item.id}`);

  await setDoc(ref, {
    userId: user!.id,
    clientId: selectedClientId,
    vendorId: item.vendorId,
    materialKey: item.catalogItem.key,
    materialName: item.catalogItem.name,
    quantity: item.quantity,
    unit: item.unit,
    unitPrice: item.unitPrice,
    totalCost: item.totalCost,
    status: "placed",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

// ============================================
// KEY MODIFICATIONS FOR FIRESTORE INTEGRATION
// ============================================

// 1. UPDATE THE handlePlaceOrder FUNCTION
// Replace the existing handlePlaceOrder function with this:

const handlePlaceOrder = async () => {
  const qty = parseInt(quantity, 10);
  if (
    !selectedItem ||
    !selectedClientId ||
    !selectedVendorId ||
    !quantity ||
    !qty ||
    qty <= 0
  ) {
    Alert.alert(
      "Missing Fields",
      "Please select Site, Vendor and enter quantity.",
    );
    return;
  }

  if (!user || !user.id) {
    Alert.alert("Error", "User not authenticated. Please login again.");
    return;
  }

  const status = checkoutPaymentStatus;
  const orderDate = new Date().toISOString().split("T")[0];
  const vendor = (vendors || []).find((v) => v.id === selectedVendorId);
  const client = (clients || []).find((c) => c.id === selectedClientId);
  const materialId = getMaterialIdForCategory(selectedItem.category);

  try {
    const orderId = `mo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Save order directly to Firestore
    const orderRef = doc(db, "material_orders", orderId);
    
    console.log("🔥 Saving order to Firestore:", orderId);

    await setDoc(orderRef, {
      id: orderId,
      userId: user.id,
      userName: user.name || 'Unknown',
      userRole: user.role || 'unknown',
      date: orderDate,
      clientId: selectedClientId,
      clientName: client?.projectName || 'Unknown Project',
      supplierId: selectedVendorId,
      supplierName: vendor?.name || 'Unknown Vendor',
      materialId,
      materialName: selectedItem.name,
      category: selectedItem.category,
      quantity: qty,
      unit: selectedItem.unit,
      unitPrice,
      totalCost,
      paymentStatus: status,
      orderStatus: 'placed',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
// 🔍 VERIFY FIRESTORE WRITE
const snap = await getDoc(orderRef);

if (!snap.exists()) {
  console.error("❌ Firestore write FAILED for", orderId);
  Alert.alert("Error", "Order was NOT saved in Firestore");
  return;
}

console.log("✅ Firestore document saved:", snap.data());

    console.log("✅ Order saved successfully:", orderId);

    // Create in-app notification for vendor (only if addNotification is defined)
    if (typeof addNotification === 'function') {
      await addNotification({
        id: `notif_${Date.now()}`,
        type: "order",
        title: "🔔 New Material Order",
        message: `Order received: ${selectedItem.name} - ${qty} ${selectedItem.unit} | Total: ₹${totalCost.toLocaleString("en-IN")} | Project: ${client?.projectName || "N/A"}`,
        timestamp: new Date().toISOString(),
        read: false,
        recipientRole: "vendor",
        recipientId: selectedVendorId,
        data: {
          orderId,
          materialName: selectedItem.name,
          quantity: qty,
          unit: selectedItem.unit,
          totalCost,
          projectName: client?.projectName,
          vendorName: vendor?.name,
        },
      });

      // Create in-app notification for admin/engineer
      await addNotification({
        id: `notif_admin_${Date.now()}`,
        type: "order",
        title: "✅ Order Placed Successfully",
        message: `${selectedItem.name} - ${qty} ${selectedItem.unit} ordered from ${vendor?.name || "Vendor"} | Total: ₹${totalCost.toLocaleString("en-IN")} | Project: ${client?.projectName || "N/A"}`,
        timestamp: new Date().toISOString(),
        read: false,
        recipientRole: "admin",
        data: {
          orderId,
          materialName: selectedItem.name,
          quantity: qty,
          unit: selectedItem.unit,
          totalCost,
          projectName: client?.projectName,
          vendorName: vendor?.name,
        },
      });
    }

    // Send WhatsApp/SMS notification to vendor
    await sendVendorNotification({
      vendorId: selectedVendorId,
      materialName: selectedItem.name,
      quantity: qty,
      unit: selectedItem.unit,
      totalCost,
      clientId: selectedClientId,
      orderDate,
    });

    // Close modal and show success
    setShowCheckout(false);
    resetCheckout();
    
    Alert.alert(
      "✅ Order Placed",
      `Order #${orderId.slice(-8)} has been placed successfully!\n\nStatus: ${status.toUpperCase()}\nVendor has been notified.`,
    );
  } catch (error: any) {
    console.error("❌ Error placing order:", error);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    
    Alert.alert(
      "Error", 
      `Failed to place order: ${error?.message || 'Unknown error'}. Please check Firebase permissions.`
    );
  }
};

// ============================================
// 2. UPDATE THE placeVendorGroupOrders FUNCTION
// Replace the existing placeVendorGroupOrders function with this:

const placeVendorGroupOrders = async (vendorGroup: VendorCartGroup) => {
  console.log("=== Starting placeVendorGroupOrders ===");
  
  if (!selectedClientId) {
    Alert.alert("Missing Site", "Please select a site/client.");
    return;
  }

  if (!user || !user.id) {
    Alert.alert("Error", "User not authenticated. Please login again.");
    return;
  }

  const status = cartPaymentStatus;
  const orderDate = new Date().toISOString().split("T")[0];
  const client = (clients || []).find((c) => c.id === selectedClientId);

  try {
    const orderItems: {
      orderId: string;
      materialName: string;
      quantity: number;
      unit: string;
      totalCost: number;
    }[] = [];

    console.log("Processing", vendorGroup.items.length, "items");

    // Process all items in the vendor group
    for (const item of vendorGroup.items) {
      const materialId = getMaterialIdForCategory(item.catalogItem.category);
      const orderId = `mo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      console.log("🔥 Creating order:", orderId);

      // Save order directly to Firestore
      const orderRef = doc(db, "material_orders", orderId);

      await setDoc(orderRef, {
        id: orderId,
        userId: user.id,
        userName: user.name || 'Unknown',
        userRole: user.role || 'unknown',
        date: orderDate,
        clientId: selectedClientId,
        clientName: client?.projectName || 'Unknown Project',
        supplierId: item.vendorId,
        supplierName: vendorGroup.vendorName,
        materialId,
        materialName: item.catalogItem.name,
        category: item.catalogItem.category,
        quantity: item.quantity,
        unit: item.unit,
        unitPrice: item.unitPrice,
        totalCost: item.totalCost,
        paymentStatus: status,
        orderStatus: 'placed',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      console.log("✅ Order saved:", orderId);

      orderItems.push({
        orderId,
        materialName: item.catalogItem.name,
        quantity: item.quantity,
        unit: item.unit,
        totalCost: item.totalCost,
      });

      // Small delay to avoid timestamp conflicts
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log("All orders saved. Creating notifications...");

    // Create notifications (only if addNotification is defined)
    if (typeof addNotification === 'function') {
      const combinedMaterialNames = orderItems
        .map((i) => `${i.materialName} (${i.quantity} ${i.unit})`)
        .join(", ");
      
      await addNotification({
        id: `notif_${Date.now()}`,
        type: "order",
        title: "🔔 New Material Order",
        message: `Order received: ${combinedMaterialNames} | Total: ₹${vendorGroup.subtotal.toLocaleString("en-IN")} | Project: ${client?.projectName || "N/A"}`,
        timestamp: new Date().toISOString(),
        read: false,
        recipientRole: "vendor",
        recipientId: vendorGroup.vendorId,
        data: {
          orderIds: orderItems.map(i => i.orderId),
          materialNames: combinedMaterialNames,
          totalCost: vendorGroup.subtotal,
          projectName: client?.projectName,
          vendorName: vendorGroup.vendorName,
          itemCount: vendorGroup.items.length,
        },
      });

      await addNotification({
        id: `notif_admin_${Date.now()}`,
        type: "order",
        title: "✅ Orders Placed Successfully",
        message: `${vendorGroup.items.length} item(s) ordered from ${vendorGroup.vendorName} | Total: ₹${vendorGroup.subtotal.toLocaleString("en-IN")} | Project: ${client?.projectName || "N/A"}`,
        timestamp: new Date().toISOString(),
        read: false,
        recipientRole: "admin",
        data: {
          orderIds: orderItems.map(i => i.orderId),
          materialNames: combinedMaterialNames,
          totalCost: vendorGroup.subtotal,
          projectName: client?.projectName,
          vendorName: vendorGroup.vendorName,
          itemCount: vendorGroup.items.length,
        },
      });
    }

    // Send WhatsApp notification to vendor
    await sendVendorNotification({
      vendorId: vendorGroup.vendorId,
      materialName: orderItems.map((i) => `${i.materialName} (${i.quantity} ${i.unit})`).join(", "),
      quantity: orderItems.reduce((sum, i) => sum + i.quantity, 0),
      unit: "items",
      totalCost: vendorGroup.subtotal,
      clientId: selectedClientId,
      orderDate,
    });

    // Close modals and reset state
    setShowCart(false);
    clearCart();
    resetCartStatus();
    
    Alert.alert(
      "✅ Orders Placed",
      `${vendorGroup.items.length} order(s) placed successfully!\n\nStatus: ${status.toUpperCase()}\nTotal: ₹${vendorGroup.subtotal.toLocaleString("en-IN")}\n\nVendor has been notified.`,
    );
    
    console.log("=== Order placement complete ===");
  } catch (error: any) {
    console.error("❌ Error placing orders:", error);
    console.error("Error code:", error?.code);
    console.error("Error message:", error?.message);
    
    Alert.alert(
      "Error", 
      `Failed to place orders: ${error?.message || 'Unknown error'}. Please check Firebase permissions.`
    );
  }
};





  // Cart functions (simplified for now)
  const addToCart = (item: CatalogItem, vendorId: string) => {
    // Open the same options as material press (checkout), but in cart mode
    openCheckout(item, { vendorId, mode: "cart" });
  };

  const getCartItemCount = () =>
    cart.reduce((sum, item) => sum + item.quantity, 0);

  const clearCart = () => {
    setCart([]);
  };

  const getVendorGroups = () => {
    const groups: {
      vendorId: string;
      vendorName: string;
      subtotal: number;
      items: {
        id: string;
        catalogItem: {
          name: string;
        };
        unitPrice: number;
        unit: string;
      }[];
    }[] = [];

    // Group cart items by vendor
    const vendorMap = new Map();

    cart.forEach((item) => {
      if (!vendorMap.has(item.vendorId)) {
        vendorMap.set(item.vendorId, {
          vendorId: item.vendorId,
          vendorName: getVendorName(item.vendorId),
          subtotal: 0,
          items: [],
        });
      }

      const group = vendorMap.get(item.vendorId);
      group.subtotal += item.unitPrice * item.quantity;
      group.items.push(item);
    });

    return Array.from(vendorMap.values());
  };

  const updateCartQuantity = (itemId: string, quantity: number) => {
    setCart((prev) => {
      const next = prev
        .map((ci) =>
          ci.id === itemId
            ? {
                ...ci,
                quantity: Math.max(0, quantity),
                totalCost: Math.max(0, quantity) * ci.unitPrice,
              }
            : ci,
        )
        .filter((ci) => ci.quantity > 0);
      return next;
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((ci) => ci.id !== itemId));
  };

  const getCartTotal = () =>
    cart.reduce((sum, item) => sum + item.totalCost, 0);

  const handleVendorPayLater = (vendorGroup: VendorCartGroup) => {
    placeVendorGroupOrders(vendorGroup);
  };

  const renderProduct = ({ item }: { item: CatalogItem }) => {
    const gradient =
      categoryGradients[item.category] || categoryGradients.other;
    const icon = getCategoryIcon(item.category);

    return (
      <View style={styles.productCardContainer}>
        <Pressable
          onPress={() => openCheckout(item)}
          style={({ pressed }) => [
            styles.productCard,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
              opacity: pressed ? 0.85 : 1,
            },
            Shadows.md,
          ]}
        >
          <LinearGradient colors={gradient} style={styles.productIcon}>
            <Feather name={icon} size={14} color="#FFFFFF" />
          </LinearGradient>

          <ThemedText type="body" style={styles.productName} numberOfLines={2}>
            {item.name}
          </ThemedText>

          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: gradient[0] + "15" },
            ]}
          >
            <ThemedText
              type="small"
              style={{ color: gradient[0], fontWeight: "500", fontSize: 11 }}
            >
              {getCategoryLabel(item.category)}
            </ThemedText>
          </View>

          <View style={styles.priceRow}>
            <ThemedText
              type="body"
              style={{ color: Colors.light.primary, fontWeight: "800" }}
            >
              ₹{item.minPrice.toLocaleString()}
            </ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              / {item.unit}
            </ThemedText>
          </View>

          <View style={styles.vendorMeta}>
            <Feather name="truck" size={12} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginLeft: 6 }}
              numberOfLines={1}
            >
              {item.vendors[0]?.vendorName ||
                `${item.vendors.length} vendor(s)`}
            </ThemedText>
          </View>
        </Pressable>

        {canOrder && item.vendors.length > 0 && (
          <Pressable
            onPress={() => {
              addToCart(item, item.vendors[0].vendorId);
            }}
            style={[
              styles.addToCartBtn,
              { backgroundColor: Colors.light.primary },
            ]}
          >
            <Feather name="plus" size={14} color="#FFFFFF" />
            <ThemedText
              type="small"
              style={{ color: "#FFFFFF", fontWeight: "600", marginLeft: 4 }}
            >
              Add to Cart
            </ThemedText>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerTop}>
          <View style={{ flex: 1 }}>
            <ThemedText
              type="h3"
              style={{ fontWeight: "800", color: theme.text }}
            >
              Order Materials
            </ThemedText>
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary, marginTop: 2 }}
            >
            </ThemedText>
          </View>

          {canOrder && (
            <Pressable
              onPress={() => setShowCart(true)}
              style={[
                styles.cartBtn,
                { backgroundColor: Colors.light.primary },
              ]}
            >
              <Feather name="shopping-cart" size={18} color="#FFFFFF" />
              {getCartItemCount() > 0 && (
                <View
                  style={[
                    styles.cartBadge,
                    { backgroundColor: Colors.light.warning },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: "#FFFFFF",
                      fontWeight: "700",
                      fontSize: 10,
                    }}
                  >
                    {getCartItemCount()}
                  </ThemedText>
                </View>
              )}
            </Pressable>
          )}
        </View>

        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.backgroundDefault,
              borderColor: theme.border,
            },
          ]}
        >
          <Feather name="search" size={18} color={theme.textSecondary} />
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search materials"
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
          />
          {search ? (
            <Pressable onPress={() => setSearch("")} hitSlop={10}>
              <Feather name="x" size={18} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: Spacing.md }}
        >
          <View style={styles.categoryRow}>
            <Pressable
              onPress={() => setSelectedCategory("all")}
              style={[
                styles.categoryChip,
                {
                  backgroundColor:
                    selectedCategory === "all"
                      ? Colors.light.primary
                      : theme.backgroundDefault,
                  borderColor:
                    selectedCategory === "all"
                      ? Colors.light.primary
                      : theme.border,
                },
              ]}
            >
              <ThemedText
                type="small"
                style={{
                  color: selectedCategory === "all" ? "#FFFFFF" : theme.text,
                  fontWeight: selectedCategory === "all" ? "700" : "500",
                }}
              >
                All
              </ThemedText>
            </Pressable>

            {categoryOptions.map((cat) => (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[
                  styles.categoryChip,
                  {
                    backgroundColor:
                      selectedCategory === cat
                        ? Colors.light.primary
                        : theme.backgroundDefault,
                    borderColor:
                      selectedCategory === cat
                        ? Colors.light.primary
                        : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: selectedCategory === cat ? "#FFFFFF" : theme.text,
                    fontWeight: selectedCategory === cat ? "700" : "500",
                  }}
                >
                  {getCategoryLabel(cat)}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        {/* Sort options */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginTop: Spacing.sm }}
        >
          <View style={styles.sortRow}>
            {(
              [
                { key: "relevance", label: "Relevance" },
                { key: "price_low_high", label: "Price: Low-High" },
                { key: "price_high_low", label: "Price: High-Low" },
                { key: "name", label: "Name" },
              ] as const
            ).map((opt) => (
              <Pressable
                key={opt.key}
                onPress={() => setSortOption(opt.key)}
                style={[
                  styles.sortChip,
                  {
                    backgroundColor:
                      sortOption === opt.key
                        ? Colors.light.primary
                        : theme.backgroundDefault,
                    borderColor:
                      sortOption === opt.key
                        ? Colors.light.primary
                        : theme.border,
                  },
                ]}
              >
                <ThemedText
                  type="small"
                  style={{
                    color: sortOption === opt.key ? "#FFFFFF" : theme.text,
                    fontWeight: sortOption === opt.key ? "700" : "500",
                  }}
                >
                  {opt.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

     <FlatList
  data={filteredCatalog}
  key={getColumns()}                 // forces re-render on resize
  keyExtractor={(item) => item.key}
  renderItem={renderProduct}
  numColumns={getColumns()}          // responsive columns
  columnWrapperStyle={{ gap: Spacing.md }}
  contentContainerStyle={[
    styles.listContent,
    { paddingBottom: insets.bottom + Spacing.xl },
  ]}
  showsVerticalScrollIndicator={false}
  ListEmptyComponent={() => (
    <View style={styles.emptyState}>
      <Feather name="package" size={44} color={theme.textSecondary} />
      <ThemedText
        type="body"
        style={{ color: theme.textSecondary, marginTop: Spacing.md }}
      >
        No materials found
      </ThemedText>
      <ThemedText
        type="small"
        style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
      >
        Try a different search or category.
      </ThemedText>
    </View>
  )}
/>

<Modal
  visible={showCheckout}
  animationType="slide"
  presentationStyle={Platform.OS === "web" ? "formSheet" : "pageSheet"}
>

        <ThemedView style={styles.modalContainer}>
          <View
            style={[styles.modalHeader, { borderBottomColor: theme.border }]}
          >
            <Pressable onPress={() => setShowCheckout(false)} hitSlop={10}>
              <ThemedText
                type="body"
                style={{ color: Colors.light.primary, fontWeight: "600" }}
              >
                Cancel
              </ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              {checkoutMode === "cart" ? "Add to Cart" : "Checkout"}
            </ThemedText>
            <View style={{ width: 60 }} />
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
          >
            {selectedItem ? (
              <View
                style={[
                  styles.checkoutCard,
                  {
                    backgroundColor: theme.backgroundDefault,
                    borderColor: theme.border,
                  },
                ]}
              >
                <View style={styles.checkoutTop}>
                  <View
                    style={[
                      styles.checkoutIcon,
                      { backgroundColor: Colors.light.primary + "15" },
                    ]}
                  >
                    <Feather
                      name="shopping-bag"
                      size={18}
                      color={Colors.light.primary}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: Spacing.md }}>
                    <ThemedText type="body" style={{ fontWeight: "800" }}>
                      {selectedItem.name}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary, marginTop: 2 }}
                    >
                      {getCategoryLabel(selectedItem.category)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.section}>
                  <ThemedText type="small" style={styles.sectionLabel}>
                    Select Site / Client
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {clients.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedClientId(c.id)}
                          style={[
                            styles.selectChip,
                            {
                              borderColor:
                                selectedClientId === c.id
                                  ? Colors.light.primary
                                  : theme.border,
                              backgroundColor:
                                selectedClientId === c.id
                                  ? Colors.light.primary + "10"
                                  : theme.backgroundDefault,
                            },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={{
                              color:
                                selectedClientId === c.id
                                  ? Colors.light.primary
                                  : theme.text,
                              fontWeight:
                                selectedClientId === c.id ? "700" : "500",
                            }}
                          >
                            {c.projectName}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                <View style={styles.section}>
                  <ThemedText type="small" style={styles.sectionLabel}>
                    Select Vendor
                  </ThemedText>
                  <View style={styles.vendorList}>
                    {selectedItem.vendors.map((v) => (
                      <Pressable
                        key={v.vendorId}
                        onPress={() => setSelectedVendorId(v.vendorId)}
                        style={[
                          styles.vendorRow,
                          {
                            borderColor:
                              selectedVendorId === v.vendorId
                                ? Colors.light.primary
                                : theme.border,
                            backgroundColor:
                              selectedVendorId === v.vendorId
                                ? Colors.light.primary + "10"
                                : theme.backgroundDefault,
                          },
                        ]}
                      >
                        <View style={{ flex: 1 }}>
                          <ThemedText
                            type="body"
                            style={{ fontWeight: "700" }}
                            numberOfLines={1}
                          >
                            {v.vendorName}
                          </ThemedText>
                          <ThemedText
                            type="small"
                            style={{ color: theme.textSecondary, marginTop: 2 }}
                          >
                            ₹{v.unitPrice}/{v.unit}
                          </ThemedText>
                        </View>
                        {selectedVendorId === v.vendorId ? (
                          <Feather
                            name="check-circle"
                            size={18}
                            color={Colors.light.primary}
                          />
                        ) : (
                          <Feather
                            name="circle"
                            size={18}
                            color={theme.border}
                          />
                        )}
                      </Pressable>
                    ))}
                  </View>
                </View>

                <View style={styles.section}>
                  <ThemedText type="small" style={styles.sectionLabel}>
                    Quantity
                  </ThemedText>
                  <View
                    style={[
                      styles.qtyBox,
                      {
                        backgroundColor: theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <TextInput
                      value={quantity}
                      onChangeText={setQuantity}
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                      keyboardType="numeric"
                      style={[styles.qtyInput, { color: theme.text }]}
                    />
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary }}
                    >
                      {selectedItem.unit}
                    </ThemedText>
                  </View>
                </View>

                <View
                  style={[
                    styles.totalBox,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <View>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary }}
                    >
                      Total
                    </ThemedText>
                    <ThemedText
                      type="h4"
                      style={{
                        fontWeight: "900",
                        color: Colors.light.primary,
                        marginTop: 2,
                      }}
                    >
                      ₹{totalCost.toLocaleString()}
                    </ThemedText>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <ThemedText
                      type="small"
                      style={{ color: theme.textSecondary }}
                    >
                      Unit Price
                    </ThemedText>
                    <ThemedText
                      type="body"
                      style={{ fontWeight: "800", marginTop: 2 }}
                    >
                      ₹{unitPrice}/{selectedItem.unit}
                    </ThemedText>
                  </View>
                </View>

                {checkoutMode !== "cart" ? (
                  <View style={styles.section}>
                    <ThemedText type="small" style={styles.sectionLabel}>
                      Payment Status
                    </ThemedText>
                    <View style={styles.paymentRow}>
                      <Pressable
                        onPress={() => setCheckoutPaymentStatus("pending")}
                        style={[
                          styles.paymentChoice,
                          {
                            borderColor:
                              checkoutPaymentStatus === "pending"
                                ? Colors.light.warning
                                : theme.border,
                            backgroundColor:
                              checkoutPaymentStatus === "pending"
                                ? Colors.light.warning + "12"
                                : theme.backgroundDefault,
                          },
                        ]}
                      >
                        <Feather
                          name="clock"
                          size={16}
                          color={
                            checkoutPaymentStatus === "pending"
                              ? Colors.light.warning
                              : theme.textSecondary
                          }
                        />
                        <ThemedText
                          type="small"
                          style={{
                            marginLeft: 8,
                            color:
                              checkoutPaymentStatus === "pending"
                                ? Colors.light.warning
                                : theme.text,
                            fontWeight:
                              checkoutPaymentStatus === "pending"
                                ? "700"
                                : "500",
                          }}
                        >
                          Pending
                        </ThemedText>
                      </Pressable>

                      <Pressable
                        onPress={() => setCheckoutPaymentStatus("paid")}
                        style={[
                          styles.paymentChoice,
                          {
                            borderColor:
                              checkoutPaymentStatus === "paid"
                                ? Colors.light.success
                                : theme.border,
                            backgroundColor:
                              checkoutPaymentStatus === "paid"
                                ? Colors.light.success + "12"
                                : theme.backgroundDefault,
                          },
                        ]}
                      >
                        <Feather
                          name="check-circle"
                          size={16}
                          color={
                            checkoutPaymentStatus === "paid"
                              ? Colors.light.success
                              : theme.textSecondary
                          }
                        />
                        <ThemedText
                          type="small"
                          style={{
                            marginLeft: 8,
                            color:
                              checkoutPaymentStatus === "paid"
                                ? Colors.light.success
                                : theme.text,
                            fontWeight:
                              checkoutPaymentStatus === "paid" ? "700" : "500",
                          }}
                        >
                          Paid
                        </ThemedText>
                      </Pressable>
                    </View>
                  </View>
                ) : null}

                <Button
                  onPress={() => {
                    if (checkoutMode === "cart") {
                      const qty = parseInt(quantity || "0", 10);
                      if (
                        !selectedItem ||
                        !selectedVendorId ||
                        !qty ||
                        qty <= 0
                      ) {
                        Alert.alert(
                          "Missing Fields",
                          "Please select Vendor and enter quantity.",
                        );
                        return;
                      }
                      const unit = selectedItem.unit;
                      const price = unitPrice;
                      const itemId = `${selectedItem.key}__${selectedVendorId}`;
                      const cartItem: CartItem = {
  id: itemId,
  catalogItem: selectedItem,
  vendorId: selectedVendorId,
  vendorName: getVendorName(selectedVendorId),
  unitPrice: price,
  unit,
  quantity: qty,
  totalCost: price * qty,
};

                    setCart((prev) => {
  const existing = prev.find((ci) => ci.id === itemId);

  if (existing) {
    return prev.map((ci) =>
      ci.id === itemId
        ? {
            ...ci,
            quantity: ci.quantity + qty,
            totalCost: (ci.quantity + qty) * ci.unitPrice,
          }
        : ci
    );
  }

  return [...prev, cartItem];
});

               setShowCheckout(false);
resetCartStatus();
setShowCart(true);

setTimeout(() => {
  if (Platform.OS === "web") {
    window.alert(
      `${selectedItem.name} (${qty} ${selectedItem.unit}) added to cart successfully.`,
    );
  } else {
    Alert.alert(
      "Added to Cart",
      `${selectedItem.name} (${qty} ${selectedItem.unit}) added to cart successfully.`,
    );
  }
}, 300);


                    } else {
                      handlePlaceOrder();
                    }
                  }}
                >
                  {checkoutMode === "cart" ? "Add to Cart" : "Place Order"}
                </Button>
              </View>
            ) : null}
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
      </Modal>

     
      {/* Cart Modal */}
      <Modal
        visible={showCart}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCart(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View
            style={[styles.modalHeader, { 
    borderBottomColor: theme.border,
    marginTop: 35  // Add this line
  }]}
          >
            <Pressable onPress={() => setShowCart(false)} hitSlop={10}>
              <ThemedText
                type="body"
                style={{ color: Colors.light.primary, fontWeight: "600" }}
              >
                Close
              </ThemedText>
            </Pressable>
            <ThemedText type="body" style={{ fontWeight: "700" }}>
              Shopping Cart ({getCartItemCount()})
            </ThemedText>
            <Pressable onPress={clearCart} hitSlop={10}>
              <ThemedText
                type="body"
                style={{ color: "#DC2626", fontWeight: "600" }}
              >
                Clear
              </ThemedText>
            </Pressable>
          </View>

          <KeyboardAwareScrollViewCompat
            contentContainerStyle={[
              styles.modalContent,
              { paddingBottom: insets.bottom + Spacing.xl },
            ]}
          >
            {cart.length === 0 ? (
              <View style={styles.emptyState}>
                <Feather
                  name="shopping-cart"
                  size={44}
                  color={theme.textSecondary}
                />
                <ThemedText
                  type="body"
                  style={{ color: theme.textSecondary, marginTop: Spacing.md }}
                >
                  Your cart is empty
                </ThemedText>
              </View>
            ) : (
              <>
                {/* Site Selection */}
                <View style={styles.section}>
                  <ThemedText type="small" style={styles.sectionLabel}>
                    Select Site / Client
                  </ThemedText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={styles.chipRow}>
                      {clients.map((c) => (
                        <Pressable
                          key={c.id}
                          onPress={() => setSelectedClientId(c.id)}
                          style={[
                            styles.selectChip,
                            {
                              borderColor:
                                selectedClientId === c.id
                                  ? Colors.light.primary
                                  : theme.border,
                              backgroundColor:
                                selectedClientId === c.id
                                  ? Colors.light.primary + "10"
                                  : theme.backgroundDefault,
                            },
                          ]}
                        >
                          <ThemedText
                            type="small"
                            style={{
                              color:
                                selectedClientId === c.id
                                  ? Colors.light.primary
                                  : theme.text,
                              fontWeight:
                                selectedClientId === c.id ? "700" : "500",
                            }}
                          >
                            {c.projectName}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>

                {/* Vendor Groups */}
                {getVendorGroups().map((vendorGroup) => (
                  <View
                    key={vendorGroup.vendorId}
                    style={[
                      styles.vendorGroupCard,
                      {
                        backgroundColor: theme.backgroundDefault,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <View style={styles.vendorGroupHeader}>
                      <ThemedText type="body" style={{ fontWeight: "800" }}>
                        {vendorGroup.vendorName}
                      </ThemedText>
                      <ThemedText
                        type="body"
                        style={{
                          color: Colors.light.primary,
                          fontWeight: "800",
                        }}
                      >
                        ₹{vendorGroup.subtotal.toLocaleString()}
                      </ThemedText>
                    </View>

                    {vendorGroup.items.map((item: any) => (
                      <View key={item.id} style={styles.cartItem}>
                        <View style={{ flex: 1 }}>
                          <ThemedText
                            type="body"
                            style={{ fontWeight: "600" }}
                            numberOfLines={1}
                          >
                            {item.catalogItem.name}
                          </ThemedText>
                          <ThemedText
                            type="small"
                            style={{ color: theme.textSecondary }}
                          >
                            ₹{item.unitPrice}/{item.unit}
                          </ThemedText>
                        </View>

                        <View style={styles.quantityControls}>
                          <Pressable
                            onPress={() =>
                              updateCartQuantity(item.id, item.quantity - 1)
                            }
                            style={[
                              styles.quantityBtn,
                              { borderColor: theme.border },
                            ]}
                          >
                            <Feather
                              name="minus"
                              size={14}
                              color={theme.text}
                            />
                          </Pressable>
                          <ThemedText
                            type="body"
                            style={{
                              fontWeight: "600",
                              minWidth: 30,
                              textAlign: "center",
                            }}
                          >
                            {item.quantity}
                          </ThemedText>
                          <Pressable
                            onPress={() =>
                              updateCartQuantity(item.id, item.quantity + 1)
                            }
                            style={[
                              styles.quantityBtn,
                              { borderColor: theme.border },
                            ]}
                          >
                            <Feather name="plus" size={14} color={theme.text} />
                          </Pressable>
                        </View>

                        <ThemedText
                          type="body"
                          style={{
                            fontWeight: "700",
                            minWidth: 60,
                            textAlign: "right",
                          }}
                        >
                          ₹{item.totalCost.toLocaleString()}
                        </ThemedText>

                        <Pressable
                          onPress={() => removeFromCart(item.id)}
                          style={{ marginLeft: Spacing.sm }}
                        >
                          <Feather name="trash-2" size={16} color="#DC2626" />
                        </Pressable>
                      </View>
                    ))}

                    <View style={{ marginTop: Spacing.sm }}>
                      <ThemedText type="small" style={styles.sectionLabel}>
                        Payment Status
                      </ThemedText>
                      <View style={styles.paymentRow}>
                        <Pressable
                          onPress={() => setCartPaymentStatus("pending")}
                          style={[
                            styles.paymentChoice,
                            {
                              borderColor:
                                cartPaymentStatus === "pending"
                                  ? Colors.light.warning
                                  : theme.border,
                              backgroundColor:
                                cartPaymentStatus === "pending"
                                  ? Colors.light.warning + "12"
                                  : theme.backgroundDefault,
                            },
                          ]}
                        >
                          <Feather
                            name="clock"
                            size={16}
                            color={
                              cartPaymentStatus === "pending"
                                ? Colors.light.warning
                                : theme.textSecondary
                            }
                          />
                          <ThemedText
                            type="small"
                            style={{
                              marginLeft: 8,
                              color:
                                cartPaymentStatus === "pending"
                                  ? Colors.light.warning
                                  : theme.text,
                              fontWeight:
                                cartPaymentStatus === "pending" ? "700" : "500",
                            }}
                          >
                            Pending
                          </ThemedText>
                        </Pressable>

                        <Pressable
                          onPress={() => setCartPaymentStatus("paid")}
                          style={[
                            styles.paymentChoice,
                            {
                              borderColor:
                                cartPaymentStatus === "paid"
                                  ? Colors.light.success
                                  : theme.border,
                              backgroundColor:
                                cartPaymentStatus === "paid"
                                  ? Colors.light.success + "12"
                                  : theme.backgroundDefault,
                            },
                          ]}
                        >
                          <Feather
                            name="check-circle"
                            size={16}
                            color={
                              cartPaymentStatus === "paid"
                                ? Colors.light.success
                                : theme.textSecondary
                            }
                          />
                          <ThemedText
                            type="small"
                            style={{
                              marginLeft: 8,
                              color:
                                cartPaymentStatus === "paid"
                                  ? Colors.light.success
                                  : theme.text,
                              fontWeight:
                                cartPaymentStatus === "paid" ? "700" : "500",
                            }}
                          >
                            Paid
                          </ThemedText>
                        </Pressable>
                      </View>
                    </View>

                   <View style={styles.vendorActions}>
  <Pressable
    onPress={() => {
      console.log("Place Order button pressed");
      handleVendorPayLater(vendorGroup);
    }}
    style={[
      styles.payLaterBtn,
      { borderColor: theme.border },
    ]}
  >
    <ThemedText
      type="small"
      style={{
        color: theme.textSecondary,
        fontWeight: "600",
      }}
    >
      Place Order
    </ThemedText>
  </Pressable>
</View>
                  </View>
                ))}

                {/* Cart Total */}
                <View
                  style={[
                    styles.cartTotalCard,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      borderColor: theme.border,
                    },
                  ]}
                >
                  <ThemedText type="body" style={{ fontWeight: "800" }}>
                    Total Amount
                  </ThemedText>
                  <ThemedText
                    type="h3"
                    style={{ fontWeight: "900", color: Colors.light.primary }}
                  >
                    ₹{getCartTotal().toLocaleString()}
                  </ThemedText>
                </View>
              </>
            )}
          </KeyboardAwareScrollViewCompat>
        </ThemedView>
      </Modal>

      {!canOrder ? (
        <View
          style={[
            styles.permissionBanner,
            {
              backgroundColor: Colors.light.warning + "15",
              borderColor: Colors.light.warning + "30",
            },
          ]}
        >
          <Feather name="lock" size={16} color={Colors.light.warning} />
          <ThemedText
            type="small"
            style={{
              color: Colors.light.warning,
              marginLeft: 8,
              fontWeight: "600",
            }}
          >
            View only. Login as Admin/Engineer to place orders.
          </ThemedText>
        </View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
    backgroundColor: Colors.light.backgroundRoot,
  },
  searchBox: {
    marginTop: Spacing.lg,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.full,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  categoryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  sortRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  sortChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
 
productCard: {
  flex: 1,
  minHeight: 170,
  borderRadius: BorderRadius.lg,
  padding: Spacing.md,
  borderWidth: 1,
},

  productIcon: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  productName: {
    fontWeight: "700",
 fontSize: Platform.OS === "web" ? 14 : 12,
lineHeight: 16,

  },
  categoryBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 1,
    borderRadius: BorderRadius.xs,
    marginTop: Spacing.sm,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: Spacing.md,
  },
  vendorMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  emptyState: {
    paddingVertical: Spacing["4xl"],
    alignItems: "center",
  },
 modalContainer: {
  flex: 1,
  maxWidth: Platform.OS === "web" ? 720 : "100%",
  alignSelf: "center",
},

  modalHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  checkoutCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  checkoutTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  checkoutIcon: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    color: Colors.light.textSecondary,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  selectChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
  },
  vendorList: {
    gap: Spacing.sm,
  },
  vendorRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  qtyBox: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  qtyInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
  },
  totalBox: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  paymentRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  paymentChoice: {
    flex: 1,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  paymentSheet: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  paymentInfoCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  paymentHintRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.md,
  },
  payLaterLink: {
    marginTop: Spacing.md,
    height: Spacing.buttonHeight,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionBanner: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  // Cart styles
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  cartBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
productCardContainer: {
  flex: 1,
},

  addToCartBtn: {
    marginTop: Spacing.sm,
    height: 36,
    borderRadius: BorderRadius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  vendorGroupCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  vendorGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  quantityBtn: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  vendorActions: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  payLaterBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  payNowBtn: {
    flex: 1,
    height: 40,
    borderRadius: BorderRadius.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cartTotalCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  // UPI Payment styles
  upiAppsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  upiAppBtn: {
    width: "30%",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  upiAppIcon: {
    width: 32,
    height: 32,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  upiInputSection: {
    marginTop: Spacing.lg,
  },
  upiInput: {
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
  },
  // Razorpay styles
  razorpayFeatures: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.xs,
  },
  cartBar: {
    position: "absolute",
    left: Spacing.lg,
    right: Spacing.lg,
    bottom: Spacing.lg,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    ...Shadows.sm,
  },
  cartBarBtn: {
    height: 40,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
});
