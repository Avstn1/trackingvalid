// components/Settings/ProfileSecurityLogout.tsx
import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Component-specific accent colors not in design system
const ACCENT_COLORS = {
  greenBg: 'rgba(139, 207, 104, 0.2)',
  greenBorder: 'rgba(139, 207, 104, 0.3)',
  amber: '#fbbf24',
  amberBg: 'rgba(251, 191, 36, 0.2)',
  amberBorder: 'rgba(251, 191, 36, 0.3)',
  rose: '#fb7185',
  roseBg: 'rgba(251, 113, 133, 0.2)',
  roseBorder: 'rgba(251, 113, 133, 0.3)',
  modalBg: '#1a1a1a',
  modalOverlay: 'rgba(0, 0, 0, 0.7)',
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

  // Modal states
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [editedPhone, setEditedPhone] = useState('');
  const [isSendingEmailCode, setIsSendingEmailCode] = useState(false);
  const [isSendingPhoneCode, setIsSendingPhoneCode] = useState(false);
  const [emailVerificationCode, setEmailVerificationCode] = useState('');
  const [phoneVerificationCode, setPhoneVerificationCode] = useState('');
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [isVerifyingPhone, setIsVerifyingPhone] = useState(false);

  // Phone number formatting
  const formatPhoneNumber = (value: string) => {
    const phoneNumber = value.replace(/\D/g, '');
    
    if (phoneNumber.length === 0) {
      return '';
    } else if (phoneNumber.length <= 1) {
      return phoneNumber;
    } else if (phoneNumber.length <= 4) {
      return `${phoneNumber.slice(0, 1)} (${phoneNumber.slice(1)}`;
    } else if (phoneNumber.length <= 7) {
      return `${phoneNumber.slice(0, 1)} (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4)}`;
    } else {
      return `${phoneNumber.slice(0, 1)} (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`;
    }
  };

  const handlePhoneInput = (text: string) => {
    const formatted = formatPhoneNumber(text);
    setEditedPhone(formatted);
  };

  const getRawPhoneNumber = (formatted: string) => {
    return formatted.replace(/\D/g, '');
  };

  const getE164PhoneNumber = (formatted: string) => {
    const raw = getRawPhoneNumber(formatted);
    return raw.startsWith('1') ? `+${raw}` : `+1${raw}`;
  };

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
        setEditedEmail(data.email || user.email || '');
        setEditedPhone(data.phone || '');
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

  const handleSendEmailCode = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const accessToken = session?.access_token

    if (!accessToken) {
      Alert.alert('Error', 'No authentication token found')
      return
    }

    setIsSendingEmailCode(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/otp/generate-email-otp`, {
        method: 'POST',
        headers: {
          'x-client-access-token': accessToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          email: editedEmail,
          user_id: user.id 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification');
      }

      Alert.alert('Success', 'Verification email sent! Check your inbox.');
    } catch (error: any) {
      console.error('Email verification error:', error);
      Alert.alert('Error', error.message || 'Failed to send verification email');
    } finally {
      setIsSendingEmailCode(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!emailVerificationCode.trim()) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }

    setIsVerifyingEmail(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/otp/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          code: emailVerificationCode,
          user_id: user.id,
          email: editedEmail
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          email: editedEmail,
          email_verified: true
        })
        .eq('user_id', user.id);

      if (updateError) {
        throw new Error('Failed to save email');
      }

      Alert.alert('Success', 'Email verified successfully!');
      setShowEmailModal(false);
      setEmailVerificationCode('');
      fetchProfile();
    } catch (error: any) {
      console.error('Email verification code error:', error);
      Alert.alert('Error', error.message || 'Failed to verify email');
    } finally {
      setIsVerifyingEmail(false);
    }
  };

  const handleSendPhoneCode = async () => {
    setIsSendingPhoneCode(true);
    console.log("Sending phone code to:", editedPhone);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const e164Phone = getE164PhoneNumber(editedPhone);
      const rawPhone = getRawPhoneNumber(editedPhone);
      
      if (rawPhone.length < 10) {
        Alert.alert('Error', 'Please enter a valid phone number');
        return;
      }

      console.log("E164 Phone:", e164Phone);
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/otp/generate-sms-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session.access_token  // ← Changed to match your pattern
        },
        body: JSON.stringify({ 
          phoneNumber: e164Phone
        }),
      });

      console.log("Response status:", response.status);

      const data = await response.json();
      console.log("Response data:", data);

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send verification');
      }

      Alert.alert('Success', 'Verification code sent to your phone!');
    } catch (error: any) {
      console.error('Phone verification error:', error);
      Alert.alert('Error', error.message || 'Failed to send verification code');
    } finally {
      setIsSendingPhoneCode(false);
    }
  };

  const handleVerifyPhone = async () => {
    if (!phoneVerificationCode.trim()) {
      Alert.alert('Error', 'Please enter verification code');
      return;
    }

    setIsVerifyingPhone(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }

      const e164Phone = getE164PhoneNumber(editedPhone);

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/otp/verify-sms-otp`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session.access_token  
        },
        body: JSON.stringify({ 
          code: phoneVerificationCode,
          phoneNumber: e164Phone
        }),
      });

      const data = await response.json();
      console.log(data)

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      Alert.alert('Success', 'Phone verified successfully!');
      setShowPhoneModal(false);
      setPhoneVerificationCode('');
      fetchProfile();
    } catch (error: any) {
      console.error('Phone verification code error:', error);
      Alert.alert('Error', error.message || 'Failed to verify phone');
    } finally {
      setIsVerifyingPhone(false);
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

  const VerificationBadge = ({ verified, type }: { verified: boolean; type: 'email' | 'phone' }) => {
    if (verified) {
      return (
        <View
          className="px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: ACCENT_COLORS.greenBg,
            borderWidth: 1,
            borderColor: ACCENT_COLORS.greenBorder,
          }}
        >
          <Text className="text-[10px] font-semibold" style={{ color: COLORS.primary }}>
            Verified
          </Text>
        </View>
      );
    }

    if (type === 'email') {
      return (
        <View
          className="px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: ACCENT_COLORS.amberBg,
            borderWidth: 1,
            borderColor: ACCENT_COLORS.amberBorder,
          }}
        >
          <Text className="text-[10px] font-semibold" style={{ color: ACCENT_COLORS.amber }}>
            Not Verified
          </Text>
        </View>
      );
    }

    return (
      <View
        className="px-2 py-0.5 rounded-full"
        style={{
          backgroundColor: ACCENT_COLORS.roseBg,
          borderWidth: 1,
          borderColor: ACCENT_COLORS.roseBorder,
        }}
      >
        <Text className="text-[10px] font-semibold" style={{ color: ACCENT_COLORS.rose }}>
          Required for SMS
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!profile || !authUser) {
    return (
      <Text style={{ color: COLORS.textPrimary }}>Loading...</Text>
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
          style={{ color: COLORS.textPrimary }}
        >
          Profile Information
        </Text>

        {/* Avatar Section */}
        <View className="items-center mb-4">
          <View className="relative mb-3">
            <Image
              source={{ uri: profile.avatar_url || 'https://via.placeholder.com/150' }}
              className="w-20 h-20 rounded-full"
              style={{ backgroundColor: COLORS.surfaceElevated }}
            />
            <TouchableOpacity
              onPress={handleAvatarChange}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-1.5 rounded-full"
              style={{ 
                backgroundColor: COLORS.primary,
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              {uploading ? (
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
              ) : (
                <Camera size={14} color={COLORS.textPrimary} />
              )}
            </TouchableOpacity>
          </View>
          
          <Text 
            className="text-base font-semibold"
            style={{ color: COLORS.textPrimary }}
          >
            {profile.full_name}
          </Text>
          <Text 
            className="text-xs capitalize"
            style={{ color: COLORS.textSecondary }}
          >
            {profile.role === "Barber" 
              ? profile.barber_type === "rental" 
                ? "Rental Barber" 
                : "Commission Barber"
              : profile.role
            }
          </Text>

          {/* Email with verification */}
          <View className="flex-row items-center gap-2 mt-1 flex-wrap justify-center">
            <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
              {profile.email || authUser.email}
            </Text>
            <VerificationBadge verified={profile.email_verified} type="email" />
          </View>

          {/* Phone with verification */}
          {profile.phone ? (
            <View className="flex-row items-center gap-2 mt-1 flex-wrap justify-center">
              <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
                {formatPhoneNumber(profile.phone)}
              </Text>
              <VerificationBadge verified={profile.phone_verified} type="phone" />
            </View>
          ) : (
            <View className="flex-row items-center gap-2 mt-1 flex-wrap justify-center">
              <Text className="text-xs italic" style={{ color: COLORS.textSecondary }}>
                No phone number
              </Text>
              <VerificationBadge verified={false} type="phone" />
            </View>
          )}
        </View>

        {/* Email Section */}
        <View className="mb-3">
          <Text className="text-sm font-medium mb-2" style={{ color: COLORS.textPrimary }}>
            Email Address
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={profile.email || authUser.email}
              editable={false}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                color: COLORS.textSecondary,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                setEditedEmail(profile.email || authUser.email);
                setShowEmailModal(true);
              }}
              className="px-4 py-2.5 rounded-xl"
              style={{
                backgroundColor: ACCENT_COLORS.greenBg,
                borderWidth: 1,
                borderColor: ACCENT_COLORS.greenBorder,
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                Update
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Phone Section */}
        <View className="mb-4">
          <Text className="text-sm font-medium mb-2" style={{ color: COLORS.textPrimary }}>
            Phone Number
          </Text>
          <View className="flex-row items-center gap-2">
            <TextInput
              value={profile.phone ? formatPhoneNumber(profile.phone) : ''}
              editable={false}
              placeholder="No phone number set"
              placeholderTextColor={COLORS.textSecondary}
              className="flex-1 px-3 py-2.5 rounded-xl text-sm"
              style={{
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                color: COLORS.textSecondary,
              }}
            />
            <TouchableOpacity
              onPress={() => {
                setEditedPhone(profile.phone ? formatPhoneNumber(profile.phone) : '');
                setShowPhoneModal(true);
              }}
              className="px-4 py-2.5 rounded-xl"
              style={{
                backgroundColor: ACCENT_COLORS.greenBg,
                borderWidth: 1,
                borderColor: ACCENT_COLORS.greenBorder,
              }}
            >
              <Text className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                Update
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Commission Rate */}
        {profile.barber_type === 'commission' && (
          <View className="mt-4">
            <Text 
              className="text-sm font-medium mb-2"
              style={{ color: COLORS.textPrimary }}
            >
              Commission Rate (%)
            </Text>
            <View className="flex-row items-center gap-2">
              <TextInput
                value={commission}
                onChangeText={setCommission}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={COLORS.textSecondary}
                className="flex-1 px-3 py-2.5 rounded-xl"
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.textPrimary,
                }}
              />
              <TouchableOpacity
                onPress={updateCommission}
                className="px-5 py-2.5 rounded-xl"
                style={{
                  backgroundColor: COLORS.primary,
                  shadowColor: COLORS.primary,
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text 
                  className="font-bold text-sm"
                  style={{ color: COLORS.textPrimary }}
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
              backgroundColor: COLORS.surfaceGlass,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <Text 
              className="text-xs"
              style={{ color: COLORS.textSecondary }}
            >
              You are registered as a <Text className="font-semibold">Rental Barber</Text>.
            </Text>
          </View>
        )}
      </View>

      {/* Email Modal */}
      <Modal
        visible={showEmailModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowEmailModal(false);
          setEmailVerificationCode('');
        }}
      >
        <View
          className="flex-1 items-center justify-center p-4"
          style={{ backgroundColor: ACCENT_COLORS.modalOverlay }}
        >
          <View
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              backgroundColor: ACCENT_COLORS.modalBg,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold" style={{ color: COLORS.textPrimary }}>
                Update Email
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowEmailModal(false);
                  setEmailVerificationCode('');
                }}
              >
                <Text className="text-2xl" style={{ color: COLORS.textSecondary }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Email Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
                Email Address
              </Text>
              <TextInput
                value={editedEmail}
                onChangeText={setEditedEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                className="px-3 py-3 rounded-xl"
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.textPrimary,
                }}
                placeholder="Enter email address"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            {/* Current Status */}
            <View className="flex-row items-center gap-2 mb-4">
              <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                Current Status:
              </Text>
              <VerificationBadge verified={profile.email_verified} type="email" />
            </View>

            {/* Verification Section */}
            {!profile.email_verified && (
              <View
                className="p-4 rounded-xl mb-4"
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-sm font-medium mb-3" style={{ color: COLORS.textSecondary }}>
                  Verification Code
                </Text>
                <TextInput
                  value={emailVerificationCode}
                  onChangeText={setEmailVerificationCode}
                  keyboardType="number-pad"
                  maxLength={6}
                  className="px-3 py-3 rounded-xl mb-3"
                  style={{
                    backgroundColor: COLORS.surfaceGlass,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                    color: COLORS.textPrimary,
                  }}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor={COLORS.textSecondary}
                />
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleSendEmailCode}
                    disabled={isSendingEmailCode}
                    className="flex-1 px-3 py-3 rounded-xl items-center"
                    style={{
                      backgroundColor: ACCENT_COLORS.amberBg,
                      borderWidth: 1,
                      borderColor: ACCENT_COLORS.amberBorder,
                      opacity: isSendingEmailCode ? 0.5 : 1,
                    }}
                  >
                    {isSendingEmailCode ? (
                      <ActivityIndicator size="small" color={ACCENT_COLORS.amber} />
                    ) : (
                      <Text className="text-sm font-semibold" style={{ color: ACCENT_COLORS.amber }}>
                        Send Code
                      </Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleVerifyEmail}
                    disabled={isVerifyingEmail || !emailVerificationCode.trim()}
                    className="flex-1 px-3 py-3 rounded-xl items-center"
                    style={{
                      backgroundColor: ACCENT_COLORS.greenBg,
                      borderWidth: 1,
                      borderColor: ACCENT_COLORS.greenBorder,
                      opacity: (isVerifyingEmail || !emailVerificationCode.trim()) ? 0.5 : 1,
                    }}
                  >
                    {isVerifyingEmail ? (
                      <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                      <Text className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                        Verify
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Phone Modal */}
      <Modal
        visible={showPhoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPhoneModal(false);
          setPhoneVerificationCode('');
        }}
      >
        <View
          className="flex-1 items-center justify-center p-4"
          style={{ backgroundColor: ACCENT_COLORS.modalOverlay }}
        >
          <View
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              backgroundColor: ACCENT_COLORS.modalBg,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            {/* Header */}
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold" style={{ color: COLORS.textPrimary }}>
                Update Phone Number
              </Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPhoneModal(false);
                  setPhoneVerificationCode('');
                }}
              >
                <Text className="text-2xl" style={{ color: COLORS.textSecondary }}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Phone Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium mb-2" style={{ color: COLORS.textSecondary }}>
                Phone Number
              </Text>
              <TextInput
                value={editedPhone}
                onChangeText={handlePhoneInput}
                keyboardType="phone-pad"
                maxLength={16}
                className="px-3 py-3 rounded-xl"
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.textPrimary,
                }}
                placeholder="1 (647) 470-0164"
                placeholderTextColor={COLORS.textSecondary}
              />
            </View>

            {/* Current Status */}
            {profile.phone && (
              <View className="flex-row items-center gap-2 mb-4">
                <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                  Current Status:
                </Text>
                <VerificationBadge verified={profile.phone_verified} type="phone" />
              </View>
            )}

            {/* Warning if no phone */}
            {!profile.phone && (
              <View
                className="p-3 rounded-xl mb-4"
                style={{
                  backgroundColor: ACCENT_COLORS.roseBg,
                  borderWidth: 1,
                  borderColor: ACCENT_COLORS.roseBorder,
                }}
              >
                <Text className="text-sm" style={{ color: ACCENT_COLORS.rose }}>
                  Phone number is required for SMS marketing features
                </Text>
              </View>
            )}

            {/* Verification Section */}
            <View
              className="p-4 rounded-xl"
              style={{
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-sm font-medium mb-3" style={{ color: COLORS.textSecondary }}>
                Verification Code
              </Text>
              <TextInput
                value={phoneVerificationCode}
                onChangeText={setPhoneVerificationCode}
                keyboardType="number-pad"
                maxLength={6}
                className="px-3 py-3 rounded-xl mb-3"
                style={{
                  backgroundColor: COLORS.surfaceGlass,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.textPrimary,
                }}
                placeholder="Enter 6-digit code"
                placeholderTextColor={COLORS.textSecondary}
              />
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleSendPhoneCode}
                  disabled={isSendingPhoneCode || getRawPhoneNumber(editedPhone).length < 10}
                  className="flex-1 px-3 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: ACCENT_COLORS.greenBg,
                    borderWidth: 1,
                    borderColor: ACCENT_COLORS.greenBorder,
                    opacity: (isSendingPhoneCode || getRawPhoneNumber(editedPhone).length < 10) ? 0.5 : 1,
                  }}
                >
                  {isSendingPhoneCode ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                      Send Code
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleVerifyPhone}
                  disabled={isVerifyingPhone || !phoneVerificationCode.trim()}
                  className="flex-1 px-3 py-3 rounded-xl items-center"
                  style={{
                    backgroundColor: ACCENT_COLORS.greenBg,
                    borderWidth: 1,
                    borderColor: ACCENT_COLORS.greenBorder,
                    opacity: (isVerifyingPhone || !phoneVerificationCode.trim()) ? 0.5 : 1,
                  }}
                >
                  {isVerifyingPhone ? (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  ) : (
                    <Text className="text-sm font-semibold" style={{ color: COLORS.primary }}>
                      Verify
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}