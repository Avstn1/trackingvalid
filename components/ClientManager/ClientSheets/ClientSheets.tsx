import { ClientListSkeleton } from '@/components/ui/SkeletonLoader';
import { COLORS } from '@/constants/design-system';
import { supabase } from '@/utils/supabaseClient';
import { useRouter } from 'expo-router';
import { ChevronDown, ChevronRight, ChevronUp, Phone, Search, Settings, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Keyboard,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ActiveFilter } from './ClientSheetsFilterModal';
import ClientSheetsFilterModal from './ClientSheetsFilterModal';


// Component-specific accent colors
const ACCENT_COLORS = {
  lime: '#bef264',
};

export type ClientRow = {
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

export default function ClientSheets() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const [sortField, setSortField] = useState<SortField>('last_appt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [showVisitingTypePicker, setShowVisitingTypePicker] = useState(false);
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([]);
  const [visitingTypeFilter, setVisitingTypeFilter] = useState<string | null>(null);
  const [minYear, setMinYear] = useState<number>(new Date().getFullYear() - 10);
  const [user, setUser] = useState<any>(null);

  const requestSeq = useRef(0);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset to first page on search
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

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

      // Apply search query (searches name, phone, email)
      if (debouncedSearch.trim()) {
        const searchTerm = debouncedSearch.trim().toLowerCase();
        query = query.or(
          `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      // Apply visiting type quick filter
      if (visitingTypeFilter) {
        query = query.eq('visiting_type', visitingTypeFilter);
      }

      // Apply advanced filters
      activeFilters.forEach((filter) => {
        const { type, value } = filter;

        if (type === 'first_appt_month') {
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
  }, [sortField, sortDir, page, limit, activeFilters, visitingTypeFilter, user, debouncedSearch]);

  const handleRefresh = () => {
    fetchClients(true);
  };

  const handleClientPress = (clientId: string) => {
    router.push(`/client/${clientId}` as any);
  };

  const capitalizeName = (name: string | null | undefined) => {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDateShort = (d: string | null | undefined) => {
    if (!d) return '—';
    const [year, month, day] = d.split('-').map(Number);
    if (!year || !month || !day) return '—';
    const dateObj = new Date(year, month - 1, day);
    if (Number.isNaN(dateObj.getTime())) return '—';
    return dateObj.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const pageStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const pageEnd = Math.min(page * limit, total);

  // Render client card (simplified 2-line layout)
  const renderClientCard = useCallback(({ item: client }: { item: ClientRow }) => {
    const fullName =
      `${capitalizeName(client.first_name)} ${capitalizeName(client.last_name)}`.trim() || 'Unknown';
    const lastVisit = formatDateShort(client.last_appt);
    const visitCount = client.total_appointments ?? 0;

    return (
      <TouchableOpacity
        onPress={() => handleClientPress(client.client_id)}
        activeOpacity={0.7}
        className="mb-2 rounded-xl px-4 py-3"
        style={{
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.glassBorder,
        }}
      >
        <View className="flex-row items-center">
          {/* Left: Name and info */}
          <View className="flex-1">
            {/* Row 1: Name + Badge */}
            <View className="flex-row items-center gap-2 mb-1">
              <Text 
                className="text-base font-semibold flex-shrink" 
                style={{ color: COLORS.textPrimary }}
                numberOfLines={1}
              >
                {fullName}
              </Text>
              {client.visiting_type && (
                <View 
                  className="px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: COLORS.primaryMuted }}
                >
                  <Text 
                    className="text-xs capitalize"
                    style={{ color: COLORS.primary }}
                  >
                    {client.visiting_type.replace('-', ' ')}
                  </Text>
                </View>
              )}
            </View>

            {/* Row 2: Phone + visits + last visit */}
            <View className="flex-row items-center gap-3">
              {client.phone && (
                <View className="flex-row items-center gap-1">
                  <Phone size={12} color={COLORS.textTertiary} />
                  <Text className="text-xs" style={{ color: COLORS.textSecondary }}>
                    {client.phone}
                  </Text>
                </View>
              )}
              <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
                {visitCount} visits
              </Text>
              <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
                Last: {lastVisit}
              </Text>
            </View>
          </View>

          {/* Right: Chevron */}
          <ChevronRight size={20} color={COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  }, []);

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View className="flex-1" style={{ backgroundColor: COLORS.background }}>
        {/* Search Bar */}
        <View className="px-0 mb-1">
          <View 
            className="flex-row items-center px-4 rounded-xl"
            style={{ 
              backgroundColor: COLORS.surface,
              borderWidth: 1,
              borderColor: COLORS.glassBorder,
              minHeight: 44,
            }}
          >
            <Search size={18} color={COLORS.textTertiary} />
            <TextInput
              className="flex-1 ml-3 text-base"
              style={{ color: COLORS.textPrimary, paddingVertical: 10 }}
              placeholder="Search by name, phone, email..."
              placeholderTextColor={COLORS.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Filter Controls Row - No Scroll */}
        <View className="flex-row justify-between items-center mb-1">
          {/* Left: Type dropdown + Advanced filters */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {/* Visiting Type Dropdown */}
            <TouchableOpacity
              onPress={() => setShowVisitingTypePicker(true)}
              className="flex-row items-center gap-1 px-3 rounded-full"
              style={{
                height: 28,
                backgroundColor: visitingTypeFilter ? COLORS.primaryMuted : COLORS.surface,
                borderWidth: 1,
                borderColor: visitingTypeFilter ? COLORS.primary : COLORS.glassBorder,
              }}
            >
              <Text 
                className="text-xs font-medium" 
                style={{ color: visitingTypeFilter ? COLORS.primary : COLORS.textPrimary }}
              >
                Type: {visitingTypeFilter 
                  ? (visitingTypeFilter === 'semi-consistent' ? 'Semi' : visitingTypeFilter.charAt(0).toUpperCase() + visitingTypeFilter.slice(1))
                  : 'All'}
              </Text>
              <ChevronDown size={12} color={visitingTypeFilter ? COLORS.primary : COLORS.textSecondary} />
            </TouchableOpacity>

            {/* Advanced Filters Button */}
            <TouchableOpacity
              onPress={() => setIsFilterModalOpen(true)}
              className="px-2 rounded-full"
              style={{
                height: 28,
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: activeFilters.length > 0 ? COLORS.primaryMuted : COLORS.surface,
                borderWidth: 1,
                borderColor: activeFilters.length > 0 ? COLORS.primary : COLORS.glassBorder,
                minWidth: 28,
              }}
            >
              <View className="flex-row items-center">
                <Settings size={14} color={activeFilters.length > 0 ? COLORS.primary : COLORS.textSecondary} />
                {activeFilters.length > 0 && (
                  <View
                    className="ml-1 px-1.5 rounded-full"
                    style={{ backgroundColor: COLORS.primary }}
                  >
                    <Text className="text-xs font-bold" style={{ color: '#000' }}>
                      {activeFilters.length}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Right: Sort + Limit */}
          <View className="flex-row items-center" style={{ gap: 8 }}>
            {/* Sort Button */}
            <TouchableOpacity
              onPress={() => setIsSortModalOpen(true)}
              className="flex-row items-center gap-1 px-3 rounded-full"
              style={{
                height: 28,
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <ChevronDown size={14} color={COLORS.textSecondary} />
              <Text className="text-xs font-medium" style={{ color: COLORS.textPrimary }}>
                Sort
              </Text>
            </TouchableOpacity>

            {/* Limit Button */}
            <TouchableOpacity
              onPress={() => {
                const newLimit = limit === 25 ? 50 : limit === 50 ? 100 : 25;
                setLimit(newLimit);
                setPage(1);
              }}
              className="px-3 rounded-full"
              style={{
                height: 28,
                justifyContent: 'center',
                backgroundColor: COLORS.surface,
                borderWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
            >
              <Text className="text-xs font-medium" style={{ color: COLORS.textPrimary }}>
                {limit}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Results count */}
        <View className="mb-0">
          <Text className="text-xs" style={{ color: COLORS.textTertiary }}>
            {total === 0 
              ? 'No clients found' 
              : `Showing ${pageStart}–${pageEnd} of ${total}${debouncedSearch ? ' (filtered)' : ''}`
            }
          </Text>
        </View>

        {/* Client List */}
        <View className="flex-1">
          {loading && !refreshing ? (
            <ClientListSkeleton itemCount={6} />
          ) : error ? (
            <View className="flex-1 items-center justify-center">
              <Text className="text-sm" style={{ color: COLORS.negative }}>{error}</Text>
            </View>
          ) : clients.length === 0 ? (
            <View className="flex-1 items-center justify-center py-12">
              <View 
                className="w-16 h-16 rounded-full items-center justify-center mb-4"
                style={{ backgroundColor: COLORS.primaryMuted }}
              >
                <User size={32} color={COLORS.primary} />
              </View>
              <Text className="text-base font-medium mb-1" style={{ color: COLORS.textPrimary }}>
                {debouncedSearch || activeFilters.length > 0 ? 'No matches found' : 'No clients yet'}
              </Text>
              <Text className="text-sm text-center px-8" style={{ color: COLORS.textTertiary }}>
                {debouncedSearch || activeFilters.length > 0
                  ? 'Try adjusting your search or filters'
                  : 'Clients will appear here after appointments sync'
                }
              </Text>
              {(debouncedSearch || activeFilters.length > 0) && (
                <TouchableOpacity
                  onPress={() => {
                    setSearchQuery('');
                    setActiveFilters([]);
                    setPage(1);
                  }}
                  className="mt-4 px-4 py-2 rounded-full"
                  style={{ backgroundColor: COLORS.primaryMuted }}
                >
                  <Text className="text-sm font-medium" style={{ color: COLORS.primary }}>
                    Clear filters
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <FlatList
              data={clients}
              renderItem={renderClientCard}
              keyExtractor={(item: ClientRow) => item.client_id}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.primary}
                />
              }
              contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 140, 160) }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>

        {/* Pagination */}
        {!loading && clients.length > 0 && (
          <View 
            className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t"
            style={{ 
              backgroundColor: COLORS.background,
              borderColor: COLORS.border,
              paddingBottom: Math.max(insets.bottom + 24, 36),
            }}
          >
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                disabled={page <= 1}
                onPress={() => setPage((p) => Math.max(1, p - 1))}
                className="flex-1 mr-2 py-2 rounded-xl items-center"
                style={{
                  backgroundColor: page <= 1 ? COLORS.surfaceElevated : COLORS.surface,
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: page <= 1 ? COLORS.textTertiary : COLORS.textPrimary }}
                >
                  Previous
                </Text>
              </TouchableOpacity>

              <View className="px-4 py-2 rounded-xl" style={{ backgroundColor: COLORS.surfaceElevated }}>
                <Text className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {page} / {totalPages}
                </Text>
              </View>

              <TouchableOpacity
                disabled={page >= totalPages}
                onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="flex-1 ml-2 py-2 rounded-xl items-center"
                style={{
                  backgroundColor: page >= totalPages ? COLORS.surfaceElevated : COLORS.surface,
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                <Text
                  className="text-sm font-medium"
                  style={{ color: page >= totalPages ? COLORS.textTertiary : COLORS.textPrimary }}
                >
                  Next
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

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
            style={{ backgroundColor: COLORS.overlay }}
            onPress={() => setIsSortModalOpen(false)}
          >
            <Pressable
              className="rounded-t-3xl p-6"
              style={{
                backgroundColor: COLORS.surface,
                borderTopWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row justify-between items-center mb-6">
                <Text className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>
                  Sort By
                </Text>
                <TouchableOpacity
                  onPress={() => setIsSortModalOpen(false)}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: COLORS.surfaceElevated }}
                >
                  <X size={20} color={COLORS.textPrimary} />
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
                  className="py-3 px-4 rounded-xl mb-2"
                  style={{
                    backgroundColor: sortField === option.value ? COLORS.primaryMuted : COLORS.surfaceElevated,
                    borderWidth: 1,
                    borderColor: sortField === option.value ? COLORS.primary : 'transparent',
                  }}
                >
                  <View className="flex-row items-center justify-between">
                    <Text
                      className="text-sm font-medium"
                      style={{ color: sortField === option.value ? COLORS.primary : COLORS.textPrimary }}
                    >
                      {option.label}
                    </Text>
                    {sortField === option.value && (
                      <View className="flex-row items-center gap-2">
                        <Text className="text-xs" style={{ color: COLORS.primary }}>
                          {sortDir === 'asc' ? 'A → Z' : 'Z → A'}
                        </Text>
                        {sortDir === 'asc' ? (
                          <ChevronUp size={14} color={COLORS.primary} />
                        ) : (
                          <ChevronDown size={14} color={COLORS.primary} />
                        )}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Visiting Type Picker Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={showVisitingTypePicker}
          onRequestClose={() => setShowVisitingTypePicker(false)}
        >
          <Pressable
            className="flex-1 justify-end"
            style={{ backgroundColor: COLORS.overlay }}
            onPress={() => setShowVisitingTypePicker(false)}
          >
            <Pressable
              className="rounded-t-3xl p-6"
              style={{
                backgroundColor: COLORS.surface,
                borderTopWidth: 1,
                borderColor: COLORS.glassBorder,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold" style={{ color: COLORS.textPrimary }}>
                  Filter by Type
                </Text>
                <TouchableOpacity
                  onPress={() => setShowVisitingTypePicker(false)}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{ backgroundColor: COLORS.surfaceElevated }}
                >
                  <X size={20} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {[
                { key: null, label: 'All' },
                { key: 'consistent', label: 'Consistent' },
                { key: 'semi-consistent', label: 'Semi-Consistent' },
                { key: 'rare', label: 'Rare' },
                { key: 'new', label: 'New' },
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={label}
                  onPress={() => {
                    setVisitingTypeFilter(key);
                    setShowVisitingTypePicker(false);
                    setPage(1);
                  }}
                  className="py-3 px-4 rounded-xl mb-2"
                  style={{
                    backgroundColor: visitingTypeFilter === key ? COLORS.primaryMuted : COLORS.surfaceElevated,
                    borderWidth: 1,
                    borderColor: visitingTypeFilter === key ? COLORS.primary : 'transparent',
                  }}
                >
                  <Text
                    className="text-sm font-medium"
                    style={{ color: visitingTypeFilter === key ? COLORS.primary : COLORS.textPrimary }}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}
