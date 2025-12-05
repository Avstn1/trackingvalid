// app/(dashboard)/settings/_layout.tsx

import { Stack } from 'expo-router';
import React from 'react';

export default function SettingsStackLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* index.tsx, profile.tsx, billing.tsx etc. will be part of this stack */}
    </Stack>
  );
}
