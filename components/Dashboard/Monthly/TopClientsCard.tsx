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
  yellow: '#FFEB3B',
};

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

      <Text className="text-base font-semibold mb-3" style={{ color: COLORS_PALETTE.green }}>
        🏆 Top Clients
      </Text>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="small" color={COLORS_PALETTE.green} />
          <Text className="text-sm mt-2" style={{ color: COLORS_PALETTE.textMuted }}>
            Loading...
          </Text>
        </View>
      ) : clients.length === 0 ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-sm text-center" style={{ color: COLORS_PALETTE.textMuted }}>
            No data available for {selectedMonth} {selectedYear ?? ''}
          </Text>
        </View>
      ) : (
        <View className="flex-1">
          <View 
            className="flex-row pb-2 mb-2"
            style={{ borderBottomWidth: 1, borderBottomColor: COLORS_PALETTE.glassBorder }}
          >
            <Text className="font-semibold text-xs w-6" style={{ color: COLORS_PALETTE.text }}>#</Text>
            <Text className="font-semibold text-xs flex-1" style={{ color: COLORS_PALETTE.text }}>Client</Text>
            <Text className="font-semibold text-xs flex-1 text-right" style={{ color: COLORS_PALETTE.text }}>Total</Text>
            <Text className="font-semibold text-xs flex-1 text-right" style={{ color: COLORS_PALETTE.text }}>Visits</Text>
          </View>

          {clients.slice(0, 5).map((client, idx) => (
            <View
              key={client.id}
              className="flex-row py-4 pr-3"
              style={{
                borderBottomWidth: idx < clients.slice(0, 5).length - 1 ? 1 : 0,
                borderBottomColor: COLORS_PALETTE.glassBorder,
                backgroundColor: idx % 2 === 0 ? 'rgba(255, 255, 255, 0.02)' : 'transparent',
              }}
            >
              <Text className="text-sm w-6" style={{ color: COLORS_PALETTE.text }}>{idx + 1}</Text>
              <Text className="font-semibold text-sm flex-1" numberOfLines={1} style={{ color: COLORS_PALETTE.text }}>
                {client.client_name ?? 'N/A'}
              </Text>
              <Text className="font-semibold text-sm flex-1 text-right" style={{ color: COLORS_PALETTE.green }}>
                ${client.total_paid?.toFixed(2) ?? '-'}
              </Text>
              <Text className="font-semibold text-sm flex-1 text-right" style={{ color: COLORS_PALETTE.yellow }}>
                {client.num_visits ?? '-'}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}