import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { CreateMealEntryInput } from "@eatable/shared";
import { AppScreen } from "../../components/AppScreen";
import { authClient } from "../../lib/auth-client";
import { formatDate, localDateKey, shiftDate } from "../../lib/dates";
import { useAppTheme } from "../../providers/AppThemeProvider";
import { MealCard } from "./MealCard";
import { useDailyMeals } from "./useDailyMeals";

export function DailyPlanScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const { date, setDate, dailyMeals, isLoading, error, addEntry } = useDailyMeals(session?.user.id);
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const locale = i18n.resolvedLanguage === "pl" ? "pl-PL" : "en-US";

  function saveEntry(mealTypeId: string, entry: Omit<CreateMealEntryInput, "date">) {
    return addEntry(mealTypeId, entry);
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>EATABLE</Text>
        <Pressable
          accessibilityLabel={t("app.openSettings")}
          accessibilityRole="button"
          onPress={() => router.push("/settings")}
          style={styles.avatarButton}
        >
          <Text style={styles.avatarText}>{getInitials(session?.user.name || session?.user.email || "User")}</Text>
        </Pressable>
      </View>

      <View style={styles.dayPicker}>
        <Pressable
          accessibilityLabel={t("app.previousDay")}
          accessibilityRole="button"
          onPress={() => {
            setDate((current) => shiftDate(current, -1));
            setActiveMealId(null);
          }}
          style={styles.dayArrow}
        >
          <Text style={styles.dayArrowText}>‹</Text>
        </Pressable>
        <View style={styles.dayHeading}>
          <Text style={styles.dayEyebrow}>{t(date === localDateKey(new Date()) ? "planner.today" : "planner.dayPlan")}</Text>
          <Text style={styles.dayDate}>{formatDate(date, locale)}</Text>
        </View>
        <Pressable
          accessibilityLabel={t("app.nextDay")}
          accessibilityRole="button"
          onPress={() => {
            setDate((current) => shiftDate(current, 1));
            setActiveMealId(null);
          }}
          style={styles.dayArrow}
        >
          <Text style={styles.dayArrowText}>›</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.muted}>{t("planner.loadingMeals")}</Text>
        </View>
      ) : error ? (
        <Text accessibilityRole="alert" style={styles.error}>{t(error)}</Text>
      ) : (
        <View style={styles.mealList}>
          {dailyMeals?.mealTypes.map((mealType) => (
            <MealCard
              key={mealType.id}
              mealType={mealType}
              entryFormOpen={activeMealId === mealType.id}
              onOpenEntryForm={() => setActiveMealId(mealType.id)}
              onCloseEntryForm={() => setActiveMealId(null)}
              onAddEntry={(entry) => saveEntry(mealType.id, entry)}
            />
          ))}
        </View>
      )}
    </AppScreen>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`
    : parts[0]?.slice(0, 2) ?? "U").toLocaleUpperCase("pl-PL");
}

function createStyles(colors: { blue: string; danger: string; muted: string; orange: string; primary: string; surface: string; surfaceAlt: string; text: string; violet: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    eyebrow: { color: colors.blue, fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
    avatarButton: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
    avatarText: { color: colors.violet, fontSize: 14, fontWeight: "700" },
    dayPicker: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginTop: 30 },
    dayArrow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.surfaceAlt, borderRadius: 14, borderWidth: 1, height: 44, justifyContent: "center", width: 44 },
    dayArrowText: { color: colors.primary, fontSize: 30, fontWeight: "400", lineHeight: 34, marginTop: -3 },
    dayHeading: { alignItems: "center", flex: 1, paddingHorizontal: 8 },
    dayEyebrow: { color: colors.orange, fontSize: 10, fontWeight: "700", letterSpacing: 1.8 },
    dayDate: { color: colors.text, fontSize: 15, fontWeight: "600", marginTop: 5, textAlign: "center" },
    loading: { alignItems: "center", gap: 10, paddingVertical: 40 },
    muted: { color: colors.muted, fontSize: 14 },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 20 },
    mealList: { gap: 12, marginTop: 22 },
  });
}
