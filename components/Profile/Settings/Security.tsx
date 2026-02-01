// components/Settings/SecuritySection.tsx
import { getFadeInDown, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import * as Device from 'expo-device';
import { Clock, MapPin, Monitor, Smartphone } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

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
  orange: '#FF8C42',
  red: '#FF5252',
};

interface UserDevice {
  id: string;
  user_id: string;
  device_type: 'web' | 'mobile';
  device_id: string;
  device_name: string;
  session_id: string;
  last_login: string;
  last_active: string;
  ip_address?: string;
  created_at: string;
}

export default function SecuritySection() {
  const reduceMotion = useReducedMotionPreference();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  useEffect(() => {
    fetchDevices();
    const deviceId = Device.osBuildId || 'unknown';
    setCurrentDeviceId(deviceId);
  }, []);

  const fetchDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const { data, error } = await supabase
        .from('user_devices')
        .select('*')
        .eq('user_id', authData.user.id)
        .order('last_active', { ascending: false });

      if (error) throw error;
      setDevices(data || []);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const logoutOthers = () => {
    Alert.alert(
      'Logout All Other Devices?',
      'This will immediately log out all devices except your current one. You\'ll need to log back in on those devices.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout Others',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: authData } = await supabase.auth.getUser();
              if (!authData.user) return;

              // Sign out all other sessions
              const { error: signOutError } = await supabase.auth.signOut({ scope: 'others' });
              if (signOutError) throw signOutError;

              // Delete tracking records
              await supabase
                .from('user_devices')
                .delete()
                .eq('user_id', authData.user.id)
                .neq('device_id', currentDeviceId);

              Alert.alert('Success', 'All other devices logged out successfully');
              fetchDevices();
            } catch (err) {
              console.error('Error logging out others:', err);
              Alert.alert('Error', 'Failed to logout other sessions');
            }
          },
        },
      ]
    );
  };

  const logoutEverywhere = () => {
    Alert.alert(
      'Logout From All Devices?',
      'This will immediately log you out from all devices, including this one. You\'ll be redirected to the login screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout All',
          style: 'destructive',
          onPress: async () => {
            try {
              // Sign out globally
              const { error: signOutError } = await supabase.auth.signOut({ scope: 'global' });
              if (signOutError) throw signOutError;

              Alert.alert('Success', 'Logged out from all devices');
              // Navigation will be handled by auth state change
            } catch (err) {
              console.error('Error logging out everywhere:', err);
              Alert.alert('Error', 'Failed to logout from all devices');
            }
          },
        },
      ]
    );
  };

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <Animated.View style={{ height: '100%' }} entering={getFadeInDown(reduceMotion)}>
      <Text className="text-xl font-bold mb-4" style={{ color: COLORS.text }}>
        Security
      </Text>

      {/* Active Sessions Section - 55% height */}
      <View 
        className="mb-4 rounded-xl p-4"
        style={{
          height: '55%',
          backgroundColor: COLORS.surfaceSolid,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <View className="flex-row items-center justify-between mb-3">
          <View>
            <Text className="font-semibold mb-1" style={{ color: COLORS.text, fontSize: 18 }}>
              Active Sessions
            </Text>
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
              Logged in devices
            </Text>
          </View>
          <View className="flex-row gap-2">
            {devices.length > 1 && (
              <TouchableOpacity
                onPress={logoutOthers}
                className="px-3 py-1.5 rounded-lg"
                style={{
                  backgroundColor: 'rgba(255, 140, 66, 0.1)',
                  borderWidth: 1,
                  borderColor: 'rgba(255, 140, 66, 0.2)',
                }}
              >
                <Text style={{ color: COLORS.orange, fontSize: 12, fontWeight: '600' }}>
                  Logout Others
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={logoutEverywhere}
              className="px-3 py-1.5 rounded-lg"
              style={{
                backgroundColor: 'rgba(255, 82, 82, 0.1)',
                borderWidth: 1,
                borderColor: 'rgba(255, 82, 82, 0.2)',
              }}
            >
              <Text style={{ color: COLORS.red, fontSize: 12, fontWeight: '600' }}>
                Logout All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {loadingDevices ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator color={COLORS.green} />
          </View>
        ) : devices.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
              No active sessions
            </Text>
          </View>
        ) : (
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            {devices.map((device) => {
              const isCurrentDevice = device.device_id === currentDeviceId;
              
              return (
                <View
                  key={device.id}
                  className="flex-row items-start gap-3 p-3 rounded-lg mb-2"
                  style={{
                    backgroundColor: isCurrentDevice
                      ? 'rgba(139, 207, 104, 0.05)'
                      : COLORS.surface,
                    borderWidth: 1,
                    borderColor: isCurrentDevice
                      ? 'rgba(139, 207, 104, 0.2)'
                      : COLORS.glassBorder,
                  }}
                >
                  {/* Icon */}
                  <View
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: isCurrentDevice
                        ? 'rgba(139, 207, 104, 0.1)'
                        : COLORS.surfaceSolid,
                    }}
                  >
                    {device.device_type === 'mobile' ? (
                      <Smartphone
                        size={16}
                        color={isCurrentDevice ? COLORS.green : COLORS.textMuted}
                      />
                    ) : (
                      <Monitor
                        size={16}
                        color={isCurrentDevice ? COLORS.green : COLORS.textMuted}
                      />
                    )}
                  </View>

                  {/* Device Info */}
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <Text
                        numberOfLines={1}
                        className="font-medium"
                        style={{ color: COLORS.text, fontSize: 15 }}
                      >
                        {device.device_name}
                      </Text>
                      {isCurrentDevice && (
                        <View
                          className="px-1.5 py-0.5 rounded-full"
                          style={{ backgroundColor: 'rgba(139, 207, 104, 0.2)' }}
                        >
                          <Text style={{ color: COLORS.green, fontSize: 11, fontWeight: '600' }}>
                            Current
                          </Text>
                        </View>
                      )}
                    </View>

                    <View className="gap-1">
                      <View className="flex-row items-center gap-1.5">
                        <Clock size={11} color={COLORS.textMuted} />
                        <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>
                          {formatDate(device.last_active)}
                        </Text>
                      </View>
                      {device.ip_address && (
                        <View className="flex-row items-center gap-1.5">
                          <MapPin size={11} color={COLORS.textMuted} />
                          <Text
                            numberOfLines={1}
                            style={{ color: COLORS.textMuted, fontSize: 13 }}
                          >
                            {device.ip_address}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Change Password Section - 40% height */}
      <View
        className="rounded-xl p-4"
        style={{
          height: '50%',
          backgroundColor: COLORS.surfaceSolid,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <Text className="font-semibold mb-1" style={{ color: COLORS.text, fontSize: 18 }}>
          Change Password
        </Text>
        <Text className="mb-3" style={{ color: COLORS.textMuted, fontSize: 13 }}>
          Update your account password
        </Text>

        <View className="mb-2.5">
          <Text className="text-sm mb-1" style={{ color: COLORS.textMuted }}>
            Current Password
          </Text>
          <TextInput
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Enter current password"
            placeholderTextColor={COLORS.textMuted}
            className="px-3 py-2 rounded-lg"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
              color: COLORS.text,
              fontSize: 15,
            }}
          />
        </View>

        <View className="mb-2.5">
          <Text className="text-sm mb-1" style={{ color: COLORS.textMuted }}>
            New Password
          </Text>
          <TextInput
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Min. 6 characters"
            placeholderTextColor={COLORS.textMuted}
            className="px-3 py-2 rounded-lg"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
              color: COLORS.text,
              fontSize: 15,
            }}
          />
        </View>

        <TouchableOpacity
          onPress={updatePassword}
          disabled={updatingPassword}
          className="py-2.5 rounded-lg"
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
            <Text className="text-center font-bold" style={{ color: COLORS.text, fontSize: 15 }}>
              Update Password
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}
