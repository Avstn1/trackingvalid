import { MOTION, useReducedMotionPreference } from '@/utils/motion';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export function HapticTab(props: BottomTabBarButtonProps) {
  const reduceMotion = useReducedMotionPreference();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        if (process.env.EXPO_OS === 'ios') {
          // Add a soft haptic feedback when pressing down on the tabs.
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (reduceMotion) {
          scale.value = 1;
        } else {
          scale.value = withTiming(0.96, {
            duration: MOTION.durationFast,
            easing: MOTION.easingStandard,
          });
        }
        props.onPressIn?.(ev);
      }}
      onPressOut={(ev) => {
        if (reduceMotion) {
          scale.value = 1;
        } else {
          scale.value = withTiming(1, {
            duration: MOTION.durationFast,
            easing: MOTION.easingStandard,
          });
        }
        props.onPressOut?.(ev);
      }}
    >
      <Animated.View style={animatedStyle}>{props.children}</Animated.View>
    </PlatformPressable>
  );
}
