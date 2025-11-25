import { supabase } from '@/utils/supabaseClient';
import { ChevronRight, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
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
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// Format date as "Month DD, YYYY"
function formatDate(date: Date): string {
  const months = ["January", "February", "March", "April", "May", "June", 
                  "July", "August", "September", "October", "November", "December"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

// Get release date for a monthly report (1st of next month)
function getReleaseDate(month: string, year: number): Date {
  const monthIndex = MONTHS.indexOf(month);
  
  // If it's December, next month is January of next year
  if (monthIndex === 11) {
    return new Date(year + 1, 0, 1);
  }
  
  // Otherwise, 1st of next month
  return new Date(year, monthIndex + 1, 1);
}

// Check if report should be available (current date is past release date)
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

  // Generate report or placeholder
  const getReportDisplay = () => {
    if (!filterMonth || !filterYear) {
      return filteredReports;
    }

    // Check if report exists for this month/year
    const existingReport = filteredReports.find(
      r => r.month === filterMonth && r.year === filterYear
    );

    if (existingReport) {
      return [existingReport];
    }

    // Create placeholder if report doesn't exist yet
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

  if (loading) {
    return (
      <View className="items-center justify-center py-4">
        <ActivityIndicator size="small" color="#c4ff85" />
      </View>
    );
  }

  return (
    <>
      <View className="gap-2">
        {displayReports.length > 0 ? (
          displayReports.map((r) => {
            const isUpcoming = r.isUpcoming;
            
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => !isUpcoming && handleOpenReport(r)}
                disabled={isUpcoming}
                className={`rounded-xl p-4 mb-2 ${
                  isUpcoming 
                    ? 'bg-zinc-800/40 opacity-60' 
                    : 'bg-zinc-800 active:bg-lime-500/20'
                }`}
                style={!isUpcoming ? { elevation: 4 } : {}}
              >
                <View className="flex-row items-center gap-3 min-h-[40px]">
                  <View className={`p-2 rounded-lg ${
                    isUpcoming ? 'bg-zinc-700/50' : 'bg-lime-500/20'
                  }`}>
                    <FileText 
                      size={20} 
                      color={isUpcoming ? "#71717a" : "#c4ff85"} 
                      strokeWidth={2.5} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text className={`text-base font-bold ${
                      isUpcoming ? 'text-zinc-400' : 'text-white'
                    }`}>
                      {r.month} {r.year}
                    </Text>
                    <Text className={`text-xs mt-0.5 ${
                      isUpcoming ? 'text-zinc-500' : 'text-lime-400/70'
                    }`}>
                      {isUpcoming 
                        ? `Releasing on ${formatDate(r.releaseDate!)}`
                        : 'Tap to view report'
                      }
                    </Text>
                  </View>
                  {!isUpcoming && <ChevronRight size={18} color="#c4ff85" />}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text className="text-gray-400 text-xs text-center py-2">
            No monthly reports for this month/year.
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