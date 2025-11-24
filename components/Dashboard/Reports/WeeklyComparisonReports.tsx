import { supabase } from '@/utils/supabaseClient';
import { FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import ReportViewerModal from './ReportViewerModal';

type WeeklyComparisonReport = {
  id: string;
  week_number?: number | null;  // ✅ Made optional and nullable
  month: string;
  year: number;
  content: string;
  type?: 'weekly_comparison';
};

interface WeeklyComparisonReportsProps {
  userId: string;
  refresh?: number;
  filterMonth?: string;
  filterYear?: number | null;
}

function getMondaysInMonth(month: number, year: number): number[] {
  const mondays: number[] = [];
  const date = new Date(year, month, 1);

  // Move to first Monday
  while (date.getDay() !== 1) {
    date.setDate(date.getDate() + 1);
  }

  // Collect all Mondays
  while (date.getMonth() === month) {
    mondays.push(date.getDate());
    date.setDate(date.getDate() + 7);
  }

  return mondays;
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
  const [selectedReport, setSelectedReport] = useState<WeeklyComparisonReport | null>(null);
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
        .order('created_at', { ascending: false });  // ✅ Changed from week_number to created_at

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

  const handleOpenReport = (report: WeeklyComparisonReport) => {
    setSelectedReport(report);
    setModalVisible(true);
    logWeeklyComparisonReportOpen(userId, report).catch(err => {
      console.error('Failed to log report open:', err);
    });
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
        {filteredReports.length > 0 ? (
          filteredReports.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => handleOpenReport(r)}
              className="rounded-xl p-3 border border-zinc-800 bg-zinc-900/50 active:bg-zinc-800/50"
            >
              <View className="flex-row items-center gap-2">
                <FileText size={16} color="#c4ff85" />
                <Text className="text-white text-sm font-semibold">
                  Weekly Comparison - {r.month} {r.year}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text className="text-gray-400 text-xs text-center py-2">
            No weekly comparison reports for this month/year.
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