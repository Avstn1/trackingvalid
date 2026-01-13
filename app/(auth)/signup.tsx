import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// Color Palette matching DailyRevenueCard
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  green: '#73aa57ff',
  greenLight: '#5b8f52ff',
  greenGlow: 'rgba(139, 207, 104, 0.4)',
  red: '#ef4444',
};

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', "Passwords don't match!");
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const { data: userProfile, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) {
        Alert.alert('Sign Up Failed', error.message);
        setLoading(false);
        return;
      }

      // Log successful signup
      if (userProfile.user) {
        await supabase.from('system_logs').insert({
          source: userProfile.user.id,
          action: 'user_signup',
          status: 'success',
          details: `User ${userProfile.user.email} signed up.`,
        });
      }

      Alert.alert(
        'Success',
        'Check your email to confirm your account!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    } catch (err) {
      console.error('Sign up error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const passwordMatch = password && confirmPassword && password === confirmPassword;

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View
        className="flex-1 justify-center items-center px-5"
        style={{ backgroundColor: COLORS.background }}
      >
        <View
          className="w-full max-w-md rounded-3xl p-8 shadow-lg"
          style={{
            backgroundColor: COLORS.cardBg,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
          }}
        >
          {/* Logo and App Name */}
          <View className="items-center mb-8">
            <Image
              source={require('@/assets/images/shearworklogo.png')}
              style={{
                width: 64,
                height: 64,
                marginBottom: 16,
                shadowColor: COLORS.green,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
              }}
              resizeMode="contain"
            />
            <Text
              className="text-4xl font-bold tracking-tight"
              style={{ color: COLORS.text }}
            >
              Corva
            </Text>
            <View
              className="h-1 w-16 rounded-full mt-2"
              style={{
                backgroundColor: COLORS.green,
                shadowColor: COLORS.green,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.8,
                shadowRadius: 8,
                elevation: 4,
              }}
            />
          </View>

          <View className="gap-4">
            <TextInput
              className="w-full p-4 rounded-xl text-white"
              style={{
                backgroundColor: COLORS.surfaceSolid,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                color: COLORS.text,
              }}
              placeholder="Email"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="next"
            />

            <View className="relative">
              <TextInput
                className="w-full p-4 rounded-xl text-white"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.text,
                  paddingRight: 48,
                }}
                placeholder="Password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="next"
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                }}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff size={20} color={COLORS.textMuted} />
                ) : (
                  <Eye size={20} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            <View className="relative">
              <TextInput
                className="w-full p-4 rounded-xl text-white"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: confirmPassword
                    ? passwordMatch
                      ? COLORS.glassBorder
                      : COLORS.red
                    : COLORS.glassBorder,
                  color: COLORS.text,
                  paddingRight: 48,
                }}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleSignUp}
              />
              <TouchableOpacity
                style={{
                  position: 'absolute',
                  right: 16,
                  top: 16,
                }}
                onPress={() => setShowConfirm(!showConfirm)}
                disabled={loading}
              >
                {showConfirm ? (
                  <EyeOff size={20} color={COLORS.textMuted} />
                ) : (
                  <Eye size={20} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            {confirmPassword && !passwordMatch && (
              <Text className="text-sm -mt-2" style={{ color: COLORS.red }}>
                Passwords don't match
              </Text>
            )}

            <TouchableOpacity
              className="w-full py-4 rounded-xl mt-2"
              style={{
                backgroundColor: loading ? COLORS.surfaceSolid : COLORS.green,
                opacity: loading ? 0.5 : 1,
                elevation: loading ? 0 : 8,
              }}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text
                  className="font-bold text-center text-base"
                  style={{ color: COLORS.text }}
                >
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-6 items-center">
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
              Already have an account?{' '}
              <Text
                style={{ color: COLORS.green, fontWeight: '600' }}
                onPress={() => !loading && router.push('/(auth)/login')}
              >
                Log in
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}