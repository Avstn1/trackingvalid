import { supabase } from '@/utils/supabaseClient';
import { AlertCircle, ArrowLeft, Calendar, CheckCircle, Clock, Users, X, XCircle } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInRight, SlideOutLeft } from 'react-native-reanimated';

interface CampaignHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any;
}

interface Campaign {
  id: string;
  title: string;
  message: string;
  cron: string;
  success: number;
  fail: number;
  purpose: string;
  final_clients_to_message: number;
  created_at: string;
}

interface Recipient {
  phone_normalized: string;
  is_sent: boolean;
  reason: string | null;
  created_at: string;
  client_id: string | null;
  first_name: string | null;
  last_name: string | null;
}

interface RecipientStats {
  total: number;
  successful: number;
  failed: number;
}

export default function CampaignHistoryModal({ isOpen, onClose, session }: CampaignHistoryModalProps) {
  const [view, setView] = useState<'list' | 'details'>('list');
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientsStats, setRecipientsStats] = useState<RecipientStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  // Fetch campaigns on modal open
  useEffect(() => {
    if (isOpen) {
      fetchCampaigns();
    }
  }, [isOpen]);

  // Reset view when modal closes
  useEffect(() => {
    if (!isOpen) {
      setView('list');
      setSelectedCampaign(null);
      setRecipients([]);
      setRecipientsStats(null);
    }
  }, [isOpen]);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      const { data, error } = await supabase
        .from('sms_scheduled_messages')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_finished', true)
        .in('purpose', ['campaign', 'mass'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('Fetched campaigns:', data);
      setCampaigns(data || []);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipients = async (messageId: string) => {
    setLoadingRecipients(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL}/api/client-messaging/get-campaign-recipients?messageId=${messageId}&userId=${user.id}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'x-client-access-token': session?.access_token,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error response:', errorData);
        throw new Error(errorData.error || 'Failed to fetch recipients');
      }

      const data = await response.json();

      if (data.success) {
        setRecipients(data.recipients || []);
        setRecipientsStats(data.stats || null);
        setView('details');
      }
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleCampaignClick = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    fetchRecipients(campaign.id);
  };

  const handleBack = () => {
    setView('list');
    setSelectedCampaign(null);
    setRecipients([]);
    setRecipientsStats(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Modal
      visible={isOpen}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/60 justify-center items-center p-2" onPress={onClose}>
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          className="w-[95%] h-[75%]"
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <View className="bg-[#1a1a1a] border border-white/10 rounded-2xl shadow-2xl h-full flex">
              {view === 'list' ? (
                <Animated.View
                  key="list"
                  entering={SlideInRight.duration(200)}
                  exiting={SlideOutLeft.duration(200)}
                  className="flex-1 flex"
                >
                  {/* Modal Header - Fixed */}
                  <View className="flex-row items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                    <View className="flex-1 pr-2">
                      <View className="flex-row items-center gap-2">
                        <Clock color="#d8b4fe" size={24} />
                        <Text className="text-xl font-bold text-white" numberOfLines={1}>
                          Campaign History
                        </Text>
                      </View>
                      <Text className="text-xs text-[#bdbdbd] mt-1">
                        View your past SMS campaigns and their performance
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={onClose}
                      className="p-2 hover:bg-white/10 rounded-full"
                    >
                      <X color="#bdbdbd" size={20} />
                    </TouchableOpacity>
                  </View>

                  {/* Campaigns List - Scrollable */}
                  <ScrollView className="flex-1 p-4">
                    {isLoading ? (
                      <View className="items-center py-12">
                        <ActivityIndicator size="large" color="#d8b4fe" className="mb-4" />
                        <Text className="text-sm text-[#bdbdbd]">Loading campaigns...</Text>
                      </View>
                    ) : campaigns.length === 0 ? (
                      <View className="items-center py-12">
                        <Clock color="#bdbdbd" size={48} style={{ opacity: 0.5 }} />
                        <Text className="text-sm text-[#bdbdbd] mt-4">No completed campaigns yet</Text>
                        <Text className="text-xs text-[#bdbdbd] mt-2">
                          Completed campaigns will appear here
                        </Text>
                      </View>
                    ) : (
                      <View className="gap-3">
                        {campaigns.map((campaign) => (
                          <TouchableOpacity
                            key={campaign.id}
                            onPress={() => handleCampaignClick(campaign)}
                            className="p-4 bg-white/5 border border-white/10 rounded-xl active:bg-white/10"
                          >
                            <View className="flex-row items-start justify-between mb-2 gap-2">
                              <Text className="font-semibold text-white text-base flex-1" numberOfLines={1}>
                                {campaign.title}
                              </Text>
                              <View className="px-2 py-1 rounded-full bg-lime-300/10 border border-lime-300/20">
                                <Text className="text-xs font-semibold text-lime-300">
                                  Completed
                                </Text>
                              </View>
                            </View>
                            <View className="flex-row items-center gap-2 flex-wrap">
                              <View className="flex-row items-center gap-1">
                                <Calendar color="#bdbdbd" size={12} />
                                <Text className="text-xs text-[#bdbdbd]">
                                  {formatDate(campaign.cron)}
                                </Text>
                              </View>
                              <Text className="text-xs text-[#bdbdbd]">•</Text>
                              <Text className="text-xs text-[#bdbdbd]">
                                {campaign.final_clients_to_message || 0} recipients
                              </Text>
                              <Text className="text-xs text-[#bdbdbd]">•</Text>
                              <Text className="text-xs text-lime-300">
                                {campaign.success} sent
                              </Text>
                              <Text className="text-xs text-[#bdbdbd]">•</Text>
                              <Text className="text-xs text-rose-300">
                                {campaign.fail || 0} failed
                              </Text>
                              {(campaign.success + (campaign.fail || 0)) > 0 && (
                                <>
                                  <Text className="text-xs text-[#bdbdbd]">•</Text>
                                  <Text className="text-xs text-sky-300">
                                    {((campaign.success / (campaign.success + (campaign.fail || 0))) * 100).toFixed(1)}% rate
                                  </Text>
                                </>
                              )}
                            </View>
                            <Text className="mt-2 text-xs text-[#bdbdbd]" numberOfLines={2}>
                              {campaign.message}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </ScrollView>

                  {/* Footer */}
                  <View className="border-t border-white/10 p-4 bg-white/5">
                    <TouchableOpacity
                      onPress={onClose}
                      className="px-6 py-3 rounded-xl font-bold bg-white/10 items-center"
                    >
                      <Text className="text-sm font-bold text-white">Close</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              ) : (
                <Animated.View
                  key="details"
                  entering={SlideInRight.duration(200)}
                  exiting={SlideOutLeft.duration(200)}
                  className="flex-1 flex"
                >
                  {/* Modal Header - Fixed */}
                  <View className="flex-row items-center justify-between p-4 border-b border-white/10">
                    <View className="flex-row items-center gap-3 flex-1">
                      <TouchableOpacity
                        onPress={handleBack}
                        className="p-2 rounded-full active:bg-white/10"
                      >
                        <ArrowLeft color="#bdbdbd" size={16} />
                      </TouchableOpacity>
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-white" numberOfLines={1}>
                          {selectedCampaign?.title}
                        </Text>
                        <Text className="text-xs text-[#bdbdbd] mt-0.5" numberOfLines={1}>
                          {selectedCampaign && formatDate(selectedCampaign.cron)}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={onClose}
                      className="p-1.5 rounded-full"
                    >
                      <X color="#bdbdbd" size={16} />
                    </TouchableOpacity>
                  </View>

                  {/* Stats Bar - Fixed */}
                  {recipientsStats && (
                    <View className="px-4 py-2.5 border-b border-white/10 bg-white/5">
                      <View className="flex-row gap-4 mb-2">
                        <View>
                          <Text className="text-xs text-[#bdbdbd] mb-0.5">Total</Text>
                          <Text className="text-base font-bold text-white">{recipientsStats.total}</Text>
                        </View>
                        <View>
                          <Text className="text-xs text-[#bdbdbd] mb-0.5">Successful</Text>
                          <Text className="text-base font-bold text-lime-300">{recipientsStats.successful}</Text>
                        </View>
                        <View>
                          <Text className="text-xs text-[#bdbdbd] mb-0.5">Failed</Text>
                          <Text className="text-base font-bold text-rose-300">{recipientsStats.failed || 0}</Text>
                        </View>
                        {(recipientsStats.successful + (recipientsStats.failed || 0)) > 0 && (
                          <View>
                            <Text className="text-xs text-[#bdbdbd] mb-0.5">Success Rate</Text>
                            <Text className="text-base font-bold text-sky-300">
                              {((recipientsStats.successful / (recipientsStats.successful + (recipientsStats.failed || 0))) * 100).toFixed(1)}%
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-xs text-white/60 border-t border-white/10 pt-2" numberOfLines={2}>
                        {selectedCampaign?.message}
                      </Text>
                    </View>
                  )}

                  {/* Recipients List - Scrollable */}
                  <ScrollView 
                    className="flex-1 p-4"
                    showsVerticalScrollIndicator={true}
                    nestedScrollEnabled={true}
                  >
                    {loadingRecipients ? (
                      <View className="items-center py-12">
                        <ActivityIndicator size="large" color="#7dd3fc" className="mb-4" />
                        <Text className="text-sm text-[#bdbdbd]">Loading recipients...</Text>
                      </View>
                    ) : recipients.length === 0 ? (
                      <View className="items-center py-8">
                        <Users color="#bdbdbd" size={40} style={{ opacity: 0.5 }} />
                        <Text className="text-sm text-[#bdbdbd] mt-2">No recipients found</Text>
                      </View>
                    ) : (
                      <View className="gap-1.5">
                        {recipients.map((recipient, index) => (
                          <View
                            key={index}
                            className={`p-2.5 rounded-lg border ${
                              recipient.is_sent
                                ? 'bg-lime-300/5 border-lime-300/20'
                                : 'bg-rose-300/5 border-rose-300/20'
                            }`}
                          >
                            <View className="flex-row items-start justify-between gap-2">
                              <View className="flex-1">
                                <View className="flex-row items-center gap-2 flex-wrap">
                                  {recipient.first_name && recipient.last_name ? (
                                    <Text className="font-semibold text-white text-sm" numberOfLines={1}>
                                      {recipient.first_name} {recipient.last_name}
                                    </Text>
                                  ) : (
                                    <Text className="font-semibold text-[#bdbdbd] text-sm">Unknown Client</Text>
                                  )}
                                  <View className={`px-1.5 py-0.5 rounded ${
                                    recipient.is_sent
                                      ? 'bg-lime-300/20'
                                      : 'bg-rose-300/20'
                                  }`}>
                                    <Text className={`text-[10px] font-semibold ${
                                      recipient.is_sent ? 'text-lime-300' : 'text-rose-300'
                                    }`}>
                                      {recipient.is_sent ? 'Sent' : 'Failed'}
                                    </Text>
                                  </View>
                                  {!recipient.is_sent && recipient.reason && (
                                    <View className="flex-row items-center gap-1">
                                      <AlertCircle color="#fda4af" size={12} />
                                      <Text className="text-[10px] text-rose-300" numberOfLines={1}>
                                        {recipient.reason}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                                <Text className="text-[11px] text-[#bdbdbd] mt-0.5">
                                  {recipient.phone_normalized}
                                </Text>
                              </View>
                              <View>
                                {recipient.is_sent ? (
                                  <CheckCircle color="#bef264" size={16} />
                                ) : (
                                  <XCircle color="#fda4af" size={16} />
                                )}
                              </View>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </ScrollView>

                  {/* Footer */}
                  <View className="border-t border-white/10 px-4 py-3 bg-white/5">
                    <TouchableOpacity
                      onPress={handleBack}
                      className="px-4 py-2 rounded-lg bg-white/10 items-center"
                    >
                      <Text className="text-sm font-semibold text-white">Back to History</Text>
                    </TouchableOpacity>
                  </View>
                </Animated.View>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}