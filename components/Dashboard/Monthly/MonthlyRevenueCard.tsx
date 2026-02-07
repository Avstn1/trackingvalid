import { COLORS } from '@/constants/design-system';
import { useCountUp, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
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

  const reduceMotion = useReducedMotionPreference();
  const { formatted: animatedRevenue } = useCountUp(revenue ?? 0, {
    reduceMotion,
    decimals: 2,
    prefix: '$',
  });

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
        <Text className="text-xs">🏆</Text>
        <MaskedView
          maskElement={
            <Text className="text-base font-bold tracking-wide">
              Monthly Revenue
            </Text>
          }
        >
          <LinearGradient
            colors={['#8bcf68ff', '#beb348ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text className="text-base font-bold tracking-wide opacity-0">
              Monthly Revenue
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
              {revenue !== null ? animatedRevenue : 'N/A'}
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
