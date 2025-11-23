import React from 'react';
import { ScrollView, Text, View } from 'react-native';

export default function ProfilePage() {
  return (
    <View className="flex-1 bg-zinc-950">
      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 80 }}>
        <View className="mb-6 mt-4">
          <Text className="text-lime-300 text-3xl font-bold">Profile</Text>
          <Text className="text-zinc-400 text-sm mt-1">Manage your profile settings.</Text>
        </View>
      </ScrollView>
    </View>
  );
}