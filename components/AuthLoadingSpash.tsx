/**
 * AuthLoadingSplash - Minimal loading indicator
 * 
 * Used during data loading (after the main CustomSplash animation).
 * Intentionally simple - just a spinner and message.
 * No logo since user just saw it in CustomSplash.
 */

import { COLORS } from '@/constants/design-system';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

interface AuthLoadingSplashProps {
  message?: string;
}

export default function AuthLoadingSplash({ message = 'Loading...' }: AuthLoadingSplashProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      {message && (
        <Text style={styles.message}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  message: {
    fontSize: 14,
    color: COLORS.textTertiary,
    marginTop: 16,
  },
});
