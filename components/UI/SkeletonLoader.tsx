/**
 * SkeletonLoader Component
 * 
 * A reusable skeleton loading component for showing placeholder content
 * while data is being fetched. Uses subtle shimmer animation.
 */

import { COLORS, RADIUS } from '@/constants/design-system';
import React, { useEffect, useRef } from 'react';
import { Animated, DimensionValue, View, ViewStyle } from 'react-native';

interface SkeletonProps {
  /** Width of the skeleton (number for pixels, string for percentage) */
  width?: DimensionValue;
  /** Height of the skeleton in pixels */
  height?: number;
  /** Border radius */
  borderRadius?: number;
  /** Additional style */
  style?: ViewStyle;
}

/**
 * Single skeleton placeholder with shimmer animation
 */
export function Skeleton({ 
  width = '100%', 
  height = 16, 
  borderRadius = RADIUS.sm,
  style 
}: SkeletonProps) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });

  return (
    <Animated.View
      style={[
        {
          width: width as DimensionValue,
          height,
          borderRadius,
          backgroundColor: COLORS.surfaceElevated,
        },
        { opacity },
        style,
      ]}
    />
  );
}

/**
 * Skeleton for a report list item (badge + two lines of text)
 */
export function ReportItemSkeleton() {
  return (
    <View 
      className="flex-row items-center py-3"
      style={{ borderBottomWidth: 1, borderBottomColor: COLORS.border }}
    >
      {/* Badge skeleton */}
      <Skeleton width={44} height={44} borderRadius={RADIUS.lg} />
      
      {/* Text content */}
      <View className="flex-1 ml-3">
        <Skeleton width="60%" height={16} style={{ marginBottom: 6 }} />
        <Skeleton width="40%" height={12} />
      </View>
      
      {/* Arrow placeholder */}
      <Skeleton width={20} height={20} borderRadius={RADIUS.full} />
    </View>
  );
}

/**
 * Skeleton for reports section (header + multiple items)
 */
export function ReportSectionSkeleton({ itemCount = 3 }: { itemCount?: number }) {
  return (
    <View>
      {/* Section header */}
      <View className="flex-row items-center mb-4">
        <Skeleton width={120} height={18} />
      </View>
      
      {/* Items */}
      {Array.from({ length: itemCount }).map((_, index) => (
        <ReportItemSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Skeleton for client card
 */
export function ClientCardSkeleton() {
  return (
    <View 
      className="p-4 rounded-xl mb-3"
      style={{ 
        backgroundColor: COLORS.surfaceGlass,
        borderWidth: 1,
        borderColor: COLORS.glassBorder,
      }}
    >
      <View className="flex-row items-center">
        {/* Avatar skeleton */}
        <Skeleton width={48} height={48} borderRadius={RADIUS.full} />
        
        {/* Content */}
        <View className="flex-1 ml-3">
          <View className="flex-row items-center justify-between mb-2">
            <Skeleton width="50%" height={18} />
            <Skeleton width={60} height={20} borderRadius={RADIUS.full} />
          </View>
          <Skeleton width="70%" height={14} />
        </View>
      </View>
    </View>
  );
}

/**
 * Skeleton for client list (multiple cards)
 */
export function ClientListSkeleton({ itemCount = 5 }: { itemCount?: number }) {
  return (
    <View>
      {Array.from({ length: itemCount }).map((_, index) => (
        <ClientCardSkeleton key={index} />
      ))}
    </View>
  );
}

/**
 * Full-page skeleton for reports tab
 */
export function ReportsPageSkeleton() {
  return (
    <View className="flex-1 px-4 pt-4">
      {/* Weekly Reports Section */}
      <ReportSectionSkeleton itemCount={4} />
      
      <View className="h-8" />
      
      {/* Weekly Comparison Section */}
      <ReportSectionSkeleton itemCount={1} />
      
      <View className="h-8" />
      
      {/* Monthly Section */}
      <ReportSectionSkeleton itemCount={1} />
    </View>
  );
}

export default Skeleton;
