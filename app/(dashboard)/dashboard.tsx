// app/(dashboard)/dashboard.tsx
import { supabase } from "@/utils/supabaseClient";
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Device from 'expo-device';
import { Calendar, CalendarRange, Loader2 } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import MonthlyDashboard from '@/components/Dashboard/Dashboards/MonthlyDashboard';
import YearlyDashboard from '@/components/Dashboard/Dashboards/YearlyDashboard';
import { CustomHeader } from '@/components/Header/CustomHeader';

import { usePushNotifications } from '@/hooks/usePushNotifications';

const ProfitLossDashboard = (props: any) => <View className="p-5"><Text className="text-white text-xl">Profit/Loss Dashboard</Text></View>;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

const timeframeOptions = [
  { label: 'Year', value: 'year' },
  { label: 'Q1 (Jan-Mar)', value: 'Q1' },
  { label: 'Q2 (Apr-Jun)', value: 'Q2' },
  { label: 'Q3 (Jul-Sep)', value: 'Q3' },
  { label: 'Q4 (Oct-Dec)', value: 'Q4' },
];

const getLocalMonthYear = () => {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: now.getFullYear() };
};

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>(getLocalMonthYear().month);
  const [selectedYear, setSelectedYear] = useState<number>(getLocalMonthYear().year);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardView, setDashboardView] = useState<"monthly" | "yearly" | "profit">("monthly");
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tempDate, setTempDate] = useState(new Date());
  const [timeframe, setTimeframe] = useState<Timeframe>('year');
  const [showTimeframePicker, setShowTimeframePicker] = useState(false);

  const hasSyncedInitially = useRef(false);
  const firstSyncAfterConnect = useRef(false);

  const { expoPushToken } = usePushNotifications()
  // console.log('Your Push Token:', expoPushToken)

  // Fetch user and profile
  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("No user session found.");
        setUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);

        setIsAdmin(["admin", "owner"].includes(profileData?.role?.toLowerCase()));

        if (profileData?.acuity_access_token && !profileData?.last_acuity_sync) {
          firstSyncAfterConnect.current = true;
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, []);

  // Initial sync
  useEffect(() => {
    if (!user || hasSyncedInitially.current) return;

    const handleInitialSync = async () => {
      hasSyncedInitially.current = true;
      if (firstSyncAfterConnect.current) {
        await handleFullAcuitySync();
      }
    };
    handleInitialSync();
    syncAcuityData();
  }, [user]);

  // Re-sync on month/year change
  useEffect(() => {
    if (!user || !hasSyncedInitially.current) return;
    syncAcuityData();
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    if (expoPushToken && user) {
      console.log('Push Token:', expoPushToken);
      saveTokenToDatabase(expoPushToken);
    }
  }, [expoPushToken, user]);

  const saveTokenToDatabase = async (token: string) => {
    if (!profile?.user_id) return;

    try {
      // Get device information
      const deviceName = Device.deviceName || 'Unknown Device';
      const deviceType = Platform.OS === 'ios' ? 'ios' : 'android';

      const { error } = await supabase
        .from('push_tokens')
        .upsert({
          user_id: profile.user_id,
          token: token,
          device_name: deviceName,
          device_type: deviceType,
          last_used_at: new Date().toISOString(),
        }, {
          onConflict: 'token',
        });

      if (error) {
        console.error('Error saving push token:', error);
      } else {
        console.log('✅ Push token saved successfully');
      }
    } catch (err) {
      console.error('Error saving push token:', err);
    }
  };

  // Sync functions
  const syncAcuityData = async () => {
    if (!user) return;
    setIsRefreshing(true);
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/acuity/pull?endpoint=appointments&month=${encodeURIComponent(selectedMonth)}&year=${selectedYear}`
      );
      await res.json();
      setRefreshKey((prev) => prev + 1);
      Alert.alert("Success", `Data updated for ${selectedMonth} ${selectedYear}`);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Error fetching Acuity data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFullAcuitySync = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/acuity/sync-full`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Full Acuity sync failed");
      await res.json();
      Alert.alert("Success", "Full Acuity sync complete!");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Full Acuity sync failed");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      setTempDate(date);
    }
  };

  const handleDateConfirm = () => {
    setSelectedDate(tempDate);
    setSelectedDay(tempDate.getDate());
    setSelectedMonth(MONTHS[tempDate.getMonth()]);
    setSelectedYear(tempDate.getFullYear());
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setTempDate(selectedDate);
    setShowDatePicker(false);
  };

  const handleOpenDatePicker = () => {
    setTempDate(selectedDate);
    setShowDatePicker(true);
  };

  const formatSelectedDate = () => {
    return `${MONTHS[selectedDate.getMonth()].slice(0, 3)} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <ActivityIndicator size="large" color="#c4ff85" />
        <Text className="text-white mt-4">Loading dashboard...</Text>
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
      <CustomHeader pageName="Dashboard" userId={profile.user_id}/>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={syncAcuityData} tintColor="#c4ff85" />
        }
      >
        {/* HEADER */}
        <View className="mb-6">
          {/* Dashboard View Switcher */}
          <View className="flex-row bg-zinc-900 rounded-full p-1 mt-4">
            <TouchableOpacity
              onPress={() => setDashboardView("monthly")}
              className={`flex-1 py-3 rounded-full ${
                dashboardView === "monthly" ? "bg-lime-400" : ""
              }`}
            >
              <Text
                className={`text-center font-semibold text-xs ${
                  dashboardView === "monthly" ? "text-black" : "text-zinc-400"
                }`}
              >
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDashboardView("yearly")}
              className={`flex-1 py-3 rounded-full ${
                dashboardView === "yearly" ? "bg-sky-300" : ""
              }`}
            >
              <Text
                className={`text-center font-semibold text-xs ${
                  dashboardView === "yearly" ? "text-black" : "text-zinc-400"
                }`}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditional Picker: Date Picker (Monthly/Profit) OR Timeline Picker (Yearly) */}
          <View className="flex-row gap-2 mt-4">
            {dashboardView === "yearly" ? (
              <>
                {/* Timeline Picker for Yearly */}
                <TouchableOpacity
                  onPress={() => setShowTimeframePicker(true)}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-zinc-800 py-3 rounded-full"
                >
                  <CalendarRange size={16} color="#c4ff85" />
                  <Text className="text-white font-semibold text-sm">
                    {timeframeOptions.find(opt => opt.value === timeframe)?.label}
                  </Text>
                </TouchableOpacity>

                {/* Sync Button */}
                <TouchableOpacity
                  onPress={syncAcuityData}
                  disabled={isRefreshing}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-zinc-800 py-3 rounded-full"
                >
                  <Loader2
                    size={16}
                    color="#c4ff85"
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  <Text className="text-white font-semibold text-sm">
                    {isRefreshing ? "Syncing..." : "Re-sync"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Date Picker for Monthly/Profit */}
                <TouchableOpacity
                  onPress={handleOpenDatePicker}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-zinc-800 py-3 rounded-full"
                >
                  <Calendar size={16} color="#c4ff85" />
                  <Text className="text-white font-semibold text-sm">
                    {formatSelectedDate()}
                  </Text>
                </TouchableOpacity>

                {/* Sync Button */}
                <TouchableOpacity
                  onPress={syncAcuityData}
                  disabled={isRefreshing}
                  className="flex-1 flex-row items-center justify-center gap-2 bg-zinc-800 py-3 rounded-full"
                >
                  <Loader2
                    size={16}
                    color="#c4ff85"
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  <Text className="text-white font-semibold text-sm">
                    {isRefreshing ? "Syncing..." : "Re-sync"}
                  </Text>
                </TouchableOpacity>
              </>
            )}
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
            <View className="bg-zinc-900 rounded-2xl p-6 w-[90%] max-w-md">
              <Text className="text-white text-lg font-semibold mb-4 text-center">
                Choose Date
              </Text>

              <View className="bg-zinc-800 rounded-xl overflow-hidden">
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  textColor="#ffffff"
                  themeVariant="dark"
                />
              </View>

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

        {/* Timeline Picker Modal */}
        <Modal
          visible={showTimeframePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowTimeframePicker(false)}
        >
          <TouchableOpacity 
            activeOpacity={1}
            onPress={() => setShowTimeframePicker(false)}
            className="flex-1 bg-black/50 justify-center items-center"
          >
            <View className="bg-zinc-900 border border-zinc-700 rounded-lg p-2 mx-4 w-64">
              {timeframeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setTimeframe(option.value as Timeframe);
                    setShowTimeframePicker(false);
                  }}
                  className="py-3 px-3 active:bg-zinc-800 rounded"
                >
                  <Text className={`text-sm ${timeframe === option.value ? 'text-lime-400 font-bold' : 'text-white'}`}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* CONTENT */}
        {dashboardView === "monthly" && (
          <MonthlyDashboard
            userId={user.id}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDay={selectedDay}
            globalRefreshKey={refreshKey}
          />
        )}

        {dashboardView === "yearly" && (
          <YearlyDashboard
            userId={user.id}
            selectedYear={selectedYear}
            timeframe={timeframe}
            globalRefreshKey={refreshKey}
          />
        )}

        {dashboardView === "profit" && (
          <ProfitLossDashboard
            userId={user.id}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            selectedDay={selectedDay}
            globalRefreshKey={refreshKey}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}