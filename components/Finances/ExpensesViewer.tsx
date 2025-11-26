// components/ExpenseComponents/ExpensesViewer.tsx
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Edit2, Trash2 } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
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

interface ExpensesViewerProps {
  barberId: string;
  month: string;
  year: string;
  onUpdate?: () => void;
}

interface RecurringExpense {
  id: number;
  user_id: string;
  label: string;
  amount: number;
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date: string | null;
  weekly_days: string[] | null;
  monthly_day: number | null;
  yearly_month: number | null;
  yearly_day: number | null;
  created_at: string;
  updated_at: string;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

export default function ExpensesViewer({
  barberId,
  month,
  year,
  onUpdate,
}: ExpensesViewerProps) {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Editable fields
  const [editLabel, setEditLabel] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editFrequency, setEditFrequency] = useState<'once' | 'weekly' | 'monthly' | 'yearly'>('once');
  const [editStartDate, setEditStartDate] = useState(new Date());
  const [editEndDate, setEditEndDate] = useState<Date | null>(null);
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>([]);
  const [editMonthlyDay, setEditMonthlyDay] = useState('1');
  const [editYearlyMonth, setEditYearlyMonth] = useState(0);
  const [editYearlyDay, setEditYearlyDay] = useState('1');

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [tempStartDate, setTempStartDate] = useState(new Date());
  const [tempEndDate, setTempEndDate] = useState(new Date());

  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;
  const [totalCount, setTotalCount] = useState(0);

  // Fetch expenses with pagination
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      // Total count
      const { count, error: countError } = await supabase
        .from('recurring_expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', barberId);
      if (countError) throw countError;
      setTotalCount(count || 0);

      // Calculate valid page range
      const maxPage = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
      const validPage = Math.min(page, maxPage);

      // Page data
      const from = (validPage - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', barberId)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) throw error;
      setExpenses(data || []);

      // Update page if it was adjusted
      if (validPage !== page) {
        setPage(validPage);
      }
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to load recurring expenses');
    } finally {
      setLoading(false);
    }
  };

  // Real-time subscription
  useEffect(() => {
    fetchExpenses();

    const channel = supabase
      .channel(`realtime-recurring-${barberId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'recurring_expenses',
          filter: `user_id=eq.${barberId}`,
        },
        () => fetchExpenses()
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'recurring_expenses',
          filter: `user_id=eq.${barberId}`,
        },
        () => fetchExpenses()
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'recurring_expenses',
          filter: `user_id=eq.${barberId}`,
        },
        () => fetchExpenses()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [barberId, page]);

  // Handle automatic page navigation
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    if (page > maxPage) {
      setPage(maxPage);
    }
  }, [totalCount, page]);

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Expense',
      'Delete this recurring expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('recurring_expenses')
                .delete()
                .eq('id', id);
              if (error) throw error;
              
              Alert.alert('Success', 'Expense deleted');
              fetchExpenses();
              onUpdate?.();

              await supabase.from('system_logs').insert({
                source: barberId,
                action: 'expense_deleted',
                status: 'success',
                details: 'Recurring expense deleted',
              });
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to delete expense');
            }
          },
        },
      ]
    );
  };

  const startEdit = (exp: RecurringExpense) => {
    setEditingId(exp.id);
    setEditLabel(exp.label);
    setEditAmount(exp.amount.toFixed(2));
    setEditFrequency(exp.frequency);
    setEditStartDate(new Date(exp.start_date));
    setEditEndDate(exp.end_date ? new Date(exp.end_date) : null);
    setEditSelectedDays(exp.weekly_days || []);
    setEditMonthlyDay(exp.monthly_day?.toString() || '1');
    setEditYearlyMonth(exp.yearly_month || 0);
    setEditYearlyDay(exp.yearly_day?.toString() || '1');
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleDayToggle = (day: string) => {
    setEditSelectedDays((prev) =>
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
    setEditStartDate(tempStartDate);
    setShowStartPicker(false);
  };

  const confirmEndDate = () => {
    setEditEndDate(tempEndDate);
    setShowEndPicker(false);
  };

  const clearEndDate = () => {
    setEditEndDate(null);
    setShowEndPicker(false);
  };

  const handleSaveEdit = async () => {
    if (!editLabel.trim() || isNaN(parseFloat(editAmount))) {
      Alert.alert('Error', 'Invalid input');
      return;
    }

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({
          label: editLabel.trim(),
          amount: parseFloat(editAmount),
          frequency: editFrequency,
          start_date: editStartDate.toISOString().split('T')[0],
          end_date: editEndDate ? editEndDate.toISOString().split('T')[0] : null,
          weekly_days: editFrequency === 'weekly' ? editSelectedDays : null,
          monthly_day: editFrequency === 'monthly' ? parseInt(editMonthlyDay) : null,
          yearly_month: editFrequency === 'yearly' ? editYearlyMonth : null,
          yearly_day: editFrequency === 'yearly' ? parseInt(editYearlyDay) : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId);
      if (error) throw error;
      
      Alert.alert('Success', 'Expense updated');
      setEditingId(null);
      fetchExpenses();
      onUpdate?.();

      await supabase.from('system_logs').insert({
        source: barberId,
        action: 'expense_edited',
        status: 'success',
        details: 'Recurring expense edited',
      });
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update expense');
    }
  };

  if (loading) {
    return (
      <View className="py-8">
        <ActivityIndicator size="small" color="#c4ff85" />
        <Text className="text-zinc-400 text-sm text-center mt-2">
          Loading expenses...
        </Text>
      </View>
    );
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <View className="flex-1">
      {expenses.length === 0 ? (
        <Text className="text-sm text-zinc-400">No recurring expenses found.</Text>
      ) : (
        <View className="flex-1">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-4">
              {expenses.map((exp) => (
                <View
                  key={exp.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-xl p-4"
                >
                  {editingId === exp.id ? (
                    // Edit Mode
                    <View className="gap-3">
                      <TextInput
                        value={editLabel}
                        onChangeText={setEditLabel}
                        placeholder="Label"
                        placeholderTextColor="#71717a"
                        className="px-3 py-2 bg-zinc-700 text-white border border-zinc-600 rounded-lg"
                      />
                      <TextInput
                        value={editAmount}
                        onChangeText={setEditAmount}
                        placeholder="Amount"
                        placeholderTextColor="#71717a"
                        keyboardType="decimal-pad"
                        className="px-3 py-2 bg-zinc-700 text-white border border-zinc-600 rounded-lg"
                      />

                      {/* Frequency Selector */}
                      <View className="flex-row flex-wrap gap-2">
                        {(['once', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                          <TouchableOpacity
                            key={freq}
                            onPress={() => setEditFrequency(freq)}
                            className={`px-3 py-2 rounded-lg ${
                              editFrequency === freq
                                ? 'bg-lime-400/20 border-lime-400'
                                : 'bg-zinc-700 border-zinc-600'
                            } border`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                editFrequency === freq ? 'text-lime-300' : 'text-zinc-400'
                              }`}
                            >
                              {freq.charAt(0).toUpperCase() + freq.slice(1)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* Weekly Days */}
                      {editFrequency === 'weekly' && (
                        <View className="flex-row flex-wrap gap-2">
                          {DAYS.map((day) => (
                            <TouchableOpacity
                              key={day}
                              onPress={() => handleDayToggle(day)}
                              className={`px-2 py-1 rounded-lg ${
                                editSelectedDays.includes(day)
                                  ? 'bg-lime-400/20 border-lime-400'
                                  : 'bg-zinc-700 border-zinc-600'
                              } border`}
                            >
                              <Text
                                className={`text-xs font-semibold ${
                                  editSelectedDays.includes(day)
                                    ? 'text-lime-300'
                                    : 'text-zinc-400'
                                }`}
                              >
                                {day}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {/* Monthly Day */}
                      {editFrequency === 'monthly' && (
                        <View>
                          <Text className="text-zinc-400 text-xs mb-2">Day of Month</Text>
                          <TextInput
                            value={editMonthlyDay}
                            onChangeText={setEditMonthlyDay}
                            placeholder="1-31"
                            placeholderTextColor="#71717a"
                            keyboardType="number-pad"
                            className="px-3 py-2 bg-zinc-700 text-white border border-zinc-600 rounded-lg w-24"
                          />
                        </View>
                      )}

                      {/* Yearly Month & Day */}
                      {editFrequency === 'yearly' && (
                        <View className="gap-2">
                          <View>
                            <Text className="text-zinc-400 text-xs mb-2">Month</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                              <View className="flex-row gap-2">
                                {MONTHS.map((m, idx) => (
                                  <TouchableOpacity
                                    key={idx}
                                    onPress={() => setEditYearlyMonth(idx)}
                                    className={`px-3 py-2 rounded-lg ${
                                      editYearlyMonth === idx
                                        ? 'bg-lime-400/20 border-lime-400'
                                        : 'bg-zinc-700 border-zinc-600'
                                    } border`}
                                  >
                                    <Text
                                      className={`text-xs font-semibold ${
                                        editYearlyMonth === idx
                                          ? 'text-lime-300'
                                          : 'text-zinc-400'
                                      }`}
                                    >
                                      {m}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </ScrollView>
                          </View>
                          <View>
                            <Text className="text-zinc-400 text-xs mb-2">Day</Text>
                            <TextInput
                              value={editYearlyDay}
                              onChangeText={setEditYearlyDay}
                              placeholder="1-31"
                              placeholderTextColor="#71717a"
                              keyboardType="number-pad"
                              className="px-3 py-2 bg-zinc-700 text-white border border-zinc-600 rounded-lg w-24"
                            />
                          </View>
                        </View>
                      )}

                      {/* Start Date */}
                      <View>
                        <Text className="text-zinc-400 text-xs mb-2">Start Date</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setTempStartDate(editStartDate);
                            setShowStartPicker(true);
                          }}
                          className="flex-row items-center gap-2 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg"
                        >
                          <Calendar size={14} color="#c4ff85" />
                          <Text className="text-white text-sm">
                            {editStartDate.toLocaleDateString()}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* End Date */}
                      <View>
                        <Text className="text-zinc-400 text-xs mb-2">End Date (Optional)</Text>
                        <TouchableOpacity
                          onPress={() => {
                            setTempEndDate(editEndDate || new Date());
                            setShowEndPicker(true);
                          }}
                          className="flex-row items-center gap-2 px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg"
                        >
                          <Calendar size={14} color="#c4ff85" />
                          <Text className="text-white text-sm">
                            {editEndDate ? editEndDate.toLocaleDateString() : 'Not set'}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Action Buttons */}
                      <View className="flex-row gap-2 justify-end mt-2">
                        <TouchableOpacity
                          onPress={cancelEdit}
                          className="px-4 py-2 bg-zinc-700 rounded-lg"
                        >
                          <Text className="text-white font-semibold text-sm">Cancel</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={handleSaveEdit}
                          className="px-4 py-2 bg-lime-400 rounded-lg"
                        >
                          <Text className="text-black font-semibold text-sm">Save</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    // View Mode
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-white font-semibold text-base mb-1">
                          {exp.label}
                        </Text>
                        <Text className="text-zinc-400 text-sm">
                          ${exp.amount.toFixed(2)} — {exp.frequency}
                          {exp.frequency === 'weekly' && exp.weekly_days?.length
                            ? ` (${exp.weekly_days.join(', ')})`
                            : ''}
                        </Text>
                        <Text className="text-zinc-500 text-xs mt-1">
                          {new Date(exp.start_date).toLocaleDateString()}
                          {exp.end_date
                            ? ` → ${new Date(exp.end_date).toLocaleDateString()}`
                            : ''}
                        </Text>
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => startEdit(exp)}
                          className="bg-amber-500/30 p-2 rounded-lg"
                        >
                          <Edit2 size={16} color="#fbbf24" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(exp.id)}
                          className="bg-red-600/30 p-2 rounded-lg"
                        >
                          <Trash2 size={16} color="#dc2626" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Pagination */}
          {totalPages > 1 && (
            <View className="flex-row items-center justify-center gap-3 py-4 border-t border-zinc-800">
              <TouchableOpacity
                disabled={page === 1}
                onPress={() => setPage((p) => p - 1)}
                className={`px-4 py-2 rounded-lg ${
                  page === 1 ? 'bg-zinc-800 opacity-50' : 'bg-zinc-700'
                }`}
              >
                <Text className="text-white font-semibold text-sm">Previous</Text>
              </TouchableOpacity>
              <Text className="text-white font-medium">
                {page} / {totalPages}
              </Text>
              <TouchableOpacity
                disabled={page === totalPages}
                onPress={() => setPage((p) => p + 1)}
                className={`px-4 py-2 rounded-lg ${
                  page === totalPages ? 'bg-zinc-800 opacity-50' : 'bg-zinc-700'
                }`}
              >
                <Text className="text-white font-semibold text-sm">Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

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
    </View>
  );
}