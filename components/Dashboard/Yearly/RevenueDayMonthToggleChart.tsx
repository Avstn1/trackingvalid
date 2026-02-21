import { COLORS } from '@/constants/design-system';
import React, { useState } from 'react';
import { Dimensions, Text, TouchableOpacity, View } from 'react-native';
import QuarterlyRevenueChart from './QuarterlyRevenueChart';
import RevenueByWeekdayChart from './RevenueByWeekdayChart';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface Props {
  userId: string;
  year: number;
  timeframe: Timeframe;
  refreshKey?: number;
}

type ViewMode = 'weekday' | 'month';

export default function RevenueDayMonthToggleChart({ userId, year, timeframe, refreshKey }: Props) {
  const [view, setView] = useState<ViewMode>('weekday');

  return (
    <View 
      className="rounded-3xl overflow-hidden"
      style={{ 
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        height: SCREEN_HEIGHT * 0.42,
        width: '100%',
        padding: 16,
      }}
    >
      {/* Toggle buttons - Glassy style */}
      <View 
        className="absolute right-4 top-4 z-10 flex-row items-center rounded-full overflow-hidden"
        style={{
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          padding: 4,
        }}
      >
        <TouchableOpacity
          onPress={() => setView('weekday')}
          className="px-4 py-2 rounded-full"
          style={view === 'weekday' ? {
            backgroundColor: COLORS.primary,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 4,
          } : {}}
        >
          <Text
            className="text-xs font-bold"
            style={{ 
              color: view === 'weekday' ? COLORS.textPrimary : COLORS.textSecondary 
            }}
          >
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setView('month')}
          className="px-4 py-2 rounded-full"
          style={view === 'month' ? {
            backgroundColor: COLORS.primary,
            shadowColor: COLORS.primary,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.5,
            shadowRadius: 8,
            elevation: 4,
          } : {}}
        >
          <Text
            className="text-xs font-bold"
            style={{ 
              color: view === 'month' ? COLORS.textPrimary : COLORS.textSecondary 
            }}
          >
            Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart */}
      <View style={{ flex: 1, paddingTop: 28 }}>
        {view === 'weekday' ? (
          <RevenueByWeekdayChart 
            userId={userId} 
            year={year} 
            timeframe={timeframe} 
            refreshKey={refreshKey}
          />
        ) : (
          <QuarterlyRevenueChart 
            userId={userId} 
            year={year} 
            timeframe={timeframe}
            refreshKey={refreshKey}
          />
        )}
      </View>
    </View>
  );
}
