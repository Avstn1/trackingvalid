import { supabase } from '@/utils/supabaseClient';
import { AlertCircle, Send, Shield, Sparkles } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { SMSMessage } from './types';

interface MessageContentProps {
  profile: any;
  message: SMSMessage;
  validatingId: string | null;
  testMessagesUsed: number;
  session: any;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
  onValidate: (msgId: string) => void;
  onRequestTest: (msgId: string) => void;
  isFullLock?: boolean;
  isPartialLock?: boolean;
}

export function MessageContent({
  profile,
  message: msg,
  validatingId,
  testMessagesUsed,
  session,
  onUpdate,
  onValidate,
  onRequestTest,
  isFullLock = false,
  isPartialLock = false,
}: MessageContentProps) {
  const [isTesting, setIsTesting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [testsUsedToday, setTestsUsedToday] = useState(0);
  const DAILY_TEST_LIMIT = 10;

  const rotation = useSharedValue(0);

  useEffect(() => {
    loadTestCount();
  }, []);

  useEffect(() => {
    if (isGenerating || validatingId === msg.id || isTesting) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [isGenerating, validatingId, isTesting]);

  const loadTestCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { count, error } = await supabase
        .from('sms_sent')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('purpose', 'test_message')
        .eq('is_sent', true)
        .gte('created_at', today.toISOString());

      if (error) throw error;
      setTestsUsedToday(count || 0);
    } catch (error) {
      console.error('Failed to load test count:', error);
    }
  };

  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/generate-sms-template`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token,
        },
        body: JSON.stringify({ 
          prompt: 'Generate a professional barbershop marketing SMS message',
          profile: {
            full_name: profile?.full_name || '',
            email: profile?.email || '',
            phone: profile?.phone || '',
          }
        }),
        redirect: 'follow',
      });

      console.log('Final status:', response.status);
      console.log('Final URL:', response.url);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate template');
      }

      onUpdate(msg.id, { message: data.message });
      Toast.show({
        type: 'success',
        text1: 'Template generated successfully!'
      });
    } catch (error: any) {
      console.error('Template generation error:', error);
      Toast.show({
        type: 'error',
        text1: error.message || 'Failed to generate template'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTestMessage = async () => {
    if (!msg.isSaved) {
      Toast.show({
        type: 'error',
        text1: 'Please save the message as a draft before testing'
      });
      return;
    }

    if (!msg.isValidated) {
      Toast.show({
        type: 'error',
        text1: 'Message must be validated before testing'
      });
      return;
    }

    if (msg.validationStatus !== 'DRAFT') {
      Toast.show({
        type: 'error',
        text1: 'Only draft messages can be tested'
      });
      return;
    }

    if (!msg.message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Please enter a message first'
      });
      return;
    }

    if (msg.message.length < 100) {
      Toast.show({
        type: 'error',
        text1: 'Message must be at least 100 characters'
      });
      return;
    }

    setIsTesting(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/qstash-sms-send?messageId=${msg.id}&action=test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test message');
      }

      Toast.show({
        type: 'success',
        text1: 'Test message sent successfully to your phone!'
      });
    } catch (error: any) {
      console.error('Test message error:', error);
      Toast.show({
        type: 'error',
        text1: error.message || 'Failed to send test message'
      });
    } finally {
      setIsTesting(false);
    }
  };

  const spinningStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const charCount = msg.message.length;
  const charCountColor = charCount < 100 
    ? '#fbbf24' 
    : charCount > 240 
      ? '#fca5a5' 
      : '#bef264';

  return (
    <View className="gap-2.5">
      {/* Validation Reason Alert */}
      {msg.isValidated && msg.validationStatus === 'DENIED' && msg.validationReason && (
        <View className="flex-row items-start gap-1.5 p-2 bg-red-300/15 border border-red-300/25 rounded-[10px]">
          <AlertCircle color="#fca5a5" size={16} />
          <Text className="text-red-300 text-[11px] flex-1">{msg.validationReason}</Text>
        </View>
      )}

      {/* Message Textarea */}
      <View className="gap-1.5">
        <Text className="text-[#bdbdbd] text-xs font-medium">
          Message Content (SMS limits: 100-240 characters)
        </Text>
        <View className="relative">
          <TextInput
            value={msg.message}
            onChangeText={(text) => onUpdate(msg.id, { message: text })}
            placeholder="Type your marketing message here or generate a template..."
            placeholderTextColor="rgba(189, 189, 189, 0.5)"
            multiline
            numberOfLines={9}
            maxLength={240}
            editable={msg.isEditing && !isFullLock}
            className={`bg-white/5 border border-white/15 rounded-[10px] px-2.5 py-2 pr-12 text-white text-[13px] min-h-[130px] ${
              (!msg.isEditing || isFullLock) && 'opacity-70'
            }`}
            style={{ textAlignVertical: 'top' }}
          />
          <Text 
            className="absolute top-2 right-2.5 text-[11px] font-medium"
            style={{ color: charCountColor }}
          >
            {charCount}/240
          </Text>
        </View>
      </View>

      {/* Test Requirements Info */}
      {!msg.isSaved && (
        <View className="flex-row items-start gap-1.5 p-2 bg-amber-400/15 border border-amber-400/25 rounded-[10px]">
          <AlertCircle color="#fbbf24" size={16} />
          <Text className="text-amber-400 text-[11px] flex-1">
            Save and validate this message as a draft before you can test it
          </Text>
        </View>
      )}

      {msg.isSaved && !msg.isValidated && (
        <View className="flex-row items-start gap-1.5 p-2 bg-amber-400/15 border border-amber-400/25 rounded-[10px]">
          <AlertCircle color="#fbbf24" size={16} />
          <Text className="text-amber-400 text-[11px] flex-1">
            Validate this message before you can test it
          </Text>
        </View>
      )}

      {/* Test Limit Info */}
      {msg.isSaved && msg.isValidated && (
        <View className="p-2 bg-sky-300/15 border border-sky-300/25 rounded-[10px]">
          <Text className="text-sky-300 text-[11px]">
            {testsUsedToday >= DAILY_TEST_LIMIT ? (
              <>You've used all {DAILY_TEST_LIMIT} free tests today. Additional tests cost 1 credit each.</>
            ) : (
              <>Free tests remaining today: <Text className="font-semibold">{DAILY_TEST_LIMIT - testsUsedToday}/{DAILY_TEST_LIMIT}</Text></>
            )}
          </Text>
        </View>
      )}

      {/* Action Buttons */}
      {msg.isEditing && (
        <View className="flex-row gap-1.5">
          {/* Generate Template Button */}
          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center py-2 rounded-[10px] border bg-purple-500/20 border-purple-500/30 ${
              (isGenerating || isFullLock) && 'opacity-50'
            }`}
            onPress={handleGenerateTemplate}
            disabled={isGenerating || isFullLock}
          >
            {isGenerating ? (
              <Animated.View style={spinningStyle}>
                <Sparkles color="#d8b4fe" size={20} />
              </Animated.View>
            ) : (
              <Sparkles color="#d8b4fe" size={20} />
            )}
          </TouchableOpacity>

          {/* Validate Button */}
          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center py-2 rounded-[10px] border bg-white/5 border-white/15 ${
              (msg.message.length < 100 || validatingId === msg.id || isFullLock) && 'opacity-50'
            }`}
            onPress={() => onValidate(msg.id)}
            disabled={msg.message.length < 100 || validatingId === msg.id || isFullLock}
          >
            {validatingId === msg.id ? (
              <Animated.View style={spinningStyle}>
                <Shield color="#ffffff" size={20} />
              </Animated.View>
            ) : (
              <Shield color="#ffffff" size={20} />
            )}
          </TouchableOpacity>

          {/* Test Message Button */}
          <TouchableOpacity
            className={`flex-1 flex-row items-center justify-center py-2 rounded-[10px] border bg-sky-300/20 border-sky-300/30 ${
              (isTesting ||
                !msg.isSaved ||
                !msg.isValidated ||
                msg.validationStatus !== 'DRAFT' ||
                !msg.message.trim() ||
                msg.message.length < 100 ||
                isFullLock) && 'opacity-50'
            }`}
            onPress={() => {
              if (!msg.isSaved) {
                Toast.show({
                  type: 'error',
                  text1: 'Please save the message as a draft before testing'
                });
                return;
              }
              if (!msg.isValidated) {
                Toast.show({
                  type: 'error',
                  text1: 'Message must be validated before testing'
                });
                return;
              }
              if (msg.validationStatus !== 'DRAFT') {
                Toast.show({
                  type: 'error',
                  text1: 'Only draft messages can be tested'
                });
                return;
              }
              if (!msg.message.trim()) {
                Toast.show({
                  type: 'error',
                  text1: 'Please enter a message first'
                });
                return;
              }
              if (msg.message.length < 100) {
                Toast.show({
                  type: 'error',
                  text1: 'Message must be at least 100 characters'
                });
                return;
              }
              onRequestTest(msg.id);
            }}
            disabled={
              isTesting ||
              !msg.isSaved ||
              !msg.isValidated ||
              msg.validationStatus !== 'DRAFT' ||
              !msg.message.trim() ||
              msg.message.length < 100 ||
              isFullLock
            }
          >
            {isTesting ? (
              <Animated.View style={spinningStyle}>
                <Send color="#7dd3fc" size={20} />
              </Animated.View>
            ) : (
              <Send color="#7dd3fc" size={20} />
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}