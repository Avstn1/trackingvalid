import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

const TAB_BAR_STYLES = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,255,133,0.15)',
    shadowColor: '#c4ff85',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 12,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
});

export default function DashboardLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: TAB_BAR_STYLES.tabBar,
        tabBarInactiveTintColor: '#7f8f80',
        tabBarActiveTintColor: '#c4ff85',
        tabBarLabelStyle: TAB_BAR_STYLES.tabBarLabel,
      }}>
      <Tabs.Screen 
        name="dashboard" 
        options={{ title: 'Dashboard' }} 
      />
    </Tabs>
  );
}