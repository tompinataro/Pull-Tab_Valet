import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { listVenues } from '../../src/lib/data';
import type { Venue } from '../../src/lib/types';

export default function VenuesScreen() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const rows = await listVenues();
      setVenues(rows);
    } catch (e: any) {
      Alert.alert('Venues', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const empty = useMemo(() => !loading && venues.length === 0, [loading, venues.length]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Venues</Text>
        <Pressable
          style={styles.primaryBtn}
          onPress={() => router.push('/(tabs)/venue/new')}
        >
          <Text style={styles.primaryText}>New</Text>
        </Pressable>
      </View>

      <FlatList
        data={venues}
        keyExtractor={(v) => v.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => router.push({ pathname: '/(tabs)/venue/[id]', params: { id: item.id } })}
            style={styles.row}
          >
            <Text style={styles.name}>{item.name}</Text>
            {item.address ? <Text style={styles.meta}>{item.address}</Text> : null}
          </Pressable>
        )}
        ListEmptyComponent={
          empty ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.p}>No venues yet.</Text>
              <Pressable style={styles.primaryBtnWide} onPress={() => router.push('/(tabs)/venue/new')}>
                <Text style={styles.primaryText}>Create your first venue</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { color: 'white', fontSize: 24, fontWeight: '900' },
  p: { color: '#c9c9d1', fontSize: 14 },
  row: { borderWidth: 1, borderColor: '#242431', borderRadius: 14, padding: 12, backgroundColor: '#12121a' },
  name: { color: 'white', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  meta: { color: '#9a9ab0', fontSize: 12 },
  primaryBtn: {
    backgroundColor: '#0b2f87',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  primaryBtnWide: {
    backgroundColor: '#0b2f87',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  primaryText: { color: 'white', fontWeight: '900', fontSize: 12 },
});
