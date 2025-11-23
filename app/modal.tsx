import { Link } from 'expo-router';
import { View, Text } from 'react-native';
import React from 'react';

export default function ModalScreen() {
  return (
    <View className="flex-1 items-center justify-center p-5 bg-zinc-950">
      <Text className="text-white text-3xl font-bold mb-4">
        This is a modal
      </Text>
      <Link href="/" asChild>
        <Text className="mt-4 py-4 text-blue-500 text-lg">
          Go to home screen
        </Text>
      </Link>
    </View>
  );
}