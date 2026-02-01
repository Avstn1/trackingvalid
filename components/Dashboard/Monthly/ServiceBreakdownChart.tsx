import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';

// Color Palette - matching yearly green theme
const COLORS_PALETTE = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
  greenLight: '#beb348ff',
};

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
    <Text className="text-2xl font-bold" style={{ color: COLORS_PALETTE.text }}>
      {totalBookings}
    </Text>
    <Text className="text-sm" style={{ color: COLORS_PALETTE.textMuted }}>
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
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
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
        <ActivityIndicator color={COLORS_PALETTE.green} size="large" />
        <Text className="mt-2 text-xs" style={{ color: COLORS_PALETTE.textMuted }}>
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
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
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
        <Text className="text-sm" style={{ color: COLORS_PALETTE.textMuted }}>
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
          backgroundColor: COLORS_PALETTE.glassHighlight,
        }}
      />

      <Text className="text-lg font-semibold mb-3" style={{ color: COLORS_PALETTE.green }}>
        💈 Service Breakdown
      </Text>

      <View className="flex-row" style={{ minHeight: 280 }}>
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
            textSize={12}
            showText
            textBackgroundColor={COLORS_PALETTE.background}
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
                      color: isSelected ? COLORS_PALETTE.green : COLORS_PALETTE.text,
                      fontWeight: isSelected ? '700' : '500',
                    }}
                  >
                    {item.label}
                  </Text>
                  <Text className="text-xs mt-1" style={{ color: COLORS_PALETTE.textMuted }}>
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
