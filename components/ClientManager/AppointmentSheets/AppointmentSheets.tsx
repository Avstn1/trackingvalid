import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppointmentEditModal from './AppointmentEditModal';

// Component-specific accent colors
const ACCENT_COLORS = {
  amber: '#fbbf24',
};

type AcuityClient = {
  first_name: string | null;
  last_name: string | null;
};

type AppointmentRow = {
  id: string;
  acuity_appointment_id: string | null;
  client_id: string | null;
  phone_normalized: string | null;
  appointment_date: string;
  datetime: string;
  revenue: number | null;
  tip: number | null;
  service_type: string | null;
  acuity_clients: AcuityClient | null;
};

export default function AppointmentSheets() {
  const insets = useSafeAreaInsets();
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [currentMonth, setCurrentMonth] = useState<string>(
    `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`
  );

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const requestSeq = useRef(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session?.user) return;
        setUser(session.user);
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  // Fetch available dates for previous, current, and next month
  useEffect(() => {
    const fetchAvailableDates = async () => {
      if (!user) return;
      
      try {
        // Use selectedDate's month instead of current month
        const baseDate = selectedDate;
        
        // Previous month
        const prevMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
        
        // Current month
        const currentMonthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
        
        // Next month end
        const nextMonthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 2, 0);
        
        // Get the earliest and latest dates
        const startDate = formatDateToISO(prevMonth);
        const endDate = formatDateToISO(nextMonthEnd);

        const { data, error } = await supabase
          .from('acuity_appointments')
          .select('appointment_date')
          .eq('user_id', user.id)
          .gte('appointment_date', startDate)
          .lte('appointment_date', endDate);

        if (error) throw error;

        // Get unique dates and sort
        const uniqueDates = [...new Set(data?.map(row => row.appointment_date) || [])].sort();
        setAvailableDates(uniqueDates);
      } catch (err) {
        console.error('Error fetching available dates:', err);
      }
    };

    fetchAvailableDates();
  }, [user, currentMonth]);

  const formatDateToISO = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateShort = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const selectedDateStr = formatDateToISO(selectedDate);

  const fetchAppointments = async (dateStr: string, isRefresh = false) => {
    if (!user) return;

    const seq = ++requestSeq.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      // Step 1: Fetch appointments (without FK join - no relationship exists)
      const { data: appointmentsData, error: apptError } = await supabase
        .from('acuity_appointments')
        .select('id, acuity_appointment_id, client_id, phone_normalized, appointment_date, datetime, revenue, tip, service_type')
        .eq('user_id', user.id)
        .eq('appointment_date', dateStr)
        .order('datetime', { ascending: true });

      if (apptError) {
        throw new Error(apptError.message || 'Failed to fetch appointments');
      }

      if (seq !== requestSeq.current) return;

      // Step 2: Get unique client IDs
      const clientIds = [...new Set(
        (appointmentsData || [])
          .map(a => a.client_id)
          .filter((id): id is string => Boolean(id))
      )];

      // Step 3: Fetch client names in batch from acuity_clients
      const clientsMap = new Map<string, { first_name: string | null; last_name: string | null }>();

      if (clientIds.length > 0) {
        const { data: clientsData } = await supabase
          .from('acuity_clients')
          .select('client_id, first_name, last_name')
          .eq('user_id', user.id)
          .in('client_id', clientIds);

        clientsData?.forEach(c => {
          clientsMap.set(c.client_id, {
            first_name: c.first_name,
            last_name: c.last_name,
          });
        });
      }

      // Step 4: Merge appointment data with client names
      const appointments = (appointmentsData || []).map(appt => ({
        ...appt,
        acuity_clients: appt.client_id ? clientsMap.get(appt.client_id) ?? null : null,
      })) as AppointmentRow[];

      setAppointments(appointments);
    } catch (err: any) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      if (seq !== requestSeq.current) return;
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchAppointments(selectedDateStr);
    
    // Check if month changed and update currentMonth
    const newMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`;
    if (newMonth !== currentMonth) {
      setCurrentMonth(newMonth);
    }
  }, [selectedDateStr, user]);

  const handleRefresh = () => {
    fetchAppointments(selectedDateStr, true);
  };

  const handleRowClick = (appointment: AppointmentRow) => {
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
  };

  const handleAppointmentUpdate = (
    appointmentId: string,
    updates: { tip?: number; revenue?: number }
  ) => {
    setAppointments((prev) =>
      prev.map((appt) =>
        appt.id === appointmentId
          ? {
              ...appt,
              ...(updates.tip !== undefined && { tip: updates.tip }),
              ...(updates.revenue !== undefined && { revenue: updates.revenue }),
            }
          : appt
      )
    );
  };

  const formatTime = (d: string | null | undefined) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (value: number | null | undefined) => {
    if (value === null || value === undefined) return '—';
    return `$${value.toFixed(2)}`;
  };

  const capitalizeName = (name: string | null | undefined) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const dayTotals = useMemo(() => {
    const revenueTotal = appointments.reduce((sum, appt) => sum + (appt.revenue || 0), 0);
    const tipTotal = appointments.reduce((sum, appt) => sum + (appt.tip || 0), 0);
    return { revenueTotal, tipTotal, count: appointments.length };
  }, [appointments]);

  const isToday = formatDateToISO(selectedDate) === formatDateToISO(new Date());

  const goToPreviousDay = () => {
    const currentDateStr = formatDateToISO(selectedDate);
    
    // Find all dates before current date
    const previousDates = availableDates.filter(dateStr => dateStr < currentDateStr);
    
    if (previousDates.length > 0) {
      // Get the most recent date before current (last item in sorted array)
      const sortedPrev = previousDates.sort();
      const prevDateStr = sortedPrev[sortedPrev.length - 1];
      setSelectedDate(new Date(prevDateStr + 'T00:00:00'));
    }
  };

  const goToNextDay = () => {
    const currentDateStr = formatDateToISO(selectedDate);
    const today = formatDateToISO(new Date());
    
    // Find all dates after current date that are not in the future
    const nextDates = availableDates.filter(dateStr => dateStr > currentDateStr && dateStr <= today);
    
    if (nextDates.length > 0) {
      // Get the first date after current (first item in sorted array)
      const sortedNext = nextDates.sort();
      const nextDateStr = sortedNext[0];
      setSelectedDate(new Date(nextDateStr + 'T00:00:00'));
    }
  };

  const canGoNext = () => {
    const currentDateStr = formatDateToISO(selectedDate);
    const today = formatDateToISO(new Date());
    
    // Check if there's any available date after current date and not in the future
    return availableDates.some(dateStr => dateStr > currentDateStr && dateStr <= today);
  };

  const canGoPrevious = () => {
    const currentDateStr = formatDateToISO(selectedDate);
    
    // Check if there's any available date before current date
    return availableDates.some(dateStr => dateStr < currentDateStr);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <View className="flex-1">
        {/* Header */}
        <View className="mt-3 mb-3">
          {/* Date Navigation */}
          <View className="flex-row items-center gap-2 mb-3">
            <TouchableOpacity
              onPress={goToPreviousDay}
              disabled={!canGoPrevious()}
              className={`p-2 rounded-lg border ${
                canGoPrevious()
                  ? 'bg-black/30 border-white/10'
                  : 'bg-black/10 border-white/5 opacity-30'
              }`}
            >
              <ChevronLeft color="#fff" size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsCalendarOpen(true)}
              className="flex-1 flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl border"
              style={{
                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                borderColor: 'rgba(251, 191, 36, 0.3)',
              }}
            >
              <Calendar color={ACCENT_COLORS.amber} size={18} />
              <Text className="text-amber-100 text-sm font-medium">
                {isToday ? 'Today' : formatDateShort(selectedDate)}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={goToNextDay}
              disabled={!canGoNext()}
              className={`p-2 rounded-lg border ${
                canGoNext()
                  ? 'bg-black/30 border-white/10'
                  : 'bg-black/10 border-white/5 opacity-30'
              }`}
            >
              <ChevronRight color="#fff" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View className="px-2 mb-3">
          <View className="flex-row flex-wrap gap-2">
            <View className="px-3 py-2 rounded-full bg-black/30 border border-white/10">
              <Text className="text-[#e5e5e5] text-xs">
                Appointments: <Text className="font-semibold text-white">{dayTotals.count}</Text>
              </Text>
            </View>
            <View className="px-3 py-2 rounded-full bg-black/30 border border-green-500/20">
              <Text className="text-[#e5e5e5] text-xs">
                Revenue:{' '}
                <Text className="font-semibold text-green-300">
                  {formatCurrency(dayTotals.revenueTotal)}
                </Text>
              </Text>
            </View>
            <View className="px-3 py-2 rounded-full bg-black/30 border border-amber-500/20">
              <Text className="text-[#e5e5e5] text-xs">
                Tips:{' '}
                <Text className="font-semibold text-amber-300">
                  {formatCurrency(dayTotals.tipTotal)}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Appointments List */}
        <View className="flex-1">
          {loading && !refreshing ? (
            <View className="flex-1 items-center justify-center">
              <ActivityIndicator size="large" color={ACCENT_COLORS.amber} />
              <Text className="text-[#bdbdbd] text-sm mt-3">Loading appointments…</Text>
            </View>
          ) : error ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-red-300 text-sm">{error}</Text>
            </View>
          ) : appointments.length === 0 ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-4xl mb-3">📅</Text>
              <Text className="text-[#bdbdbd] text-sm">
                No appointments for {formatDateDisplay(selectedDate)}
              </Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ACCENT_COLORS.amber} />
              }
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
            >
            {appointments.map((appt, index) => {
              const rowNumber = index + 1; // Start from 1 at the top
              const firstName = appt.acuity_clients?.first_name || '';
              const lastName = appt.acuity_clients?.last_name || '';
              const clientName =
                `${capitalizeName(firstName)} ${capitalizeName(lastName)}`.trim() ||
                'Unknown';

              return (
                <TouchableOpacity
                  key={appt.id}
                  onPress={() => handleRowClick(appt)}
                  className="mb-2 rounded-lg p-3"
                  style={{
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                  activeOpacity={0.7}
                >
                  {/* Header Row */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[#666] text-xs">#{rowNumber}</Text>
                      <Text className="text-white text-sm font-semibold">{formatTime(appt.datetime)}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-green-300 text-sm font-semibold">
                        {formatCurrency(appt.revenue)}
                      </Text>
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: appt.tip && appt.tip > 0 ? ACCENT_COLORS.amber : '#555' }}
                      >
                        {formatCurrency(appt.tip)}
                      </Text>
                    </View>
                  </View>

                  {/* Client & Service */}
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="text-white text-sm font-medium mb-1">{clientName}</Text>
                      {appt.service_type && (
                        <Text className="text-[#888] text-xs">{appt.service_type}</Text>
                      )}
                    </View>
                    <View className="ml-2 bg-amber-500/20 px-3 py-1 rounded-full">
                      <Text className="text-amber-300 text-xs font-semibold">Tap to edit</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          )}
        </View>
      </View>

      {/* Date Picker */}
      {isCalendarOpen && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={isCalendarOpen}
          onRequestClose={() => setIsCalendarOpen(false)}
        >
          <Pressable
            className="flex-1 justify-center items-center"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onPress={() => setIsCalendarOpen(false)}
          >
            <Pressable
              className="w-11/12 max-w-md rounded-2xl p-6"
              style={{
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-white text-xl font-bold">Select Date</Text>
                <TouchableOpacity
                  onPress={() => setIsCalendarOpen(false)}
                  className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
                >
                  <X color="#fff" size={20} />
                </TouchableOpacity>
              </View>

              {availableDates.length > 0 && (
                <Text className="text-[#888] text-xs mb-3 text-center">
                  {availableDates.length} {availableDates.length === 1 ? 'date' : 'dates'} with appointments
                </Text>
              )}

              <DateTimePicker
                value={selectedDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, date) => {
                  if (date) {
                    setSelectedDate(date);
                    if (Platform.OS === 'android') {
                      setIsCalendarOpen(false);
                    }
                  }
                }}
                maximumDate={new Date()}
                themeVariant="dark"
                textColor="#ffffff"
              />

              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  onPress={() => setIsCalendarOpen(false)}
                  className="mt-4 py-3 px-4 rounded-xl bg-amber-300"
                >
                  <Text className="text-black text-sm font-semibold text-center">Done</Text>
                </TouchableOpacity>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      )}

      {/* Edit Modal */}
      <AppointmentEditModal
        isOpen={isModalOpen}
        appointment={selectedAppointment}
        onClose={handleModalClose}
        onUpdate={handleAppointmentUpdate}
      />
    </View>
  );
}