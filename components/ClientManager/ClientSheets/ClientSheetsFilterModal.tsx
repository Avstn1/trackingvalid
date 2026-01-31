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

export type FilterType =
  | 'first_name'
  | 'last_name'
  | 'email'
  | 'phone_normalized'
  | 'phone_available'
  | 'first_appt_month'
  | 'first_appt_year'
  | 'last_appt_month'
  | 'last_appt_year'
  | 'visiting_type'
  | 'sms_subscribed';

export type VisitingType = 'consistent' | 'semi-consistent' | 'easy-going' | 'rare' | 'new';

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

const COLORS = {
  background: '#1f1f1f',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  input: '#0d0f0d',
  lime: '#bef264',
};

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'first_name', label: 'First Name' },
  { value: 'last_name', label: 'Last Name' },
  { value: 'email', label: 'Email' },
  { value: 'phone_normalized', label: 'Phone' },
  { value: 'phone_available', label: 'Phone Available' },
  { value: 'first_appt_month', label: 'First Visit Month' },
  { value: 'first_appt_year', label: 'First Visit Year' },
  { value: 'last_appt_month', label: 'Last Visit Month' },
  { value: 'last_appt_year', label: 'Last Visit Year' },
  { value: 'visiting_type', label: 'Visiting Type' },
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

const VISITING_TYPES: { value: VisitingType; label: string }[] = [
  { value: 'consistent', label: 'Consistent' },
  { value: 'semi-consistent', label: 'Semi-Consistent' },
  { value: 'easy-going', label: 'Easy-Going' },
  { value: 'rare', label: 'Rare' },
  { value: 'new', label: 'New' },
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
  const [selectedType, setSelectedType] = useState<FilterType | ''>('first_name');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [currentRowId, setCurrentRowId] = useState<string>('');
  const [currentValue, setCurrentValue] = useState<string>('');

  const getLabelForValue = (type: FilterType, value: string | number | boolean): string => {
    if (type === 'first_appt_month' || type === 'last_appt_month') {
      const month = MONTHS.find((m) => m.value === Number(value));
      return month?.label || String(value);
    }
    if (type === 'visiting_type') {
      const vType = VISITING_TYPES.find((v) => v.value === value);
      return vType?.label || String(value);
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
          <Text className="text-[#555] text-sm text-center py-4">
            Please select a filter type first
          </Text>
        </View>
      );
    }

    // Text inputs
    if (
      type === 'first_name' ||
      type === 'last_name' ||
      type === 'email' ||
      type === 'phone_normalized'
    ) {
      return (
        <View className="mt-3">
          <Text className="text-white text-sm mb-2">
            Enter {FILTER_OPTIONS.find((f) => f.value === type)?.label}
          </Text>
          <TextInput
            value={currentValue}
            onChangeText={setCurrentValue}
            placeholder={`Enter ${FILTER_OPTIONS.find((f) => f.value === type)?.label.toLowerCase()}...`}
            placeholderTextColor="#555"
            className="px-4 py-3 rounded-xl border text-white text-sm"
            style={{
              backgroundColor: COLORS.input,
              borderColor: COLORS.glassBorder,
            }}
            autoCapitalize="none"
          />
          <TouchableOpacity
            onPress={() => {
              if (currentValue.trim()) {
                handleApplyFilter(type, currentValue.trim());
              }
            }}
            className="mt-3 py-3 px-4 rounded-xl bg-lime-300"
          >
            <Text className="text-black text-sm font-semibold text-center">
              Apply Filter
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    // Month selectors
    if (type === 'first_appt_month' || type === 'last_appt_month') {
      return (
        <View className="mt-3">
          <Text className="text-white text-sm mb-2">Select Month</Text>
          <ScrollView className="max-h-64">
            {MONTHS.map((month) => (
              <TouchableOpacity
                key={month.value}
                onPress={() => handleApplyFilter(type, month.value.toString())}
                className="py-3 px-4 rounded-xl mb-2"
                style={{
                  backgroundColor: COLORS.surface,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-white text-sm">{month.label}</Text>
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
          <Text className="text-white text-sm mb-2">Select Year</Text>
          <ScrollView className="max-h-64">
            {years.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => handleApplyFilter(type, year.toString())}
                className="py-3 px-4 rounded-xl mb-2"
                style={{
                  backgroundColor: COLORS.surface,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-white text-sm">{year}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    // Visiting type
    if (type === 'visiting_type') {
      return (
        <View className="mt-3">
          <Text className="text-white text-sm mb-2">Select Visiting Type</Text>
          {VISITING_TYPES.map((vType) => (
            <TouchableOpacity
              key={vType.value}
              onPress={() => handleApplyFilter(type, vType.value)}
              className="py-3 px-4 rounded-xl mb-2"
              style={{
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-white text-sm">{vType.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    // SMS subscribed / Phone available
    if (type === 'sms_subscribed' || type === 'phone_available') {
      return (
        <View className="mt-3">
          <Text className="text-white text-sm mb-2">Select Option</Text>
          {['Yes', 'No'].map((option) => (
            <TouchableOpacity
              key={option}
              onPress={() =>
                handleApplyFilter(type, option === 'Yes' ? 'true' : 'false')
              }
              className="py-3 px-4 rounded-xl mb-2"
              style={{
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-white text-sm">{option}</Text>
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
              backgroundColor: COLORS.background,
              borderTopWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-xl font-bold">Add Filter</Text>
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
              <Text className="text-white text-sm mb-2">Filter Type</Text>
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
                          : COLORS.surface,
                      borderWidth: 1,
                      borderColor:
                        selectedType === option.value
                          ? 'rgba(190, 242, 100, 0.4)'
                          : COLORS.glassBorder,
                    }}
                  >
                    <Text
                      className="text-xs font-medium"
                      style={{
                        color: selectedType === option.value ? COLORS.lime : '#fff',
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
                <Text className="text-white text-sm mb-2">Active Filters</Text>
                <View className="flex-row flex-wrap gap-2">
                  {activeFilters.map((filter) => (
                    <View
                      key={filter.id}
                      className="px-3 py-1.5 rounded-full bg-lime-300/10 border border-lime-300/30 flex-row items-center gap-2"
                    >
                      <Text className="text-lime-300 text-xs font-medium">{filter.label}</Text>
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
                  <Text className="text-red-300 text-sm font-semibold text-center">
                    Clear All Filters
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={onClose}
                className="flex-1 py-3 px-4 rounded-xl bg-lime-300"
              >
                <Text className="text-black text-sm font-semibold text-center">
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