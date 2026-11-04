import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { isGlobalLoading, subscribeGlobalLoading } from "../lib/globalLoading";
import { rainbowColors } from "../theme";

const RUNNER_OPACITY = [0.08, 0.18, 0.34, 0.56, 0.8, 1, 1, 0.8, 0.56, 0.34, 0.18, 0.08];

export function GlobalLoadingIndicator() {
  const loading = useSyncExternalStore(subscribeGlobalLoading, isGlobalLoading, () => false);
  const position = useRef(new Animated.Value(-1)).current;
  const styles = useMemo(() => StyleSheet.create({
    track: { elevation: 20, flexDirection: "row", height: 3, left: 0, overflow: "hidden", position: "absolute", right: 0, top: 0, zIndex: 10000 },
    segment: { flex: 1 },
    runner: { flexDirection: "row", height: 3, position: "absolute", width: "45%" },
  }), []);

  useEffect(() => {
    if (!loading) {
      position.stopAnimation();
      position.setValue(-1);
      return;
    }
    const animation = Animated.loop(Animated.timing(position, {
      toValue: 3,
      duration: 1200,
      easing: Easing.linear,
      useNativeDriver: true,
    }));
    animation.start();
    return () => animation.stop();
  }, [loading, position]);

  return (
    <View pointerEvents="none" style={styles.track}>
      {rainbowColors.map((color) => <View key={`base-${color}`} style={[styles.segment, { backgroundColor: color, opacity: 0.55 }]} />)}
      {loading ? <Animated.View style={[styles.runner, { transform: [{ translateX: position.interpolate({ inputRange: [-1, 3], outputRange: [-220, 500] }) }] }]}>
        {RUNNER_OPACITY.map((opacity, index) => <View key={index} style={[styles.segment, { backgroundColor: rainbowColors[Math.floor(index / 2) % rainbowColors.length], opacity }]} />)}
      </Animated.View> : null}
    </View>
  );
}
