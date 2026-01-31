import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Text, TouchableOpacity, View } from 'react-native';
import MarketingFunnelsDetailsModal from '../MarketingFunnelsDetailsModal';

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
  newClientsRetained: '#748E63',
  retention: '#B19470',
};

export interface MarketingFunnel {
  source: string;
  new_clients: number;
  returning_clients: number;
  new_clients_retained: number;
  retention: number;
  avg_ticket: number;
  [key: string]: string | number | undefined;
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
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  const isDateInTimeline = (dateString: string, months: string[], yearNum: number): boolean => {
    if (!dateString) return false;
    
    const date = new Date(dateString + 'T00:00:00');
    const dateMonth = date.getMonth() + 1;
    const dateYear = date.getFullYear();
    
    if (dateYear !== yearNum) return false;
    
    const monthNumbers = months.map(m => getMonthNumber(m));
    return monthNumbers.includes(dateMonth);
  };

  useEffect(() => {
    if (!barberId || !year) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        const monthsToUse = timeframe === 'year' ? ALL_MONTHS : MONTHS_BY_QUARTER[timeframe];
        const monthNumbers = monthsToUse.map(m => getMonthNumber(m));

        // Fetch clients who had their first appointment in the selected months/year
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

        // Filter clients whose first_appt is in the selected months
        const filteredClients = clients?.filter(client => {
          if (!client.first_appt) return false;
          const apptMonth = new Date(client.first_appt + 'T00:00:00').getMonth() + 1;
          return monthNumbers.includes(apptMonth);
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
          
          // Check if client returned within the same timeframe
          const hasSecondAppt = !!client.second_appt;
          const isInTimeline = hasSecondAppt && isDateInTimeline(client.second_appt, monthsToUse, year);
          
          if (isInTimeline) {
            funnel.new_clients_retained += 1;
          }
        });

        // Calculate retention and avg_ticket for each source
        const funnelData = Array.from(sourceMap.values());
        
        for (const funnel of funnelData) {
          // Calculate retention
          funnel.retention = funnel.new_clients > 0 
            ? (funnel.new_clients_retained / funnel.new_clients) * 100 
            : 0;

          // Calculate average ticket from FIRST appointments for all new clients in this source
          const sourceClients = filteredClients.filter(c => c.first_source === funnel.source);
          
          if (sourceClients.length > 0) {
            const clientIds = sourceClients.map(c => c.client_id);
            
            const { data: appointments } = await supabase
              .from('acuity_appointments')
              .select('client_id, appointment_date, revenue')
              .eq('user_id', barberId)
              .in('client_id', clientIds);
            
            if (appointments && appointments.length > 0) {
              const firstAppointmentRevenues: number[] = [];
              
              sourceClients.forEach(client => {
                const firstAppt = appointments.find(appt => 
                  appt.client_id === client.client_id && 
                  appt.appointment_date === client.first_appt
                );
                
                if (firstAppt && firstAppt.revenue) {
                  firstAppointmentRevenues.push(Number(firstAppt.revenue));
                }
              });
              
              if (firstAppointmentRevenues.length > 0) {
                const totalRevenue = firstAppointmentRevenues.reduce((sum, rev) => sum + rev, 0);
                funnel.avg_ticket = totalRevenue / firstAppointmentRevenues.length;
              }
            }
          }
        }

        // Sort by total new clients
        funnelData.sort((a, b) => b.new_clients - a.new_clients);

        const topSources = funnelData.slice(0, 4);
        const otherSources = funnelData.slice(4);
        
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
        console.error('Error preparing timeframe marketing funnels:', err);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [barberId, year, timeframe, refreshKey]);

  const monthsForModal = timeframe === 'year' ? ALL_MONTHS : MONTHS_BY_QUARTER[timeframe];

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

  const maxValue = Math.max(...data.map((item) => Math.max(item.new_clients, item.new_clients_retained)));

  return (
    <>
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
          <Text className="text-base font-semibold" style={{ color: COLORS_PALETTE.green }}>
            📣 Marketing Funnels
          </Text>

          <TouchableOpacity
            onPress={() => setIsModalOpen(true)}
            className="px-3 py-1.5 rounded-lg"
            style={{ backgroundColor: '#748E63' }}
          >
            <Text className="text-xs font-semibold" style={{ color: '#2a3612ff' }}>
              Details
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-row items-center justify-end gap-2 mb-2">
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.newClients }} />
            <Text className="text-[9px]" style={{ color: COLORS_PALETTE.text }}>New</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.newClientsRetained }} />
            <Text className="text-[9px]" style={{ color: COLORS_PALETTE.text }}>Retained</Text>
          </View>
          <View className="flex-row items-center gap-1">
            <View className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS.retention }} />
            <Text className="text-[9px]" style={{ color: COLORS_PALETTE.text }}>%</Text>
          </View>
        </View>

        <View className="pr-2 flex-1">
          {data.map((item, idx) => {
            const newClients = item.new_clients || 0;
            const newClientsRetained = item.new_clients_retained || 0;
            const newWidth = maxValue > 0 ? (newClients / maxValue) * 100 : 0;
            const retainedWidth = maxValue > 0 ? (newClientsRetained / maxValue) * 100 : 0;

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
                      backgroundColor: COLORS.newClientsRetained,
                      width: `${retainedWidth}%`,
                      minWidth: 10,
                    }}
                  />
                  <Text className="text-[9px] ml-1.5" style={{ color: COLORS_PALETTE.text }}>
                    {newClientsRetained}
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

      <MarketingFunnelsDetailsModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        barberId={barberId}
        months={monthsForModal}
        year={year}
        data={data}
      />
    </>
  );
}