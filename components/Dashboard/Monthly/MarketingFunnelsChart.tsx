import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

const COLORS = {
  newClients: '#9AC8CD',
  returningClients: '#748E63',
  retention: '#B19470',
};

export interface MarketingFunnel {
  source: string;
  new_clients: number;
  returning_clients: number;
  retention: number;
  avg_ticket: number;
  [key: string]: string | number | undefined;
}

interface MarketingFunnelsChartProps {
  barberId: string;
  month: string;
  year: number;
  topN?: number;
}

export default function MarketingFunnelsChart({
  barberId,
  month,
  year,
  topN = 5,
}: MarketingFunnelsChartProps) {
  const [data, setData] = useState<MarketingFunnel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: funnels, error } = await supabase
          .from('marketing_funnels')
          .select('source, new_clients, returning_clients, retention, avg_ticket')
          .eq('user_id', barberId)
          .eq('report_month', month)
          .eq('report_year', year);

        if (error) {
          console.error('Error fetching marketing funnels:', error);
          setData([]);
          return;
        }

        let filtered = (funnels as MarketingFunnel[]).filter(
          (f) =>
            f.source &&
            f.source !== 'Unknown' &&
            f.source !== 'Returning Client'
        );

        filtered.sort(
          (a, b) =>
            (b.new_clients || 0) + (b.returning_clients || 0) -
            ((a.new_clients || 0) + (a.returning_clients || 0))
        );

        const topSources = filtered.slice(0, topN);
        const otherSources = filtered.slice(topN);
        if (otherSources.length > 0) {
          const other = otherSources.reduce(
            (acc, f) => {
              acc.new_clients += f.new_clients || 0;
              acc.returning_clients += f.returning_clients || 0;
              acc.retention += f.retention || 0;
              acc.avg_ticket += f.avg_ticket || 0;
              return acc;
            },
            {
              source: 'Other',
              new_clients: 0,
              returning_clients: 0,
              retention: 0,
              avg_ticket: 0,
            } as MarketingFunnel
          );
          other.retention = otherSources.length
            ? other.retention / otherSources.length
            : 0;
          other.avg_ticket = otherSources.length
            ? other.avg_ticket / otherSources.length
            : 0;
          topSources.push(other);
        }

        setData(topSources);
      } catch (err) {
        console.error('Error:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [barberId, month, year, topN]);

  if (loading) {
    return (
      <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex-1 min-h-[280px] items-center justify-center">
        <ActivityIndicator size="small" color="#c4ff85" />
        <Text className="text-sm text-gray-400 mt-2">Loading...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex-1 min-h-[280px] items-center justify-center">
        <Text className="text-lime-300 opacity-70">No data to see here yet!</Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((item) => Math.max(item.new_clients || 0, item.returning_clients || 0))
  );

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex-1">
      <Text className="text-lime-300 text-lg font-bold mb-2">
        📣 Marketing Funnels
      </Text>

      {/* Legend */}
      <View className="flex-row gap-3 mb-2">
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.newClients }} />
          <Text className="text-white text-[10px]">New</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.returningClients }} />
          <Text className="text-white text-[10px]">Ret</Text>
        </View>
        <View className="flex-row items-center gap-1">
          <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.retention }} />
          <Text className="text-white text-[10px]">%</Text>
        </View>
      </View>

      <View className="flex-1 pr-4">
        {data.map((item, idx) => {
          const newClients = item.new_clients || 0;
          const returningClients = item.returning_clients || 0;
          const newWidth = maxValue > 0 ? (newClients / maxValue) * 100 : 0;
          const returningWidth = maxValue > 0 ? (returningClients / maxValue) * 100 : 0;

          return (
            <View key={idx} className="mb-2">
              {/* Source Name */}
              <Text className="text-white text-[10px] font-semibold mb-0.5" numberOfLines={1}>
                {item.source}
              </Text>

              {/* New Clients Bar */}
              <View className="flex-row items-center mb-0.5">
                <View
                  className="h-3 rounded"
                  style={{
                    backgroundColor: COLORS.newClients,
                    width: `${newWidth}%`,
                    minWidth: 15,
                  }}
                />
                <Text className="text-white text-[9px] ml-1">{newClients}</Text>
              </View>

              {/* Returning Clients Bar */}
              <View className="flex-row items-center mb-0.5">
                <View
                  className="h-3 rounded"
                  style={{
                    backgroundColor: COLORS.returningClients,
                    width: `${returningWidth}%`,
                    minWidth: 15,
                  }}
                />
                <Text className="text-white text-[9px] ml-1">{returningClients}</Text>
              </View>

              {/* Retention Bar */}
              <View className="flex-row items-center">
                <View
                  className="h-2 rounded"
                  style={{
                    backgroundColor: COLORS.retention,
                    width: `${Math.min((item.retention || 0), 100)}%`,
                    minWidth: 15,
                  }}
                />
                <Text className="text-gray-400 text-[9px] ml-1">
                  {item.retention?.toFixed(0)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}