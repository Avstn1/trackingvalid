import React, { useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

// Match the palette you use in Profile/Settings
const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.6)',
  textSubtle: 'rgba(247, 247, 247, 0.45)',
  green: '#b9ff3b',
  greenSoft: '#8bcf68ff',
  danger: '#ff4b4b',
  dangerSoft: '#ff7777',
  black: '#000000',
};

export default function Billing() {
  // ⚠️ UI-only demo state – replace with real billing summary later
  const [hasSubscription] = useState(true);
  const [cancelAtPeriodEnd, setCancelAtPeriodEnd] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);

  // Placeholder values (these will eventually come from your API)
  const amountText = '$20.00';
  const intervalLabel = 'month';
  const renewDateText = 'January 1, 2026';

  const openCancelModal = () => setShowCancelConfirm(true);
  const openResumeModal = () => setShowResumeConfirm(true);

  // Just simulating async + state changes for now
  const handleConfirmCancel = () => {
    setLoadingAction(true);
    setTimeout(() => {
      setLoadingAction(false);
      setCancelAtPeriodEnd(true);
      setShowCancelConfirm(false);
    }, 600);
  };

  const handleConfirmResume = () => {
    setLoadingAction(true);
    setTimeout(() => {
      setLoadingAction(false);
      setCancelAtPeriodEnd(false);
      setShowResumeConfirm(false);
    }, 600);
  };

  const handleCloseModal = () => {
    if (loadingAction) return;
    setShowCancelConfirm(false);
    setShowResumeConfirm(false);
  };

  return (
    <View className="mb-4">
      {/* Section heading */}
      <Text
        className="text-lg font-bold mb-3"
        style={{ color: COLORS.text }}
      >
        Billing
      </Text>

      {/* Current plan card */}
      <View
        className="rounded-2xl mb-3 px-4 py-3"
        style={{
          backgroundColor: COLORS.surfaceSolid,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <Text
          className="text-xs font-semibold mb-1"
          style={{ color: COLORS.textSubtle, textTransform: 'uppercase' }}
        >
          Current plan
        </Text>

        <Text
          className="text-base font-semibold"
          style={{ color: COLORS.text }}
        >
          {hasSubscription ? 'ShearWork Pro' : 'No active subscription'}
        </Text>

        {hasSubscription && (
          <Text
            className="text-xs mt-1"
            style={{ color: COLORS.textMuted }}
          >
            1 active subscription
          </Text>
        )}
      </View>

      {/* Payment card */}
      <View
        className="rounded-2xl mb-3 px-4 py-3"
        style={{
          backgroundColor: COLORS.surfaceSolid,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <Text
          className="text-xs font-semibold mb-1"
          style={{ color: COLORS.textSubtle, textTransform: 'uppercase' }}
        >
          Payment
        </Text>

        {!hasSubscription ? (
          <Text
            className="text-sm"
            style={{ color: COLORS.textMuted }}
          >
            You don't have an active subscription right now.
          </Text>
        ) : (
          <>
            <Text
              className="text-sm"
              style={{ color: COLORS.textMuted }}
            >
              {cancelAtPeriodEnd
                ? 'Your plan will end on '
                : 'Your plan will automatically renew on '}
              <Text
                className="font-semibold"
                style={{ color: COLORS.text }}
              >
                {renewDateText || 'the current period end date'}
              </Text>
              {cancelAtPeriodEnd
                ? ". You won't be charged again."
                : '.'}
            </Text>

            <Text
              className="text-sm mt-1.5"
              style={{ color: COLORS.textMuted }}
            >
              You&apos;ll be charged{' '}
              <Text
                className="font-semibold"
                style={{ color: COLORS.text }}
              >
                {amountText || 'the plan price'}
              </Text>{' '}
              / {intervalLabel}.
            </Text>
          </>
        )}
      </View>

      {/* Manage subscription card */}
      <View
        className="rounded-2xl px-4 py-3"
        style={{
          backgroundColor: '#191919',
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <View className="mb-3">
          <Text
            className="text-sm font-semibold mb-1"
            style={{ color: COLORS.text }}
          >
            Manage subscription
          </Text>
          <Text
            className="text-xs"
            style={{ color: COLORS.textMuted }}
          >
            {!cancelAtPeriodEnd
              ? 'You can cancel your subscription at any time. Access will remain until the end of your current billing period.'
              : 'Your subscription is scheduled to cancel at the end of the current billing period.'}
          </Text>
        </View>

        <TouchableOpacity
          disabled={loadingAction || !hasSubscription}
          onPress={cancelAtPeriodEnd ? openResumeModal : openCancelModal}
          className="flex-row items-center justify-center rounded-full py-2.5"
          style={{
            backgroundColor: cancelAtPeriodEnd
              ? COLORS.green
              : COLORS.danger,
            opacity: hasSubscription ? 1 : 0.5,
            shadowColor: cancelAtPeriodEnd ? COLORS.greenSoft : COLORS.dangerSoft,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.35,
            shadowRadius: 6,
            elevation: 3,
          }}
        >
          {loadingAction && (
            <ActivityIndicator
              size="small"
              color={COLORS.black}
              style={{ marginRight: 6 }}
            />
          )}
          <Text
            className="text-sm font-semibold"
            style={{ color: COLORS.black }}
          >
            {loadingAction
              ? 'Processing…'
              : cancelAtPeriodEnd
              ? 'Resume auto-billing'
              : 'Cancel subscription'}
          </Text>
        </TouchableOpacity>

        <Text
          className="text-[11px] mt-2"
          style={{ color: COLORS.textSubtle }}
        >
          You can&apos;t change plans in the app yet. We know it&apos;s not
          ideal.
        </Text>
      </View>

      {/* Confirmation modals */}
      <ConfirmationModal
        visible={showCancelConfirm}
        title="Cancel subscription?"
        description="If you cancel now, you'll keep access until the end of your current billing period. You can subscribe again later if you change your mind."
        confirmText="Yes, cancel it"
        loading={loadingAction}
        onConfirm={handleConfirmCancel}
        onClose={handleCloseModal}
      />

      <ConfirmationModal
        visible={showResumeConfirm}
        title="Resume subscription?"
        description="You are scheduled to cancel your subscription at the end of the period. Do you want to resume auto-billing?"
        confirmText="Yes, resume"
        loading={loadingAction}
        onConfirm={handleConfirmResume}
        onClose={handleCloseModal}
      />
    </View>
  );
}

type ConfirmationProps = {
  visible: boolean;
  title: string;
  description: string;
  confirmText: string;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

function ConfirmationModal({
  visible,
  title,
  description,
  confirmText,
  loading,
  onConfirm,
  onClose,
}: ConfirmationProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        className="flex-1 justify-center items-center px-4"
        style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      >
        <View
          className="w-full rounded-2xl px-4 py-4"
          style={{
            maxWidth: 420,
            backgroundColor: COLORS.surfaceSolid,
            borderWidth: 1,
            borderColor: COLORS.glassBorder,
          }}
        >
          <Text
            className="text-base font-semibold mb-1"
            style={{ color: COLORS.text }}
          >
            {title}
          </Text>
          <Text
            className="text-sm mb-4"
            style={{ color: COLORS.textMuted }}
          >
            {description}
          </Text>

          <View className="flex-row justify-end">
            <TouchableOpacity
              disabled={loading}
              onPress={onClose}
              className="px-3 py-2 rounded-full mr-2"
              style={{
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text
                className="text-sm"
                style={{ color: COLORS.text }}
              >
                Never mind
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={loading}
              onPress={onConfirm}
              className="flex-row items-center px-4 py-2 rounded-full"
              style={{
                backgroundColor: COLORS.green,
              }}
            >
              {loading && (
                <ActivityIndicator
                  size="small"
                  color={COLORS.black}
                  style={{ marginRight: 6 }}
                />
              )}
              <Text
                className="text-sm font-semibold"
                style={{ color: COLORS.black }}
              >
                {confirmText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
