import {
  Check,
  CheckCircle,
  Clock,
  Edit,
  Pencil,
  Trash2,
  X,
  XCircle
} from 'lucide-react-native';
import React from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
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

  return (
    <View className="bg-white/5 border border-white/10 rounded-xl overflow-hidden mb-3">
      <View className="p-3">
        {/* Compact Header */}
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center gap-2 flex-1">
            <View className="w-7 h-7 bg-sky-300/20 rounded-full items-center justify-center">
              <Text className="text-sky-300 font-bold text-sm">{index + 1}</Text>
            </View>
            <View className="flex-1">
              {editingTitleId === msg.id ? (
                <View className="flex-row items-center gap-1.5">
                  <TextInput
                    value={tempTitle}
                    onChangeText={onTempTitleChange}
                    onSubmitEditing={() => onSaveTitle(msg.id)}
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-xs"
                    maxLength={30}
                    autoFocus
                    editable={msg.isEditing}
                  />
                  <TouchableOpacity
                    onPress={() => onSaveTitle(msg.id)}
                    disabled={!msg.isEditing}
                    className="p-1"
                  >
                    <Check color="#bef264" size={14} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={onCancelEditTitle} className="p-1">
                    <X color="#fca5a5" size={14} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-white font-semibold text-sm">{msg.title}</Text>
                  {msg.isEditing && (
                    <TouchableOpacity onPress={() => onStartEditingTitle(msg.id, msg.title)}>
                      <Pencil color="#bdbdbd" size={10} />
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
            <Trash2 color="#f87171" size={14} />
          </TouchableOpacity>
        </View>

        {/* Compact Badges Row */}
        <View className="flex-row flex-wrap gap-1.5 mb-3">
          {!msg.isEditing && msg.isSaved && (
            <TouchableOpacity
              onPress={() => onEnableEdit(msg.id)}
              className="px-2 py-1 rounded-full bg-white/5 border border-white/10 flex-row items-center gap-1"
            >
              <Edit color="#bdbdbd" size={10} />
              <Text className="text-[10px] font-semibold text-[#bdbdbd]">Edit</Text>
            </TouchableOpacity>
          )}

          {msg.isValidated && msg.validationStatus === 'ACCEPTED' && (
            <View className="px-2 py-1 rounded-full bg-lime-300/20 border border-lime-300/30 flex-row items-center gap-1">
              <CheckCircle color="#bef264" size={10} />
              <Text className="text-[10px] font-semibold text-lime-300">Approved</Text>
            </View>
          )}
          
          {msg.isValidated && msg.validationStatus === 'DENIED' && (
            <View className="px-2 py-1 rounded-full bg-rose-300/20 border border-rose-300/30 flex-row items-center gap-1">
              <XCircle color="#fca5a5" size={10} />
              <Text className="text-[10px] font-semibold text-rose-300">Denied</Text>
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
                  className={`text-[10px] font-semibold ${
                    msg.enabled ? 'text-lime-300' : 'text-[#bdbdbd]'
                  }`}
                >
                  {msg.enabled ? 'Active' : 'Paused'}
                </Text>
              </TouchableOpacity>
            ) : (
              <>
                <View className="px-2 py-1 rounded-full bg-amber-300/20 border border-amber-300/30">
                  <Text className="text-[10px] font-semibold text-amber-300">Draft</Text>
                </View>
                <View className="px-2 py-1 rounded-full bg-lime-300/20 border border-lime-300/30 flex-row items-center gap-1">
                  <CheckCircle color="#bef264" size={10} />
                  <Text className="text-[10px] font-semibold text-lime-300">Saved</Text>
                </View>
              </>
            )
          ) : (
            <>
              <View className="px-2 py-1 rounded-full bg-amber-300/20 border border-amber-300/30">
                <Text className="text-[10px] font-semibold text-amber-300">Draft</Text>
              </View>
              <View className="px-2 py-1 rounded-full bg-rose-300/20 border border-rose-300/30 flex-row items-center gap-1">
                <XCircle color="#fca5a5" size={10} />
                <Text className="text-[10px] font-semibold text-rose-300">Not Saved</Text>
              </View>
            </>
          )}

          {/* Schedule preview inline */}
          <View className="px-2 py-1 rounded-full bg-sky-300/10 border border-sky-300/20 flex-row items-center gap-1">
            <Clock color="#7dd3fc" size={10} />
            <Text className="text-[10px] text-sky-300">{getSchedulePreview(msg)}</Text>
          </View>
        </View>

        {/* Content */}
        <MessageContent
          message={msg}
          validatingId={validatingId}
          onUpdate={onUpdate}
          onValidate={onValidate}
        />

        {/* Schedule Settings */}
        <View className="mt-3">
          <MessageSchedule
            message={msg}
            isSaving={isSaving}
            savingMode={savingMode}
            onUpdate={onUpdate}
            onSave={onSave}
            onCancelEdit={onCancelEdit}
          />
        </View>
      </View>
    </View>
  );
}