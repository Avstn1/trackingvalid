// app/(dashboard)/reports.tsx
import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import { CustomHeader } from '@/components/Header/CustomHeader';
import MonthlyReports from '@/components/Reports/MonthlyReports';
import WeeklyComparisonReports from '@/components/Reports/WeeklyComparisonReports';
import WeeklyReports from '@/components/Reports/WeeklyReports';
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarRange } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

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
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  const [tempDate, setTempDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  const [refreshKey, setRefreshKey] = useState(0);

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
    // Use requestAnimationFrame to wait for render cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setComponentsReady(true);
      });
    });
  }, []);

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
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

  const getDateLabel = () => {
    return `${selectedMonth} ${selectedYear}`;
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

  if (!componentsReady) {
    return <AuthLoadingSplash message="Loading dashboard data..." />;
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <CustomHeader pageName="Reports" />

      {/* Main Content - No ScrollView */}
      <View className="flex-1 px-4 pb-4">
        {/* Date Picker Button - 8% height */}
        <View style={{ height: SCREEN_HEIGHT * 0.06, marginVertical: SCREEN_HEIGHT * 0.01 }}>
          <TouchableOpacity
            onPress={handleOpenDatePicker}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-full"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <CalendarRange size={16} color={COLORS.orange} />
            <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>
              {getDateLabel()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reports Grid - Uses remaining space */}
        <View className="flex-1 gap-3">

          {/* Weekly Reports - 40% of remaining */}
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
            <Text className="text-base font-semibold mb-2" style={{ color: COLORS.orange }}>
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

          {/* Weekly Comparison Reports - 30% of remaining */}
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
            <Text className="text-base font-semibold mb-2" style={{ color: COLORS.orange }}>
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

          {/* Monthly Reports - 30% of remaining */}
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
            <Text className="text-base font-semibold mb-2" style={{ color: COLORS.orange }}>
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

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDateCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View 
            className="rounded-3xl p-6 overflow-hidden"
            style={{ 
              width: SCREEN_WIDTH * 0.9,
              maxWidth: 400,
              backgroundColor: 'rgba(37, 37, 37, 0.95)',
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
              Choose Month & Year
            </Text>

            <View 
              className="rounded-2xl overflow-hidden"
              style={{ 
                backgroundColor: COLORS.cardBg,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date(2025, 0, 1)}
                maximumDate={new Date()}
                textColor={COLORS.text}
                themeVariant="dark"
              />
            </View>

            <Text className="text-xs text-center mt-3" style={{ color: COLORS.textMuted }}>
              Day will be set to 1st of selected month
            </Text>

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={handleDateCancel}
                className="flex-1 py-3 rounded-full"
                style={{ 
                  backgroundColor: COLORS.cardBg,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDateConfirm}
                className="flex-1 py-3 rounded-full"
                style={{ 
                  backgroundColor: COLORS.orange,
                  shadowColor: COLORS.orange,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.5,
                  shadowRadius: 12,
                  elevation: 5,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}