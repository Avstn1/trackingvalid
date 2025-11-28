import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import DailyTipsDropdown from '@/components/Header/DailyTipsDropdown';
import NotificationsDropdown from '@/components/Header/NotificationsDropdown';
import SettingsPage from '@/components/Profile/Settings/Settings';
import { supabase } from "@/utils/supabaseClient";
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarRange, Settings } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DayPicker from './DayPicker';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
  greenLight: '#beb348ff',
  yellow: '#FFEB3B',
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

const timeframeOptions = [
  { label: 'Year', value: 'year' },
  { label: 'Q1 (Jan-Mar)', value: 'Q1' },
  { label: 'Q2 (Apr-Jun)', value: 'Q2' },
  { label: 'Q3 (Jul-Sep)', value: 'Q3' },
  { label: 'Q4 (Oct-Dec)', value: 'Q4' },
];

interface CustomHeaderProps {
  pageName: string;
  userId?: string;
  onRefresh?: () => void;
  onDateChange?: (month: string, year: number) => void;
  // Dashboard-specific props
  dashboardView?: "monthly" | "yearly";
  onDashboardViewChange?: (view: "monthly" | "yearly") => void;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
}

export function CustomHeader({ 
  pageName, 
  userId, 
  onRefresh, 
  onDateChange,
  dashboardView = "monthly",
  onDashboardViewChange,
  timeframe = 'year',
  onTimeframeChange,
  selectedDate,
  onDateSelect,
}: CustomHeaderProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const insets = useSafeAreaInsets();

  // Date picker state
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [localSelectedDate, setLocalSelectedDate] = useState(selectedDate || new Date(currentYear, currentMonthIndex, 1));
  const [tempDate, setTempDate] = useState(selectedDate || new Date(currentYear, currentMonthIndex, 1));
  const [tempDashboardView, setTempDashboardView] = useState(dashboardView);
  const [tempTimeframe, setTempTimeframe] = useState(timeframe);

  const [componentsReady, setComponentsReady] = useState(false);

  // Check if this page should show the date picker
  const showsDatePicker = ['Dashboard', 'Finances', 'Reports'].includes(pageName);
  const isDashboard = pageName === 'Dashboard';

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("No user session found.");

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, []);

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setComponentsReady(true);
      });
    });
  }, []);

  // Update local state when props change
  useEffect(() => {
    if (selectedDate) {
      setLocalSelectedDate(selectedDate);
      setTempDate(selectedDate);
    }
  }, [selectedDate]);

  useEffect(() => {
    setTempDashboardView(dashboardView);
  }, [dashboardView]);

  useEffect(() => {
    setTempTimeframe(timeframe);
  }, [timeframe]);

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  // Date picker handlers
  const handleDateChange = (event: any, date?: Date) => {
    if (date) {
      const normalizedDate = new Date(date.getFullYear(), date.getMonth(), 1);
      setTempDate(normalizedDate);
    }
  };

  const handleDateConfirm = () => {
    if (isDashboard) {
      // Dashboard mode
      if (onDashboardViewChange) {
        onDashboardViewChange(tempDashboardView);
      }
      if (onTimeframeChange) {
        onTimeframeChange(tempTimeframe);
      }
      if (onDateSelect) {
        onDateSelect(tempDate);
      }
      setLocalSelectedDate(tempDate);
      setShowDatePicker(false);
    } else {
      // Finances/Reports mode
      setLocalSelectedDate(tempDate);
      const month = MONTHS[tempDate.getMonth()];
      const year = tempDate.getFullYear();
      setShowDatePicker(false);
      
      if (onDateChange) {
        onDateChange(month, year);
      }
    }
  };

  const handleDateCancel = () => {
    setTempDate(localSelectedDate);
    setTempDashboardView(dashboardView);
    setTempTimeframe(timeframe);
    setShowDatePicker(false);
  };

  const handleOpenDatePicker = () => {
    setTempDate(localSelectedDate);
    setTempDashboardView(dashboardView);
    setTempTimeframe(timeframe);
    setShowDatePicker(true);
  };

  const getDateLabel = () => {
    return `${MONTHS[localSelectedDate.getMonth()]} ${localSelectedDate.getFullYear()}`;
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text className="mt-4" style={{ color: COLORS.text }}>Loading header...</Text>
      </View>
    );
  }

  if (!componentsReady) {
    return <AuthLoadingSplash message="Loading dashboard data..." />;
  }

  return (
    <View 
      style={{ 
        paddingTop: insets.top - 45,
        paddingBottom: 16,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glassBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      {/* Top highlight line for glass effect */}
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

      <View className="px-5 flex-row items-center justify-between">
        <MaskedView
          className="flex-1"
          maskElement={
            <Text className="text-3xl font-bold">
              {pageName}
            </Text>
          }
        >
          <LinearGradient
            colors={['#8bcf68ff', '#beb348ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text className="text-3xl font-bold opacity-0">
              {pageName}
            </Text>
          </LinearGradient>
        </MaskedView>
        
        <View className="flex-row items-center gap-3">
          {pageName === "Profile" ? (
            <TouchableOpacity onPress={() => setShowSettings(true)}>
              <Settings size={24} color={COLORS.green} />
            </TouchableOpacity>
          ) : showsDatePicker ? (
            <>
              <TouchableOpacity
                onPress={handleOpenDatePicker}
                className="flex-row items-center gap-2 px-3 py-3 rounded-full"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <CalendarRange size={16} color={COLORS.green} />
                <Text className="font-semibold text-xs" style={{ color: COLORS.text }}>
                  {getDateLabel()}
                </Text>
              </TouchableOpacity>
              <DailyTipsDropdown barberId={profile.user_id} onRefresh={onRefresh} />
              <NotificationsDropdown userId={profile.user_id} />
            </>
          ) : (
            <>
              <DailyTipsDropdown barberId={profile.user_id} onRefresh={onRefresh} />
              <NotificationsDropdown userId={profile.user_id} />
            </>
          )}
        </View>
      </View>

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        transparent={true}
        onRequestClose={handleCloseSettings}
      >
        <SettingsPage onClose={handleCloseSettings} />
      </Modal>

      {showsDatePicker && (
        <DayPicker
          visible={showDatePicker}
          onClose={handleDateCancel}
          onConfirm={handleDateConfirm}
          isDashboard={isDashboard}
          dashboardView={tempDashboardView}
          onDashboardViewChange={setTempDashboardView}
          timeframe={tempTimeframe}
          onTimeframeChange={setTempTimeframe}
          tempDate={tempDate}
          onDateChange={handleDateChange}
        />
      )}
    </View>
  );
}