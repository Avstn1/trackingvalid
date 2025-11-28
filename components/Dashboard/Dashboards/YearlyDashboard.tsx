import RevenueDayMonthToggleChart from '@/components/Dashboard/Yearly/RevenueDayMonthToggleChart';
import TimeframeAverageTicketCard from '@/components/Dashboard/Yearly/TimeframeAverageTicketCard';
import TimeframeMarketingFunnelsChart from '@/components/Dashboard/Yearly/TimeframeMarketingFunnelsChart';
import YearlyExpensesCard from '@/components/Dashboard/Yearly/YearlyExpensesCard';
import YearlyRevenueCard from '@/components/Dashboard/Yearly/YearlyRevenueCard';
import YearlyServiceBreakdownChart from '@/components/Dashboard/Yearly/YearlyServiceBreakdownChart';
import YearlyTopClientsCard from '@/components/Dashboard/Yearly/YearlyTopClientsCard';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, FlatList, NativeScrollEvent, NativeSyntheticEvent, View } from 'react-native';

// Color Palette - matching Monthly dashboard
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
  greenLight: '#beb348ff',
  yellow: '#FFEB3B',
  dotInactive: 'rgba(255, 255, 255, 0.2)',
};

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
    <View className="gap-3">
      <View></View>
      {/* Hero Yearly Revenue Card */}
      {metricCards[0]?.component}

      {/* Average Ticket Card Row */}
      {metricCards[1]?.component}

      {/* Expenses Card Row */}
      {metricCards[2]?.component}

      {/* Swipeable Charts Container - Glassy */}
      <View 
        className="rounded-3xl overflow-hidden"
        style={{  
          flex: 1,
          marginTop: -15
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
            <View style={{ width: SCREEN_WIDTH - 31.5, flex: 1 }}>
              <View style={{ paddingTop: 10, flex: 1, marginRight: 10}}>
                {item.component}
              </View>
            </View>
          )}
        />
      </View>

              {/* Page Indicator Dots - Glassy style */}
      <View 
        className="flex-row justify-center items-center gap-2"
        style={{  
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          marginBottom: -30
        }}
      >
        {charts.map((_, index) => (
          <View
            key={index}
            className="h-2 rounded-full"
            style={{
              width: index === activeChartIndex ? 24 : 8,
              backgroundColor: index === activeChartIndex ? COLORS.green : COLORS.dotInactive,
              shadowColor: index === activeChartIndex ? COLORS.green : 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: index === activeChartIndex ? 0.8 : 0,
              shadowRadius: 6,
              elevation: index === activeChartIndex ? 4 : 0,
            }}
          />
        ))}
      </View>
    </View>
  );
}