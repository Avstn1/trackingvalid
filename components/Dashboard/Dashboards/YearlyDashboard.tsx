import RevenueDayMonthToggleChart from '@/components/Dashboard/Yearly/RevenueDayMonthToggleChart';
import TimeframeAverageTicketCard from '@/components/Dashboard/Yearly/TimeframeAverageTicketCard';
import TimeframeMarketingFunnelsChart from '@/components/Dashboard/Yearly/TimeframeMarketingFunnelsChart';
import YearlyExpensesCard from '@/components/Dashboard/Yearly/YearlyExpensesCard';
import YearlyRevenueCard from '@/components/Dashboard/Yearly/YearlyRevenueCard';
import YearlyServiceBreakdownChart from '@/components/Dashboard/Yearly/YearlyServiceBreakdownChart';
import YearlyTopClientsCard from '@/components/Dashboard/Yearly/YearlyTopClientsCard';
import { COLORS } from '@/constants/design-system';
import { PageIndicator } from '@/components/UI/PageIndicator';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { getSpringFadeInDown, getStaggerDelay, useReducedMotionPreference } from '@/utils/motion';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface YearlyDashboardProps {
  userId: string;
  selectedYear: number;
  timeframe: Timeframe;
  globalRefreshKey: number;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function YearlyDashboard({
  userId,
  selectedYear,
  timeframe,
  globalRefreshKey,
}: YearlyDashboardProps) {
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const hasAnimated = useRef(false);
  const reduceMotion = useReducedMotionPreference();

  // Metric cards data in 2x2 grid layout
  const metricCards = [
    {
      id: 'yearly-revenue',
      component: (
        <YearlyRevenueCard
          key={`yearly-revenue-${globalRefreshKey}`}
          userId={userId}
          year={selectedYear}
          timeframe={timeframe}
          refreshKey={globalRefreshKey}
        />
      ),
    },
    {
      id: 'avg-ticket',
      component: (
        <TimeframeAverageTicketCard
          key={`avg-ticket-${globalRefreshKey}`}
          userId={userId}
          year={selectedYear}
          timeframe={timeframe}
          refreshKey={globalRefreshKey}
        />
      ),
    },
    {
      id: 'expenses',
      component: (
        <YearlyExpensesCard
          key={`expenses-${globalRefreshKey}`}
          userId={userId}
          year={selectedYear}
          timeframe={timeframe}
          refreshKey={globalRefreshKey}
        />
      ),
    },
  ];

  // Define all charts in an array for swipeable carousel
  const charts = [
    {
      id: 'revenue-toggle',
      component: (
        <RevenueDayMonthToggleChart
          key={`revenue-toggle-${globalRefreshKey}`}
          userId={userId}
          year={selectedYear}
          timeframe={timeframe}
          refreshKey={globalRefreshKey}
        />
      ),
    },
    {
      id: 'service-breakdown',
      component: (
        <YearlyServiceBreakdownChart
          key={`services-${globalRefreshKey}`}
          barberId={userId}
          year={selectedYear}
          timeframe={timeframe}
          refreshKey={globalRefreshKey}
        />
      ),
    },
    {
      id: 'top-clients',
      component: (
        <YearlyTopClientsCard
          key={`clients-${globalRefreshKey}`}
          userId={userId}
          year={selectedYear}
          timeframe={timeframe}
          refreshKey={globalRefreshKey}
        />
      ),
    },
    {
      id: 'marketing-funnels',
      component: (
        <TimeframeMarketingFunnelsChart
          key={`funnels-${globalRefreshKey}`}
          barberId={userId}
          year={selectedYear}
          timeframe={timeframe}
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
    <View className="gap-3">
      <View></View>
      {/* Hero Yearly Revenue Card */}
      <Animated.View entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(0))}>
        {metricCards[0]?.component}
      </Animated.View>

      {/* Average Ticket Card Row */}
      <Animated.View entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(1))}>
        {metricCards[1]?.component}
      </Animated.View>

      {/* Expenses Card Row */}
      <Animated.View entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(2))}>
        {metricCards[2]?.component}
      </Animated.View>

      {/* Swipeable Charts Container - Glassy */}
      <Animated.View 
        className="rounded-3xl overflow-hidden"
        style={{  
          flex: 1,
          marginTop: -15
        }}
        entering={getSpringFadeInDown(reduceMotion, getStaggerDelay(3))}
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
            <View style={{ width: SCREEN_WIDTH - 31.5, flex: 1 }}>
              <View style={{ paddingTop: 10, flex: 1, marginRight: 10}}>
                {item.component}
              </View>
            </View>
          )}
        />
      </Animated.View>

      {/* Page Indicator Dots - Animated */}
      <PageIndicator
        count={charts.length}
        activeIndex={activeChartIndex}
        reduceMotion={reduceMotion}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          marginBottom: -30,
        }}
      />
    </View>
  );
}
