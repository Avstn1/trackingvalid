import ReportViewerModal from '@/components/Reports/ReportViewerModal'
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'expo-router'
import { Bell } from 'lucide-react-native'
import React, { useCallback, useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import Toast from 'react-native-toast-message'

// Color Palette
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
  greenGlow: '#beb348ff',
  greenLight: '#48ad4d1a',
}

// Helper function to format relative time
const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60,
    second: 1
  }
  
  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit)
    if (interval >= 1) {
      return interval === 1 
        ? `${interval} ${unit} ago` 
        : `${interval} ${unit}s ago`
    }
  }
  
  return 'just now'
}

interface Notification {
  id: string
  header: string
  message: string
  is_read: boolean
  created_at: string
  reference?: string
  reference_type?: string
}

interface Report {
  id: string
  content: string
  month: string
  year: number
  type?: 'weekly' | 'monthly' | 'weekly_comparison'
  week_number?: number
  title?: string
}

interface NotificationsDropdownProps {
  userId: string
}

export default function NotificationsDropdown({ userId }: NotificationsDropdownProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [reportModalVisible, setReportModalVisible] = useState(false)
  const router = useRouter()

  const translateY = useSharedValue(0)
  const opacity = useSharedValue(0)

  const fetchNotifications = useCallback(async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(15)

      if (error) console.error('Failed to fetch notifications:', error)

      const mapped = (data || []).map(item => ({
        id: item.id,
        header: item.header,
        message: item.message,
        is_read: item.read === true,
        created_at: item.timestamp,
        reference: item.reference,
        reference_type: item.reference_type
      }))

      setNotifications(mapped)
    } catch (err) {
      console.error(err)
    }
  }, [userId])

  useEffect(() => {
    if (userId) fetchNotifications()
  }, [userId, fetchNotifications])

  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newN = payload.new as any

          const formatted: Notification = {
            id: newN.id,
            header: newN.header,
            message: newN.message,
            is_read: newN.read === true,
            created_at: newN.timestamp,
            reference: newN.reference,
            reference_type: newN.reference_type
          }

          setNotifications((prev) => [formatted, ...prev])
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  // Animate modal open
  useEffect(() => {
    if (open) {
      translateY.value = 1000
      opacity.value = 0
      translateY.value = withTiming(0, { duration: 250 })
      opacity.value = withTiming(1, { duration: 250 })
    }
  }, [open, translateY, opacity])

  const closeModal = useCallback(() => {
    if (isClosing) return
    setIsClosing(true)
    translateY.value = withTiming(1000, { duration: 250 })
    opacity.value = withTiming(0, { duration: 250 })
    setTimeout(() => {
      setOpen(false)
      setIsClosing(false)
      translateY.value = 0
    }, 250)
  }, [translateY, opacity, isClosing])

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY
        const progress = Math.min(event.translationY / 300, 1)
        opacity.value = 1 - progress
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(closeModal)()
      } else {
        translateY.value = withTiming(0, { duration: 200 })
        opacity.value = withTiming(1, { duration: 200 })
      }
    })

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }]
  }))

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value
  }))

  const handleClickNotification = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from('notifications').update({ read: true }).eq('id', n.id)
      setNotifications((prev) => 
        prev.map((notif) => notif.id === n.id ? { ...notif, is_read: true } : notif)
      )
    }

    setOpen(false)

    const reportTypes = ['weekly', 'monthly', 'weekly_comparison']
    if (n.reference && n.reference_type && reportTypes.includes(n.reference_type)) {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .eq('id', n.reference)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            console.error('Report not found:', n.reference)
            Toast.show({
              type: 'error',
              text1: 'Report Not Found',
              text2: 'This report could not be found. It may have been deleted.',
              position: 'top',
              topOffset: 60,
              visibilityTime: 4000
            })
            return
          }
          console.error('Error fetching report:', error)
          Toast.show({
            type: 'error',
            text1: 'Error Loading Report',
            text2: 'An error occurred while loading the report. Please try again.',
            position: 'top',
            topOffset: 60,
            visibilityTime: 4000
          })
          return
        }

        if (data) {
          const report: Report = {
            id: data.id,
            content: data.content || '',
            month: data.month || '',
            year: data.year || new Date().getFullYear(),
            type: data.type,
            week_number: data.week_number,
            title: data.title
          }

          setSelectedReport(report)
          setReportModalVisible(true)
        }
      } catch (err) {
        console.error('Error fetching report:', err)
        Toast.show({
          type: 'error',
          text1: 'Error Loading Report',
          text2: 'An unexpected error occurred. Please try again.',
          position: 'top',
          topOffset: 60,
          visibilityTime: 4000
        })
      }
    }
  }

  const handleCloseReportModal = () => {
    setReportModalVisible(false)
    setSelectedReport(null)
  }

  const handleMarkAllRead = async () => {
    await supabase.from('notifications').update({ read: true }).eq('user_id', userId)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length

  return (
    <>
      <View className="relative">
        <Pressable
          className="relative p-2 rounded-full active:bg-white/10"
          onPress={() => setOpen(!open)}
        >
          <Bell color={COLORS.text} size={24} />
          {unreadCount > 0 && (
            <View 
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
              style={{ 
                backgroundColor: COLORS.green,
                shadowColor: COLORS.green,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
                elevation: 3,
              }}
            >
              <Text className="text-white text-[10px] font-bold">
                {unreadCount}
              </Text>
            </View>
          )}
        </Pressable>

        <Modal
          visible={open}
          transparent
          animationType="none"
          onRequestClose={closeModal}
          statusBarTranslucent
        >
          <GestureHandlerRootView style={{ flex: 1 }}>
            <Animated.View style={[{ flex: 1 }, backdropStyle]}>
              <Pressable 
                className="flex-1"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
                onPress={closeModal}
              >
                <GestureDetector gesture={panGesture}>
                  <Animated.View 
                    style={[
                      animatedStyle,
                      { 
                        backgroundColor: COLORS.surfaceSolid,
                        borderTopWidth: 1,
                        borderTopColor: COLORS.glassBorder,
                      }
                    ]}
                    className="absolute bottom-0 left-0 right-0 rounded-t-3xl max-h-[80%]"
                  >
                    <Pressable onPress={(e) => e.stopPropagation()}>
                      {/* Handle bar */}
                      <View className="items-center pt-4 pb-2">
                        <View 
                          className="w-12 h-1.5 rounded-full"
                          style={{ backgroundColor: COLORS.glassBorder }}
                        />
                      </View>

                      {/* Header */}
                      <View 
                        className="flex-row justify-between items-center px-6 py-4"
                        style={{ borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder }}
                      >
                        <Text 
                          className="font-semibold text-base tracking-wide"
                          style={{ color: COLORS.green }}
                        >
                          Notifications
                        </Text>
                        <TouchableOpacity
                          onPress={handleMarkAllRead}
                          activeOpacity={0.6}
                          className="px-2 py-1"
                        >
                          <Text 
                            className="text-xs font-medium"
                            style={{ color: COLORS.textMuted }}
                          >
                            Mark all read
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Notifications list */}
                      {notifications.length === 0 ? (
                        <View className="p-12 items-center">
                          <Bell color={COLORS.textMuted} size={32} strokeWidth={1.5} />
                          <Text className="text-sm mt-3" style={{ color: COLORS.textMuted }}>
                            No notifications
                          </Text>
                        </View>
                      ) : (
                        <ScrollView 
                          className="px-4"
                          showsVerticalScrollIndicator={false}
                          contentContainerStyle={{ paddingBottom: 32, paddingTop: 8 }}
                        >
                          {notifications.map((n) => (
                            <TouchableOpacity
                              key={n.id}
                              onPress={() => handleClickNotification(n)}
                              activeOpacity={0.7}
                              className="px-4 py-3.5 rounded-xl mb-2"
                              style={{
                                backgroundColor: !n.is_read ? COLORS.greenLight : COLORS.surface,
                                borderWidth: 1,
                                borderColor: !n.is_read ? COLORS.green : COLORS.glassBorder,
                              }}
                            >
                              <Text 
                                className="text-sm mb-1"
                                style={{ 
                                  color: COLORS.text,
                                  fontWeight: !n.is_read ? '600' : '400'
                                }}
                              >
                                {n.header}
                              </Text>
                              <Text 
                                className="text-xs mb-2 leading-5"
                                style={{ color: COLORS.textMuted }}
                              >
                                {n.message}
                              </Text>
                              <Text 
                                className="text-[10px]"
                                style={{ color: COLORS.textMuted, opacity: 0.7 }}
                              >
                                {getRelativeTime(n.created_at)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      )}
                    </Pressable>
                  </Animated.View>
                </GestureDetector>
              </Pressable>
            </Animated.View>
          </GestureHandlerRootView>
        </Modal>
      </View>

      {/* Report Viewer Modal */}
      <ReportViewerModal
        report={selectedReport}
        visible={reportModalVisible}
        onClose={handleCloseReportModal}
      />

      {/* Toast Component */}
      <Toast />
    </>
  )
}