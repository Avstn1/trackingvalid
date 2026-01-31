import { Users, X } from 'lucide-react-native';
import { Dimensions, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

interface PreviewClient {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  phone_normalized: string;
  visiting_type: string | null;
  avg_weekly_visits: number | null;
  last_appt: string | null;
  total_appointments: number;
  days_since_last_visit: number;
  days_overdue: number;
  expected_visit_interval_days: number;
  score: number;
  date_last_sms_sent: string | null;
}

interface PreviewStats {
  total_selected: number;
  breakdown: Record<string, number>;
  avg_score: string;
  avg_days_overdue: string;
  avg_days_since_last_visit: string;
}

interface ClientPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewClients: PreviewClient[];
  previewStats: PreviewStats | null;
}

export default function ClientPreviewModal({
  isOpen,
  onClose,
  previewClients,
  previewStats,
}: ClientPreviewModalProps) {
  const { height: screenHeight } = Dimensions.get('window');

  const getVisitingTypeStyle = (type: string | null) => {
    return type === 'consistent'
      ? 'bg-green-400/80 text-green-700'
      : type === 'semi-consistent'
      ? 'bg-blue-400/80 text-blue-700'
      : type === 'easy-going'
      ? 'bg-yellow-400/80  text-yellow-700'
      : type === 'rare'
      ? 'bg-red-400/80 text-red-700'
      : 'bg-gray-400/80 text-gray-700';
  };

  const capitalize = (str: string | null) =>
    str ? str.charAt(0).toUpperCase() + str.slice(1) : '';

  return (
    <Modal visible={isOpen} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-black/60 justify-center items-center p-2">
        <Animated.View
          entering={FadeIn}
          exiting={FadeOut}
          style={{ width: '95%', maxHeight: screenHeight * 0.7 }}
        >
          <View className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <View className="flex-row items-center justify-between p-4 border-b border-white/10">
              <View className="flex-1 pr-2">
                <View className="flex-row items-center gap-2">
                  <Users color="#7dd3fc" size={20} />
                  <Text className="text-xl font-bold text-white" numberOfLines={1}>
                    Clients Selected for Next Campaign
                  </Text>
                </View>
                {previewStats && (
                  <Text className="text-sm text-[#bdbdbd] mt-1">
                    {previewStats.total_selected} clients will receive your next SMS
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={onClose} className="p-2 rounded-full active:bg-white/10">
                <X color="#bdbdbd" size={20} />
              </TouchableOpacity>
            </View>

            {/* Scrollable Content */}
            <ScrollView
              style={{ maxHeight: screenHeight * 0.65 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              {/* Stats */}
              {previewStats && (
                <View className="p-4 border-b border-white/10 bg-white/5">
                  <View className="flex-row gap-4 mb-4">
                    <View className="flex-1">
                      <Text className="text-xs text-[#bdbdbd] mb-1">Total</Text>
                      <Text className="text-2xl font-bold text-white">{previewStats.total_selected}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-[#bdbdbd] mb-1">Score</Text>
                      <Text className="text-2xl font-bold text-sky-300">{previewStats.avg_score}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-[#bdbdbd] mb-1">Since</Text>
                      <Text className="text-2xl font-bold text-purple-400">{previewStats.avg_days_since_last_visit}</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-xs text-[#bdbdbd] mb-1">Overdue</Text>
                      <Text className="text-2xl font-bold text-orange-400">{previewStats.avg_days_overdue}</Text>
                    </View>
                  </View>

                  {/* Summary Cards (VISITING TYPE LEGEND) */}
                  <View className="flex-row flex-wrap gap-2 mt-3">
                    {previewStats.breakdown.consistent > 0 && (
                      <View className="bg-green-400/80 px-2 py-0.5 rounded flex-row items-center gap-1 shadow-sm">
                        <Text className="text-[11px] text-gray-800 font-medium">Consistent: Weekly</Text>
                        <View className="px-1.5 py-0.5 rounded-full bg-green-400">
                          <Text className="text-[10px] font-semibold text-gray-800">
                            {previewStats.breakdown.consistent}
                          </Text>
                        </View>
                      </View>
                    )}
                    {previewStats.breakdown["semi-consistent"] > 0 && (
                      <View className="bg-blue-400/80 px-2 py-0.5 rounded flex-row items-center gap-1 shadow-sm">
                        <Text className="text-[11px] text-gray-800 font-medium">Semi: 2-3w</Text>
                        <View className="px-1.5 py-0.5 rounded-full bg-blue-400">
                          <Text className="text-[10px] font-semibold text-gray-800">
                            {previewStats.breakdown["semi-consistent"]}
                          </Text>
                        </View>
                      </View>
                    )}
                    {previewStats.breakdown["easy-going"] > 0 && (
                      <View className="bg-yellow-400/80 px-2 py-0.5 rounded flex-row items-center gap-1 shadow-sm">
                        <Text className="text-[11px] text-gray-800 font-medium">Easy: 1-2mo</Text>
                        <View className="px-1.5 py-0.5 rounded-full bg-yellow-400">
                          <Text className="text-[10px] font-semibold text-gray-800">
                            {previewStats.breakdown["easy-going"]}
                          </Text>
                        </View>
                      </View>
                    )}
                    {previewStats.breakdown.rare > 0 && (
                      <View className="bg-red-400/80 px-2 py-0.5 rounded flex-row items-center gap-1 shadow-sm">
                        <Text className="text-[11px] text-gray-800 font-medium">Rare: 2+mo</Text>
                        <View className="px-1.5 py-0.5 rounded-full bg-red-400">
                          <Text className="text-[10px] font-semibold text-gray-800">
                            {previewStats.breakdown.rare}
                          </Text>
                        </View>
                      </View>
                    )}
                    {previewStats.breakdown.new > 0 && (
                      <View className="bg-gray-400/80 px-2 py-0.5 rounded flex-row items-center gap-1 shadow-sm">
                        <Text className="text-[11px] text-gray-800 font-medium">New: First</Text>
                        <View className="px-1.5 py-0.5 rounded-full bg-gray-400">
                          <Text className="text-[10px] font-semibold text-gray-800">
                            {previewStats.breakdown.new}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Client Cards */}
              <View className="p-4 gap-2">
                {previewClients.map((client) => (
                  <View key={client.client_id} className="p-4 bg-white/5 border border-white/10 rounded-xl">
                    <View className="flex-row items-start justify-between gap-2">
                      <View className="flex-1">
                        <View className="flex-row items-center gap-2 flex-wrap">
                          <Text className="font-semibold text-white text-base" numberOfLines={1}>
                            {capitalize(client.first_name)} {capitalize(client.last_name)}
                          </Text>
                          <View className={`px-2 py-1 rounded-full ${getVisitingTypeStyle(client.visiting_type)}`}>
                            <Text className="text-xs">
                              {capitalize(client.visiting_type)}
                            </Text>
                          </View>
                        </View>
                        <View className="flex-row items-center gap-2 mt-2 flex-wrap">
                          <Text className="text-xs text-[#bdbdbd]" numberOfLines={1}>
                            {client.phone_normalized}
                          </Text>
                          <Text className="text-xs text-[#bdbdbd]">•</Text>
                          <Text className="text-xs text-[#bdbdbd]">
                            {client.days_since_last_visit} days since visit
                          </Text>
                          <Text className="text-xs text-[#bdbdbd]">•</Text>
                          <Text className="text-xs text-orange-400">
                            {client.days_overdue} days overdue
                          </Text>
                        </View>
                      </View>
                      <View className="items-end">
                        <Text className="text-sm font-semibold text-sky-300">Score: {client.score}</Text>
                        {client.avg_weekly_visits ? (
                          <Text className="text-xs text-[#bdbdbd]">
                            Visits every ~{(7 / client.avg_weekly_visits).toFixed(1)} days
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
