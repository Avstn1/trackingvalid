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
import { COLORS } from '@/constants/design-system';
import { PageIndicator } from '@/components/UI/PageIndicator';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { getSpringFadeInDown, getStaggerDelay, useReducedMotionPreference } from '@/utils/motion';

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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function MonthlyDashboard({
  userId,
  selectedMonth,
  selectedYear,
  selectedDay,
  globalRefreshKey,
}: MonthlyDashboardProps) {
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const hasAnimated = useRef(false);
  const reduceMotion = useReducedMotionPreference();

  // Metric cards data
  const metricCards = [
    {
      id: 'monthly-revenue',
      component: (
        <MonthlyRevenueCard
          key={`monthly-${globalRefreshKey}`}
          userId={userId}
          selectedMonth={selectedMonth}
          year={selectedYear}
        />
      ),
    },
    {
      id: 'monthly-profit',
      component: (
        <MonthlyProfitCard
          key={`profit-${globalRefreshKey}`}
          userId={userId}
          selectedMonth={selectedMonth}
          year={selectedYear}
          refreshKey={globalRefreshKey}
        />
      ),
    },
    {
      id: 'avg-ticket',
      component: (
        <AverageTicketCard
          key={`ticket-${globalRefreshKey}`}
          userId={userId}
          selectedMonth={selectedMonth}
          year={selectedYear}
        />
      ),
    },
    {
      id: 'expenses',
      component: (
        <MonthlyExpensesCard
          key={`expenses-${globalRefreshKey}`}
          userId={userId}
          month={selectedMonth}
          year={selectedYear}
        />
      ),
    },
  ];

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

  const handleChartScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const cardWidth = SCREEN_WIDTH - 32;
    const index = Math.round(scrollPosition / cardWidth);
    setActiveChartIndex(index);
  };

  // Auto-scroll animation on first load
  useEffect(() => {
    if (!hasAnimated.current && flatListRef.current && charts.length > 0) {
      hasAnimated.current = true;

      const cardWidth = SCREEN_WIDTH - 32;
      
      // Start at the last chart
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: cardWidth * (charts.length - 1),
          animated: false,
        });
        
        // Then scroll back to the first chart
        setTimeout(() => {
          flatListRef.current?.scrollToOffset({
            offset: 0,
            animated: true,
          });
        }, 500);
      }, 10);
    }
  }, [charts.length]);

  return (
    <View className="gap-4">
      {/* Hero Daily Revenue Card */}
      <Animated.View entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(0))}>
        <DailyRevenueCard
          key={`daily-${globalRefreshKey}`}
          userId={userId}
          selectedDate={`${selectedYear}-${String(
            MONTHS.indexOf(selectedMonth) + 1
          ).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
        />
      </Animated.View>

      {/* 2x2 Grid of Metric Cards */}
      <Animated.View className="gap-3" entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(1))}>
        {/* First Row */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            {metricCards[0]?.component}
          </View>
          <View className="flex-1">
            {metricCards[1]?.component}
          </View>
        </View>
        
        {/* Second Row */}
        <View className="flex-row gap-3">
          <View className="flex-1">
            {metricCards[2]?.component}
          </View>
          <View className="flex-1">
            {metricCards[3]?.component}
          </View>
        </View>
      </Animated.View>

      {/* Swipeable Charts Container - Glassy */}
      <Animated.View 
        className="rounded-3xl overflow-hidden"
        style={{  
          minHeight: Math.max(SCREEN_HEIGHT * 0.42, 360),
          marginTop: -15
        }}
        entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(2))}
      >

        <FlatList
          ref={flatListRef}
          data={charts}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleChartScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH - 32}
          snapToAlignment="start"
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={{ width: SCREEN_WIDTH - 31.5 }}>
              <View style={{ padding: 16, flex: 1 }}>
                {item.component}
              </View>
            </View>
          )}
        />

        {/* Page Indicator Dots - Animated */}
        <PageIndicator
          count={charts.length}
          activeIndex={activeChartIndex}
          reduceMotion={reduceMotion}
          style={{ marginBottom: 10 }}
        />
      </Animated.View>
    </View>
  );
}
