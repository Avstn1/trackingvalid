import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

// Color Palette - matching dashboard theme
const COLORS_PALETTE = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.4)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
};

interface ProfitMarginPieChartProps {
  readonly userId: string;
  readonly selectedMonth: string;
  readonly selectedYear: number;
  readonly refreshKey?: number;
}

// Center label component for the pie chart
const CenterLabel = ({ totalAmount }: { totalAmount: number }) => (
  <View className="items-center justify-center">
    <Text 
      className="text-lg font-bold"
      style={{ color: COLORS_PALETTE.text }}
    >
      ${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
    </Text>
    <Text 
      className="text-xs"
      style={{ color: COLORS_PALETTE.textMuted }}
    >
      Total
    </Text>
  </View>
);

export default function ProfitMarginPieChart({
  userId,
  selectedMonth,
  selectedYear,
  refreshKey,
}: ProfitMarginPieChartProps) {
  const [data, setData] = useState<{ value: number; color: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
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
            value: profit,
            color: COLORS_PALETTE.yellow,
            label: 'Profit',
          },
          {
            value: expenses,
            color: COLORS_PALETTE.orange,
            label: 'Expenses',
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
      <View 
        className="rounded-xl overflow-hidden justify-center items-center"
        style={{
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
          padding: 16,
          marginHorizontal: -14,
          minHeight: 320,
        }}
      >
        <ActivityIndicator color={COLORS_PALETTE.orange} size="large" />
        <Text className="mt-2 text-xs" style={{ color: COLORS_PALETTE.textMuted }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View 
        className="rounded-xl overflow-hidden justify-center items-center"
        style={{
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
          padding: 16,
          marginHorizontal: -14,
          minHeight: 320,
        }}
      >
        <Text className="text-sm" style={{ color: COLORS_PALETTE.textMuted }}>
          No data yet for {selectedMonth}
        </Text>
      </View>
    );
  }

  const chartSize = Math.min(screenWidth * 0.5, 200);
  const revenue = data.find(item => item.label === 'Profit')?.value || 0;
  const expenses = data.find(item => item.label === 'Expenses')?.value || 0;
  const totalAmount = revenue + expenses; // This is the total revenue
  
  // Prepare legend data with percentages
  const legendData = data.map((item, index) => ({
    ...item,
    percentage: ((item.value / totalAmount) * 100).toFixed(1),
    index,
  }));

  return (
    <View 
      className="rounded-xl overflow-hidden"
      style={{
        backgroundColor: COLORS_PALETTE.surface,
        borderWidth: 1,
        borderColor: COLORS_PALETTE.glassBorder,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
        padding: 16,
        marginHorizontal: -14,
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
          backgroundColor: COLORS_PALETTE.glassHighlight,
        }}
      />

      <Text 
        className="text-base font-semibold mb-3"
        style={{ color: COLORS_PALETTE.orange }}
      >
        🥧 Profit vs Expenses
      </Text>

      <View className="flex-row" style={{ minHeight: 270 }}>
        {/* Pie Chart */}
        <View className="flex-1 items-center justify-center" style={{ paddingVertical: 10, paddingLeft: 40}}>
          <PieChart
            data={data}
            radius={chartSize * 0.42}
            innerRadius={chartSize * 0.24}
            innerCircleColor={COLORS_PALETTE.background}
            focusOnPress
            onPress={(item: { index: number }) => {
              setSelectedIndex(selectedIndex === item.index ? null : item.index);
            }}
            textColor={COLORS_PALETTE.text}
            textSize={10}
            showText
            textBackgroundColor={COLORS_PALETTE.background}
            textBackgroundRadius={4}
            donut
            centerLabelComponent={() => <CenterLabel totalAmount={totalAmount} />}
            semiCircle={false}
            animationDuration={800}
          />
        </View>

        {/* Custom Legend - Interactive */}
        <View className="flex-1 pl-4 justify-center">
          {legendData.map((item, index) => {
            const isSelected = selectedIndex === index;
            return (
              <TouchableOpacity
                key={`${item.label}-${index}`}
                activeOpacity={0.7}
                onPress={() => setSelectedIndex(isSelected ? null : index)}
                className="flex-row items-center mb-3"
                style={{
                  opacity: selectedIndex !== null && selectedIndex !== index ? 0.5 : 1,
                  transform: [{ scale: isSelected ? 1.05 : 1 }],
                  paddingLeft: 20
                }}
              >
                {/* Color indicator with glow effect when selected */}
                <View 
                  className="rounded-full mr-2.5"
                  style={{
                    width: isSelected ? 14 : 12,
                    height: isSelected ? 14 : 12,
                    backgroundColor: item.color,
                    shadowColor: isSelected ? item.color : 'transparent',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: isSelected ? 0.8 : 0,
                    shadowRadius: isSelected ? 6 : 0,
                    elevation: isSelected ? 4 : 0,
                  }}
                />
                
                {/* Info */}
                <View className="flex-1">
                  <Text 
                    className="text-xs font-medium" 
                    numberOfLines={1}
                    style={{ 
                      color: isSelected ? COLORS_PALETTE.orange : COLORS_PALETTE.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text 
                    className="text-[10px] mt-0.5"
                    style={{ color: COLORS_PALETTE.textMuted }}
                  >
                    {formatCurrency(item.value)} ({item.percentage}%)
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}