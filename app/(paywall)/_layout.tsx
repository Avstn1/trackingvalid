// app/(paywall)/_layout.tsx
import { StripeProvider } from '@stripe/stripe-react-native'
import { Stack } from 'expo-router'
import React from 'react'

export default function PaywallLayout() {
  return (
    <StripeProvider publishableKey={process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY!}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#181818',
          },
        }}
      >
        <Stack.Screen 
          name="onboarding"
          options={{ 
            headerShown: false,
          }} 
        />
        
        <Stack.Screen 
          name="index"
          options={{ 
            headerShown: false,
          }} 
        />
        
        <Stack.Screen 
          name="pricing" 
          options={{ 
            headerShown: false,
          }} 
        />
      </Stack>
    </StripeProvider>
  )
}