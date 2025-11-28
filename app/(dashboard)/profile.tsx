// app/(dashboard)/settings.tsx
import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import { CustomHeader } from '@/components/Header/CustomHeader';
import Profile from '@/components/Profile/Profile';
import React, { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsPage() {
  const [componentsReady, setComponentsReady] = useState(false);

  useEffect(() => {
    // Use requestAnimationFrame to wait for render cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setComponentsReady(true);
      });
    });
  }, []);

  if (!componentsReady) {
    return <AuthLoadingSplash message="Loading profile data..." />;
  }


  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <CustomHeader pageName="Profile" />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 16, paddingTop: 10 }}
      >
        <View className="bg-zinc-900 rounded-2xl p-6">
          <Profile />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
