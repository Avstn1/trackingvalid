import { ChevronDown } from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { DAYS_OF_MONTH, DAYS_OF_WEEK, HOURS_12, MINUTES, PERIODS, SMSMessage } from './types';

interface MessageScheduleProps {
  message: SMSMessage;
  onUpdate: (id: string, updates: Partial<SMSMessage>) => void;
}

type DropdownType = 'frequency' | 'day' | 'hour' | 'minute' | 'period' | null;

export function MessageSchedule({
  message: msg,
  onUpdate,
}: MessageScheduleProps) {
  const [activeDropdown, setActiveDropdown] = useState<DropdownType>(null);

  const renderDropdown = (type: DropdownType, options: any[], currentValue: any, onSelect: (value: any) => void) => {
    return (
      <Modal
        visible={activeDropdown === type}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveDropdown(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setActiveDropdown(null)}
          className="flex-1 bg-black/50"
        >
          <View className="flex-1 justify-center items-center px-6">
            <View className="bg-[#1a1a1a] rounded-2xl w-full max-w-sm border border-white/10">
              <ScrollView className="max-h-80">
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      setActiveDropdown(null);
                    }}
                    className={`px-4 py-3 border-b border-white/5 ${
                      currentValue === option.value ? 'bg-sky-300/20' : ''
                    }`}
                  >
                    <Text className={`text-base ${currentValue === option.value ? 'text-sky-300 font-semibold' : 'text-white'}`}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  const getFrequencyLabel = () => {
    const labels = { weekly: 'Weekly', biweekly: 'Bi-weekly', monthly: 'Monthly' };
    return labels[msg.frequency];
  };

  const getDayLabel = () => {
    if (msg.frequency === 'monthly') {
      return msg.dayOfMonth?.toString() || '1';
    }
    return DAYS_OF_WEEK.find((d) => d.value === msg.dayOfWeek)?.label || 'Monday';
  };

  const displayHour = msg.hour === 0 ? 12 : msg.hour > 12 ? msg.hour - 12 : msg.hour;

  return (
    <View className="gap-3">
      {/* Frequency & Day Row */}
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Text className="text-sm text-[#bdbdbd] mb-1">Frequency</Text>
          <TouchableOpacity
            onPress={() => msg.isEditing && setActiveDropdown('frequency')}
            disabled={!msg.isEditing}
            className={`bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-row items-center justify-between ${
              !msg.isEditing ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-white text-base">{getFrequencyLabel()}</Text>
            <ChevronDown color="#7dd3fc" size={14} />
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-sm text-[#bdbdbd] mb-1">
            {msg.frequency === 'monthly' ? 'Day' : 'Day'}
          </Text>
          <TouchableOpacity
            onPress={() => msg.isEditing && setActiveDropdown('day')}
            disabled={!msg.isEditing}
            className={`bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-row items-center justify-between ${
              !msg.isEditing ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-white text-base">{getDayLabel()}</Text>
            <ChevronDown color="#7dd3fc" size={14} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Time Row */}
      <View>
        <Text className="text-sm text-[#bdbdbd] mb-1">Time</Text>
        <View className="flex-row gap-2">
          {/* Hour */}
          <TouchableOpacity
            onPress={() => msg.isEditing && setActiveDropdown('hour')}
            disabled={!msg.isEditing}
            className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-row items-center justify-between ${
              !msg.isEditing ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-white text-base">{displayHour.toString().padStart(2, '0')}</Text>
            <ChevronDown color="#7dd3fc" size={14} />
          </TouchableOpacity>

          {/* Minute */}
          <TouchableOpacity
            onPress={() => msg.isEditing && setActiveDropdown('minute')}
            disabled={!msg.isEditing}
            className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-row items-center justify-between ${
              !msg.isEditing ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-white text-base">{msg.minute.toString().padStart(2, '0')}</Text>
            <ChevronDown color="#7dd3fc" size={14} />
          </TouchableOpacity>

          {/* AM/PM */}
          <TouchableOpacity
            onPress={() => msg.isEditing && setActiveDropdown('period')}
            disabled={!msg.isEditing}
            className={`flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 flex-row items-center justify-between ${
              !msg.isEditing ? 'opacity-50' : ''
            }`}
          >
            <Text className="text-white text-base">{msg.period}</Text>
            <ChevronDown color="#7dd3fc" size={14} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdowns */}
      {renderDropdown(
        'frequency',
        [
          { value: 'weekly', label: 'Weekly' },
          { value: 'biweekly', label: 'Bi-weekly' },
          { value: 'monthly', label: 'Monthly' },
        ],
        msg.frequency,
        (value) => onUpdate(msg.id, { frequency: value as SMSMessage['frequency'] })
      )}

      {renderDropdown(
        'day',
        msg.frequency === 'monthly' ? DAYS_OF_MONTH : DAYS_OF_WEEK,
        msg.frequency === 'monthly' ? msg.dayOfMonth : msg.dayOfWeek,
        (value) =>
          msg.frequency === 'monthly'
            ? onUpdate(msg.id, { dayOfMonth: parseInt(value) })
            : onUpdate(msg.id, { dayOfWeek: value })
      )}

      {renderDropdown('hour', HOURS_12, displayHour, (value) => onUpdate(msg.id, { hour: parseInt(value) }))}

      {renderDropdown('minute', MINUTES, msg.minute, (value) =>
        onUpdate(msg.id, { minute: parseInt(value) })
      )}

      {renderDropdown('period', PERIODS, msg.period, (value) => onUpdate(msg.id, { period: value as 'AM' | 'PM' }))}
    </View>
  );
}
