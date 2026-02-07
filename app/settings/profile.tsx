import ProfileSecurityLogout from '@/components/Profile/Profile';
import SettingsHeader from '@/components/Settings/SettingsHeader';
import { COLORS } from '@/constants/design-system';
import React from 'react';
import { View } from 'react-native';

export default function ProfileSettingsScreen() {
  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <SettingsHeader title="Profile" />
      <View className="flex-1 px-4 pt-4">
        <ProfileSecurityLogout />
      </View>
    </View>
  );
}
