import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { AutoSizeText, ResizeTextMode } from "react-native-auto-size-text";

interface DailyRevenueCardProps {
  userId: string;
  selectedDate?: string;
}

export default function DailyRevenueCardRN({
  userId,
  selectedDate,
}: DailyRevenueCardProps) {

  const mockRevenue = 420;
  const mockPrevRevenue = 380;
  const mockPrevDate = "2025-01-19";

  const [revenue] = useState<number | null>(mockRevenue);
  const [prevRevenue] = useState<number | null>(mockPrevRevenue);
  const [prevDate] = useState<string | null>(mockPrevDate);
  const [loading] = useState(false);

  const formatCurrency = (n: number) =>
    `$${n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;

  const change =
    revenue && prevRevenue
      ? (((revenue - prevRevenue) / prevRevenue) * 100).toFixed(1)
      : null;

  return (
    <Animated.View entering={FadeInUp.duration(450)} style={styles.card}>
      
      {/* Title */}
      <View style={styles.lineContainer}>
        <AutoSizeText
          fontSize={11}
          numberOfLines={1}
          mode={ResizeTextMode.max_lines}
          style={styles.title}
        >
          💰 Daily Revenue
        </AutoSizeText>
      </View>

      {/* Value */}
      <View style={styles.center}>
        <View style={styles.bigLineContainer}>
          <AutoSizeText
            fontSize={26}
            numberOfLines={1}
            mode={ResizeTextMode.max_lines}
            style={styles.value}
          >
            {loading ? "Loading…" : formatCurrency(revenue || 0)}
          </AutoSizeText>
        </View>
      </View>

      {/* Change */}
      {change !== null ? (
        <>
          {/* colored % */}
          <View style={styles.lineContainer}>
            <AutoSizeText
              fontSize={12}
              numberOfLines={1}
              mode={ResizeTextMode.max_lines}
              style={[
                styles.change,
                parseFloat(change) > 0
                  ? styles.positive
                  : parseFloat(change) < 0
                  ? styles.negative
                  : styles.neutral,
              ]}
            >
              {parseFloat(change) > 0 ? "+" : ""}
              {change}%
            </AutoSizeText>
          </View>

          {/* grey text — like monthly card */}
          <View style={styles.lineContainer}>
            <AutoSizeText
              fontSize={12}
              numberOfLines={1}
              mode={ResizeTextMode.max_lines}
              style={styles.prevDate}
            >
              (vs prior day)
            </AutoSizeText>
          </View>
        </>
      ) : (
        <View style={styles.lineContainer}>
          <AutoSizeText
            fontSize={12}
            numberOfLines={1}
            mode={ResizeTextMode.max_lines}
            style={styles.prevDate}
          >
            —
          </AutoSizeText>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#161a16",
    borderWidth: 1,
    borderColor: "rgba(196,255,133,0.2)",
    shadowColor: "#c4ff85",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },

  lineContainer: {
    minHeight: 20,
    maxHeight: 20,
    justifyContent: "center",
    width: "100%",
  },

  bigLineContainer: {
    minHeight: 42,
    maxHeight: 42,
    justifyContent: "center",
    width: "100%",
  },

  title: { fontWeight: "700", color: "#E8EDC7" },

  center: { flex: 1, justifyContent: "center" },

  value: {
    fontWeight: "800",
    color: "#F5E6C5",
    textShadowColor: "rgba(255,255,255,0.15)",
    textShadowRadius: 6,
  },

  change: { fontWeight: "600" },
  positive: { color: "#8fff81" },
  negative: { color: "#ff6b6b" },
  neutral: { color: "#9b9b9b" },

  prevDate: { color: "#777" },
});
