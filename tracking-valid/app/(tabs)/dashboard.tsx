// DashboardPage.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../utils/supabaseClient"; // RN version
import Animated, { FadeInUp } from "react-native-reanimated";

import DailyRevenueCardRN from '../../components/dashboard/daily-revenue-card'; // adjust path
import MonthlyRevenueCardRN from "@/components/dashboard/monthly-revenue-card";


// ------------------ PLACEHOLDER COMPONENTS ------------------

// ❌ REMOVED NAVBAR (this caused the black bar)
// const Navbar = () => <View style={{ height: 60 }} />;

const OnboardingGuard = ({ children }: any) => children;
const SignOutButton = ({ style }: any) => (
  <TouchableOpacity style={style}>
    <Text style={{ color: "#fff" }}>Sign Out</Text>
  </TouchableOpacity>
);

const YearDropdown = (props: any) => <View />;
const MonthDropdown = (props: any) => <View />;
const DailySelector = (props: any) => <View />;
const TipsDropdown = (props: any) => <View />;

const WeeklyReports = (props: any) => <View />;
const MonthlyReports = (props: any) => <View />;
const WeeklyComparisonReports = (props: any) => <View />;

const MonthlyRevenueCard = (props: any) => <View />;
const DailyRevenueCard = (props: any) => <View />;
const MonthlyExpensesCard = (props: any) => <View />;
const TopClientsCard = (props: any) => <View />;
const YearlyRevenueCard = (props: any) => <View />;
const AverageTicketCard = (props: any) => <View />;
const ServiceBreakdownChart = (props: any) => <View />;
const MarketingFunnelsChart = (props: any) => <View />;
const ProfitLossDashboard = (props: any) => <View />;
const YearlyDashboard = (props: any) => <View />;

// ------------------------------------------------------------

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const getLocalMonthYear = () => {
  const now = new Date();
  return { month: MONTHS[now.getMonth()], year: now.getFullYear() };
};

// ------------------------------------------------------------

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [selectedMonth, setSelectedMonth] = useState<string>(
    getLocalMonthYear().month
  );
  const [selectedYear, setSelectedYear] = useState<number>(
    getLocalMonthYear().year
  );
  const [selectedDay, setSelectedDay] = useState<number>(
    new Date().getDate()
  );

  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardView, setDashboardView] = useState<
    "monthly" | "yearly" | "profit"
  >("monthly");

  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasSyncedInitially = useRef(false);
  const firstSyncAfterConnect = useRef(false);

  // ---------------------------- SYNCING ----------------------------
  const syncAcuityData = async () => {
    try {
      setIsRefreshing(true);

      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/acuity/pull?endpoint=appointments&month=${selectedMonth}&year=${selectedYear}`
      );

      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleFullAcuitySync = async () => {
    try {
      setIsRefreshing(true);

      await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/acuity/sync-full`,
        { method: "POST" }
      );

      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  };

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

  useEffect(() => {
    if (!user || !hasSyncedInitially.current) return;
    syncAcuityData();
  }, [selectedMonth, selectedYear]);

  // ---------------------------- RENDERING ----------------------------

  if (loading)
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );

  if (error)
    return (
      <View style={styles.centered}>
        <Text style={{ color: "red" }}>{error}</Text>
      </View>
    );

// --- STYLING + MODERNIZED VERSION (SAFE) ---

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#0f0f0f" }}>
      <OnboardingGuard>
        <ScrollView
          style={{
            flex: 1,
            backgroundColor: "#0f0f0f",
            padding: 16,
          }}
        >

          {/* HEADER */}
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={{ marginBottom: 22 }}
          >
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Your daily & monthly performance overview.
            </Text>

            <View style={styles.switchContainer}>
              <TouchableOpacity
                onPress={() =>
                  setDashboardView((prev) =>
                    prev === "monthly"
                      ? "yearly"
                      : prev === "yearly"
                      ? "profit"
                      : "monthly"
                  )
                }
                style={styles.switchButton}
              >
                <Text style={styles.switchButtonText}>
                  {dashboardView === "monthly"
                    ? "Switch → Yearly Dashboard"
                    : dashboardView === "yearly"
                    ? "Switch → Profit/Loss Dashboard"
                    : "Switch → Monthly Dashboard"}
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* CONTENT (unchanged) */}
          {dashboardView === "monthly" && (
            <MonthlyContent
              user={user}
              refreshKey={refreshKey}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedDay={selectedDay}
              isAdmin={isAdmin}
            />
          )}
          {dashboardView === "yearly" && (
            <YearlyDashboard
              userId={"mockid"}
              selectedYear={selectedYear}
              globalRefreshKey={refreshKey}
            />
          )}
          {dashboardView === "profit" && (
            <ProfitLossDashboard
              userId={"mockid"}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              selectedDay={selectedDay}
              globalRefreshKey={refreshKey}
            />
          )}
        </ScrollView>
      </OnboardingGuard>
    </SafeAreaView>
  );
}

// ---------------------------- MONTHLY CONTENT ----------------------------

function MonthlyContent({
  user,
  refreshKey,
  selectedMonth,
  selectedYear,
  selectedDay,
  isAdmin,
}: any) {
  return (
    <View style={{ gap: 16 }}>
      {/* REVENUE CARDS */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <DailyRevenueCardRN
            key={`daily-${refreshKey}`}
            userId={user?.id || 'mockid'}
            selectedDate={`${selectedYear}-${String(
              MONTHS.indexOf(selectedMonth) + 1
            ).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`}
          />
        </View>

        <View style={{ flex: 1 }}>
          <MonthlyRevenueCardRN
            key={`monthly-${refreshKey}`}
            userId={user?.id || 'mockid'}
            selectedMonth={selectedMonth}
            year={selectedYear}
          />
        </View>
      </View>


      {/* EXPENSES */}
      <MonthlyExpensesCard
        key={`expenses-${refreshKey}`}
        userId={"mockid"}
        month={selectedMonth}
        year={selectedYear}
      />

      {/* CHARTS */}
      <ServiceBreakdownChart
        key={`services-${refreshKey}`}
        barberId={"mockid"}
        month={selectedMonth}
        year={selectedYear}
      />

      <MarketingFunnelsChart
        key={`funnels-${refreshKey}`}
        barberId={"mockid"}
        month={selectedMonth}
        year={selectedYear}
      />

      {/* REPORTS */}
      <MonthlyReports
        key={`mreports-${refreshKey}`}
        userId={"mockid"}
        filterMonth={selectedMonth}
        filterYear={selectedYear}
        isAdmin={isAdmin}
      />

      <WeeklyReports
        key={`wreports-${refreshKey}`}
        userId={"mockid"}
        filterMonth={selectedMonth}
        filterYear={selectedYear}
        isAdmin={isAdmin}
      />

      <WeeklyComparisonReports
        key={`wcompare-${refreshKey}`}
        userId={"mockid"}
        filterMonth={selectedMonth}
        filterYear={selectedYear}
        isAdmin={isAdmin}
      />
    </View>
  );
}

// ---------------------------- STYLES ----------------------------

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: "#0f0f0f",
    justifyContent: "center",
    alignItems: "center",
  },

  // Title has neon glow
  title: {
    color: "#eaffb0",
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: 0.5,
    textShadowColor: "rgba(196,255,133,0.4)",
    textShadowRadius: 12,
  },

  subtitle: {
    color: "#9ea598",
    fontSize: 13,
    marginTop: 4,
  },

  switchContainer: {
    flexDirection: "row",
    marginTop: 16,
    gap: 12,
  },

  // Futuristic pill button
  switchButton: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#c4ff85",
    borderRadius: 14,
    shadowColor: "#c4ff85",
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },

  switchButtonText: {
    fontWeight: "700",
    color: "#0b0b0b",
    letterSpacing: 0.3,
  },
});

