import { supabase } from '@/utils/supabaseClient';
import { ChevronDown, ChevronUp, Filter, Mail, Phone, User, X } from 'lucide-react-native';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ActiveFilter } from './ClientSheetsFilterModal';
import ClientSheetsFilterModal from './ClientSheetsFilterModal';

const COLORS = {
  background: '#181818',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  card: '#1f1f1f',
  text: {
    primary: '#ffffff',
    secondary: '#bdbdbd',
    muted: '#8a8a8a',
  },
  lime: '#bef264',
  red: '#f87171',
};

type ClientRow = {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  phone_normalized: string | null;
  notes: string | null;
  first_appt: string | null;
  last_appt: string | null;
  total_appointments: number | null;
  total_tips_all_time: number | null;
  visiting_type: string | null;
  date_last_sms_sent: string | null;
  sms_subscribed: boolean;
};

type SortField =
  | 'last_appt'
  | 'first_appt'
  | 'first_name'
  | 'last_name'
  | 'total_appointments'
  | 'date_last_sms_sent';

const FILTERS_STORAGE_KEY = 'clientSheetsFilters';

export default function ClientSheets() {
  const insets = useSafeAreaInsets();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sortField, setSortField] = useState<SortField>('last_appt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [minYear, setMinYear] = useState<number>(new Date().getFullYear() - 10);
  const [user, setUser] = useState<any>(null);

  const requestSeq = useRef(0);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { session },
          error: authError,
        } = await supabase.auth.getSession();
        if (authError) throw authError;
        if (!session?.user) return;
        setUser(session.user);

        // Fetch min year
        const { data: minYearData } = await supabase
          .from('acuity_clients')
          .select('first_appt')
          .eq('user_id', session.user.id)
          .not('first_appt', 'is', null)
          .order('first_appt', { ascending: true })
          .limit(1)
          .single();

        if (minYearData?.first_appt) {
          const year = new Date(minYearData.first_appt).getFullYear();
          setMinYear(year);
        }
      } catch (err) {
        console.error('Error fetching user:', err);
      }
    };
    fetchUser();
  }, []);

  const fetchClients = async (isRefresh = false) => {
    if (!user) return;

    const seq = ++requestSeq.current;
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let query = supabase
        .from('acuity_clients')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id);

      // Apply filters
      activeFilters.forEach((filter) => {
        const { type, value } = filter;

        if (
          type === 'first_name' ||
          type === 'last_name' ||
          type === 'email' ||
          type === 'phone_normalized'
        ) {
          query = query.ilike(type, `%${value}%`);
        } else if (type === 'first_appt_month') {
          const monthNum = Number(value);
          const currentYear = new Date().getFullYear();
          const years = Array.from({ length: 20 }, (_, i) => currentYear - i);
          const orConditions = years
            .map((year) => {
              const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
              const endMonth = monthNum === 12 ? 1 : monthNum + 1;
              const endYear = monthNum === 12 ? year + 1 : year;
              const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
              return `and(first_appt.gte.${startDate},first_appt.lt.${endDate})`;
            })
            .join(',');
          query = query.or(orConditions);
        } else if (type === 'first_appt_year') {
          query = query.gte('first_appt', `${value}-01-01`);
          query = query.lt('first_appt', `${Number(value) + 1}-01-01`);
        } else if (type === 'last_appt_month') {
          const monthNum = Number(value);
          const currentYear = new Date().getFullYear();
          const years = Array.from({ length: 20 }, (_, i) => currentYear - i);
          const orConditions = years
            .map((year) => {
              const startDate = `${year}-${String(monthNum).padStart(2, '0')}-01`;
              const endMonth = monthNum === 12 ? 1 : monthNum + 1;
              const endYear = monthNum === 12 ? year + 1 : year;
              const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
              return `and(last_appt.gte.${startDate},last_appt.lt.${endDate})`;
            })
            .join(',');
          query = query.or(orConditions);
        } else if (type === 'last_appt_year') {
          query = query.gte('last_appt', `${value}-01-01`);
          query = query.lt('last_appt', `${Number(value) + 1}-01-01`);
        } else if (type === 'visiting_type') {
          query = query.eq('visiting_type', value);
        } else if (type === 'sms_subscribed') {
          query = query.eq('sms_subscribed', value === 'true');
        } else if (type === 'phone_available') {
          if (value === 'true') {
            query = query.not('phone_normalized', 'is', null);
            query = query.neq('phone_normalized', '');
          } else {
            query = query.or('phone_normalized.is.null,phone_normalized.eq.');
          }
        }
      });

      query = query.order(sortField, { ascending: sortDir === 'asc' });

      const start = (page - 1) * limit;
      query = query.range(start, start + limit - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) throw queryError;
      if (seq !== requestSeq.current) return;

      setClients(data || []);
      setTotal(count || 0);
      setTotalPages(Math.max(1, Math.ceil((count || 0) / limit)));
    } catch (err: any) {
      if (seq !== requestSeq.current) return;
      console.error(err);
      setError(err.message || 'Something went wrong');
    } finally {
      if (seq !== requestSeq.current) return;
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchClients();
  }, [sortField, sortDir, page, limit, activeFilters, user]);

  const handleRefresh = () => {
    fetchClients(true);
  };

  const handleRemoveFilter = (filterId: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== filterId));
    setPage(1);
  };

  const displayClients = useMemo(() => clients, [clients]);

  const capitalizeName = (name: string | null | undefined) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    const [year, month, day] = d.split('-').map(Number);
    if (!year || !month || !day) return '—';
    const dateObj = new Date(year, month - 1, day);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'America/Toronto',
    });
  };

  const pageStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = Math.min(page * limit, total);

  return (
    <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
      <View className="flex-1">
        {/* Header with Filters & Sort */}
        <View className="mt-3 mb-3">
          {/* Action Buttons */}
          <View className="flex-row gap-2">
            <TouchableOpacity
              onPress={() => setIsFilterModalOpen(true)}
              className="flex-1 bg-lime-300 rounded-xl py-3 px-4 flex-row items-center justify-center gap-2"
            >
              <Filter color="#000" size={18} />
              <Text className="text-black text-base font-semibold">
                Filters {activeFilters.length > 0 && `(${activeFilters.length})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsSortModalOpen(true)}
              className="bg-white/10 rounded-xl py-3 px-4 flex-row items-center gap-2"
            >
              <ChevronDown color={COLORS.text.primary} size={18} />
              <Text className="text-white text-base font-semibold">Sort</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                // Cycle through limits: 25 -> 50 -> 100 -> 25
                const newLimit = limit === 25 ? 50 : limit === 50 ? 100 : 25;
                setLimit(newLimit);
                setPage(1);
              }}
              className="bg-white/10 rounded-xl py-3 px-4"
            >
              <Text className="text-white text-base font-semibold">{limit}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <View className="px-2">
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="mb-3"
              contentContainerStyle={{ gap: 8 }}
            >
            {activeFilters.map((filter) => (
              <View
                key={filter.id}
                className="px-3 py-2 rounded-full bg-lime-300/10 border border-lime-300/30 flex-row items-center gap-2"
              >
                <Text className="text-lime-300 text-sm font-medium">{filter.label}</Text>
                <TouchableOpacity onPress={() => handleRemoveFilter(filter.id)}>
                  <X size={14} color={COLORS.lime} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={() => {
                setActiveFilters([]);
                setPage(1);
              }}
              className="px-3 py-2 rounded-full bg-red-500/10 border border-red-500/30"
            >
              <Text className="text-red-300 text-sm font-medium">Clear All</Text>
            </TouchableOpacity>
          </ScrollView>
          </View>
        )}

        {/* Stats Bar */}
        <View className="mb-3 px-2">
          <View className="flex-row items-center justify-between flex-wrap gap-2">
            <Text className="text-sm text-[#bdbdbd]">
              Showing{' '}
              <Text className="text-white font-semibold">
                {pageStart}–{pageEnd}
              </Text>{' '}
              of <Text className="text-white font-semibold">{total}</Text>
              {activeFilters.length > 0 && (
                <Text className="text-[#a0a0a0]"> (filtered)</Text>
              )}
            </Text>
            <View className="flex-row gap-3">
              <Text className="text-sm text-[#e5e5e5]">
                2+ visits:{' '}
                <Text className="font-semibold">
                  {displayClients.filter((c) => (c.total_appointments ?? 0) >= 2).length}
                </Text>
              </Text>
              <Text className="text-sm text-[#e5e5e5]">
                10+ visits:{' '}
                <Text className="font-semibold">
                  {displayClients.filter((c) => (c.total_appointments ?? 0) >= 10).length}
                </Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Client Cards */}
        {loading && !refreshing ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={COLORS.lime} />
            <Text className="text-[#bdbdbd] text-base mt-3">Loading clients…</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center">
            <Text className="text-red-300 text-base">{error}</Text>
          </View>
        ) : displayClients.length === 0 ? (
          <View className="flex-1 items-center justify-center">
            <User size={48} color={COLORS.text.muted} />
            <Text className="text-[#bdbdbd] text-base mt-3">
              {activeFilters.length > 0
                ? 'No clients match your filters.'
                : 'No clients found.'}
            </Text>
            {activeFilters.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setActiveFilters([]);
                  setPage(1);
                }}
                className="mt-3"
              >
                <Text className="text-lime-300 text-sm underline">Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="flex-1">
            <ScrollView
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.lime}
                />
              }
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 24, 24) }}
            >
            {displayClients.map((client) => {
              const fullName =
                `${capitalizeName(client.first_name)} ${capitalizeName(client.last_name)}`.trim() || 'Unknown';
              const lastVisit = formatDate(client.last_appt);
              const firstVisit = formatDate(client.first_appt);

              return (
                <View
                  key={client.client_id}
                  className="mb-2 rounded-lg p-3"
                  style={{
                    backgroundColor: COLORS.card,
                    borderWidth: 1,
                    borderColor: COLORS.glassBorder,
                  }}
                >
                  {/* Client Name, Type & Visit Count */}
                  <View className="flex-row items-center justify-between mb-2">
                    <View className="flex-1 flex-row items-center gap-2">
                      <Text className="text-white text-base font-semibold">
                        {fullName}
                      </Text>
                      {client.visiting_type && (
                        <View className="px-2 py-0.5 rounded-full bg-lime-300/10">
                          <Text className="text-lime-300 text-sm capitalize">
                            {client.visiting_type.replace('-', ' ')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View className="items-end ml-2">
                      <Text className="text-white text-base font-bold">
                        {client.total_appointments ?? 0}
                      </Text>
                      <Text className="text-[#8a8a8a] text-sm">visits</Text>
                    </View>
                  </View>

                  {/* Contact Info - Single Line */}
                  {(client.phone || client.email) && (
                    <View className="flex-row items-center gap-3 mb-2 flex-wrap">
                      {client.phone && (
                        <View className="flex-row items-center gap-1.5">
                          <Phone size={14} color={COLORS.text.secondary} />
                          <Text className="text-[#bdbdbd] text-sm">{client.phone}</Text>
                        </View>
                      )}
                      {client.email && (
                        <View className="flex-row items-center gap-1.5 flex-1">
                          <Mail size={14} color={COLORS.text.secondary} />
                          <Text className="text-[#bdbdbd] text-sm flex-1" numberOfLines={1}>
                            {client.email}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Visit Dates & SMS Status */}
                  <View className="flex-row items-center justify-between pt-2 border-t border-white/5">
                    <View className="flex-1">
                      <Text className="text-[#8a8a8a] text-sm">
                        {firstVisit} → {lastVisit}
                      </Text>
                    </View>
                    <View className="ml-2">
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: client.sms_subscribed ? COLORS.lime : COLORS.red }}
                      >
                        SMS: {client.sms_subscribed ? 'Yes' : 'No'}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </ScrollView>
          </View>
        )}

        {/* Pagination */}
        {!loading && displayClients.length > 0 && (
          <View 
            className="p-3 border-t border-white/10"
            style={{ 
              backgroundColor: COLORS.background,
              marginBottom: Math.max(insets.bottom + 10, 20) // Higher above nav bar
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                className={`flex-1 mr-2 px-3 py-2 rounded-xl ${
                  page <= 1 ? 'bg-white/5' : 'bg-white/10'
                }`}
              >
                <Text
                  className={`text-center text-base font-semibold ${
                    page <= 1 ? 'text-white/30' : 'text-white'
                  }`}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <View className="px-3 py-2 rounded-xl bg-black/30 border border-white/10">
                <Text className="text-white text-base">
                  Page {page} / {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={`flex-1 ml-2 px-3 py-2 rounded-xl ${
                  page >= totalPages ? 'bg-white/5' : 'bg-white/10'
                }`}
              >
                <Text
                  className={`text-center text-base font-semibold ${
                    page >= totalPages ? 'text-white/30' : 'text-white'
                  }`}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>

      {/* Filter Modal */}
      <ClientSheetsFilterModal
        isOpen={isFilterModalOpen}
        onClose={() => setIsFilterModalOpen(false)}
        activeFilters={activeFilters}
        onFiltersChange={(filters) => {
          setActiveFilters(filters);
          setPage(1);
        }}
        minYear={minYear}
      />

      {/* Sort Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isSortModalOpen}
        onRequestClose={() => setIsSortModalOpen(false)}
      >
        <Pressable
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}
          onPress={() => setIsSortModalOpen(false)}
        >
          <Pressable
            className="rounded-t-3xl p-6"
            style={{
              backgroundColor: '#1f1f1f',
              borderTopWidth: 1,
              borderColor: COLORS.glassBorder,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Sort By</Text>
              <TouchableOpacity
                onPress={() => setIsSortModalOpen(false)}
                className="w-10 h-10 bg-white/10 rounded-full items-center justify-center"
              >
                <X color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            {[
              { label: 'Last Visit', value: 'last_appt' as SortField },
              { label: 'First Visit', value: 'first_appt' as SortField },
              { label: 'First Name', value: 'first_name' as SortField },
              { label: 'Last Name', value: 'last_name' as SortField },
              { label: 'Total Visits', value: 'total_appointments' as SortField },
              { label: 'Last SMS Sent', value: 'date_last_sms_sent' as SortField },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => {
                  if (sortField === option.value) {
                    setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortField(option.value);
                    setSortDir(
                      option.value === 'first_name' || option.value === 'last_name'
                        ? 'asc'
                        : 'desc'
                    );
                  }
                  setPage(1);
                  setIsSortModalOpen(false);
                }}
                className="py-4 px-4 rounded-xl mb-2"
                style={{
                  backgroundColor:
                    sortField === option.value ? 'rgba(190, 242, 100, 0.1)' : COLORS.surface,
                  borderWidth: 1,
                  borderColor:
                    sortField === option.value
                      ? 'rgba(190, 242, 100, 0.3)'
                      : COLORS.glassBorder,
                }}
              >
                <View className="flex-row items-center justify-between">
                  <Text
                    className="text-base font-medium"
                    style={{
                      color: sortField === option.value ? COLORS.lime : COLORS.text.primary,
                    }}
                  >
                    {option.label}
                  </Text>
                  {sortField === option.value && (
                    <View className="flex-row items-center gap-2">
                      <Text className="text-lime-300 text-sm">
                        {sortDir === 'asc' ? 'Ascending' : 'Descending'}
                      </Text>
                      {sortDir === 'asc' ? (
                        <ChevronUp size={16} color={COLORS.lime} />
                      ) : (
                        <ChevronDown size={16} color={COLORS.lime} />
                      )}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
