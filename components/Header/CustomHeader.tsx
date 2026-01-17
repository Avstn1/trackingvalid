// app/components/Header/CustomHeader.tsx

import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import CreditsModal from '@/components/Header/CreditsModal';
import FAQModal from '@/components/Header/FAQModal';
import NewFeaturesModal from '@/components/Header/FeatureUpdatesModal';
import NotificationsDropdown from '@/components/Header/NotificationsDropdown';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Bell, CalendarRange, Coins, HelpCircle, Megaphone, Menu, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DayPicker from './DayPicker';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_HEIGHT = SCREEN_HEIGHT * 0.5;

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
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

type Timeframe = 'year' | 'Q1' | 'Q2' | 'Q3' | 'Q4';

interface CustomHeaderProps {
  pageName: string;
  userId?: string;
  onRefresh?: () => void;
  onDateChange?: (month: string, year: number) => void;
  // Dashboard-specific props
  dashboardView?: 'monthly' | 'yearly';
  onDashboardViewChange?: (view: 'monthly' | 'yearly') => void;
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
  dashboardView = 'monthly',
  onDashboardViewChange,
  timeframe = 'year',
  onTimeframeChange,
  selectedDate,
  onDateSelect,
}: CustomHeaderProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const insets = useSafeAreaInsets();

  // Date picker state
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [localSelectedDate, setLocalSelectedDate] = useState(
    selectedDate || new Date(currentYear, currentMonthIndex, 1),
  );
  const [tempDate, setTempDate] = useState(
    selectedDate || new Date(currentYear, currentMonthIndex, 1),
  );
  const [tempDashboardView, setTempDashboardView] =
    useState(dashboardView);
  const [tempTimeframe, setTempTimeframe] = useState(timeframe);

  const [componentsReady, setComponentsReady] = useState(false);

  const [showSidebar, setShowSidebar] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);

  const translateY = useSharedValue(SIDEBAR_HEIGHT);
  const opacity = useSharedValue(0);

  // Check if this page should show the date picker
  const showsDatePicker = ['Dashboard', 'Finances', 'Reports'].includes(
    pageName,
  );
  const isDashboard = pageName === 'Dashboard';

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('No user session found.');

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
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

  // Check for new feature updates
  useEffect(() => {
    const checkForNewUpdates = async () => {
      if (!profile?.user_id) return;

      try {
        const { data: updates, error } = await supabase
          .from('feature_updates')
          .select('released_at')
          .in('platform', ['mobile', 'both'])
          .eq('is_published', true)
          .order('released_at', { ascending: false })
          .limit(1);

        if (error || !updates || updates.length === 0) return;

        const latestUpdateDate = new Date(updates[0].released_at);
        const lastReadDate = profile.last_read_feature_updates 
          ? new Date(profile.last_read_feature_updates) 
          : null;

        // Auto-open if there are new updates
        if (!lastReadDate || latestUpdateDate > lastReadDate) {
          setTimeout(() => {
            setShowFeaturesModal(true);
          }, 1000); // Delay to let app settle
        }
      } catch (error) {
        console.error('Error checking for new updates:', error);
      }
    };

    if (componentsReady && profile) {
      checkForNewUpdates();
    }
  }, [componentsReady, profile]);

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

  // Sidebar animation
  useEffect(() => {
    if (showSidebar) {
      translateY.value = withTiming(0, { duration: 280 });
      opacity.value = withTiming(1, { duration: 280 });
    }
  }, [showSidebar]);

  const closeSidebar = () => {
    if (isClosing) return;
    setIsClosing(true);
    translateY.value = withTiming(SIDEBAR_HEIGHT, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => {
      setShowSidebar(false);
      setIsClosing(false);
    }, 250);
  };

  const openSidebar = () => setShowSidebar(true);

  // Pan gesture for swipe to close
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        const progress = Math.min(event.translationY / 300, 1);
        opacity.value = 1 - progress;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(closeSidebar)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Handle back button from modals
  const handleCreditsBack = () => {
    setShowCreditsModal(false);
    setTimeout(() => setShowSidebar(true), 100);
  };

  const handleNotificationsBack = () => {
    setShowNotificationsModal(false);
    setTimeout(() => setShowSidebar(true), 100);
  };

  // Date picker handlers
  const handleDateChange = (_event: any, date?: Date) => {
    if (date) {
      const normalizedDate = new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        12,
        0,
        0,
        0
      );
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
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: COLORS.background }}
      >
        <ActivityIndicator size="large" color={COLORS.green} />
        <Text className="mt-4" style={{ color: COLORS.text }}>
          Loading header...
        </Text>
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
            <Text className="text-3xl font-bold">{pageName}</Text>
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
          {showsDatePicker && (
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
              <Text
                className="font-semibold text-xs"
                style={{ color: COLORS.text }}
              >
                {getDateLabel()}
              </Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity onPress={openSidebar}>
            <Menu size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sidebar Menu Modal */}
      <Modal
        visible={showSidebar}
        transparent={true}
        animationType="none"
        onRequestClose={closeSidebar}
        statusBarTranslucent
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, backdropStyle]}>
            <Pressable
              className="flex-1"
              style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
              onPress={closeSidebar}
            >
              <GestureDetector gesture={panGesture}>
                <Animated.View
                  style={[
                    animatedStyle,
                    {
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: SIDEBAR_HEIGHT,
                      backgroundColor: COLORS.surfaceSolid,
                      borderTopLeftRadius: 24,
                      borderTopRightRadius: 24,
                      borderTopWidth: 1,
                      borderLeftWidth: 1,
                      borderRightWidth: 1,
                      borderColor: COLORS.glassBorder,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: -4 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 10,
                      overflow: 'hidden',
                    },
                  ]}
                >
                  <Pressable onPress={(e) => e.stopPropagation()}>
                    {/* Drag Handle */}
                    <View className="items-center pt-3 pb-2">
                      <View
                        style={{
                          width: 40,
                          height: 4,
                          backgroundColor: COLORS.textMuted,
                          borderRadius: 2,
                        }}
                      />
                    </View>

                    {/* Sidebar Header */}
                    <View
                      className="flex-row items-center justify-between px-5 pb-4 pt-2"
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.glassBorder,
                      }}
                    >
                      <Text className="text-xl font-bold" style={{ color: COLORS.text }}>
                        Menu
                      </Text>
                      <TouchableOpacity onPress={closeSidebar} className="p-1">
                        <X size={24} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {/* Menu Items */}
                    <View className="mt-4">
                      {/* Feature Updates - First */}
                      <TouchableOpacity
                        onPress={() => {
                          closeSidebar();
                          setTimeout(() => setShowFeaturesModal(true), 300);
                        }}
                        className="flex-row items-center px-5 py-4"
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.glassBorder,
                        }}
                      >
                        <View
                          className="p-2 rounded-full mr-4"
                          style={{ backgroundColor: COLORS.surface }}
                        >
                          <Megaphone size={20} color={COLORS.green} />
                        </View>
                        <Text className="text-base font-medium" style={{ color: COLORS.text }}>
                          Feature Updates
                        </Text>
                      </TouchableOpacity>

                      {/* Credits Manager */}
                      <TouchableOpacity
                        onPress={() => {
                          closeSidebar();
                          setTimeout(() => setShowCreditsModal(true), 300);
                        }}
                        className="flex-row items-center px-5 py-4"
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.glassBorder,
                        }}
                      >
                        <View
                          className="p-2 rounded-full mr-4"
                          style={{ backgroundColor: COLORS.surface }}
                        >
                          <Coins size={20} color={COLORS.green} />
                        </View>
                        <Text className="text-base font-medium" style={{ color: COLORS.text }}>
                          Credits Manager
                        </Text>
                      </TouchableOpacity>

                      {/* Notifications */}
                      <TouchableOpacity
                        onPress={() => {
                          closeSidebar();
                          setTimeout(() => setShowNotificationsModal(true), 300);
                        }}
                        className="flex-row items-center px-5 py-4"
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.glassBorder,
                        }}
                      >
                        <View
                          className="p-2 rounded-full mr-4"
                          style={{ backgroundColor: COLORS.surface }}
                        >
                          <Bell size={20} color={COLORS.green} />
                        </View>
                        <Text className="text-base font-medium" style={{ color: COLORS.text }}>
                          Notifications
                        </Text>
                      </TouchableOpacity>

                      {/* FAQ Modal */}
                      <TouchableOpacity
                        onPress={() => {
                          closeSidebar();
                          setTimeout(() => setShowFAQModal(true), 300);
                        }}
                        className="flex-row items-center px-5 py-4"
                        style={{
                          borderBottomWidth: 1,
                          borderBottomColor: COLORS.glassBorder,
                        }}
                      >
                        <View
                          className="p-2 rounded-full mr-4"
                          style={{ backgroundColor: COLORS.surface }}
                        >
                          <HelpCircle size={20} color={COLORS.green} />
                        </View>
                        <Text className="text-base font-medium" style={{ color: COLORS.text }}>
                          Frequently Asked Questions
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Pressable>
                </Animated.View>
              </GestureDetector>
            </Pressable>
          </Animated.View>
        </GestureHandlerRootView>
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

      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
        onBack={handleCreditsBack}
      />

      <NewFeaturesModal
        isOpen={showFeaturesModal}
        onClose={() => setShowFeaturesModal(false)}
        userId={profile?.user_id}
      />

      <FAQModal 
        isOpen={showFAQModal} 
        onClose={() => setShowFAQModal(false)}
      />

      {/* NotificationsDropdown with external trigger - bell hidden but modal works */}
      {profile?.user_id && (
        <View style={{ position: 'absolute', left: -9999, top: -9999 }} pointerEvents="box-none">
          <NotificationsDropdown 
            userId={profile.user_id}
            externalTrigger={showNotificationsModal}
            onExternalTriggerHandled={() => setShowNotificationsModal(false)}
            onBack={handleNotificationsBack}
          />
        </View>
      )}
    </View>
  );
}