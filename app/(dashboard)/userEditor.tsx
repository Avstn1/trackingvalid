import { CustomHeader } from '@/components/Header/CustomHeader';
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CalendarRange, ChevronDown } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

import MarketingFunnelsEditor from '@/components/BarberEditor/MarketingFunnelsEditor';
import RevenueEditor from '@/components/BarberEditor/RevenueEditor';
import ServiceBreakdownEditor from '@/components/BarberEditor/ServiceBreakdownEditor';
import TopClientsEditor from '@/components/BarberEditor/TopClientsEditor';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SECTIONS = [
  { key: 'revenue', label: 'Revenue' },
  { key: 'clients', label: 'Top Clients' },
  { key: 'breakdown', label: 'Service Breakdown' },
  { key: 'funnels', label: 'Marketing Funnels' },
] as const;

type SectionKey = typeof SECTIONS[number]['key'];

export default function UserEditor() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Date picker state
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  const [tempDate, setTempDate] = useState(new Date(currentYear, currentMonthIndex, 1));

  // Section selector state
  const [activeTab, setActiveTab] = useState<SectionKey>('revenue');
  const [showSectionPicker, setShowSectionPicker] = useState(false);

  // Fetch user & profile
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('No user session found.');
        setUser(user);

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();
        if (profileError) throw profileError;
        setProfile(profileData);
      } catch (err) {
        console.error('Error fetching user/profile:', err);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to fetch user profile.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1000);
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
    setSelectedMonth(MONTHS[tempDate.getMonth()]);
    setSelectedYear(tempDate.getFullYear());
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setTempDate(selectedDate);
    setShowDatePicker(false);
  };

  const handleOpenDatePicker = () => {
    setTempDate(selectedDate);
    setShowDatePicker(true);
  };

  // Section picker handlers
  const handleOpenSectionPicker = () => {
    setShowSectionPicker(true);
  };

  const handleSectionSelect = (sectionKey: SectionKey) => {
    setActiveTab(sectionKey);
    setShowSectionPicker(false);
  };

  const handleSectionCancel = () => {
    setShowSectionPicker(false);
  };

  const getDateLabel = () => {
    return `${selectedMonth} ${selectedYear}`;
  };

  const getActiveSectionLabel = () => {
    return SECTIONS.find(s => s.key === activeTab)?.label || 'Select Section';
  };

  if (loading || !user || !profile) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <ActivityIndicator size="large" color="#c4ff85" />
        <Text className="text-zinc-400 mt-4">Loading your dashboard...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <CustomHeader pageName="Data Editor" />

      <View
        className="flex-1 px-4"
      >
        {/* Date Picker Button */}
        <View className="my-4">
          <TouchableOpacity
            onPress={handleOpenDatePicker}
            className="flex-row items-center justify-center gap-2 bg-zinc-800 py-3 rounded-full"
          >
            <CalendarRange size={16} color="#c4ff85" />
            <Text className="text-white font-semibold text-sm">
              {getDateLabel()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Section Dropdown Button */}
        <View className="mb-6">
          <TouchableOpacity
            onPress={handleOpenSectionPicker}
            className="bg-zinc-900/90 px-4 py-3 rounded-full border border-zinc-700 flex-row items-center justify-between"
          >
            <Text className="text-white text-sm font-semibold">
              {getActiveSectionLabel()}
            </Text>
            <ChevronDown size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Main Content */}
        <View className="gap-6 mb-8">
          {activeTab === 'revenue' && (
            <View className='max-h-[80%]'>
              <RevenueEditor barberId={user.id} month={selectedMonth} year={selectedYear} />
            </View>
          )}

          {activeTab === 'clients' && (
            <View className='max-h-[83%]'>
              <TopClientsEditor barberId={user.id} month={selectedMonth} year={selectedYear} />
            </View>
          )}

          {activeTab === 'breakdown' && (
            <View className='max-h-[100%]'>
              <ServiceBreakdownEditor month={selectedMonth} barberId={user.id} />
            </View>
          )}

          {activeTab === 'funnels' && (
            <View className='max-h-[85%]'>
              <MarketingFunnelsEditor month={selectedMonth} barberId={user.id} />
            </View>
          )}
        </View>
      </View>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDateCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View className="bg-zinc-900 rounded-2xl p-6 w-[90%] max-w-md">
            <Text className="text-white text-lg font-semibold mb-4 text-center">
              Choose Month & Year
            </Text>

            <View className="bg-zinc-800 rounded-xl overflow-hidden">
              <DateTimePicker
                value={tempDate}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date(2020, 0, 1)}
                maximumDate={new Date()}
                textColor="#ffffff"
                themeVariant="dark"
              />
            </View>

            <Text className="text-zinc-400 text-xs text-center mt-3">
              Day will be set to 1st of selected month
            </Text>

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={handleDateCancel}
                className="flex-1 bg-zinc-700 py-3 rounded-full"
              >
                <Text className="text-center text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDateConfirm}
                className="flex-1 bg-lime-400 py-3 rounded-full"
              >
                <Text className="text-center text-black font-semibold">Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Section Picker Modal */}
      <Modal
        visible={showSectionPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleSectionCancel}
      >
        <TouchableWithoutFeedback onPress={handleSectionCancel}>
          <View className="flex-1 justify-center items-center bg-black/70 px-4">
            <TouchableWithoutFeedback>
              <View className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
                <Text className="text-white text-lg font-semibold mb-4 text-center">
                  Select Section
                </Text>

                <View className="bg-zinc-800 rounded-xl overflow-hidden">
                  {SECTIONS.map((section, index) => (
                    <TouchableOpacity
                      key={section.key}
                      onPress={() => handleSectionSelect(section.key)}
                      activeOpacity={0.7}
                      className={`py-4 px-4 ${
                        index !== SECTIONS.length - 1 ? 'border-b border-zinc-700' : ''
                      }`}
                    >
                      <Text
                        className={`text-base ${
                          activeTab === section.key
                            ? 'text-lime-400 font-bold'
                            : 'text-white'
                        }`}
                      >
                        {section.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}