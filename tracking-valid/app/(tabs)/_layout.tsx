import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,

        // --- FIXED FUTURISTIC TAB BAR ---
        tabBarStyle: {
          backgroundColor: '#0e1310',
          position: 'absolute',

          // FIX: prevent cut-off on both Android + iOS
          bottom: Platform.OS === 'ios' ? 40 : 30,
          left: 20,
          right: 20,

          height: 58, // FIX: slightly smaller height
          paddingVertical: 6,

          borderRadius: 20,
          borderWidth: 1,
          borderColor: 'rgba(196,255,133,0.25)',

          // Glow effect
          shadowColor: '#c4ff85',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.18,
          shadowRadius: 10,
          elevation: 10,
        },

        tabBarInactiveTintColor: '#7f8f80',
        tabBarActiveTintColor: '#c4ff85',

        tabBarButton: HapticTab,

        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 4, // FIX: center label better
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={22} name="house.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
