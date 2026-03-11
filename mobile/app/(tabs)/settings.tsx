import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { supabase } from '../../src/lib/supabase';

export default function SettingsScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      router.replace('/(auth)/sign-in');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.p}>Account</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={signOut} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Signing out…' : 'Sign out'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  h1: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 10 },
  p: { color: '#c9c9d1', fontSize: 14, lineHeight: 20, marginBottom: 14 },
  btn: {
    backgroundColor: '#5f162d',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
  },
  btnText: { color: 'white', fontWeight: '800' },
  btnDisabled: { opacity: 0.65 },
  error: { color: '#ff6b6b', marginBottom: 10 },
});
