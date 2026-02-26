import { supabase } from '@/utils/supabaseClient';
import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Image, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

      if (!data.session) {
        Alert.alert('Error', 'Failed to establish session');
        setLoading(false);
        return;
      }

      const { data: userData } = await supabase
        .from('profiles')
        .select('role, full_name, stripe_subscription_status, trial_active')
        .eq('user_id', data.user?.id)
        .single();

      if (userData?.role?.toLowerCase() !== 'admin') {
        await supabase.from('system_logs').insert({
          source: `${userData?.full_name}: ${data.user?.id}`,
          action: 'user_login',
          status: 'success',
          details: `${data.user?.email} logged in.`,
        });
      }

      try {
        const { data: sessionId, error: sessionError } = await supabase.rpc('get_current_session_id');
        if (sessionError) console.error('Error getting session ID:', sessionError);

        await supabase.from('user_devices').upsert({
          user_id: data.user.id,
          device_type: 'mobile',
          device_id: Device.osBuildId || 'unknown',
          device_name: Device.modelName || 'Unknown Device',
          session_id: sessionId || data.session.access_token,
          last_login: new Date().toISOString(),
          last_active: new Date().toISOString(),
        }, { onConflict: 'user_id,device_id' });
      } catch (trackingError) {
        console.error('Error tracking device:', trackingError);
      }

      await new Promise(resolve => setTimeout(resolve, 100));

      const subStatus = userData?.stripe_subscription_status;
      const trialActive = userData?.trial_active;

      if (subStatus === 'active' || trialActive === true) {
        router.replace('/(dashboard)/dashboard');
      } else {
        Alert.alert('Account Not Active', 'Account not active. Please activate your account on Corva Web.');
        await supabase.auth.signOut();
        setLoading(false);
        return;
      }

    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#101312' }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >

        {/* Back button */}
        <TouchableOpacity
          onPress={() => router.back()}
          disabled={loading}
          style={{
            marginTop: 8,
            marginLeft: 20,
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ArrowLeft size={18} color="#8a9e93" />
        </TouchableOpacity>

        {/* Centered content */}
        <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: 24 }}>

          {/* Logo */}
          <View style={{ alignItems: 'center', marginBottom: 40 }}>
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 22,
                backgroundColor: 'rgba(122,255,201,0.08)',
                borderWidth: 1,
                borderColor: 'rgba(122,255,201,0.25)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 20,
              }}
            >
              <Image
                source={require('@/assets/images/corvalogoTransparent.png')}
                style={{ width: 48, height: 48 }}
                resizeMode="contain"
              />
            </View>
            <Text style={{ color: '#ffffff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5, marginBottom: 6 }}>
              Welcome back
            </Text>
            <Text style={{ color: '#8a9e93', fontSize: 15, textAlign: 'center' }}>
              Sign in to your Corva account
            </Text>
          </View>

          {/* Form card */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
              borderRadius: 24,
              padding: 24,
              gap: 12,
            }}
          >
            <TextInput
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.1)',
                borderRadius: 14,
                padding: 16,
                color: '#ffffff',
                fontSize: 15,
              }}
              placeholder="Email"
              placeholderTextColor="#8a9e93"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
              returnKeyType="next"
              onSubmitEditing={() => Keyboard.dismiss()}
            />

            <View>
              <TextInput
                style={{
                  backgroundColor: 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 14,
                  padding: 16,
                  paddingRight: 52,
                  color: '#ffffff',
                  fontSize: 15,
                }}
                placeholder="Password"
                placeholderTextColor="#8a9e93"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                style={{ position: 'absolute', right: 16, top: 16 }}
                onPress={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword
                  ? <EyeOff size={20} color="#8a9e93" />
                  : <Eye size={20} color="#8a9e93" />
                }
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={loading}
              style={{
                marginTop: 4,
                backgroundColor: loading ? 'rgba(122,255,201,0.3)' : '#7affc9',
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                shadowColor: '#7affc9',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: loading ? 0 : 0.3,
                shadowRadius: 12,
                elevation: loading ? 0 : 8,
              }}
            >
              {loading
                ? <ActivityIndicator color="#101312" />
                : <Text style={{ color: '#101312', fontWeight: '800', fontSize: 16 }}>Log In</Text>
              }
            </TouchableOpacity>
          </View>

        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}