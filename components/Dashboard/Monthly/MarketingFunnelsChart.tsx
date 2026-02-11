import { COLORS } from '@/constants/design-system';
import { getStaggerDelay, SPRING, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import MarketingFunnelsDetailsModal from '../MarketingFunnelsDetailsModal';

// Chart-specific colors
const CHART_COLORS = {
  newClients: '#9AC8CD',
  newClientsRetained: '#748E63',
  retention: '#B19470',
};

// Animated bar component for smooth entry
interface AnimatedBarProps {
  width: number;
  height: number;
  color: string;
  delay: number;
  reduceMotion: boolean;
}

function AnimatedBar({ width, height, color, delay, reduceMotion }: AnimatedBarProps) {
  const progress = useSharedValue(reduceMotion ? 1 : 0);

  React.useEffect(() => {
    if (!reduceMotion) {
      progress.value = withDelay(delay, withSpring(1, SPRING.gentle));
    }
  }, [reduceMotion, delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progress.value * width}%`,
    minWidth: reduceMotion ? 10 : progress.value > 0 ? 10 : 0,
  }));

  return (
    <Animated.View
      className="rounded"
      style={[
        {
          height,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
}

export interface MarketingFunnel {
  source: string;
  new_clients: number;
  returning_clients: number;
  new_clients_retained: number;
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const reduceMotion = useReducedMotionPreference();

  // Convert month name to number
  const getMonthNumber = (monthName: string): number => {
    const monthMap: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    return monthMap[monthName] || 1;
  };

  // Check if a date falls within the timeline
  const isDateInTimeline = (dateString: string, monthName: string, yearNum: number): boolean => {
    if (!dateString) return false;
    
    const date = new Date(dateString + 'T00:00:00');
    const dateMonth = date.getMonth() + 1;
    const dateYear = date.getFullYear();
    
    if (dateYear !== yearNum) return false;
    
    const targetMonth = getMonthNumber(monthName);
    return dateMonth === targetMonth;
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const monthNumber = getMonthNumber(month);

        // Fetch clients who had their first appointment in the selected month/year
        const { data: clients, error } = await supabase
          .from('acuity_clients')
          .select('client_id, first_name, last_name, first_appt, second_appt, first_source')
          .eq('user_id', barberId)
          .not('first_source', 'is', null)
          .not('first_source', 'eq', 'Unknown')
          .not('first_source', 'eq', 'Returning Client')
          .not('first_source', 'eq', 'No Source')
          .gte('first_appt', `${year}-01-01`)
          .lte('first_appt', `${year}-12-31`);

        if (error) {
          console.error('Error fetching client details:', error);
          setData([]);
          setLoading(false);
          return;
        }

        // Filter clients whose first_appt is in the selected month
        const filteredClients = clients?.filter(client => {
          if (!client.first_appt) return false;
          const apptMonth = new Date(client.first_appt + 'T00:00:00').getMonth() + 1;
          return apptMonth === monthNumber;
        }) || [];

        // Group clients by source and calculate metrics
        const sourceMap = new Map<string, MarketingFunnel>();

        filteredClients.forEach(client => {
          const source = client.first_source || 'Unknown';
          
          if (!sourceMap.has(source)) {
            sourceMap.set(source, {
              source,
              new_clients: 0,
              returning_clients: 0,
              new_clients_retained: 0,
              retention: 0,
              avg_ticket: 0,
            });
          }
          
          const funnel = sourceMap.get(source)!;
          funnel.new_clients += 1;
          
          // Check if client returned within the same month
          const hasSecondAppt = !!client.second_appt;
          const isInTimeline = hasSecondAppt && isDateInTimeline(client.second_appt, month, year);
          
          if (isInTimeline) {
            funnel.new_clients_retained += 1;
          }
        });

        // Calculate retention for each source
        const funnelData = Array.from(sourceMap.values()).map(funnel => ({
          ...funnel,
          retention: funnel.new_clients > 0 
            ? (funnel.new_clients_retained / funnel.new_clients) * 100 
            : 0
        }));

        // Sort by total new clients
        funnelData.sort((a, b) => b.new_clients - a.new_clients);

        const topSources = funnelData.slice(0, topN);
        const otherSources = funnelData.slice(topN);
        
        if (otherSources.length > 0) {
          const other = otherSources.reduce(
            (acc, f) => {
              acc.new_clients += f.new_clients || 0;
              acc.returning_clients += f.returning_clients || 0;
              acc.new_clients_retained += f.new_clients_retained || 0;
              acc.avg_ticket += f.avg_ticket || 0;
              return acc;
            },
            {
              source: 'Other',
              new_clients: 0,
              returning_clients: 0,
              new_clients_retained: 0,
              retention: 0,
              avg_ticket: 0,
            } as MarketingFunnel
          );
          
          // Calculate retention for "Other" bucket
          other.retention = other.new_clients > 0
            ? (other.new_clients_retained / other.new_clients) * 100
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
          backgroundColor: COLORS.surfaceGlass,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
          padding: 16,
          marginHorizontal: -14,
          minHeight: 365,
          maxHeight: 365,
        }}
      >
        <ActivityIndicator size="small" color={COLORS.primary} />
        <Text className="text-sm mt-2" style={{ color: COLORS.textSecondary }}>
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
          backgroundColor: COLORS.surfaceGlass,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 3,
          padding: 16,
          marginHorizontal: -14,
          minHeight: 365,
          maxHeight: 365,
        }}
      >
        <Text style={{ color: COLORS.textSecondary }}>
          No data to see here yet!
        </Text>
      </View>
    );
  }

  const maxValue = Math.max(
    ...data.map((item) => Math.max(item.new_clients || 0, item.new_clients_retained || 0))
  );

  return (
    <>
      <View 
        className="rounded-xl overflow-hidden flex-1"
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
          minHeight: 365,
          maxHeight: 365,
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

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-semibold" style={{ color: COLORS.primary }}>
            📣 Marketing Funnels
          </Text>

          <TouchableOpacity
            onPress={() => setIsModalOpen(true)}
            className="px-3.5 py-2 rounded-lg"
            style={{ backgroundColor: '#8BCF68' }}
          >
            <Text className="text-base font-semibold" style={{ color: '#000000ff' }}>
              Details
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-end gap-2 mb-2">
          <View className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.newClients }} />
            <Text className="text-[11px]" style={{ color: COLORS.textPrimary }}>New</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.newClientsRetained }} />
            <Text className="text-[11px]" style={{ color: COLORS.textPrimary }}>Retained</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS.retention }} />
            <Text className="text-[11px]" style={{ color: COLORS.textPrimary }}>%</Text>
          </View>
        </View>

        <View className="pr-2 flex-1">
          {data.map((item, idx) => {
            const newClients = item.new_clients || 0;
            const newClientsRetained = item.new_clients_retained || 0;
            const newWidth = maxValue > 0 ? (newClients / maxValue) * 100 : 0;
            const retainedWidth = maxValue > 0 ? (newClientsRetained / maxValue) * 100 : 0;
            const retentionWidth = Math.min((item.retention || 0), 100);

            const itemCount = data.length;
            const isLast = idx === itemCount - 1;
            const baseDelay = getStaggerDelay(idx, 80);
            
            return (
              <View key={idx} style={{ flex: 1, marginBottom: isLast ? 0 : 8 }}>
                <Text 
                  className="text-[12px] font-semibold mb-1" 
                  numberOfLines={1}
                  style={{ color: COLORS.textPrimary }}
                >
                  {item.source}
                </Text>

                <View className="flex-row items-center mb-1">
                  <AnimatedBar
                    width={newWidth}
                    height={12}
                    color={CHART_COLORS.newClients}
                    delay={baseDelay}
                    reduceMotion={reduceMotion}
                  />
                  <Text className="text-[11px] ml-2" style={{ color: COLORS.textPrimary }}>
                    {newClients}
                  </Text>
                </View>

                <View className="flex-row items-center mb-1">
                  <AnimatedBar
                    width={retainedWidth}
                    height={12}
                    color={CHART_COLORS.newClientsRetained}
                    delay={baseDelay + 40}
                    reduceMotion={reduceMotion}
                  />
                  <Text className="text-[11px] ml-2" style={{ color: COLORS.textPrimary }}>
                    {newClientsRetained}
                  </Text>
                </View>

                <View className="flex-row items-center">
                  <AnimatedBar
                    width={retentionWidth}
                    height={8}
                    color={CHART_COLORS.retention}
                    delay={baseDelay + 80}
                    reduceMotion={reduceMotion}
                  />
                  <Text className="text-[11px] ml-2" style={{ color: COLORS.textSecondary }}>
                    {item.retention?.toFixed(0)}%
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      </View>

      <MarketingFunnelsDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        barberId={barberId}
        months={[month]}
        year={year}
        data={data}
      />
    </>
  );
}
