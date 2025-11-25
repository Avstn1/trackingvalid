import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Text, View } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

interface ProfitLossTrendChartProps {
  userId: string;
  selectedMonth: string;
  selectedYear: number;
  refreshKey?: number;
}

export default function ProfitLossTrendChart({
  userId,
  selectedMonth,
  selectedYear,
  refreshKey,
}: ProfitLossTrendChartProps) {
  const [data, setData] = useState<{
    labels: string[];
    revenue: number[];
    expenses: number[];
    profit: number[];
  }>({ labels: [], revenue: [], expenses: [], profit: [] });
  const [loading, setLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (!userId || !selectedMonth || !selectedYear) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: daily, error } = await supabase
          .from('daily_data')
          .select('date, final_revenue, expenses')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .order('date', { ascending: true });

        if (error) {
          console.error('Error fetching daily data:', error);
          setData({ labels: [], revenue: [], expenses: [], profit: [] });
          return;
        }

        if (!daily || daily.length === 0) {
          setData({ labels: [], revenue: [], expenses: [], profit: [] });
          return;
        }

        const today = new Date();

        const filtered = daily.filter((d) => {
          const dateObj = new Date(d.date + 'T00:00:00Z');
          return dateObj <= today;
        });

        const labels = filtered.map((d) => {
          const dateObj = new Date(d.date + 'T00:00:00Z');
          return dateObj.getUTCDate().toString();
        });

        const revenue = filtered.map((d) => Number(d.final_revenue || 0));
        const expenses = filtered.map((d) => Number(d.expenses || 0));
        const profit = filtered.map((d, i) => revenue[i] - expenses[i]);

        setData({ labels, revenue, expenses, profit });
      } catch (err) {
        console.error('Error fetching profit/loss trend:', err);
        setData({ labels: [], revenue: [], expenses: [], profit: [] });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, selectedMonth, selectedYear, refreshKey]);

  if (loading) {
    return (
      <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 min-h-[280px] items-center justify-center">
        <ActivityIndicator size="small" color="#c4ff85" />
        <Text className="text-lime-200 text-sm mt-2">Loading...</Text>
      </View>
    );
  }

  if (data.labels.length === 0) {
    return (
      <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 min-h-[280px] items-center justify-center">
        <Text className="text-lime-300 opacity-70 text-sm">
          No daily data yet for {selectedMonth}
        </Text>
      </View>
    );
  }

  const chartData = {
    labels: data.labels,
    datasets: [
      {
        data: data.revenue,
        color: (opacity = 1) => `rgba(196, 255, 133, ${opacity})`, // Lime green
        strokeWidth: 2,
      },
      {
        data: data.expenses,
        color: (opacity = 1) => `rgba(255, 109, 0, ${opacity})`, // Orange
        strokeWidth: 2,
      },
      {
        data: data.profit,
        color: (opacity = 1) => `rgba(0, 230, 118, ${opacity})`, // Green
        strokeWidth: 2,
      },
    ],
    legend: ['Revenue', 'Expenses', 'Profit'],
  };

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <Text className="text-lime-300 text-base font-semibold mb-3">
        📈 Profit/Loss Trend (Daily)
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <LineChart
          data={chartData}
          width={Math.max(screenWidth - 50, data.labels.length * 30)}
          height={220}
          chartConfig={{
            backgroundColor: '#18181b',
            backgroundGradientFrom: '#18181b',
            backgroundGradientTo: '#27272a',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(196, 255, 133, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(209, 226, 197, ${opacity})`,
            style: {
              borderRadius: 16,
            },
            propsForLabels: {
              fontSize: 10,
            },
          }}
          bezier
          style={{
            borderRadius: 16,
          }}
          withInnerLines={true}
          withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
        />
      </ScrollView>
    </View>
  );
}