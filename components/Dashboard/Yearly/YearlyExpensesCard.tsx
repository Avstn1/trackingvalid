import { useCountUp, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface Props {
  userId: string;
  year: number;
  timeframe: Timeframe;
  refreshKey: number;
}

function getDateRange(timeframe: Timeframe, year: number) {
  switch (timeframe) {
    case 'Q1':
      return { start: `${year}-01-01`, end: `${year}-03-31` };
    case 'Q2':
      return { start: `${year}-04-01`, end: `${year}-06-30` };
    case 'Q3':
      return { start: `${year}-07-01`, end: `${year}-09-30` };
    case 'Q4':
      return { start: `${year}-10-01`, end: `${year}-12-31` };
    case 'year':
    default:
      return { start: `${year}-01-01`, end: `${year}-12-31` };
  }
}

export default function YearlyExpensesCard({ userId, year, timeframe, refreshKey }: Props) {
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const reduceMotion = useReducedMotionPreference();
  const { formatted: animatedTotal } = useCountUp(total, {
    reduceMotion,
    decimals: 2,
    prefix: '$',
  });

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      setTotal(0);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      
      try {
        if (timeframe === 'year') {
          const { data, error } = await supabase
            .from('yearly_expenses')
            .select('total_expenses')
            .eq('user_id', userId)
            .eq('year', year)
            .maybeSingle();

          if (error) {
            console.error('YearlyExpensesCard: Yearly expenses error:', error);
            throw error;
          }
          
          const expenses = data?.total_expenses ?? 0;
          setTotal(expenses);
          return;
        }

        const { start, end } = getDateRange(timeframe, year);
        const { data: rows, error } = await supabase
          .from('daily_data')
          .select('expenses')
          .eq('user_id', userId)
          .gte('date', start)
          .lte('date', end);

        if (error) {
          console.error('YearlyExpensesCard: Daily expenses error:', error);
          throw error;
        }

        let sum = 0;
        (rows ?? []).forEach((r: any) => {
          sum += Number(r.expenses) || 0;
        });

        console.log('YearlyExpensesCard: Fetched total:', sum);
        setTotal(sum);
      } catch (err) {
        console.error('YearlyExpensesCard: Error fetching expenses:', err);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId, year, timeframe, refreshKey]);

  const formatCurrency = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const titleSuffix = timeframe === 'year' ? 'YTD' : timeframe;

  return (
    <View className="rounded-xl bg-zinc-900 border border-zinc-800 p-3 min-h-[100px]">
      <Text className="text-red-300 text-base font-semibold mb-2">
        💸 Total Expenses ({titleSuffix})
      </Text>
      <View className="flex-1 justify-center">
        {loading ? (
          <ActivityIndicator size="small" color="#c4ff85" />
        ) : (
          <Text className="text-red-200 text-2xl font-bold">
            {animatedTotal}
          </Text>
        )}
      </View>
    </View>
  );
}
