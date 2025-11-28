import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'

interface TopClient {
  id?: string
  client_name: string
  email: string
  total_paid: number | ''
  num_visits: number | ''
  notes: string
}

interface TopClientsEditorProps {
  barberId: string
  month: string
  year: number
}

const handleNumericChange = (value: string, onChange: (val: number | '') => void) => {
  if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
    onChange(value === '' ? '' : Number(value))
  }
}

export default function TopClientsEditor({ barberId, month, year }: TopClientsEditorProps) {
  const [clients, setClients] = useState<TopClient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [newClient, setNewClient] = useState<TopClient>({
    client_name: '',
    email: '',
    total_paid: '',
    num_visits: '',
    notes: '',
  })

  useEffect(() => {
    if (!barberId) return
    const fetchTopClients = async () => {
      setLoading(true)
      try {
        const { data: topClients, error } = await supabase
          .from('report_top_clients')
          .select('*')
          .eq('user_id', barberId)
          .eq('month', month)
          .eq('year', year)
          .order('total_paid', { ascending: false })

        if (error) throw error

        if (topClients) {
          setClients(
            topClients.map(c => ({
              ...c,
              num_visits: c.num_visits ?? '',
              total_paid: c.total_paid ?? '',
              notes: c.notes ?? '',
              client_name: c.client_name ?? '',
              email: c.email ?? '',
            }))
          )
        }
      } catch (err) {
        console.error('Error loading top clients:', err)
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to load top clients.'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchTopClients()
  }, [barberId, month, year])

  const handleAddClient = () => setShowModal(true)

  const handleSaveNewClient = () => {
    if (!newClient.client_name.trim() || !newClient.email.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Name and email are required.'
      })
      return
    }

    setClients(prev => [...prev, newClient])
    setNewClient({ client_name: '', email: '', total_paid: '', num_visits: '', notes: '' })
    setShowModal(false)
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Client added!'
    })
  }

  const handleRemoveClient = async (index: number) => {
    const clientToRemove = clients[index]
    if (clientToRemove.id) {
      try {
        const { error } = await supabase
          .from('report_top_clients')
          .delete()
          .eq('id', clientToRemove.id)
        if (error) throw error
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: `Removed client "${clientToRemove.client_name}"`
        })
      } catch (err) {
        console.error('Error deleting client:', err)
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to delete client.'
        })
        return
      }
    }
    setClients(prev => prev.filter((_, i) => i !== index))
  }

  const handleChange = (index: number, field: keyof TopClient, value: any) => {
    setClients(prev => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const upsertData = clients
        .filter(c => c.client_name.trim() && c.email.trim())
        .map(c => ({
          user_id: barberId,
          month,
          year,
          client_name: c.client_name.trim(),
          email: c.email.trim(),
          total_paid: c.total_paid === '' ? 0 : c.total_paid,
          num_visits: c.num_visits === '' ? 0 : c.num_visits,
          notes: c.notes.trim(),
        }))

      const { error } = await supabase
        .from('report_top_clients')
        .upsert(upsertData, { onConflict: 'user_id,month,year,email' })

      if (error) throw error
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Top clients saved!'
      })
    } catch (err: any) {
      console.error('Error saving top clients:', err.message)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save top clients.'
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <View className="p-5 items-center">
        <ActivityIndicator size="large" color="#c4ff85" />
      </View>
    )
  }

  return (
    <View className="bg-zinc-900/60 border border-zinc-700/60 rounded-2xl p-4">
      <Text className="text-lg font-semibold mb-4 text-white/90">Top Clients</Text>

      <ScrollView className="mb-4">
        {clients.map((client, idx) => (
          <View
            key={client.id || idx}
            className="flex-row items-center bg-zinc-800/70 rounded-xl p-3 mb-3 border border-zinc-700/50"
          >
            <Text className="text-xs text-gray-400 w-8 text-center">{idx + 1}</Text>
            
            <View className="flex-1 gap-2">
              <TextInput
                className="bg-zinc-900/90 border border-zinc-700 rounded-md px-2 py-2 text-xs text-white"
                value={client.client_name}
                onChangeText={val => handleChange(idx, 'client_name', val)}
                placeholder="Name"
                placeholderTextColor="#666"
              />
              <TextInput
                className="bg-zinc-900/90 border border-zinc-700 rounded-md px-2 py-2 text-xs text-white"
                value={client.email}
                onChangeText={val => handleChange(idx, 'email', val)}
                placeholder="Email"
                placeholderTextColor="#666"
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <View className="flex-row gap-2">
                <TextInput
                  className="flex-1 bg-zinc-900/90 border border-zinc-700 rounded-md px-2 py-2 text-xs text-white"
                  value={client.total_paid.toString()}
                  onChangeText={val => handleNumericChange(val, v => handleChange(idx, 'total_paid', v))}
                  placeholder="$ Paid"
                  placeholderTextColor="#666"
                  keyboardType="decimal-pad"
                />
                <TextInput
                  className="flex-1 bg-zinc-900/90 border border-zinc-700 rounded-md px-2 py-2 text-xs text-white"
                  value={client.num_visits.toString()}
                  onChangeText={val => handleNumericChange(val, v => handleChange(idx, 'num_visits', v))}
                  placeholder="Visits"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                />
              </View>
              <TextInput
                className="bg-zinc-900/90 border border-zinc-700 rounded-md px-2 py-2 text-xs text-white"
                value={client.notes}
                onChangeText={val => handleChange(idx, 'notes', val)}
                placeholder="Notes"
                placeholderTextColor="#666"
              />
            </View>
            
            <TouchableOpacity
              className="bg-red-600/90 rounded-md px-3 py-2 ml-2 active:opacity-80"
              onPress={() => handleRemoveClient(idx)}
            >
              <Text className="text-white text-xs">✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      <View className="flex-row gap-3">
        <TouchableOpacity
          className="flex-1 bg-amber-400/90 rounded-lg px-4 py-3 active:opacity-80"
          onPress={handleAddClient}
        >
          <Text className="text-black text-center text-sm font-semibold">+ Add Client</Text>
        </TouchableOpacity>

        <TouchableOpacity
          className={`flex-1 bg-amber-400/90 rounded-lg px-4 py-3 ${saving ? 'opacity-60' : ''}`}
          onPress={handleSave}
          disabled={saving}
        >
          <Text className="text-black text-center text-sm font-semibold">
            {saving ? 'Saving...' : 'Save Top Clients'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="fade">
        <View className="flex-1 bg-black/70 justify-center items-center px-5">
          <View className="bg-zinc-900/95 border border-zinc-700/60 rounded-2xl p-6 w-full max-w-md">
            <Text className="text-lg font-semibold mb-4 text-white">Add New Client</Text>

            <View className="gap-3">
              <TextInput
                className="bg-zinc-800/90 border border-zinc-700 rounded-md px-3 py-3 text-sm text-white"
                placeholder="Name"
                placeholderTextColor="#666"
                value={newClient.client_name}
                onChangeText={val => setNewClient({ ...newClient, client_name: val })}
              />
              <TextInput
                className="bg-zinc-800/90 border border-zinc-700 rounded-md px-3 py-3 text-sm text-white"
                placeholder="Email"
                placeholderTextColor="#666"
                value={newClient.email}
                onChangeText={val => setNewClient({ ...newClient, email: val })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
              <TextInput
                className="bg-zinc-800/90 border border-zinc-700 rounded-md px-3 py-3 text-sm text-white"
                placeholder="$ Paid"
                placeholderTextColor="#666"
                value={newClient.total_paid.toString()}
                onChangeText={val => handleNumericChange(val, v => setNewClient({ ...newClient, total_paid: v }))}
                keyboardType="decimal-pad"
              />
              <TextInput
                className="bg-zinc-800/90 border border-zinc-700 rounded-md px-3 py-3 text-sm text-white"
                placeholder="Visits"
                placeholderTextColor="#666"
                value={newClient.num_visits.toString()}
                onChangeText={val => handleNumericChange(val, v => setNewClient({ ...newClient, num_visits: v }))}
                keyboardType="number-pad"
              />
              <TextInput
                className="bg-zinc-800/90 border border-zinc-700 rounded-md px-3 py-3 text-sm text-white"
                placeholder="Notes"
                placeholderTextColor="#666"
                value={newClient.notes}
                onChangeText={val => setNewClient({ ...newClient, notes: val })}
              />
            </View>

            <View className="flex-row justify-end gap-3 mt-5">
              <TouchableOpacity
                className="px-4 py-2 rounded-md bg-zinc-700/70 active:opacity-80"
                onPress={() => setShowModal(false)}
              >
                <Text className="text-white text-sm">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="px-4 py-2 rounded-md bg-amber-400/90 active:opacity-80"
                onPress={handleSaveNewClient}
              >
                <Text className="text-black font-semibold text-sm">Add Client</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}