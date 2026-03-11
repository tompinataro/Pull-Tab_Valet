import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import {
  addDeposit,
  addPrize,
  getBox,
  listAuditEventsForBox,
  listDeposits,
  listPrizes,
  setBoxStatus,
} from '../../../src/lib/data';
import type { AuditEvent, Box, Deposit, Prize } from '../../../src/lib/types';

function dollarsToNumber(s: string): number | null {
  const t = s.trim();
  if (!/^[0-9]+$/.test(t)) return null;
  const n = Number(t);
  if (!Number.isFinite(n)) return null;
  return n;
}

export default function BoxDetailScreen() {
  const router = useRouter();
  const { id, venueId } = useLocalSearchParams<{ id: string; venueId?: string }>();

  const [box, setBox] = useState<Box | null>(null);
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([] as any);

  const [depositOpen, setDepositOpen] = useState(false);
  const [prizeOpen, setPrizeOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const resolvedVenueId = useMemo(() => venueId || box?.venue_id || '', [venueId, box?.venue_id]);

  async function refresh() {
    if (!id) return;
    try {
      const b = await getBox(id);
      setBox(b);
      const [d, p, a] = await Promise.all([listDeposits(id), listPrizes(id), listAuditEventsForBox(id)]);
      setDeposits(d);
      setPrizes(p);
      setAudit(a as any);
    } catch (e: any) {
      Alert.alert('Box', String(e?.message || e));
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const depositTotal = deposits.reduce((sum, d) => sum + d.amount_cents, 0);
  const prizeTotal = prizes.reduce((sum, p) => sum + p.amount_cents, 0);

  async function doAddDeposit() {
    if (!box) return;
    if (box.status === 'closed') {
      Alert.alert('Closed', 'Reopen the box to add deposits.');
      return;
    }
    const n = dollarsToNumber(amount);
    if (n === null) {
      Alert.alert('Deposit', 'Enter whole dollars only.');
      return;
    }
    try {
      await addDeposit(box.id, resolvedVenueId, n, note.trim() || undefined);
      setDepositOpen(false);
      setAmount('');
      setNote('');
      await refresh();
    } catch (e: any) {
      Alert.alert('Deposit', String(e?.message || e));
    }
  }

  async function doAddPrize() {
    if (!box) return;
    if (box.status === 'closed') {
      Alert.alert('Closed', 'Reopen the box to add prizes.');
      return;
    }
    const n = dollarsToNumber(amount);
    if (n === null) {
      Alert.alert('Prize', 'Enter whole dollars only.');
      return;
    }
    try {
      await addPrize(box.id, resolvedVenueId, n, note.trim() || undefined);
      setPrizeOpen(false);
      setAmount('');
      setNote('');
      await refresh();
    } catch (e: any) {
      Alert.alert('Prize', String(e?.message || e));
    }
  }

  async function setLive() {
    if (!box) return;
    try {
      await setBoxStatus(box.id, resolvedVenueId, 'live');
      await refresh();
    } catch (e: any) {
      Alert.alert('Status', String(e?.message || e));
    }
  }

  async function closeBox() {
    if (!box) return;
    if (box.status === 'closed') return;
    Alert.alert('Close', 'Are you sure you want to close this box?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Continue',
        onPress: () => {
          router.push({ pathname: '/(tabs)/closeout/[id]', params: { id: box.id } });
        },
      },
    ]);
  }

  async function reopen() {
    if (!box) return;
    Alert.alert('Reopen', 'Reopening may require reports to be re-run. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reopen',
        onPress: async () => {
          try {
            await setBoxStatus(box.id, resolvedVenueId, 'new');
            await refresh();
          } catch (e: any) {
            Alert.alert('Reopen', String(e?.message || e));
          }
        },
      },
    ]);
  }

  if (!box) {
    return (
      <View style={styles.container}>
        <Text style={styles.h1}>Loading…</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Text style={styles.h1}>Box</Text>
      <Text style={styles.mono}>{box.upc}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.value}>{box.status.toUpperCase()}</Text>
        <View style={styles.row}>
          <Pressable style={styles.btn} onPress={setLive}>
            <Text style={styles.btnText}>Set Live</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => setDepositOpen(true)}>
            <Text style={styles.btnText}>Add Deposit</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={() => setPrizeOpen(true)}>
            <Text style={styles.btnText}>Add Prize</Text>
          </Pressable>
        </View>
        <View style={styles.row}>
          <Pressable style={styles.btnWarn} onPress={closeBox}>
            <Text style={styles.btnText}>Close</Text>
          </Pressable>
          {box.status === 'closed' ? (
            <Pressable style={styles.btn} onPress={reopen}>
              <Text style={styles.btnText}>Reopen</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Totals</Text>
        <Text style={styles.value}>Deposits: ${(depositTotal / 100).toFixed(2)} · Prizes: ${(prizeTotal / 100).toFixed(2)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.label}>Audit log</Text>
        {audit.length === 0 ? <Text style={styles.value}>No events yet.</Text> : null}
        {audit.slice(0, 10).map((e: any) => (
          <Text key={e.id} style={styles.auditItem}>
            {e.created_at.slice(0, 19).replace('T', ' ')} · {e.event_type}
          </Text>
        ))}
      </View>

      {/* Deposit modal */}
      <Modal visible={depositOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.h1}>Add Deposit</Text>
            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Whole dollars"
              placeholderTextColor="#7f7f91"
              style={styles.input}
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Notes (optional)"
              placeholderTextColor="#7f7f91"
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={styles.btn} onPress={() => setDepositOpen(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={doAddDeposit}>
                <Text style={styles.btnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Prize modal */}
      <Modal visible={prizeOpen} transparent animationType="slide">
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.h1}>Add Prize</Text>
            <TextInput
              value={amount}
              onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="Whole dollars"
              placeholderTextColor="#7f7f91"
              style={styles.input}
            />
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Notes (optional)"
              placeholderTextColor="#7f7f91"
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable style={styles.btn} onPress={() => setPrizeOpen(false)}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.btnPrimary} onPress={doAddPrize}>
                <Text style={styles.btnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f', padding: 16, paddingTop: 64 },
  h1: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 8 },
  mono: { color: '#c9c9d1', fontFamily: 'Menlo', marginBottom: 12 },
  card: { borderWidth: 1, borderColor: '#242431', borderRadius: 14, padding: 12, backgroundColor: '#12121a', marginBottom: 12 },
  label: { color: '#9a9ab0', fontSize: 12, marginBottom: 6 },
  value: { color: 'white', fontSize: 14, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: 10 },
  btn: { borderWidth: 1, borderColor: '#2d2d3e', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12 },
  btnWarn: { borderWidth: 1, borderColor: '#5f162d', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#5f162d' },
  btnPrimary: { borderWidth: 1, borderColor: '#0b2f87', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, backgroundColor: '#0b2f87' },
  btnText: { color: 'white', fontWeight: '800', fontSize: 12 },
  auditItem: { color: '#c9c9d1', fontSize: 12, marginTop: 6 },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#0b0b0f', borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 16, gap: 10 },
  input: { borderWidth: 1, borderColor: '#2d2d3e', borderRadius: 12, padding: 12, color: 'white', backgroundColor: '#12121a' },
});
