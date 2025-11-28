import { useEffect, useRef } from 'react';
import { Animated, Image, Text, View } from 'react-native';

const COLORS = {
  background: '#181818',
  text: '#F7F7F7',
  orange: '#FF5722',
};

interface CustomSplashProps {
  onFinish: () => void;
}

export default function CustomSplash({ onFinish }: CustomSplashProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const underlineAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Initial animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Animate underline
      Animated.timing(underlineAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start(() => {
        // Wait a moment, then fade out
        setTimeout(() => {
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => onFinish());
        }, 800);
      });
    });
  }, []);

  return (
    <View 
      style={{ 
        flex: 1, 
        backgroundColor: COLORS.background, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}
    >
      <Animated.View 
        style={{ 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <Image 
          source={require('@/assets/images/shearworklogo.png')} 
          style={{ 
            width: 120, 
            height: 120,
            marginBottom: 20,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 36,
            fontWeight: 'bold',
            color: COLORS.text,
            letterSpacing: -0.5,
          }}
        >
          ShearWork
        </Text>
        <Animated.View
          style={{
            height: 4,
            width: 60,
            backgroundColor: COLORS.orange,
            borderRadius: 2,
            marginTop: 12,
            opacity: underlineAnim,
            transform: [{
              scaleX: underlineAnim,
            }],
            shadowColor: COLORS.orange,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
          }}
        />
      </Animated.View>
    </View>
  );
}