// components/ExpenseComponents/ExpensesViewer.tsx
import { formatDateToYMD, parseYMDToLocalDate } from '@/utils/date';
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
  green: '#8bcf68ff',
  greenGlow: '#5b8f52ff',
  amber: '#fbbf24',
  amberGlow: 'rgba(251, 191, 36, 0.2)',
  red: '#dc2626',
  redGlow: 'rgba(220, 38, 38, 0.2)',
  gray: '#6b7280',
  grayGlow: 'rgba(107, 114, 128, 0.2)',
};

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

interface ExpenseStatus {
  lastAdded: string | null;
  nextPending: string | null;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
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

  const normalizePickerDate = (date?: Date | null): Date => {
    if (!date) return new Date();
    const time = date.getTime();
    if (Number.isNaN(time) || time <= 0 || date.getFullYear() < 1971) {
      return new Date();
    }
    return date;
  };

  // Helper to parse date strings as local dates
  const parseLocalDate = (dateString: string): Date => {
    return normalizePickerDate(parseYMDToLocalDate(dateString));
  };

  // Helper to get expense status for selected month
  const getExpenseStatus = (exp: RecurringExpense, month: string, year: number): ExpenseStatus => {
    const monthIndex = MONTH_NAMES.indexOf(month);
    const today = new Date();
    const start = parseLocalDate(exp.start_date);
    const end = exp.end_date ? parseLocalDate(exp.end_date) : null;
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0);

    let lastAdded: string | null = null;
    let nextPending: string | null = null;

    // Check if expense is active during selected month
    if (start > monthEnd || (end && end < monthStart)) {
      return { lastAdded: null, nextPending: null };
    }

    const occurrences: Date[] = [];

    switch (exp.frequency) {
      case 'once':
        const expDate = parseLocalDate(exp.start_date);
        if (expDate.getMonth() === monthIndex && expDate.getFullYear() === year) {
          occurrences.push(expDate);
        }
        break;
      case 'weekly':
        const daysOfWeek = exp.weekly_days || [];
        if (daysOfWeek.length === 0) break;

        const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const date = new Date(year, monthIndex, d);
          if (date >= start && (!end || date <= end)) {
            const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
            if (daysOfWeek.includes(dayName)) occurrences.push(date);
          }
        }
        break;
      case 'monthly':
        if (exp.monthly_day && exp.monthly_day <= monthEnd.getDate()) {
          const occurrenceDate = new Date(year, monthIndex, exp.monthly_day);
          if (occurrenceDate >= start && (!end || occurrenceDate <= end)) {
            occurrences.push(occurrenceDate);
          }
        }
        break;
      case 'yearly':
        if (exp.yearly_month === monthIndex && exp.yearly_day && exp.yearly_day <= monthEnd.getDate()) {
          const occurrenceDate = new Date(year, monthIndex, exp.yearly_day);
          if (occurrenceDate >= start && (!end || occurrenceDate <= end)) {
            occurrences.push(occurrenceDate);
          }
        }
        break;
    }

    // Find last added and next pending
    occurrences.forEach((occ) => {
      if (occ <= today) {
        if (!lastAdded || occ > new Date(lastAdded)) {
          lastAdded = occ.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      } else {
        if (!nextPending || occ < new Date(nextPending)) {
          nextPending = occ.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
      }
    });

    return { lastAdded, nextPending };
  };

  // Fetch expenses with pagination
  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const monthIndex = MONTH_NAMES.indexOf(month);
      const yearNum = parseInt(year);
      const monthStart = new Date(yearNum, monthIndex, 1);
      const monthEnd = new Date(yearNum, monthIndex + 1, 0);

      // Get all expenses for this user
      const { data: allExpenses, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', barberId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Filter client-side based on frequency and activity
      const filteredExpenses = (allExpenses || []).filter((exp: RecurringExpense) => {
        const start = parseLocalDate(exp.start_date);
        const end = exp.end_date ? parseLocalDate(exp.end_date) : null;

        if (exp.frequency === 'once') {
          return start.getMonth() === monthIndex && start.getFullYear() === yearNum;
        } else {
          // For recurring, show if active period overlaps with selected month
          if (start > monthEnd || (end && end < monthStart)) {
            return false;
          }

          // Verify it actually has occurrences in this month
          const status = getExpenseStatus(exp, month, yearNum);
          return status.lastAdded !== null || status.nextPending !== null;
        }
      });

      // Apply pagination
      const totalFiltered = filteredExpenses.length;
      setTotalCount(totalFiltered);

      const maxPage = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));
      const validPage = Math.min(page, maxPage);

      const paginatedData = filteredExpenses.slice(
        (validPage - 1) * PAGE_SIZE,
        validPage * PAGE_SIZE
      );

      setExpenses(paginatedData);

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
  }, [barberId, page, month, year]);

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
    setEditStartDate(normalizePickerDate(parseLocalDate(exp.start_date)));
    setEditEndDate(exp.end_date ? normalizePickerDate(parseLocalDate(exp.end_date)) : null);
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
    const fallbackTimestamp = event?.nativeEvent?.timestamp;
    const nextDate = selectedDate || (fallbackTimestamp ? new Date(fallbackTimestamp) : undefined);
    if (nextDate) {
      setTempStartDate(normalizePickerDate(nextDate));
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    const fallbackTimestamp = event?.nativeEvent?.timestamp;
    const nextDate = selectedDate || (fallbackTimestamp ? new Date(fallbackTimestamp) : undefined);
    if (nextDate) {
      setTempEndDate(normalizePickerDate(nextDate));
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
          start_date: formatDateToYMD(normalizePickerDate(editStartDate)),
          end_date: editEndDate ? formatDateToYMD(normalizePickerDate(editEndDate)) : null,
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
        <ActivityIndicator size="small" color={COLORS.green} />
        <Text className="text-sm text-center mt-2" style={{ color: COLORS.textMuted }}>
          Loading expenses...
        </Text>
      </View>
    );
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <View className="flex-1">
      {expenses.length === 0 ? (
        <View className="flex-1 justify-center items-center py-12">
          <Text className="text-sm" style={{ color: COLORS.textMuted }}>
            No recurring expenses found for {month}.
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <View className="gap-3 pb-4">
              {expenses.map((exp) => {
                const status = getExpenseStatus(exp, month, parseInt(year));
                const hasBeenAdded = status.lastAdded !== null;
                const isOneTime = exp.frequency === 'once';
                const canEdit = isOneTime ? !hasBeenAdded : true;
                const isFieldLocked = !isOneTime && hasBeenAdded;
                
                return (
                  <View
                    key={exp.id}
                    className="rounded-xl p-4 overflow-hidden"
                    style={{
                      backgroundColor: COLORS.surfaceSolid,
                      borderWidth: 1,
                      borderColor: COLORS.glassBorder,
                    }}
                  >
                    {editingId === exp.id ? (
                      // Edit Mode
                      <View className="gap-3">
                        <TextInput
                          value={editLabel}
                          onChangeText={setEditLabel}
                          placeholder="Label"
                          placeholderTextColor={COLORS.textMuted}
                          className="px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: COLORS.cardBg,
                            color: COLORS.text,
                            borderWidth: 1,
                            borderColor: COLORS.glassBorder,
                          }}
                        />
                        <TextInput
                          value={editAmount}
                          onChangeText={isFieldLocked ? undefined : setEditAmount}
                          placeholder="Amount"
                          placeholderTextColor={COLORS.textMuted}
                          keyboardType="decimal-pad"
                          editable={!isFieldLocked}
                          className="px-3 py-2 rounded-lg"
                          style={{
                            backgroundColor: COLORS.cardBg,
                            color: COLORS.text,
                            borderWidth: 1,
                            borderColor: COLORS.glassBorder,
                            opacity: isFieldLocked ? 0.5 : 1,
                          }}
                        />

                        {/* Frequency Selector */}
                        <View className="flex-row flex-wrap gap-2">
                          {(['once', 'weekly', 'monthly', 'yearly'] as const).map((freq) => (
                            <TouchableOpacity
                              key={freq}
                              onPress={isFieldLocked ? undefined : () => setEditFrequency(freq)}
                              disabled={isFieldLocked}
                              className="px-3 py-2 rounded-lg"
                              style={{
                                backgroundColor: editFrequency === freq ? COLORS.greenGlow : COLORS.cardBg,
                                borderWidth: 1,
                                borderColor: editFrequency === freq ? COLORS.green : COLORS.glassBorder,
                                opacity: isFieldLocked ? 0.5 : 1,
                              }}
                            >
                              <Text
                                className="text-xs font-semibold"
                                style={{ color: editFrequency === freq ? COLORS.green : COLORS.textMuted }}
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
                                onPress={isFieldLocked ? undefined : () => handleDayToggle(day)}
                                disabled={isFieldLocked}
                                className="px-2 py-1 rounded-lg"
                                style={{
                                  backgroundColor: editSelectedDays.includes(day) ? COLORS.greenGlow : COLORS.cardBg,
                                  borderWidth: 1,
                                  borderColor: editSelectedDays.includes(day) ? COLORS.green : COLORS.glassBorder,
                                  opacity: isFieldLocked ? 0.5 : 1,
                                }}
                              >
                                <Text
                                  className="text-xs font-semibold"
                                  style={{ color: editSelectedDays.includes(day) ? COLORS.green : COLORS.textMuted }}
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
                            <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Day of Month</Text>
                            <TextInput
                              value={editMonthlyDay}
                              onChangeText={isFieldLocked ? undefined : setEditMonthlyDay}
                              placeholder="1-31"
                              placeholderTextColor={COLORS.textMuted}
                              keyboardType="number-pad"
                              editable={!isFieldLocked}
                              className="px-3 py-2 rounded-lg w-24"
                              style={{
                                backgroundColor: COLORS.cardBg,
                                color: COLORS.text,
                                borderWidth: 1,
                                borderColor: COLORS.glassBorder,
                                opacity: isFieldLocked ? 0.5 : 1,
                              }}
                            />
                          </View>
                        )}

                        {/* Yearly Month & Day */}
                        {editFrequency === 'yearly' && (
                          <View className="gap-2">
                            <View>
                              <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Month</Text>
                              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                <View className="flex-row gap-2">
                                  {MONTHS.map((m, idx) => (
                                    <TouchableOpacity
                                      key={idx}
                                      onPress={isFieldLocked ? undefined : () => setEditYearlyMonth(idx)}
                                      disabled={isFieldLocked}
                                      className="px-3 py-2 rounded-lg"
                                      style={{
                                        backgroundColor: editYearlyMonth === idx ? COLORS.greenGlow : COLORS.cardBg,
                                        borderWidth: 1,
                                        borderColor: editYearlyMonth === idx ? COLORS.green : COLORS.glassBorder,
                                        opacity: isFieldLocked ? 0.5 : 1,
                                      }}
                                    >
                                      <Text
                                        className="text-xs font-semibold"
                                        style={{ color: editYearlyMonth === idx ? COLORS.green : COLORS.textMuted }}
                                      >
                                        {m}
                                      </Text>
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              </ScrollView>
                            </View>
                            <View>
                              <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Day</Text>
                              <TextInput
                                value={editYearlyDay}
                                onChangeText={isFieldLocked ? undefined : setEditYearlyDay}
                                placeholder="1-31"
                                placeholderTextColor={COLORS.textMuted}
                                keyboardType="number-pad"
                                editable={!isFieldLocked}
                                className="px-3 py-2 rounded-lg w-24"
                                style={{
                                  backgroundColor: COLORS.cardBg,
                                  color: COLORS.text,
                                  borderWidth: 1,
                                  borderColor: COLORS.glassBorder,
                                  opacity: isFieldLocked ? 0.5 : 1,
                                }}
                              />
                            </View>
                          </View>
                        )}

                        {/* Start Date */}
                        <View>
                          <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>Start Date</Text>
                          <TouchableOpacity
                            onPress={isFieldLocked ? undefined : () => {
                              setTempStartDate(normalizePickerDate(editStartDate));
                              setShowStartPicker(true);
                            }}
                            disabled={isFieldLocked}
                            className="flex-row items-center gap-2 px-3 py-2 rounded-lg"
                            style={{
                              backgroundColor: COLORS.cardBg,
                              borderWidth: 1,
                              borderColor: COLORS.glassBorder,
                              opacity: isFieldLocked ? 0.5 : 1,
                            }}
                          >
                            <Calendar size={14} color={COLORS.green} />
                            <Text className="text-sm" style={{ color: COLORS.text }}>
                              {normalizePickerDate(editStartDate).toLocaleDateString()}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* End Date */}
                        <View>
                          <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>End Date (Optional)</Text>
                          <TouchableOpacity
                            onPress={() => {
                              setTempEndDate(normalizePickerDate(editEndDate || new Date()));
                              setShowEndPicker(true);
                            }}
                            className="flex-row items-center gap-2 px-3 py-2 rounded-lg"
                            style={{
                              backgroundColor: COLORS.cardBg,
                              borderWidth: 1,
                              borderColor: COLORS.glassBorder,
                            }}
                          >
                            <Calendar size={14} color={COLORS.green} />
                            <Text className="text-sm" style={{ color: COLORS.text }}>
                              {editEndDate ? normalizePickerDate(editEndDate).toLocaleDateString() : 'Not set'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Action Buttons */}
                        <View className="flex-row gap-2 justify-end mt-2">
                          <TouchableOpacity
                            onPress={cancelEdit}
                            className="px-4 py-2 rounded-lg"
                            style={{
                              backgroundColor: COLORS.cardBg,
                              borderWidth: 1,
                              borderColor: COLORS.glassBorder,
                            }}
                          >
                            <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={handleSaveEdit}
                            className="px-4 py-2 rounded-lg"
                            style={{ backgroundColor: COLORS.green }}
                          >
                            <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>Save</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      // View Mode
                      <View>
                        <View className="flex-row justify-between items-start mb-2">
                          <View className="flex-1">
                            <Text className="font-semibold text-base mb-1" style={{ color: COLORS.text }}>
                              {exp.label}
                            </Text>
                            <Text className="text-sm" style={{ color: COLORS.textMuted }}>
                              ${exp.amount.toFixed(2)} — {exp.frequency}
                              {exp.frequency === 'weekly' && exp.weekly_days?.length
                                ? ` (${exp.weekly_days.join(', ')})`
                                : ''}
                            </Text>
                            <Text className="text-xs mt-1" style={{ color: COLORS.textMuted }}>
                              {parseLocalDate(exp.start_date).toLocaleDateString()} 
                              {exp.end_date
                                ? ` → ${parseLocalDate(exp.end_date).toLocaleDateString()}`
                                : ''}
                            </Text>
                          </View>
                          <View className="flex-row gap-2">
                            {canEdit && (
                              <TouchableOpacity
                                onPress={() => startEdit(exp)}
                                className="p-2 rounded-lg"
                                style={{ backgroundColor: COLORS.amberGlow }}
                              >
                                <Edit2 size={16} color={COLORS.amber} />
                              </TouchableOpacity>
                            )}
                            <TouchableOpacity
                              onPress={() => handleDelete(exp.id)}
                              className="p-2 rounded-lg"
                              style={{ backgroundColor: COLORS.redGlow }}
                            >
                              <Trash2 size={16} color={COLORS.red} />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Status Badges */}
                        <View className="flex-row flex-wrap gap-2 mt-2">
                          {status.lastAdded && (
                            <View className="px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.greenGlow, borderWidth: 1, borderColor: COLORS.green }}>
                              <Text className="text-xs font-medium" style={{ color: COLORS.green }}>
                                Added on {status.lastAdded}
                              </Text>
                            </View>
                          )}
                          {status.nextPending && (
                            <View className="px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.amberGlow, borderWidth: 1, borderColor: COLORS.amber }}>
                              <Text className="text-xs font-medium" style={{ color: COLORS.amber }}>
                                Next: {status.nextPending}
                              </Text>
                            </View>
                          )}
                          {!status.lastAdded && !status.nextPending && (
                            <View className="px-2 py-1 rounded-full" style={{ backgroundColor: COLORS.grayGlow, borderWidth: 1, borderColor: COLORS.gray }}>
                              <Text className="text-xs font-medium" style={{ color: COLORS.gray }}>
                                Not active this month
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>

          {/* Pagination */}
          {totalPages > 1 && (
            <View
              className="flex-row items-center justify-center gap-3 py-4"
              style={{
                borderTopWidth: 1,
                borderTopColor: COLORS.glassBorder,
              }}
            >
              <TouchableOpacity
                disabled={page === 1}
                onPress={() => setPage((p) => p - 1)}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  opacity: page === 1 ? 0.5 : 1,
                }}
              >
                <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>Previous</Text>
              </TouchableOpacity>
              <Text className="font-medium" style={{ color: COLORS.text }}>
                {page} / {totalPages}
              </Text>
              <TouchableOpacity
                disabled={page === totalPages}
                onPress={() => setPage((p) => p + 1)}
                className="px-4 py-2 rounded-lg"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                  opacity: page === totalPages ? 0.5 : 1,
                }}
              >
                <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>Next</Text>
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
                value={normalizePickerDate(tempStartDate)}
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
              <TouchableOpacity
                onPress={confirmStartDate}
                className="flex-1 py-3 rounded-full"
                style={{ backgroundColor: COLORS.green }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
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
                value={normalizePickerDate(tempEndDate)}
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
              <TouchableOpacity
                onPress={confirmEndDate}
                className="flex-1 py-3 rounded-full"
                style={{ backgroundColor: COLORS.green }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
