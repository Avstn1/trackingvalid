import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import QuarterlyRevenueChart from './QuarterlyRevenueChart';
import RevenueByWeekdayChart from './RevenueByWeekdayChart';

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface Props {
  userId: string;
  year: number;
  timeframe: Timeframe;
}

type ViewMode = 'weekday' | 'month';

export default function RevenueDayMonthToggleChart({ userId, year, timeframe }: Props) {
  const [view, setView] = useState<ViewMode>('weekday');

  return (
    <View className="min-h-[280px] rounded-xl bg-zinc-900 border border-zinc-800 p-3">
      {/* Toggle buttons */}
      <View className="absolute right-3 top-3 z-10 flex-row items-center gap-2">
        <TouchableOpacity
          onPress={() => setView('weekday')}
          className={`px-3 py-1.5 rounded-full ${
            view === 'weekday'
              ? 'bg-lime-400 border-lime-400'
              : 'bg-black/40 border-white/20'
          } border`}
        >
          <Text
            className={`text-xs font-semibold ${
              view === 'weekday' ? 'text-black' : 'text-lime-200'
            }`}
          >
            Day
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setView('month')}
          className={`px-3 py-1.5 rounded-full ${
            view === 'month'
              ? 'bg-lime-400 border-lime-400'
              : 'bg-black/40 border-white/20'
          } border`}
        >
          <Text
            className={`text-xs font-semibold ${
              view === 'month' ? 'text-black' : 'text-lime-200'
            }`}
          >
            Month
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chart */}
      {view === 'weekday' ? (
        <RevenueByWeekdayChart userId={userId} year={year} timeframe={timeframe} />
      ) : (
        <QuarterlyRevenueChart userId={userId} year={year} timeframe={timeframe} />
      )}
    </View>
  );
}