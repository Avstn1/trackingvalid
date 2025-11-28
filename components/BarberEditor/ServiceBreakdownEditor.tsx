import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'

interface Props {
  barberId: string
  month: string
}

interface ServiceRow {
  id?: number | string
  service_name: string
  bookings: number | ''
  isNew?: boolean
}

const handleNumericChange = (value: string, onChange: (val: number | '') => void) => {
  if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
    onChange(value === '' ? '' : Number(value))
  }
}

export default function ServiceBreakdownEditor({ barberId, month }: Props) {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<number | string | null>(null)

  useEffect(() => {
    if (!barberId) return
    fetchData()
  }, [barberId, month])

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('service_bookings')
      .select('id, service_name, bookings')
      .eq('user_id', barberId)
      .eq('report_month', month)
      .eq('report_year', new Date().getFullYear())

    if (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load data.'
      })
      setRows([])
    } else {
      setRows(data || [])
    }
    setLoading(false)
  }

  const handleSave = async (row: ServiceRow) => {
    if (!barberId) return Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Missing barber ID.'
    })
    setSavingId(row.id ?? null)

    const payload = {
      user_id: barberId,
      service_name: row.service_name,
      bookings: row.bookings || 0,
      report_month: month,
      report_year: new Date().getFullYear(),
      created_at: new Date().toISOString(),
    }

    if (row.isNew) {
      const { data, error } = await supabase
        .from('service_bookings')
        .insert([payload])
        .select()
        .maybeSingle()

      setSavingId(null)
      if (error) Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to save new service.'
      })
      else if (data) {
        Toast.show({
          type: 'success',
          text1: 'Success',
          text2: 'Service saved!'
        })
        setRows(prev =>
          prev.map(r => (r.id === row.id ? { ...data, isNew: false } : r))
        )
      }
      return
    }

    const { error } = await supabase
      .from('service_bookings')
      .update({ service_name: row.service_name, bookings: row.bookings || 0 })
      .eq('id', row.id)

    setSavingId(null)
    if (error) Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Update failed.'
    })
    else Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Service updated!'
    })
  }

  const handleDelete = async (id?: number | string, isNew?: boolean) => {
    if (!id) return
    if (isNew) {
      setRows(prev => prev.filter(r => r.id !== id))
      return
    }

    const { error } = await supabase
      .from('service_bookings')
      .delete()
      .eq('id', id)

    if (error) Toast.show({
      type: 'error',
      text1: 'Error',
      text2: 'Delete failed.'
    })
    else {
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
    const newRow: ServiceRow = {
      id: tempId,
      service_name: '',
      bookings: '',
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
        <Text className="text-[#E8EDC7] font-semibold text-lg">💈 Service Breakdown Editor</Text>
        <TouchableOpacity
          className="bg-[#445539] px-3 py-2 rounded-lg active:opacity-80"
          onPress={handleAdd}
        >
          <Text className="text-white text-sm">Add Service</Text>
        </TouchableOpacity>
      </View>

      {rows.length === 0 ? (
        <Text className="text-gray-400 text-sm">
          No service data yet for {month}. You can start by adding one.
        </Text>
      ) : (
        <ScrollView className="gap-2">
          {rows.map(row => (
            <View key={row.id} className="flex-row items-center gap-3 mb-2">
              <TextInput
                className="flex-1 bg-[#2b2b2b] text-white p-2 rounded-lg"
                value={row.service_name}
                onChangeText={val =>
                  setRows(prev => prev.map(r => (r.id === row.id ? { ...r, service_name: val } : r)))
                }
                placeholder="Service Name"
                placeholderTextColor="#666"
              />
              <TextInput
                className="w-24 bg-[#2b2b2b] text-white p-2 rounded-lg"
                keyboardType="decimal-pad"
                value={row.bookings.toString()}
                onChangeText={val =>
                  handleNumericChange(val, v =>
                    setRows(prev => prev.map(r => (r.id === row.id ? { ...r, bookings: v } : r)))
                  )
                }
                placeholder="Bookings"
                placeholderTextColor="#666"
              />
              <TouchableOpacity
                className="bg-[#445539] px-3 py-2 rounded-lg active:opacity-80"
                onPress={() => handleSave(row)}
                disabled={savingId === row.id}
              >
                <Text className="text-white text-xs">
                  {savingId === row.id ? 'Saving...' : row.isNew ? 'Save New' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="bg-[#7b2b2b] px-3 py-2 rounded-lg active:opacity-80"
                onPress={() => handleDelete(row.id, row.isNew)}
              >
                <Text className="text-white text-xs">Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}