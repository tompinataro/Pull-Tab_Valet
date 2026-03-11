import { StyleSheet, Text, View } from 'react-native';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.h1}>Reports</Text>
      <Text style={styles.p}>MVP: basic closeout/report stub; filters later.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, paddingTop: 64, backgroundColor: '#0b0b0f' },
  h1: { color: 'white', fontSize: 24, fontWeight: '800', marginBottom: 10 },
  p: { color: '#c9c9d1', fontSize: 14, lineHeight: 20 },
});
