import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface YearlyTopClientsCardProps {
  userId: string;
  year: number;
  timeframe: Timeframe;
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
  }, [userId, year, timeframe]);

  const titleSuffix = timeframe === 'year' ? `${year}` : `${timeframe} ${year}`;

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 min-h-[280px] max-h-[400px]">
      <Text className="text-lime-300 text-lg font-bold mb-2">
        👑 Top Clients ({titleSuffix})
      </Text>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#c4ff85" />
        </View>
      ) : clients.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-xs text-center">
            No data available for {titleSuffix}
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          {/* Table Header */}
          <View className="flex-row border-b border-zinc-700 pb-2 mb-1">
            <Text className="text-white font-semibold text-xs w-6">#</Text>
            <Text className="text-white font-semibold text-xs flex-1 pr-2">Client</Text>
            <Text className="text-white font-semibold text-xs w-20 text-right pr-2">Total</Text>
            <Text className="text-white font-semibold text-xs w-14 text-right">Visits</Text>
          </View>

          {/* Table Rows */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {clients.slice(0, 5).map((client, idx) => (
              <View
                key={client.client_id ?? client.client_name ?? idx}
                className={`flex-row py-2 border-b border-zinc-700 ${
                  idx % 2 === 0 ? 'bg-zinc-800/30' : ''
                }`}
              >
                <Text className="text-white text-sm w-6">{idx + 1}</Text>
                <Text className="text-white font-semibold text-sm flex-1 pr-2" numberOfLines={1}>
                  {client.client_name ?? 'N/A'}
                </Text>
                <Text className="text-green-400 font-semibold text-sm w-20 text-right pr-2">
                  ${client.total_paid?.toFixed(2) ?? '-'}
                </Text>
                <Text className="text-yellow-400 font-semibold text-sm w-14 text-right">
                  {client.num_visits ?? '-'}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}