import { getFadeInDown, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import {
  Calendar,
  Clock,
  Coins,
  Info,
  MessageSquare,
  Send,
  Users
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import 'react-native-get-random-values';
import Animated, { FadeInDown, FadeOutLeft } from 'react-native-reanimated';
import Toast from 'react-native-toast-message';
import { v4 as uuidv4 } from 'uuid';
import { MessageCard } from './MessageCard';
import AutoNudgeHistoryModal from './Modals/AutoNudgeHistoryModal';
import ClientPreviewModal from './Modals/ClientPreviewModal';
import DeactivateConfirmModal from './Modals/DeactivateConfirmModal';
import HowAutoNudgeWorksModal from './Modals/HowAutoNudgeWorksModal';
import ScheduleModal from './Modals/ScheduleModal';
import TestMessageConfirmModal from './Modals/TestMessageConfirmModal';
import { PhoneNumber, SMSMessage } from './types';

interface PreviewClient {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_normalized: string;
  visiting_type: string | null;
  avg_weekly_visits: number | null;
  last_appt: string | null;
  total_appointments: number;
  days_since_last_visit: number;
  days_overdue: number;
  expected_visit_interval_days: number;
  score: number;
  date_last_sms_sent: string | null;
}

interface PreviewStats {
  total_selected: number;
  breakdown: Record<string, number>;
  avg_score: string;
  avg_days_overdue: string;
  avg_days_since_last_visit: string;
}

export default function SMSAutoNudge() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<'draft' | 'activate' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [originalMessages, setOriginalMessages] = useState<Record<string, SMSMessage>>({});
  
  const [previewClients, setPreviewClients] = useState<PreviewClient[]>([]);
  const [previewStats, setPreviewStats] = useState<PreviewStats | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [phoneNumbersByType, setPhoneNumbersByType] = useState<Record<string, PhoneNumber[]>>({});
  
  const [scheduleDayOfMonth, setScheduleDayOfMonth] = useState<number>(1);
  const [scheduleHour, setScheduleHour] = useState<number>(10);
  const [scheduleMinute, setScheduleMinute] = useState<number>(0);
  const [schedulePeriod, setSchedulePeriod] = useState<'AM' | 'PM'>('AM');
  const [scheduleStartDate, setScheduleStartDate] = useState<string>('');
  const [scheduleEndDate, setScheduleEndDate] = useState<string>('');
  const [hasSchedule, setHasSchedule] = useState(false);
  const [isDraftingAll, setIsDraftingAll] = useState(false);

  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [testMessagesUsed, setTestMessagesUsed] = useState<number>(0);
  const [profile, setProfile] = useState<any>(null);
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotionPreference();
  
  const [pendingTestMessageId, setPendingTestMessageId] = useState<string | null>(null);
  const [pendingDeactivateMessageId, setPendingDeactivateMessageId] = useState<string | null>(null);

  const [isLoadingSchedule, setIsLoadingSchedule] = useState(true);
  const [lockedMessages, setLockedMessages] = useState<Set<string>>(new Set());
  const [checkingLocks, setCheckingLocks] = useState(true);

  const [autoNudgeCampaignProgress, setAutoNudgeCampaignProgress] = useState<Record<string, {
    is_finished: boolean;
    is_running: boolean;
  }>>({});

  // Modal states
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showTestMessageModal, setShowTestMessageModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        
        // Check session first
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        
        if (!currentSession?.user?.id || !currentSession.access_token) {
          Alert.alert('Error', 'Please login first');
          router.replace('/login');
          return;
        }

        // Set session state
        setSession(currentSession);
        
        // Now load all data, passing session directly to avoid race conditions
        await Promise.all([
          checkMessageLocks(),
          loadMessages(currentSession),
          loadClientPreview(currentSession),
          fetchCredits(),
          fetchTestMessageCount(),
        ]);
        
      } catch (error) {
        console.error('Failed to initialize:', error);
        Toast.show({
          type: 'error',
          text1: 'Failed to initialize',
          text2: 'Please try again'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    if (!isLoading && messages.length === 0) {
      createDefaultMessages();
    }
  }, [isLoading, messages.length]);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setIsLoadingSchedule(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        console.log('❌ No session found');
        setIsLoadingSchedule(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('auto_nudge_schedule')
        .eq('user_id', session.user.id)
        .single();

      if (profileError || !profile?.auto_nudge_schedule) {
        console.log('⚠️ No schedule found in profile');
        setIsLoadingSchedule(false);
        return;
      }

      const parts = profile.auto_nudge_schedule.split(' | ');

      if (parts.length === 3) {
        const cronParts = parts[0].split(' ');
        const startDate = parts[1];
        const endDate = parts[2] === 'null' ? '' : parts[2];

        if (cronParts.length === 5) {
          const minute = parseInt(cronParts[0]);
          const hour24 = parseInt(cronParts[1]);
          const dayOfMonth = parseInt(cronParts[2]);

          let hour12 = hour24;
          let period: 'AM' | 'PM' = 'AM';
          
          if (hour24 === 0) {
            hour12 = 12;
            period = 'AM';
          } else if (hour24 === 12) {
            hour12 = 12;
            period = 'PM';
          } else if (hour24 > 12) {
            hour12 = hour24 - 12;
            period = 'PM';
          } else {
            hour12 = hour24;
            period = 'AM';
          }

          setScheduleDayOfMonth(dayOfMonth);
          setScheduleHour(hour12);
          setScheduleMinute(minute);
          setSchedulePeriod(period);
          setScheduleStartDate(startDate);
          setScheduleEndDate(endDate);
          setHasSchedule(true);
        }
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    } finally {
      setIsLoadingSchedule(false);
    }
  };

  const checkMessageLocks = async () => {
    setCheckingLocks(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('sms_scheduled_messages')
        .select('id, is_finished, is_running')
        .eq('user_id', user.id)
        .eq('purpose', 'auto-nudge');

      if (error) {
        console.error('❌ Error fetching scheduled messages:', error);
        throw error;
      }

      const progressMap: Record<string, { is_finished: boolean; is_running: boolean }> = {};
      const lockedIds = new Set<string>();

      data?.forEach(msg => {
        progressMap[msg.id] = {
          is_finished: msg.is_finished || false,
          is_running: msg.is_running || false
        };

        if (msg.is_finished) {
          lockedIds.add(msg.id);
        }
      });

      setAutoNudgeCampaignProgress(progressMap);
      setLockedMessages(lockedIds);
    } catch (error) {
      console.error('❌ Failed to check message locks:', error);
    } finally {
      setCheckingLocks(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, email, phone, available_credits, auto_nudge_schedule')
        .eq('user_id', user.id)
        .single();

      if (profileData) {
        setAvailableCredits(profileData.available_credits || 0);
        setProfile(profileData);
      }
    } catch (error) {
      console.error('Failed to fetch credits:', error);
    }
  };

  const fetchTestMessageCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

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

  const loadMessages = async (sessionParam?: any) => {
    const accessToken = sessionParam?.access_token || session?.access_token;
    
    if (!accessToken) {
      console.log('⚠️ No session available for loadMessages');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule?purpose=auto-nudge`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': accessToken,
        },
      });

      if (!response.ok) {
        console.log('❌ Response not OK, throwing error');
        throw new Error('Failed to load messages');
      }

      const data = await response.json();
      
      const visitingTypes: ('consistent' | 'semi-consistent' | 'easy-going' | 'rare' | 'new')[] = [
        'consistent',
        'semi-consistent',
        'easy-going',
        'rare',
        'new'
      ];

      const titles = {
        'consistent': 'Consistent (Highly-frequent visitor)',
        'semi-consistent': 'Semi-Consistent (Once every 2-3 weeks)',
        'easy-going': 'Easy-Going (Once every 3-8 weeks)',
        'rare': 'Rare (Less than once every 2 months)',
        'new': 'New (Has only gone once)'
      };

      const allMessages: SMSMessage[] = [];
      const loadedTypes = new Set<string>();
      
      if (data.success && data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
        data.messages.forEach((dbMsg: any) => {
          const cronParts = dbMsg.cron.split(' ');
          const minute = parseInt(cronParts[0]);
          const hour24 = parseInt(cronParts[1]);
          const dayOfWeekCron = cronParts[4];
          
          let hour12 = hour24;
          let period: 'AM' | 'PM' = 'AM';
          
          if (hour24 >= 12) {
            hour12 = hour24 - 12;
            period = 'PM';
          } else {
            hour12 = hour24;
            period = 'AM';
          }
          
          const dayOfMonthCron = cronParts[2];
          const dayOfMonth = dayOfMonthCron !== '*' ? parseInt(dayOfMonthCron) : 1;

          const isValidated = dbMsg.status !== 'DENIED';

          const convertedMsg: SMSMessage = {
            id: dbMsg.id,
            title: dbMsg.title,
            message: dbMsg.message,
            visitingType: dbMsg.visiting_type || 'consistent',
            frequency: 'monthly',
            dayOfMonth,
            hour: hour12,
            minute,
            period,
            enabled: dbMsg.status === 'ACCEPTED',
            isSaved: true,
            isValidated: isValidated, 
            validationStatus: dbMsg.status,
            validationReason: undefined,
            isEditing: false,
          };
          
          allMessages.push(convertedMsg);
          if (dbMsg.visiting_type) {
            loadedTypes.add(dbMsg.visiting_type);
          }
        });
      } else {
        console.log('⚠️ No saved messages found in database');
      }

      visitingTypes.forEach((type) => {
        if (!loadedTypes.has(type)) {
          allMessages.push({
            id: uuidv4(),
            title: titles[type],
            message: '',
            visitingType: type,
            frequency: 'monthly',
            dayOfMonth: 1,
            hour: 10,
            minute: 0,
            period: 'AM',
            enabled: false,
            isSaved: false,
            isValidated: false,
            validationStatus: 'DRAFT',
            validationReason: undefined,
            isEditing: true,
          });
        }
      });

      const typeOrder = { 'consistent': 0, 'semi-consistent': 1, 'easy-going': 2, 'rare': 3 };
      allMessages.sort((a, b) => {
        const orderA = typeOrder[a.visitingType as keyof typeof typeOrder] ?? 999;
        const orderB = typeOrder[b.visitingType as keyof typeof typeOrder] ?? 999;
        return orderA - orderB;
      });

      setMessages(allMessages);
      
    } catch (error) {
      console.error('❌ Failed to load messages:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load existing messages'
      });
      console.log('🔄 Creating default messages due to error...');
      createDefaultMessages();
    } finally {
      setIsLoading(false);
    }
  };

  const createDefaultMessages = () => {
    const visitingTypes: ('consistent' | 'semi-consistent' | 'easy-going' | 'rare' | 'new')[] = [
      'consistent',
      'semi-consistent',
      'easy-going',
      'rare',
      'new'
    ];

    const titles = {
      'consistent': 'Consistent (Highly Frequent visitor)',
      'semi-consistent': 'Semi-Consistent (Bi-weekly visitor)',
      'easy-going': 'Easy-Going (Visits every 3-8 weeks)',
      'rare': 'Rare (Visits less than once every 2 months)',
      'new': 'New (Has only gone once)'
    };

    const defaultMessages: SMSMessage[] = visitingTypes.map((type) => ({
      id: uuidv4(),
      title: titles[type],
      message: '',
      visitingType: type,
      frequency: 'monthly',
      dayOfMonth: 1,
      hour: 10,
      minute: 0,
      period: 'AM',
      enabled: false,
      isSaved: false,
      isValidated: false,
      validationStatus: 'DRAFT',
      validationReason: undefined,
      isEditing: true,
    }));

    setMessages(defaultMessages);
  };

  const loadClientPreview = async (sessionParam?: any) => {
    const accessToken = sessionParam?.access_token || session?.access_token;
    
    if (!accessToken) {
      console.log('⚠️ No session available for loadClientPreview');
      return;
    }
    
    setLoadingPreview(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id || '';
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/preview-recipients?limit=50&userId=${userId}&algorithm=auto-nudge`, {
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': accessToken,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to load preview');
      }
      
      const data = await response.json();
      
      if (data.success) {
        const sortedClients = [...data.clients].sort((a, b) => 
          b.score - a.score
        );
        
        setPreviewClients(sortedClients);
        setPreviewStats(data.stats);

        if (data.clients) {
          const grouped: Record<string, PhoneNumber[]> = {
            consistent: [],
            'semi-consistent': [],
            'easy-going': [],
            rare: []
          };

          data.clients.forEach((client: PreviewClient) => {
            if (client.visiting_type && grouped[client.visiting_type]) {
              grouped[client.visiting_type].push({
                full_name: `${client.first_name || ''} ${client.last_name || ''}`.trim(),
                phone_normalized: client.phone_normalized
              });
            }
          });

          setPhoneNumbersByType(grouped);
        }
      } else {
        Toast.show({
          type: 'error',
          text1: data.message || 'Failed to load preview'
        });
      }
    } catch (error) {
      console.error('❌ Failed to load preview:', error);
      Toast.show({
        type: 'error',
        text1: 'Failed to load client preview'
      });
    } finally {
      setLoadingPreview(false);
    }
  };

  const draftAllActivatedMessages = async () => {
    const activatedMessages = messages.filter(m => m.validationStatus === 'ACCEPTED' && m.enabled);
    
    if (activatedMessages.length === 0) {
      Toast.show({
        type: 'error',
        text1: 'No activated messages to draft'
      });
      return;
    }

    Alert.alert(
      'Draft All Activated Messages',
      `Are you sure you want to draft ${activatedMessages.length} activated message(s)?\n\nThis will pause all active campaigns.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Draft All',
          style: 'destructive',
          onPress: async () => {
            setIsDraftingAll(true);
            try {
              const updatePromises = activatedMessages.map(msg =>
                fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'x-client-access-token': session?.access_token,
                  },
                  body: JSON.stringify({
                    messages: [{
                      ...msg,
                      validationStatus: 'DRAFT',
                      enabled: false
                    }]
                  }),
                })
              );

              await Promise.all(updatePromises);

              setMessages(messages.map(m =>
                activatedMessages.find(am => am.id === m.id)
                  ? { ...m, validationStatus: 'DRAFT', enabled: false }
                  : m
              ));

              Toast.show({
                type: 'success',
                text1: `${activatedMessages.length} message(s) drafted successfully`
              });
            } catch (error) {
              console.error('Failed to draft messages:', error);
              Toast.show({
                type: 'error',
                text1: 'Failed to draft some messages'
              });
            } finally {
              setIsDraftingAll(false);
            }
          }
        }
      ]
    );
  };

  const handleSetSchedule = async () => {
    if (!scheduleDayOfMonth) {
      Toast.show({
        type: 'error',
        text1: 'Please select a day of the month'
      });
      return;
    }

    if (!scheduleStartDate) {
      Toast.show({
        type: 'error',
        text1: 'Please select a start date'
      });
      return;
    }

    const now = new Date();
    const currentDayOfMonth = now.getDate();
    
    if (scheduleDayOfMonth === currentDayOfMonth) {
      let hour24 = scheduleHour;
      if (schedulePeriod === 'PM') {
        hour24 = scheduleHour + 12;
      }
      
      const scheduledTime = new Date();
      scheduledTime.setHours(hour24, scheduleMinute, 0, 0);
      
      const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);
      
      if (scheduledTime <= fiveMinutesFromNow) {
        Toast.show({
          type: 'error',
          text1: 'Schedule time must be at least 5 minutes from now',
          text2: 'Please choose a different time or day'
        });
        return;
      }
    }

    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.user?.id) {
        Toast.show({
          type: 'error',
          text1: 'Unable to get user session'
        });
        return;
      }

      let hour24 = scheduleHour;
      if (schedulePeriod === 'PM') {
        hour24 = scheduleHour + 12;
      }

      const cronExpression = `${scheduleMinute} ${hour24} ${scheduleDayOfMonth} * *`;
      const startDateStr = scheduleStartDate; 
      const endDateStr = scheduleEndDate || 'null';
      const autoNudgeSchedule = `${cronExpression} | ${startDateStr} | ${endDateStr}`;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ auto_nudge_schedule: autoNudgeSchedule })
        .eq('user_id', session.user.id);

      if (updateError) {
        console.error('Error updating profile:', updateError);
        Toast.show({
          type: 'error',
          text1: 'Failed to save schedule'
        });
        return;
      }

      const { error: smsScheduleError } = await supabase
       .from('sms_scheduled_messages')
       .update( { start_date: startDateStr, end_date: endDateStr } )
       .eq('user_id', session.user.id);

      if (smsScheduleError) {
        console.error('Error updating sms_scheduled_messages:', smsScheduleError);
        Toast.show({
          type: 'error',
          text1: 'Failed to save schedule'
        });
        return;
      }

      setMessages(messages.map(msg => ({
        ...msg,
        dayOfMonth: scheduleDayOfMonth,
        hour: scheduleHour,
        minute: scheduleMinute,
        period: schedulePeriod,
        frequency: 'monthly',
      })));

      setHasSchedule(true);
      Toast.show({
        type: 'success',
        text1: 'Schedule applied to all messages!'
      });
    } catch (error) {
      console.error('Error setting schedule:', error);
      Toast.show({
        type: 'error',
        text1: 'An error occurred while setting schedule'
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
          
          return updated;
        }
        return msg;
      })
    );
  };

  const enableEditMode = (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg) {
      setOriginalMessages({
        ...originalMessages,
        [id]: { ...msg },
      });
      updateMessage(id, { isEditing: true });
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

    if (mode === 'activate' && lockedMessages.has(msgId)) {
      Toast.show({
        type: 'error',
        text1: 'This message has already been sent this month',
        text2: 'It will be unlocked next month'
      });
      return;
    }

    if (!hasSchedule) {
      Toast.show({
        type: 'error',
        text1: 'Please set a monthly schedule first'
      });
      return;
    }

    if (!msg.message.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Please fill in message content'
      });
      return;
    }
    
    if (msg.message.length < 100) {
      Toast.show({
        type: 'error',
        text1: 'Message must be at least 100 characters'
      });
      return;
    }

    if (mode === 'activate' && !msg.isValidated) {
      Toast.show({
        type: 'error',
        text1: 'Message must be validated and approved before activating'
      });
      return;
    }

    setIsSaving(true);
    setSavingMode(mode);
    try {
      let startDate = null;
      let endDate = null;
      
      if (profile?.auto_nudge_schedule) {
        const parts = profile.auto_nudge_schedule.split('|').map((p: any) => p.trim());
        if (parts.length === 3) {
          startDate = parts[1]; 
          endDate = parts[2];  
        }
      }

      const messageToSave = {
        id: msg.id,
        title: msg.title,
        message: msg.message,
        visitingType: msg.visitingType,
        frequency: 'monthly',
        dayOfMonth: scheduleDayOfMonth,
        hour: scheduleHour, 
        minute: scheduleMinute, 
        period: schedulePeriod,
        validationStatus: mode === 'draft' ? 'DRAFT' : 'ACCEPTED',
        purpose: 'auto-nudge',
        start_date: startDate,
        end_date: endDate
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token,
        },
        body: JSON.stringify({ messages: [messageToSave] }),
      });

      if (!response.ok) throw new Error('Failed to save schedule');

      const data = await response.json();
      if (data.success) {
        setMessages(messages.map(m =>
          m.id === msgId
            ? { 
                ...m, 
                isSaved: true, 
                isEditing: false, 
                validationStatus: mode === 'draft' ? 'DRAFT' : 'ACCEPTED',
                enabled: mode === 'activate',
                dayOfMonth: scheduleDayOfMonth,
                hour: scheduleHour,
                minute: scheduleMinute,
                period: schedulePeriod,
                frequency: 'monthly'
              }
            : m
        ));
        Toast.show({
          type: 'success',
          text1: mode === 'draft' ? 'Draft saved!' : 'Schedule activated!'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to save'
        });
      }
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Failed to save SMS schedule'
      });
    } finally {
      setIsSaving(false);
      setSavingMode(null);
    }
  };

  const handleDeactivate = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    setIsSaving(true);
    setSavingMode('draft');
    try {
      const messageToSave = {
        id: msg.id,
        title: msg.title,
        message: msg.message,
        visitingType: msg.visitingType,
        frequency: 'monthly',
        dayOfMonth: scheduleDayOfMonth,
        hour: scheduleHour,
        minute: scheduleMinute,
        period: schedulePeriod,
        validationStatus: 'DRAFT',
        purpose: 'auto-nudge'
      };

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token,
        },
        body: JSON.stringify({ messages: [messageToSave] }),
      });

      if (!response.ok) throw new Error('Failed to deactivate');

      const data = await response.json();
      if (data.success) {
        setMessages(messages.map(m =>
          m.id === msgId
            ? { 
                ...m, 
                isSaved: true, 
                isEditing: true,
                validationStatus: 'DRAFT',
                enabled: false,
                dayOfMonth: scheduleDayOfMonth,
                hour: scheduleHour,
                minute: scheduleMinute,
                period: schedulePeriod,
                frequency: 'monthly'
              }
            : m
        ));
        Toast.show({
          type: 'success',
          text1: 'Message deactivated and ready for editing'
        });
      } else {
        Toast.show({
          type: 'error',
          text1: 'Failed to deactivate'
        });
      }
    } catch (err: any) {
      console.error(err);
      Toast.show({
        type: 'error',
        text1: 'Failed to deactivate message'
      });
    } finally {
      setIsSaving(false);
      setSavingMode(null);
    }
  };

  const handleTestMessageSend = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/qstash-sms-send?messageId=${msg.id}&action=test`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-client-access-token': session?.access_token,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send test message');
      }

      if (testMessagesUsed >= 10) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('available_credits, reserved_credits')
            .eq('user_id', user.id)
            .single();
          
          if (profile) {
            const oldAvailable = profile.available_credits || 0;
            const newAvailable = oldAvailable - 1;
            const oldReserved = profile.reserved_credits || 0;
            const newReserved = oldReserved;
            
            await supabase
              .from('credit_transactions')
              .insert({
                user_id: user.id,
                action: `Paid test message - ${msg.title}`,
                old_available: oldAvailable,
                new_available: newAvailable,
                old_reserved: oldReserved,
                new_reserved: newReserved,
                reference_id: msg.id,
                created_at: new Date().toISOString()
              });

            setAvailableCredits(newAvailable);
          }
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Test message sent successfully to your phone!'
      });
      fetchTestMessageCount();
    } catch (error: any) {
      console.error('Test message error:', error);
      Toast.show({
        type: 'error',
        text1: error.message || 'Failed to send test message'
      });
    }
  };

  if (isLoading) {
    return (
      <View className="flex-1 justify-center items-center gap-3">
        <ActivityIndicator size="large" color="#7dd3fc" />
        <Text className="text-[#bdbdbd] text-sm">Loading your messages...</Text>
      </View>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      timeZone: 'America/Toronto',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  return (
    <Animated.ScrollView
      entering={getFadeInDown(reduceMotion)}
      className="flex-1"
      contentContainerStyle={{
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom + 24, 24),
        gap: 12,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="bg-[#252525]/60 rounded-2xl border border-white/10 p-3 gap-3">
        <View className="gap-2.5">
          <View className="gap-2">
            <View className="flex-row items-center gap-2">
              <MessageSquare color="#7dd3fc" size={24} />
              <Text className="text-lg font-bold text-white">SMS Auto Nudge</Text>
            </View>
            
            <View className="flex-row gap-1.5">
              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 px-2.5 py-1.5 bg-purple-300/15 border border-purple-300/30 rounded-lg"
                onPress={() => setShowHistoryModal(true)}
              >
                <Clock color="#d8b4fe" size={16} />
                <Text className="text-purple-300 text-[11px] font-semibold">History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                className="flex-1 flex-row items-center justify-center gap-1 px-2.5 py-1.5 bg-sky-300/15 border border-sky-300/30 rounded-lg"
                onPress={() => setShowHowItWorksModal(true)}
              >
                <Info color="#7dd3fc" size={16} />
                <Text className="text-sky-300 text-[11px] font-semibold">How it works</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View className="flex-row gap-1.5">
            {/* Credits */}
            <View className="flex-1 flex-row items-center justify-center gap-1 px-2 py-1 bg-lime-300/15 border border-lime-300/30 rounded-full">
              <Coins color="#bef264" size={16} />
              <Text className="text-lime-300 text-xs font-semibold">
                {availableCredits > 999
                  ? `${(availableCredits / 1000).toFixed(1)}k`
                  : availableCredits}
              </Text>
            </View>

            {/* Tests */}
            <View
              className={`flex-1 flex-row items-center justify-center gap-1 px-2 py-1 rounded-full ${
                testMessagesUsed >= 10
                  ? 'bg-red-300/15 border border-red-300/30'
                  : 'bg-sky-300/15 border border-sky-300/30'
              }`}
            >
              <Send
                color={testMessagesUsed >= 10 ? '#fca5a5' : '#7dd3fc'}
                size={16}
              />
              <Text
                className={`text-xs font-semibold ${
                  testMessagesUsed >= 10 ? 'text-red-300' : 'text-sky-300'
                }`}
              >
                {10 - testMessagesUsed} Tests
              </Text>
            </View>

            {/* Draft */}
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center px-2.5 py-1.5 bg-amber-400/20 border border-amber-400/30 rounded-full ${
                (isDraftingAll ||
                  messages.filter(
                    m => m.validationStatus === 'ACCEPTED' && m.enabled
                  ).length === 0) && 'opacity-50'
              }`}
              onPress={draftAllActivatedMessages}
              disabled={
                isDraftingAll ||
                messages.filter(
                  m => m.validationStatus === 'ACCEPTED' && m.enabled
                ).length === 0
              }
            >
              {isDraftingAll ? (
                <ActivityIndicator size="small" color="#fbbf24" />
              ) : (
                <Text className="text-amber-400 text-xs font-semibold">Draft All</Text>
              )}
            </TouchableOpacity>

            {/* Preview */}
            <TouchableOpacity
              className={`flex-1 flex-row items-center justify-center gap-1 px-2.5 py-1.5 bg-white/10 border border-sky-300/30 rounded-full ${
                loadingPreview && 'opacity-50'
              }`}
              onPress={() => {
                loadClientPreview();
                setShowPreviewModal(true);
              }}
              disabled={loadingPreview}
            >
              {loadingPreview ? (
                <ActivityIndicator size="small" color="#7dd3fc" />
              ) : (
                <>
                  <Users color="#7dd3fc" size={16} />
                  <Text className="text-sky-300 text-xs font-semibold">Preview</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Schedule Info */}
        <View className="flex-row items-center justify-between p-2.5 bg-white/5 border border-white/15 rounded-xl gap-2">
          {hasSchedule ? (
            <View className="flex-row items-center gap-2 flex-1">
              <Calendar color="#bef264" size={20} />
              <View className="flex-1 gap-0.5">
                <Text className="text-white text-xs font-semibold">
                  Monthly on day {scheduleDayOfMonth} at {scheduleHour}:{scheduleMinute.toString().padStart(2, '0')} {schedulePeriod}
                  {scheduleDayOfMonth > 28 && <Text className="text-amber-400"> *</Text>}
                </Text>
                {scheduleDayOfMonth > 28 && (
                  <Text className="text-amber-400 text-[10px]">
                    * Adjusts to last day in shorter months
                  </Text>
                )}
                <Text className="text-[#bdbdbd] text-[10px]">
                  {scheduleStartDate && `Starting ${formatDate(scheduleStartDate)}`}
                  {scheduleEndDate && ` • Ending ${formatDate(scheduleEndDate)}`}
                </Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-center gap-2">
              <Clock color="#fbbf24" size={20} />
              <Text className="text-amber-400 text-xs">No schedule set</Text>
            </View>
          )}
          <TouchableOpacity 
            className="flex-row items-center gap-1 px-2.5 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-[10px]"
            onPress={() => setShowScheduleModal(true)}
          >
            <Clock color="#d8b4fe" size={16} />
            <Text className="text-purple-300 text-xs font-semibold">
              {hasSchedule ? 'Edit' : 'Set Schedule'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Messages List */}
      <View className="gap-3">
        {messages.length === 0 ? (
          <View className="bg-[#252525]/60 rounded-2xl border border-white/10 p-8 items-center gap-3">
            <MessageSquare color="#bdbdbd" size={64} style={{ opacity: 0.5 }} />
            <Text className="text-[#bdbdbd] text-base">No messages configured</Text>
            <Text className="text-[#bdbdbd]/70 text-xs text-center">
              Messages will be created automatically on first load
            </Text>
          </View>
        ) : (
          messages.map((msg, index) => (
            <Animated.View
              key={msg.id}
              entering={
                reduceMotion
                  ? undefined
                  : FadeInDown.delay(index * 40).duration(240)
              }
              exiting={reduceMotion ? undefined : FadeOutLeft.duration(200)}
            >
                <MessageCard
                  isLocked={lockedMessages.has(msg.id)}
                  autoNudgeCampaignProgress={autoNudgeCampaignProgress[msg.id]} 
                  message={msg}
                  index={index}
                  isSaving={isSaving}
                  savingMode={savingMode}
                  validatingId={validatingId}
                  editingTitleId={editingTitleId}
                  tempTitle={tempTitle}
                  phoneNumbers={phoneNumbersByType[msg.visitingType || 'consistent'] || []}
                  profile={profile}
                  session={session}
                onUpdate={updateMessage}
                onEnableEdit={enableEditMode}
                onCancelEdit={cancelEdit}
                onSave={handleSave}
                onValidate={async (msgId: string) => {
                  const msg = messages.find((m) => m.id === msgId);
                  if (!msg || !msg.message.trim()) {
                    Toast.show({
                      type: 'error',
                      text1: 'Please enter a message first'
                    });
                    return;
                  }

                  if (msg.message.length < 100) {
                    Toast.show({
                      type: 'error',
                      text1: 'Message must be at least 100 characters'
                    });
                    return;
                  }

                  setValidatingId(msgId);
                  try {
                    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/verify-message`, {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'x-client-access-token': session?.access_token,
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
                        text2: 'You can now save as draft or activate'
                      });
                    } else {
                      Toast.show({
                        type: 'error',
                        text1: data.reason || 'Message was denied'
                      });
                    }
                  } catch (error: any) {
                    console.error('Validation error:', error);
                    Toast.show({
                      type: 'error',
                      text1: error.message || 'Failed to validate message'
                    });
                  } finally {
                    setValidatingId(null);
                  }
                }}
                onRequestTest={(msgId) => {
                  setPendingTestMessageId(msgId);
                  setShowTestMessageModal(true);
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
                onRequestDeactivate={(msgId: string) => {
                  setPendingDeactivateMessageId(msgId);
                  setShowDeactivateModal(true);
                }}
                onTempTitleChange={setTempTitle}
              />
            </Animated.View>
          ))
        )}
      </View>

      {/* Modals */}
      <HowAutoNudgeWorksModal
        isOpen={showHowItWorksModal}
        onClose={() => setShowHowItWorksModal(false)}
      />

      <AutoNudgeHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      <ClientPreviewModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        previewClients={previewClients}
        previewStats={previewStats}
      />

      <TestMessageConfirmModal
        isOpen={showTestMessageModal}
        onClose={() => {
          setShowTestMessageModal(false);
          setPendingTestMessageId(null);
        }}
        onConfirm={() => {
          if (pendingTestMessageId) {
            handleTestMessageSend(pendingTestMessageId);
          }
          setShowTestMessageModal(false);
          setPendingTestMessageId(null);
        }}
        testMessagesUsed={testMessagesUsed}
        availableCredits={availableCredits}
        profilePhone={profile?.phone || null}
      />

      <ScheduleModal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        scheduleDayOfMonth={scheduleDayOfMonth}
        setScheduleDayOfMonth={setScheduleDayOfMonth}
        scheduleHour={scheduleHour}
        setScheduleHour={setScheduleHour}
        scheduleMinute={scheduleMinute}
        setScheduleMinute={setScheduleMinute}
        schedulePeriod={schedulePeriod}
        setSchedulePeriod={setSchedulePeriod}
        scheduleStartDate={scheduleStartDate}
        setScheduleStartDate={setScheduleStartDate}
        scheduleEndDate={scheduleEndDate}
        setScheduleEndDate={setScheduleEndDate}
        onApply={() => {
          handleSetSchedule();
          setShowScheduleModal(false);
        }}
      />

      <DeactivateConfirmModal
        isOpen={showDeactivateModal}
        onClose={() => {
          setShowDeactivateModal(false);
          setPendingDeactivateMessageId(null);
        }}
        onConfirm={async () => {
          if (pendingDeactivateMessageId) {
            setShowDeactivateModal(false);
            setPendingDeactivateMessageId(null);
            await handleDeactivate(pendingDeactivateMessageId);
          }
        }}
      />
    </Animated.ScrollView>
  );
}
