import { supabase } from '@/utils/supabaseClient';
import { Clock, Coins, Info, MessageSquare, Plus, Send } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';
import { MessageCard } from './MessageCard';
import { CampaignProgress, SMSMessage } from './types';

// Modals
import CampaignHistoryModal from './Modals/CampaignHistoryModal';
import DeleteMessageConfirmModal from './Modals/DeleteMessageConfirmModal';
import HowCampaignsWorkModal from './Modals/HowCampaignsWorkModal';
import RecipientPreviewModal from './Modals/RecipientPreviewModal';
import TestMessageConfirmModal from './Modals/TestMessageConfirmModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SMSCampaigns() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<'draft' | 'activate' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [originalMessages, setOriginalMessages] = useState<Record<string, SMSMessage>>({});
  const [session, setSession] = useState<any>(null);
  
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewCounts, setPreviewCounts] = useState<Record<string, number>>({});
  
  // Modal states
  const [showHowCampaignsWorkModal, setShowHowCampaignsWorkModal] = useState(false);
  const [showCampaignHistoryModal, setShowCampaignHistoryModal] = useState(false);
  const [showTestConfirmModal, setShowTestConfirmModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Modal data states
  const [activePreviewMessageId, setActivePreviewMessageId] = useState<string | null>(null);
  const [pendingTestMessageId, setPendingTestMessageId] = useState<string | null>(null);
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('hard');
  
  // Preview data
  const [previewClients, setPreviewClients] = useState<any[]>([]);
  const [deselectedPreviewClients, setDeselectedPreviewClients] = useState<any[]>([]);
  const [previewStats, setPreviewStats] = useState<any | null>(null);
  const [totalUnselectedClients, setTotalUnselectedClients] = useState(0);
  
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [algorithmType, setAlgorithmType] = useState<'campaign' | 'mass' | 'auto-nudge'>('campaign');
  const [maxClients, setMaxClients] = useState<number>(0);
  const [profile, setProfile] = useState<any>(null);
  const [testMessagesUsed, setTestMessagesUsed] = useState<number>(0);
  const [limitMode, setLimitMode] = useState('predefined');
  
  const [campaignProgress, setCampaignProgress] = useState<Record<string, CampaignProgress>>({});
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const [listWidth, setListWidth] = useState(0);

  useEffect(() => {
    initializeSession();
    loadMessages();
    fetchCredits();
    fetchTestMessageCount();
  }, []);

  const initializeSession = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    setSession(currentSession);
  };

  useEffect(() => {
    messages.forEach(msg => {
      if (msg.clientLimit) {
        loadMessagePreview(msg.id, msg.clientLimit);
      }
    });
  }, [messages.length]);

  useEffect(() => {
    if (messages.length > 0) {
      messages.forEach(message => {
        loadMessagePreview(message.id, message.clientLimit);
      });
    }
  }, [algorithmType]);

  // Poll for campaign progress
  useEffect(() => {
    const hasActiveCampaigns = messages.some(msg => {
      const progress = campaignProgress[msg.id];
      return progress?.is_active || (msg.validationStatus === 'ACCEPTED' && !progress?.is_finished);
    });

    if (!hasActiveCampaigns) return;

    const pollProgress = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const messageIds = messages.map(m => m.id).join(',');
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/get-campaign-progress?userId=${user.id}&messageIds=${messageIds}`, {
          method: 'GET',
          headers: {
            'x-client-access-token': session?.access_token || '',
          },
        });
        
        if (!response.ok) return;

        const data = await response.json();
        
        if (data.success && data.progress) {
          const progressMap: typeof campaignProgress = {};
          data.progress.forEach((p: any) => {
            progressMap[p.id] = p;
          });
          setCampaignProgress(progressMap);
        }
      } catch (error) {
        console.error('Failed to fetch campaign progress:', error);
      }
    };

    pollProgress();
    const interval = setInterval(pollProgress, 3000);

    return () => clearInterval(interval);
  }, [messages, campaignProgress]);

  const fetchTestMessageCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get start of today in user's timezone
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('sms_sent')
        .select('id')
        .eq('user_id', user.id)
        .eq('purpose', 'test_message')
        .eq('is_sent', true)
        .gte('created_at', today.toISOString());

      if (error) {
        console.error('Failed to fetch test message count:', error);
        return;
      }

      setTestMessagesUsed(data?.length || 0);
    } catch (error) {
      console.error('Failed to fetch test message count:', error);
    }
  };

  const fetchCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email, phone, available_credits')
        .eq('user_id', user.id)
        .single();

      if (profile) {
        setAvailableCredits(profile.available_credits || 0);
        setProfile(profile);
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  };

  const loadMessages = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule?purpose=campaign&purpose=mass&excludeDeleted=true`, {
        method: 'GET',
        headers: {
          'x-client-access-token': session?.access_token || '',
        },
      });

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      
      if (data.success && data.messages) {
        const loadedMessages = data.messages.map((dbMsg: any) => {
          // Parse the ISO timestamp directly
          const scheduleDateTime = new Date(dbMsg.cron);
          const scheduleDate = scheduleDateTime.toISOString().split('T')[0];
          
          // Get local time components
          const hour24 = scheduleDateTime.getHours();
          const minute = scheduleDateTime.getMinutes();
          
          // Convert to 12hr format
          let hour12: number;
          let period: 'AM' | 'PM';
          
          if (hour24 === 0) {
            hour12 = 12;
            period = 'AM';
          } else if (hour24 < 12) {
            hour12 = hour24;
            period = 'AM';
          } else if (hour24 === 12) {
            hour12 = 12;
            period = 'PM';
          } else {
            hour12 = hour24 - 12;
            period = 'PM';
          }

          const isValidated = dbMsg.status !== 'DENIED';

          const message = {
            id: dbMsg.id,
            title: dbMsg.title,
            message: dbMsg.message,
            scheduleDate,
            hour: hour12,
            minute,
            period,
            clientLimit: dbMsg.message_limit || 50,
            enabled: true,
            isSaved: true,
            isValidated: isValidated, 
            validationStatus: dbMsg.status,
            validationReason: undefined,
            isEditing: false,
            purpose: dbMsg.purpose,
          };
          
          return message;
        });

        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load existing messages',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadMessagePreview = async (messageId: string, limit: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';
      
      // Get the message's purpose
      const message = messages.find(m => m.id === messageId);
      const messagePurpose = message?.purpose || algorithmType;
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/preview-recipients?limit=${limit}&userId=${userId}&algorithm=${messagePurpose}`, {
        method: 'GET',
        headers: {
          'x-client-access-token': session?.access_token || '',
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load preview');
      }
      
      const data = await response.json();
      
      if (data.success && data.stats) {
        const actualCount = limit === 0 ? 0 : data.clients.length;
        setPreviewCounts(prev => ({ ...prev, [messageId]: actualCount }));
      }
    } catch (error) {
      console.error('Failed to load message preview:', error);
    }
  };

  const loadClientPreview = async (messageId: string, limit: number) => {
    setLoadingPreview(true);
    setActivePreviewMessageId(messageId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';

      const message = messages.find(m => m.id === messageId);
      const messagePurpose = message?.purpose || algorithmType;

      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/preview-recipients?limit=${limit}&userId=${userId}&algorithm=${messagePurpose}&messageId=${messageId}`, {
        method: 'GET',
        headers: {
          'x-client-access-token': session?.access_token || '',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load preview');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const clients = data.clients;
        setMaxClients(data.maxClient || 0);

        const actualCount = limit === 0 ? 0 : clients.length;
        setPreviewCounts(prev => ({ ...prev, [messageId]: actualCount }));
        setPreviewClients(clients);
        setDeselectedPreviewClients(data.deselectedClients || []);
        setTotalUnselectedClients(data.deselectedClients?.length || 0); 
        setPreviewStats(data.stats);
        setShowPreviewModal(true);
      }
    } catch (error) {
      console.error('❌ Failed to load preview:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load client preview',
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const addMessage = () => {
    if (messages.length >= 3) {
      Toast.show({
        type: 'error',
        text1: 'Maximum of 3 scheduled messages allowed',
      });
      return;
    }

    const hasDraft = messages.some((msg) => !msg.isSaved);
    if (hasDraft) {
      Toast.show({
        type: 'error',
        text1: 'Please save or delete your current draft before creating a new message',
      });
      return;
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowString = tomorrow.toISOString().split('T')[0];

    const newMessage: SMSMessage = {
      id: uuidv4(),
      title: `Message ${messages.length + 1}`,
      message: '',
      scheduleDate: tomorrowString,
      hour: 10,
      minute: 0,
      period: 'AM',
      clientLimit: 50,
      enabled: true,
      isSaved: false,
      isValidated: false,
      validationStatus: 'DRAFT',
      validationReason: undefined,
      isEditing: true,
      purpose: algorithmType,
    };

    setMessages([...messages, newMessage]);
    
    // Scroll to new message
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const removeMessage = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (!msg) return;

    // Open delete confirmation modal
    setPendingDeleteMessageId(id);
    setDeleteType(msg.isSaved ? 'soft' : 'hard');
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!pendingDeleteMessageId) return;

    const msg = messages.find((m) => m.id === pendingDeleteMessageId);
    if (!msg) return;

    const deleteHard = deleteType === 'hard';

    if (msg.isSaved) {
      try {
        enableEditMode(msg.id);
        
        const { data: { session } } = await supabase.auth.getSession();
        
        const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'x-client-access-token': session?.access_token || '',
          },
          body: JSON.stringify({ 
            id: pendingDeleteMessageId,
            softDelete: !deleteHard
          }),
        });

        if (!response.ok) throw new Error('Failed to delete message');
        
        Toast.show({
          type: 'success',
          text1: deleteHard ? 'Message permanently deleted' : 'Message archived',
        });
      } catch (error) {
        console.error('Delete error:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to delete message',
        });
        setShowDeleteModal(false);
        setPendingDeleteMessageId(null);
        return;
      }
    }
    
    setMessages(messages.filter((msg) => msg.id !== pendingDeleteMessageId));
    setShowDeleteModal(false);
    setPendingDeleteMessageId(null);
  };

  const handleTestMessageSend = async () => {
    if (!pendingTestMessageId) return;

    const msg = messages.find(m => m.id === pendingTestMessageId);
    if (!msg) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/qstash-sms-send?messageId=${msg.id}&action=test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token || '',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test message');
      }

      Toast.show({
        type: 'success',
        text1: 'Test message sent!',
        text2: `Sent to ${profile?.phone || 'your phone'}`,
      });

      // Refresh test message count
      await fetchTestMessageCount();
      
      setShowTestConfirmModal(false);
      setPendingTestMessageId(null);
    } catch (error: any) {
      console.error('Test message error:', error);
      Toast.show({
        type: 'error',
        text1: error.message || 'Failed to send test message',
      });
    }
  };

  const updateMessage = (id: string, updates: Partial<SMSMessage>) => {
    setMessages(
      messages.map((msg) => {
        if (msg.id === id) {
          const updated = { ...msg, ...updates };
          
          if (updates.message !== undefined && updates.message !== msg.message) {
            updated.isValidated = false;
            updated.validationStatus = 'DRAFT';
            updated.validationReason = undefined;
          }
          
          if (updates.clientLimit !== undefined && updates.clientLimit !== msg.clientLimit) {
            loadMessagePreview(id, updates.clientLimit);
          }
          
          return updated;
        }
        return msg;
      })
    );
  };

  const enableEditMode = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg) {
      if (msg.validationStatus === 'ACCEPTED' && previewCounts[id]) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // Get current credits
          const { data: profile } = await supabase
            .from('profiles')
            .select('available_credits, reserved_credits')
            .eq('user_id', user.id)
            .single();

          if (!profile) return;

          // Refund: move from reserved back to available
          const refundAmount = Math.min(previewCounts[id], profile.reserved_credits || 0);

          const oldAvailable = profile.available_credits || 0;
          const newAvailable = oldAvailable + refundAmount;
          const oldReserved = profile.reserved_credits || 0;
          const newReserved = Math.max(0, oldReserved - refundAmount);
          
          const { error } = await supabase
            .from('profiles')
            .update({
              available_credits: (profile.available_credits || 0) + refundAmount,
              reserved_credits: Math.max(0, (profile.reserved_credits || 0) - refundAmount),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id);

          if (error) {
            console.error('Failed to refund credits:', error);
            Toast.show({
              type: 'error',
              text1: 'Failed to refund credits',
            });
            return;
          }

          // Update local state
          setAvailableCredits(prev => prev + refundAmount);
          Toast.show({
            type: 'success',
            text1: `${refundAmount} credits refunded - message set to draft`,
          });

          await supabase
            .from('credit_transactions')
            .insert({
              user_id: user.id,
              action: `Campaign deactivated - ${msg.title}`,
              old_available: oldAvailable,
              new_available: newAvailable,
              old_reserved: oldReserved,
              new_reserved: newReserved,
              reference_id: msg.id, 
              created_at: new Date().toISOString()
            });

        } catch (error) {
          console.error('Failed to refund credits:', error);
          Toast.show({
            type: 'error',
            text1: 'Failed to refund credits',
          });
          return;
        }
      }

      setOriginalMessages({
        ...originalMessages,
        [id]: { ...msg },
      });

      updateMessage(id, { 
        isEditing: true,
        validationStatus: 'DRAFT'
      });
    }
  };

  const cancelEdit = async (id: string) => {
    const original = originalMessages[id];
    if (original) {
      setMessages(messages.map((msg) => (msg.id === id ? { ...original, isEditing: false } : msg)));
      const newOriginals = { ...originalMessages };
      delete newOriginals[id];
      setOriginalMessages(newOriginals);
    }
  };

  const handleSave = async (msgId: string, mode: 'draft' | 'activate') => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in message content',
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
    if (mode === 'activate' && !msg.isValidated) {
      Toast.show({
        type: 'error',
        text1: 'Message must be validated and approved before activating',
      });
      return;
    }

    if (mode === 'activate') {
      const requiredCredits = previewCounts[msgId] || 0;
      
      if (requiredCredits === 0) {
        Toast.show({
          type: 'error',
          text1: 'Please preview recipients before activating',
        });
        return;
      }
      
      if (availableCredits < requiredCredits) {
        Toast.show({
          type: 'error',
          text1: `Insufficient credits. You need ${requiredCredits} but only have ${availableCredits} available.`,
        });
        return;
      }
    }

    setIsSaving(true);
    setSavingMode(mode);
    
    try {
      // REFUND SECTION: If saving as draft and message was previously activated, refund credits
      if (mode === 'draft' && msg.validationStatus === 'ACCEPTED' && previewCounts[msgId]) {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('available_credits, reserved_credits')
              .eq('user_id', user.id)
              .single();

            if (profile) {
              const refundAmount = Math.min(previewCounts[msgId], profile.reserved_credits || 0);
              
              const oldAvailable = profile.available_credits || 0;
              const newAvailable = oldAvailable + refundAmount;
              const oldReserved = profile.reserved_credits || 0;
              const newReserved = Math.max(0, oldReserved - refundAmount);
              
              await supabase
                .from('profiles')
                .update({
                  available_credits: newAvailable,
                  reserved_credits: newReserved,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', user.id);

              setAvailableCredits(newAvailable);
              
              // Log credit transaction
              await supabase
                .from('credit_transactions')
                .insert({
                  user_id: user.id,
                  action: `Campaign saved as draft - ${msg.title}`,
                  old_available: oldAvailable,
                  new_available: newAvailable,
                  old_reserved: oldReserved,
                  new_reserved: newReserved,
                  reference_id: msg.id, 
                  created_at: new Date().toISOString()
                });
            }
          }
        } catch (error) {
          console.error('Failed to refund credits:', error);
        }
      }

      // Convert 12hr to 24hr format
      let hour24 = msg.hour || 10;
      if (msg.period === 'PM' && msg.hour !== 12) {
        hour24 = msg.hour + 12;
      } else if (msg.period === 'AM' && msg.hour === 12) {
        hour24 = 0;
      }

      // Create ISO timestamp in user's local timezone
      const scheduleDateTime = new Date(msg.scheduleDate + 'T00:00:00');
      scheduleDateTime.setHours(hour24, msg.minute || 0, 0, 0);
      const scheduledFor = scheduleDateTime.toISOString();

      const messageToSave = {
        id: msg.id,
        title: msg.title,
        message: msg.message,
        scheduleDate: msg.scheduleDate,
        clientLimit: msg.clientLimit,
        hour: msg.hour || 10,
        minute: msg.minute || 0,
        period: msg.period || 'AM',
        scheduledFor, // ISO timestamp
        validationStatus: mode === 'draft' ? 'DRAFT' : 'ACCEPTED',
        isValidated: msg.isValidated,
        purpose: msg.purpose || algorithmType,
        previewCount: mode === 'activate' ? previewCounts[msgId] : undefined,
      };

      const { data: { session } } = await supabase.auth.getSession();

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token || '',
        },
        body: JSON.stringify({ messages: [messageToSave] }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API ERROR RESPONSE:', errorData);
        throw new Error(errorData.error || 'Failed to save schedule');
      }

      const data = await response.json();

      // Check for QStash scheduling errors
      if (data.results && Array.isArray(data.results)) {
        const failedResult = data.results.find((r: any) => !r.success);
        if (failedResult?.error) {
          try {
            const errorObj = JSON.parse(failedResult.error);
            if (errorObj.error?.includes('maxDelay exceeded')) {
              Toast.show({
                type: 'error',
                text1: 'Schedule is over the 7-day limit',
                text2: 'Please adjust your scheduled time',
              });
              return;
            }
          } catch {
            if (failedResult.error.includes('maxDelay exceeded')) {
              Toast.show({
                type: 'error',
                text1: 'Schedule is over the 7-day limit',
              });
              return;
            }
          }
        }
      }

      if (data.success) {
        // Only deduct credits on activation (not when saving as draft)
        if (mode === 'activate' && previewCounts[msgId]) {
          const oldAvailable = availableCredits;
          const newAvailable = availableCredits - previewCounts[msgId];
          setAvailableCredits(newAvailable);
          
          // Log credit transaction
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('reserved_credits')
              .eq('user_id', user.id)
              .single();
            
            const newReserved = profile?.reserved_credits || 0;
            const oldReserved = newReserved - previewCounts[msgId];

            await supabase
              .from('credit_transactions')
              .insert({
                user_id: user.id,
                action: `Campaign activated - ${msg.title}`,
                old_available: oldAvailable,
                new_available: newAvailable,
                old_reserved: oldReserved,
                new_reserved: newReserved,
                reference_id: msg.id, 
                created_at: new Date().toISOString()
              });
          }
        }
        
        setMessages(messages.map(m =>
          m.id === msgId
            ? { 
                ...m, 
                isSaved: true, 
                isEditing: false, 
                validationStatus: mode === 'draft' ? 'DRAFT' : 'ACCEPTED',
                isValidated: mode === 'activate' ? true : m.isValidated
              }
            : m
        ));
        
        Toast.show({
          type: 'success',
          text1: mode === 'draft' ? 'Draft saved!' : 'Schedule activated!',
        });
      } else {
        console.error('❌ SAVE FAILED:', data);
        Toast.show({
          type: 'error',
          text1: data.error || 'Failed to save the campaign schedule',
        });
      }
    } catch (err: any) {
      console.error('❌ SAVE ERROR:', err);
      Toast.show({
        type: 'error',
        text1: err.message || 'Failed to save SMS schedule',
      });
    } finally {
      setIsSaving(false);
      setSavingMode(null);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const pageIndex = Math.round(scrollPosition / SCREEN_WIDTH);
    setCurrentPage(pageIndex);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="large" color="#7dd3fc" />
        <Text className="text-[#bdbdbd] mt-4">Loading your messages...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Header - Compact Version */}
      <View className="bg-white/5 border border-white/10 rounded-2xl shadow-xl p-4 mb-4">
        {/* Title */}
        <View className="flex-row items-center gap-2 mb-3">
          <MessageSquare size={20} color="#7dd3fc" />
          <Text className="text-xl font-bold text-white">SMS Campaign Manager</Text>
        </View>

        {/* Top Row: History, How it works, Credits, Tests */}
        <View className="flex-row gap-2 mb-2">
          <TouchableOpacity 
            onPress={() => setShowCampaignHistoryModal(true)}
            className="flex-1 flex-row items-center justify-center gap-1 px-2 py-2 bg-purple-300/10 border border-purple-300/30 rounded-lg"
          >
            <Clock size={14} color="#c084fc" />
            <Text className="text-xs font-semibold text-purple-300">History</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setShowHowCampaignsWorkModal(true)}
            className="flex-1 flex-row items-center justify-center gap-1 px-2 py-2 bg-sky-300/10 border border-sky-300/30 rounded-lg"
          >
            <Info size={14} color="#7dd3fc" />
            <Text className="text-xs font-semibold text-sky-300">How</Text>
          </TouchableOpacity>

          <View className="flex-1 px-2 py-2 bg-lime-300/10 border border-lime-300/20 rounded-lg flex-row items-center justify-center gap-1">
            <Coins size={14} color="#bef264" />
            <Text className="text-xs font-semibold text-lime-300" numberOfLines={1}>
              {availableCredits > 999 ? `${(availableCredits / 1000).toFixed(1)}k` : availableCredits}
            </Text>
          </View>
          
          <View className={`flex-1 px-2 py-2 rounded-lg flex-row items-center justify-center gap-1 ${
            testMessagesUsed >= 10 
              ? 'bg-rose-300/10 border border-rose-300/20'
              : 'bg-sky-300/10 border border-sky-300/20'
          }`}>
            <Send size={14} color={testMessagesUsed >= 10 ? '#fca5a5' : '#7dd3fc'} />
            <Text className={`text-xs font-semibold ${
              testMessagesUsed >= 10 ? 'text-rose-300' : 'text-sky-300'
            }`} numberOfLines={1}>
              {10 - testMessagesUsed}
            </Text>
          </View>
        </View>

        {/* Bottom Row: Create Button */}
        {messages.length < 3 && (
          <TouchableOpacity
            onPress={addMessage}
            className="flex-row items-center justify-center gap-2 px-4 py-2.5 bg-sky-300 rounded-lg"
          >
            <Plus size={16} color="#000000" />
            <Text className="text-sm font-bold text-black">Create New Message</Text>
          </TouchableOpacity>
        )}

        {/* Usage indicator */}
        <View className="flex-row items-center gap-2 mt-3">
          <View className="flex-row gap-1 flex-1">
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                className={`flex-1 h-1 rounded-full ${
                  i < messages.length ? 'bg-sky-300' : 'bg-white/10'
                }`}
              />
            ))}
          </View>
          <Text className="text-xs text-[#bdbdbd]">
            {messages.length}/3
          </Text>
        </View>
      </View>

      {/* Messages List - Horizontal Pagination */}
      {messages.length === 0 ? (
        <Animated.View
          entering={FadeIn}
          className="bg-white/5 border border-white/10 rounded-2xl shadow-xl p-12 items-center"
        >
          <View className="w-20 h-20 bg-sky-300/10 rounded-full items-center justify-center mb-4">
            <MessageSquare size={40} color="#7dd3fc" />
          </View>
          <Text className="text-xl font-semibold text-white mb-2 text-center">
            No messages scheduled
          </Text>
          <Text className="text-[#bdbdbd] text-base mb-6 text-center max-w-md">
            Create your first automated SMS message to stay connected with your clients
          </Text>
          <TouchableOpacity
            onPress={addMessage}
            className="flex-row items-center gap-2 px-6 py-3 bg-sky-300 rounded-full"
          >
            <Plus size={20} color="#000000" />
            <Text className="text-base font-bold text-black">Create Message</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View
          className="flex-1"
          style={{ minHeight: SCREEN_HEIGHT * 0.7 }}
          onLayout={(e) => {
            setListWidth(e.nativeEvent.layout.width);
          }}
        >
          {listWidth > 0 && (
            <FlatList
              ref={flatListRef}
              data={messages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => (
                <View style={{ width: listWidth, alignItems: 'center' }}>
                  <View style={{ width: listWidth }}>
                    <MessageCard
                      setLimitMode={setLimitMode}
                      maxClients={maxClients}
                      testMessagesUsed={testMessagesUsed}
                      profile={profile}
                      setAlgorithmType={setAlgorithmType}
                      availableCredits={availableCredits}
                      message={item}
                      index={index}
                      isSaving={isSaving}
                      savingMode={savingMode}
                      validatingId={validatingId}
                      editingTitleId={editingTitleId}
                      tempTitle={tempTitle}
                      previewCount={previewCounts[item.id] || 0}
                      loadingPreview={loadingPreview}
                      campaignProgress={campaignProgress[item.id]}
                      session={session}
                      onLoadPreview={(limit) => {
                        loadClientPreview(item.id, limit);
                      }}
                      onUpdate={updateMessage}
                      onRemove={removeMessage}
                      onEnableEdit={enableEditMode}
                      onCancelEdit={cancelEdit}
                      onSave={handleSave}
                      onValidate={async (msgId: string) => {
                        const msg = messages.find((m) => m.id === msgId);
                        if (!msg || !msg.message.trim()) {
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

                        setValidatingId(msgId);
                        try {
                          const { data: { session } } = await supabase.auth.getSession();
                          
                          const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/verify-message`, {
                            method: 'POST',
                            headers: { 
                              'Content-Type': 'application/json',
                              'x-client-access-token': session?.access_token || '',
                            },
                            body: JSON.stringify({ message: msg.message }),
                          });

                          const data = await response.json();

                          if (!response.ok) {
                            throw new Error(data.error || 'Validation failed');
                          }

                          updateMessage(msgId, {
                            isValidated: data.approved,
                            validationStatus: data.approved ? 'DRAFT' : 'DENIED',
                            validationReason: data.approved ? undefined : data.reason,
                          });

                          if (data.approved) {
                            Toast.show({
                              type: 'success',
                              text1: 'Message validated and approved!',
                              text2: 'You can now save as draft or activate',
                            });
                          } else {
                            Toast.show({
                              type: 'error',
                              text1: data.reason || 'Message was denied',
                            });
                          }
                        } catch (error: any) {
                          console.error('Validation error:', error);
                          Toast.show({
                            type: 'error',
                            text1: error.message || 'Failed to validate message',
                          });
                        } finally {
                          setValidatingId(null);
                        }
                      }}
                      onStartEditingTitle={(id: string, currentTitle: string) => {
                        setEditingTitleId(id);
                        setTempTitle(currentTitle);
                      }}
                      onSaveTitle={(id: string) => {
                        if (tempTitle.trim()) {
                          updateMessage(id, { title: tempTitle.trim() });
                        }
                        setEditingTitleId(null);
                        setTempTitle('');
                      }}
                      onCancelEditTitle={() => {
                        setEditingTitleId(null);
                        setTempTitle('');
                      }}
                      onTempTitleChange={setTempTitle}
                      onRequestTest={(msgId) => {
                        setPendingTestMessageId(msgId);
                        setShowTestConfirmModal(true);
                      }}
                      onTestComplete={() => fetchTestMessageCount()}
                    />
                  </View>
                </View>
              )}
            />
          )}
        </View>
      )}
      
      {/* Page Indicators - Outside FlatList */}
      {messages.length > 1 && (
        <View className="flex-row justify-center items-center gap-2 py-4">
          {messages.map((_, index) => (
            <View
              key={index}
              className="h-2 rounded-full"
              style={{
                width: currentPage === index ? 24 : 8,
                backgroundColor: currentPage === index ? '#7dd3fc' : 'rgba(255, 255, 255, 0.2)',
              }}
            />
          ))}
        </View>
      )}
      
      {/* Modals */}
      <HowCampaignsWorkModal
        isOpen={showHowCampaignsWorkModal}
        onClose={() => setShowHowCampaignsWorkModal(false)}
      />

      <CampaignHistoryModal
        isOpen={showCampaignHistoryModal}
        onClose={() => setShowCampaignHistoryModal(false)}
        session={session}
      />

      <TestMessageConfirmModal
        isOpen={showTestConfirmModal}
        onClose={() => {
          setShowTestConfirmModal(false);
          setPendingTestMessageId(null);
        }}
        onConfirm={handleTestMessageSend}
        testMessagesUsed={testMessagesUsed}
        availableCredits={availableCredits}
        profilePhone={profile?.phone || null}
      />

      <DeleteMessageConfirmModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setPendingDeleteMessageId(null);
        }}
        onConfirm={confirmDelete}
        deleteType={deleteType}
      />

      <RecipientPreviewModal
        isOpen={showPreviewModal}
        onClose={() => {
          setShowPreviewModal(false);
          setActivePreviewMessageId(null);
          setPreviewClients([]);
          setDeselectedPreviewClients([]);
          setPreviewStats(null);
        }}
        messageTitle={messages.find(m => m.id === activePreviewMessageId)?.title || 'Message'}
        messageId={activePreviewMessageId}
        previewClients={previewClients}
        deselectedPreviewClients={deselectedPreviewClients}
        previewStats={previewStats}
        maxClients={maxClients}
        initialTotalUnselectedClients={totalUnselectedClients}
        clientLimit={messages.find(m => m.id === activePreviewMessageId)?.clientLimit || 0}
      />
    </View>
  );
}