import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as FileSystem from 'expo-file-system';
import { fromByteArray, toByteArray } from 'base64-js';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

import { getBox, listDeposits, listPrizes, setBoxStatus, createReportRow } from '../../../src/lib/data';
import { supabase } from '../../../src/lib/supabase';
import { isDemoSessionActive } from '../../../src/lib/auth';

const FileSystemCompat = FileSystem as any;
const CACHE_DIR: string = FileSystemCompat.cacheDirectory ?? FileSystemCompat.Paths?.cache?.uri ?? '';
const ENCODING = FileSystemCompat.EncodingType ?? { UTF8: 'utf8', Base64: 'base64' };

function centsToDollars(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function CloseoutScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [startingCash, setStartingCash] = useState('0');
  const [varianceNotes, setVarianceNotes] = useState('');
  const [managerName, setManagerName] = useState('');
  const [variance, setVariance] = useState(0);
  const [loading, setLoading] = useState(false);

  const [venueId, setVenueId] = useState<string>('');

  useEffect(() => {
    if (!id) return;
    getBox(id)
      .then((b) => setVenueId(b.venue_id))
      .catch(() => {});
  }, [id]);

  async function generatePdfAndCsv(params: {
    boxUpc: string;
    depositTotalCents: number;
    prizeTotalCents: number;
    startingCashDollars: number;
    variance: number;
    managerName: string;
    varianceNotes: string;
  }) {
    const now = new Date();
    const stamp = now.toISOString().replace(/[:.]/g, '-');

    // CSV
    const csv = [
      ['field', 'value'],
      ['box_upc', params.boxUpc],
      ['starting_cash', String(params.startingCashDollars)],
      ['deposit_total', centsToDollars(params.depositTotalCents)],
      ['prize_total', centsToDollars(params.prizeTotalCents)],
      ['variance', String(params.variance)],
      ['manager', params.managerName],
      ['variance_notes', params.varianceNotes],
      ['closed_at', now.toISOString()],
    ]
      .map((r) => r.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
      .join('\n');

    const csvPath = `${CACHE_DIR}closeout-${params.boxUpc}-${stamp}.csv`;
    await FileSystem.writeAsStringAsync(csvPath, csv, { encoding: ENCODING.UTF8 });

    // PDF
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const page = pdfDoc.addPage([612, 792]);
    const { height } = page.getSize();

    const lines = [
      `Pull-Tab Valet Closeout`,
      `Box UPC: ${params.boxUpc}`,
      `Closed at: ${now.toISOString()}`,
      `Starting cash: $${params.startingCashDollars}`,
      `Deposit total: $${centsToDollars(params.depositTotalCents)}`,
      `Prize total: $${centsToDollars(params.prizeTotalCents)}`,
      `Variance: ${params.variance}`,
      `Manager: ${params.managerName}`,
      `Variance notes: ${params.varianceNotes || '-'}`,
    ];

    let y = height - 72;
    for (const line of lines) {
      page.drawText(line, { x: 72, y, size: 12, font, color: rgb(0, 0, 0) });
      y -= 18;
    }

    const pdfBytes = await pdfDoc.save();
    const pdfPath = `${CACHE_DIR}closeout-${params.boxUpc}-${stamp}.pdf`;
    const pdfBase64 = fromByteArray(pdfBytes);
    await FileSystem.writeAsStringAsync(pdfPath, pdfBase64, { encoding: ENCODING.Base64 });

    return { csvPath, pdfPath, stamp };
  }

  async function uploadFile(bucket: string, storagePath: string, localPath: string, contentType: string) {
    const base64 = await FileSystem.readAsStringAsync(localPath, { encoding: ENCODING.Base64 });
    const bytes = toByteArray(base64);
    const storage = supabase!;
    const { data, error } = await storage.storage.from(bucket).upload(storagePath, bytes, {
      contentType,
      upsert: true,
    });
    if (error) throw error;
    return data;
  }

  async function closeAndGenerate() {
    if (!id) return;
    const mgr = managerName.trim();
    if (!mgr) {
      Alert.alert('Closeout', 'Manager name is required.');
      return;
    }

    const starting = Number(startingCash.trim() || '0');
    if (!Number.isFinite(starting) || starting < 0) {
      Alert.alert('Closeout', 'Starting cash must be a number >= 0.');
      return;
    }

    setLoading(true);
    try {
      const demoMode = await isDemoSessionActive();
      const box = await getBox(id);
      const [deposits, prizes] = await Promise.all([listDeposits(id), listPrizes(id)]);
      const depTotal = deposits.reduce((s, d) => s + d.amount_cents, 0);
      const prizeTotal = prizes.reduce((s, p) => s + p.amount_cents, 0);

      const computedVariance = Math.round(starting * 100) + depTotal - prizeTotal;
      setVariance(computedVariance);

      // Close status
      await setBoxStatus(id, venueId || box.venue_id, 'closed');

      // Generate artifacts
      const { csvPath, pdfPath, stamp } = await generatePdfAndCsv({
        boxUpc: box.upc,
        depositTotalCents: depTotal,
        prizeTotalCents: prizeTotal,
        startingCashDollars: starting,
        variance: computedVariance,
        managerName: mgr,
        varianceNotes: varianceNotes.trim(),
      });

      // Upload
      const basePath = `${box.venue_id}/${box.id}/${stamp}`;
      const pdfStoragePath = `${basePath}/closeout.pdf`;
      const csvStoragePath = `${basePath}/closeout.csv`;

      if (!demoMode) {
        if (!supabase) {
          throw new Error('Remote sync is not configured in this build.');
        }

        await uploadFile('reports', pdfStoragePath, pdfPath, 'application/pdf');
        await uploadFile('reports', csvStoragePath, csvPath, 'text/csv');
      }

      await Promise.all([
        createReportRow({ venue_id: box.venue_id, box_id: box.id, type: 'closeout_pdf', storage_path: pdfStoragePath, mime_type: 'application/pdf' }),
        createReportRow({ venue_id: box.venue_id, box_id: box.id, type: 'closeout_csv', storage_path: csvStoragePath, mime_type: 'text/csv' }),
      ]);

      Alert.alert('Closed', demoMode ? 'Closeout report generated in demo mode.' : 'Closeout report generated and uploaded.');
      router.replace({ pathname: '/(tabs)/box/[id]', params: { id: box.id, venueId: box.venue_id } });
    } catch (e: any) {
      Alert.alert('Closeout', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Closeout</Text>
      <Text style={styles.p}>Deposits + prizes totals are auto-calculated.</Text>

      <Text style={styles.label}>Expected starting cash (default 0)</Text>
      <TextInput
        value={startingCash}
        onChangeText={(t) => setStartingCash(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        style={styles.input}
      />

      <Text style={styles.label}>Variance notes (optional)</Text>
      <TextInput value={varianceNotes} onChangeText={setVarianceNotes} style={styles.input} />

      <Text style={styles.label}>Manager name (required)</Text>
      <TextInput value={managerName} onChangeText={setManagerName} style={styles.input} />

      <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={closeAndGenerate} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Closing…' : 'Close & Generate Report'}</Text>
      </Pressable>

      {variance !== 0 ? <Text style={styles.p}>Variance (cents): {variance}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0b0b0f', padding: 16, paddingTop: 64 },
  h1: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 10 },
  p: { color: '#c9c9d1', fontSize: 14, marginBottom: 12 },
  label: { color: '#9a9ab0', fontSize: 12, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#2d2d3e', borderRadius: 12, padding: 12, color: 'white', backgroundColor: '#12121a', marginBottom: 12 },
  btn: { backgroundColor: '#5f162d', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '900' },
  btnDisabled: { opacity: 0.65 },
});
