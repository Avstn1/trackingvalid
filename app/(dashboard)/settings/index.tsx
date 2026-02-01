// app/(dashboard)/settings/index.tsx

import { getFadeInDown, useFocusAnimation, useReducedMotionPreference } from '@/utils/motion';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  background: '#181818',
  surface: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.6)',
  green: '#b9ff3b',
};

const settingsItems = [
  {
    label: 'Profile',
    route: '/(dashboard)/settings/profile',
    description: 'Update your profile information',
  },
  {
    label: 'Acuity',
    route: '/(dashboard)/settings/acuity',
    description: 'Manage your Acuity connection',
  },
  {
    label: 'Billing',
    route: '/(dashboard)/settings/billing',
    description: 'View and manage your subscription',
  },
  {
    label: 'Security',
    route: '/(dashboard)/settings/security',
    description: 'Change your password and secure your account',
  },
  {
    label: 'Logout',
    route: '/(dashboard)/settings/logout',
    description: 'Sign out of your account',
  },
];

export default function SettingsMenuScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotionPreference();
  const focusStyle = useFocusAnimation(reduceMotion);

  const handleBackToDashboard = () => {
    // Switch to the Dashboard tab
    router.push('/(dashboard)/dashboard');
  };

  return (
    <SafeAreaView
      className="flex-1"
      style={{ backgroundColor: COLORS.background }}
    >
      {/* Header with back button */}
      <View className="px-5 pb-4 pt-3 flex-row items-center justify-between border-b border-zinc-800">
        <TouchableOpacity
          onPress={handleBackToDashboard}
          className="flex-row items-center gap-1"
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.green} />
          <Text className="text-base" style={{ color: COLORS.green }}>
            Dashboard
          </Text>
        </TouchableOpacity>

        <View className="flex-1 items-center">
          <Text className="text-xl font-bold" style={{ color: COLORS.text }}>
            Settings
          </Text>
        </View>

        {/* Spacer for symmetry */}
        <View style={{ width: 60 }} />
      </View>

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
        showsVerticalScrollIndicator={false}
        style={focusStyle}
      >
        {settingsItems.map((item, index) => (
          <Animated.View
            key={item.route}
            entering={getFadeInDown(reduceMotion, index * 40)}
          >
            <TouchableOpacity
              onPress={() => router.push(item.route as any)}
              className="mb-3 flex-row items-center justify-between px-4 py-3 rounded-2xl"
              style={{
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <View className="flex-1 mr-3">
                <Text
                  className="text-base font-semibold"
                  style={{ color: COLORS.text }}
                >
                  {item.label}
                </Text>
                {item.description ? (
                  <Text
                    className="text-sm mt-1"
                    style={{ color: COLORS.textMuted }}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textMuted}
              />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </Animated.ScrollView>
    </SafeAreaView>
  );
}
