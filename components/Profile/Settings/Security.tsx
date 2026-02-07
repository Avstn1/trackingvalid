// components/Settings/SecuritySection.tsx
import { COLORS, SPACING } from '@/constants/design-system';
import { getFadeInDown, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import * as Device from 'expo-device';
import { Clock, MapPin, Monitor, Smartphone } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';

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
    <Animated.View entering={getFadeInDown(reduceMotion)}>
      {/* Active Sessions Section */}
      <View 
        className="mb-5 rounded-2xl overflow-hidden"
        style={{
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Section Header */}
        <View 
          className="p-4"
          style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}
        >
          <Text 
            className="font-bold mb-1" 
            style={{ color: COLORS.textPrimary, fontSize: 18 }}
          >
            Active Sessions
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            Devices currently logged into your account
          </Text>
          
          {/* Action buttons - stacked below text */}
          <View className="flex-row gap-2 mt-3">
            {devices.length > 1 && (
              <TouchableOpacity
                onPress={logoutOthers}
                className="px-3 py-2 rounded-lg flex-1"
                style={{
                  backgroundColor: COLORS.warningMuted,
                  borderWidth: 1,
                  borderColor: 'rgba(245, 158, 11, 0.3)',
                }}
              >
                <Text 
                  className="text-center font-semibold"
                  style={{ color: COLORS.warning, fontSize: 13 }}
                >
                  Logout Others
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={logoutEverywhere}
              className="px-3 py-2 rounded-lg flex-1"
              style={{
                backgroundColor: COLORS.negativeMuted,
                borderWidth: 1,
                borderColor: COLORS.negative + '4D', // 30% opacity
              }}
            >
              <Text 
                className="text-center font-semibold"
                style={{ color: COLORS.negative, fontSize: 13 }}
              >
                Logout All
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Devices List */}
        <View className="p-4">
          {loadingDevices ? (
            <View className="py-8 items-center justify-center">
              <ActivityIndicator color={COLORS.primary} />
            </View>
          ) : devices.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                No active sessions
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {devices.map((device) => {
                const isCurrentDevice = device.device_id === currentDeviceId;
                
                return (
                  <View
                    key={device.id}
                    className="flex-row items-center p-3 rounded-xl"
                    style={{
                      backgroundColor: isCurrentDevice
                        ? COLORS.primaryMuted
                        : COLORS.surfaceGlass,
                      borderWidth: 1,
                      borderColor: isCurrentDevice
                        ? 'rgba(139, 207, 104, 0.3)'
                        : COLORS.glassBorder,
                    }}
                  >
                    {/* Icon */}
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                      style={{
                        backgroundColor: isCurrentDevice
                          ? 'rgba(139, 207, 104, 0.15)'
                          : COLORS.surfaceElevated,
                      }}
                    >
                      {device.device_type === 'mobile' ? (
                        <Smartphone
                          size={18}
                          color={isCurrentDevice ? COLORS.primary : COLORS.textSecondary}
                        />
                      ) : (
                        <Monitor
                          size={18}
                          color={isCurrentDevice ? COLORS.primary : COLORS.textSecondary}
                        />
                      )}
                    </View>

                    {/* Device Info */}
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text
                          numberOfLines={1}
                          className="font-semibold flex-1"
                          style={{ color: COLORS.textPrimary, fontSize: 14 }}
                        >
                          {device.device_name}
                        </Text>
                        {isCurrentDevice && (
                          <View
                            className="px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: 'rgba(139, 207, 104, 0.25)' }}
                          >
                            <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600' }}>
                              This device
                            </Text>
                          </View>
                        )}
                      </View>

                      <View className="flex-row items-center gap-3 mt-1">
                        <View className="flex-row items-center gap-1">
                          <Clock size={12} color={COLORS.textTertiary} />
                          <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>
                            {formatDate(device.last_active)}
                          </Text>
                        </View>
                        {device.ip_address && (
                          <View className="flex-row items-center gap-1">
                            <MapPin size={12} color={COLORS.textTertiary} />
                            <Text
                              numberOfLines={1}
                              style={{ color: COLORS.textTertiary, fontSize: 12 }}
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
            </View>
          )}
        </View>
      </View>

      {/* Change Password Section */}
      <View
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        {/* Section Header */}
        <View 
          className="p-4"
          style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}
        >
          <Text 
            className="font-bold mb-1" 
            style={{ color: COLORS.textPrimary, fontSize: 18 }}
          >
            Change Password
          </Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
            Update your account password
          </Text>
        </View>

        {/* Form */}
        <View className="p-4">
          <View className="mb-4">
            <Text 
              className="font-medium mb-2" 
              style={{ color: COLORS.textSecondary, fontSize: 13 }}
            >
              Current Password
            </Text>
            <TextInput
              secureTextEntry
              value={oldPassword}
              onChangeText={setOldPassword}
              placeholder="Enter current password"
              placeholderTextColor={COLORS.textTertiary}
              className="px-4 py-3 rounded-xl"
              style={{
                backgroundColor: COLORS.surfaceGlass,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                color: COLORS.textPrimary,
                fontSize: 15,
              }}
            />
          </View>

          <View className="mb-4">
            <Text 
              className="font-medium mb-2" 
              style={{ color: COLORS.textSecondary, fontSize: 13 }}
            >
              New Password
            </Text>
            <TextInput
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Min. 6 characters"
              placeholderTextColor={COLORS.textTertiary}
              className="px-4 py-3 rounded-xl"
              style={{
                backgroundColor: COLORS.surfaceGlass,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                color: COLORS.textPrimary,
                fontSize: 15,
              }}
            />
          </View>

          <TouchableOpacity
            onPress={updatePassword}
            disabled={updatingPassword}
            className="py-3.5 rounded-xl"
            style={{
              backgroundColor: COLORS.primary,
              opacity: updatingPassword ? 0.6 : 1,
              shadowColor: COLORS.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 5,
            }}
          >
            {updatingPassword ? (
              <ActivityIndicator color={COLORS.textInverse} />
            ) : (
              <Text 
                className="text-center font-bold" 
                style={{ color: COLORS.textInverse, fontSize: 15 }}
              >
                Update Password
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}
