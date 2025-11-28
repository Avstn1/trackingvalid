import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, View } from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

// Color Palette
const COLORS_PALETTE = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
};

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
  refreshKey?: number;
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

        let finalData: MarketingFunnel[];
        if (sorted.length <= 4) {
          finalData = sorted;
        } else {
          const top4 = sorted.slice(0, 4);
          const others = sorted.slice(4);
          
          const othersAgg = others.reduce(
            (acc, item) => ({
              source: 'Other',
              new_clients: acc.new_clients + item.new_clients,
              returning_clients: acc.returning_clients + item.returning_clients,
              retention: acc.retention + item.retention,
            }),
            { source: 'Other', new_clients: 0, returning_clients: 0, retention: 0 }
          );

          if (others.length > 0) {
            othersAgg.retention = othersAgg.retention / others.length;
          }

          finalData = [...top4, othersAgg];
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
      <View 
        className="rounded-xl overflow-hidden items-center justify-center"
        style={{ 
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
          height: SCREEN_HEIGHT * 0.35,
          width: SCREEN_WIDTH * 0.935,
          padding: 16,
        }}
      >
        <ActivityIndicator size="small" color={COLORS_PALETTE.green} />
        <Text className="text-sm mt-2" style={{ color: COLORS_PALETTE.textMuted }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View 
        className="rounded-xl overflow-hidden items-center justify-center"
        style={{ 
          backgroundColor: COLORS_PALETTE.surface,
          borderWidth: 1,
          borderColor: COLORS_PALETTE.glassBorder,
          height: SCREEN_HEIGHT * 0.35,
          width: SCREEN_WIDTH * 0.935,
          padding: 16,
        }}
      >
        <Text className="text-sm" style={{ color: COLORS_PALETTE.textMuted }}>
          No data to see here yet!
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(...data.map((item) => Math.max(item.new_clients, item.returning_clients)));

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
        height: SCREEN_HEIGHT * 0.35,
        width: SCREEN_WIDTH * 0.935,
        padding: 16,
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

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-bold" style={{ color: COLORS_PALETTE.green }}>
          📣 Marketing Funnels ({timeframe === 'year' ? year : `${timeframe} ${year}`})
        </Text>

        <View className="flex-row gap-2">
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.newClients }} />
            <Text className="text-[9px]" style={{ color: COLORS_PALETTE.text }}>New</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.returningClients }} />
            <Text className="text-[9px]" style={{ color: COLORS_PALETTE.text }}>Ret</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.retention }} />
            <Text className="text-[9px]" style={{ color: COLORS_PALETTE.text }}>%</Text>
          </View>
        </View>
      </View>

      <View className="pr-2 flex-1">
        {data.map((item, idx) => {
          const newClients = item.new_clients || 0;
          const returningClients = item.returning_clients || 0;
          const newWidth = maxValue > 0 ? (newClients / maxValue) * 100 : 0;
          const returningWidth = maxValue > 0 ? (returningClients / maxValue) * 100 : 0;

          const itemCount = data.length;
          const isLast = idx === itemCount - 1;
          
          return (
            <View key={idx} style={{ flex: 1, marginBottom: isLast ? 0 : 8 }}>
              <Text 
                className="text-[10px] font-semibold mb-0.5" 
                numberOfLines={1}
                style={{ color: COLORS_PALETTE.text }}
              >
                {item.source}
              </Text>

              <View className="flex-row items-center mb-0.5">
                <View
                  className="h-2 rounded"
                  style={{
                    backgroundColor: COLORS.newClients,
                    width: `${newWidth}%`,
                    minWidth: 10,
                  }}
                />
                <Text className="text-[9px] ml-1.5" style={{ color: COLORS_PALETTE.text }}>
                  {newClients}
                </Text>
              </View>

              <View className="flex-row items-center mb-0.5">
                <View
                  className="h-2 rounded"
                  style={{
                    backgroundColor: COLORS.returningClients,
                    width: `${returningWidth}%`,
                    minWidth: 10,
                  }}
                />
                <Text className="text-[9px] ml-1.5" style={{ color: COLORS_PALETTE.text }}>
                  {returningClients}
                </Text>
              </View>

              <View className="flex-row items-center">
                <View
                  className="h-1.5 rounded"
                  style={{
                    backgroundColor: COLORS.retention,
                    width: `${Math.min((item.retention || 0), 100)}%`,
                    minWidth: 10,
                  }}
                />
                <Text className="text-[9px] ml-1.5" style={{ color: COLORS_PALETTE.textMuted }}>
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