import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';

// Color Palette
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  purple: '#673AB7',
  yellow: '#FFEB3B',
  red: '#f87171',
  redGlow: 'rgba(248, 113, 113, 0.3)',
};

interface MonthlyExpensesCardProps {
  userId: string;
  month: string;
  year: number;
}

export default function MonthlyExpensesCard({ userId, month, year }: MonthlyExpensesCardProps) {
  const [expenses, setExpenses] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

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
            <Text className="text-sm font-bold tracking-wide">
              Monthly Expenses
            </Text>
          }
        >
          <LinearGradient
            colors={['#cf6868ff', '#be7348ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text className="text-sm font-bold tracking-wide opacity-0">
              Monthly Expenses
            </Text>
          </LinearGradient>
        </MaskedView>
      </View>

      <View className="min-h-[40px] justify-center">
        {loading ? (
          <ActivityIndicator color={COLORS.red} size="small" />
        ) : (
          <Text 
            className="text-xl font-bold" 
            style={{ color: COLORS.text }}
            numberOfLines={1} 
            adjustsFontSizeToFit
          >
            {formatCurrency(expenses)}
          </Text>
        )}
      </View>
    </View>
  );
}