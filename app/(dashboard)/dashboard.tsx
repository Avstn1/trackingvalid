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
// import { supabase } from "../../utils/supabaseClient"; // Comment out for now

// import DailyRevenueCardRN from '../../components/dashboard/daily-revenue-card'; // Comment out for now
// import MonthlyRevenueCardRN from "@/components/dashboard/monthly-revenue-card"; // Comment out for now


// ------------------ PLACEHOLDER COMPONENTS ------------------

const OnboardingGuard = ({ children }: any) => children;

const YearlyDashboard = (props: any) => (
  <View style={{ padding: 20 }}>
    <Text style={{ color: '#fff' }}>Yearly Dashboard (Placeholder)</Text>
  </View>
);

const ProfitLossDashboard = (props: any) => (
  <View style={{ padding: 20 }}>
    <Text style={{ color: '#fff' }}>Profit/Loss Dashboard (Placeholder)</Text>
  </View>
);

const DailyRevenueCardRN = (props: any) => (
  <View style={{ padding: 20, backgroundColor: '#1a1a1a', borderRadius: 12 }}>
    <Text style={{ color: '#c4ff85' }}>Daily Revenue</Text>
    <Text style={{ color: '#fff', fontSize: 24, marginTop: 8 }}>$0</Text>
  </View>
);

const MonthlyRevenueCardRN = (props: any) => (
  <View style={{ padding: 20, backgroundColor: '#1a1a1a', borderRadius: 12 }}>
    <Text style={{ color: '#c4ff85' }}>Monthly Revenue</Text>
    <Text style={{ color: '#fff', fontSize: 24, marginTop: 8 }}>$0</Text>
  </View>
);

const MonthlyExpensesCard = (props: any) => <View />;
const ServiceBreakdownChart = (props: any) => <View />;
const MarketingFunnelsChart = (props: any) => <View />;
const MonthlyReports = (props: any) => <View />;
const WeeklyReports = (props: any) => <View />;
const WeeklyComparisonReports = (props: any) => <View />;

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
  const [dashboardView, setDashboardView] = useState<"monthly" | "yearly" | "profit">("monthly"); // ✅ FIXED

  const [isRefreshing, setIsRefreshing] = useState(false);

  const hasSyncedInitially = useRef(false);
  const firstSyncAfterConnect = useRef(false);

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
          <View style={{ marginBottom: 22 }}>
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
          </View>

          {/* CONTENT */}
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