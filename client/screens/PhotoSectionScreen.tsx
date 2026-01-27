import React, { useEffect, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, Image, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useTheme } from '@/hooks/useTheme';
import { Spacing, Colors } from '@/constants/theme';
import { db } from '@/firebaseConfig';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Feather } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as Linking from 'expo-linking';
import { downloadGroupAsZip } from '@/lib/photoDownload';

/* ================= TYPES ================= */

type PhotoDoc = {
  id: string;
  url: string;
  siteId?: string;
  siteName?: string;
  createdAt?: any;
  groupId?: string;
};

type PhotoGroup = {
  groupId: string;
  siteName: string;
  date: string;
  items: PhotoDoc[];
};

/* ================= SCREEN ================= */

export default function PhotoSectionScreen() {
  const { theme } = useTheme();
  const [photos, setPhotos] = useState<PhotoDoc[]>([]);

  /* ================= FETCH ================= */
  useEffect(() => {
    const q = query(collection(db, 'photos'), orderBy('createdAt', 'desc'));

    return onSnapshot(q, snap => {
      const arr: PhotoDoc[] = [];
      snap.forEach(d => arr.push({ id: d.id, ...d.data() }));
      setPhotos(arr);
    });
  }, []);

  /* ================= GROUP ================= */
  const map: Record<string, PhotoGroup> = {};

  for (const p of photos) {
    const date = format(
      p.createdAt?.toDate?.() || new Date(),
      'yyyy-MM-dd'
    );

    const groupId = p.groupId || `${p.siteId}_${date}`;

    if (!map[groupId]) {
      map[groupId] = {
        groupId,
        siteName: p.siteName || 'Unknown Site',
        date,
        items: [],
      };
    }

    map[groupId].items.push(p);
  }

  const groups = Object.values(map);

  /* ================= ACTIONS ================= */

  // ⬇️ DOWNLOAD (WEB ZIP / MOBILE VIEW)
  const handleDownloadGroup = async (group: PhotoGroup) => {
    if (Platform.OS === 'web') {
      await downloadGroupAsZip(group);
    } else {
      await Linking.openURL(
        `constructionerp://photo-group/${group.groupId}`
      );
    }
  };

  // 🔗 SHARE
  const handleShareGroup = async (group: PhotoGroup) => {
    const link =
      Platform.OS === 'web'
        ? `${window.location.origin}/photo-group/${group.groupId}`
        : `constructionerp://photo-group/${group.groupId}`;

    const message =
      `📸 Site Update\n` +
      `Site: ${group.siteName}\n` +
      `Date: ${group.date}\n\n` +
      `View all photos:\n${link}`;

    await Linking.openURL(
      `whatsapp://send?text=${encodeURIComponent(message)}`
    );
  };

  /* ================= UI ================= */
  return (
    <ThemedView style={{ flex: 1 }}>
      <FlatList
        data={groups}
        keyExtractor={g => g.groupId}
        contentContainerStyle={{ padding: Spacing.lg }}
        renderItem={({ item }) => (
          <View
            style={[
              styles.card,
              { backgroundColor: theme.backgroundDefault },
            ]}
          >
            {/* HEADER */}
            <View style={styles.row}>
              <ThemedText type="body">{item.siteName}</ThemedText>

              <View style={styles.actions}>
                {/* DOWNLOAD */}
                <Pressable onPress={() => handleDownloadGroup(item)}>
                  <Feather
                    name="download"
                    size={18}
                    color={Colors.light.primary}
                  />
                </Pressable>

                {/* SHARE */}
                <Pressable onPress={() => handleShareGroup(item)}>
                  <Feather
                    name="share-2"
                    size={18}
                    color={Colors.light.primary}
                  />
                </Pressable>
              </View>
            </View>

            {/* META */}
            <ThemedText type="small">
              {item.date} • {item.items.length} photos
            </ThemedText>

            {/* THUMBNAILS */}
            <FlatList
              horizontal
              data={item.items}
              keyExtractor={p => p.id}
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <Image source={{ uri: item.url }} style={styles.thumb} />
              )}
            />
          </View>
        )}
      />
    </ThemedView>
  );
}

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  card: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  actions: {
    flexDirection: 'row',
    gap: 14,
  },
  thumb: {
    width: 140,
    height: 100,
    marginRight: 8,
    borderRadius: 8,
  },
});
