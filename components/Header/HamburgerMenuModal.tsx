// components/Header/HamburgerMenuModal.tsx

import { Bell, Coins, HelpCircle, Megaphone, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SIDEBAR_HEIGHT = SCREEN_HEIGHT * 0.5;

const COLORS = {
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
  red: '#ef4444',
};

interface HamburgerMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onCreditsPress: () => void;
  onNotificationsPress: () => void;
  onFeaturesPress: () => void;
  onFAQPress: () => void;
  userId?: string;
  hasNewFeatures?: boolean;
  unreadNotificationsCount?: number;
}

export default function HamburgerMenuModal({
  visible,
  onClose,
  onCreditsPress,
  onNotificationsPress,
  onFeaturesPress,
  onFAQPress,
  userId,
  hasNewFeatures = false,
  unreadNotificationsCount = 0,
}: HamburgerMenuModalProps) {
  const [isClosing, setIsClosing] = useState(false);
  const translateY = useSharedValue(SIDEBAR_HEIGHT);
  const opacity = useSharedValue(0);

  // Sidebar animation
  useEffect(() => {
    if (visible) {
      translateY.value = withTiming(0, { duration: 280 });
      opacity.value = withTiming(1, { duration: 280 });
    }
  }, [visible]);

  const closeSidebar = () => {
    if (isClosing) return;
    setIsClosing(true);
    translateY.value = withTiming(SIDEBAR_HEIGHT, { duration: 250 });
    opacity.value = withTiming(0, { duration: 250 });
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 250);
  };

  // Pan gesture for swipe to close
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        const progress = Math.min(event.translationY / 300, 1);
        opacity.value = 1 - progress;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(closeSidebar)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const handleItemPress = (action: () => void) => {
    closeSidebar();
    setTimeout(() => action(), 300);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={closeSidebar}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1 }, backdropStyle]}>
          <Pressable
            className="flex-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
            onPress={closeSidebar}
          >
            <GestureDetector gesture={panGesture}>
              <Animated.View
                style={[
                  animatedStyle,
                  {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: SIDEBAR_HEIGHT,
                    backgroundColor: COLORS.surfaceSolid,
                    borderTopLeftRadius: 24,
                    borderTopRightRadius: 24,
                    borderTopWidth: 1,
                    borderLeftWidth: 1,
                    borderRightWidth: 1,
                    borderColor: COLORS.glassBorder,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                    elevation: 10,
                    overflow: 'hidden',
                  },
                ]}
              >
                <Pressable onPress={(e) => e.stopPropagation()}>
                  {/* Drag Handle */}
                  <View className="items-center pt-3 pb-2">
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        backgroundColor: COLORS.textMuted,
                        borderRadius: 2,
                      }}
                    />
                  </View>

                  {/* Sidebar Header */}
                  <View
                    className="flex-row items-center justify-between px-5 pb-4 pt-2"
                    style={{
                      borderBottomWidth: 1,
                      borderBottomColor: COLORS.glassBorder,
                    }}
                  >
                    <Text className="text-xl font-bold" style={{ color: COLORS.text }}>
                      Menu
                    </Text>
                    <TouchableOpacity onPress={closeSidebar} className="p-1">
                      <X size={24} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>

                  {/* Menu Items */}
                  <View className="mt-2">
                    {/* Feature Updates */}
                    <TouchableOpacity
                      onPress={() => handleItemPress(onFeaturesPress)}
                      className="flex-row items-center px-5 py-4"
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.glassBorder,
                      }}
                    >
                      <View
                        className="p-2 rounded-full mr-4 relative"
                        style={{ backgroundColor: COLORS.surface }}
                      >
                        <Megaphone size={20} color={COLORS.green} />
                        {hasNewFeatures && (
                          <View
                            className="absolute -top-1 -right-1 w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS.red }}
                          />
                        )}
                      </View>
                      <Text className="text-base font-medium flex-1" style={{ color: COLORS.text }}>
                        Feature Updates
                      </Text>
                      {hasNewFeatures && (
                        <View
                          className="px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: COLORS.red }}
                        >
                          <Text className="text-xs font-bold text-white">NEW</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    {/* Credits Manager */}
                    <TouchableOpacity
                      onPress={() => handleItemPress(onCreditsPress)}
                      className="flex-row items-center px-5 py-4"
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.glassBorder,
                      }}
                    >
                      <View
                        className="p-2 rounded-full mr-4"
                        style={{ backgroundColor: COLORS.surface }}
                      >
                        <Coins size={20} color={COLORS.green} />
                      </View>
                      <Text className="text-base font-medium" style={{ color: COLORS.text }}>
                        Credits Manager
                      </Text>
                    </TouchableOpacity>

                    {/* Notifications */}
                    <TouchableOpacity
                      onPress={() => handleItemPress(onNotificationsPress)}
                      className="flex-row items-center px-5 py-4"
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.glassBorder,
                      }}
                    >
                      <View
                        className="p-2 rounded-full mr-4 relative"
                        style={{ backgroundColor: COLORS.surface }}
                      >
                        <Bell size={20} color={COLORS.green} />
                        {unreadNotificationsCount > 0 && (
                          <View
                            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full items-center justify-center"
                            style={{ backgroundColor: COLORS.red }}
                          >
                            <Text className="text-[10px] font-bold text-white px-1">
                              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-base font-medium" style={{ color: COLORS.text }}>
                        Notifications
                      </Text>
                    </TouchableOpacity>

                    {/* FAQ */}
                    <TouchableOpacity
                      onPress={() => handleItemPress(onFAQPress)}
                      className="flex-row items-center px-5 py-4"
                      style={{
                        borderBottomWidth: 1,
                        borderBottomColor: COLORS.glassBorder,
                      }}
                    >
                      <View
                        className="p-2 rounded-full mr-4"
                        style={{ backgroundColor: COLORS.surface }}
                      >
                        <HelpCircle size={20} color={COLORS.green} />
                      </View>
                      <Text className="text-base font-medium" style={{ color: COLORS.text }}>
                        Frequently Asked Questions
                      </Text>
                    </TouchableOpacity>
                  </View>
                </Pressable>
              </Animated.View>
            </GestureDetector>
          </Pressable>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}