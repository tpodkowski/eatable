import { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useTranslation } from "react-i18next";
import { useAppTheme } from "../providers/AppThemeProvider";
import { getProgressRatio } from "../lib/macroProgress";

export type MacroProgressItem = {
  key: "protein" | "fat" | "carbohydrates";
  label: string;
  consumed: number;
  target: number;
  color: string;
};

type MacroProgressSize = "regular" | "compact";
type MacroProgressProps = { items: MacroProgressItem[]; size?: MacroProgressSize };

type MacroProgressItemViewProps = {
  accessibilityLabel: string;
  circumference: number;
  delay: number;
  diameter: number;
  item: MacroProgressItem;
  progress: number;
  radius: number;
  ringWidth: number;
  styles: ReturnType<typeof createStyles>;
  trackColor: string;
};

const DIAMETERS: Record<MacroProgressSize, number> = { regular: 76, compact: 58 };

export function MacroProgress({ items, size = "regular" }: MacroProgressProps) {
  const { colors } = useAppTheme();
  const diameter = DIAMETERS[size];
  const styles = useMemo(() => createStyles(colors, diameter), [colors, diameter]);
  const { t } = useTranslation();
  const ringWidth = Math.max(3, Math.round(diameter / 15));
  const radius = diameter / 2 - ringWidth / 2 - 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View style={[styles.row, { marginTop: size === "compact" ? 12 : 20 }]}>
      {items.map((item, index) => {
        const progress = getProgressRatio(item.consumed, item.target);
        return (
          <MacroProgressItemView
            key={item.key}
            accessibilityLabel={t("dashboard.macroProgress", { name: item.label, consumed: item.consumed, target: item.target })}
            circumference={circumference}
            delay={index * 110}
            diameter={diameter}
            item={item}
            progress={progress}
            radius={radius}
            ringWidth={ringWidth}
            styles={styles}
            trackColor={colors.border}
          />
        );
      })}
    </View>
  );
}

function MacroProgressItemView({
  accessibilityLabel,
  circumference,
  delay,
  diameter,
  item,
  progress,
  radius,
  ringWidth,
  styles,
  trackColor,
}: MacroProgressItemViewProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);

  useEffect(() => {
    let frame: number | undefined;
    let delayTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    setAnimatedProgress(0);
    delayTimer = setTimeout(() => {
      const startedAt = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - startedAt;
        const linearProgress = Math.min(elapsed / 850, 1);
        const easedProgress = 1 - Math.pow(1 - linearProgress, 3);
        setAnimatedProgress(progress * easedProgress);
        if (linearProgress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, delay);

    return () => {
      cancelled = true;
      if (delayTimer !== undefined) clearTimeout(delayTimer);
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, [delay, progress]);

  const strokeDashoffset = circumference * (1 - animatedProgress);

  return (
    <View style={styles.item} accessibilityRole="progressbar" accessibilityLabel={accessibilityLabel} accessibilityValue={{ min: 0, max: item.target, now: Math.min(item.consumed, item.target) }}>
      <View style={styles.ring}>
        <Svg height={diameter} style={styles.progressSvg} viewBox={`0 0 ${diameter} ${diameter}`} width={diameter}>
          <Circle cx={diameter / 2} cy={diameter / 2} fill="none" r={radius} stroke={trackColor} strokeWidth={ringWidth} />
          {progress > 0 && <Circle
            cx={diameter / 2}
            cy={diameter / 2}
            fill="none"
            r={radius}
            transform={`rotate(-90 ${diameter / 2} ${diameter / 2})`}
            stroke={item.color}
            strokeDasharray={`${circumference} ${circumference}`}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            strokeWidth={ringWidth}
          />}
        </Svg>
        <View style={styles.centerValue}>
          <Text numberOfLines={1} style={styles.amount}>{item.consumed}</Text>
          <Text style={styles.target}>/ {item.target} g</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={styles.label}>{item.label}</Text>
    </View>
  );
}

function createStyles(colors: { border: string; muted: string; text: string }, diameter: number) {
  const compact = diameter === DIAMETERS.compact;
  return StyleSheet.create({
    row: { flexDirection: "row", justifyContent: "space-between" },
    item: { alignItems: "center", flex: 1 },
    ring: { alignItems: "center", height: diameter, justifyContent: "center", width: diameter },
    progressSvg: { position: "absolute" },
    centerValue: { alignItems: "center", justifyContent: "center", width: diameter - 12 },
    amount: { color: colors.text, fontSize: compact ? 14 : 17, fontWeight: "700", maxWidth: diameter - 12 },
    target: { color: colors.muted, fontSize: compact ? 9 : 10, marginTop: 1 },
    label: { color: colors.muted, fontSize: compact ? 10 : 11, fontWeight: "600", marginTop: compact ? 5 : 7 },
  });
}
