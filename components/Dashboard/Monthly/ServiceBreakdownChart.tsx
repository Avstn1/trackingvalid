import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

// Original pastel colors
const CHART_COLORS = [
  '#F6E27F', '#E7B7A3', '#A7C7E7', '#C6D8A8', '#9AD1C9',
  '#B7A0E3', '#F5D6C6', '#F7C9D2', '#C9E5D3', '#D6D6D6',
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

const CenterLabel = ({ totalBookings }: { totalBookings: number }) => (
  <View className="items-center justify-center">
    <Text className="text-2xl font-bold" style={{ color: COLORS.textPrimary }}>
      {totalBookings}
    </Text>
    <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
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
        className="rounded-xl overflow-hidden justify-center items-center"
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
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text className="mt-2 text-xs" style={{ color: COLORS.textSecondary }}>
          Loading services...
        </Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View 
        className="rounded-xl overflow-hidden justify-center items-center"
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
        <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
          No service data yet!
        </Text>
      </View>
    );
  }

  const filteredData = data.filter(
    (item) => 
      item.service_name.toLowerCase() !== 'other' && 
      item.service_name.toLowerCase() !== 'others'
  );

  const topServices = filteredData.slice(0, 5);
  const otherServices = filteredData.slice(5);
  
  const chartData = topServices.map((item, index) => ({
    value: item.bookings,
    color: CHART_COLORS[index % CHART_COLORS.length],
    label: item.service_name,
    focused: selectedIndex === index,
  }));

  // Handle remaining services - only group if 2+
  if (otherServices.length === 1) {
    // Just 1 extra service - show it by name
    chartData.push({
      value: otherServices[0].bookings,
      color: CHART_COLORS[5 % CHART_COLORS.length],
      label: otherServices[0].service_name,
      focused: selectedIndex === 5,
    });
  } else if (otherServices.length > 1) {
    // 2+ extra services - group into "Others"
    const othersTotal = otherServices.reduce((sum, item) => sum + item.bookings, 0);
    chartData.push({
      value: othersTotal,
      color: CHART_COLORS[5 % CHART_COLORS.length],
      label: `+${otherServices.length} more`,
      focused: selectedIndex === 5,
    });
  }

  const screenWidth = Dimensions.get('window').width;
  const chartSize = Math.min(screenWidth * 0.45, 220);
  const totalBookings = chartData.reduce((sum, item) => sum + item.value, 0);
  
  const legendData = chartData.map((item, index) => ({
    ...item,
    percentage: ((item.value / totalBookings) * 100).toFixed(1),
    index,
  }));

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

      <Text className="text-lg font-semibold mb-3" style={{ color: COLORS.primary }}>
        💈 Service Breakdown
      </Text>

      <View className="flex-row" style={{ minHeight: 280 }}>
        <View className="flex-1 items-center justify-center" style={{ paddingVertical: 10 }}>
          <PieChart
            data={chartData}
            radius={chartSize * 0.42}
            innerRadius={chartSize * 0.24}
            innerCircleColor={COLORS.background}
            focusOnPress
            onPress={(item: { index: number }) => {
              setSelectedIndex(selectedIndex === item.index ? null : item.index);
            }}
            textColor={COLORS.textPrimary}
            textSize={12}
            showText
            textBackgroundColor={COLORS.background}
            textBackgroundRadius={6}
            donut
            centerLabelComponent={() => <CenterLabel totalBookings={totalBookings} />}
            semiCircle={false}
            animationDuration={800}
          />
        </View>

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
                
                <View className="flex-1">
                  <Text 
                    className="text-sm font-medium" 
                    numberOfLines={1}
                    style={{ 
                      color: isSelected ? COLORS.primary : COLORS.textPrimary,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: COLORS.textSecondary }}>
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
