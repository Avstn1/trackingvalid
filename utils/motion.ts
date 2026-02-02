import { useIsFocused } from '@react-navigation/native';
import { AccessibilityInfo } from 'react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Easing,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// ============================================================================
// MOTION TOKENS
// ============================================================================

export const MOTION = {
  // Durations (ms)
  durationFast: 150,
  durationStandard: 220,
  durationSlow: 320,
  durationCountUp: 600,

  // Bezier easings
  easingStandard: Easing.bezier(0.4, 0, 0.2, 1),
  easingDecelerate: Easing.bezier(0, 0, 0.2, 1),
  easingAccelerate: Easing.bezier(0.4, 0, 1, 1),
};

// Spring configs (react-native-reanimated)
export const SPRING = {
  // Snappy for press feedback
  snappy: {
    damping: 20,
    stiffness: 300,
    mass: 0.8,
  },
  // Gentle for entries and focus transitions
  gentle: {
    damping: 18,
    stiffness: 140,
    mass: 1,
  },
  // Bouncy for tab icon pop (subtle overshoot)
  bouncy: {
    damping: 12,
    stiffness: 180,
    mass: 0.9,
  },
};

// ============================================================================
// REDUCED MOTION HOOK
// ============================================================================

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

// ============================================================================
// REANIMATED ENTERING ANIMATIONS (for Animated.View entering prop)
// ============================================================================

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

// Spring-based fade-in-down (more natural)
export const getSpringFadeInDown = (reduceMotion: boolean, delay = 0) =>
  reduceMotion
    ? undefined
    : FadeInDown.delay(delay)
        .springify()
        .damping(SPRING.gentle.damping)
        .stiffness(SPRING.gentle.stiffness)
        .mass(SPRING.gentle.mass);

// ============================================================================
// FOCUS ANIMATION (screen transitions)
// ============================================================================

export const useFocusAnimation = (
  reduceMotion: boolean,
  options?: { offset?: number; useSpring?: boolean }
) => {
  const isFocused = useIsFocused();
  const progress = useSharedValue(isFocused ? 1 : 0);
  const offset = options?.offset ?? 10;
  const useSpringAnim = options?.useSpring ?? true;

  useEffect(() => {
    if (reduceMotion) {
      progress.value = 1;
      return;
    }

    if (isFocused) {
      progress.value = 0;
      if (useSpringAnim) {
        progress.value = withSpring(1, SPRING.gentle);
      } else {
        progress.value = withTiming(1, {
          duration: MOTION.durationStandard,
          easing: MOTION.easingDecelerate,
        });
      }
    } else {
      progress.value = withTiming(0, {
        duration: MOTION.durationFast,
        easing: MOTION.easingStandard,
      });
    }
  }, [isFocused, reduceMotion, useSpringAnim, progress]);

  return useAnimatedStyle(() => ({
    opacity: reduceMotion ? 1 : interpolate(progress.value, [0, 1], [0, 1]),
    transform: [
      { translateY: reduceMotion ? 0 : interpolate(progress.value, [0, 1], [offset, 0]) },
    ],
  }));
};

// ============================================================================
// COUNT-UP ANIMATION (for currency/numbers)
// ============================================================================

export function useCountUp(
  targetValue: number,
  options?: {
    duration?: number;
    reduceMotion?: boolean;
    decimals?: number;
    prefix?: string;
    suffix?: string;
  }
) {
  const duration = options?.duration ?? MOTION.durationCountUp;
  const reduceMotion = options?.reduceMotion ?? false;
  const decimals = options?.decimals ?? 0;
  const prefix = options?.prefix ?? '';
  const suffix = options?.suffix ?? '';

  const [displayValue, setDisplayValue] = useState(
    reduceMotion ? targetValue : 0
  );
  const animationRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const previousTargetRef = useRef<number>(targetValue);

  const animate = useCallback(
    (timestamp: number) => {
      if (startTimeRef.current === null) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const currentValue = eased * targetValue;

      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setDisplayValue(targetValue);
      }
    },
    [targetValue, duration]
  );

  useEffect(() => {
    if (reduceMotion) {
      setDisplayValue(targetValue);
      return;
    }

    // Only animate if target changed
    if (previousTargetRef.current !== targetValue) {
      previousTargetRef.current = targetValue;
      startTimeRef.current = null;

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetValue, reduceMotion, animate]);

  // Format the display value
  const formatted =
    prefix +
    displayValue.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
    suffix;

  return { value: displayValue, formatted };
}

// ============================================================================
// PRESS ANIMATION (for buttons/cards)
// ============================================================================

export function usePressAnimation(reduceMotion: boolean) {
  const scale = useSharedValue(1);

  const onPressIn = useCallback(() => {
    if (reduceMotion) return;
    scale.value = withSpring(0.97, SPRING.snappy);
  }, [reduceMotion, scale]);

  const onPressOut = useCallback(() => {
    if (reduceMotion) return;
    scale.value = withSpring(1, SPRING.snappy);
  }, [reduceMotion, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return { onPressIn, onPressOut, animatedStyle };
}

// ============================================================================
// STAGGER DELAY HELPER
// ============================================================================

export const getStaggerDelay = (index: number, baseDelay = 50) => index * baseDelay;

// ============================================================================
// ENTRY ANIMATION (for charts/elements entering view)
// ============================================================================

export function useEntryAnimation(
  reduceMotion: boolean,
  options?: { delay?: number; from?: number }
) {
  const progress = useSharedValue(0);
  const delay = options?.delay ?? 0;
  const from = options?.from ?? 0;
  const hasAnimated = useRef(false);

  const triggerEntry = useCallback(() => {
    if (reduceMotion || hasAnimated.current) {
      progress.value = 1;
      return;
    }

    hasAnimated.current = true;

    if (delay > 0) {
      setTimeout(() => {
        progress.value = withSpring(1, SPRING.gentle);
      }, delay);
    } else {
      progress.value = withSpring(1, SPRING.gentle);
    }
  }, [reduceMotion, delay, progress]);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: reduceMotion ? 1 : interpolate(progress.value, [0, 1], [from, 1]) },
    ],
    opacity: reduceMotion ? 1 : progress.value,
  }));

  const slideUpStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: reduceMotion ? 0 : interpolate(progress.value, [0, 1], [20, 0]) },
    ],
    opacity: reduceMotion ? 1 : progress.value,
  }));

  const growStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleY: reduceMotion ? 1 : progress.value },
    ],
    opacity: reduceMotion ? 1 : interpolate(progress.value, [0, 0.3, 1], [0, 1, 1]),
  }));

  return { triggerEntry, progress, scaleStyle, slideUpStyle, growStyle };
}
