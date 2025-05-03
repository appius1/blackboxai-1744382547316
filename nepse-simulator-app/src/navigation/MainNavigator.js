import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import WatchlistScreen from '../screens/WatchlistScreen';
import TradingScreen from '../screens/TradingScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen';
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator();

export default function MainNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;

          if (route.name === 'Watchlist') {
            iconName = 'list';
          } else if (route.name === 'Trading') {
            iconName = 'swap-horizontal';
          } else if (route.name === 'Analytics') {
            iconName = 'stats-chart';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6200ee',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Watchlist" component={WatchlistScreen} />
      <Tab.Screen name="Trading" component={TradingScreen} />
      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
    </Tab.Navigator>
  );
}
