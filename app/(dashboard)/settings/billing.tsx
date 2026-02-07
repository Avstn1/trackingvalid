import Billing from '@/components/Profile/Settings/Billing';
import SettingsHeader from '@/components/Settings/SettingsHeader';
import { COLORS } from '@/constants/design-system';
import React from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function BillingSettingsScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <SettingsHeader title="Billing" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: insets.bottom + 24,
        }}
      >
        <Billing />
      </ScrollView>
    </View>
  );
}
