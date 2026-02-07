import { COLORS } from '@/constants/design-system';
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
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text className="text-sm mt-2" style={{ color: COLORS.textSecondary }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View className="h-[280px] items-center justify-center">
        <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
          No data available
        </Text>
      </View>
    );
  }

  // Calculate max value and round up to nearest 5000
  const maxValue = Math.max(...data.map((d) => d.total_revenue), 1);
  const roundedMax = Math.ceil(maxValue / 5000) * 5000;

  const formatYLabel = (value: string) => {
    const num = parseFloat(value);
    if (num >= 1000) {
      return `$${(num / 1000).toFixed(0)}k`;
    }
    return `$${num}`;
  };

  const formatTopLabel = (value: number) => {
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}k`;
    }
    return `$${value}`;
  };

  // Prepare data for gifted-charts with top labels
  const barDataWithLabels = data.map((d) => ({
    value: d.total_revenue,
    label: d.month.slice(0, 3),
    frontColor: COLORS.primary,
    gradientColor: COLORS.primaryLight,
    spacing: 2,
    labelTextStyle: {
      color: COLORS.textSecondary,
      fontSize: 11,
    },
    topLabelComponent: () => (
      <Text style={{ color: COLORS.textPrimary, fontSize: 10, marginBottom: 2 }}>
        {formatTopLabel(d.total_revenue)}
      </Text>
    ),
  }));

  // Adjust bar width and spacing based on number of months
  const barWidth = timeframe === 'year' ? 24.5 : 100;
  const spacing = timeframe === 'year' ? 12 : 20;

  return (
    <View className="flex-1">
      <Text 
        className="text-base font-semibold mb-3" 
        style={{ color: COLORS.textPrimary, paddingRight: 110 }}
      >
        {title}
      </Text>
      <View style={{ flex: 1, marginTop: 24 }}>
        <BarChart
          data={barDataWithLabels}
          barWidth={barWidth}
          noOfSections={4}
          barBorderRadius={6}
          frontColor={COLORS.primary}
          gradientColor={COLORS.primaryLight}
          showGradient
          yAxisThickness={0}
          xAxisThickness={0}
          yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 11 }}
          xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: timeframe === 'year' ? 8 : 11 }}
          maxValue={roundedMax}
          spacing={spacing}
          hideRules={false}
          rulesColor="rgba(255, 255, 255, 0.1)"
          rulesType="solid"
          yAxisLabelPrefix=""
          formatYLabel={formatYLabel}
          isAnimated
          animationDuration={500}
          disableScroll
        />
      </View>
    </View>
  );
}
