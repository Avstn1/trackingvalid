import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface YearlyRevenueCardProps {
  userId: string;
  year?: number;
  timeframe?: Timeframe;
  refreshKey: number;
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
};

export default function YearlyRevenueCard({
  userId,
  year,
  timeframe,
  refreshKey,
}: YearlyRevenueCardProps) {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [barberType, setBarberType] = useState<'rental' | 'commission' | undefined>();
  const [label, setLabel] = useState('Revenue');

  useEffect(() => {
    if (!userId) {
      console.log('YearlyRevenueCard: No userId provided');
      setLoading(false);
      setTotal(0);
      return;
    }

    const fetchTotal = async () => {
      setLoading(true);
      
      try {
        const currentYear = year ?? new Date().getFullYear();

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, barber_type, commission_rate')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (profileError) {
          console.error('YearlyRevenueCard: Profile error:', profileError);
          throw profileError;
        }

        const isBarber = profileData?.role?.toLowerCase() === 'barber';
        const type = profileData?.barber_type;
        setBarberType(type ?? undefined);
        
        setLabel(
          isBarber
            ? type === 'commission'
              ? 'Earnings'
              : 'Revenue'
            : 'Revenue'
        );

        let finalTotal = 0;

        if (timeframe === 'year') {
          const { data: yearlyData, error: yearlyError } = await supabase
            .from('yearly_revenue')
            .select('total_revenue, tips, final_revenue')
            .eq('user_id', userId)
            .eq('year', currentYear)
            .maybeSingle();
            
          if (yearlyError) {
            console.error('YearlyRevenueCard: Yearly revenue error:', yearlyError);
            throw yearlyError;
          }

          if (isBarber && type === 'commission') {
            const totalRevenue = yearlyData?.total_revenue ?? 0;
            const tips = yearlyData?.tips ?? 0;
            const rate = profileData.commission_rate ?? 1;
            finalTotal = totalRevenue * rate + tips;
          } else {
            finalTotal = yearlyData?.final_revenue ?? 0;
          }
        } else {
          const months = QUARTER_MONTHS[timeframe!];
          const { data: monthlyRows, error: monthlyError } = await supabase
            .from('monthly_data')
            .select('month, total_revenue, final_revenue, tips')
            .eq('user_id', userId)
            .eq('year', currentYear)
            .in('month', months);

          if (monthlyError) {
            console.error('YearlyRevenueCard: Monthly data error:', monthlyError);
            throw monthlyError;
          }

          if (isBarber && type === 'commission') {
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
        }

        setTotal(finalTotal);
      } catch (err) {
        console.error('YearlyRevenueCard: Error fetching revenue:', err);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchTotal();
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
        💰 Total {label} ({titleSuffix})
      </Text>
      <View className="flex-1 justify-center">
        {loading ? (
          <ActivityIndicator size="small" color="#c4ff85" />
        ) : (
          <Text className="text-lime-200 text-2xl font-bold">
            {formatCurrency(total)}
          </Text>
        )}
      </View>
    </View>
  );
}