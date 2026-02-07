/**
 * CustomSplash - Clean, simple loading animation
 * 
 * Based on the original login.tsx AuthLoadingSplash that looked good.
 * Logo + "orva" gradient text + spinner. No fancy glow effects.
 */

import { COLORS } from '@/constants/design-system';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native';

interface CustomSplashProps {
  onFinish: () => void;
  isReady?: boolean;
}

export default function CustomSplash({ onFinish, isReady = false }: CustomSplashProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const hasFinished = useRef(false);

  // Entrance animation
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

  // Exit when ready
  useEffect(() => {
    if (isReady && !hasFinished.current) {
      hasFinished.current = true;
      
      // Small delay then fade out
      setTimeout(() => {
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          onFinish();
        });
      }, 300);
    }
  }, [isReady]);

  return (
    <View style={styles.container}>
      <Animated.View 
        style={[
          styles.content,
          { 
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          }
        ]}
      >
        {/* Logo Row */}
        <View style={styles.logoRow}>
          <Image
            source={require('@/assets/images/corvalogoTransparent.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <MaskedView
            maskElement={
              <Text style={styles.brandText}>orva</Text>
            }
          >
            <LinearGradient
              colors={['#34D556', '#28C63E', '#34D556']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={[styles.brandText, { opacity: 0 }]}>orva</Text>
            </LinearGradient>
          </MaskedView>
        </View>

        <ActivityIndicator size="large" color={COLORS.primary} style={styles.spinner} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  logo: {
    width: 48,
    height: 48,
    marginRight: -3,
  },
  brandText: {
    fontSize: 36,
    fontWeight: 'bold',
    letterSpacing: -0.5,
    marginTop: 3,
    backgroundColor: 'transparent',
  },
  spinner: {
    marginTop: 4,
  },
});
