// app/components/Header/CustomHeader.tsx

import { COLORS } from '@/constants/design-system';
import AuthLoadingSplash from '@/components/AuthLoadingSpash';
import CreditsModal from '@/components/Header/CreditsModal';
import FAQModal from '@/components/Header/FAQModal';
import NewFeaturesModal from '@/components/Header/FeatureUpdatesModal';
import NotificationsDropdown from '@/components/Header/NotificationsDropdown';
import ProfileDrawer from '@/components/Navigation/ProfileDrawer';
import { supabase } from '@/utils/supabaseClient';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { CalendarRange } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DayPicker from './DayPicker';

// Get initials from name for avatar fallback
function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');



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

interface Notification {
  id: string;
  header: string;
  message: string;
  is_read: boolean;
  created_at: string;
  reference?: string;
  reference_type?: string;
}

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
  const [tempDashboardView, setTempDashboardView] = useState(dashboardView);
  const [tempTimeframe, setTempTimeframe] = useState(timeframe);

  const [componentsReady, setComponentsReady] = useState(false);

  // Modal states
  const [showSidebar, setShowSidebar] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);
  const [showFeaturesModal, setShowFeaturesModal] = useState(false);
  const [showFAQModal, setShowFAQModal] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(true);

  // Feature updates state
  const [hasNewFeatures, setHasNewFeatures] = useState(false);
  const hasAutoOpenedFeaturesRef = React.useRef(false);

  // Check if this page should show the date picker
  const showsDatePicker = ['Dashboard', 'Finances', 'Reports'].includes(pageName);
  const isDashboard = pageName === 'Dashboard';

  // Fetch user and profile
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
        // Add email from auth user to profile data
        setProfile({ ...profileData, email: user.email });
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

  // Fetch notifications
  const fetchNotifications = useCallback(async (page: number = 1) => {
    if (!profile?.user_id) return;

    try {
      const limit = 50;
      const from = (page - 1) * limit;
      const to = from + limit - 1;

      const { data, error, count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact' })
        .eq('user_id', profile.user_id)
        .eq('show', true)
        .order('timestamp', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Failed to fetch notifications:', error);
        return;
      }

      const mapped = (data || []).map(item => ({
        id: item.id,
        header: item.header,
        message: item.message,
        is_read: item.read === true,
        created_at: item.timestamp,
        reference: item.reference,
        reference_type: item.reference_type,
      }));

      if (page === 1) {
        setNotifications(mapped);
      } else {
        setNotifications(prev => [...prev, ...mapped]);
      }

      setHasMoreNotifications(data && data.length === limit);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    }
  }, [profile?.user_id]);

  // Check for new features
  const checkForNewFeatures = useCallback(async () => {
    if (!profile?.user_id) return;

    try {
      const { data: updates, error } = await supabase
        .from('feature_updates')
        .select('released_at')
        .in('platform', ['mobile', 'both'])
        .eq('is_published', true)
        .order('released_at', { ascending: false })
        .limit(1);

      if (error || !updates || updates.length === 0) {
        setHasNewFeatures(false);
        return;
      }

      const latestUpdateDate = new Date(updates[0].released_at);
      const lastReadDate = profile.last_read_feature_updates
        ? new Date(profile.last_read_feature_updates)
        : null;

      setHasNewFeatures(!lastReadDate || latestUpdateDate > lastReadDate);
    } catch (error) {
      console.error('Error checking for new features:', error);
      setHasNewFeatures(false);
    }
  }, [profile]);

  // Initial fetch
  useEffect(() => {
    if (componentsReady && profile) {
      fetchNotifications(1);
      checkForNewFeatures();
    }
  }, [componentsReady, profile, fetchNotifications, checkForNewFeatures]);

  // Real-time notifications subscription
  useEffect(() => {
    if (!profile?.user_id) return;

    // console.log('🔔 Setting up notifications real-time subscription for user:', profile.user_id);

    const channel = supabase
      .channel(`notifications-${profile.user_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.user_id}`,
        },
        (payload) => {
          // console.log('📬 INSERT event received:', payload);
          const newN = payload.new as any;

          const formatted: Notification = {
            id: newN.id,
            header: newN.header,
            message: newN.message,
            is_read: newN.read === true,
            created_at: newN.timestamp,
            reference: newN.reference,
            reference_type: newN.reference_type,
          };

          setNotifications((prev) => {
            // console.log('📬 Adding notification to state. Total:', prev.length + 1);
            return [formatted, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${profile.user_id}`,
        },
        (payload) => {
          // console.log('✏️ UPDATE event received:', payload);
          // console.log('✏️ Old values:', payload.old);
          // console.log('✏️ New values:', payload.new);
          const updated = payload.new as any;
          setNotifications((prev) => {
            const newNotifs = prev.map((n) =>
              n.id === updated.id
                ? { ...n, is_read: updated.read === true }
                : n
            );
            // console.log('✏️ Updated notification in state:', updated.id);
            return newNotifs;
          });
        }
      )
      .subscribe((status, err) => {
        // console.log('🔔 Notifications subscription status:', status);
        if (err) {
          console.error('🔔 Notifications subscription error:', err);
        }
      });

    return () => {
      // console.log('🔕 Notifications real-time subscription cleaned up');
      supabase.removeChannel(channel);
    };
  }, [profile?.user_id]);

  // Real-time feature updates subscription
  useEffect(() => {
    if (!profile?.user_id) return;

    const channel = supabase
      .channel('feature-updates-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'feature_updates',
        },
        (payload) => {
          // console.log('🎉 New feature update received:', payload.new);
          const newFeature = payload.new as any;
          
          // Check if it's relevant for mobile
          if (!['mobile', 'both'].includes(newFeature.platform)) {
            // console.log('⏭️ Feature update skipped - not for mobile platform:', newFeature.platform);
            return;
          }
          if (!newFeature.is_published) {
            // console.log('⏭️ Feature update skipped - not published');
            return;
          }

          const lastReadDate = profile.last_read_feature_updates
            ? new Date(profile.last_read_feature_updates)
            : null;
          const featureDate = new Date(newFeature.released_at);

          // console.log('📅 Comparing dates - Last read:', lastReadDate, 'Feature released:', featureDate);

          if (!lastReadDate || featureDate > lastReadDate) {
            // console.log('✨ Setting hasNewFeatures to TRUE');
            setHasNewFeatures(true);
          } else {
            // console.log('⏭️ Feature update skipped - already read');
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'feature_updates',
        },
        (payload) => {
          // console.log('✏️ Feature update modified:', payload.new);
          
          // Re-check if new features exist
          checkForNewFeatures();
        }
      )
      .subscribe();

    // console.log('🎯 Feature updates real-time subscription started');

    return () => {
      // console.log('🎯 Feature updates real-time subscription cleaned up');
      supabase.removeChannel(channel);
    };
  }, [profile, checkForNewFeatures]);

  // Auto-open features modal on new updates (only once per app load)
  useEffect(() => {
    if (componentsReady && profile && hasNewFeatures && !hasAutoOpenedFeaturesRef.current) {
      setTimeout(() => {
        setShowFeaturesModal(true);
        hasAutoOpenedFeaturesRef.current = true;
      }, 1000);
    }
  }, [componentsReady, profile, hasNewFeatures]);

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

  // Load more notifications
  const handleLoadMoreNotifications = useCallback(() => {
    if (hasMoreNotifications) {
      const nextPage = notificationsPage + 1;
      setNotificationsPage(nextPage);
      fetchNotifications(nextPage);
    }
  }, [hasMoreNotifications, notificationsPage, fetchNotifications]);

  // Handle notification updates
  const handleNotificationUpdate = useCallback((updatedNotifications: Notification[]) => {
    setNotifications(updatedNotifications);
  }, []);

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

  const unreadNotificationsCount = notifications.filter((n) => !n.is_read).length;
  const showHamburgerBadge = unreadNotificationsCount > 0 || hasNewFeatures;

  if (loading) {
    return (
      <View
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: COLORS.background }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text className="mt-4" style={{ color: COLORS.textPrimary }}>
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
        paddingTop: 8,
        paddingBottom: 12,
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
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <CalendarRange size={18} color={COLORS.primary} />
              <Text
                className="font-semibold text-sm"
                style={{ color: COLORS.textPrimary }}
              >
                {getDateLabel()}
              </Text>
            </TouchableOpacity>
          )}
          
          {/* Profile Avatar Button */}
          <TouchableOpacity 
            onPress={() => setShowSidebar(true)}
            className="relative"
          >
            <View
              className="w-9 h-9 rounded-full items-center justify-center"
              style={{
                backgroundColor: COLORS.primaryMuted,
                borderWidth: 1.5,
                borderColor: COLORS.primary,
              }}
            >
              {profile?.avatar_url ? (
                <Image
                  source={{ uri: profile.avatar_url }}
                  className="w-full h-full rounded-full"
                />
              ) : (
                <Text
                  className="text-sm font-bold"
                  style={{ color: COLORS.primary }}
                >
                  {getInitials(profile?.full_name)}
                </Text>
              )}
            </View>
            {showHamburgerBadge && (
              <View
                className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                style={{ 
                  backgroundColor: COLORS.negative,
                  borderColor: COLORS.surface,
                }}
              />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Profile Drawer */}
      <ProfileDrawer
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        profile={{
          user_id: profile?.user_id,
          full_name: profile?.full_name,
          email: profile?.email,
          avatar_url: profile?.avatar_url,
        }}
        onCreditsPress={() => setShowCreditsModal(true)}
        onNotificationsPress={() => setShowNotificationsModal(true)}
        onFeaturesPress={() => setShowFeaturesModal(true)}
        onFAQPress={() => setShowFAQModal(true)}
        hasNewFeatures={hasNewFeatures}
        unreadNotificationsCount={unreadNotificationsCount}
      />

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
        onBack={() => {
          setShowCreditsModal(false);
          setTimeout(() => setShowSidebar(true), 100);
        }}
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

      {/* NotificationsDropdown - rendered off-screen but accessible */}
      {profile?.user_id && (
        <View style={{ position: 'absolute', left: -9999, top: -9999 }} pointerEvents="box-none">
          <NotificationsDropdown 
            userId={profile.user_id}
            externalTrigger={showNotificationsModal}
            onExternalTriggerHandled={() => setShowNotificationsModal(false)}
            onBack={() => {
              setShowNotificationsModal(false);
              setTimeout(() => setShowSidebar(true), 100);
            }}
            initialNotifications={notifications}
            onNotificationsUpdate={handleNotificationUpdate}
            hasMoreNotifications={hasMoreNotifications}
            onLoadMore={handleLoadMoreNotifications}
          />
        </View>
      )}
    </View>
  );
}
