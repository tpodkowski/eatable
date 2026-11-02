import { useMemo } from "react";
import type { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useAppTheme } from "../providers/AppThemeProvider";

interface AppScreenProps extends React.PropsWithChildren {
  footer?: ReactNode;
}

export function AppScreen({ children, footer }: AppScreenProps) {
  const { name, colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={name === "dark" ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>{children}</View>
        </ScrollView>
        {footer ? (
          <View pointerEvents="box-none" style={styles.footer}>
            <View style={styles.footerContent}>{footer}</View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: { background: string; border: string }) {
  return StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, paddingBottom: 92 },
    content: { paddingHorizontal: 28, paddingTop: 44, paddingBottom: 40, width: "100%", maxWidth: 560, alignSelf: "center" },
    footer: { alignItems: "center", backgroundColor: "transparent", bottom: 0, left: 0, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 10, position: "absolute", right: 0, zIndex: 1 },
    footerContent: { width: "100%", maxWidth: 520 },
  });
}
