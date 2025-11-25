import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface AverageTicketCardProps {
  userId: string;
  selectedMonth?: string;
  year?: number | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function AverageTicketCard({ userId, selectedMonth, year }: AverageTicketCardProps) {
  const [avgTicket, setAvgTicket] = useState<number | null>(null);
  const [prevAvgTicket, setPrevAvgTicket] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || !selectedMonth) return;

    const fetchAvgTicket = async () => {
      setLoading(true);
      try {
        const currentYear = year ?? new Date().getFullYear();

        // Fetch current month avg_ticket
        const { data: currentData, error: currentError } = await supabase
          .from('monthly_data')
          .select('avg_ticket')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (currentError) console.error('Error fetching current avg_ticket:', currentError);
        setAvgTicket(currentData?.avg_ticket ?? null);

        // Determine previous month/year
        const currentIndex = MONTHS.indexOf(selectedMonth);
        let prevIndex = currentIndex - 1;
        let prevYear = currentYear;
        if (prevIndex < 0) {
          prevIndex = 11;
          prevYear -= 1;
        }
        const prevMonth = MONTHS[prevIndex];

        // Fetch previous month avg_ticket
        const { data: prevData, error: prevError } = await supabase
          .from('monthly_data')
          .select('avg_ticket')
          .eq('user_id', userId)
          .eq('month', prevMonth)
          .eq('year', prevYear)
          .maybeSingle();

        if (prevError) console.error('Error fetching previous avg_ticket:', prevError);
        setPrevAvgTicket(prevData?.avg_ticket ?? null);
      } catch (err) {
        console.error('Error fetching average tickets:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAvgTicket();
  }, [userId, selectedMonth, year]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const calculateChange = (): number | null => {
    if (avgTicket === null || prevAvgTicket === null || prevAvgTicket === 0) return null;
    const diff = avgTicket - prevAvgTicket;
    const percent = (diff / prevAvgTicket) * 100;
    return parseFloat(percent.toFixed(2));
  };

  const change = calculateChange();

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5">
      <Text className="text-lime-300 text-xs font-semibold mb-1">💵 Avg Ticket</Text>

      <View className="min-h-[40px] justify-center">
        {loading ? (
          <ActivityIndicator color="#c4ff85" size="small" />
        ) : (
          <View className="flex-row items-baseline gap-2">
            <Text className="text-xl font-bold text-lime-200" numberOfLines={1} adjustsFontSizeToFit>
              {avgTicket !== null ? formatCurrency(avgTicket) : 'N/A'}
            </Text>
            
            {change !== null && (
              <Text
                className={`text-xs font-semibold ${
                  change > 0
                    ? 'text-green-400'
                    : change < 0
                    ? 'text-red-400'
                    : 'text-gray-400'
                }`}
              >
                ({change > 0 ? '+' : ''}{change.toFixed(1)}%)
              </Text>
            )}
          </View>
        )}
      </View>
    </View>
  );
}