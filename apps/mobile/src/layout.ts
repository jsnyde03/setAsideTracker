/**
 * The one place that decides compact vs. regular ([D24]).
 *
 * Every screen goes through `components/Screen.tsx`, and `Screen` is the only caller that needs to
 * act on this by default — so no screen invents its own breakpoint. A screen that genuinely needs
 * the size class (the dashboard's multi-column layout, 1.2.7.3) reads it from `useSizeClass()`
 * rather than measuring anything itself.
 *
 * ⛔ **This module must NOT import `react-native`, and that is load-bearing rather than tidy.**
 * vitest runs in plain Node and react-native's entry point is Flow-typed, so a single import here
 * fails the whole file at parse time — the pure functions below included. The first version of this
 * file declared the rule/hook split in its own docstring and then put `useSizeClass` at the bottom,
 * which made every test in `layout.test.ts` uncollectable. The hook lives in `useSizeClass.ts`.
 *
 * ⚠️ So: this repo has no React renderer in its unit suite — no `@testing-library/react`, no jsdom —
 * and a hook cannot be unit-tested here at all. Keeping the decision in pure functions is what buys
 * the *rule* fast coverage, leaving only one line of wiring to Playwright. (Same shape as
 * `useReminderRefresh`'s well-covered rule and untestable wrapper — split on purpose this time.)
 */

/**
 * Below this width we lay out for a phone; at or above it, for a tablet.
 *
 * 768 is the narrow edge of every iPad in portrait (the smallest is 768pt), so a full-screen iPad is
 * always regular and every iPhone — the widest is 440pt — is always compact. ⚠️ **Split View and
 * Stage Manager are the reason this is a WIDTH test and not a device test.** An iPad running this
 * app in a half or third split hands it 320–507pt of width, where a tablet layout would be worse
 * than the phone one. `Platform.isPad` cannot see that; the window width can.
 */
export const REGULAR_WIDTH_BREAKPOINT = 768;

/**
 * The widest the content column is allowed to get.
 *
 * Not invented: iOS's own `readableContentGuide` caps at roughly this width for the default content
 * size category, which is the system's answer to the same question — how wide a line of text can be
 * before it stops being comfortable to read. The measured alternative was the status quo, a card
 * **1326px wide** on an iPad in landscape (1.2.7.1's baseline).
 *
 * ⚠️ This is the default, not a law. A screen laying out genuine columns wants more than a reading
 * measure, and opts out via `Screen`'s `width` prop.
 */
export const READABLE_CONTENT_MAX_WIDTH = 672;

export type SizeClass = "compact" | "regular";

/** Compact below the breakpoint, regular at or above it. */
export function resolveSizeClass(width: number): SizeClass {
  return width >= REGULAR_WIDTH_BREAKPOINT ? "regular" : "compact";
}

/**
 * The max width the content column should take, or `undefined` for "fill the screen".
 *
 * Compact always fills: a phone constrained to 672pt would letterbox itself for no reason. Regular
 * gets the reading measure unless the screen asked for the full width.
 */
export function resolveContentMaxWidth(
  width: number,
  mode: ContentWidth = "readable"
): number | undefined {
  if (resolveSizeClass(width) === "compact") return undefined;
  if (mode === "full") return undefined;
  return READABLE_CONTENT_MAX_WIDTH;
}

/** `readable` centres the content in a reading measure; `full` lets it use the whole window. */
export type ContentWidth = "readable" | "full";
