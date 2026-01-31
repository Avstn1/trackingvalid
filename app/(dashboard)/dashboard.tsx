// app/(dashboard)/dashboard.tsx
import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import Onboarding from '@/components/Onboarding/Onboarding';
import { supabase } from "@/utils/supabaseClient";
import * as Device from 'expo-device';
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  View
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
  orange: '#2f3a2d',
  orangeGlow: '#55694b',
  yellow: '#FFEB3B',
};

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
  const [tempDashboardView, setTempDashboardView] = useState<"monthly" | "yearly">("monthly");
  const [tempTimeframe, setTempTimeframe] = useState<Timeframe>('year');
  const [showOnboarding, setShowOnboarding] = useState(false);

  const hasSyncedInitially = useRef(false);
  const firstSyncAfterConnect = useRef(false);

  const { expoPushToken } = usePushNotifications()

  // Check onboarding status FIRST
  useEffect(() => {
    const checkOnboardingStatus = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("No user session found.");

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('onboarded')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!profileError && profile?.onboarded === false) {
          setShowOnboarding(true);
          setLoading(false);
          return; // Stop here, don't load anything else
        }

        // If onboarded, continue with normal loading
        fetchUserAndProfile();
      } catch (err: any) {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, []);

  // Fetch user and profile (only called after onboarding check passes)
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
        `${process.env.EXPO_PUBLIC_API_URL}/api/pull?granularity=month&month=${encodeURIComponent(selectedMonth)}&year=${selectedYear}`,
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
    setDashboardView(tempDashboardView);
    setTimeframe(tempTimeframe);
    setShowDatePicker(false);
  };

  const handleOpenPicker = () => {
    setTempDate(selectedDate);
    setTempDashboardView(dashboardView);
    setTempTimeframe(timeframe);
    setShowDatePicker(true);
  };

  const handleCancelPicker = () => {
    setTempDate(selectedDate);
    setTempDashboardView(dashboardView);
    setTempTimeframe(timeframe);
    setShowDatePicker(false);
  };

  const handleOnboardingComplete = async () => {
    setShowOnboarding(false);
    // Reload the dashboard after onboarding
    await fetchUserAndProfile();
  };

  if (loading) {
    return <AuthLoadingSplash message="Loading dashboard..." />;
  }

  // Show onboarding modal if user hasn't completed onboarding
  if (showOnboarding) {
    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <Onboarding onComplete={handleOnboardingComplete} />
      </Modal>
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
      <CustomHeader 
        pageName="Dashboard" 
        onRefresh={syncAcuityData}
        userId={profile.user_id}
        dashboardView={dashboardView}
        onDashboardViewChange={setDashboardView}
        timeframe={timeframe}
        onTimeframeChange={setTimeframe}
        selectedDate={selectedDate}
        onDateSelect={(date) => {
          setSelectedDate(date);
          setSelectedDay(date.getDate());
          setSelectedMonth(MONTHS[date.getMonth()]);
          setSelectedYear(date.getFullYear());
        }}
      />
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={syncAcuityData} tintColor={COLORS.orange} />
        }
      >
        {/* HEADER */}
        <View className="mb-3">
        </View>

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
      </ScrollView>
    </SafeAreaView>
  );
}