import ProfileSecurityLogout from '@/components/Profile/Profile';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#F7F7F7',
  green: '#b9ff3b',
};

export default function ProfileSettingsScreen() {
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
          Profile
        </Text>

        <View style={{ width: 20 }} />
      </View>

      {/* Your existing profile component already has its own ScrollView */}
      <View className="flex-1 px-4 pt-4">
        <ProfileSecurityLogout />
      </View>
    </View>
  );
}
