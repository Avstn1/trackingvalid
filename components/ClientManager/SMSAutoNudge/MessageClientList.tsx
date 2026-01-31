import { Clock, FileText, Users, X, Zap } from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming
} from 'react-native-reanimated';
import { PhoneNumber, SMSMessage } from './types';

interface MessageClientListProps {
  message: SMSMessage;
  phoneNumbers: PhoneNumber[];
  isSaving: boolean;
  savingMode: 'draft' | 'activate' | null;
  onSave: (msgId: string, mode: 'draft' | 'activate') => void;
  onCancelEdit: (id: string) => void;
  isFullLock?: boolean;
  isPartialLock?: boolean;
}

export function MessageClientList({
  message: msg,
  phoneNumbers,
  isSaving,
  savingMode,
  onSave,
  onCancelEdit,
  isFullLock = false,
  isPartialLock = false
}: MessageClientListProps) {
  
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    if (isSaving) {
      rotation.value = withRepeat(
        withTiming(360, { duration: 1000 }),
        -1,
        false
      );
    } else {
      rotation.value = 0;
    }
  }, [isSaving]);

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

  const spinningStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View className="gap-2.5">
      {/* Header */}
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-1.5">
          <Users color="#bdbdbd" size={14} />
          <Text className="text-[#bdbdbd] text-xs font-medium">
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
          className="bg-white/5 border border-white/15 rounded-[10px] px-2.5 py-2.5 text-white/70 text-[11px] font-mono min-h-[160px]"
          style={{ textAlignVertical: 'top' }}
        />
        
        {/* Count Badge */}
        <View className="absolute top-2.5 right-2.5 px-1.5 py-0.5 bg-sky-300/20 border border-sky-300/30 rounded-full">
          <Text className="text-sky-300 text-[11px] font-semibold">{phoneNumbers.length}</Text>
        </View>
      </View>
      
      {/* Action Buttons */}
      {msg.isEditing && !isFullLock ? (
        <View className="gap-1.5">
          {/* Two Choice Buttons */}
          <View className="flex-row gap-1.5">
            {/* Save as Draft */}
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px] border bg-amber-400/20 border-amber-400/30 ${
                (isSaving || msg.message.length < 100) && 'opacity-50'
              }`}
              onPress={() => onSave(msg.id, 'draft')}
              disabled={isSaving || msg.message.length < 100}
            >
              {isSaving && savingMode === 'draft' ? (
                <>
                  <Animated.View style={spinningStyle}>
                    <Clock color="#fbbf24" size={20} />
                  </Animated.View>
                  <Text className="text-amber-400 text-[13px] font-bold">Saving...</Text>
                </>
              ) : (
                <>
                  <FileText color="#fbbf24" size={20} />
                  <Text className="text-amber-400 text-[13px] font-bold">Draft</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Activate Schedule */}
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px] border ${
                (isSaving ||
                  msg.message.length < 100 ||
                  !msg.isValidated ||
                  isPartialLock)
                  ? 'bg-gray-500/50 border-gray-500/50 opacity-50'
                  : 'bg-sky-300 border-sky-300'
              }`}
              onPress={() => {
                if (!isPartialLock) {
                  onSave(msg.id, 'activate');
                }
              }}
              disabled={
                isSaving ||
                msg.message.length < 100 ||
                !msg.isValidated ||
                isPartialLock
              }
            >
              {isSaving && savingMode === 'activate' ? (
                <>
                  <Animated.View style={spinningStyle}>
                    <Clock color="#000000" size={20} />
                  </Animated.View>
                  <Text className="text-black text-[13px] font-bold">Activating...</Text>
                </>
              ) : (
                <>
                  <Zap color="#000000" size={20} />
                  <Text className="text-black text-[13px] font-bold">Activate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Cancel Button */}
          {msg.isSaved && (
            <TouchableOpacity
              className={`flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-white/5 border border-white/15 ${
                isSaving && 'opacity-50'
              }`}
              onPress={() => onCancelEdit(msg.id)}
              disabled={isSaving}
            >
              <X color="#bdbdbd" size={16} />
              <Text className="text-[#bdbdbd] text-[13px] font-bold">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        // When NOT editing - show info text
        <View className="flex-row items-start gap-1.5 p-2 bg-sky-300/15 border border-sky-300/25 rounded-[10px]">
          <Users color="#7dd3fc" size={16} />
          <Text className="text-sky-300 text-[10px] flex-1">
            These clients are automatically selected based on their visit patterns and will receive your message when activated.
          </Text>
        </View>
      )}
    </View>
  );
}