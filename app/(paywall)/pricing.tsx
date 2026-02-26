import {
  endIAP,
  formatProductPrice,
  getMonthlyProduct,
  initIAP,
  isIAPAvailable,
  PRODUCT_IDS,
  purchaseSubscription,
  restoreAndValidatePurchases,
  validatePurchaseWithBackend,
  type IAPProduct,
} from '@/utils/iapService'
import { supabase } from '@/utils/supabaseClient'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { RotateCcw } from 'lucide-react-native'
import React, { useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'

type Plan = 'monthly' | 'yearly'

type PriceInfo = {
  id: string
  amount: number // in cents
  currency: string
  interval: string | null
  interval_count: number | null
}

type PricingResponse = {
  monthly: PriceInfo
  yearly: PriceInfo
}

export default function PricingScreen() {
  const router = useRouter()
  const { initPaymentSheet, presentPaymentSheet } = useStripe()
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [restoring, setRestoring] = useState(false)
  
  // Stripe pricing (for non-iOS)
  const [pricing, setPricing] = useState<PricingResponse | null>(null)
  const [loadingPrices, setLoadingPrices] = useState(true)
  
  // Apple IAP state (for iOS)
  const [iapProduct, setIapProduct] = useState<IAPProduct | null>(null)
  const [iapReady, setIapReady] = useState(false)
  
  const isIOS = Platform.OS === 'ios'
  const useAppleIAP = isIOS && isIAPAvailable()

  // Initialize IAP on iOS
  useEffect(() => {
    if (!useAppleIAP) return

    let mounted = true

    const setupIAP = async () => {
      try {
        const connected = await initIAP()
        if (!connected || !mounted) return

        const product = await getMonthlyProduct()
        if (mounted) {
          setIapProduct(product)
          setIapReady(true)
          setLoadingPrices(false)
        }
      } catch (error) {
        console.error('IAP setup error:', error)
        if (mounted) {
          setLoadingPrices(false)
        }
      }
    }

    setupIAP()

    return () => {
      mounted = false
      endIAP()
    }
  }, [useAppleIAP])

  // Fetch Stripe prices for non-iOS platforms
  useEffect(() => {
    if (useAppleIAP) return // Skip Stripe pricing on iOS

    const fetchPricing = async () => {
      try {
        const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}api/stripe/pricing`)
        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || 'Failed to load pricing')
        }

        setPricing(data)
      } catch (err: any) {
        console.error('Pricing fetch error:', err)
        Alert.alert('Error', err.message || 'Could not load pricing')
      } finally {
        setLoadingPrices(false)
      }
    }

    fetchPricing()
  }, [useAppleIAP])

  const formatAmount = (amount: number, currency: string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount / 100)

  // Apple IAP purchase flow
  const handleAppleIAPPurchase = async () => {
    if (!iapProduct) {
      Alert.alert('Error', 'Product not available')
      return
    }

    try {
      setLoading(true)
      setSelectedPlan('monthly')

      // Request purchase - shows Apple payment sheet
      const purchase = await purchaseSubscription(PRODUCT_IDS.MONTHLY)

      if (!purchase) {
        // User cancelled
        return
      }

      // Validate with backend
      const result = await validatePurchaseWithBackend(purchase)

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to validate purchase')
        return
      }

      // Success!
      Alert.alert(
        'Success',
        'Your subscription is now active!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(dashboard)/dashboard'),
          },
        ]
      )
    } catch (err: any) {
      console.error('IAP purchase error:', err)
      Alert.alert('Error', err.message || 'Could not complete purchase')
    } finally {
      setLoading(false)
      setSelectedPlan(null)
    }
  }

  // Restore purchases (iOS only)
  const handleRestorePurchases = async () => {
    if (!useAppleIAP) return

    try {
      setRestoring(true)

      const result = await restoreAndValidatePurchases()

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to restore purchases')
        return
      }

      if (result.restored) {
        Alert.alert(
          'Restored',
          'Your subscription has been restored!',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(dashboard)/dashboard'),
            },
          ]
        )
      } else {
        Alert.alert('No Purchases', 'No previous purchases found to restore.')
      }
    } catch (err: any) {
      console.error('Restore error:', err)
      Alert.alert('Error', err.message || 'Could not restore purchases')
    } finally {
      setRestoring(false)
    }
  }

  // Stripe checkout flow (non-iOS)
  const startStripeCheckout = async (plan: Plan) => {
    try {
      setLoading(true)
      setSelectedPlan(plan)

      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user?.id || !session.access_token) {
        Alert.alert('Error', 'Please login first')
        router.replace('/login')
        return
      }

      const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}api/stripe/create-payment-intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-access-token': session.access_token,
        },
        body: JSON.stringify({ plan }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to start checkout')
      }

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Corva',
        paymentIntentClientSecret: data.paymentIntent,
        customerId: data.customer,
        customerEphemeralKeySecret: data.ephemeralKey,
        allowsDelayedPaymentMethods: true,
        defaultBillingDetails: {
          email: session.user.email,
        }, 
      })

      if (initError) {
        throw new Error(initError.message)
      }

      const { error: presentError } = await presentPaymentSheet()

      if (presentError) {
        if (presentError.code === 'Canceled') {
          return
        }
        throw new Error(presentError.message)
      }

      Alert.alert(
        'Success',
        'Your subscription is now active!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(dashboard)/dashboard'),
          },
        ]
      )
      
    } catch (err: any) {
      console.error(err)
      Alert.alert('Error', err.message || 'Could not start checkout')
    } finally {
      setLoading(false)
      setSelectedPlan(null)
    }
  }
  
  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          router.replace('/login')
        },
      },
    ])
  }

  const monthly = pricing?.monthly
  const yearly = pricing?.yearly

  // Render iOS-specific Apple IAP UI
  if (useAppleIAP) {
    return (
      <View style={{ flex: 1, backgroundColor: '#101312' }}>
        <LinearGradient
          colors={['#101312', '#1a1f1b', '#2e3b2b']}
          style={{ flex: 1 }}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <ScrollView
              style={{ flex: 1, paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingTop: 60, paddingBottom: 120 }}
            >
              <View className="bg-black/30 border border-white/10 rounded-3xl p-6">
                <Text className="text-2xl font-bold text-white mb-2">
                  Upgrade to Corva Pro
                </Text>
                <Text className="text-sm text-gray-300 mb-6">
                  Unlock the full power of Corva to grow your business.
                </Text>

                {/* Monthly Plan - Apple IAP */}
                <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                  <Text className="text-lg font-semibold text-white mb-2">
                    Corva Pro (Monthly)
                  </Text>

                  {loadingPrices || !iapProduct ? (
                    <View className="flex-row items-center gap-2 mb-6">
                      <ActivityIndicator size="small" color="#9CA3AF" />
                      <Text className="text-gray-400 text-sm">Loading price…</Text>
                    </View>
                  ) : (
                    <>
                      <Text className="text-3xl font-bold text-white mb-1">
                        {formatProductPrice(iapProduct)}
                      </Text>
                      <Text className="text-xs uppercase tracking-wide text-gray-400 mb-4">
                        per month • cancel anytime
                      </Text>
                    </>
                  )}

                  <View className="mb-4">
                    <Text className="text-xs text-gray-200 mb-2">
                      • Full revenue, expense & profit dashboards
                    </Text>
                    <Text className="text-xs text-gray-200 mb-2">
                      • Marketing funnels & top clients analytics
                    </Text>
                    <Text className="text-xs text-gray-200">
                      • Priority support and future features
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleAppleIAPPurchase}
                    disabled={loading || !iapReady || !iapProduct}
                    activeOpacity={0.8}
                    style={{
                      marginTop: 16,
                      borderRadius: 12,
                      overflow: 'hidden',
                      opacity: loading || !iapReady || !iapProduct ? 0.6 : 1,
                    }}
                  >
                    <LinearGradient
                      colors={['#7affc9', '#3af1f7']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: 14,
                        paddingHorizontal: 16,
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 12,
                      }}
                    >
                      {loading && selectedPlan === 'monthly' && (
                        <ActivityIndicator
                          size="small"
                          color="#000"
                          style={{ marginRight: 8 }}
                        />
                      )}
                      <Text style={{ color: '#000', fontWeight: '600', fontSize: 14 }}>
                        {loading && selectedPlan === 'monthly'
                          ? 'Processing…'
                          : 'Subscribe Monthly'}
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* Restore Purchases */}
                <TouchableOpacity
                  onPress={handleRestorePurchases}
                  disabled={restoring || loading}
                  className="flex-row items-center justify-center py-3"
                  style={{ opacity: restoring || loading ? 0.5 : 1 }}
                >
                  {restoring ? (
                    <ActivityIndicator size="small" color="#9CA3AF" style={{ marginRight: 8 }} />
                  ) : (
                    <RotateCcw size={14} color="#9CA3AF" style={{ marginRight: 6 }} />
                  )}
                  <Text className="text-gray-400 text-sm">
                    {restoring ? 'Restoring…' : 'Restore Purchases'}
                  </Text>
                </TouchableOpacity>

                <Text className="mt-4 text-[11px] text-gray-400 text-center">
                  Payment will be charged to your Apple ID account. Subscription automatically 
                  renews unless canceled at least 24 hours before the end of the current period.
                </Text>
              </View>
            </ScrollView>

            {/* Navigation Buttons */}
            <View
              style={{
                position: 'absolute',
                bottom: 40,
                left: 20,
                right: 20,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <TouchableOpacity
                onPress={() => router.back()}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 32,
                  backgroundColor: 'rgba(122, 255, 201, 0.1)',
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: 'rgba(122, 255, 201, 0.3)',
                }}
              >
                <Text className="text-[#7affc9] font-semibold">Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleLogout}
                style={{
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                }}
              >
                <Text className="text-gray-400 font-semibold">Logout</Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </LinearGradient>
      </View>
    )
  }

  // Render Stripe UI for non-iOS platforms (Android, Web)
  return (
    <View style={{ flex: 1, backgroundColor: '#101312' }}>
      <LinearGradient
        colors={['#101312', '#1a1f1b', '#2e3b2b']}
        style={{ flex: 1 }}
      >
        <SafeAreaView style={{ flex: 1 }}>
          <ScrollView
            style={{ flex: 1, paddingHorizontal: 16 }}
            contentContainerStyle={{ paddingTop: 60, paddingBottom: 120 }}
          >
            <View className="bg-black/30 border border-white/10 rounded-3xl p-6">
              <Text className="text-2xl font-bold text-white mb-2">
                Choose your plan
              </Text>
              <Text className="text-sm text-gray-300 mb-6">
                Pick the plan that works best for your business. You can upgrade,
                downgrade, or cancel anytime.
              </Text>

              {/* Monthly Plan */}
              <View className="bg-white/5 rounded-2xl p-4 border border-white/10 mb-4">
                <Text className="text-lg font-semibold text-white mb-2">
                  Corva Pro (Monthly)
                </Text>

                {loadingPrices || !monthly ? (
                  <View className="flex-row items-center gap-2 mb-6">
                    <ActivityIndicator size="small" color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm">Loading price…</Text>
                  </View>
                ) : (
                  <>
                    <Text className="text-3xl font-bold text-white mb-1">
                      {formatAmount(monthly.amount, monthly.currency)}
                    </Text>
                    <Text className="text-xs uppercase tracking-wide text-gray-400 mb-4">
                      per month • cancel anytime
                    </Text>
                  </>
                )}

                <View className="mb-4">
                  <Text className="text-xs text-gray-200 mb-2">
                    • Full revenue, expense & profit dashboards
                  </Text>
                  <Text className="text-xs text-gray-200 mb-2">
                    • Marketing funnels & top clients analytics
                  </Text>
                  <Text className="text-xs text-gray-200">
                    • Priority support and future features
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => startStripeCheckout('monthly')}
                  disabled={loading || loadingPrices || !monthly}
                  activeOpacity={0.8}
                  style={{
                    marginTop: 16,
                    borderRadius: 12,
                    overflow: 'hidden',
                    opacity: loading || loadingPrices || !monthly ? 0.6 : 1,
                  }}
                >
                  <LinearGradient
                    colors={['#7affc9', '#3af1f7']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                    }}
                  >
                    {loading && selectedPlan === 'monthly' && (
                      <ActivityIndicator
                        size="small"
                        color="#000"
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text style={{ color: '#000', fontWeight: '600', fontSize: 14 }}>
                      {loading && selectedPlan === 'monthly'
                        ? 'Starting checkout…'
                        : 'Subscribe Monthly'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Yearly Plan */}
              <View className="bg-white/5 rounded-2xl p-4 border border-[#f5e29a]/40">
                <Text className="text-lg font-semibold text-white mb-2">
                  Corva Pro (Yearly)
                </Text>

                {loadingPrices || !yearly ? (
                  <View className="flex-row items-center gap-2 mb-6">
                    <ActivityIndicator size="small" color="#9CA3AF" />
                    <Text className="text-gray-400 text-sm">Loading price…</Text>
                  </View>
                ) : (
                  <>
                    <Text className="text-3xl font-bold text-white mb-1">
                      {formatAmount(yearly.amount, yearly.currency)}
                    </Text>
                    <Text className="text-xs uppercase tracking-wide text-gray-400 mb-1">
                      per year • cancel anytime
                    </Text>
                    <Text className="text-xs text-[#f5e29a] mb-4">
                      Best value for growing shops
                    </Text>
                  </>
                )}

                <View className="mb-4">
                  <Text className="text-xs text-gray-200 mb-2">
                    • Everything in Monthly Pro
                  </Text>
                  <Text className="text-xs text-gray-200 mb-2">
                    • Best value for long-term use
                  </Text>
                  <Text className="text-xs text-gray-200">
                    • Locked-in yearly price
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => startStripeCheckout('yearly')}
                  disabled={loading || loadingPrices || !yearly}
                  activeOpacity={0.8}
                  style={{
                    marginTop: 16,
                    borderRadius: 12,
                    overflow: 'hidden',
                    opacity: loading || loadingPrices || !yearly ? 0.6 : 1,
                  }}
                >
                  <LinearGradient
                    colors={['#f5e29a', '#ffd28b']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 12,
                    }}
                  >
                    {loading && selectedPlan === 'yearly' && (
                      <ActivityIndicator
                        size="small"
                        color="#000"
                        style={{ marginRight: 8 }}
                      />
                    )}
                    <Text style={{ color: '#000', fontWeight: '600', fontSize: 14 }}>
                      {loading && selectedPlan === 'yearly'
                        ? 'Starting checkout…'
                        : 'Subscribe Yearly'}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              <Text className="mt-4 text-[11px] text-gray-400">
                All payments are processed securely by Stripe. You can manage or
                cancel your subscription at any time.
              </Text>
            </View>
          </ScrollView>

          {/* Navigation Buttons */}
          <View
            style={{
              position: 'absolute',
              bottom: 40,
              left: 20,
              right: 20,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 32,
                backgroundColor: 'rgba(122, 255, 201, 0.1)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(122, 255, 201, 0.3)',
              }}
            >
              <Text className="text-[#7affc9] font-semibold">Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleLogout}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 20,
              }}
            >
              <Text className="text-gray-400 font-semibold">Logout</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  )
}
