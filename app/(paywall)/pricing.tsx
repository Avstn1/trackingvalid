// Minimal paywall - no purchases, just status check
// All subscriptions must be purchased through the web app
import { supabase } from '@/utils/supabaseClient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { RefreshCw } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function PricingScreen() {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // Auto-check subscription status on mount
  useEffect(() => {
    checkSubscriptionStatus(true)
  }, [])

  const checkSubscriptionStatus = async (silent = false) => {
    if (!silent) setChecking(true)

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_subscription_status, trial_active')
        .eq('user_id', user.id)
        .single()

      const isActive =
        profile?.stripe_subscription_status === 'active' ||
        profile?.stripe_subscription_status === 'trialing' ||
        profile?.trial_active === true

      if (isActive) {
        router.replace('/(dashboard)/dashboard')
      } else if (!silent) {
        Alert.alert('No Active Subscription', 'No active subscription found.')
      }
    } catch (err) {
      if (!silent) {
        Alert.alert('Error', 'Could not check subscription status.')
      }
    } finally {
      setChecking(false)
      setInitialLoading(false)
    }
  }

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut({ scope: 'global' })
          await AsyncStorage.setItem('just-logged-out', 'true')
          router.replace('/login')
        },
      },
    ])
  }

  if (initialLoading) {
    return (
      <SafeAreaView className="flex-1 bg-[#101312] items-center justify-center">
        <ActivityIndicator size="large" color="#7affc9" />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView className="flex-1 bg-[#101312] px-6">
      <View className="flex-1 justify-center items-center">
        <Text className="text-3xl font-bold text-white text-center mb-4">
          Corva Pro Required
        </Text>
        <Text className="text-base text-[#8a9e93] text-center mb-10 px-4">
          A Corva Pro subscription is required to access this feature.
        </Text>

        <TouchableOpacity
          onPress={() => checkSubscriptionStatus(false)}
          disabled={checking}
          className="flex-row items-center gap-3 bg-[#7affc9]/10 border border-[#7affc9]/30 rounded-xl py-4 px-6"
        >
          {checking ? (
            <ActivityIndicator size="small" color="#7affc9" />
          ) : (
            <RefreshCw size={20} color="#7affc9" />
          )}
          <Text className="text-[#7affc9] font-semibold text-base">
            {checking ? 'Checking...' : 'Already subscribed? Check Status'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row justify-between items-center pb-6">
        <TouchableOpacity onPress={() => router.back()} className="py-3 px-5">
          <Text className="text-gray-400 font-semibold">Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="py-3 px-8 bg-white/5 rounded-lg border border-white/10"
        >
          <Text className="text-gray-400 font-semibold">Logout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}
