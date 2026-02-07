import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import { ReportItemSkeleton } from '@/components/UI/SkeletonLoader';
import { ChevronRight } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
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
  reference?: string | null;
}

function getMondaysInMonth(month: string, year: number): Date[] {
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIndex = MONTHS.indexOf(month);
  const mondays: Date[] = [];
  const date = new Date(year, monthIndex, 1);

  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }

  while (date.getMonth() === monthIndex) {
    mondays.push(new Date(date));
    date.setDate(date.getDate() + 7);
  }

  return mondays;
}

function getCurrentWeekNumber(month: string, year: number): number {
  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  
  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthIndex = MONTHS.indexOf(month);
  
  if (monthIndex !== currentMonth || year !== currentYear) {
    return -1;
  }
  
  const mondays = getMondaysInMonth(month, year);
  const todayTime = today.getTime();
  
  for (let i = 0; i < mondays.length; i++) {
    const mondayTime = mondays[i].getTime();
    const nextMondayTime = mondays[i + 1] ? mondays[i + 1].getTime() : Infinity;
    
    if (todayTime >= mondayTime && todayTime < nextMondayTime) {
      return i + 1;
    }
  }
  
  return mondays.length;
}

function formatDateShort(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
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
  reference,
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
        .eq('month', filterMonth)
        .eq('year', filterYear)
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

      if (reference) {
        const { data: reportData, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', reference)
          .single();

        if (error || !reportData) {
          return;
        }

        handleOpenReport({
          id: reportData.id,
          month: reportData.month,
          week_number: reportData.week_number,
          title: reportData.title,
          content: reportData.content || '',
          year: reportData.year || new Date().getFullYear(),
        });
      }
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

  const generateWeeksList = () => {
    if (!filterMonth || !filterYear) return filteredReports;

    const currentWeek = getCurrentWeekNumber(filterMonth, filterYear);
    
    if (currentWeek === -1) return filteredReports;

    const mondays = getMondaysInMonth(filterMonth, filterYear);
    const totalWeeks = mondays.length;
    const allWeeks = [];

    for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
      const existingReport = filteredReports.find(r => r.week_number === weekNum);
      
      if (existingReport) {
        const isUpcoming = currentWeek !== -1 && weekNum >= currentWeek;
        allWeeks.push({ ...existingReport, isUpcoming });
      } else {
        const isUpcoming = weekNum >= currentWeek;
        
        let releaseDate;
        if (mondays[weekNum]) {
          releaseDate = mondays[weekNum];
        } else {
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

  // Loading skeleton
  if (loading) {
    return (
      <View>
        <ReportItemSkeleton />
        <ReportItemSkeleton />
        <ReportItemSkeleton />
      </View>
    );
  }

  // Empty state
  if (weeksList.length === 0) {
    return (
      <View 
        className="py-8 items-center rounded-xl"
        style={{ backgroundColor: COLORS.surface }}
      >
        <Text className="text-sm" style={{ color: COLORS.textTertiary }}>
          No weekly reports for this period
        </Text>
      </View>
    );
  }

  return (
    <>
      <View 
        className="rounded-xl overflow-hidden"
        style={{ 
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        {weeksList.map((r: any, index: number) => {
          const isUpcoming = r.isUpcoming;
          const isLast = index === weeksList.length - 1;
          
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => !isUpcoming && handleOpenReport(r)}
              disabled={isUpcoming}
              className="flex-row items-center px-4 py-4"
              style={{
                opacity: isUpcoming ? 0.5 : 1,
                borderBottomWidth: isLast ? 0 : 1,
                borderBottomColor: COLORS.border,
              }}
              activeOpacity={0.7}
            >
              {/* Week number badge */}
              <View 
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: isUpcoming ? COLORS.surfaceElevated : COLORS.primaryMuted,
                }}
              >
                <Text 
                  className="text-base font-bold"
                  style={{ color: isUpcoming ? COLORS.textTertiary : COLORS.primary }}
                >
                  W{r.week_number}
                </Text>
              </View>
              
              {/* Content */}
              <View className="flex-1 ml-4">
                <Text 
                  className="text-base font-medium"
                  style={{ color: isUpcoming ? COLORS.textTertiary : COLORS.textPrimary }}
                >
                  Week {r.week_number}
                </Text>
                <Text 
                  className="text-sm mt-0.5"
                  style={{ color: COLORS.textTertiary }}
                >
                  {isUpcoming 
                    ? `Releases ${formatDateShort(r.releaseDate)}`
                    : `${r.month} ${r.year}`
                  }
                </Text>
              </View>
              
              {/* Status / Arrow */}
              {isUpcoming ? (
                <View 
                  className="px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: COLORS.surfaceElevated }}
                >
                  <Text className="text-xs font-medium" style={{ color: COLORS.textTertiary }}>
                    Upcoming
                  </Text>
                </View>
              ) : (
                <ChevronRight size={20} color={COLORS.textTertiary} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      <ReportViewerModal
        report={selectedReport}
        visible={modalVisible}
        onClose={handleCloseModal}
      />
    </>
  );
}
