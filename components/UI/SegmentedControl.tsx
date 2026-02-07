/**
 * SegmentedControl Component
 * 
 * A modern segmented control for switching between views.
 * Used in Client Manager for Clients/Appointments/Campaigns tabs.
 */

import { COLORS, RADIUS, SPACING, TOUCH_MIN } from '@/constants/design-system';
import React from 'react';
import { LayoutChangeEvent, Pressable, Text, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface SegmentOption {
  id: string;
  label: string;
}

interface SegmentedControlProps {
  /** Array of segment options */
  options: SegmentOption[];
  /** Currently selected segment id */
  selected: string;
  /** Callback when selection changes */
  onChange: (id: string) => void;
  /** Additional container style */
  style?: ViewStyle;
}

const SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};

export default function SegmentedControl({
  options,
  selected,
  onChange,
  style,
}: SegmentedControlProps) {
  const [containerWidth, setContainerWidth] = React.useState(0);
  const translateX = useSharedValue(0);

  const segmentWidth = containerWidth / options.length;
  const selectedIndex = options.findIndex((opt) => opt.id === selected);

  // Update indicator position when selection changes
  React.useEffect(() => {
    if (containerWidth > 0 && selectedIndex >= 0) {
      translateX.value = withSpring(selectedIndex * segmentWidth, SPRING_CONFIG);
    }
  }, [selectedIndex, segmentWidth, containerWidth, translateX]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setContainerWidth(event.nativeEvent.layout.width);
  };

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
    width: segmentWidth - SPACING.xs * 2,
  }));

  return (
    <View
      style={[
        {
          backgroundColor: COLORS.surface,
          borderRadius: RADIUS.lg,
          borderWidth: 1,
          borderColor: COLORS.border,
          padding: SPACING.xs,
          flexDirection: 'row',
        },
        style,
      ]}
      onLayout={handleLayout}
    >
      {/* Animated indicator */}
      {containerWidth > 0 && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              top: SPACING.xs,
              left: SPACING.xs,
              height: TOUCH_MIN,
              backgroundColor: COLORS.primary,
              borderRadius: RADIUS.md,
            },
            indicatorStyle,
          ]}
        />
      )}

      {/* Segment buttons */}
      {options.map((option) => {
        const isSelected = option.id === selected;

        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              flex: 1,
              height: TOUCH_MIN,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={{
                color: isSelected ? COLORS.textInverse : COLORS.textSecondary,
                fontSize: 14,
                fontWeight: isSelected ? '600' : '500',
              }}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Pill-style variant (scrollable, for more options)
 */
interface PillSegmentedControlProps {
  options: SegmentOption[];
  selected: string;
  onChange: (id: string) => void;
  style?: ViewStyle;
}

export function PillSegmentedControl({
  options,
  selected,
  onChange,
  style,
}: PillSegmentedControlProps) {
  return (
    <View
      style={[
        {
          flexDirection: 'row',
          gap: SPACING.sm,
        },
        style,
      ]}
    >
      {options.map((option) => {
        const isSelected = option.id === selected;

        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={{
              paddingHorizontal: SPACING.lg,
              paddingVertical: SPACING.sm,
              borderRadius: RADIUS.full,
              backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
              borderWidth: 1,
              borderColor: isSelected ? COLORS.primary : COLORS.border,
              minHeight: TOUCH_MIN,
              alignItems: 'center',
              justifyContent: 'center',
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={option.label}
          >
            <Text
              style={{
                color: isSelected ? COLORS.textInverse : COLORS.textSecondary,
                fontSize: 14,
                fontWeight: isSelected ? '600' : '500',
              }}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
