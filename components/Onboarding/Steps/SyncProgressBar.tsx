// components/Onboarding/Steps/SyncProgressBar.tsx
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import React, { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

interface SyncProgressBarProps {
  userId: string
  totalMonths: number
  onComplete: () => void
}

export default function SyncProgressBar({
  userId,
  totalMonths,
  onComplete,
}: SyncProgressBarProps) {
  const [completedMonths, setCompletedMonths] = useState(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  const [lastCompletedCount, setLastCompletedCount] = useState(0)

  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchSyncStatus()
    }, 2000)

    fetchSyncStatus()

    return () => {
      clearInterval(pollInterval)
    }
  }, [userId])

  const fetchSyncStatus = async () => {
    const { data, error } = await supabase
      .from('sync_status')
      .select('status')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching sync status:', error)
      return
    }

    const completed = data?.filter(s => s.status === 'completed').length || 0
    const hasFailed = data?.some(s => s.status === 'failed') || false
    
    setCompletedMonths(completed)
    setFailed(hasFailed)
  }

  useEffect(() => {
    if (completedMonths === totalMonths && totalMonths > 0) {
      setDisplayProgress(100)
      onComplete()
      return
    }

    if (completedMonths > lastCompletedCount && totalMonths > 0) {
      // Calculate jump based on remaining percentage divided by total months
      const remainingPercentage = 100 - displayProgress
      const percentageToAdd = remainingPercentage / totalMonths
      const newProgress = Math.min(displayProgress + percentageToAdd, 99)
      
      setDisplayProgress(newProgress)
      setLastCompletedCount(completedMonths)
    }
  }, [completedMonths, totalMonths, onComplete])

  // Random increments while waiting (for feeling of progress)
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        // Never go to 100% with random increments
        if (prev >= 99) {
          return prev
        }
        
        // Random increment between 0.5% and 2%
        const increment = Math.random() * 1.5 + 0.5
        const newProgress = Math.min(prev + increment, 99)
        
        return newProgress
      })
    }, 1500) // Update every 1.5 seconds

    return () => clearInterval(interval)
  }, [])

  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{
          fontSize: FONT_SIZE.sm,
          fontWeight: '600',
          color: failed ? COLORS.negative : COLORS.textPrimary,
        }}>
          {failed ? 'Sync encountered errors' : 'Syncing your data...'}
        </Text>
        <Text style={{
          fontSize: FONT_SIZE.base,
          fontWeight: '700',
          color: failed ? COLORS.negative : COLORS.primary,
        }}>
          {Math.round(displayProgress)}%
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
        <View
          style={{
            height: '100%',
            width: `${displayProgress}%`,
            backgroundColor: failed ? COLORS.negative : COLORS.primary,
            borderRadius: RADIUS.full,
          }}
        />
      </View>

      {failed && (
        <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.negative }}>
          Some months failed to sync. Please retry.
        </Text>
      )}
    </View>
  )
}