// components/Onboarding/Steps/SyncProgressBar.tsx
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import React, { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'

interface SyncProgressBarProps {
  userId: string
  totalMonths: number
  syncPhase: 'priority' | 'background'
  onComplete: () => void
}

export default function SyncProgressBar({
  userId,
  totalMonths,
  syncPhase,
  onComplete,
}: SyncProgressBarProps) {
  const [completedMonths, setCompletedMonths] = useState(0)
  const [displayProgress, setDisplayProgress] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  
  const lastCompletedCountRef = useRef(0)
  const hasCalledCompleteRef = useRef(false)

  // Fetch current sync status for the specific phase
  const fetchSyncStatus = async () => {
    if (isComplete) return // Stop polling when complete
    
    const { data, error } = await supabase
      .from('sync_status')
      .select('status')
      .eq('user_id', userId)
      .eq('sync_phase', syncPhase) // Only get syncs for this phase

    if (error) {
      console.error('Error fetching sync status:', error)
      return
    }

    const completed = data?.filter(s => s.status === 'completed').length || 0
    
    console.log(`[${syncPhase}] Sync status: ${completed}/${totalMonths} completed`)
    
    setCompletedMonths(completed)
  }

  // Poll for sync status updates
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchSyncStatus()
    }, 2000)

    // Initial fetch
    fetchSyncStatus()

    return () => {
      clearInterval(pollInterval)
    }
  }, [userId, totalMonths, syncPhase, isComplete])

  // Handle completion - check if all months are done
  useEffect(() => {
    // Check if all months are complete (use >= for safety)
    if (completedMonths >= totalMonths && totalMonths > 0 && !hasCalledCompleteRef.current) {
      console.log(`[${syncPhase}] All months complete! Jumping to 100%`)
      hasCalledCompleteRef.current = true
      setIsComplete(true)
      setDisplayProgress(100)
      onComplete()
    }
  }, [completedMonths, totalMonths, syncPhase, onComplete])

  // Handle progress updates when completedMonths changes (but not complete yet)
  useEffect(() => {
    if (isComplete) {
      setDisplayProgress(100)
      return
    }
    
    // If a new month completed, increment the progress bar
    if (completedMonths > lastCompletedCountRef.current && totalMonths > 0) {
      const progressPerMonth = 95 / totalMonths // Leave room to jump to 100%
      const newProgress = Math.min(completedMonths * progressPerMonth, 95)
      
      console.log(`[${syncPhase}] Progress update: ${completedMonths}/${totalMonths} months = ${newProgress.toFixed(1)}%`)
      
      setDisplayProgress(newProgress)
      lastCompletedCountRef.current = completedMonths
    }
  }, [completedMonths, totalMonths, syncPhase, isComplete])

  // Random increments while waiting (only when not complete)
  useEffect(() => {
    if (isComplete) {
      setDisplayProgress(100)
      return
    }
    
    const randomInterval = setInterval(() => {
      setDisplayProgress(prev => {
        // Stop at 95% to leave room for real completion
        if (prev >= 95) {
          return prev
        }
        
        // Smaller random increment between 0.3% and 1%
        const increment = Math.random() * 0.7 + 0.3
        const newProgress = Math.min(prev + increment, 95)
        
        return newProgress
      })
    }, 5000) // Every 5 seconds

    return () => {
      clearInterval(randomInterval)
    }
  }, [isComplete])

  return (
    <View style={{ gap: SPACING.sm }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{
          fontSize: FONT_SIZE.sm,
          fontWeight: '600',
          color: COLORS.textPrimary,
        }}>
          {isComplete 
            ? `${syncPhase === 'priority' ? 'Priority' : 'Background'} sync complete!` 
            : `Syncing ${syncPhase === 'priority' ? 'priority' : 'background'} data...`}
        </Text>
        <Text style={{
          fontSize: FONT_SIZE.base,
          fontWeight: '700',
          color: COLORS.primary,
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
            backgroundColor: COLORS.primary,
            borderRadius: RADIUS.full,
          }}
        />
      </View>

      {/* Don't show error message to user - retries happen automatically */}
    </View>
  )
}