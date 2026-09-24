/**
 * What moves, and when it shouldn't (1.2.9.4).
 *
 * ⛔ **This module must NOT import `react-native`** — the same constraint `layout.ts` carries and
 * for the same reason: vitest runs in plain Node and react-native's entry point is Flow-typed, so a
 * single import here makes the whole file uncollectable and takes its tests with it. The hook that
 * reads the live setting lives in `useReduceMotion.ts`.
 *
 * ⚠️ **Every animation in this app is native-only**, which is why the rule is worth having as a
 * pure function. `Screen`'s entrance is gated on `Platform.OS !== "web"` (react-native-web's
 * rAF-driven Animated can stall on a backgrounded tab and leave a screen permanently
 * semi-transparent), and the four sheets pass `animationType="none"` on web. So the browser suite
 * cannot see any of this: it is all correct-looking on web whether or not the rule works. The rule
 * gets unit tests; the rendering is owed to the device pass.
 */

/** Apple's guidance is that Reduce Motion means *less movement*, not *less feedback* — a
 * cross-fade replaces a slide rather than the transition disappearing. A sheet that appears with no
 * transition at all reads as a glitch. */
export type SheetAnimation = "slide" | "fade" | "none";

/**
 * How a bottom sheet should appear.
 *
 * - web: `none`, unchanged — see the note above about Animated stalling.
 * - Reduce Motion on: `fade`, because the slide is the part that moves.
 * - otherwise: `slide`.
 */
export function resolveSheetAnimation(reduceMotion: boolean, isWeb: boolean): SheetAnimation {
  if (isWeb) return "none";
  return reduceMotion ? "fade" : "slide";
}

/**
 * Whether `Screen` plays its entrance (a 220ms fade plus an 8px rise).
 *
 * ⚠️ The *rise* is the motion; the fade is not. But the two run as one `Animated.parallel` and
 * separating them to keep a fade under Reduce Motion would leave every screen doing something on
 * every navigation, which is precisely what the setting asks to stop. Off is the honest reading.
 */
export function shouldAnimateScreenEntrance(reduceMotion: boolean, isWeb: boolean): boolean {
  if (isWeb) return false;
  return !reduceMotion;
}

/**
 * Whether the guided tour's spotlight *slides* from one anchor to the next (1.2.8.2).
 *
 * ⚠️ **Same rule as the screen entrance, and deliberately its own function rather than a call to
 * it.** They agree today by argument, not by coincidence: a cut-out travelling across the screen is
 * pure movement with no informational content — under Reduce Motion it should simply appear at the
 * next anchor. If the screen-entrance rule is ever revisited, this one must be argued separately
 * rather than dragged along, which sharing an implementation would quietly prevent.
 */
export function shouldAnimateTourStep(reduceMotion: boolean, isWeb: boolean): boolean {
  if (isWeb) return false;
  return !reduceMotion;
}
