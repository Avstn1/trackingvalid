import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface DailyRevenueCardProps {
  userId: string;
  selectedDate?: string;
}

export default function DailyRevenueCard({ userId, selectedDate }: DailyRevenueCardProps) {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [prevRevenue, setPrevRevenue] = useState<number | null>(null);
  const [prevDataDate, setPrevDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [barberType, setBarberType] = useState<'rental' | 'commission' | undefined>();
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  const todayStr = selectedDate ?? new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!userId) return;

    const fetchProfile = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, barber_type, commission_rate')
          .eq('user_id', userId)
          .maybeSingle();

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
    if (!userId) return;

    const fetchRevenue = async () => {
      setLoading(true);
      try {
        const { data: todayData } = await supabase
          .from('daily_data')
          .select('final_revenue, tips')
          .eq('user_id', userId)
          .eq('date', todayStr)
          .maybeSingle();

        if (todayData) {
          const total = todayData.final_revenue ?? 0;
          const tips = todayData.tips ?? 0;
          const final =
            barberType === 'commission' && commissionRate !== null
              ? total * commissionRate + tips
              : total;
          setRevenue(final);
        }

        const { data: prevData } = await supabase
          .from('daily_data')
          .select('final_revenue, tips, date')
          .eq('user_id', userId)
          .lt('date', todayStr)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        setPrevDataDate(prevData?.date ?? null);

        if (prevData) {
          const total = prevData.final_revenue ?? 0;
          const tips = prevData.tips ?? 0;
          const prevFinal =
            barberType === 'commission' && commissionRate !== null
              ? total * commissionRate + tips
              : total;
          setPrevRevenue(prevFinal);
        } else {
          setPrevRevenue(null);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenue();
  }, [userId, todayStr, barberType, commissionRate]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const change =
    revenue !== null && prevRevenue !== null && prevRevenue !== 0
      ? parseFloat(((revenue - prevRevenue) / prevRevenue * 100).toFixed(2))
      : null;

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-2.5">
      <Text className="text-lime-300 text-xs font-semibold mb-1">💰 Daily Revenue</Text>
      
      <View className="min-h-[40px] justify-center mb-1">
        {loading ? (
          <ActivityIndicator color="#c4ff85" size="small" />
        ) : (
          <Text className="text-xl font-bold text-lime-200" numberOfLines={1} adjustsFontSizeToFit>
            {revenue !== null ? formatCurrency(revenue) : 'No data'}
          </Text>
        )}
      </View>
      
      {change !== null ? (
        <Text 
          className={`text-xs font-semibold ${change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-400'}`}
          numberOfLines={1}
        >
          {change > 0 ? `+${change}%` : `${change}%`} <Text className="text-gray-500">vs. last</Text>
        </Text>
      ) : (
        <Text className="text-xs text-gray-500">—</Text>
      )}
    </View>
  );
}