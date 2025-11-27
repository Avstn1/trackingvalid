// app/(dashboard)/dashboard.tsx
import { supabase } from "@/utils/supabaseClient";
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import * as Device from 'expo-device';
import { Calendar, CalendarRange } from "lucide-react-native";
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

// Color Palette
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.3)',
  purple: '#673AB7',
  purpleGlow: 'rgba(103, 58, 183, 0.3)',
  yellow: '#FFEB3B',
};

const ProfitLossDashboard = (props: any) => <View className="p-5"><Text style={{ color: COLORS.text }} className="text-xl">Profit/Loss Dashboard</Text></View>;

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

// Glassy container component
const GlassContainer = ({ 
  children, 
  style = {}, 
  intensity = 40,
  className = ""
}: { 
  children: React.ReactNode; 
  style?: any;
  intensity?: number;
  className?: string;
}) => (
  <View 
    className={`overflow-hidden ${className}`}
    style={[{
      borderRadius: 9999,
      borderWidth: 1,
      borderColor: COLORS.glassBorder,
    }, style]}
  >
    <BlurView intensity={intensity} tint="dark" style={{ flex: 1 }}>
      <View style={{ backgroundColor: COLORS.glassHighlight, flex: 1 }}>
        {children}
      </View>
    </BlurView>
  </View>
);

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

  const syncAcuityData = async () => {
    if (!user) return;
    setIsRefreshing(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/acuity/pull?endpoint=appointments&month=${encodeURIComponent(selectedMonth)}&year=${selectedYear}`,
        {
          headers: {
            'x-client-access-token': accessToken,
          },
        }
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
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/acuity/sync-full`, {
        method: "POST",
        headers: {
          'x-client-access-token': accessToken,
        },
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
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text className="mt-4" style={{ color: COLORS.text }}>Loading dashboard...</Text>
      </View>
    );
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
      <CustomHeader pageName="Dashboard" userId={profile.user_id}/>

      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={syncAcuityData} tintColor={COLORS.orange} />
        }
      >
        {/* HEADER */}
        <View className="mb-6">
          {/* Dashboard View Switcher - Glassy */}
          <View 
            className="flex-row rounded-full p-1 mt-4 overflow-hidden"
            style={{ 
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <TouchableOpacity
              onPress={() => setDashboardView("monthly")}
              className="flex-1 py-3 rounded-full"
              style={dashboardView === "monthly" ? { 
                backgroundColor: COLORS.orange,
                shadowColor: COLORS.orange,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
                elevation: 5,
              } : {}}
            >
              <Text
                className="text-center font-semibold text-xs"
                style={{ color: dashboardView === "monthly" ? COLORS.text : COLORS.textMuted }}
              >
                Monthly
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setDashboardView("yearly")}
              className="flex-1 py-3 rounded-full"
              style={dashboardView === "yearly" ? { 
                backgroundColor: COLORS.purple,
                shadowColor: COLORS.purple,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 10,
                elevation: 5,
              } : {}}
            >
              <Text
                className="text-center font-semibold text-xs"
                style={{ color: dashboardView === "yearly" ? COLORS.text : COLORS.textMuted }}
              >
                Yearly
              </Text>
            </TouchableOpacity>
          </View>

          {/* Conditional Picker */}
          <View className="flex-row gap-2 mt-4">
            {dashboardView === "yearly" ? (
              <>
                {/* Timeline Picker - Glassy */}
                <TouchableOpacity
                  onPress={() => setShowTimeframePicker(true)}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-full overflow-hidden"
                  style={{ 
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <CalendarRange size={16} color={COLORS.purple} />
                  <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>
                    {timeframeOptions.find(opt => opt.value === timeframe)?.label}
                  </Text>
                </TouchableOpacity>

                {/* Sync Button - Glassy */}
                {/* <TouchableOpacity
                  onPress={syncAcuityData}
                  disabled={isRefreshing}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-full overflow-hidden"
                  style={{ 
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <Loader2
                    size={16}
                    color={COLORS.purple}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>
                    {isRefreshing ? "Syncing..." : "Re-sync"}
                  </Text>
                </TouchableOpacity> */}
              </>
            ) : (
              <>
                {/* Date Picker - Glassy */}
                <TouchableOpacity
                  onPress={handleOpenDatePicker}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-full overflow-hidden"
                  style={{ 
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <Calendar size={16} color={COLORS.orange} />
                  <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>
                    {formatSelectedDate()}
                  </Text>
                </TouchableOpacity>

                {/* Sync Button - Glassy */}
                {/* <TouchableOpacity
                  onPress={syncAcuityData}
                  disabled={isRefreshing}
                  className="flex-1 flex-row items-center justify-center gap-2 py-3 rounded-full overflow-hidden"
                  style={{ 
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <Loader2
                    size={16}
                    color={COLORS.orange}
                    className={isRefreshing ? "animate-spin" : ""}
                  />
                  <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>
                    {isRefreshing ? "Syncing..." : "Re-sync"}
                  </Text>
                </TouchableOpacity> */}
              </>
            )}
          </View>
        </View>

        {/* Date Picker Modal - Glassy */}
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDateCancel}
        >
          <View className="flex-1 justify-center items-center bg-black/70">
            <View 
              className="rounded-3xl p-6 w-[90%] max-w-md overflow-hidden"
              style={{ 
                backgroundColor: 'rgba(37, 37, 37, 0.85)',
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
                Choose Date
              </Text>

              <View 
                className="rounded-2xl overflow-hidden"
                style={{ 
                  backgroundColor: 'rgba(24, 24, 24, 0.8)',
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                  textColor={COLORS.text}
                  themeVariant="dark"
                />
              </View>

              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={handleDateCancel}
                  className="flex-1 py-3 rounded-full"
                  style={{ 
                    backgroundColor: 'rgba(24, 24, 24, 0.8)',
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
                    shadowRadius: 15,
                    elevation: 5,
                  }}
                >
                  <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Timeline Picker Modal - Glassy */}
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
            <View 
              className="rounded-2xl p-2 mx-4 w-64 overflow-hidden"
              style={{ 
                backgroundColor: 'rgba(37, 37, 37, 0.9)',
                borderWidth: 1, 
                borderColor: COLORS.purpleGlow,
                shadowColor: COLORS.purple,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
                elevation: 10,
              }}
            >
              {timeframeOptions.map((option, index) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setTimeframe(option.value as Timeframe);
                    setShowTimeframePicker(false);
                  }}
                  className="py-3 px-4 rounded-xl"
                  style={timeframe === option.value ? {
                    backgroundColor: COLORS.purpleGlow,
                  } : {}}
                >
                  <Text 
                    className="text-sm"
                    style={{ 
                      color: timeframe === option.value ? COLORS.yellow : COLORS.text,
                      fontWeight: timeframe === option.value ? 'bold' : 'normal'
                    }}
                  >
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