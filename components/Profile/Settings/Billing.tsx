import { COLORS } from '@/constants/design-system';
import { getFadeInDown, useReducedMotionPreference } from '@/utils/motion';
import React, { useState } from 'react';
import {
  Text,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

// Component-specific accent colors not in design system
const ACCENT_COLORS = {
  textSubtle: 'rgba(247, 247, 247, 0.45)',
  green: '#b9ff3b',
  greenSoft: '#8bcf68ff',
  danger: '#ff4b4b',
  dangerSoft: '#ff7777',
  black: '#000000',
};

export default function Billing() {
  const reduceMotion = useReducedMotionPreference();
  // ⚠️ UI-only demo state – replace with real billing summary later
  const [hasSubscription] = useState(true);
  const [cancelAtPeriodEnd] = useState(false);

  // Placeholder values (these will eventually come from your API)
  const amountText = '$20.00';
  const intervalLabel = 'month';
  const renewDateText = 'January 1, 2026';

  return (
    <Animated.View className="mb-4" entering={getFadeInDown(reduceMotion)}>
      {/* Section heading */}
      <Text
        className="text-lg font-bold mb-3"
        style={{ color: COLORS.textPrimary }}
      >
        Billing
      </Text>

      {/* Current plan card */}
      <View
        className="rounded-2xl mb-3 px-4 py-3"
        style={{
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <Text
          className="text-sm font-semibold mb-1"
          style={{ color: ACCENT_COLORS.textSubtle, textTransform: 'uppercase' }}
        >
          Current plan
        </Text>

        <Text
          className="text-base font-semibold"
          style={{ color: COLORS.textPrimary }}
        >
          {hasSubscription ? 'Corva Pro' : 'No active subscription'}
        </Text>

        {hasSubscription && (
          <Text
            className="text-sm mt-1"
            style={{ color: COLORS.textSecondary }}
          >
            1 active subscription
          </Text>
        )}
      </View>

      {/* Payment card */}
      <View
        className="rounded-2xl mb-3 px-4 py-3"
        style={{
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <Text
          className="text-sm font-semibold mb-1"
          style={{ color: ACCENT_COLORS.textSubtle, textTransform: 'uppercase' }}
        >
          Payment
        </Text>

        {!hasSubscription ? (
            <Text
              className="text-base"
              style={{ color: COLORS.textSecondary }}
            >
              You don't have an active subscription right now.
            </Text>
        ) : (
          <>
            <Text
              className="text-base"
              style={{ color: COLORS.textSecondary }}
            >
              {cancelAtPeriodEnd
                ? 'Your plan will end on '
                : 'Your plan will automatically renew on '}
              <Text
                className="font-semibold"
                style={{ color: COLORS.textPrimary }}
              >
                {renewDateText || 'the current period end date'}
              </Text>
              {cancelAtPeriodEnd
                ? ". You won't be charged again."
                : '.'}
            </Text>

            <Text
              className="text-base mt-1.5"
              style={{ color: COLORS.textSecondary }}
            >
              You&apos;ll be charged{' '}
              <Text
                className="font-semibold"
                style={{ color: COLORS.textPrimary }}
              >
                {amountText || 'the plan price'}
              </Text>{' '}
              / {intervalLabel}.
            </Text>
          </>
        )}
      </View>

      {/* Manage subscription card */}
      <View
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: '#191919',
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <Text
          className="text-base font-semibold mb-1"
          style={{ color: COLORS.textPrimary }}
        >
          Manage subscription
        </Text>
        <Text
          className="text-sm"
          style={{ color: COLORS.textSecondary }}
        >
          You cannot manage your subscription from the mobile app. We are sorry for the inconvenience.
        </Text>
      </View>
    </Animated.View>
  );
}