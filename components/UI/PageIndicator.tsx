import { COLORS } from '@/constants/design-system';
import { SPRING } from '@/utils/motion';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

// Animated page indicator dot
interface AnimatedDotProps {
  isActive: boolean;
  reduceMotion: boolean;
}

function AnimatedDot({ isActive, reduceMotion }: AnimatedDotProps) {
  const width = useSharedValue(isActive ? 24 : 8);
  const opacity = useSharedValue(isActive ? 1 : 0.5);

  useEffect(() => {
    if (reduceMotion) {
      width.value = isActive ? 24 : 8;
      opacity.value = isActive ? 1 : 0.5;
    } else {
      width.value = withSpring(isActive ? 24 : 8, SPRING.snappy);
      opacity.value = withSpring(isActive ? 1 : 0.5, SPRING.snappy);
    }
  }, [isActive, reduceMotion]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: width.value,
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          height: 8,
          borderRadius: 4,
          backgroundColor: isActive ? COLORS.primary : COLORS.textTertiary,
          shadowColor: isActive ? COLORS.primary : 'transparent',
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: isActive ? 0.8 : 0,
          shadowRadius: 6,
          elevation: isActive ? 4 : 0,
        },
        animatedStyle,
      ]}
    />
  );
}

// Page indicator component
interface PageIndicatorProps {
  count: number;
  activeIndex: number;
  reduceMotion?: boolean;
  style?: object;
}

export function PageIndicator({ count, activeIndex, reduceMotion = false, style }: PageIndicatorProps) {
  return (
    <View 
      style={[
        {
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 8,
          paddingVertical: 12,
        },
        style,
      ]}
    >
      {Array.from({ length: count }).map((_, index) => (
        <AnimatedDot
          key={index}
          isActive={index === activeIndex}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

export default PageIndicator;
