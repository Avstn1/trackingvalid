import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import { Eye, EyeOff } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Image, Keyboard, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';

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
};

// Loading splash component
function AuthLoadingSplash() {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  const scaleAnim = React.useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View 
      style={{ 
        flex: 1, 
        backgroundColor: COLORS.background, 
        justifyContent: 'center', 
        alignItems: 'center' 
      }}
    >
      <Animated.View 
        style={{ 
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
          alignItems: 'center',
        }}
      >
        <Image 
          source={require('@/assets/images/shearworklogo.png')} 
          style={{ 
            width: 100, 
            height: 100,
            marginBottom: 20,
          }}
          resizeMode="contain"
        />
        <Text
          style={{
            fontSize: 32,
            fontWeight: 'bold',
            color: COLORS.text,
            letterSpacing: -0.5,
            marginBottom: 20,
          }}
        >
          ShearWork
        </Text>
        <ActivityIndicator size="large" color={COLORS.green} />
      </Animated.View>
    </View>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is already logged in, redirect to dashboard
        router.replace('/(dashboard)/dashboard');
      } else {
        // No active session, show login form
        setCheckingAuth(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setCheckingAuth(false);
    }
  };

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
        .select('role, full_name')
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

      // Small delay to ensure session is persisted
      await new Promise(resolve => setTimeout(resolve, 100));

      // Navigate to dashboard
      router.replace('/(dashboard)/dashboard');
      
    } catch (err) {
      console.error('Login error:', err);
      Alert.alert('Error', 'An unexpected error occurred');
      setLoading(false);
    }
  };

  // Show loading splash while checking auth
  if (checkingAuth) {
    return <AuthLoadingSplash />;
  }

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
              }}
              resizeMode="contain"
            />
            <Text 
              className="text-4xl font-bold tracking-tight"
              style={{ color: COLORS.text }}
            >
              ShearWork
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
              onSubmitEditing={() => Keyboard.dismiss()}
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
                  <EyeOff size={20} color={COLORS.textMuted} />
                ) : (
                  <Eye size={20} color={COLORS.textMuted} />
                )}
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              className="w-full py-4 rounded-xl mt-2"
              style={{
                backgroundColor: loading ? COLORS.surfaceSolid : COLORS.green,
                opacity: loading ? 0.5 : 1,
                elevation: loading ? 0 : 8,
              }}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.text} />
              ) : (
                <Text 
                  className="font-bold text-center text-base"
                  style={{ color: COLORS.text }}
                >
                  Log In
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-6 items-center">
            <Text style={{ color: COLORS.textMuted, fontSize: 14 }}>
              Need an account?{' '}
              <Text
                style={{ color: COLORS.green, fontWeight: '600' }}
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