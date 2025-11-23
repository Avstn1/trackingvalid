import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

const TAB_BAR_STYLES = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1a1a1a',
    position: 'absolute',
    bottom: 0, // Flush to bottom
    left: 0,
    right: 0,
    height: 75,
    paddingVertical: 8,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15, // Safe area padding
    
    // Only top border
    borderTopWidth: 1,
    borderTopColor: 'rgba(196,255,133,0.15)',
    
    // Glow effect from top
    shadowColor: '#c4ff85',
    shadowOffset: { width: 0, height: -4 }, // Negative to glow upward
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

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
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
        name="index"
        options={{ 
          href: null, // This hides it from the tab bar
        }} 
      />

      <Tabs.Screen 
        name="login" 
        options={{ 
          title: 'Login',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 26 : 22} 
              name="person.fill" 
              color={color} 
            />
          ),
        }} 
      />

      <Tabs.Screen
        name="signup"
        options={{
          title: 'Signup',
          tabBarIcon: ({ color, focused }) => (
            <IconSymbol 
              size={focused ? 26 : 22} 
              name="person.crop.circle.badge.plus" 
              color={color} 
            />
          ),
        }}
      />
    </Tabs>
  );
}