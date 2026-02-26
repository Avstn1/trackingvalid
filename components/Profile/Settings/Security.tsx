// components/Settings/SecuritySection.tsx
import { COLORS } from '@/constants/design-system';
import { getFadeInDown, useReducedMotionPreference } from '@/utils/motion';
import { supabase } from '@/utils/supabaseClient';
import * as Device from 'expo-device';
import {
  AlertTriangle,
  Clock,
  CreditCard,
  MapPin,
  Monitor,
  Smartphone,
  Trash2
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated from 'react-native-reanimated';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const ACCENT = {
  green: '#b9ff3b',
  black: '#000000',
  danger: '#ff4b4b',
  dangerMuted: 'rgba(255, 75, 75, 0.1)',
  dangerBorder: 'rgba(255, 75, 75, 0.3)',
  warning: '#f59e0b',
  warningMuted: 'rgba(245, 158, 11, 0.1)',
  warningBorder: 'rgba(245, 158, 11, 0.3)',
  orange: '#f97316',
  orangeMuted: 'rgba(249, 115, 22, 0.1)',
  orangeBorder: 'rgba(249, 115, 22, 0.3)',
};

interface UserDevice {
  id: string;
  user_id: string;
  device_type: 'web' | 'mobile';
  device_id: string;
  device_name: string;
  session_id: string;
  last_login: string;
  last_active: string;
  ip_address?: string;
  created_at: string;
}

// ─── Reusable confirmation modal ────────────────────────────────────────────

type ConfirmModalProps = {
  visible: boolean;
  title: string;
  body: string;
  confirmText: string;
  confirmBg: string;
  confirmTextColor?: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function ConfirmModal({
  visible,
  title,
  body,
  confirmText,
  confirmBg,
  confirmTextColor = ACCENT.black,
  loading,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
        <View
          className="w-full rounded-2xl p-6"
          style={{ maxWidth: 420, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
        >
          <Text className="text-lg font-semibold mb-2" style={{ color: COLORS.textPrimary }}>{title}</Text>
          <Text className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>{body}</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              disabled={loading}
              onPress={onClose}
              className="flex-1 py-2.5 rounded-lg items-center justify-center"
              style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
            >
              <Text className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={loading}
              onPress={onConfirm}
              className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center gap-1"
              style={{ backgroundColor: confirmBg }}
            >
              {loading && <ActivityIndicator size="small" color={confirmTextColor} style={{ marginRight: 4 }} />}
              <Text className="text-sm font-medium" style={{ color: confirmTextColor }}>
                {loading ? 'Please wait...' : confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function SecuritySection() {
  const reduceMotion = useReducedMotionPreference();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const [devices, setDevices] = useState<UserDevice[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [currentDeviceId, setCurrentDeviceId] = useState<string>('');

  const [currentUsername, setCurrentUsername] = useState<string>('');
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const [showLogoutOthersModal, setShowLogoutOthersModal] = useState(false);
  const [showLogoutAllModal, setShowLogoutAllModal] = useState(false);
  const [showSubscriptionBlockModal, setShowSubscriptionBlockModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);

  const [logoutOthersLoading, setLogoutOthersLoading] = useState(false);
  const [logoutAllLoading, setLogoutAllLoading] = useState(false);

  useEffect(() => {
    fetchCurrentUser();
    fetchAndCleanDevices();
    const deviceId = Device.osBuildId || 'unknown';
    setCurrentDeviceId(deviceId);
  }, []);

  const fetchCurrentUser = async () => {
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) return;
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username, stripe_subscription_status')
      .eq('user_id', authData.user.id)
      .single();
    if (error) { console.error('Error fetching profile:', error); return; }
    if (profile?.username) setCurrentUsername(profile.username);
    setHasActiveSubscription(profile?.stripe_subscription_status === 'active');
  };

  const fetchAndCleanDevices = async () => {
    setLoadingDevices(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const cutoff = new Date(Date.now() - ONE_DAY_MS).toISOString();
      await supabase.from('user_devices').delete().eq('user_id', authData.user.id).lt('last_active', cutoff);
      const { data, error } = await supabase
        .from('user_devices').select('*').eq('user_id', authData.user.id)
        .gte('last_active', cutoff).order('last_active', { ascending: false });
      if (error) throw error;
      const seen = new Set<string>();
      const unique = (data || []).filter((d) => { if (seen.has(d.device_id)) return false; seen.add(d.device_id); return true; });
      setDevices(unique);
    } catch (err) {
      console.error('Error fetching devices:', err);
    } finally {
      setLoadingDevices(false);
    }
  };

  const executeLogoutOthers = async () => {
    setLogoutOthersLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      const { error } = await supabase.auth.signOut({ scope: 'others' });
      if (error) throw error;
      await supabase.from('user_devices').delete().eq('user_id', authData.user.id).neq('device_id', currentDeviceId);
      setShowLogoutOthersModal(false);
      fetchAndCleanDevices();
    } catch (err) {
      console.error('Error logging out others:', err);
    } finally {
      setLogoutOthersLoading(false);
    }
  };

  const executeLogoutEverywhere = async () => {
    setLogoutAllLoading(true);
    try {
      const { error } = await supabase.auth.signOut({ scope: 'global' });
      if (error) throw error;
      // Auth state change handles navigation
    } catch (err) {
      console.error('Error logging out everywhere:', err);
    } finally {
      setLogoutAllLoading(false);
    }
  };

  const handleDeleteAccountClick = () => {
    setDeleteConfirmText('');
    if (hasActiveSubscription) {
      setShowSubscriptionBlockModal(true);
    } else {
      setShowDeleteAccountModal(true);
    }
  };

  const executeDeleteAccount = async () => {
    setDeletingAccount(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token ?? '';
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;

      const res = await fetch(`${API_BASE_URL}/api/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-client-access-token': accessToken },
        body: JSON.stringify({ userId: authData.user.id }),
      });

      if (!res.ok) {
        const body = await res.json();
        if (res.status === 403 && body?.code === 'active_subscription') {
          setShowDeleteAccountModal(false);
          setShowSubscriptionBlockModal(true);
          return;
        }
        throw new Error(body?.error || 'Failed to delete account');
      }

      await supabase.auth.signOut();
      // Auth state change handles navigation
    } catch (err) {
      console.error('Error deleting account:', err);
    } finally {
      setDeletingAccount(false);
    }
  };

  const updatePassword = async () => {
    if (!oldPassword || !newPassword || newPassword.length < 6) return;
    setUpdatingPassword(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const email = authData.user?.email;
      if (!email) { setUpdatingPassword(false); return; }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password: oldPassword });
      if (signInError) { setUpdatingPassword(false); return; }
      const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
      if (updateError) throw updateError;
      setOldPassword('');
      setNewPassword('');
    } catch (err) {
      console.error(err);
    }
    setUpdatingPassword(false);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${diffHours}h ago`;
  };

  const requiredDeletePhrase = `delete ${currentUsername}`;
  const deleteConfirmValid = deleteConfirmText === requiredDeletePhrase;

  return (
    <Animated.View entering={getFadeInDown(reduceMotion)}>

      {/* ── Active Sessions ─────────────────────────────────────────── */}
      <View className="mb-5 rounded-2xl overflow-hidden" style={{ backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border }}>
        <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Text className="font-bold mb-1" style={{ color: COLORS.textPrimary, fontSize: 18 }}>Active Sessions</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Devices active in the last 24 hours</Text>

          <View className="flex-row gap-2 mt-3">
            {devices.length > 1 && (
              <TouchableOpacity
                onPress={() => setShowLogoutOthersModal(true)}
                className="px-3 py-2 rounded-lg flex-1"
                style={{ backgroundColor: ACCENT.orangeMuted, borderWidth: 1, borderColor: ACCENT.orangeBorder }}
              >
                <Text className="text-center font-semibold" style={{ color: ACCENT.orange, fontSize: 13 }}>Logout Others</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => setShowLogoutAllModal(true)}
              className="px-3 py-2 rounded-lg flex-1"
              style={{ backgroundColor: ACCENT.dangerMuted, borderWidth: 1, borderColor: ACCENT.dangerBorder }}
            >
              <Text className="text-center font-semibold" style={{ color: ACCENT.danger, fontSize: 13 }}>Logout All</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="p-4">
          {loadingDevices ? (
            <View className="py-8 items-center justify-center"><ActivityIndicator color={COLORS.primary} /></View>
          ) : devices.length === 0 ? (
            <View className="py-8 items-center justify-center">
              <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>No active sessions</Text>
            </View>
          ) : (
            <View className="gap-2">
              {devices.map((device) => {
                const isCurrent = device.device_id === currentDeviceId;
                return (
                  <View
                    key={device.device_id}
                    className="flex-row items-center p-3 rounded-xl"
                    style={{
                      backgroundColor: isCurrent ? COLORS.primaryMuted : COLORS.surfaceGlass,
                      borderWidth: 1,
                      borderColor: isCurrent ? 'rgba(139, 207, 104, 0.3)' : COLORS.glassBorder,
                    }}
                  >
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center mr-3"
                      style={{ backgroundColor: isCurrent ? 'rgba(139, 207, 104, 0.15)' : COLORS.surfaceElevated }}
                    >
                      {device.device_type === 'mobile'
                        ? <Smartphone size={18} color={isCurrent ? COLORS.primary : COLORS.textSecondary} />
                        : <Monitor size={18} color={isCurrent ? COLORS.primary : COLORS.textSecondary} />
                      }
                    </View>
                    <View className="flex-1">
                      <View className="flex-row items-center gap-2">
                        <Text numberOfLines={1} className="font-semibold flex-1" style={{ color: COLORS.textPrimary, fontSize: 14 }}>
                          {device.device_name}
                        </Text>
                        {isCurrent && (
                          <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(139, 207, 104, 0.25)' }}>
                            <Text style={{ color: COLORS.primary, fontSize: 11, fontWeight: '600' }}>Current</Text>
                          </View>
                        )}
                      </View>
                      <View className="flex-row items-center gap-3 mt-1">
                        <View className="flex-row items-center gap-1">
                          <Clock size={12} color={COLORS.textTertiary} />
                          <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>{formatDate(device.last_active)}</Text>
                        </View>
                        {device.ip_address && (
                          <View className="flex-row items-center gap-1">
                            <MapPin size={12} color={COLORS.textTertiary} />
                            <Text numberOfLines={1} style={{ color: COLORS.textTertiary, fontSize: 12 }}>{device.ip_address}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>

      {/* ── Change Password ──────────────────────────────────────────── */}
      <View className="mb-5 rounded-2xl overflow-hidden" style={{ backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: COLORS.border }}>
        <View className="p-4" style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}>
          <Text className="font-bold mb-1" style={{ color: COLORS.textPrimary, fontSize: 18 }}>Change Password</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 14 }}>Update your account password</Text>
        </View>
        <View className="p-4">
          <View className="mb-4">
            <Text className="font-medium mb-2" style={{ color: COLORS.textSecondary, fontSize: 13 }}>Current Password</Text>
            <TextInput
              secureTextEntry value={oldPassword} onChangeText={setOldPassword}
              placeholder="Enter current password" placeholderTextColor={COLORS.textTertiary}
              className="px-4 py-3 rounded-xl"
              style={{ backgroundColor: COLORS.surfaceGlass, borderWidth: 1, borderColor: COLORS.glassBorder, color: COLORS.textPrimary, fontSize: 15 }}
            />
          </View>
          <View className="mb-4">
            <Text className="font-medium mb-2" style={{ color: COLORS.textSecondary, fontSize: 13 }}>New Password</Text>
            <TextInput
              secureTextEntry value={newPassword} onChangeText={setNewPassword}
              placeholder="Min. 6 characters" placeholderTextColor={COLORS.textTertiary}
              className="px-4 py-3 rounded-xl"
              style={{ backgroundColor: COLORS.surfaceGlass, borderWidth: 1, borderColor: COLORS.glassBorder, color: COLORS.textPrimary, fontSize: 15 }}
            />
            <Text style={{ color: COLORS.textTertiary, fontSize: 11, marginTop: 4 }}>Password must be at least 6 characters</Text>
          </View>
          <TouchableOpacity
            onPress={updatePassword} disabled={updatingPassword}
            className="py-3.5 rounded-xl"
            style={{ backgroundColor: COLORS.primary, opacity: updatingPassword ? 0.6 : 1, shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 }}
          >
            {updatingPassword
              ? <ActivityIndicator color={COLORS.textInverse} />
              : <Text className="text-center font-bold" style={{ color: COLORS.textInverse, fontSize: 15 }}>Update Password</Text>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Danger Zone ──────────────────────────────────────────────── */}
      <View className="mb-5 rounded-2xl overflow-hidden" style={{ backgroundColor: COLORS.surfaceElevated, borderWidth: 1, borderColor: ACCENT.dangerBorder }}>
        <View className="p-4 flex-row items-center gap-2" style={{ borderBottomWidth: 1, borderBottomColor: ACCENT.dangerBorder }}>
          <AlertTriangle size={16} color={ACCENT.danger} />
          <Text className="font-semibold" style={{ color: ACCENT.danger, fontSize: 16 }}>Danger Zone</Text>
        </View>
        <View className="p-4">
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 12 }}>
            Permanently delete your account and all associated data. This cannot be undone. You will still need to confirm after clicking the button below.
          </Text>
          <TouchableOpacity
            onPress={handleDeleteAccountClick} disabled={deletingAccount}
            className="py-3 rounded-lg flex-row items-center justify-center gap-2"
            style={{ backgroundColor: ACCENT.dangerMuted, borderWidth: 1, borderColor: ACCENT.dangerBorder, opacity: deletingAccount ? 0.6 : 1 }}
          >
            {deletingAccount
              ? <ActivityIndicator color={ACCENT.danger} />
              : <>
                  <Trash2 size={16} color={ACCENT.danger} />
                  <Text className="font-semibold" style={{ color: ACCENT.danger, fontSize: 15 }}>Delete Account</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Logout Others Modal ──────────────────────────────────────── */}
      <ConfirmModal
        visible={showLogoutOthersModal}
        title="Logout All Other Devices?"
        body="This will immediately log out all devices except your current one. You'll need to log back in on those devices."
        confirmText="Logout Others"
        confirmBg={ACCENT.orange}
        loading={logoutOthersLoading}
        onConfirm={executeLogoutOthers}
        onClose={() => setShowLogoutOthersModal(false)}
      />

      {/* ── Logout All Modal ─────────────────────────────────────────── */}
      <ConfirmModal
        visible={showLogoutAllModal}
        title="Logout From All Devices?"
        body="This will immediately log you out from all devices, including this one. You'll be redirected to the login screen."
        confirmText="Logout All"
        confirmBg={ACCENT.danger}
        confirmTextColor="#fff"
        loading={logoutAllLoading}
        onConfirm={executeLogoutEverywhere}
        onClose={() => setShowLogoutAllModal(false)}
      />

      {/* ── Subscription Block Modal ─────────────────────────────────── */}
      <Modal visible={showSubscriptionBlockModal} transparent animationType="fade" onRequestClose={() => setShowSubscriptionBlockModal(false)}>
        <View className="flex-1 justify-center items-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <View className="w-full rounded-2xl p-6" style={{ maxWidth: 420, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
            {/* Header */}
            <View className="flex-row items-center gap-3 mb-5">
              <View className="p-2.5 rounded-xl" style={{ backgroundColor: ACCENT.warningMuted, borderWidth: 1, borderColor: ACCENT.warningBorder }}>
                <CreditCard size={20} color={ACCENT.warning} />
              </View>
              <View>
                <Text className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>Active Subscription</Text>
                <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>You must cancel your plan before deleting your account</Text>
              </View>
            </View>

            {/* Body */}
            <View className="rounded-xl p-4 mb-5" style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)' }}>
              <Text className="text-sm mb-2" style={{ color: COLORS.textPrimary }}>
                Your account currently has an{' '}
                <Text style={{ color: ACCENT.warning, fontWeight: '600' }}>active Corva subscription</Text>
                . Account deletion is not available while a subscription is active.
              </Text>
              <Text style={{ color: COLORS.textSecondary, fontSize: 12 }}>
                After cancelling, your access continues until the end of the billing period. You can then return here to permanently delete your account.
              </Text>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setShowSubscriptionBlockModal(false)}
                className="flex-1 py-2.5 rounded-lg items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <Text className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Close</Text>
              </TouchableOpacity>
              {/* <TouchableOpacity
                onPress={() => setShowSubscriptionBlockModal(false)}
                className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center gap-2"
                style={{ backgroundColor: ACCENT.green }}
              >
                <CreditCard size={16} color={ACCENT.black} />
                <Text className="text-sm font-semibold" style={{ color: ACCENT.black }}>Manage Billing</Text>
                <ArrowRight size={14} color={ACCENT.black} />
              </TouchableOpacity> */}
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Delete Account Modal ─────────────────────────────────────── */}
      <Modal visible={showDeleteAccountModal} transparent animationType="fade" onRequestClose={() => !deletingAccount && setShowDeleteAccountModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <ScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
          <View className="w-full rounded-2xl p-6" style={{ maxWidth: 420, backgroundColor: '#1a1a1a', borderWidth: 1, borderColor: ACCENT.dangerBorder }}>
            {/* Header */}
            <View className="flex-row items-center gap-3 mb-4">
              <View className="p-2.5 rounded-xl" style={{ backgroundColor: ACCENT.dangerMuted }}>
                <AlertTriangle size={20} color={ACCENT.danger} />
              </View>
              <View>
                <Text className="text-lg font-semibold" style={{ color: ACCENT.danger }}>Delete Account</Text>
                <Text style={{ color: COLORS.textTertiary, fontSize: 12 }}>This action is permanent and irreversible</Text>
              </View>
            </View>

            {/* Warning body */}
            <View className="rounded-xl p-4 mb-5" style={{ backgroundColor: ACCENT.dangerMuted, borderWidth: 1, borderColor: ACCENT.dangerBorder }}>
              <Text className="text-sm mb-2" style={{ color: COLORS.textPrimary }}>
                Deleting your account will permanently erase all of your Corva data, including:
              </Text>
              {[
                'Your barbershop profile and account settings',
                'All clients and their visit history',
                'All appointments and booking records',
                'All expenses and reports',
                'All SMS campaigns, credits, and message history',
                'All analytics and performance data',
                'Your subscription and billing history',
              ].map((item) => (
                <Text key={item} style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 2 }}>• {item}</Text>
              ))}
              <Text className="text-xs font-semibold mt-2" style={{ color: ACCENT.danger }}>
                ⚠ Clicking "Delete My Account" is the final step.
              </Text>
              <Text className="text-xs font-semibold" style={{ color: ACCENT.danger }}>
                ⚠ Corva support cannot restore anything after this point.
              </Text>
            </View>

            {/* Type to confirm */}
            <Text style={{ color: COLORS.textSecondary, fontSize: 12, marginBottom: 8 }}>
              To confirm, type{' '}
              <Text style={{ color: COLORS.textPrimary, fontWeight: '600' }}>delete {currentUsername}</Text>
              {' '}below:
            </Text>
            <TextInput
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder={`delete ${currentUsername}`}
              placeholderTextColor={COLORS.textTertiary}
              autoCapitalize="none"
              autoCorrect={false}
              spellCheck={false}
              style={{
                backgroundColor: 'rgba(255,255,255,0.05)',
                borderWidth: 1,
                borderColor: deleteConfirmText.length > 0 && !deleteConfirmValid ? ACCENT.danger : 'rgba(255,255,255,0.1)',
                color: COLORS.textPrimary,
                fontSize: 14,
                borderRadius: 8,
                paddingHorizontal: 12,
                paddingVertical: 10,
                marginBottom: 4,
              }}
            />
            {deleteConfirmText.length > 0 && !deleteConfirmValid && (
              <Text style={{ color: ACCENT.danger, fontSize: 11, marginBottom: 12 }}>
                Doesn't match — type exactly: delete {currentUsername}
              </Text>
            )}
            {!(deleteConfirmText.length > 0 && !deleteConfirmValid) && <View style={{ marginBottom: 16 }} />}

            {/* Actions */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                disabled={deletingAccount}
                onPress={() => { setShowDeleteAccountModal(false); setDeleteConfirmText(''); }}
                className="flex-1 py-2.5 rounded-lg items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
              >
                <Text className="text-sm font-medium" style={{ color: COLORS.textPrimary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!deleteConfirmValid || deletingAccount}
                onPress={executeDeleteAccount}
                className="flex-1 py-2.5 rounded-lg flex-row items-center justify-center gap-2"
                style={{ backgroundColor: ACCENT.danger, opacity: !deleteConfirmValid || deletingAccount ? 0.4 : 1 }}
              >
                {deletingAccount
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Trash2 size={14} color="#fff" />
                      <Text className="text-sm font-semibold" style={{ color: '#fff' }}>Delete My Account</Text>
                    </>
                }
              </TouchableOpacity>
            </View>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

    </Animated.View>
  );
}