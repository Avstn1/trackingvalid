import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// Color Palette - matching yearly green theme
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
  topN = 4,
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
            f.source !== 'Returning Client' &&
            ((f.new_clients || 0) > 0 || (f.returning_clients || 0) > 0 || (f.retention || 0) > 0)
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
      <View 
        className="rounded-xl overflow-hidden flex-1 items-center justify-center"
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
        className="rounded-xl overflow-hidden flex-1 items-center justify-center"
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
        <Text style={{ color: COLORS_PALETTE.textMuted }}>
          No data to see here yet!
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((item) => Math.max(item.new_clients || 0, item.returning_clients || 0))
  );

  return (
    <View 
      className="rounded-xl overflow-hidden flex-1"
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

      <View className="flex-row items-center justify-between mb-3">
        <Text className="text-base font-semibold" style={{ color: COLORS_PALETTE.green }}>
          📣 Marketing Funnels
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