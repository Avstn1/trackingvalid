import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, View } from 'react-native';
import { PieChart } from 'react-native-chart-kit';

const COLORS = [
  '#F6E27F', '#E7B7A3', '#A7C7E7', '#C6D8A8', '#9AD1C9',
  '#B7A0E3', '#F5D6C6', '#F7C9D2', '#C9E5D3', '#D6D6D6',
];

export interface ServiceBooking {
  service_name: string;
  bookings: number;
  [key: string]: string | number;
}

interface ServiceBreakdownChartProps {
  barberId: string;
  month: string;
  year: number;
}

export default function ServiceBreakdownChart({
  barberId,
  month,
  year,
}: ServiceBreakdownChartProps) {
  const [data, setData] = useState<ServiceBooking[]>([]);
  const [loading, setLoading] = useState(true);

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
      <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 h-[200px] justify-center items-center">
        <ActivityIndicator color="#c4ff85" size="large" />
        <Text className="text-zinc-400 mt-2 text-xs">Loading services...</Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 h-[200px] justify-center items-center">
        <Text className="text-lime-300 opacity-70 text-sm">No service data yet!</Text>
      </View>
    );
  }

  // Prepare data: Top 5 + Others
  const topServices = data.slice(0, 5);
  const otherServices = data.slice(5);
  
  const chartData = topServices.map((item, index) => ({
    name: item.service_name,
    population: item.bookings,
    color: COLORS[index % COLORS.length],
  }));

  // Add "Others" if there are more than 5 services
  if (otherServices.length > 0) {
    const othersTotal = otherServices.reduce((sum, item) => sum + item.bookings, 0);
    chartData.push({
      name: `Others (${otherServices.length})`,
      population: othersTotal,
      color: COLORS[5 % COLORS.length],
    });
  }

  const screenWidth = Dimensions.get('window').width;
  const totalBookings = chartData.reduce((sum, item) => sum + item.population, 0);

  return (
    <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <Text className="text-lime-300 text-base font-semibold mb-3">
        💈 Service Breakdown
      </Text>

      <View className="flex-row h-[200px]">
        {/* Pie Chart - 1/2 of space */}
        <View className="flex-1 items-center justify-center">
          <PieChart
            data={chartData}
            width={screenWidth / 3}
            height={180}
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
        <View className="flex-1 pl-2">
          {chartData.map((item, index) => {
            const percentage = ((item.population / totalBookings) * 100).toFixed(1);
            return (
              <View key={index} className="flex-row items-center mb-2.5">
                {/* Color indicator */}
                <View 
                  className="w-3 h-3 rounded-full mr-2" 
                  style={{ backgroundColor: item.color }}
                />
                
                {/* Service info */}
                <View className="flex-1">
                  <Text className="text-white text-xs font-medium" numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text className="text-zinc-400 text-[10px]">
                    {item.population} bookings ({percentage}%)
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