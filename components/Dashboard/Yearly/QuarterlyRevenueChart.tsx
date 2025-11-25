import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, View } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface Props {
  userId: string;
  year: number;
  timeframe: Timeframe;
  refreshKey: number;
}

interface MonthData {
  month: string;
  total_revenue: number;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function getMonthsForTimeframe(timeframe: Timeframe): string[] {
  switch (timeframe) {
    case 'Q1':
      return MONTHS.slice(0, 3);
    case 'Q2':
      return MONTHS.slice(3, 6);
    case 'Q3':
      return MONTHS.slice(6, 9);
    case 'Q4':
      return MONTHS.slice(9, 12);
    case 'year':
    default:
      return MONTHS;
  }
}

export default function QuarterlyRevenueChart({ userId, year, timeframe, refreshKey }: Props) {
  const [data, setData] = useState<MonthData[]>([]);
  const [loading, setLoading] = useState(true);
  const screenWidth = Dimensions.get('window').width;

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: rows, error } = await supabase
          .from('monthly_data')
          .select('month, final_revenue')
          .eq('user_id', userId)
          .eq('year', year);

        if (error) throw error;

        const totals: Record<string, number> = {};
        MONTHS.forEach((m) => (totals[m] = 0));

        (rows ?? []).forEach((r: any) => {
          const name = r.month as string;
          const monthName = MONTHS.find((m) => m === name) ?? name;
          totals[monthName] += Number(r.final_revenue) || 0;
        });

        const visibleMonths = getMonthsForTimeframe(timeframe);

        const mapped: MonthData[] = visibleMonths.map((m) => ({
          month: m,
          total_revenue: totals[m] || 0,
        }));

        setData(mapped);
      } catch (err) {
        console.error('Error fetching monthly revenue:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, year, timeframe, refreshKey]);

  const title =
    timeframe === 'year'
      ? '📊 Revenue by Month (Year)'
      : `📊 Revenue by Month (${timeframe})`;

  if (loading) {
    return (
      <View className="h-[280px] items-center justify-center">
        <ActivityIndicator size="small" color="#c4ff85" />
        <Text className="text-lime-200 text-sm mt-2">Loading...</Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View className="h-[280px] items-center justify-center">
        <Text className="text-lime-300 opacity-70 text-sm">No data available</Text>
      </View>
    );
  }

  // Calculate max value and round up to nearest 5000
  const maxValue = Math.max(...data.map((d) => d.total_revenue), 1);
  const roundedMax = Math.ceil(maxValue / 5000) * 5000;

  const chartData = {
    labels: data.map((d) => d.month.slice(0, 3)), // Jan, Feb, etc.
    datasets: [
      {
        data: data.map((d) => d.total_revenue),
      },
    ],
  };

  return (
    <View className="flex-1">
      <Text className="text-lime-300 text-sm font-semibold mb-2">{title}</Text>
      <BarChart
        data={chartData}
        width={screenWidth - 50}
        height={220}
        yAxisLabel="$"
        yAxisSuffix=""
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
          barPercentage: 0.7,
          fillShadowGradientOpacity: 1,
          propsForVerticalLabels: {
            fontSize: 5, 
          },
          formatYLabel: (value) => {
            const num = parseFloat(value);
            // Force labels to be multiples of 5000
            const rounded = Math.round(num / 5000) * 5000;
            if (rounded >= 1000) {
              return `${(rounded / 1000).toFixed(0)}k`;
            }
            return rounded.toString();
          },
        }}
        style={{
          borderRadius: 16,
          marginTop: 12,
        }}
        showValuesOnTopOfBars
        fromZero
        segments={Math.min(Math.ceil(roundedMax / 5000), 5)}
        yAxisInterval={5000}
        withInnerLines={true}
      />
    </View>
  );
}