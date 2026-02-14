// app/_layout.tsx
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { StripeProvider } from '@stripe/stripe-react-native';
import 'react-native-get-random-values';

import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import '../global.css';

import CustomSplash from '@/components/CustomSplash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { supabase } from '@/utils/supabaseClient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [showSplash, setShowSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [initialRoute, setInitialRoute] = useState<string | null>(null);
  const router = useRouter();
  const hasNavigated = useRef(false);

  // Check auth status during splash animation
  useEffect(() => {
    async function prepare() {
      try {
        // Hide native splash immediately
        await SplashScreen.hideAsync();
        
        // Check if just logged out
        const justLoggedOut = await AsyncStorage.getItem('just-logged-out');
        if (justLoggedOut) {
          await AsyncStorage.removeItem('just-logged-out');
          setInitialRoute('/(auth)/login');
          setAuthReady(true);
          return;
        }

        // Check session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('stripe_subscription_status, trial_active')
            .eq('user_id', session.user.id)
            .single();
          
          const subStatus = profile?.stripe_subscription_status;
          const trialActive = profile?.trial_active;
          
          if (subStatus === 'active' || trialActive === true) {
            setInitialRoute('/(dashboard)/dashboard');
          } else {
            setInitialRoute('/(paywall)/onboarding');
          }
        } else {
          setInitialRoute('/(auth)/login');
        }
      } catch (e) {
        console.warn('Auth check error:', e);
        setInitialRoute('/(auth)/login');
      } finally {
        setAuthReady(true);
      }
    }

    prepare();
  }, []);

  // Handle splash finish and navigate
  const handleSplashFinish = () => {
    if (hasNavigated.current) return;
    hasNavigated.current = true;
    
    setShowSplash(false);
    
    if (initialRoute) {
      // Use setTimeout to ensure state update completes before navigation
      setTimeout(() => {
        router.replace(initialRoute as any);
      }, 50);
    }
  };

  // Show splash until done
  if (showSplash) {
    return <CustomSplash onFinish={handleSplashFinish} isReady={authReady} />;
  }

  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(dashboard)" options={{ headerShown: false }} />
          <Stack.Screen name="(paywall)" options={{ headerShown: false }} />
          <Stack.Screen 
            name="settings" 
            options={{ 
              headerShown: false,
              animation: 'slide_from_right',
            }} 
          />
          <Stack.Screen 
            name="client/[id]" 
            options={{ 
              headerShown: false,
              presentation: 'card',
              animation: 'slide_from_right',
            }} 
          />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </StripeProvider>
  );
}