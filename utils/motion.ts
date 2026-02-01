import { useIsFocused } from '@react-navigation/native';
import { AccessibilityInfo } from 'react-native';
import { useEffect, useState } from 'react';
import { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

export const MOTION = {
  durationFast: 180,
  durationStandard: 240,
  durationSlow: 320,
  easingStandard: Easing.bezier(0.4, 0, 0.2, 1),
  easingDecelerate: Easing.bezier(0, 0, 0.2, 1),
  easingAccelerate: Easing.bezier(0.4, 0, 1, 1),
};

export function useReducedMotionPreference() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (isMounted) {
          setReduceMotion(Boolean(enabled));
        }
      })
      .catch(() => {});

    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      (enabled) => setReduceMotion(Boolean(enabled))
    );

    return () => {
      isMounted = false;
      if (subscription && 'remove' in subscription) {
        subscription.remove();
      }
    };
  }, []);

  return reduceMotion;
}

export const getFadeInDown = (reduceMotion: boolean, delay = 0) =>
  reduceMotion
    ? undefined
    : FadeInDown.duration(MOTION.durationStandard)
        .easing(MOTION.easingDecelerate)
        .delay(delay);

export const getFadeIn = (reduceMotion: boolean, delay = 0) =>
  reduceMotion
    ? undefined
    : FadeIn.duration(MOTION.durationFast)
        .easing(MOTION.easingStandard)
        .delay(delay);

export const useFocusAnimation = (
  reduceMotion: boolean,
  options?: { offset?: number; duration?: number }
) => {
  const isFocused = useIsFocused();
  const progress = useSharedValue(isFocused ? 1 : 0);
  const offset = options?.offset ?? 8;
  const duration = options?.duration ?? MOTION.durationStandard;

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }

    if (isFocused) {
      progress.value = 0;
      progress.value = withTiming(1, {
        duration,
        easing: MOTION.easingDecelerate,
      });
    } else {
      progress.value = withTiming(0, {
        duration: MOTION.durationFast,
        easing: MOTION.easingStandard,
      });
    }
  }, [isFocused, reduceMotion, duration, progress]);

  return useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : progress.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - progress.value) * offset }],
  }));
};
