import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import * as Device from 'expo-device';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);

        await supabase.from('system_logs').insert({
          source: 'Unauthenticated user',
          action: 'user_login',
          status: 'failed',
          details: `${email} login failed.`,
        });
        setLoading(false);
        return;
      }

      // Wait for session to be established
      if (!data.session) {
        Alert.alert('Error', 'Failed to establish session');
        setLoading(false);
        return;
      }

      // Get user profile data
      const { data: userData } = await supabase
        .from('profiles')
        .select('role, full_name, stripe_subscription_status, trial_active')
        .eq('user_id', data.user?.id)
        .single();

      // Log successful login (except for admin)
      if (userData?.role?.toLowerCase() !== 'admin') {
        await supabase.from('system_logs').insert({
          source: `${userData?.full_name}: ${data.user?.id}`,
          action: 'user_login',
          status: 'success',
          details: `${data.user?.email} logged in.`,
        });
      }

      // Track device login
      try {
        // Get the actual session UUID using the RPC function
        const { data: sessionId, error: sessionError } = await supabase
          .rpc('get_current_session_id')

        if (sessionError) {
          console.error('Error getting session ID:', sessionError)
        }

        await supabase.from('user_devices').upsert({
          user_id: data.user.id,
          device_type: 'mobile',
          device_id: Device.osBuildId || 'unknown',
          device_name: Device.modelName || 'Unknown Device',
          session_id: sessionId || data.session.access_token,
          last_login: new Date().toISOString(),
          last_active: new Date().toISOString(),
        }, {
          onConflict: 'user_id,device_id'
        });
      } catch (trackingError) {
        console.error('Error tracking device:', trackingError)
        // Don't block login if device tracking fails
      }

      // Small delay to ensure session is persisted
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to dashboard/paywall
      const subStatus = userData?.stripe_subscription_status;
      const trialActive = userData?.trial_active;

      console.log('Subscription status:', subStatus);
      console.log('Trial active:', trialActive);

      if (subStatus === 'active' || subStatus === 'trialing' || trialActive === true) {
        router.replace('/(dashboard)/dashboard');
      } else {
        router.replace('/(paywall)/onboarding');
      }
      
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };

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
              onSubmitEditing={() => Keyboard.dismiss()}
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
                returnKeyType="done"
                onSubmitEditing={handleLogin}
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

            <TouchableOpacity
              className="w-full py-4 rounded-xl mt-2"
              style={{
                backgroundColor: loading ? COLORS.surfaceElevated : COLORS.primary,
                opacity: loading ? 0.5 : 1,
                elevation: loading ? 0 : 8,
              }}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text 
                  className="font-bold text-center text-base"
                  style={{ color: COLORS.textPrimary }}
                >
                  Log In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-6 items-center">
            <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>
              Need an account?{' '}
              <Text
                style={{ color: COLORS.primary, fontWeight: '600' }}
                onPress={() => !loading && router.push('/(auth)/signup')}
              >
                Sign up
              </Text>
            </Text>
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
}
