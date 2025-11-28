import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'

interface Props {
  barberId: string
  month: string
}

interface FunnelRow {
  id?: number | string
  source: string
  new_clients: number | ''
  returning_clients: number | ''
  retention: number
  isNew?: boolean
}

const handleNumericChange = (value: string, onChange: (val: number | '') => void) => {
  if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
    onChange(value === '' ? '' : Number(value))
  }
}

export default function MarketingFunnelsEditor({ barberId, month }: Props) {
  const [rows, setRows] = useState<FunnelRow[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | string | null>(null)

  useEffect(() => {
    if (!barberId) return
    fetchFunnels()
  }, [barberId, month])

  const fetchFunnels = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('marketing_funnels')
      .select('*')
      .eq('user_id', barberId)
      .eq('report_month', month)
      .eq('report_year', new Date().getFullYear())

    if (error) {
      console.error('Failed to load funnels:', error)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load funnels.'
      })
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  const handleSave = async (row: FunnelRow) => {
    if (!barberId) return Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Missing barber ID.'
    })
    setSavingId(row.id ?? null)

    const newClients = row.new_clients || 0
    const returningClients = row.returning_clients || 0
    const retention = newClients > 0 ? parseFloat(((returningClients / newClients) * 100).toFixed(2)) : 0

    if (row.isNew) {
      const payload = {
        user_id: barberId,
        source: row.source,
        new_clients: row.new_clients || 0,
        returning_clients: row.returning_clients || 0,
        retention,
        report_month: month,
        report_year: new Date().getFullYear(),
        created_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('marketing_funnels')
        .insert([payload])
        .select()
        .maybeSingle()

      setSavingId(null)
      if (error) {
        console.error('Insert failed:', error)
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: 'Failed to save new funnel.'
        })
      } else if (data) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Funnel saved!'
        })
        setRows(prev =>
          prev.map(r => (r.id === row.id ? { ...data, isNew: false } : r))
        )
      }
      return
    }

    const { error } = await supabase
      .from('marketing_funnels')
      .update({
        source: row.source,
        new_clients: row.new_clients || 0,
        returning_clients: row.returning_clients || 0,
        retention,
      })
      .eq('id', row.id)

    setSavingId(null)
    if (error) {
      console.error('Update error:', error)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Update failed.'
      })
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Funnel updated!'
      })
    }
  }

  const handleDelete = async (id?: number | string, isNew?: boolean) => {
    if (!id) return
    if (isNew) {
      setRows(prev => prev.filter(r => r.id !== id))
      return
    }

    const { error } = await supabase
      .from('marketing_funnels')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete failed:', error)
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Delete failed.'
      })
    } else {
      Toast.show({
        type: 'success',
        text1: 'Success',
        text2: 'Deleted.'
      })
      setRows(prev => prev.filter(r => r.id !== id))
    }
  }

  const handleAdd = () => {
    const tempId = `temp-${Math.random().toString(36).substring(2, 9)}`
    const newRow: FunnelRow = {
      id: tempId,
      source: '',
      new_clients: '',
      returning_clients: '',
      retention: 0,
      isNew: true,
    }
    setRows(prev => [...prev, newRow])
  }

  if (loading) {
    return (
      <View className="p-5 items-center">
        <ActivityIndicator size="large" color="#c4ff85" />
      </View>
    )
  }

  return (
    <View className="bg-[#1f1f1a] p-4 rounded-xl">
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-[#E8EDC7] font-semibold text-lg">📣 Marketing Funnels Editor</Text>
        <TouchableOpacity
          className="bg-[#445539] px-3 py-2 rounded-lg active:opacity-80"
          onPress={handleAdd}
        >
          <Text className="text-white text-sm">Add Funnel</Text>
        </TouchableOpacity>
      </View>

      {rows.length === 0 ? (
        <Text className="text-gray-400 text-sm">
          No funnel data yet for {month}. You can start by adding one.
        </Text>
      ) : (
        <ScrollView>
          <View className="hidden md:flex-row text-sm text-gray-400 px-2 mb-2">
            <Text className="flex-1 text-gray-400">Source</Text>
            <Text className="w-16 text-center text-gray-400">New</Text>
            <Text className="w-20 text-center text-gray-400">Returning</Text>
            <Text className="w-20 text-center text-gray-400">Retention</Text>
          </View>

          {rows.map(row => (
            <View key={row.id} className="bg-[#111] p-3 rounded-lg mb-3">
              <View className="flex-row items-center gap-2 mb-2">
                <TextInput
                  className="flex-1 bg-[#2b2b2b] text-white p-2 rounded-lg min-w-0"
                  value={row.source}
                  onChangeText={val =>
                    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, source: val } : r)))
                  }
                  placeholder="Source name"
                  placeholderTextColor="#666"
                />
                <TextInput
                  className="w-16 bg-[#2b2b2b] text-white p-2 rounded-lg text-center"
                  value={row.new_clients.toString()}
                  onChangeText={val =>
                    handleNumericChange(val, v =>
                      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, new_clients: v } : r)))
                    )
                  }
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                />
                <TextInput
                  className="w-20 bg-[#2b2b2b] text-white p-2 rounded-lg text-center"
                  value={row.returning_clients.toString()}
                  onChangeText={val =>
                    handleNumericChange(val, v =>
                      setRows(prev => prev.map(r => (r.id === row.id ? { ...r, returning_clients: v } : r)))
                    )
                  }
                  placeholder="0"
                  placeholderTextColor="#666"
                  keyboardType="number-pad"
                />
                <View className="w-20">
                  <Text className="text-white text-center">{row.retention.toFixed(2)}%</Text>
                </View>
              </View>

              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 bg-[#445539] px-2 py-2 rounded-lg active:opacity-80"
                  onPress={() => handleSave(row)}
                  disabled={savingId === row.id}
                >
                  <Text className="text-white text-xs text-center">
                    {savingId === row.id ? 'Saving...' : 'Save'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-red-600 px-2 py-2 rounded-lg active:opacity-80"
                  onPress={() => handleDelete(row.id, row.isNew)}
                >
                  <Text className="text-white text-xs text-center">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}