import { describe, expect, it } from "vitest";
import { resolveSheetAnimation, shouldAnimateScreenEntrance } from "../motion";

/**
 * ⚠️ These test the RULE, which is all that can be tested here — and saying so is the point.
 *
 * Every animation in this app is native-only: `Screen`'s entrance is gated on `Platform.OS !==
 * "web"` and all four sheets pass `animationType="none"` on web. So the Playwright suite renders a
 * completely motionless app whether or not Reduce Motion is honoured, and could never fail. The
 * rendering is owed to the device pass; the decision is covered here.
 */
describe("Reduce Motion", () => {
  describe("bottom sheets", () => {
    it("slides normally", () => {
      expect(resolveSheetAnimation(false, false)).toBe("slide");
    });

    it("cross-fades rather than sliding when Reduce Motion is on", () => {
      // ⛔ NOT "none". Apple's guidance is less movement, not less feedback — a sheet that simply
      // appears reads as a glitch, and the slide is the part that moves.
      expect(resolveSheetAnimation(true, false)).toBe("fade");
    });

    it("stays 'none' on web either way — that gate is about Animated stalling, not motion", () => {
      expect(resolveSheetAnimation(false, true)).toBe("none");
      expect(resolveSheetAnimation(true, true)).toBe("none");
    });
  });

  describe("screen entrance", () => {
    it("plays normally", () => {
      expect(shouldAnimateScreenEntrance(false, false)).toBe(true);
    });

    it("is skipped under Reduce Motion", () => {
      expect(shouldAnimateScreenEntrance(true, false)).toBe(false);
    });

    it("never plays on web", () => {
      expect(shouldAnimateScreenEntrance(false, true)).toBe(false);
      expect(shouldAnimateScreenEntrance(true, true)).toBe(false);
    });
  });

  /**
   * ⛔ The regression this exists for, and it is the one that would actually hurt: `Screen` seeds
   * its Animated values from this function — opacity 0 when it animates, 1 when it does not — and
   * `useReduceMotion` starts `false` and corrects on its first tick. A rule that returned `true`
   * for the reduce-motion case would leave a screen seeded invisible and never faded in. Blank
   * screen, for the one user who asked for less movement.
   */
  it("never asks for an entrance it will not then run", () => {
    for (const reduceMotion of [true, false]) {
      for (const isWeb of [true, false]) {
        const animates = shouldAnimateScreenEntrance(reduceMotion, isWeb);
        if (!animates) continue;
        expect(reduceMotion, "animating while Reduce Motion is on").toBe(false);
        expect(isWeb, "animating on web, where Animated can stall").toBe(false);
      }
    }
  });
});
