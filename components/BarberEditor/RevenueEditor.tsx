import { supabase } from '@/utils/supabaseClient'
import { useEffect, useState } from 'react'
import { ActivityIndicator, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Toast from 'react-native-toast-message'

interface AdminRevenueEditorProps {
  barberId: string
  month: string
  year: number
}

export default function AdminRevenueEditor({ barberId, month, year }: AdminRevenueEditorProps) {
  const [revenue, setRevenue] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [monthlyReportExists, setMonthlyReportExists] = useState<boolean>(false)

  useEffect(() => {
    async function loadRevenue() {
      try {
        const { data: reports, error } = await supabase
          .from('monthly_data')
          .select('id, total_revenue')
          .eq('user_id', barberId)
          .eq('month', month)
          .eq('year', year)
          .limit(1)

        if (error) throw error

        const exists = Array.isArray(reports) && reports.length > 0
        setMonthlyReportExists(exists)

        if (exists) setRevenue(reports[0].total_revenue?.toString() ?? '')
      } catch (err) {
        console.error(err)
        Toast.show({
          type: 'error',
          text1: 'Failed to load monthly revenue.',
        })
      } finally {
        setLoading(false)
      }
    }

    if (barberId) loadRevenue()
  }, [barberId, month, year])

  const handleUpdate = async () => {
    const num = revenue === '' ? 0 : Number(revenue)

    const { error } = await supabase
      .from('monthly_data')
      .upsert(
        {
          user_id: barberId,
          month,
          year,
          total_revenue: num,
        },
        {
          onConflict: 'user_id,month,year',
        }
      )

    if (error) {
      console.error(error)
      Toast.show({ type: 'error', text1: 'Failed to save revenue.' })
      return
    }

    Toast.show({ type: 'success', text1: 'Revenue saved successfully!' })
    setMonthlyReportExists(true)
  }

  const handleChange = (value: string) => {
    if (value === '' || /^[0-9]*\.?[0-9]*$/.test(value)) {
      setRevenue(value)
    }
  }

  if (loading) {
    return <ActivityIndicator size="small" color="#c4ff85" className="mt-5" />
  }

  return (
    <View className="bg-zinc-900 p-4 rounded-xl shadow-md">
      <Text className="text-white text-lg font-semibold mb-2">Edit Monthly Revenue</Text>

      <TextInput
        value={revenue}
        onChangeText={handleChange}
        placeholder="Enter revenue..."
        placeholderTextColor="#a1a1aa"
        keyboardType="decimal-pad"
        className="w-full bg-zinc-800 text-white border border-zinc-700 rounded-md p-2 mb-3"
      />

      <TouchableOpacity
        onPress={handleUpdate}
        activeOpacity={0.8}
        className="bg-[#c4ff85] px-4 py-2 rounded-md"
      >
        <Text className="text-zinc-900 text-sm font-semibold text-center">
          Update Revenue
        </Text>
      </TouchableOpacity>
    </View>
  )
}