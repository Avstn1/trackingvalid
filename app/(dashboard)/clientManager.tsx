import AppointmentSheets from '@/components/ClientManager/AppointmentSheets/AppointmentSheets';
import ClientSheets from '@/components/ClientManager/ClientSheets/ClientSheets';
import SMSAutoNudge from '@/components/ClientManager/SMSAutoNudge/SMSAutoNudge';
import SMSCampaigns from '@/components/ClientManager/SMSCampaigns/SMSCampaigns';
import { CustomHeader } from '@/components/Header/CustomHeader';
import { getSpringFadeInDown, useFocusAnimation, usePressAnimation, useReducedMotionPreference } from '@/utils/motion';
import { useLocalSearchParams } from 'expo-router';
import { Bell, Calendar, Send, Users, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
};

interface ManageOption {
  id: string;
  title: string;
  description: string;
  icon: any;
  iconColor: string;
  bgColor: string;
}

const MANAGE_OPTIONS: ManageOption[] = [
  {
    id: 'clients',
    title: 'Clients',
    description: 'View and manage client information',
    icon: Users,
    iconColor: '#bef264',
    bgColor: 'bg-lime-300/10',
  },
  {
    id: 'appointments',
    title: 'Appointments',
    description: 'Manage appointment revenue and tips',
    icon: Calendar,
    iconColor: '#7dd3fc',
    bgColor: 'bg-sky-300/10',
  },
  {
    id: 'auto-nudge',
    title: 'SMS Auto-Nudge',
    description: 'Automated SMS reminders',
    icon: Bell,
    iconColor: '#fbbf24',
    bgColor: 'bg-amber-300/10',
  },
  {
    id: 'campaigns',
    title: 'SMS Campaigns',
    description: 'Create and send SMS campaigns',
    icon: Send,
    iconColor: '#c084fc',
    bgColor: 'bg-purple-300/10',
  },
];

export default function ClientManagerScreen() {
  const params = useLocalSearchParams<{
    openComponent?: string;
    reference?: string;
  }>();

  const [activeView, setActiveView] = useState<string>('clients');

  const [modalVisible, setModalVisible] = useState(false);
  const reduceMotion = useReducedMotionPreference();
  const focusStyle = useFocusAnimation(reduceMotion);
  const { onPressIn, onPressOut, animatedStyle: pressStyle } = usePressAnimation(reduceMotion);

  useEffect(() => {
  if (params.openComponent) {
    setActiveView(params.openComponent);
  }
}, [params.openComponent]);

  const handleNavigate = (option: ManageOption) => {
    setModalVisible(false);
    setActiveView(option.id);
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'clients':
        return <ClientSheets />;
      case 'appointments':
        return <AppointmentSheets />;
      case 'auto-nudge':
        return <SMSAutoNudge />;
      case 'campaigns':
        return <SMSCampaigns />;
      default:
        return <ClientSheets />;
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <CustomHeader pageName="Client Manager" />

      <Animated.View className="flex-1 px-4" style={focusStyle}>
        {/* Manage Button */}
        <Animated.View className="mt-3 mb-3" entering={getSpringFadeInDown(reduceMotion)}>
          <Pressable
            onPress={() => setModalVisible(true)}
            onPressIn={onPressIn}
            onPressOut={onPressOut}
          >
            <Animated.View
              className="bg-lime-300 rounded-full py-2 px-6"
              style={[
                {
                  shadowColor: '#bef264',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5,
                },
                pressStyle,
              ]}
            >
              <Text className="text-black text-base font-bold text-center">
                Manage
              </Text>
            </Animated.View>
          </Pressable>
        </Animated.View>

        {/* Active View */}
        <Animated.View
          key={activeView}
          className="flex-1"
          entering={getSpringFadeInDown(reduceMotion, 60)}
        >
          {renderActiveView()}
        </Animated.View>
      </Animated.View>

      {/* Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          className="flex-1 justify-center items-center"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            className="w-11/12 max-w-md rounded-3xl p-6"
            style={{
              backgroundColor: '#1f1f1f',
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-2xl font-bold">Manage</Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
              >
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            {/* Options Grid */}
            <View className="gap-3">
              {MANAGE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = option.id === activeView;
                
                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => handleNavigate(option)}
                    className="rounded-2xl p-4"
                    style={{
                      backgroundColor: isActive 
                        ? 'rgba(190, 242, 100, 0.1)' 
                        : COLORS.surface,
                      borderWidth: 1,
                      borderColor: isActive 
                        ? 'rgba(190, 242, 100, 0.3)' 
                        : COLORS.glassBorder,
                    }}
                  >
                    <View className="flex-row items-center">
                      <View
                        className={`w-12 h-12 rounded-full items-center justify-center mr-4 ${option.bgColor}`}
                      >
                        <Icon color={option.iconColor} size={24} />
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2">
                          <Text className="text-white text-base font-semibold">
                            {option.title}
                          </Text>
                          {isActive && (
                            <View className="px-2 py-0.5 rounded-full bg-lime-300/20">
                              <Text className="text-lime-300 text-xs font-semibold">
                                Active
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[#bdbdbd] text-xs mt-1">
                          {option.description}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
