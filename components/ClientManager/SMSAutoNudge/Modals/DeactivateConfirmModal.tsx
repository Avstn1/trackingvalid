import { AlertCircle, X } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface DeactivateConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function DeactivateConfirmModal({
  isOpen,
  onClose,
  onConfirm,
}: DeactivateConfirmModalProps) {
  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-center items-center p-4" onPress={onClose}>
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          className="w-full max-w-md"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl">
              {/* Modal Header */}
              <View className="flex-row items-center justify-between p-4 border-b border-white/10">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 bg-amber-300/20 rounded-full items-center justify-center">
                    <AlertCircle color="#fcd34d" size={20} />
                  </View>
                  <Text className="text-xl font-bold text-white">Deactivate Message?</Text>
                </View>
                <TouchableOpacity
                  onPress={onClose}
                  className="p-2 rounded-full active:bg-white/10"
                >
                  <X color="#bdbdbd" size={20} />
                </TouchableOpacity>
              </View>

              {/* Modal Body */}
              <View className="p-4">
                <Text className="text-base text-[#bdbdbd] mb-4">
                  This message will be converted to a <Text className="text-amber-300 font-semibold">draft</Text> and will <Text className="text-amber-300 font-semibold">no longer be sent out</Text> on the scheduled date.
                </Text>
                <Text className="text-base text-[#bdbdbd]">
                  You can reactivate it later by editing and re-activating the message.
                </Text>
              </View>

              {/* Modal Footer */}
              <View className="flex-row items-center justify-end gap-3 p-4 border-t border-white/10">
                <TouchableOpacity
                  onPress={onClose}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl"
                >
                  <Text className="text-[#bdbdbd] text-base font-semibold">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onConfirm}
                  className="px-4 py-2 bg-amber-300/20 border border-amber-300/30 rounded-xl"
                >
                  <Text className="text-amber-300 text-base font-semibold">Deactivate Message</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}