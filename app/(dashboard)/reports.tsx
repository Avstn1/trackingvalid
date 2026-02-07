// app/(dashboard)/reports.tsx
import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import { CustomHeader } from '@/components/Header/CustomHeader';
import MonthlyReports from '@/components/Reports/MonthlyReports';
import WeeklyComparisonReports from '@/components/Reports/WeeklyComparisonReports';
import WeeklyReports from '@/components/Reports/WeeklyReports';
import { COLORS } from '@/constants/design-system';
import { useFocusAnimation, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import { useLocalSearchParams } from 'expo-router';
import { Calendar, FileText, GitCompare } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  View
} from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ReportsPage() {
  const params = useLocalSearchParams<{
    reference?: string;
  }>();

  const reference = params.reference;

  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
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

  // Handle date change from CustomHeader
  const handleDateChange = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
    setRefreshKey(prev => prev + 1);
  };

  // Handle pull-to-refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    // Small delay for visual feedback
    setTimeout(() => setRefreshing(false), 500);
  };

  if (loading) {
    return <AuthLoadingSplash message="Loading reports..." />;
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.background }}>
        <Text className="text-lg" style={{ color: COLORS.negative }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <Animated.View style={[{ flex: 1 }, focusStyle]}>
        <CustomHeader pageName="Reports" onDateChange={handleDateChange} />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Weekly Reports Section */}
          <View className="mb-8">
            <SectionHeader 
              title="Weekly Reports" 
              icon={<Calendar size={16} color={COLORS.textSecondary} />} 
            />
            <WeeklyReports
              key={`wreports-${refreshKey}-${selectedMonth}`}
              userId={user.id}
              refresh={refreshKey}
              filterMonth={selectedMonth}
              filterYear={selectedYear}
            />
          </View>

          {/* Weekly Comparison Section */}
          <View className="mb-8">
            <SectionHeader 
              title="Weekly Comparison" 
              icon={<GitCompare size={16} color={COLORS.textSecondary} />} 
            />
            <WeeklyComparisonReports
              key={`wcompare-${refreshKey}-${selectedMonth}`}
              userId={user.id}
              refresh={refreshKey}
              filterMonth={selectedMonth}
              filterYear={selectedYear}
            />
          </View>

          {/* Monthly Summary Section */}
          <View className="mb-8">
            <SectionHeader 
              title="Monthly Summary" 
              icon={<FileText size={16} color={COLORS.textSecondary} />} 
            />
            <MonthlyReports
              key={`mreports-${refreshKey}-${selectedMonth}`}
              userId={user.id}
              refresh={refreshKey}
              filterMonth={selectedMonth}
              filterYear={selectedYear}
            />
          </View>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

/**
 * Section header with icon and subtle divider line
 */
function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <View className="flex-row items-center mb-5">
      <View className="flex-row items-center gap-2">
        {icon}
        <Text 
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: COLORS.textSecondary }}
        >
          {title}
        </Text>
      </View>
      <View 
        className="flex-1 ml-3 h-px" 
        style={{ backgroundColor: COLORS.border }} 
      />
    </View>
  );
}
