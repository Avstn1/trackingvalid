// components/Settings/AcuityTab.tsx
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
  purple: '#9C27B0',
  purpleGlow: 'rgba(156, 39, 176, 0.2)',
};

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AcuityTab() {
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
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.warn('No access token found in Supabase session');
        setCalendarError(true);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/acuity/calendar`, {
          headers: {
            'x-client-access-token': accessToken,
          },
        });

        const data = await res.json();

        if (res.ok) {
          setCalendars(data.calendars || []);
        } else {
          console.warn('Could not fetch calendars - API may not be available');
          setCalendarError(true);
        }
      } catch (apiError) {
        console.warn('Calendar API not available:', apiError);
        setCalendarError(true);
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

  const syncYear = async () => {
    if (!profile) return;
    setSyncingClients(true);

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session?.access_token;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/acuity/pull-clients?year=${encodeURIComponent(year)}`,
        {
          headers: {
            'x-client-access-token': accessToken,
          },
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Client sync failed');
      Alert.alert('Success', `Synced ${data.totalClients} clients for ${year}!`);
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', `Failed to sync clients for ${year}`);
    } finally {
      setSyncingClients(false);
    }
  };

  const syncFullYear = async () => {
    if (!profile) return;

    Alert.alert(
      'Confirm',
      `This will sync all appointments for ${year}. Continue?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            setSyncingAppointments(true);

            const { data: { session } } = await supabase.auth.getSession();
            const accessToken = session?.access_token;

            try {
              for (const month of MONTHS) {
                try {
                  const res = await fetch(
                    `${API_BASE_URL}/api/acuity/pull?endpoint=appointments&month=${encodeURIComponent(month)}&year=${encodeURIComponent(year)}`,
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
              Alert.alert('Success', `Successfully synced all appointments for ${year}!`);
            } catch (err: any) {
              console.error(err);
              Alert.alert('Error', `Failed to sync appointments for ${year}`);
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

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center py-20">
        <ActivityIndicator size="large" color={COLORS.orange} />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View>
        <Text className="text-xl font-bold mb-6" style={{ color: COLORS.text }}>
          Acuity Integration
        </Text>

        {/* Calendar Selection Row */}
        <View className="mb-4">
          <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>
            Calendar
          </Text>
          
          {calendarError ? (
            <View 
              className="rounded-xl p-4"
              style={{
                backgroundColor: COLORS.surfaceSolid,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-sm" style={{ color: COLORS.textMuted }}>
                Calendar API not available. Make sure your backend is running.
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
                backgroundColor: COLORS.surfaceSolid,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text 
                className="flex-1 text-base"
                style={{ color: selectedCalendar ? COLORS.text : COLORS.textMuted }}
                numberOfLines={1}
              >
                {selectedCalendar || 'No calendar selected'}
              </Text>
              <Text style={{ color: COLORS.orange, fontSize: 18 }}>▼</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Year Selection Row */}
        <View className="mb-6">
          <Text className="text-sm font-semibold mb-2" style={{ color: COLORS.textMuted }}>
            Year
          </Text>
          
          <TouchableOpacity
            onPress={() => setShowYearModal(true)}
            className="flex-row items-center justify-between rounded-xl px-4 py-3"
            style={{
              backgroundColor: COLORS.surfaceSolid,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <Text className="text-base" style={{ color: COLORS.text }}>
              {year}
            </Text>
            <Text style={{ color: COLORS.purple, fontSize: 18 }}>▼</Text>
          </TouchableOpacity>
        </View>

        {/* Sync Buttons */}
        <View className="gap-3">
          <TouchableOpacity
            onPress={syncYear}
            disabled={syncingClients || calendarError}
            className="py-3 rounded-xl"
            style={{
              backgroundColor: syncingClients || calendarError ? COLORS.surfaceSolid : COLORS.orange,
              opacity: syncingClients || calendarError ? 0.5 : 1,
            }}
          >
            {syncingClients ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <Text 
                className="text-center font-bold"
                style={{ color: COLORS.text }}
              >
                Sync Clients for {year}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={syncFullYear}
            disabled={syncingAppointments || calendarError}
            className="py-3 rounded-xl"
            style={{
              backgroundColor: COLORS.surfaceSolid,
              borderWidth: 1,
              borderColor: syncingAppointments || calendarError ? COLORS.glassBorder : COLORS.purple,
              opacity: syncingAppointments || calendarError ? 0.5 : 1,
            }}
          >
            {syncingAppointments ? (
              <ActivityIndicator color={COLORS.purple} />
            ) : (
              <Text 
                className="text-center font-semibold"
                style={{ color: COLORS.purple }}
              >
                Sync All Appointments for {year}
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
              backgroundColor: COLORS.cardBg,
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
              <Text className="text-lg font-bold text-center" style={{ color: COLORS.text }}>
                Select Calendar
              </Text>
            </View>

            {/* Options */}
            <ScrollView style={{ maxHeight: 300 }}>
              {calendars.length === 0 ? (
                <View className="p-4">
                  <Text className="text-center" style={{ color: COLORS.textMuted }}>
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
                      backgroundColor: tempCalendar === cal.name ? COLORS.orangeGlow : 'transparent',
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.glassBorder,
                    }}
                  >
                    <Text 
                      className="text-base"
                      style={{ color: tempCalendar === cal.name ? COLORS.orange : COLORS.text }}
                    >
                      {cal.name}
                    </Text>
                    {tempCalendar === cal.name && (
                      <Text style={{ color: COLORS.orange }}>✓</Text>
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
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => saveCalendar(tempCalendar)}
                disabled={!tempCalendar}
                className="flex-1 py-3 rounded-full"
                style={{
                  backgroundColor: tempCalendar ? COLORS.orange : COLORS.surfaceSolid,
                  opacity: tempCalendar ? 1 : 0.5,
                }}
              >
                <Text className="text-center font-bold" style={{ color: COLORS.text }}>
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
              backgroundColor: COLORS.cardBg,
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
              <Text className="text-lg font-bold text-center" style={{ color: COLORS.text }}>
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
                    backgroundColor: year === y ? COLORS.purpleGlow : 'transparent',
                    borderBottomWidth: 1,
                    borderBottomColor: COLORS.glassBorder,
                  }}
                >
                  <Text 
                    className="text-lg font-semibold"
                    style={{ color: year === y ? COLORS.purple : COLORS.text }}
                  >
                    {y}
                  </Text>
                  {year === y && (
                    <Text style={{ color: COLORS.purple }}>✓</Text>
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
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}