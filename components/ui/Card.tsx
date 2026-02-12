/**
 * Card Component
 * 
 * A reusable glass-morphism card with consistent styling across the app.
 */

import { COLORS, RADIUS, SHADOWS, SPACING } from '@/constants/design-system';
import React from 'react';
import { Text, View, ViewStyle } from 'react-native';

type CardVariant = 'default' | 'elevated' | 'outlined';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  /** Visual variant */
  variant?: CardVariant;
  /** Padding size */
  padding?: CardPadding;
  /** Show top highlight line (glass effect) */
  showHighlight?: boolean;
  /** Additional container style */
  style?: ViewStyle;
}

const PADDING_MAP = {
  none: 0,
  sm: SPACING.sm,
  md: SPACING.md,
  lg: SPACING.lg,
};

export default function Card({
  children,
  variant = 'default',
  padding = 'md',
  showHighlight = true,
  style,
}: CardProps) {
  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.borderLight,
          ...SHADOWS.elevated,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: COLORS.border,
        };
      case 'default':
      default:
        return {
          backgroundColor: COLORS.surfaceGlass,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          ...SHADOWS.card,
        };
    }
  };

  return (
    <View
      style={[
        {
          borderRadius: RADIUS.lg,
          padding: PADDING_MAP[padding],
          overflow: 'hidden',
        },
        getVariantStyle(),
        style,
      ]}
    >
      {/* Top highlight line for glass effect */}
      {showHighlight && variant === 'default' && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: COLORS.glassHighlight,
          }}
        />
      )}
      {children}
    </View>
  );
}

/**
 * Section Card - Used for grouping items (like in Settings)
 */
interface SectionCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
}

export function SectionCard({ children, style }: SectionCardProps) {
  return (
    <View
      style={[
        {
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

/**
 * Section Header - Label for grouped sections
 */
interface SectionHeaderProps {
  title: string;
  style?: ViewStyle;
}

export function SectionHeader({ title, style }: SectionHeaderProps) {
  return (
    <View style={[{ paddingHorizontal: SPACING.xs, marginBottom: SPACING.sm }, style]}>
      <Text
        style={{
          color: COLORS.textTertiary,
          fontSize: 12,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
        }}
      >
        {title}
      </Text>
    </View>
  );
}
