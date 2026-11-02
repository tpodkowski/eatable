import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useAppTheme } from "../providers/AppThemeProvider";

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  icon?: string;
  textOnly?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
  icon,
  textOnly = false,
  style,
}: ActionButtonProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading || disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: textOnly ? "transparent" : secondary ? colors.surface : colors.primary, borderColor: colors.border },
        secondary && styles.secondary,
        textOnly && styles.textOnly,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={textOnly ? colors.muted : secondary ? colors.text : colors.primaryText} /> : (
        <>
          {icon ? <Text accessibilityElementsHidden style={[styles.icon, { color: textOnly ? colors.muted : secondary ? colors.text : colors.primaryText }]}>{icon}</Text> : null}
          <Text style={[styles.text, textOnly && styles.textOnlyText, { color: textOnly ? colors.muted : secondary ? colors.text : colors.primaryText }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: 14, borderWidth: 1, flexDirection: "row", gap: 8, height: 54, justifyContent: "center", marginTop: 4 },
  secondary: { marginTop: 24 },
  textOnly: { alignSelf: "center", borderWidth: 0, height: 44, justifyContent: "center", marginTop: 32, paddingHorizontal: 0 },
  textOnlyText: { fontWeight: "500" },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  text: { fontSize: 16, fontWeight: "700" },
  icon: { fontSize: 18 },
});
