import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

// Color Palette
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.08)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  green: '#54d33dff',
  greenLight: '#5b8f52ff',
  greenGlow: 'rgba(255, 87, 34, 0.25)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
};

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'YTD';

interface YearlyRevenueCardProps {
  userId: string;
  year?: number;
  timeframe?: Timeframe;
  refreshKey?: number;
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
  refreshKey,
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
  }, [userId, year, timeframe, refreshKey]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const titleSuffix = timeframe === 'year' ? 'YTD' : timeframe;

  return (
    <View
      style={{
        borderRadius: 24,
        shadowColor: COLORS.green,
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
            backgroundColor: COLORS.cardBg,
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
                backgroundColor: COLORS.green,
                opacity: 0.08,
              }}
            />

            {/* Header row */}
            <View className="flex-row items-center justify-between mb-3">
              <MaskedView
                maskElement={
                  <Text className="text-sm font-bold tracking-wide">
                    💰 TOTAL REVENUE
                  </Text>
                }
              >
                <LinearGradient
                  colors={['#8bcf68ff', '#beb348ff']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text className="text-sm font-bold tracking-wide opacity-0">
                    💰 TOTAL REVENUE
                  </Text>
                </LinearGradient>
              </MaskedView>
              <View
                style={{
                  backgroundColor: COLORS.green,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}
              >
                <Text className="text-xs font-bold" style={{ color: COLORS.text }}>
                  {titleSuffix}
                </Text>
              </View>
            </View>

            {/* Revenue amount */}
            <View className="min-h-[30px] justify-center">
              {loading ? (
                <ActivityIndicator color={COLORS.green} size="large" />
              ) : (
                <Text
                  className="text-4xl font-bold"
                  style={{ color: COLORS.text }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {total !== null ? formatCurrency(total) : 'No data'}
                </Text>
              )}
            </View>
          </View>

          {/* Bottom accent line */}
          <LinearGradient
            colors={['transparent', COLORS.greenGlow, 'transparent']}
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