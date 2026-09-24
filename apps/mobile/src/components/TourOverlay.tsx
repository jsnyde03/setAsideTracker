import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import {
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { shouldAnimateTourStep } from "../motion";
import {
  TOUR_HOLE_PADDING,
  inflateRect,
  isLastStep,
  isRectOnScreen,
  maskRects,
  nextStepIndex,
  placeTooltip,
  stepProgressLabel,
  type Rect,
  type Size,
  type TourStep,
} from "../tour";
import { radius, spacing, type as typeScale, type Colors } from "../theme";
import { useTheme } from "../ThemeContext";
import { useReduceMotion } from "../useReduceMotion";

/**
 * The guided tour's overlay primitive (1.2.8.2) — a spotlight cut out of a dimmed window, with one
 * card at a time beside it.
 *
 * All geometry lives in `../tour`, which imports no react-native and is therefore unit-tested;
 * this file is the thin part that measures real views and draws. **Keep it that way** — anything
 * decidable belongs next door, where vitest can reach it.
 *
 * ⚠️ **Portability (the other two finance apps).** `../tour` is dependency-free and moves as-is.
 * This file touches exactly three app-local things — `useTheme`, `useReduceMotion` and the theme
 * scale — so porting it is three imports, not a rewrite.
 *
 * ⛔ **No `GestureDetector`, and do not add one.** It swallows taps on device and leaves a tour
 * whose buttons do not respond; that is a measured failure from a sibling app. Taps here are plain
 * `Pressable`s inside a `Modal`, which is what the four existing sheets already do.
 *
 * ⚠️ **The host scrolls, not the tour.** Three of the dashboard's four anchors start below the
 * fold, so a step whose anchor is off-screen asks the host — via `onStepChange` — to bring it into
 * view, then re-measures. The tour deliberately knows nothing about `ScrollView`: that keeps it
 * portable, and it puts the scroll where the scroll ref already lives.
 */

interface AnchorRegistry {
  register: (id: string, node: View | null) => void;
  measure: (id: string) => Promise<Rect | null>;
}

const TourContext = createContext<AnchorRegistry | null>(null);

/**
 * Attach the returned ref to the view a step spotlights.
 *
 * Outside a provider this is an inert no-op rather than a throw — the same call `useDemo()` makes,
 * and for the same reason: a screen should render fine in a test or a harness that has not mounted
 * the tour.
 */
export function useTourAnchor(id: string) {
  const registry = useContext(TourContext);
  return useCallback(
    (node: View | null) => {
      registry?.register(id, node);
    },
    [registry, id],
  );
}

/**
 * Measure a registered anchor in window coordinates, or `null` outside a provider.
 *
 * This is what lets the host bring an anchor on screen without the tour knowing anything about
 * scrolling: the host measures, computes a delta with `scrollDeltaToReveal`, and moves its own
 * list. ⛔ **Keep `ScrollView`/`FlatList` knowledge out of this file** — it is the difference
 * between a primitive the other two finance apps can take and one they would have to rewrite.
 */
export function useTourMeasure(): ((id: string) => Promise<Rect | null>) | null {
  const registry = useContext(TourContext);
  return registry?.measure ?? null;
}

export function TourAnchorProvider({ children }: { children: React.ReactNode }) {
  const anchors = useRef(new Map<string, View>());

  const register = useCallback((id: string, node: View | null) => {
    if (node === null) anchors.current.delete(id);
    else anchors.current.set(id, node);
  }, []);

  const measure = useCallback((id: string): Promise<Rect | null> => {
    const node = anchors.current.get(id);
    if (!node) return Promise.resolve(null);
    return new Promise((resolve) => {
      // ⚠️ `measureInWindow`, not `measure`: the overlay lives in a Modal, whose coordinate space is
      // the window. `measure` returns coordinates relative to the anchor's own parent, which agree
      // with the window only until something above it has an offset — i.e. until the first device
      // with a notch.
      node.measureInWindow((x, y, width, height) => {
        if (typeof x !== "number" || Number.isNaN(x)) resolve(null);
        else resolve({ x, y, width, height });
      });
    });
  }, []);

  const value = useMemo<AnchorRegistry>(() => ({ register, measure }), [register, measure]);
  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

interface TourOverlayProps {
  steps: TourStep[];
  visible: boolean;
  /** Called when the tour ends — finished or skipped. `completed` distinguishes them. */
  onFinish: (completed: boolean) => void;
  /**
   * Fired before each step is measured, so the host can bring the anchor on screen. Resolve (or
   * return) once the scroll has settled; the tour measures after it.
   */
  onStepChange?: (step: TourStep, index: number) => void | Promise<void>;
}

const IS_WEB = Platform.OS === "web";
/** One frame is not enough after a scroll; this is the settle the re-measure waits out. */
const SCROLL_SETTLE_MS = 350;

export function TourOverlay({ steps, visible, onFinish, onStepChange }: TourOverlayProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const registry = useContext(TourContext);
  const reduceMotion = useReduceMotion();
  const animate = shouldAnimateTourStep(reduceMotion, IS_WEB);

  const [index, setIndex] = useState(0);
  const [hole, setHole] = useState<Rect | null>(null);
  const [tooltipSize, setTooltipSize] = useState<Size | null>(null);

  const step = steps[index];
  const windowSize = useMemo<Size>(
    () => ({ width: window.width, height: window.height }),
    [window.width, window.height],
  );

  /**
   * Measure the current step's anchor, giving the host a chance to scroll to it first.
   *
   * ⚠️ **One retry, then give up and centre.** If the anchor cannot be brought on screen the tour
   * shows the step with no cut-out rather than cutting a hole in empty space — a spotlight on the
   * wrong part of the screen teaches something false, which is worse than a plain card.
   */
  const measureStep = useCallback(
    async (target: TourStep, targetIndex: number) => {
      setTooltipSize(null);
      if (target.anchorId === null || registry === null) {
        setHole(null);
        return;
      }
      await onStepChange?.(target, targetIndex);
      let rect = await registry.measure(target.anchorId);
      if (!isRectOnScreen(rect, windowSize, insets)) {
        await new Promise((resolve) => setTimeout(resolve, SCROLL_SETTLE_MS));
        rect = await registry.measure(target.anchorId);
      }
      setHole(isRectOnScreen(rect, windowSize, insets) ? inflateRect(rect!, TOUR_HOLE_PADDING) : null);
    },
    [registry, onStepChange, windowSize, insets],
  );

  // Measure on open and on every step change. `lastKey` is the "adjust state during render" idiom
  // this repo standardised on at 1.2.11 — an effect here renders one frame with the previous
  // step's hole, which on a spotlight is a visible jump to the wrong place.
  const [lastKey, setLastKey] = useState<string | null>(null);
  const key = visible ? `${index}:${step?.id ?? ""}` : null;
  if (key !== lastKey) {
    setLastKey(key);
    if (key !== null && step) void measureStep(step, index);
    else setHole(null);
  }

  const handleAdvance = useCallback(() => {
    const next = nextStepIndex(index, steps.length);
    if (next === null) {
      setIndex(0);
      onFinish(true);
      return;
    }
    setIndex(next);
  }, [index, steps.length, onFinish]);

  const handleSkip = useCallback(() => {
    setIndex(0);
    onFinish(false);
  }, [onFinish]);

  const onTooltipLayout = useCallback(
    (event: LayoutChangeEvent) => {
      const { width, height } = event.nativeEvent.layout;
      if (tooltipSize && tooltipSize.width === width && tooltipSize.height === height) return;
      setTooltipSize({ width, height });
    },
    [tooltipSize],
  );

  if (!visible || !step) return null;

  const bands = maskRects(hole, windowSize);
  // Until the card has been measured once its position is unknown, so it is laid out off-alignment
  // and kept invisible for that one frame rather than flashing in the wrong place.
  const position = tooltipSize ? placeTooltip(hole, windowSize, tooltipSize, insets) : null;
  const last = isLastStep(index, steps.length);

  return (
    <Modal
      visible
      transparent
      animationType={animate ? "fade" : "none"}
      onRequestClose={handleSkip}
      accessibilityViewIsModal
    >
      <View style={styles.fill} pointerEvents="box-none">
        {/* The dim, as four rects tiling everything but the hole. They also absorb taps, so the
            screen underneath cannot be operated mid-tour — the cut-out is a view of the app, not a
            live control. `../tour` proves the tiling leaves no bright seam. */}
        {bands.map((band, i) => (
          <View
            key={`band-${i}`}
            style={[styles.band, { left: band.x, top: band.y, width: band.width, height: band.height }]}
            // Decorative: the card carries every word a screen reader needs.
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
          />
        ))}
        {/* ⚠️ **The first two `testID`s in this repo, and they are deliberate.** Every other
            selector here matches visible text or an accessible name, which is the right default —
            but the spotlight is a decorative mask with **no text at all**, and giving it an
            accessible name to make it selectable would put a meaningless node in the VoiceOver
            tree purely to serve a test. ⛔ **Without a handle the degraded path is untestable:**
            when an anchor cannot be measured the tour falls back to a centred card with no
            cut-out, which renders the same copy as a working step — so a suite that checks only
            the words passes either way. This is the one thing that tells them apart. */}
        {hole && (
          <View
            testID="tour-spotlight"
            pointerEvents="none"
            style={[
              styles.holeRing,
              { left: hole.x, top: hole.y, width: hole.width, height: hole.height },
            ]}
          />
        )}
        <View
          testID="tour-card"
          onLayout={onTooltipLayout}
          style={[
            styles.card,
            position === null
              ? styles.cardMeasuring
              : { top: position.top, left: position.left },
          ]}
        >
          {/* ⚠️ No `accessibilityLabel` on this wrapper, deliberately. One here would REPLACE every
              word inside it, leaving the visible text unmatchable by Maestro's full-match selectors
              — the exact defect `a11yLabelShadowing.test.ts` exists to catch, found across eleven
              selectors in six flows. The progress line is visible text for the same reason. */}
          <Text style={styles.progress}>{stepProgressLabel(index, steps.length)}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
          <View style={styles.actions}>
            {/* ⛔ No `accessibilityLabel` on either control, and that is the decision rather than an
                omission. A label here would replace the visible word, so VoiceOver would say
                "Skip tour" where the screen says "Skip" — and Maestro's selectors are FULL-MATCH
                regexes, so a flow tapping the word a human reads would report it absent. The label
                carried no information the text does not; where it would (a price, a destructive
                consequence), add it and review it into `a11yLabelShadowing.reviewed.json`. */}
            <Pressable onPress={handleSkip} style={styles.skip} accessibilityRole="button">
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
            <Pressable onPress={handleAdvance} style={styles.next} accessibilityRole="button">
              <Text style={styles.nextText}>{last ? "Done" : "Next"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: Colors) {
  return StyleSheet.create({
    fill: { flex: 1 },
    band: { position: "absolute", backgroundColor: colors.overlay },
    holeRing: {
      position: "absolute",
      borderRadius: radius.md,
      borderWidth: 2,
      borderColor: colors.surface,
    },
    card: {
      position: "absolute",
      maxWidth: 340,
      minWidth: 260,
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.xl,
      gap: spacing.sm,
    },
    /** One frame, off-screen and invisible, purely to learn the card's height. */
    cardMeasuring: { opacity: 0, top: 0, left: 0 },
    progress: { ...typeScale.micro, color: colors.inkFaint },
    title: { ...typeScale.subtitle, color: colors.ink },
    body: { ...typeScale.body, color: colors.inkSubtle },
    actions: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginTop: spacing.sm,
    },
    // Both controls are ≥44pt tall so they pass the touch-target rule without hitSlop — which
    // react-native-web ignores anyway, making a hitSlop-sized target measure 22pt in the browser
    // suite and 44pt on the phone.
    skip: { minHeight: 44, justifyContent: "center", paddingRight: spacing.lg },
    skipText: { ...typeScale.label, color: colors.inkSubtle },
    next: {
      minHeight: 44,
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      borderRadius: radius.pill,
      backgroundColor: colors.primaryButton,
    },
    nextText: { ...typeScale.label, color: "#FFFFFF" },
  });
}
