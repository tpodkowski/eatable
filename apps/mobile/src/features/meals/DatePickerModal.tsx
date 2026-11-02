import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AppScreen } from "../../components/AppScreen";
import { localDateKey } from "../../lib/dates";
import { useAppTheme } from "../../providers/AppThemeProvider";

interface DatePickerModalProps {
  visible: boolean;
  date: string;
  locale: string;
  onClose: () => void;
  onSelect: (date: string) => void;
}

export function DatePickerModal({ visible, date, locale, onClose, onSelect }: DatePickerModalProps) {
  const { t } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [visibleMonth, setVisibleMonth] = useState(() => dateToDate(date));

  useEffect(() => {
    if (visible) setVisibleMonth(dateToDate(date));
  }, [date, visible]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(visibleMonth);
  const firstOfMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1);
  const daysInMonth = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth() + 1, 0).getDate();
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const weekdayLabels = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(2024, 0, 1 + index);
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(day);
  });

  function changeMonth(amount: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1));
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
      visible={visible}
    >
      <AppScreen>
        <View style={styles.header}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeText}>{t("app.back")}</Text>
          </Pressable>
          <Text style={styles.title}>{t("planner.chooseDate")}</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={() => onSelect(localDateKey(new Date()))} style={styles.todayButton}>
          <Text style={styles.todayText}>{t("planner.goToToday")}</Text>
        </Pressable>

        <View style={styles.monthHeader}>
          <Pressable accessibilityLabel={t("planner.previousMonth")} accessibilityRole="button" onPress={() => changeMonth(-1)} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>‹</Text>
          </Pressable>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <Pressable accessibilityLabel={t("planner.nextMonth")} accessibilityRole="button" onPress={() => changeMonth(1)} style={styles.monthArrow}>
            <Text style={styles.monthArrowText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.calendar}>
          {weekdayLabels.map((weekday, index) => (
            <Text key={`weekday-${index}`} style={styles.weekday}>{weekday}</Text>
          ))}
          {Array.from({ length: 42 }, (_, index) => {
            const dayNumber = index - mondayOffset + 1;
            const isInMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const day = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), dayNumber);
            const dayKey = localDateKey(day);
            const isSelected = dayKey === date;
            const isToday = dayKey === localDateKey(new Date());
            return (
              <Pressable
                key={index}
                accessibilityLabel={isInMonth ? new Intl.DateTimeFormat(locale, { dateStyle: "full" }).format(day) : undefined}
                accessibilityRole={isInMonth ? "button" : undefined}
                accessibilityState={isInMonth ? { selected: isSelected } : undefined}
                disabled={!isInMonth}
                onPress={() => onSelect(dayKey)}
                style={[styles.dayCell, isSelected && styles.selectedDay, isToday && !isSelected && styles.todayCell]}
              >
                <Text style={[styles.dayText, !isInMonth && styles.outsideDayText, isSelected && styles.selectedDayText, isToday && !isSelected && styles.todayText]}>
                  {isInMonth ? dayNumber : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </AppScreen>
    </Modal>
  );
}

function dateToDate(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function createStyles(colors: { border: string; muted: string; primary: string; surface: string; surfaceAlt: string; text: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    closeButton: { paddingVertical: 8, paddingRight: 12 },
    closeText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
    title: { color: colors.text, fontSize: 20, fontWeight: "700" },
    todayButton: { alignItems: "center", alignSelf: "stretch", backgroundColor: colors.primary, borderRadius: 14, justifyContent: "center", minHeight: 48, marginTop: 8 },
    todayText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
    monthHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 12, marginTop: 12 },
    monthArrow: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 12, height: 40, justifyContent: "center", width: 40 },
    monthArrowText: { color: colors.primary, fontSize: 28, lineHeight: 32, marginTop: -3 },
    monthLabel: { color: colors.text, fontSize: 17, fontWeight: "700", textTransform: "capitalize" },
    calendar: { flexDirection: "row", flexWrap: "wrap" },
    weekday: { color: colors.muted, fontSize: 12, fontWeight: "600", textAlign: "center", width: `${100 / 7}%`, paddingVertical: 10 },
    dayCell: { alignItems: "center", justifyContent: "center", width: `${100 / 7}%`, aspectRatio: 1 },
    selectedDay: { backgroundColor: colors.primary, borderRadius: 24 },
    todayCell: { backgroundColor: colors.surfaceAlt, borderRadius: 24 },
    dayText: { color: colors.text, fontSize: 14 },
    outsideDayText: { color: "transparent" },
    selectedDayText: { color: "#FFFFFF", fontWeight: "700" },
  });
}
