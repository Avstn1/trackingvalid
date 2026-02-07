import { HapticTab } from '@/components/haptic-tab';
import ReportViewerModal from '@/components/Reports/ReportViewerModal';
import { SPRING, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as Device from 'expo-device';
import { EventSubscription } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { Tabs, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

interface Report {
  id: string
  content: string
  month: string
  year: number
  type?: 'weekly' | 'monthly' | 'weekly_comparison'
  week_number?: number
  title?: string
}

// Set notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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

async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.log('Must use physical device for push notifications');
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  
  if (finalStatus !== 'granted') {
    console.log('Permission not granted for push notifications');
    return;
  }

  try {
    const pushTokenString = (await Notifications.getExpoPushTokenAsync()).data;
    return pushTokenString;
  } catch (e) {
    console.error('Error getting push token:', e);
  }
}

export default function DashboardLayout() {
  const router = useRouter();
  const notificationListener = useRef<EventSubscription | undefined>(undefined);
  const responseListener = useRef<EventSubscription | undefined>(undefined);

  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reportModalVisible, setReportModalVisible] = useState(false)

  const handleNotificationNavigation = async (data: any) => {
    const { reference, reference_type } = data;

    if (!reference_type) {
      router.push('/dashboard');
      return;
    }

    switch (reference_type) {
      case 'weekly':
      case 'weekly_comparison':
      case 'monthly':
        router.push({
          pathname: '/reports',
          params: { reference: reference }
        });
        break;
      
      case 'sms_campaigns':
        router.push({
          pathname: '/clientManager',
          params: { openComponent: 'campaigns', reference }
        });
        break;
      
      case 'sms_auto_nudge':
      case 'sms_auto_nudge_update':
        router.push({
          pathname: '/clientManager',
          params: { openComponent: 'auto-nudge', reference }
        });
        break;
      
      default:
        router.push('/dashboard');
        break;
    }
  };

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.replace('/login');
        return;
      }

      // Register for push notifications
      const token = await registerForPushNotificationsAsync();
      if (token && session.user) {
        await supabase
          .from('push_tokens')
          .upsert({
            user_id: session.user.id,
            token: token,
            device_name: await Device.deviceName,
            device_type: Device.osName,
            last_used_at: new Date().toISOString(),
          }, {
            onConflict: 'token'
          });
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

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Optionally show in-app banner or update badge
    });

    // Listen for notification taps/clicks (works for all app states: foreground, background, and closed)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped:', data);
      handleNotificationNavigation(data);
    });

    // Cleanup
    return () => {
      subscription.unsubscribe();
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, []);

  const handleCloseReportModal = () => {
    setReportModalVisible(false)
    setSelectedReport(null)
  }

  return (
    <>
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

      <ReportViewerModal
        report={selectedReport}
        visible={reportModalVisible}
        onClose={handleCloseReportModal}
      />
    </>
  );
}
