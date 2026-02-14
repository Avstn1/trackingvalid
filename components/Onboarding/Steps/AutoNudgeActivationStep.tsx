// components/Onboarding/Steps/AutoNudgeActivationStep.tsx
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import { Check } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'

interface AutoNudgeActivationStepProps {
  onBack: () => void
  onFinish: () => void
  profileLoading: boolean
}

export default function AutoNudgeActivationStep({
  onBack,
  onFinish,
  profileLoading,
}: AutoNudgeActivationStepProps) {
  const [loading, setLoading] = useState(true)
  const [activating, setActivating] = useState(false)
  const [openingsCount, setOpeningsCount] = useState<number | null>(null)
  const [userId, setUserId] = useState<string>('')
  const [alreadyEnabled, setAlreadyEnabled] = useState(false)
  const [firstNudgeDate, setFirstNudgeDate] = useState<string>('')
  const [isBarelyLate, setIsBarelyLate] = useState(false)

  useEffect(() => {
    checkOpenings()
  }, [])

  const calculateFirstNudgeDate = (enabledDateUTC: string): string => {
    if (!enabledDateUTC) {
      console.error('calculateFirstNudgeDate called with empty date')
      return 'Date unavailable'
    }

    try {
      // Parse the UTC timestamp
      const utcDate = new Date(enabledDateUTC)
      
      // Convert to Toronto timezone by using toLocaleString to get the parts
      const torontoParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(utcDate)
      
      const partsMap: Record<string, string> = {}
      torontoParts.forEach(part => {
        if (part.type !== 'literal') {
          partsMap[part.type] = part.value
        }
      })
      
      // Create date using Toronto time components
      const torontoTime = new Date(
        parseInt(partsMap.year),
        parseInt(partsMap.month) - 1,
        parseInt(partsMap.day),
        parseInt(partsMap.hour),
        parseInt(partsMap.minute),
        parseInt(partsMap.second)
      )
      
      const dayOfWeek = torontoTime.getDay() // 0 = Sunday, 1 = Monday, etc.
      const hour = torontoTime.getHours()
      
      // Get current time in Toronto using same method
      const nowTorontoParts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      }).formatToParts(new Date())
      
      const nowPartsMap: Record<string, string> = {}
      nowTorontoParts.forEach(part => {
        if (part.type !== 'literal') {
          nowPartsMap[part.type] = part.value
        }
      })
      
      let targetDate = new Date(
        parseInt(nowPartsMap.year),
        parseInt(nowPartsMap.month) - 1,
        parseInt(nowPartsMap.day),
        parseInt(nowPartsMap.hour),
        parseInt(nowPartsMap.minute),
        parseInt(nowPartsMap.second)
      )
      
      // Monday after 10am to Wednesday: send tomorrow
      if ((dayOfWeek === 1 && hour >= 10) || dayOfWeek === 2 || dayOfWeek === 3) {
        targetDate = new Date(torontoTime)
        targetDate.setDate(targetDate.getDate() + 1)
      } 
      // Thursday to Sunday: send next Monday
      else if (dayOfWeek >= 4 || dayOfWeek === 0) {
        const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek
        targetDate.setDate(targetDate.getDate() + daysUntilMonday)
      }
      
      const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
      const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      
      const dayName = daysOfWeek[targetDate.getDay()]
      const monthName = months[targetDate.getMonth()]
      const day = targetDate.getDate()
      const year = targetDate.getFullYear()
      
      const result = `${dayName}, ${monthName} ${day}, ${year}`
      return result
    } catch (error) {
      console.error('Error calculating first nudge date:', error, 'Input:', enabledDateUTC)
      return 'Error calculating date'
    }
  }

  const checkOpenings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles')
        .select('date_autonudge_enabled')
        .eq('user_id', user.id)
        .single()

      if (profile?.date_autonudge_enabled) {
        const enabledDate = new Date(profile.date_autonudge_enabled)
        
        const torontoParts = new Intl.DateTimeFormat('en-CA', {
          timeZone: 'America/Toronto',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).formatToParts(enabledDate)
        
        const partsMap: Record<string, string> = {}
        torontoParts.forEach(part => {
          if (part.type !== 'literal') {
            partsMap[part.type] = part.value
          }
        })
        
        const torontoTime = new Date(
          parseInt(partsMap.year),
          parseInt(partsMap.month) - 1,
          parseInt(partsMap.day),
          parseInt(partsMap.hour),
          parseInt(partsMap.minute),
          parseInt(partsMap.second)
        )
        
        const dayOfWeek = torontoTime.getDay()
        const hour = torontoTime.getHours()
        const barelyLate = (dayOfWeek === 1 && hour >= 10) || dayOfWeek === 2 || dayOfWeek === 3
        
        setIsBarelyLate(barelyLate)
        setAlreadyEnabled(true)
        const calculatedDate = calculateFirstNudgeDate(profile.date_autonudge_enabled)
        setFirstNudgeDate(calculatedDate)
        setLoading(false)
        return
      }

      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      const currentWeekStart = new Date(now)
      currentWeekStart.setDate(now.getDate() + diff)
      currentWeekStart.setHours(0, 0, 0, 0)
      
      const currentWeekEnd = new Date(currentWeekStart)
      currentWeekEnd.setDate(currentWeekStart.getDate() + 6)
      currentWeekEnd.setHours(23, 59, 59, 999)

      const { data: availabilityData, error: availabilityError } = await supabase
        .from('availability_daily_summary')
        .select('slot_count')
        .eq('user_id', user.id)
        .gte('slot_date', currentWeekStart.toISOString().split('T')[0])
        .lte('slot_date', currentWeekEnd.toISOString().split('T')[0])

      if (availabilityError) {
        console.error('Error fetching availability:', availabilityError)
        throw availabilityError
      }

      const totalOpenings = availabilityData?.reduce((sum, row) => sum + (row.slot_count || 0), 0) || 0
      setOpeningsCount(totalOpenings)
    } catch (error) {
      console.error('Error checking openings:', error)
      Toast.show({ type: 'error', text1: 'Failed to check availability' })
      setOpeningsCount(0)
    } finally {
      setLoading(false)
    }
  }

  const handleActivate = async () => {
    setActivating(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL
      const smsResponse = await fetch(`${apiBaseUrl}/api/onboarding/send-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': accessToken,
        },
      })

      if (!smsResponse.ok) {
        const errorData = await smsResponse.json()
        throw new Error(errorData.error || 'Failed to send confirmation SMS')
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          date_autonudge_enabled: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) throw error

      const enabledDate = new Date().toISOString()
      const enabledDateObj = new Date(enabledDate)
      const torontoTime = new Date(enabledDateObj.toLocaleString('en-US', { timeZone: 'America/Toronto' }))
      const dayOfWeek = torontoTime.getDay()
      const hour = torontoTime.getHours()
      const barelyLate = (dayOfWeek === 1 && hour >= 10) || dayOfWeek === 2 || dayOfWeek === 3
      
      setIsBarelyLate(barelyLate)
      setFirstNudgeDate(calculateFirstNudgeDate(enabledDate))
      
      Toast.show({ type: 'success', text1: 'Auto-Nudge activated!', text2: 'Check your phone for confirmation.' })
      setAlreadyEnabled(true)
    } catch (error) {
      console.error('Error activating auto-nudge:', error)
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to activate Auto-Nudge')
    } finally {
      setActivating(false)
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}
      bounces={true}
      alwaysBounceVertical={true}
    >
      {/* Glass Container */}
      <View style={{
        backgroundColor: COLORS.surfaceGlass,
        borderRadius: RADIUS.xl,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
        padding: SPACING.xl,
      }}>
      <View style={{ gap: SPACING.xl }}>
        <View>
          <Text style={{ 
            fontSize: FONT_SIZE['2xl'], 
            fontWeight: '800', 
            color: COLORS.textPrimary,
            letterSpacing: -0.5,
            marginBottom: SPACING.xs,
          }}>
            Auto Nudge Activation
          </Text>
          <Text style={{ 
            fontSize: FONT_SIZE.sm, 
            color: COLORS.textSecondary,
          }}>
            Automatically fill your schedule with smart reminders
          </Text>
        </View>

        {alreadyEnabled ? (
          <View style={{ gap: SPACING.lg }}>
            <View style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: COLORS.positiveMuted,
                borderWidth: 3,
                borderColor: COLORS.positive,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: COLORS.positive,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}>
                <Check size={40} color={COLORS.positive} strokeWidth={3} />
              </View>
            </View>

            <View style={{ alignItems: 'center', gap: SPACING.xs }}>
              <Text style={{
                fontSize: FONT_SIZE.xl,
                fontWeight: '800',
                color: COLORS.textPrimary,
                textAlign: 'center',
                letterSpacing: -0.5,
              }}>
                Auto-Nudge System Activated!
              </Text>
              <Text style={{
                fontSize: FONT_SIZE.sm,
                color: COLORS.textSecondary,
                textAlign: 'center',
              }}>
                You should receive a confirmation text shortly
              </Text>
            </View>

            {firstNudgeDate && firstNudgeDate !== 'Date unavailable' && firstNudgeDate !== 'Invalid date' && (
              <View style={{
                padding: SPACING.md,
                borderRadius: RADIUS.xl,
                borderWidth: 2,
                borderColor: COLORS.positive,
                backgroundColor: COLORS.positiveMuted,
              }}>
                <Text style={{
                  fontSize: FONT_SIZE.sm,
                  fontWeight: '700',
                  color: COLORS.positive,
                  marginBottom: SPACING.xs,
                }}>
                  📅 Your first nudge will be sent on:
                </Text>
                <Text style={{
                  fontSize: FONT_SIZE.base,
                  fontWeight: '800',
                  color: COLORS.textPrimary,
                }}>
                  {firstNudgeDate} at 10:00 AM
                </Text>
              </View>
            )}

            <View style={{
              padding: SPACING.md,
              borderRadius: RADIUS.xl,
              borderWidth: 2,
              borderColor: COLORS.info,
              backgroundColor: COLORS.infoMuted,
              gap: SPACING.sm,
            }}>
              <Text style={{
                fontSize: FONT_SIZE.sm,
                fontWeight: '700',
                color: COLORS.info,
              }}>
                What happens next?
              </Text>
              <View style={{ gap: SPACING.xs }}>
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 }}>
                  1. You will receive a message from us around the date and time above and you will be asked to say YES to authorize your client auto-nudge
                </Text>
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 }}>
                  2. Once you do, just sit back and wait for an update. All updates are sent every Wednesday. You can also view this under the Auto Nudge page's history
                </Text>
                {isBarelyLate && (
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, lineHeight: 18 }}>
                    3. Since your nudges will be sent out tomorrow and not on a Monday (our normal schedule), you will receive your update 2 days after you authorize your nudge
                  </Text>
                )}
              </View>
              {isBarelyLate && (
                <View style={{
                  marginTop: SPACING.xs,
                  paddingTop: SPACING.sm,
                  borderTopWidth: 1,
                  borderTopColor: COLORS.info + '33',
                }}>
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: 18 }}>
                    💡 Normally, nudges are sent on Mondays and updates on Wednesdays. We're making a one-time exception to get you started right away. Next week, your nudges will be back to the normal Monday schedule.
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={{ gap: SPACING.lg }}>
            <View style={{ alignItems: 'center', paddingVertical: SPACING.lg }}>
              <View style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: COLORS.primaryMuted,
                borderWidth: 3,
                borderColor: COLORS.primary,
                justifyContent: 'center',
                alignItems: 'center',
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 12,
                elevation: 6,
              }}>
                <Text style={{
                  fontSize: 48,
                  fontWeight: '800',
                  color: COLORS.primary,
                }}>
                  {openingsCount !== null ? openingsCount : '—'}
                </Text>
              </View>
            </View>

            <View style={{ alignItems: 'center', gap: SPACING.xs }}>
              <Text style={{
                fontSize: FONT_SIZE.xl,
                fontWeight: '800',
                color: COLORS.textPrimary,
                textAlign: 'center',
                letterSpacing: -0.5,
              }}>
                We found {openingsCount || 0} opening{openingsCount !== 1 ? 's' : ''} this week
              </Text>
              <Text style={{
                fontSize: FONT_SIZE.sm,
                color: COLORS.textSecondary,
                textAlign: 'center',
              }}>
                Let Corva help you fill them automatically
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleActivate}
              disabled={activating}
              style={{
                backgroundColor: activating ? COLORS.surfaceElevated : COLORS.primary,
                padding: SPACING.lg,
                borderRadius: RADIUS.xl,
                alignItems: 'center',
                shadowColor: activating ? '#000' : COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: activating ? 0 : 0.3,
                shadowRadius: 8,
                elevation: activating ? 0 : 4,
              }}
            >
              {activating ? (
                <ActivityIndicator color={COLORS.textSecondary} />
              ) : (
                <Text style={{
                  fontSize: FONT_SIZE.lg,
                  fontWeight: '800',
                  color: COLORS.textInverse,
                  letterSpacing: 0.5,
                }}>
                  Start My Auto-Nudge System
                </Text>
              )}
            </TouchableOpacity>

            <View style={{
              padding: SPACING.md,
              borderRadius: RADIUS.xl,
              borderWidth: 2,
              borderColor: COLORS.info,
              backgroundColor: COLORS.infoMuted,
            }}>
              <Text style={{
                fontSize: FONT_SIZE.xs,
                color: COLORS.textSecondary,
                lineHeight: 18,
              }}>
                Corva will send smart booking reminders to past clients when you have openings. You'll be notified when someone books from your nudge.
              </Text>
            </View>
          </View>
        )}

        <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
          <TouchableOpacity
            onPress={onBack}
            disabled={activating}
            style={{
              flex: 1,
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              borderWidth: 2,
              borderColor: COLORS.border,
              backgroundColor: COLORS.surfaceElevated,
              alignItems: 'center',
              opacity: activating ? 0.5 : 1,
            }}
          >
            <Text style={{
              fontSize: FONT_SIZE.base,
              fontWeight: '700',
              color: COLORS.textPrimary,
            }}>
              Back
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onFinish}
            disabled={profileLoading || (!alreadyEnabled && !activating)}
            style={{
              flex: 2,
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              backgroundColor: profileLoading || (!alreadyEnabled && !activating)
                ? COLORS.surfaceElevated
                : COLORS.primary,
              alignItems: 'center',
              shadowColor: profileLoading || (!alreadyEnabled && !activating) 
                ? '#000' 
                : COLORS.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: profileLoading || (!alreadyEnabled && !activating) ? 0 : 0.3,
              shadowRadius: 8,
              elevation: profileLoading || (!alreadyEnabled && !activating) ? 0 : 4,
            }}
          >
            {profileLoading ? (
              <ActivityIndicator color={COLORS.textSecondary} />
            ) : (
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '800',
                color: profileLoading || (!alreadyEnabled && !activating)
                  ? COLORS.textTertiary
                  : COLORS.textInverse,
                letterSpacing: 0.5,
              }}>
                Finish Onboarding
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
      </View>
    </ScrollView>
  )
}