import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Image, Modal, TextInput, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { useData } from '@/context/DataContext';
import { Spacing, BorderRadius, Colors } from '@/constants/theme';
import { db } from '@/firebaseConfig';
import { collection, query, orderBy, onSnapshot, where } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { uploadPhotoAndCreateDoc } from '@/lib/photos';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import { useAuth } from '@/context/AuthContext';

type PhotoDoc = {
  id: string;
  url: string;
  siteId?: string | null;
  siteName?: string | null;
  description?: string | null;
  uploader?: { name?: string } | null;
  createdAt?: any;
};

export default function PhotoSectionScreen() {
  const { theme } = useTheme();
  const { clients } = useData();
  const { user } = useAuth();

  const [photos, setPhotos] = useState<PhotoDoc[]>([]);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [filterDate, setFilterDate] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);
  const [siteModalVisible, setSiteModalVisible] = useState(false);
  const [siteModalMode, setSiteModalMode] = useState<'filter' | 'add'>('filter');

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newSiteId, setNewSiteId] = useState<string | null>(clients[0]?.id || null);
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [newDescription, setNewDescription] = useState('');
  const [newPhotoUris, setNewPhotoUris] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const items: PhotoDoc[] = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() } as PhotoDoc));
      setPhotos(items);
    });
    return () => unsub();
  }, []);

  // Filtering
  const filtered = photos.filter((p) => {
    if (selectedSite && p.siteId !== selectedSite) return false;
    if (filterDate) {
      const dt = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
      if (format(dt, 'yyyy-MM-dd') !== filterDate) return false;
    }
    if (fromDate) {
      const dt = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
      if (format(dt, 'yyyy-MM-dd') < fromDate) return false;
    }
    if (toDate) {
      const dt = p.createdAt?.toDate ? p.createdAt.toDate() : new Date();
      if (format(dt, 'yyyy-MM-dd') > toDate) return false;
    }
    return true;
  });

  // Group by site and date
  const grouped = filtered.reduce<Record<string, PhotoDoc[]>>((acc, p) => {
    const siteKey = `${p.siteId || 'unknown'}|${p.siteName || 'Unknown Site'}|${format((p.createdAt?.toDate ? p.createdAt.toDate() : new Date()), 'yyyy-MM-dd')}`;
    if (!acc[siteKey]) acc[siteKey] = [];
    acc[siteKey].push(p);
    return acc;
  }, {});

  const groups = Object.entries(grouped).map(([key, items]) => {
    const [siteId, siteName, date] = key.split('|');
    return { siteId, siteName, date, items };
  }).sort((a, b) => (a.date < b.date ? 1 : -1));

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission required', 'Media library permission is required to select photos.');
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7, allowsMultipleSelection: true, mediaTypes: ['images'] });
    if (!res.canceled && res.assets && res.assets.length > 0) setNewPhotoUris(res.assets.map(a => a.uri));
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Permission required', 'Camera permission is required to take photos.');
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!res.canceled && res.assets[0]) setNewPhotoUris([res.assets[0].uri]);
  };

  const handleAdd = async () => {
    if (!newSiteId || newPhotoUris.length === 0) return Alert.alert('Missing', 'Please select site and one or more photos');
    setIsUploading(true);
    const client = clients.find(c => c.id === newSiteId);
    const uploader = { name: user?.name || 'Unknown' };

    console.log(`Starting upload for ${newPhotoUris.length} photos...`);
    console.log('Photo URIs:', newPhotoUris);

    const failed: { uri: string; error: string }[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < newPhotoUris.length; i++) {
        const uri = newPhotoUris[i];
        console.log(`Uploading photo ${i + 1}/${newPhotoUris.length}: ${uri}`);
        
        try {
          await uploadPhotoAndCreateDoc({ uri, uploader, siteName: client?.projectName || null, siteId: newSiteId });
          successCount++;
          console.log(`✅ Photo ${i + 1} uploaded successfully`);
        } catch (err: any) {
          console.error('❌ Upload error for photo', uri, err);
          failed.push({ uri, error: err?.message || String(err) });
        }
      }
    } catch (loopError: any) {
      console.error('❌ Upload loop error:', loopError);
      Alert.alert('Upload Error', `Upload process failed: ${loopError.message || 'Unknown error'}`);
    }

    console.log(`Upload complete: ${successCount} succeeded, ${failed.length} failed`);

    setIsUploading(false);

    if (failed.length === 0) {
      console.log('✅ All photos uploaded successfully!');
      Alert.alert('Success', `${newPhotoUris.length} photo(s) uploaded successfully!`, [
        { text: 'OK', onPress: () => {
          setAddModalVisible(false);
          setNewPhotoUris([]);
          setNewDescription('');
        }}
      ]);
    } else {
      console.log(`⚠️ ${failed.length} photos failed to upload`);
      Alert.alert('Upload Result', `${successCount} succeeded, ${failed.length} failed. First error: ${failed[0]?.error || 'Unknown error'}`, [
        { text: 'Retry', onPress: () => console.log('User wants to retry') },
        { text: 'Cancel', onPress: () => {
          setAddModalVisible(false);
          setNewPhotoUris([]);
          setNewDescription('');
        }}
      ]);
    }
  };

  const handleShareGroup = async (group: { siteName: string; date: string; items: PhotoDoc[] }) => {
    const first = group.items[0];
    const time = first.createdAt?.toDate ? format(first.createdAt.toDate(), 'HH:mm') : format(new Date(), 'HH:mm');
    const message = `📸 Site Update\nSite: ${group.siteName}\nDate: ${group.date}\nTime: ${time}\nPosted by: ${first.uploader?.name || 'Unknown'}\n\n${first.url}`;
    const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    try {
      const { Linking } = await import('react-native');
      const can = await Linking.canOpenURL(waUrl);
      if (can) await Linking.openURL(waUrl);
      else Alert.alert('Share', 'Cannot open WhatsApp on this device.');
    } catch (err) {
      console.error('Share failed', err);
      Alert.alert('Share failed', 'Unable to share');
    }
  };

  const openSiteModal = (mode: 'filter' | 'add') => {
    setSiteModalMode(mode);
    setSiteModalVisible(true);
  };

  const handleSiteSelection = (siteId: string) => {
    if (siteModalMode === 'add') {
      setNewSiteId(siteId);
    } else {
      setSelectedSite(siteId);
    }
    setSiteModalVisible(false);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <ThemedText type="h3">Photo Section</ThemedText>
        <Pressable onPress={() => setAddModalVisible(true)} style={styles.addBtn}>
          <Feather name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      </View>

      <View style={styles.filtersRow}>
        <Pressable onPress={() => openSiteModal('filter')} style={[styles.filterBox, { backgroundColor: theme.backgroundDefault }]}>
          <ThemedText type="small">{clients.find(c => c.id === selectedSite)?.projectName || 'Site'}</ThemedText>
        </Pressable>
        <TextInput placeholder="Date (YYYY-MM-DD)" value={filterDate || ''} onChangeText={setFilterDate} style={[styles.filterInput, { backgroundColor: theme.backgroundDefault }]} />
        <TextInput placeholder="From" value={fromDate || ''} onChangeText={setFromDate} style={[styles.filterInput, { backgroundColor: theme.backgroundDefault }]} />
        <TextInput placeholder="To" value={toDate || ''} onChangeText={setToDate} style={[styles.filterInput, { backgroundColor: theme.backgroundDefault }]} />
      </View>

      <FlatList
        data={groups}
        keyExtractor={(g) => `${g.siteId}-${g.date}`}
        contentContainerStyle={{ padding: Spacing.lg }}
        renderItem={({ item }) => (
          <View style={[styles.groupCard, { backgroundColor: theme.backgroundDefault }]}>
            <View style={styles.groupHeader}>
              <View>
                <ThemedText type="body" style={{ fontWeight: '600' }}>{item.siteName}</ThemedText>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.date} • {item.items.length} photo(s)</ThemedText>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.items[0].uploader?.name || 'Unknown'}</ThemedText>
                <Pressable onPress={() => handleShareGroup(item)} style={styles.shareBtn}><Feather name="share-2" size={18} color={Colors.light.primary} /></Pressable>
              </View>
            </View>

            <ThemedText type="small" style={{ marginTop: Spacing.sm, color: theme.text }}>{item.items[0].description}</ThemedText>

            <FlatList
              data={item.items}
              keyExtractor={(p) => p.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: Spacing.md }}
              renderItem={({ item: p }) => (
                <Image source={{ uri: p.url }} style={styles.thumb} />
              )}
            />
          </View>
        )}
      />

      {/* Site Selection Modal - RENDER THIS LAST so it appears on top */}
      <Modal visible={siteModalVisible} animationType="slide" transparent onRequestClose={() => setSiteModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setSiteModalVisible(false)}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View style={[styles.selectorModal, { backgroundColor: theme.backgroundDefault }]}> 
              <ThemedText type="h4">Select Site</ThemedText>
              <FlatList 
                data={clients} 
                keyExtractor={(c) => c.id} 
                style={{ maxHeight: 400 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => handleSiteSelection(item.id)} style={styles.clientItem}>
                    <ThemedText type="body">{item.projectName}</ThemedText>
                    <ThemedText type="small" style={{ color: theme.textSecondary }}>{item.name}</ThemedText>
                  </Pressable>
                )} 
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Add Photo Modal - Hide when site modal is visible */}
      <Modal visible={addModalVisible && !siteModalVisible} animationType="slide" transparent onRequestClose={() => setAddModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.selectorModal, { backgroundColor: theme.backgroundDefault }]}> 
            <ThemedText type="h4">Add Photo</ThemedText>
            <Pressable onPress={() => openSiteModal('add')} style={styles.rowSelect}>
              <ThemedText type="body">{clients.find(c => c.id === newSiteId)?.projectName || 'Select Site'}</ThemedText>
            </Pressable>
            <TextInput value={newDate} onChangeText={setNewDate} placeholder="YYYY-MM-DD" style={[styles.input, { marginTop: Spacing.sm }]} />
            <TextInput value={newDescription} onChangeText={setNewDescription} placeholder="Description" style={[styles.input, { marginTop: Spacing.sm }]} />

            <View style={{ flexDirection: 'row', marginTop: Spacing.sm }}>
              <Pressable onPress={pickImage} style={[styles.actionBtn, { marginRight: Spacing.sm }]}>
                <ThemedText type="small">Choose</ThemedText>
              </Pressable>
              <Pressable onPress={takePhoto} style={styles.actionBtn}>
                <ThemedText type="small">Camera</ThemedText>
              </Pressable>
            </View>

            {newPhotoUris.length > 0 ? (
              <FlatList data={newPhotoUris} horizontal keyExtractor={(u) => u} renderItem={({ item: uri }) => (
                <Image source={{ uri }} style={{ width: 160, height: 120, marginRight: Spacing.sm, borderRadius: BorderRadius.md }} />
              )} style={{ marginTop: Spacing.sm }} />
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: Spacing.md }}>
              <Pressable onPress={() => setAddModalVisible(false)} style={[styles.actionBtn, { marginRight: Spacing.sm }]}>
                <ThemedText type="small">Cancel</ThemedText>
              </Pressable>
              <Pressable onPress={handleAdd} style={[styles.actionBtn, { backgroundColor: Colors.light.primary }]} disabled={isUploading}>
                <ThemedText type="small" style={{ color: '#FFFFFF' }}>{isUploading ? 'Uploading...' : 'Add'}</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing.lg },
  addBtn: { backgroundColor: Colors.light.primary, padding: 10, borderRadius: BorderRadius.full },
  filtersRow: { flexDirection: 'row', paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.sm },
  filterBox: { padding: Spacing.sm, borderRadius: BorderRadius.md, minWidth: 100, alignItems: 'center', justifyContent: 'center' },
  filterInput: { padding: Spacing.sm, borderRadius: BorderRadius.md, flex: 1, marginLeft: Spacing.sm },
  groupCard: { padding: Spacing.md, borderRadius: BorderRadius.md, marginBottom: Spacing.md },
  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  shareBtn: { marginTop: Spacing.sm },
  thumb: { width: 160, height: 120, borderRadius: BorderRadius.md, marginRight: Spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  selectorModal: { maxHeight: '70%', borderTopLeftRadius: BorderRadius.xl, borderTopRightRadius: BorderRadius.xl, padding: Spacing.lg },
  clientItem: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.05)' },
  rowSelect: { padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)', marginTop: Spacing.sm },
  input: { padding: Spacing.sm, borderRadius: BorderRadius.md, borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)' },
  actionBtn: { padding: Spacing.sm, borderRadius: BorderRadius.md },
});