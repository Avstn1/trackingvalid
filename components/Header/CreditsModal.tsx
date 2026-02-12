import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Coins,
  History,
  Lock,
  ShoppingCart,
  TrendingUp,
  X,
  Zap
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Spring config for smooth modal animations
const MODAL_SPRING_CONFIG = {
  damping: 20,
  stiffness: 200,
  mass: 0.5,
};
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Component-specific accent colors
const ACCENT_COLORS = {
  lime: '#c4ff85',
  amber: '#fbbf24',
  sky: '#38bdf8',
  limeGlow: 'rgba(196, 255, 133, 0.2)',
  amberGlow: 'rgba(251, 191, 36, 0.2)',
};

type CreditView = 'balance' | 'history' | 'purchase';
type HistorySubView = 'purchases' | 'transactions';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface CreditTransaction {
  id: string;
  action: string;
  old_available: number;
  new_available: number;
  old_reserved: number;
  new_reserved: number;
  created_at: string;
}

export default function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  const insets = useSafeAreaInsets();
  const screenHeight = Dimensions.get('window').height;
  const modalHeight = screenHeight * 0.85;
  
  const [activeView, setActiveView] = useState<CreditView>('balance');
  const [historySubView, setHistorySubView] = useState<HistorySubView>('purchases');
  const [availableCredits, setAvailableCredits] = useState<number>(0);
  const [reservedCredits, setReservedCredits] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);

  // Animate modal open
  useEffect(() => {
    if (isOpen) {
      translateY.value = modalHeight;
      opacity.value = 0;
      translateY.value = withSpring(0, MODAL_SPRING_CONFIG);
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [isOpen, translateY, opacity, modalHeight]);

  const closeModal = () => {
    if (isClosing) return;
    setIsClosing(true);
    translateY.value = withSpring(modalHeight, MODAL_SPRING_CONFIG);
    opacity.value = withTiming(0, { duration: 200 });
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      translateY.value = 0;
    }, 250);
  };

  // Pan gesture for swipe down on handle only
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        const progress = Math.min(event.translationY / 300, 1);
        opacity.value = 1 - progress * 0.5;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(closeModal)();
      } else {
        translateY.value = withSpring(0, MODAL_SPRING_CONFIG);
        opacity.value = withTiming(1, { duration: 150 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  useEffect(() => {
    if (isOpen) {
      fetchCredits();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeView === 'history') {
      fetchTransactions();
    }
  }, [isOpen, activeView]);

  const fetchCredits = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('No user found');
        return;
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('available_credits, reserved_credits')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching credits:', error);
        return;
      }

      if (profile) {
        setAvailableCredits(profile.available_credits || 0);
        setReservedCredits(profile.reserved_credits || 0);
      }
    } catch (error) {
      console.error('Error in fetchCredits:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        console.error('No user found');
        return;
      }

      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Error fetching transactions:', error);
        return;
      }

      setTransactions(data || []);
    } catch (error) {
      console.error('Error in fetchTransactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = diffInMs / (1000 * 60 * 60);
    const diffInDays = diffInHours / 24;

    if (diffInHours < 1) {
      const minutes = Math.floor(diffInMs / (1000 * 60));
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diffInHours < 24) {
      const hours = Math.floor(diffInHours);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diffInDays < 7) {
      const days = Math.floor(diffInDays);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const getTransactionType = (
    transaction: CreditTransaction
  ): 'credit' | 'debit' | 'reserve' | 'release' => {
    const availableDiff = transaction.new_available - transaction.old_available;
    const reservedDiff = transaction.new_reserved - transaction.old_reserved;

    if (availableDiff > 0 && reservedDiff === 0) return 'credit';
    if (availableDiff < 0 && reservedDiff === 0) return 'debit';
    if (reservedDiff > 0) return 'reserve';
    if (reservedDiff < 0) return 'release';
    return 'credit';
  };

  const getTransactionIcon = (type: 'credit' | 'debit' | 'reserve' | 'release') => {
    switch (type) {
      case 'credit':
        return { Icon: ArrowUpRight, color: ACCENT_COLORS.lime, bg: ACCENT_COLORS.limeGlow };
      case 'debit':
        return { Icon: ArrowDownRight, color: COLORS.negative, bg: COLORS.negativeMuted };
      case 'reserve':
        return { Icon: Lock, color: ACCENT_COLORS.amber, bg: ACCENT_COLORS.amberGlow };
      case 'release':
        return { Icon: TrendingUp, color: ACCENT_COLORS.sky, bg: 'rgba(56, 189, 248, 0.2)' };
    }
  };

  const filteredTransactions = transactions.filter((transaction) => {
    const isPurchase = transaction.action.startsWith('Credits purchased - ');
    return historySubView === 'purchases' ? isPurchase : !isPurchase;
  });

  const goToWebCredits = async () => {
    Alert.alert(
      'Redirect to Web',
      'You will be redirected to Corva Web to purchase credits.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: async () => {
            try {
              setIsRedirecting(true);
              
              // Get current user session
              const { data: { session } } = await supabase.auth.getSession();
              
              if (!session?.user?.id || !session.access_token) {
                Alert.alert('Error', 'Please login first');
                setIsRedirecting(false);
                return;
              }

              console.log('Generating one-time code for credits...');

              // Call API to generate a one-time code
              const response = await fetch(
                `${process.env.EXPO_PUBLIC_API_URL}/api/mobile-web-redirect/generate-web-token`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'x-client-access-token': session?.access_token,
                  }
                }
              );

              const data = await response.json();
              
              if (!response.ok || !data.code) {
                throw new Error(data.error || 'Failed to generate access code');
              }

              console.log('Code generated, opening browser...');
              console.log(data.code);

              // Open browser with the one-time code to settings page
              const settingsUrl = `${process.env.EXPO_PUBLIC_API_URL}/settings?code=${data.code}`;
              
              const supported = await Linking.canOpenURL(settingsUrl);
              
              if (!supported) {
                Alert.alert('Error', 'Cannot open settings page');
                setIsRedirecting(false);
                return;
              }

              await Linking.openURL(settingsUrl);
              
              setTimeout(() => {
                setIsRedirecting(false);
              }, 3000);
              
            } catch (err: any) {
              console.error('Credits redirect error:', err);
              Alert.alert('Error', err.message || 'Could not open credits page');
              setIsRedirecting(false);
            }
          }
        }
      ]
    );
  };

  if (!isOpen) return null;

  return (
    <Modal animationType="none" transparent={true} visible={isOpen} onRequestClose={closeModal}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1 }, backdropStyle]}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <Pressable className="flex-1" onPress={closeModal} />
            <Animated.View
              style={[
                animatedStyle,
                {
                  backgroundColor: COLORS.background,
                  borderTopWidth: 1,
                  borderColor: COLORS.glassBorder,
                  height: modalHeight,
                },
              ]}
              className="rounded-t-3xl"
            >
              {/* Swipe Handle + Header - draggable area */}
              <GestureDetector gesture={panGesture}>
                <View>
                  {/* Swipe Handle */}
                  <View className="items-center py-3">
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        backgroundColor: COLORS.textSecondary,
                        borderRadius: 2,
                        opacity: 0.3,
                      }}
                    />
                  </View>

                  {/* Header */}
                  <View
                    className="flex-row items-center justify-between px-6 pb-4"
                    style={{ borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder }}
                  >
                    <View className="flex-row items-center gap-2 flex-1">
                      <Coins size={24} color={ACCENT_COLORS.lime} />
                      <Text className="text-2xl font-bold text-white">Credits</Text>
                    </View>
                    <TouchableOpacity onPress={onClose} className="p-1">
                      <X size={24} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                </View>
              </GestureDetector>

              {/* View Switcher */}
              <View
            className="px-6 py-4"
            style={{ borderBottomWidth: 1, borderBottomColor: COLORS.glassBorder }}
          >
            <View
              className="flex-row gap-1 rounded-full p-1"
              style={{ backgroundColor: COLORS.surface }}
            >
              <TouchableOpacity
                onPress={() => setActiveView('balance')}
                className="flex-1 px-6 py-3 rounded-full flex-row items-center justify-center gap-2"
                style={{
                  backgroundColor: activeView === 'balance' ? ACCENT_COLORS.lime : 'transparent',
                }}
              >
                <Coins size={16} color={activeView === 'balance' ? '#000' : COLORS.textSecondary} />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: activeView === 'balance' ? '#000' : COLORS.textSecondary }}
                >
                  Balance
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveView('history')}
                className="flex-1 px-6 py-3 rounded-full flex-row items-center justify-center gap-2"
                style={{
                  backgroundColor: activeView === 'history' ? ACCENT_COLORS.lime : 'transparent',
                }}
              >
                <History size={16} color={activeView === 'history' ? '#000' : COLORS.textSecondary} />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: activeView === 'history' ? '#000' : COLORS.textSecondary }}
                >
                  History
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveView('purchase')}
                className="flex-1 px-6 py-3 rounded-full flex-row items-center justify-center gap-2"
                style={{
                  backgroundColor: activeView === 'purchase' ? ACCENT_COLORS.lime : 'transparent',
                }}
              >
                <ShoppingCart
                  size={16}
                  color={activeView === 'purchase' ? '#000' : COLORS.textSecondary}
                />
                <Text
                  className="text-sm font-semibold"
                  style={{ color: activeView === 'purchase' ? '#000' : COLORS.textSecondary }}
                >
                  Buy
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            className="flex-1 px-6"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 20, 20) }}
          >
            {isLoading ? (
              <View className="items-center justify-center py-12">
                <ActivityIndicator size="large" color={ACCENT_COLORS.lime} />
              </View>
            ) : (
              <>
                {/* BALANCE VIEW */}
                {activeView === 'balance' && (
                  <View className="gap-6 py-6">
                    {/* Credit Cards */}
                    <View className="gap-4">
                      {/* Available Credits */}
                      <View
                        className="rounded-2xl p-6 overflow-hidden"
                        style={{
                          backgroundColor: ACCENT_COLORS.limeGlow,
                          borderWidth: 1,
                          borderColor: 'rgba(196, 255, 133, 0.3)',
                        }}
                      >
                        <View className="flex-row items-center gap-2 mb-2">
                          <Coins size={20} color={ACCENT_COLORS.lime} />
                          <Text className="text-sm font-medium" style={{ color: ACCENT_COLORS.lime }}>
                            Available Credits
                          </Text>
                        </View>
                        <View className="flex-row items-baseline gap-2">
                          <Text className="text-5xl font-bold text-white">
                            {availableCredits.toLocaleString()}
                          </Text>
                          <Text className="text-lg" style={{ color: ACCENT_COLORS.lime }}>
                            credits
                          </Text>
                        </View>
                        <Text className="text-xs mt-3" style={{ color: COLORS.textSecondary }}>
                          Ready to use for SMS campaigns and premium features
                        </Text>
                      </View>

                      {/* Reserved Credits */}
                      <View
                        className="rounded-2xl p-6 overflow-hidden"
                        style={{
                          backgroundColor: ACCENT_COLORS.amberGlow,
                          borderWidth: 1,
                          borderColor: 'rgba(251, 191, 36, 0.3)',
                        }}
                      >
                        <View className="flex-row items-center gap-2 mb-2">
                          <Lock size={20} color={ACCENT_COLORS.amber} />
                          <Text className="text-sm font-medium" style={{ color: ACCENT_COLORS.amber }}>
                            Reserved Credits
                          </Text>
                        </View>
                        <View className="flex-row items-baseline gap-2">
                          <Text className="text-5xl font-bold text-white">
                            {reservedCredits.toLocaleString()}
                          </Text>
                          <Text className="text-lg" style={{ color: ACCENT_COLORS.amber }}>
                            credits
                          </Text>
                        </View>
                        <Text className="text-xs mt-3" style={{ color: COLORS.textSecondary }}>
                          Allocated for scheduled messages
                        </Text>
                      </View>
                    </View>

                    {/* Total Balance */}
                    <View
                      className="rounded-xl p-6"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 1,
                        borderColor: COLORS.glassBorder,
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View>
                          <Text className="text-sm mb-1" style={{ color: COLORS.textSecondary }}>
                            Total Balance
                          </Text>
                          <Text className="text-3xl font-bold text-white">
                            {(availableCredits + reservedCredits).toLocaleString()} credits
                          </Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => setActiveView('purchase')}
                          className="px-6 py-3 rounded-full"
                          style={{ backgroundColor: ACCENT_COLORS.lime }}
                        >
                          <Text className="text-sm font-semibold text-black">Buy More</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Usage Info */}
                    <View
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: 'rgba(56, 189, 248, 0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(56, 189, 248, 0.2)',
                      }}
                    >
                      <View className="flex-row gap-3">
                        <Zap size={20} color={ACCENT_COLORS.sky} className="mt-0.5" />
                        <View className="flex-1">
                          <Text className="text-sm font-semibold mb-1" style={{ color: ACCENT_COLORS.sky }}>
                            How Credits Work
                          </Text>
                          <Text className="text-xs leading-relaxed" style={{ color: COLORS.textSecondary }}>
                            Credits are used for SMS campaigns, premium analytics, and advanced features.
                            Each SMS message costs 1 credit. Reserved credits are allocated for your
                            scheduled messages and will be automatically used when messages are sent. Unused
                            credits never expire.
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}

                {/* HISTORY VIEW */}
                {activeView === 'history' && (
                  <View className="gap-4 py-6">
                    {/* Sub-view switcher */}
                    <View
                      className="flex-row gap-1 rounded-full p-1"
                      style={{ backgroundColor: COLORS.surface }}
                    >
                      <TouchableOpacity
                        onPress={() => setHistorySubView('purchases')}
                        activeOpacity={0.8}
                        className="flex-1 px-4 py-2 rounded-full"
                        style={{
                          backgroundColor:
                            historySubView === 'purchases' ? ACCENT_COLORS.lime : 'transparent',
                        }}
                      >
                        <Text
                          className="text-xs font-semibold text-center"
                          style={{
                            color: historySubView === 'purchases' ? '#000' : COLORS.textSecondary,
                          }}
                        >
                          Credit Purchases
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setHistorySubView('transactions')}
                        activeOpacity={0.8}
                        className="flex-1 px-4 py-2 rounded-full"
                        style={{
                          backgroundColor:
                            historySubView === 'transactions' ? ACCENT_COLORS.lime : 'transparent',
                        }}
                      >
                        <Text
                          className="text-xs font-semibold text-center"
                          style={{
                            color: historySubView === 'transactions' ? '#000' : COLORS.textSecondary,
                          }}
                        >
                          Credit Transactions
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {isLoadingTransactions ? (
                      <View className="items-center justify-center py-12">
                        <ActivityIndicator size="large" color={ACCENT_COLORS.lime} />
                      </View>
                    ) : filteredTransactions.length === 0 ? (
                      <View className="items-center py-12">
                        <View
                          className="w-20 h-20 rounded-full items-center justify-center mb-4"
                          style={{ backgroundColor: ACCENT_COLORS.limeGlow }}
                        >
                          <History size={40} color={ACCENT_COLORS.lime} />
                        </View>
                        <Text className="text-xl font-semibold text-white mb-2">
                          {historySubView === 'purchases' ? 'No Purchases Yet' : 'No Transactions Yet'}
                        </Text>
                        <Text
                          className="text-sm text-center max-w-md mb-6 px-4"
                          style={{ color: COLORS.textSecondary }}
                        >
                          {historySubView === 'purchases'
                            ? 'Your credit purchase history will appear here once you make your first purchase'
                            : 'Your credit usage history will appear here once you start using credits'}
                        </Text>
                        {historySubView === 'purchases' && (
                          <TouchableOpacity
                            onPress={() => setActiveView('purchase')}
                            className="px-6 py-3 rounded-full"
                            style={{ backgroundColor: ACCENT_COLORS.lime }}
                          >
                            <Text className="text-sm font-semibold text-black">
                              Buy Your First Credits
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ) : (
                      <View className="gap-2">
                        {filteredTransactions.map((transaction) => {
                          const type = getTransactionType(transaction);
                          const { Icon, color, bg } = getTransactionIcon(type);
                          const availableDiff = transaction.new_available - transaction.old_available;
                          const reservedDiff = transaction.new_reserved - transaction.old_reserved;

                          return (
                            <View
                              key={transaction.id}
                              className="rounded-xl p-4"
                              style={{
                                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                borderWidth: 1,
                                borderColor: COLORS.glassBorder,
                              }}
                            >
                              <View className="flex-row gap-4">
                                {/* Icon */}
                                <View
                                  className="w-10 h-10 rounded-full items-center justify-center"
                                  style={{ backgroundColor: bg }}
                                >
                                  <Icon size={20} color={color} />
                                </View>

                                {/* Content */}
                                <View className="flex-1">
                                  <View className="flex-row justify-between items-start gap-4 mb-2">
                                    <View className="flex-1">
                                      <Text className="text-sm font-semibold text-white mb-0.5">
                                        {transaction.action}
                                      </Text>
                                      <View className="flex-row items-center gap-1.5">
                                        <Calendar size={12} color={COLORS.textSecondary} />
                                        <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
                                          {formatDate(transaction.created_at)}
                                        </Text>
                                      </View>
                                    </View>

                                    {/* Change Amount */}
                                    <View>
                                      {availableDiff !== 0 && (
                                        <Text
                                          className="text-sm font-semibold text-right"
                                          style={{ color: availableDiff > 0 ? ACCENT_COLORS.lime : COLORS.negative }}
                                        >
                                          Available {availableDiff > 0 ? '+' : ''}
                                          {availableDiff.toLocaleString()}
                                        </Text>
                                      )}
                                      {reservedDiff !== 0 && (
                                        <Text
                                          className="text-xs font-medium text-right"
                                          style={{
                                            color: reservedDiff > 0 ? ACCENT_COLORS.amber : ACCENT_COLORS.sky,
                                          }}
                                        >
                                          Reserved {reservedDiff > 0 ? '+' : ''}
                                          {reservedDiff.toLocaleString()}
                                        </Text>
                                      )}
                                    </View>
                                  </View>

                                  {/* Balance Details */}
                                  <View className="gap-1">
                                    <View className="flex-row items-center gap-1.5 flex-wrap">
                                      <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
                                        Available:
                                      </Text>
                                      <Text className="text-xs font-medium text-white">
                                        {transaction.old_available.toLocaleString()} →{' '}
                                        {transaction.new_available.toLocaleString()}
                                      </Text>
                                    </View>
                                    <View className="flex-row items-center gap-1.5 flex-wrap">
                                      <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
                                        Reserved:
                                      </Text>
                                      <Text className="text-xs font-medium text-white">
                                        {transaction.old_reserved.toLocaleString()} →{' '}
                                        {transaction.new_reserved.toLocaleString()}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                )}

                {/* PURCHASE VIEW */}
                {activeView === 'purchase' && (
                  <View className="items-center justify-center py-12 px-6">
                    <View
                      className="w-20 h-20 rounded-full items-center justify-center mb-4"
                      style={{ backgroundColor: ACCENT_COLORS.limeGlow }}
                    >
                      <ShoppingCart size={40} color={ACCENT_COLORS.lime} />
                    </View>
                    <Text className="text-xl font-semibold text-white mb-2">Purchase Credits</Text>
                    <Text className="text-sm text-center max-w-md mb-6" style={{ color: COLORS.textSecondary }}>
                      You'll be redirected to Corva Web to complete your credit purchase securely.
                    </Text>
                    
                    <TouchableOpacity
                      onPress={goToWebCredits}
                      disabled={isRedirecting}
                      className="px-8 py-4 rounded-full"
                      style={{ 
                        backgroundColor: isRedirecting ? COLORS.textSecondary : ACCENT_COLORS.lime,
                        opacity: isRedirecting ? 0.6 : 1,
                      }}
                    >
                      <Text className="text-base font-semibold text-black">
                        {isRedirecting ? 'Redirecting...' : 'Buy Credits'}
                      </Text>
                    </TouchableOpacity>

                    <Text className="text-xs text-center mt-4" style={{ color: COLORS.textSecondary }}>
                      This will redirect you to Corva Web's settings page
                    </Text>
                  </View>
                )}
              </>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Animated.View>
  </GestureHandlerRootView>
</Modal>
);
}