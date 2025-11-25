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
}

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface TimeframeMarketingFunnelsChartProps {
  barberId: string;
  year: number;
  timeframe: Timeframe;
  refreshKey: number;
}

const ALL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const MONTHS_BY_QUARTER: Record<Exclude<Timeframe, 'year'>, string[]> = {
  Q1: ['January', 'February', 'March'],
  Q2: ['April', 'May', 'June'],
  Q3: ['July', 'August', 'September'],
  Q4: ['October', 'November', 'December'],
};

export default function TimeframeMarketingFunnelsChart({
  barberId,
  year,
  timeframe,
  refreshKey,
}: TimeframeMarketingFunnelsChartProps) {
  const [data, setData] = useState<MarketingFunnel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!barberId || !year) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const monthsToUse = timeframe === 'year' ? ALL_MONTHS : MONTHS_BY_QUARTER[timeframe];

        const { data: funnels, error } = await supabase
          .from('marketing_funnels')
          .select('source, new_clients, returning_clients, retention, report_month')
          .eq('user_id', barberId)
          .eq('report_year', year)
          .in('report_month', monthsToUse);

        if (error) {
          console.error('Error fetching marketing funnels:', error);
          setData([]);
          return;
        }

        const map = new Map<string, any>();

        (funnels ?? []).forEach((row: any) => {
          const source: string = row.source ?? 'Unknown';
          if (!source || source === 'Unknown' || source === 'Returning Client') return;

          if (!map.has(source)) {
            map.set(source, {
              source,
              new_clients: 0,
              returning_clients: 0,
              retentionSum: 0,
              retentionCount: 0,
            });
          }

          const agg = map.get(source)!;
          agg.new_clients += Number(row.new_clients) || 0;
          agg.returning_clients += Number(row.returning_clients) || 0;

          const ret = row.retention !== null && row.retention !== undefined ? Number(row.retention) : null;
          if (ret !== null) {
            agg.retentionSum += ret;
            agg.retentionCount += 1;
          }
        });

        const sorted: MarketingFunnel[] = Array.from(map.values())
          .map((agg) => ({
            source: agg.source,
            new_clients: agg.new_clients,
            returning_clients: agg.returning_clients,
            retention: agg.retentionCount > 0 ? agg.retentionSum / agg.retentionCount : 0,
          }))
          .sort((a, b) => (b.new_clients + b.returning_clients) - (a.new_clients + a.returning_clients));

        // Take top 5 and aggregate the rest into "Others"
        let finalData: MarketingFunnel[];
        if (sorted.length <= 5) {
          finalData = sorted;
        } else {
          const top5 = sorted.slice(0, 5);
          const others = sorted.slice(5);
          
          const othersAgg = others.reduce(
            (acc, item) => ({
              source: 'Others',
              new_clients: acc.new_clients + item.new_clients,
              returning_clients: acc.returning_clients + item.returning_clients,
              retention: acc.retention + item.retention,
            }),
            { source: 'Others', new_clients: 0, returning_clients: 0, retention: 0 }
          );

          // Average retention for "Others"
          if (others.length > 0) {
            othersAgg.retention = othersAgg.retention / others.length;
          }

          finalData = [...top5, othersAgg];
        }

        setData(finalData);
      } catch (err) {
        console.error('Error preparing timeframe marketing funnels:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [barberId, year, timeframe, refreshKey]);

  if (loading) {
    return (
      <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 min-h-[200px] items-center justify-center">
        <ActivityIndicator size="small" color="#c4ff85" />
        <Text className="text-lime-300 text-sm mt-2">Loading...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 min-h-[200px] items-center justify-center">
        <Text className="text-lime-300 text-sm opacity-70">No data to see here yet!</Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((item) => Math.max(item.new_clients, item.returning_clients)));

  // Calculate dynamic height: base height + (number of items * height per item)
  // Each item needs ~60px (title + 3 bars + spacing)
  const baseHeight = 100; // For title and legend
  const itemHeight = 60;
  const containerHeight = baseHeight + (data.length * itemHeight) - 40;

  return (
    <View 
      className="rounded-xl bg-zinc-900 border border-zinc-800 p-3"
      style={{ minHeight: containerHeight }}
    >
      <Text className="text-lime-300 text-lg font-bold mb-2">
        📣 Marketing Funnels ({timeframe === 'year' ? year : `${timeframe} ${year}`})
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

      <View className="flex-1 mr-7">
        {data.map((item, idx) => {
          const newWidth = maxValue > 0 ? (item.new_clients / maxValue) * 100 : 0;
          const returningWidth = maxValue > 0 ? (item.returning_clients / maxValue) * 100 : 0;

          return (
            <View key={idx} className="mb-2">
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
                <Text className="text-white text-[9px] ml-1">{item.new_clients}</Text>
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
                <Text className="text-white text-[9px] ml-1">{item.returning_clients}</Text>
              </View>

              {/* Retention Bar */}
              <View className="flex-row items-center">
                <View
                  className="h-2 rounded"
                  style={{
                    backgroundColor: COLORS.retention,
                    width: `${Math.min(item.retention, 100)}%`,
                    minWidth: 15,
                  }}
                />
                <Text className="text-gray-400 text-[9px] ml-1">{item.retention.toFixed(0)}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}