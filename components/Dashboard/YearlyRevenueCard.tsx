import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { supabase } from '@/utils/supabaseClient';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'YTD';

interface YearlyRevenueCardProps {
  userId: string;
  year?: number;
  timeframe?: Timeframe;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const QUARTER_MONTHS: Record<Exclude<Timeframe, 'year'>, string[]> = {
  Q1: ['January', 'February', 'March'],
  Q2: ['April', 'May', 'June'],
  Q3: ['July', 'August', 'September'],
  Q4: ['October', 'November', 'December'],
  YTD: [''],
};

export default function YearlyRevenueCard({
  userId,
  year,
  timeframe = 'YTD',
}: YearlyRevenueCardProps) {
  const [total, setTotal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [barberType, setBarberType] = useState<'rental' | 'commission' | undefined>();
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) return;

    const fetchTotal = async () => {
      setLoading(true);
      try {
        const currentYear = year ?? new Date().getFullYear();

        // Fetch profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, barber_type, commission_rate')
          .eq('user_id', userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (profileData?.role?.toLowerCase() === 'barber') {
          setBarberType(profileData.barber_type ?? undefined);
          setCommissionRate(profileData.commission_rate ?? null);
        } else {
          setBarberType(undefined);
          setCommissionRate(null);
        }

        let finalTotal = 0;

        // YEAR/YTD view
        if (timeframe === 'year' || timeframe === 'YTD') {
          const { data: yearlyData, error: yearlyError } = await supabase
            .from('yearly_revenue')
            .select('total_revenue, tips, final_revenue')
            .eq('user_id', userId)
            .eq('year', currentYear)
            .maybeSingle();

          if (yearlyError) throw yearlyError;

          if (profileData?.role?.toLowerCase() === 'barber') {
            if (profileData.barber_type === 'commission') {
              const totalRevenue = yearlyData?.total_revenue ?? 0;
              const tips = yearlyData?.tips ?? 0;
              const rate = profileData.commission_rate ?? 1;
              finalTotal = totalRevenue * rate + tips;
            } else {
              finalTotal = yearlyData?.final_revenue ?? 0;
            }
          } else {
            finalTotal = yearlyData?.final_revenue ?? 0;
          }
        } else {
          // QUARTER view
          const months = QUARTER_MONTHS[timeframe];

          const { data: monthlyRows, error: monthlyError } = await supabase
            .from('monthly_data')
            .select('month, total_revenue, final_revenue, tips')
            .eq('user_id', userId)
            .eq('year', currentYear)
            .in('month', months);

          if (monthlyError) throw monthlyError;

          if (profileData?.role?.toLowerCase() === 'barber') {
            if (profileData.barber_type === 'commission') {
              const rate = profileData.commission_rate ?? 1;
              (monthlyRows ?? []).forEach((row: any) => {
                const base = row.total_revenue ?? row.final_revenue ?? 0;
                const tips = row.tips ?? 0;
                finalTotal += base * rate + tips;
              });
            } else {
              (monthlyRows ?? []).forEach((row: any) => {
                finalTotal += Number(row.final_revenue) || 0;
              });
            }
          } else {
            (monthlyRows ?? []).forEach((row: any) => {
              finalTotal += Number(row.final_revenue) || 0;
            });
          }
        }

        setTotal(finalTotal);
      } catch (err) {
        console.error('Error fetching timeframe revenue:', err);
        setTotal(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTotal();
  }, [userId, year, timeframe]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const titleSuffix = timeframe === 'year' ? 'YTD' : timeframe;

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <Text className="text-lime-300 text-sm font-semibold mb-3">
        💰 Revenue ({titleSuffix})
      </Text>

      <View className="min-h-[60px] justify-center">
        {loading ? (
          <ActivityIndicator color="#c4ff85" />
        ) : (
          <Text className="text-2xl font-bold text-lime-200" numberOfLines={1} adjustsFontSizeToFit>
            {total !== null ? formatCurrency(total) : 'N/A'}
          </Text>
        )}
      </View>
    </View>
  );
}