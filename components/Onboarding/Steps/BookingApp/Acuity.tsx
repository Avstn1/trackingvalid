// components/Onboarding/Steps/BookingApp/Acuity.tsx
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import { Calendar, Info } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
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
  const [syncing, setSyncing] = useState(false)
  const [syncStarted, setSyncStarted] = useState(!!existingSync?.hasPending)
  const [totalPriorityMonths, setTotalPriorityMonths] = useState(0)
  const [syncComplete, setSyncComplete] = useState(false)
  const [syncStartTime, setSyncStartTime] = useState<number | null>(null)
  const [firstAppointment, setFirstAppointment] = useState<{ month: string; year: number; datetime: string } | null>(null)
  const [loadingFirstAppointment, setLoadingFirstAppointment] = useState(true)
  const [priorityMonthsInfo, setPriorityMonthsInfo] = useState<{ 
    startMonth: string
    startYear: number
    endMonth: string
    endYear: number 
  } | null>(null)

  // Load first appointment and check for existing sync on mount
  useEffect(() => {
    checkExistingSync()
    fetchFirstAppointment()
  }, [userId])

  const checkExistingSync = async () => {
    if (!userId) return

    try {
      // Check if priority syncs are already complete
      const { data: prioritySyncs, error } = await supabase
        .from('sync_status')
        .select('status')
        .eq('user_id', userId)
        .eq('sync_phase', 'priority')

      if (error) {
        console.error('Error checking existing syncs:', error)
        return
      }

      if (prioritySyncs && prioritySyncs.length > 0) {
        const allComplete = prioritySyncs.every(s => s.status === 'completed')
        
        if (allComplete) {
          console.log('Priority syncs already completed')
          setSyncComplete(true)
          setSyncStarted(false) // Don't show progress bar, just enable Next button
        }
      }
    } catch (error) {
      console.error('Error checking existing sync:', error)
    }
  }

  const fetchFirstAppointment = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setLoadingFirstAppointment(false)
        return
      }

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL

      const response = await fetch(`${apiBaseUrl}/api/onboarding/get-first-appointment`, {
        headers: {
          'x-client-access-token': accessToken,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch first appointment')
      }

      const data = await response.json()

      if (data.firstAppointment) {
        const first = data.firstAppointment
        const appointmentDate = new Date(first.datetime)
        const month = MONTHS[appointmentDate.getMonth()]
        const year = appointmentDate.getFullYear()

        setFirstAppointment({
          month,
          year,
          datetime: first.datetime
        })

        // Calculate priority months (last 12 months or less if first appointment is recent)
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()
        
        // Calculate months between first appointment and now
        const monthsSinceFirst = (currentYear - year) * 12 + (currentMonth - appointmentDate.getMonth()) + 1
        const priorityCount = Math.min(12, monthsSinceFirst)
        
        setTotalPriorityMonths(priorityCount)
        
        // Calculate the date range for priority months
        const priorityStartDate = new Date(now)
        priorityStartDate.setMonth(priorityStartDate.getMonth() - (priorityCount - 1))
        
        setPriorityMonthsInfo({
          startMonth: MONTHS[priorityStartDate.getMonth()],
          startYear: priorityStartDate.getFullYear(),
          endMonth: MONTHS[currentMonth],
          endYear: currentYear
        })
      }
    } catch (error) {
      console.error('Error fetching first appointment:', error)
    } finally {
      setLoadingFirstAppointment(false)
    }
  }

  // If there's an existing sync, skip and show progress
  useEffect(() => {
    if (existingSync?.hasPending) {
      setSyncStarted(true)
      setTotalPriorityMonths(existingSync.totalMonths)
    }
  }, [existingSync])

  const handleStartSync = async () => {
    if (!firstAppointment) {
      Toast.show({
        type: 'error',
        text1: 'Unable to determine sync range',
      })
      return
    }

    setSyncing(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL

      const response = await fetch(`${apiBaseUrl}/api/onboarding/trigger-sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': accessToken,
        },
        body: JSON.stringify({
          userId,
          startMonth: firstAppointment.month,
          startYear: firstAppointment.year,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start sync')
      }

      Toast.show({
        type: 'success',
        text1: `Starting sync for ${data.priorityMonths} priority months!`,
      })
      setTotalPriorityMonths(data.priorityMonths)
      setSyncStarted(true)
      setSyncStartTime(Date.now())
      onSyncStateChange(true)
    } catch (error) {
      console.error('Sync error:', error)
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to start sync')
    } finally {
      setSyncing(false)
    }
  }

  const handleRetry = async () => {
    // Clear sync status and restart
    setSyncStarted(false)
    setSyncComplete(false)
    setTotalPriorityMonths(0)
    handleStartSync()
  }

  const handleComplete = () => {
    setSyncComplete(true)
    onSyncStateChange(false)
    onSyncComplete()
    
    // Calculate sync duration
    if (syncStartTime) {
      const durationMs = Date.now() - syncStartTime
      const durationSeconds = (durationMs / 1000).toFixed(2)
      const durationMinutes = (durationMs / 60000).toFixed(2)
      console.log(`🎉 Priority sync completed in ${durationSeconds}s (${durationMinutes}min) for ${totalPriorityMonths} months`)
      console.log(`⏱️  Average time per month: ${(durationMs / totalPriorityMonths / 1000).toFixed(2)}s`)
    }
  }

  if (syncStarted) {
    return (
      <View style={{ gap: SPACING.md }}>
        <View style={{
          backgroundColor: COLORS.surfaceGlass,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          padding: SPACING.xl,
        }}>
          <Text style={{
            fontSize: FONT_SIZE.base,
            fontWeight: '700',
            color: COLORS.textPrimary,
            marginBottom: SPACING.md,
          }}>
            Syncing Priority Data
          </Text>
          
          <SyncProgressBar
            userId={userId}
            totalMonths={totalPriorityMonths}
            syncPhase="priority"
            onComplete={handleComplete}
          />

          {syncComplete && (
            <View style={{
              marginTop: SPACING.md,
              padding: SPACING.md,
              borderRadius: RADIUS.xl,
              borderWidth: 2,
              borderColor: COLORS.positive + '4D',
              backgroundColor: COLORS.positive + '1A',
            }}>
              <Text style={{
                fontSize: FONT_SIZE.sm,
                color: COLORS.positive,
                marginBottom: 2,
              }}>
                ✓ Priority sync completed successfully!
              </Text>
              <Text style={{
                fontSize: FONT_SIZE.xs,
                color: COLORS.positive,
              }}>
                Older data will continue syncing in the background. You'll receive a notification when complete.
              </Text>
            </View>
          )}

          {!syncComplete && (
            <TouchableOpacity
              onPress={handleRetry}
              style={{
                marginTop: SPACING.md,
                padding: SPACING.md,
                borderRadius: RADIUS.xl,
                borderWidth: 2,
                borderColor: COLORS.border,
                backgroundColor: COLORS.surfaceElevated,
                alignItems: 'center',
              }}
            >
              <Text style={{
                fontSize: FONT_SIZE.sm,
                fontWeight: '700',
                color: COLORS.textPrimary,
              }}>
                Retry
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    )
  }

  // If already complete (user navigated back), show the same completion UI
  if (syncComplete && !loadingFirstAppointment) {
    return (
      <View style={{ gap: SPACING.md }}>
        <View style={{
          backgroundColor: COLORS.surfaceGlass,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          padding: SPACING.xl,
        }}>
          <Text style={{
            fontSize: FONT_SIZE.base,
            fontWeight: '700',
            color: COLORS.textPrimary,
            marginBottom: SPACING.md,
          }}>
            Syncing Priority Data
          </Text>
          
          {/* Show progress bar at 100% */}
          <View style={{ gap: SPACING.sm, marginBottom: SPACING.md }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{
                fontSize: FONT_SIZE.sm,
                fontWeight: '600',
                color: COLORS.textPrimary,
              }}>
                Priority sync complete!
              </Text>
              <Text style={{
                fontSize: FONT_SIZE.base,
                fontWeight: '700',
                color: COLORS.primary,
              }}>
                100%
              </Text>
            </View>
            
            <View style={{
              width: '100%',
              height: 12,
              backgroundColor: COLORS.surfaceElevated,
              borderRadius: RADIUS.full,
              overflow: 'hidden',
              borderWidth: 1,
              borderColor: COLORS.border,
            }}>
              <View style={{
                height: '100%',
                width: '100%',
                backgroundColor: COLORS.primary,
                borderRadius: RADIUS.full,
              }} />
            </View>
          </View>
          
          <View style={{
            padding: SPACING.md,
            borderRadius: RADIUS.xl,
            borderWidth: 2,
            borderColor: COLORS.positive + '4D',
            backgroundColor: COLORS.positive + '1A',
          }}>
            <Text style={{
              fontSize: FONT_SIZE.sm,
              color: COLORS.positive,
              marginBottom: 2,
            }}>
              ✓ Priority sync completed successfully!
            </Text>
            <Text style={{
              fontSize: FONT_SIZE.xs,
              color: COLORS.positive,
            }}>
              Older data will continue syncing in the background. You'll receive a notification when complete.
            </Text>
          </View>
        </View>
      </View>
    )
  }

  // Show loading state while fetching first appointment
  if (loadingFirstAppointment) {
    return (
      <View style={{ gap: SPACING.md }}>
        <View style={{
          backgroundColor: COLORS.surfaceGlass,
          borderRadius: RADIUS.xl,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
          padding: SPACING.xl,
          alignItems: 'center',
          gap: SPACING.md,
        }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{
              fontSize: FONT_SIZE.base,
              fontWeight: '700',
              color: COLORS.textPrimary,
              marginBottom: SPACING.xs,
            }}>
              Finding your first appointment...
            </Text>
            <Text style={{
              fontSize: FONT_SIZE.sm,
              color: COLORS.textSecondary,
              textAlign: 'center',
            }}>
              This helps us sync your data accurately
            </Text>
          </View>
        </View>
      </View>
    )
  }

  return (
    <View style={{ gap: SPACING.md }}>
      <View style={{
        backgroundColor: COLORS.surfaceGlass,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        padding: SPACING.xl,
      }}>
        <View style={{ gap: SPACING.lg }}>
          {/* First Appointment Info */}
          {!loadingFirstAppointment && firstAppointment && (
            <View style={{
              padding: SPACING.sm,
              borderRadius: RADIUS.lg,
              borderWidth: 2,
              borderColor: 'rgba(34, 211, 238, 0.3)',
              backgroundColor: 'rgba(34, 211, 238, 0.1)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: 2 }}>
                <Calendar size={14} color="#22d3ee" />
                <Text style={{
                  fontSize: FONT_SIZE.xs,
                  fontWeight: '700',
                  color: '#a5f3fc',
                }}>
                  First Appointment
                </Text>
              </View>
              <Text style={{
                fontSize: FONT_SIZE.xs,
                color: COLORS.textSecondary,
                lineHeight: 14,
              }}>
                Found in{' '}
                <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
                  {firstAppointment.month} {firstAppointment.year}
                </Text>
              </Text>
            </View>
          )}

          {/* Sync Strategy Explanation */}
          {priorityMonthsInfo && (
            <View style={{ gap: SPACING.xs }}>
              <View style={{
                padding: SPACING.sm,
                borderRadius: RADIUS.lg,
                borderWidth: 2,
                borderColor: 'rgba(52, 211, 153, 0.4)',
                backgroundColor: 'rgba(52, 211, 153, 0.1)',
                flexDirection: 'row',
                gap: SPACING.xs,
              }}>
                <Info size={14} color="#34d399" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: FONT_SIZE.xs,
                    fontWeight: '700',
                    color: '#6ee7b7',
                    marginBottom: 2,
                  }}>
                    Smart Sync
                  </Text>
                  <Text style={{
                    fontSize: FONT_SIZE.xs,
                    color: COLORS.textSecondary,
                    lineHeight: 14,
                  }}>
                    Last{' '}
                    <Text style={{ fontWeight: '700', color: COLORS.textPrimary }}>
                      {totalPriorityMonths} months
                    </Text>
                    {' '}sync now. Older data syncs in background.
                  </Text>
                </View>
              </View>

              <View style={{
                padding: SPACING.sm,
                borderRadius: RADIUS.lg,
                borderWidth: 2,
                borderColor: 'rgba(251, 191, 36, 0.4)',
                backgroundColor: 'rgba(251, 191, 36, 0.1)',
                flexDirection: 'row',
                gap: SPACING.xs,
              }}>
                <Info size={14} color="#fbbf24" style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: FONT_SIZE.xs,
                    fontWeight: '700',
                    color: '#fcd34d',
                    marginBottom: 2,
                  }}>
                    Data Accuracy
                  </Text>
                  <Text style={{
                    fontSize: FONT_SIZE.xs,
                    color: COLORS.textSecondary,
                    lineHeight: 14,
                  }}>
                    Client metrics may be incomplete until full sync completes. You'll get a notification.
                  </Text>
                </View>
              </View>
            </View>
          )}

          <View>
            <Text style={{
              fontSize: FONT_SIZE.base,
              fontWeight: '700',
              color: COLORS.textPrimary,
              marginBottom: SPACING.xs,
            }}>
              Ready to Sync Your Data
            </Text>
            <Text style={{
              fontSize: FONT_SIZE.xs,
              color: COLORS.textSecondary,
              marginBottom: SPACING.md,
            }}>
              Click "Start Sync" to begin importing your appointment history.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleStartSync}
            disabled={syncing || !firstAppointment}
            style={{
              backgroundColor: syncing || !firstAppointment ? COLORS.surfaceElevated : COLORS.primary,
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              alignItems: 'center',
              shadowColor: syncing || !firstAppointment ? '#000' : COLORS.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: syncing || !firstAppointment ? 0 : 0.3,
              shadowRadius: 8,
              elevation: syncing || !firstAppointment ? 0 : 4,
            }}
          >
            {syncing ? (
              <ActivityIndicator color={COLORS.textSecondary} />
            ) : (
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '800',
                color: !firstAppointment ? COLORS.textTertiary : COLORS.textInverse,
                letterSpacing: 0.5,
              }}>
                Start Sync
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  )
}