import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';



// Component-specific accent colors (not in design system)
const ACCENT_COLORS = {
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.4)',
};



const ROLE_OPTIONS = [
  { label: 'Barber (Commission)', role: 'Barber', barber_type: 'commission' },
  { label: 'Barber (Chair Rental)', role: 'Barber', barber_type: 'rental' },
];

// Avatar Component
function EditableAvatar({ avatarUrl, fullName, onPress, size = 120 }) {
  const initials = fullName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: COLORS.surfaceElevated,
          borderWidth: 3,
          borderColor: ACCENT_COLORS.orange,
          justifyContent: 'center',
          alignItems: 'center',
          overflow: 'hidden',
          shadowColor: ACCENT_COLORS.orange,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.4,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={{ width: size, height: size }}
            resizeMode="cover"
          />
        ) : (
          <Text
            style={{
              fontSize: size / 3,
              fontWeight: 'bold',
              color: ACCENT_COLORS.orange,
            }}
          >
            {initials || '?'}
          </Text>
        )}
      </View>
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          right: 0,
          backgroundColor: ACCENT_COLORS.orange,
          width: size / 3.5,
          height: size / 3.5,
          borderRadius: size / 7,
          justifyContent: 'center',
          alignItems: 'center',
          borderWidth: 2,
          borderColor: COLORS.background,
        }}
      >
        <Text style={{ color: COLORS.textPrimary, fontSize: size / 6 }}>✏️</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function OnboardingPage({ onComplete }) {
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [selectedRole, setSelectedRole] = useState(ROLE_OPTIONS[0]);
  const [commissionRate, setCommissionRate] = useState('');
  const [avatarUri, setAvatarUri] = useState(null);
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleAvatarClick = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return;
    }

    if (selectedRole.barber_type === 'commission') {
      const rate = Number(commissionRate);
      if (!commissionRate || rate < 1 || rate > 100) {
        Alert.alert('Error', 'Please enter a valid commission rate between 1 and 100');
        return;
      }
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      let avatarUrl = '';
      if (avatarUri) {
        // Create form data for upload
        const fileName = `${fullName.replace(/\s+/g, '_')}_${Date.now()}.jpg`;
        
        // Fetch the image and convert to blob
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { 
            contentType: 'image/jpeg',
            upsert: true 
          });
          
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        avatarUrl = urlData.publicUrl;
      }

      const profileUpdate = {
        full_name: fullName,
        role: selectedRole.role,
        barber_type: selectedRole.barber_type,
        avatar_url: avatarUrl,
        onboarded: true,
      };

      if (selectedRole.barber_type === 'commission') {
        profileUpdate.commission_rate = Number(commissionRate) / 100;
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      // Small delay to ensure data is persisted
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Call onComplete callback if provided (for modal usage), otherwise navigate
      if (onComplete) {
        onComplete();
      } else {
        router.replace('/(dashboard)/dashboard');
      }
    } catch (err) {
      console.error('Onboarding error:', err);
      Alert.alert('Error', 'Failed to complete onboarding: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.background,
          }}
        >
          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: keyboardVisible ? 'flex-start' : 'center',
              alignItems: 'center',
              padding: 20,
              paddingTop: keyboardVisible ? 40 : 75,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 32,
                fontWeight: 'bold',
                color: ACCENT_COLORS.orange,
                marginBottom: 32,
                textAlign: 'center',
              }}
            >
              Complete Your Profile
            </Text>

            <View
              style={{
                backgroundColor: COLORS.surfaceGlass,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                padding: 32,
                borderRadius: 24,
                width: '100%',
                maxWidth: 400,
                alignItems: 'center',
              }}
            >
            {/* Avatar */}
            <View style={{ marginBottom: 24 }}>
              <EditableAvatar
                avatarUrl={avatarUri}
                fullName={fullName}
                onPress={handleAvatarClick}
                size={120}
              />
            </View>

            {/* Full Name */}
            <View style={{ width: '100%', marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontWeight: '600',
                  marginBottom: 8,
                  fontSize: 16,
                }}
              >
                Full Name
              </Text>
              <TextInput
                style={{
                  width: '100%',
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.textPrimary,
                  fontSize: 16,
                }}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.textSecondary}
                value={fullName}
                onChangeText={setFullName}
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            {/* Role Selection */}
            <View style={{ width: '100%', marginBottom: 16 }}>
              <Text
                style={{
                  color: COLORS.textPrimary,
                  fontWeight: '600',
                  marginBottom: 8,
                  fontSize: 16,
                }}
              >
                Role
              </Text>
              <View
                style={{
                  borderRadius: 12,
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  overflow: 'hidden', // Prevents background from leaking
                }}
              >
                {ROLE_OPTIONS.map((roleOption, index) => (
                  <TouchableOpacity
                    key={roleOption.label}
                    style={{
                      padding: 12,
                      borderBottomWidth: index < ROLE_OPTIONS.length - 1 ? 1 : 0,
                      borderBottomColor: COLORS.glassBorder,
                      backgroundColor:
                        selectedRole.label === roleOption.label
                          ? ACCENT_COLORS.orangeGlow
                          : 'transparent',
                    }}
                    onPress={() => setSelectedRole(roleOption)}
                    disabled={loading}
                  >
                    <Text
                      style={{
                        color:
                          selectedRole.label === roleOption.label
                            ? ACCENT_COLORS.orange
                            : COLORS.textPrimary,
                        fontSize: 16,
                        fontWeight:
                          selectedRole.label === roleOption.label ? '600' : '400',
                      }}
                    >
                      {roleOption.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Commission Rate Input - Always takes up space */}
            <View 
              style={{ 
                width: '100%', 
                marginBottom: 16,
                height: 88, // Fixed height to reserve space
                justifyContent: 'flex-start',
              }}
            >
              {selectedRole.barber_type === 'commission' && (
                <>
                  <Text
                    style={{
                      color: COLORS.textPrimary,
                      fontWeight: '600',
                      marginBottom: 8,
                      fontSize: 16,
                    }}
                  >
                    Commission Rate (%)
                    <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
                      {' '}
                      (1 to 100)
                    </Text>
                  </Text>
                  <TextInput
                    style={{
                      width: '100%',
                      padding: 12,
                      borderRadius: 12,
                      backgroundColor: COLORS.surfaceElevated,
                      borderWidth: 1,
                      borderColor: COLORS.glassBorder,
                      color: COLORS.textPrimary,
                      fontSize: 16,
                    }}
                    placeholder="Enter commission rate"
                    placeholderTextColor={COLORS.textSecondary}
                    value={commissionRate}
                    onChangeText={setCommissionRate}
                    keyboardType="numeric"
                    editable={!loading}
                    returnKeyType="done"
                  />
                </>
              )}
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={{
                width: '100%',
                padding: 16,
                borderRadius: 12,
                backgroundColor: loading ? COLORS.surfaceElevated : ACCENT_COLORS.orange,
                opacity: loading ? 0.5 : 1,
                shadowColor: ACCENT_COLORS.orange,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loading ? 0 : 0.4,
                shadowRadius: 12,
                elevation: loading ? 0 : 8,
              }}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text
                  style={{
                    color: COLORS.textPrimary,
                    fontWeight: 'bold',
                    textAlign: 'center',
                    fontSize: 16,
                  }}
                >
                  Complete Onboarding
                </Text>
              )}
            </TouchableOpacity>
          </View>

          
          {/* Logout button */}
          <View style={{ paddingTop: 20, alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => {
                Alert.alert('Log Out', 'Are you sure you want to log out?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                      await supabase.auth.signOut({ scope: 'local' });
                      router.replace('/login');
                    },
                  },
                ]);
              }}
              style={{
                backgroundColor: COLORS.negativeMuted,
                paddingHorizontal: 24,
                paddingVertical: 12,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: COLORS.negative, fontWeight: '600' }}>
                Log Out
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}