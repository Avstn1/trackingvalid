import NotificationsDropdown from '@/components/Header/NotificationsDropdown';
import { supabase } from "@/utils/supabaseClient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Text, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';




interface CustomHeaderProps {
  pageName: string;
}

export function CustomHeader({ pageName }: CustomHeaderProps) {
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
      <View className="flex-1 justify-center items-center bg-zinc-950">
        <ActivityIndicator size="large" color="#c4ff85" />
        <Text className="text-white mt-4">Loading header...</Text>
      </View>
    );
  }

  return (
    <View 
      className="bg-zinc-850 border-b border-[rgba(196,255,133,0.10)]"
      style={{ paddingTop: insets.top - 45, paddingBottom: 16 }}
    >
      <View className="px-5 flex-row items-center justify-between">
        <Text className="text-white text-3xl font-bold flex-1">
          ShearWork - <Text className="text-[#c4ff85]">{pageName}</Text>
        </Text>
        <NotificationsDropdown userId={profile.user_id} />
      </View>
    </View>
  );
}