import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Image,
  Text,
  View,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; // Make sure this is installed
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { useRoute } from '@react-navigation/native';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const GAP = 12;
const NUM_COLUMNS = 2;
const SIZE = (width - GAP * 3) / NUM_COLUMNS;

export default function PhotoGroupScreen() {
  const { params } = useRoute<any>();
  const groupId = params?.groupId;

  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) return;

    const q = query(collection(db, 'photos'));

    const unsub = onSnapshot(q, snap => {
      const arr: any[] = [];

      snap.forEach(d => {
        const data = d.data();
        const date = format(
          data.createdAt?.toDate?.() || new Date(),
          'yyyy-MM-dd'
        );
        const computedGroupId =
          data.groupId || `${data.siteId}_${date}`;

        if (computedGroupId === groupId) {
          arr.push({ id: d.id, ...data });
        }
      });

      setPhotos(arr);
      setLoading(false);
    });

    return unsub;
  }, [groupId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>Loading photos…</Text>
      </SafeAreaView>
    );
  }

  if (!photos.length) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.muted}>No photos found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* PAGE HEADER */}
      <Text style={styles.pageTitle}>Photos</Text>

      {/* IMAGE GRID */}
      <FlatList
        data={photos}
        keyExtractor={item => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={{
          paddingHorizontal: GAP,
          paddingBottom: GAP * 2,       // a bit more bottom space looks nicer
          paddingTop: GAP + 15,          // ← this prevents top images from being hidden
          gap: GAP,
        }}
        columnWrapperStyle={{ gap: GAP }}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.url }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
      />
    </SafeAreaView>
  );
}

/* ── STYLES ── */
const styles = StyleSheet.create({
  pageTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    backgroundColor: '#fff', // helps if you ever add shadow/elevation later
  },
  list: {
    // We moved most of these to inline contentContainerStyle for clarity
  },
  image: {
    width: SIZE,
    height: SIZE,
    borderRadius: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  muted: {
    color: '#6B7280',
    fontSize: 14,
  },
});