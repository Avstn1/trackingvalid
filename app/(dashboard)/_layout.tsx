import { HapticTab } from '@/components/haptic-tab';
import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';

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
  tabBarIcon: {
    marginTop: 4,
  },
  tabBarLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
});

// Map route names to display names
const PAGE_NAMES: Record<string, string> = {
  dashboard: 'Dashboard',
  user_editor: 'User Editor',
  finances: 'Finances',
  profile: 'Profile',
};

export default function DashboardLayout() {
  return (
    <View className="flex-1 bg-[#1a1a1a]">
      <Tabs
        initialRouteName="dashboard" 
        screenOptions={{
          headerShown: false,
          tabBarStyle: TAB_BAR_STYLES.tabBar,
          
          tabBarInactiveTintColor: '#7f8f80',
          tabBarActiveTintColor: '#c4ff85',
          
          tabBarButton: HapticTab,
          tabBarIconStyle: TAB_BAR_STYLES.tabBarIcon,
          tabBarLabelStyle: TAB_BAR_STYLES.tabBarLabel,
          
          tabBarItemStyle: {
            borderRadius: 16,
            marginHorizontal: 4,
          },
        }}>

        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Dashboard',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="grid" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="user_editor"
          options={{
            title: 'User Editor',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="people" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="finances"
          options={{
            title: 'Finances',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="wallet" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            headerShown: false,
            tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" size={size} color={color} />,
          }}
        />
      </Tabs>
    </View>
  );
}