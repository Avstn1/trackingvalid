import { COLORS } from '@/constants/design-system';
import { TRIAL_DAYS } from '@/constants/trial';
import { SPRING, usePressAnimation, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface TrialBannerProps {
  userId: string;
  daysRemaining: number;
  dateAutoNudgeEnabled?: string | null;
  onManageTrial: () => void;
}

type AutoNudgeStatus = 'loading' | 'active' | 'inactive';

function getUrgencyColor(daysRemaining: number): string {
  if (daysRemaining <= 3) return COLORS.negative;
  if (daysRemaining <= 7) return COLORS.warning;
  return COLORS.primary;
}

function getISOWeekNumber(date: Date): string {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function calculateNextNudgeDate(enabledDateUTC: string | null | undefined): string | null {
  if (!enabledDateUTC) return null;
  
  const enabledDate = new Date(enabledDateUTC);
  if (isNaN(enabledDate.getTime())) return null;
  
  const dayOfWeek = enabledDate.getDay();
  const hour = enabledDate.getHours();
  
  const targetDate = new Date(enabledDate);
  
  if ((dayOfWeek === 1 && hour >= 10) || dayOfWeek === 2 || dayOfWeek === 3) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (dayOfWeek >= 4 || dayOfWeek === 0) {
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    targetDate.setDate(targetDate.getDate() + daysUntilMonday);
  }
  
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const dayIndex = targetDate.getDay();
  const monthIndex = targetDate.getMonth();
  const day = targetDate.getDate();
  
  if (isNaN(dayIndex) || isNaN(monthIndex) || isNaN(day)) return null;
  
  return `${DAYS[dayIndex]}, ${MONTHS[monthIndex]} ${day} @ 10am`;
}

export default function TrialBanner({
  userId,
  daysRemaining,
  dateAutoNudgeEnabled,
  onManageTrial,
}: TrialBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [autoNudgeStatus, setAutoNudgeStatus] = useState<AutoNudgeStatus>('loading');
  const [revenueRecovered, setRevenueRecovered] = useState<number | null>(null);

  const reduceMotion = useReducedMotionPreference();
  const chevronRotation = useSharedValue(0);
  const progressWidth = useSharedValue(0);
  const { onPressIn, onPressOut, animatedStyle: pressStyle } = usePressAnimation(reduceMotion);

  // Derived values
  const urgencyColor = getUrgencyColor(daysRemaining);
  const statusText = daysRemaining <= 7 ? 'Ending soon' : 'Trial';
  const progressPercent = Math.min(100, Math.max(0, ((TRIAL_DAYS - daysRemaining) / TRIAL_DAYS) * 100));
  const nextNudgeDate = calculateNextNudgeDate(dateAutoNudgeEnabled);

  // Animate progress bar
  useEffect(() => {
    if (reduceMotion) {
      progressWidth.value = progressPercent;
    } else {
      progressWidth.value = withSpring(progressPercent, { damping: 20, stiffness: 200, mass: 0.5 });
    }
  }, [progressPercent, reduceMotion]);

  const progressAnimatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Chevron rotation animation
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  // Fetch Auto-Nudge status
  useEffect(() => {
    const checkAutoNudgeStatus = async () => {
      if (!userId) {
        setAutoNudgeStatus('inactive');
        return;
      }

      if (dateAutoNudgeEnabled) {
        setAutoNudgeStatus('active');
        return;
      }

      try {
        const { data, error } = await supabase
          .from('sms_scheduled_messages')
          .select('id, status, enabled')
          .eq('user_id', userId)
          .eq('purpose', 'auto-nudge');

        if (error || !data || data.length === 0) {
          setAutoNudgeStatus('inactive');
          return;
        }

        const hasActive = data.some(msg => msg.status === 'ACCEPTED' && msg.enabled === true);
        setAutoNudgeStatus(hasActive ? 'active' : 'inactive');
      } catch {
        setAutoNudgeStatus('inactive');
      }
    };

    checkAutoNudgeStatus();
  }, [userId, dateAutoNudgeEnabled]);

  // Fetch revenue when active
  useEffect(() => {
    const fetchRevenue = async () => {
      if (autoNudgeStatus !== 'active' || !userId) {
        setRevenueRecovered(null);
        return;
      }

      try {
        const currentWeek = getISOWeekNumber(new Date());
        
        const { data, error } = await supabase
          .from('barber_nudge_success')
          .select('prices')
          .eq('user_id', userId)
          .eq('iso_week_number', currentWeek)
          .single();

        if (error || !data?.prices || data.prices.length === 0) {
          setRevenueRecovered(0);
          return;
        }

        const total = data.prices.reduce((sum: number, p: string | number) => sum + Number(p), 0);
        setRevenueRecovered(total);
      } catch {
        setRevenueRecovered(0);
      }
    };

    fetchRevenue();
  }, [autoNudgeStatus, userId]);

  // Toggle handler
  const handleToggle = () => {
    if (Platform.OS === 'ios' && !reduceMotion) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (!reduceMotion) {
      chevronRotation.value = withSpring(newExpanded ? 180 : 0, SPRING.snappy);
    } else {
      chevronRotation.value = newExpanded ? 180 : 0;
    }
  };

  // Manage trial handler
  const handleManageTrial = () => {
    if (Platform.OS === 'ios' && !reduceMotion) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onManageTrial();
  };

  return (
    <View style={styles.container}>
      {/* Collapsed Row - Always visible, tappable */}
      <Pressable
        onPress={handleToggle}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`Trial status: ${daysRemaining} days remaining. ${isExpanded ? 'Collapse' : 'Expand'} for details`}
        accessibilityState={{ expanded: isExpanded }}
      >
        <Animated.View style={[styles.collapsedRow, pressStyle]}>
          {/* Status dot */}
          <View style={[styles.statusDot, { backgroundColor: urgencyColor }]} />
          
          {/* Status text */}
          <Text style={[styles.statusText, { color: urgencyColor }]}>
            {statusText}
          </Text>
          
          {/* Days remaining */}
          <Text style={styles.daysText}>
            {daysRemaining} days of trial left
          </Text>
          
          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressFill, 
                { backgroundColor: urgencyColor },
                progressAnimatedStyle,
              ]} 
            />
          </View>
          
          {/* Chevron */}
          <Animated.View style={chevronStyle}>
            <Ionicons name="chevron-down" size={14} color={COLORS.textTertiary} />
          </Animated.View>
        </Animated.View>
      </Pressable>
      
      {/* Expanded Content */}
      {isExpanded && (
        <Animated.View 
          entering={reduceMotion ? undefined : FadeIn.duration(150)}
          exiting={reduceMotion ? undefined : FadeOut.duration(100)}
          style={styles.expandedContent}
        >
          {/* Auto-Nudge status + Next nudge */}
          <View style={styles.infoRow}>
            <Ionicons 
              name="flash" 
              size={14} 
              color={autoNudgeStatus === 'active' ? COLORS.primary : COLORS.textTertiary} 
            />
            <Text style={styles.infoText}>
              <Text style={{ color: autoNudgeStatus === 'active' ? COLORS.primary : COLORS.textTertiary }}>
                Auto-Nudge {autoNudgeStatus === 'loading' ? '...' : autoNudgeStatus}
              </Text>
              {autoNudgeStatus === 'active' && nextNudgeDate && (
                <Text style={{ color: COLORS.textSecondary }}>
                  {'    Next: '}
                  <Text style={{ color: COLORS.info }}>{nextNudgeDate}</Text>
                </Text>
              )}
            </Text>
          </View>
          
          {/* Revenue */}
          <View style={styles.infoRow}>
            <Ionicons name="cash-outline" size={14} color={COLORS.textTertiary} />
            <Text style={styles.infoText}>
              {revenueRecovered && revenueRecovered > 0 ? (
                <>
                  <Text style={{ color: COLORS.primary, fontWeight: '600' }}>
                    ${revenueRecovered}
                  </Text>
                  <Text style={{ color: COLORS.textSecondary }}> recovered this week</Text>
                </>
              ) : (
                <Text style={{ color: COLORS.textTertiary }}>No recoveries yet</Text>
              )}
            </Text>
          </View>
          
          {/* CTA */}
          <Pressable 
            onPress={handleManageTrial}
            style={styles.ctaContainer}
            accessibilityRole="link"
            accessibilityLabel="See more trial details"
          >
            <Text style={styles.ctaText}>See more</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.primary} />
          </Pressable>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
  },
  daysText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  progressTrack: {
    flex: 1,
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 1.5,
    overflow: 'hidden',
    marginHorizontal: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    flex: 1,
  },
  ctaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 2,
    paddingTop: 4,
    minHeight: 44,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.primary,
  },
});
