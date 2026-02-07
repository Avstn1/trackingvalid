// app/(dashboard)/settings/index.tsx

import SettingsHeader from '@/components/Settings/SettingsHeader';
import { COLORS, RADIUS, SPACING } from '@/constants/design-system';
import { getSpringFadeInDown, getStaggerDelay, useFocusAnimation, useReducedMotionPreference } from '@/utils/motion';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Calendar, CreditCard, Shield, User } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

// Settings organized into logical groups
const SETTINGS_SECTIONS = [
  {
    title: 'Account',
    items: [
      {
        label: 'Profile',
        route: '/(dashboard)/settings/profile',
        description: 'Name, avatar, and role',
        icon: User,
      },
      {
        label: 'Security',
        route: '/(dashboard)/settings/security',
        description: 'Password and account protection',
        icon: Shield,
      },
    ],
  },
  {
    title: 'Integrations',
    items: [
      {
        label: 'Acuity Scheduling',
        route: '/(dashboard)/settings/acuity',
        description: 'Connect your booking calendar',
        icon: Calendar,
      },
    ],
  },
  {
    title: 'Subscription',
    items: [
      {
        label: 'Billing',
        route: '/(dashboard)/settings/billing',
        description: 'Manage your plan and payments',
        icon: CreditCard,
      },
    ],
  },
    {
    label: 'Admin',
    route: '/(dashboard)/settings/admin',
    description: 'Sign out of your account',
  },
];

export default function SettingsMenuScreen() {
  const router = useRouter();
  const reduceMotion = useReducedMotionPreference();
  const focusStyle = useFocusAnimation(reduceMotion);

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <SettingsHeader title="Settings" />

      <Animated.ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: SPACING.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        style={focusStyle}
      >
        {SETTINGS_SECTIONS.map((section, sectionIndex) => (
          <Animated.View
            key={section.title || 'logout'}
            entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(sectionIndex))}
            style={{ marginBottom: SPACING.xl }}
          >
            {/* Section Title */}
            {section.title ? (
              <Text
                className="text-xs font-semibold uppercase tracking-wider mb-2 px-1"
                style={{ color: COLORS.textTertiary }}
              >
                {section.title}
              </Text>
            ) : null}

            {/* Section Card */}
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: RADIUS.lg,
                borderWidth: 1,
                borderColor: COLORS.border,
                overflow: 'hidden',
              }}
            >
              {section.items.map((item, itemIndex) => {
                const Icon = item.icon;
                const isLast = itemIndex === section.items.length - 1;
                const isDestructive = (item as any).isDestructive;

                return (
                  <TouchableOpacity
                    key={item.route}
                    onPress={() => router.push(item.route as any)}
                    className="flex-row items-center px-4 py-3"
                    style={{
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: COLORS.border,
                    }}
                  >
                    {/* Icon */}
                    <View
                      className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                      style={{
                        backgroundColor: isDestructive
                          ? COLORS.negativeMuted
                          : COLORS.surfaceElevated,
                      }}
                    >
                      <Icon
                        size={18}
                        color={isDestructive ? COLORS.negative : COLORS.textSecondary}
                      />
                    </View>

                    {/* Content */}
                    <View className="flex-1">
                      <Text
                        className="text-sm font-semibold"
                        style={{
                          color: isDestructive ? COLORS.negative : COLORS.textPrimary,
                        }}
                      >
                        {item.label}
                      </Text>
                      <Text
                        className="text-xs mt-0.5"
                        style={{ color: COLORS.textTertiary }}
                      >
                        {item.description}
                      </Text>
                    </View>

                    {/* Chevron */}
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.textTertiary}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </Animated.View>
        ))}
      </Animated.ScrollView>
    </View>
  );
}
