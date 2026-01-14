// components/Header/DayPicker.tsx
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

  useEffect(() => {
    setLocalDashboardView(dashboardView);
  }, [dashboardView]);

  useEffect(() => {
    setLocalTimeframe(timeframe);
  }, [timeframe]);

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
                      <Text className="text-center font-semibold text-xs" style={{ color: COLORS.text }}>
                        Monthly
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ paddingVertical: 12 }}>
                      <Text className="text-center font-semibold text-xs" style={{ color: COLORS.textMuted }}>
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
                      <Text className="text-center font-semibold text-xs" style={{ color: COLORS.text }}>
                        Yearly
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={{ paddingVertical: 12 }}>
                      <Text className="text-center font-semibold text-xs" style={{ color: COLORS.textMuted }}>
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
                    <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
                      Choose Date
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
                        value={normalizedDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        maximumDate={new Date()}
                        textColor={COLORS.text}
                        themeVariant="dark"
                        timeZoneName="America/Toronto"
                      />
                    </View>
                  </>
                ) : (
                  <>
                    <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
                      Choose Timeframe
                    </Text>

                    <View>
                      {timeframeOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => handleTimeframeChange(option.value as Timeframe)}
                          className="mb-3 rounded-xl overflow-hidden"
                          style={{
                            borderWidth: 1,
                            borderColor: localTimeframe === option.value ? COLORS.green : COLORS.glassBorder,
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
                          <View className="py-3 px-4">
                            <Text 
                              className="text-sm text-center"
                              style={{ 
                                color: localTimeframe === option.value ? COLORS.green : COLORS.text,
                                fontWeight: localTimeframe === option.value ? 'bold' : 'normal'
                              }}
                            >
                              {option.label}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}
              </View>
            </>
          ) : (
            <>
              {/* Regular date picker for Finances/Reports */}
              <View style={{ height: 280 }}>
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
                    value={normalizedDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={handleDateChange}
                    minimumDate={new Date(2020, 0, 1)}
                    maximumDate={new Date()}
                    textColor={COLORS.text}
                    themeVariant="dark"
                    timeZoneName="America/Toronto"
                  />
                </View>

                <Text className="text-xs text-center mt-3" style={{ color: COLORS.textMuted }}>
                  Day will be set to 1st of selected month
                </Text>
              </View>
            </>
          )}

          <View className="flex-row gap-3 mt-6">
            <TouchableOpacity
              onPress={onClose}
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
              onPress={onConfirm}
              className="flex-1 rounded-full overflow-hidden"
            >
              <LinearGradient
                colors={['#8bcf68ff', '#beb348ff']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 12 }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}