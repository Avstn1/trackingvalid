import { supabase } from '@/utils/supabaseClient';
import { MessageSquare, Plus } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MessageCard } from './MessageCard';
import { SMSMessage } from './types';

// Simple UUID generator for React Native
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  dotInactive: 'rgba(125, 211, 252, 0.3)',
  dotActive: '#7dd3fc',
};

export default function SMSManager() {
  const [messages, setMessages] = useState<SMSMessage[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savingMode, setSavingMode] = useState<'draft' | 'activate' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [tempTitle, setTempTitle] = useState<string>('');
  const [originalMessages, setOriginalMessages] = useState<Record<string, SMSMessage>>({});
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const [hasLoaded, setHasLoaded] = useState(false); // Use state instead of ref
  const flatListRef = useRef<FlatList>(null);

  const loadMessages = useCallback(async () => {
    console.log('📥 Loading messages...');
    setIsLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.warn('No access token found');
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`,
        {
          method: 'GET',
          headers: {
            'x-client-access-token': accessToken,
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Load messages API error:', response.status, errorText);
        throw new Error(`Failed to load messages: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Load messages response:', data);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      if (data.success && Array.isArray(data.messages)) {
        const loadedMessages = data.messages.map((dbMsg: any) => {
          try {
            const cronParts = dbMsg.cron?.split(' ') || [];
            const minute = parseInt(cronParts[0]) || 0;
            const hour24 = parseInt(cronParts[1]) || 10;
            const dayOfMonthCron = cronParts[2] || '*';
            const dayOfWeekCron = cronParts[4] || '*';

            let hour12 = hour24;
            let period: 'AM' | 'PM' = 'AM';

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

            let frequency: 'weekly' | 'biweekly' | 'monthly' = 'weekly';
            let dayOfWeek: string | undefined;
            let dayOfMonth: number | undefined;

            if (dayOfMonthCron !== '*') {
              frequency = 'monthly';
              dayOfMonth = parseInt(dayOfMonthCron);
            } else if (dayOfWeekCron !== '*') {
              frequency = 'weekly';
              const dayMap: Record<string, string> = {
                '0': 'sunday',
                '1': 'monday',
                '2': 'tuesday',
                '3': 'wednesday',
                '4': 'thursday',
                '5': 'friday',
                '6': 'saturday',
              };
              dayOfWeek = dayMap[dayOfWeekCron] || 'monday';
            }

            return {
              id: dbMsg.id,
              title: dbMsg.title || 'Untitled Message',
              message: dbMsg.message || '',
              frequency,
              dayOfWeek: dayOfWeek || 'monday',
              dayOfMonth: dayOfMonth || 1,
              hour: hour12,
              minute,
              period,
              enabled: true,
              isSaved: true,
              isValidated: dbMsg.status === 'ACCEPTED',
              validationStatus: dbMsg.status || 'DRAFT',
              validationReason: undefined,
              isEditing: false,
            };
          } catch (parseError) {
            console.error('Error parsing message:', dbMsg, parseError);
            // Return a default message object if parsing fails
            return {
              id: dbMsg.id || generateId(),
              title: 'Error Loading Message',
              message: dbMsg.message || '',
              frequency: 'weekly' as const,
              dayOfWeek: 'monday',
              hour: 10,
              minute: 0,
              period: 'AM' as const,
              enabled: false,
              isSaved: true,
              isValidated: false,
              validationStatus: 'DRAFT' as const,
              validationReason: 'Failed to parse schedule',
              isEditing: false,
            };
          }
        });

        setMessages(loadedMessages);
      } else {
        console.warn('No messages in response or invalid format');
        setMessages([]);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      Alert.alert('Error', 'Failed to load existing messages');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps - function never changes

  useEffect(() => {
    if (!hasLoaded) {
      setHasLoaded(true);
      loadMessages();
    }
  }, [hasLoaded, loadMessages]);

  const addMessage = () => {
    if (messages.length >= 3) {
      Alert.alert('Limit Reached', 'Maximum of 3 scheduled messages allowed');
      return;
    }

    const hasDraft = messages.some((msg) => !msg.isSaved);
    if (hasDraft) {
      Alert.alert(
        'Draft Exists',
        'Please save or delete your current draft before creating a new message'
      );
      return;
    }

    const newMessage: SMSMessage = {
      id: generateId(),
      title: `Message ${messages.length + 1}`,
      message: '',
      frequency: 'weekly',
      dayOfWeek: 'monday',
      hour: 10,
      minute: 0,
      period: 'AM',
      enabled: true,
      isSaved: false,
      isValidated: false,
      validationStatus: 'DRAFT',
      validationReason: undefined,
      isEditing: true,
    };

    setMessages([...messages, newMessage]);
    
    // Scroll to new message
    setTimeout(() => {
      flatListRef.current?.scrollToIndex({
        index: messages.length,
        animated: true,
      });
    }, 100);
  };

  const removeMessage = async (id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg?.isSaved) {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;

        const response = await fetch(
          `${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`,
          {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'x-client-access-token': accessToken || '',
            },
            body: JSON.stringify({ id }),
          }
        );

        if (!response.ok) throw new Error('Failed to delete message');

        Alert.alert('Success', 'Message deleted');
      } catch (error) {
        console.error('Delete error:', error);
        Alert.alert('Error', 'Failed to delete message');
        return;
      }
    }

    setMessages(messages.filter((msg) => msg.id !== id));
    
    // Adjust active index if needed
    if (activeMessageIndex >= messages.length - 1 && activeMessageIndex > 0) {
      setActiveMessageIndex(activeMessageIndex - 1);
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

          if (updated.frequency === 'monthly') {
            delete updated.dayOfWeek;
            if (!updated.dayOfMonth) updated.dayOfMonth = 1;
          } else {
            delete updated.dayOfMonth;
            if (!updated.dayOfWeek) updated.dayOfWeek = 'monday';
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

  const cancelEdit = (id: string) => {
    const original = originalMessages[id];
    if (original) {
      setMessages(
        messages.map((msg) => (msg.id === id ? { ...original, isEditing: false } : msg))
      );
      const newOriginals = { ...originalMessages };
      delete newOriginals[id];
      setOriginalMessages(newOriginals);
    }
  };

  const handleSave = async (msgId: string, mode: 'draft' | 'activate') => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg) return;

    if (!msg.message.trim()) {
      Alert.alert('Error', 'Please fill in message content');
      return;
    }

    if (msg.message.length < 100) {
      Alert.alert('Error', 'Message must be at least 100 characters');
      return;
    }

    if (mode === 'activate') {
      if (!msg.isValidated || msg.validationStatus !== 'ACCEPTED') {
        Alert.alert('Error', 'Message must be validated and approved before activating');
        return;
      }
    }

    setIsSaving(true);
    setSavingMode(mode);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        Alert.alert('Error', 'Not authenticated');
        setIsSaving(false);
        setSavingMode(null);
        return;
      }

      let hour24 = msg.hour;
      if (msg.period === 'PM' && msg.hour !== 12) {
        hour24 = msg.hour + 12;
      } else if (msg.period === 'AM' && msg.hour === 12) {
        hour24 = 0;
      }

      const messageToSave = {
        ...msg,
        hour: hour24,
        validationStatus: mode === 'draft' ? 'DRAFT' : 'ACCEPTED',
      };

      console.log('Saving message:', JSON.stringify(messageToSave, null, 2));

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/save-sms-schedule`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-access-token': accessToken,
          },
          body: JSON.stringify({ messages: [messageToSave] }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save API error:', response.status, errorText);
        throw new Error(`Failed to save: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Save response:', data);

      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      if (data.success) {
        setMessages(
          messages.map((m) => {
            if (m.id !== msgId) return m;
            return {
              ...m,
              isSaved: true,
              isEditing: false,
              validationStatus: mode === 'draft' ? 'DRAFT' : 'ACCEPTED',
            };
          })
        );

        if (originalMessages[msgId]) {
          const newOriginals = { ...originalMessages };
          delete newOriginals[msgId];
          setOriginalMessages(newOriginals);
        }

        Alert.alert(
          'Success',
          mode === 'draft' ? 'Draft saved successfully!' : 'Schedule activated successfully!'
        );
      } else {
        throw new Error(data.error || 'Failed to save');
      }
    } catch (error: any) {
      console.error('Save error:', error);
      Alert.alert('Error', error.message || 'Failed to save SMS schedule');
    } finally {
      setIsSaving(false);
      setSavingMode(null);
    }
  };

  const handleValidate = async (msgId: string) => {
    const msg = messages.find((m) => m.id === msgId);
    if (!msg || !msg.message.trim()) {
      Alert.alert('Error', 'Please enter a message first');
      return;
    }

    if (msg.message.length < 100) {
      Alert.alert('Error', 'Message must be at least 100 characters');
      return;
    }

    setValidatingId(msgId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        Alert.alert('Error', 'Not authenticated');
        setValidatingId(null);
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/verify-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-access-token': accessToken,
          },
          body: JSON.stringify({ message: msg.message }),
        }
      );

      // Check if response is ok before parsing
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Validation API error:', response.status, errorText);
        throw new Error(`Validation failed: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('Validation response:', data);

      // Defensive checks
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response format');
      }

      // Extract status and reason with fallbacks
      const validationStatus = data.status || (data.approved ? 'ACCEPTED' : 'DENIED');
      const validationReason = data.reason || data.message || undefined;

      updateMessage(msgId, {
        isValidated: true,
        validationStatus: validationStatus,
        validationReason: validationReason,
      });

      if (data.approved) {
        Alert.alert('Success', 'Message approved!');
      } else {
        Alert.alert('Validation Result', validationReason || 'Message was not approved');
      }
    } catch (error: any) {
      console.error('Validation error:', error);
      Alert.alert('Error', error.message || 'Failed to validate message');
    } finally {
      setValidatingId(null);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const cardWidth = SCREEN_WIDTH - 32;
    const index = Math.round(scrollPosition / cardWidth);
    setActiveMessageIndex(index);
  };

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <ActivityIndicator size="large" color="#7dd3fc" />
        <Text className="text-[#bdbdbd] mt-4 text-sm">Loading messages...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      {/* Compact Header */}
      <View className="bg-white/5 border border-white/10 rounded-xl p-3 mx-4 mb-3">
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-2">
            <View className="flex-row items-center gap-1.5 mb-1">
              <MessageSquare color="#7dd3fc" size={18} />
              <Text className="text-lg font-bold text-white">SMS Manager</Text>
            </View>
            <Text className="text-[#bdbdbd] text-xs">
              Swipe to manage automated messages
            </Text>
          </View>

          {messages.length < 3 && (
            <TouchableOpacity
              onPress={addMessage}
              className="flex-row items-center gap-1.5 px-3 py-2 bg-sky-300 rounded-full"
            >
              <Plus color="#000000" size={14} />
              <Text className="text-black font-semibold text-xs">New</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Compact indicator */}
        <View className="flex-row items-center gap-1.5 mt-2">
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              className={`flex-1 h-1 rounded-full ${
                i < messages.length ? 'bg-sky-300' : 'bg-white/10'
              }`}
            />
          ))}
          <Text className="text-[10px] text-[#bdbdbd] ml-1">
            {messages.length}/3
          </Text>
        </View>
      </View>

      {/* Messages Horizontal Scroll */}
      {messages.length === 0 ? (
        <View className="flex-1 bg-white/5 border border-white/10 rounded-xl p-8 items-center justify-center mx-4">
          <View className="w-16 h-16 bg-sky-300/10 rounded-full items-center justify-center mb-3">
            <MessageSquare color="#7dd3fc" size={32} />
          </View>
          <Text className="text-lg font-semibold text-white mb-2">No messages yet</Text>
          <Text className="text-[#bdbdbd] mb-4 text-center text-sm">
            Create your first automated SMS message
          </Text>
          <TouchableOpacity
            onPress={addMessage}
            className="flex-row items-center gap-2 px-4 py-2.5 bg-sky-300 rounded-full"
          >
            <Plus color="#000000" size={16} />
            <Text className="text-black font-semibold text-sm">Create Message</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View className="flex-1">
            <FlatList
              ref={flatListRef}
              data={messages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={SCREEN_WIDTH - 32}
              snapToAlignment="start"
              keyExtractor={(item) => item.id}
              renderItem={({ item, index }) => {
                try {
                  return (
                    <View style={{ width: SCREEN_WIDTH - 32, paddingHorizontal: 16 }}>
                      <MessageCard
                        message={item}
                        index={index}
                        isSaving={isSaving}
                        savingMode={savingMode}
                        validatingId={validatingId}
                        editingTitleId={editingTitleId}
                        tempTitle={tempTitle}
                        onUpdate={updateMessage}
                        onRemove={removeMessage}
                        onEnableEdit={enableEditMode}
                        onCancelEdit={cancelEdit}
                        onSave={handleSave}
                        onValidate={handleValidate}
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
                      />
                    </View>
                  );
                } catch (renderError) {
                  console.error('❌ Error rendering MessageCard:', renderError, item);
                  return (
                    <View style={{ width: SCREEN_WIDTH - 32, paddingHorizontal: 16 }}>
                      <View className="bg-rose-500/20 border border-rose-500 rounded-xl p-4">
                        <Text className="text-rose-300 text-center">
                          Error loading message {index + 1}
                        </Text>
                      </View>
                    </View>
                  );
                }
              }}
            />
          </View>

          {/* Page Indicator Dots */}
          <View className="flex-row justify-center items-center py-3 gap-2 mb-2">
            {messages.map((_, index) => (
              <View
                key={index}
                className="h-2 rounded-full"
                style={{
                  width: index === activeMessageIndex ? 24 : 8,
                  backgroundColor:
                    index === activeMessageIndex ? COLORS.dotActive : COLORS.dotInactive,
                  shadowColor: index === activeMessageIndex ? COLORS.dotActive : 'transparent',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: index === activeMessageIndex ? 0.8 : 0,
                  shadowRadius: 6,
                  elevation: index === activeMessageIndex ? 4 : 0,
                }}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}