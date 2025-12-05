import Security from '@/components/Profile/Settings/Security';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#F7F7F7',
  green: '#b9ff3b',
};

export default function SecuritySettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View
      className="flex-1"
      style={{
        backgroundColor: COLORS.background,
        paddingTop: insets.top + 12,
      }}
    >
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-5 pb-3"
        style={{
          backgroundColor: COLORS.surface,
          borderBottomWidth: 1,
          borderBottomColor: COLORS.glassBorder,
        }}
      >
        <Text
          className="text-xl"
          style={{ color: COLORS.green }}
          onPress={() => router.back()}
        >
          ←
        </Text>

        <Text
          className="text-xl font-bold"
          style={{ color: COLORS.text }}
        >
          Security
        </Text>

        <View style={{ width: 20 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Security />
      </ScrollView>
    </View>
  );
}
