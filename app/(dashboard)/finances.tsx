// app/(dashboard)/expenses.tsx
import AuthLoadingSplash from '@/components/AuthLoadingSpash';
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
  red: '#f87171',
  redGlow: 'rgba(248, 113, 113, 0.2)',
};

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
      mediaTypes: ['images'],
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
      const fileName = `${user.id}/${selectedYear}-${selectedMonth}-${Date.now()}.jpg`;

      const fileExt = uploadingImage.split('.').pop();
      const filePath = fileName;

      const response = await fetch(uploadingImage);
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      const { error: uploadError } = await supabase.storage
        .from('receipts')
        .upload(filePath, uint8Array, {
          contentType: 'image/jpeg',
          upsert: false,
        });
        
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase.from('monthly_receipts').insert({
        user_id: user.id,
        month: selectedMonth,
        year: selectedYear,
        image_url: filePath,
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
    return <AuthLoadingSplash message="Loading expenses..." />;
  }

  if (error) {
    return (
      <View className="flex-1 justify-center items-center" style={{ backgroundColor: COLORS.background }}>
        <Text className="text-lg" style={{ color: COLORS.red }}>{error}</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <CustomHeader pageName="Finances" />

      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.orange}
            colors={[COLORS.orange]}
          />
        }
      >
        {/* Header */}
        <View className="my-4">
          <Text className="text-xs mb-3" style={{ color: COLORS.textMuted }}>
            Track your one-off and recurring expenses per month.
          </Text>

          {/* Date Picker Button */}
          <TouchableOpacity
            onPress={handleOpenDatePicker}
            className="flex-row items-center justify-center gap-2 py-3 rounded-full"
            style={{
              backgroundColor: COLORS.surfaceSolid,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <CalendarRange size={16} color={COLORS.orange} />
            <Text className="font-semibold text-sm" style={{ color: COLORS.text }}>
              {getDateLabel()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Current Total & Receipt Gallery - Side by Side */}
        <View className="flex-row gap-3 mb-4">
          {/* Current Total */}
          <View 
            className="flex-1 rounded-2xl p-4 overflow-hidden"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
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
            <Text className="text-xs mb-1" style={{ color: COLORS.textMuted }}>
              Current Total
            </Text>
            <Text className="font-bold text-2xl" style={{ color: COLORS.text }}>
              ${currentExpense.toFixed(2)}
            </Text>
          </View>

          {/* Receipt Gallery Button */}
          <TouchableOpacity
            onPress={() => setShowReceiptGallery(true)}
            className="flex-1 rounded-2xl p-4 justify-center overflow-hidden"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
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
            <View className="flex-row items-center gap-2 mb-2">
              <View 
                className="p-2 rounded-lg"
                style={{ backgroundColor: COLORS.orangeGlow }}
              >
                <ImageIcon size={18} color={COLORS.orange} />
              </View>
              <Text className="font-semibold text-base flex-1" style={{ color: COLORS.text }}>
                Receipts
              </Text>
            </View>
            <Text className="text-xs" style={{ color: COLORS.textMuted }}>
              {receipts.length} uploaded
            </Text>
          </TouchableOpacity>
        </View>

        {/* Swipeable Expense Views */}
        <View 
          className="rounded-2xl overflow-hidden mb-6"
          style={{
            backgroundColor: COLORS.surface,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
            minHeight: 550,
            maxHeight: '45%',
          }}
        >
          <View 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: COLORS.glassHighlight,
              zIndex: 1,
            }}
          />
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
            renderItem={({ item, index }) => (
              <View style={{ width: SCREEN_WIDTH - 32 }} className="p-4">
                {index === 0 ? (
                  // First view: Title with Add Button
                  <View className="flex-row justify-between items-center mb-3">
                    <Text className="text-lg font-semibold" style={{ color: COLORS.orange }}>
                      {item.title}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        flatListRef.current?.scrollToIndex({
                          index: 1,
                          animated: true,
                        });
                      }}
                      className="p-2 rounded-lg"
                      style={{ backgroundColor: COLORS.orange }}
                    >
                      <Plus size={20} color={COLORS.text} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Other views: Normal title
                  <Text className="text-lg font-semibold mb-3" style={{ color: COLORS.purple }}>
                    {item.title}
                  </Text>
                )}
                {item.component}
              </View>
            )}
          />

          {/* Dots Indicator */}
          <View className="flex-row justify-center items-center py-3 gap-2">
            {expenseViews.map((_, index) => (
              <View
                key={index}
                className="h-2 rounded-full"
                style={{
                  width: index === currentIndex ? 24 : 8,
                  backgroundColor: index === currentIndex ? COLORS.orange : COLORS.surfaceSolid,
                }}
              />
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent={true}
        animationType="fade"
        onRequestClose={handleDateCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/70">
          <View 
            className="rounded-2xl p-6 w-[90%] max-w-md overflow-hidden"
            style={{
              backgroundColor: COLORS.cardBg,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
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
            <Text className="text-lg font-semibold mb-4 text-center" style={{ color: COLORS.text }}>
              Choose Month & Year
            </Text>

            <View 
              className="rounded-xl overflow-hidden"
              style={{
                backgroundColor: COLORS.surfaceSolid,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
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

            <Text className="text-xs text-center mt-3" style={{ color: COLORS.textMuted }}>
              Day will be set to 1st of selected month
            </Text>

            <View className="flex-row gap-3 mt-6">
              <TouchableOpacity
                onPress={handleDateCancel}
                className="flex-1 py-3 rounded-full"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDateConfirm}
                className="flex-1 py-3 rounded-full"
                style={{ backgroundColor: COLORS.orange }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Receipt Gallery Modal */}
      <Modal
        visible={showReceiptGallery}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReceiptGallery(false)}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={() => setShowReceiptGallery(false)}
          className="flex-1 justify-center items-center bg-black/80 px-4"
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View 
              className="rounded-3xl w-full max-w-md overflow-hidden"
              style={{ 
                backgroundColor: COLORS.cardBg,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
                minHeight: 700, 
                maxHeight: '85%' 
              }}
            >
              {/* Modal Header */}
              <View 
                className="flex-row items-center justify-between px-6 py-4"
                style={{
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.glassBorder,
                }}
              >
                <View className="flex-row items-center gap-3">
                  <View 
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: COLORS.orangeGlow }}
                  >
                    <ImageIcon size={20} color={COLORS.orange} />
                  </View>
                  <View>
                    <Text className="text-lg font-bold" style={{ color: COLORS.text }}>Receipt Gallery</Text>
                    <Text className="text-xs" style={{ color: COLORS.textMuted }}>
                      {receipts.length} receipt{receipts.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setShowReceiptGallery(false)}
                  className="p-2 rounded-full"
                  style={{ backgroundColor: COLORS.surfaceSolid }}
                >
                  <X size={18} color={COLORS.text} />
                </TouchableOpacity>
              </View>

              {/* Gallery Content */}
              <ScrollView className="flex-1 px-6 py-4" showsVerticalScrollIndicator={false}>
                {receipts.length === 0 ? (
                  <View className="justify-center items-center py-16">
                    <View 
                      className="p-4 rounded-full mb-4"
                      style={{ backgroundColor: COLORS.surfaceSolid }}
                    >
                      <ImageIcon size={40} color={COLORS.textMuted} />
                    </View>
                    <Text className="text-base text-center mb-2" style={{ color: COLORS.textMuted }}>
                      No receipts yet
                    </Text>
                    <Text className="text-sm text-center" style={{ color: COLORS.textMuted }}>
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
                        className="relative rounded-xl overflow-hidden"
                        style={{ 
                          width: '47%', 
                          aspectRatio: 1,
                          borderWidth: 2,
                          borderColor: COLORS.glassBorder,
                        }}
                      >
                        <Image
                          source={{ uri: r.url }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                        {r.label && (
                          <View 
                            className="absolute bottom-0 left-0 right-0 p-2"
                            style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                          >
                            <Text className="font-semibold text-xs" numberOfLines={1} style={{ color: COLORS.text }}>
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
                          className="absolute top-2 right-2 p-1.5 rounded-full"
                          style={{ backgroundColor: COLORS.red }}
                        >
                          {loadingDelete === r.id ? (
                            <ActivityIndicator size="small" color={COLORS.text} />
                          ) : (
                            <Trash2 size={12} color={COLORS.text} />
                          )}
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </ScrollView>

              {/* Upload Button Footer */}
              <View 
                className="px-6 py-4"
                style={{
                  borderTopWidth: 1,
                  borderTopColor: COLORS.glassBorder,
                }}
              >
                <TouchableOpacity
                  onPress={() => {
                    setShowReceiptGallery(false);
                    setTimeout(() => {
                      handlePickImage();
                    }, 200);
                  }}
                  className="py-3.5 rounded-xl flex-row items-center justify-center gap-2"
                  style={{
                    backgroundColor: COLORS.orange,
                    shadowColor: COLORS.orange,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 5,
                  }}
                >
                  <Plus size={20} color={COLORS.text} />
                  <Text className="font-bold text-base" style={{ color: COLORS.text }}>Upload Receipt</Text>
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
        animationType="fade"
        onRequestClose={handleUploadCancel}
      >
        <View className="flex-1 justify-center items-center bg-black/70 px-4">
          <View 
            className="rounded-2xl p-6 w-full max-w-md overflow-hidden"
            style={{
              backgroundColor: COLORS.cardBg,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
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
            <Text className="text-lg font-semibold mb-2" style={{ color: COLORS.text }}>
              Label your receipt
            </Text>
            <Text className="text-sm mb-4" style={{ color: COLORS.textMuted }}>
              Leave blank to default to today&apos;s date.
            </Text>
            <TextInput
              value={receiptLabel}
              onChangeText={setReceiptLabel}
              placeholder="Enter receipt label"
              placeholderTextColor={COLORS.textMuted}
              className="px-4 py-3 rounded-xl mb-6"
              style={{
                backgroundColor: COLORS.surfaceSolid,
                color: COLORS.text,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            />
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleUploadCancel}
                className="flex-1 py-3 rounded-full"
                style={{
                  backgroundColor: COLORS.surfaceSolid,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleUploadConfirm}
                className="flex-1 py-3 rounded-full"
                style={{ backgroundColor: COLORS.orange }}
              >
                <Text className="text-center font-semibold" style={{ color: COLORS.text }}>Upload</Text>
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
          animationType="fade"
          onRequestClose={() => {
            setSelectedReceipt(null);
            if (viewerOpenedFromGallery) {
              setShowReceiptGallery(true);
              setViewerOpenedFromGallery(false);
            }
          }}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={() => {
              setSelectedReceipt(null);
              if (viewerOpenedFromGallery) {
                setShowReceiptGallery(true);
                setViewerOpenedFromGallery(false);
              }
            }}
            className="flex-1"
            style={{ backgroundColor: 'rgba(24, 24, 24, 0.95)' }}
          >
            <SafeAreaView className="flex-1 justify-center items-center p-4">
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
                  <View 
                    className="px-6 py-3 rounded-full mt-4 self-center"
                    style={{
                      backgroundColor: COLORS.surfaceSolid,
                      borderWidth: 1,
                      borderColor: COLORS.glassBorder,
                    }}
                  >
                    <Text className="font-semibold text-center text-base" style={{ color: COLORS.text }}>
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