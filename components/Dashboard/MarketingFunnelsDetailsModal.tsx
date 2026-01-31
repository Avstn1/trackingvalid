import { supabase } from '@/utils/supabaseClient';
import {
  ChevronDown,
  ChevronUp,
  DollarSign,
  Percent,
  TrendingUp,
  Users,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Collapsible from 'react-native-collapsible';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

const COLORS_PALETTE = {
  background: '#1a1f1b',
  backgroundAlt: '#2e3b2b',
  surface: 'rgba(37, 37, 37, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  text: '#E8EDC7',
  textMuted: 'rgba(232, 237, 199, 0.7)',
  green: '#748E63',
  teal: '#9AC8CD',
  tan: '#B19470',
  cream: '#F1EEDC',
};

interface MarketingFunnel {
  source: string;
  new_clients: number;
  returning_clients: number;
  new_clients_retained: number;
  retention: number;
  avg_ticket: number;
  timeframe?: string;
}

interface ClientDetail {
  client_name: string;
  first_visit: string;
  second_visit: string | null;
}

interface FunnelWithClients extends MarketingFunnel {
  client_names?: ClientDetail[];
}

interface MarketingFunnelsDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  barberId: string;
  months: string[];
  year: number;
  data: MarketingFunnel[];
}

export default function MarketingFunnelsDetailsModal({
  isOpen,
  onClose,
  barberId,
  months,
  year,
  data,
}: MarketingFunnelsDetailsModalProps) {
  const [detailedData, setDetailedData] = useState<FunnelWithClients[]>([]);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Convert month names to numbers
  const getMonthNumber = (monthName: string): number => {
    const monthMap: { [key: string]: number } = {
      'January': 1, 'February': 2, 'March': 3, 'April': 4,
      'May': 5, 'June': 6, 'July': 7, 'August': 8,
      'September': 9, 'October': 10, 'November': 11, 'December': 12
    };
    return monthMap[monthName] || 1;
  };

  // Determine timeline type and message
  const getTimelineInfo = () => {
    if (months.length === 1) {
      return {
        type: 'month',
        message: `No other visits for ${months[0]}`
      };
    }
    
    // Check if it's a quarter
    const monthNumbers = months.map(m => getMonthNumber(m)).sort((a, b) => a - b);
    const quarters = [
      [1, 2, 3], // Q1
      [4, 5, 6], // Q2
      [7, 8, 9], // Q3
      [10, 11, 12] // Q4
    ];
    
    for (let i = 0; i < quarters.length; i++) {
      if (JSON.stringify(monthNumbers) === JSON.stringify(quarters[i])) {
        return {
          type: 'quarter',
          message: `No other visits for Q${i + 1} of ${year}`
        };
      }
    }
    
    // Check if it's a full year
    if (months.length === 12) {
      return {
        type: 'year',
        message: `No other visits for ${year}`
      };
    }
    
    // Custom range
    return {
      type: 'custom',
      message: `No other visits for selected period`
    };
  };

  const timelineInfo = getTimelineInfo();

  // Check if a date falls within the timeline
  const isDateInTimeline = (dateString: string): boolean => {
    if (!dateString) return false;
    
    const date = new Date(dateString + 'T00:00:00');
    const dateMonth = date.getMonth() + 1;
    const dateYear = date.getFullYear();
    
    if (dateYear !== year) return false;
    
    const monthNumbers = months.map(m => getMonthNumber(m));
    return monthNumbers.includes(dateMonth);
  };

  useEffect(() => {
    if (!isOpen) return;

    const fetchDetailedData = async () => {
      setLoading(true);
      const monthNumbers = months.map(m => getMonthNumber(m));

      // Fetch clients who had their first appointment in the selected months/year
      const { data: clients, error } = await supabase
        .from('acuity_clients')
        .select('client_id, first_name, last_name, first_appt, second_appt, first_source')
        .eq('user_id', barberId)
        .not('first_source', 'is', null)
        .not('first_source', 'eq', 'Unknown')
        .not('first_source', 'eq', 'Returning Client')
        .not('first_source', 'eq', 'No Source')
        .gte('first_appt', `${year}-01-01`)
        .lte('first_appt', `${year}-12-31`);

      if (error) {
        console.error('Error fetching client details:', error);
        setLoading(false);
        return;
      }

      // Filter clients whose first_appt is in the selected months
      const filteredClients = clients?.filter(client => {
        if (!client.first_appt) return false;
        const apptMonth = new Date(client.first_appt + 'T00:00:00').getMonth() + 1;
        return monthNumbers.includes(apptMonth);
      }) || [];

      // Group clients by source
      const sourceMap = new Map<string, ClientDetail[]>();

      filteredClients.forEach(client => {
        const source = client.first_source || 'Unknown';
        if (!sourceMap.has(source)) {
          sourceMap.set(source, []);
        }
        
        // Capitalize each part of the name (handles multi-part names like "juan carlos")
        const capitalizeWords = (str: string) => {
          if (!str) return '';
          return str
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        };
        
        const firstName = capitalizeWords(client.first_name || '');
        const lastName = capitalizeWords(client.last_name || '');
        
        sourceMap.get(source)!.push({
          client_name: `${firstName} ${lastName}`.trim(),
          first_visit: client.first_appt!,
          second_visit: client.second_appt
        });
      });

      // Build final data with timeline-based retention
      const funnelData: FunnelWithClients[] = [];

      for (const [source, clientList] of sourceMap.entries()) {
        // Calculate retention based on timeline
        const clientsWithSecondVisitInTimeline = clientList.filter(client => 
          client.second_visit && isDateInTimeline(client.second_visit)
        ).length;
        
        const newClients = clientList.length;
        const retention = newClients > 0 ? (clientsWithSecondVisitInTimeline / newClients) * 100 : 0;
        
        // Calculate average ticket from FIRST appointments for all new clients in this source
        let avgTicket = 0;
        
        if (clientList.length > 0) {
          // Get client_ids and their first appointment dates
          const clientAppointmentData = clientList
            .map(c => {
              const originalClient = filteredClients.find(fc => 
                `${fc.first_name} ${fc.last_name}`.toLowerCase() === c.client_name.toLowerCase()
              );
              return originalClient ? {
                client_id: originalClient.client_id,
                first_appt: originalClient.first_appt
              } : null;
            })
            .filter(Boolean) as { client_id: string; first_appt: string }[];
          
          if (clientAppointmentData.length > 0) {
            // Fetch first appointments for these clients
            const clientIds = clientAppointmentData.map(c => c.client_id);
            
            const { data: appointments } = await supabase
              .from('acuity_appointments')
              .select('client_id, appointment_date, revenue')
              .eq('user_id', barberId)
              .in('client_id', clientIds);
            
            if (appointments && appointments.length > 0) {
              // Match appointments to first_appt dates and get revenue
              const firstAppointmentRevenues: number[] = [];
              
              clientAppointmentData.forEach(clientData => {
                const firstAppt = appointments.find(appt => 
                  appt.client_id === clientData.client_id && 
                  appt.appointment_date === clientData.first_appt
                );
                
                if (firstAppt && firstAppt.revenue) {
                  firstAppointmentRevenues.push(Number(firstAppt.revenue));
                }
              });
              
              if (firstAppointmentRevenues.length > 0) {
                const totalRevenue = firstAppointmentRevenues.reduce((sum, rev) => sum + rev, 0);
                avgTicket = totalRevenue / firstAppointmentRevenues.length;
              }
            }
          }
        }
        
        // Sort client names: clients with second_visit first, then by first_visit date
        const sortedClientNames = clientList.sort((a, b) => {
          // Prioritize clients with second_visit in timeline
          const aHasSecondInTimeline = a.second_visit && isDateInTimeline(a.second_visit) ? 1 : 0;
          const bHasSecondInTimeline = b.second_visit && isDateInTimeline(b.second_visit) ? 1 : 0;
          
          if (bHasSecondInTimeline !== aHasSecondInTimeline) {
            return bHasSecondInTimeline - aHasSecondInTimeline;
          }
          
          // If both have or don't have second_visit in timeline, sort by first_visit
          const dateA = new Date(a.first_visit + 'T00:00:00');
          const dateB = new Date(b.first_visit + 'T00:00:00');
          return dateA.getTime() - dateB.getTime();
        });

        funnelData.push({
          source,
          new_clients: newClients,
          returning_clients: 0,
          new_clients_retained: clientsWithSecondVisitInTimeline,
          retention: retention,
          avg_ticket: avgTicket,
          client_names: sortedClientNames
        });
      }

      // Sort by total new clients
      funnelData.sort((a, b) => b.new_clients - a.new_clients);

      setDetailedData(funnelData);
      setLoading(false);
    };

    fetchDetailedData();
  }, [isOpen, barberId, months, year]);

  const toggleSource = (source: string) => {
    setExpandedSource(prev => prev === source ? null : source);
  };

  // Format months display
  const monthsDisplay = months.length === 1 
    ? months[0] 
    : months.length === 2 
    ? `${months[0]} & ${months[1]}`
    : `${months[0]} - ${months[months.length - 1]}`;

  if (!isOpen) return null;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/60">
        <Animated.View 
          entering={FadeIn}
          exiting={FadeOut}
          className="flex-1 items-center justify-center p-4"
        >
          <View 
            className="w-full rounded-2xl overflow-hidden"
            style={{
              backgroundColor: COLORS_PALETTE.background,
              borderWidth: 1,
              borderColor: COLORS_PALETTE.glassBorder,
              maxWidth: 600,
              height: '85%',
            }}
          >
            {/* Header */}
            <View 
              className="flex-row items-center justify-between p-4 border-b"
              style={{
                backgroundColor: `${COLORS_PALETTE.green}30`,
                borderBottomColor: COLORS_PALETTE.glassBorder,
              }}
            >
              <View className="flex-1 pr-2">
                <Text className="text-lg font-bold" style={{ color: COLORS_PALETTE.text }}>
                  📣 Marketing Funnels Details
                </Text>
                <Text className="text-xs mt-0.5" style={{ color: COLORS_PALETTE.textMuted }}>
                  {monthsDisplay} {year} • {detailedData.length} source{detailedData.length !== 1 ? 's' : ''}
                </Text>
              </View>
              <TouchableOpacity
                onPress={onClose}
                className="p-2 rounded-lg"
                style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                <X size={20} color={COLORS_PALETTE.text} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView className="flex-1 p-4">
              {loading ? (
                <View className="items-center justify-center py-12">
                  <ActivityIndicator size="large" color={COLORS_PALETTE.green} />
                  <Text className="text-sm mt-2" style={{ color: COLORS_PALETTE.textMuted }}>
                    Loading details...
                  </Text>
                </View>
              ) : detailedData.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <Text style={{ color: COLORS_PALETTE.textMuted }}>No data available</Text>
                </View>
              ) : (
                <View className="gap-2">
                  {detailedData.map((funnel, idx) => (
                    <View 
                      key={funnel.source}
                      className="rounded-lg overflow-hidden"
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        borderWidth: 1,
                        borderColor: COLORS_PALETTE.glassBorder,
                      }}
                    >
                      {/* Source Header */}
                      <TouchableOpacity
                        onPress={() => toggleSource(funnel.source)}
                        className="p-3 flex-row items-center justify-between"
                      >
                        <View className="flex-row items-center gap-2">
                          <View 
                            className="w-7 h-7 rounded-full items-center justify-center"
                            style={{ backgroundColor: COLORS_PALETTE.teal }}
                          >
                            <Text className="text-xs font-bold" style={{ color: '#2a3612ff' }}>
                              {idx + 1}
                            </Text>
                          </View>
                          <Text className="text-sm font-semibold" style={{ color: COLORS_PALETTE.text }}>
                            {funnel.source}
                          </Text>
                        </View>
                        {expandedSource === funnel.source ? (
                          <ChevronUp size={16} color={COLORS_PALETTE.textMuted} />
                        ) : (
                          <ChevronDown size={16} color={COLORS_PALETTE.textMuted} />
                        )}
                      </TouchableOpacity>

                      {/* Stats Grid - Single Row */}
                      <View className="px-3 pb-3">
                        <View className="flex-row gap-1">
                          <View 
                            className="flex-1 px-1.5 py-1 rounded"
                            style={{ 
                              backgroundColor: `${COLORS_PALETTE.teal}10`,
                              borderWidth: 1,
                              borderColor: `${COLORS_PALETTE.teal}20`
                            }}
                          >
                            <View className="flex-row items-center gap-0.5 mb-0.5">
                              <Users size={9} color={COLORS_PALETTE.teal} />
                              <Text className="text-[9px] font-semibold" style={{ color: COLORS_PALETTE.teal }}>
                                New
                              </Text>
                            </View>
                            <Text className="text-sm font-bold" style={{ color: COLORS_PALETTE.text }}>
                              {funnel.new_clients}
                            </Text>
                          </View>
                          
                          <View 
                            className="flex-1 px-1.5 py-1 rounded"
                            style={{ 
                              backgroundColor: `${COLORS_PALETTE.green}10`,
                              borderWidth: 1,
                              borderColor: `${COLORS_PALETTE.green}20`
                            }}
                          >
                            <View className="flex-row items-center gap-0.5 mb-0.5">
                              <TrendingUp size={9} color={COLORS_PALETTE.green} />
                              <Text className="text-[9px] font-semibold" style={{ color: COLORS_PALETTE.green }}>
                                Returned
                              </Text>
                            </View>
                            <Text className="text-sm font-bold" style={{ color: COLORS_PALETTE.text }}>
                              {funnel.new_clients_retained}
                            </Text>
                          </View>
                          
                          <View 
                            className="flex-1 px-1.5 py-1 rounded"
                            style={{ 
                              backgroundColor: `${COLORS_PALETTE.tan}10`,
                              borderWidth: 1,
                              borderColor: `${COLORS_PALETTE.tan}20`
                            }}
                          >
                            <View className="flex-row items-center gap-0.5 mb-0.5">
                              <Percent size={9} color={COLORS_PALETTE.tan} />
                              <Text className="text-[9px] font-semibold" style={{ color: COLORS_PALETTE.tan }}>
                                Retention
                              </Text>
                            </View>
                            <Text className="text-sm font-bold" style={{ color: COLORS_PALETTE.text }}>
                              {funnel.retention.toFixed(1)}%
                            </Text>
                          </View>
                          
                          <View 
                            className="flex-1 px-1.5 py-1 rounded"
                            style={{ 
                              backgroundColor: `${COLORS_PALETTE.cream}10`,
                              borderWidth: 1,
                              borderColor: `${COLORS_PALETTE.cream}20`
                            }}
                          >
                            <View className="flex-row items-center gap-0.5 mb-0.5">
                              <DollarSign size={9} color={COLORS_PALETTE.cream} />
                              <Text className="text-[9px] font-semibold" style={{ color: COLORS_PALETTE.cream }}>
                                Avg
                              </Text>
                            </View>
                            <Text className="text-sm font-bold" style={{ color: COLORS_PALETTE.text }}>
                              ${funnel.avg_ticket.toFixed(0)}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Client Names List */}
                      <Collapsible collapsed={expandedSource !== funnel.source}>
                        <View 
                          className="px-3 pb-3 pt-2.5 border-t"
                          style={{ borderTopColor: COLORS_PALETTE.glassBorder }}
                        >
                          <View className="flex-row items-center gap-1.5 mb-2 mt-1">
                            <Users size={12} color={COLORS_PALETTE.text} />
                            <Text className="text-xs font-semibold" style={{ color: COLORS_PALETTE.text }}>
                              New Clients ({funnel.client_names?.length || 0}):
                            </Text>
                          </View>
                          {funnel.client_names && funnel.client_names.length > 0 ? (
                            <ScrollView className="max-h-48">
                              <View className="flex-row flex-wrap gap-1.5">
                                {funnel.client_names.map((client, idx) => {
                                  const hasSecondVisitInTimeline = client.second_visit && isDateInTimeline(client.second_visit);
                                  
                                  const formatDate = (dateString: string) => {
                                    const date = new Date(dateString + 'T00:00:00');
                                    return date.toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    });
                                  };
                                  
                                  return (
                                    <View 
                                      key={idx}
                                      className="p-2 rounded"
                                      style={{
                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                        borderWidth: 1,
                                        borderColor: COLORS_PALETTE.glassBorder,
                                        width: '48.5%',
                                      }}
                                    >
                                      <Text 
                                        className="text-xs font-semibold mb-1.5"
                                        style={{ color: COLORS_PALETTE.text }}
                                        numberOfLines={1}
                                      >
                                        {client.client_name}
                                      </Text>
                                      <View className="gap-0.5">
                                        <View className="flex-row items-center gap-1">
                                          <Text className="text-[10px]" style={{ color: COLORS_PALETTE.textMuted }}>
                                            1st:
                                          </Text>
                                          <Text 
                                            className="text-[10px] font-medium flex-1"
                                            style={{ color: COLORS_PALETTE.text }}
                                            numberOfLines={1}
                                          >
                                            {formatDate(client.first_visit)}
                                          </Text>
                                        </View>
                                        <View className="flex-row items-center gap-1">
                                          <Text className="text-[10px]" style={{ color: COLORS_PALETTE.textMuted }}>
                                            2nd:
                                          </Text>
                                          <Text 
                                            className="text-[10px] font-medium flex-1"
                                            style={{ 
                                              color: hasSecondVisitInTimeline 
                                                ? COLORS_PALETTE.text 
                                                : COLORS_PALETTE.textMuted
                                            }}
                                            numberOfLines={1}
                                          >
                                            {hasSecondVisitInTimeline
                                              ? formatDate(client.second_visit!)
                                              : 'None'
                                            }
                                          </Text>
                                        </View>
                                      </View>
                                    </View>
                                  );
                                })}
                              </View>
                            </ScrollView>
                          ) : (
                            <Text className="text-xs" style={{ color: COLORS_PALETTE.textMuted }}>
                              No client data available
                            </Text>
                          )}
                        </View>
                      </Collapsible>
                    </View>
                  ))}
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View 
              className="p-3 border-t flex-row justify-between items-center"
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                borderTopColor: COLORS_PALETTE.glassBorder,
              }}
            >
              <Text className="text-[10px]" style={{ color: COLORS_PALETTE.textMuted }}>
                Click on any source to view details
              </Text>
              <TouchableOpacity
                onPress={onClose}
                className="px-5 py-1.5 rounded-lg"
                style={{ backgroundColor: COLORS_PALETTE.green }}
              >
                <Text className="text-sm font-semibold" style={{ color: '#2a3612ff' }}>
                  Close
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}