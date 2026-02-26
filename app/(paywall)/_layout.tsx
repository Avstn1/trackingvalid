// app/(paywall)/_layout.tsx
import { Stack } from 'expo-router'
import React from 'react'

export default function PaywallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#181818',
        },
      }}
    >
<<<<<<< HEAD
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
=======
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
>>>>>>> 46a37f96c0b56cce4c04c1c8217b7cbc0175773d
      />
    </Stack>
  )
}
