import { useEffect, useRef } from "react";
import { Animated, Easing, View } from "react-native";

export function SkeletonBlock({ width, height, color, radius = 8 }: { width: number | `${number}%`; height: number; color: string; radius?: number }) {
  const opacity = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(opacity, { toValue: 0.9, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0.45, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);
  return <Animated.View style={{ backgroundColor: color, borderRadius: radius, height, opacity, width }} />;
}
