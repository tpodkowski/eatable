import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ActionButton } from "../../components/ActionButton";
import { AppScreen } from "../../components/AppScreen";
import { authErrorKey } from "../../lib/auth-errors";
import { authClient } from "../../lib/auth-client";
import { useAppTheme } from "../../providers/AppThemeProvider";

const googleSignInEnabled = process.env.EXPO_PUBLIC_GOOGLE_SIGN_IN_ENABLED === "true";

type AuthMode = "sign-in" | "sign-up";

export function AuthScreen({ mode }: { mode: AuthMode }) {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submitEmail() {
    setBusy(true);
    setMessage(null);
    try {
      const result = mode === "sign-up"
        ? await authClient.signUp.email({ name: name.trim(), email: email.trim(), password })
        : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setMessage(authErrorKey(result.error.message) ?? (mode === "sign-up" ? "errors.signUpFailed" : "errors.signInFailed"));
      }
    } catch (error) {
      setMessage(authErrorKey(error instanceof Error ? error.message : undefined) ?? "errors.network");
    } finally {
      setBusy(false);
    }
  }

  async function signInWithGoogle() {
    setBusy(true);
    setMessage(null);
    try {
      const result = await authClient.signIn.social({ provider: "google", callbackURL: "/" });
      if (result.error) setMessage(authErrorKey(result.error.message) ?? "errors.googleFailed");
    } catch (error) {
      setMessage(authErrorKey(error instanceof Error ? error.message : undefined) ?? "errors.googleFailed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppScreen>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>EATABLE</Text>
      </View>
      <Text style={styles.title}>{t(mode === "sign-in" ? "auth.signInTitle" : "auth.signUpTitle")}</Text>
      <Text style={styles.description}>
        {t(mode === "sign-in" ? "auth.signInDescription" : "auth.signUpDescription")}
      </Text>

      <View style={styles.form}>
        {mode === "sign-up" ? (
          <TextInput
            autoCapitalize="words"
            autoComplete="name"
            onChangeText={setName}
            placeholder={t("auth.namePlaceholder")}
            placeholderTextColor={colors.placeholder}
            returnKeyType="next"
            style={styles.input}
            value={name}
          />
        ) : null}
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder={t("auth.emailPlaceholder")}
          placeholderTextColor={colors.placeholder}
          returnKeyType="next"
          style={styles.input}
          textContentType="emailAddress"
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          onChangeText={setPassword}
          onSubmitEditing={submitEmail}
          placeholder={t("auth.passwordPlaceholder")}
          placeholderTextColor={colors.placeholder}
          returnKeyType="go"
          secureTextEntry
          style={styles.input}
          textContentType={mode === "sign-up" ? "newPassword" : "password"}
          value={password}
        />
        {message ? <Text accessibilityRole="alert" style={styles.error}>{t(message)}</Text> : null}
        <ActionButton
          title={t(mode === "sign-in" ? "auth.signIn" : "auth.signUp")}
          onPress={() => void submitEmail()}
          loading={busy}
          disabled={!email.trim() || !password || (mode === "sign-up" && !name.trim())}
        />
      </View>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>{t("auth.or")}</Text>
        <View style={styles.dividerLine} />
      </View>

      <Pressable
        accessibilityRole="button"
        disabled={busy || !googleSignInEnabled}
        onPress={() => void signInWithGoogle()}
        style={({ pressed }) => [
          styles.googleButton,
          !googleSignInEnabled && styles.disabled,
          pressed && googleSignInEnabled && styles.pressed,
        ]}
      >
        {busy ? <ActivityIndicator color={colors.blue} /> : <Text style={styles.googleMark}>G</Text>}
        <Text style={styles.googleText}>{t("auth.google")}</Text>
      </Pressable>
      {!googleSignInEnabled ? <Text style={styles.hint}>{t("auth.googleHint")}</Text> : null}

      <Pressable accessibilityRole="button" onPress={() => router.replace(mode === "sign-in" ? "/(auth)/sign-up" : "/(auth)/sign-in")} style={styles.switchMode}>
        <Text style={styles.switchText}>
          {t(mode === "sign-in" ? "auth.noAccount" : "auth.hasAccount")}
          <Text style={styles.switchAction}>{t(mode === "sign-in" ? "auth.register" : "auth.signIn")}</Text>
        </Text>
      </Pressable>
    </AppScreen>
  );
}

function createStyles(colors: { blue: string; border: string; danger: string; muted: string; placeholder: string; primary: string; surface: string; text: string }) {
  return StyleSheet.create({
    header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
    eyebrow: { color: colors.blue, fontSize: 12, fontWeight: "700", letterSpacing: 2.5 },
    title: { color: colors.text, fontSize: 48, fontWeight: "700", letterSpacing: -2, lineHeight: 52, marginTop: 34 },
    description: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 14 },
    form: { gap: 12, marginTop: 30 },
    input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, color: colors.text, fontSize: 16, height: 56, paddingHorizontal: 16 },
    error: { color: colors.danger, fontSize: 13, lineHeight: 19 },
    divider: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 24 },
    dividerLine: { backgroundColor: colors.border, flex: 1, height: 1 },
    dividerText: { color: colors.muted, fontSize: 11, fontWeight: "700", letterSpacing: 1 },
    googleButton: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 14, borderWidth: 1, flexDirection: "row", height: 54, justifyContent: "center", marginTop: 18 },
    googleMark: { color: colors.blue, fontSize: 19, fontWeight: "700", marginRight: 10 },
    googleText: { color: colors.text, fontSize: 15, fontWeight: "600", marginLeft: 10 },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.82 },
    hint: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 8, textAlign: "center" },
    switchMode: { alignItems: "center", marginTop: 23, padding: 8 },
    switchText: { color: colors.muted, fontSize: 14 },
    switchAction: { color: colors.primary, fontWeight: "700" },
  });
}
