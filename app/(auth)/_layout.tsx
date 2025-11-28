import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#181818',
        },
      }}
    >
      <Stack.Screen 
        name="index"
        options={{ 
          headerShown: false,
        }} 
      />

      <Stack.Screen 
        name="login" 
        options={{ 
          headerShown: false,
        }} 
      />

      <Stack.Screen
        name="signup"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}