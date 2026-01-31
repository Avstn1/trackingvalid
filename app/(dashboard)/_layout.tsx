import { HapticTab } from '@/components/haptic-tab';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';

const TAB_BAR_STYLES = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(24, 24, 24, 0.95)',
    backdropFilter: 'blur(20px)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,
    paddingVertical: 8,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 25 : 15,
    
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 16,
  },
  tabBarIcon: {
    marginTop: 2,
  },
  tabBarLabel: {
    display: 'none', // Hide labels
  },
  tabBarItem: {
    borderRadius: 20,
    marginHorizontal: 2,
    paddingVertical: 8,
  },
  activeTabGlow: {
    shadowColor: '#8bcf68ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
});

export default function DashboardLayout() {
  const router = useRouter();

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth event:', event);
      
      if (event === 'SIGNED_OUT' || !session) {
        router.replace('/login');
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <View className="flex-1 bg-[#181818]">
      <Tabs
        initialRouteName="dashboard" 
        screenOptions={{
          headerShown: false,
          tabBarStyle: TAB_BAR_STYLES.tabBar,
          
          tabBarInactiveTintColor: 'rgba(247, 247, 247, 0.3)',
          tabBarActiveTintColor: '#8bcf68ff',
          
          tabBarButton: HapticTab,
          tabBarIconStyle: TAB_BAR_STYLES.tabBarIcon,
          tabBarLabelStyle: TAB_BAR_STYLES.tabBarLabel,
          
          tabBarItemStyle: TAB_BAR_STYLES.tabBarItem,
        }}>

        <Tabs.Screen
          name="reports"
          options={{
            title: '',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && TAB_BAR_STYLES.activeTabGlow}>
                <Ionicons 
                  name={focused ? "document-text" : "document-text-outline"} 
                  size={24} 
                  color={color} 
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="finances"
          options={{
            title: '',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && TAB_BAR_STYLES.activeTabGlow}>
                <Ionicons 
                  name={focused ? "wallet" : "wallet-outline"} 
                  size={24} 
                  color={color} 
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="dashboard"
          options={{
            title: '',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && TAB_BAR_STYLES.activeTabGlow}>
                <Ionicons 
                  name={focused ? "apps" : "apps-outline"} 
                  size={26} 
                  color={color} 
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="clientManager"
          options={{
            title: '',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && TAB_BAR_STYLES.activeTabGlow}>
                <Ionicons 
                  name={focused ? "people-circle" : "people-circle-outline"} 
                  size={24} 
                  color={color} 
                />
              </View>
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <View style={focused && TAB_BAR_STYLES.activeTabGlow}>
                <Ionicons 
                  name={focused ? "settings" : "settings-outline"} 
                  size={24} 
                  color={color} 
                />
              </View>
            ),
          }}
        />
      </Tabs>
    </View>
  );
}