import { Pressable, StyleSheet, Text } from "react-native";
import { useAppTheme } from "../providers/AppThemeProvider";

interface BrandLogoProps {
  accessibilityLabel?: string;
  onPress?: () => void;
}

export function BrandLogo({ accessibilityLabel, onPress }: BrandLogoProps) {
  const { colors } = useAppTheme();
  const logo = (
    <Text style={styles.wordmark}>
      {"EATABLE".split("").map((letter, index) => (
        <Text key={`${letter}-${index}`} style={{ color: colors.primary }}>{letter}</Text>
      ))}
      <Text style={styles.emoji}> 🍝</Text>
    </Text>
  );

  if (!onPress) return logo;

  return (
    <Pressable accessibilityLabel={accessibilityLabel} accessibilityRole="button" onPress={onPress}>
      {logo}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wordmark: { fontFamily: "cursive", fontSize: 17, fontWeight: "700", letterSpacing: 0.3 },
  emoji: { fontFamily: "System", fontSize: 16 },
});
