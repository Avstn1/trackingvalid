/**
 * Logout screen - redirects to settings index
 * Logout is now handled via ProfileDrawer with Alert confirmation
 */
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { View } from 'react-native';

export default function LogoutSettingsScreen() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to settings index - logout is now in ProfileDrawer
    router.replace('/(dashboard)/settings');
  }, []);

  return <View />;
}
