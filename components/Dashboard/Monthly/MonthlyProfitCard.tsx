import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface MonthlyProfitCardProps {
  userId: string;
  selectedMonth: string;
  year: number;
  refreshKey?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlyProfitCard({
  userId,
  selectedMonth,
  year,
  refreshKey,
}: MonthlyProfitCardProps) {
  const [profit, setProfit] = useState<number | null>(null);
  const [prevProfit, setPrevProfit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !selectedMonth) {
      setLoading(false);
      return;
    }

    const fetchProfit = async () => {
      setLoading(true);
      try {
        const currentYear = year ?? new Date().getFullYear();

        // Fetch current month revenue + expenses
        const { data: currentData, error: currentError } = await supabase
          .from('monthly_data')
          .select('final_revenue, expenses')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (currentError) console.error('Error fetching current month data:', currentError);

        const currentProfit =
          currentData?.final_revenue != null && currentData?.expenses != null
            ? currentData.final_revenue - currentData.expenses
            : null;

        setProfit(currentProfit);

        // Determine previous month/year
        const currentIndex = MONTHS.indexOf(selectedMonth);
        let prevIndex = currentIndex - 1;
        let prevYear = currentYear;
        if (prevIndex < 0) {
          prevIndex = 11;
          prevYear -= 1;
        }
        const prevMonth = MONTHS[prevIndex];

        // Fetch previous month revenue + expenses
        const { data: prevData, error: prevError } = await supabase
          .from('monthly_data')
          .select('final_revenue, expenses')
          .eq('user_id', userId)
          .eq('month', prevMonth)
          .eq('year', prevYear)
          .maybeSingle();

        if (prevError) console.error('Error fetching previous month data:', prevError);

        const prevProfit =
          prevData?.final_revenue != null && prevData?.expenses != null
            ? prevData.final_revenue - prevData.expenses
            : null;

        setPrevProfit(prevProfit);
      } catch (err) {
        console.error('Error fetching profits:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfit();
  }, [userId, selectedMonth, year, refreshKey]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const calculateChange = (): number | null => {
    if (profit === null || prevProfit === null || prevProfit === 0) return null;
    const diff = profit - prevProfit;
    const percent = (diff / prevProfit) * 100;
    return parseFloat(percent.toFixed(2));
  };

  const change = calculateChange();

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 min-h-[140px]">
      <Text className="text-lime-300 text-base font-semibold mb-2">💰 Monthly Profit</Text>

      <View className="flex-1 justify-center">
        {loading ? (
          <ActivityIndicator size="small" color="#c4ff85" />
        ) : (
          <Text className="text-3xl font-bold text-lime-200">
            {profit !== null ? formatCurrency(profit) : 'N/A'}
          </Text>
        )}
      </View>

      <View className="mt-2">
        {change !== null ? (
          <Text
            className={`text-sm font-semibold ${
              change > 0
                ? 'text-green-400'
                : change < 0
                ? 'text-red-400'
                : 'text-gray-400'
            }`}
          >
            {change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`}{' '}
            <Text className="text-gray-400">(vs. prior month)</Text>
          </Text>
        ) : (
          <Text className="text-sm text-gray-500">—</Text>
        )}
      </View>
    </View>
  );
}