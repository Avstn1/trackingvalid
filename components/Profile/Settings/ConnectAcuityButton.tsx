// components/Settings/ConnectAcuityButton.tsx
import { supabase } from '@/utils/supabaseClient'
import * as WebBrowser from 'expo-web-browser'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Text, TouchableOpacity } from 'react-native'

interface ConnectAcuityButtonProps {
  onConnectSuccess?: () => void
  onDisconnect?: () => void  // ADD: New callback for disconnect
  apiBaseUrl: string
}

// Color Palette
const COLORS = {
  background: '#181818',
  cardBg: '#1a1a1a',
  surface: 'rgba(37, 37, 37, 0.6)',
  surfaceSolid: '#252525',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
  text: '#F7F7F7',
  textMuted: 'rgba(247, 247, 247, 0.5)',
  green: '#8bcf68ff',
  greenGlow: '#5b8f52ff',
}

export default function ConnectAcuityButton({ onConnectSuccess, onDisconnect, apiBaseUrl }: ConnectAcuityButtonProps) {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialConnected, setInitialConnected] = useState<boolean | null>(null)

  useEffect(() => {
    const fetchConnectionStatus = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        if (!accessToken) {
          console.warn('No access token found')
          setLoading(false)
          return
        }

        const res = await fetch(`${apiBaseUrl}/api/acuity/status`, {
          headers: {
            'x-client-access-token': accessToken,
          },
        })
        const data = await res.json()
        setConnected(data.connected)
        setInitialConnected(data.connected)
      } catch (err) {
        console.error('Error checking Acuity connection:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchConnectionStatus()
  }, [apiBaseUrl])

  const handleConnect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        Alert.alert('Error', 'No authentication token found')
        return
      }

      const authUrl = `${apiBaseUrl}/api/acuity/authorize?token=${encodeURIComponent(accessToken)}&mobile=true`
      
      await WebBrowser.openBrowserAsync(authUrl)
      
      const statusRes = await fetch(`${apiBaseUrl}/api/acuity/status`, {
        headers: {
          'x-client-access-token': accessToken,
        },
      })
      const data = await statusRes.json()
      setConnected(data.connected)
      
      if (data.connected && onConnectSuccess) {
        onConnectSuccess()
        Alert.alert('Success', 'Connected to Acuity!')
      }
      
    } catch (err) {
      console.error('Error connecting to Acuity:', err)
      Alert.alert('Error', 'Failed to connect to Acuity')
    }
  }

  const handleDisconnect = async () => {
    Alert.alert(
      'Disconnect Acuity',
      'Are you sure you want to disconnect your Acuity account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data: { session } } = await supabase.auth.getSession()
              const accessToken = session?.access_token

              if (!accessToken) {
                Alert.alert('Error', 'No authentication token found')
                return
              }

              const res = await fetch(`${apiBaseUrl}/api/acuity/disconnect`, { 
                method: 'POST',
                headers: {
                  'x-client-access-token': accessToken,
                },
              })
              
              if (res.ok) {
                setConnected(false)
                // CHANGE: Call onDisconnect callback to disable sync buttons
                if (onDisconnect) {
                  onDisconnect()
                }
                Alert.alert('Success', 'Acuity disconnected successfully.')
              } else {
                Alert.alert('Error', 'Error disconnecting Acuity.')
              }
            } catch (err) {
              console.error('Error disconnecting:', err)
              Alert.alert('Error', 'Error disconnecting Acuity.')
            }
          }
        }
      ]
    )
  }

  // Detect first successful connection
  useEffect(() => {
    if (connected && initialConnected === false && onConnectSuccess) {
      onConnectSuccess()
    }
  }, [connected, initialConnected, onConnectSuccess])

  if (loading) {
    return (
      <TouchableOpacity
        disabled
        className="py-3 rounded-xl flex-row items-center justify-center"
        style={{
          backgroundColor: COLORS.surfaceSolid,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <ActivityIndicator size="small" color={COLORS.green} />
        <Text className="ml-2 text-base" style={{ color: COLORS.textMuted }}>
          Loading...
        </Text>
      </TouchableOpacity>
    )
  }

  return connected ? (
    <TouchableOpacity
      onPress={handleDisconnect}
      className="py-3 rounded-xl"
      style={{
        backgroundColor: COLORS.surfaceSolid,
        borderWidth: 1,
        borderColor: '#DC2626',
      }}
    >
      <Text 
        className="text-center font-semibold text-base"
        style={{ color: '#DC2626' }}
      >
        Disconnect Acuity
      </Text>
    </TouchableOpacity>
  ) : (
    <TouchableOpacity
      onPress={handleConnect}
      className="py-3 rounded-xl"
      style={{
        backgroundColor: COLORS.green,
      }}
    >
      <Text 
        className="text-center font-bold text-base"
        style={{ color: COLORS.text }}
      >
        Connect to Acuity
      </Text>
    </TouchableOpacity>
  )
}