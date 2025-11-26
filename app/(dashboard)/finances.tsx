// app/(dashboard)/expenses.tsx
import ExpensesViewer from '@/components/Finances/ExpensesViewer';
import RecurringExpenses from '@/components/Finances/RecurringExpenses';
import { CustomHeader } from '@/components/Header/CustomHeader';
import { supabase } from '@/utils/supabaseClient';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { CalendarRange, Image as ImageIcon, Plus, Trash2, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SCREEN_WIDTH = Dimensions.get('window').width;

interface Receipt {
  id: string;
  url: string;
  path: string;
  label: string;
}

export default function FinancesPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Date selection
  const currentDate = new Date();
  const currentMonthIndex = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  
  const [selectedMonth, setSelectedMonth] = useState(MONTHS[currentMonthIndex]);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  const [tempDate, setTempDate] = useState(new Date(currentYear, currentMonthIndex, 1));
  
  // Expenses data
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [currentExpense, setCurrentExpense] = useState<number>(0);
  const [loadingDelete, setLoadingDelete] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{ url: string; label: string } | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Receipt gallery modal
  const [showReceiptGallery, setShowReceiptGallery] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [receiptLabel, setReceiptLabel] = useState('');
  const [viewerOpenedFromGallery, setViewerOpenedFromGallery] = useState(false);

  // Swipeable view state
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  // Fetch user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error('No user session found.');
        setUser(user);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch expenses data
  const fetchData = async () => {
    if (!user) return;
    
    try {
      // Monthly expense
      const { data: expenseData } = await supabase
        .from('monthly_data')
        .select('expenses')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .maybeSingle();
      
      let totalExpense = expenseData?.expenses || 0;

      // Add recurring expenses due this month
      const { data: recurringData, error: recurringError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('user_id', user.id);
      
      if (!recurringError && recurringData) {
        const monthIndex = MONTHS.indexOf(selectedMonth);
        const now = new Date(selectedYear, monthIndex, 1);
        
        recurringData.forEach((rec: any) => {
          const start = new Date(rec.start_date);
          const end = rec.end_date ? new Date(rec.end_date) : null;
          
          if (now >= start && (!end || now <= end)) {
            switch (rec.frequency) {
              case 'once':
                const expDate = new Date(rec.start_date);
                if (expDate.getMonth() === monthIndex && expDate.getFullYear() === selectedYear) {
                  totalExpense += rec.amount;
                }
                break;
              case 'weekly':
                const daysOfWeek = rec.weekly_days || [];
                const daysInMonth = new Date(selectedYear, monthIndex + 1, 0).getDate();
                for (let d = 1; d <= daysInMonth; d++) {
                  const date = new Date(selectedYear, monthIndex, d);
                  const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
                  if (daysOfWeek.includes(dayName)) {
                    totalExpense += rec.amount;
                  }
                }
                break;
              case 'monthly':
                if (rec.monthly_day && rec.monthly_day <= new Date(selectedYear, monthIndex + 1, 0).getDate()) {
                  totalExpense += rec.amount;
                }
                break;
              case 'yearly':
                if (rec.yearly_month === monthIndex && rec.yearly_day <= new Date(selectedYear, monthIndex + 1, 0).getDate()) {
                  totalExpense += rec.amount;
                }
                break;
            }
          }
        });
      }

      setCurrentExpense(totalExpense);

      // Receipts
      const { data: receiptData, error: receiptError } = await supabase
        .from('monthly_receipts')
        .select('id,image_url,label')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (!receiptError && receiptData) {
        const urls = await Promise.all(
          receiptData.map(async (r) => {
            const { data: signedData } = await supabase.storage
              .from('receipts')
              .createSignedUrl(r.image_url, 60 * 60);
            return {
              id: r.id,
              path: r.image_url,
              url: signedData?.signedUrl || '',
              label: r.label || '',
            };
          })
        );
        setReceipts(urls.filter((r) => r.url));
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      Alert.alert('Error', 'Failed to fetch expenses or receipts');
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, selectedMonth, selectedYear, refreshKey]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
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
    setRefreshKey((prev) => prev + 1);
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
    return `${selectedMonth} ${selectedYear}`;
  };

  // Receipt handlers
  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.granted === false) {
      Alert.alert('Permission Required', 'Permission to access camera roll is required!');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setUploadingImage(result.assets[0].uri);
      setReceiptLabel('');
      setShowReceiptModal(true);
    }
  };

  const handleUploadConfirm = async () => {
    if (!uploadingImage) return;

    const labelText = receiptLabel.trim() || new Date().toLocaleDateString();
    
    try {
      const response = await fetch(uploadingImage);
      const blob = await response.blob();
      
      const fileName = `${user.id}/${selectedYear}-${selectedMonth}-${Date.now()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(fileName, blob);
        
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('monthly_receipts').insert({
        user_id: user.id,
        month: selectedMonth,
        year: selectedYear,
        image_url: fileName,
        label: labelText,
      });
      
      if (dbError) throw dbError;

      Alert.alert('Success', 'Receipt uploaded!');
      setUploadingImage(null);
      setReceiptLabel('');
      setShowReceiptModal(false);
      fetchData();
    } catch (err) {
      console.error('[UPLOAD] Failed to upload receipt:', err);
      Alert.alert('Error', 'Failed to upload receipt');
    }
  };

  const handleUploadCancel = () => {
    setUploadingImage(null);
    setReceiptLabel('');
    setShowReceiptModal(false);
  };

  const handleDeleteReceipt = async (receiptId: string, path: string) => {
    Alert.alert(
      'Delete Receipt',
      'Are you sure you want to delete this receipt?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoadingDelete(receiptId);
            try {
              const { error: storageError } = await supabase.storage
                .from('receipts')
                .remove([path]);
              if (storageError) throw storageError;

              const { error: dbError } = await supabase
                .from('monthly_receipts')
                .delete()
                .eq('id', receiptId);
              if (dbError) throw dbError;

              Alert.alert('Success', 'Receipt deleted!');
              fetchData();
            } catch (err) {
              console.error(err);
              Alert.alert('Error', 'Failed to delete receipt');
            }
            setLoadingDelete(null);
          },
        },
      ]
    );
  };

  // Swipeable scroll handler
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / (SCREEN_WIDTH - 32));
    setCurrentIndex(index);
  };

  // Define swipeable views
  const expenseViews = [
    {
      id: 'recurring-list',
      title: '📋 Recurring Expenses',
      component: (
        <ExpensesViewer
          key={`viewer-${refreshKey}`}
          barberId={user?.id}
          month={selectedMonth}
          year={selectedYear.toString()}
          onUpdate={fetchData}
        />
      ),
    },
    {
      id: 'add-recurring',
      title: '➕ Add Recurring',
      component: (
        <RecurringExpenses
          key={`add-${refreshKey}`}
          barberId={user?.id}
          month={selectedMonth}
          year={selectedYear}
          onUpdate={fetchData}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <ActivityIndicator size="large" color="#c4ff85" />
        <Text className="text-white mt-4">Loading expenses...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <Text className="text-red-500 text-lg">{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <CustomHeader pageName="Finances" />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#c4ff85"
            colors={['#c4ff85']}
          />
        }
      >
        {/* Header */}
        <View className="my-4">
          <Text className="text-zinc-400 text-xs mb-3">
            Track your one-off and recurring expenses per month.
          </Text>

          {/* Date Picker Button */}
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

        {/* Current Total & Receipt Gallery - Side by Side */}
        <View className="flex-row gap-3 mb-4">
          {/* Current Total */}
          <View className="flex-1 bg-zinc-900 rounded-2xl p-4">
            <Text className="text-zinc-400 text-xs mb-1">
              Current Total
            </Text>
            <Text className="text-lime-300 font-bold text-2xl">
              ${currentExpense.toFixed(2)}
            </Text>
          </View>

          {/* Receipt Gallery Button */}
          <TouchableOpacity
            onPress={() => setShowReceiptGallery(true)}
            className="flex-1 bg-zinc-900 rounded-2xl p-4 justify-center"
          >
            <View className="flex-row items-center gap-2 mb-2">
              <View className="bg-lime-400/20 p-2 rounded-lg">
                <ImageIcon size={18} color="#c4ff85" />
              </View>
              <Text className="text-white font-semibold text-base flex-1">
                Receipts
              </Text>
            </View>
            <Text className="text-zinc-400 text-xs">
              {receipts.length} uploaded
            </Text>
          </TouchableOpacity>
        </View>

        {/* Swipeable Expense Views */}
        <View className="bg-zinc-900 rounded-2xl overflow-hidden mb-6 min-h-[550px] max-h-[45%]">
          <FlatList
            ref={flatListRef}
            data={expenseViews}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            decelerationRate="fast"
            snapToInterval={SCREEN_WIDTH - 32}
            snapToAlignment="start"
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={{ width: SCREEN_WIDTH - 32 }} className="p-4">
                <Text className="text-lime-300 text-lg font-semibold mb-3">
                  {item.title}
                </Text>
                {item.component}
              </View>
            )}
          />

          {/* Dots Indicator */}
          <View className="flex-row justify-center items-center py-3 gap-2">
            {expenseViews.map((_, index) => (
              <View
                key={index}
                className={`h-2 rounded-full ${
                  index === currentIndex
                    ? 'w-6 bg-lime-400'
                    : 'w-2 bg-zinc-700'
                }`}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="none"
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

      {/* Receipt Gallery Modal */}
      <Modal
        visible={showReceiptGallery}
        transparent={true}
        animationType="none"
        onRequestClose={() => setShowReceiptGallery(false)}
      >
        {/* Tap outside to close */}
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setShowReceiptGallery(false)}
          className="flex-1 justify-center items-center bg-black/80 px-4"
        >
          {/* Prevent closing when tapping modal content */}
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="bg-zinc-900 rounded-3xl w-full max-w-md overflow-hidden min-h-[700px]" style={{ maxHeight: '85%' }}>
              {/* Modal Header */}
              <View className="flex-row items-center justify-between px-6 py-4 border-b border-zinc-800">
                <View className="flex-row items-center gap-3">
                  <View className="bg-lime-400/20 p-2 rounded-lg">
                    <ImageIcon size={20} color="#c4ff85" />
                  </View>
                  <View>
                    <Text className="text-white text-lg font-bold">Receipt Gallery</Text>
                    <Text className="text-zinc-400 text-xs">
                      {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReceiptGallery(false)}
                  className="bg-zinc-800 p-2 rounded-full"
                >
                  <X size={18} color="#fff" />
                </TouchableOpacity>
              </View>

              {/* Gallery Content */}
              <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
                {receipts.length === 0 ? (
                  <View className="justify-center items-center py-16">
                    <View className="bg-zinc-800 p-4 rounded-full mb-4">
                      <ImageIcon size={40} color="#71717a" />
                    </View>
                    <Text className="text-zinc-400 text-base text-center mb-2">
                      No receipts yet
                    </Text>
                    <Text className="text-zinc-500 text-sm text-center">
                      Upload your first receipt below
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap gap-3">
                    {receipts.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        onPress={() => {
                          setViewerOpenedFromGallery(true);
                          setShowReceiptGallery(false);
                          setSelectedReceipt({ url: r.url, label: r.label || '' });
                        }}
                        className="relative rounded-xl overflow-hidden border-2 border-zinc-700"
                        style={{ width: '47%', aspectRatio: 1 }}
                      >
                        <Image
                          source={{ uri: r.url }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                        {r.label && (
                          <View className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                            <Text className="text-white font-semibold text-xs" numberOfLines={1}>
                              {r.label}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            handleDeleteReceipt(r.id, r.path);
                          }}
                          disabled={loadingDelete === r.id}
                          className="absolute top-2 right-2 bg-red-600 p-1.5 rounded-full"
                        >
                          {loadingDelete === r.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Trash2 size={12} color="#fff" />
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Upload Button Footer */}
              <View className="px-6 py-4 border-t border-zinc-800">
                <TouchableOpacity
                  onPress={() => {
                    setShowReceiptGallery(false);
                    handlePickImage();
                  }}
                  className="bg-lime-400 py-3.5 rounded-xl flex-row items-center justify-center gap-2"
                >
                  <Plus size={20} color="#000" />
                  <Text className="text-black font-bold text-base">Upload Receipt</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Receipt Upload Label Modal */}
      <Modal
        visible={showReceiptModal}
        transparent={true}
        animationType="none"
        onRequestClose={handleUploadCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-4">
          <View className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md">
            <Text className="text-white text-lg font-semibold mb-2">
              Label your receipt
            </Text>
            <Text className="text-zinc-400 text-sm mb-4">
              Leave blank to default to today&apos;s date.
            </Text>
            <TextInput
              value={receiptLabel}
              onChangeText={setReceiptLabel}
              placeholder="Enter receipt label"
              placeholderTextColor="#71717a"
              className="px-4 py-3 rounded-xl bg-zinc-800 text-white border border-zinc-700 mb-6"
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleUploadCancel}
                className="flex-1 bg-zinc-700 py-3 rounded-full"
              >
                <Text className="text-center text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUploadConfirm}
                className="flex-1 bg-lime-400 py-3 rounded-full"
              >
                <Text className="text-center text-black font-semibold">Upload</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Viewer Modal */}
      {selectedReceipt && (
        <Modal
          visible={true}
          transparent={true}
          animationType="none"
          onRequestClose={() => {
            setSelectedReceipt(null);
            if (viewerOpenedFromGallery) {
              setShowReceiptGallery(true);
              setViewerOpenedFromGallery(false);
            }
          }}
        >
          {/* Tap outside to close */}
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => {
              setSelectedReceipt(null);
              if (viewerOpenedFromGallery) {
                setShowReceiptGallery(true);
                setViewerOpenedFromGallery(false);
              }
            }}
            className="flex-1 bg-zinc-900/95"
          >
            <SafeAreaView className="flex-1 justify-center items-center p-4">
              {/* Prevent closing when tapping the image */}
              <TouchableOpacity 
                activeOpacity={1} 
                onPress={(e) => e.stopPropagation()}
              >
                <Image
                  source={{ uri: selectedReceipt.url }}
                  style={{ width: SCREEN_WIDTH - 32, height: SCREEN_WIDTH * 1.3 }}
                  className="rounded-2xl"
                  resizeMode="contain"
                />
                {selectedReceipt.label && (
                  <View className="bg-zinc-800 px-6 py-3 rounded-full mt-4 self-center">
                    <Text className="text-white font-semibold text-center text-base">
                      {selectedReceipt.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </SafeAreaView>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}