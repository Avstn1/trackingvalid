import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import { ReportItemSkeleton } from '@/components/UI/SkeletonLoader';
import { ChevronRight, GitCompare } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReportViewerModal from './ReportViewerModal';

type WeeklyComparisonReport = {
  id: string;
  week_number?: number | null;
  month: string;
  year: number;
  content: string;
  type?: 'weekly_comparison';
  isUpcoming?: boolean;
  releaseDate?: Date;
};

// For the modal, we need to map to the Report type
type Report = {
  id: string;
  week_number?: number;
  month: string;
  year: number;
  content: string;
};

interface WeeklyComparisonReportsProps {
  userId: string;
  refresh?: number;
  filterMonth?: string;
  filterYear?: number | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateShort(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getSecondMonday(month: string, year: number): Date {
  const monthIndex = MONTHS.indexOf(month);
  const firstDay = new Date(year, monthIndex, 1);
  const firstDayOfWeek = firstDay.getDay();
  
  const daysUntilMonday = firstDayOfWeek === 0 ? 1 : (8 - firstDayOfWeek);
  const secondMondayDate = daysUntilMonday + 8;
  
  return new Date(year, monthIndex, secondMondayDate);
}

function isReportAvailable(month: string, year: number): boolean {
  const releaseDate = getSecondMonday(month, year);
  const today = new Date();
  return today >= releaseDate;
}

async function logWeeklyComparisonReportOpen(user_id: string, r: any) {
  try {
    const details = r.week_number 
      ? `Opened Report: Week #${r.week_number}, ${r.month} ${r.year}`
      : `Opened Report: ${r.month} ${r.year}`;
    
    const { error: insertError } = await supabase
      .from('system_logs')
      .insert({
        source: user_id,
        action: 'opened_wkComparison_report',
        status: 'success',
        details: details,
      });

    if (insertError) {
      console.error('Error logging weekly comparison report open:', insertError);
    }
  } catch (error) {
    console.error('Error in logWeeklyComparisonReportOpen:', error);
  }
}
    
export default function WeeklyComparisonReports({
  userId,
  refresh,
  filterMonth,
  filterYear,
}: WeeklyComparisonReportsProps) {
  const [reports, setReports] = useState<WeeklyComparisonReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'weekly_comparison')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching weekly comparison reports:', error);
        setReports([]);
        return;
      }

      setReports(
        (data || []).map((r: any) => ({
          ...r,
          year: r.year || new Date().getFullYear(),
          type: 'weekly_comparison' as const,
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

  const filteredReports = reports.filter((r) => {
    return (
      (!filterMonth || r.month === filterMonth) &&
      (!filterYear || r.year === filterYear)
    );
  });

  const getReportDisplay = () => {
    if (!filterMonth || !filterYear) {
      return filteredReports;
    }

    const existingReport = filteredReports.find(
      r => r.month === filterMonth && r.year === filterYear
    );

    if (existingReport) {
      return [existingReport];
    }

    const isUpcoming = !isReportAvailable(filterMonth, filterYear);
    const releaseDate = getSecondMonday(filterMonth, filterYear);

    return [{
      id: `placeholder-${filterMonth}-${filterYear}`,
      month: filterMonth,
      content: '',
      year: filterYear,
      type: 'weekly_comparison' as const,
      isUpcoming,
      releaseDate,
    }];
  };

  const displayReports = getReportDisplay();

  const handleOpenReport = (report: WeeklyComparisonReport) => {
    // Map to Report type for modal, handling null week_number
    const modalReport: Report = {
      id: report.id,
      month: report.month,
      year: report.year,
      content: report.content,
      week_number: report.week_number ?? undefined,
    };
    setSelectedReport(modalReport);
    setModalVisible(true);
    logWeeklyComparisonReportOpen(userId, report).catch(err => {
      console.error('Failed to log report open:', err);
    });
  };
      
  const handleCloseModal = () => {
    setModalVisible(false);
    setSelectedReport(null);
  };

  // Loading skeleton
  if (loading) {
    return <ReportItemSkeleton />;
  }

  // Empty state
  if (displayReports.length === 0) {
    return (
      <View 
        className="py-8 items-center rounded-xl"
        style={{ backgroundColor: COLORS.surface }}
      >
        <Text className="text-sm" style={{ color: COLORS.textTertiary }}>
          No comparison reports for this period
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
        {displayReports.map((r, index) => {
          const isUpcoming = r.isUpcoming;
          const isLast = index === displayReports.length - 1;
          
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
              {/* Icon badge */}
              <View 
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: isUpcoming ? COLORS.surfaceElevated : COLORS.primaryMuted,
                }}
              >
                <GitCompare 
                  size={20} 
                  color={isUpcoming ? COLORS.textTertiary : COLORS.primary} 
                />
              </View>
              
              {/* Content */}
              <View className="flex-1 ml-4">
                <Text 
                  className="text-base font-medium"
                  style={{ color: isUpcoming ? COLORS.textTertiary : COLORS.textPrimary }}
                >
                  {r.month} {r.year}
                </Text>
                <Text 
                  className="text-sm mt-0.5"
                  style={{ color: COLORS.textTertiary }}
                >
                  {isUpcoming 
                    ? `Releases ${formatDateShort(r.releaseDate!)}`
                    : 'Week-over-week comparison'
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
