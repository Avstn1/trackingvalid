import SegmentedControl from '@/components/ui/SegmentedControl';
import { supabase } from '@/utils/supabaseClient';
import { ArrowLeft, Calendar, TrendingUp, Users, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';

interface AutoNudgeHistoryContentProps {
  onClose: () => void;
  session: any;
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabOptions: { id: string; label: string }[];
}

interface BarberNudgeCampaign {
  message_id: string;
  iso_week_number: string;
  week_start: string;
  week_end: string;
  clients_booked: number;
  date_sent: string;
}

interface SMSRecipient {
  client_id: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  phone_normalized: string | null;
  status: 'booked' | 'pending';
  service?: string;
  price?: string;
  appointment_date?: string;
}

export default function AutoNudgeHistoryContent({ onClose, session, activeTab, onTabChange, tabOptions }: AutoNudgeHistoryContentProps) {
  const [view, setView] = useState<'list' | 'details'>('list');
  const [campaigns, setCampaigns] = useState<BarberNudgeCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<BarberNudgeCampaign | null>(null);
  const [recipients, setRecipients] = useState<SMSRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Fetch campaigns on mount
  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Reset view when component unmounts
  useEffect(() => {
    return () => {
      setView('list');
      setSelectedCampaign(null);
      setRecipients([]);
    };
  }, []);

  const getISOWeekDates = (isoWeek: string): { start: string; end: string } => {
    // Parse "2026-W05" format
    const [yearStr, weekStr] = isoWeek.split('-W');
    const year = parseInt(yearStr);
    const week = parseInt(weekStr);

    // Calculate the date of the Monday of the ISO week
    const jan4 = new Date(year, 0, 4); // January 4th is always in week 1
    const jan4Day = jan4.getDay() || 7; // Convert Sunday (0) to 7
    const firstMonday = new Date(jan4);
    firstMonday.setDate(jan4.getDate() - jan4Day + 1);

    // Calculate the Monday of the target week
    const monday = new Date(firstMonday);
    monday.setDate(firstMonday.getDate() + (week - 1) * 7);

    // Calculate Sunday
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    };

    return {
      start: formatDate(monday),
      end: formatDate(sunday)
    };
  };

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Check if we need to update auto nudge history
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('last_updated_auto_nudge_history')
        .eq('user_id', user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Store the last updated timestamp
      setLastUpdated(profile?.last_updated_auto_nudge_history || null);

      let shouldCallLookAhead = false;
      
      if (!profile?.last_updated_auto_nudge_history) {
        // Never updated before
        shouldCallLookAhead = true;
      } else {
        // Check if it's been 15 minutes since last update
        const lastUpdated = new Date(profile.last_updated_auto_nudge_history);
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        
        if (lastUpdated <= fifteenMinutesAgo) {
          shouldCallLookAhead = true;
        }
      }

      // Call appointments_look_ahead if needed
      if (shouldCallLookAhead) {
        try {
          const lookAheadResponse = await fetch(
            `https://efyvkyusfrqcgadocggk.supabase.co/functions/v1/appointments_look_ahead?user_id=${user.id}`,
            {
              headers: {
                'Authorization': `Bearer ${session?.access_token}`
              }
            }
          );
          
          if (!lookAheadResponse.ok) {
            console.error('Error calling appointments_look_ahead:', await lookAheadResponse.text());
          } else {
            const lookAheadData = await lookAheadResponse.json();
            console.log('Appointments look ahead completed:', lookAheadData);
            
            // Update last_updated_auto_nudge_history
            const newTimestamp = new Date().toISOString();
            const { error: updateError } = await supabase
              .from('profiles')
              .update({ last_updated_auto_nudge_history: newTimestamp })
              .eq('user_id', user.id);
            
            if (updateError) {
              console.error('Error updating last_updated_auto_nudge_history:', updateError);
            } else {
              // Update the state with the new timestamp
              setLastUpdated(newTimestamp);
            }
          }
        } catch (lookAheadError) {
          console.error('Failed to call appointments_look_ahead:', lookAheadError);
          // Continue with fetch even if look ahead fails
        }
      } else {
        console.log('Skipping appointments_look_ahead - updated recently');
      }

      // Get all sms_scheduled_messages that match the pattern {user_id}_{iso_week}
      const { data: scheduledMessages, error: schedError } = await supabase
        .from('sms_scheduled_messages')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .eq('purpose', 'auto-nudge')
        .like('title', `${user.id}_%`)
        .order('created_at', { ascending: false });

      if (schedError) {
        console.error('Error fetching scheduled messages:', schedError);
        return;
      }

      console.log(JSON.stringify(scheduledMessages));

      if (!scheduledMessages || scheduledMessages.length === 0) {
        setCampaigns([]);
        return;
      }

      const campaignList: BarberNudgeCampaign[] = [];
      const seenWeeks = new Set<string>(); // Track unique weeks to avoid duplicates

      for (const message of scheduledMessages) {
        // Parse title to get user_id and iso_week
        const parts = message.title.split('_');
        if (parts.length !== 2) continue;

        const isoWeek = parts[1];

        // Skip if we've already processed this week (handles duplicates)
        if (seenWeeks.has(isoWeek)) continue;
        seenWeeks.add(isoWeek);

        // Get barber_nudge_success data
        const { data: successData, error: successError } = await supabase
          .from('barber_nudge_success')
          .select('client_ids')
          .eq('user_id', user.id)
          .eq('iso_week_number', isoWeek)
          .single();

        // Count booked clients (0 if no success data)
        const clientsBooked = successData?.client_ids?.length || 0;

        // Get latest sms_sent created_at for this message
        const { data: sentData, error: sentError } = await supabase
          .from('sms_sent')
          .select('created_at')
          .eq('message_id', message.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const dateSent = sentData?.created_at || message.created_at;

        const { start, end } = getISOWeekDates(isoWeek);

        campaignList.push({
          message_id: message.id,
          iso_week_number: isoWeek,
          week_start: start,
          week_end: end,
          clients_booked: clientsBooked,
          date_sent: dateSent
        });
      }

      setCampaigns(campaignList);
    } catch (error) {
      console.error('Failed to fetch campaigns:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipients = async (campaign: BarberNudgeCampaign) => {
    setLoadingRecipients(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('No user found');
        return;
      }

      // Get all SMS sent for this message
      const { data: smsSent, error: smsError } = await supabase
        .from('sms_sent')
        .select('client_id, phone_normalized')
        .eq('message_id', campaign.message_id)
        .eq('is_sent', true)
        .order('created_at', { ascending: true });

      if (smsError) {
        console.error('Error fetching SMS sent:', smsError);
        setRecipients([]);
        return;
      }

      if (!smsSent || smsSent.length === 0) {
        setRecipients([]);
        return;
      }

      // Get barber_nudge_success data
      const { data: successData, error: successError } = await supabase
        .from('barber_nudge_success')
        .select('client_ids, services, prices, appointment_dates')
        .eq('user_id', user.id)
        .eq('iso_week_number', campaign.iso_week_number)
        .single();

      const bookedClientIds = successData?.client_ids || [];
      const services = successData?.services || [];
      const prices = successData?.prices || [];
      const appointmentDates = successData?.appointment_dates || [];

      // Get all unique client IDs and phone numbers from SMS sent
      const allClientIds = smsSent
        .map(sms => sms.client_id)
        .filter((id): id is string => id !== null);
      
      const allPhoneNumbers = smsSent
        .map(sms => sms.phone_normalized)
        .filter((phone): phone is string => phone !== null);

      // Fetch client details
      const { data: clientsData, error: clientsError } = await supabase
        .from('acuity_clients')
        .select('client_id, first_name, last_name, phone, phone_normalized')
        .eq('user_id', user.id)
        .or(`client_id.in.(${allClientIds.join(',')}),phone_normalized.in.(${allPhoneNumbers.map(p => `"${p}"`).join(',')})`);

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
      }

      const clientsMap = new Map(
        (clientsData || []).map(client => [
          client.client_id || client.phone_normalized,
          client
        ])
      );

      // Build recipients list
      const recipientsList: SMSRecipient[] = smsSent.map(sms => {
        const clientKey = sms.client_id || sms.phone_normalized;
        const client = clientKey ? clientsMap.get(clientKey) : null;
        
        const bookedIndex = sms.client_id ? bookedClientIds.indexOf(sms.client_id) : -1;
        const isBooked = bookedIndex !== -1;

        return {
          client_id: sms.client_id,
          first_name: client?.first_name || null,
          last_name: client?.last_name || null,
          phone: client?.phone || null,
          phone_normalized: sms.phone_normalized,
          status: isBooked ? 'booked' : 'pending',
          service: isBooked ? services[bookedIndex] : undefined,
          price: isBooked ? prices[bookedIndex] : undefined, 
          appointment_date: isBooked ? appointmentDates[bookedIndex] : undefined,
        };
      });

      // Sort: booked first (by appointment date), then pending (by send order)
      const sortedRecipients = recipientsList.sort((a, b) => {
        if (a.status === 'booked' && b.status === 'booked') {
          const dateA = new Date(a.appointment_date!).getTime();
          const dateB = new Date(b.appointment_date!).getTime();
          return dateA - dateB;
        }
        if (a.status === 'booked') return -1;
        if (b.status === 'booked') return 1;
        return 0; // Maintain send order for pending
      });

      setRecipients(sortedRecipients);
      setView('details');
    } catch (error) {
      console.error('Failed to fetch recipients:', error);
      setRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  };

  const handleCampaignClick = (campaign: BarberNudgeCampaign) => {
    setSelectedCampaign(campaign);
    fetchRecipients(campaign);
  };

  const handleBack = () => {
    setView('list');
    setSelectedCampaign(null);
    setRecipients([]);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const formatPhoneNumber = (phone: string | null) => {
    if (!phone) return 'No phone';
    const digits = phone.replace(/\D/g, '');
    const phoneDigits = digits.length === 11 && digits.startsWith('1')
      ? digits.slice(1)
      : digits;

    if (phoneDigits.length === 10) {
      return `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6, 10)}`;
    }
    return phone;
  };

  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const capitalizeName = (name: string) => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  return (
    <View className="flex-1">
      {view === 'list' ? (
        <Animated.View
          key="list"
          entering={SlideInRight.duration(200)}
          exiting={SlideOutLeft.duration(200)}
          className="flex-1 flex"
        >
          {/* Modal Header - Fixed */}
          <View className="flex-row items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-lime-500/10 to-emerald-500/10">
            <View className="flex-1 pr-2">
              <View className="flex-row items-center gap-2">
                <TrendingUp color="#bef264" size={24} />
                <Text className="text-xl font-bold text-white" numberOfLines={1}>
                  Barber Nudge History
                </Text>
              </View>
              <Text className="text-xs text-[#bdbdbd] mt-1">
                Track your weekly barber nudge campaign success
              </Text>
              {lastUpdated && (
                <Text className="text-[10px] text-[#9e9e9e] mt-2">
                  Last updated: {new Date(lastUpdated).toLocaleString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    hour: 'numeric', 
                    minute: '2-digit',
                    hour12: true 
                  })}. {(() => {
                    const nextUpdate = new Date(new Date(lastUpdated).getTime() + 15 * 60 * 1000);
                    const now = new Date();
                    const minutesUntilNext = Math.max(0, Math.ceil((nextUpdate.getTime() - now.getTime()) / (60 * 1000)));
                    
                    if (minutesUntilNext > 0) {
                      return `Check back in ${minutesUntilNext} minute${minutesUntilNext !== 1 ? 's' : ''} for the latest bookings.`;
                    } else {
                      return 'Reopen to see the latest bookings.';
                    }
                  })()}
                </Text>
              )}
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="p-2 rounded-full"
            >
              <X color="#bdbdbd" size={20} />
            </TouchableOpacity>
          </View>

          {/* Tab Switcher */}
          <View className="px-4 pt-3 pb-2">
            <SegmentedControl
              options={tabOptions}
              selected={activeTab}
              onChange={onTabChange}
            />
          </View>

          {/* Campaigns List - Scrollable */}
          <ScrollView className="flex-1 p-4">
            {isLoading ? (
              <View className="items-center py-12">
                <ActivityIndicator size="large" color="#bef264" className="mb-4" />
                <Text className="text-sm text-[#bdbdbd]">Updating your campaign history...</Text>
              </View>
            ) : campaigns.length === 0 ? (
              <View className="items-center py-12">
                <TrendingUp color="#bdbdbd" size={48} style={{ opacity: 0.5 }} />
                <Text className="text-sm text-[#bdbdbd] mt-4">No barber nudge campaigns yet</Text>
                <Text className="text-xs text-[#bdbdbd] mt-2">
                  Successful campaigns will appear here
                </Text>
              </View>
            ) : (
              <View className="gap-3">
                {campaigns.map((campaign) => (
                  <TouchableOpacity
                    key={campaign.message_id}
                    onPress={() => handleCampaignClick(campaign)}
                    className="p-4 bg-white/5 border border-white/10 rounded-xl active:bg-white/10"
                  >
                    <View className="flex-row items-start justify-between mb-2 gap-2">
                      <Text className="font-semibold text-white text-base flex-1" numberOfLines={1}>
                        {campaign.week_start} - {campaign.week_end}
                      </Text>
                      <View className="px-2 py-1 rounded-full bg-lime-300/10 border border-lime-300/20">
                        <Text className="text-xs font-semibold text-lime-300">
                          {campaign.clients_booked} booked
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2 flex-wrap">
                      <View className="flex-row items-center gap-1">
                        <Calendar color="#bdbdbd" size={12} />
                        <Text className="text-xs text-[#bdbdbd]">
                          Sent {formatDate(campaign.date_sent)}
                        </Text>
                      </View>
                      <Text className="text-xs text-[#bdbdbd]">•</Text>
                      <Text className="text-xs text-lime-300">
                        Week {campaign.iso_week_number.split('-W')[1]}
                      </Text>
                    </View>
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
                  {selectedCampaign?.week_start} - {selectedCampaign?.week_end}
                </Text>
                <Text className="text-xs text-[#bdbdbd] mt-0.5" numberOfLines={1}>
                  Sent {selectedCampaign && formatDate(selectedCampaign.date_sent)}
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
          {selectedCampaign && (
            <View className="px-4 py-2.5 border-b border-white/10 bg-white/5">
              <View className="flex-row gap-4">
                <View>
                  <Text className="text-xs text-[#bdbdbd] mb-0.5">Clients Booked</Text>
                  <Text className="text-base font-bold text-lime-300">{selectedCampaign.clients_booked}</Text>
                </View>
                <View>
                  <Text className="text-xs text-[#bdbdbd] mb-0.5">Week</Text>
                  <Text className="text-base font-bold text-white">
                    {selectedCampaign.iso_week_number.split('-W')[1]}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Recipients List - Scrollable */}
          <View className="flex-1">
            <ScrollView 
              className="flex-1"
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
              showsVerticalScrollIndicator={true}
            >
              {loadingRecipients ? (
                <View className="items-center py-12">
                  <ActivityIndicator size="large" color="#bef264" className="mb-4" />
                  <Text className="text-sm text-[#bdbdbd]">Loading recipients...</Text>
                </View>
              ) : recipients.length === 0 ? (
                <View className="items-center py-8">
                  <Users color="#bdbdbd" size={40} style={{ opacity: 0.5 }} />
                  <Text className="text-sm text-[#bdbdbd] mt-2">No recipients found</Text>
                </View>
              ) : (
                <View className="gap-3">
                  {recipients.map((recipient, index) => (
                    <View
                      key={`${recipient.client_id || recipient.phone_normalized}-${index}`}
                      className={`p-4 rounded-xl border ${
                        recipient.status === 'booked'
                          ? 'bg-lime-300/10 border-lime-300/30'
                          : 'bg-amber-300/10 border-amber-300/30'
                      }`}
                    >
                      {/* Main Row - Name, Status Badge, and Price */}
                      <View className="flex-row items-center justify-between gap-2 mb-2">
                        <View className="flex-1 flex-row items-center gap-2 flex-wrap">
                          {recipient.first_name && recipient.last_name ? (
                            <Text className="font-bold text-white text-sm" numberOfLines={1}>
                              {capitalizeName(`${recipient.first_name} ${recipient.last_name}`)}
                            </Text>
                          ) : (
                            <Text className="font-bold text-[#bdbdbd] text-sm">Unknown Client</Text>
                          )}
                          <View className={`px-2 py-0.5 rounded-full ${
                            recipient.status === 'booked'
                              ? 'bg-lime-300/20 border border-lime-300/30'
                              : 'bg-amber-300/20 border border-amber-300/30'
                          }`}>
                            <Text className={`text-[10px] font-bold ${
                              recipient.status === 'booked' ? 'text-lime-300' : 'text-amber-300'
                            }`}>
                              {recipient.status === 'booked' ? '✓ Booked' : '○ Pending'}
                            </Text>
                          </View>
                        </View>
                        {recipient.price && recipient.status === 'booked' && (
                          <Text className="text-sm font-bold text-lime-300">
                            ${recipient.price}
                          </Text>
                        )}
                      </View>

                      {/* Phone Number */}
                      <Text className="text-xs text-[#bdbdbd] mb-2">
                        {formatPhoneNumber(recipient.phone_normalized || recipient.phone)}
                      </Text>
                      
                      {/* Service and Appointment - Single Line */}
                      {recipient.status === 'booked' && recipient.service && recipient.appointment_date && (
                        <View className="pt-2 border-t border-white/10">
                          <View className="flex-row items-center gap-3">
                            <View className="flex-shrink-0">
                              <Text className="text-sm font-semibold text-lime-300" numberOfLines={1}>
                                {recipient.service}
                              </Text>
                            </View>
                            <Text className="text-xs text-[#bdbdbd]">•</Text>
                            <View className="flex-1">
                              <Text className="text-xs text-white" numberOfLines={1}>
                                {formatAppointmentDate(recipient.appointment_date)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>
          </View>

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
  );
}