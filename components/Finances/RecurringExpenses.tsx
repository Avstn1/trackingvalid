// components/Finances/RecurringExpenses.tsx
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface RecurringExpensesProps {
  barberId: string;
  month: string;
  year: number;
  onUpdate?: () => void;
}

type Frequency = 'once' | 'weekly' | 'monthly' | 'yearly';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function RecurringExpenses({
  barberId,
  month,
  year,
  onUpdate,
}: RecurringExpensesProps) {
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [monthlyDay, setMonthlyDay] = useState('1');
  const [yearlyMonth, setYearlyMonth] = useState(0);
  const [yearlyDay, setYearlyDay] = useState('1');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setTempEndDate(selectedDate);
    }
  };

  const confirmStartDate = () => {
    setStartDate(tempStartDate);
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    setEndDate(tempEndDate);
    setShowEndPicker(false);
  };

  const clearEndDate = () => {
    setEndDate(null);
    setShowEndPicker(false);
  };

  const handleSave = async () => {
    // Validation
    if (!label.trim()) {
      Alert.alert('Error', 'Enter a label');
      return;
    }
    if (!amount || isNaN(parseFloat(amount))) {
      Alert.alert('Error', 'Enter a valid amount');
      return;
    }
    if (frequency === 'monthly') {
      const day = parseInt(monthlyDay);
      if (day < 1 || day > 31) {
        Alert.alert('Error', 'Monthly day must be 1–31');
        return;
      }
    }
    if (frequency === 'yearly') {
      const day = parseInt(yearlyDay);
      if (day < 1 || day > 31) {
        Alert.alert('Error', 'Yearly day must be 1–31');
        return;
      }
    }

    const payload = {
      user_id: barberId,
      label: label.trim(),
      amount: parseFloat(amount),
      frequency,
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate ? endDate.toISOString().split('T')[0] : null,
      weekly_days: frequency === 'weekly' ? selectedDays : null,
      monthly_day: frequency === 'monthly' ? parseInt(monthlyDay) : null,
      yearly_month: frequency === 'yearly' ? yearlyMonth : null,
      yearly_day: frequency === 'yearly' ? parseInt(yearlyDay) : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setLoading(true);
    try {
      const { error } = await supabase.from('recurring_expenses').insert(payload);
      if (error) throw error;
      
      Alert.alert('Success', 'Recurring expense added!');

      // Reset form
      setLabel('');
      setAmount('');
      setFrequency('once');
      setSelectedDays([]);
      setMonthlyDay('1');
      setYearlyMonth(0);
      setYearlyDay('1');
      setStartDate(new Date());
      setEndDate(null);
      onUpdate?.();

      await supabase.from('system_logs').insert({
        source: barberId,
        action: 'expense_added',
        status: 'success',
        details: 'Recurring expense added',
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to add recurring expense');
    }
    setLoading(false);
  };

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="gap-4">
        {/* Label Input */}
        <View>
          <Text className="text-zinc-400 text-xs mb-2">Expense Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g., Rent, Insurance"
            placeholderTextColor="#71717a"
            className="px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700"
          />
        </View>

        {/* Amount Input */}
        <View>
          <Text className="text-zinc-400 text-xs mb-2">Amount</Text>
          <TextInput
            value={amount}
            onChangeText={(text) => {
              if (/^\d*\.?\d{0,2}$/.test(text)) {
                setAmount(text);
              }
            }}
            placeholder="0.00"
            placeholderTextColor="#71717a"
            keyboardType="decimal-pad"
            className="px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700"
          />
        </View>

        {/* Frequency */}
        <View>
          <Text className="text-zinc-400 text-xs mb-2">Frequency</Text>
          <View className="flex-row flex-wrap gap-2">
            {(['once', 'weekly', 'monthly', 'yearly'] as Frequency[]).map((freq) => (
              <TouchableOpacity
                key={freq}
                onPress={() => setFrequency(freq)}
                className={`px-4 py-2 rounded-lg ${
                  frequency === freq
                    ? 'bg-lime-400/20 border-lime-400'
                    : 'bg-zinc-800 border-zinc-700'
                } border`}
              >
                <Text
                  className={`font-semibold ${
                    frequency === freq ? 'text-lime-300' : 'text-zinc-400'
                  }`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Weekly Days */}
        {frequency === 'weekly' && (
          <View>
            <Text className="text-zinc-400 text-xs mb-2">Select Days</Text>
            <View className="flex-row flex-wrap gap-2">
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleDayToggle(day)}
                  className={`px-3 py-2 rounded-lg ${
                    selectedDays.includes(day)
                      ? 'bg-lime-400/20 border-lime-400'
                      : 'bg-zinc-800 border-zinc-700'
                  } border`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      selectedDays.includes(day) ? 'text-lime-300' : 'text-zinc-400'
                    }`}
                  >
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Monthly Day */}
        {frequency === 'monthly' && (
          <View>
            <Text className="text-zinc-400 text-xs mb-2">Day of Month</Text>
            <TextInput
              value={monthlyDay}
              onChangeText={(text) => {
                const num = parseInt(text);
                if (!isNaN(num) && num >= 1 && num <= 31) {
                  setMonthlyDay(text);
                } else if (text === '') {
                  setMonthlyDay('');
                }
              }}
              placeholder="1-31"
              placeholderTextColor="#71717a"
              keyboardType="number-pad"
              className="px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 w-24"
            />
          </View>
        )}

        {/* Yearly Month & Day */}
        {frequency === 'yearly' && (
          <View className="gap-3">
            <View>
              <Text className="text-zinc-400 text-xs mb-2">Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {MONTHS.map((m, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setYearlyMonth(idx)}
                      className={`px-3 py-2 rounded-lg ${
                        yearlyMonth === idx
                          ? 'bg-lime-400/20 border-lime-400'
                          : 'bg-zinc-800 border-zinc-700'
                      } border`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          yearlyMonth === idx
                            ? 'text-lime-300'
                            : 'text-zinc-400'
                        }`}
                      >
                        {m.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View>
              <Text className="text-zinc-400 text-xs mb-2">Day of Month</Text>
              <TextInput
                value={yearlyDay}
                onChangeText={(text) => {
                  const num = parseInt(text);
                  if (!isNaN(num) && num >= 1 && num <= 31) {
                    setYearlyDay(text);
                  } else if (text === '') {
                    setYearlyDay('');
                  }
                }}
                placeholder="1-31"
                placeholderTextColor="#71717a"
                keyboardType="number-pad"
                className="px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 w-24"
              />
            </View>
          </View>
        )}

        {/* Start Date */}
        <View>
          <Text className="text-zinc-400 text-xs mb-2">Start Date</Text>
          <TouchableOpacity
            onPress={() => {
              setTempStartDate(startDate);
              setShowStartPicker(true);
            }}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700"
          >
            <Calendar size={16} color="#c4ff85" />
            <Text className="text-white font-medium">
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Date */}
        <View>
          <Text className="text-zinc-400 text-xs mb-2">End Date (Optional)</Text>
          <TouchableOpacity
            onPress={() => {
              setTempEndDate(endDate || new Date());
              setShowEndPicker(true);
            }}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl bg-zinc-800 border border-zinc-700"
          >
            <Calendar size={16} color="#c4ff85" />
            <Text className="text-white font-medium">
              {endDate ? endDate.toLocaleDateString() : 'Not set'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className="bg-lime-400 py-3 rounded-xl mt-2"
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-center text-black font-bold">
              Add Recurring Expense
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Start Date Picker Modal */}
      <Modal
        visible={showStartPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowStartPicker(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-zinc-900 rounded-2xl p-6 w-[90%] max-w-md">
            <Text className="text-white text-lg font-semibold mb-4 text-center">
              Select Start Date
            </Text>
            <View className="bg-zinc-800 rounded-xl overflow-hidden">
              <DateTimePicker
                value={tempStartDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
                textColor="#ffffff"
                themeVariant="dark"
              />
            </View>
            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={() => setShowStartPicker(false)}
                className="flex-1 bg-zinc-700 py-3 rounded-full"
              >
                <Text className="text-center text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmStartDate}
                className="flex-1 bg-lime-400 py-3 rounded-full"
              >
                <Text className="text-center text-black font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* End Date Picker Modal */}
      <Modal
        visible={showEndPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEndPicker(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-zinc-900 rounded-2xl p-6 w-[90%] max-w-md">
            <Text className="text-white text-lg font-semibold mb-4 text-center">
              Select End Date
            </Text>
            <View className="bg-zinc-800 rounded-xl overflow-hidden">
              <DateTimePicker
                value={tempEndDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
                textColor="#ffffff"
                themeVariant="dark"
              />
            </View>
            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={clearEndDate}
                className="flex-1 bg-red-600 py-3 rounded-full"
              >
                <Text className="text-center text-white font-semibold">Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowEndPicker(false)}
                className="flex-1 bg-zinc-700 py-3 rounded-full"
              >
                <Text className="text-center text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmEndDate}
                className="flex-1 bg-lime-400 py-3 rounded-full"
              >
                <Text className="text-center text-black font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}