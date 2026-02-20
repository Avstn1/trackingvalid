import { supabase } from '@/utils/supabaseClient'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import {
  ArrowRight,
  Check,
  Crown,
  ExternalLink,
  Zap,
} from 'lucide-react-native'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

const TRIAL_FEATURES = [
  'Auto-Fill your empty slots',
  'Smart booking reminders to past clients',
  'Real-time booking alerts',
  'Weekly performance insights',
]

const PRO_FEATURES = [
  'Everything in trial',
  'Full analytics dashboard',
  'Revenue & profit tracking',
  'Priority support',
]

export default function PlansScreen() {
  const router = useRouter()
  const [trialLoading, setTrialLoading] = useState(false)
  const [webLoading, setWebLoading] = useState(false)

  const activateTrial = async () => {
    try {
      setTrialLoading(true)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token) {
        Alert.alert('Session expired', 'Please log in again.')
        router.replace('/login')
        return
      }

      console.log('Starting trial with access token:', session.access_token)
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/trial/start`,
        {
          method: 'POST',
          headers: {
            'x-client-access-token': session.access_token,
          },
        }
      )

      const data = await res.json()
      console.log('Trial start response:', data)
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start trial')
      }

      router.replace('/(dashboard)/dashboard')
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not start your trial. Try again.')
    } finally {
      setTrialLoading(false)
    }
  }

  const openWebPricing = async () => {
    try {
      setWebLoading(true)

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.access_token || !session?.user?.id) {
        Alert.alert('Session expired', 'Please log in again.')
        router.replace('/login')
        return
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/mobile-web-redirect/generate-web-token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-client-access-token': session.access_token,
          },
        }
      )

      const data = await response.json()

      if (!response.ok || !data.code) {
        throw new Error(data.error || 'Failed to generate access code')
      }

      const pricingUrl = `${process.env.EXPO_PUBLIC_API_URL}/pricing?code=${data.code}&src=pricing`

      await WebBrowser.openBrowserAsync(pricingUrl, {
        presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
        toolbarColor: '#101312',
        controlsColor: '#7affc9',
        dismissButtonStyle: 'close',
      })
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Could not open pricing page.')
    } finally {
      setWebLoading(false)
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-[#101312]"
      contentContainerClassName="px-6 pt-24 pb-32"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View className="mb-6">
        <Text className="text-2xl font-bold text-white tracking-tight mb-1">
          Start for free
        </Text>
        <Text className="text-sm text-[#8a9e93]">
          Try Corva risk-free. No card required.
        </Text>
      </View>

      {/* Free Trial Card */}
      <View className="bg-[#161d19] rounded-2xl p-5 border border-[#7affc9]/30 mb-4">
        {/* Badge */}
        <View className="flex-row items-center gap-1.5 bg-[#7affc9] self-start px-3 py-1 rounded-full mb-3">
          <Zap size={11} color="#101312" strokeWidth={2.5} />
          <Text className="text-[10px] font-extrabold text-[#101312] tracking-widest">
            FREE TRIAL
          </Text>
        </View>

        {/* Price */}
        <View className="flex-row items-end gap-3 mb-4">
          <Text className="text-5xl font-extrabold text-white leading-tight">$0</Text>
          <View className="pb-1.5 gap-0.5">
            <Text className="text-sm font-semibold text-[#7affc9]">21 days</Text>
            <Text className="text-xs text-[#4a6050]">No card required</Text>
          </View>
        </View>

        <View className="h-px bg-white/5 mb-4" />

        {/* Features */}
        <View className="gap-2.5 mb-5">
          {TRIAL_FEATURES.map((feature, i) => (
            <View key={i} className="flex-row items-center gap-2.5">
              <View className="w-5 h-5 rounded-full bg-[#7affc9] items-center justify-center">
                <Check size={11} color="#101312" strokeWidth={3} />
              </View>
              <Text className="text-sm text-[#c8d9ce] flex-1">{feature}</Text>
            </View>
          ))}
        </View>

        {/* CTA */}
        <TouchableOpacity
          onPress={activateTrial}
          disabled={trialLoading || webLoading}
          activeOpacity={0.85}
          className="rounded-xl overflow-hidden"
        >
          <LinearGradient
            colors={trialLoading ? ['#444', '#333'] : ['#7affc9', '#3af1f7']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 }}
          >
            {trialLoading ? (
              <ActivityIndicator color="#ccc" size="small" />
            ) : (
              <>
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#101312' }}>
                  Start Free Trial
                </Text>
                <ArrowRight size={16} color="#101312" strokeWidth={2.5} />
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* OR Divider */}
      <View className="flex-row items-center gap-3 mb-4">
        <View className="flex-1 h-px bg-white/5" />
        <Text className="text-xs text-[#3d5045] font-medium">or</Text>
        <View className="flex-1 h-px bg-white/5" />
      </View>

      {/* Pro Plans Card */}
      <TouchableOpacity
        onPress={openWebPricing}
        disabled={trialLoading || webLoading}
        activeOpacity={0.85}
      >
        <View className="bg-[#161d19] rounded-2xl p-5 border border-[#f5e29a]/20">
          {/* Pro Badge */}
          <View className="flex-row items-center gap-1.5 bg-[#f5e29a]/10 border border-[#f5e29a]/25 self-start px-3 py-1 rounded-full mb-3">
            <Crown size={11} color="#f5e29a" strokeWidth={2} />
            <Text className="text-[10px] font-extrabold text-[#f5e29a] tracking-widest">
              BEST VALUE
            </Text>
          </View>

          <View className="flex-row items-center justify-between mb-1">
            <Text className="text-xl font-bold text-white">Pro Plans</Text>
            {webLoading ? (
              <ActivityIndicator color="#7affc9" size="small" />
            ) : (
              <ExternalLink size={16} color="#7affc9" strokeWidth={1.5} />
            )}
          </View>

          <Text className="text-xs text-[#4a6050] mb-4">
            Monthly & yearly options available
          </Text>

          <View className="h-px bg-white/5 mb-4" />

          {/* Features */}
          <View className="gap-2.5">
            {PRO_FEATURES.map((feature, i) => (
              <View key={i} className="flex-row items-center gap-2.5">
                <View className="w-5 h-5 rounded-full bg-[#f5e29a] items-center justify-center">
                  <Check size={11} color="#101312" strokeWidth={3} />
                </View>
                <Text className="text-sm text-[#c8d9ce] flex-1">{feature}</Text>
              </View>
            ))}
          </View>

          <View className="flex-row items-center justify-center gap-2 bg-[#7affc9]/10 border border-[#7affc9]/20 rounded-xl py-2.5 px-4 mt-5">
            <Text className="text-sm font-semibold text-[#7affc9]">
              View pricing & plans
            </Text>
            <ArrowRight size={14} color="#7affc9" strokeWidth={2} />
          </View>

          <Text className="text-[11px] text-[#3d5045] text-center mt-2">
            Opens in secure in-app browser
          </Text>
        </View>
      </TouchableOpacity>

      <Text className="text-xs text-[#3d5045] text-center mt-5">
        Cancel anytime • No hidden fees
      </Text>
    </ScrollView>
  )
}