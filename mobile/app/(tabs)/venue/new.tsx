import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { createVenue } from '../../../src/lib/data';

export default function NewVenueScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function save() {
    const n = name.trim();
    if (!n) {
      Alert.alert('Venue', 'Name is required');
      return;
    }
    setLoading(true);
    try {
      const v = await createVenue({ name: n, address: address.trim() || undefined, notes: notes.trim() || undefined });
      router.replace({ pathname: '/(tabs)/venue/[id]', params: { id: v.id } });
    } catch (e: any) {
      Alert.alert('Venue', String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>New Venue</Text>

      <Text style={styles.label}>Name</Text>
      <TextInput value={name} onChangeText={setName} style={styles.input} placeholderTextColor="#7f7f91" />

      <Text style={styles.label}>Address</Text>
      <TextInput value={address} onChangeText={setAddress} style={styles.input} placeholderTextColor="#7f7f91" />

      <Text style={styles.label}>Notes</Text>
      <TextInput value={notes} onChangeText={setNotes} style={[styles.input, { height: 110 }]} multiline placeholderTextColor="#7f7f91" />

      <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={save} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Saving…' : 'Save'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  h1: { color: 'white', fontSize: 24, fontWeight: '900', marginBottom: 16 },
  label: { color: '#9a9ab0', fontSize: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    backgroundColor: '#12121a',
    marginBottom: 12,
  },
  btn: { backgroundColor: '#0b2f87', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  btnText: { color: 'white', fontWeight: '900' },
  btnDisabled: { opacity: 0.65 },
});
