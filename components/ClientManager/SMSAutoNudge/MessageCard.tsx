import { supabase } from '@/utils/supabaseClient';
import {
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Edit,
  FileText,
  Lock,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
  Users,
  Zap
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Collapsible from 'react-native-collapsible';
import Toast from 'react-native-toast-message';
import { MessageClientList } from './MessageClientList';
import { MessageContent } from './MessageContent';
import { PhoneNumber, SMSMessage } from './types';

interface Recipient {
  phone_normalized: string;
  is_sent: boolean;
  reason: string | null;
  created_at: string;
  client_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface AutoNudgeCampaignProgress {
  is_finished: boolean;
  is_running: boolean;
}

interface MessageCardProps {
  profile: any;
  message: SMSMessage;
  index: number;
  isSaving: boolean;
  savingMode: 'draft' | 'activate' | null;
  validatingId: string | null;
  editingTitleId: string | null;
  tempTitle: string;
  phoneNumbers: PhoneNumber[];
  isLocked?: boolean;
  autoNudgeCampaignProgress?: AutoNudgeCampaignProgress;
  session: any;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
  onEnableEdit?: (id: string) => void;
  onCancelEdit: (id: string) => void;
  onSave: (msgId: string, mode: 'draft' | 'activate') => void;
  onValidate: (msgId: string) => void;
  onRequestTest: (msgId: string) => void;
  onRequestDeactivate: (msgId: string) => void;
  onStartEditingTitle: (id: string, currentTitle: string) => void;
  onSaveTitle: (id: string) => void;
  onCancelEditTitle: () => void;
  onTempTitleChange: (title: string) => void;
}

export function MessageCard({
  profile,
  message: msg,
  index,
  isSaving,
  savingMode,
  validatingId,
  editingTitleId,
  tempTitle,
  phoneNumbers,
  isLocked = false,
  autoNudgeCampaignProgress,
  session,
  onUpdate,
  onEnableEdit,
  onCancelEdit,
  onSave,
  onValidate,
  onRequestTest,
  onRequestDeactivate,
  onStartEditingTitle,
  onSaveTitle,
  onCancelEditTitle,
  onTempTitleChange,
}: MessageCardProps) {
  
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsStats, setRecipientsStats] = useState<{ total: number; successful: number; failed: number } | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [lastSentDate, setLastSentDate] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [showMessageContent, setShowMessageContent] = useState(false);
  const [showRecipients, setShowRecipients] = useState(false);

  useEffect(() => {
    if (msg.id) {
      fetchLastSentDate();
    }
  }, [msg.id]);

  const fetchLastSentDate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sms_sent')
        .select('created_at')
        .eq('message_id', msg.id)
        .eq('user_id', user.id)
        .eq('purpose', 'client_sms')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching last sent date:', error);
        return;
      }

      if (data) {
        setLastSentDate(data.created_at);
      }
    } catch (error) {
      console.error('Failed to fetch last sent date:', error);
    }
  };

  const fetchRecipients = async () => {
    setLoadingRecipients(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/get-auto-nudge-recipients?messageId=${msg.id}&userId=${user.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch recipients');
      }

      const data = await response.json();
      
      if (data.success) {
        setRecipients(data.recipients || []);
        setRecipientsStats(data.stats || null);
      }
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load recipients'
      });
    } finally {
      setLoadingRecipients(false);
    }
  };

  const getSchedulePreview = () => {
    const minute = msg.minute ?? 0;
    const displayHour = msg.hour === 0 ? 12 : msg.hour > 12 ? msg.hour - 12 : msg.hour;
    const timeStr = `${displayHour}:${minute.toString().padStart(2, '0')} ${msg.period || 'AM'}`;
    
    return `Monthly on day ${msg.dayOfMonth} at ${timeStr}`;
  };

  const getNextSendDate = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const currentDay = now.getDate();
    
    let targetMonth = currentMonth;
    let targetYear = currentYear;
    
    if (currentDay >= (msg.dayOfMonth || 1)) { 
      targetMonth += 1;
      if (targetMonth > 11) {
        targetMonth = 0;
        targetYear += 1;
      }
    }
    
    const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(msg.dayOfMonth || 1, daysInTargetMonth);
    
    const nextDate = new Date(targetYear, targetMonth, actualDay);
    return nextDate.toLocaleDateString('en-US', { 
      timeZone: 'America/Toronto',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getUnlockDate = () => {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toLocaleDateString('en-US', { 
      timeZone: 'America/Toronto',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatLastSentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      timeZone: 'America/Toronto',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
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

  const isFullLock = autoNudgeCampaignProgress?.is_running || false;
  const isPartialLock = (autoNudgeCampaignProgress?.is_finished && !autoNudgeCampaignProgress?.is_running) || false;
  const isAnyLock = isFullLock || isPartialLock || isLocked;

  const canEdit = !isFullLock && msg.isSaved && !msg.isEditing;
  const borderColorClass = isFullLock 
    ? 'border-red-300/30' 
    : isPartialLock 
      ? 'border-amber-400/30' 
      : 'border-white/10';

  return (
    <View className={`bg-[#252525]/60 rounded-xl border overflow-hidden ${borderColorClass}`}>
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
        <View className="flex-row items-center gap-1.5 px-3 py-2 bg-amber-400/15 border-b border-amber-400/25">
          <Lock color="#fbbf24" size={16} />
          <Text className="text-amber-400 text-xs font-semibold flex-1">
            Sent this month - Can edit, unlocks {getUnlockDate()}
          </Text>
        </View>
      )}

      {isLocked && !isFullLock && !isPartialLock && (
        <View className="flex-row items-center gap-1.5 px-3 py-2 bg-amber-400/15 border-b border-amber-400/25">
          <Lock color="#fbbf24" size={16} />
          <Text className="text-amber-400 text-xs font-semibold flex-1">
            Sent - Unlocks {getUnlockDate()}
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
                    ? 'bg-amber-400/20'
                    : 'bg-sky-300/20'
            }`}>
              {msg.validationStatus === 'ACCEPTED' && msg.enabled ? (
                <CheckCircle color="#bef264" size={20} />
              ) : isFullLock || isPartialLock ? (
                <Lock color={isFullLock ? "#fca5a5" : "#fbbf24"} size={20} />
              ) : (
                <Text className="text-sky-300 text-base font-bold">{index + 1}</Text>
              )}
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-white text-base font-semibold" numberOfLines={1}>
                {msg.title}
              </Text>
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
            {lastSentDate && (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15"
                onPress={fetchRecipients}
                disabled={loadingRecipients}
              >
                {loadingRecipients ? (
                  <ActivityIndicator size="small" color="#bdbdbd" />
                ) : (
                  <>
                    <Users color="#bdbdbd" size={12} />
                    <Text className="text-xs text-[#bdbdbd] font-semibold">Last SMS Recipients</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {canEdit && msg.validationStatus !== 'ACCEPTED' && (
              <TouchableOpacity
                className="flex-row items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5 border border-white/15"
                onPress={() => onEnableEdit?.(msg.id)}
              >
                <Edit color="#bdbdbd" size={12} />
                <Text className="text-xs text-[#bdbdbd] font-semibold">Edit</Text>
              </TouchableOpacity>
            )}

            {msg.isSaved && !isFullLock && (
              <TouchableOpacity
                className={`px-2 py-0.5 rounded-full ${
                  msg.validationStatus === 'ACCEPTED' && msg.enabled
                    ? 'bg-lime-300/20 border border-lime-300/30'
                    : 'bg-gray-500/10 border border-gray-500/20'
                }`}
                onPress={() => {
                  if (msg.validationStatus === 'ACCEPTED' && msg.enabled) {
                    onRequestDeactivate(msg.id);
                  } else if (!isPartialLock) {
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

            {isFullLock && (
              <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full bg-red-300/15 border border-red-300/30">
                <Lock color="#fca5a5" size={12} />
                <Text className="text-red-300 text-[11px] font-semibold">Sending</Text>
              </View>
            )}

            {isPartialLock && !isFullLock && (
              <View className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/30">
                <Lock color="#fbbf24" size={12} />
                <Text className="text-amber-400 text-[11px] font-semibold">Partial Lock</Text>
              </View>
            )}
          </View>
        </View>

        {/* Last Sent Info */}
        {lastSentDate && (
          <View className="p-2.5 bg-white/5 border border-white/15 rounded-[10px] gap-1.5">
            <View className="flex-row items-center gap-1.5">
              <CheckCircle color="#bef264" size={16} />
              <Text className="text-white text-sm font-semibold flex-1">
                Last sent: {formatLastSentDate(lastSentDate)}
              </Text>
            </View>
            {recipientsStats && (
              <View className="flex-row gap-2.5">
                  <Text className="text-lime-300 text-xs">
                    {recipientsStats.successful} sent
                  </Text>
                {recipientsStats.failed > 0 && (
                    <Text className="text-red-300 text-xs">
                      {recipientsStats.failed} failed
                    </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Collapsible Sections */}
        <View className="gap-2.5">
          {/* Message Content Section */}
          <View className="bg-white/5 border border-white/15 rounded-[10px] overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center justify-between p-2.5"
              onPress={() => setShowMessageContent(!showMessageContent)}
            >
              <View className="flex-row items-center gap-1.5">
                <MessageSquare color="#7dd3fc" size={16} />
                <Text className="text-white text-[13px] font-semibold">Message Content</Text>
              </View>
              {showMessageContent ? (
                <ChevronUp color="#bdbdbd" size={16} />
              ) : (
                <ChevronDown color="#bdbdbd" size={16} />
              )}
            </TouchableOpacity>
            <Collapsible collapsed={!showMessageContent}>
              <View className="p-2.5 border-t border-white/10">
                <MessageContent
                  message={msg}
                  onUpdate={onUpdate}
                  isFullLock={isFullLock}
                />
              </View>
            </Collapsible>
          </View>

          {/* Recipients Section */}
          <View className="bg-white/5 border border-white/15 rounded-[10px] overflow-hidden">
            <TouchableOpacity
              className="flex-row items-center justify-between p-2.5"
              onPress={() => setShowRecipients(!showRecipients)}
            >
              <View className="flex-row items-center gap-1.5">
                <Users color="#bef264" size={16} />
                <Text className="text-white text-[13px] font-semibold">
                  Recipients ({phoneNumbers.length})
                </Text>
              </View>
              {showRecipients ? (
                <ChevronUp color="#bdbdbd" size={16} />
              ) : (
                <ChevronDown color="#bdbdbd" size={16} />
              )}
            </TouchableOpacity>
            <Collapsible collapsed={!showRecipients}>
              <View className="p-2.5 border-t border-white/10">
                <MessageClientList
                  message={msg}
                  phoneNumbers={phoneNumbers}
                />
              </View>
            </Collapsible>
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
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl ${
                  (isSaving || msg.message.length < 100 || isFullLock) && 'opacity-50'
                } border bg-amber-400/20 border-amber-400/30`}
                onPress={() => onSave(msg.id, 'draft')}
                disabled={isSaving || msg.message.length < 100 || isFullLock}
              >
                {isSaving && savingMode === 'draft' ? (
                  <ActivityIndicator size="small" color="#fbbf24" />
                ) : (
                  <FileText color="#fbbf24" size={18} />
                )}
                <Text className="text-amber-400 text-sm font-bold">Save Draft</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className={`flex-1 flex-row items-center justify-center gap-2 px-3 py-3 rounded-xl border ${
                  (isSaving ||
                    msg.message.length < 100 ||
                    !msg.isValidated ||
                    isPartialLock ||
                    isFullLock)
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
                  isPartialLock ||
                  isFullLock
                }
              >
                {isSaving && savingMode === 'activate' ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Zap color="#000000" size={18} />
                )}
                <Text className="text-black text-sm font-bold">Activate</Text>
              </TouchableOpacity>
            </View>

            {msg.isSaved && (
              <TouchableOpacity
                className={`flex-row items-center justify-center gap-1.5 py-2.5 rounded-[10px] bg-white/5 border border-white/15 ${
                  (isSaving || isFullLock) && 'opacity-50'
                }`}
                onPress={() => onCancelEdit(msg.id)}
                disabled={isSaving || isFullLock}
              >
                <Text className="text-[#bdbdbd] text-sm font-bold">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Next Send Banner */}
      {msg.validationStatus === 'ACCEPTED' && msg.enabled && !isAnyLock && (
        <View className="flex-row items-center gap-1.5 px-3 py-2 bg-sky-300/15 border-t border-sky-300/25">
          <Send color="#7dd3fc" size={12} />
          <Text className="text-sky-300 text-xs">
            <Text className="font-medium">Next send: </Text>
            <Text className="text-sky-200">
              {getNextSendDate()} at {msg.hour}:{msg.minute.toString().padStart(2, '0')} {msg.period}
            </Text>
          </Text>
        </View>
      )}
    </View>
  );
}
