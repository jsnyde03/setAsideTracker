import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { colors } from "../theme";

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
}

// react-native-web's rAF-driven Animated can stall mid-transition on backgrounded/headless
// tabs, leaving the screen permanently semi-transparent — skip the entrance animation there.
const ANIMATE_ENTRANCE = Platform.OS !== "web";

export function Screen({ children, style, edges = ["top", "bottom", "left", "right"] }: ScreenProps) {
  const opacity = useRef(new Animated.Value(ANIMATE_ENTRANCE ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(ANIMATE_ENTRANCE ? 8 : 0)).current;

  useEffect(() => {
    if (!ANIMATE_ENTRANCE) return;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, translateY]);

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      <Animated.View style={[styles.flex, { opacity, transform: [{ translateY }] }]}>
        {children}
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
});
