import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';


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
      const { data: userProfile, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert('Login Failed', error.message);

        // Log failed attempt
        await supabase.from('system_logs').insert({
          source: 'Unauthenticated user',
          action: 'user_login',
          status: 'failed',
          details: `${email} login failed.`,
        });
      } else {
        Alert.alert('Success', 'Logged in successfully!');

        // Get user profile data
        const { data: userData } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('user_id', userProfile.user?.id)
          .single();

        // Log successful login (except for admin)
        if (userData?.role?.toLowerCase() !== 'admin') {
          await supabase.from('system_logs').insert({
            source: `${userData?.full_name}: ${userProfile.user?.id}`,
            action: 'user_login',
            status: 'success',
            details: `${userProfile.user?.email} logged in.`,
          });
        }

        // Navigate to dashboard
        router.replace('/(dashboard)/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 justify-center items-center bg-zinc-950 px-5">
      <View className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 shadow-lg border border-zinc-800">
        <Text className="text-3xl font-bold mb-6 text-center text-lime-300">
          Log In
        </Text>

        <View className="gap-4">
          <TextInput
            className="w-full p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-white"
            placeholder="Email"
            placeholderTextColor="#888"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <View className="relative">
            <TextInput
              className="w-full p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-white pr-12"
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              editable={!loading}
            />
            <TouchableOpacity
              className="absolute right-3 top-3"
              onPress={() => setShowPassword(!showPassword)}
              disabled={loading}
            >
              {showPassword ? (
                <EyeOff size={18} color="#888" />
              ) : (
                <Eye size={18} color="#888" />
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            className={`w-full bg-lime-400 py-3 rounded-lg mt-2 ${loading ? 'opacity-50' : ''}`}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black font-semibold text-center text-base">
                Log In
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <View className="mt-4 items-center">
          <Text className="text-zinc-400 text-sm">
            Need an account?{' '}
            <Text
              className="text-lime-400"
              onPress={() => !loading && router.push('/(auth)/signup')}
            >
              Sign up
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
}