import Constants from 'expo-constants'
import * as Device from 'expo-device'
import * as Notifications from 'expo-notifications'
import { useEffect, useRef, useState } from 'react'
import { Alert, Platform } from 'react-native'

// Configure how notifications should be handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
})

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null)
  const [notification, setNotification] = useState<Notifications.Notification | null>(null)
  const notificationListener = useRef<Notifications.Subscription>()
  const responseListener = useRef<Notifications.Subscription>()

  useEffect(() => {
    registerForPushNotificationsAsync()
      .then(token => {
        if (token) {
          setExpoPushToken(token)
        }
      })
      .catch(error => {
        console.error('Error registering for push notifications:', error)
      })

    // Listen for notifications received while app is in foreground
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification)
      setNotification(notification)
    })

    // Listen for user tapping on notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response)
      // Handle navigation based on notification data
      const data = response.notification.request.content.data
      console.log('Notification data:', data)
      // You can navigate to specific screens here based on data
      // Example: if (data.screen) { router.push(data.screen) }
    })

    return () => {
      if (notificationListener.current) {
        notificationListener.current?.remove()
      }
      if (responseListener.current) {
        responseListener.current?.remove()
      }
    }
  }, [])

  return {
    expoPushToken,
    notification,
  }
}

async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null

  // Check if running on physical device
  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices, not simulators/emulators')
    return null
  }

  try {
    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#c4ff85',
      })
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync()
    let finalStatus = existingStatus

    // Request permissions if not granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync()
      finalStatus = status
    }

    // If permissions denied, return null
    if (finalStatus !== 'granted') {
      console.warn('Push notification permissions not granted')
      Alert.alert(
        'Notifications Disabled',
        'Please enable notifications in your device settings to receive updates.',
        [{ text: 'OK' }]
      )
      return null
    }

    // Get project ID
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId

    if (!projectId) {
      console.error('Project ID not found. Make sure it is configured in app.json or app.config.js')
    }

    // Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId,
    })

    token = tokenData.data
    console.log('✅ Expo Push Token obtained:', token)

    return token
  } catch (error) {
    console.error('Error in registerForPushNotificationsAsync:', error)
    return null
  }
}

// Helper function to send a local notification (for testing)
export async function sendLocalNotification(
  title: string, 
  body: string, 
  data?: Record<string, any>
): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: null, // null means send immediately
    })
    console.log('✅ Local notification sent:', title)
  } catch (error) {
    console.error('Error sending local notification:', error)
  }
}

// Helper function to cancel all notifications
export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
    console.log('✅ All scheduled notifications cancelled')
  } catch (error) {
    console.error('Error cancelling notifications:', error)
  }
}

// Helper function to get notification permissions status
export async function getNotificationPermissions(): Promise<Notifications.PermissionStatus> {
  const { status } = await Notifications.getPermissionsAsync()
  return status
}