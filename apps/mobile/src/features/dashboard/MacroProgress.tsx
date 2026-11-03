import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { getProgressRatio } from "./macro-progress";

type MacroProgressItem = {
  key: "protein" | "fat" | "carbohydrates";
  label: string;
  consumed: number;
  target: number;
  color: string;
};

export function MacroProgress({ items }: { items: MacroProgressItem[] }) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      {items.map((item) => (
        <MacroProgressRing key={item.key} item={item} styles={styles} trackColor={colors.border} t={t} />
      ))}
    </View>
  );
}

function MacroProgressRing({ item, styles, trackColor, t }: {
  item: MacroProgressItem;
  styles: ReturnType<typeof createStyles>;
  trackColor: string;
  t: (key: string, options?: Record<string, string | number>) => string;
}) {
  const size = 76;
  const segmentCount = 40;
  const center = size / 2;
  const radius = 33;
  const ratio = getProgressRatio(item.consumed, item.target);
  const activeSegments = Math.round(ratio * segmentCount);

  return (
    <View style={styles.item} accessibilityRole="progressbar" accessibilityLabel={t("dashboard.macroProgress", { name: item.label, consumed: item.consumed, target: item.target })} accessibilityValue={{ min: 0, max: item.target, now: Math.min(item.consumed, item.target) }}>
      <View style={styles.ring}>
        {Array.from({ length: segmentCount }, (_, index) => {
          const angle = (index / segmentCount) * Math.PI * 2 - Math.PI / 2;
          return (
            <View
              key={index}
              style={[
                styles.segment,
                {
                  backgroundColor: index < activeSegments ? item.color : trackColor,
                  left: center + Math.cos(angle) * radius - 1.5,
                  top: center + Math.sin(angle) * radius - 2.5,
                  transform: [{ rotate: `${(angle * 180) / Math.PI + 90}deg` }],
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
}

function createStyles(colors: { border: string; muted: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between", marginTop: 20 },
    item: { alignItems: "center", flex: 1 },
    ring: { alignItems: "center", height: 76, justifyContent: "center", width: 76 },
    segment: { borderRadius: 2, height: 5, position: "absolute", width: 3 },
    centerValue: { alignItems: "center", justifyContent: "center", width: 60 },
    amount: { color: colors.text, fontSize: 17, fontWeight: "700", maxWidth: 60 },
    target: { color: colors.muted, fontSize: 10, marginTop: 1 },
    label: { color: colors.muted, fontSize: 11, fontWeight: "600", marginTop: 7 },
  });
}
