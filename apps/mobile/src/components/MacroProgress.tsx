import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../providers/AppThemeProvider";
import { getProgressRatio } from "../lib/macro-progress";

export type MacroProgressItem = {
  key: "protein" | "fat" | "carbohydrates";
  label: string;
  consumed: number;
  target: number;
  color: string;
};

export function MacroProgress({ items, diameter = 76 }: { items: MacroProgressItem[]; diameter?: number }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors, diameter), [colors, diameter]);
  const { t } = useTranslation();
  const ringWidth = Math.max(3, Math.round(diameter / 15));
  const radius = diameter / 2 - ringWidth / 2 - 2;
  const segmentCount = Math.ceil((2 * Math.PI * radius) / 1.7);
  const segmentWidth = (2 * Math.PI * radius) / segmentCount + 0.3;

  return (
    <View style={[styles.row, { marginTop: diameter < 70 ? 12 : 20 }]}>
      {items.map((item) => {
        const activeSegments = Math.round(getProgressRatio(item.consumed, item.target) * segmentCount);
        return (
          <View key={item.key} style={styles.item} accessibilityRole="progressbar" accessibilityLabel={t("dashboard.macroProgress", { name: item.label, consumed: item.consumed, target: item.target })} accessibilityValue={{ min: 0, max: item.target, now: Math.min(item.consumed, item.target) }}>
            <View style={styles.ring}>
              {Array.from({ length: segmentCount }, (_, index) => {
                const angle = (index / segmentCount) * Math.PI * 2 - Math.PI / 2;
                return (
                  <View
                    key={index}
                    style={[
                      styles.segment,
                      {
                        backgroundColor: index < activeSegments ? item.color : colors.border,
                        height: ringWidth,
                        left: diameter / 2 + Math.cos(angle) * radius - segmentWidth / 2,
                        top: diameter / 2 + Math.sin(angle) * radius - ringWidth / 2,
                        transform: [{ rotate: `${(angle * 180) / Math.PI + 90}deg` }],
                        width: segmentWidth,
                      },
                    ]}
                  />
                );
              })}
              <View style={styles.centerValue}>
                <Text numberOfLines={1} style={styles.amount}>{item.consumed}</Text>
                <Text style={styles.target}>/ {item.target} g</Text>
              </View>
            </View>
            <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(colors: { border: string; muted: string; text: string }, diameter: number) {
  const compact = diameter < 70;
  return StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between" },
    item: { alignItems: "center", flex: 1 },
    ring: { alignItems: "center", height: diameter, justifyContent: "center", width: diameter },
    segment: { borderRadius: 3, position: "absolute" },
    centerValue: { alignItems: "center", justifyContent: "center", width: diameter - 12 },
    amount: { color: colors.text, fontSize: compact ? 14 : 17, fontWeight: "700", maxWidth: diameter - 12 },
    target: { color: colors.muted, fontSize: compact ? 9 : 10, marginTop: 1 },
    label: { color: colors.muted, fontSize: compact ? 10 : 11, fontWeight: "600", marginTop: compact ? 5 : 7 },
  });
}
