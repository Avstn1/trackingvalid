import { COLORS } from '@/constants/design-system';
import { useCountUp, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

interface MonthlyExpensesCardProps {
  userId: string;
  month: string;
  year: number;
}

export default function MonthlyExpensesCard({ userId, month, year }: MonthlyExpensesCardProps) {
  const [expenses, setExpenses] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const reduceMotion = useReducedMotionPreference();
  const { formatted: animatedExpenses } = useCountUp(expenses, {
    reduceMotion,
    decimals: 2,
    prefix: '$',
  });

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('monthly_data')
        .select('expenses')
        .eq('user_id', userId)
        .eq('month', month)
        .eq('year', year)
        .maybeSingle();

      if (error) throw error;
      setExpenses(data?.expenses || 0);
    } catch (err) {
      console.error('Failed to fetch monthly expenses:', err);
      Alert.alert('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId && month && year) {
      fetchExpenses();
    }
  }, [userId, month, year]);

  const formatCurrency = (amount: number) =>
    `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <View 
      className="rounded-2xl p-3 overflow-hidden"
      style={{ 
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
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
        <Text className="text-xs">🧾</Text>
        <MaskedView
          maskElement={
            <Text className="text-base font-bold tracking-wide">
              Monthly Expenses
            </Text>
          }
        >
          <LinearGradient
            colors={['#cf6868ff', '#be7348ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text className="text-base font-bold tracking-wide opacity-0">
              Monthly Expenses
            </Text>
          </LinearGradient>
        </MaskedView>
      </View>

      <View className="min-h-[40px] justify-center">
        {loading ? (
          <ActivityIndicator color={COLORS.negative} size="small" />
        ) : (
          <Text 
            className="text-xl font-bold" 
            style={{ color: COLORS.textPrimary }}
            numberOfLines={1} 
            adjustsFontSizeToFit
          >
            {animatedExpenses}
          </Text>
        )}
      </View>
    </View>
  );
}
