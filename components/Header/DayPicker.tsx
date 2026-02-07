// components/Header/DayPicker.tsx
import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');



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

interface DayPickerProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isDashboard: boolean;
  
  // Dashboard props
  dashboardView?: "monthly" | "yearly";
  onDashboardViewChange?: (view: "monthly" | "yearly") => void;
  timeframe?: Timeframe;
  onTimeframeChange?: (timeframe: Timeframe) => void;
  
  // Date props
  tempDate: Date;
  onDateChange: (event: any, date?: Date) => void;
}

export default function DayPicker({
  visible,
  onClose,
  onConfirm,
  isDashboard,
  dashboardView = "monthly",
  onDashboardViewChange,
  timeframe = 'year',
  onTimeframeChange,
  tempDate,
  onDateChange,
}: DayPickerProps) {
  const [localDashboardView, setLocalDashboardView] = useState(dashboardView);
  const [localTimeframe, setLocalTimeframe] = useState(timeframe);
  const [minYear, setMinYear] = useState(2020);

  useEffect(() => {
    setLocalDashboardView(dashboardView);
  }, [dashboardView]);

  useEffect(() => {
    setLocalTimeframe(timeframe);
  }, [timeframe]);

  // Fetch minimum year from oldest appointment
  useEffect(() => {
    if (!visible) return;

    const fetchMinYear = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('acuity_appointments')
          .select('appointment_date')
          .eq('user_id', user.id)
          .order('appointment_date', { ascending: true })
          .limit(1)
          .single();

        if (!error && data) {
          const oldestYear = new Date(data.appointment_date).getFullYear();
          setMinYear(oldestYear);
        }
      } catch (err) {
        console.error('Error fetching minimum year:', err);
      }
    };

    fetchMinYear();
  }, [visible]);

  const handleDashboardViewChange = (view: "monthly" | "yearly") => {
    setLocalDashboardView(view);
    if (onDashboardViewChange) {
      onDashboardViewChange(view);
    }
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    setLocalTimeframe(tf);
    if (onTimeframeChange) {
      onTimeframeChange(tf);
    }
  };

  // Create a stable date at noon to avoid timezone boundary issues
  const normalizedDate = React.useMemo(() => {
    const year = tempDate.getFullYear();
    const month = tempDate.getMonth();
    const day = tempDate.getDate();
    return new Date(year, month, day, 12, 0, 0, 0);
  }, [tempDate]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      onDateChange(event, undefined);
      return;
    }
    
    if (selectedDate) {
      // Extract date components directly to avoid timezone conversion issues
      const year = selectedDate.getFullYear();
      const month = selectedDate.getMonth();
      const day = selectedDate.getDate();
      
      // Create new date object at noon in local timezone
      const stabilizedDate = new Date(year, month, day, 12, 0, 0, 0);
      onDateChange(event, stabilizedDate);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center bg-black/70">
        <TouchableOpacity 
          activeOpacity={1} 
          className="absolute inset-0" 
          onPress={onClose}
        />
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
          {isDashboard ? (
            <>
              {/* Tab Switcher for Dashboard */}
              <View 
                className="flex-row rounded-full p-1 mb-6 overflow-hidden"
                style={{ 
                  backgroundColor: COLORS.surface,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <TouchableOpacity
                  onPress={() => handleDashboardViewChange("monthly")}
                  className="flex-1 rounded-full overflow-hidden"
                >
                  {localDashboardView === "monthly" ? (
                    <LinearGradient
                      colors={['#8bcf68ff', '#beb348ff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 12 }}
                    >
                      <Text className="text-center font-semibold text-sm" style={{ color: COLORS.textPrimary }}>
                        Monthly
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ paddingVertical: 12 }}>
                      <Text className="text-center font-semibold text-sm" style={{ color: COLORS.textSecondary }}>
                        Monthly
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => handleDashboardViewChange("yearly")}
                  className="flex-1 rounded-full overflow-hidden"
                >
                  {localDashboardView === "yearly" ? (
                    <LinearGradient
                      colors={['#8bcf68ff', '#beb348ff']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ paddingVertical: 12 }}
                    >
                      <Text className="text-center font-semibold text-sm" style={{ color: COLORS.textPrimary }}>
                        Yearly
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ paddingVertical: 12 }}>
                      <Text className="text-center font-semibold text-sm" style={{ color: COLORS.textSecondary }}>
                        Yearly
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              {/* Fixed height container for content */}
              <View style={{ height: 280 }}>
                {localDashboardView === "monthly" ? (
                  <>
                    <Text className="text-xl font-semibold mb-4 text-center" style={{ color: COLORS.textPrimary }}>
                      Choose Date
                    </Text>

                    <View 
                      className="rounded-2xl overflow-hidden"
                      style={{ 
                        backgroundColor: COLORS.surface,
                        borderWidth: 1,
                        borderColor: COLORS.glassBorder,
                      }}
                    >
                      <DateTimePicker
                        value={normalizedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={new Date(minYear, 0, 1)}
                        maximumDate={new Date()}
                        textColor={COLORS.textPrimary}
                        themeVariant="dark"
                        timeZoneName="America/Toronto"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-xl font-semibold mb-4 text-center" style={{ color: COLORS.textPrimary }}>
                      Choose Year & Timeframe
                    </Text>

                    {/* Year Selector */}
                    <View className="mb-3">
                      <View className="flex-row items-center justify-center gap-3">
                        <TouchableOpacity
                          onPress={() => {
                            const newDate = new Date(normalizedDate);
                            newDate.setFullYear(normalizedDate.getFullYear() - 1);
                            onDateChange({}, newDate);
                          }}
                          className="px-3 py-1.5 rounded-lg"
                          style={{ 
                            backgroundColor: COLORS.surface,
                            borderWidth: 1,
                            borderColor: COLORS.glassBorder,
                          }}
                          disabled={normalizedDate.getFullYear() <= minYear}
                        >
                          <Text className="text-xl font-bold" style={{ color: normalizedDate.getFullYear() <= minYear ? COLORS.textSecondary : COLORS.textPrimary }}>←</Text>
                        </TouchableOpacity>
                        
                        <View 
                          className="px-6 py-2 rounded-lg overflow-hidden"
                          style={{ 
                            borderWidth: 1,
                            borderColor: COLORS.primary,
                            minWidth: 100,
                          }}
                        >
                          <LinearGradient
                            colors={['#8bcf68ff', '#beb348ff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              opacity: 0.15,
                            }}
                          />
                          <Text className="text-2xl font-bold text-center" style={{ color: COLORS.primary }}>
                            {normalizedDate.getFullYear()}
                          </Text>
                        </View>

                        <TouchableOpacity
                          onPress={() => {
                            const newDate = new Date(normalizedDate);
                            newDate.setFullYear(normalizedDate.getFullYear() + 1);
                            onDateChange({}, newDate);
                          }}
                          className="px-3 py-1.5 rounded-lg"
                          style={{ 
                            backgroundColor: COLORS.surface,
                            borderWidth: 1,
                            borderColor: COLORS.glassBorder,
                          }}
                          disabled={normalizedDate.getFullYear() >= new Date().getFullYear()}
                        >
                          <Text className="text-xl font-bold" style={{ color: normalizedDate.getFullYear() >= new Date().getFullYear() ? COLORS.textSecondary : COLORS.textPrimary }}>→</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <Text className="text-sm font-medium mb-3 mt-1 text-center" style={{ color: COLORS.textSecondary }}>
                      Select Timeframe for {normalizedDate.getFullYear()}
                    </Text>

                    <View className="gap-2">
                      {/* Year option - full width */}
                      <TouchableOpacity
                        onPress={() => handleTimeframeChange('year')}
                        className="rounded-xl overflow-hidden"
                        style={{
                          borderWidth: 1,
                          borderColor: localTimeframe === 'year' ? COLORS.primary : COLORS.glassBorder,
                        }}
                      >
                        {localTimeframe === 'year' && (
                          <LinearGradient
                            colors={['#8bcf68ff', '#beb348ff']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              opacity: 0.15,
                            }}
                          />
                        )}
                        <View className="py-3 px-4">
                          <Text 
                            className="text-base text-center"
                            style={{ 
                              color: localTimeframe === 'year' ? COLORS.primary : COLORS.textPrimary,
                              fontWeight: localTimeframe === 'year' ? 'bold' : 'normal'
                            }}
                          >
                            Year
                          </Text>
                        </View>
                      </TouchableOpacity>

                      {/* Quarters - 2x2 grid */}
                      <View className="flex-row flex-wrap gap-2">
                        {timeframeOptions.slice(1).map((option) => (
                          <TouchableOpacity
                            key={option.value}
                            onPress={() => handleTimeframeChange(option.value as Timeframe)}
                            className="rounded-xl overflow-hidden"
                            style={{
                              width: '48%',
                              borderWidth: 1,
                              borderColor: localTimeframe === option.value ? COLORS.primary : COLORS.glassBorder,
                            }}
                          >
                            {localTimeframe === option.value && (
                              <LinearGradient
                                colors={['#8bcf68ff', '#beb348ff']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{
                                  position: 'absolute',
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  opacity: 0.15,
                                }}
                              />
                            )}
                            <View className="py-3 px-3">
                              <Text 
                                className="text-base text-center"
                                style={{ 
                                  color: localTimeframe === option.value ? COLORS.primary : COLORS.textPrimary,
                                  fontWeight: localTimeframe === option.value ? 'bold' : 'normal'
                                }}
                              >
                                {option.label}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  </>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Regular date picker for Finances/Reports */}
              <View style={{ height: 280 }}>
                <Text className="text-xl font-semibold mb-4 text-center" style={{ color: COLORS.textPrimary }}>
                  Choose Month & Year
                </Text>

                <View 
                  className="rounded-2xl overflow-hidden"
                  style={{ 
                    backgroundColor: COLORS.surface,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <DateTimePicker
                    value={normalizedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date(minYear, 0, 1)}
                    maximumDate={new Date()}
                    textColor={COLORS.textPrimary}
                    themeVariant="dark"
                    timeZoneName="America/Toronto"
                  />
                </View>

                <Text className="text-sm text-center mt-3" style={{ color: COLORS.textSecondary }}>
                  Day will be set to 1st of selected month
                </Text>
              </View>
            </>
          )}

          {minYear !== 2020 && (
            <Text className="text-sm text-center mt-0" style={{ color: COLORS.textSecondary }}>
              Oldest appointment: {minYear}
            </Text>
          )}

          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity
              onPress={onClose}
              className="flex-1 py-3 rounded-full"
              style={{ 
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-center font-semibold text-sm" style={{ color: COLORS.textPrimary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              className="flex-1 rounded-full overflow-hidden"
            >
              <LinearGradient
                colors={['#8bcf68ff', '#beb348ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 12 }}
              >
                <Text className="text-center font-semibold text-sm" style={{ color: COLORS.textPrimary }}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
