import { COLORS } from '@/constants/design-system';
import { useCountUp, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface MonthlyProfitCardProps {
  userId: string;
  selectedMonth: string;
  year: number;
  refreshKey?: number;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function MonthlyProfitCard({
  userId,
  selectedMonth,
  year,
  refreshKey,
}: MonthlyProfitCardProps) {
  const [profit, setProfit] = useState<number | null>(null);
  const [prevProfit, setPrevProfit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const reduceMotion = useReducedMotionPreference();
  const { formatted: animatedProfit } = useCountUp(profit ?? 0, {
    reduceMotion,
    decimals: 2,
    prefix: '$',
  });

  useEffect(() => {
    if (!userId || !selectedMonth) {
      setLoading(false);
      return;
    }

    const fetchProfit = async () => {
      setLoading(true);
      try {
        const currentYear = year ?? new Date().getFullYear();

        // Fetch current month revenue + expenses
        const { data: currentData, error: currentError } = await supabase
          .from('monthly_data')
          .select('final_revenue, expenses')
          .eq('user_id', userId)
          .eq('month', selectedMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (currentError) console.error('Error fetching current month data:', currentError);

        const currentProfit =
          currentData?.final_revenue != null && currentData?.expenses != null
            ? currentData.final_revenue - currentData.expenses
            : null;

        setProfit(currentProfit);

        // Determine previous month/year
        const currentIndex = MONTHS.indexOf(selectedMonth);
        let prevIndex = currentIndex - 1;
        let prevYear = currentYear;
        if (prevIndex < 0) {
          prevIndex = 11;
          prevYear -= 1;
        }
        const prevMonth = MONTHS[prevIndex];

        // Fetch previous month revenue + expenses
        const { data: prevData, error: prevError } = await supabase
          .from('monthly_data')
          .select('final_revenue, expenses')
          .eq('user_id', userId)
          .eq('month', prevMonth)
          .eq('year', prevYear)
          .maybeSingle();

        if (prevError) console.error('Error fetching previous month data:', prevError);

        const prevProfitCalc =
          prevData?.final_revenue != null && prevData?.expenses != null
            ? prevData.final_revenue - prevData.expenses
            : null;

        setPrevProfit(prevProfitCalc);
      } catch (err) {
        console.error('Error fetching profits:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfit();
  }, [userId, selectedMonth, year, refreshKey]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const calculateChange = (): number | null => {
    if (profit === null || prevProfit === null || prevProfit === 0) return null;
    const diff = profit - prevProfit;
    const percent = (diff / prevProfit) * 100;
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
        shadowOpacity: 0.1,
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

      <View className="flex-row items-center gap-2">
        <Text className="text-xs">💰</Text>
        <MaskedView
          maskElement={
            <Text className="text-base font-bold tracking-wide">
              Monthly Profit
            </Text>
          }
        >
          <LinearGradient
            colors={['#8bcf68ff', '#beb348ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text className="text-base font-bold tracking-wide opacity-0">
              Monthly Profit
            </Text>
          </LinearGradient>
        </MaskedView>
      </View>

      <View className="min-h-[40px] justify-center">
        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="small" />
        ) : (
          <View className="flex-row items-baseline gap-2">
            <Text 
              className="text-xl font-bold" 
              style={{ color: COLORS.textPrimary }}
              numberOfLines={1} 
              adjustsFontSizeToFit
            >
              {profit !== null ? animatedProfit : 'N/A'}
            </Text>
            
            {change !== null && (
              <Text
                className="text-xs font-semibold"
                style={{ color: change > 0 ? COLORS.positive : change < 0 ? COLORS.negative : COLORS.textSecondary }}
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
