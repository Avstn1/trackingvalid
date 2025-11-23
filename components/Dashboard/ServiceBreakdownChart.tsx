import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { supabase } from '@/utils/supabaseClient';

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
      <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 min-h-[300px] justify-center items-center">
        <ActivityIndicator color="#c4ff85" size="large" />
        <Text className="text-zinc-400 mt-2 text-xs">Loading services...</Text>
      </View>
    );
  }

  if (!data.length) {
    return (
      <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 min-h-[300px] justify-center items-center">
        <Text className="text-lime-300 opacity-70 text-sm">No service data yet!</Text>
      </View>
    );
  }

  // Prepare data: Top 5 + Others
  const topServices = data.slice(0, 5);
  const otherServices = data.slice(5);
  
  const chartData = topServices.map((item, index) => ({
    name: item.service_name.length > 12 
      ? item.service_name.substring(0, 12) + '...' 
      : item.service_name,
    population: item.bookings,
    color: COLORS[index % COLORS.length],
    legendFontColor: '#d4e5c7',
    legendFontSize: 10,
  }));

  // Add "Others" if there are more than 5 services
  if (otherServices.length > 0) {
    const othersTotal = otherServices.reduce((sum, item) => sum + item.bookings, 0);
    chartData.push({
      name: `Others (${otherServices.length})`,
      population: othersTotal,
      color: COLORS[5 % COLORS.length],
      legendFontColor: '#d4e5c7',
      legendFontSize: 10,
    });
  }

  const screenWidth = Dimensions.get('window').width;

  return (
    <View className="p-4 rounded-xl bg-zinc-900 border border-zinc-800">
      <Text className="text-lime-300 text-base font-semibold mb-2">
        💈 Service Breakdown
      </Text>

      {/* Pie Chart with Legend */}
      <View className="items-center">
        <PieChart
          data={chartData}
          width={screenWidth - 40}
          height={280}
          chartConfig={{
            color: (opacity = 1) => `rgba(196, 255, 133, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
          }}
          accessor="population"
          backgroundColor="transparent"
          paddingLeft="10"
          absolute
          hasLegend={true}
        />
      </View>
    </View>
  );
}