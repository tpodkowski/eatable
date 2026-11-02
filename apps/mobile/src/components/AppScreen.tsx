import { useMemo } from "react";
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

export function AppScreen({ children }: React.PropsWithChildren) {
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: { background: string }) {
  return StyleSheet.create({
    flex: { flex: 1 },
    screen: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1 },
    content: { paddingHorizontal: 28, paddingTop: 44, paddingBottom: 40, width: "100%", maxWidth: 560, alignSelf: "center" },
  });
}
