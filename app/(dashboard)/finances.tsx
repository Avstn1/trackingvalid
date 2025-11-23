import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'

interface ExpensesViewerProps {
  barberId: string
  month: string
  year: string
  onUpdate?: () => void
}

interface RecurringExpense {
  id: number
  user_id: string
  label: string
  amount: number
  frequency: 'once' | 'weekly' | 'monthly' | 'yearly'
  start_date: string
  end_date: string | null
  weekly_days: string[] | null
  monthly_day: number | null
  yearly_month: number | null
  yearly_day: number | null
  created_at: string
  updated_at: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function FinanceViewer({ barberId, month, year, onUpdate }: ExpensesViewerProps) {
  const [expenses, setExpenses] = useState<RecurringExpense[]>([])
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Editable fields
  const [editLabel, setEditLabel] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editFrequency, setEditFrequency] = useState<'once' | 'weekly' | 'monthly' | 'yearly'>('once')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState<string | null>(null)
  const [editSelectedDays, setEditSelectedDays] = useState<string[]>([])
  const [editMonthlyDay, setEditMonthlyDay] = useState<number>(1)
  const [editYearlyMonth, setEditYearlyMonth] = useState<number>(0)
  const [editYearlyDay, setEditYearlyDay] = useState<number>(1)

  // Pagination
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 4
  const [totalCount, setTotalCount] = useState(0)

  const fetchExpenses = async () => {
    setLoading(true)
    try {
      const { count, error: countError } = await supabase
        .from('recurring_expenses')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', barberId)
      if (countError) throw countError
      setTotalCount(count || 0)

      const maxPage = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE))
      const validPage = Math.min(page, maxPage)

      const from = (validPage - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      const { data, error } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', barberId)
        .order('created_at', { ascending: false })
        .range(from, to)
      if (error) throw error
      setExpenses(data || [])
      
      if (validPage !== page) {
        setPage(validPage)
      }
    } catch (err) {
      console.error(err)
      Toast.show({
        type: 'error',
        text1: 'Failed to load recurring expenses'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenses()

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
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [barberId, page])

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))
    if (page > maxPage) {
      setPage(maxPage)
    }
  }, [totalCount, page])

  const handleDelete = async (id: number) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this recurring expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('recurring_expenses').delete().eq('id', id)
              if (error) throw error
              Toast.show({
                type: 'success',
                text1: 'Expense deleted'
              })
              fetchExpenses()
              onUpdate?.()

              await supabase.from('system_logs').insert({
                source: barberId,
                action: 'expense_deleted',
                status: 'success',
                details: `Recurring expense deleted`,
              })
            } catch (err) {
              console.error(err)
              Toast.show({
                type: 'error',
                text1: 'Failed to delete expense'
              })
            }
          }
        }
      ]
    )
  }

  const startEdit = (exp: RecurringExpense) => {
    setEditingId(exp.id)
    setEditLabel(exp.label)
    setEditAmount(exp.amount.toFixed(2))
    setEditFrequency(exp.frequency)
    setEditStartDate(exp.start_date)
    setEditEndDate(exp.end_date)
    setEditSelectedDays(exp.weekly_days || [])
    setEditMonthlyDay(exp.monthly_day || 1)
    setEditYearlyMonth(exp.yearly_month || 0)
    setEditYearlyDay(exp.yearly_day || 1)
  }

  const handleDayToggle = (day: string) => {
    setEditSelectedDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  const handleSaveEdit = async () => {
    if (!editLabel.trim() || isNaN(parseFloat(editAmount))) {
      Toast.show({
        type: 'error',
        text1: 'Invalid input'
      })
      return
    }

    try {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({
          label: editLabel.trim(),
          amount: parseFloat(editAmount),
          frequency: editFrequency,
          start_date: editStartDate,
          end_date: editEndDate,
          weekly_days: editFrequency === 'weekly' ? editSelectedDays : null,
          monthly_day: editFrequency === 'monthly' ? editMonthlyDay : null,
          yearly_month: editFrequency === 'yearly' ? editYearlyMonth : null,
          yearly_day: editFrequency === 'yearly' ? editYearlyDay : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingId)
      if (error) throw error
      
      Toast.show({
        type: 'success',
        text1: 'Expense updated'
      })
      setEditingId(null)
      fetchExpenses()
      onUpdate?.()

      await supabase.from('system_logs').insert({
        source: barberId,
        action: 'expense_edited',
        status: 'success',
        details: `Recurring expense edited`,
      })
    } catch (err) {
      console.error(err)
      Toast.show({
        type: 'error',
        text1: 'Failed to update expense'
      })
    }
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  if (loading) {
    return (
      <View className="flex-row items-center gap-2">
        <ActivityIndicator size="small" color="#9CA3AF" />
        <Text className="text-sm text-gray-400">Loading recurring expenses...</Text>
      </View>
    )
  }

  return (
    <View className="h-[480px] gap-4">
      <Text className="text-white font-semibold text-lg">Recurring Expenses</Text>

      {expenses.length === 0 ? (
        <Text className="text-sm text-gray-400">No recurring expenses found.</Text>
      ) : (
        <>
          <ScrollView className="flex-1 pr-1" contentContainerStyle={{ gap: 12 }}>
            {expenses.map(exp => (
              <View
                key={exp.id}
                className="bg-white/10 border border-white/10 rounded-xl p-4"
              >
                {editingId === exp.id ? (
                  <View className="flex flex-col gap-2 w-full">
                    <TextInput
                      value={editLabel}
                      onChangeText={setEditLabel}
                      placeholder="Label"
                      placeholderTextColor="#9CA3AF"
                      className="px-2 py-2 bg-white/10 text-white border border-white/20 rounded-lg"
                    />
                    <TextInput
                      value={editAmount}
                      onChangeText={setEditAmount}
                      placeholder="Amount"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="decimal-pad"
                      className="px-2 py-2 bg-white/10 text-white border border-white/20 rounded-lg"
                    />

                    {/* Frequency Selector */}
                    <View className="flex-row gap-2 flex-wrap">
                      {(['once', 'weekly', 'monthly', 'yearly'] as const).map(freq => (
                        <TouchableOpacity
                          key={freq}
                          onPress={() => setEditFrequency(freq)}
                          className={`px-3 py-2 rounded-lg ${
                            editFrequency === freq 
                              ? 'bg-amber-500/30' 
                              : 'bg-white/10'
                          }`}
                        >
                          <Text className={`text-xs ${
                            editFrequency === freq 
                              ? 'text-white font-semibold' 
                              : 'text-white/70'
                          }`}>
                            {freq.charAt(0).toUpperCase() + freq.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Weekly Days */}
                    {editFrequency === 'weekly' && (
                      <View className="flex-row gap-1 flex-wrap mt-1">
                        {DAYS.map(d => (
                          <TouchableOpacity
                            key={d}
                            onPress={() => handleDayToggle(d)}
                            className={`px-2 py-1 rounded-md ${
                              editSelectedDays.includes(d)
                                ? 'bg-lime-400/40'
                                : 'bg-white/10'
                            }`}
                          >
                            <Text className={`text-xs font-semibold ${
                              editSelectedDays.includes(d)
                                ? 'text-lime-100'
                                : 'text-white/70'
                            }`}>
                              {d}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}

                    {/* Monthly Day */}
                    {editFrequency === 'monthly' && (
                      <View className="flex-row gap-2 mt-1 items-center">
                        <Text className="text-white text-sm">Day of month:</Text>
                        <TextInput
                          value={String(editMonthlyDay)}
                          onChangeText={text => setEditMonthlyDay(parseInt(text) || 1)}
                          keyboardType="number-pad"
                          className="w-16 px-2 py-1 rounded-lg bg-white/10 text-white border border-white/10"
                        />
                      </View>
                    )}

                    {/* Yearly */}
                    {editFrequency === 'yearly' && (
                      <View className="flex-row gap-2 mt-1 flex-wrap items-center">
                        <Text className="text-white text-sm">Month:</Text>
                        <TextInput
                          value={String(editYearlyMonth + 1)}
                          onChangeText={text => setEditYearlyMonth((parseInt(text) || 1) - 1)}
                          keyboardType="number-pad"
                          className="w-16 px-2 py-1 rounded-lg bg-white/10 text-white border border-white/10"
                        />
                        <Text className="text-white text-sm">Day:</Text>
                        <TextInput
                          value={String(editYearlyDay)}
                          onChangeText={text => setEditYearlyDay(parseInt(text) || 1)}
                          keyboardType="number-pad"
                          className="w-16 px-2 py-1 rounded-lg bg-white/10 text-white border border-white/10"
                        />
                      </View>
                    )}

                    <TextInput
                      value={editStartDate}
                      onChangeText={setEditStartDate}
                      placeholder="Start Date (YYYY-MM-DD)"
                      placeholderTextColor="#9CA3AF"
                      className="px-2 py-2 bg-white/10 text-white border border-white/20 rounded-lg"
                    />
                    <TextInput
                      value={editEndDate || ''}
                      onChangeText={text => setEditEndDate(text || null)}
                      placeholder="End Date (YYYY-MM-DD)"
                      placeholderTextColor="#9CA3AF"
                      className="px-2 py-2 bg-white/10 text-white border border-white/20 rounded-lg"
                    />

                    <View className="flex-row gap-2 justify-end mt-1">
                      <TouchableOpacity
                        onPress={() => setEditingId(null)}
                        className="px-3 py-1 rounded-md bg-gray-600/50 active:bg-gray-600"
                      >
                        <Text className="text-sm text-white">Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSaveEdit}
                        className="px-3 py-1 rounded-md bg-green-600/60 active:bg-green-600"
                      >
                        <Text className="text-sm text-white">Save</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-white font-medium">{exp.label}</Text>
                      <Text className="text-sm text-gray-400">
                        ${exp.amount.toFixed(2)} — {exp.frequency}
                        {exp.frequency === 'weekly' && exp.weekly_days?.length
                          ? ` (${exp.weekly_days.join(', ')})`
                          : ''}
                      </Text>
                      <Text className="text-xs text-gray-500">
                        {exp.start_date} {exp.end_date ? `→ ${exp.end_date}` : ''}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => startEdit(exp)}
                        className="px-3 py-1 rounded-md bg-amber-500/30 active:bg-amber-500/50"
                      >
                        <Text className="text-sm text-white">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleDelete(exp.id)}
                        className="px-3 py-1 rounded-md bg-red-600/40 active:bg-red-600/60"
                      >
                        <Text className="text-sm text-white">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* Pagination */}
          {totalPages > 1 && (
            <View className="flex-row gap-2 justify-center mt-2">
              <TouchableOpacity
                disabled={page === 1}
                onPress={() => setPage(p => p - 1)}
                className={`px-3 py-1 rounded-md bg-gray-600/50 active:bg-gray-600 ${
                  page === 1 ? 'opacity-50' : ''
                }`}
              >
                <Text className="text-white">Previous</Text>
              </TouchableOpacity>
              <View className="px-3 py-1 justify-center">
                <Text className="text-white">{page} / {totalPages}</Text>
              </View>
              <TouchableOpacity
                disabled={page === totalPages}
                onPress={() => setPage(p => p + 1)}
                className={`px-3 py-1 rounded-md bg-gray-600/50 active:bg-gray-600 ${
                  page === totalPages ? 'opacity-50' : ''
                }`}
              >
                <Text className="text-white">Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  )
}