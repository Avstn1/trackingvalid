import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

interface TopClientsCardProps {
  userId?: string;
  selectedMonth?: string;
  selectedYear?: number | null;
}

interface TopClient {
  id: string;
  client_name: string | null;
  total_paid: number | null;
  num_visits: number | null;
  notes: string | null;
}

export default function TopClientsCard({ userId, selectedMonth, selectedYear }: TopClientsCardProps) {
  const [clients, setClients] = useState<TopClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!userId || !selectedMonth || !selectedYear) return;

    const fetchTopClients = async () => {
      try {
        setLoading(true);

        const year = selectedYear ?? new Date().getFullYear();

        const { data: topClients, error } = await supabase
          .from('report_top_clients')
          .select('id, client_name, total_paid, num_visits, notes')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
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
      } catch (err) {
        console.error('Error fetching top clients:', err);
        setClients([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTopClients();
  }, [userId ?? '', selectedMonth ?? '', selectedYear ?? 0]);

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 flex-1 min-h-[310px] max-h-[440px]">
      <Text className="text-lg font-bold mb-2 text-white">
        🏆 Top Clients
      </Text>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color="#c4ff85" />
          <Text className="text-sm text-gray-400 mt-2">Loading...</Text>
        </View>
      ) : clients.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-gray-400 text-center">
            No data available for {selectedMonth} {selectedYear ?? ''}
          </Text>
        </View>
      ) : (
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Table Header */}
          <View className="flex-row border-b border-zinc-700 pb-2 mb-2">
            <Text className="text-white font-semibold text-xs w-6">#</Text>
            <Text className="text-white font-semibold text-xs flex-1">Client</Text>
            <Text className="text-white font-semibold text-xs flex-1 text-right">Total</Text>
            <Text className="text-white font-semibold text-xs flex-1 text-right">Visits</Text>
          </View>

          {/* Table Rows */}
          {clients.slice(0, 5).map((client, idx) => (
            <View
              key={client.id}
              className={`flex-row py-4 border-b border-zinc-700 ${
                idx % 2 === 0 ? 'bg-zinc-800/30' : ''
              }`}
            >
              <Text className="text-white text-sm w-6">{idx + 1}</Text>
              <Text className="text-white font-semibold text-sm flex-1" numberOfLines={1}>
                {client.client_name ?? 'N/A'}
              </Text>
              <Text className="text-green-400 font-semibold text-sm flex-1 text-right">
                ${client.total_paid?.toFixed(2) ?? '-'}
              </Text>
              <Text className="text-yellow-400 font-semibold text-sm flex-1 text-right">
                {client.num_visits ?? '-'}
              </Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}