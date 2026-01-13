import { supabase } from '@/utils/supabaseClient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import {
  BarChart3,
  Sparkles,
  TrendingUp,
  Users
} from 'lucide-react-native'
import React, { useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  Linking,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native'


const { width, height } = Dimensions.get('window')

type OnboardingPage = {
  icon?: React.ReactNode
  image?: any
  title: string
  description: string
  gradient: string[]
}

const pages: OnboardingPage[] = [
  {
    image: require('@/assets/images/shearworklogo.png'),
    title: 'Welcome to Corva',
    description: 'The all-in-one business management platform designed specifically for you.',
    gradient: ['#101312', '#1a1f1b', '#1e2b22'],
  },
  {
    icon: <TrendingUp size={80} color="#7affc9" strokeWidth={1.5} />,
    title: 'Track Your Revenue',
    description: 'Get real-time insights into your revenue, expenses, and profitability with comprehensive dashboards and organized reports.',
    gradient: ['#101312', '#1a1f1b', '#1e2b22'],
  },
  {
    icon: <Users size={80} color="#3af1f7" strokeWidth={1.5} />,
    title: 'Know Your Clients',
    description: 'Understand your top clients, track retention rates, and see detailed analytics on client behavior.',
    gradient: ['#101312', '#1a1f1b', '#1b2528'],
  },
  {
    icon: <BarChart3 size={80} color="#f5e29a" strokeWidth={1.5} />,
    title: 'Grow Your Career',
    description: 'Analyze marketing funnels, track service performance, and make data-driven decisions to scale.',
    gradient: ['#101312', '#1a1f1b', '#2a2618'],
  },
]

export default function OnboardingScreen() {
  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [isRedirecting, setIsRedirecting] = useState(false)
  const scrollX = useRef(new Animated.Value(0)).current

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x
        const page = Math.round(offsetX / width)
        setCurrentPage(page)
      },
    }
  )

  const goToNext = () => {
    if (currentPage < pages.length) {
      scrollViewRef.current?.scrollTo({
        x: width * (currentPage + 1),
        animated: true,
      })
    }
  }

  const goToPricing = async () => {
    Alert.alert(
      'Redirect to Web',
      'You will be redirected to Corva Web to complete your subscription.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setIsRedirecting(true)
              
              // Get current user session
              const { data: { session } } = await supabase.auth.getSession()
              
              if (!session?.user?.id || !session.access_token) {
                Alert.alert('Error', 'Please login first')
                router.replace('/login')
                setIsRedirecting(false)
                return
              }

              console.log('Generating one-time code for pricing...')

              // Call your API to generate a one-time code
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/mobile-web-redirect/generate-web-token`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-client-access-token': session?.access_token,
                  }
                }
              )

              const data = await response.json()
              
              if (!response.ok || !data.code) {
                throw new Error(data.error || 'Failed to generate access code')
              }

              console.log('Code generated, opening browser...')

              // Open browser with the one-time code
              const pricingUrl = `${process.env.EXPO_PUBLIC_API_URL}/pricing?code=${data.code}`
              
              const supported = await Linking.canOpenURL(pricingUrl)
              
              if (!supported) {
                Alert.alert('Error', 'Cannot open pricing page')
                setIsRedirecting(false)
                return
              }

              await Linking.openURL(pricingUrl)
              
              setTimeout(() => {
                setIsRedirecting(false)
              }, 3000)
              
            } catch (err: any) {
              console.error('Pricing redirect error:', err)
              Alert.alert('Error', err.message || 'Could not open pricing page')
              setIsRedirecting(false)
            }
          }
        }
      ]
    )
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
  const totalPages = pages.length + 1 

  return (
    <View style={{ flex: 1, backgroundColor: '#101312' }}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {/* Onboarding Pages */}
        {pages.map((page, index) => (
          <LinearGradient
            key={index}
            colors={page.gradient}
            style={{
              width,
              height,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 40,
            }}
          >
            <Animated.View
              style={{
                opacity: scrollX.interpolate({
                  inputRange: [
                    (index - 1) * width,
                    index * width,
                    (index + 1) * width,
                  ],
                  outputRange: [0, 1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: scrollX.interpolate({
                      inputRange: [
                        (index - 1) * width,
                        index * width,
                        (index + 1) * width,
                      ],
                      outputRange: [0.8, 1, 0.8],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              }}
            >
              {page.image ? (
                <View className="items-center mb-8">
                  <Image
                    source={page.image}
                    style={{
                      width: 120,
                      height: 120,
                      resizeMode: 'contain',
                    }}
                  />
                </View>
              ) : (
                <View className="items-center mb-8">{page.icon}</View>
              )}
              <Text className="text-3xl font-bold text-white text-center mb-4">
                {page.title}
              </Text>
              <Text className="text-base text-gray-300 text-center leading-6">
                {page.description}
              </Text>
            </Animated.View>
          </LinearGradient>
        ))}

        {/* Final Page - Paywall Teaser */}
        <LinearGradient
          colors={['#2e3b2b', '#101312', '#101312']}
          style={{
            width,
            height,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 40,
          }}
        >
          <Animated.View
            style={{
              opacity: scrollX.interpolate({
                inputRange: [
                  (pages.length - 1) * width,
                  pages.length * width,
                  (pages.length + 1) * width,
                ],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: scrollX.interpolate({
                    inputRange: [
                      (pages.length - 1) * width,
                      pages.length * width,
                      (pages.length + 1) * width,
                    ],
                    outputRange: [0.8, 1, 0.8],
                    extrapolate: 'clamp',
                  }),
                },
              ],
              alignItems: 'center',
            }}
          >
            <View className="items-center mb-8">
              <Sparkles size={80} color="#f5e29a" strokeWidth={1.5} />
            </View>
            <Text className="text-3xl font-bold text-white text-center mb-4">
              Ready to Get Started?
            </Text>
            <Text className="text-base text-gray-300 text-center leading-6 mb-8">
              Choose a plan that works for you and unlock all the powerful features Corva has to offer.
            </Text>
            
            <TouchableOpacity
              onPress={goToPricing}
              activeOpacity={0.8}
              disabled={isRedirecting}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                width: '100%',
              }}
            >
              <LinearGradient
                colors={isRedirecting ? ['#666', '#444'] : ['#7affc9', '#3af1f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  paddingVertical: 16,
                  paddingHorizontal: 32,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 12,
                }}
              >
                <Text style={{ 
                  color: isRedirecting ? '#ccc' : '#000', 
                  fontWeight: '600', 
                  fontSize: 16 
                }}>
                  {isRedirecting ? 'Redirecting...' : 'View Plans'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text className="text-xs text-gray-400 text-center mt-4">
              This will redirect you to Corva Web&apos;s pricing page
            </Text>
          </Animated.View>
        </LinearGradient>
      </ScrollView>

      {/* Pagination Dots */}
      <View
        style={{
          position: 'absolute',
          bottom: 120,
          left: 0,
          right: 0,
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        {Array(totalPages).fill(0).map((_, index) => {
          const inputRange = [
            (index - 1) * width,
            index * width,
            (index + 1) * width,
          ]

          const dotWidth = scrollX.interpolate({
            inputRange,
            outputRange: [8, 20, 8],
            extrapolate: 'clamp',
          })

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          })

          return (
            <Animated.View
              key={index}
              style={{
                width: dotWidth,
                height: 8,
                borderRadius: 4,
                backgroundColor: '#7affc9',
                marginHorizontal: 4,
                opacity,
              }}
            />
          )
        })}
      </View>

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
        {currentPage === totalPages - 1 ? (
          // Last page - show Logout
          <>
            <View style={{ width: 80 }} />
            <TouchableOpacity
              onPress={handleLogout}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 20,
              }}
            >
              <Text className="text-gray-400 font-semibold">Logout</Text>
            </TouchableOpacity>
          </>
        ) : (
          // Other pages - show Skip and Next
          <>
            <TouchableOpacity
              onPress={() => {
                scrollViewRef.current?.scrollTo({
                  x: width * pages.length, 
                  animated: true,
                })
              }}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 20,
              }}
            >
              <Text className="text-gray-400 font-semibold">Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={goToNext}
              style={{
                paddingVertical: 12,
                paddingHorizontal: 32,
                backgroundColor: 'rgba(122, 255, 201, 0.1)',
                borderRadius: 8,
                borderWidth: 1,
                borderColor: 'rgba(122, 255, 201, 0.3)',
              }}
            >
              <Text className="text-[#7affc9] font-semibold">Next</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  )
}