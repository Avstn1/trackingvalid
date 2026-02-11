import { AlertCircle, Coins, Send } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface TestMessageConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  testMessagesUsed: number;
  availableCredits: number;
  profilePhone: string | null;
}

export default function TestMessageConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  testMessagesUsed,
  availableCredits,
  profilePhone,
}: TestMessageConfirmModalProps) {
  const freeTestsRemaining = Math.max(0, 10 - testMessagesUsed);
  const willUseFreeTest = freeTestsRemaining > 0;
  const willUseCredit = !willUseFreeTest;

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-end" onPress={onClose}>
        <Animated.View
          entering={SlideInDown.duration(300)}
          exiting={SlideOutDown.duration(200)}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-[#1e1e1e] rounded-t-2xl p-5">
              {/* Header */}
              <View className="mb-4">
                <Text className="text-xl font-bold text-white mb-2">Send Test Message</Text>
                <Text className="text-sm text-gray-400">
                  {profilePhone ? (
                    <>To: <Text className="text-white font-medium">{profilePhone}</Text></>
                  ) : (
                    'To your registered phone number'
                  )}
                </Text>
              </View>

              {/* Cost Info */}
              {willUseFreeTest ? (
                <View className="p-4 bg-sky-300/20 border border-sky-300/30 rounded-xl mb-4">
                  <View className="flex-row items-center gap-3 mb-2">
                    <View className="bg-sky-300/20 p-2 rounded-lg">
                      <Send color="#7dd3fc" size={18} />
                    </View>
                    <Text className="text-base font-semibold text-sky-300">Free Test</Text>
                  </View>
                  <Text className="text-sm text-gray-300">
                    {freeTestsRemaining} of 10 free tests remaining today
                  </Text>
                </View>
              ) : (
                <View className="p-4 bg-sky-300/20 border border-sky-300/30 rounded-xl mb-4">
                  <View className="flex-row items-center gap-3 mb-2">
                    <View className="bg-sky-300/20 p-2 rounded-lg">
                      <Coins color="#7dd3fc" size={18} />
                    </View>
                    <Text className="text-base font-semibold text-sky-300">Costs 1 Credit</Text>
                  </View>
                  <Text className="text-sm text-gray-300">
                    All 10 free tests used today
                  </Text>
                  {availableCredits < 1 && (
                    <View className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <Text className="text-sm text-red-400">
                        ⚠️ Insufficient credits
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Info */}
              <View className="p-3 bg-white/5 rounded-lg mb-4 flex-row gap-2">
                <AlertCircle color="#9ca3af" size={16} style={{ marginTop: 2 }} />
                <Text className="text-xs text-gray-400 flex-1">
                  Test messages are sent immediately to verify content and formatting before activating your campaign.
                </Text>
              </View>

              {/* Actions */}
              <View className="flex-row gap-3 mb-6">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 py-3 rounded-lg bg-white/5 border border-white/10"
                >
                  <Text className="text-gray-400 text-center font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={willUseCredit && availableCredits < 1}
                  className={`flex-1 py-3 rounded-lg bg-sky-300/20 border border-sky-300/30 ${
                    willUseCredit && availableCredits < 1 && 'opacity-40'
                  }`}
                >
                  <Text className="text-center font-semibold text-sky-300">
                    Send Test
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}