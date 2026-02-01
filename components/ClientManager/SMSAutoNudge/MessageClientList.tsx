import { Users } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, View } from 'react-native';
import { PhoneNumber, SMSMessage } from './types';

interface MessageClientListProps {
  message: SMSMessage;
  phoneNumbers: PhoneNumber[];
}

export function MessageClientList({
  message: msg,
  phoneNumbers,
}: MessageClientListProps) {

  const formatClientList = () => {
    if (phoneNumbers.length === 0) {
      return 'No clients selected for this category yet...';
    }
    
    const maxNumberWidth = phoneNumbers.length.toString().length;
    return phoneNumbers
      .map((client, idx) => {
        const name = client.full_name || 'No name';
        const phone = client.phone_normalized || 'No phone';
        const number = (idx + 1).toString().padStart(maxNumberWidth, ' ');
        return `${number}. ${name}: ${phone}`;
      })
      .join('\n');
  };

  return (
    <View className="gap-2.5">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Users color="#bdbdbd" size={14} />
          <Text className="text-[#bdbdbd] text-sm font-medium">
            Recipients ({phoneNumbers.length} clients)
          </Text>
        </View>
      </View>

      {/* Client List Textarea */}
      <View className="relative">
        <TextInput
          value={formatClientList()}
          editable={false}
          multiline
          numberOfLines={12}
          className="bg-white/5 border border-white/15 rounded-[10px] px-2.5 py-2.5 text-white/70 text-[12px] font-mono min-h-[160px]"
          style={{ textAlignVertical: 'top' }}
        />
        
        {/* Count Badge */}
        <View className="absolute top-2.5 right-2.5 px-1.5 py-0.5 bg-sky-300/20 border border-sky-300/30 rounded-full">
          <Text className="text-sky-300 text-xs font-semibold">{phoneNumbers.length}</Text>
        </View>
      </View>
      
      {!msg.isEditing && (
        <View className="flex-row items-start gap-1.5 p-2 bg-sky-300/15 border border-sky-300/25 rounded-[10px]">
          <Users color="#7dd3fc" size={16} />
          <Text className="text-sky-300 text-[11px] flex-1">
            These clients are automatically selected based on their visit patterns and will receive your message when activated.
          </Text>
        </View>
      )}
    </View>
  );
}
