import { AlertCircle, Info, Trash2 } from 'lucide-react-native';
import React from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

interface DeleteMessageConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  deleteType: 'soft' | 'hard';
}

export default function DeleteMessageConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  deleteType,
}: DeleteMessageConfirmModalProps) {
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
                <View className="flex-row items-center gap-3 mb-2">
                  <View className="bg-rose-300/20 p-2 rounded-lg">
                    <Trash2 color="#fca5a5" size={20} />
                  </View>
                  <Text className="text-xl font-bold text-white flex-1">Delete Message?</Text>
                </View>
                <Text className="text-sm text-gray-400">
                  {deleteType === 'soft' ? (
                    <>
                      This completed campaign will be removed from your active messages but will still be
                      visible in{' '}
                      <Text className="text-purple-300 font-semibold">Campaign History</Text> for your
                      records.
                    </>
                  ) : (
                    <>
                      This message will be{' '}
                      <Text className="text-rose-300 font-semibold">permanently deleted</Text>. You won't
                      be able to see it again or recover any information about it.
                    </>
                  )}
                </Text>
              </View>

              {/* Warning/Info Box */}
              {deleteType === 'hard' ? (
                <View className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg mb-4">
                  <View className="flex-row items-start gap-2">
                    <AlertCircle color="#fca5a5" size={16} style={{ marginTop: 2 }} />
                    <Text className="text-sm text-rose-300 flex-1">
                      <Text className="font-semibold">This action cannot be undone.</Text> All message data
                      will be permanently removed.
                    </Text>
                  </View>
                </View>
              ) : (
                <View className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg mb-4">
                  <View className="flex-row items-start gap-2">
                    <Info color="#d8b4fe" size={16} style={{ marginTop: 2 }} />
                    <Text className="text-sm text-purple-300 flex-1">
                      You can view this campaign's details and recipients in Campaign History at any time.
                    </Text>
                  </View>
                </View>
              )}

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
                  className="flex-1 py-3 rounded-lg bg-rose-300/20 border border-rose-300/30"
                >
                  <Text className="text-center font-semibold text-rose-300">
                    {deleteType === 'soft' ? 'Remove' : 'Delete'}
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