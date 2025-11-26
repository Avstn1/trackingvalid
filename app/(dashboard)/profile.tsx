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

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Tab Navigation */}
        <View className="px-4 py-4">
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2"
          >
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`flex-row items-center gap-2 px-4 py-3 rounded-xl ${
                    isActive
                      ? 'bg-lime-400'
                      : 'bg-zinc-800'
                  }`}
                >
                  <Icon 
                    size={20} 
                    color={isActive ? '#000' : '#a1a1aa'} 
                  />
                  <Text 
                    className={`font-semibold ${
                      isActive ? 'text-black' : 'text-zinc-400'
                    }`}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Tab Content */}
        <View className="flex-1 px-4 pb-6">
          <View className="bg-zinc-900 rounded-2xl p-6 min-h-[500px]">
            {renderTab()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}