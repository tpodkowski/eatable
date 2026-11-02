import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import { useAppTheme } from "../providers/AppThemeProvider";

interface ActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  secondary?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ActionButton({
  title,
  onPress,
  loading = false,
  disabled = false,
  secondary = false,
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
        { backgroundColor: secondary ? colors.surface : colors.primary, borderColor: colors.border },
        secondary && styles.secondary,
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={secondary ? colors.text : colors.primaryText} /> : (
        <Text style={[styles.text, { color: secondary ? colors.text : colors.primaryText }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", borderRadius: 14, borderWidth: 1, height: 54, justifyContent: "center", marginTop: 4 },
  secondary: { marginTop: 24 },
  disabled: { opacity: 0.5 },
  pressed: { opacity: 0.82 },
  text: { fontSize: 16, fontWeight: "700" },
});
