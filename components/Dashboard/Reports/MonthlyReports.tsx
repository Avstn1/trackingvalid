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
};

interface MonthlyReportsProps {
  userId: string;
  refresh?: number;
  filterMonth?: string;
  filterYear?: number | null;
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
        {filteredReports.length > 0 ? (
          filteredReports.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => handleOpenReport(r)}
              className="rounded-xl p-4 bg-zinc-800 active:bg-lime-500/20 mb-2"
              style={{
                elevation: 4,
              }}
            >
              <View className="flex-row items-center gap-3">
                <View className="bg-lime-500/20 p-2 rounded-lg">
                  <FileText size={20} color="#c4ff85" strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text className="text-white text-base font-bold">
                    {r.month} {r.year}
                  </Text>
                  <Text className="text-lime-400/70 text-xs mt-0.5">
                    Tap to view report
                  </Text>
                </View>
                <ChevronRight size={18} color="#c4ff85" />
              </View>
            </TouchableOpacity>
          ))
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