/**
 * ScreenHeader Component
 * 
 * A reusable header for sub-screens (like Settings pages).
 * Provides consistent back navigation and styling.
 */

import { COLORS, SPACING, TOUCH_MIN } from '@/constants/design-system';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenHeaderProps {
  /** Screen title */
  title: string;
  /** Custom back handler (defaults to router.back()) */
  onBack?: () => void;
  /** Optional right side action */
  rightAction?: React.ReactNode;
  /** Show bottom border */
  showBorder?: boolean;
  /** Additional container style */
  style?: ViewStyle;
}

export default function ScreenHeader({
  title,
  onBack,
  rightAction,
  showBorder = true,
  style,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        {
          paddingTop: insets.top + SPACING.sm,
          paddingBottom: SPACING.md,
          paddingHorizontal: SPACING.lg,
          backgroundColor: COLORS.surface,
          borderBottomWidth: showBorder ? 1 : 0,
          borderBottomColor: COLORS.border,
        },
        style,
      ]}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBack}
          activeOpacity={0.7}
          style={{
            minWidth: TOUCH_MIN,
            minHeight: TOUCH_MIN,
            alignItems: 'flex-start',
            justifyContent: 'center',
          }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
        </TouchableOpacity>

        {/* Title */}
        <Text
          style={{
            flex: 1,
            color: COLORS.textPrimary,
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'center',
          }}
          numberOfLines={1}
        >
          {title}
        </Text>

        {/* Right Action (or spacer for alignment) */}
        <View
          style={{
            minWidth: TOUCH_MIN,
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          {rightAction}
        </View>
      </View>
    </View>
  );
}

/**
 * Simple header without safe area handling (for use inside SafeAreaView)
 */
interface SimpleHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
}

export function SimpleHeader({
  title,
  onBack,
  rightAction,
  style,
}: SimpleHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View
      style={[
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingVertical: SPACING.md,
          paddingHorizontal: SPACING.lg,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.border,
        },
        style,
      ]}
    >
      {/* Back Button */}
      <TouchableOpacity
        onPress={handleBack}
        activeOpacity={0.7}
        style={{
          minWidth: TOUCH_MIN,
          minHeight: TOUCH_MIN,
          alignItems: 'flex-start',
          justifyContent: 'center',
        }}
        accessibilityLabel="Go back"
        accessibilityRole="button"
      >
        <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Title */}
      <Text
        style={{
          flex: 1,
          color: COLORS.textPrimary,
          fontSize: 18,
          fontWeight: '700',
          textAlign: 'center',
        }}
        numberOfLines={1}
      >
        {title}
      </Text>

      {/* Right Action (or spacer) */}
      <View
        style={{
          minWidth: TOUCH_MIN,
          alignItems: 'flex-end',
          justifyContent: 'center',
        }}
      >
        {rightAction}
      </View>
    </View>
  );
}
