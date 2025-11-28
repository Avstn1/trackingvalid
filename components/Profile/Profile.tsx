// components/Settings/ProfileSecurityLogout.tsx
import { supabase } from '@/utils/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Color Palette
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.4)',
};

export default function ProfileSecurityLogout() {
  const router = useRouter();
  
  // Profile states
  const [profile, setProfile] = useState<any>(null);
  const [authUser, setAuthUser] = useState<any>(null);
  const [commission, setCommission] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Security states
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setAuthUser(user);

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Failed fetching profile', error);
        return;
      }
      if (data) {
        setProfile(data);
        setCommission(data.commission_rate ? (data.commission_rate * 100).toString() : '');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateCommission = async () => {
    if (!profile) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const value = commission === '' ? null : Number(commission) / 100;

      const { error } = await supabase
        .from('profiles')
        .update({ commission_rate: value })
        .eq('user_id', user.id);

      if (error) {
        Alert.alert('Error', 'Failed updating commission');
      } else {
        Alert.alert('Success', 'Commission saved');
        fetchProfile();
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed updating commission');
    }
  };

  const handleAvatarChange = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Error', 'Not logged in');
        return;
      }

      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      const fileExt = 'jpg';
      const fileName = `${user.id}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob, { upsert: true });

      if (uploadError) {
        console.error(uploadError);
        Alert.alert('Error', 'Upload failed');
        return;
      }

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const avatarUrl = urlData.publicUrl;

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('user_id', user.id);

      if (updateErr) {
        console.error(updateErr);
        Alert.alert('Error', 'Failed saving avatar');
        return;
      }

      Alert.alert('Success', 'Profile picture updated');
      fetchProfile();
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed updating picture');
    } finally {
      setUploading(false);
    }
  };

  const updatePassword = async () => {
    if (!oldPassword) {
      Alert.alert('Error', 'Enter your current password');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'New password must be at least 6 characters');
      return;
    }

    setUpdatingPassword(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (!email) {
        setUpdatingPassword(false);
        Alert.alert('Error', 'Not logged in');
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: oldPassword,
      });

      if (signInError) {
        setUpdatingPassword(false);
        Alert.alert('Error', 'Incorrect current password');
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error(updateError);
        setUpdatingPassword(false);
        Alert.alert('Error', 'Failed to update password');
        return;
      }

      Alert.alert('Success', 'Password updated successfully!');
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Something went wrong');
    }

    setUpdatingPassword(false);
  };

  const logout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            router.replace('/login');
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  if (!profile || !authUser) {
    return (
      <Text style={{ color: COLORS.text }}>Loading...</Text>
    );
  }

  return (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 1 }}
    >
      {/* PROFILE SECTION */}
      <View className="mb-1">
        <Text 
          className="text-lg font-bold mb-4"
          style={{ color: COLORS.text }}
        >
          Profile Information
        </Text>

        {/* Avatar Section */}
        <View className="items-center mb-4">
          <View className="relative mb-3">
            <Image
              source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }}
              className="w-20 h-20 rounded-full"
              style={{ backgroundColor: COLORS.surfaceSolid }}
            />
            <TouchableOpacity
              onPress={handleAvatarChange}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-1.5 rounded-full"
              style={{ 
                backgroundColor: COLORS.orange,
                shadowColor: COLORS.orange,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.text} />
              ) : (
                <Camera size={14} color={COLORS.text} />
              )}
            </TouchableOpacity>
          </View>
          <Text 
            className="text-base font-semibold"
            style={{ color: COLORS.text }}
          >
            {profile.full_name}
          </Text>
          <Text 
            className="text-xs capitalize"
            style={{ color: COLORS.textMuted }}
          >
            {profile.role}
          </Text>
          <Text 
            className="text-xs"
            style={{ color: COLORS.textMuted }}
          >
            {authUser.email}
          </Text>
        </View>

        {/* Commission Rate */}
        {profile.barber_type === 'commission' && (
          <View className="mt-4">
            <Text 
              className="text-sm font-medium mb-2"
              style={{ color: COLORS.text }}
            >
              Commission Rate (%)
            </Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={commission}
                onChangeText={setCommission}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textMuted}
                className="flex-1 px-3 py-2.5 rounded-xl"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.text,
                }}
              />
              <TouchableOpacity
                onPress={updateCommission}
                className="px-5 py-2.5 rounded-xl"
                style={{
                  backgroundColor: COLORS.orange,
                  shadowColor: COLORS.orange,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text 
                  className="font-bold text-sm"
                  style={{ color: COLORS.text }}
                >
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {profile.barber_type === 'rental' && (
          <View 
            className="p-3 rounded-xl mt-4 mb-3"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <Text 
              className="text-xs"
              style={{ color: COLORS.textMuted }}
            >
              You are registered as a <Text className="font-semibold">Rental Barber</Text>.
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}