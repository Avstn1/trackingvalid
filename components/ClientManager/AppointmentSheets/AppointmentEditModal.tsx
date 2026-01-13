import { supabase } from '@/utils/supabaseClient';
import { Check, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const COLORS = {
  background: '#1a1f1b',
  card: '#1f1f1f',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  input: '#0d0f0d',
  amber: '#fbbf24',
  green: '#4ade80',
  red: '#f87171',
};

type AppointmentRow = {
  id: string;
  acuity_appointment_id: string | null;
  client_id: string | null;
  phone_normalized: string | null;
  appointment_date: string;
  datetime: string;
  revenue: number | null;
  tip: number | null;
  service_type: string | null;
  client_first_name: string | null;
  client_last_name: string | null;
};

type Props = {
  isOpen: boolean;
  appointment: AppointmentRow | null;
  onClose: () => void;
  onUpdate: (appointmentId: string, updates: { tip?: number; revenue?: number }) => void;
};

export default function AppointmentEditModal({ isOpen, appointment, onClose, onUpdate }: Props) {
  const [tip, setTip] = useState('');
  const [revenue, setRevenue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (appointment) {
      setTip(appointment.tip?.toString() || '0');
      setRevenue(appointment.revenue?.toString() || '0');
      setError(null);
      setSuccess(false);
    }
  }, [appointment]);

  const handleSave = async () => {
    if (!appointment) return;

    const tipValue = parseFloat(tip);
    const revenueValue = parseFloat(revenue);

    if (isNaN(tipValue) || tipValue < 0) {
      setError('Please enter a valid tip amount (0 or greater)');
      return;
    }

    if (isNaN(revenueValue) || revenueValue < 0) {
      setError('Please enter a valid revenue amount (0 or greater)');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;

      const res = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/appointment-manager/appointments`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-client-access-token': accessToken || '',
          },
          body: JSON.stringify({
            id: appointment.id,
            tip: tipValue,
            revenue: revenueValue,
          }),
        }
      );

      const body = await res.json();

      if (!res.ok) {
        throw new Error(body.error || 'Failed to update appointment');
      }

      setSuccess(true);
      onUpdate(appointment.id, { tip: tipValue, revenue: revenueValue });

      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      setSaving(false);
    }
  };

  const formatDateTime = (d: string | null | undefined) => {
    if (!d) return '—';
    const dateObj = new Date(d);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const capitalizeName = (name: string | null | undefined) => {
    if (!name) return '';
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const clientName =
    `${capitalizeName(appointment?.client_first_name)} ${capitalizeName(appointment?.client_last_name)}`.trim() ||
    'Unknown Client';

  if (!isOpen || !appointment) return null;

  return (
    <Modal animationType="fade" transparent={true} visible={isOpen} onRequestClose={onClose}>
      <Pressable
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
        onPress={onClose}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <Pressable
            className="w-11/12 max-w-md rounded-2xl overflow-hidden"
            style={{
              backgroundColor: COLORS.background,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View className="px-6 py-4 border-b border-white/10 bg-black/20">
              <View className="flex-row items-center justify-between">
                <Text className="text-white text-lg font-semibold">Edit Appointment</Text>
                <TouchableOpacity
                  onPress={onClose}
                  className="p-1 rounded-lg bg-white/10"
                >
                  <X color="#bdbdbd" size={20} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Content */}
            <ScrollView className="px-6 py-5">
              {/* Appointment Details */}
              <View className="mb-4">
                <View className="flex-row justify-between items-start mb-3">
                  <Text className="text-[#a0a0a0] text-xs uppercase">Client</Text>
                  <Text className="text-white text-sm font-medium text-right flex-1 ml-2">
                    {clientName}
                  </Text>
                </View>

                <View className="flex-row justify-between items-start mb-3">
                  <Text className="text-[#a0a0a0] text-xs uppercase">Date & Time</Text>
                  <Text className="text-[#d4d4d4] text-sm text-right flex-1 ml-2">
                    {formatDateTime(appointment.datetime)}
                  </Text>
                </View>

                {appointment.phone_normalized && (
                  <View className="flex-row justify-between items-start mb-3">
                    <Text className="text-[#a0a0a0] text-xs uppercase">Phone</Text>
                    <Text className="text-[#d4d4d4] text-sm text-right">
                      {appointment.phone_normalized}
                    </Text>
                  </View>
                )}

                {appointment.service_type && (
                  <View className="flex-row justify-between items-start">
                    <Text className="text-[#a0a0a0] text-xs uppercase">Service</Text>
                    <Text className="text-[#d4d4d4] text-sm text-right flex-1 ml-2">
                      {appointment.service_type}
                    </Text>
                  </View>
                )}
              </View>

              {/* Divider */}
              <View className="border-t border-white/10 mb-4" />

              {/* Revenue Input */}
              <View className="mb-4">
                <Text className="text-[#a0a0a0] text-xs uppercase mb-2">Revenue</Text>
                <View className="flex-row items-center px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: COLORS.input,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <Text className="text-green-300 text-lg font-medium mr-2" style={{ lineHeight: 22 }}>$</Text>
                  <TextInput
                    value={revenue}
                    onChangeText={setRevenue}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#555"
                    editable={!saving}
                    className="flex-1 text-white text-lg font-medium"
                    style={{ paddingVertical: 0, lineHeight: 19.5 }}
                  />
                </View>
              </View>

              {/* Tip Input */}
              <View className="mb-4">
                <Text className="text-[#a0a0a0] text-xs uppercase mb-2">Tip</Text>
                <View className="flex-row items-center px-4 py-3 rounded-xl border"
                  style={{
                    backgroundColor: COLORS.input,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  <Text className="text-amber-300 text-lg font-medium mr-2" style={{ lineHeight: 22 }}>$</Text>
                  <TextInput
                    value={tip}
                    onChangeText={setTip}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#555"
                    editable={!saving}
                    className="flex-1 text-white text-lg font-medium"
                    style={{ paddingVertical: 0, lineHeight: 19.5 }}
                  />
                </View>
              </View>

              {/* Error/Success Messages */}
              {error && (
                <View className="px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/30 mb-4">
                  <Text className="text-red-300 text-sm">{error}</Text>
                </View>
              )}
              {success && (
                <View className="px-3 py-2 rounded-lg bg-green-500/20 border border-green-500/30 mb-4 flex-row items-center gap-2">
                  <Check color="#4ade80" size={16} />
                  <Text className="text-green-300 text-sm">Appointment updated successfully!</Text>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View className="px-6 py-4 border-t border-white/10 bg-black/20 flex-row justify-end gap-3">
              <TouchableOpacity
                onPress={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg"
              >
                <Text className="text-[#bdbdbd] text-sm font-medium">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving || success}
                className="px-5 py-2 rounded-lg"
                style={{
                  backgroundColor: saving || success ? 'rgba(251, 191, 36, 0.5)' : COLORS.amber,
                }}
              >
                {saving ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="#000" />
                    <Text className="text-black text-sm font-semibold">Saving...</Text>
                  </View>
                ) : success ? (
                  <Text className="text-black text-sm font-semibold">Saved!</Text>
                ) : (
                  <Text className="text-black text-sm font-semibold">Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </TouchableWithoutFeedback>
      </Pressable>
    </Modal>
  );
}