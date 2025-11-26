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
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
        <ActivityIndicator size="large" color="#c4ff85" />
      </View>
    );
  }

  if (!profile || !authUser) {
    return <Text className="text-white">Loading...</Text>;
  }

  return (
    <ScrollView 
      className="flex-1" 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 1 }}
    >
      {/* PROFILE SECTION */}
      <View className="mb-1">
        <Text className="text-white text-lg font-bold mb-4">Profile Information</Text>

        {/* Avatar Section */}
        <View className="items-center mb-4">
          <View className="relative mb-3">
            <Image
              source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }}
              className="w-20 h-20 rounded-full bg-zinc-800"
            />
            <TouchableOpacity
              onPress={handleAvatarChange}
              disabled={uploading}
              className="absolute bottom-0 right-0 bg-lime-400 p-1.5 rounded-full"
            >
              {uploading ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Camera size={14} color="#000" />
              )}
            </TouchableOpacity>
          </View>
          <Text className="text-white text-base font-semibold">
            {profile.full_name}
          </Text>
          <Text className="text-zinc-400 text-xs capitalize">{profile.role}</Text>
          <Text className="text-zinc-400 text-xs">{authUser.email}</Text>
        </View>

        {/* Commission Rate */}
        {profile.barber_type === 'commission' && (
          <View className="mt-4">
            <Text className="text-white text-sm font-medium mb-2">
              Commission Rate (%)
            </Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={commission}
                onChangeText={setCommission}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#71717a"
                className="flex-1 bg-zinc-800 border border-zinc-700 px-3 py-2.5 rounded-xl text-white"
              />
              <TouchableOpacity
                onPress={updateCommission}
                className="bg-lime-400 px-5 py-2.5 rounded-xl"
              >
                <Text className="text-black font-bold text-sm">Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {profile.barber_type === 'rental' && (
          <View className="p-3 bg-zinc-800 border border-zinc-700 rounded-xl mt-4 mb-3">
            <Text className="text-zinc-300 text-xs">
              You are registered as a <Text className="font-semibold">Rental Barber</Text>.
            </Text>
          </View>
        )}
      </View>

      {/* DIVIDER */}
      <View className="h-px bg-zinc-800 mb-3" />

      {/* SECURITY SECTION */}
      <View className="mb-6">
        <Text className="text-white text-lg font-bold mb-4">Security</Text>

        <View className="mb-3">
          <Text className="text-white text-sm mb-1.5">Current Password</Text>
          <TextInput
            secureTextEntry
            value={oldPassword}
            onChangeText={setOldPassword}
            placeholder="Enter current password"
            placeholderTextColor="#71717a"
            className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
          />
        </View>

        <View className="mb-4">
          <Text className="text-white text-sm mb-1.5">New Password</Text>
          <TextInput
            secureTextEntry
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="Enter new password"
            placeholderTextColor="#71717a"
            className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white"
          />
        </View>

        <TouchableOpacity
          onPress={updatePassword}
          disabled={updatingPassword}
          className={`py-2.5 rounded-xl ${
            updatingPassword ? 'bg-lime-400 opacity-50' : 'bg-lime-400'
          }`}
        >
          {updatingPassword ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black text-center font-bold text-sm">Update Password</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* DIVIDER */}
      <View className="h-px bg-zinc-800 mb-1" />

      {/* LOGOUT SECTION */}
      <View className="items-center py-3">
        <Text className="text-white text-lg font-bold mb-2">Logout</Text>
        
        <Text className="text-zinc-400 text-xs text-center mb-4">
          You will be signed out of your account immediately.
        </Text>

        <TouchableOpacity
          onPress={logout}
          className="bg-red-600 px-6 py-2.5 rounded-xl"
        >
          <Text className="text-white text-center font-bold text-sm">Logout</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}