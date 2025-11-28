import { supabase } from '@/utils/supabaseClient'
import { LinearGradient } from 'expo-linear-gradient'
import { CircleDollarSign } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native'

// Color Palette
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#FFFFFF',
  textMuted: 'rgba(255, 255, 255, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.2)',
  purple: '#9C27B0',
  purpleGlow: 'rgba(156, 39, 176, 0.2)',
  yellow: '#FFEB3B',
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const ITEM_WIDTH = 50
const MONTH_ITEM_WIDTH = 110
const SCREEN_WIDTH = Dimensions.get('window').width

interface DailyTipsDropdownProps {
  barberId: string
  onRefresh?: () => void
}

export default function DailyTipsDropdown({
  barberId,
  onRefresh,
}: DailyTipsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const currentDateNow = new Date()
  const [selectedDay, setSelectedDay] = useState<number>(currentDateNow.getDate())
  const [selectedMonth, setSelectedMonth] = useState<number>(currentDateNow.getMonth())
  const [selectedYear] = useState<number>(currentDateNow.getFullYear())
  const [tipAmount, setTipAmount] = useState<string>('')
  const [currentTips, setCurrentTips] = useState<number>(0)
  const [action, setAction] = useState<'replace' | 'add'>('add')
  const [loading, setLoading] = useState(false)

  const dayFlatListRef = useRef<FlatList>(null)
  const monthFlatListRef = useRef<FlatList>(null)
  const dayScrollX = useRef(new Animated.Value(0)).current
  const monthScrollX = useRef(new Animated.Value(0)).current
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null)

  const currentDay = currentDateNow.getDate()
  const currentMonthIndex = currentDateNow.getMonth()
  
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate()
  }
  
  const getMaxDayForMonth = (month: number) => {
    if (month === currentMonthIndex) {
      return currentDay
    } else {
      return getDaysInMonth(month, selectedYear)
    }
  }
  
  const maxDayForSelectedMonth = getMaxDayForMonth(selectedMonth)
  const daysInMonth = Array.from({ length: maxDayForSelectedMonth }, (_, i) => i + 1)
  
  const availableMonths = MONTHS.slice(0, currentMonthIndex + 1)

  const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`

  const month = MONTHS[selectedMonth]
  const year = selectedYear

  useEffect(() => {
    if (!barberId || !isOpen) return

    const fetchTips = async () => {
      try {
        const { data, error } = await supabase
          .from('daily_data')
          .select('tips')
          .eq('user_id', barberId)
          .eq('date', dateStr)
          .maybeSingle()

        if (error) throw error
        setCurrentTips(data?.tips ?? 0)
      } catch (err) {
        console.error(err)
      }
    }

    fetchTips()
  }, [barberId, dateStr, isOpen])

  useEffect(() => {
    if (isOpen) {
      const today = currentDateNow.getDate()
      const currentMonth = currentDateNow.getMonth()
      
      setSelectedDay(today)
      setSelectedMonth(currentMonth)
      
      dayScrollX.setValue((today - 1) * ITEM_WIDTH)
      monthScrollX.setValue(currentMonth * MONTH_ITEM_WIDTH)
    }
  }, [isOpen])

  useEffect(() => {
    const maxDay = getMaxDayForMonth(selectedMonth)
    if (selectedDay > maxDay) {
      setSelectedDay(maxDay)
      dayScrollX.setValue((maxDay - 1) * ITEM_WIDTH)
      setTimeout(() => {
        dayFlatListRef.current?.scrollToOffset({
          offset: (maxDay - 1) * ITEM_WIDTH,
          animated: true,
        })
      }, 100)
    }
  }, [selectedMonth])

  const handleDayScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / ITEM_WIDTH)
    const day = index + 1
    
    if (day >= 1 && day <= maxDayForSelectedMonth) {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
      scrollTimeout.current = setTimeout(() => {
        setSelectedDay(day)
      }, 50)
    }
  }

  const handleMonthScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x
    const index = Math.round(offsetX / MONTH_ITEM_WIDTH)
    
    if (index >= 0 && index <= currentMonthIndex) {
      if (scrollTimeout.current) {
        clearTimeout(scrollTimeout.current)
      }
      scrollTimeout.current = setTimeout(() => {
        setSelectedMonth(index)
      }, 50)
    }
  }

  const handleDayTap = (day: number) => {
    setSelectedDay(day)
    dayFlatListRef.current?.scrollToOffset({
      offset: (day - 1) * ITEM_WIDTH,
      animated: true,
    })
  }

  const handleMonthTap = (monthIndex: number) => {
    setSelectedMonth(monthIndex)
    monthFlatListRef.current?.scrollToOffset({
      offset: monthIndex * MONTH_ITEM_WIDTH,
      animated: true,
    })
  }

  async function handleSaveTips() {
    if (tipAmount === '') {
      return
    }

    try {
      setLoading(true)
      const newTotal =
        action === 'add' ? currentTips + Number(tipAmount) : Number(tipAmount)

      const { error } = await supabase.from('daily_data').upsert(
        {
          user_id: barberId,
          date: dateStr,
          tips: newTotal,
          updated_at: new Date().toISOString(),
          year,
          month: MONTHS[selectedMonth],
          final_revenue: 0,
        },
        { onConflict: 'user_id,date' }
      )

      if (error) throw error

      setCurrentTips(newTotal)

      const { error: insertError } = await supabase
        .from('system_logs')
        .insert({
          source: barberId,
          action: 'add_tips',
          status: 'success',
          details: `Tips added`,
        })

      if (insertError) throw insertError

      setTipAmount('')
      onRefresh?.()
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleNumericChange = (value: string) => {
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setTipAmount(value)
    }
  }

  const renderDayItem = ({ item, index }: { item: number; index: number }) => {
    const inputRange = [
      (index - 2) * ITEM_WIDTH,
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
      (index + 2) * ITEM_WIDTH,
    ]

    const scale = dayScrollX.interpolate({
      inputRange,
      outputRange: [0.6, 0.8, 1.1, 0.8, 0.6],
      extrapolate: 'clamp',
    })

    const opacity = dayScrollX.interpolate({
      inputRange,
      outputRange: [0.3, 0.6, 1, 0.6, 0.3],
      extrapolate: 'clamp',
    })

    return (
      <TouchableOpacity onPress={() => handleDayTap(item)} activeOpacity={0.7}>
        <Animated.View
          style={{
            width: ITEM_WIDTH,
            transform: [{ scale }],
            opacity,
          }}
          className="items-center justify-center h-16"
        >
          <Text
            className="text-xl font-bold"
            style={{ color: COLORS.text }}
          >
            {item}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  const renderMonthItem = ({ item, index }: { item: string; index: number }) => {
    const inputRange = [
      (index - 2) * MONTH_ITEM_WIDTH,
      (index - 1) * MONTH_ITEM_WIDTH,
      index * MONTH_ITEM_WIDTH,
      (index + 1) * MONTH_ITEM_WIDTH,
      (index + 2) * MONTH_ITEM_WIDTH,
    ]

    const scale = monthScrollX.interpolate({
      inputRange,
      outputRange: [0.7, 0.85, 1.15, 0.85, 0.7],
      extrapolate: 'clamp',
    })

    const opacity = monthScrollX.interpolate({
      inputRange,
      outputRange: [0.3, 0.6, 1, 0.6, 0.3],
      extrapolate: 'clamp',
    })

    return (
      <TouchableOpacity onPress={() => handleMonthTap(index)} activeOpacity={0.7}>
        <Animated.View
          style={{
            width: MONTH_ITEM_WIDTH,
            transform: [{ scale }],
            opacity,
          }}
          className="items-center justify-center h-14"
        >
          <Text
            className="text-lg font-bold"
            style={{ color: COLORS.text }}
          >
            {item}
          </Text>
        </Animated.View>
      </TouchableOpacity>
    )
  }

  return (
    <View>
      {/* Main trigger button - Icon only */}
      <TouchableOpacity
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
        className="w-10 h-10 rounded-full items-center justify-center"
      >
        <CircleDollarSign  size={27} color={COLORS.text} />
      </TouchableOpacity>

      {/* Main Modal */}
      <Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setIsOpen(false)}>
          <View className="flex-1 justify-center items-center bg-black/70 px-4">
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View 
                className="rounded-3xl p-6 w-full max-w-md overflow-hidden"
                style={{
                  backgroundColor: COLORS.cardBg,
                  borderWidth: 1,
                  borderColor: COLORS.glassBorder,
                }}
              >
                {/* Top highlight line */}
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

                <Text 
                  className="font-semibold text-base mb-4 text-center"
                  style={{ color: COLORS.orange }}
                >
                  Tips for {month} {selectedDay}, {year}
                </Text>

                {/* Month Picker */}
                <View 
                  className="rounded-xl overflow-hidden h-14 mb-3"
                  style={{
                    backgroundColor: COLORS.surfaceSolid,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <FlatList
                    ref={monthFlatListRef}
                    data={availableMonths}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={MONTH_ITEM_WIDTH}
                    decelerationRate="fast"
                    scrollEnabled={true}
                    initialScrollIndex={currentMonthIndex}
                    contentContainerStyle={{
                      paddingHorizontal: (SCREEN_WIDTH - 80) / 2 - MONTH_ITEM_WIDTH / 2,
                    }}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: monthScrollX } } }],
                      {
                        useNativeDriver: false,
                        listener: handleMonthScroll,
                      }
                    )}
                    scrollEventThrottle={16}
                    keyExtractor={(item, index) => index.toString()}
                    renderItem={renderMonthItem}
                    getItemLayout={(_, index) => ({
                      length: MONTH_ITEM_WIDTH,
                      offset: MONTH_ITEM_WIDTH * index,
                      index,
                    })}
                  />
                </View>

                {/* Day Picker */}
                <View 
                  className="rounded-xl overflow-hidden h-16 mb-4"
                  style={{
                    backgroundColor: COLORS.surfaceSolid,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <FlatList
                    ref={dayFlatListRef}
                    data={daysInMonth}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    snapToInterval={ITEM_WIDTH}
                    decelerationRate="fast"
                    scrollEnabled={true}
                    initialScrollIndex={currentDay - 1}
                    contentContainerStyle={{
                      paddingHorizontal: (SCREEN_WIDTH - 80 - ITEM_WIDTH) / 2,
                    }}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: dayScrollX } } }],
                      {
                        useNativeDriver: false,
                        listener: handleDayScroll,
                      }
                    )}
                    scrollEventThrottle={16}
                    keyExtractor={(item) => item.toString()}
                    renderItem={renderDayItem}
                    getItemLayout={(_, index) => ({
                      length: ITEM_WIDTH,
                      offset: ITEM_WIDTH * index,
                      index,
                    })}
                  />
                </View>

                {/* Current Tips - Hero Card with Gradient */}
                <View 
                  className="rounded-2xl mb-4 overflow-hidden"
                  style={{
                    shadowColor: COLORS.orange,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                >
                  <LinearGradient
                    colors={[COLORS.purple, COLORS.orange]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 2, borderRadius: 16 }}
                  >
                    <View 
                      className="rounded-xl py-4 px-4"
                      style={{ backgroundColor: COLORS.cardBg }}
                    >
                      <Text className="text-xs text-center mb-1" style={{ color: COLORS.textMuted }}>
                        Current Total
                      </Text>
                      <Text className="text-3xl font-bold text-center" style={{ color: COLORS.text }}>
                        ${currentTips.toFixed(2)}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>

                {/* Input field */}
                <View className="mb-4">
                  <Text className="text-xs mb-2" style={{ color: COLORS.textMuted }}>
                    Tip Amount ($)
                  </Text>
                  <TextInput
                    value={tipAmount}
                    onChangeText={handleNumericChange}
                    placeholder="Enter amount"
                    placeholderTextColor={COLORS.textMuted}
                    keyboardType="decimal-pad"
                    onSubmitEditing={Keyboard.dismiss}
                    className="rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: COLORS.surfaceSolid,
                      borderWidth: 1,
                      borderColor: COLORS.glassBorder,
                      color: COLORS.text,
                    }}
                  />
                </View>

                {/* Replace/Add Toggle */}
                <View 
                  className="flex-row rounded-xl p-1 mb-4"
                  style={{
                    backgroundColor: COLORS.surfaceSolid,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setAction('replace')}
                    className="flex-1 py-2 rounded-lg"
                    style={{
                      backgroundColor: action === 'replace' ? COLORS.purpleGlow : 'transparent',
                    }}
                  >
                    <Text
                      className="text-center text-xs font-semibold"
                      style={{ color: action === 'replace' ? COLORS.purple : COLORS.textMuted }}
                    >
                      Replace
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAction('add')}
                    className="flex-1 py-2 rounded-lg"
                    style={{
                      backgroundColor: action === 'add' ? COLORS.orangeGlow : 'transparent',
                    }}
                  >
                    <Text
                      className="text-center text-xs font-semibold"
                      style={{ color: action === 'add' ? COLORS.orange : COLORS.textMuted }}
                    >
                      Add
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Action Buttons Row */}
                <View className="flex-row gap-3">
                  {/* Close Button */}
                  <TouchableOpacity
                    onPress={() => setIsOpen(false)}
                    className="flex-1 py-3 rounded-full"
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

                  {/* Save Button */}
                  <TouchableOpacity
                    onPress={handleSaveTips}
                    disabled={loading}
                    className="flex-1 py-3 rounded-full"
                    style={{
                      backgroundColor: COLORS.orange,
                      opacity: loading ? 0.6 : 1,
                      shadowColor: COLORS.orange,
                      shadowOffset: { width: 0, height: 0 },
                      shadowOpacity: 0.4,
                      shadowRadius: 12,
                      elevation: 5,
                    }}
                  >
                    {loading ? (
                      <ActivityIndicator color={COLORS.text} />
                    ) : (
                      <Text className="text-center font-semibold" style={{ color: COLORS.text }}>
                        Save Tips
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  )
}