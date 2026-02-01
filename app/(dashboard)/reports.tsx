// app/(dashboard)/reports.tsx
import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import { CustomHeader } from '@/components/Header/CustomHeader';
import MonthlyReports from '@/components/Reports/MonthlyReports';
import WeeklyComparisonReports from '@/components/Reports/WeeklyComparisonReports';
import WeeklyReports from '@/components/Reports/WeeklyReports';
import { supabase } from '@/utils/supabaseClient';
import { useFocusAnimation, useReducedMotionPreference } from '@/utils/motion';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Text,
  View
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Color Palette
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeLight: '#FF7849',
  orangeGlow: 'rgba(255, 87, 34, 0.25)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
  green: '#8bcf68ff',
  greenLight: '#beb348ff',
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Date selection - defaults to today
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [refreshKey, setRefreshKey] = useState(0);
  const reduceMotion = useReducedMotionPreference();
  const focusStyle = useFocusAnimation(reduceMotion);

  const [componentsReady, setComponentsReady] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("No user session found.");
        setUser(user);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setComponentsReady(true);
      });
    });
  }, []);

  // Handle date change from CustomHeader
  const handleDateChange = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return <AuthLoadingSplash message="Loading reports..." />;
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.background }}>
        <Text className="text-lg" style={{ color: '#ef4444' }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <Animated.View style={[{ flex: 1 }, focusStyle]}>
        <CustomHeader pageName="Reports" onDateChange={handleDateChange} />

        {/* Main Content - No ScrollView */}
        <View className="flex-1 px-4 pb-4">
          {/* Reports Grid - Uses full remaining space */}
          <View className="flex-1 gap-3">
          
          <View className="mb-3">
          </View>

          {/* Weekly Reports - 56% of remaining */}
          <View 
            className="rounded-2xl p-3 overflow-hidden"
            style={{
              flex: 0.56,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
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
            <Text className="text-base font-semibold mb-2" style={{ color: COLORS.green }}>
              📅 Weekly Reports
            </Text>
            <View className="flex-1">
              <WeeklyReports
                key={`wreports-${refreshKey}-${selectedMonth}`}
                userId={user.id}
                refresh={refreshKey}
                filterMonth={selectedMonth}
                filterYear={selectedYear}
              />
            </View>
          </View>

          {/* Weekly Comparison Reports - 19% of remaining */}
          <View 
            className="rounded-2xl p-3 overflow-hidden"
            style={{
              flex: 0.19,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
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
            <Text className="text-base font-semibold mb-2" style={{ color: COLORS.green }}>
              🔄 Weekly Comparison
            </Text>
            <View className="flex-1">
              <WeeklyComparisonReports
                key={`wcompare-${refreshKey}-${selectedMonth}`}
                userId={user.id}
                refresh={refreshKey}
                filterMonth={selectedMonth}
                filterYear={selectedYear}
              />
            </View>
          </View>

          {/* Monthly Reports - 19% of remaining */}
          <View 
            className="rounded-2xl p-3 overflow-hidden"
            style={{
              flex: 0.19,
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
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
            <Text className="text-base font-semibold mb-2" style={{ color: COLORS.green }}>
              📄 Monthly Reports
            </Text>
            <View className="flex-1">
              <MonthlyReports
                key={`mreports-${refreshKey}-${selectedMonth}`}
                userId={user.id}
                refresh={refreshKey}
                filterMonth={selectedMonth}
                filterYear={selectedYear}
              />
            </View>
          </View>
          </View>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
