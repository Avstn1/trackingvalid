// app/(dashboard)/reports.tsx
import { CustomHeader } from '@/components/Header/CustomHeader';
import MonthlyReports from '@/components/Reports/MonthlyReports';
import WeeklyComparisonReports from '@/components/Reports/WeeklyComparisonReports';
import WeeklyReports from '@/components/Reports/WeeklyReports';
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarRange } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get current month and year as defaults
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  const [tempDate, setTempDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch user
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

  // Pull to refresh handler
  const onRefresh = async () => {
    setRefreshing(true);
    setRefreshKey(prev => prev + 1);
    // Wait a bit for the refresh to complete
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  // Date picker handlers
  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      // Always set to 1st of the month
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), 1);
      setTempDate(normalizedDate);
    }
  };

  const handleDateConfirm = () => {
    setSelectedDate(tempDate);
    setSelectedMonth(MONTHS[tempDate.getMonth()]);
    setSelectedYear(tempDate.getFullYear());
    setShowDatePicker(false);
    setRefreshKey(prev => prev + 1);
  };

  const handleDateCancel = () => {
    setTempDate(selectedDate);
    setShowDatePicker(false);
  };

  const handleOpenDatePicker = () => {
    setTempDate(selectedDate);
    setShowDatePicker(true);
  };

  // Format selected date for display (month and year only)
  const getDateLabel = () => {
    return `${selectedMonth} ${selectedYear}`;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <ActivityIndicator size="large" color="#c4ff85" />
        <Text className="text-white mt-4">Loading reports...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <CustomHeader pageName="Reports" />

      <ScrollView 
        className="flex-1 px-4" 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c4ff85"
            colors={["#c4ff85"]}
          />
        }
      >
        {/* Header */}
        <View className="my-4">
          {/* Date Picker Button */}
          <TouchableOpacity
            onPress={handleOpenDatePicker}
            className="flex-row items-center justify-center gap-2 bg-zinc-800 py-3 rounded-full"
          >
            <CalendarRange size={16} color="#c4ff85" />
            <Text className="text-white font-semibold text-sm">
              {getDateLabel()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reports Content */}
        <View className="gap-4 mb-6">
          {/* Monthly Reports */}
          <View className="bg-zinc-900 rounded-2xl p-4">
            <Text className="text-lime-300 text-lg font-semibold mb-3">📄 Monthly Reports</Text>
            <MonthlyReports
              key={`mreports-${refreshKey}-${selectedMonth}`}
              userId={user.id}
              refresh={refreshKey}
              filterMonth={selectedMonth}
              filterYear={selectedYear}
            />
          </View>

          {/* Weekly Reports */}
          <View className="bg-zinc-900 rounded-2xl p-4">
            <Text className="text-lime-300 text-lg font-semibold mb-3">📅 Weekly Reports</Text>
            <WeeklyReports
              key={`wreports-${refreshKey}-${selectedMonth}`}
              userId={user.id}
              refresh={refreshKey}
              filterMonth={selectedMonth}
              filterYear={selectedYear}
            />
          </View>

          {/* Weekly Comparison Reports */}
          <View className="bg-zinc-900 rounded-2xl p-4">
            <Text className="text-lime-300 text-lg font-semibold mb-3">🔄 Weekly Comparison</Text>
            <WeeklyComparisonReports
              key={`wcompare-${refreshKey}-${selectedMonth}`}
              userId={user.id}
              refresh={refreshKey}
              filterMonth={selectedMonth}
              filterYear={selectedYear}
            />
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDateCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-zinc-900 rounded-2xl p-6 w-[90%] max-w-md">
            <Text className="text-white text-lg font-semibold mb-4 text-center">
              Choose Month & Year
            </Text>

            <View className="bg-zinc-800 rounded-xl overflow-hidden">
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date(2025, 0, 1)}
                maximumDate={new Date()}
                textColor="#ffffff"
                themeVariant="dark"
              />
            </View>

            <Text className="text-zinc-400 text-xs text-center mt-3">
              Day will be set to 1st of selected month
            </Text>

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={handleDateCancel}
                className="flex-1 bg-zinc-700 py-3 rounded-full"
              >
                <Text className="text-center text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDateConfirm}
                className="flex-1 bg-lime-400 py-3 rounded-full"
              >
                <Text className="text-center text-black font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}