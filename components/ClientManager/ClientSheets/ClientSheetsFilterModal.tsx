import { COLORS } from '@/constants/design-system';
import { X } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

// Advanced filters only - name/phone/email handled by search bar, visiting_type by quick chips
export type FilterType =
  | 'phone_available'
  | 'first_appt_month'
  | 'first_appt_year'
  | 'last_appt_month'
  | 'last_appt_year'
  | 'sms_subscribed';

export interface ActiveFilter {
  id: string;
  type: FilterType;
  value: string | number | boolean;
  label: string;
}

interface FilterRow {
  id: string;
  type: FilterType | '';
  value: string;
}

interface ClientSheetsFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeFilters: ActiveFilter[];
  onFiltersChange: (filters: ActiveFilter[]) => void;
  minYear: number;
}

// Component-specific accent colors
const ACCENT_COLORS = {
  input: '#0d0f0d',
  lime: '#bef264',
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'phone_available', label: 'Phone Available' },
  { value: 'first_appt_month', label: 'First Visit Month' },
  { value: 'first_appt_year', label: 'First Visit Year' },
  { value: 'last_appt_month', label: 'Last Visit Month' },
  { value: 'last_appt_year', label: 'Last Visit Year' },
  { value: 'sms_subscribed', label: 'SMS Subscribed' },
];

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];



export default function ClientSheetsFilterModal({
  isOpen,
  onClose,
  activeFilters,
  onFiltersChange,
  minYear,
}: ClientSheetsFilterModalProps) {
  const [filterRows, setFilterRows] = useState<FilterRow[]>([
    { id: Date.now().toString(), type: '', value: '' },
  ]);
  const [selectedType, setSelectedType] = useState<FilterType | ''>('phone_available');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [currentRowId, setCurrentRowId] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');

  const getLabelForValue = (type: FilterType, value: string | number | boolean): string => {
    if (type === 'first_appt_month' || type === 'last_appt_month') {
      const month = MONTHS.find((m) => m.value === Number(value));
      return month?.label || String(value);
    }
    if (type === 'sms_subscribed' || type === 'phone_available') {
      return value === 'true' ? 'Yes' : 'No';
    }
    return String(value);
  };

  const addOrUpdateFilter = (type: FilterType, value: string) => {
    if (!type || !value) return;

    const filterOption = FILTER_OPTIONS.find((f) => f.value === type);
    if (!filterOption) return;

    const newFilter: ActiveFilter = {
      id: `${type}-${Date.now()}`,
      type: type,
      value: value,
      label: `${filterOption.label}: ${getLabelForValue(type, value)}`,
    };

    const otherFilters = activeFilters.filter((f) => f.type !== type);
    onFiltersChange([...otherFilters, newFilter]);
  };

  const handleApplyFilter = (type: FilterType | '', value: string) => {
    if (!type || !value) return;
    addOrUpdateFilter(type as FilterType, value);
    // Keep the same filter type, only reset the value
    setCurrentValue('');
  };

  const renderValueInput = (type: FilterType | '') => {
    if (!type) {
      return (
        <View className="mt-3">
          <Text className="text-[#555] text-base text-center py-4">
            Please select a filter type first
          </Text>
        </View>
      );
    }

    // Month selectors
    if (type === 'first_appt_month' || type === 'last_appt_month') {
      return (
        <View className="mt-3">
          <Text className="text-white text-base mb-2">Select Month</Text>
          <ScrollView className="max-h-64">
            {MONTHS.map((month) => (
              <TouchableOpacity
                key={month.value}
                onPress={() => handleApplyFilter(type, month.value.toString())}
                className="py-3 px-4 rounded-xl mb-2"
                style={{
                  backgroundColor: COLORS.surfaceGlass,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-white text-base">{month.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    // Year selectors
    if (type === 'first_appt_year' || type === 'last_appt_year') {
      const currentYear = new Date().getFullYear();
      const yearCount = currentYear - minYear + 1;
      const years = Array.from({ length: yearCount }, (_, i) => currentYear - i);

      return (
        <View className="mt-3">
          <Text className="text-white text-base mb-2">Select Year</Text>
          <ScrollView className="max-h-64">
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => handleApplyFilter(type, year.toString())}
                className="py-3 px-4 rounded-xl mb-2"
                style={{
                  backgroundColor: COLORS.surfaceGlass,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-white text-base">{year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    // SMS subscribed / Phone available
    if (type === 'sms_subscribed' || type === 'phone_available') {
      return (
        <View className="mt-3">
          <Text className="text-white text-base mb-2">Select Option</Text>
          {['Yes', 'No'].map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() =>
                handleApplyFilter(type, option === 'Yes' ? 'true' : 'false')
              }
              className="py-3 px-4 rounded-xl mb-2"
              style={{
                backgroundColor: COLORS.surfaceGlass,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-white text-base">{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={isOpen}
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)', paddingTop: '50%' }}
        onPress={onClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View
            className="flex-1 rounded-t-3xl p-6"
            style={{
              backgroundColor: COLORS.surface,
              borderTopWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">Advanced Filters</Text>
            <TouchableOpacity
              onPress={onClose}
              className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
            >
              <X color="#fff" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Filter Type Selection */}
            <View>
              <Text className="text-white text-base mb-2">Filter Type</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
              >
                {FILTER_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => setSelectedType(option.value)}
                    className="px-4 py-2 rounded-full"
                    style={{
                      backgroundColor:
                        selectedType === option.value
                          ? 'rgba(190, 242, 100, 0.2)'
                          : COLORS.surfaceGlass,
                      borderWidth: 1,
                      borderColor:
                        selectedType === option.value
                          ? 'rgba(190, 242, 100, 0.4)'
                          : COLORS.glassBorder,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{
                        color: selectedType === option.value ? ACCENT_COLORS.lime : '#fff',
                      }}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Value Input */}
            {renderValueInput(selectedType)}

            {/* Active Filters in Modal - Grouped with content */}
            {activeFilters.length > 0 && (
              <View className="mt-6 pt-4 border-t border-white/10">
                <Text className="text-white text-base mb-2">Active Filters</Text>
                <View className="flex-row flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <View
                      key={filter.id}
                      className="px-3 py-1.5 rounded-full bg-lime-300/10 border border-lime-300/30 flex-row items-center gap-2"
                    >
                      <Text className="text-lime-300 text-sm font-medium">{filter.label}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const newFilters = activeFilters.filter((f) => f.id !== filter.id);
                          onFiltersChange(newFilters);
                        }}
                      >
                        <X size={12} color="#bef264" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Clear All & Done Buttons - Inside ScrollView */}
            <View className="flex-row gap-2 mt-6 mb-4">
              {activeFilters.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    onFiltersChange([]);
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-red-500/10 border border-red-500/30"
                >
                  <Text className="text-red-300 text-base font-semibold text-center">
                    Clear All Filters
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-lime-300"
              >
                <Text className="text-black text-base font-semibold text-center">
                  Done
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}
