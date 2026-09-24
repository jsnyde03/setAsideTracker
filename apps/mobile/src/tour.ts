/**
 * The guided tour's geometry and sequencing (1.2.8.2).
 *
 * ⛔ **This module must NOT import `react-native`** — the same constraint `motion.ts` and
 * `layout.ts` carry, and for the same reason: vitest runs in plain Node, react-native's entry point
 * is Flow-typed, and one import here makes the whole file uncollectable and takes its tests with it.
 * Everything that needs a native API (`measureInWindow`, `Modal`, `Animated`) lives in
 * `components/TourOverlay.tsx`; everything that can be *decided* lives here, where it can be tested.
 *
 * ⚠️ **The spotlight is four plain `View`s, not an SVG mask.** `react-native-svg` is not installed
 * in this repo, and `react-native-reanimated`/`react-native-gesture-handler` are only present as
 * `expo-router`'s undeclared optional peers (reanimated 4's required `react-native-worklets` is
 * missing outright), so all three would be a **new native dependency and a new build** — which the
 * one reserved TestFlight build cannot afford. Four rects tiling the window around a hole need
 * nothing but core RN, and the tiling is exactly what `maskRects` guarantees below.
 *
 * ⛔ **Do not reach for `GestureDetector` here.** A `GestureDetector` swallows taps on device and
 * leaves a tour whose tooltips do not respond — measured in a sibling finance app. This app has no
 * gesture handler at all today, and the tour is not the reason to introduce one.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** A single stop. `anchorId` is what the host screen registered; a step without one is centred. */
export interface TourStep {
  id: string;
  /** The anchor this step spotlights, or `null` for a centred step with no cut-out. */
  anchorId: string | null;
  title: string;
  body: string;
}

export type TooltipPlacement = "above" | "below" | "center";

export interface TooltipPosition {
  placement: TooltipPlacement;
  top: number;
  left: number;
}

/** Breathing room between the anchor's own bounds and the edge of the cut-out. */
export const TOUR_HOLE_PADDING = 8;
/** Gap between the cut-out and the tooltip card. */
export const TOUR_TOOLTIP_GAP = 12;
/** How close the tooltip may come to the window edge (outside the safe-area insets). */
export const TOUR_EDGE_MARGIN = 16;

function clamp(value: number, min: number, max: number): number {
  if (max < min) return min;
  return Math.min(Math.max(value, min), max);
}

/**
 * Grow a measured anchor into the cut-out drawn around it.
 *
 * ⚠️ Deliberately does **not** clamp to the window — an anchor flush against the screen edge should
 * keep its padding on the sides that fit. `maskRects` does the clamping, once, where the rects that
 * actually get drawn are computed.
 */
export function inflateRect(rect: Rect, padding: number = TOUR_HOLE_PADDING): Rect {
  const p = Math.max(0, padding);
  return {
    x: rect.x - p,
    y: rect.y - p,
    width: Math.max(0, rect.width) + p * 2,
    height: Math.max(0, rect.height) + p * 2,
  };
}

/**
 * The four dimming rects that cover the window **except** the hole — top band, bottom band, then
 * the two side pieces between them.
 *
 * ⚡ **The invariant is that they tile exactly**: no gap (a bright seam across the dim) and no
 * overlap (a double-dimmed stripe, which is visible at 0.55 alpha and reads as a rendering bug).
 * That is what `tour.test.ts` asserts by area rather than by eye, because at these alphas a
 * one-pixel seam is easy to miss on a laptop and obvious on a phone.
 *
 * A `null` hole dims the whole window, which is what a centred step wants.
 */
export function maskRects(hole: Rect | null, window: Size): Rect[] {
  if (hole === null) {
    return [{ x: 0, y: 0, width: window.width, height: window.height }];
  }
  const left = clamp(hole.x, 0, window.width);
  const top = clamp(hole.y, 0, window.height);
  const right = clamp(hole.x + hole.width, 0, window.width);
  const bottom = clamp(hole.y + hole.height, 0, window.height);
  return [
    { x: 0, y: 0, width: window.width, height: top },
    { x: 0, y: bottom, width: window.width, height: window.height - bottom },
    { x: 0, y: top, width: left, height: bottom - top },
    { x: right, y: top, width: window.width - right, height: bottom - top },
  ];
}

/**
 * Where the tooltip card goes for a given cut-out.
 *
 * Below the anchor when it fits, above when it does not, and — when neither side has room — the
 * roomier side with the card clamped into the safe band rather than hanging off the screen.
 * ⚠️ The caller passes the card's **measured** height; guessing it is how a tooltip ends up half
 * under the home indicator on the one device nobody tested.
 */
export function placeTooltip(
  hole: Rect | null,
  window: Size,
  tooltip: Size,
  insets: Insets,
  gap: number = TOUR_TOOLTIP_GAP,
  margin: number = TOUR_EDGE_MARGIN,
): TooltipPosition {
  const minLeft = insets.left + margin;
  const maxLeft = window.width - insets.right - margin - tooltip.width;
  const minTop = insets.top + margin;
  const maxTop = window.height - insets.bottom - margin - tooltip.height;

  if (hole === null) {
    return {
      placement: "center",
      top: clamp((window.height - tooltip.height) / 2, minTop, maxTop),
      left: clamp((window.width - tooltip.width) / 2, minLeft, maxLeft),
    };
  }

  const left = clamp(hole.x + hole.width / 2 - tooltip.width / 2, minLeft, maxLeft);
  const holeBottom = hole.y + hole.height;
  const roomBelow = maxTop + tooltip.height - (holeBottom + gap);
  const roomAbove = hole.y - gap - minTop;

  if (roomBelow >= tooltip.height) {
    return { placement: "below", top: clamp(holeBottom + gap, minTop, maxTop), left };
  }
  if (roomAbove >= tooltip.height) {
    return { placement: "above", top: clamp(hole.y - gap - tooltip.height, minTop, maxTop), left };
  }
  // Neither side fits. Take the roomier one and clamp — the card overlaps the anchor, which is
  // ugly but readable, where hanging off the screen is neither.
  const placement: TooltipPlacement = roomBelow >= roomAbove ? "below" : "above";
  const top =
    placement === "below"
      ? clamp(holeBottom + gap, minTop, maxTop)
      : clamp(hole.y - gap - tooltip.height, minTop, maxTop);
  return { placement, top, left };
}

/**
 * Whether a measured anchor is wholly inside the visible band.
 *
 * ⚠️ **Three of the dashboard's four anchors are below the fold** (`Log Earnings` is around line 558
 * of a 1,003-line screen), so the host must scroll to a step's anchor and only *then* measure.
 * Measuring first returns an off-screen rect, and the spotlight cuts a hole in empty space with
 * perfect confidence. This is the check that tells the host it happened.
 */
export function isRectOnScreen(rect: Rect | null, window: Size, insets: Insets): boolean {
  if (rect === null) return false;
  if (rect.width <= 0 || rect.height <= 0) return false;
  return (
    rect.y >= insets.top &&
    rect.x >= insets.left &&
    rect.y + rect.height <= window.height - insets.bottom &&
    rect.x + rect.width <= window.width - insets.right
  );
}

export function isLastStep(index: number, total: number): boolean {
  return index >= total - 1;
}

/** The next index, or `null` when the tour is over — so the caller cannot run off the end. */
export function nextStepIndex(index: number, total: number): number | null {
  if (index < 0 || total <= 0) return null;
  return isLastStep(index, total) ? null : index + 1;
}

/**
 * The progress string, which is also what VoiceOver reads.
 *
 * ⚠️ Spelled out rather than "1/4": a screen reader says *"one slash four"*, and the tour's whole
 * job is to be the calm part of the app.
 */
export function stepProgressLabel(index: number, total: number): string {
  return `Step ${index + 1} of ${total}`;
}
