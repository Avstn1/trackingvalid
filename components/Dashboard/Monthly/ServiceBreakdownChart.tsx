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

// Chart colors using theme colors with variations
const CHART_COLORS = [
  COLORS_PALETTE.orange,
  COLORS_PALETTE.purple,
  COLORS_PALETTE.yellow,
  '#FF8A65', // Lighter orange
  '#9575CD', // Lighter purple
  '#FFF176', // Lighter yellow
  '#FF7043', // Orange variant
  '#7E57C2', // Purple variant
  '#FDD835', // Yellow variant
  '#BCAAA4', // Neutral gray
];

export interface ServiceBooking {
  service_name: string;
  bookings: number;
  [key: string]: string | number;
}

interface ServiceBreakdownChartProps {
  readonly barberId: string;
  readonly month: string;
  readonly year: number;
}

// Center label component for the pie chart
const CenterLabel = ({ totalBookings }: { totalBookings: number }) => (
  <View className="items-center justify-center">
    <Text 
      className="text-lg font-bold"
      style={{ color: COLORS_PALETTE.text }}
    >
      {totalBookings}
    </Text>
    <Text 
      className="text-xs"
      style={{ color: COLORS_PALETTE.textMuted }}
    >
      Total
    </Text>
  </View>
);

export default function ServiceBreakdownChart({
  barberId,
  month,
  year,
}: ServiceBreakdownChartProps) {
  const [data, setData] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: bookings, error } = await supabase
          .from('service_bookings')
          .select('service_name, bookings')
          .eq('user_id', barberId)
          .eq('report_month', month)
          .eq('report_year', year);

        if (error) {
          console.error(error);
          setData([]);
          return;
        }

        const sorted = (bookings as ServiceBooking[]).sort(
          (a, b) => (b.bookings || 0) - (a.bookings || 0)
        );

        setData(sorted);
      } catch (err) {
        console.error('Error fetching service bookings:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [barberId, month, year]);

  if (loading) {
    return (
      <View 
        className="p-4 rounded-xl h-[200px] justify-center items-center"
        style={{
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
        }}
      >
        <ActivityIndicator color={COLORS_PALETTE.orange} size="large" />
        <Text className="mt-2 text-xs" style={{ color: COLORS_PALETTE.textMuted }}>
          Loading services...
        </Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View 
        className="p-4 rounded-xl h-[200px] justify-center items-center"
        style={{
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
        }}
      >
        <Text className="text-sm" style={{ color: COLORS_PALETTE.textMuted }}>
          No service data yet!
        </Text>
      </View>
    );
  }

  // Filter out any service named "Other" or "Others" to avoid duplicates
  const filteredData = data.filter(
    (item) => 
      item.service_name.toLowerCase() !== 'other' && 
      item.service_name.toLowerCase() !== 'others'
  );

  // Prepare data: Top 5 + Others
  const topServices = filteredData.slice(0, 5);
  const otherServices = filteredData.slice(5);
  
  const chartData = topServices.map((item, index) => ({
    value: item.bookings,
    color: CHART_COLORS[index % CHART_COLORS.length],
    label: item.service_name,
    focused: selectedIndex === index,
  }));

  // Add "Others" if there are more than 5 services
  if (otherServices.length > 0) {
    const othersTotal = otherServices.reduce((sum, item) => sum + item.bookings, 0);
    const othersIndex = 5;
    chartData.push({
      value: othersTotal,
      color: CHART_COLORS[5 % CHART_COLORS.length],
      label: `Others (${otherServices.length})`,
      focused: selectedIndex === othersIndex,
    });
  }

  const screenWidth = Dimensions.get('window').width;
  const chartSize = Math.min(screenWidth * 0.45, 220);
  const totalBookings = chartData.reduce((sum, item) => sum + item.value, 0);
  
  // Prepare legend data with percentages
  const legendData = chartData.map((item, index) => ({
    ...item,
    percentage: ((item.value / totalBookings) * 100).toFixed(1),
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
        💈 Service Breakdown
      </Text>

      <View className="flex-row" style={{ minHeight: 280 }}>
        {/* Pie Chart */}
        <View className="flex-1 items-center justify-center" style={{ paddingVertical: 10 }}>
          <PieChart
            data={chartData}
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
            centerLabelComponent={() => <CenterLabel totalBookings={totalBookings} />}
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
                
                {/* Service info */}
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
                    {item.value} bookings ({item.percentage}%)
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