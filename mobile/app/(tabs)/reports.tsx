import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { getSignedReportUrl, listReports, listVenues } from '../../src/lib/data';
import type { Report, Venue } from '../../src/lib/types';
import { Linking } from 'react-native';

function toIsoDayStart(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString();
}

function toIsoDayEnd(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x.toISOString();
}

export default function ReportsScreen() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venueId, setVenueId] = useState<string | undefined>(undefined);

  const [from, setFrom] = useState(() => toIsoDayStart(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));
  const [to, setTo] = useState(() => toIsoDayEnd(new Date()));

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [vs, rs] = await Promise.all([
        venues.length ? Promise.resolve(venues) : listVenues(),
        listReports({ venueId, from, to }),
      ]);
      setVenues(vs);
      setReports(rs);
    } catch (e: any) {
      Alert.alert('Reports', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueId]);

  const venueName = useMemo(() => {
    if (!venueId) return 'All venues';
    return venues.find((v) => v.id === venueId)?.name ?? 'Venue';
  }, [venueId, venues]);

  async function openReport(r: Report) {
    try {
      const url = await getSignedReportUrl(r.storage_bucket, r.storage_path);
      await Linking.openURL(url);
    } catch (e: any) {
      Alert.alert('Report', String(e?.message || e));
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Reports</Text>
        <Pressable style={styles.primaryBtn} onPress={refresh}>
          <Text style={styles.primaryText}>{loading ? '…' : 'Refresh'}</Text>
        </Pressable>
      </View>

      <View style={styles.filters}>
        <Text style={styles.label}>Venue: {venueName}</Text>
        <View style={styles.row}>
          <Pressable style={styles.chip} onPress={() => setVenueId(undefined)}>
            <Text style={styles.chipText}>All</Text>
          </Pressable>
          {venues.slice(0, 6).map((v) => (
            <Pressable key={v.id} style={styles.chip} onPress={() => setVenueId(v.id)}>
              <Text style={styles.chipText}>{v.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.small}>Date range: last 7 days (hardcoded MVP)</Text>
      </View>

      <FlatList
        data={reports}
        keyExtractor={(r) => r.id}
        refreshing={loading}
        onRefresh={refresh}
        contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => openReport(item)} style={styles.rowCard}>
            <Text style={styles.name}>{item.type}</Text>
            <Text style={styles.meta}>{item.created_at.slice(0, 19).replace('T', ' ')}</Text>
            <Text style={styles.meta}>{item.storage_path}</Text>
          </Pressable>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.p}>No reports yet.</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  h1: { color: 'white', fontSize: 24, fontWeight: '900' },
  p: { color: '#c9c9d1', fontSize: 14 },
  primaryBtn: { backgroundColor: '#0b2f87', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
  primaryText: { color: 'white', fontWeight: '900', fontSize: 12 },
  filters: { marginBottom: 12, gap: 8 },
  label: { color: '#9a9ab0', fontSize: 12 },
  small: { color: '#9a9ab0', fontSize: 12 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: '#2d2d3e', backgroundColor: '#12121a', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { color: 'white', fontSize: 12, fontWeight: '800' },
  rowCard: { borderWidth: 1, borderColor: '#242431', borderRadius: 14, padding: 12, backgroundColor: '#12121a' },
  name: { color: 'white', fontSize: 14, fontWeight: '900', marginBottom: 4 },
  meta: { color: '#9a9ab0', fontSize: 12 },
});
