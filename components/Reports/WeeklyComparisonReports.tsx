import { supabase } from '@/utils/supabaseClient';
import { ChevronRight, FileText } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import ReportViewerModal from './ReportViewerModal';

// Color Palette
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.2)',
  green: '#8bcf68ff',
  greenLight: '#beb348ff',
  greenGlow: 'rgba(139, 207, 104, 0.2)',
};

type WeeklyComparisonReport = {
  id: string;
  week_number?: number | null;
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
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="small" color={COLORS.green} />
      </View>
    );
  }

  return (
    <>
      <View className="flex-1 gap-2">
        {filteredReports.length > 0 ? (
          filteredReports.map((r) => (
            <TouchableOpacity
              key={r.id}
              onPress={() => handleOpenReport(r)}
              className="flex-1 rounded-2xl p-4 overflow-hidden"
              style={{
                backgroundColor: COLORS.cardBg,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                shadowColor: COLORS.green,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.15,
                shadowRadius: 8,
                elevation: 4,
              }}
            >
              {/* Top highlight line */}
              <View 
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 1,
                  backgroundColor: COLORS.glassHighlight,
                }}
              />

              <View className="flex-row items-center gap-3 h-full">
                <View 
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: COLORS.greenGlow }}
                >
                  <FileText size={22} color={COLORS.green} strokeWidth={2.5} />
                </View>
                <View className="flex-1">
                  <Text 
                    className="text-base font-bold mb-1" 
                    style={{ color: COLORS.text }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.8}
                  > 
                    Weekly Comparison - {r.month} {r.year}
                  </Text>
                  <Text 
                    className="text-sm" 
                    style={{ color: COLORS.green }}
                    numberOfLines={1}
                  >
                    Tap to view report
                  </Text>
                </View>
                <ChevronRight size={20} color={COLORS.green} />
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View className="flex-1 justify-center items-center">
            <View 
              className="p-3 rounded-xl mb-3"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <FileText size={32} color={COLORS.textMuted} strokeWidth={1.5} />
            </View>
            <Text className="text-sm text-center" style={{ color: COLORS.textMuted }}>
              No comparison reports available
            </Text>
          </View>
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