import { StyleSheet, Text, View } from 'react-native';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Scan</Text>
      <Text style={styles.p}>MVP: UPC/EAN scan + manual entry fallback; venue required.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  h1: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 10 },
  p: { color: '#c9c9d1', fontSize: 14, lineHeight: 20 },
});
