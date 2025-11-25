import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

interface ProfitMarginPieChartProps {
  userId: string;
  selectedMonth: string;
  selectedYear: number;
  refreshKey?: number;
}

const COLORS = ['#aeea00', '#ff6d00'];

export default function ProfitMarginPieChart({
  userId,
  selectedMonth,
  selectedYear,
  refreshKey,
}: ProfitMarginPieChartProps) {
  const [data, setData] = useState<{ name: string; population: number; color: string }[]>([]);
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
        const { data: monthly, error } = await supabase
          .from('monthly_data')
          .select('final_revenue, expenses')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', selectedYear)
          .maybeSingle();

        if (error) {
          console.error('Error fetching monthly data:', error);
          setData([]);
          return;
        }

        const revenue = Number(monthly?.final_revenue || 0);
        const expenses = Number(monthly?.expenses || 0);
        const profit = Math.max(revenue - expenses, 0);

        setData([
          {
            name: 'Profit',
            population: profit,
            color: COLORS[0],
          },
          {
            name: 'Expenses',
            population: expenses,
            color: COLORS[1],
          },
        ]);
      } catch (err) {
        console.error('Error fetching profit margin data:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, selectedMonth, selectedYear, refreshKey]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

  if (loading) {
    return (
      <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 h-[200px] justify-center items-center">
        <ActivityIndicator color="#c4ff85" size="large" />
        <Text className="text-zinc-400 mt-2 text-xs">Loading...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 h-[200px] justify-center items-center">
        <Text className="text-lime-300 opacity-70 text-sm">
          No data yet for {selectedMonth}
        </Text>
      </View>
    );
  }

  const totalAmount = data.reduce((sum, item) => sum + item.population, 0);

  return (
    <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <Text className="text-lime-300 text-base font-semibold mb-3">
        🥧 Profit vs Expenses
      </Text>

      <View className="flex-row h-[200px] pl-5">
        {/* Pie Chart - 1/2 of space */}
        <View className="flex-1 items-center justify-center">
          <PieChart
            data={data}
            width={screenWidth / 2.4}
            height={200}
            chartConfig={{
              color: (opacity = 1) => `rgba(196, 255, 133, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="35"
            absolute
            hasLegend={false}
          />
        </View>

        {/* Custom Legend - 1/2 of space */}
        <View className="flex-1 pl-10 pt-5 mt-12">
          {data.map((item, index) => {
            const percentage = ((item.population / totalAmount) * 100).toFixed(1);
            return (
              <View key={index} className="flex-row items-center mb-2.5">
                {/* Color indicator */}
                <View 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                />
                
                {/* Info */}
                <View className="flex-1">
                  <Text className="text-white text-xs font-medium" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-zinc-400 text-[10px]">
                    {formatCurrency(item.population)} ({percentage}%)
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}