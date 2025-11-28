// components/Settings/SecuritySection.tsx
import { supabase } from '@/utils/supabaseClient';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';

// Color Palette
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
  greenGlow: '#5b8f52ff',
};

export default function SecuritySection() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const updatePassword = async () => {
    if (!oldPassword) return Alert.alert('Error', 'Enter your current password');
    if (!newPassword || newPassword.length < 6) return Alert.alert('Error', 'New password must be at least 6 characters');

    setUpdatingPassword(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (!email) {
        setUpdatingPassword(false);
        return Alert.alert('Error', 'Not logged in');
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      if (signInError) {
        setUpdatingPassword(false);
        return Alert.alert('Error', 'Incorrect current password');
      }

      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;

      Alert.alert('Success', 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong');
    }
    setUpdatingPassword(false);
  };

  return (
    <View>
      <Text className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
        Security
      </Text>

      <View className="mb-4">
        <Text className="text-sm mb-2" style={{ color: COLORS.textMuted }}>
          Current Password
        </Text>
        <TextInput
          secureTextEntry
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Enter current password"
          placeholderTextColor={COLORS.textMuted}
          className="w-full px-4 py-3 rounded-xl"
          style={{
            backgroundColor: COLORS.surfaceSolid,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            color: COLORS.text,
          }}
        />
      </View>

      <View className="mb-4">
        <Text className="text-sm mb-2" style={{ color: COLORS.textMuted }}>
          New Password
        </Text>
        <TextInput
          secureTextEntry
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Enter new password"
          placeholderTextColor={COLORS.textMuted}
          className="w-full px-4 py-3 rounded-xl"
          style={{
            backgroundColor: COLORS.surfaceSolid,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            color: COLORS.text,
          }}
        />
      </View>

      <TouchableOpacity
        onPress={updatePassword}
        disabled={updatingPassword}
        className="py-3 rounded-xl"
        style={{
          backgroundColor: COLORS.green,
          opacity: updatingPassword ? 0.6 : 1,
          shadowColor: COLORS.green,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 5,
        }}
      >
        {updatingPassword ? (
          <ActivityIndicator color={COLORS.text} />
        ) : (
          <Text className="text-center font-bold text-sm" style={{ color: COLORS.text }}>
            Update Password
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}