import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';

const sampleData = [
  { id: '1', symbol: 'NEPSE', price: 1500 },
  { id: '2', symbol: 'NABIL', price: 1200 },
  { id: '3', symbol: 'HBL', price: 900 },
];

export default function WatchlistScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Watchlist</Text>
      <FlatList
        data={sampleData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text style={styles.symbol}>{item.symbol}</Text>
            <Text style={styles.price}>NPR {item.price}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  symbol: { fontSize: 18 },
  price: { fontSize: 18, fontWeight: '600' },
});
