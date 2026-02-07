import AppointmentSheets from '@/components/ClientManager/AppointmentSheets/AppointmentSheets';
import ClientSheets from '@/components/ClientManager/ClientSheets/ClientSheets';
import SMSCampaigns from '@/components/ClientManager/SMSCampaigns/SMSCampaigns';
import { CustomHeader } from '@/components/Header/CustomHeader';
import SegmentedControl from '@/components/UI/SegmentedControl';
import { COLORS } from '@/constants/design-system';
import { getSpringFadeInDown, useFocusAnimation, useReducedMotionPreference } from '@/utils/motion';
import React, { useState } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tab options for the segmented control
const TAB_OPTIONS = [
  { id: 'clients', label: 'Clients' },
  { id: 'appointments', label: 'Appointments' },
  { id: 'sms', label: 'SMS' },
];

export default function ClientManagerScreen() {
  const [activeTab, setActiveTab] = useState<string>('clients');
  const reduceMotion = useReducedMotionPreference();
  const focusStyle = useFocusAnimation(reduceMotion);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'clients':
        return <ClientSheets />;
      case 'appointments':
        return <AppointmentSheets />;
      case 'sms':
        return <SMSCampaigns />;
      default:
        return <ClientSheets />;
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <CustomHeader pageName="Client Manager" />

      <Animated.View className="flex-1 px-4" style={focusStyle}>
        {/* Segmented Control */}
        <Animated.View className="mt-3 mb-4" entering={getSpringFadeInDown(reduceMotion)}>
          <SegmentedControl
            options={TAB_OPTIONS}
            selected={activeTab}
            onChange={setActiveTab}
          />
        </Animated.View>

        {/* Active View */}
        <Animated.View
          key={activeTab}
          className="flex-1"
          entering={getSpringFadeInDown(reduceMotion, 60)}
        >
          {renderActiveView()}
        </Animated.View>
      </Animated.View>
    </SafeAreaView>
  );
}
