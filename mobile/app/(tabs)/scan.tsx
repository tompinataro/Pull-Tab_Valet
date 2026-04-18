import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { useRouter } from 'expo-router';

import { ensureSchema, upsertScan } from '../../src/lib/db/index';
import { createVenue, getOrCreateBoxByVenueUpc, listVenues } from '../../src/lib/data';
import type { Venue } from '../../src/lib/types';

function isValidUpc(s: string) {
  if (!/^[0-9]+$/.test(s)) return false;
  return s.length === 12 || s.length === 13;
}

type Mode = 'single' | 'batch';

type UiState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'camera' };

export default function ScanScreen() {
  const router = useRouter();
  const isDesktop = Platform.OS === 'web';
  const [permission, requestPermission] = useCameraPermissions();

  const [mode, setMode] = useState<Mode>('single');
  const [ui, setUi] = useState<UiState>({ kind: 'idle' });

  const [venueModalOpen, setVenueModalOpen] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);

  const [createVenueOpen, setCreateVenueOpen] = useState(false);
  const [newVenueName, setNewVenueName] = useState('');
  const [newVenueAddress, setNewVenueAddress] = useState('');

  const [manualOpen, setManualOpen] = useState(false);
  const [manualUpc, setManualUpc] = useState('');

  const lastUpcRef = useRef<string | null>(null);

  useEffect(() => {
    ensureSchema().catch(() => {});
  }, []);

  const permissionGranted = isDesktop ? true : permission?.granted;

  async function refreshVenues() {
    setVenuesLoading(true);
    try {
      const rows = await listVenues();
      setVenues(rows);
    } catch (e: any) {
      Alert.alert('Venues', String(e?.message || e));
    } finally {
      setVenuesLoading(false);
    }
  }

  async function openVenuePicker() {
    setVenueModalOpen(true);
    await refreshVenues();
  }

  function beginScan() {
    setSelectedVenue(null);
    lastUpcRef.current = null;
    openVenuePicker().catch(() => {});
  }

  async function onVenuePicked(v: Venue) {
    setSelectedVenue(v);
    setVenueModalOpen(false);

    if (isDesktop) {
      // Desktop/Electron: use manual entry (camera scanning is not supported/reliable).
      setManualUpc('');
      setManualOpen(true);
      setUi({ kind: 'idle' });
      return;
    }

    setUi({ kind: 'camera' });
  }

  async function onCreateVenue() {
    const name = newVenueName.trim();
    if (!name) {
      Alert.alert('Venue', 'Name is required');
      return;
    }
    try {
      const v = await createVenue({ name, address: newVenueAddress.trim() || undefined });
      setCreateVenueOpen(false);
      setNewVenueName('');
      setNewVenueAddress('');
      await refreshVenues();
      await onVenuePicked(v);
    } catch (e: any) {
      Alert.alert('Venue', String(e?.message || e));
    }
  }

  async function handleUpc(upc: string) {
    const venue = selectedVenue;
    if (!venue) return;

    // de-dupe immediate repeats
    if (lastUpcRef.current === upc) return;
    lastUpcRef.current = upc;

    // Always store scan locally (offline-first for scanning)
    await upsertScan(venue.id, upc);

    try {
      // Single-scan flow: create/get box and open details
      const box = await getOrCreateBoxByVenueUpc(venue.id, upc);
      router.push({ pathname: '/(tabs)/box/[id]', params: { id: box.id, venueId: venue.id } });
    } catch (e: any) {
      Alert.alert('Scan', String(e?.message || e));
    }
  }

  async function onBarcodeScanned(res: BarcodeScanningResult) {
    if (ui.kind !== 'camera') return;
    const data = String(res.data || '').trim();
    if (!data) return;
    if (!isValidUpc(data)) return;

    if (mode === 'batch') {
      // In batch, just save local queue and toast-like alert (simple for now)
      const venue = selectedVenue;
      if (!venue) return;
      await upsertScan(venue.id, data);
      Alert.alert('Saved', data);
      return;
    }

    await handleUpc(data);
  }

  function openManual() {
    if (!selectedVenue) {
      openVenuePicker().catch(() => {});
      return;
    }
    setManualUpc('');
    setManualOpen(true);
  }

  async function submitManual() {
    const upc = manualUpc.trim();
    if (!isValidUpc(upc)) {
      Alert.alert('Manual entry', 'Enter a 12 or 13 digit UPC/EAN.');
      return;
    }
    setManualOpen(false);
    await handleUpc(upc);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.h1}>Scan</Text>
        <Pressable
          onPress={() => setMode((m) => (m === 'single' ? 'batch' : 'single'))}
          style={styles.modeBtn}
        >
          <Text style={styles.modeText}>{mode === 'single' ? 'Single' : 'Batch'}</Text>
        </Pressable>
      </View>

      <Text style={styles.p}>
        Venue required every time. {isDesktop ? 'Desktop uses manual code entry for each venue.' : 'Manual entry is available if scanning is unavailable.'}
      </Text>

      {!isDesktop && !permissionGranted ? (
        <Pressable onPress={requestPermission} style={styles.primaryBtn}>
          <Text style={styles.primaryText}>Enable Camera</Text>
        </Pressable>
      ) : null}

      <Pressable onPress={beginScan} style={styles.primaryBtn}>
        <Text style={styles.primaryText}>{isDesktop ? 'Choose Venue & Enter Code' : 'Choose Venue & Scan'}</Text>
      </Pressable>

      <Pressable onPress={openManual} style={styles.secondaryBtn}>
        <Text style={styles.secondaryText}>{selectedVenue ? 'Enter code for selected venue' : 'Choose venue first'}</Text>
      </Pressable>

      {/* Camera modal (native only) */}
      {!isDesktop ? (
        <Modal visible={ui.kind === 'camera'} animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['upc_a', 'ean13'] }}
              onBarcodeScanned={onBarcodeScanned}
            />
            <View style={styles.cameraOverlay}>
              <View style={styles.topRow}>
                <Text style={styles.cameraTitle}>{selectedVenue ? selectedVenue.name : 'Scan'}</Text>
                <Pressable onPress={() => setUi({ kind: 'idle' })} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Close</Text>
                </Pressable>
              </View>
              <View style={styles.frame} />
              <Text style={styles.help}>Aim UPC/EAN inside the box.</Text>
            </View>
          </View>
        </Modal>
      ) : null}

      {/* Venue picker */}
      <Modal visible={venueModalOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.h1}>Select Venue</Text>
            <Pressable onPress={() => setVenueModalOpen(false)} style={styles.smallBtnDark}>
              <Text style={styles.smallBtnText}>Close</Text>
            </Pressable>
          </View>

          {venuesLoading ? <ActivityIndicator /> : null}

          <FlatList
            data={venues}
            keyExtractor={(v) => v.id}
            contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => onVenuePicked(item)} style={styles.venueRow}>
                <Text style={styles.venueName}>{item.name}</Text>
                {item.address ? <Text style={styles.venueMeta}>{item.address}</Text> : null}
              </Pressable>
            )}
            ListEmptyComponent={
              !venuesLoading ? (
                <View style={{ gap: 10 }}>
                  <Text style={styles.p}>No venues yet.</Text>
                  <Pressable onPress={() => setCreateVenueOpen(true)} style={styles.primaryBtn}>
                    <Text style={styles.primaryText}>Create venue</Text>
                  </Pressable>
                </View>
              ) : null
            }
          />

          <Pressable onPress={() => setCreateVenueOpen(true)} style={styles.secondaryBtn}>
            <Text style={styles.secondaryText}>Create venue</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Create venue */}
      <Modal visible={createVenueOpen} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.h1}>New Venue</Text>
            <Pressable onPress={() => setCreateVenueOpen(false)} style={styles.smallBtnDark}>
              <Text style={styles.smallBtnText}>Close</Text>
            </Pressable>
          </View>

          <TextInput
            value={newVenueName}
            onChangeText={setNewVenueName}
            placeholder="Venue name"
            placeholderTextColor="#7f7f91"
            style={styles.input}
          />
          <TextInput
            value={newVenueAddress}
            onChangeText={setNewVenueAddress}
            placeholder="Address (optional)"
            placeholderTextColor="#7f7f91"
            style={styles.input}
          />

          <Pressable onPress={onCreateVenue} style={styles.primaryBtn}>
            <Text style={styles.primaryText}>Create</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Manual */}
      <Modal visible={manualOpen} animationType="slide" transparent>
        <View style={styles.sheetBackdrop}>
          <View style={styles.sheet}>
            <Text style={styles.h1}>Manual Entry</Text>
            <TextInput
              value={manualUpc}
              onChangeText={(t) => setManualUpc(t.replace(/[^0-9]/g, ''))}
              keyboardType="number-pad"
              placeholder="12 or 13 digit UPC"
              placeholderTextColor="#7f7f91"
              style={styles.input}
            />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => setManualOpen(false)} style={styles.secondaryBtn}>
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={submitManual} style={styles.primaryBtn}>
                <Text style={styles.primaryText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  h1: { color: 'white', fontSize: 24, fontWeight: '800' },
  p: { color: '#c9c9d1', fontSize: 14, lineHeight: 20, marginTop: 6, marginBottom: 16 },
  modeBtn: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#12121a',
  },
  modeText: { color: 'white', fontWeight: '800', fontSize: 12 },
  primaryBtn: {
    backgroundColor: '#0b2f87',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
  },
  primaryText: { color: 'white', fontWeight: '900' },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#12121a',
  },
  secondaryText: { color: 'white', fontWeight: '800' },
  cameraOverlay: { flex: 1, paddingTop: 16, paddingHorizontal: 14, justifyContent: 'space-between' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cameraTitle: {
    color: 'white',
    fontWeight: '900',
    fontSize: 14,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  smallBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  smallBtnDark: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#12121a',
  },
  smallBtnText: { color: 'white', fontSize: 12, fontWeight: '800' },
  frame: {
    alignSelf: 'center',
    width: '86%',
    height: 160,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: 18,
  },
  help: {
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    paddingBottom: 18,
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  modalContainer: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  venueRow: { borderWidth: 1, borderColor: '#242431', borderRadius: 14, padding: 12, backgroundColor: '#12121a' },
  venueName: { color: 'white', fontSize: 16, fontWeight: '900', marginBottom: 4 },
  venueMeta: { color: '#9a9ab0', fontSize: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    marginBottom: 10,
    backgroundColor: '#12121a',
  },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#0b0b0f',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 16,
    gap: 10,
  },
});
