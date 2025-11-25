import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface MonthlyRevenueCardProps {
  userId: string;
  selectedMonth?: string;
  year?: number | null;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function MonthlyRevenueCard({ userId, selectedMonth, year }: MonthlyRevenueCardProps) {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [prevRevenue, setPrevRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [barberType, setBarberType] = useState<'rental' | 'commission' | undefined>();
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  useEffect(() => {
    if (!userId || !selectedMonth) return;

    const fetchProfile = async () => {
      try {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role, barber_type, commission_rate')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (profile?.role?.toLowerCase() === 'barber') {
          setBarberType(profile.barber_type ?? undefined);
          setCommissionRate(profile.commission_rate ?? null);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    if (!userId || !selectedMonth) return;

    const fetchRevenue = async () => {
      setLoading(true);
      try {
        const currentYear = year ?? new Date().getFullYear();

        const { data: currentData, error: currentError } = await supabase
          .from('monthly_data')
          .select('final_revenue, tips')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (currentError) console.error(currentError);

        let finalRevenue = null;
        if (currentData) {
          const total = currentData.final_revenue ?? 0;
          const tips = currentData.tips ?? 0;
          finalRevenue =
            barberType === 'commission' && commissionRate !== null
              ? total * commissionRate + tips
              : total;
        }
        setRevenue(finalRevenue);

        const currentIndex = MONTHS.indexOf(selectedMonth);
        let prevIndex = currentIndex - 1;
        let prevYear = currentYear;
        if (prevIndex < 0) {
          prevIndex = 11;
          prevYear -= 1;
        }
        const prevMonth = MONTHS[prevIndex];

        const { data: prevData, error: prevError } = await supabase
          .from('monthly_data')
          .select('total_revenue, tips')
          .eq('user_id', userId)
          .eq('month', prevMonth)
          .eq('year', prevYear)
          .maybeSingle();

        if (prevError) console.error(prevError);

        if (prevData) {
          const total = prevData.total_revenue ?? 0;
          const tips = prevData.tips ?? 0;
          const prevFinal =
            barberType === 'commission' && commissionRate !== null
              ? total * commissionRate + tips
              : total;
          setPrevRevenue(prevFinal);
        }
      } catch (err) {
        console.error('Error fetching revenues:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, [userId, selectedMonth, year, barberType, commissionRate]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const calculateChange = (): number | null => {
    if (revenue === null || prevRevenue === null || prevRevenue === 0) return null;
    return parseFloat((((revenue - prevRevenue) / prevRevenue) * 100).toFixed(2));
  };

  const change = calculateChange();

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5">
      <Text className="text-lime-300 text-xs font-semibold mb-1">🏆 Monthly Revenue</Text>
      
      <View className="min-h-[40px] justify-center">
        {loading ? (
          <ActivityIndicator color="#c4ff85" size="small" />
        ) : (
          <View className="flex-row items-baseline gap-2">
            <Text className="text-xl font-bold text-lime-200" numberOfLines={1} adjustsFontSizeToFit>
              {revenue !== null ? formatCurrency(revenue) : 'N/A'}
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