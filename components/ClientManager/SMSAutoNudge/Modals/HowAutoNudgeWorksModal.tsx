import {
  FileText,
  Info,
  Phone,
  Send,
  Shield,
  Sparkles,
  Users,
  X,
  Zap,
} from 'lucide-react-native';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface HowAutoNudgeWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowAutoNudgeWorksModal({
  isOpen,
  onClose,
}: HowAutoNudgeWorksModalProps) {
  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-center items-center p-4">
        {/* Backdrop */}
        <Pressable
          className="absolute inset-0 bg-black/60"
          onPress={onClose}
        />

        {/* Modal */}
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{ width: '95%' }}
        >
          <View className="bg-[#1a1a1a] border border-white/10 rounded-2xl overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <View className="flex-row items-center gap-2 flex-1">
                <Info color="#7dd3fc" size={20} />
                <Text className="text-lg font-bold text-white">
                  How It Works
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} className="p-2">
                <X color="#bdbdbd" size={20} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={{ height: 500 }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 16 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Register Phone */}
              <View className="p-3 rounded-xl border bg-amber-400/10 border-amber-400/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-amber-400/20">
                    <Phone color="#fbbf24" size={16} />
                  </View>
                  <Text className="text-sm font-semibold text-white">
                    Register Your Phone Number
                  </Text>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  Before you can use Auto Nudge, you need to register your phone
                  number. Click your profile icon in the top right corner, select
                  Settings, and update your phone number in the Profile tab. This
                  is required to receive test messages.
                </Text>
              </View>

              {/* Step 1 */}
              <View className="p-3 rounded-xl border bg-sky-300/10 border-sky-300/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-sky-300/20">
                    <Text className="text-sm font-bold text-white">1</Text>
                  </View>
                  <Text className="text-sm font-semibold text-white">
                    Auto-generated Messages
                  </Text>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  Your messages are automatically generated the first time you
                  open the page. Each message is for each type of client.
                  Messages will NOT be sent unless explicitly activated.
                </Text>
              </View>

              {/* Step 2 */}
              <View className="p-3 rounded-xl border bg-amber-400/10 border-amber-400/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-amber-400/20">
                    <Text className="text-sm font-bold text-white">2</Text>
                  </View>
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Save as Draft
                    </Text>
                    <View className="px-2 py-1 rounded-lg bg-amber-400/10 border border-amber-400/20">
                      <FileText color="#fbbf24" size={10} />
                    </View>
                  </View>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  Save your message as a draft once it's between 100-240
                  characters. This preserves your work as unsaved messages
                  disappear when you leave the page.
                </Text>
                <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                  <Text className="text-[10px] text-[#bdbdbd]">
                    You'll see:
                  </Text>
                  <View className="px-2 py-1 rounded-full bg-amber-400/10 border border-amber-400/20">
                    <Text className="text-[10px] font-semibold text-amber-400">
                      Draft
                    </Text>
                  </View>
                  <Text className="text-[10px] text-[#bdbdbd]">→</Text>
                  <View className="px-2 py-1 rounded-full bg-lime-300/10 border border-lime-300/20">
                    <Text className="text-[10px] font-semibold text-lime-300">
                      Saved
                    </Text>
                  </View>
                </View>
              </View>

              {/* Step 3 */}
              <View className="p-3 rounded-xl border bg-purple-500/10 border-purple-500/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-purple-300/20">
                    <Text className="text-sm font-bold text-white">3</Text>
                  </View>
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      AI Template
                    </Text>
                    <View className="px-2 py-1 rounded-lg bg-purple-500/20 border border-purple-500/30">
                      <Sparkles color="#d8b4fe" size={10} />
                    </View>
                  </View>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  Let AI create a professional message template for you. Use it
                  as a starting point or keep it as-is if it perfectly fits your
                  needs.
                </Text>
              </View>

              {/* Step 4 */}
              <View className="p-3 rounded-xl border bg-blue-500/10 border-blue-500/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-blue-400/20">
                    <Text className="text-sm font-bold text-white">4</Text>
                  </View>
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Verify Message
                    </Text>
                    <View className="px-2 py-1 rounded-lg bg-white/5 border border-white/10">
                      <Shield color="#ffffff" size={10} />
                    </View>
                  </View>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  Ensures your message meets SMS marketing guidelines. Note:
                  Emojis are prohibited as they double the cost per message.
                </Text>
                <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                  <Text className="text-[10px] text-[#bdbdbd]">
                    Status changes to:
                  </Text>
                  <View className="px-2 py-1 rounded-full bg-sky-300/10 border border-sky-300/20">
                    <Text className="text-[10px] font-semibold text-sky-300">
                      Verified
                    </Text>
                  </View>
                </View>
              </View>

              {/* Step 5 */}
              <View className="p-3 rounded-xl border bg-cyan-500/10 border-cyan-500/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-cyan-500/20">
                    <Text className="text-sm font-bold text-white">5</Text>
                  </View>
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Test Your Message
                    </Text>
                    <View className="px-2 py-1 rounded-lg bg-sky-300/20 border border-sky-300/30">
                      <Send color="#7dd3fc" size={10} />
                    </View>
                  </View>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  <Text className="text-cyan-400 font-semibold">
                    Crucial step!
                  </Text>{' '}
                  Preview exactly how your message will appear to clients. You
                  get 10 free tests daily and after that, each test costs 1
                  credit.
                </Text>
              </View>

              {/* Step 6 */}
              <View className="p-3 rounded-xl border bg-indigo-500/10 border-indigo-500/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-indigo-400/20">
                    <Text className="text-sm font-bold text-white">6</Text>
                  </View>
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Preview Recipients
                    </Text>
                    <View className="px-2 py-1 rounded-full bg-white/5 border border-white/10">
                      <Users color="#bdbdbd" size={10} />
                    </View>
                  </View>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  View the projected recipient list based on our smart targeting
                  algorithm. This list updates daily to always give you the
                  optimal audience.
                </Text>
              </View>

              {/* Step 7 */}
              <View className="p-3 rounded-xl border bg-lime-300/10 border-lime-300/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-lime-300/20">
                    <Text className="text-sm font-bold text-white">7</Text>
                  </View>
                  <View className="flex-row items-center gap-2 flex-1">
                    <Text className="text-sm font-semibold text-white">
                      Activate Campaign
                    </Text>
                    <View className="px-2 py-1 rounded-lg bg-sky-300">
                      <Zap color="#000000" size={10} />
                    </View>
                  </View>
                </View>
                <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                  <Text className="text-lime-300 font-semibold">
                    Final step!
                  </Text>{' '}
                  Activate to schedule your message for sending at your chosen
                  time. Messages are ONLY sent when you see the "Active" status.
                </Text>
                <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                  <Text className="text-[10px] text-[#bdbdbd]">
                    Active status:
                  </Text>
                  <View className="px-2 py-1 rounded-full bg-lime-300/20 border border-lime-300/30">
                    <Text className="text-[10px] font-semibold text-lime-300">
                      Active - Click to toggle
                    </Text>
                  </View>
                </View>
                <View className="flex-row items-center gap-1.5 mt-2 flex-wrap">
                  <Text className="text-[10px] text-[#bdbdbd]">
                    Inactive status:
                  </Text>
                  <View className="px-2 py-1 rounded-full bg-gray-500/10 border border-gray-500/20">
                    <Text className="text-[10px] font-semibold text-gray-400">
                      Inactive
                    </Text>
                  </View>
                  <Text className="text-[10px] text-red-300">
                    ← No messages will be sent
                  </Text>
                </View>
              </View>

              {/* Lock System */}
              <View className="p-3 rounded-xl border bg-red-300/10 border-red-300/20 mb-3">
                <View className="flex-row items-center gap-2.5 mb-2">
                  <View className="w-8 h-8 rounded-2xl items-center justify-center bg-red-300/20">
                    <Text className="text-sm font-bold text-white">🔒</Text>
                  </View>
                  <Text className="text-sm font-semibold text-white">
                    Understanding Message Locks
                  </Text>
                </View>

                <View className="p-2.5 bg-white/[0.02] border border-white/10 rounded-lg">
                  <View className="self-start px-2 py-1 rounded-full bg-red-300/10 border border-red-300/20 mb-2">
                    <Text className="text-[10px] font-semibold text-red-300">
                      Full Lock - Sending
                    </Text>
                  </View>
                  <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                    When your campaign is actively sending messages, the message
                    card is{' '}
                    <Text className="text-red-300 font-semibold">
                      fully locked
                    </Text>
                    . You cannot edit, save, or activate anything until all
                    messages finish sending.
                  </Text>
                </View>

                <View className="p-2.5 bg-white/[0.02] border border-white/10 rounded-lg mt-2.5">
                  <View className="self-start px-2 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 mb-2">
                    <Text className="text-[10px] font-semibold text-amber-400">
                      Partial Lock - Sent This Month
                    </Text>
                  </View>
                  <Text className="text-xs text-[#bdbdbd] leading-[18px]">
                    After your campaign finishes sending for the month, the
                    message enters a{' '}
                    <Text className="text-amber-400 font-semibold">
                      partial lock
                    </Text>
                    . You can still edit and save as a draft, but you{' '}
                    <Text className="text-amber-400 font-semibold">
                      cannot activate
                    </Text>{' '}
                    until the first day of next month.
                  </Text>
                  <Text className="text-[10px] text-amber-400/80 italic mt-1.5">
                    This prevents duplicate messages to the same clients within
                    the same month.
                  </Text>
                </View>
              </View>

              {/* Important Note */}
              <View className="p-3 bg-amber-400/10 border border-amber-400/20 rounded-xl">
                <View className="flex-row items-center gap-2 mb-2">
                  <Info color="#fbbf24" size={16} />
                  <Text className="text-[13px] font-semibold text-amber-400">
                    Important Reminders
                  </Text>
                </View>
                <View className="gap-1.5">
                  <Text className="text-xs text-amber-400/80 leading-[18px]">
                    • Always test your message before activating
                  </Text>
                  <Text className="text-xs text-amber-400/80 leading-[18px]">
                    • Double-check the "Active" status before your scheduled
                    time
                  </Text>
                  <Text className="text-xs text-amber-400/80 leading-[18px]">
                    • Credits are reserved when you activate and refunded if you
                    deactivate
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View className="p-4 border-t border-white/10">
              <TouchableOpacity
                onPress={onClose}
                className="py-3 rounded-xl bg-sky-300 items-center"
              >
                <Text className="text-sm font-bold text-black">Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
