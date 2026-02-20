import PlansScreen from '@/components/Onboarding/PlansScreen'
import { supabase } from '@/utils/supabaseClient'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { LinearGradient } from 'expo-linear-gradient'
import { useRouter } from 'expo-router'
import { BarChart3, Sparkles, TrendingUp, Users } from 'lucide-react-native'
import React, { useRef, useState } from 'react'
import {
  Alert,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
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
    image: require('@/assets/images/corvalogoTransparent.png'),
    title: 'Welcome to Corva',
    description:
      'Turn your barber hustle into a system that makes you more money — automatically.',
    gradient: ['#101312', '#1a1f1b', '#1e2b22'],
  },
  {
    icon: <TrendingUp size={80} color="#7affc9" strokeWidth={1.5} />,
    title: 'See Your Money Clearly',
    description:
      'Instantly track your revenue, expenses, and profits — without the spreadsheets.',
    gradient: ['#101312', '#1a1f1b', '#1e2b22'],
  },
  {
    icon: <Users size={80} color="#3af1f7" strokeWidth={1.5} />,
    title: "Know Who's About to Book",
    description:
      'Corva analyzes your client patterns so you know exactly who to follow up with.',
    gradient: ['#101312', '#1a1f1b', '#1b2528'],
  },
  {
    icon: <BarChart3 size={80} color="#f5e29a" strokeWidth={1.5} />,
    title: 'Stay Booked. Scale Smarter',
    description:
      'Track performance, optimize your funnel, and make data-driven moves to grow.',
    gradient: ['#101312', '#1a1f1b', '#2a2618'],
  },
]

// Page indices
const SPARKLES_PAGE_INDEX = pages.length       // "Ready to Systemize?" page
const PLANS_PAGE_INDEX = pages.length + 1      // PlansScreen
const TOTAL_PAGES = pages.length + 2

export default function OnboardingScreen() {
  const router = useRouter()
  const scrollViewRef = useRef<ScrollView>(null)
  const [currentPage, setCurrentPage] = useState(0)
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

  const scrollTo = (index: number) => {
    scrollViewRef.current?.scrollTo({ x: width * index, animated: true })
  }

  const goToNext = () => {
    if (currentPage < SPARKLES_PAGE_INDEX) {
      scrollTo(currentPage + 1)
    }
  }

  const skipToSparkles = () => scrollTo(SPARKLES_PAGE_INDEX)
  const goToPlans = () => scrollTo(PLANS_PAGE_INDEX)
  const goBackFromPlans = () => scrollTo(SPARKLES_PAGE_INDEX)

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

  const isOnSparklesPage = currentPage === SPARKLES_PAGE_INDEX
  const isOnPlansPage = currentPage === PLANS_PAGE_INDEX
  const isOnOnboardingPage = !isOnSparklesPage && !isOnPlansPage

  return (
    <View className="flex-1 bg-[#101312]">
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
        scrollEnabled={!isOnPlansPage}
      >
        {/* Onboarding Pages */}
        {pages.map((page, index) => (
          <LinearGradient
            key={index}
            colors={page.gradient}
            style={{ width, height, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}
          >
            <Animated.View
              style={{
                opacity: scrollX.interpolate({
                  inputRange: [(index - 1) * width, index * width, (index + 1) * width],
                  outputRange: [0, 1, 0],
                  extrapolate: 'clamp',
                }),
                transform: [
                  {
                    scale: scrollX.interpolate({
                      inputRange: [(index - 1) * width, index * width, (index + 1) * width],
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
                    style={{ width: 120, height: 120, resizeMode: 'contain' }}
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

        {/* Sparkles / "Ready to Systemize?" Page */}
        <LinearGradient
          colors={['#2e3b2b', '#101312', '#101312']}
          style={{ width, height, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }}
        >
          <Animated.View
            style={{
              opacity: scrollX.interpolate({
                inputRange: [
                  (SPARKLES_PAGE_INDEX - 1) * width,
                  SPARKLES_PAGE_INDEX * width,
                  (SPARKLES_PAGE_INDEX + 1) * width,
                ],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: scrollX.interpolate({
                    inputRange: [
                      (SPARKLES_PAGE_INDEX - 1) * width,
                      SPARKLES_PAGE_INDEX * width,
                      (SPARKLES_PAGE_INDEX + 1) * width,
                    ],
                    outputRange: [0.8, 1, 0.8],
                    extrapolate: 'clamp',
                  }),
                },
              ],
              alignItems: 'center',
              width: '100%',
            }}
          >
            <View className="items-center mb-8">
              <Sparkles size={80} color="#f5e29a" strokeWidth={1.5} />
            </View>
            <Text className="text-3xl font-bold text-white text-center mb-4">
              Ready to Systemize Your Business?
            </Text>
            <Text className="text-base text-gray-300 text-center leading-6 mb-8">
              Pick your plan and let Corva start bringing clients back automatically.
            </Text>

            <TouchableOpacity
              onPress={goToPlans}
              activeOpacity={0.8}
              className="w-full rounded-xl overflow-hidden"
            >
              <LinearGradient
                colors={['#7affc9', '#3af1f7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ paddingVertical: 16, alignItems: 'center', justifyContent: 'center', borderRadius: 12 }}
              >
                <Text style={{ color: '#000', fontWeight: '600', fontSize: 16 }}>
                  View Plans
                </Text>
              </LinearGradient>
            </TouchableOpacity>


          </Animated.View>
        </LinearGradient>

        {/* Plans Page */}
        <View style={{ width, height }}>
          <Animated.View
            className="flex-1"
            style={{
              opacity: scrollX.interpolate({
                inputRange: [
                  (PLANS_PAGE_INDEX - 1) * width,
                  PLANS_PAGE_INDEX * width,
                  (PLANS_PAGE_INDEX + 1) * width,
                ],
                outputRange: [0, 1, 0],
                extrapolate: 'clamp',
              }),
            }}
          >
            <PlansScreen />
          </Animated.View>
        </View>
      </ScrollView>

      {/* Pagination Dots — all pages except plans */}
      {!isOnPlansPage && (
        <View className="absolute bottom-28 left-0 right-0 flex-row justify-center items-center">
          {Array(SPARKLES_PAGE_INDEX + 1)
            .fill(0)
            .map((_, index) => {
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
      )}

      {/* Nav Buttons — all pages except plans */}
      {!isOnPlansPage && (
        <View className="absolute bottom-10 left-5 right-5 flex-row justify-between items-center">
          <TouchableOpacity onPress={isOnSparklesPage ? goToPlans : skipToSparkles} className="py-3 px-5">
            <Text className="text-gray-400 font-semibold">Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={isOnSparklesPage ? goToPlans : goToNext}
            className="py-3 px-8 bg-[#7affc9]/10 rounded-lg border border-[#7affc9]/30"
          >
            <Text className="text-[#7affc9] font-semibold">Next</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Plans page nav — Back on left like Skip, Logout on right like Next */}
      {isOnPlansPage && (
        <View className="absolute bottom-10 left-5 right-5 flex-row justify-between items-center">
          <TouchableOpacity onPress={goBackFromPlans} className="py-3 px-5">
            <Text className="text-gray-400 font-semibold">Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            className="py-3 px-8 bg-white/5 rounded-lg border border-white/10"
          >
            <Text className="text-gray-400 font-semibold">Logout</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}