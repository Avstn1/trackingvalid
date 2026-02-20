// components/Onboarding/Steps/BookingSyncStep.tsx
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  Text,
  TouchableOpacity,
  View
} from 'react-native'
import Toast from 'react-native-toast-message'
import Acuity from './BookingApp/Acuity'

interface BookingSyncStepProps {
  onBack: () => void
  onNext: () => void
  profileLoading: boolean
}

export default function BookingSyncStep({
  onBack,
  onNext,
  profileLoading,
}: BookingSyncStepProps) {
  const [loading, setLoading] = useState(true)
  const [hasAcuity, setHasAcuity] = useState(false)
  const [hasSquare, setHasSquare] = useState(false)
  const [userId, setUserId] = useState<string>('')
  const [syncComplete, setSyncComplete] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showBackWarning, setShowBackWarning] = useState(false)
  const [existingSync, setExistingSync] = useState<{
    hasPending: boolean
    totalMonths: number
  } | null>(null)

  useEffect(() => {
    checkIntegrations()
  }, [])

  const checkIntegrations = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      setUserId(user.id)

      // Check for Acuity token FIRST
      const { data: acuityToken } = await supabase
        .from('acuity_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      setHasAcuity(!!acuityToken)

      // Check for Square token (future)
      const { data: squareToken } = await supabase
        .from('square_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      setHasSquare(!!squareToken)

      // Call edge function to update availability data
      supabase.functions.invoke('update_barber_availability', {
        body: { user_id: user.id }
      }).catch(err => {
        console.error('Background availability update failed:', err)
      })

      // Check for existing sync_status rows (priority phase only)
      const { data: syncStatusData, error: syncError } = await supabase
        .from('sync_status')
        .select('status, sync_phase')
        .eq('user_id', user.id)
        .eq('sync_phase', 'priority') // Only check priority phase

      if (!syncError && syncStatusData && syncStatusData.length > 0) {
        const hasPending = syncStatusData.some(s => 
          s.status === 'pending' || 
          s.status === 'processing' || 
          s.status === 'retrying'
        )
        const allComplete = syncStatusData.every(s => s.status === 'completed')
        
        if (allComplete) {
          // All priority syncs complete, allow proceeding
          console.log('All priority syncs already completed, skipping sync step')
          setSyncComplete(true)
          setLoading(false)
          return
        } else if (hasPending) {
          // Has pending priority syncs, resume them
          console.log('Found incomplete priority syncs, resuming...')
          
          setExistingSync({
            hasPending: true,
            totalMonths: syncStatusData.length
          })
          
          // Auto-resume incomplete syncs
          const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL
          const { data: { session } } = await supabase.auth.getSession()
          const accessToken = session?.access_token

          if (accessToken) {
            fetch(`${apiBaseUrl}/api/onboarding/resume-sync`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-client-access-token': accessToken,
              },
              body: JSON.stringify({ userId: user.id }),
            }).then(async (res) => {
              const data = await res.json()
              if (res.ok) {
                console.log('Auto-resumed syncs:', data)
                Toast.show({
                  type: 'success',
                  text1: 'Resuming your sync...',
                })
              } else {
                console.error('Failed to auto-resume:', data.error)
              }
            }).catch(err => {
              console.error('Error auto-resuming syncs:', err)
            })
          }
        }
      }
    } catch (error) {
      console.error('Error checking integrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncComplete = () => {
    setSyncComplete(true)
  }

  const handleBackPress = () => {
    if (isSyncing) {
      setShowBackWarning(true)
    } else {
      onBack()
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
    <View style={{ flex: 1 }}>
      {/* Back Warning Modal */}
      <Modal
        visible={showBackWarning}
        transparent
        animationType="fade"
        onRequestClose={() => setShowBackWarning(false)}
      >
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: COLORS.overlay,
        }}>
          <View style={{
            width: '85%',
            backgroundColor: COLORS.surface,
            borderRadius: RADIUS.xl,
            padding: SPACING.xl,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
          }}>
            <Text style={{
              fontSize: FONT_SIZE.xl,
              fontWeight: '800',
              color: COLORS.textPrimary,
              marginBottom: SPACING.sm,
            }}>
              Sync in Progress
            </Text>
            <Text style={{
              fontSize: FONT_SIZE.sm,
              color: COLORS.textSecondary,
              marginBottom: SPACING.xl,
              lineHeight: 20,
            }}>
              Please wait for the priority sync to complete before navigating away. Your older data will continue syncing in the background.
            </Text>
            <TouchableOpacity
              onPress={() => setShowBackWarning(false)}
              style={{
                backgroundColor: COLORS.primary,
                padding: SPACING.md,
                borderRadius: RADIUS.xl,
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
                Got it
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
          Booking Sync
        </Text>
        <Text style={{ 
          fontSize: FONT_SIZE.sm, 
          color: COLORS.textSecondary,
        }}>
          Sync your historical booking data
        </Text>
      </View>

      {!hasAcuity && !hasSquare ? (
        <View style={{
          padding: SPACING.xl,
          borderRadius: RADIUS.xl,
          borderWidth: 2,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surfaceElevated,
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: FONT_SIZE.base,
            color: COLORS.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
          }}>
            No booking integration detected. Please connect a calendar in the previous step.
          </Text>
        </View>
      ) : hasAcuity ? (
        <Acuity 
          userId={userId} 
          onSyncComplete={handleSyncComplete}
          onSyncStateChange={setIsSyncing}
          existingSync={existingSync}
        />
      ) : hasSquare ? (
        <View style={{
          padding: SPACING.xl,
          borderRadius: RADIUS.xl,
          borderWidth: 2,
          borderColor: COLORS.border,
          backgroundColor: COLORS.surfaceElevated,
          alignItems: 'center',
        }}>
          <Text style={{
            fontSize: FONT_SIZE.base,
            color: COLORS.textSecondary,
            textAlign: 'center',
          }}>
            Square sync coming soon...
          </Text>
        </View>
      ) : null}

      {/* Buttons */}
      <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl }}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={{
            flex: 1,
            padding: SPACING.lg,
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
            Back
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={onNext}
          disabled={profileLoading || !syncComplete}
          style={{
            flex: 2,
            padding: SPACING.lg,
            borderRadius: RADIUS.xl,
            backgroundColor: profileLoading || !syncComplete ? COLORS.surfaceElevated : COLORS.primary,
            alignItems: 'center',
            shadowColor: profileLoading || !syncComplete ? '#000' : COLORS.primary,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: profileLoading || !syncComplete ? 0 : 0.3,
            shadowRadius: 8,
            elevation: profileLoading || !syncComplete ? 0 : 4,
          }}
        >
          <Text style={{
            fontSize: FONT_SIZE.lg,
            fontWeight: '800',
            color: profileLoading || !syncComplete ? COLORS.textTertiary : COLORS.textInverse,
            letterSpacing: 0.5,
          }}>
            {!syncComplete && isSyncing ? 'Syncing...' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>
      </View>
      </View>
    </View>
  )
}