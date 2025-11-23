// app/(dashboard)/dashboard.tsx
import { supabase } from "@/utils/supabaseClient";
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, Loader2 } from "lucide-react-native";
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

import AverageTicketCard from '@/components/Dashboard/AverageTicketCard';
import DailyRevenueCard from '@/components/Dashboard/DailyRevenueCard';
import MonthlyExpensesCard from '@/components/Dashboard/MonthlyExpensesCard';
import MonthlyRevenueCard from '@/components/Dashboard/MonthlyRevenueCard';
import ServiceBreakdownChart from '@/components/Dashboard/ServiceBreakdownChart';
import TopClientsCard from '@/components/Dashboard/TopClientsCard';
import YearlyRevenueCard from '@/components/Dashboard/YearlyRevenueCard';


import { CustomHeader } from '@/components/CustomHeader';


// const TopClientsCard = (props: any) => <View className="p-5 bg-zinc-900 rounded-2xl"><Text className="text-white">Top Clients</Text></View>;
const MarketingFunnelsChart = (props: any) => <View className="p-5 bg-zinc-900 rounded-2xl"><Text className="text-white">Marketing</Text></View>;
const MonthlyReports = (props: any) => <View><Text className="text-white text-xs">Monthly Reports...</Text></View>;
const WeeklyReports = (props: any) => <View><Text className="text-white text-xs">Weekly Reports...</Text></View>;
const WeeklyComparisonReports = (props: any) => <View><Text className="text-white text-xs">Weekly Comparison...</Text></View>;
const YearlyDashboard = (props: any) => <View className="p-5"><Text className="text-white text-xl">Yearly Dashboard</Text></View>;
const ProfitLossDashboard = (props: any) => <View className="p-5"><Text className="text-white text-xl">Profit/Loss Dashboard</Text></View>;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
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

  const hasSyncedInitially = useRef(false);
  const firstSyncAfterConnect = useRef(false);

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
    setTempDate(selectedDate); // Reset to current selected date
    setShowDatePicker(false);
  };

  const handleOpenDatePicker = () => {
    setTempDate(selectedDate); // Initialize temp date with current selection
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
      <CustomHeader pageName="Dashboard" />

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={syncAcuityData} tintColor="#c4ff85" />
        }
      >
        {/* HEADER */}
        <View className="mb-6 mt-4">
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

            <TouchableOpacity
              onPress={() => setDashboardView("profit")}
              className={`flex-1 py-3 rounded-full ${
                dashboardView === "profit" ? "bg-rose-300" : ""
              }`}
            >
              <Text
                className={`text-center font-semibold text-xs ${
                  dashboardView === "profit" ? "text-black" : "text-zinc-400"
                }`}
              >
                Profit/Loss
              </Text>
            </TouchableOpacity>
          </View>

          {/* Date Picker and Sync Button - Equal Width */}
          <View className="flex-row gap-2 mt-4">
            {/* Date Picker Button - 50% */}
            <TouchableOpacity
              onPress={handleOpenDatePicker}
              className="flex-1 flex-row items-center justify-center gap-2 bg-zinc-800 py-3 rounded-full"
            >
              <Calendar size={16} color="#c4ff85" />
              <Text className="text-white font-semibold text-sm">
                {formatSelectedDate()}
              </Text>
            </TouchableOpacity>

            {/* Sync Button - 50% */}
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

        {/* CONTENT */}
        {dashboardView === "monthly" && (
          <View className="gap-4">
            <DailyRevenueCard
                key={`daily-${refreshKey}`}
                userId={user.id}
                selectedDate={`${selectedYear}-${String(
                  MONTHS.indexOf(selectedMonth) + 1
                ).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
            />
            
            {/* Revenue Cards Row */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <MonthlyExpensesCard
                  key={`expenses-${refreshKey}`}
                  userId={user.id}
                  month={selectedMonth}
                  year={selectedYear}
                />
              </View>

              <View className="flex-1">
                <MonthlyRevenueCard
                  key={`monthly-${refreshKey}`}
                  userId={user.id}
                  selectedMonth={selectedMonth}
                  year={selectedYear}
                />
              </View>
            </View>



            <View className="flex-row gap-3">
              <View className="flex-1">
                <YearlyRevenueCard
                  key={`yearly-${refreshKey}`}
                  userId={user.id}
                  year={selectedYear}
                  timeframe="YTD"
                />
              </View>
              <View className="flex-1">
                <AverageTicketCard
                  key={`ticket-${refreshKey}`}
                  userId={user.id}
                  selectedMonth={selectedMonth}
                  year={selectedYear}
                />
              </View>
            </View>
            
            <TopClientsCard
              key={`clients-${refreshKey}`}
              userId={user.id}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
            />

            <ServiceBreakdownChart
              key={`services-${refreshKey}`}
              barberId={user.id}
              month={selectedMonth}
              year={selectedYear}
            />

            <MarketingFunnelsChart
              key={`funnels-${refreshKey}`}
              barberId={user.id}
              month={selectedMonth}
              year={selectedYear}
            />

            {/* Reports Section */}
            <View className="p-5 bg-zinc-900 rounded-2xl">
              <Text className="text-lime-300 font-semibold mb-3">Monthly Reports</Text>
              <MonthlyReports
                key={`mreports-${refreshKey}`}
                userId={user.id}
                filterMonth={selectedMonth}
                filterYear={selectedYear}
                isAdmin={isAdmin}
              />
            </View>

            <View className="p-5 bg-zinc-900 rounded-2xl">
              <Text className="text-lime-300 font-semibold mb-3">Weekly Reports</Text>
              <WeeklyReports
                key={`wreports-${refreshKey}`}
                userId={user.id}
                filterMonth={selectedMonth}
                filterYear={selectedYear}
                isAdmin={isAdmin}
              />
            </View>

            <View className="p-5 bg-zinc-900 rounded-2xl mb-6">
              <Text className="text-lime-300 font-semibold mb-3">Weekly Comparison</Text>
              <WeeklyComparisonReports
                key={`wcompare-${refreshKey}`}
                userId={user.id}
                filterMonth={selectedMonth}
                filterYear={selectedYear}
                isAdmin={isAdmin}
              />
            </View>
          </View>
        )}

        {dashboardView === "yearly" && (
          <YearlyDashboard
            userId={user.id}
            selectedYear={selectedYear}
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