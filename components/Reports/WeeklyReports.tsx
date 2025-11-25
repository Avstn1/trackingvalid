import { supabase } from '@/utils/supabaseClient';
import { ChevronRight, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import ReportViewerModal from './ReportViewerModal';

type WeeklyReport = {
  id: string;
  month: string;
  week_number: number;
  title?: string;
  content: string;
  year: number;
};

interface WeeklyReportsProps {
  userId: string;
  refresh?: number;
  filterMonth?: string;
  filterYear?: number | null;
}

// Get all Mondays in a specific month/year
function getMondaysInMonth(month: string, year: number): Date[] {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIndex = MONTHS.indexOf(month);
  const mondays: Date[] = [];
  const date = new Date(year, monthIndex, 1);

  // Move to first Monday
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }

  // Collect all Mondays
  while (date.getMonth() === monthIndex) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }

  return mondays;
}

// Get current week number in the month
function getCurrentWeekNumber(month: string, year: number): number {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIndex = MONTHS.indexOf(month);
  
  // If not current month/year, return -1 (not applicable)
  if (monthIndex !== currentMonth || year !== currentYear) {
    return -1;
  }
  
  const mondays = getMondaysInMonth(month, year);
  const todayTime = today.getTime();
  
  // Find which week we're in
  for (let i = 0; i < mondays.length; i++) {
    const mondayTime = mondays[i].getTime();
    const nextMondayTime = mondays[i + 1] ? mondays[i + 1].getTime() : Infinity;
    
    if (todayTime >= mondayTime && todayTime < nextMondayTime) {
      return i + 1; // Week numbers are 1-indexed
    }
  }
  
  // If we're past all Mondays, we're in the last week
  return mondays.length;
}

// Format date as "Mon DD, YYYY"
function formatDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

async function logWeeklyReportOpen(user_id: string, r: any) {
  const { error: insertError } = await supabase
    .from('system_logs')
    .insert({
      source: user_id,
      action: 'opened_weekly_report',
      status: 'success',
      details: `Opened Report: Week #${r.week_number}, ${r.month} ${r.year}`,
    });

  if (insertError) throw insertError;
}

export default function WeeklyReports({
  userId,
  refresh,
  filterMonth,
  filterYear,
}: WeeklyReportsProps) {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'weekly')
        .order('week_number', { ascending: true });

      if (error) {
        console.error(error);
        setReports([]);
        return;
      }

      setReports(
        (data || []).map((r: any) => ({
          ...r,
          year: r.year || new Date().getFullYear(),
        }))
      );
    } catch (err) {
      console.error(err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [userId, refresh]);

  const filteredReports = reports.filter(
    (r) =>
      (!filterMonth || r.month === filterMonth) &&
      (!filterYear || r.year === filterYear)
  );

  const handleOpenReport = (report: WeeklyReport) => {
    setSelectedReport(report);
    setModalVisible(true);
    logWeeklyReportOpen(userId, report);
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedReport(null);
  };

  // Generate complete week list with ALL weeks shown
  const generateWeeksList = () => {
    if (!filterMonth || !filterYear) return filteredReports;

    const currentWeek = getCurrentWeekNumber(filterMonth, filterYear);
    
    // If not current month/year, just show existing reports
    if (currentWeek === -1) return filteredReports;

    const mondays = getMondaysInMonth(filterMonth, filterYear);
    const totalWeeks = mondays.length;
    const allWeeks = [];

    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const existingReport = filteredReports.find(r => r.week_number === weekNum);
      
      if (existingReport) {
        // Add existing report (always clickable, even if current/future week)
        allWeeks.push({ ...existingReport, isUpcoming: false });
      } else {
        // Create placeholder for any week without a report
        const isUpcoming = weekNum >= currentWeek;
        
        // Release date is the Monday AFTER the week ends
        let releaseDate;
        if (mondays[weekNum]) {
          // If there's a next Monday in the array, use it
          releaseDate = mondays[weekNum];
        } else {
          // If it's the last week, add 7 days to the last Monday
          releaseDate = new Date(mondays[weekNum - 1]);
          releaseDate.setDate(releaseDate.getDate() + 7);
        }
        
        allWeeks.push({
          id: `placeholder-${weekNum}`,
          week_number: weekNum,
          month: filterMonth,
          year: filterYear,
          content: '',
          isUpcoming: isUpcoming,
          releaseDate: releaseDate,
        });
      }
    }

    return allWeeks;
  };

  const weeksList = generateWeeksList();
  
  // Calculate card height based on number of weeks
  const totalWeeks = weeksList.length;
  const cardHeight = totalWeeks === 4 ? 73 : 57;

  if (loading) {
    return (
      <View className="items-center justify-center py-4">
        <ActivityIndicator size="small" color="#c4ff85" />
      </View>
    );
  }

  return (
    <>
      <View className="gap-1.5">
        {weeksList.length > 0 ? (
          weeksList.map((r: any) => {
            const isUpcoming = r.isUpcoming;
            
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => !isUpcoming && handleOpenReport(r)}
                disabled={isUpcoming}
                className={`rounded-xl p-3 ${
                  isUpcoming 
                    ? 'bg-zinc-800/40 opacity-60' 
                    : 'bg-zinc-800 active:bg-lime-500/20'
                }`}
                style={[
                  { height: cardHeight }, // Dynamic height based on week count
                  !isUpcoming ? { elevation: 4 } : {}
                ]}
              >
                <View className="flex-row items-center gap-3 h-full">
                  <View className={`p-1.5 rounded-lg ${
                    isUpcoming ? 'bg-zinc-700/50' : 'bg-lime-500/20'
                  }`}>
                    <FileText 
                      size={18} 
                      color={isUpcoming ? "#71717a" : "#c4ff85"} 
                      strokeWidth={2.5} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-sm font-bold ${
                      isUpcoming ? 'text-zinc-400' : 'text-white'
                    }`}>
                      Week {r.week_number} - {r.month} {r.year}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${
                      isUpcoming ? 'text-zinc-500' : 'text-lime-400/70'
                    }`}>
                      {isUpcoming 
                        ? `Releasing on ${formatDate(r.releaseDate)}`
                        : 'Tap to view report'
                      }
                    </Text>
                  </View>
                  {!isUpcoming && <ChevronRight size={16} color="#c4ff85" />}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text className="text-gray-400 text-xs text-center py-2">
            No weekly reports available for this month/year.
          </Text>
        )}
      </View>

      <ReportViewerModal
        report={selectedReport}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </>
  );
}