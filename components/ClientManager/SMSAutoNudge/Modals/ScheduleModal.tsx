import { AlertCircle, ChevronDown, X } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  scheduleDayOfMonth: number;
  setScheduleDayOfMonth: (day: number) => void;
  scheduleHour: number;
  setScheduleHour: (hour: number) => void;
  scheduleMinute: number;
  setScheduleMinute: (minute: number) => void;
  schedulePeriod: 'AM' | 'PM';
  setSchedulePeriod: (period: 'AM' | 'PM') => void;
  scheduleStartDate: string;
  setScheduleStartDate: (date: string) => void;
  scheduleEndDate: string;
  setScheduleEndDate: (date: string) => void;
  onApply: () => void;
}

type SelectorType = 'day' | 'hour' | 'minute' | 'period' | null;

export default function ScheduleModal({
  isOpen,
  onClose,
  scheduleDayOfMonth,
  setScheduleDayOfMonth,
  scheduleHour,
  setScheduleHour,
  scheduleMinute,
  setScheduleMinute,
  schedulePeriod,
  setSchedulePeriod,
  scheduleStartDate,
  setScheduleStartDate,
  scheduleEndDate,
  setScheduleEndDate,
  onApply,
}: ScheduleModalProps) {
  const [activeSelector, setActiveSelector] = useState<SelectorType>(null);

  const getOrdinalSuffix = (day: number) => {
    if (day === 1) return 'st';
    if (day === 2) return 'nd';
    if (day === 3) return 'rd';
    return 'th';
  };

  const renderSelector = () => {
    if (!activeSelector) return null;

    let options: { label: string; value: any }[] = [];
    let onSelect: (value: any) => void = () => {};

    switch (activeSelector) {
      case 'day':
        options = Array.from({ length: 31 }, (_, i) => ({
          label: (i + 1).toString(),
          value: i + 1,
        }));
        onSelect = setScheduleDayOfMonth;
        break;
      case 'hour':
        options = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((h) => ({
          label: h === 0 ? '12' : h.toString(),
          value: h,
        }));
        onSelect = setScheduleHour;
        break;
      case 'minute':
        options = [0, 15, 30, 45].map((m) => ({
          label: m.toString().padStart(2, '0'),
          value: m,
        }));
        onSelect = setScheduleMinute;
        break;
      case 'period':
        options = [
          { label: 'AM', value: 'AM' },
          { label: 'PM', value: 'PM' },
        ];
        onSelect = setSchedulePeriod;
        break;
    }

    return (
      <Modal
        visible={true}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveSelector(null)}
      >
        <Pressable
          className="flex-1 bg-black/70 justify-end"
          onPress={() => setActiveSelector(null)}
        >
          <Animated.View entering={FadeIn} exiting={FadeOut}>
            <Pressable onPress={(e) => e.stopPropagation()}>
              <View className="bg-[#1e1e1e] border-t border-white/10 rounded-t-2xl">
                <View className="flex-row items-center justify-between p-4 border-b border-white/10">
                  <Text className="text-lg font-semibold text-white">
                    Select {activeSelector === 'day' ? 'Day' : activeSelector === 'hour' ? 'Hour' : activeSelector === 'minute' ? 'Minute' : 'Period'}
                  </Text>
                  <TouchableOpacity onPress={() => setActiveSelector(null)}>
                    <X color="#888" size={20} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={{ maxHeight: 300 }}>
                  {options.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      className="p-4 border-b border-white/5 active:bg-white/5"
                      onPress={() => {
                        onSelect(option.value);
                        setActiveSelector(null);
                      }}
                    >
                      <Text className="text-white text-center text-base">
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    );
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-center items-center p-4" onPress={onClose}>
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="w-full max-w-lg"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-[#1e1e1e] border border-white/10 rounded-xl overflow-hidden">
              {/* Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/10">
                <View className="flex-1">
                  <Text className="text-lg font-semibold text-white">Monthly Schedule</Text>
                  <Text className="text-xs text-gray-400 mt-1">Set when messages are sent</Text>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2">
                  <X color="#888" size={20} />
                </TouchableOpacity>
              </View>

              {/* Body */}
              <View style={{ maxHeight: 500 }}>
                <ScrollView 
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ padding: 16 }}
                >
                  {/* Day of Month */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-white mb-2">Day of Month *</Text>
                    <TouchableOpacity
                      className="bg-black/20 border border-white/10 rounded-lg p-3 flex-row items-center justify-between"
                      onPress={() => setActiveSelector('day')}
                    >
                      <Text className="text-white text-base">{scheduleDayOfMonth}</Text>
                      <ChevronDown color="#888" size={18} />
                    </TouchableOpacity>
                    {scheduleDayOfMonth > 28 && (
                      <View className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex-row gap-2">
                        <AlertCircle color="#eab308" size={14} style={{ marginTop: 2 }} />
                        <Text className="text-xs text-yellow-200 flex-1">
                          In shorter months, message sends on the last day.
                        </Text>
                      </View>
                    )}
                    <Text className="text-xs text-gray-500 mt-1">
                      Sends on the {scheduleDayOfMonth}{getOrdinalSuffix(scheduleDayOfMonth)} of each month
                    </Text>
                  </View>

                  {/* Time */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-white mb-2">Time *</Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg p-3 flex-row items-center justify-between"
                        onPress={() => setActiveSelector('hour')}
                      >
                        <Text className="text-white text-base">
                          {scheduleHour === 0 ? '12' : scheduleHour}
                        </Text>
                        <ChevronDown color="#888" size={18} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg p-3 flex-row items-center justify-between"
                        onPress={() => setActiveSelector('minute')}
                      >
                        <Text className="text-white text-base">
                          {scheduleMinute.toString().padStart(2, '0')}
                        </Text>
                        <ChevronDown color="#888" size={18} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        className="flex-1 bg-black/20 border border-white/10 rounded-lg p-3 flex-row items-center justify-between"
                        onPress={() => setActiveSelector('period')}
                      >
                        <Text className="text-white text-base">{schedulePeriod}</Text>
                        <ChevronDown color="#888" size={18} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Start Date */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-white mb-2">Start Date *</Text>
                    <View className="bg-black/20 border border-white/10 rounded-lg p-3">
                      <Text className="text-white">
                        {scheduleStartDate || 'YYYY-MM-DD'}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1">When to start sending</Text>
                  </View>

                  {/* End Date */}
                  <View className="mb-4">
                    <Text className="text-sm font-medium text-white mb-2">
                      End Date <Text className="text-gray-500">(Optional)</Text>
                    </Text>
                    <View className="bg-black/20 border border-white/10 rounded-lg p-3">
                      <Text className="text-white">
                        {scheduleEndDate || 'YYYY-MM-DD'}
                      </Text>
                    </View>
                    <Text className="text-xs text-gray-500 mt-1">When to stop sending</Text>
                  </View>

                  {/* Summary */}
                  <View className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                    <Text className="text-sm text-purple-300">
                      Sends on day {scheduleDayOfMonth} at {scheduleHour === 0 ? 12 : scheduleHour}:{scheduleMinute.toString().padStart(2, '0')} {schedulePeriod} monthly
                    </Text>
                  </View>
                </ScrollView>
              </View>

              {/* Footer */}
              <View className="flex-row justify-end gap-3 p-4 border-t border-white/10">
                <TouchableOpacity
                  onPress={onClose}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg"
                >
                  <Text className="text-gray-400 font-medium">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onApply}
                  disabled={!scheduleDayOfMonth || !scheduleStartDate}
                  className={`px-4 py-2 rounded-lg ${
                    (!scheduleDayOfMonth || !scheduleStartDate) 
                      ? 'bg-purple-500/20 opacity-50' 
                      : 'bg-purple-500/30 border border-purple-500/40'
                  }`}
                >
                  <Text className="text-purple-300 font-medium">Apply</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
      
      {renderSelector()}
    </Modal>
  );
}