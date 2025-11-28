import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import DailyTipsDropdown from '@/components/Header/DailyTipsDropdown';
import NotificationsDropdown from '@/components/Header/NotificationsDropdown';
import SettingsPage from '@/components/Profile/Settings/Settings';
import { supabase } from "@/utils/supabaseClient";
import DateTimePicker from '@react-native-community/datetimepicker';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarRange, Settings } from 'lucide-react-native';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  green: '#54d33dff',
  greenLight: '#5b8f52ff',
  yellow: '#FFEB3B',
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface CustomHeaderProps {
  pageName: string;
  userId?: string;
  onRefresh?: () => void;
  onDateChange?: (month: string, year: number) => void;
}

export function CustomHeader({ pageName, userId, onRefresh, onDateChange }: CustomHeaderProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const insets = useSafeAreaInsets();

  // Date picker state
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  const [tempDate, setTempDate] = useState(new Date(currentYear, currentMonthIndex, 1));

  const [componentsReady, setComponentsReady] = useState(false);

  // Check if this page should show the date picker
  const showsDatePicker = ['Dashboard', 'Finances', 'Reports'].includes(pageName);

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
    setSelectedDate(tempDate);
    const month = MONTHS[tempDate.getMonth()];
    const year = tempDate.getFullYear();
    setShowDatePicker(false);
    
    // Notify parent component
    if (onDateChange) {
      onDateChange(month, year);
    }
  };

  const handleDateCancel = () => {
    setTempDate(selectedDate);
    setShowDatePicker(false);
  };

  const handleOpenDatePicker = () => {
    setTempDate(selectedDate);
    setShowDatePicker(true);
  };

  const getDateLabel = () => {
    return `${MONTHS[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`;
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
                className="flex-row items-center gap-2 px-3 py-2 rounded-full"
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

      {/* Date Picker Modal */}
      {showsDatePicker && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="fade"
          onRequestClose={handleDateCancel}
        >
          <View className="flex-1 justify-center items-center bg-black/70">
            <View 
              className="rounded-3xl p-6 overflow-hidden"
              style={{ 
                width: SCREEN_WIDTH * 0.9,
                maxWidth: 400,
                backgroundColor: 'rgba(37, 37, 37, 0.95)',
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
                Choose Month & Year
              </Text>

              <View 
                className="rounded-2xl overflow-hidden"
                style={{ 
                  backgroundColor: COLORS.cardBg,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <DateTimePicker
                  value={tempDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date(2020, 0, 1)}
                  maximumDate={new Date()}
                  textColor={COLORS.text}
                  themeVariant="dark"
                />
              </View>

              <Text className="text-xs text-center mt-3" style={{ color: COLORS.textMuted }}>
                Day will be set to 1st of selected month
              </Text>

              <View className="flex-row gap-3 mt-6">
                <TouchableOpacity
                  onPress={handleDateCancel}
                  className="flex-1 py-3 rounded-full"
                  style={{ 
                    backgroundColor: COLORS.cardBg,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDateConfirm}
                  className="flex-1 py-3 rounded-full"
                  style={{ 
                    backgroundColor: COLORS.green,
                    elevation: 5,
                  }}
                >
                  <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}