// components/Settings/AcuityTab.tsx
import { supabase } from '@/utils/supabaseClient';
import { Picker } from '@react-native-picker/picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function AcuityTab() {
  const [profile, setProfile] = useState<any>(null);
  const [calendars, setCalendars] = useState<any[]>([]);
  const [selectedCalendar, setSelectedCalendar] = useState('');
  const [isEditingCalendar, setIsEditingCalendar] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [syncingClients, setSyncingClients] = useState(false);
  const [syncingAppointments, setSyncingAppointments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [calendarError, setCalendarError] = useState(false);

  const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL

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

      // Get access token for API calls
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      if (!accessToken) {
        console.warn('No access token found in Supabase session');
        setCalendarError(true);
        return;
      }

      // Try to fetch calendars with auth token
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


  const saveCalendar = async () => {
    if (!profile) return;
    if (!selectedCalendar) {
      Alert.alert('Error', 'Please choose a calendar');
      return;
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');
      
      const { error } = await supabase
        .from('profiles')
        .update({ calendar: selectedCalendar })
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      Alert.alert('Success', 'Calendar updated!');
      setIsEditingCalendar(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      Alert.alert('Error', err.message || 'Failed to update calendar');
    }
  };

  const syncYear = async () => {
    if (!profile) return;
    setSyncingClients(true);

    // Get access token
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

            // Get access token
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
        <ActivityIndicator size="large" color="#c4ff85" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      <View className="space-y-6">
        <Text className="text-white text-xl font-bold mb-6">Acuity Integration</Text>

        {/* Calendar Selection */}
        <View className="mb-6">
          <Text className="text-white text-base font-semibold mb-3">Calendar</Text>
          
          {calendarError ? (
            <View className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 mb-3">
              <Text className="text-zinc-400 text-sm">
                Calendar API not available. Make sure your backend is running.
              </Text>
            </View>
          ) : calendars.length === 0 ? (
            <View className="bg-zinc-800 border border-zinc-700 rounded-xl p-4 mb-3">
              <Text className="text-zinc-400 text-sm">
                No calendars found. Connect to Acuity first.
              </Text>
            </View>
          ) : (
            <>
              <View className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden mb-3">
                <Picker
                  selectedValue={selectedCalendar}
                  onValueChange={(value) => setSelectedCalendar(value)}
                  enabled={isEditingCalendar}
                  style={{ color: '#fff' }}
                >
                  <Picker.Item label="Select calendar" value="" />
                  {calendars.map((cal) => (
                    <Picker.Item key={cal.id} label={cal.name} value={cal.name} />
                  ))}
                </Picker>
              </View>

              {!isEditingCalendar ? (
                <TouchableOpacity
                  onPress={() => setIsEditingCalendar(true)}
                  className="bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
                >
                  <Text className="text-white text-center font-semibold">Change Calendar</Text>
                </TouchableOpacity>
              ) : (
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedCalendar(profile?.calendar || '');
                      setIsEditingCalendar(false);
                    }}
                    className="flex-1 bg-zinc-800 border border-zinc-700 py-3 rounded-xl"
                  >
                    <Text className="text-white text-center font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={saveCalendar}
                    className="flex-1 bg-lime-400 py-3 rounded-xl"
                  >
                    <Text className="text-black text-center font-bold">Save</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
        </View>

        {/* Sync Section */}
        <View>
          <Text className="text-white text-base font-semibold mb-3">Sync & Import</Text>
          
          <View className="bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden mb-3">
            <Picker
              selectedValue={year}
              onValueChange={(value) => setYear(value)}
              style={{ color: '#fff' }}
            >
              {generateYearOptions().map((y) => (
                <Picker.Item key={y} label={y} value={y} />
              ))}
            </Picker>
          </View>

          <TouchableOpacity
            onPress={syncYear}
            disabled={syncingClients || calendarError}
            className={`py-3 rounded-xl mb-3 ${
              syncingClients || calendarError ? 'bg-zinc-800 opacity-50' : 'bg-lime-400'
            }`}
          >
            {syncingClients ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text className="text-black text-center font-bold">
                Sync Clients for {year}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={syncFullYear}
            disabled={syncingAppointments || calendarError}
            className={`py-3 rounded-xl border ${
              syncingAppointments || calendarError
                ? 'bg-zinc-800 border-zinc-700 opacity-50' 
                : 'bg-zinc-800 border-zinc-700'
            }`}
          >
            {syncingAppointments ? (
              <ActivityIndicator color="#c4ff85" />
            ) : (
              <Text className="text-white text-center font-semibold">
                Sync All Appointments for {year}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}