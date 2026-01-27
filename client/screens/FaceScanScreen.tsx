import React, { useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Alert,
  Platform,
  Pressable,
  Modal,
  ScrollView,
  Image,
  TextInput,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { ThemedText } from "@/components/ThemedText";
import { Button } from "@/components/Button";
import { BorderRadius, Colors } from "@/constants/theme";
import { useData } from "@/context/DataContext";
import { Employee, Client } from "@/types";

/* 🔗 PHP UPLOAD ENDPOINT */
const UPLOAD_URL =
  "https://projects.growtechnologies.in/vetrigroups/upload_attendance_image.php";

export default function FaceScanScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);

  const { employees, clients, markAttendance } = useData();
  const [permission, requestPermission] = useCameraPermissions();

  /* ================= FORM STATE ================= */

  const [date, setDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [site, setSite] = useState<Client | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<"front" | "back">("front");

  const [empModal, setEmpModal] = useState(false);
  const [siteModal, setSiteModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  const timeNow = new Date().toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  /* ================= IMAGE UPLOAD ================= */

const uploadToPhpServer = async (uri: string) => {
  try {
    let file: any;

    if (Platform.OS === "web") {
      const blob = await fetch(uri).then(r => r.blob());
      file = new File([blob], "attendance.jpg", { type: "image/jpeg" });
    } else {
      // For React Native, use proper file structure
      const filename = uri.split('/').pop() || 'attendance.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      file = {
        uri,
        name: filename,
        type: type,
      };
    }

    const formData = new FormData();
    formData.append("image", file as any);

    console.log("Uploading to:", UPLOAD_URL);

    const res = await fetch(UPLOAD_URL, {
      method: "POST",
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
    });

    console.log("Response status:", res.status);
    const text = await res.text();
    console.log("Response text:", text);

    // Check if response is HTML (starts with < or contains HTML tags)
    if (text.trim().startsWith('<') || text.includes('<!DOCTYPE') || text.includes('<html')) {
      throw new Error("Server returned HTML instead of JSON. Please check your PHP error logs.");
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch (parseError) {
      console.error("JSON parse failed:", parseError);
      throw new Error("Invalid server response: " + text.substring(0, 100));
    }

    if (!json.success) {
      throw new Error(json.message || "Upload failed");
    }

    console.log("Upload successful:", json.url);
    return json.url;

  } catch (error: any) {
    console.error("Upload error:", error);
    throw error;
  }
};

  /* ================= SUBMIT ================= */

  const submit = async () => {
    if (!employee || !site || !imageUri) {
      Alert.alert(
        "Missing",
        "Please select date, employee, site and image"
      );
      return;
    }

    try {
      setProcessing(true);

      const photoUrl = await uploadToPhpServer(imageUri);

      await markAttendance(employee.id, date, "present", {
        siteId: site.id,
        siteName: site.projectName,
        checkInTime: timeNow,
        photoUrl,
      });

      Alert.alert("Success", "Attendance saved", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setProcessing(false);
    }
  };

  /* ================= CAMERA CAPTURE ================= */

  const captureImage = async () => {
    if (Platform.OS === "web") {
      // Web camera capture using getUserMedia
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing === "front" ? "user" : "environment" }
        });
        
        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        // Wait for video to be ready
        await new Promise(resolve => {
          video.onloadedmetadata = resolve;
        });

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(video, 0, 0);

        // Stop the stream
        stream.getTracks().forEach(track => track.stop());

        // Convert to blob and create URL
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setImageUri(url);
          }
        }, 'image/jpeg', 0.8);

      } catch (error) {
        Alert.alert("Error", "Could not access camera");
        console.error(error);
      }
    } else {
      // Mobile camera capture
      if (!cameraRef.current) return;

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      setImageUri(photo.uri);
    }
  };

  const toggleCamera = () => {
    setFacing(current => current === "front" ? "back" : "front");
  };

  /* ================= PERMISSION ================= */

  if (Platform.OS !== "web" && !permission?.granted) {
    return (
      <View style={styles.centered}>
        <Button onPress={requestPermission}>
          Grant Camera Permission
        </Button>
      </View>
    );
  }

  /* ================= UI ================= */

 return (
  <View style={styles.container}>
    {Platform.OS !== "web" && (
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
      />
    )}

    {/* ===== HEADER WITH BACK ARROW ===== */}
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Feather name="arrow-left" size={24} color="#000" />
      </Pressable>

      <ThemedText type="h3">Mark Attendance</ThemedText>

      <View style={{ width: 24 }} />
    </View>

    <ScrollView
      contentContainerStyle={[
        styles.form,
        { paddingTop: 16 },
      ]}
    >

        <ThemedText type="h3">Mark Attendance</ThemedText>

        {/* DATE */}
        <TextInput
          value={date}
          onChangeText={setDate}
          placeholder="YYYY-MM-DD"
          style={styles.input}
        />

        {/* EMPLOYEE */}
        <Pressable style={styles.select} onPress={() => setEmpModal(true)}>
          <ThemedText>
            {employee?.name || "Select Employee"}
          </ThemedText>
          {employee && (
            <ThemedText type="small" style={{ opacity: 0.6 }}>
              {employee.role || "Employee"}
            </ThemedText>
          )}
        </Pressable>

        {/* SITE */}
        <Pressable style={styles.select} onPress={() => setSiteModal(true)}>
          <ThemedText>
            {site?.projectName || "Select Site"}
          </ThemedText>
        </Pressable>

        {/* IMAGE */}
        {imageUri ? (
          <View>
            <Image source={{ uri: imageUri }} style={styles.preview} />
            <Pressable 
              style={styles.retakeBtn}
              onPress={() => setImageUri(null)}
            >
              <Feather name="x" size={20} color="#fff" />
              <ThemedText style={{ color: "#fff" }}>Retake</ThemedText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.cameraControls}>
            <Pressable style={styles.captureBtn} onPress={captureImage}>
              <Feather name="camera" size={24} color="#fff" />
              <ThemedText style={{ color: "#fff", marginTop: 4 }}>
                Capture Photo
              </ThemedText>
            </Pressable>

            <Pressable style={styles.toggleBtn} onPress={toggleCamera}>
              <Feather name="refresh-cw" size={20} color="#333" />
              <ThemedText style={{ fontSize: 12, marginTop: 4 }}>
                {facing === "front" ? "Front" : "Back"} Camera
              </ThemedText>
            </Pressable>
          </View>
        )}

        <Button onPress={submit} disabled={processing}>
          {processing ? "Saving..." : "Submit"}
        </Button>
      </ScrollView>

      {/* ================= EMPLOYEE MODAL ================= */}
      <Modal visible={empModal} transparent animationType="slide">
        <View style={styles.modal}>
          <ScrollView>
            {employees.map(e => (
              <Pressable
                key={e.id}
                style={styles.modalItem}
                onPress={() => {
                  setEmployee(e);
                  setEmpModal(false);
                }}
              >
                <ThemedText style={{ fontWeight: "600" }}>
                  {e.name}
                </ThemedText>
                <ThemedText
                  type="small"
                  style={{ opacity: 0.6, marginTop: 2 }}
                >
                  {e.role || "Employee"}
                </ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* ================= SITE MODAL ================= */}
      <Modal visible={siteModal} transparent animationType="slide">
        <View style={styles.modal}>
          <ScrollView>
            {clients.map(s => (
              <Pressable
                key={s.id}
                style={styles.modalItem}
                onPress={() => {
                  setSite(s);
                  setSiteModal(false);
                }}
              >
                <ThemedText>{s.projectName}</ThemedText>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1 },

  camera: {
    ...StyleSheet.absoluteFillObject,
  },

  form: {
    backgroundColor: "#fff",
    padding: 16,
    gap: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: BorderRadius.md,
    padding: 10,
  },

  select: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: BorderRadius.md,
    padding: 12,
  },

  cameraControls: {
    gap: 12,
  },

  captureBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#2563eb",
    borderRadius: BorderRadius.md,
  },

  toggleBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: BorderRadius.md,
    backgroundColor: "#f5f5f5",
  },

  preview: {
    width: "100%",
    height: 300,
    borderRadius: BorderRadius.md,
  },

  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: "#dc2626",
    borderRadius: BorderRadius.md,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#fff",
  },

  backBtn: {
    padding: 6,
  },

  modal: {
    backgroundColor: "#fff",
    maxHeight: "70%",
    marginTop: "auto",
    padding: 16,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
  },

  modalItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },

  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});