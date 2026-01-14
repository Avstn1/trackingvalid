import { supabase } from '@/utils/supabaseClient';
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Eye,
  Shield,
  X
} from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  LayoutAnimation,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Markdown from 'react-native-markdown-display';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.85;

const COLORS = {
  background: '#1a1f1b',
  backgroundTo: '#2e3b2b',
  border: '#55694b',
  text: '#F1F5E9',
  textMuted: '#9ca3af',
  lime: '#bef264',
  amber: '#fbbf24',
  surface: 'rgba(255, 255, 255, 0.05)',
  surfaceBorder: 'rgba(85, 105, 75, 0.3)',
};

interface FeatureUpdate {
  id: string;
  title: string;
  description: string;
  category: 'feature' | 'improvement' | 'bugfix' | 'announcement';
  image_url: string | null;
  video_url: string | null;
  version: string | null;
  platform: 'web' | 'mobile' | 'both';
  priority: number;
  is_published: boolean;
  released_at: string;
  created_at: string;
  admin_view_excluded: boolean;
}

interface MinorVersionGroup {
  minorVersion: string;
  features: FeatureUpdate[];
  isLatest: boolean;
}

interface MajorVersionGroup {
  majorVersion: string;
  minorGroups: MinorVersionGroup[];
  latestDate: string;
}

interface NewFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialViewMode?: 'barberView' | 'adminView';
  userId?: string;
}

export default function NewFeaturesModal({ 
  isOpen, 
  onClose, 
  initialViewMode = 'barberView', 
  userId 
}: NewFeaturesModalProps) {
  const insets = useSafeAreaInsets();
  const [majorVersions, setMajorVersions] = useState<MajorVersionGroup[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'barberView' | 'adminView'>(initialViewMode);
  const [expandedMinorVersion, setExpandedMinorVersion] = useState<string | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Animate modal open
  useEffect(() => {
    if (isOpen) {
      translateY.value = MODAL_HEIGHT;
      opacity.value = 0;
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchFeatures();
      
      if (userId) {
        updateLastReadTimestamp();
      }
    }
  }, [isOpen, viewMode, userId]);

  const closeModal = () => {
    if (isClosing) return;
    setIsClosing(true);
    translateY.value = withTiming(MODAL_HEIGHT, { duration: 300 });
    opacity.value = withTiming(0, { duration: 300 });
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (event.translationY > 0) {
        translateY.value = event.translationY;
        const progress = Math.min(event.translationY / 300, 1);
        opacity.value = 1 - progress * 0.5;
      }
    })
    .onEnd((event) => {
      if (event.translationY > 100 || event.velocityY > 500) {
        runOnJS(closeModal)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
        opacity.value = withTiming(1, { duration: 200 });
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const updateLastReadTimestamp = async () => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ last_read_feature_updates: new Date().toISOString() })
        .eq('user_id', userId);

      if (error) {
        console.error('Error updating last read timestamp:', error);
      }
    } catch (error) {
      console.error('Error updating last read timestamp:', error);
    }
  };

  const fetchFeatures = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('feature_updates')
        .select('*')
        .in('platform', ['mobile', 'both'])  // Only show mobile and both
        .order('released_at', { ascending: false });

      if (viewMode === 'barberView') {
        query = query.eq('is_published', true);
      } else {
        query = query.eq('admin_view_excluded', false);
      }

      const { data, error } = await query;

      if (error) throw error;

      const grouped = groupByVersions(data || []);
      setMajorVersions(grouped);
      
      let latestMinorVersion: string | null = null;
      grouped.forEach(major => {
        major.minorGroups.forEach(minorGroup => {
          if (minorGroup.isLatest) {
            latestMinorVersion = `${major.majorVersion}.${minorGroup.minorVersion}`;
          }
        });
      });
      setExpandedMinorVersion(latestMinorVersion);
      setCurrentPage(0);
    } catch (error) {
      console.error('Error fetching features:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupByVersions = (features: FeatureUpdate[]): MajorVersionGroup[] => {
    const majorGroups = new Map<string, Map<string, FeatureUpdate[]>>();
    let globalLatestVersion: string | null = null;
    let globalLatestDate: string | null = null;

    features.forEach(feature => {
      if (!feature.version) return;
      const parts = feature.version.split('.');
      const majorVersion = parts[0];
      const minorVersion = parts[1];
      
      if (!globalLatestDate || feature.released_at > globalLatestDate) {
        globalLatestDate = feature.released_at;
        globalLatestVersion = `${majorVersion}.${minorVersion}`;
      }
      
      if (!majorGroups.has(majorVersion)) {
        majorGroups.set(majorVersion, new Map());
      }
      
      const minorMap = majorGroups.get(majorVersion)!;
      if (!minorMap.has(minorVersion)) {
        minorMap.set(minorVersion, []);
      }
      minorMap.get(minorVersion)!.push(feature);
    });

    const result: MajorVersionGroup[] = [];
    majorGroups.forEach((minorMap, majorVersion) => {
      const minorGroups: MinorVersionGroup[] = [];
      
      const sortedMinorVersions = Array.from(minorMap.keys()).sort((a, b) => parseInt(b) - parseInt(a));
      
      sortedMinorVersions.forEach((minorVersion) => {
        const features = minorMap.get(minorVersion)!;
        const versionKey = `${majorVersion}.${minorVersion}`;
        
        features.sort((a, b) => {
          const patchA = parseInt(a.version!.split('.')[2]);
          const patchB = parseInt(b.version!.split('.')[2]);
          return patchB - patchA;
        });

        minorGroups.push({
          minorVersion,
          features,
          isLatest: versionKey === globalLatestVersion
        });
      });

      result.push({
        majorVersion,
        minorGroups,
        latestDate: minorGroups[0]?.features[0]?.released_at || ''
      });
    });

    result.sort((a, b) => parseInt(b.majorVersion) - parseInt(a.majorVersion));

    return result;
  };

  const toggleMinorVersion = (majorVersion: string, minorVersion: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    const key = `${majorVersion}.${minorVersion}`;
    setExpandedMinorVersion(expandedMinorVersion === key ? null : key);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      feature: { bg: 'rgba(74, 124, 89, 0.2)', text: '#a8d5ba', border: 'rgba(74, 124, 89, 0.4)' },
      improvement: { bg: 'rgba(90, 124, 154, 0.2)', text: '#a8c5d5', border: 'rgba(90, 124, 154, 0.4)' },
      bugfix: { bg: 'rgba(122, 68, 68, 0.2)', text: '#d49999', border: 'rgba(122, 68, 68, 0.4)' },
      announcement: { bg: 'rgba(107, 90, 124, 0.2)', text: '#c5a8d5', border: 'rgba(107, 90, 124, 0.4)' },
    };
    return colors[category as keyof typeof colors] || colors.feature;
  };

  const handlePrevious = () => {
    const newPage = Math.max(0, currentPage - 1);
    setCurrentPage(newPage);
    
    const newGroup = majorVersions[newPage];
    if (newGroup) {
      const latestMinor = newGroup.minorGroups.find(g => g.isLatest);
      if (latestMinor) {
        setExpandedMinorVersion(`${newGroup.majorVersion}.${latestMinor.minorVersion}`);
      } else {
        setExpandedMinorVersion(null);
      }
    }
  };

  const handleNext = () => {
    const newPage = Math.min(majorVersions.length - 1, currentPage + 1);
    setCurrentPage(newPage);
    
    const newGroup = majorVersions[newPage];
    if (newGroup) {
      const latestMinor = newGroup.minorGroups.find(g => g.isLatest);
      if (latestMinor) {
        setExpandedMinorVersion(`${newGroup.majorVersion}.${latestMinor.minorVersion}`);
      } else {
        setExpandedMinorVersion(null);
      }
    }
  };

  if (!isOpen) return null;

  const currentGroup = majorVersions[currentPage];

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={isOpen}
      onRequestClose={closeModal}
      statusBarTranslucent
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View style={[{ flex: 1 }, backdropStyle]}>
          <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.7)' }}>
            <Pressable className="flex-1" onPress={closeModal} />
            <Animated.View
              style={[
                animatedStyle,
                {
                  backgroundColor: COLORS.background,
                  borderTopWidth: 1,
                  borderColor: COLORS.surfaceBorder,
                  height: MODAL_HEIGHT,
                },
              ]}
              className="rounded-t-3xl"
            >
              {/* Swipe Handle + Header */}
              <GestureDetector gesture={panGesture}>
                <View>
                  {/* Swipe Handle */}
                  <View className="items-center py-3">
                    <View
                      style={{
                        width: 40,
                        height: 4,
                        backgroundColor: COLORS.textMuted,
                        borderRadius: 2,
                        opacity: 0.3,
                      }}
                    />
                  </View>

                  {/* Header */}
                  <View
                    className="flex-row items-center justify-between px-6 pb-4"
                    style={{ borderBottomWidth: 1, borderBottomColor: COLORS.surfaceBorder }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View 
                        className="p-2 rounded-xl"
                        style={{ backgroundColor: 'rgba(251, 191, 36, 0.2)' }}
                      >
                        <Bell size={24} color={COLORS.lime} />
                      </View>
                      <Text className="text-2xl font-bold" style={{ color: COLORS.lime }}>
                        What's New
                      </Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                      {initialViewMode === 'adminView' && (
                        <View className="flex-row gap-1 p-1 rounded-xl" style={{ backgroundColor: '#2a2a2a' }}>
                          <TouchableOpacity
                            onPress={() => setViewMode('barberView')}
                            className="px-3 py-1.5 rounded-lg flex-row items-center gap-1.5"
                            style={{
                              backgroundColor: viewMode === 'barberView' ? 'rgba(74, 124, 89, 0.4)' : 'transparent'
                            }}
                          >
                            <Eye size={14} color={viewMode === 'barberView' ? '#a8d5ba' : 'rgba(255, 255, 255, 0.6)'} />
                            <Text 
                              className="text-xs font-semibold"
                              style={{ color: viewMode === 'barberView' ? '#a8d5ba' : 'rgba(255, 255, 255, 0.6)' }}
                            >
                              User
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setViewMode('adminView')}
                            className="px-3 py-1.5 rounded-lg flex-row items-center gap-1.5"
                            style={{
                              backgroundColor: viewMode === 'adminView' ? 'rgba(107, 90, 124, 0.4)' : 'transparent'
                            }}
                          >
                            <Shield size={14} color={viewMode === 'adminView' ? '#c5a8d5' : 'rgba(255, 255, 255, 0.6)'} />
                            <Text 
                              className="text-xs font-semibold"
                              style={{ color: viewMode === 'adminView' ? '#c5a8d5' : 'rgba(255, 255, 255, 0.6)' }}
                            >
                              Admin
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <TouchableOpacity onPress={closeModal} className="p-2 rounded-xl">
                        <X size={24} color={COLORS.textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </GestureDetector>

              {/* Content */}
              <ScrollView
                className="flex-1 px-6"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: Math.max(insets.bottom + 80, 80) }}
              >
                {loading ? (
                  <View className="items-center justify-center py-12">
                    <ActivityIndicator size="large" color={COLORS.lime} />
                    <Text className="mt-4" style={{ color: COLORS.textMuted }}>
                      Loading features...
                    </Text>
                  </View>
                ) : majorVersions.length === 0 ? (
                  <View className="items-center justify-center py-12">
                    <Bell size={64} color={COLORS.textMuted} />
                    <Text className="text-lg mt-4" style={{ color: COLORS.textMuted }}>
                      No updates yet
                    </Text>
                    <Text className="text-sm mt-2" style={{ color: COLORS.textMuted }}>
                      Check back soon for new features!
                    </Text>
                  </View>
                ) : currentGroup ? (
                  <View className="mt-4">
                    {currentGroup.minorGroups.map((minorGroup, index) => {
                      const key = `${currentGroup.majorVersion}.${minorGroup.minorVersion}`;
                      const isExpanded = expandedMinorVersion === key;
                      
                      return (
                        <View 
                          key={key} 
                          className="rounded-2xl overflow-hidden mb-4"
                          style={{ borderWidth: 1, borderColor: COLORS.surfaceBorder }}
                        >
                          {/* Minor Version Header */}
                          <TouchableOpacity
                            onPress={() => toggleMinorVersion(currentGroup.majorVersion, minorGroup.minorVersion)}
                            className="flex-row items-center justify-between p-4"
                            style={{ backgroundColor: 'rgba(85, 105, 75, 0.1)' }}
                          >
                            <View className="flex-row items-center gap-3 flex-1">
                              <Text className="text-lg font-bold" style={{ color: COLORS.text }}>
                                Version {currentGroup.majorVersion}.{minorGroup.minorVersion}
                              </Text>
                              <View 
                                className="px-2 py-0.5 rounded-full"
                                style={{ backgroundColor: 'rgba(85, 105, 75, 0.4)' }}
                              >
                                <Text className="text-xs font-semibold" style={{ color: '#d4e7c5' }}>
                                  {minorGroup.features.length} {minorGroup.features.length === 1 ? 'update' : 'updates'}
                                </Text>
                              </View>
                              {minorGroup.isLatest && (
                                <View 
                                  className="px-2 py-0.5 rounded-full"
                                  style={{ 
                                    backgroundColor: 'rgba(190, 242, 100, 0.2)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(190, 242, 100, 0.4)'
                                  }}
                                >
                                  <Text className="text-xs font-semibold" style={{ color: COLORS.lime }}>
                                    Latest
                                  </Text>
                                </View>
                              )}
                            </View>
                            {isExpanded ? (
                              <ChevronUp size={20} color={COLORS.textMuted} />
                            ) : (
                              <ChevronDown size={20} color={COLORS.textMuted} />
                            )}
                          </TouchableOpacity>

                          {/* Features List */}
                          {isExpanded && (
                            <View className="p-4" style={{ backgroundColor: COLORS.surface }}>
                              {minorGroup.features.map((feature) => {
                                const categoryColors = getCategoryColor(feature.category);
                                
                                return (
                                  <View
                                    key={feature.id}
                                    className="mb-4 p-4 rounded-xl"
                                    style={{ 
                                      backgroundColor: COLORS.surface,
                                      borderWidth: 1,
                                      borderColor: COLORS.surfaceBorder
                                    }}
                                  >
                                    {/* Feature Header */}
                                    <View className="flex-row items-start justify-between mb-2">
                                      <View className="flex-1">
                                        <View className="flex-row items-center gap-2 mb-1.5 flex-wrap">
                                          <View 
                                            className="px-2 py-0.5 rounded"
                                            style={{ backgroundColor: 'rgba(85, 105, 75, 0.4)' }}
                                          >
                                            <Text 
                                              className="text-[10px] font-mono"
                                              style={{ color: COLORS.lime }}
                                            >
                                              v{feature.version}
                                            </Text>
                                          </View>
                                          <View 
                                            className="px-2 py-0.5 rounded-lg"
                                            style={{ 
                                              backgroundColor: categoryColors.bg,
                                              borderWidth: 1,
                                              borderColor: categoryColors.border
                                            }}
                                          >
                                            <Text 
                                              className="text-[10px] font-semibold"
                                              style={{ color: categoryColors.text }}
                                            >
                                              {feature.category.charAt(0).toUpperCase() + feature.category.slice(1)}
                                            </Text>
                                          </View>
                                          {viewMode === 'adminView' && !feature.is_published && (
                                            <View 
                                              className="px-2 py-0.5 rounded-lg"
                                              style={{ 
                                                backgroundColor: 'rgba(251, 191, 36, 0.2)',
                                                borderWidth: 1,
                                                borderColor: 'rgba(251, 191, 36, 0.4)'
                                              }}
                                            >
                                              <Text className="text-[10px] font-semibold" style={{ color: COLORS.amber }}>
                                                Draft
                                              </Text>
                                            </View>
                                          )}
                                        </View>
                                        <Text className="text-sm font-bold" style={{ color: COLORS.text }}>
                                          {feature.title}
                                        </Text>
                                      </View>
                                      <View className="flex-col items-end gap-1 ml-3">
                                        <Text className="text-[10px]" style={{ color: COLORS.textMuted }}>
                                          {new Date(feature.released_at).toLocaleDateString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                          })}
                                        </Text>
                                        {viewMode === 'adminView' && (
                                          <Text className="text-[10px]" style={{ color: COLORS.textMuted }}>
                                            {feature.platform === 'both' ? '🌐📱' : feature.platform === 'web' ? '🌐' : '📱'}
                                          </Text>
                                        )}
                                      </View>
                                    </View>

                                    {/* Description */}
                                    <View className="mt-2">
                                      <Markdown
                                        style={{
                                          body: { color: '#d1d5db', fontSize: 12, lineHeight: 18 },
                                          heading1: { color: COLORS.text, fontSize: 18, fontWeight: 'bold', marginTop: 8, marginBottom: 4 },
                                          heading2: { color: COLORS.text, fontSize: 16, fontWeight: 'bold', marginTop: 6, marginBottom: 4 },
                                          heading3: { color: COLORS.text, fontSize: 14, fontWeight: 'bold', marginTop: 6, marginBottom: 2 },
                                          bullet_list: { marginVertical: 4 },
                                          ordered_list: { marginVertical: 4 },
                                          list_item: { color: '#d1d5db', fontSize: 12, marginVertical: 2 },
                                          paragraph: { color: '#d1d5db', fontSize: 12, marginVertical: 4 },
                                          strong: { color: COLORS.text, fontWeight: '600' },
                                          em: { color: '#e5e7eb', fontStyle: 'italic' },
                                          link: { color: COLORS.lime },
                                          code_inline: { 
                                            color: COLORS.lime, 
                                            backgroundColor: '#2a2a2a', 
                                            paddingHorizontal: 4,
                                            paddingVertical: 2,
                                            borderRadius: 4,
                                            fontSize: 11,
                                            fontFamily: 'monospace'
                                          },
                                          code_block: {
                                            color: COLORS.lime,
                                            backgroundColor: '#2a2a2a',
                                            padding: 8,
                                            borderRadius: 8,
                                            fontSize: 11,
                                            fontFamily: 'monospace',
                                            marginVertical: 4
                                          }
                                        }}
                                      >
                                        {feature.description}
                                      </Markdown>
                                    </View>

                                    {/* Media */}
                                    {feature.image_url && (
                                      <View 
                                        className="mt-3 rounded-xl overflow-hidden"
                                        style={{ borderWidth: 1, borderColor: COLORS.surfaceBorder }}
                                      >
                                        <Image 
                                          source={{ uri: feature.image_url }}
                                          style={{ width: '100%', height: 200 }}
                                          resizeMode="cover"
                                        />
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ) : null}
              </ScrollView>

              {/* Footer Navigation */}
              {majorVersions.length > 1 && (
                <View 
                  className="flex-row items-center justify-between px-4 pt-4"
                  style={{ 
                    borderTopWidth: 1,
                    borderTopColor: COLORS.surfaceBorder,
                    backgroundColor: 'rgba(26, 31, 27, 0.5)',
                    paddingBottom: Math.max(insets.bottom + 16, 16)
                  }}
                >
                  <TouchableOpacity
                    onPress={handlePrevious}
                    disabled={currentPage === 0}
                    className="flex-row items-center gap-2 px-4 py-2 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(85, 105, 75, 0.4)',
                      opacity: currentPage === 0 ? 0.3 : 1
                    }}
                  >
                    <ChevronLeft size={20} color={COLORS.text} />
                    <Text className="text-sm font-medium" style={{ color: COLORS.text }}>
                      Next
                    </Text>
                  </TouchableOpacity>

                  <View className="flex-row items-center gap-2">
                    {majorVersions.map((group, index) => (
                      <TouchableOpacity
                        key={index}
                        onPress={() => {
                          setCurrentPage(index);
                          const latestMinor = group.minorGroups.find(g => g.isLatest);
                          if (latestMinor) {
                            setExpandedMinorVersion(`${group.majorVersion}.${latestMinor.minorVersion}`);
                          } else {
                            setExpandedMinorVersion(null);
                          }
                        }}
                        style={{
                          width: index === currentPage ? 32 : 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: index === currentPage ? COLORS.lime : '#4b5563',
                        }}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={handleNext}
                    disabled={currentPage === majorVersions.length - 1}
                    className="flex-row items-center gap-2 px-4 py-2 rounded-xl"
                    style={{
                      backgroundColor: 'rgba(85, 105, 75, 0.4)',
                      opacity: currentPage === majorVersions.length - 1 ? 0.3 : 1
                    }}
                  >
                    <Text className="text-sm font-medium" style={{ color: COLORS.text }}>
                      Previous
                    </Text>
                    <ChevronRight size={20} color={COLORS.text} />
                  </TouchableOpacity>
                </View>
              )}
            </Animated.View>
          </View>
        </Animated.View>
      </GestureHandlerRootView>
    </Modal>
  );
}