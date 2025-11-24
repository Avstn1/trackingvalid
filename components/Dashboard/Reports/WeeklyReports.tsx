import { supabase } from '@/utils/supabaseClient';
import { FileText } from 'lucide-react-native';
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
                  Week {r.week_number} - {r.month} {r.year}
                </Text>
              </View>
            </TouchableOpacity>
          ))
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