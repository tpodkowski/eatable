import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ScrollViewInstance } from "react-native";
import { getDateStrip, localDateKey } from "../../lib/dates";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { getDateStripArrowLayout } from "./date-strip-arrow-layout";

const DATE_STRIP_ITEM_WIDTH = 48;
const DATE_STRIP_ITEM_INTERVAL = 56;

type DateStripProps = {
  anchor: string;
  date: string;
  datesWithEntries: Set<string>;
  locale: string;
  onAnchorChange: (date: string) => void;
  onDateChange: (date: string) => void;
};

export function DateStrip({ anchor, date, datesWithEntries, locale, onAnchorChange, onDateChange }: DateStripProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const dateStripRef = useRef<ScrollViewInstance>(null);
  const [dateStripWidth, setDateStripWidth] = useState(0);
  const [todayOffscreenDirection, setTodayOffscreenDirection] = useState<"left" | "right" | null>(null);
  const dateStrip = useMemo(() => getDateStrip(anchor), [anchor]);
  const selectedDayIndex = dateStrip.indexOf(date);
  const today = localDateKey(new Date());
  const todayIndex = dateStrip.indexOf(today);
  const dateStripItemInterval = dateStripWidth > DATE_STRIP_ITEM_WIDTH
    ? (dateStripWidth - DATE_STRIP_ITEM_WIDTH) / Math.max(1, Math.round((dateStripWidth - DATE_STRIP_ITEM_WIDTH) / DATE_STRIP_ITEM_INTERVAL))
    : DATE_STRIP_ITEM_INTERVAL;
  useEffect(() => {
    if (!dateStrip.includes(date)) onAnchorChange(date);
  }, [date, dateStrip, onAnchorChange]);
  useEffect(() => {
    if (selectedDayIndex >= 0) dateStripRef.current?.scrollTo({ x: selectedDayIndex * dateStripItemInterval, y: 0, animated: true });
  }, [dateStrip, dateStripItemInterval, selectedDayIndex]);
  const todayJumpLayout = getDateStripArrowLayout(todayOffscreenDirection ?? "left", colors.background);

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        key={dateStrip[0]}
        ref={dateStripRef}
        contentOffset={{ x: Math.max(0, selectedDayIndex * dateStripItemInterval), y: 0 }}
        contentContainerStyle={[styles.items, { gap: dateStripItemInterval - DATE_STRIP_ITEM_WIDTH, paddingHorizontal: Math.max(0, (dateStripWidth - DATE_STRIP_ITEM_WIDTH) / 2) }]}
        decelerationRate="fast"
        horizontal
        onLayout={(event) => setDateStripWidth(event.nativeEvent.layout.width)}
        onScroll={(event) => {
          if (todayIndex < 0 || dateStripWidth === 0) return;
          const todayStart = todayIndex * dateStripItemInterval + Math.max(0, (dateStripWidth - DATE_STRIP_ITEM_WIDTH) / 2);
          const scrollX = event.nativeEvent.contentOffset.x;
          setTodayOffscreenDirection(todayStart + DATE_STRIP_ITEM_WIDTH < scrollX ? "left" : todayStart > scrollX + dateStripWidth ? "right" : null);
        }}
        scrollEventThrottle={100}
        snapToAlignment="start"
        snapToInterval={dateStripItemInterval}
        showsHorizontalScrollIndicator={false}
      >
        {dateStrip.map((dayKey) => {
          const [year, month, day] = dayKey.split("-").map(Number);
          const stripDate = new Date(year, month - 1, day, 12);
          const isSelected = dayKey === date;
          const hasEntries = datesWithEntries.has(dayKey);
          const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" }).format(stripDate).replace(/\.$/, "");
          const accessibilityDate = new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(stripDate);
          return (
            <Pressable key={dayKey} accessibilityLabel={accessibilityDate} accessibilityRole="button" accessibilityState={{ selected: isSelected }} onPress={() => onDateChange(dayKey)} style={[styles.dateButton, isSelected && styles.selectedDateButton]}>
              <Text style={[styles.weekdayText, isSelected && styles.selectedDateText]}>{weekday}</Text>
              <Text style={[styles.dayNumberText, isSelected && styles.selectedDateText]}>{day}</Text>
              {hasEntries ? <View style={[styles.entryDot, isSelected && styles.selectedEntryDot]} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>
      {todayOffscreenDirection ? (
        <View style={[styles.todayJumpOverlay, { width: todayJumpLayout.overlayWidth }, todayOffscreenDirection === "left" ? styles.todayJumpLeft : styles.todayJumpRight]}>
          <View pointerEvents="none" style={[styles.todayGradient, todayJumpLayout.gradient]}>
            {todayJumpLayout.gradient.opacityStops.map((opacity, index) => <View key={index} style={[styles.todayGradientBand, { opacity }]} />)}
          </View>
          <Pressable accessibilityLabel={t("planner.goToToday")} accessibilityRole="button" onPress={() => {
            if (todayIndex >= 0) dateStripRef.current?.scrollTo({ x: todayIndex * dateStripItemInterval, y: 0, animated: true });
            onDateChange(today);
          }} style={[styles.todayJumpButton, todayJumpLayout.button]}>
            <Text style={styles.todayJumpArrow}>{todayOffscreenDirection === "left" ? "‹" : "›"}</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: { background: string; blue: string; muted: string; primary: string; primaryText: string; text: string }) {
  return StyleSheet.create({
    container: { position: "relative" },
    scroll: { marginHorizontal: -16, marginVertical: 8 },
    todayJumpOverlay: { height: 78, position: "absolute", top: 0, zIndex: 4 },
    todayJumpLeft: { left: -16 },
    todayJumpRight: { right: -16 },
    todayGradient: { flexDirection: "row", height: "100%", position: "absolute", top: 0 },
    todayGradientBand: { backgroundColor: colors.background, flex: 1, height: "100%" },
    todayJumpButton: { alignItems: "center", height: "100%", justifyContent: "center", position: "absolute" },
    todayJumpArrow: { color: colors.primary, fontSize: 25, lineHeight: 28 },
    items: { gap: 8, paddingVertical: 4 },
    dateButton: { alignItems: "center", borderRadius: 16, height: 62, marginRight: 0, position: "relative", width: 48 },
    selectedDateButton: { backgroundColor: colors.blue },
    weekdayText: { color: colors.muted, fontSize: 11, fontWeight: "600", position: "absolute", textAlign: "center", textTransform: "uppercase", top: 12, width: "100%" },
    dayNumberText: { color: colors.text, fontSize: 16, fontWeight: "700", position: "absolute", textAlign: "center", top: 30, width: "100%" },
    entryDot: { backgroundColor: colors.blue, borderRadius: 3, bottom: 7, height: 6, position: "absolute", width: 6 },
    selectedEntryDot: { backgroundColor: "#FFFFFF" },
    selectedDateText: { color: colors.primaryText },
  });
}
