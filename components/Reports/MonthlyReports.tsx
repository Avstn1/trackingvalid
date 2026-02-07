import { ReportItemSkeleton } from '@/components/ui/SkeletonLoader';
import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import { ChevronRight, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import ReportViewerModal from './ReportViewerModal';

type MonthlyReport = {
  id: string;
  month: string;
  notes: string;
  content: string;
  year: number;
  type?: 'monthly';
  isUpcoming?: boolean;
  releaseDate?: Date;
};

interface MonthlyReportsProps {
  userId: string;
  refresh?: number;
  filterMonth?: string;
  filterYear?: number | null;
  reference?: string | null;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateShort(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function getReleaseDate(month: string, year: number): Date {
  const monthIndex = MONTHS.indexOf(month);
  if (monthIndex === 11) {
    return new Date(year + 1, 0, 1);
  }
  return new Date(year, monthIndex + 1, 1);
}

function isReportAvailable(month: string, year: number): boolean {
  const releaseDate = getReleaseDate(month, year);
  const today = new Date();
  return today >= releaseDate;
}

async function logMonthlyReportOpen(user_id: string, r: any) {
  const { error: insertError } = await supabase
    .from('system_logs')
    .insert({
      source: user_id,
      action: 'opened_monthly_report',
      status: 'success',
      details: `Opened Report: ${r.month} ${r.year}`,
    });

  if (insertError) throw insertError;
}

export default function MonthlyReports({
  userId,
  refresh,
  filterMonth,
  filterYear,
  reference,
}: MonthlyReportsProps) {
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MonthlyReport | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchMonthlyReports = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .eq('type', 'monthly')
        .eq('month', filterMonth)
        .eq('year', filterYear)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching monthly reports:', error);
        setReports([]);
        return;
      }

      setReports(
        (data || []).map((r: any) => ({
          id: r.id,
          month: r.month,
          notes: r.notes || '',
          content: r.content || '',
          year: r.year || new Date().getFullYear(),
          type: 'monthly',
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
          notes: reportData.notes || '',
          content: reportData.content || '',
          year: reportData.year || new Date().getFullYear(),
          type: 'monthly',
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
    fetchMonthlyReports();
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
    const releaseDate = getReleaseDate(filterMonth, filterYear);

    return [{
      id: `placeholder-${filterMonth}-${filterYear}`,
      month: filterMonth,
      notes: '',
      content: '',
      year: filterYear,
      type: 'monthly' as const,
      isUpcoming,
      releaseDate,
    }];
  };

  const displayReports = getReportDisplay();

  const handleOpenReport = (report: MonthlyReport) => {
    setSelectedReport(report);
    setModalVisible(true);
    logMonthlyReportOpen(userId, report);
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
          No monthly reports for this period
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
                <FileText 
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
                    : 'Full month summary'
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
