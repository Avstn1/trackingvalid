import SMSManager from '@/components/ClientManager/SMSManager/SMSManager';
import { CustomHeader } from '@/components/Header/CustomHeader';
import { Users } from 'lucide-react-native';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
};

export default function ClientManagerScreen() {
  const [activeView, setActiveView] = useState<'sheets' | 'sms'>('sms');

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <CustomHeader pageName="Client Manager" />

      <View className="flex-1 px-4">
        {/* View Switcher */}
        <View className="flex-row gap-1 bg-[#1a1a1a] rounded-full p-1 mb-3 mt-3">
          <TouchableOpacity
            onPress={() => setActiveView('sheets')}
            className={`flex-1 px-5 py-3 rounded-full ${
              activeView === 'sheets' ? 'bg-lime-300' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-semibold text-center ${
                activeView === 'sheets' ? 'text-black' : 'text-[#bdbdbd]'
              }`}
            >
              Client Sheets
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveView('sms')}
            className={`flex-1 px-5 py-3 rounded-full ${
              activeView === 'sms' ? 'bg-sky-300' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-semibold text-center ${
                activeView === 'sms' ? 'text-black' : 'text-[#bdbdbd]'
              }`}
            >
              SMS Manager
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content Area */}
        {activeView === 'sheets' ? (
          <View
            className="flex-1 rounded-2xl p-12 items-center justify-center"
            style={{
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
          >
            <View
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: COLORS.glassHighlight,
              }}
            />
            <View className="max-w-md items-center">
              <View className="w-16 h-16 bg-lime-300/10 rounded-full items-center justify-center mb-4">
                <Users color="#bef264" size={32} />
              </View>
              <Text className="text-xl font-semibold text-white mb-2 text-center">
                Client Sheets
              </Text>
              <Text className="text-[#bdbdbd] text-center">
                View and manage detailed client information, visit history, and preferences.
              </Text>
            </View>
          </View>
        ) : (
          <SMSManager />
        )}
      </View>
    </SafeAreaView>
  );
}