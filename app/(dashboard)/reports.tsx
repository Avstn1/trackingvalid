// app/(dashboard)/reports.tsx
import { CustomHeader } from '@/components/CustomHeader';
import MonthlyReports from '@/components/Dashboard/Reports/MonthlyReports';
import WeeklyComparisonReports from '@/components/Dashboard/Reports/WeeklyComparisonReports';
import WeeklyReports from '@/components/Dashboard/Reports/WeeklyReports';
import { supabase } from '@/utils/supabaseClient';
import { ChevronDown, ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Generate array of years (current year and 5 years back)
const generateYears = () => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = 0; i < 6; i++) {
    years.push(currentYear - i);
  }
  return years;
};

// Get ordered months: current month first, then previous months in reverse order
const getOrderedMonths = () => {
  const currentMonthIndex = new Date().getMonth();
  
  // Get only months up to and including current month
  const availableMonths = MONTHS.slice(0, currentMonthIndex + 1);
  
  // Reverse so most recent (current) is first
  return availableMonths.reverse();
};

export default function ReportsPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const availableYears = generateYears();
  const orderedMonths = getOrderedMonths();
  const currentMonth = MONTHS[new Date().getMonth()];
  
  // Initialize with current month expanded
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(
    new Set([currentMonth])
  );

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

  // Re-expand current month when year changes
  useEffect(() => {
    if (selectedYear === new Date().getFullYear()) {
      setExpandedMonths(new Set([currentMonth]));
    } else {
      setExpandedMonths(new Set());
    }
  }, [selectedYear]);

  const toggleMonth = (month: string) => {
    // Configure animation
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        300,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity
      )
    );

    setExpandedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
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

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Year Selector Header */}
        <View className="flex-row justify-between items-center my-4">
          <Text className="text-lime-300 text-xl font-bold">All Reports</Text>
          <TouchableOpacity
            onPress={() => setShowYearPicker(true)}
            className="flex-row items-center gap-2 bg-zinc-800 px-4 py-3 rounded-full"
          >
            <Text className="text-white font-semibold text-sm">
              {selectedYear}
            </Text>
            <ChevronDown size={16} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Collapsible Month Sections */}
        <View className="gap-3 mb-6">
          {orderedMonths.map((month, index) => {
            const isExpanded = expandedMonths.has(month);
            const isCurrentMonth = index === 0; // First month is always current
            
            return (
              <View 
                key={month} 
                className={`rounded-2xl overflow-hidden ${
                  isCurrentMonth ? 'bg-lime-900/20 border-2 border-lime-500/30' : 'bg-zinc-900'
                }`}
              >
                {/* Month Header Button */}
                <TouchableOpacity
                  onPress={() => toggleMonth(month)}
                  className="flex-row items-center justify-between p-4 active:bg-zinc-800"
                >
                  <View className="flex-row items-center gap-2">
                    <Animated.View>
                      {isExpanded ? (
                        <ChevronDown size={20} color="#c4ff85" />
                      ) : (
                        <ChevronRight size={20} color="#c4ff85" />
                      )}
                    </Animated.View>
                    <Text className={`text-lg font-semibold ${
                      isCurrentMonth ? 'text-lime-400' : 'text-lime-300'
                    }`}>
                      {month} {selectedYear}
                    </Text>
                    {isCurrentMonth && (
                      <View className="bg-lime-400 px-2 py-0.5 rounded-full">
                        <Text className="text-black text-xs font-bold">Current</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                {/* Expanded Content */}
                {isExpanded && (
                  <View className="px-4 pb-4 gap-4">
                    {/* Monthly Reports */}
                    <View className="bg-zinc-800/50 rounded-xl p-4">
                      <Text className="text-lime-300 font-semibold mb-3">📄 Monthly Reports</Text>
                      <MonthlyReports
                        key={`mreports-${refreshKey}-${month}`}
                        userId={user.id}
                        refresh={refreshKey}
                        filterMonth={month}
                        filterYear={selectedYear}
                      />
                    </View>

                    {/* Weekly Reports */}
                    <View className="bg-zinc-800/50 rounded-xl p-4">
                      <Text className="text-lime-300 font-semibold mb-3">📅 Weekly Reports</Text>
                      <WeeklyReports
                        key={`wreports-${refreshKey}-${month}`}
                        userId={user.id}
                        refresh={refreshKey}
                        filterMonth={month}
                        filterYear={selectedYear}
                      />
                    </View>

                    {/* Weekly Comparison Reports */}
                    <View className="bg-zinc-800/50 rounded-xl p-4">
                      <Text className="text-lime-300 font-semibold mb-3">🔄 Weekly Comparison</Text>
                      <WeeklyComparisonReports
                        key={`wcompare-${refreshKey}-${month}`}
                        userId={user.id}
                        refresh={refreshKey}
                        filterMonth={month}
                        filterYear={selectedYear}
                      />
                    </View>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Year Picker Modal */}
      <Modal
        visible={showYearPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowYearPicker(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowYearPicker(false)}
          className="flex-1 bg-black/50 justify-center items-center"
        >
          <View className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 mx-4 w-48">
            {availableYears.map((year) => (
              <TouchableOpacity
                key={year}
                onPress={() => {
                  setSelectedYear(year);
                  setShowYearPicker(false);
                  setRefreshKey(prev => prev + 1);
                }}
                className="py-3 px-3 active:bg-zinc-800 rounded"
              >
                <Text
                  className={`text-sm text-center ${
                    selectedYear === year ? 'text-lime-400 font-bold' : 'text-white'
                  }`}
                >
                  {year}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}