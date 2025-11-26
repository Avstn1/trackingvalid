import AverageTicketCard from '@/components/Dashboard/Monthly/AverageTicketCard';
import DailyRevenueCard from '@/components/Dashboard/Monthly/DailyRevenueCard';
import MarketingFunnelsChart from '@/components/Dashboard/Monthly/MarketingFunnelsChart';
import MonthlyExpensesCard from '@/components/Dashboard/Monthly/MonthlyExpensesCard';
import MonthlyProfitCard from '@/components/Dashboard/Monthly/MonthlyProfitCard';
import MonthlyRevenueCard from '@/components/Dashboard/Monthly/MonthlyRevenueCard';
import ProfitLossTrendChart from '@/components/Dashboard/Monthly/ProfitLossTrendChart';
import ProfitMarginPieChart from '@/components/Dashboard/Monthly/ProfitMarginPieChart';
import ServiceBreakdownChart from '@/components/Dashboard/Monthly/ServiceBreakdownChart';
import TopClientsCard from '@/components/Dashboard/Monthly/TopClientsCard';
import React from 'react';
import { View } from 'react-native';

interface MonthlyDashboardProps {
  userId: string;
  selectedMonth: string;
  selectedYear: number;
  selectedDay: number;
  globalRefreshKey: number;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function MonthlyDashboard({
  userId,
  selectedMonth,
  selectedYear,
  selectedDay,
  globalRefreshKey,
}: MonthlyDashboardProps) {
  return (
    <View className="gap-4">
      <DailyRevenueCard
        key={`daily-${globalRefreshKey}`}
        userId={userId}
        selectedDate={`${selectedYear}-${String(
          MONTHS.indexOf(selectedMonth) + 1
        ).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
      />
      
      {/* Revenue Cards Row */}
      <View className="flex-row gap-3">
        <View className="flex-1">
          <MonthlyRevenueCard
            key={`monthly-${globalRefreshKey}`}
            userId={userId}
            selectedMonth={selectedMonth}
            year={selectedYear}
          />
        </View>

        <View className="flex-1">
          <MonthlyProfitCard
            key={`profit-${globalRefreshKey}`}
            userId={userId}
            selectedMonth={selectedMonth}
            year={selectedYear}
            refreshKey={globalRefreshKey}
          />
        </View>
      </View>

      <View className="flex-row gap-3">
        <View className="flex-1">
          <AverageTicketCard
            key={`ticket-${globalRefreshKey}`}
            userId={userId}
            selectedMonth={selectedMonth}
            year={selectedYear}
          />
        </View>
      
        <View className="flex-1">
          <MonthlyExpensesCard
            key={`expenses-${globalRefreshKey}`}
            userId={userId}
            month={selectedMonth}
            year={selectedYear}
          />
        </View>
      </View>

      {/* Charts - Vertical Layout */}
      <ServiceBreakdownChart
        key={`services-${globalRefreshKey}`}
        barberId={userId}
        month={selectedMonth}
        year={selectedYear}
      />

      <TopClientsCard
        key={`clients-${globalRefreshKey}`}
        userId={userId}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
      />

      <MarketingFunnelsChart
        key={`funnels-${globalRefreshKey}`}
        barberId={userId}
        month={selectedMonth}
        year={selectedYear}
      />

      <ProfitLossTrendChart
        key={`trend-${globalRefreshKey}`}
        userId={userId}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        refreshKey={globalRefreshKey}
      />

      <ProfitMarginPieChart
        key={`pie-${globalRefreshKey}`}
        userId={userId}
        selectedMonth={selectedMonth}
        selectedYear={selectedYear}
        refreshKey={globalRefreshKey}
      />
    </View>
  );
}