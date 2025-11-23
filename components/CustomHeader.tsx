import React from 'react';
import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CustomHeaderProps {
  pageName: string;
}

export function CustomHeader({ pageName }: CustomHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View 
      className="bg-zinc-850 border-b border-[rgba(196,255,133,0.10)]"
      style={{ paddingTop: insets.top - 45, paddingBottom: 16 }}
    >
      <View className="px-5">
        <Text className="text-white text-3xl font-bold">
          ShearWork - <Text className="text-[#c4ff85]">{pageName}</Text>
        </Text>
      </View>
    </View>
  );
}