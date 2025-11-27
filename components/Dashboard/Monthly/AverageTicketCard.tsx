import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// Color Palette
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.3)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
};

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
    <View 
      className="rounded-2xl p-3 overflow-hidden"
      style={{ 
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 3,
      }}
    >
      {/* Subtle highlight at top */}
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

      <Text className="text-xs font-semibold mb-1" style={{ color: COLORS.orange }}>
        💵 Avg Ticket
      </Text>

      <View className="min-h-[40px] justify-center">
        {loading ? (
          <ActivityIndicator color={COLORS.orange} size="small" />
        ) : (
          <View className="flex-row items-baseline gap-2">
            <Text 
              className="text-xl font-bold" 
              style={{ color: COLORS.text }}
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              {avgTicket !== null ? formatCurrency(avgTicket) : 'N/A'}
            </Text>
            
            {change !== null && (
              <Text
                className="text-xs font-semibold"
                style={{ color: change > 0 ? '#4ade80' : change < 0 ? '#f87171' : COLORS.textMuted }}
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