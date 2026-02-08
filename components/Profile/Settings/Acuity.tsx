// components/Settings/AcuityTab.tsx
import { COLORS } from '@/constants/design-system';
import { getFadeInDown, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';
import ConnectAcuityButton from './ConnectAcuityButton';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AcuityTab() {
  const reduceMotion = useReducedMotionPreference();
  const [profile, setProfile] = useState<any>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [tempCalendar, setTempCalendar] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [syncingClients, setSyncingClients] = useState(false);
  const [syncingAppointments, setSyncingAppointments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(false);
  
  // Modal states
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [showYearModal, setShowYearModal] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setCalendarError(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      setProfile(profileData);
      setSelectedCalendar(profileData?.calendar || '');

      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';

      if (!accessToken) {
        console.warn('No access token found in Supabase session');
        setCalendarError(true);
        setIsConnected(false);
        return;
      }

      try {
        // Check connection status
        const statusRes = await fetch(`${API_BASE_URL}/api/acuity/status`, {
          headers: {
            'x-client-access-token': accessToken,
          },
        });
        const statusData = await statusRes.json();
        setIsConnected(statusData.connected || false);

        // Fetch calendars if connected
        const res = await fetch(`${API_BASE_URL}/api/acuity/calendar`, {
          headers: {
            'x-client-access-token': accessToken,
          },
        });

        const data = await res.json();

        if (res.ok) {
          console.log("Res is okay. Calendars: " + JSON.stringify(data.calendars))
          setCalendars(data.calendars || []);
        } else {
          console.warn('Could not fetch calendars - API may not be available');
          setCalendarError(true);
        }
      } catch (apiError) {
        console.warn('Calendar API not available:', apiError);
        setCalendarError(true);
        setIsConnected(false);
      }
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const saveCalendar = async (calendarName: string) => {
    if (!profile) return;
    if (!calendarName) {
      Alert.alert('Error', 'Please choose a calendar');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      
      const { error } = await supabase
        .from('profiles')
        .update({ calendar: calendarName })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setSelectedCalendar(calendarName);
      setShowCalendarModal(false);
      Alert.alert('Success', 'Calendar updated!');
      loadData();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to update calendar');
    }
  };

  const syncFullYear = async () => {
    if (!profile) return;

    Alert.alert(
      'Confirm',
      `This will sync all appointments and clients for ${year}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setSyncingAppointments(true);

            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token ?? '';

            try {
              for (const month of MONTHS) {
                try {
                  const res = await fetch( 
                    `${API_BASE_URL}/api/pull?granularity=month&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`,
                    {
                      headers: {
                        'x-client-access-token': accessToken,
                      },
                    }
                  );
                  const data = await res.json();
                  if (!res.ok) throw new Error(data.error || `Failed to fetch ${month}`);
                } catch (err: any) {
                  console.error(`Error syncing ${month}:`, err);
                }
              }
              Alert.alert('Success', `Successfully synced all appointments and clients for ${year}!`);
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', `Failed to sync appointments and clients for ${year}`);
            } finally {
              setSyncingAppointments(false);
            }
          },
        },
      ]
    );
  };

  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 4 }, (_, i) => (currentYear - i).toString());
  };

  const handleConnectSuccess = () => {
    setIsConnected(true);
    loadData();
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setCalendars([]);
    setSelectedCalendar('');
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <Animated.ScrollView
      entering={getFadeInDown(reduceMotion)}
      className="flex-1"
      showsVerticalScrollIndicator={false}
    >
      <View>
        <Text className="text-xl font-bold mb-6" style={{ color: COLORS.textPrimary }}>
          Acuity Integration
        </Text>

        {/* Connect/Disconnect Button */}
        <View className="mb-6">
          <ConnectAcuityButton 
            apiBaseUrl={API_BASE_URL!} 
            onConnectSuccess={handleConnectSuccess}
            onDisconnect={handleDisconnect}
          />
        </View>

        {/* Calendar Selection Row */}
        <View className="mb-4">
        <Text className="text-base font-semibold mb-2" style={{ color: COLORS.textSecondary }}>
          Calendar
        </Text>
          
          {calendarError || !isConnected ? (
            <View 
              className="rounded-xl p-4"
              style={{
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-base" style={{ color: COLORS.textSecondary }}>
                Acuity calendar not available. Make sure that your acuity account is connected.
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => {
                setTempCalendar(selectedCalendar);
                setShowCalendarModal(true);
              }}
              className="flex-row items-center justify-between rounded-xl px-4 py-3"
              style={{
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text 
                className="flex-1 text-base"
                style={{ color: selectedCalendar ? COLORS.textPrimary : COLORS.textSecondary }}
                numberOfLines={1}
              >
                {selectedCalendar || 'Select a calendar to enable syncing'}
              </Text>
              <Text style={{ color: COLORS.primary, fontSize: 18 }}>▼</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Year Selection Row */}
        <View className="mb-6">
        <Text className="text-base font-semibold mb-2" style={{ color: COLORS.textSecondary }}>
          Year
        </Text>
          
          <TouchableOpacity
            onPress={() => setShowYearModal(true)}
            disabled={!isConnected}
            className="flex-row items-center justify-between rounded-xl px-4 py-3"
            style={{
              backgroundColor: COLORS.surfaceElevated,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
              opacity: isConnected ? 1 : 0.5,
            }}
          >
            <Text className="text-base" style={{ color: COLORS.textPrimary }}>
              {year}
            </Text>
            <Text style={{ color: COLORS.primary, fontSize: 18 }}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Sync Buttons */}
        <View className="gap-3">
          <TouchableOpacity
            onPress={syncFullYear}
            disabled={syncingAppointments || !isConnected || !selectedCalendar}
            className="py-3 rounded-xl"
            style={{
              backgroundColor: COLORS.surfaceElevated,
              borderWidth: 1,
              borderColor: syncingAppointments || !isConnected || !selectedCalendar ? COLORS.glassBorder : COLORS.primary,
              opacity: syncingAppointments || !isConnected || !selectedCalendar ? 0.5 : 1,
            }}
          >
            {syncingAppointments ? (
              <ActivityIndicator color={COLORS.primary} />
            ) : (
              <Text 
                className="text-center text-base font-semibold"
                style={{ color: COLORS.primary }}
              >
                Sync All Appointments and Clients for {year}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Calendar Selection Modal */}
      <Modal
        visible={showCalendarModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-4">
          <View 
            className="rounded-2xl w-full max-w-sm overflow-hidden"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            {/* Header */}
            <View 
              className="px-4 py-3"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-lg font-bold text-center" style={{ color: COLORS.textPrimary }}>
                Select Calendar
              </Text>
            </View>

            {/* Options */}
            <ScrollView style={{ maxHeight: 300 }}>
              {calendars.length === 0 ? (
                <View className="p-4">
                  <Text className="text-center" style={{ color: COLORS.textSecondary }}>
                    No calendars found. Connect to Acuity first.
                  </Text>
                </View>
              ) : (
                calendars.map((cal) => (
                  <TouchableOpacity
                    key={cal.id}
                    onPress={() => setTempCalendar(cal.name)}
                    className="flex-row items-center justify-between px-4 py-3"
                    style={{
                      backgroundColor: tempCalendar === cal.name ? COLORS.primaryGlow : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.glassBorder,
                    }}
                  >
                    <Text 
                      className="text-base"
                      style={{ color: tempCalendar === cal.name ? COLORS.primary : COLORS.textPrimary }}
                    >
                      {cal.name}
                    </Text>
                    {tempCalendar === cal.name && (
                      <Text style={{ color: COLORS.primary }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {/* Actions */}
            <View 
              className="flex-row gap-3 p-4"
              style={{
                borderTopWidth: 1,
                borderTopColor: COLORS.glassBorder,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowCalendarModal(false)}
                className="flex-1 py-3 rounded-full"
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.textPrimary }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => saveCalendar(tempCalendar)}
                disabled={!tempCalendar}
                className="flex-1 py-3 rounded-full"
                style={{
                  backgroundColor: tempCalendar ? COLORS.primary : COLORS.surfaceElevated,
                  opacity: tempCalendar ? 1 : 0.5,
                }}
              >
                <Text className="text-center font-bold" style={{ color: COLORS.textPrimary }}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Year Selection Modal */}
      <Modal
        visible={showYearModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowYearModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-4">
          <View 
            className="rounded-2xl w-full max-w-sm overflow-hidden"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            {/* Header */}
            <View 
              className="px-4 py-3"
              style={{
                borderBottomWidth: 1,
                borderBottomColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-lg font-bold text-center" style={{ color: COLORS.textPrimary }}>
                Select Year
              </Text>
            </View>

            {/* Options */}
            <View>
              {generateYearOptions().map((y) => (
                <TouchableOpacity
                  key={y}
                  onPress={() => {
                    setYear(y);
                    setShowYearModal(false);
                  }}
                  className="flex-row items-center justify-between px-4 py-4"
                  style={{
                    backgroundColor: year === y ? COLORS.primaryGlow : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.glassBorder,
                  }}
                >
                  <Text 
                    className="text-lg font-semibold"
                    style={{ color: year === y ? COLORS.primary : COLORS.textPrimary }}
                  >
                    {y}
                  </Text>
                  {year === y && (
                    <Text style={{ color: COLORS.primary }}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {/* Close */}
            <View className="p-4">
              <TouchableOpacity
                onPress={() => setShowYearModal(false)}
                className="py-3 rounded-full"
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.textPrimary }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Animated.ScrollView>
  );
}
