import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
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
            backgroundColor: COLORS.surface,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
          }}
        >
          {/* Logo and App Name */}
          <View className="items-center mb-8">
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
              <Image
                source={require('@/assets/images/corvalogoTransparent.png')}
                style={{
                  width: 48,
                  height: 48,
                  marginRight: -3, 
                }}
                resizeMode="contain"
              />
    
              <MaskedView
                maskElement={
                  <Text
                    style={{
                      fontSize: 36,
                      fontWeight: 'bold',
                      letterSpacing: -0.5,
                      marginTop: 3,
                      backgroundColor: 'transparent',
                    }}
                  >
                    orva
                  </Text>
                }
              >
                <LinearGradient
                  colors={['#34D556', '#28C63E', '#34D556']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {/* This text only exists to size the gradient */}
                  <Text
                    style={{
                      fontSize: 36,
                      fontWeight: 'bold',
                      letterSpacing: -0.5,
                      marginTop: 3,
                      opacity: 0,
                    }}
                  >
                    orva
                  </Text>
                </LinearGradient>
              </MaskedView>
            </View>

            <View
              className="h-1 w-16 rounded-full mt-2"
              style={{
                backgroundColor: COLORS.primary,
                shadowColor: COLORS.primary,
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
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                color: COLORS.textPrimary,
              }}
              placeholder="Email"
              placeholderTextColor={COLORS.textSecondary}
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
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  color: COLORS.textPrimary,
                  paddingRight: 48,
                }}
                placeholder="Password"
                placeholderTextColor={COLORS.textSecondary}
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
                  <EyeOff size={20} color={COLORS.textSecondary} />
                ) : (
                  <Eye size={20} color={COLORS.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            <View className="relative">
              <TextInput
                className="w-full p-4 rounded-xl text-white"
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: confirmPassword
                    ? passwordMatch
                      ? COLORS.glassBorder
                      : COLORS.negative
                    : COLORS.glassBorder,
                  color: COLORS.textPrimary,
                  paddingRight: 48,
                }}
                placeholder="Confirm Password"
                placeholderTextColor={COLORS.textSecondary}
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
                  <EyeOff size={20} color={COLORS.textSecondary} />
                ) : (
                  <Eye size={20} color={COLORS.textSecondary} />
                )}
              </TouchableOpacity>
            </View>

            {confirmPassword && !passwordMatch && (
              <Text className="text-sm -mt-2" style={{ color: COLORS.negative }}>
                Passwords don't match
              </Text>
            )}

            <TouchableOpacity
              className="w-full py-4 rounded-xl mt-2"
              style={{
                backgroundColor: loading ? COLORS.surfaceElevated : COLORS.primary,
                opacity: loading ? 0.5 : 1,
                elevation: loading ? 0 : 8,
              }}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text
                  className="font-bold text-center text-base"
                  style={{ color: COLORS.textPrimary }}
                >
                  Sign Up
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-6 items-center">
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
              Already have an account?{' '}
              <Text
                style={{ color: COLORS.primary, fontWeight: '600' }}
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