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
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.2)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
  green: '#8bcf68ff',
  greenLight: '#beb348ff',
  greenGlow: 'rgba(139, 207, 104, 0.2)',
};

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
        // Only mark as not upcoming if the week has actually passed
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

  if (loading) {
    return (
      <View className="items-center justify-center py-4">
        <ActivityIndicator size="small" color={COLORS.green} />
      </View>
    );
  }

  return (
    <>
      <View className="flex-1 gap-2">
        {weeksList.length > 0 ? (
          weeksList.map((r: any) => {
            const isUpcoming = r.isUpcoming;
            
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => !isUpcoming && handleOpenReport(r)}
                disabled={isUpcoming}
                className="rounded-2xl p-4 overflow-hidden flex-1"
                style={[
                  {
                    backgroundColor: isUpcoming ? 'rgba(37, 37, 37, 0.3)' : COLORS.cardBg,
                    borderWidth: 1,
                    borderColor: isUpcoming ? 'rgba(255, 255, 255, 0.05)' : COLORS.glassBorder,
                    opacity: isUpcoming ? 0.5 : 1,
                  },
                  !isUpcoming && {
                    shadowColor: COLORS.green,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                    elevation: 4,
                  }
                ]}
              >
                {/* Top highlight line */}
                <View 
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 1,
                    backgroundColor: isUpcoming ? 'transparent' : COLORS.glassHighlight,
                  }}
                />

                <View className="flex-row items-center gap-3 h-full">
                  <View 
                    className="p-2 rounded-xl"
                    style={{
                      backgroundColor: isUpcoming ? 'rgba(255, 255, 255, 0.05)' : COLORS.greenGlow,
                    }}
                  >
                    <FileText 
                      size={22} 
                      color={isUpcoming ? COLORS.textMuted : COLORS.green} 
                      strokeWidth={2.5} 
                    />
                  </View>
                  <View className="flex-1">
                    <Text 
                      className="text-base font-bold mb-1"
                      style={{ color: isUpcoming ? COLORS.textMuted : COLORS.text }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      Week {r.week_number} - {r.month} {r.year}
                    </Text>
                    <Text 
                      className="text-sm"
                      style={{ color: isUpcoming ? 'rgba(247, 247, 247, 0.3)' : COLORS.green }}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.8}
                    >
                      {isUpcoming 
                        ? `Releasing on ${formatDate(r.releaseDate)}`
                        : 'Tap to view report'
                      }
                    </Text>
                  </View>
                  {!isUpcoming && <ChevronRight size={20} color={COLORS.green} />}
                </View>
              </TouchableOpacity>
            );
          })
        ) : (
          <Text className="text-xs text-center py-2" style={{ color: COLORS.textMuted }}>
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