/**
 * ProfileDrawer Component
 * 
 * A right-slide drawer for profile, settings, and quick actions.
 * Replaces the old hamburger bottom sheet with proper drawer UX.
 */

import { COLORS, RADIUS, SPACING } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import {
  Calendar,
  CircleHelp,
  CreditCard,
  LogOut,
  Shield,
  Sparkles,
  User,
  X,
} from 'lucide-react-native';
import React, { useEffect, useRef } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DRAWER_WIDTH = SCREEN_WIDTH * 0.82;

const SPRING_CONFIG = {
  damping: 25,
  stiffness: 300,
  mass: 0.5,
};

interface ProfileDrawerProps {
  visible: boolean;
  onClose: () => void;
  profile: {
    user_id?: string;
    full_name?: string;
    email?: string;
    avatar_url?: string;
  } | null;
  // Quick action handlers
  onFeaturesPress: () => void;
  onFAQPress: () => void;
  // Badge indicators
  hasNewFeatures?: boolean;
}

// Get initials from name
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Menu item component
interface MenuItemProps {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  badge?: number | boolean;
  isDestructive?: boolean;
}

function MenuItem({ icon, label, onPress, badge, isDestructive }: MenuItemProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-3 px-2 rounded-xl"
      style={{
        backgroundColor: 'transparent',
      }}
      activeOpacity={0.7}
    >
      <View
        className="w-9 h-9 rounded-xl items-center justify-center mr-3"
        style={{
          backgroundColor: isDestructive ? COLORS.negativeMuted : COLORS.surfaceElevated,
        }}
      >
        {icon}
      </View>
      <Text
        className="flex-1 text-base font-medium"
        style={{ color: isDestructive ? COLORS.negative : COLORS.textPrimary }}
      >
        {label}
      </Text>
      {typeof badge === 'number' && badge > 0 && (
        <View
          className="px-2 py-0.5 rounded-full"
          style={{ backgroundColor: COLORS.negative }}
        >
          <Text className="text-xs font-bold" style={{ color: COLORS.textPrimary }}>
            {badge > 99 ? '99+' : badge}
          </Text>
        </View>
      )}
      {badge === true && (
        <View
          className="w-2.5 h-2.5 rounded-full"
          style={{ backgroundColor: COLORS.primary }}
        />
      )}
    </TouchableOpacity>
  );
}

// Section header
function SectionHeader({ title }: { title: string }) {
  return (
    <Text
      className="text-xs font-semibold uppercase tracking-wider px-2 pt-4 pb-2"
      style={{ color: COLORS.textTertiary }}
    >
      {title}
    </Text>
  );
}

export default function ProfileDrawer({
  visible,
  onClose,
  profile,
  onFeaturesPress,
  onFAQPress,
  hasNewFeatures = false,
}: ProfileDrawerProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  
  // Timeout refs to prevent stale callbacks
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Animation values
  const translateX = useSharedValue(DRAWER_WIDTH);
  const backdropOpacity = useSharedValue(0);

  // Open/close animations
  useEffect(() => {
    if (visible) {
      translateX.value = withSpring(0, SPRING_CONFIG);
      backdropOpacity.value = withTiming(1, { duration: 250 });
    } else {
      translateX.value = withSpring(DRAWER_WIDTH, SPRING_CONFIG);
      backdropOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible]);

  const closeDrawer = () => {
    translateX.value = withSpring(DRAWER_WIDTH, SPRING_CONFIG);
    backdropOpacity.value = withTiming(0, { duration: 200 });
    
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    closeTimeoutRef.current = setTimeout(onClose, 200);
  };

  // Swipe to close gesture
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationX > 0) {
        translateX.value = event.translationX;
        backdropOpacity.value = interpolate(
          event.translationX,
          [0, DRAWER_WIDTH],
          [1, 0]
        );
      }
    })
    .onEnd((event) => {
      if (event.translationX > DRAWER_WIDTH * 0.3 || event.velocityX > 500) {
        runOnJS(closeDrawer)();
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
        backdropOpacity.value = withTiming(1, { duration: 150 });
      }
    });

  // Animated styles
  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  // Handle menu item press with drawer close
  const handleItemPress = (action: () => void) => {
    closeDrawer();
    setTimeout(action, 250);
  };

  // Navigate to settings screen - store pending route
  const pendingRouteRef = useRef<string | null>(null);
  
  const navigateToSettings = (route: string) => {
    // Cancel any pending timeouts
    if (navTimeoutRef.current) {
      clearTimeout(navTimeoutRef.current);
    }
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
    }
    
    // Store the route we want to navigate to
    pendingRouteRef.current = route;
    
    // Start close animation
    translateX.value = withSpring(DRAWER_WIDTH, SPRING_CONFIG);
    backdropOpacity.value = withTiming(0, { duration: 200 });
    
    // Close and navigate after animation
    navTimeoutRef.current = setTimeout(() => {
      onClose();
      if (pendingRouteRef.current) {
        router.push(pendingRouteRef.current as any);
        pendingRouteRef.current = null;
      }
    }, 200);
  };
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
      if (navTimeoutRef.current) clearTimeout(navTimeoutRef.current);
    };
  }, []);

  // Logout handler
  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            closeDrawer();
            await supabase.auth.signOut({ scope: 'local' });
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={closeDrawer}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        {/* Backdrop */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
            },
            backdropStyle,
          ]}
        >
          <Pressable style={{ flex: 1 }} onPress={closeDrawer} />
        </Animated.View>

        {/* Drawer */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              {
                position: 'absolute',
                top: 0,
                right: 0,
                bottom: 0,
                width: DRAWER_WIDTH,
                backgroundColor: COLORS.surface,
                borderLeftWidth: 1,
                borderLeftColor: COLORS.border,
                paddingTop: insets.top,
                paddingBottom: insets.bottom,
                shadowColor: '#000',
                shadowOffset: { width: -4, height: 0 },
                shadowOpacity: 0.25,
                shadowRadius: 16,
                elevation: 20,
              },
              drawerStyle,
            ]}
          >
            {/* Close button */}
            <TouchableOpacity
              onPress={closeDrawer}
              className="absolute z-10 p-2 rounded-full"
              style={{
                top: insets.top + SPACING.sm,
                right: SPACING.md,
                backgroundColor: COLORS.surfaceElevated,
              }}
            >
              <X size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Profile Section */}
            <View className="items-center pt-12 pb-6 px-4">
              {/* Avatar */}
              <View
                className="w-20 h-20 rounded-full items-center justify-center mb-3"
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderWidth: 2,
                  borderColor: COLORS.primary,
                }}
              >
                {profile?.avatar_url ? (
                  <Image
                    source={{ uri: profile.avatar_url }}
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <Text
                    className="text-2xl font-bold"
                    style={{ color: COLORS.primary }}
                  >
                    {getInitials(profile?.full_name)}
                  </Text>
                )}
              </View>

              {/* Name & Email */}
              <Text
                className="text-lg font-bold text-center"
                style={{ color: COLORS.textPrimary }}
                numberOfLines={1}
              >
                {profile?.full_name || 'User'}
              </Text>
              <Text
                className="text-sm text-center mt-0.5"
                style={{ color: COLORS.textSecondary }}
                numberOfLines={1}
              >
                {profile?.email || ''}
              </Text>
            </View>

            {/* Divider */}
            <View
              style={{
                height: 1,
                backgroundColor: COLORS.border,
                marginHorizontal: SPACING.md,
              }}
            />

            {/* Menu Items */}
            <View className="flex-1 px-3">
              {/* Quick Actions */}
              <View className="mt-2">
                <MenuItem
                  icon={<Sparkles size={18} color={COLORS.textSecondary} />}
                  label="What's New"
                  onPress={() => handleItemPress(onFeaturesPress)}
                  badge={hasNewFeatures}
                />
                <MenuItem
                  icon={<CircleHelp size={18} color={COLORS.textSecondary} />}
                  label="FAQ & Help"
                  onPress={() => handleItemPress(onFAQPress)}
                />
              </View>

              {/* Settings Section */}
              <SectionHeader title="Settings" />
              <View>
                <MenuItem
                  icon={<User size={18} color={COLORS.textSecondary} />}
                  label="Profile"
                  onPress={() => navigateToSettings('/(dashboard)/settings/profile')}
                />
                <MenuItem
                  icon={<Shield size={18} color={COLORS.textSecondary} />}
                  label="Security"
                  onPress={() => navigateToSettings('/(dashboard)/settings/security')}
                />
                <MenuItem
                  icon={<Calendar size={18} color={COLORS.textSecondary} />}
                  label="Acuity Integration"
                  onPress={() => navigateToSettings('/(dashboard)/settings/acuity')}
                />
                <MenuItem
                  icon={<CreditCard size={18} color={COLORS.textSecondary} />}
                  label="Billing"
                  onPress={() => navigateToSettings('/(dashboard)/settings/billing')}
                />
              </View>
            </View>

            {/* Logout at bottom */}
            <View className="px-3 pb-4">
              <View
                style={{
                  height: 1,
                  backgroundColor: COLORS.border,
                  marginBottom: SPACING.md,
                }}
              />
              <MenuItem
                icon={<LogOut size={18} color={COLORS.negative} />}
                label="Log Out"
                onPress={handleLogout}
                isDestructive
              />
            </View>
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>
    </Modal>
  );
}
