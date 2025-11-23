import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '@/utils/supabaseClient';

interface MonthlyExpensesCardProps {
  userId: string;
  month: string;
  year: number;
}

export default function MonthlyExpensesCard({ userId, month, year }: MonthlyExpensesCardProps) {
  const [expenses, setExpenses] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_data')
        .select('expenses')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;
      setExpenses(data?.expenses || 0);
    } catch (err) {
      console.error('Failed to fetch monthly expenses:', err);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && month && year) {
      fetchExpenses();
    }
  }, [userId, month, year]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <Text className="text-red-300 text-sm font-semibold mb-3">🧾 Monthly Expenses</Text>

      <View className="min-h-[60px] justify-center">
        {loading ? (
          <ActivityIndicator color="#fca5a5" />
        ) : (
          <Text className="text-2xl font-bold text-red-200" numberOfLines={1} adjustsFontSizeToFit>
            {formatCurrency(expenses)}
          </Text>
        )}
      </View>
    </View>
  );
}