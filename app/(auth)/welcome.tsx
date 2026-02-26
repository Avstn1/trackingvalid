import { useRouter } from 'expo-router'
import { MoreVertical, X } from 'lucide-react-native'
import React, { useState } from 'react'
import { Image, Linking, Modal, Text, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const FEATURES = [
  { emoji: '📅', title: 'Appointment Sync', desc: 'Sync your Acuity bookings automatically.' },
  { emoji: '💬', title: 'SMS Marketing', desc: 'Re-engage clients with targeted campaigns.' },
  { emoji: '📊', title: 'Business Analytics', desc: "Understand what's working and what's not." },
  { emoji: '👥', title: 'Client Management', desc: 'Keep track of every client relationship.' },
]

export default function WelcomeScreen() {
  const router = useRouter()
  const [menuVisible, setMenuVisible] = useState(false)

  return (
    <SafeAreaView className="flex-1 bg-[#101312]">

      {/* Top bar: dots menu + sign in */}
      <View className="flex-row justify-end items-center px-5 pt-2 pb-1 gap-2">
        <TouchableOpacity
          onPress={() => setMenuVisible(true)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.06)',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MoreVertical size={18} color="#8a9e93" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/login')}
          style={{
            paddingHorizontal: 18,
            height: 40,
            borderRadius: 12,
            backgroundColor: 'rgba(255,255,255,0.07)',
            borderWidth: 1,
            borderColor: 'rgba(122,255,201,0.4)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#7affc9', fontWeight: '700', fontSize: 14 }}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingBottom: 24 }}>
        {/* Hero */}
        <View className="items-center mt-12 mb-12">
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
            style={{
              backgroundColor: 'rgba(122,255,201,0.08)',
              borderWidth: 1,
              borderColor: 'rgba(122,255,201,0.25)',
            }}
          >
            <Image
              source={require('@/assets/images/corvalogoTransparent.png')}
              style={{ width: 48, height: 48 }}
              resizeMode="contain"
            />
          </View>
          <Text className="text-4xl font-bold text-white text-center mb-3">
            Welcome to Corva
          </Text>
          <Text className="text-base text-[#8a9e93] text-center px-4 leading-6">
            Turn your hustle into a system. The all-in-one business tool built for barbers.
          </Text>
        </View>

        {/* Features grid */}
        <View style={{ marginBottom: 12, gap: 10 }}>
          {/* Row 1 */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {FEATURES.slice(0, 2).map((f) => (
              <View
                key={f.title}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <Text style={{ fontSize: 22, marginBottom: 6 }}>{f.emoji}</Text>
                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13, marginBottom: 2 }}>{f.title}</Text>
                <Text style={{ color: '#8a9e93', fontSize: 11, lineHeight: 16 }}>{f.desc}</Text>
              </View>
            ))}
          </View>
          {/* Row 2 */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {FEATURES.slice(2, 4).map((f) => (
              <View
                key={f.title}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.1)',
                  borderRadius: 16,
                  padding: 14,
                }}
              >
                <Text style={{ fontSize: 22, marginBottom: 6 }}>{f.emoji}</Text>
                <Text style={{ color: '#ffffff', fontWeight: '600', fontSize: 13, marginBottom: 2 }}>{f.title}</Text>
                <Text style={{ color: '#8a9e93', fontSize: 11, lineHeight: 16 }}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* CTA card */}
        <View className="w-full bg-[#7affc9]/10 border border-[#7affc9]/30 rounded-2xl p-6 items-center gap-3" style={{ marginTop: 64 }}>
          <Text className="text-white font-bold text-lg text-center">
            Ready to grow your business?
          </Text>
          <Text className="text-[#8a9e93] text-sm text-center leading-5">
            Sign up on the web to get access, then log in here to manage everything on the go.
          </Text>
          <View className="w-full h-px bg-white/10 my-1" />
          <Text className="text-[#7affc9] font-bold text-base text-center">
            Create an account on Corva Web
          </Text>
        </View>
      </View>

      {/* Dropdown menu modal */}
      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        {/* Backdrop */}
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        />
        {/* Dropdown — outside backdrop so touches aren't swallowed */}
        <View
          style={{
            position: 'absolute',
            top: 90,
            right: 20,
            borderRadius: 14,
            overflow: 'hidden',
            backgroundColor: '#1a2420',
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
            minWidth: 180,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
            elevation: 20,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 16,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <Text style={{ color: '#8a9e93', fontSize: 11, fontWeight: '600', letterSpacing: 0.8 }}>
              MORE
            </Text>
            <TouchableOpacity onPress={() => setMenuVisible(false)}>
              <X size={14} color="#8a9e93" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => {
              setMenuVisible(false)
              Linking.openURL('https://www.corva.ca/privacy-policy')
            }}
            style={{ paddingHorizontal: 16, paddingVertical: 14 }}
          >
            <Text style={{ color: '#ffffff', fontSize: 15, fontWeight: '500' }}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>

    </SafeAreaView>
  )
}