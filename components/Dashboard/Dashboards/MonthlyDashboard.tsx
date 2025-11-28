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
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';

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
  orangeGlow: 'rgba(255, 87, 34, 0.4)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
  dotInactive: 'rgba(255, 255, 255, 0.2)',
};

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
const METRIC_CARD_WIDTH = (SCREEN_WIDTH - 32) * 0.44; // 44% of available width
const METRIC_CARD_GAP = 12;

export default function MonthlyDashboard({
  userId,
  selectedMonth,
  selectedYear,
  selectedDay,
  globalRefreshKey,
}: MonthlyDashboardProps) {
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [activeMetricIndex, setActiveMetricIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const metricsListRef = useRef<FlatList>(null);
  const hasAnimated = useRef(false);

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

  const handleMetricScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (METRIC_CARD_WIDTH + METRIC_CARD_GAP));
    setActiveMetricIndex(Math.min(index, metricCards.length - 1));
  };

  // Auto-scroll animation on first load
  useEffect(() => {
    if (!hasAnimated.current && flatListRef.current && charts.length > 0) {
      hasAnimated.current = true;
      
      // Start at the last chart
      setTimeout(() => {
        flatListRef.current?.scrollToIndex({
          index: charts.length - 1,
          animated: false,
        });
        
        // Then scroll back to the first chart
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: 0,
            animated: true,
          });
        }, 500);
      }, 10);
    }
  }, [charts.length]);

  return (
    <View className="gap-4">
      {/* Hero Daily Revenue Card */}
      <DailyRevenueCard
        key={`daily-${globalRefreshKey}`}
        userId={userId}
        selectedDate={`${selectedYear}-${String(
          MONTHS.indexOf(selectedMonth) + 1
        ).padStart(2, "0")}-${String(selectedDay).padStart(2, "0")}`}
      />

      {/* Horizontal Scrollable Metric Cards */}
      <View>
        <FlatList
          ref={metricsListRef}
          data={metricCards}
          horizontal
          showsHorizontalScrollIndicator={false}
          onScroll={handleMetricScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
          snapToInterval={METRIC_CARD_WIDTH + METRIC_CARD_GAP}
          snapToAlignment="start"
          contentContainerStyle={{ paddingRight: 16 }}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <View
              style={{
                width: METRIC_CARD_WIDTH,
                marginRight: index < metricCards.length - 1 ? METRIC_CARD_GAP : 0,
              }}
            >
              {item.component}
            </View>
          )}
        />
      </View>

      {/* Swipeable Charts Container - Glassy */}
      <View 
        className="rounded-3xl overflow-hidden"
        style={{  
          minHeight: SCREEN_HEIGHT * 0.42,
          maxHeight: SCREEN_HEIGHT * 0.37,
        }}
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

        {/* Page Indicator Dots - Glassy style */}
        <View 
          className="flex-row justify-center items-center py-3 gap-2"
        >
          {charts.map((_, index) => (
            <View
              key={index}
              className="h-2 rounded-full"
              style={{
                width: index === activeChartIndex ? 24 : 8,
                backgroundColor: index === activeChartIndex ? COLORS.orange : COLORS.dotInactive,
                shadowColor: index === activeChartIndex ? COLORS.orange : 'transparent',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: index === activeChartIndex ? 0.8 : 0,
                shadowRadius: 6,
                elevation: index === activeChartIndex ? 4 : 0,
              }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}