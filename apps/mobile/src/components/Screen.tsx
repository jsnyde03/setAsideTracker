import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, useWindowDimensions, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { DemoBanner } from "../demo/DemoBanner";
import { resolveContentMaxWidth, type ContentWidth } from "../layout";
import type { Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { shouldAnimateScreenEntrance } from "../motion";
import { useReduceMotion } from "../useReduceMotion";

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  edges?: Edge[];
  /**
   * How wide the content column may get on a regular-width window (iPad, resized desktop web).
   * Defaults to a reading measure; a screen laying out real columns passes `"full"`.
   * Ignored entirely on compact widths, where content always fills. See `../layout`.
   */
  width?: ContentWidth;
}

// react-native-web's rAF-driven Animated can stall mid-transition on backgrounded/headless
// tabs, leaving the screen permanently semi-transparent — which is why web never animates. That
// reason is now one half of `shouldAnimateScreenEntrance`; Reduce Motion is the other (1.2.9.4).
const IS_WEB = Platform.OS === "web";

export function Screen({
  children,
  style,
  edges = ["top", "bottom", "left", "right"],
  width = "readable",
}: ScreenProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  // Re-reads on every window resize, which is what makes Split View / Stage Manager work without
  // any screen handling a resize itself.
  const { width: windowWidth } = useWindowDimensions();
  const maxWidth = resolveContentMaxWidth(windowWidth, width);
  // ⚠️ Read BEFORE the Animated.Values are seeded: a screen that starts at opacity 0 and then
  // decides not to animate would stay invisible.
  const reduceMotion = useReduceMotion();
  const animateEntrance = shouldAnimateScreenEntrance(reduceMotion, IS_WEB);
  const opacity = useRef(new Animated.Value(animateEntrance ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(animateEntrance ? 8 : 0)).current;

  useEffect(() => {
    if (!animateEntrance) {
      // ⛔ Snap to the resting values rather than returning. `useReduceMotion` starts false and
      // corrects on its first tick, so a screen can seed itself at opacity 0 and only then learn
      // it must not animate — bailing out here would leave it invisible for good.
      opacity.setValue(1);
      translateY.setValue(0);
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [animateEntrance, opacity, translateY]);

  return (
    <SafeAreaView edges={edges} style={[styles.safeArea, style]}>
      {/* First, and inside the safe area so it clears the notch. Every screen gets the demo marker
          without opting in, and a VoiceOver user reaches it before any figure it qualifies.
          Renders nothing at all outside a demo. */}
      <DemoBanner />
      {/* The content column. `alignSelf` centres it in the leftover space on a wide window, while
          the screen's background stays edge-to-edge behind it — so a tablet reads as a designed
          layout rather than a phone screen pinned to the left. On compact widths `maxWidth` is
          undefined and this is exactly the full-width view it has always been. */}
      <Animated.View
        style={[
          styles.flex,
          styles.content,
          maxWidth === undefined ? null : { maxWidth },
          { opacity, transform: [{ translateY }] },
        ]}
      >
        {children}
      </Animated.View>
    </SafeAreaView>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: colors.bg },
    flex: { flex: 1 },
    content: { width: "100%", alignSelf: "center" },
  });
}
