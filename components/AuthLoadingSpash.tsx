// components/AuthLoadingSplash.tsx
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
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
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <Image
            source={require('@/assets/images/corvalogoTransparent.png')}
            style={{
              width: 48,
              height: 48,
              marginRight: -3, 
            }}
            resizeMode="contain"
          />

          <MaskedView
            maskElement={
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: 'bold',
                  letterSpacing: -0.5,
                  marginTop: 3,
                  backgroundColor: 'transparent',
                }}
              >
                orva
              </Text>
            }
          >
            <LinearGradient
              colors={['#34D556', '#28C63E', '#34D556']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {/* This text only exists to size the gradient */}
              <Text
                style={{
                  fontSize: 36,
                  fontWeight: 'bold',
                  letterSpacing: -0.5,
                  marginTop: 3,
                  opacity: 0,
                }}
              >
                orva
              </Text>
            </LinearGradient>
          </MaskedView>
        </View>
        
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