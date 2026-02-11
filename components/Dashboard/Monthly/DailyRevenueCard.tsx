import { COLORS } from '@/constants/design-system';
import { parseYMDToLocalDate } from '@/utils/date';
import { useCountUp, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

interface DailyRevenueCardProps {
  userId: string;
  selectedDate?: string;
}

const formatReadableDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d); // local time

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

export default function DailyRevenueCard({ userId, selectedDate }: DailyRevenueCardProps) {
  const [revenue, setRevenue] = useState<number | null>(null);
  const [prevRevenue, setPrevRevenue] = useState<number | null>(null);
  const [prevDataDate, setPrevDataDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [barberType, setBarberType] = useState<'rental' | 'commission' | undefined>();
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  const reduceMotion = useReducedMotionPreference();
  const { formatted: animatedRevenue } = useCountUp(revenue ?? 0, {
    reduceMotion,
    decimals: 2,
    prefix: '$',
  });

  const selectedDateStr = selectedDate ?? new Date().toLocaleDateString('en-CA');
  const todayStr = new Date().toLocaleDateString('en-CA');
  const label = selectedDateStr === todayStr ? 'TODAY' : formatReadableDate(selectedDateStr);

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
          .eq('date', selectedDateStr)
          .maybeSingle();

        if (todayData) {
          const total = todayData.final_revenue ?? 0;
          const tips = todayData.tips ?? 0;
          const final =
            barberType === 'commission' && commissionRate !== null
              ? total * commissionRate + tips
              : total;
          setRevenue(final);
        } else {
          // Reset state when no data for selected date
          setRevenue(null);
        }

        const { data: prevData } = await supabase
          .from('daily_data')
          .select('final_revenue, tips, date')
          .eq('user_id', userId)
          .lt('date', selectedDateStr)
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
  }, [userId, selectedDateStr, barberType, commissionRate]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // Calculate change percentage - compare with most recent previous day (not just consecutive)
  const change =
    revenue !== null && prevRevenue !== null && prevRevenue !== 0
      ? parseFloat(((revenue - prevRevenue) / prevRevenue * 100).toFixed(2))
      : null;

  return (
    <View
      style={{
        borderRadius: 24,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      {/* Gradient border wrapper */}
      <LinearGradient
        colors={['#8bcf68ff', '#beb348ff', '#8bcf68ff']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 24,
          padding: 2,
        }}
      >
        {/* Inner card with solid dark background */}
        <View
          style={{
            borderRadius: 22,
            backgroundColor: COLORS.surface,
            overflow: 'hidden',
          }}
        >
          {/* Content container */}
          <View style={{ padding: 20 }}>
            {/* Subtle accent glow - positioned behind content */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: COLORS.primary,
                opacity: 0.08,
              }}
            />

            {/* Header row */}
            <View className="flex-row items-center justify-between mb-3">
              <MaskedView
                maskElement={
                  <Text className="text-base font-bold tracking-wide">
                    💰 DAILY REVENUE
                  </Text>
                }
              >
                <LinearGradient
                  colors={['#8bcf68ff', '#beb348ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text className="text-base font-bold tracking-wide opacity-0">
                    💰 DAILY REVENUE
                  </Text>
                </LinearGradient>
              </MaskedView>
              <View
                style={{
                backgroundColor: COLORS.primary,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}
              >
                <Text className="text-sm font-bold" style={{ color: COLORS.textInverse }}>
                  {label}
                </Text>
              </View>
            </View>

            {/* Revenue amount */}
            <View className="min-h-[60px] justify-center mb-3">
              {loading ? (
                <ActivityIndicator color={COLORS.primary} size="large" />
              ) : revenue !== null ? (
                <Text
                  className="font-extrabold tracking-tight"
                  style={{ color: COLORS.textPrimary, fontSize: 36, lineHeight: 40 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.7}
                >
                  {animatedRevenue}
                </Text>
              ) : (
                <View>
                  <Text
                    className="font-extrabold tracking-tight"
                    style={{ color: COLORS.textSecondary, fontSize: 28, lineHeight: 34 }}
                  >
                    {selectedDateStr === todayStr ? 'Day Off' : selectedDateStr > todayStr ? '—' : '$0.00'}
                  </Text>
                  <Text
                    className="text-sm mt-1"
                    style={{ color: COLORS.textTertiary }}
                  >
                    {selectedDateStr === todayStr 
                      ? 'No appointments logged yet' 
                      : selectedDateStr > todayStr 
                        ? 'Future date' 
                        : 'No revenue recorded'}
                  </Text>
                </View>
              )}
            </View>

            {/* Change indicator - only show when we have revenue data */}
            {revenue !== null && (
              change !== null ? (
                <View className="flex-row items-center gap-2">
                  <View
                    style={{
                      backgroundColor: change > 0 ? COLORS.positiveMuted : change < 0 ? COLORS.negativeMuted : 'rgba(255,255,255,0.1)',
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: change > 0 ? 'rgba(34, 197, 94, 0.3)' : change < 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255,255,255,0.1)',
                    }}
                  >
                    <Text
                      className="text-sm font-bold"
                      style={{ color: change > 0 ? COLORS.positive : change < 0 ? COLORS.negative : COLORS.textSecondary }}
                    >
                      {change > 0 ? `↑ +${change}%` : change < 0 ? `↓ ${change}%` : `${change}%`}
                    </Text>
                  </View>
                  <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                    vs. prev. workday
                  </Text>
                </View>
              ) : (
                <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                  No comparison data
                </Text>
              )
            )}
          </View>

          {/* Bottom accent line */}
          <LinearGradient
            colors={['transparent', COLORS.primaryGlow, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 1,
              marginHorizontal: 20,
            }}
          />
        </View>
      </LinearGradient>
    </View>
  );
}
