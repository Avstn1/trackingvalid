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

interface DayData {
  weekday: string;
  total_revenue: number;
}

const WEEKDAY_ORDER = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

const JS_WEEKDAY = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function getDateRange(timeframe: Timeframe, year: number) {
  switch (timeframe) {
    case 'Q1':
      return { start: `${year}-01-01`, end: `${year}-03-31` };
    case 'Q2':
      return { start: `${year}-04-01`, end: `${year}-06-30` };
    case 'Q3':
      return { start: `${year}-07-01`, end: `${year}-09-30` };
    case 'Q4':
      return { start: `${year}-10-01`, end: `${year}-12-31` };
    case 'year':
    default:
      return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
}

export default function RevenueByWeekdayChart({ userId, year, timeframe, refreshKey }: Props) {
  const [data, setData] = useState<DayData[]>([]);
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
        const { start, end } = getDateRange(timeframe, year);

        const { data: rows, error } = await supabase
          .from('daily_data')
          .select('date, final_revenue')
          .eq('user_id', userId)
          .gte('date', start)
          .lte('date', end);

        if (error) throw error;

        const totals: Record<string, number> = {};
        WEEKDAY_ORDER.forEach((d) => (totals[d] = 0));

        (rows ?? []).forEach((r: any) => {
          const d = new Date(`${r.date}T00:00:00`);
          const jsName = JS_WEEKDAY[d.getDay()];
          const weekday =
            jsName === 'Sunday'
              ? 'Sunday'
              : WEEKDAY_ORDER.find((w) => w === jsName) ?? jsName;

          if (!totals[weekday]) totals[weekday] = 0;
          totals[weekday] += Number(r.final_revenue) || 0;
        });

        const mapped: DayData[] = WEEKDAY_ORDER.map((weekday) => ({
          weekday,
          total_revenue: totals[weekday] || 0,
        }));

        setData(mapped);
      } catch (err) {
        console.error('Error fetching weekday revenues: ', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, year, timeframe, refreshKey]);

  const title =
    timeframe === 'year'
      ? '💵 Revenue by Weekday (Year)'
      : `💵 Revenue by Weekday (${timeframe})`;

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
    labels: data.map((d) => d.weekday.slice(0, 3)),
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
        segments={Math.min(Math.ceil(roundedMax / 5000), 5)} // Limit to 5 segments max
        yAxisInterval={5000}
        withInnerLines={true}
      />
    </View>
  );
}