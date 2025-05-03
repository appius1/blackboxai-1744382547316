import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';

export default function TradingScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Trading</Text>
      <Text style={styles.info}>Market and Limit order entry will be implemented here.</Text>
      <Button title="Buy" onPress={() => {}} />
      <Button title="Sell" onPress={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  info: { fontSize: 16, marginBottom: 20 },
});
