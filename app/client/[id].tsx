/**
 * Client Detail Screen
 * 
 * Shows full details for a single client including contact info,
 * visit history, SMS status, and notes.
 */

import { COLORS, RADIUS, SPACING } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { 
  ArrowLeft, 
  Calendar, 
  Copy, 
  Mail, 
  MessageSquare, 
  Phone, 
  User,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

type ClientData = {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  phone_normalized: string | null;
  notes: string | null;
  first_appt: string | null;
  last_appt: string | null;
  total_appointments: number | null;
  total_tips_all_time: number | null;
  visiting_type: string | null;
  date_last_sms_sent: string | null;
  sms_subscribed: boolean;
};

export default function ClientDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchClient();
    }
  }, [id]);

  const fetchClient = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from('acuity_clients')
        .select('*')
        .eq('client_id', id)
        .single();

      if (queryError) throw queryError;
      setClient(data);
    } catch (err: any) {
      console.error('Error fetching client:', err);
      setError(err.message || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const capitalizeName = (name: string | null | undefined) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const [year, month, day] = d.split('-').map(Number);
    if (!year || !month || !day) return '—';
    const dateObj = new Date(year, month - 1, day);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined) return '$0.00';
    return `$${amount.toFixed(2)}`;
  };

  const handleCall = () => {
    if (client?.phone) {
      Linking.openURL(`tel:${client.phone}`);
    }
  };

  const handleCopyEmail = async () => {
    if (client?.email) {
      await Clipboard.setStringAsync(client.email);
      Alert.alert('Copied', 'Email copied to clipboard');
    }
  };

  const handleCopyPhone = async () => {
    if (client?.phone) {
      await Clipboard.setStringAsync(client.phone);
      Alert.alert('Copied', 'Phone number copied to clipboard');
    }
  };

  const fullName = client 
    ? `${capitalizeName(client.first_name)} ${capitalizeName(client.last_name)}`.trim() || 'Unknown Client'
    : '';

  // Get initials for avatar
  const initials = client
    ? `${(client.first_name?.[0] || '').toUpperCase()}${(client.last_name?.[0] || '').toUpperCase()}` || '?'
    : '';

  if (loading) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text className="text-sm mt-3" style={{ color: COLORS.textSecondary }}>
            Loading client...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !client) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }}>
        <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-base mb-4" style={{ color: COLORS.negative }}>
            {error || 'Client not found'}
          </Text>
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 py-3 rounded-full"
            style={{ backgroundColor: COLORS.primary }}
          >
            <Text className="text-sm font-medium" style={{ color: COLORS.textInverse }}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: COLORS.background }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <View 
        className="flex-row items-center px-4 py-3"
        style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 items-center justify-center rounded-full"
          style={{ backgroundColor: COLORS.surfaceElevated }}
        >
          <ArrowLeft size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text 
          className="flex-1 text-lg font-semibold ml-4"
          style={{ color: COLORS.textPrimary }}
          numberOfLines={1}
        >
          Client Details
        </Text>
      </View>

      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingBottom: insets.bottom + 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Section */}
        <View className="items-center py-8">
          {/* Avatar */}
          <View 
            className="w-24 h-24 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: COLORS.primaryMuted }}
          >
            <Text 
              className="text-3xl font-bold"
              style={{ color: COLORS.primary }}
            >
              {initials}
            </Text>
          </View>
          
          {/* Name */}
          <Text 
            className="text-2xl font-bold mb-2"
            style={{ color: COLORS.textPrimary }}
          >
            {fullName}
          </Text>
          
          {/* Visiting Type Badge */}
          {client.visiting_type && (
            <View 
              className="px-4 py-1.5 rounded-full"
              style={{ backgroundColor: COLORS.primaryMuted }}
            >
              <Text 
                className="text-sm font-medium capitalize"
                style={{ color: COLORS.primary }}
              >
                {client.visiting_type.replace('-', ' ')} client
              </Text>
            </View>
          )}
        </View>

        {/* Contact Section */}
        <View className="px-4 mb-6">
          <SectionHeader title="Contact" />
          <View 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder }}
          >
            {/* Phone */}
            {client.phone && (
              <View 
                className="flex-row items-center justify-between px-4 py-4"
                style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}
              >
                <View className="flex-row items-center flex-1">
                  <View 
                    className="w-10 h-10 rounded-lg items-center justify-center"
                    style={{ backgroundColor: COLORS.primaryMuted }}
                  >
                    <Phone size={18} color={COLORS.primary} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
                      Phone
                    </Text>
                    <Text className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
                      {client.phone}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={handleCopyPhone}
                    className="w-10 h-10 rounded-lg items-center justify-center"
                    style={{ backgroundColor: COLORS.surfaceElevated }}
                  >
                    <Copy size={16} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCall}
                    className="w-10 h-10 rounded-lg items-center justify-center"
                    style={{ backgroundColor: COLORS.positive }}
                  >
                    <Phone size={16} color={COLORS.textInverse} />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            {/* Email */}
            {client.email && (
              <View className="flex-row items-center justify-between px-4 py-4">
                <View className="flex-row items-center flex-1">
                  <View 
                    className="w-10 h-10 rounded-lg items-center justify-center"
                    style={{ backgroundColor: COLORS.infoMuted }}
                  >
                    <Mail size={18} color={COLORS.info} />
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
                      Email
                    </Text>
                    <Text 
                      className="text-sm font-medium" 
                      style={{ color: COLORS.textPrimary }}
                      numberOfLines={1}
                    >
                      {client.email}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={handleCopyEmail}
                  className="w-10 h-10 rounded-lg items-center justify-center"
                  style={{ backgroundColor: COLORS.surfaceElevated }}
                >
                  <Copy size={16} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            
            {/* No contact info */}
            {!client.phone && !client.email && (
              <View className="px-4 py-6 items-center">
                <Text className="text-sm" style={{ color: COLORS.textTertiary }}>
                  No contact information available
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Visit History Section */}
        <View className="px-4 mb-6">
          <SectionHeader title="Visit History" />
          <View 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder }}
          >
            <StatRow 
              icon={<Calendar size={18} color={COLORS.primary} />}
              label="First Visit"
              value={formatDate(client.first_appt)}
              iconBg={COLORS.primaryMuted}
            />
            <StatRow 
              icon={<Clock size={18} color={COLORS.info} />}
              label="Last Visit"
              value={formatDate(client.last_appt)}
              iconBg={COLORS.infoMuted}
              hasBorder
            />
            <StatRow 
              icon={<User size={18} color={COLORS.positive} />}
              label="Total Visits"
              value={String(client.total_appointments ?? 0)}
              iconBg={COLORS.positiveMuted}
              hasBorder
            />
            <StatRow 
              icon={<DollarSign size={18} color={COLORS.warning} />}
              label="Total Tips"
              value={formatCurrency(client.total_tips_all_time)}
              iconBg={COLORS.warningMuted}
              hasBorder
              isLast
            />
          </View>
        </View>

        {/* SMS Status Section */}
        <View className="px-4 mb-6">
          <SectionHeader title="SMS Marketing" />
          <View 
            className="rounded-xl overflow-hidden"
            style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder }}
          >
            <View className="flex-row items-center justify-between px-4 py-4">
              <View className="flex-row items-center flex-1">
                <View 
                  className="w-10 h-10 rounded-lg items-center justify-center"
                  style={{ backgroundColor: client.sms_subscribed ? COLORS.positiveMuted : COLORS.negativeMuted }}
                >
                  {client.sms_subscribed ? (
                    <CheckCircle size={18} color={COLORS.positive} />
                  ) : (
                    <XCircle size={18} color={COLORS.negative} />
                  )}
                </View>
                <View className="ml-3">
                  <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
                    Subscription Status
                  </Text>
                  <Text 
                    className="text-sm font-medium" 
                    style={{ color: client.sms_subscribed ? COLORS.positive : COLORS.negative }}
                  >
                    {client.sms_subscribed ? 'Subscribed' : 'Not Subscribed'}
                  </Text>
                </View>
              </View>
            </View>
            
            {client.date_last_sms_sent && (
              <View 
                className="flex-row items-center px-4 py-4"
                style={{ borderTopWidth: 1, borderTopColor: COLORS.border }}
              >
                <View 
                  className="w-10 h-10 rounded-lg items-center justify-center"
                  style={{ backgroundColor: COLORS.surfaceElevated }}
                >
                  <MessageSquare size={18} color={COLORS.textSecondary} />
                </View>
                <View className="ml-3">
                  <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
                    Last SMS Sent
                  </Text>
                  <Text className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
                    {formatDate(client.date_last_sms_sent)}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notes Section */}
        {client.notes && (
          <View className="px-4 mb-6">
            <SectionHeader title="Notes" />
            <View 
              className="rounded-xl p-4"
              style={{ backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.glassBorder }}
            >
              <Text 
                className="text-sm leading-relaxed"
                style={{ color: COLORS.textSecondary }}
              >
                {client.notes}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// Section Header Component
function SectionHeader({ title }: { title: string }) {
  return (
    <View className="flex-row items-center mb-3">
      <Text 
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: COLORS.textTertiary }}
      >
        {title}
      </Text>
      <View 
        className="flex-1 ml-3 h-px" 
        style={{ backgroundColor: COLORS.border }} 
      />
    </View>
  );
}

// Stat Row Component
function StatRow({ 
  icon, 
  label, 
  value, 
  iconBg,
  hasBorder = false,
  isLast = false,
}: { 
  icon: React.ReactNode;
  label: string;
  value: string;
  iconBg: string;
  hasBorder?: boolean;
  isLast?: boolean;
}) {
  return (
    <View 
      className="flex-row items-center px-4 py-4"
      style={hasBorder && !isLast ? { borderTopWidth: 1, borderTopColor: COLORS.border } : {}}
    >
      <View 
        className="w-10 h-10 rounded-lg items-center justify-center"
        style={{ backgroundColor: iconBg }}
      >
        {icon}
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
          {label}
        </Text>
        <Text className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>
          {value}
        </Text>
      </View>
    </View>
  );
}
