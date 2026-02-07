import { COLORS } from '@/constants/design-system';
import { AlertCircle } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { SMSMessage } from './types';

interface MessageContentProps {
  message: SMSMessage;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
}

export function MessageContent({
  message: msg,
  onUpdate,
}: MessageContentProps) {
  const charCount = msg.message.length;
  const charColor = charCount < 100 ? COLORS.warning : charCount > 240 ? COLORS.negative : COLORS.positive;

  return (
    <View className="gap-3">
      {/* Validation Reason Alert */}
      {msg.isValidated && msg.validationStatus === 'DENIED' && msg.validationReason && (
        <View className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg flex-row items-start gap-2">
          <AlertCircle color="#fca5a5" size={14} className="mt-0.5 flex-shrink-0" />
          <Text className="text-sm text-rose-300 flex-1">{msg.validationReason}</Text>
        </View>
      )}

      {/* Message Textarea */}
      <View>
        <Text className="text-sm text-[#bdbdbd] mb-1">
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
            className={`w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 pr-16 text-white placeholder-[#bdbdbd]/50 text-[15px] ${
              !msg.isEditing ? 'opacity-50' : ''
            }`}
            placeholderTextColor="#bdbdbd80"
            textAlignVertical="top"
          />
          <View className="absolute top-2 right-2">
            <Text className="text-sm font-medium" style={{ color: charColor }}>
              {charCount}/240
            </Text>
          </View>
        </View>
      </View>

    </View>
  );
}
