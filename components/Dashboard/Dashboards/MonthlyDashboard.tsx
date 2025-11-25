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
import React, { useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function MonthlyDashboard({
  userId,
  selectedMonth,
  selectedYear,
  selectedDay,
  globalRefreshKey,
}: MonthlyDashboardProps) {
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Define all charts in an array
  const charts = [
    {
      id: 'service-breakdown',
      component: (
        <ServiceBreakdownChart
          key={`services-${globalRefreshKey}`}
          barberId={userId}
          month={selectedMonth}
          year={selectedYear}
        />
      ),
    },
    {
      id: 'top-clients',
      component: (
        <TopClientsCard
          key={`clients-${globalRefreshKey}`}
          userId={userId}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
        />
      ),
    },
    {
      id: 'marketing-funnels',
      component: (
        <MarketingFunnelsChart
          key={`funnels-${globalRefreshKey}`}
          barberId={userId}
          month={selectedMonth}
          year={selectedYear}
        />
      ),
    },
    {
      id: 'profit-loss-trend',
      component: (
        <ProfitLossTrendChart
          key={`trend-${globalRefreshKey}`}
          userId={userId}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          refreshKey={globalRefreshKey}
        />
      ),
    },
    {
      id: 'profit-margin-pie',
      component: (
        <ProfitMarginPieChart
          key={`pie-${globalRefreshKey}`}
          userId={userId}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          refreshKey={globalRefreshKey}
        />
      ),
    },
  ];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const cardWidth = SCREEN_WIDTH - 32; // 32 is total horizontal padding (16px each side)
    const index = Math.round(scrollPosition / cardWidth);
    setActiveChartIndex(index);
  };

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

      {/* Swipeable Charts Container */}
      <View className="bg-zinc-900 rounded-2xl overflow-hidden max-h-[320px]">
        <FlatList
          ref={flatListRef}
          data={charts}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH - 32}
          snapToAlignment="start"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH - 32 }} className="p-4">
              {item.component}
            </View>
          )}
        />

        {/* Page Indicator Dots */}
        <View className="flex-row justify-center items-center py-3 gap-2">
          {charts.map((_, index) => (
            <View
              key={index}
              className={`h-2 rounded-full ${
                index === activeChartIndex
                  ? 'w-6 bg-lime-400'
                  : 'w-2 bg-zinc-700'
              }`}
            />
          ))}
        </View>
      </View>
    </View>
  );
}