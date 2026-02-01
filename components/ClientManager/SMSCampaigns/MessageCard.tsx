import { parseYMDToLocalDate } from '@/utils/date';
import { supabase } from '@/utils/supabaseClient';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  FileText,
  Lock,
  MessageSquare,
  Pencil,
  Send,
  Shield,
  Sparkles,
  Trash2,
  Users,
  X,
  Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { CollapsibleSection } from './CollapsibleSection';
import { MessageContent } from './MessageContent';
import { MessageSchedule } from './MessageSchedule';
import { CampaignProgress, SMSMessage } from './types';

interface MessageCardProps {
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
  onStartEditingTitle: (id: string, currentTitle: string) => void;
  onSaveTitle: (id: string) => void;
  onCancelEditTitle: () => void;
  onTempTitleChange: (title: string) => void;
}

export function MessageCard({
  maxClients,
  profile,
  setAlgorithmType,
  availableCredits,
  message: msg,
  index,
  isSaving,
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
  const [isGenerating, setIsGenerating] = useState(false);

  const [openSection, setOpenSection] = useState<'content' | 'schedule' | null>('content');

  const toggleSection = (section: 'content' | 'schedule') => {
    setOpenSection(openSection === section ? null : section);
  };

  const getSchedulePreview = () => {
    const minute = msg.minute ?? 0;
    const displayHour = msg.hour === 0 ? 12 : msg.hour > 12 ? msg.hour - 12 : msg.hour;
    const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${msg.period || 'AM'}`;
    
    if (msg.scheduleDate) {
      const date = parseYMDToLocalDate(msg.scheduleDate);
      const dateStr = date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric' 
      });
      return `Scheduled for ${dateStr} at ${timeStr}`;
    }
    
    return `Send at ${timeStr}`;
  };

  const validateScheduledTime = (): boolean => {
    if (!msg.scheduleDate) return false;

    let hour24 = msg.hour;
    if (msg.period === 'PM' && msg.hour !== 12) {
      hour24 = msg.hour + 12;
    } else if (msg.period === 'AM' && msg.hour === 12) {
      hour24 = 0;
    }

    const scheduledDateTime = new Date(
      `${msg.scheduleDate}T${hour24.toString().padStart(2, '0')}:${msg.minute
        .toString()
        .padStart(2, '0')}:00-05:00`
    );
    const nowInToronto = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Toronto' }));

    const nowWithBuffer = new Date(nowInToronto);
    nowWithBuffer.setMinutes(nowWithBuffer.getMinutes() + 5);
    const minutes = nowWithBuffer.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 15) * 15;
    nowWithBuffer.setMinutes(roundedMinutes);
    nowWithBuffer.setSeconds(0, 0);

    const maxAllowedTime = new Date(nowInToronto);
    maxAllowedTime.setDate(maxAllowedTime.getDate() + 7);

    if (scheduledDateTime < nowWithBuffer) {
      Toast.show({
        type: 'error',
        text1: 'Please select a time at least 5 minutes from now (rounded to 15-minute intervals)',
      });
      return false;
    }

    if (scheduledDateTime > maxAllowedTime) {
      Toast.show({
        type: 'error',
        text1: 'Please select a time within 7 days from now',
      });
      return false;
    }

    return true;
  };

  const handleActivate = () => {
    if (!validateScheduledTime()) {
      return;
    }
    onSave(msg.id, 'activate');
  };

  const handleGenerateTemplate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/generate-sms-template`,
        {
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
            },
          }),
          redirect: 'follow',
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate template');
      }

      onUpdate(msg.id, { message: data.message });
      Toast.show({
        type: 'success',
        text1: 'Template generated successfully!',
      });
    } catch (error: any) {
      console.error('Template generation error:', error);
      Toast.show({
        type: 'error',
        text1: error.message || 'Failed to generate template',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRequestTest = () => {
    if (!msg.isSaved) {
      Toast.show({
        type: 'error',
        text1: 'Please save the message as a draft before testing',
      });
      return;
    }

    if (!msg.isValidated) {
      Toast.show({
        type: 'error',
        text1: 'Message must be validated before testing',
      });
      return;
    }

    if (msg.validationStatus !== 'DRAFT') {
      Toast.show({
        type: 'error',
        text1: 'Only draft messages can be tested',
      });
      return;
    }

    if (!msg.message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Please enter a message first',
      });
      return;
    }

    if (msg.message.length < 100) {
      Toast.show({
        type: 'error',
        text1: 'Message must be at least 100 characters',
      });
      return;
    }

    onRequestTest(msg.id);
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
            scheduledFor: msg.scheduleDate
              ? parseYMDToLocalDate(msg.scheduleDate).toISOString()
              : new Date().toISOString(),
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
          <Text className="text-red-300 text-xs font-semibold flex-1">
            Campaign in progress - Locked until messaging completes
          </Text>
        </View>
      )}

      {isPartialLock && !isFullLock && (
        <View className="flex-row items-center gap-1.5 px-3 py-2 bg-lime-300/15 border-b border-lime-300/25">
          <CheckCircle color="#bef264" size={16} />
          <Text className="text-lime-300 text-xs font-semibold flex-1">
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
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-base"
                  />
                  <TouchableOpacity
                    onPress={() => onSaveTitle(msg.id)}
                    disabled={!msg.isEditing}
                    className="p-2"
                  >
                    <Check size={16} color="#bef264" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={onCancelEditTitle}
                    className="p-2"
                  >
                    <X size={16} color="#fca5a5" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View className="flex-row items-center gap-1.5">
                  <Text className="text-white text-base font-semibold flex-1" numberOfLines={1}>
                    {msg.title}
                  </Text>
                  {msg.isEditing && !isFullLock && (
                    <TouchableOpacity
                      onPress={() => onStartEditingTitle(msg.id, msg.title)}
                      className="p-1.5"
                    >
                      <Pencil size={14} color="#bdbdbd" />
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <View className="flex-row items-center gap-1">
                <Calendar color="#bdbdbd" size={12} />
                <Text className="text-[#bdbdbd] text-[11px]" numberOfLines={1}>
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
                    <Text className="text-xs text-[#bdbdbd] font-semibold">Preview</Text>
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
                <Text className="text-xs text-[#bdbdbd] font-semibold">Edit</Text>
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
                <Text className={`text-[11px] font-semibold ${
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
                <Text className={`text-[11px] font-semibold ${
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
                <Text className={`text-[11px] font-semibold ${
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
                <Text className="text-red-300 text-[11px] font-semibold">Sending</Text>
              </View>
            )}

            {isPartialLock && !isFullLock && (
              <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full bg-lime-300/15 border border-lime-300/30">
                <CheckCircle color="#bef264" size={12} />
                <Text className="text-lime-300 text-[11px] font-semibold">Complete</Text>
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
            <CollapsibleSection collapsed={openSection !== 'content'}>
              <View className="p-2.5 border-t border-white/10">
                <MessageContent
                  message={msg}
                  onUpdate={onUpdate}
                  isFullLock={isFullLock}
                />
              </View>
            </CollapsibleSection>
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
            <CollapsibleSection collapsed={openSection !== 'schedule'}>
              <View className="p-2.5 border-t border-white/10">
                <MessageSchedule
                  maxClients={maxClients}
                  setAlgorithmType={setAlgorithmType}
                  availableCredits={availableCredits}
                  message={msg}
                  previewCount={previewCount}
                  onUpdate={onUpdate}
                  isFullLock={isFullLock}
                  isPartialLock={isPartialLock}
                />
              </View>
            </CollapsibleSection>
          </View>
        </View>

        {/* Action Buttons */}
        {msg.isEditing && (
          <View className="gap-2.5 pt-1">
            <View className="flex-row gap-2">
              <TouchableOpacity
                className={`flex-1 items-center justify-center py-2.5 rounded-[12px] border bg-purple-500/20 border-purple-500/30 ${
                  (isGenerating || isFullLock) && 'opacity-50'
                }`}
                onPress={handleGenerateTemplate}
                disabled={isGenerating || isFullLock}
              >
                {isGenerating ? (
                  <ActivityIndicator size="small" color="#d8b4fe" />
                ) : (
                  <Sparkles color="#d8b4fe" size={22} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 items-center justify-center py-2.5 rounded-[12px] border bg-white/5 border-white/15 ${
                  (msg.message.length < 100 || validatingId === msg.id || isFullLock) && 'opacity-50'
                }`}
                onPress={() => onValidate(msg.id)}
                disabled={msg.message.length < 100 || validatingId === msg.id || isFullLock}
              >
                {validatingId === msg.id ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Shield color="#ffffff" size={22} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 items-center justify-center py-2.5 rounded-[12px] border bg-sky-300/20 border-sky-300/30 ${
                  (!msg.isSaved ||
                    !msg.isValidated ||
                    msg.validationStatus !== 'DRAFT' ||
                    !msg.message.trim() ||
                    msg.message.length < 100 ||
                    isFullLock) && 'opacity-50'
                }`}
                onPress={handleRequestTest}
                disabled={
                  !msg.isSaved ||
                  !msg.isValidated ||
                  msg.validationStatus !== 'DRAFT' ||
                  !msg.message.trim() ||
                  msg.message.length < 100 ||
                  isFullLock
                }
              >
                <Send color="#7dd3fc" size={22} />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={() => onSave(msg.id, 'draft')}
                disabled={isSaving || msg.message.length < 100 || isFullLock}
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl ${
                  isSaving || msg.message.length < 100 || isFullLock
                    ? 'bg-gray-600/50'
                    : 'bg-amber-300/20 border border-amber-300/30'
                }`}
              >
                {isSaving && savingMode === 'draft' ? (
                  <ActivityIndicator size="small" color="#fbbf24" />
                ) : (
                  <FileText size={18} color="#fbbf24" />
                )}
                <Text className={`text-sm font-bold ${
                  isSaving || msg.message.length < 100 || isFullLock ? 'text-gray-400' : 'text-amber-300'
                }`}>
                  Save Draft
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleActivate}
                disabled={isSaving || msg.message.length < 100 || !msg.isValidated || isFullLock}
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl ${
                  isSaving || msg.message.length < 100 || !msg.isValidated || isFullLock
                    ? 'bg-gray-600/50'
                    : 'bg-lime-300/20 border border-lime-300/30'
                }`}
              >
                {isSaving && savingMode === 'activate' ? (
                  <ActivityIndicator size="small" color="#bef264" />
                ) : (
                  <Zap size={18} color="#bef264" />
                )}
                <Text className={`text-sm font-bold ${
                  isSaving || msg.message.length < 100 || !msg.isValidated || isFullLock
                    ? 'text-gray-400'
                    : 'text-lime-300'
                }`}>
                  Activate
                </Text>
              </TouchableOpacity>
            </View>

            {msg.isSaved && (
              <TouchableOpacity
                onPress={() => onCancelEdit(msg.id)}
                disabled={isSaving || isFullLock}
                className={`px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 ${
                  (isSaving || isFullLock) && 'opacity-50'
                }`}
              >
                <Text className="text-sm font-bold text-[#bdbdbd] text-center">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
          <Text className="text-sky-300 text-xs">
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
