// components/Onboarding/Onboarding.tsx
import { ANIMATION, COLORS, FONT_SIZE, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import { useRouter } from 'expo-router'
import { Calendar, Download, User, Zap } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  Text,
  TouchableWithoutFeedback,
  View
} from 'react-native'
import Animated, { FadeInRight, FadeOutLeft } from 'react-native-reanimated'
import AutoNudgeActivationStep from './Steps/AutoNudgeActivationStep'
import BookingSyncStep from './Steps/BookingSyncStep'
import CalendarStep from './Steps/CalendarStep'
import ProfileStep from './Steps/ProfileStep'

type OnboardingStepType = 'profile' | 'calendar' | 'booking-sync' | 'auto-nudge'

interface OnboardingProps {
  onComplete?: () => void
}

export default function Onboarding({ onComplete }: OnboardingProps = {}) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)
  const [currentStep, setCurrentStep] = useState<OnboardingStepType>('profile')
  
  // Profile state
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [userType, setUserType] = useState<'barber' | 'owner' | ''>('')
  const [selectedRole, setSelectedRole] = useState({
    label: '',
    role: '',
    barber_type: '',
  })
  const [commissionRate, setCommissionRate] = useState<number | ''>('')
  const [username, setUsername] = useState('')
  const [usernameStatus, setUsernameStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle')
  const [bookingLink, setBookingLink] = useState('')
  const [avatarUri, setAvatarUri] = useState<string | undefined>(undefined)
  
  // Calendar state
  const [selectedProvider, setSelectedProvider] = useState<'acuity' | 'square' | null>('acuity')
  const [calendarStatus, setCalendarStatus] = useState({
    acuity: false,
    square: false,
    loading: true,
  })
  const [acuityCalendars, setAcuityCalendars] = useState<{ id: number | string; name: string }[]>([])
  const [selectedAcuityCalendar, setSelectedAcuityCalendar] = useState<string>('')
  
  // Validation flags
  const [showValidationErrors, setShowValidationErrors] = useState(false)

  useEffect(() => {
    loadProfile()
    fetchCalendarStatus()
  }, [])

  const loadProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/(auth)/login')
        return
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('onboarded, full_name, phone, role, barber_type, commission_rate, avatar_url, username, booking_link')
        .eq('user_id', user.id)
        .single()

      if (error) throw error

      if (data) {
        setFullName(data.full_name || '')
        
        // Format phone from E.164
        const phoneFromDB = data.phone || ''
        if (phoneFromDB) {
          const phoneDigits = phoneFromDB.replace(/\D/g, '').slice(1)
          setPhoneNumber(formatPhoneDisplay(phoneDigits))
        }
        
        setUsername(data.username || '')
        setBookingLink(data.booking_link || '')
        
        if (data.role) {
          if (data.role === 'Barber') {
            setUserType('barber')
            if (data.barber_type) {
              const label = data.barber_type === 'commission' ? 'Commission' : 'Chair Rental'
              setSelectedRole({ label, role: data.role, barber_type: data.barber_type })
            }
          } else if (data.role === 'Owner') {
            setUserType('owner')
            setSelectedRole({ label: 'Shop Owner / Manager', role: 'Owner', barber_type: data.barber_type || '' })
          }
        }
        
        if (typeof data.commission_rate === 'number') {
          setCommissionRate(Math.round(data.commission_rate * 100))
        }
        
        if (data.avatar_url) {
          setAvatarUri(data.avatar_url)
        }
      }
    } catch (err) {
      console.error('Error loading profile:', err)
      Alert.alert('Error', 'Failed to load profile')
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneDisplay = (digits: string) => {
    if (digits.length <= 3) {
      return digits
    } else if (digits.length <= 6) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3)}`
    } else {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    }
  }

  const fetchCalendarStatus = async () => {
    try {
      const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        setCalendarStatus({ acuity: false, square: false, loading: false })
        return
      }

      const [acuityRes, squareRes] = await Promise.all([
        fetch(`${apiBaseUrl}/api/acuity/status`, {
          headers: { 'x-client-access-token': accessToken },
        }),
        fetch(`${apiBaseUrl}/api/square/status`, {
          headers: { 'x-client-access-token': accessToken },
        }),
      ])

      const acuityData = acuityRes.ok ? await acuityRes.json() : null
      const squareData = squareRes.ok ? await squareRes.json() : null

      const acuityConnected = Boolean(acuityData?.connected)
      const squareConnected = Boolean(squareData?.connected)

      setCalendarStatus({
        acuity: acuityConnected,
        square: squareConnected,
        loading: false,
      })

      if (acuityConnected) {
        const calRes = await fetch(`${apiBaseUrl}/api/acuity/calendar`, {
          headers: { 'x-client-access-token': accessToken },
        })
        if (calRes.ok) {
          const calData = await calRes.json()
          setAcuityCalendars(calData.calendars || [])
        }
      }
    } catch (error) {
      console.error('Calendar status error:', error)
      setCalendarStatus({ acuity: false, square: false, loading: false })
    }
  }

  const handleNext = () => {
    Keyboard.dismiss()
    
    if (currentStep === 'profile') {
      if (!isProfileValid) {
        setShowValidationErrors(true)
        return
      }
      setShowValidationErrors(false)
      setCurrentStep('calendar')
    } else if (currentStep === 'calendar') {
      setCurrentStep('booking-sync')
    } else if (currentStep === 'booking-sync') {
      setCurrentStep('auto-nudge')
    }
  }

  const handleBack = () => {
    Keyboard.dismiss()
    
    if (currentStep === 'calendar') {
      setCurrentStep('profile')
    } else if (currentStep === 'booking-sync') {
      setCurrentStep('calendar')
    } else if (currentStep === 'auto-nudge') {
      setCurrentStep('booking-sync')
    }
  }

  const handleSaveCalendar = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      const { error } = await supabase
        .from('profiles')
        .update({
          calendar: selectedProvider === 'acuity' ? selectedAcuityCalendar : null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id)

      if (error) throw error
      Alert.alert('Success', 'Calendar saved!')
    } catch (error) {
      console.error('Error saving calendar:', error)
      Alert.alert('Error', 'Failed to save calendar')
      throw error
    }
  }

  const handleFinishOnboarding = async () => {
    if (!isCalendarConnected) {
      Alert.alert('Error', 'Please connect a calendar to continue')
      return
    }
    
    setProfileLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      // Profile is already saved in ProfileStep, so we only need to:
      // 1. Save calendar selection
      // 2. Set onboarded = true
      // 3. Grant trial credits if applicable

      const profileUpdate: Record<string, unknown> = {
        calendar: selectedProvider === 'acuity' ? selectedAcuityCalendar : null,
        onboarded: true,
      }

      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('trial_start, available_credits, reserved_credits')
        .eq('user_id', user.id)
        .single()

      if (currentProfileError) throw currentProfileError

      if (!currentProfile?.trial_start) {
        const now = new Date()
        const trialEnd = new Date(now)
        trialEnd.setDate(trialEnd.getDate() + 7)

        profileUpdate.trial_start = now.toISOString()
        profileUpdate.trial_end = trialEnd.toISOString()
        profileUpdate.trial_active = true
      }

      const { data: trialBonus } = await supabase
        .from('credit_transactions')
        .select('id')
        .eq('user_id', user.id)
        .eq('action', 'trial_bonus')
        .maybeSingle()

      const existingCredits = currentProfile?.available_credits || 0
      const existingReserved = currentProfile?.reserved_credits || 0
      const shouldGrantTrialCredits = !trialBonus
      const trialCreditAmount = 10

      if (shouldGrantTrialCredits) {
        profileUpdate.available_credits = existingCredits + trialCreditAmount
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      console.log('Onboarding finalized - calendar and trial set')

      if (shouldGrantTrialCredits) {
        console.log('Granting trial credits...')
        const { error: creditError } = await supabase
          .from('credit_transactions')
          .insert({
            user_id: user.id,
            action: 'trial_bonus',
            old_available: existingCredits,
            new_available: existingCredits + trialCreditAmount,
            old_reserved: existingReserved,
            new_reserved: existingReserved,
            created_at: new Date().toISOString(),
          })
        
        if (creditError) {
          console.error('Credit transaction error:', creditError)
          // Don't throw - credits are a bonus, not critical
        } else {
          console.log('Trial credits granted')
        }
      }

      console.log('Onboarding complete!')
      
      // Call the onComplete callback to close the modal and refresh dashboard
      if (onComplete) {
        onComplete()
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete onboarding'
      console.error('Onboarding error:', message, err)
      Alert.alert('Error', message)
    } finally {
      setProfileLoading(false)
    }
  }

  // Validation
  const isCommissionValid =
    selectedRole.barber_type !== 'commission' ||
    (typeof commissionRate === 'number' && commissionRate >= 1 && commissionRate <= 100)
  
  const isUsernameValid = username.trim().length >= 3 && (usernameStatus === 'available' || usernameStatus === 'idle')
  const isPhoneNumberValid = phoneNumber.replace(/\D/g, '').length === 10
  const isBookingLinkValid = bookingLink.trim().length > 0
  const isCalendarConnected = calendarStatus.acuity || calendarStatus.square
  
  const isProfileValid = 
    fullName.trim().length > 0 && 
    isPhoneNumberValid &&
    userType !== '' && 
    selectedRole.barber_type !== '' &&
    isCommissionValid &&
    isUsernameValid &&
    isBookingLinkValid

  const steps = [
    { key: 'profile', label: 'Profile', icon: User },
    { key: 'calendar', label: 'Calendar', icon: Calendar },
    { key: 'booking-sync', label: 'Sync', icon: Download },
    { key: 'auto-nudge', label: 'Activate', icon: Zap }
  ]

  const currentStepIndex = steps.findIndex(s => s.key === currentStep)

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Header with Steps */}
        <View style={{ 
          paddingTop: 80, 
          paddingHorizontal: SPACING.xl, 
          paddingBottom: SPACING.xl,
          backgroundColor: COLORS.surface,
        }}>
          <Text style={{ 
            fontSize: FONT_SIZE['3xl'], 
            fontWeight: '800', 
            color: COLORS.textPrimary,
            marginBottom: SPACING.xs,
            letterSpacing: -0.5,
          }}>
            Get Started
          </Text>
          <Text style={{ 
            fontSize: FONT_SIZE.sm, 
            color: COLORS.textSecondary,
            marginBottom: SPACING.xl,
          }}>
            Complete setup to unlock your dashboard
          </Text>
          
          {/* Step Indicators */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            {steps.map((step, index) => {
              const StepIcon = step.icon
              const isCompleted = index < currentStepIndex
              const isCurrent = index === currentStepIndex
              const isUpcoming = index > currentStepIndex
              
              return (
                <View key={step.key} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ alignItems: 'center', gap: SPACING.xs }}>
                    {/* Icon Circle */}
                    <View style={{ 
                      width: 56, 
                      height: 56, 
                      borderRadius: 28,
                      backgroundColor: isCompleted 
                        ? COLORS.primary 
                        : isCurrent 
                          ? COLORS.primaryMuted 
                          : COLORS.surfaceElevated,
                      borderWidth: 2,
                      borderColor: isCompleted || isCurrent ? COLORS.primary : COLORS.border,
                      justifyContent: 'center',
                      alignItems: 'center',
                      shadowColor: isCurrent ? COLORS.primary : '#000',
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: isCurrent ? 0.3 : 0.1,
                      shadowRadius: 8,
                      elevation: isCurrent ? 6 : 2,
                    }}>
                      <StepIcon 
                        size={24} 
                        color={isCompleted 
                          ? COLORS.textInverse 
                          : isCurrent 
                            ? COLORS.primary 
                            : COLORS.textTertiary
                        }
                        strokeWidth={2.5}
                      />
                    </View>
                    
                    {/* Label */}
                    <Text style={{ 
                      fontSize: FONT_SIZE.xs,
                      fontWeight: isCurrent ? '700' : '600',
                      color: isCompleted || isCurrent ? COLORS.textPrimary : COLORS.textTertiary,
                      textAlign: 'center',
                    }}>
                      {step.label}
                    </Text>
                  </View>
                  
                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <View style={{
                      position: 'absolute',
                      top: 28,
                      left: '60%',
                      right: '-40%',
                      height: 2,
                      backgroundColor: index < currentStepIndex ? COLORS.primary : COLORS.border,
                      zIndex: -1,
                    }} />
                  )}
                </View>
              )
            })}
          </View>
        </View>

        {/* Content */}
        <View style={{ flex: 1, padding: SPACING.xl }}>
          <Animated.View
            key={currentStep}
            entering={FadeInRight.duration(ANIMATION.normal)}
            exiting={FadeOutLeft.duration(ANIMATION.fast)}
            style={{ flex: 1 }}
          >
            {currentStep === 'profile' && (
            <ProfileStep
              fullName={fullName}
              setFullName={setFullName}
              phoneNumber={phoneNumber}
              setPhoneNumber={setPhoneNumber}
              userType={userType}
              setUserType={setUserType}
              selectedRole={selectedRole}
              setSelectedRole={setSelectedRole}
              commissionRate={commissionRate}
              setCommissionRate={setCommissionRate}
              username={username}
              setUsername={setUsername}
              usernameStatus={usernameStatus}
              setUsernameStatus={setUsernameStatus}
              bookingLink={bookingLink}
              setBookingLink={setBookingLink}
              avatarUri={avatarUri}
              setAvatarUri={setAvatarUri}
              showValidationErrors={showValidationErrors}
              isProfileValid={isProfileValid}
              isCommissionValid={isCommissionValid}
              isUsernameValid={isUsernameValid}
              isPhoneNumberValid={isPhoneNumberValid}
              isBookingLinkValid={isBookingLinkValid}
              onNext={handleNext}
            />
          )}

          {currentStep === 'calendar' && (
            <CalendarStep
              selectedProvider={selectedProvider}
              setSelectedProvider={setSelectedProvider}
              calendarStatus={calendarStatus}
              acuityCalendars={acuityCalendars}
              selectedAcuityCalendar={selectedAcuityCalendar}
              setSelectedAcuityCalendar={setSelectedAcuityCalendar}
              fetchCalendarStatus={fetchCalendarStatus}
              onBack={handleBack}
              onNext={handleNext}
              onSaveCalendar={handleSaveCalendar}
              isCalendarConnected={isCalendarConnected}
              profileLoading={profileLoading}
            />
          )}

          {currentStep === 'booking-sync' && (
            <BookingSyncStep
              onBack={handleBack}
              onNext={handleNext}
              profileLoading={profileLoading}
            />
          )}

          {currentStep === 'auto-nudge' && (
            <AutoNudgeActivationStep
              onBack={handleBack}
              onFinish={handleFinishOnboarding}
              profileLoading={profileLoading}
            />
          )}
          </Animated.View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  )
}