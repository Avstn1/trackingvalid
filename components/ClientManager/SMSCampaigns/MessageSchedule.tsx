import FAQModal from '@/components/Header/FAQModal';
import DateTimePicker from '@react-native-community/datetimepicker';
import { AlertCircle, Calendar, Clock, FileText, Hash, Info, Users, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { CAMPAIGN_TYPES, HOURS_12, MINUTES_15, PERIODS, SMSMessage } from './types';

interface MessageScheduleProps {
  maxClients: number;
  message: SMSMessage;
  isSaving: boolean;
  savingMode: 'draft' | 'activate' | null;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
  onSave: (msgId: string, mode: 'draft' | 'activate') => void;
  onCancelEdit: (id: string) => void;
  setAlgorithmType: (type: 'campaign' | 'mass') => void;
  previewCount?: number;
  availableCredits?: number;
  isFullLock?: boolean;
  isPartialLock?: boolean;
}

export function MessageSchedule({
  maxClients,
  setAlgorithmType,
  message: msg,
  isSaving,
  savingMode,
  onUpdate,
  onSave,
  onCancelEdit,
  previewCount = 0,
  availableCredits = 0,
  isFullLock = false,
  isPartialLock = false,
}: MessageScheduleProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showMinutePicker, setShowMinutePicker] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showLimitPicker, setShowLimitPicker] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [customLimit, setCustomLimit] = useState<string>('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const getMaxLimit = () => {
    return Math.min(availableCredits, maxClients);
  };

  const isPredefinedLimit = () => {
    const predefinedLimits = [50, 100, 250, 500, 750, 1000, 1500, 2000];
    return predefinedLimits.includes(msg.clientLimit) || msg.clientLimit === getMaxLimit();
  };

  useEffect(() => {
    const isPredef = isPredefinedLimit();
    setShowCustomInput(!isPredef);
    if (!isPredef) {
      setCustomLimit(msg.clientLimit.toString());
    } else {
      setCustomLimit('');
    }
  }, [msg.id, msg.clientLimit]);

  const now = new Date();
  const maxDateTime = new Date(now);
  maxDateTime.setDate(now.getDate() + 7);

  const validateScheduledTime = (): boolean => {
    if (!msg.scheduleDate) return false;

    let hour24 = msg.hour;
    if (msg.period === 'PM' && msg.hour !== 12) {
      hour24 = msg.hour + 12;
    } else if (msg.period === 'AM' && msg.hour === 12) {
      hour24 = 0;
    }

    const scheduledDateTime = new Date(`${msg.scheduleDate}T${hour24.toString().padStart(2, '0')}:${msg.minute.toString().padStart(2, '0')}:00-05:00`);
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

  const handleLimitChange = (value: number) => {
    const maxLimit = getMaxLimit();
    
    if (value === -1) {
      setShowCustomInput(true);
      const newLimit = customLimit && parseInt(customLimit) >= 100 ? parseInt(customLimit) : 100;
      setCustomLimit(newLimit.toString());
      onUpdate(msg.id, { clientLimit: Math.min(newLimit, maxLimit) });
    } else if (value === -2) {
      setShowCustomInput(false);
      setCustomLimit('');
      onUpdate(msg.id, { clientLimit: maxLimit });
    } else {
      setShowCustomInput(false);
      setCustomLimit('');
      onUpdate(msg.id, { clientLimit: value });
    }
  };

  const handleCustomLimitChange = (value: string) => {
    setCustomLimit(value);
    const numValue = parseInt(value);
    const maxLimit = getMaxLimit();
    
    if (!isNaN(numValue) && numValue >= 0) {
      onUpdate(msg.id, { clientLimit: Math.min(numValue, maxLimit) });
    }
  };

  const handlepurposeChange = (type: 'mass' | 'campaign') => {
    const maxLimit = availableCredits;
    const newLimit = Math.min(msg.clientLimit, maxLimit);

    setAlgorithmType(type);
    onUpdate(msg.id, { 
      purpose: type,
      clientLimit: newLimit
    });
  };

  useEffect(() => {
    if (msg.purpose && (msg.purpose === 'mass' || msg.purpose === 'campaign')) {
      setAlgorithmType(msg.purpose);
    }
  }, [msg.id, msg.purpose]);

  const limitOptions = [50, 100, 250, 500, 750, 1000, 1500, 2000].filter(
    limit => limit <= Math.min(getMaxLimit(), maxClients)
  );

  return (
    <View className="gap-2.5">
      {/* Algorithm Type */}
      <View>
        <View className="flex-row items-center gap-1 mb-1.5">
          <Zap size={12} color="#bdbdbd" />
          <Text className="text-xs font-medium text-[#bdbdbd]">Algorithm Type</Text>
          <TouchableOpacity 
            onPress={() => setShowFAQModal(true)}
            className="ml-0.5"
          >
            <Info size={12} color="#7dd3fc" />
          </TouchableOpacity>
        </View>
        <View className="flex-row gap-1.5">
          {CAMPAIGN_TYPES.map((type) => (
            <TouchableOpacity
              key={type.value}
              onPress={() => handlepurposeChange(type.value)}
              disabled={!msg.isEditing}
              className={`flex-1 px-3 py-2 rounded-lg ${
                msg.purpose === type.value
                  ? 'bg-sky-300/20 border border-sky-300/50'
                  : 'bg-white/5 border border-white/10'
              } ${!msg.isEditing ? 'opacity-70' : ''}`}
            >
              <Text className={`text-xs font-semibold text-center ${
                msg.purpose === type.value ? 'text-sky-300' : 'text-[#bdbdbd]'
              }`}>
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Client Limit */}
      <View>
        <View className="flex-row items-center gap-1 mb-1.5">
          <Users size={12} color="#bdbdbd" />
          <Text className="text-xs font-medium text-[#bdbdbd]">Client Limit</Text>
        </View>

        <TouchableOpacity
          onPress={() => setShowLimitPicker(true)}
          disabled={!msg.isEditing}
          className={`bg-white/5 border border-white/10 rounded-lg px-3 py-2 ${
            !msg.isEditing ? 'opacity-70' : ''
          }`}
        >
          <Text className="text-sm text-white">
            {showCustomInput 
              ? `Custom: ${msg.clientLimit.toLocaleString()}`
              : msg.clientLimit === getMaxLimit()
                ? `Max (${Math.min(getMaxLimit(), maxClients).toLocaleString()})`
                : `${msg.clientLimit.toLocaleString()} clients`
            }
          </Text>
        </TouchableOpacity>

        {showCustomInput && (
          <View className="mt-1.5">
            <View className="relative">
              <View className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10">
                <Hash size={14} color="#bdbdbd" />
              </View>
              <TextInput
                keyboardType="number-pad"
                value={customLimit}
                onChangeText={handleCustomLimitChange}
                onBlur={() => {
                  const numValue = parseInt(customLimit);
                  const maxLimit = getMaxLimit();
                  if (!isNaN(numValue) && numValue > maxLimit) {
                    setCustomLimit(maxLimit.toString());
                    onUpdate(msg.id, { clientLimit: maxLimit });
                  }
                }}
                editable={msg.isEditing}
                placeholder={`Max: ${getMaxLimit().toLocaleString()}`}
                placeholderTextColor="#bdbdbd80"
                className={`bg-white/5 border border-white/10 rounded-lg pl-8 pr-3 py-2 text-sm text-white ${
                  !msg.isEditing ? 'opacity-70' : ''
                }`}
              />
            </View>
          </View>
        )}

        {previewCount >= 0 && (
          <Text className="text-[10px] text-[#bdbdbd] mt-1">
            {msg.clientLimit === 0 
              ? 0 
              : Math.min(previewCount, availableCredits, msg.clientLimit)
            } will receive this.{' '}
            <Text 
              onPress={() => setShowLimitModal(true)}
              className="text-sky-300/80 underline"
            >
              Why?
            </Text>
          </Text>
        )}

        {msg.clientLimit > availableCredits && (
          <Text className="text-[10px] text-rose-400 mt-1">
            ⚠️ Only {availableCredits} credits available
          </Text>
        )}
      </View>

      {/* Date & Time Row */}
      <View className="flex-row gap-2">
        {/* Date */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1 mb-1.5">
            <Calendar size={12} color="#bdbdbd" />
            <Text className="text-xs font-medium text-[#bdbdbd]">Date</Text>
            <TouchableOpacity onPress={() => setShowTooltip(!showTooltip)}>
              <AlertCircle size={11} color="#fbbf24" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            disabled={!msg.isEditing}
            className={`bg-white/5 border border-white/10 rounded-lg px-3 py-2 ${
              !msg.isEditing ? 'opacity-70' : ''
            }`}
          >
            <Text className="text-sm text-white" numberOfLines={1}>
              {msg.scheduleDate ? new Date(msg.scheduleDate + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
              }) : 'Select'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Time */}
        <View className="flex-1">
          <View className="flex-row items-center gap-1 mb-1.5">
            <Clock size={12} color="#bdbdbd" />
            <Text className="text-xs font-medium text-[#bdbdbd]">Time</Text>
          </View>
          <View className="flex-row gap-1">
            {/* Hour */}
            <TouchableOpacity
              onPress={() => setShowHourPicker(true)}
              disabled={!msg.isEditing}
              className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-1.5 py-2 ${
                !msg.isEditing ? 'opacity-70' : ''
              }`}
            >
              <Text className="text-sm text-white text-center">
                {msg.hour === 0 ? 12 : msg.hour}
              </Text>
            </TouchableOpacity>

            {/* Minute */}
            <TouchableOpacity
              onPress={() => setShowMinutePicker(true)}
              disabled={!msg.isEditing}
              className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-1.5 py-2 ${
                !msg.isEditing ? 'opacity-70' : ''
              }`}
            >
              <Text className="text-sm text-white text-center">
                {msg.minute.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            {/* Period */}
            <TouchableOpacity
              onPress={() => setShowPeriodPicker(true)}
              disabled={!msg.isEditing}
              className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-1.5 py-2 ${
                !msg.isEditing ? 'opacity-70' : ''
              }`}
            >
              <Text className="text-sm text-white text-center">
                {msg.period}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View className="flex-1 bg-black/60 items-center justify-center p-4">
          <TouchableOpacity 
            activeOpacity={1} 
            className="absolute inset-0" 
            onPress={() => setShowDatePicker(false)}
          />
          <View className="bg-[#1a1a1a] rounded-2xl p-4 w-full max-w-sm">
            <Text className="text-lg font-bold text-white mb-3">Select Date</Text>
            <DateTimePicker
              value={msg.scheduleDate ? new Date(msg.scheduleDate + 'T00:00:00') : new Date()}
              mode="date"
              display="spinner"
              minimumDate={now}
              maximumDate={maxDateTime}
              onChange={(event, selectedDate) => {
                if (selectedDate) {
                  const dateString = selectedDate.toISOString().split('T')[0];
                  onUpdate(msg.id, { scheduleDate: dateString });
                }
              }}
              textColor="#ffffff"
            />
            <View className="flex-row gap-2 mt-3">
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10"
              >
                <Text className="text-xs font-bold text-[#bdbdbd] text-center">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowDatePicker(false)}
                className="flex-1 px-4 py-2 rounded-lg bg-sky-300/20 border border-sky-300/30"
              >
                <Text className="text-xs font-bold text-sky-300 text-center">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Buttons */}
      {msg.isEditing && (
        <View className="gap-1.5 mt-1">
          <View className="flex-row gap-1.5">
            {/* Save as Draft */}
            <TouchableOpacity
              onPress={() => onSave(msg.id, 'draft')}
              disabled={isSaving || msg.message.length < 100}
              className={`flex-1 flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg ${
                isSaving || msg.message.length < 100
                  ? 'bg-gray-600/50'
                  : 'bg-amber-300/20 border border-amber-300/30'
              }`}
            >
              {isSaving && savingMode === 'draft' ? (
                <ActivityIndicator size="small" color="#fbbf24" />
              ) : (
                <FileText size={16} color="#fbbf24" />
              )}
              <Text className={`text-xs font-bold ${
                isSaving || msg.message.length < 100 ? 'text-gray-400' : 'text-amber-300'
              }`}>
                Save Draft
              </Text>
            </TouchableOpacity>

            {/* Activate Schedule */}
            <TouchableOpacity
              onPress={handleActivate}
              disabled={isSaving || msg.message.length < 100 || !msg.isValidated}
              className={`flex-1 flex-row items-center justify-center gap-1.5 px-3 py-2 rounded-lg ${
                isSaving || msg.message.length < 100 || !msg.isValidated
                  ? 'bg-gray-600/50'
                  : 'bg-lime-300/20 border border-lime-300/30'
              }`}
            >
              {isSaving && savingMode === 'activate' ? (
                <ActivityIndicator size="small" color="#bef264" />
              ) : (
                <Zap size={16} color="#bef264" />
              )}
              <Text className={`text-xs font-bold ${
                isSaving || msg.message.length < 100 || !msg.isValidated ? 'text-gray-400' : 'text-lime-300'
              }`}>
                Activate
              </Text>
            </TouchableOpacity>
          </View>

          {msg.isSaved && (
            <TouchableOpacity
              onPress={() => onCancelEdit(msg.id)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              <Text className="text-xs font-bold text-[#bdbdbd] text-center">Cancel</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Modals */}
      <FAQModal 
        isOpen={showFAQModal} 
        onClose={() => setShowFAQModal(false)}
        initialSearchQuery="who to message"
      />

      {/* Limit Picker Modal */}
      <Modal
        visible={showLimitPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLimitPicker(false)}
      >
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity 
            activeOpacity={1} 
            className="absolute inset-0" 
            onPress={() => setShowLimitPicker(false)}
          />
          <View className="bg-[#1a1a1a] rounded-t-3xl p-4">
            <Text className="text-lg font-bold text-white mb-3">Select Client Limit</Text>
            <ScrollView className="max-h-80">
              {limitOptions.map((limit) => (
                <TouchableOpacity
                  key={limit}
                  onPress={() => {
                    handleLimitChange(limit);
                    setShowLimitPicker(false);
                  }}
                  className="py-3 border-b border-white/10"
                >
                  <Text className="text-sm text-white">{limit.toLocaleString()} clients</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  handleLimitChange(-2);
                  setShowLimitPicker(false);
                }}
                className="py-3 border-b border-white/10"
              >
                <Text className="text-sm text-white">
                  Max ({Math.min(getMaxLimit(), maxClients).toLocaleString()})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  handleLimitChange(-1);
                  setShowLimitPicker(false);
                }}
                className="py-3"
              >
                <Text className="text-sm text-white">Custom</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Hour/Minute/Period Pickers */}
      <Modal visible={showHourPicker} transparent animationType="slide" onRequestClose={() => setShowHourPicker(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity activeOpacity={1} className="absolute inset-0" onPress={() => setShowHourPicker(false)} />
          <View className="bg-[#1a1a1a] rounded-t-3xl p-4">
            <Text className="text-lg font-bold text-white mb-3">Select Hour</Text>
            <ScrollView className="max-h-80">
              {HOURS_12.map((hour) => (
                <TouchableOpacity key={hour.value} onPress={() => { onUpdate(msg.id, { hour: hour.value }); setShowHourPicker(false); }} className="py-3 border-b border-white/10">
                  <Text className="text-sm text-white">{hour.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showMinutePicker} transparent animationType="slide" onRequestClose={() => setShowMinutePicker(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity activeOpacity={1} className="absolute inset-0" onPress={() => setShowMinutePicker(false)} />
          <View className="bg-[#1a1a1a] rounded-t-3xl p-4">
            <Text className="text-lg font-bold text-white mb-3">Select Minute</Text>
            <ScrollView className="max-h-80">
              {MINUTES_15.map((minute) => (
                <TouchableOpacity key={minute.value} onPress={() => { onUpdate(msg.id, { minute: minute.value }); setShowMinutePicker(false); }} className="py-3 border-b border-white/10">
                  <Text className="text-sm text-white">{minute.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={showPeriodPicker} transparent animationType="slide" onRequestClose={() => setShowPeriodPicker(false)}>
        <View className="flex-1 bg-black/60 justify-end">
          <TouchableOpacity activeOpacity={1} className="absolute inset-0" onPress={() => setShowPeriodPicker(false)} />
          <View className="bg-[#1a1a1a] rounded-t-3xl p-4">
            <Text className="text-lg font-bold text-white mb-3">Select Period</Text>
            {PERIODS.map((period) => (
              <TouchableOpacity key={period.value} onPress={() => { onUpdate(msg.id, { period: period.value as 'AM' | 'PM' }); setShowPeriodPicker(false); }} className="py-3 border-b border-white/10">
                <Text className="text-sm text-white">{period.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Tooltip Modal */}
      <Modal visible={showTooltip} transparent animationType="fade" onRequestClose={() => setShowTooltip(false)}>
        <TouchableOpacity className="flex-1 bg-black/60 items-center justify-center p-4" activeOpacity={1} onPress={() => setShowTooltip(false)}>
          <View className="bg-[#0a0a0a] border border-amber-300/30 rounded-lg p-3 max-w-xs">
            <Text className="text-[10px] text-amber-200">
              Schedule up to 7 days ahead, min 5 mins buffer (15-min intervals)
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Limit Info Modal */}
      <Modal visible={showLimitModal} transparent animationType="fade" onRequestClose={() => setShowLimitModal(false)}>
        <View className="flex-1 bg-black/80 items-center justify-center p-4">
          <TouchableOpacity activeOpacity={1} className="absolute inset-0" onPress={() => setShowLimitModal(false)} />
          <View className="bg-[#1a1a1a] border border-white/20 rounded-2xl max-w-lg w-full p-5">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-row items-center gap-2 flex-1">
                <Users size={20} color="#7dd3fc" />
                <Text className="text-xl font-bold text-white">Why This Number?</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLimitModal(false)}>
                <Text className="text-2xl text-[#bdbdbd]">×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView className="max-h-96">
              <View className="gap-4">
                <Text className="text-sm text-[#f7f7f7] leading-6">
                  You might notice that the actual number of people who will receive your message is lower than what you selected. This is completely normal and happens for good reasons.
                </Text>
                
                <View className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <Text className="font-bold text-white mb-3 text-base">Here's What's Happening:</Text>
                  
                  <View className="gap-3">
                    <View>
                      <Text className="font-semibold text-white mb-1.5 text-sm">📱 We Skip People Without Phone Numbers</Text>
                      <Text className="text-sm text-[#bdbdbd] leading-5">
                        If someone doesn't have a phone number in their profile, we can't text them. Simple as that.
                      </Text>
                    </View>

                    <View>
                      <Text className="font-semibold text-white mb-1.5 text-sm">📅 We Focus on Active Clients</Text>
                      <Text className="text-sm text-[#bdbdbd] leading-5 mb-2">
                        People who haven't visited in a while probably aren't interested anymore, so we don't message them:
                      </Text>
                      <View className="ml-3 gap-1">
                        <Text className="text-sm text-[#bdbdbd]">• Campaign messages: Skip clients inactive for 8+ months</Text>
                        <Text className="text-sm text-[#bdbdbd]">• Mass messages: Skip clients inactive for 18+ months</Text>
                      </View>
                    </View>

                    <View>
                      <Text className="font-semibold text-white mb-1.5 text-sm">💳 Credit Limits Matter</Text>
                      <Text className="text-sm text-[#bdbdbd] leading-5">
                        You can only send as many messages as you have credits available. Even if you have 1,000 eligible clients, if you only have 500 credits, you can only message 500 people.
                      </Text>
                    </View>
                  </View>
                </View>
                            
                <View className="bg-lime-300/10 border border-lime-300/20 rounded-xl p-4">
                  <Text className="font-bold text-lime-300 mb-2 text-sm">✨ The Good News</Text>
                  <Text className="text-sm text-lime-200/90 leading-5">
                    These filters actually help you! You're only messaging people who are likely to be interested, which means better responses and less wasted credits. We're making sure your message reaches the right people at the right time.
                  </Text>
                </View>

                <View className="bg-sky-300/10 border border-sky-300/20 rounded-xl p-3.5">
                  <Text className="text-xs text-sky-200/90 leading-5">
                    <Text className="font-semibold">Example:</Text> You set the limit to 500 clients. But 50 don't have phone numbers, 100 haven't visited in over a year, and you only have 300 credits left. So the actual number sent will be 300 — the most effective use of your credits.
                  </Text>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              onPress={() => setShowLimitModal(false)}
              className="mt-5 px-6 py-3 rounded-xl bg-sky-300/20 border border-sky-300/30"
            >
              <Text className="text-sm font-bold text-sky-300 text-center">Got it, thanks!</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}