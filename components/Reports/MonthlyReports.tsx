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
};

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

function formatDate(date: Date): string {
  const months = ["January", "February", "March", "April", "May", "June", 
                  "July", "August", "September", "October", "November", "December"];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
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

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator size="small" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <>
      <View className="flex-1 justify-center">
        {displayReports.length > 0 ? (
          displayReports.map((r) => {
            const isUpcoming = r.isUpcoming;
            
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => !isUpcoming && handleOpenReport(r)}
                disabled={isUpcoming}
                className="flex-1 rounded-xl px-4 justify-center overflow-hidden"
                style={[
                  {
                    backgroundColor: isUpcoming ? 'rgba(37, 37, 37, 0.3)' : COLORS.cardBg,
                    borderWidth: 1,
                    borderColor: isUpcoming ? 'rgba(255, 255, 255, 0.05)' : COLORS.glassBorder,
                    opacity: isUpcoming ? 0.6 : 1,
                  },
                  !isUpcoming && {
                    shadowColor: COLORS.orange,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.12,
                    shadowRadius: 10,
                    elevation: 5,
                  }
                ]}
              >
                <View className="flex-row items-center gap-3">
                  <View 
                    className="p-2 rounded-lg"
                    style={{
                      backgroundColor: isUpcoming ? 'rgba(255, 255, 255, 0.05)' : COLORS.orangeGlow,
                    }}
                  >
                    <FileText 
                      size={20} 
                      color={isUpcoming ? COLORS.textMuted : COLORS.orange} 
                      strokeWidth={2.5} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text 
                      className="text-sm font-bold"
                      style={{ color: isUpcoming ? COLORS.textMuted : COLORS.text }}
                      numberOfLines={1}
                    >
                      Monthly Report - {r.month} {r.year}
                    </Text>
                    <Text 
                      className="text-xs mt-1"
                      style={{ color: isUpcoming ? 'rgba(247, 247, 247, 0.3)' : COLORS.orange }}
                      numberOfLines={1}
                    >
                      {isUpcoming 
                        ? `Releasing ${formatDate(r.releaseDate!)}`
                        : 'Tap to view report'
                      }
                    </Text>
                  </View>
                  {!isUpcoming && <ChevronRight size={20} color={COLORS.orange} />}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <View className="flex-1 justify-center items-center">
            <View 
              className="p-3 rounded-lg mb-2"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
            >
              <FileText size={24} color={COLORS.textMuted} strokeWidth={1.5} />
            </View>
            <Text className="text-sm text-center" style={{ color: COLORS.textMuted }}>
              No monthly reports available
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