import DailyTipsDropdown from '@/components/Header/DailyTipsDropdown';
import NotificationsDropdown from '@/components/Header/NotificationsDropdown';
import { supabase } from "@/utils/supabaseClient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Color Palette
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  orange: '#FF5722',
  orangeGlow: 'rgba(255, 87, 34, 0.3)',
  purple: '#673AB7',
  yellow: '#FFEB3B',
};

interface CustomHeaderProps {
  pageName: string;
  userId?: string;
  onRefresh?: () => void;
}

export function CustomHeader({ pageName, userId, onRefresh }: CustomHeaderProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const fetchUserAndProfile = async () => {
      try {
        setLoading(true);
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError) throw authError;
        if (!user) throw new Error("No user session found.");

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        setProfile(profileData);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndProfile();
  }, []);

  if (loading) {
    return (
      <View 
        className="flex-1 justify-center items-center" 
        style={{ backgroundColor: COLORS.background }}
      >
        <ActivityIndicator size="large" color={COLORS.orange} />
        <Text className="mt-4" style={{ color: COLORS.text }}>Loading header...</Text>
      </View>
    );
  }

  return (
    <View 
      style={{ 
        paddingTop: insets.top - 45, 
        paddingBottom: 16,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.glassBorder,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
      }}
    >
      {/* Top highlight line for glass effect */}
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

      <View className="px-5 flex-row items-center justify-between">
        <Text 
          className="text-3xl font-bold flex-1"
          style={{ color: COLORS.orange }}
        >
          {pageName}
        </Text>
        
        <View className="flex-row items-center gap-3">
          <DailyTipsDropdown barberId={profile.user_id} onRefresh={onRefresh} />
          <NotificationsDropdown userId={profile.user_id} />
        </View>
      </View>
    </View>
  );
}