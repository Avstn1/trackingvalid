// components/ClientMessaging/CollapsibleSection.tsx
import React, { useEffect, useRef, useState } from 'react';
import { LayoutChangeEvent, Platform, UIManager, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface CollapsibleSectionProps {
  collapsed: boolean;
  children: React.ReactNode;
}

export function CollapsibleSection({ collapsed, children }: CollapsibleSectionProps) {
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const heightValue = useSharedValue(collapsed ? 0 : 1000);
  const opacityValue = useSharedValue(collapsed ? 0 : 1);
  const hasAnimated = useRef(false);

  const onLayout = (event: LayoutChangeEvent) => {
    const { height } = event.nativeEvent.layout;
    
    if (height > 0 && contentHeight === null) {
      setContentHeight(height);
      
      if (!collapsed) {
        heightValue.value = height;
        opacityValue.value = 1;
      } else {
        heightValue.value = 0;
        opacityValue.value = 0;
      }
    }
  };

  useEffect(() => {
    if (contentHeight === null) return;

    if (!hasAnimated.current) {
      hasAnimated.current = true;
      return;
    }

    if (collapsed) {
      opacityValue.value = withTiming(0, { 
        duration: 200,
        easing: Easing.ease,
      });
      heightValue.value = withTiming(0, { 
        duration: 250,
        easing: Easing.ease,
      });
    } else {
      heightValue.value = withTiming(contentHeight, {
        duration: 300,
        easing: Easing.out(Easing.cubic),
      });
      opacityValue.value = withTiming(1, { 
        duration: 250,
        easing: Easing.ease,
      });
    }
  }, [collapsed, contentHeight]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      height: contentHeight === null ? 'auto' : heightValue.value,
      opacity: contentHeight === null ? 1 : opacityValue.value,
      overflow: 'hidden',
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      <View onLayout={onLayout}>
        {children}
      </View>
    </Animated.View>
  );
}