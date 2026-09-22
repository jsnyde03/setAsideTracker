import { useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, useWindowDimensions, ViewStyle } from "react-native";
import { SafeAreaView, Edge } from "react-native-safe-area-context";
import { DemoBanner } from "../demo/DemoBanner";
import { resolveContentMaxWidth, type ContentWidth } from "../layout";
import type { Colors } from "../theme";
import { useTheme } from "../ThemeContext";

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
// tabs, leaving the screen permanently semi-transparent — skip the entrance animation there.
const ANIMATE_ENTRANCE = Platform.OS !== "web";

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
