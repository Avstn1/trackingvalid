// app/(dashboard)/settings.tsx
import { CustomHeader } from '@/components/Header/CustomHeader';
import AcuityTab from '@/components/Settings/AcuityTab';
import ProfileTab from '@/components/Settings/ProfileTab';
import { Calendar, User } from 'lucide-react-native';
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabId = 'profile' | 'acuity';

interface Tab {
  id: TabId;
  label: string;
  icon: typeof User;
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('profile');

  const tabs: Tab[] = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'acuity', label: 'Acuity', icon: Calendar },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileTab />;
      case 'acuity':
        return <AcuityTab />;
      default:
        return <ProfileTab />;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-zinc-950">
      <CustomHeader pageName="Settings" />

      <ScrollView className="flex-1 px-4" showsVerticalScrollIndicator={false}>
        {/* Tab Navigation - Segmented Control Style */}
        <View className="my-4">
          <View className="bg-zinc-900 rounded-2xl p-1.5 flex-row">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  activeOpacity={0.7}
                  className={`flex-1 flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl ${
                    isActive ? 'bg-zinc-800' : 'bg-transparent'
                  }`}
                >
                  <Icon 
                    size={18} 
                    color={isActive ? '#c4ff85' : '#71717a'} 
                  />
                  <Text 
                    className={`font-semibold text-sm ${
                      isActive ? 'text-white' : 'text-zinc-500'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Tab Content */}
        <View className="flex-1 pb-6">
          <View className="bg-zinc-900 rounded-2xl p-6 min-h-[500px]">
            {renderTab()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}