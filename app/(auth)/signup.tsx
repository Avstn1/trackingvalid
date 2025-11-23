import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import React from 'react';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignUp = () => {
    console.log('Sign up pressed', { email, password, confirmPassword });
    // No functionality - just UI
  };

  const passwordMatch = password && confirmPassword && password === confirmPassword;

  return (
    <View className="flex-1 justify-center items-center bg-zinc-950 px-5">
      <View className="w-full max-w-md bg-zinc-900 rounded-2xl p-8 shadow-lg border border-zinc-800">
        <Text className="text-3xl font-bold mb-6 text-center text-blue-500">
          Sign Up
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
          />

          <View className="relative">
            <TextInput
              className="w-full p-3 rounded-lg border border-zinc-800 bg-zinc-950 text-white pr-12"
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              className="absolute right-3 top-3"
              onPress={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff size={18} color="#888" />
              ) : (
                <Eye size={18} color="#888" />
              )}
            </TouchableOpacity>
          </View>

          <View className="relative">
            <TextInput
              className={`w-full p-3 rounded-lg bg-zinc-950 text-white pr-12 ${
                confirmPassword
                  ? passwordMatch
                    ? 'border border-zinc-800'
                    : 'border border-red-500'
                  : 'border border-zinc-800'
              }`}
              placeholder="Confirm Password"
              placeholderTextColor="#888"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity
              className="absolute right-3 top-3"
              onPress={() => setShowConfirm(!showConfirm)}
            >
              {showConfirm ? (
                <EyeOff size={18} color="#888" />
              ) : (
                <Eye size={18} color="#888" />
              )}
            </TouchableOpacity>
          </View>

          {confirmPassword && !passwordMatch && (
            <Text className="text-red-500 text-sm -mt-2">
              Passwords don&apos;t match
            </Text>
          )}

          <TouchableOpacity 
            className="w-full bg-zinc-800 hover:bg-zinc-700 py-3 rounded-lg mt-2"
            onPress={handleSignUp}
          >
            <Text className="text-white font-semibold text-center text-base">
              Sign Up
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-4 items-center">
          <Text className="text-zinc-400 text-sm">
            Already have an account?{' '}
            <Text className="text-blue-500">Log in</Text>
          </Text>
        </View>
      </View>
    </View>
  );
}