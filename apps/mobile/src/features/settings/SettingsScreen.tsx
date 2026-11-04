import { useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { AppScreen } from "../../components/AppScreen";
import { authErrorKey } from "../../lib/authErrors";
import { authClient } from "../../lib/authClient";
import { readLanguagePreference, saveLanguagePreference } from "../../lib/preferences";
import { updateProfileFromCalories, updateProfileFromMacro } from "./profileForm";
import { useProfileSettings } from "./useProfileSettings";
import { useAppTheme } from "../../providers/AppThemeProvider";
import type { AppLanguage } from "../../i18n/translations";

export function SettingsScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: session } = authClient.useSession();
  const [language, setLanguage] = useState<AppLanguage>(i18n.resolvedLanguage === "en" ? "en" : "pl");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { profile, setProfile, isSaving: profileBusy, message: profileMessage } = useProfileSettings(Boolean(session));

  useEffect(() => {
    let active = true;
    void readLanguagePreference()
      .then((storedLanguage) => {
        if (active && (storedLanguage === "pl" || storedLanguage === "en")) {
          setLanguage(storedLanguage);
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  async function changeLanguage(nextLanguage: AppLanguage) {
    setLanguage(nextLanguage);
    await i18n.changeLanguage(nextLanguage);
    try {
      await saveLanguagePreference(nextLanguage);
    } catch {
      // Keep the chosen language for this session if device storage is unavailable.
    }
  }

  async function signOut() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authClient.signOut();
      if (result.error) setMessage(authErrorKey(result.error.message) ?? "errors.logoutFailed");
    } catch (error) {
      setMessage(authErrorKey(error instanceof Error ? error.message : undefined) ?? "errors.logoutFailed");
    } finally {
      setBusy(false);
    }
  }

  function changeCalories(raw: string) {
    setProfile((current) => updateProfileFromCalories(current, raw));
  }

  function changeMacro(key: "dailyProteinLimit" | "dailyCarbohydratesLimit" | "dailyFatLimit", raw: string) {
    setProfile((current) => updateProfileFromMacro(current, key, raw));
  }

  return (
    <AppScreen>
      <Pressable accessibilityRole="button" onPress={() => router.replace("/")} style={styles.backButton}>
        <Text style={styles.backButtonText}>{t("app.back")}</Text>
      </Pressable>
      <Text style={styles.title}>{t("app.settings")}</Text>
      <Text style={styles.description}>{t("app.settingsDescription")}</Text>

      {session ? (
        <View style={styles.accountCard}>
          <View style={styles.accountAvatar}>
            <Text style={styles.avatarText}>{getInitials(session.user.name || session.user.email)}</Text>
          </View>
          <View style={styles.accountDetails}>
            {session.user.name ? <Text style={styles.accountName}>{session.user.name}</Text> : null}
            <Text style={styles.accountEmail}>{session.user.email}</Text>
          </View>
        </View>
      ) : null}

      {session ? (
        <View style={styles.calorieLimitSection}>
          <Text style={styles.goalHeading}>{t("settings.yourGoal")}</Text>
          <Text style={styles.preferenceLabel}>{t("settings.dailyCalorieLimit")}</Text>
          <TextInput
            accessibilityLabel={t("settings.dailyCalorieLimit")}
            keyboardType="number-pad"
            value={String(profile.dailyCalorieLimit)}
            onChangeText={changeCalories}
            style={styles.calorieLimitInput}
            maxLength={6}
          />
          <View style={styles.macroLimitInputs}>
          {(["dailyProteinLimit", "dailyFatLimit", "dailyCarbohydratesLimit"] as const).map((key) => (
            <View key={key} style={styles.macroLimitRow}>
              <Text style={styles.preferenceLabel}>{t(`settings.${key}`)}</Text>
              <TextInput accessibilityLabel={t(`settings.${key}`)} keyboardType="number-pad" value={String(profile[key])} onChangeText={(value) => changeMacro(key, value)} style={[styles.calorieLimitInput, styles.macroLimitInput]} maxLength={3} />
            </View>
          ))}
          </View>
          <Text style={styles.macroHint}>{t("settings.macroRatioHint")}</Text>
          {profileMessage ? <Text accessibilityRole={profileMessage === "settings.profileSaved" ? "text" : "alert"} style={profileMessage === "settings.profileSaved" ? styles.success : styles.error}>{t(profileMessage)}</Text> : profileBusy ? <Text style={styles.saveStatus}>{t("settings.savingCalorieLimit")}</Text> : null}
        </View>
      ) : null}

      <PreferenceOptions
        label={t("language.label")}
        options={[
          { value: "pl", label: t("language.polish"), icon: "🇵🇱" },
          { value: "en", label: t("language.english"), icon: "🇬🇧" },
        ]}
        selected={language}
        onSelect={(value) => void changeLanguage(value as AppLanguage)}
        styles={styles}
      />
      <PreferenceOptions
        label={t("theme.label")}
        options={[
          { value: "system", label: t("theme.system"), icon: "◐" },
          { value: "light", label: t("theme.light"), icon: "☀️" },
          { value: "dark", label: t("theme.dark"), icon: "🌙" },
        ]}
        selected={mode}
        onSelect={(value) => void setMode(value as "system" | "light" | "dark")}
        styles={styles}
      />

      {message ? <Text accessibilityRole="alert" style={styles.error}>{t(message)}</Text> : null}
      <ActionButton title={t("app.logout")} onPress={() => void signOut()} loading={busy} textOnly />
    </AppScreen>
  );
}

type PreferenceOptionsProps = {
  label: string;
  options: Array<{ value: string; label: string; icon?: string }>;
  selected: string;
  onSelect: (value: string) => void;
  styles: ReturnType<typeof createStyles>;
};

function PreferenceOptions({
  label,
  options,
  selected,
  onSelect,
  styles,
}: PreferenceOptionsProps) {
  return (
    <View style={styles.preferenceSection}>
      <Text style={styles.preferenceLabel}>{label}</Text>
      <View style={styles.preferenceOptions}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onSelect(option.value)}
              style={[styles.preferenceOption, isSelected && styles.preferenceOptionActive]}
            >
              {option.icon ? (
                <Text accessibilityElementsHidden style={styles.preferenceOptionIcon}>
                  {option.icon}
                </Text>
              ) : null}
              <Text style={[styles.preferenceOptionText, isSelected && styles.preferenceOptionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function getInitials(name: string) {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  return (parts.length > 1
    ? `${parts[0][0]}${parts[1][0]}`
    : parts[0]?.slice(0, 2) ?? "U").toLocaleUpperCase("pl-PL");
}

function createStyles(colors: { background: string; border: string; danger: string; muted: string; pink: string; primary: string; surface: string; surfaceAlt: string; text: string; violet: string }) {
  return StyleSheet.create({
    backButton: { alignSelf: "flex-start", marginTop: 6, paddingVertical: 8, paddingRight: 12 },
    backButtonText: { color: colors.primary, fontSize: 15, fontWeight: "600" },
    title: { color: colors.text, fontSize: 48, fontWeight: "700", letterSpacing: -2, lineHeight: 52, marginTop: 24 },
    description: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 14 },
    accountCard: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 17, borderWidth: 1, flexDirection: "row", gap: 14, marginTop: 28, padding: 17 },
    accountAvatar: { alignItems: "center", backgroundColor: colors.surfaceAlt, borderColor: colors.pink, borderRadius: 24, borderWidth: 1, height: 48, justifyContent: "center", width: 48 },
    avatarText: { color: colors.violet, fontSize: 14, fontWeight: "700" },
    accountDetails: { flex: 1, gap: 4 },
    accountName: { color: colors.text, fontSize: 15, fontWeight: "600" },
    accountEmail: { color: colors.muted, fontSize: 13 },
    preferenceSection: { marginTop: 28 },
    calorieLimitSection: { marginTop: 28 },
    goalHeading: { color: colors.text, fontSize: 20, fontWeight: "700", marginBottom: 18 },
    macroLimitInputs: { flexDirection: "row", gap: 10, marginTop: 12 },
    macroLimitRow: { flex: 1, gap: 5 },
    macroLimitInput: { height: 52, paddingHorizontal: 10, width: 72 },
    macroHint: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 10 },
    calorieLimitInput: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 16, minHeight: 52, paddingHorizontal: 14 },
    preferenceLabel: { color: colors.text, fontSize: 14, fontWeight: "600", marginBottom: 10 },
    preferenceOptions: { flexDirection: "row", gap: 10 },
    preferenceOption: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 64, justifyContent: "center", paddingHorizontal: 8, paddingVertical: 8 },
    preferenceOptionActive: { backgroundColor: colors.surfaceAlt, borderColor: colors.primary },
    preferenceOptionIcon: { color: colors.text, fontSize: 20, lineHeight: 24, marginBottom: 2 },
    preferenceOptionText: { color: colors.muted, fontSize: 14, fontWeight: "600" },
    preferenceOptionTextActive: { color: colors.primary },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19, marginTop: 20 },
    success: { color: colors.primary, fontSize: 13, lineHeight: 19, marginTop: 12 },
    saveStatus: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 12 },
  });
}
