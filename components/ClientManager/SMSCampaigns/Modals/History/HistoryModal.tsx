import { useEffect, useState } from 'react';
import { Modal, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import AutoNudgeHistoryContent from './AutoNudgeHistoryContent';
import CampaignHistoryContent from './CampaignHistoryContent';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
  openTab?: 'campaigns' | 'auto-nudge';
}

const TAB_OPTIONS = [
  { id: 'campaigns', label: 'Campaigns' },
  { id: 'auto-nudge', label: 'Auto Nudge' },
];

export default function HistoryModal({ isOpen, onClose, session, openTab }: HistoryModalProps) {
  const [activeTab, setActiveTab] = useState<string>('campaigns');
  const [lastViewedTab, setLastViewedTab] = useState<string>('campaigns');

  // Handle openTab prop
  useEffect(() => {
    if (openTab) {
      setActiveTab(openTab);
      setLastViewedTab(openTab);
    }
  }, [openTab]);

  // Remember last viewed tab when modal opens
  useEffect(() => {
    if (isOpen && !openTab) {
      setActiveTab(lastViewedTab);
    }
  }, [isOpen, lastViewedTab, openTab]);

  // Update last viewed tab when switching
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    setLastViewedTab(newTab);
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60 justify-center items-center p-2">
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          className="w-[95%] h-[75%]"
        >
          <View className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl h-full flex">
            {/* Content Area */}
            <View className="flex-1">
              {activeTab === 'campaigns' ? (
                <CampaignHistoryContent
                  key="campaigns"
                  onClose={onClose}
                  session={session}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabOptions={TAB_OPTIONS}
                />
              ) : (
                <AutoNudgeHistoryContent
                  key="auto-nudge"
                  onClose={onClose}
                  session={session}
                  activeTab={activeTab}
                  onTabChange={handleTabChange}
                  tabOptions={TAB_OPTIONS}
                />
              )}
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}