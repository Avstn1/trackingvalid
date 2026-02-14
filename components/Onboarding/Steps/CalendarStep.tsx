// components/Onboarding/Steps/CalendarStep.tsx
import ConnectAcuityButton from '@/components/Profile/Settings/ConnectAcuityButton'
import { COLORS, FONT_SIZE, RADIUS, SPACING } from '@/constants/design-system'
import { supabase } from '@/utils/supabaseClient'
import { ChevronDown } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

interface CalendarStepProps {
  selectedProvider: 'acuity' | 'square' | null
  setSelectedProvider: (value: 'acuity' | 'square' | null) => void
  calendarStatus: {
    acuity: boolean
    square: boolean
    loading: boolean
  }
  acuityCalendars: { id: number | string; name: string }[]
  selectedAcuityCalendar: string
  setSelectedAcuityCalendar: (value: string) => void
  fetchCalendarStatus: () => void
  onBack: () => void
  onNext: () => void
  onSaveCalendar: () => Promise<void>
  isCalendarConnected: boolean
  profileLoading: boolean
}

export default function CalendarStep({
  selectedProvider,
  setSelectedProvider,
  calendarStatus,
  acuityCalendars,
  selectedAcuityCalendar,
  setSelectedAcuityCalendar,
  fetchCalendarStatus,
  onBack,
  onNext,
  onSaveCalendar,
  isCalendarConnected,
  profileLoading,
}: CalendarStepProps) {
  const [saving, setSaving] = useState(false)
  const [isCalendarLocked, setIsCalendarLocked] = useState(false)
  const [loadingLockStatus, setLoadingLockStatus] = useState(true)
  const [existingCalendar, setExistingCalendar] = useState<string>('')
  const [showCalendarModal, setShowCalendarModal] = useState(false)

  const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL || ''

  useEffect(() => {
    checkCalendarLock()
  }, [])

  const checkCalendarLock = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('calendar')
        .eq('user_id', user.id)
        .single()

      if (profile?.calendar) {
        setIsCalendarLocked(true)
        setExistingCalendar(profile.calendar)
        setSelectedAcuityCalendar(profile.calendar)
      }
    } catch (error) {
      console.error('Error checking calendar lock:', error)
    } finally {
      setLoadingLockStatus(false)
    }
  }

  const handleNext = async () => {
    const isCalendarSelected = isCalendarLocked || (selectedProvider === 'acuity' 
      ? !!selectedAcuityCalendar 
      : selectedProvider === 'square')

    if (!isCalendarSelected) return

    setSaving(true)
    try {
      await onSaveCalendar()
      onNext()
    } catch (error) {
      console.error('Error saving calendar:', error)
    } finally {
      setSaving(false)
    }
  }

  const providerConnected =
    selectedProvider === 'acuity'
      ? calendarStatus.acuity
      : selectedProvider === 'square'
        ? calendarStatus.square
        : false

  const isCalendarSelected = isCalendarLocked || (selectedProvider === 'acuity' 
    ? !!selectedAcuityCalendar 
    : selectedProvider === 'square')

  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING['3xl'] }}>
      {/* Calendar Selection Modal */}
      <Modal
        visible={showCalendarModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendarModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowCalendarModal(false)}
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
            maxHeight: '70%',
          }}>
            <Text style={{
              fontSize: FONT_SIZE.lg,
              fontWeight: '700',
              color: COLORS.textPrimary,
              marginBottom: SPACING.lg,
              textAlign: 'center',
            }}>
              Select Calendar
            </Text>
            
            <ScrollView showsVerticalScrollIndicator={false}>
              {acuityCalendars.map((cal) => (
                <TouchableOpacity
                  key={cal.id}
                  onPress={() => {
                    if (!isCalendarLocked) {
                      setSelectedAcuityCalendar(cal.name)
                      setShowCalendarModal(false)
                    }
                  }}
                  disabled={isCalendarLocked}
                  style={{
                    padding: SPACING.lg,
                    borderRadius: RADIUS.md,
                    backgroundColor: selectedAcuityCalendar === cal.name ? COLORS.primaryMuted : COLORS.surfaceElevated,
                    borderWidth: 2,
                    borderColor: selectedAcuityCalendar === cal.name ? COLORS.primary : COLORS.border,
                    marginBottom: SPACING.sm,
                  }}
                >
                  <Text style={{
                    fontSize: FONT_SIZE.base,
                    fontWeight: '700',
                    color: selectedAcuityCalendar === cal.name ? COLORS.primary : COLORS.textPrimary,
                    textAlign: 'center',
                  }}>
                    {cal.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
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
        <View>
          <Text style={{ 
            fontSize: FONT_SIZE['2xl'], 
            fontWeight: '800', 
            color: COLORS.textPrimary,
            letterSpacing: -0.5,
          }}>
            Connect your calendar
          </Text>
          <Text style={{ 
            fontSize: FONT_SIZE.sm, 
            color: COLORS.textSecondary,
            marginTop: SPACING.xs,
          }}>
            Choose the provider you want to sync
          </Text>
        </View>

        {/* Provider Selection */}
        <View style={{ gap: SPACING.md }}>
          <TouchableOpacity
            onPress={() => setSelectedProvider('acuity')}
            style={{
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              borderWidth: 2,
              borderColor: selectedProvider === 'acuity' ? COLORS.primary : COLORS.border,
              backgroundColor: selectedProvider === 'acuity' ? COLORS.primaryMuted : COLORS.surfaceElevated,
              shadowColor: selectedProvider === 'acuity' ? COLORS.primary : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selectedProvider === 'acuity' ? 0.2 : 0,
              shadowRadius: 8,
              elevation: selectedProvider === 'acuity' ? 4 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedProvider === 'acuity' ? COLORS.primary : COLORS.border,
                backgroundColor: selectedProvider === 'acuity' ? COLORS.primary : 'transparent',
                marginRight: SPACING.md,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {selectedProvider === 'acuity' && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: COLORS.textInverse,
                  }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: FONT_SIZE.lg,
                  fontWeight: '700',
                  color: selectedProvider === 'acuity' ? COLORS.primary : COLORS.textPrimary,
                }}>
                  Acuity
                </Text>
                <Text style={{
                  fontSize: FONT_SIZE.xs,
                  color: COLORS.textSecondary,
                  marginTop: 2,
                }}>
                  Recommended for booking management
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedProvider('square')}
            style={{
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              borderWidth: 2,
              borderColor: selectedProvider === 'square' ? COLORS.primary : COLORS.border,
              backgroundColor: selectedProvider === 'square' ? COLORS.primaryMuted : COLORS.surfaceElevated,
              shadowColor: selectedProvider === 'square' ? COLORS.primary : '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: selectedProvider === 'square' ? 0.2 : 0,
              shadowRadius: 8,
              elevation: selectedProvider === 'square' ? 4 : 0,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                borderWidth: 2,
                borderColor: selectedProvider === 'square' ? COLORS.primary : COLORS.border,
                backgroundColor: selectedProvider === 'square' ? COLORS.primary : 'transparent',
                marginRight: SPACING.md,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                {selectedProvider === 'square' && (
                  <View style={{
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: COLORS.textInverse,
                  }} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{
                  fontSize: FONT_SIZE.lg,
                  fontWeight: '700',
                  color: selectedProvider === 'square' ? COLORS.primary : COLORS.textPrimary,
                }}>
                  Square
                </Text>
                <Text style={{
                  fontSize: FONT_SIZE.xs,
                  color: COLORS.textSecondary,
                  marginTop: 2,
                }}>
                  Best if you take payments + bookings in Square
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Connection Section */}
        {selectedProvider && (
          <View style={{
            padding: SPACING.lg,
            borderRadius: RADIUS.xl,
            borderWidth: 2,
            borderColor: COLORS.border,
            backgroundColor: COLORS.surfaceElevated,
            gap: SPACING.lg,
          }}>
            <View>
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '700',
                color: COLORS.textPrimary,
              }}>
                {selectedProvider === 'acuity' ? 'Acuity Selected' : 'Square Selected'}
              </Text>
              <Text style={{
                fontSize: FONT_SIZE.sm,
                color: COLORS.textSecondary,
                marginTop: SPACING.xs,
              }}>
                {providerConnected
                  ? 'Calendar connected successfully.'
                  : 'Connect to begin syncing appointments.'}
              </Text>
            </View>

            {!providerConnected && (
              <View>
                {selectedProvider === 'acuity' ? (
                  <ConnectAcuityButton
                    onConnectSuccess={fetchCalendarStatus}
                    apiBaseUrl={apiBaseUrl}
                  />
                ) : (
                  <TouchableOpacity
                    style={{
                      backgroundColor: COLORS.primary,
                      padding: SPACING.md,
                      borderRadius: RADIUS.md,
                      alignItems: 'center',
                    }}
                  >
                    <Text style={{
                      fontSize: FONT_SIZE.base,
                      fontWeight: '700',
                      color: COLORS.textInverse,
                    }}>
                      Connect to Square (Coming Soon)
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {providerConnected && selectedProvider === 'acuity' && acuityCalendars.length > 0 && (
              <View style={{ gap: SPACING.sm }}>
                <Text style={{
                  fontSize: FONT_SIZE.sm,
                  fontWeight: '700',
                  color: COLORS.textPrimary,
                }}>
                  Select Calendar
                </Text>
                
                <TouchableOpacity
                  onPress={() => !isCalendarLocked && setShowCalendarModal(true)}
                  disabled={isCalendarLocked}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: isCalendarLocked ? COLORS.surfaceElevated + '40' : COLORS.surfaceElevated,
                    borderWidth: 2,
                    borderColor: COLORS.border,
                    borderRadius: RADIUS.md,
                    padding: SPACING.md,
                  }}
                >
                  <Text
                    numberOfLines={1}
                    ellipsizeMode="tail"
                    style={{
                      fontSize: FONT_SIZE.base,
                      color: isCalendarLocked || selectedAcuityCalendar ? COLORS.textPrimary : COLORS.textTertiary,
                      fontWeight: '500',
                      flex: 1,
                      marginRight: SPACING.xs,
                    }}
                  >
                    {isCalendarLocked ? existingCalendar : (selectedAcuityCalendar || 'Select a calendar...')}
                  </Text>
                  {!isCalendarLocked && (
                    <ChevronDown size={20} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>

                {!isCalendarLocked && (
                  <View style={{
                    padding: SPACING.sm,
                    borderRadius: RADIUS.sm,
                    borderWidth: 1,
                    borderColor: '#DC2626',
                    backgroundColor: 'rgba(220, 38, 38, 0.1)',
                  }}>
                    <Text style={{
                      fontSize: FONT_SIZE.xs,
                      color: '#EF4444',
                      fontWeight: '600',
                    }}>
                      ⚠️ WARNING: You cannot change your calendar after clicking Next.
                    </Text>
                    <Text style={{
                      fontSize: FONT_SIZE.xs,
                      color: '#EF4444',
                      marginTop: SPACING.xs,
                    }}>
                      Make sure you select the correct calendar before proceeding.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {providerConnected && (
              <View style={{ flexDirection: 'row', gap: SPACING.xs, flexWrap: 'wrap' }}>
                <View style={{
                  paddingHorizontal: SPACING.sm,
                  paddingVertical: 6,
                  borderRadius: RADIUS.full,
                  borderWidth: 1,
                  borderColor: COLORS.positive,
                  backgroundColor: COLORS.positiveMuted,
                }}>
                  <Text style={{
                    fontSize: FONT_SIZE.xs,
                    color: COLORS.positive,
                    fontWeight: '600',
                  }}>
                    {selectedProvider === 'acuity' ? 'Acuity connected' : 'Square connected'}
                  </Text>
                </View>
                {selectedProvider === 'acuity' && (
                  <View style={{
                    paddingHorizontal: SPACING.sm,
                    paddingVertical: 6,
                    borderRadius: RADIUS.full,
                    borderWidth: 1,
                    borderColor: selectedAcuityCalendar ? COLORS.positive : '#F59E0B',
                    backgroundColor: selectedAcuityCalendar ? COLORS.positiveMuted : COLORS.warningMuted,
                  }}>
                    <Text style={{
                      fontSize: FONT_SIZE.xs,
                      color: selectedAcuityCalendar ? COLORS.positive : '#F59E0B',
                      fontWeight: '600',
                    }}>
                      {selectedAcuityCalendar ? `Calendar: ${selectedAcuityCalendar}` : 'Calendar not selected'}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Buttons */}
        <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.lg }}>
          <TouchableOpacity
            onPress={onBack}
            disabled={saving}
            style={{
              flex: 1,
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              borderWidth: 2,
              borderColor: COLORS.border,
              backgroundColor: COLORS.surfaceElevated,
              alignItems: 'center',
              opacity: saving ? 0.5 : 1,
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
            onPress={handleNext}
            disabled={profileLoading || saving || !isCalendarConnected || !isCalendarSelected}
            style={{
              flex: 2,
              padding: SPACING.lg,
              borderRadius: RADIUS.xl,
              backgroundColor: profileLoading || saving || !isCalendarConnected || !isCalendarSelected
                ? COLORS.surfaceElevated
                : COLORS.primary,
              alignItems: 'center',
              shadowColor: profileLoading || saving || !isCalendarConnected || !isCalendarSelected 
                ? '#000' 
                : COLORS.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: profileLoading || saving || !isCalendarConnected || !isCalendarSelected ? 0 : 0.3,
              shadowRadius: 8,
              elevation: profileLoading || saving || !isCalendarConnected || !isCalendarSelected ? 0 : 4,
            }}
          >
            {saving ? (
              <ActivityIndicator color={COLORS.textSecondary} />
            ) : (
              <Text style={{
                fontSize: FONT_SIZE.lg,
                fontWeight: '800',
                color: profileLoading || saving || !isCalendarConnected || !isCalendarSelected
                  ? COLORS.textTertiary
                  : COLORS.textInverse,
                letterSpacing: 0.5,
              }}>
                Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {!isCalendarConnected && (
          <Text style={{
            fontSize: FONT_SIZE.xs,
            color: COLORS.textSecondary,
            textAlign: 'center',
          }}>
            Connect a calendar to continue
          </Text>
        )}
        {isCalendarConnected && !isCalendarSelected && !isCalendarLocked && (
          <Text style={{
            fontSize: FONT_SIZE.xs,
            color: COLORS.textSecondary,
            textAlign: 'center',
          }}>
            Select a calendar to continue
          </Text>
        )}
      </View>
      </View>
    </ScrollView>
  )
}