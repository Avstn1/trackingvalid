import { CustomHeader } from '@/components/Header/CustomHeader';
import AutoNudge from '@/components/SMSManager/SMSAutoNudge/AutoNudge';
import SMSCampaigns from '@/components/SMSManager/SMSCampaigns/SMSCampaigns';
import SegmentedControl from '@/components/ui/SegmentedControl';
import { COLORS } from '@/constants/design-system';
import { getSpringFadeInDown, useFocusAnimation, useReducedMotionPreference } from '@/utils/motion';
import { useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// Tab options for the segmented control
const TAB_OPTIONS = [
  { id: 'auto-nudge', label: 'Auto Nudge' },
  { id: 'campaigns', label: 'SMS Campaigns' },
];

export default function SMSManagerScreen() {
  const params = useLocalSearchParams<{
    openComponent?: string;
  }>();

  const [activeTab, setActiveTab] = useState<string>('auto-nudge');
  const reduceMotion = useReducedMotionPreference();
  const focusStyle = useFocusAnimation(reduceMotion);

  // Handle deep linking from notifications or other sources
  useEffect(() => {
    if (params.openComponent === 'auto-nudge') {
      console.log('Opening Auto Nudge from deep link');
      setActiveTab('auto-nudge');
    } else if (params.openComponent === 'campaigns') {
      console.log('Opening SMS Campaigns from deep link');
      setActiveTab('campaigns');
    }
  }, [params.openComponent]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'campaigns':
        return <SMSCampaigns />;
      case 'auto-nudge':
        return <AutoNudge />;
      default:
        return <SMSCampaigns />;
    }
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <CustomHeader pageName="SMS Manager" />

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