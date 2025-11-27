import { supabase } from '@/utils/supabaseClient';
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
  orange: '#FF5722',
  orangeLight: '#FF7849',
  orangeGlow: 'rgba(255, 87, 34, 0.25)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
};

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
    <View
      style={{
        borderRadius: 24,
        shadowColor: COLORS.orange,
        shadowOffset: { width: 0, height: 6 },
        // shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 10,
      }}
    >
      {/* Gradient border wrapper */}
      <LinearGradient
        colors={[COLORS.orange, COLORS.orangeLight, COLORS.orange]}
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
          <View style={{ padding: 10 }}>
            {/* Subtle accent glow - positioned behind content */}
            <View
              style={{
                position: 'absolute',
                top: -30,
                right: -30,
                width: 120,
                height: 120,
                borderRadius: 60,
                backgroundColor: COLORS.orange,
                opacity: 0.08,
              }}
            />

            {/* Header row */}
            <View className="flex-row items-center justify-between mb-3">
              <Text
                className="text-sm font-bold tracking-wide"
                style={{ color: COLORS.orange }}
              >
                💰 DAILY REVENUE
              </Text>
              <View
                style={{
                  backgroundColor: COLORS.orange,
                  paddingHorizontal: 12,
                  paddingVertical: 5,
                  borderRadius: 12,
                }}
              >
                <Text className="text-xs font-bold" style={{ color: COLORS.text }}>
                  TODAY
                </Text>
              </View>
            </View>

            {/* Revenue amount */}
            <View className="min-h-[30px] justify-center mb-3">
              {loading ? (
                <ActivityIndicator color={COLORS.orange} size="large" />
              ) : (
                <Text
                  className="text-4xl font-bold"
                  style={{ color: COLORS.text }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {revenue !== null ? formatCurrency(revenue) : 'No data'}
                </Text>
              )}
            </View>

            {/* Change indicator */}
            {change !== null ? (
              <View className="flex-row items-center gap-2">
                <View
                  style={{
                    backgroundColor: change > 0 ? 'rgba(74, 222, 128, 0.15)' : change < 0 ? 'rgba(248, 113, 113, 0.15)' : 'rgba(255,255,255,0.1)',
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 10,
                    borderWidth: 1,
                    borderColor: change > 0 ? 'rgba(74, 222, 128, 0.3)' : change < 0 ? 'rgba(248, 113, 113, 0.3)' : 'rgba(255,255,255,0.1)',
                  }}
                >
                  <Text
                    className="text-sm font-bold"
                    style={{ color: change > 0 ? '#4ade80' : change < 0 ? '#f87171' : COLORS.textMuted }}
                  >
                    {change > 0 ? `↑ +${change}%` : change < 0 ? `↓ ${change}%` : `${change}%`}
                  </Text>
                </View>
                <Text className="text-sm" style={{ color: COLORS.textMuted }}>
                  vs. previous day
                </Text>
              </View>
            ) : (
              <Text className="text-sm" style={{ color: COLORS.textMuted }}>
                No comparison data
              </Text>
            )}
          </View>

          {/* Bottom accent line */}
          <LinearGradient
            colors={['transparent', COLORS.orangeGlow, 'transparent']}
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