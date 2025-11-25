import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface TimeframeAverageTicketCardProps {
  userId: string;
  year: number;
  timeframe: Timeframe;
  refreshKey: number;
}

const QUARTER_MONTHS: Record<Exclude<Timeframe, 'year'>, string[]> = {
  Q1: ['January', 'February', 'March'],
  Q2: ['April', 'May', 'June'],
  Q3: ['July', 'August', 'September'],
  Q4: ['October', 'November', 'December'],
};

export default function TimeframeAverageTicketCard({
  userId,
  year,
  timeframe,
  refreshKey,
}: TimeframeAverageTicketCardProps) {
  const [avgTicket, setAvgTicket] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !year) {
      setLoading(false);
      setAvgTicket(null);
      return;
    }

    const fetchAvgTicket = async () => {
      setLoading(true);
      
      try {
        const query = supabase
          .from('monthly_data')
          .select('month, avg_ticket')
          .eq('user_id', userId)
          .eq('year', year);

        if (timeframe !== 'year') {
          query.in('month', QUARTER_MONTHS[timeframe]);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error('TimeframeAverageTicketCard: Query error:', error);
          throw error;
        }

        const rows = (data ?? []).filter((r: any) => {
          const ticket = r.avg_ticket;
          return ticket !== null && ticket !== undefined && !isNaN(Number(ticket));
        });

        if (!rows.length) {
          setAvgTicket(null);
          return;
        }

        const sum = rows.reduce((acc: number, r: any) => acc + Number(r.avg_ticket), 0);
        const avg = sum / rows.length;

        setAvgTicket(avg);
      } catch (err) {
        console.error('TimeframeAverageTicketCard: Error fetching avg_ticket:', err);
        setAvgTicket(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAvgTicket();
  }, [userId, year, timeframe, refreshKey]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const titleSuffix = timeframe === 'year' ? 'YTD' : timeframe;

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 min-h-[120px]">
      <Text className="text-lime-300 text-sm font-semibold mb-2">
        💵 Avg Ticket ({titleSuffix})
      </Text>
      <View className="flex-1 justify-center">
        {loading ? (
          <ActivityIndicator size="small" color="#c4ff85" />
        ) : (
          <Text className="text-lime-200 text-2xl font-bold">
            {avgTicket !== null ? formatCurrency(avgTicket) : 'N/A'}
          </Text>
        )}
      </View>
    </View>
  );
}