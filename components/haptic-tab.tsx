import { SPRING, useReducedMotionPreference } from '@/utils/motion';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        if (!reduceMotion) {
          scale.value = withSpring(0.92, SPRING.snappy);
        }
        props.onPressIn?.(ev);
      }}
      onPressOut={(ev) => {
        if (!reduceMotion) {
          scale.value = withSpring(1, SPRING.snappy);
        }
        props.onPressOut?.(ev);
      }}
    >
      <Animated.View style={animatedStyle}>{props.children}</Animated.View>
    </PlatformPressable>
  );
}
