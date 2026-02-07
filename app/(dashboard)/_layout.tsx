import { HapticTab } from '@/components/haptic-tab';
import { supabase } from '@/utils/supabaseClient';
import { SPRING, useReducedMotionPreference } from '@/utils/motion';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

const TAB_BAR_STYLES = StyleSheet.create({
  tabBar: {
    backgroundColor: 'rgba(24, 24, 24, 0.95)',
    backdropFilter: 'blur(20px)',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 85 : 70,
    paddingVertical: 6,
    paddingHorizontal: 8,
    paddingBottom: Platform.OS === 'ios' ? 25 : 10,
    
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
    marginBottom: 2,
  },
  tabBarLabel: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: -2,
  },
  tabBarItem: {
    borderRadius: 16,
    marginHorizontal: 2,
    paddingVertical: 4,
  },
  activeTabGlow: {
    shadowColor: '#8bcf68ff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  tabIndicator: {
    height: 2,
    borderRadius: 999,
    marginTop: 3,
    alignSelf: 'center',
    backgroundColor: '#8bcf68ff',
  },
});

type AnimatedTabIconProps = {
  focused: boolean;
  color: string;
  size: number;
  activeName: keyof typeof Ionicons.glyphMap;
  inactiveName: keyof typeof Ionicons.glyphMap;
};

function AnimatedTabIcon({ focused, color, size, activeName, inactiveName }: AnimatedTabIconProps) {
  const reduceMotion = useReducedMotionPreference();
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      progress.value = focused ? 1 : 0;
    } else {
      progress.value = withSpring(focused ? 1 : 0, SPRING.bouncy);
    }
  }, [focused, reduceMotion, progress]);

  const iconStyle = useAnimatedStyle(() => {
    if (reduceMotion) {
      return {
        transform: [{ translateY: 0 }, { scale: 1 }],
        opacity: 1,
      };
    }

    return {
      transform: [
        { translateY: interpolate(progress.value, [0, 1], [3, -3]) },
        { scale: interpolate(progress.value, [0, 0.5, 1], [1, 1.15, 1.1]) },
      ],
      opacity: interpolate(progress.value, [0, 1], [0.5, 1]),
    };
  }, [reduceMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    width: interpolate(progress.value, [0, 1], [4, 20]),
    opacity: interpolate(progress.value, [0, 0.3, 1], [0, 0.8, 1]),
    transform: [{ scaleX: interpolate(progress.value, [0, 0.5, 1], [0.5, 1.2, 1]) }],
  }));

  return (
    <Animated.View style={iconStyle}>
      <View style={focused ? TAB_BAR_STYLES.activeTabGlow : undefined}>
        <Ionicons
          name={focused ? activeName : inactiveName}
          size={size}
          color={color}
        />
      </View>
      <Animated.View style={[TAB_BAR_STYLES.tabIndicator, indicatorStyle]} />
    </Animated.View>
  );
}

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
          
          tabBarButton: (props) => <HapticTab {...props} />,
          tabBarIconStyle: TAB_BAR_STYLES.tabBarIcon,
          tabBarLabelStyle: TAB_BAR_STYLES.tabBarLabel,
          
          tabBarItemStyle: TAB_BAR_STYLES.tabBarItem,
        }}>

        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Home',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon
                focused={focused}
                color={color}
                size={22}
                activeName="apps"
                inactiveName="apps-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="clientManager"
          options={{
            title: 'Clients',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon
                focused={focused}
                color={color}
                size={22}
                activeName="people-circle"
                inactiveName="people-circle-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="finances"
          options={{
            title: 'Finances',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon
                focused={focused}
                color={color}
                size={22}
                activeName="wallet"
                inactiveName="wallet-outline"
              />
            ),
          }}
        />

        <Tabs.Screen
          name="reports"
          options={{
            title: 'Reports',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <AnimatedTabIcon
                focused={focused}
                color={color}
                size={22}
                activeName="document-text"
                inactiveName="document-text-outline"
              />
            ),
          }}
        />

        {/* Settings is accessed via ProfileDrawer, not tab bar */}
        <Tabs.Screen
          name="settings"
          options={{
            href: null, // Hide from tab bar
            headerShown: false,
          }}
        />
      </Tabs>
    </View>
  );
}
