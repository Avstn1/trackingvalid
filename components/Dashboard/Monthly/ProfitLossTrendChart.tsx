import { COLORS } from '@/constants/design-system';
import { parseYMDToLocalDate } from '@/utils/date';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

const CHART_COLORS = [
  '#F6E27F', '#E7B7A3', '#A7C7E7', '#C6D8A8', '#9AD1C9',
  '#B7A0E3', '#F5D6C6', '#F7C9D2', '#C9E5D3', '#D6D6D6',
];

interface ProfitLossTrendChartProps {
  userId: string;
  selectedMonth: string;
  selectedYear: number;
  refreshKey?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

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

        // Get today's date and the month index
        const today = new Date();
        const monthIndex = MONTHS.indexOf(selectedMonth);
        
        // Determine how many days to show
        let daysToShow: number;
        if (selectedYear === today.getFullYear() && monthIndex === today.getMonth()) {
          // Current month - show up to today
          daysToShow = today.getDate();
        } else if (
          selectedYear < today.getFullYear() ||
          (selectedYear === today.getFullYear() && monthIndex < today.getMonth())
        ) {
          // Past month - show all days in that month
          daysToShow = new Date(selectedYear, monthIndex + 1, 0).getDate();
        } else {
          // Future month - no data
          setData({ labels: [], revenue: [], expenses: [], profit: [] });
          return;
        }

        // Create a map of existing data by day number
        const dataByDay: { [key: number]: { revenue: number; expenses: number } } = {};
        if (daily) {
          daily.forEach((d) => {
            const dateObj = parseYMDToLocalDate(d.date);
            const dayNum = dateObj.getDate();
            dataByDay[dayNum] = {
              revenue: Number(d.final_revenue || 0),
              expenses: Number(d.expenses || 0),
            };
          });
        }

        const recordedDays = Object.keys(dataByDay)
          .map((day) => parseInt(day, 10))
          .sort((a, b) => a - b);

        if (recordedDays.length === 0) {
          setData({ labels: [], revenue: [], expenses: [], profit: [] });
          return;
        }

        const startDay = recordedDays[0];

        // Build arrays for all days, filling missing days with 0
        const labels: string[] = [];
        const revenue: number[] = [];
        const expenses: number[] = [];
        const profit: number[] = [];

        if (startDay > daysToShow) {
          setData({ labels: [], revenue: [], expenses: [], profit: [] });
          return;
        }

        for (let day = startDay; day <= daysToShow; day++) {
          labels.push(day.toString());
          const dayData = dataByDay[day];
          if (dayData) {
            revenue.push(dayData.revenue);
            expenses.push(dayData.expenses);
            profit.push(dayData.revenue - dayData.expenses);
          } else {
            revenue.push(0);
            expenses.push(0);
            profit.push(0);
          }
        }

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
      <View 
        className="rounded-xl overflow-hidden items-center justify-center"
        style={{
          backgroundColor: COLORS.surfaceGlass,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          padding: 16,
          marginHorizontal: -14,
          minHeight: 280,
        }}
      >
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text className="text-sm mt-2" style={{ color: COLORS.textSecondary }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (data.labels.length === 0) {
    return (
      <View 
        className="rounded-xl overflow-hidden items-center justify-center"
        style={{
          backgroundColor: COLORS.surfaceGlass,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          padding: 16,
          marginHorizontal: -14,
          minHeight: 280,
        }}
      >
        <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
          No daily data yet for {selectedMonth}
        </Text>
      </View>
    );
  }

  const numPoints = data.labels.length;
  const lastIndex = numPoints - 1;

  // Show label every 2 days AND always the last day
  const lineData = data.labels.map((label, index) => {
    const isEvenIndex = index % 2 === 0;
    const isLastDay = index === lastIndex;
    
    return {
      value: data.revenue[index],
      label: (isEvenIndex || isLastDay) ? label : '',
    };
  });

  const expensesData = data.labels.map((label, index) => ({
    value: data.expenses[index],
  }));

  const profitData = data.labels.map((label, index) => ({
    value: data.profit[index],
  }));

  const maxValue = Math.max(
    ...data.revenue,
    ...data.expenses,
    ...data.profit.map(Math.abs),
    100 // Minimum max value so chart doesn't look weird with all zeros
  );

  // Calculate spacing to fit all points with extra room at the end
  const yAxisWidth = 38;
  const initialSpacing = 8;
  const endSpacing = 35;
  const containerPadding = 32;
  
  const availableWidth = screenWidth - containerPadding - yAxisWidth - initialSpacing - endSpacing;
  const spacing = numPoints > 1 ? availableWidth / (numPoints - 1) : availableWidth;

  return (
    <View 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: COLORS.surfaceGlass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
        padding: 16,
        marginHorizontal: -14,
        minHeight: 345,
        maxHeight: 345,
      }}
    >
      {/* Subtle highlight at top */}
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

      <Text 
        className="text-lg font-semibold mb-3"
        style={{ color: COLORS.primary }}
      >
        📈 Profit/Loss Trend (Daily)
      </Text>

      <View style={{ minHeight: 254, marginRight: 30 }}>
        <LineChart
          data={lineData}
          data2={expensesData}
          data3={profitData}
          height={220}
          width={screenWidth - containerPadding - 28}
          spacing={spacing}
          initialSpacing={initialSpacing}
          endSpacing={endSpacing}
          thickness={2}
          thickness2={2}
          thickness3={2}
          color1={COLORS.primary}
          color2={COLORS.primaryLight}
          color3="#FFEB3B"
          hideRules={false}
          rulesType="solid"
          rulesColor={COLORS.glassBorder}
          yAxisColor={COLORS.glassBorder}
          xAxisColor={COLORS.glassBorder}
          yAxisTextStyle={{ color: COLORS.textSecondary, fontSize: 10 }}
          xAxisLabelTextStyle={{ color: COLORS.textSecondary, fontSize: 9 }}
          maxValue={maxValue * 1.15}
          noOfSections={4}
          yAxisLabelWidth={yAxisWidth}
          areaChart
          startFillColor1={COLORS.primary}
          endFillColor1="transparent"
          startOpacity={0.25}
          endOpacity={0}
          startFillColor2={COLORS.primaryLight}
          endFillColor2="transparent"
          startOpacity2={0.25}
          endOpacity2={0}
          startFillColor3="#FFEB3B"
          endFillColor3="transparent"
          startOpacity3={0.25}
          endOpacity3={0}
          curved
          hideDataPoints={false}
          dataPointsColor1={COLORS.primary}
          dataPointsColor2={COLORS.primaryLight}
          dataPointsColor3="#FFEB3B"
          dataPointsRadius={3}
          disableScroll={true}
          scrollToEnd={false}
          isAnimated
          animationDuration={600}
        />
      </View>

      {/* Legend */}
      <View className="flex-row gap-4 mt-3 justify-center">
        <View className="flex-row items-center gap-1.5">
          <View 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: COLORS.primary }} 
          />
          <Text className="text-[10px]" style={{ color: COLORS.textPrimary }}>
            Revenue
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: COLORS.primaryLight }} 
          />
          <Text className="text-[10px]" style={{ color: COLORS.textPrimary }}>
            Expenses
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <View 
            className="w-2.5 h-2.5 rounded-full" 
            style={{ backgroundColor: '#FFEB3B' }} 
          />
          <Text className="text-[10px]" style={{ color: COLORS.textPrimary }}>
            Profit
          </Text>
        </View>
      </View>
    </View>
  );
}
