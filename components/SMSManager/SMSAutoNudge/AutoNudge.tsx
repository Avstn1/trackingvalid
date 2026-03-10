import { supabase } from '@/utils/supabaseClient';
import { ArrowLeft, Calendar, ChevronRight, Clock, Info, MessageSquare, TrendingUp, Users } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Animated, { SlideInRight, SlideOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface SmartBucketClient {
  client_id: string;
  phone: string;
  appointment_datecreated_bucket: string | null;
  full_name: string;
}

interface BarberNudgeCampaign {
  bucket_id: string;
  iso_week: string;
  week_start: string;
  week_end: string;
  clients_booked: number;
  campaign_start: string;
  total_clients: number;
}

interface SMSRecipient {
  client_id: string | null;
  full_name: string | null;
  phone: string | null;
  appointment_datecreated_bucket: string | null;
  status: 'booked' | 'messaged' | 'pending' | 'failed';
  failure_reason?: string;
  messaged_at: string | null;
  scheduled_send: Date | null;
  service?: string;
  price?: string;
  appointment_date?: string;
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

const getISOWeekDates = (isoWeek: string): { start: string; end: string } => {
  const [yearStr, weekStr] = isoWeek.split('-W');
  const year = parseInt(yearStr);
  const week = parseInt(weekStr);
  const jan4 = new Date(year, 0, 4);
  const jan4Day = jan4.getDay() || 7;
  const firstMonday = new Date(jan4);
  firstMonday.setDate(jan4.getDate() - jan4Day + 1);
  const monday = new Date(firstMonday);
  monday.setDate(firstMonday.getDate() + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return { start: fmt(monday), end: fmt(sunday) };
};

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });

const formatAbsolute = (date: Date) =>
  date.toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

const formatPhoneNumber = (phone: string | null) => {
  if (!phone) return 'No phone';
  const digits = phone.replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6, 10)}`;
  return phone;
};

const capitalizeName = (name: string) =>
  name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const DAY_OFFSET: Record<string, number> = {
  Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
  Friday: 4, Saturday: 5, Sunday: 6,
};
const TIME_HOUR: Record<string, number> = {
  Morning: 8, Midday: 12, Afternoon: 16, Night: 20,
};

const getScheduledSendDate = (bucket: string | null, campaignStart: string): Date => {
  const monday = new Date(campaignStart);
  monday.setHours(0, 0, 0, 0);
  let dayOffset = 0;
  let hour = 10;
  if (bucket && bucket !== 'Low-data') {
    const [dayPart, timePart] = bucket.split('|');
    dayOffset = dayPart !== 'Any-day' ? (DAY_OFFSET[dayPart] ?? 0) : 0;
    hour = timePart !== 'Any-time' ? (TIME_HOUR[timePart] ?? 10) : 10;
  }
  const send = new Date(monday);
  send.setDate(monday.getDate() + dayOffset);
  send.setHours(hour, 0, 0, 0);
  return send;
};

// ----------------------------------------------------------------
// Status badge config
// ----------------------------------------------------------------

type StatusKey = SMSRecipient['status'];

const STATUS_CONFIG: Record<StatusKey, {
  label: string;
  textColor: string;
  bgStyle: object;
  borderColor: string;
  cardBg: string;
  cardBorder: string;
}> = {
  booked: {
    label: '✓ Booked',
    textColor: '#bef264',
    bgStyle: { backgroundColor: 'rgba(190,242,100,0.12)' },
    borderColor: 'rgba(190,242,100,0.25)',
    cardBg: 'rgba(190,242,100,0.04)',
    cardBorder: 'rgba(190,242,100,0.15)',
  },
  messaged: {
    label: 'Messaged',
    textColor: '#7dd3fc',
    bgStyle: { backgroundColor: 'rgba(125,211,252,0.12)' },
    borderColor: 'rgba(125,211,252,0.25)',
    cardBg: 'rgba(125,211,252,0.04)',
    cardBorder: 'rgba(125,211,252,0.15)',
  },
  pending: {
    label: 'Pending',
    textColor: '#fde68a',
    bgStyle: { backgroundColor: 'rgba(253,230,138,0.10)' },
    borderColor: 'rgba(253,230,138,0.20)',
    cardBg: 'rgba(255,255,255,0.02)',
    cardBorder: 'rgba(255,255,255,0.08)',
  },
  failed: {
    label: '✗ Failed',
    textColor: '#f87171',
    bgStyle: { backgroundColor: 'rgba(248,113,113,0.10)' },
    borderColor: 'rgba(248,113,113,0.20)',
    cardBg: 'rgba(248,113,113,0.04)',
    cardBorder: 'rgba(248,113,113,0.15)',
  },
};

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export default function AutoNudge() {
  const [view, setView] = useState<'list' | 'details'>('list');
  const [campaigns, setCampaigns] = useState<BarberNudgeCampaign[]>([]);
  const [selectedCampaign, setSelectedCampaign] = useState<BarberNudgeCampaign | null>(null);
  const [recipients, setRecipients] = useState<SMSRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingRecipients, setLoadingRecipients] = useState(false);

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const fetchCampaigns = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: buckets, error } = await supabase
        .from('sms_smart_buckets')
        .select('bucket_id, iso_week, status, campaign_start, campaign_end, clients, total_clients, messages_failed')
        .eq('user_id', user.id)
        .order('campaign_start', { ascending: false });

      if (error || !buckets?.length) {
        setCampaigns([]);
        return;
      }

      const campaignList: BarberNudgeCampaign[] = [];

      for (const bucket of buckets) {
        const { data: successData } = await supabase
          .from('barber_nudge_success')
          .select('client_ids')
          .eq('user_id', user.id)
          .eq('iso_week_number', bucket.iso_week)
          .single();

        const { start, end } = getISOWeekDates(bucket.iso_week);
        campaignList.push({
          bucket_id: bucket.bucket_id,
          iso_week: bucket.iso_week,
          week_start: start,
          week_end: end,
          clients_booked: successData?.client_ids?.length || 0,
          campaign_start: bucket.campaign_start,
          total_clients: bucket.total_clients,
        });
      }

      setCampaigns(campaignList);
    } catch (err) {
      console.error('Failed to fetch campaigns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecipients = async (campaign: BarberNudgeCampaign) => {
    setLoadingRecipients(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: bucket, error: bucketError } = await supabase
        .from('sms_smart_buckets')
        .select('clients, campaign_start')
        .eq('bucket_id', campaign.bucket_id)
        .single();

      if (bucketError || !bucket?.clients?.length) {
        setRecipients([]);
        setView('details');
        return;
      }

      const { data: smsSentRows } = await supabase
        .from('sms_sent')
        .select('phone_normalized, is_sent, reason, created_at')
        .eq('smart_bucket_id', campaign.bucket_id);

      const smsSentMap = new Map<string, { is_sent: boolean; reason: string | null; created_at: string }>();
      for (const row of smsSentRows || []) {
        if (row.phone_normalized) {
          smsSentMap.set(row.phone_normalized, {
            is_sent: row.is_sent,
            reason: row.reason ?? null,
            created_at: row.created_at,
          });
        }
      }

      const { data: successData } = await supabase
        .from('barber_nudge_success')
        .select('client_ids, services, prices, appointment_dates')
        .eq('user_id', user.id)
        .eq('iso_week_number', campaign.iso_week)
        .single();

      const bookedClientIds: string[] = successData?.client_ids || [];
      const services: string[] = successData?.services || [];
      const prices: string[] = successData?.prices || [];
      const appointmentDates: string[] = successData?.appointment_dates || [];

      const recipientsList: SMSRecipient[] = bucket.clients.map((client: SmartBucketClient) => {
        const bookedIndex = client.client_id ? bookedClientIds.indexOf(client.client_id) : -1;
        const isBooked = bookedIndex !== -1;
        const sentRow = client.phone ? smsSentMap.get(client.phone) : undefined;
        const isMessaged = sentRow?.is_sent === true;
        const isFailed = sentRow?.is_sent === false;

        let status: SMSRecipient['status'] = 'pending';
        if (isBooked) status = 'booked';
        else if (isMessaged) status = 'messaged';
        else if (isFailed) status = 'failed';

        return {
          client_id: client.client_id,
          full_name: client.full_name || null,
          phone: client.phone || null,
          appointment_datecreated_bucket: client.appointment_datecreated_bucket ?? null,
          status,
          failure_reason: isFailed ? (sentRow?.reason || 'Unknown error') : undefined,
          messaged_at: isMessaged ? sentRow!.created_at : null,
          scheduled_send: getScheduledSendDate(client.appointment_datecreated_bucket, bucket.campaign_start),
          service: isBooked ? services[bookedIndex] : undefined,
          price: isBooked ? prices[bookedIndex] : undefined,
          appointment_date: isBooked ? appointmentDates[bookedIndex] : undefined,
        };
      });

      const ORDER = { booked: 0, messaged: 1, pending: 2, failed: 3 };
      const sorted = recipientsList.sort((a, b) => {
        if (a.status !== b.status) return ORDER[a.status] - ORDER[b.status];
        if (a.status === 'booked' && b.status === 'booked') {
          return new Date(a.appointment_date!).getTime() - new Date(b.appointment_date!).getTime();
        }
        return 0;
      });

      setRecipients(sorted);
      setView('details');
    } catch (err) {
      console.error('Failed to fetch recipients:', err);
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

  const totalBooked = campaigns.reduce((sum, c) => sum + c.clients_booked, 0);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------

  return (
    <SafeAreaView edges={['bottom']} className="flex-1 mb-4">
      <View className="flex-1">

        {view === 'list' ? (
          <Animated.View
            key="list"
            entering={SlideInRight.duration(200)}
            exiting={SlideOutLeft.duration(200)}
            className="flex-1"
          >
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Header card */}
              <View className="bg-white/5 border border-white/10 rounded-2xl shadow-xl p-4 mb-4">
                <View className="flex-row items-start justify-between gap-3 mb-1">
                  <View className="flex-1">
                    <View className="flex-row items-center gap-2 mb-1">
                      <MessageSquare color="#7dd3fc" size={20} />
                      <Text className="text-xl font-bold text-white">SMS Auto Nudge</Text>
                    </View>
                    <Text className="text-xs text-white/40">
                      Your weekly automated SMS campaigns, controlled entirely by you via text.
                    </Text>
                  </View>
                  <TouchableOpacity className="flex-row items-center gap-1 px-3 py-1.5 rounded-lg border border-sky-300/20 bg-sky-300/10">
                    <Info color="#7dd3fc" size={13} />
                    <Text className="text-xs font-semibold text-sky-300">Info</Text>
                  </TouchableOpacity>
                </View>

                {/* Summary stats */}
                {!isLoading && campaigns.length > 0 && (
                  <View className="flex-row gap-3 mt-4 pt-4 border-t border-white/10">
                    <View className="flex-1 p-3 bg-white/5 rounded-xl">
                      <Text className="text-[10px] text-white/40 mb-1">Campaigns</Text>
                      <Text className="text-xl font-bold text-white">{campaigns.length}</Text>
                    </View>
                    <View className="flex-1 p-3 rounded-xl border border-lime-300/10" style={{ backgroundColor: 'rgba(190,242,100,0.05)' }}>
                      <Text className="text-[10px] text-white/40 mb-1">Total Booked</Text>
                      <Text className="text-xl font-bold text-lime-300">{totalBooked}</Text>
                    </View>
                    <View className="flex-1 p-3 bg-white/5 rounded-xl">
                      <Text className="text-[10px] text-white/40 mb-1">Avg / Week</Text>
                      <Text className="text-xl font-bold text-white">
                        {campaigns.length ? (totalBooked / campaigns.length).toFixed(1) : '0'}
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Campaign list card */}
              <View className="bg-white/5 border border-white/10 rounded-2xl shadow-xl overflow-hidden mb-4">
                <View className="flex-row items-center gap-2 px-4 py-3 border-b border-white/10">
                  <TrendingUp color="#bef264" size={15} />
                  <Text className="font-bold text-white text-sm">Campaign History</Text>
                </View>

                {isLoading ? (
                  <View className="items-center py-16 gap-3">
                    <ActivityIndicator size="large" color="#7dd3fc" />
                    <Text className="text-sm text-white/40">Loading campaigns...</Text>
                  </View>
                ) : campaigns.length === 0 ? (
                  <View className="items-center py-16 px-6 gap-3">
                    <View className="w-12 h-12 rounded-2xl bg-white/5 items-center justify-center mb-1">
                      <TrendingUp color="rgba(255,255,255,0.15)" size={24} />
                    </View>
                    <Text className="text-white/60 font-medium text-sm">No campaigns yet</Text>
                    <Text className="text-xs text-white/30 text-center max-w-xs">
                      Once your first weekly nudge goes out and clients start booking, campaigns will show up here.
                    </Text>
                  </View>
                ) : (
                  campaigns.map((campaign, i) => (
                    <TouchableOpacity
                      key={campaign.bucket_id}
                      onPress={() => handleCampaignClick(campaign)}
                      className="flex-row items-center gap-3 px-4 py-4 active:bg-white/5"
                      style={i < campaigns.length - 1 ? { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' } : undefined}
                    >
                      {/* Week pill */}
                      <View className="w-10 h-12 rounded-xl bg-white/5 border border-white/10 items-center justify-center">
                        <Text className="text-[8px] text-white/30 font-semibold uppercase tracking-wide">Wk</Text>
                        <Text className="text-base font-bold text-white leading-tight">
                          {campaign.iso_week.split('-W')[1]}
                        </Text>
                      </View>

                      {/* Info */}
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-semibold text-white" numberOfLines={1}>
                          {campaign.week_start} – {campaign.week_end}
                        </Text>
                        <View className="flex-row items-center gap-1 mt-0.5">
                          <Calendar color="rgba(255,255,255,0.25)" size={11} />
                          <Text className="text-xs text-white/35" numberOfLines={1}>
                            Started {formatDate(campaign.campaign_start)}
                          </Text>
                        </View>
                      </View>

                      {/* Booked count */}
                      <View className="items-end gap-0.5 mr-1">
                        <Text className="text-lg font-bold text-lime-300">{campaign.clients_booked}</Text>
                        <Text className="text-[10px] text-white/30">booked</Text>
                      </View>
                      <ChevronRight color="rgba(255,255,255,0.20)" size={16} />
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </ScrollView>
          </Animated.View>

        ) : (
          <Animated.View
            key="details"
            entering={SlideInRight.duration(200)}
            exiting={SlideOutLeft.duration(200)}
            className="flex-1"
          >
            {/* Detail header */}
            <View className="bg-white/5 border border-white/10 rounded-2xl shadow-xl p-4 mb-4">
              <View className="flex-row items-center gap-3">
                <TouchableOpacity
                  onPress={handleBack}
                  className="p-2 rounded-full active:bg-white/10"
                >
                  <ArrowLeft color="rgba(255,255,255,0.50)" size={18} />
                </TouchableOpacity>
                <View className="flex-1 min-w-0">
                  <Text className="text-base font-bold text-white" numberOfLines={1}>
                    {selectedCampaign?.week_start} – {selectedCampaign?.week_end}
                  </Text>
                  <View className="flex-row items-center gap-2 flex-wrap mt-0.5">
                    <Text className="text-xs text-white/40">
                      Started {selectedCampaign && formatDate(selectedCampaign.campaign_start)}
                    </Text>
                    {selectedCampaign && (
                      <>
                        <Text className="text-xs text-white/20">·</Text>
                        <Text className="text-xs text-lime-300 font-semibold">
                          {selectedCampaign.clients_booked} booked
                        </Text>
                      </>
                    )}
                  </View>
                </View>
                {selectedCampaign && (
                  <View className="flex-row items-center gap-1 px-3 py-1.5 rounded-full border border-lime-300/20" style={{ backgroundColor: 'rgba(190,242,100,0.08)' }}>
                    <Users color="#bef264" size={12} />
                    <Text className="text-xs font-bold text-lime-300">{recipients.length}</Text>
                  </View>
                )}
              </View>
            </View>

            {loadingRecipients ? (
              <View className="flex-1 items-center justify-center gap-3">
                <ActivityIndicator size="large" color="#7dd3fc" />
                <Text className="text-sm text-white/40">Loading recipients...</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
                {/* Optimal timing notice */}
                {recipients.length > 0 && (
                  <View
                    className="flex-row items-start gap-2 px-4 py-3 rounded-xl mb-4 border border-sky-300/15"
                    style={{ backgroundColor: 'rgba(125,211,252,0.05)' }}
                  >
                    <Clock color="#7dd3fc" size={14} style={{ marginTop: 1 }} />
                    <Text className="text-xs text-white/50 flex-1 leading-5">
                      Each client is messaged at their{' '}
                      <Text className="text-sky-300 font-semibold">personal optimal time</Text>
                      {' '}— based on when they historically tend to book. Clients with no clear pattern are reached on{' '}
                      <Text className="text-white/70 font-medium">Mondays at 10am</Text>.
                    </Text>
                  </View>
                )}

                {recipients.length === 0 ? (
                  <View className="items-center py-16 gap-2">
                    <Users color="rgba(255,255,255,0.15)" size={36} />
                    <Text className="text-white/50 font-medium text-sm">No recipients found</Text>
                  </View>
                ) : (
                  <View className="gap-3 pb-4">
                    {recipients.map((recipient, index) => {
                      const cfg = STATUS_CONFIG[recipient.status];
                      const isBooked = recipient.status === 'booked';
                      const isMessaged = recipient.status === 'messaged';
                      const isFailed = recipient.status === 'failed';

                      return (
                        <View
                          key={`${recipient.client_id || recipient.phone}-${index}`}
                          className="rounded-xl p-4"
                          style={{
                            backgroundColor: cfg.cardBg,
                            borderWidth: 1,
                            borderColor: cfg.cardBorder,
                          }}
                        >
                          {/* Name + badge */}
                          <View className="flex-row items-center justify-between gap-2 mb-2">
                            <Text className="font-bold text-white text-sm flex-1" numberOfLines={1}>
                              {recipient.full_name
                                ? capitalizeName(recipient.full_name)
                                : <Text style={{ color: 'rgba(255,255,255,0.30)', fontWeight: '400' }}>Unknown Client</Text>
                              }
                            </Text>
                            <View
                              className="px-2 py-0.5 rounded-full border flex-shrink-0"
                              style={[cfg.bgStyle, { borderColor: cfg.borderColor }]}
                            >
                              <Text className="text-[10px] font-bold" style={{ color: cfg.textColor }}>
                                {cfg.label}
                              </Text>
                            </View>
                          </View>

                          {/* Phone + timing */}
                          <View className="flex-row items-center justify-between gap-2">
                            <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                              {formatPhoneNumber(recipient.phone)}
                            </Text>
                            {isFailed && recipient.failure_reason ? (
                              <Text className="text-[11px] text-red-400/70 flex-1 text-right" numberOfLines={1}>
                                {recipient.failure_reason}
                              </Text>
                            ) : (
                              !isBooked && (
                                <View className="flex-row items-center gap-1 flex-1 justify-end">
                                  <Clock color="rgba(255,255,255,0.25)" size={11} />
                                  <Text className="text-[11px] text-white/30 flex-shrink" numberOfLines={1}>
                                    {isMessaged && recipient.messaged_at
                                      ? `Sent ${formatAbsolute(new Date(recipient.messaged_at))}`
                                      : recipient.scheduled_send
                                      ? `Sends ${formatAbsolute(recipient.scheduled_send)}`
                                      : null
                                    }
                                  </Text>
                                </View>
                              )
                            )}
                          </View>

                          {/* Booking details */}
                          {isBooked && recipient.service && (
                            <View
                              className="flex-row items-center justify-between gap-2 mt-3 pt-3"
                              style={{ borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}
                            >
                              <View className="flex-1 min-w-0">
                                <Text className="text-xs font-semibold text-lime-300" numberOfLines={1}>
                                  {recipient.service}
                                </Text>
                                {recipient.appointment_date && (
                                  <Text className="text-[11px] text-white/30 mt-0.5">
                                    {new Date(recipient.appointment_date).toLocaleDateString('en-US', {
                                      month: 'short', day: 'numeric', year: 'numeric',
                                      hour: 'numeric', minute: '2-digit',
                                    })}
                                  </Text>
                                )}
                              </View>
                              {recipient.price && (
                                <Text className="text-sm font-bold text-lime-300 flex-shrink-0">
                                  ${recipient.price}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}
              </ScrollView>
            )}
          </Animated.View>
        )}

      </View>
    </SafeAreaView>
  );
}