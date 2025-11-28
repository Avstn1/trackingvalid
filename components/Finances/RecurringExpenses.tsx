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

// Color Palette
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.2)',
  purple: '#9C27B0',
  purpleGlow: 'rgba(156, 39, 176, 0.2)',
  red: '#dc2626',
};

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

  const handleDayToggle = (day: string) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartPicker(false);
    }
    if (selectedDate) {
      setStartDate(selectedDate);
      // If end date exists and new start date is after it, clear end date
      if (endDate && selectedDate > endDate) {
        setEndDate(null);
        Alert.alert('Notice', 'End date cleared as start date must be before end date');
      }
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndPicker(false);
    }
    if (selectedDate) {
      // Validate that end date is after start date
      if (selectedDate <= startDate) {
        Alert.alert('Error', 'End date must be after start date');
      } else {
        setEndDate(selectedDate);
      }
    }
  };

  const confirmStartDate = () => {
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
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
    // Validate dates
    if (endDate && endDate <= startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
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
          <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Expense Label</Text>
          <TextInput
            value={label}
            onChangeText={setLabel}
            placeholder="e.g., Rent, Insurance"
            placeholderTextColor={COLORS.textMuted}
            className="px-4 py-3 rounded-xl"
            style={{
              backgroundColor: COLORS.surfaceSolid,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          />
        </View>

        {/* Amount Input */}
        <View>
          <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Amount</Text>
          <TextInput
            value={amount}
            onChangeText={(text) => {
              if (/^\d*\.?\d{0,2}$/.test(text)) {
                setAmount(text);
              }
            }}
            placeholder="0.00"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="decimal-pad"
            className="px-4 py-3 rounded-xl"
            style={{
              backgroundColor: COLORS.surfaceSolid,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          />
        </View>

        {/* Frequency */}
        <View>
          <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Frequency</Text>
          <View className="flex-row flex-wrap gap-2">
            {(['once', 'weekly', 'monthly', 'yearly'] as Frequency[]).map((freq) => (
              <TouchableOpacity
                key={freq}
                onPress={() => setFrequency(freq)}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: frequency === freq ? COLORS.orangeGlow : COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: frequency === freq ? COLORS.orange : COLORS.glassBorder,
                }}
              >
                <Text
                  className="font-semibold"
                  style={{ color: frequency === freq ? COLORS.orange : COLORS.textMuted }}
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
            <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Select Days</Text>
            <View className="flex-row flex-wrap gap-2">
              {DAYS.map((day) => (
                <TouchableOpacity
                  key={day}
                  onPress={() => handleDayToggle(day)}
                  className="px-3 py-2 rounded-lg"
                  style={{
                    backgroundColor: selectedDays.includes(day) ? COLORS.purpleGlow : COLORS.surfaceSolid,
                    borderWidth: 1,
                    borderColor: selectedDays.includes(day) ? COLORS.purple : COLORS.glassBorder,
                  }}
                >
                  <Text
                    className="text-xs font-semibold"
                    style={{ color: selectedDays.includes(day) ? COLORS.purple : COLORS.textMuted }}
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
            <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Day of Month</Text>
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
              placeholderTextColor={COLORS.textMuted}
              keyboardType="number-pad"
              className="px-4 py-3 rounded-xl w-24"
              style={{
                backgroundColor: COLORS.surfaceSolid,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            />
          </View>
        )}

        {/* Yearly Month & Day */}
        {frequency === 'yearly' && (
          <View className="gap-3">
            <View>
              <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Month</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {MONTHS.map((m, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => setYearlyMonth(idx)}
                      className="px-3 py-2 rounded-lg"
                      style={{
                        backgroundColor: yearlyMonth === idx ? COLORS.purpleGlow : COLORS.surfaceSolid,
                        borderWidth: 1,
                        borderColor: yearlyMonth === idx ? COLORS.purple : COLORS.glassBorder,
                      }}
                    >
                      <Text
                        className="text-xs font-semibold"
                        style={{ color: yearlyMonth === idx ? COLORS.purple : COLORS.textMuted }}
                      >
                        {m.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
            <View>
              <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Day of Month</Text>
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
                placeholderTextColor={COLORS.textMuted}
                keyboardType="number-pad"
                className="px-4 py-3 rounded-xl w-24"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  color: COLORS.text,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              />
            </View>
          </View>
        )}

        {/* Start Date */}
        <View>
          <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Start Date</Text>
          <TouchableOpacity
            onPress={() => setShowStartPicker(true)}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl"
            style={{
              backgroundColor: COLORS.surfaceSolid,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <Calendar size={16} color={COLORS.orange} />
            <Text className="font-medium" style={{ color: COLORS.text }}>
              {startDate.toLocaleDateString()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* End Date */}
        <View>
          <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>End Date (Optional)</Text>
          <TouchableOpacity
            onPress={() => setShowEndPicker(true)}
            className="flex-row items-center gap-2 px-4 py-3 rounded-xl"
            style={{
              backgroundColor: COLORS.surfaceSolid,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <Calendar size={16} color={COLORS.orange} />
            <Text className="font-medium" style={{ color: COLORS.text }}>
              {endDate ? endDate.toLocaleDateString() : 'Not set'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          className="py-3 rounded-xl mt-2"
          style={{
            backgroundColor: COLORS.purple,
            opacity: loading ? 0.6 : 1,
            shadowColor: COLORS.purple,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.4,
            shadowRadius: 12,
            elevation: 5,
          }}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.text} />
          ) : (
            <Text className="text-center font-bold" style={{ color: COLORS.text }}>
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
          <View 
            className="rounded-2xl p-6 w-[90%] max-w-md overflow-hidden"
            style={{
              backgroundColor: COLORS.cardBg,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <View 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: COLORS.glassHighlight,
              }}
            />
            <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
              Select Start Date
            </Text>
            <View 
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: COLORS.surfaceSolid,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <DateTimePicker
                value={startDate}
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
                className="flex-1 py-3 rounded-full"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Cancel</Text>
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={confirmStartDate}
                  className="flex-1 py-3 rounded-full"
                  style={{ backgroundColor: COLORS.orange }}
                >
                  <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
                </TouchableOpacity>
              )}
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
          <View 
            className="rounded-2xl p-6 w-[90%] max-w-md overflow-hidden"
            style={{
              backgroundColor: COLORS.cardBg,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <View 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: COLORS.glassHighlight,
              }}
            />
            <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
              Select End Date
            </Text>
            <View 
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: COLORS.surfaceSolid,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
                textColor="#ffffff"
                themeVariant="dark"
                minimumDate={new Date(startDate.getTime() + 86400000)}
              />
            </View>
            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={clearEndDate}
                className="flex-1 py-3 rounded-full"
                style={{ backgroundColor: COLORS.red }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowEndPicker(false)}
                className="flex-1 py-3 rounded-full"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Cancel</Text>
              </TouchableOpacity>
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={confirmEndDate}
                  className="flex-1 py-3 rounded-full"
                  style={{ backgroundColor: COLORS.orange }}
                >
                  <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}