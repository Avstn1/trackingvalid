/**
 * SettingsHeader Component
 * 
 * A consistent header for all settings screens with:
 * - Proper SafeArea handling
 * - Back button with chevron icon
 * - Centered title
 * - Consistent height and styling
 */

import { COLORS, SPACING } from '@/constants/design-system';
import { useRouter } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SettingsHeaderProps {
  title: string;
  onBack?: () => void;
}

const HEADER_HEIGHT = 56;

export default function SettingsHeader({ title, onBack }: SettingsHeaderProps) {
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
      style={{
        paddingTop: insets.top,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}
    >
      {/* Glass highlight line */}
      <View
        style={{
          position: 'absolute',
          top: insets.top,
          left: 0,
          right: 0,
          height: 1,
          backgroundColor: COLORS.glassHighlight,
        }}
      />

      <View
        style={{
          height: HEADER_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: SPACING.md,
        }}
      >
        {/* Back Button */}
        <TouchableOpacity
          onPress={handleBack}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: COLORS.surfaceElevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>

        {/* Title - Centered */}
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: '600',
              color: COLORS.textPrimary,
            }}
          >
            {title}
          </Text>
        </View>

        {/* Spacer for symmetry */}
        <View style={{ width: 40 }} />
      </View>
    </View>
  );
}
