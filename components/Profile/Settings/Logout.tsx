// components/Settings/LogoutSection.tsx
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';

export default function LogoutSection() {
  const router = useRouter();

  const logout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut({ scope: 'local' });
          router.replace('/login');
        },
      },
    ]);
  };

  return (
    <View className="items-center py-3">
      <Text className="text-zinc-400 text-xs text-center mb-4">
        You will be signed out of your account immediately.
      </Text>
      <TouchableOpacity onPress={logout} className="bg-red-600 px-6 py-2.5 rounded-xl">
        <Text className="text-white text-center font-bold text-sm">Logout</Text>
      </TouchableOpacity>
    </View>
  );
}
