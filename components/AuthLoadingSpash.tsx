// components/AuthLoadingSplash.tsx
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, Text, View } from 'react-native';

const COLORS = {
  background: '#181818',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.7)',
  green: '#8bcf68ff',
};

interface AuthLoadingSplashProps {
  message?: string;
}

export default function AuthLoadingSplash({ message = 'Loading...' }: AuthLoadingSplashProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
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
            width: 100, 
            height: 100,
            marginBottom: 20,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: COLORS.text,
            letterSpacing: -0.5,
            marginBottom: 20,
          }}
        >
          ShearWork
        </Text>
        <ActivityIndicator size="large" color={COLORS.green} />
        {message && (
          <Text
            style={{
              fontSize: 14,
              color: COLORS.textMuted,
              marginTop: 16,
            }}
          >
            {message}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}