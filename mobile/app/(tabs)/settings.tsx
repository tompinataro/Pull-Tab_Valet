import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Settings</Text>
      <Text style={styles.p}>MVP: account + sign out.</Text>

      <Pressable style={styles.btn} onPress={() => {}}>
        <Text style={styles.btnText}>Sign out (stub)</Text>
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
});
