import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function SignInScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Pull-Tab Valet</Text>
      <Text style={styles.p}>Sign in (Supabase auth coming next).</Text>

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

      <Pressable
        style={styles.btn}
        onPress={() => {
          // stub until Supabase wired
          router.replace('/(tabs)/venues');
        }}
      >
        <Text style={styles.btnText}>Sign In (stub)</Text>
      </Pressable>
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
});
