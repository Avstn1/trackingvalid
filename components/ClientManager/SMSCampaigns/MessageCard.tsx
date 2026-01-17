import { supabase } from '@/utils/supabaseClient';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  Lock,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  Users,
  X
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { MessageContent } from './MessageContent';
import { MessageSchedule } from './MessageSchedule';
import { CampaignProgress, SMSMessage } from './types';

interface MessageCardProps {
  setLimitMode: any;
  maxClients: number;
  profile: any;
  setAlgorithmType: (type: 'campaign' | 'mass') => void;
  availableCredits?: number;
  message: SMSMessage;
  index: number;
  isSaving: boolean;
  savingMode: 'draft' | 'activate' | null;
  validatingId: string | null;
  editingTitleId: string | null;
  tempTitle: string;
  previewCount?: number;
  loadingPreview: boolean;
  testMessagesUsed: number;
  campaignProgress?: CampaignProgress;
  session: any;
  onLoadPreview: (limit: number) => void;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
  onRemove: (id: string) => void;
  onEnableEdit: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onSave: (msgId: string, mode: 'draft' | 'activate') => void;
  onValidate: (msgId: string) => void;
  onRequestTest: (msgId: string) => void;
  onTestComplete: () => void;
  onStartEditingTitle: (id: string, currentTitle: string) => void;
  onSaveTitle: (id: string) => void;
  onCancelEditTitle: () => void;
  onTempTitleChange: (title: string) => void;
}

export function MessageCard({
  setLimitMode,
  maxClients,
  profile,
  setAlgorithmType,
  availableCredits,
  message: msg,
  index,
  isSaving,
  testMessagesUsed,
  savingMode,
  validatingId,
  editingTitleId,
  tempTitle,
  previewCount,
  loadingPreview,
  campaignProgress,
  session,
  onRequestTest,
  onLoadPreview,
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
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  const [openSection, setOpenSection] = useState<'content' | 'schedule'>('content');

  const toggleSection = (section: 'content' | 'schedule') => {
    setOpenSection(section); // always sets exactly one open
  };

  const getSchedulePreview = () => {
    const minute = msg.minute ?? 0;
    const displayHour = msg.hour === 0 ? 12 : msg.hour > 12 ? msg.hour - 12 : msg.hour;
    const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${msg.period || 'AM'}`;
    
    if (msg.scheduleDate) {
      const date = new Date(msg.scheduleDate + 'T00:00:00');
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `Scheduled for ${dateStr} at ${timeStr}`;
    }
    
    return `Send at ${timeStr}`;
  };

  const handleDeactivate = async () => {
    setShowDeactivateModal(false);
    
    try {
      await onEnableEdit(msg.id);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token || '',
        },
        body: JSON.stringify({
          messages: [{
            id: msg.id,
            title: msg.title,
            message: msg.message,
            scheduleDate: msg.scheduleDate,
            clientLimit: msg.clientLimit,
            hour: msg.hour,
            minute: msg.minute,
            period: msg.period,
            scheduledFor: new Date(msg.scheduleDate + 'T00:00:00').toISOString(),
            validationStatus: 'DRAFT',
            isValidated: msg.isValidated,
            purpose: msg.purpose || 'campaign',
          }]
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft status');
      }
      
      Toast.show({
        type: 'success',
        text1: 'Campaign deactivated and set to draft',
      });
    } catch (error) {
      console.error('Failed to deactivate:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to deactivate campaign',
      });
    }
  };

  const isFullLock = campaignProgress?.is_active || false;
  const isPartialLock = (campaignProgress?.is_finished && !campaignProgress?.is_active) || false;
  const isAnyLock = isFullLock || isPartialLock;

  const canEdit = !isFullLock && msg.isSaved && !msg.isEditing;
  const canDelete = true;

  const borderColorClass = isFullLock 
    ? 'border-red-300/30' 
    : isPartialLock 
      ? 'border-amber-400/30' 
      : 'border-white/10';

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100)}
      exiting={FadeOutUp}
      className={`bg-[#252525]/60 rounded-xl border overflow-hidden ${borderColorClass}`}
    >
      {/* Lock Banners */}
      {isFullLock && (
        <View className="flex-row items-center gap-1.5 px-3 py-2 bg-red-300/15 border-b border-red-300/25">
          <Lock color="#fca5a5" size={16} />
          <Text className="text-red-300 text-[11px] font-semibold flex-1">
            Campaign in progress - Locked until messaging completes
          </Text>
        </View>
      )}

      {isPartialLock && !isFullLock && (
        <View className="flex-row items-center gap-1.5 px-3 py-2 bg-lime-300/15 border-b border-lime-300/25">
          <CheckCircle color="#bef264" size={16} />
          <Text className="text-lime-300 text-[11px] font-semibold flex-1">
            Campaign Completed - You can delete or create a new campaign
          </Text>
        </View>
      )}

      <View className="p-3 gap-3">
        {/* Header */}
        <View className="gap-2">
          <View className="flex-row items-center gap-2.5">
            <View className={`w-9 h-9 rounded-full items-center justify-center ${
              msg.validationStatus === 'ACCEPTED' && msg.enabled
                ? 'bg-lime-300/20'
                : isFullLock
                  ? 'bg-red-300/20'
                  : isPartialLock
                    ? 'bg-lime-300/20'
                    : 'bg-sky-300/20'
            }`}>
              {msg.validationStatus === 'ACCEPTED' && msg.enabled ? (
                <CheckCircle color="#bef264" size={20} />
              ) : isPartialLock ? (
                <CheckCircle color="#bef264" size={20} />
              ) : isFullLock ? (
                <Lock color="#fca5a5" size={20} />
              ) : (
                <Text className="text-sky-300 text-sm font-bold">{index + 1}</Text>
              )}
            </View>
            <View className="flex-1 gap-0.5">
              {/* Editable Title */}
              {editingTitleId === msg.id ? (
                <View className="flex-row items-center gap-2">
                  <TextInput
                    value={tempTitle}
                    onChangeText={onTempTitleChange}
                    editable={msg.isEditing}
                    maxLength={30}
                    autoFocus
                    className="flex-1 bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-sm"
                  />
                  <TouchableOpacity
                    onPress={() => onSaveTitle(msg.id)}
                    disabled={!msg.isEditing}
                    className="p-1"
                  >
                    <Check size={14} color="#bef264" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onCancelEditTitle}
                    className="p-1"
                  >
                    <X size={14} color="#fca5a5" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-white text-sm font-semibold flex-1" numberOfLines={1}>
                    {msg.title}
                  </Text>
                  {msg.isEditing && !isFullLock && (
                    <TouchableOpacity
                      onPress={() => onStartEditingTitle(msg.id, msg.title)}
                      className="p-0.5"
                    >
                      <Pencil size={12} color="#bdbdbd" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View className="flex-row items-center gap-1">
                <Calendar color="#bdbdbd" size={12} />
                <Text className="text-[#bdbdbd] text-[10px]" numberOfLines={1}>
                  {getSchedulePreview()}
                  {msg.validationStatus !== 'ACCEPTED' || !msg.enabled ? ' | Inactive' : ''}
                </Text>
              </View>
            </View>
          </View>
          
          {/* Status Cards */}
          <View className="flex-row flex-wrap gap-1.5 items-center">
            {/* Preview Button */}
            {!isAnyLock && (
              <TouchableOpacity
                onPress={() => onLoadPreview(Math.min(previewCount || msg.clientLimit, availableCredits || msg.clientLimit))}
                disabled={loadingPreview}
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15"
              >
                {loadingPreview ? (
                  <ActivityIndicator size="small" color="#bdbdbd" />
                ) : (
                  <>
                    <Users color="#bdbdbd" size={12} />
                    <Text className="text-[11px] text-[#bdbdbd] font-semibold">Preview</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Edit Button */}
            {canEdit && msg.validationStatus !== 'ACCEPTED' && (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15"
                onPress={() => onEnableEdit(msg.id)}
              >
                <Edit color="#bdbdbd" size={12} />
                <Text className="text-[11px] text-[#bdbdbd] font-semibold">Edit</Text>
              </TouchableOpacity>
            )}

            {/* Active/Inactive Toggle */}
            {msg.isSaved && !isAnyLock && (
              <TouchableOpacity
                className={`px-2 py-0.5 rounded-full ${
                  msg.validationStatus === 'ACCEPTED' && msg.enabled
                    ? 'bg-lime-300/20 border border-lime-300/30'
                    : 'bg-gray-500/10 border border-gray-500/20'
                }`}
                onPress={() => {
                  if (msg.validationStatus === 'ACCEPTED' && msg.enabled) {
                    setShowDeactivateModal(true);
                  } else {
                    Toast.show({
                      type: 'error',
                      text1: 'Please use the Activate button to schedule this message'
                    });
                  }
                }}
              >
                <Text className={`text-[10px] font-semibold ${
                  msg.validationStatus === 'ACCEPTED' && msg.enabled
                    ? 'text-lime-300'
                    : 'text-gray-400'
                }`}>
                  {msg.validationStatus === 'ACCEPTED' && msg.enabled ? 'Active' : 'Inactive'}
                </Text>
              </TouchableOpacity>
            )}

            <View className="flex-row gap-1.5">
              {/* Saved/Draft Badge */}
              <View className={`px-2 py-0.5 rounded-full border ${
                msg.isSaved 
                  ? 'bg-lime-300/15 border-lime-300/30' 
                  : 'bg-amber-400/15 border-amber-400/30'
              }`}>
                <Text className={`text-[10px] font-semibold ${
                  msg.isSaved ? 'text-lime-300' : 'text-amber-400'
                }`}>
                  {msg.isSaved ? 'Saved' : 'Draft'}
                </Text>
              </View>

              {/* Verified Badge */}
              <View className={`px-2 py-0.5 rounded-full border ${
                msg.isValidated 
                  ? 'bg-sky-300/15 border-sky-300/30' 
                  : 'bg-gray-500/10 border-gray-500/20'
              }`}>
                <Text className={`text-[10px] font-semibold ${
                  msg.isValidated ? 'text-sky-300' : 'text-gray-400'
                }`}>
                  {msg.isValidated ? 'Verified' : 'Unverified'}
                </Text>
              </View>
            </View>

            {/* Lock Indicators */}
            {isFullLock && (
              <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-300/15 border border-red-300/30">
                <Lock color="#fca5a5" size={12} />
                <Text className="text-red-300 text-[10px] font-semibold">Sending</Text>
              </View>
            )}

            {isPartialLock && !isFullLock && (
              <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full bg-lime-300/15 border border-lime-300/30">
                <CheckCircle color="#bef264" size={12} />
                <Text className="text-lime-300 text-[10px] font-semibold">Complete</Text>
              </View>
            )}

            {/* Delete Button */}
            {canDelete && (
              <TouchableOpacity
                onPress={() => onRemove(msg.id)}
                className="p-1.5 rounded-full bg-rose-500/10"
              >
                <Trash2 size={14} color="#fca5a5" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Collapsible Sections */}
        <View className="gap-2.5">
          {/* Message Content Section */}
          <View className="bg-white/5 border border-white/15 rounded-[10px] overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center justify-between p-2.5"
              onPress={() => toggleSection('content')}
            >
              <View className="flex-row items-center gap-1.5">
                <MessageSquare color="#7dd3fc" size={16} />
                <Text className="text-white text-[13px] font-semibold">Message Content</Text>
              </View>
              {openSection === 'content' ? <ChevronUp color="#bdbdbd" size={16} /> : <ChevronDown color="#bdbdbd" size={16} />}
            </TouchableOpacity>
            <Collapsible collapsed={openSection !== 'content'} enablePointerEvents>
              <View className="p-2.5 border-t border-white/10">
                <MessageContent
                  profile={profile}
                  message={msg}
                  validatingId={validatingId}
                  testMessagesUsed={testMessagesUsed}
                  session={session}
                  onUpdate={onUpdate}
                  onValidate={onValidate}
                  onRequestTest={onRequestTest}
                  isFullLock={isFullLock}
                  isPartialLock={isPartialLock}
                />
              </View>
            </Collapsible>
          </View>

          {/* Schedule Section */}
          <View className="bg-white/5 border border-white/15 rounded-[10px] overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center justify-between p-2.5"
              onPress={() => toggleSection('schedule')}
            >
              <View className="flex-row items-center gap-1.5">
                <Calendar color="#bef264" size={16} />
                <Text className="text-white text-[13px] font-semibold">
                  Schedule & Recipients
                </Text>
              </View>
              {openSection === 'schedule' ? <ChevronUp color="#bdbdbd" size={16} /> : <ChevronDown color="#bdbdbd" size={16} />}
            </TouchableOpacity>
            <Collapsible collapsed={openSection !== 'schedule'} enablePointerEvents>
              <View className="p-2.5 border-t border-white/10">
                <MessageSchedule
                  maxClients={maxClients}
                  setAlgorithmType={setAlgorithmType}
                  availableCredits={availableCredits}
                  message={msg}
                  isSaving={isSaving}
                  savingMode={savingMode}
                  previewCount={previewCount}
                  session={session}
                  onUpdate={onUpdate}
                  onSave={onSave}
                  onCancelEdit={onCancelEdit}
                  isFullLock={isFullLock}
                  isPartialLock={isPartialLock}
                />
              </View>
            </Collapsible>
          </View>
        </View>
      </View>

      {/* Deactivate Confirmation Modal */}
      <Modal
        visible={showDeactivateModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeactivateModal(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/60 items-center justify-center p-4"
          activeOpacity={1}
          onPress={() => setShowDeactivateModal(false)}
        >
          <View className="bg-[#1a1a1a] border border-white/10 rounded-2xl max-w-md w-full p-6">
            <View className="flex-row items-start gap-4 mb-4">
              <View className="w-12 h-12 rounded-full bg-amber-300/20 flex items-center justify-center">
                <AlertCircle size={24} color="#fbbf24" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-bold text-white mb-2">
                  Deactivate Campaign?
                </Text>
                <Text className="text-sm text-[#bdbdbd]">
                  This will set your campaign to draft and refund{' '}
                  <Text className="text-lime-300 font-semibold">{previewCount || 0} credits</Text>{' '}
                  back to your available balance.
                </Text>
              </View>
            </View>

            <View className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg mb-6">
              <View className="flex-row items-start gap-2">
                <AlertCircle size={16} color="#fbbf24" className="mt-0.5" />
                <View className="flex-1">
                  <Text className="font-semibold text-amber-300 mb-1 text-sm">
                    You'll need to reactivate
                  </Text>
                  <Text className="text-sm text-amber-200/80">
                    Once deactivated, you'll need to verify and activate this message again before it can be sent.
                  </Text>
                </View>
              </View>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowDeactivateModal(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10"
              >
                <Text className="text-sm font-bold text-[#bdbdbd] text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeactivate}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-300/20 border border-amber-300/30"
              >
                <Text className="text-sm font-bold text-amber-300 text-center">
                  Deactivate & Refund
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Next Send Banner */}
      {msg.validationStatus === 'ACCEPTED' && msg.enabled && !isAnyLock && (
        <View className="flex-row items-center gap-1.5 px-3 py-2 bg-sky-300/15 border-t border-sky-300/25">
          <Send color="#7dd3fc" size={12} />
          <Text className="text-sky-300 text-[11px]">
            <Text className="font-medium">Next send: </Text>
            <Text className="text-sky-200">
              {getSchedulePreview()}
            </Text>
          </Text>
        </View>
      )}
    </Animated.View>
  );
}