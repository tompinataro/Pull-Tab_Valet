import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

import { DEMO_EMAIL, DEMO_PASSWORD, signInWithAppAuth } from '../../src/lib/auth';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signIn() {
    setError(null);
    setLoading(true);
    try {
      await signInWithAppAuth(email, password);
      router.replace('/(tabs)/venues');
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Pull-Tab Valet</Text>
      <Text style={styles.p}>Sign in to sync your venues, or use the prefilled demo account to explore the desktop app.</Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="Email"
        placeholderTextColor="#7f7f91"
        style={styles.input}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        placeholder="Password"
        placeholderTextColor="#7f7f91"
        secureTextEntry
        style={styles.input}
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable style={[styles.btn, loading && styles.btnDisabled]} onPress={signIn} disabled={loading}>
        <Text style={styles.btnText}>{loading ? 'Signing in…' : 'Sign In'}</Text>
      </Pressable>

      <Text style={styles.help}>Demo access is prefilled for first launch: you can sign in immediately and start with sample venues.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  h1: { color: 'white', fontSize: 28, fontWeight: '900', marginBottom: 8 },
  p: { color: '#c9c9d1', fontSize: 14, lineHeight: 20, marginBottom: 18 },
  input: {
    borderWidth: 1,
    borderColor: '#2d2d3e',
    borderRadius: 12,
    padding: 12,
    color: 'white',
    marginBottom: 10,
    backgroundColor: '#12121a',
  },
  btn: {
    backgroundColor: '#0b2f87',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  btnText: { color: 'white', fontWeight: '900' },
  btnDisabled: { opacity: 0.65 },
  error: { color: '#ff6b6b', marginBottom: 10 },
  help: { color: '#8f90a6', fontSize: 12, lineHeight: 18, marginTop: 12 },
});
