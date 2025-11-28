import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface Props {
  userId: string;
  year: number;
  timeframe: Timeframe;
  refreshKey?: number;
}

interface DayData {
  weekday: string;
  total_revenue: number;
}

// Color Palette
const COLORS = {
  green: '#8bcf68ff',
  greenLight: '#beb348ff',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
};

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
      <View className="items-center justify-center" style={{ flex: 1 }}>
        <ActivityIndicator size="small" color={COLORS.green} />
        <Text className="text-sm mt-2" style={{ color: COLORS.textMuted }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View className="items-center justify-center" style={{ flex: 1 }}>
        <Text className="text-sm" style={{ color: COLORS.textMuted }}>
          No data available
        </Text>
      </View>
    );
  }

  // Calculate max value and round up to nearest 5000
  const maxValue = Math.max(...data.map((d) => d.total_revenue), 1);
  const roundedMax = Math.ceil(maxValue / 5000) * 5000;

  // Prepare data for gifted-charts
  const barData = data.map((d) => ({
    value: d.total_revenue,
    label: d.weekday.slice(0, 3),
    frontColor: COLORS.green,
    gradientColor: COLORS.greenLight,
    spacing: 2,
    labelTextStyle: {
      color: COLORS.textMuted,
      fontSize: 10,
    },
  }));

  const formatYLabel = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000) {
      return `${(num / 1000).toFixed(0)}k`;
    }
    return `${num}`;
  };

  const formatTopLabel = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return `${value}`;
  };

  // Update bar data with top labels
  const barDataWithLabels = data.map((d) => ({
    value: d.total_revenue,
    label: d.weekday.slice(0, 3),
    frontColor: COLORS.green,
    gradientColor: COLORS.greenLight,
    spacing: 2,
    labelTextStyle: {
      color: COLORS.textMuted,
      fontSize: 10,
    },
    topLabelComponent: () => (
      <Text style={{ color: COLORS.text, fontSize: 9, marginBottom: 2 }}>
        {formatTopLabel(d.total_revenue)}
      </Text>
    ),
  }));

  return (
    <View className="flex-1">
      <Text 
        className="text-sm font-semibold mb-3" 
        style={{ color: COLORS.text }}
      >
        {title}
      </Text>
      <View style={{ flex: 1, paddingRight: 16 }}>
        <BarChart
          data={barDataWithLabels}
          barWidth={32}
          noOfSections={4}
          barBorderRadius={6}
          frontColor={COLORS.green}
          gradientColor={COLORS.greenLight}
          showGradient
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: COLORS.textMuted, fontSize: 10 }}
          maxValue={roundedMax}
          spacing={20}
          hideRules={false}
          rulesColor="rgba(255, 255, 255, 0.1)"
          rulesType="solid"
          yAxisLabelPrefix="$"
          formatYLabel={formatYLabel}
          isAnimated
          animationDuration={800}
        />
      </View>
    </View>
  );
}