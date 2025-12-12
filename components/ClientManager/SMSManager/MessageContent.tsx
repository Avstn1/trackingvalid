import { supabase } from '@/utils/supabaseClient';
import { AlertCircle, Send, Shield } from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SMSMessage } from './types';

interface MessageContentProps {
  message: SMSMessage;
  validatingId: string | null;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
  onValidate: (msgId: string) => void;
}

export function MessageContent({
  message: msg,
  validatingId,
  onUpdate,
  onValidate,
}: MessageContentProps) {
  const [isTesting, setIsTesting] = useState(false);

  const handleTestMessage = async () => {
    if (!msg.message.trim()) {
      Alert.alert('Error', 'Please enter a message first');
      return;
    }

    if (msg.message.length < 100) {
      Alert.alert('Error', 'Message must be at least 100 characters');
      return;
    }

    setIsTesting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        Alert.alert('Error', 'Not authenticated');
        setIsTesting(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/qstash-sms-send?user_id=test`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-access-token': accessToken,
          },
          body: JSON.stringify({
            message: msg.message,
            title: msg.title,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Test message API error:', response.status, errorText);
        throw new Error(`Failed to send test message: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Test message response:', data);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      if (data.success || response.ok) {
        Alert.alert('Success', 'Test message sent successfully!');
      } else {
        throw new Error(data.error || 'Failed to send test message');
      }
    } catch (error: any) {
      console.error('Test message error:', error);
      Alert.alert('Error', error.message || 'Failed to send test message');
    } finally {
      setIsTesting(false);
    }
  };

  const charCount = msg.message.length;
  const charColor = charCount < 100 ? '#fbbf24' : charCount > 240 ? '#f87171' : '#bef264';

  return (
    <View className="gap-3">
      {/* Validation Reason Alert */}
      {msg.isValidated && msg.validationStatus === 'DENIED' && msg.validationReason && (
        <View className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex-row items-start gap-2">
          <AlertCircle color="#fca5a5" size={14} className="mt-0.5 flex-shrink-0" />
          <Text className="text-xs text-rose-300 flex-1">{msg.validationReason}</Text>
        </View>
      )}

      {/* Message Textarea */}
      <View>
        <Text className="text-xs text-[#bdbdbd] mb-1">
          Message (100-240 characters)
        </Text>
        <View className="relative">
          <TextInput
            value={msg.message}
            onChangeText={(text) => onUpdate(msg.id, { message: text })}
            placeholder="Type your marketing message here..."
            multiline
            numberOfLines={6}
            maxLength={240}
            editable={msg.isEditing}
            className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-16 text-white placeholder-[#bdbdbd]/50 text-sm ${
              !msg.isEditing ? 'opacity-50' : ''
            }`}
            placeholderTextColor="#bdbdbd80"
            textAlignVertical="top"
          />
          <View className="absolute top-2 right-2">
            <Text className="text-xs font-medium" style={{ color: charColor }}>
              {charCount}/240
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      {msg.isEditing && (
        <View className="flex-row gap-2">
          {/* Validate Button */}
          <TouchableOpacity
            onPress={() => onValidate(msg.id)}
            disabled={msg.message.length < 100 || validatingId === msg.id}
            className={`flex-1 flex-row items-center justify-center gap-1.5 px-3 py-2.5 bg-white/5 border border-white/10 rounded-lg ${
              msg.message.length < 100 || validatingId === msg.id ? 'opacity-50' : ''
            }`}
          >
            {validatingId === msg.id ? (
              <>
                <ActivityIndicator size="small" color="#7dd3fc" />
                <Text className="text-white font-semibold text-sm">Validating...</Text>
              </>
            ) : (
              <>
                <Shield color="#ffffff" size={16} />
                <Text className="text-white font-semibold text-sm">Validate</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Test Message Button */}
          <TouchableOpacity
            onPress={handleTestMessage}
            disabled={msg.message.length < 100 || isTesting}
            className={`flex-1 flex-row items-center justify-center gap-1.5 px-3 py-2.5 bg-sky-300/20 border border-sky-300/30 rounded-lg ${
              msg.message.length < 100 || isTesting ? 'opacity-50' : ''
            }`}
          >
            {isTesting ? (
              <>
                <ActivityIndicator size="small" color="#7dd3fc" />
                <Text className="text-sky-300 font-semibold text-sm">Sending...</Text>
              </>
            ) : (
              <>
                <Send color="#7dd3fc" size={16} />
                <Text className="text-sky-300 font-semibold text-sm">Test</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}