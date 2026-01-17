import DateTimePicker from '@react-native-community/datetimepicker';
import { AlertCircle, Calendar, Clock, FileText, Hash, Info, Users, Zap } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
}: MessageScheduleProps) {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showHourPicker, setShowHourPicker] = useState(false);
  const [showMinutePicker, setShowMinutePicker] = useState(false);
  const [showPeriodPicker, setShowPeriodPicker] = useState(false);
  const [showLimitPicker, setShowLimitPicker] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
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
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 16 }}
    >
      <View className="space-y-4">
        {/* Campaign Type Selection */}
        <View>
          <View className="flex-row items-center mb-2">
            <Zap size={14} color="#bdbdbd" />
            <Text className="text-sm font-medium text-[#bdbdbd] ml-1">Algorithm Type</Text>
          </View>
          <View className="flex-row gap-2">
            {CAMPAIGN_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                onPress={() => handlepurposeChange(type.value)}
                disabled={!msg.isEditing}
                className={`flex-1 px-4 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${
                  msg.purpose === type.value
                    ? 'bg-sky-300/20 border-2 border-sky-300/50'
                    : 'bg-white/5 border-2 border-white/10'
                } ${!msg.isEditing ? 'opacity-70' : ''}`}
              >
                <Text className={`text-sm font-semibold ${
                  msg.purpose === type.value ? 'text-sky-300' : 'text-[#bdbdbd]'
                }`}>
                  {type.label}
                </Text>
                <Info size={14} color={msg.purpose === type.value ? '#7dd3fc' : '#bdbdbd'} />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Client Limit Selection */}
        <View>
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center">
              <Users size={14} color="#bdbdbd" />
              <Text className="text-sm font-medium text-[#bdbdbd] ml-1">
                Maximum Number of Clients to Message
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={() => setShowLimitPicker(true)}
            disabled={!msg.isEditing}
            className={`bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 ${
              !msg.isEditing ? 'opacity-70' : ''
            }`}
          >
            <Text className="text-base text-white">
              {showCustomInput 
                ? `Custom: ${msg.clientLimit.toLocaleString()} clients`
                : msg.clientLimit === getMaxLimit()
                  ? `Max (${Math.min(getMaxLimit(), maxClients).toLocaleString()} ${getMaxLimit() < maxClients ? 'credits' : 'clients'})`
                  : `${msg.clientLimit.toLocaleString()} clients`
              }
            </Text>
          </TouchableOpacity>

          {showCustomInput && (
            <View className="mt-2">
              <View className="relative">
                <View className="absolute left-3 top-1/2 -translate-y-1/2 z-10">
                  <Hash size={16} color="#bdbdbd" />
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
                  placeholder={`Enter custom limit (Min: 0, Max: ${getMaxLimit().toLocaleString()})`}
                  placeholderTextColor="#bdbdbd80"
                  className={`bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-base text-white ${
                    !msg.isEditing ? 'opacity-70' : ''
                  }`}
                />
              </View>
            </View>
          )}

          {previewCount >= 0 && (
            <View className="mt-2">
              <Text className="text-xs text-[#bdbdbd]">
                {msg.clientLimit === 0 
                  ? 0 
                  : Math.min(previewCount, availableCredits, msg.clientLimit)
                } clients will receive this message.{' '}
                <Text 
                  onPress={() => setShowLimitModal(true)}
                  className="italic text-sky-300/80"
                >
                  See why
                </Text>
              </Text>
            </View>
          )}

          {msg.clientLimit > availableCredits && (
            <Text className="text-xs text-rose-400 mt-2">
              ⚠️ You only have {availableCredits} credits available
            </Text>
          )}
        </View>

        {/* Schedule Date */}
        <View>
          <View className="flex-row items-center gap-2 mb-2">
            <View className="flex-row items-center flex-1">
              <Calendar size={14} color="#bdbdbd" />
              <Text className="text-sm font-medium text-[#bdbdbd] ml-1">Send Date</Text>
            </View>
            <TouchableOpacity onPress={() => setShowTooltip(!showTooltip)}>
              <AlertCircle size={14} color="#fbbf24" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            disabled={!msg.isEditing}
            className={`bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 ${
              !msg.isEditing ? 'opacity-70' : ''
            }`}
          >
            <Text className="text-base text-white">
              {msg.scheduleDate ? new Date(msg.scheduleDate + 'T00:00:00').toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }) : 'Select date'}
            </Text>
          </TouchableOpacity>

          {showDatePicker && (
            <DateTimePicker
              value={msg.scheduleDate ? new Date(msg.scheduleDate + 'T00:00:00') : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={now}
              maximumDate={maxDateTime}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  const dateString = selectedDate.toISOString().split('T')[0];
                  onUpdate(msg.id, { scheduleDate: dateString });
                }
              }}
            />
          )}
        </View>

        {/* Time Selection */}
        <View>
          <View className="flex-row items-center mb-2">
            <Clock size={14} color="#bdbdbd" />
            <Text className="text-sm font-medium text-[#bdbdbd] ml-1">Send Time</Text>
          </View>
          <View className="flex-row gap-2">
            {/* Hour */}
            <TouchableOpacity
              onPress={() => setShowHourPicker(true)}
              disabled={!msg.isEditing}
              className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 ${
                !msg.isEditing ? 'opacity-70' : ''
              }`}
            >
              <Text className="text-base text-white text-center">
                {msg.hour === 0 ? 12 : msg.hour}
              </Text>
            </TouchableOpacity>

            {/* Minute */}
            <TouchableOpacity
              onPress={() => setShowMinutePicker(true)}
              disabled={!msg.isEditing}
              className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 ${
                !msg.isEditing ? 'opacity-70' : ''
              }`}
            >
              <Text className="text-base text-white text-center">
                {msg.minute.toString().padStart(2, '0')}
              </Text>
            </TouchableOpacity>

            {/* Period */}
            <TouchableOpacity
              onPress={() => setShowPeriodPicker(true)}
              disabled={!msg.isEditing}
              className={`flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 ${
                !msg.isEditing ? 'opacity-70' : ''
              }`}
            >
              <Text className="text-base text-white text-center">
                {msg.period}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Action Buttons */}
        {msg.isEditing && (
          <View className="space-y-2">
            <View className="flex-row gap-2">
              {/* Save as Draft */}
              <TouchableOpacity
                onPress={() => onSave(msg.id, 'draft')}
                disabled={isSaving || msg.message.length < 100}
                className={`flex-1 flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl ${
                  isSaving || msg.message.length < 100
                    ? 'bg-gray-600/50'
                    : 'bg-amber-300/20 border border-amber-300/30'
                }`}
              >
                {isSaving && savingMode === 'draft' ? (
                  <ActivityIndicator size="small" color="#fbbf24" />
                ) : (
                  <FileText size={20} color="#fbbf24" />
                )}
                <Text className={`text-sm font-bold ${
                  isSaving || msg.message.length < 100 ? 'text-gray-400' : 'text-amber-300'
                }`}>
                  Save Draft
                </Text>
              </TouchableOpacity>

              {/* Activate Schedule */}
              <TouchableOpacity
                onPress={handleActivate}
                disabled={isSaving || msg.message.length < 100 || !msg.isValidated}
                className={`flex-1 flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl ${
                  isSaving || msg.message.length < 100 || !msg.isValidated
                    ? 'bg-gray-600/50'
                    : 'bg-gradient-to-r from-sky-300 to-lime-300'
                }`}
              >
                {isSaving && savingMode === 'activate' ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <Zap size={20} color="#000000" />
                )}
                <Text className={`text-sm font-bold ${
                  isSaving || msg.message.length < 100 || !msg.isValidated ? 'text-gray-400' : 'text-black'
                }`}>
                  Activate
                </Text>
              </TouchableOpacity>
            </View>

            {msg.isSaved && (
              <TouchableOpacity
                onPress={() => onCancelEdit(msg.id)}
                className="px-6 py-3 rounded-xl bg-white/5 border border-white/10"
              >
                <Text className="text-sm font-bold text-[#bdbdbd] text-center">Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Limit Picker Modal */}
      <Modal
        visible={showLimitPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLimitPicker(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowLimitPicker(false)}
        >
          <View className="bg-[#1a1a1a] rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-white mb-4">Select Client Limit</Text>
            <ScrollView className="max-h-80">
              {limitOptions.map((limit) => (
                <TouchableOpacity
                  key={limit}
                  onPress={() => {
                    handleLimitChange(limit);
                    setShowLimitPicker(false);
                  }}
                  className="py-4 border-b border-white/10"
                >
                  <Text className="text-base text-white">{limit.toLocaleString()} clients</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={() => {
                  handleLimitChange(-2);
                  setShowLimitPicker(false);
                }}
                className="py-4 border-b border-white/10"
              >
                <Text className="text-base text-white">
                  Max ({Math.min(getMaxLimit(), maxClients).toLocaleString()}{' '}
                  {getMaxLimit() < maxClients ? 'credits' : 'clients'})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  handleLimitChange(-1);
                  setShowLimitPicker(false);
                }}
                className="py-4"
              >
                <Text className="text-base text-white">Custom</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Hour Picker Modal */}
      <Modal
        visible={showHourPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHourPicker(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowHourPicker(false)}
        >
          <View className="bg-[#1a1a1a] rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-white mb-4">Select Hour</Text>
            <ScrollView className="max-h-80">
              {HOURS_12.map((hour) => (
                <TouchableOpacity
                  key={hour.value}
                  onPress={() => {
                    onUpdate(msg.id, { hour: hour.value });
                    setShowHourPicker(false);
                  }}
                  className="py-4 border-b border-white/10"
                >
                  <Text className="text-base text-white">{hour.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Minute Picker Modal */}
      <Modal
        visible={showMinutePicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowMinutePicker(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowMinutePicker(false)}
        >
          <View className="bg-[#1a1a1a] rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-white mb-4">Select Minute</Text>
            <ScrollView className="max-h-80">
              {MINUTES_15.map((minute) => (
                <TouchableOpacity
                  key={minute.value}
                  onPress={() => {
                    onUpdate(msg.id, { minute: minute.value });
                    setShowMinutePicker(false);
                  }}
                  className="py-4 border-b border-white/10"
                >
                  <Text className="text-base text-white">{minute.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Period Picker Modal */}
      <Modal
        visible={showPeriodPicker}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPeriodPicker(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/60 justify-end"
          activeOpacity={1}
          onPress={() => setShowPeriodPicker(false)}
        >
          <View className="bg-[#1a1a1a] rounded-t-3xl p-6">
            <Text className="text-xl font-bold text-white mb-4">Select Period</Text>
            {PERIODS.map((period) => (
              <TouchableOpacity
                key={period.value}
                onPress={() => {
                  onUpdate(msg.id, { period: period.value as 'AM' | 'PM' });
                  setShowPeriodPicker(false);
                }}
                className="py-4 border-b border-white/10"
              >
                <Text className="text-base text-white">{period.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Tooltip Modal */}
      <Modal
        visible={showTooltip}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTooltip(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/60 items-center justify-center p-4"
          activeOpacity={1}
          onPress={() => setShowTooltip(false)}
        >
          <View className="bg-[#0a0a0a] border border-amber-300/30 rounded-lg p-4 max-w-sm">
            <Text className="text-xs text-amber-200">
              Messages can only be scheduled up to 7 days from now with at least 5 minutes buffer (15-min intervals)
            </Text>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Limit Info Modal */}
      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <TouchableOpacity 
          className="flex-1 bg-black/80 items-center justify-center p-4"
          activeOpacity={1}
          onPress={() => setShowLimitModal(false)}
        >
          <View className="bg-[#1a1a1a] border border-white/20 rounded-2xl max-w-lg w-full p-6">
            <View className="flex-row items-start justify-between mb-4">
              <View className="flex-row items-center gap-2 flex-1">
                <Users size={20} color="#7dd3fc" />
                <Text className="text-xl font-bold text-white">Client Limit Explained</Text>
              </View>
              <TouchableOpacity onPress={() => setShowLimitModal(false)}>
                <Text className="text-2xl text-[#bdbdbd]">×</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView className="max-h-96">
              <View className="space-y-4">
                <Text className="text-sm text-[#bdbdbd]">
                  You might see that your client list is less than what you're expecting, and that's normal.
                </Text>
                
                <View className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <Text className="font-semibold text-white mb-2 text-sm">Here's how It Works:</Text>
                  <View className="space-y-2">
                    <View className="flex-row gap-2">
                      <Text className="text-white mt-1">•</Text>
                      <Text className="text-sm text-[#bdbdbd] flex-1">
                        For all lists, anyone with no numbers are automatically disqualified.
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Text className="text-white mt-1">•</Text>
                      <Text className="text-sm text-[#bdbdbd] flex-1">
                        For campaign lists, anyone who has not visited for more than 8 months are disqualified.
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Text className="text-white mt-1">•</Text>
                      <Text className="text-sm text-[#bdbdbd] flex-1">
                        For mass messages, the cut-off is at 1 year and 6 months of not visiting.
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <Text className="text-white mt-1">•</Text>
                      <Text className="text-sm text-[#bdbdbd] flex-1">
                        Your Maximum Number of Clients to Message is determined by whichever is higher: your available credits or the total number of eligible clients.
                      </Text>
                    </View>
                  </View>
                </View>
                            
                <View className="bg-amber-300/10 border border-amber-300/20 rounded-lg p-4">
                  <Text className="font-semibold text-amber-300 mb-2 text-sm">Important Notes:</Text>
                  <Text className="text-sm text-amber-200/80">
                    There are numerous processes that decide which clients are included, but rest assured that you are getting the right people to message.
                  </Text>
                </View>
              </View>
            </ScrollView>
            
            <TouchableOpacity
              onPress={() => setShowLimitModal(false)}
              className="mt-6 px-6 py-3 rounded-xl bg-sky-300/20 border border-sky-300/30"
            >
              <Text className="text-sm font-bold text-sky-300 text-center">Got it!</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}