import { supabase } from '@/utils/supabaseClient';
import { AlertCircle } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SMSMessage } from './types';

interface MessageContentProps {
  message: SMSMessage;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
  isFullLock?: boolean;
}

export function MessageContent({
  message: msg,
  onUpdate,
  isFullLock = false,
}: MessageContentProps) {
  const [testsUsedToday, setTestsUsedToday] = useState(0);
  const DAILY_TEST_LIMIT = 10;

  useEffect(() => {
    loadTestCount();
  }, []);

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
          <Text className="text-red-300 text-xs flex-1">{msg.validationReason}</Text>
        </View>
      )}

      {/* Message Textarea */}
      <View className="gap-1.5">
        <Text className="text-[#bdbdbd] text-sm font-medium">
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
            className={`bg-white/5 border border-white/15 rounded-[10px] px-2.5 py-2 pr-12 text-white text-[15px] min-h-[130px] ${
              (!msg.isEditing || isFullLock) && 'opacity-70'
            }`}
            style={{ textAlignVertical: 'top' }}
          />
          <Text 
            className="absolute top-2 right-2.5 text-xs font-medium"
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
          <Text className="text-amber-400 text-xs flex-1">
            Save and validate this message as a draft before you can test it
          </Text>
        </View>
      )}

      {msg.isSaved && !msg.isValidated && (
        <View className="flex-row items-start gap-1.5 p-2 bg-amber-400/15 border border-amber-400/25 rounded-[10px]">
          <AlertCircle color="#fbbf24" size={16} />
          <Text className="text-amber-400 text-xs flex-1">
            Validate this message before you can test it
          </Text>
        </View>
      )}

      {/* Test Limit Info */}
      {msg.isSaved && msg.isValidated && (
        <View className="p-2 bg-sky-300/15 border border-sky-300/25 rounded-[10px]">
          <Text className="text-sky-300 text-xs">
            {testsUsedToday >= DAILY_TEST_LIMIT ? (
              <>You've used all {DAILY_TEST_LIMIT} free tests today. Additional tests cost 1 credit each.</>
            ) : (
              <>Free tests remaining today: <Text className="font-semibold">{DAILY_TEST_LIMIT - testsUsedToday}/{DAILY_TEST_LIMIT}</Text></>
            )}
          </Text>
        </View>
      )}

    </View>
  );
}
