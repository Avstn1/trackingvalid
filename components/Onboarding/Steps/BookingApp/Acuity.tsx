// components/Onboarding/Steps/BookingApp/Acuity.tsx
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import DateTimePicker from '@react-native-community/datetimepicker'
import { format } from 'date-fns'
import { ChevronDown } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'
import SyncProgressBar from '../SyncProgressBar'

interface AcuityProps {
  userId: string
  onSyncComplete: () => void
  onSyncStateChange: (isSyncing: boolean) => void
  existingSync: {
    hasPending: boolean
    totalMonths: number
  } | null
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

export default function Acuity({ userId, onSyncComplete, onSyncStateChange, existingSync }: AcuityProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const date = new Date()
    date.setDate(1) // Always set to first of month
    return date
  })
  const [syncing, setSyncing] = useState(false)
  const [syncStarted, setSyncStarted] = useState(!!existingSync?.hasPending)
  const [totalMonths, setTotalMonths] = useState(existingSync?.totalMonths || 0)
  const [syncComplete, setSyncComplete] = useState(false)
  const [completedSyncs, setCompletedSyncs] = useState<{ month: string; year: number }[]>([])
  const [loadingCompleted, setLoadingCompleted] = useState(true)
  const [syncedRange, setSyncedRange] = useState<{ earliest: string; latest: string; count: number } | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [tempDate, setTempDate] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date
  })

  useEffect(() => {
    fetchCompletedSyncs()
  }, [userId])

  useEffect(() => {
    if (completedSyncs.length > 0) {
      const sorted = [...completedSyncs].sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year
        return MONTHS.indexOf(a.month) - MONTHS.indexOf(b.month)
      })
      const earliest = sorted[0]
      const latest = sorted[sorted.length - 1]
      
      const range = {
        earliest: `${earliest.month} ${earliest.year}`,
        latest: `${latest.month} ${latest.year}`,
        count: sorted.length
      }
      setSyncedRange(range)
    }
  }, [completedSyncs])

  const fetchCompletedSyncs = async () => {
    try {
      const { data, error } = await supabase
        .from('sync_status')
        .select('month, year')
        .eq('user_id', userId)
        .eq('status', 'completed')

      if (error) throw error

      // Month is already a string name from the database, no need to convert
      const syncs = data?.map(row => ({
        month: row.month,
        year: row.year
      })) || []

      setCompletedSyncs(syncs)
    } catch (error) {
      console.error('Error fetching completed syncs:', error)
    } finally {
      setLoadingCompleted(false)
    }
  }

  const handleDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false)
    }
    if (date) {
      const lockedDate = new Date(date)
      lockedDate.setDate(1) // Always lock to 1st of month
      setTempDate(lockedDate)
    }
  }

  const handleConfirmDate = () => {
    setSelectedDate(tempDate)
    setShowDatePicker(false)
  }

  const handleCancelDate = () => {
    setTempDate(selectedDate)
    setShowDatePicker(false)
  }

  const handleStartSync = async () => {
    const selectedMonth = MONTHS[selectedDate.getMonth()]
    const selectedYear = selectedDate.getFullYear()

    const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL

    setSyncing(true)
    onSyncStateChange(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const response = await fetch(`${apiBaseUrl}/api/onboarding/trigger-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': accessToken,
        },
        body: JSON.stringify({
          userId,
          startMonth: selectedMonth,
          startYear: selectedYear,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start sync')
      }

      // API returns totalMonths, not monthsToSync
      const monthsToSync = data.totalMonths || data.monthsToSync || 0

      if (monthsToSync === 0) {
        Toast.show({
          type: 'info',
          text1: 'All months already synced!',
        })
        setSyncing(false)
        onSyncStateChange(false)
        return
      }

      setTotalMonths(monthsToSync)
      setSyncStarted(true)
      Toast.show({
        type: 'success',
        text1: `Syncing ${monthsToSync} months...`,
      })
    } catch (error) {
      console.error('Error starting sync:', error)
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start sync')
      setSyncing(false)
      onSyncStateChange(false)
    }
  }

  const handleSyncComplete = async () => {
    setSyncComplete(true)
    setSyncing(false)
    onSyncStateChange(false)
    onSyncComplete()
    
    await fetchCompletedSyncs()
    
    setTimeout(() => {
      setSyncStarted(false)
      setSyncComplete(false)
    }, 2000)
  }

  const normalizedDate = new Date(tempDate)
  normalizedDate.setDate(1)

  const minYear = new Date().getFullYear() - 10
  const today = new Date()
  today.setDate(1) // Lock today to 1st for comparison

  return (
    <View style={{ gap: SPACING.md }}>
      {/* Date Picker Modal */}
      <Modal
        visible={showDatePicker}
        transparent
        animationType="slide"
        onRequestClose={handleConfirmDate}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={handleConfirmDate}
          style={{
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: COLORS.overlay,
          }}
        >
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <View style={{
              backgroundColor: COLORS.surface,
              borderTopLeftRadius: RADIUS.xl,
              borderTopRightRadius: RADIUS.xl,
              paddingBottom: Platform.OS === 'ios' ? 40 : SPACING.xl,
            }}>
              <View style={{
                padding: SPACING.lg,
                borderBottomWidth: 1,
                borderBottomColor: COLORS.border,
              }}>
                <Text style={{
                  fontSize: FONT_SIZE.lg,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                  textAlign: 'center',
                }}>
                  Select Month & Year
                </Text>
                <Text style={{
                  fontSize: FONT_SIZE.sm,
                  color: COLORS.textSecondary,
                  textAlign: 'center',
                  marginTop: SPACING.xs,
                }}>
                  We only need the month and year (day will be set to 1st)
                </Text>
              </View>

              <View style={{ 
                paddingVertical: SPACING.lg,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <DateTimePicker
                  value={normalizedDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  minimumDate={new Date(minYear, 0, 1)}
                  maximumDate={today}
                  textColor={COLORS.textPrimary}
                  themeVariant="dark"
                  style={{ width: '100%' }}
                />
              </View>

              <View style={{
                flexDirection: 'row',
                gap: SPACING.md,
                paddingHorizontal: SPACING.lg,
              }}>
                <TouchableOpacity
                  onPress={handleCancelDate}
                  style={{
                    flex: 1,
                    padding: SPACING.md,
                    borderRadius: RADIUS.xl,
                    borderWidth: 2,
                    borderColor: COLORS.border,
                    backgroundColor: COLORS.surfaceElevated,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{
                    fontSize: FONT_SIZE.base,
                    fontWeight: '700',
                    color: COLORS.textPrimary,
                  }}>
                    Cancel
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmDate}
                  style={{
                    flex: 1,
                    padding: SPACING.md,
                    borderRadius: RADIUS.xl,
                    backgroundColor: COLORS.primary,
                    alignItems: 'center',
                    shadowColor: COLORS.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 4,
                  }}
                >
                  <Text style={{
                    fontSize: FONT_SIZE.base,
                    fontWeight: '800',
                    color: COLORS.textInverse,
                    letterSpacing: 0.5,
                  }}>
                    Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Glass Container */}
      <View style={{
        backgroundColor: COLORS.surfaceGlass,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        padding: SPACING.xl,
      }}>
      <View style={{ gap: SPACING.lg }}>

      {syncedRange && (
        <View style={{
          padding: SPACING.lg,
          borderRadius: RADIUS.xl,
          borderWidth: 2,
          borderColor: COLORS.positive,
          backgroundColor: COLORS.positiveMuted,
        }}>
          <Text style={{
            fontSize: FONT_SIZE.base,
            fontWeight: '700',
            color: COLORS.positive,
            marginBottom: SPACING.sm,
          }}>
            ✓ Synced Data Range
          </Text>
          <Text style={{
            fontSize: FONT_SIZE.sm,
            color: COLORS.positive,
            marginBottom: 4,
          }}>
            {syncedRange.count} month{syncedRange.count !== 1 ? 's' : ''} of data
          </Text>
          <Text style={{
            fontSize: FONT_SIZE.sm,
            color: COLORS.textPrimary,
            fontWeight: '600',
          }}>
            {syncedRange.count === 1 
              ? syncedRange.earliest
              : `${syncedRange.earliest} – ${syncedRange.latest}`
            }
          </Text>
        </View>
      )}

      {syncStarted ? (
        <View>
          <SyncProgressBar
            userId={userId}
            totalMonths={totalMonths}
            onComplete={handleSyncComplete}
          />
          {syncComplete && (
            <View style={{
              marginTop: SPACING.md,
              padding: SPACING.md,
              borderRadius: RADIUS.md,
              backgroundColor: COLORS.positiveMuted,
              alignItems: 'center',
            }}>
              <Text style={{
                fontSize: FONT_SIZE.sm,
                fontWeight: '600',
                color: COLORS.positive,
              }}>
                Sync Complete!
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ gap: SPACING.lg }}>
          <View>
            <Text style={{
              fontSize: FONT_SIZE.lg,
              fontWeight: '700',
              color: COLORS.textPrimary,
            }}>
              {completedSyncs.length > 0 ? 'Sync Additional Data' : 'When did you start using Acuity?'}
            </Text>
            <Text style={{
              fontSize: FONT_SIZE.sm,
              color: COLORS.textSecondary,
              marginTop: SPACING.xs,
            }}>
              Select month and year to sync your historical data
            </Text>
          </View>

          <View>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: SPACING.lg,
                borderRadius: RADIUS.xl,
                borderWidth: 2,
                borderColor: COLORS.border,
                backgroundColor: COLORS.surfaceElevated,
              }}
            >
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '700',
                color: COLORS.textPrimary,
              }}>
                {format(selectedDate, 'MMMM yyyy')}
              </Text>
              <ChevronDown size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {(() => {
            const selectedMonth = MONTHS[selectedDate.getMonth()]
            const selectedYear = selectedDate.getFullYear()
            const isAlreadySynced = completedSyncs.some(
              sync => sync.month === selectedMonth && sync.year === selectedYear
            )

            return (
              <>
                <TouchableOpacity
                  onPress={handleStartSync}
                  disabled={syncing || isAlreadySynced}
                  style={{
                    backgroundColor: syncing || isAlreadySynced ? COLORS.surfaceElevated : COLORS.primary,
                    padding: SPACING.lg,
                    borderRadius: RADIUS.xl,
                    alignItems: 'center',
                    shadowColor: syncing || isAlreadySynced ? '#000' : COLORS.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: syncing || isAlreadySynced ? 0 : 0.3,
                    shadowRadius: 8,
                    elevation: syncing || isAlreadySynced ? 0 : 4,
                  }}
                >
                  {syncing ? (
                    <ActivityIndicator color={COLORS.textSecondary} />
                  ) : (
                    <Text style={{
                      fontSize: FONT_SIZE.lg,
                      fontWeight: '800',
                      color: isAlreadySynced ? COLORS.textTertiary : COLORS.textInverse,
                      letterSpacing: 0.5,
                    }}>
                      {isAlreadySynced ? 'Already Synced' : 'Start Sync'}
                    </Text>
                  )}
                </TouchableOpacity>

                {isAlreadySynced && (
                  <View style={{
                    padding: SPACING.md,
                    borderRadius: RADIUS.md,
                    backgroundColor: COLORS.infoMuted,
                    borderWidth: 1,
                    borderColor: COLORS.info,
                  }}>
                    <Text style={{
                      fontSize: FONT_SIZE.sm,
                      color: COLORS.textPrimary,
                      textAlign: 'center',
                    }}>
                      This month has already been synced. Select a different month to sync additional data.
                    </Text>
                  </View>
                )}
              </>
            )
          })()}
        </View>
      )}
      </View>
      </View>
    </View>
  )
}