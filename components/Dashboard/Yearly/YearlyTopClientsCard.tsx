import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, ScrollView, Text, View } from 'react-native';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface YearlyTopClientsCardProps {
  userId: string;
  year: number;
  timeframe: Timeframe;
  refreshKey?: number;
}

interface TopClient {
  client_id: string | null;
  client_name: string | null;
  total_paid: number | null;
  num_visits: number | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const QUARTER_MONTHS: Record<Timeframe, string[]> = {
  year: MONTHS,
  Q1: ['January', 'February', 'March'],
  Q2: ['April', 'May', 'June'],
  Q3: ['July', 'August', 'September'],
  Q4: ['October', 'November', 'December'],
};

export default function YearlyTopClientsCard({
  userId,
  year,
  timeframe,
  refreshKey,
}: YearlyTopClientsCardProps) {
  const [clients, setClients] = useState<TopClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!userId || !year) return;

    const fetchTopClients = async () => {
      try {
        setLoading(true);

        if (timeframe === 'year') {
          const { data: topClients, error } = await supabase
            .from('yearly_top_clients')
            .select('client_id, client_name, total_paid, num_visits')
            .eq('user_id', userId)
            .eq('year', year)
            .order('total_paid', { ascending: false });

          if (error) throw error;

          const filtered = (topClients as TopClient[]).filter(
            (f) =>
              f.client_name &&
              f.client_name !== 'Unknown' &&
              f.client_name !== 'Returning Client' &&
              !/walk/i.test(f.client_name)
          );

          setClients(filtered || []);
          return;
        }

        const months = QUARTER_MONTHS[timeframe];
        const { data: weeklyRows, error } = await supabase
          .from('weekly_top_clients')
          .select('client_id, client_name, total_paid, num_visits, month, year')
          .eq('user_id', userId)
          .eq('year', year)
          .in('month', months);

        if (error) throw error;

        const map = new Map<string, TopClient>();

        (weeklyRows ?? []).forEach((row: any) => {
          const key = row.client_id || row.client_name || 'unknown';
          const existing = map.get(key) || {
            client_id: row.client_id ?? null,
            client_name: row.client_name ?? null,
            total_paid: 0,
            num_visits: 0,
          };

          existing.total_paid = (existing.total_paid ?? 0) + (Number(row.total_paid) || 0);
          existing.num_visits = (existing.num_visits ?? 0) + (Number(row.num_visits) || 0);

          map.set(key, existing);
        });

        const aggregated = Array.from(map.values());

        const filtered = aggregated.filter(
          (f) =>
            f.client_name &&
            f.client_name !== 'Unknown' &&
            f.client_name !== 'Returning Client' &&
            !/walk/i.test(f.client_name)
        );

        filtered.sort((a, b) => (b.total_paid ?? 0) - (a.total_paid ?? 0));

        setClients(filtered);
      } catch (err) {
        console.error('Error fetching yearly/quarterly top clients:', err);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopClients();
  }, [userId, year, timeframe, refreshKey]);

  const titleSuffix = timeframe === 'year' ? `${year}` : `${timeframe} ${year}`;

  if (loading) {
    return (
      <View 
        className="rounded-3xl overflow-hidden items-center justify-center"
        style={{ 
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          height: SCREEN_HEIGHT * 0.35,
          width: SCREEN_WIDTH * 0.935,
          padding: 16,
        }}
      >
        <ActivityIndicator size="small" color="#8bcf68ff" />
        <Text className="text-sm mt-2" style={{ color: COLORS.textSecondary }}>
          Loading...
        </Text>
      </View>
    );
  }

  if (clients.length === 0) {
    return (
      <View 
        className="rounded-3xl overflow-hidden items-center justify-center"
        style={{ 
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          height: SCREEN_HEIGHT * 0.35,
          width: SCREEN_WIDTH * 0.935,
          padding: 16,
        }}
      >
        <Text className="text-xs text-center" style={{ color: COLORS.textSecondary }}>
          No data available for {titleSuffix}
        </Text>
      </View>
    );
  }

  return (
    <View 
      className="rounded-3xl overflow-hidden"
      style={{ 
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        height: SCREEN_HEIGHT * 0.35,
        width: SCREEN_WIDTH * 0.935,
        padding: 16,
      }}
    >
      <Text className="text-lg font-bold mb-2" style={{ color: COLORS.textPrimary }}>
        👑 Top Clients ({titleSuffix})
      </Text>

      {/* Table Header */}
      <View className="flex-row pb-2 mb-1" style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255, 255, 255, 0.2)' }}>
        <Text className="font-semibold text-sm w-6" style={{ color: COLORS.textPrimary }}>#</Text>
        <Text className="font-semibold text-sm flex-1 pr-2" style={{ color: COLORS.textPrimary }}>Client</Text>
        <Text className="font-semibold text-sm w-20 text-right pr-2" style={{ color: COLORS.textPrimary }}>Total</Text>
        <Text className="font-semibold text-sm w-14 text-right" style={{ color: COLORS.textPrimary }}>Visits</Text>
      </View>

      {/* Table Rows */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {clients.slice(0, 10).map((client, idx) => (
          <View
            key={client.client_id ?? client.client_name ?? idx}
            className="flex-row py-2"
            style={{
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255, 255, 255, 0.1)',
              backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
            }}
          >
            <Text className="text-[15px] w-6" style={{ color: COLORS.textPrimary }}>{idx + 1}</Text>
            <Text className="font-semibold text-[15px] flex-1 pr-2" style={{ color: COLORS.textPrimary }} numberOfLines={1}>
              {client.client_name ?? 'N/A'}
            </Text>
            <Text className="font-semibold text-[15px] w-20 text-right pr-2" style={{ color: COLORS.primary }}>
              ${client.total_paid?.toFixed(2) ?? '-'}
            </Text>
            <Text className="font-semibold text-[15px] w-14 text-right" style={{ color: COLORS.warning }}>
              {client.num_visits ?? '-'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
