import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { Animated, Image, Text, View } from 'react-native';

const COLORS = {
  background: '#181818',
  text: '#FFFFFF',
  green: '#8bcf68ff',
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

        <Animated.View
          style={{
            height: 4,
            width: 60,
            backgroundColor: COLORS.green,
            borderRadius: 2,
            marginTop: 12,
            opacity: underlineAnim,
            transform: [{
              scaleX: underlineAnim,
            }],
            shadowColor: COLORS.green,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 8,
          }}
        />
      </Animated.View>
    </View>
  );
}