// components/Onboarding/Steps/ProfileStep.tsx
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import * as ImagePicker from 'expo-image-picker'
import { Camera, Check, ChevronDown, X } from 'lucide-react-native'
import React, { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import Toast from 'react-native-toast-message'

interface ProfileStepProps {
  fullName: string
  setFullName: (value: string) => void
  phoneNumber: string
  setPhoneNumber: (value: string) => void
  userType: 'barber' | 'owner' | ''
  setUserType: (value: 'barber' | 'owner' | '') => void
  selectedRole: { label: string; role: string; barber_type: string }
  setSelectedRole: (value: { label: string; role: string; barber_type: string }) => void
  commissionRate: number | ''
  setCommissionRate: (value: number | '') => void
  username: string
  setUsername: (value: string) => void
  usernameStatus: 'idle' | 'checking' | 'available' | 'taken'
  setUsernameStatus: (value: 'idle' | 'checking' | 'available' | 'taken') => void
  bookingLink: string
  setBookingLink: (value: string) => void
  avatarUri: string | undefined
  setAvatarUri: (value: string | undefined) => void
  showValidationErrors: boolean
  isProfileValid: boolean
  isCommissionValid: boolean
  isUsernameValid: boolean
  isPhoneNumberValid: boolean
  isBookingLinkValid: boolean
  onNext: () => void
}

export default function ProfileStep({
  fullName,
  setFullName,
  phoneNumber,
  setPhoneNumber,
  userType,
  setUserType,
  selectedRole,
  setSelectedRole,
  commissionRate,
  setCommissionRate,
  username,
  setUsername,
  usernameStatus,
  setUsernameStatus,
  bookingLink,
  setBookingLink,
  avatarUri,
  setAvatarUri,
  showValidationErrors,
  isProfileValid,
  isCommissionValid,
  isUsernameValid,
  isPhoneNumberValid,
  isBookingLinkValid,
  onNext,
}: ProfileStepProps) {
  const usernameCheckTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const scrollViewRef = useRef<ScrollView>(null)
  const [showUserTypeModal, setShowUserTypeModal] = useState(false)
  const [showOperateModal, setShowOperateModal] = useState(false)
  const [saving, setSaving] = useState(false)

  // Check username on mount if it has a value
  useEffect(() => {
    if (username && username.length >= 3) {
      handleUsernameChange(username)
    }
  }, [])

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '')
    const limited = cleaned.slice(0, 10)
    
    if (limited.length <= 3) {
      return limited
    } else if (limited.length <= 6) {
      return `(${limited.slice(0, 3)}) ${limited.slice(3)}`
    } else {
      return `(${limited.slice(0, 3)}) ${limited.slice(3, 6)}-${limited.slice(6)}`
    }
  }

  const handlePhoneChange = (text: string) => {
    const formatted = formatPhoneNumber(text)
    setPhoneNumber(formatted)
  }

  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '')
    setUsername(cleaned)

    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current)
    }

    if (cleaned.length < 3) {
      setUsernameStatus('idle')
      return
    }

    setUsernameStatus('checking')

    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', cleaned)
          .neq('user_id', user.id)
          .maybeSingle()

        if (error && error.code !== 'PGRST116') {
          console.error('Username check error:', error)
          setUsernameStatus('idle')
          return
        }

        setUsernameStatus(data ? 'taken' : 'available')
      } catch (err) {
        console.error('Username check error:', err)
        setUsernameStatus('idle')
      }
    }, 500)
  }

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant photo library access to upload an avatar')
      return
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const phoneToE164 = (phone: string) => {
    const cleaned = phone.replace(/\D/g, '')
    return `+1${cleaned}`
  }

  const handleSaveAndNext = async () => {
    if (!isProfileValid) {
      return
    }

    setSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not logged in')

      let avatarUrl = avatarUri || ''
      
      // Upload avatar if new file selected
      if (avatarUri && !avatarUri.startsWith('http')) {
        const fileName = `${fullName.replace(/\s+/g, '_')}_${Date.now()}`
        const response = await fetch(avatarUri)
        const blob = await response.blob()
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, blob, { upsert: true })
          
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        avatarUrl = urlData.publicUrl
      }

      const profileUpdate: Record<string, unknown> = {
        full_name: fullName,
        phone: phoneToE164(phoneNumber),
        role: selectedRole.role,
        barber_type: selectedRole.barber_type || null,
        avatar_url: avatarUrl,
        username: username.toLowerCase(),
        booking_link: bookingLink.trim(),
        updated_at: new Date().toISOString(),
      }

      if (selectedRole.barber_type === 'commission') {
        if (commissionRate === '' || commissionRate < 1 || commissionRate > 100) {
          throw new Error('Please enter a valid commission rate between 1 and 100')
        }
        profileUpdate.commission_rate = commissionRate / 100
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      console.log('Profile saved successfully')
      Toast.show({
        type: 'success',
        text1: 'Profile saved!',
      })

      // Call onNext after successful save
      onNext()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save profile'
      console.error('Profile save error:', message, err)
      Alert.alert('Error', message)
    } finally {
      setSaving(false)
    }
  }

  const roleOptions = [
    { label: 'Commission', role: 'Barber', barber_type: 'commission' },
    { label: 'Chair Rental', role: 'Barber', barber_type: 'chair_rental' },
  ]

  const userTypeOptions = [
    { label: 'Barber', value: 'barber' },
    { label: 'Shop Owner / Manager', value: 'owner' },
  ]

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
      enabled
    >
      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Modals */}
        {/* User Type Modal */}
        <Modal
          visible={showUserTypeModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowUserTypeModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowUserTypeModal(false)}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: COLORS.overlay,
            }}
          >
            <View style={{
              width: '80%',
              backgroundColor: COLORS.surface,
              borderRadius: RADIUS.xl,
              padding: SPACING.xl,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}>
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: SPACING.lg,
                textAlign: 'center',
              }}>
                What best describes you?
              </Text>
              {userTypeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  onPress={() => {
                    setUserType(option.value as 'barber' | 'owner')
                    // Clear role selection when changing user type
                    setSelectedRole({ label: '', role: '', barber_type: '' })
                    setShowUserTypeModal(false)
                  }}
                  style={{
                    padding: SPACING.lg,
                    borderRadius: RADIUS.md,
                    backgroundColor: userType === option.value ? COLORS.primaryMuted : COLORS.surfaceElevated,
                    borderWidth: 2,
                    borderColor: userType === option.value ? COLORS.primary : COLORS.border,
                    marginBottom: SPACING.sm,
                  }}
                >
                  <Text style={{
                    fontSize: FONT_SIZE.base,
                    fontWeight: '700',
                    color: userType === option.value ? COLORS.primary : COLORS.textPrimary,
                    textAlign: 'center',
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </TouchableOpacity>
        </Modal>

        {/* How do you operate Modal */}
        <Modal
          visible={showOperateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOperateModal(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowOperateModal(false)}
            style={{
              flex: 1,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: COLORS.overlay,
            }}
          >
            <View style={{
              width: '80%',
              backgroundColor: COLORS.surface,
              borderRadius: RADIUS.xl,
              padding: SPACING.xl,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}>
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '700',
                color: COLORS.textPrimary,
                marginBottom: SPACING.lg,
                textAlign: 'center',
              }}>
                How do you operate?
              </Text>
              {roleOptions.map((option) => (
                <TouchableOpacity
                  key={option.label}
                  onPress={() => {
                    setSelectedRole(option)
                    setShowOperateModal(false)
                  }}
                  style={{
                    padding: SPACING.lg,
                    borderRadius: RADIUS.md,
                    backgroundColor: selectedRole.label === option.label ? COLORS.primaryMuted : COLORS.surfaceElevated,
                    borderWidth: 2,
                    borderColor: selectedRole.label === option.label ? COLORS.primary : COLORS.border,
                    marginBottom: SPACING.sm,
                  }}
                >
                  <Text style={{
                    fontSize: FONT_SIZE.base,
                    fontWeight: '700',
                    color: selectedRole.label === option.label ? COLORS.primary : COLORS.textPrimary,
                    textAlign: 'center',
                  }}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
        <View style={{ gap: SPACING.xl }}>
          {/* Avatar Upload */}
          <View style={{ alignItems: 'center', marginBottom: SPACING.sm }}>
            <TouchableOpacity
              onPress={pickImage}
              style={{
                width: 110,
                height: 110,
                borderRadius: 55,
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 3,
                borderColor: avatarUri ? COLORS.primary : COLORS.border,
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: avatarUri ? 0.2 : 0,
                shadowRadius: 8,
                elevation: avatarUri ? 4 : 0,
              }}
            >
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <View style={{ alignItems: 'center', gap: SPACING.xs }}>
                  <Camera size={28} color={COLORS.primary} strokeWidth={2} />
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, fontWeight: '600' }}>
                    Add Photo
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Full Name & Phone Number - 2 Columns */}
          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: FONT_SIZE.sm, 
                fontWeight: '700', 
                color: COLORS.textPrimary,
                marginBottom: SPACING.xs,
              }}>
                Full Name *
              </Text>
              <TextInput
                value={fullName}
                onChangeText={setFullName}
                placeholder="John Doe"
                placeholderTextColor={COLORS.textTertiary}
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 2,
                  borderColor: showValidationErrors && !fullName ? COLORS.negative : COLORS.border,
                  borderRadius: RADIUS.md,
                  padding: SPACING.md,
                  fontSize: FONT_SIZE.base,
                  color: COLORS.textPrimary,
                  fontWeight: '500',
                }}
              />
              {showValidationErrors && !fullName && (
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.negative, marginTop: SPACING.xs, fontWeight: '600' }}>
                  Required
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: FONT_SIZE.sm, 
                fontWeight: '700', 
                color: COLORS.textPrimary,
                marginBottom: SPACING.xs,
              }}>
                Phone Number *
              </Text>
              <TextInput
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                placeholder="(123) 456-7890"
                placeholderTextColor={COLORS.textTertiary}
                keyboardType="phone-pad"
                maxLength={14}
                style={{
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 2,
                  borderColor: showValidationErrors && !isPhoneNumberValid ? COLORS.negative : COLORS.border,
                  borderRadius: RADIUS.md,
                  padding: SPACING.md,
                  fontSize: FONT_SIZE.base,
                  color: COLORS.textPrimary,
                  fontWeight: '500',
                }}
              />
              {showValidationErrors && !isPhoneNumberValid && (
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.negative, marginTop: SPACING.xs, fontWeight: '600' }}>
                  10 digits required
                </Text>
              )}
            </View>
          </View>

          {/* What best describes you & How do you operate - 2 Columns */}
          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: FONT_SIZE.sm, 
                fontWeight: '700', 
                color: COLORS.textPrimary,
                marginBottom: SPACING.xs,
              }}>
                What best describes you? *
              </Text>
              <TouchableOpacity
                onPress={() => setShowUserTypeModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 2,
                  borderColor: showValidationErrors && !userType ? COLORS.negative : COLORS.border,
                  borderRadius: RADIUS.md,
                  padding: SPACING.md,
                }}
              >
                <Text 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    fontSize: FONT_SIZE.base,
                    color: userType ? COLORS.textPrimary : COLORS.textTertiary,
                    fontWeight: '500',
                    flex: 1,
                    marginRight: SPACING.xs,
                  }}
                >
                  {userType === 'barber' ? 'Barber' : userType === 'owner' ? 'Shop Owner / Manager' : 'Select...'}
                </Text>
                <ChevronDown size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: FONT_SIZE.sm, 
                fontWeight: '700', 
                color: COLORS.textPrimary,
                marginBottom: SPACING.xs,
              }}>
                How do you operate? *
              </Text>
              <TouchableOpacity
                onPress={() => setShowOperateModal(true)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: COLORS.surfaceElevated,
                  borderWidth: 2,
                  borderColor: showValidationErrors && !selectedRole.barber_type ? COLORS.negative : COLORS.border,
                  borderRadius: RADIUS.md,
                  padding: SPACING.md,
                }}
              >
                <Text 
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  style={{
                    fontSize: FONT_SIZE.base,
                    color: selectedRole.label ? COLORS.textPrimary : COLORS.textTertiary,
                    fontWeight: '500',
                    flex: 1,
                    marginRight: SPACING.xs,
                  }}
                >
                  {selectedRole.label || 'Select...'}
                </Text>
                <ChevronDown size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Username & Commission Rate (if commission) - Conditional 2 Columns */}
          <View style={{ flexDirection: 'row', gap: SPACING.md }}>
            <View style={{ flex: 1 }}>
              <Text style={{ 
                fontSize: FONT_SIZE.sm, 
                fontWeight: '700', 
                color: COLORS.textPrimary,
                marginBottom: SPACING.xs,
              }}>
                Username *
              </Text>
              <View style={{ position: 'relative' }}>
                <TextInput
                  value={username}
                  onChangeText={handleUsernameChange}
                  placeholder="johndoe"
                  placeholderTextColor={COLORS.textTertiary}
                  autoCapitalize="none"
                  onFocus={() => {
                    setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
                  }}
                  style={{
                    backgroundColor: COLORS.surfaceElevated,
                    borderWidth: 2,
                    borderColor: showValidationErrors && !isUsernameValid ? COLORS.negative : COLORS.border,
                    borderRadius: RADIUS.md,
                    padding: SPACING.md,
                    paddingRight: 40,
                    fontSize: FONT_SIZE.base,
                    color: COLORS.textPrimary,
                    fontWeight: '500',
                  }}
                />
                <View style={{ position: 'absolute', right: SPACING.md, top: SPACING.md }}>
                  {usernameStatus === 'checking' && (
                    <ActivityIndicator size="small" color={COLORS.primary} />
                  )}
                  {usernameStatus === 'available' && (
                    <Check size={20} color={COLORS.positive} />
                  )}
                  {usernameStatus === 'taken' && (
                    <X size={20} color={COLORS.negative} />
                  )}
                </View>
              </View>
              {username.length > 0 && username.length < 3 && (
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.textSecondary, marginTop: SPACING.xs }}>
                  Min 3 characters
                </Text>
              )}
              {usernameStatus === 'taken' && (
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.negative, marginTop: SPACING.xs, fontWeight: '600' }}>
                  Already taken
                </Text>
              )}
              {usernameStatus === 'available' && (
                <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.positive, marginTop: SPACING.xs, fontWeight: '600' }}>
                  Available ✓
                </Text>
              )}
            </View>

            {selectedRole.barber_type === 'commission' && (
              <View style={{ flex: 1 }}>
                <Text style={{ 
                  fontSize: FONT_SIZE.sm, 
                  fontWeight: '700', 
                  color: COLORS.textPrimary,
                  marginBottom: SPACING.xs,
                }}>
                  Commission Rate (%) *
                </Text>
                <TextInput
                  value={commissionRate === '' ? '' : commissionRate.toString()}
                  onChangeText={(text) => {
                    const num = parseInt(text)
                    setCommissionRate(isNaN(num) ? '' : num)
                  }}
                  placeholder="50"
                  placeholderTextColor={COLORS.textTertiary}
                  keyboardType="number-pad"
                  maxLength={3}
                  style={{
                    backgroundColor: COLORS.surfaceElevated,
                    borderWidth: 2,
                    borderColor: showValidationErrors && !isCommissionValid ? COLORS.negative : COLORS.border,
                    borderRadius: RADIUS.md,
                    padding: SPACING.md,
                    fontSize: FONT_SIZE.base,
                    color: COLORS.textPrimary,
                    fontWeight: '500',
                  }}
                />
                {showValidationErrors && !isCommissionValid && (
                  <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.negative, marginTop: SPACING.xs, fontWeight: '600' }}>
                    1-100 required
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Booking Link */}
          <View>
            <Text style={{ 
              fontSize: FONT_SIZE.sm, 
              fontWeight: '700', 
              color: COLORS.textPrimary,
              marginBottom: SPACING.xs,
            }}>
              Booking Link *
            </Text>
            <TextInput
              value={bookingLink}
              onChangeText={setBookingLink}
              placeholder="https://acuityscheduling.com/..."
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
              keyboardType="url"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              onFocus={() => {
                setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100)
              }}
              style={{
                backgroundColor: COLORS.surfaceElevated,
                borderWidth: 2,
                borderColor: showValidationErrors && !isBookingLinkValid ? COLORS.negative : COLORS.border,
                borderRadius: RADIUS.md,
                padding: SPACING.md,
                fontSize: FONT_SIZE.base,
                color: COLORS.textPrimary,
                fontWeight: '500',
                minHeight: 80,
              }}
            />
            {showValidationErrors && !isBookingLinkValid && (
              <Text style={{ fontSize: FONT_SIZE.xs, color: COLORS.negative, marginTop: SPACING.xs, fontWeight: '600' }}>
                Required
              </Text>
            )}
          </View>

          {/* Continue Button - Auto-saves profile */}
          <TouchableOpacity
            onPress={handleSaveAndNext}
            disabled={!isProfileValid || saving}
            style={{
              backgroundColor: !isProfileValid || saving ? COLORS.surfaceElevated : COLORS.primary,
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              alignItems: 'center',
              marginTop: SPACING.lg,
              shadowColor: !isProfileValid || saving ? '#000' : COLORS.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: !isProfileValid || saving ? 0 : 0.3,
              shadowRadius: 8,
              elevation: !isProfileValid || saving ? 0 : 4,
            }}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.textSecondary} />
            ) : (
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '800',
                color: !isProfileValid ? COLORS.textTertiary : COLORS.textInverse,
                letterSpacing: 0.5,
              }}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}