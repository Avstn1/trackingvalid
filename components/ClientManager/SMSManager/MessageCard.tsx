import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import {
  Check,
  CheckCircle,
  Clock,
  Edit,
  FileText,
  Pencil,
  Send,
  Shield,
  Trash2,
  X,
  XCircle,
  Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { MessageContent } from './MessageContent';
import { MessageSchedule } from './MessageSchedule';
import { DAYS_OF_WEEK, SMSMessage } from './types';

interface MessageCardProps {
  message: SMSMessage;
  index: number;
  isSaving: boolean;
  savingMode: 'draft' | 'activate' | null;
  validatingId: string | null;
  editingTitleId: string | null;
  tempTitle: string;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
  onRemove: (id: string) => void;
  onEnableEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onSave: (msgId: string, mode: 'draft' | 'activate') => void;
  onValidate: (msgId: string) => void;
  onStartEditingTitle: (id: string, currentTitle: string) => void;
  onSaveTitle: (id: string) => void;
  onCancelEditTitle: () => void;
  onTempTitleChange: (title: string) => void;
}

export function MessageCard({
  message: msg,
  index,
  isSaving,
  savingMode,
  validatingId,
  editingTitleId,
  tempTitle,
  onUpdate,
  onRemove,
  onEnableEdit,
  onCancelEdit,
  onSave,
  onValidate,
  onStartEditingTitle,
  onSaveTitle,
  onCancelEditTitle,
  onTempTitleChange,
}: MessageCardProps) {
  const [isTesting, setIsTesting] = useState(false);

  const getSchedulePreview = (msg: SMSMessage) => {
    const minute = msg.minute ?? 0;
    const displayHour = msg.hour === 0 ? 12 : msg.hour > 12 ? msg.hour - 12 : msg.hour;
    const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${msg.period || 'AM'}`;

    if (msg.frequency === 'monthly') {
      return `Day ${msg.dayOfMonth} at ${timeStr}`;
    } else if (msg.frequency === 'biweekly') {
      const day = DAYS_OF_WEEK.find((d) => d.value === msg.dayOfWeek)?.label;
      return `Every other ${day} at ${timeStr}`;
    } else {
      const day = DAYS_OF_WEEK.find((d) => d.value === msg.dayOfWeek)?.label;
      return `${day} at ${timeStr}`;
    }
  };

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
        `${process.env.EXPO_PUBLIC_API_URL}api/client-messaging/qstash-sms-send?user_id=test`,
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

  return (
    <View className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-3">
      <View className="p-3">
        {/* Compact Header */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="w-7 h-7 bg-sky-300/20 rounded-full items-center justify-center">
              <Text className="text-sky-300 font-bold text-base">{index + 1}</Text>
            </View>
            <View className="flex-1">
              {editingTitleId === msg.id ? (
                <View className="flex-row items-center gap-1.5">
                  <TextInput
                    value={tempTitle}
                    onChangeText={onTempTitleChange}
                    onSubmitEditing={() => onSaveTitle(msg.id)}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-base"
                    maxLength={30}
                    autoFocus
                    editable={msg.isEditing}
                  />
                  <TouchableOpacity
                    onPress={() => onSaveTitle(msg.id)}
                    disabled={!msg.isEditing}
                    className="p-2"
                  >
                    <Check color="#bef264" size={16} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onCancelEditTitle} className="p-2">
                    <X color="#fca5a5" size={16} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-white font-semibold text-base">{msg.title}</Text>
                  {msg.isEditing && (
                    <TouchableOpacity onPress={() => onStartEditingTitle(msg.id, msg.title)} className="p-1.5">
                      <Pencil color="#bdbdbd" size={14} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>

          <TouchableOpacity
            onPress={() => onRemove(msg.id)}
            className="p-1.5 rounded-full bg-rose-500/10"
          >
            <Trash2 color={COLORS.negative} size={14} />
          </TouchableOpacity>
        </View>

        {/* Compact Badges Row */}
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {!msg.isEditing && msg.isSaved && (
            <TouchableOpacity
              onPress={() => onEnableEdit(msg.id)}
              className="px-2 py-1 rounded-full bg-white/5 border border-white/10 flex-row items-center gap-1"
            >
              <Edit color="#bdbdbd" size={12} />
              <Text className="text-[11px] font-semibold text-[#bdbdbd]">Edit</Text>
            </TouchableOpacity>
          )}

          {msg.isValidated && msg.validationStatus === 'ACCEPTED' && (
            <View className="px-2 py-1 rounded-full bg-lime-300/20 border border-lime-300/30 flex-row items-center gap-1">
              <CheckCircle color="#bef264" size={12} />
              <Text className="text-[11px] font-semibold text-lime-300">Approved</Text>
            </View>
          )}
          
          {msg.isValidated && msg.validationStatus === 'DENIED' && (
            <View className="px-2 py-1 rounded-full bg-rose-300/20 border border-rose-300/30 flex-row items-center gap-1">
              <XCircle color="#fca5a5" size={12} />
              <Text className="text-[11px] font-semibold text-rose-300">Denied</Text>
            </View>
          )}

          {msg.isSaved ? (
            msg.validationStatus === 'ACCEPTED' ? (
              <TouchableOpacity
                onPress={() => onUpdate(msg.id, { enabled: !msg.enabled })}
                disabled={!msg.isEditing}
                className={`px-2 py-1 rounded-full ${
                  msg.enabled
                    ? 'bg-lime-300/20 border border-lime-300/30'
                    : 'bg-white/5 border border-white/10'
                } ${!msg.isEditing ? 'opacity-50' : ''}`}
              >
                <Text
                  className={`text-[11px] font-semibold ${
                    msg.enabled ? 'text-lime-300' : 'text-[#bdbdbd]'
                  }`}
                >
                  {msg.enabled ? 'Active' : 'Paused'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <View className="px-2 py-1 rounded-full bg-amber-300/20 border border-amber-300/30">
                  <Text className="text-[11px] font-semibold text-amber-300">Draft</Text>
                </View>
                <View className="px-2 py-1 rounded-full bg-lime-300/20 border border-lime-300/30 flex-row items-center gap-1">
                  <CheckCircle color="#bef264" size={12} />
                  <Text className="text-[11px] font-semibold text-lime-300">Saved</Text>
                </View>
              </>
            )
          ) : (
            <>
              <View className="px-2 py-1 rounded-full bg-amber-300/20 border border-amber-300/30">
                <Text className="text-[11px] font-semibold text-amber-300">Draft</Text>
              </View>
              <View className="px-2 py-1 rounded-full bg-rose-300/20 border border-rose-300/30 flex-row items-center gap-1">
                <XCircle color="#fca5a5" size={12} />
                <Text className="text-[11px] font-semibold text-rose-300">Not Saved</Text>
              </View>
            </>
          )}

          {/* Schedule preview inline */}
          <View className="px-2 py-1 rounded-full bg-sky-300/10 border border-sky-300/20 flex-row items-center gap-1">
            <Clock color="#7dd3fc" size={12} />
            <Text className="text-[11px] text-sky-300">{getSchedulePreview(msg)}</Text>
          </View>
        </View>

        {/* Content */}
        <MessageContent
          message={msg}
          onUpdate={onUpdate}
        />

        {/* Schedule Settings */}
        <View className="mt-3">
          <MessageSchedule
            message={msg}
            onUpdate={onUpdate}
          />
        </View>

        {/* Action Buttons */}
        {msg.isEditing && (
          <View className="gap-2 mt-3">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onValidate(msg.id)}
                disabled={msg.message.length < 100 || validatingId === msg.id}
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 bg-white/5 border border-white/10 rounded-xl ${
                  msg.message.length < 100 || validatingId === msg.id ? 'opacity-50' : ''
                }`}
              >
                {validatingId === msg.id ? (
                  <ActivityIndicator size="small" color="#7dd3fc" />
                ) : (
                  <Shield color="#ffffff" size={18} />
                )}
                <Text className="text-white font-semibold text-sm">Validate</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleTestMessage}
                disabled={msg.message.length < 100 || isTesting}
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 bg-sky-300/20 border border-sky-300/30 rounded-xl ${
                  msg.message.length < 100 || isTesting ? 'opacity-50' : ''
                }`}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color="#7dd3fc" />
                ) : (
                  <Send color="#7dd3fc" size={18} />
                )}
                <Text className="text-sky-300 font-semibold text-sm">Test</Text>
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onSave(msg.id, 'draft')}
                disabled={isSaving || msg.message.length < 100}
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl ${
                  isSaving || msg.message.length < 100
                    ? 'bg-gray-600/50'
                    : 'bg-amber-300/20 border border-amber-300/30'
                }`}
              >
                {isSaving && savingMode === 'draft' ? (
                  <ActivityIndicator size="small" color="#fcd34d" />
                ) : (
                  <FileText color="#fcd34d" size={18} />
                )}
                <Text className="text-amber-300 font-bold text-sm">Save Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => onSave(msg.id, 'activate')}
                disabled={
                  isSaving ||
                  msg.message.length < 100 ||
                  !msg.isValidated ||
                  msg.validationStatus !== 'ACCEPTED'
                }
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl ${
                  isSaving ||
                  msg.message.length < 100 ||
                  !msg.isValidated ||
                  msg.validationStatus !== 'ACCEPTED'
                    ? 'bg-gray-600/50'
                    : 'bg-sky-300'
                }`}
              >
                {isSaving && savingMode === 'activate' ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Zap color="#000000" size={18} />
                )}
                <Text className="text-black font-bold text-sm">Activate</Text>
              </TouchableOpacity>
            </View>

            {msg.isSaved && (
              <TouchableOpacity
                onPress={() => onCancelEdit(msg.id)}
                className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10"
              >
                <Text className="text-[#bdbdbd] font-semibold text-center text-sm">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
}
