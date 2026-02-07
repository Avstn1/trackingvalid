/**
 * EmptyState Component
 * 
 * A reusable component for displaying empty states across the app.
 * Used when there's no data to display (no clients, no expenses, etc.)
 */

import { COLORS, RADIUS, SPACING } from '@/constants/design-system';
import React from 'react';
import { Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface EmptyStateAction {
  label: string;
  onPress: () => void;
}

interface EmptyStateProps {
  /** Icon to display (React element, e.g., from lucide-react-native) */
  icon: React.ReactNode;
  /** Main title text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional call-to-action button */
  action?: EmptyStateAction;
  /** Size variant */
  size?: 'small' | 'medium' | 'large';
  /** Additional container style */
  style?: ViewStyle;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'medium',
  style,
}: EmptyStateProps) {
  // Size-based styling
  const sizeStyles = {
    small: {
      iconContainer: { width: 48, height: 48, borderRadius: RADIUS.lg },
      titleSize: 14,
      descriptionSize: 12,
      padding: SPACING.md,
    },
    medium: {
      iconContainer: { width: 64, height: 64, borderRadius: RADIUS.xl },
      titleSize: 16,
      descriptionSize: 14,
      padding: SPACING.xl,
    },
    large: {
      iconContainer: { width: 80, height: 80, borderRadius: RADIUS['2xl'] },
      titleSize: 18,
      descriptionSize: 15,
      padding: SPACING['2xl'],
    },
  };

  const currentSize = sizeStyles[size];

  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: currentSize.padding,
        },
        style,
      ]}
    >
      {/* Icon Container */}
      <View
        style={[
          {
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: SPACING.lg,
          },
          currentSize.iconContainer,
        ]}
      >
        {icon}
      </View>

      {/* Title */}
      <Text
        style={{
          color: COLORS.textPrimary,
          fontSize: currentSize.titleSize,
          fontWeight: '600',
          textAlign: 'center',
          marginBottom: description ? SPACING.sm : 0,
        }}
      >
        {title}
      </Text>

      {/* Description */}
      {description && (
        <Text
          style={{
            color: COLORS.textTertiary,
            fontSize: currentSize.descriptionSize,
            textAlign: 'center',
            lineHeight: currentSize.descriptionSize * 1.5,
            maxWidth: 280,
          }}
        >
          {description}
        </Text>
      )}

      {/* Action Button */}
      {action && (
        <TouchableOpacity
          onPress={action.onPress}
          activeOpacity={0.8}
          style={{
            backgroundColor: COLORS.primary,
            paddingHorizontal: SPACING.xl,
            paddingVertical: SPACING.md,
            borderRadius: RADIUS.full,
            marginTop: SPACING.xl,
            minWidth: 120,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: COLORS.textInverse,
              fontSize: 14,
              fontWeight: '600',
            }}
          >
            {action.label}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Inline empty state for use within cards (smaller, no background)
 */
interface InlineEmptyStateProps {
  message: string;
  style?: ViewStyle;
}

export function InlineEmptyState({ message, style }: InlineEmptyStateProps) {
  return (
    <View
      style={[
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: SPACING.lg,
        },
        style,
      ]}
    >
      <Text
        style={{
          color: COLORS.textTertiary,
          fontSize: 14,
          textAlign: 'center',
        }}
      >
        {message}
      </Text>
    </View>
  );
}
