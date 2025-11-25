import RevenueDayMonthToggleChart from '@/components/Dashboard/Yearly/RevenueDayMonthToggleChart';
import TimeframeAverageTicketCard from '@/components/Dashboard/Yearly/TimeframeAverageTicketCard';
import TimeframeMarketingFunnelsChart from '@/components/Dashboard/Yearly/TimeframeMarketingFunnelsChart';
import YearlyExpensesCard from '@/components/Dashboard/Yearly/YearlyExpensesCard';
import YearlyRevenueCard from '@/components/Dashboard/Yearly/YearlyRevenueCard';
import YearlyServiceBreakdownChart from '@/components/Dashboard/Yearly/YearlyServiceBreakdownChart';
import YearlyTopClientsCard from '@/components/Dashboard/Yearly/YearlyTopClientsCard';
import React from 'react';
import { View } from 'react-native';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface YearlyDashboardProps {
  userId: string;
  selectedYear: number;
  timeframe: Timeframe;
  globalRefreshKey: number;
}

export default function YearlyDashboard({
  userId,
  selectedYear,
  timeframe,
  globalRefreshKey,
}: YearlyDashboardProps) {
  return (
    <View className="gap-4">
      <YearlyRevenueCard
        userId={userId}
        year={selectedYear}
        timeframe={timeframe}
        refreshKey={globalRefreshKey}
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <TimeframeAverageTicketCard
            userId={userId}
            year={selectedYear}
            timeframe={timeframe}
            refreshKey={globalRefreshKey}
          />
        </View>

        <View className="flex-1">
          <YearlyExpensesCard
            userId={userId}
            year={selectedYear}
            timeframe={timeframe}
            refreshKey={globalRefreshKey}
          />
        </View>
      </View>

      {/* Service Breakdown */}
      <YearlyServiceBreakdownChart
        barberId={userId}
        year={selectedYear}
        timeframe={timeframe}
        refreshKey={globalRefreshKey}
      />

      {/* Charts Row */}
      <RevenueDayMonthToggleChart
        userId={userId}
        year={selectedYear}
        timeframe={timeframe}
        refreshKey={globalRefreshKey}
      />

      {/* Top Clients */}
      <YearlyTopClientsCard
        userId={userId}
        year={selectedYear}
        timeframe={timeframe}
        refreshKey={globalRefreshKey}
      />

      {/* Marketing Funnels */}
      <View className="mb-6">
        <TimeframeMarketingFunnelsChart
          barberId={userId}
          year={selectedYear}
          timeframe={timeframe}
          refreshKey={globalRefreshKey}
        />
      </View>
    </View>
  );
}