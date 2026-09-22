import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  READABLE_CONTENT_MAX_WIDTH,
  REGULAR_WIDTH_BREAKPOINT,
  resolveContentMaxWidth,
  resolveSheetMaxWidth,
  resolveSizeClass,
  SHEET_MAX_WIDTH,
} from "../layout";

/**
 * The size-class rule ([D24]). The hook that wires it is one line and is covered by the iPad
 * Playwright projects; everything decidable is decided here, where it costs milliseconds.
 *
 * ⚠️ The device widths below are asserted by NAME because that is the claim. "768 maps to regular"
 * is arithmetic; "an iPad mini in portrait gets the tablet layout and an iPhone 16 Pro Max does not"
 * is the thing that would actually be wrong.
 */
/**
 * ⛔ The one that is a gate rather than a test of behaviour — and it is here because it already
 * happened. `layout.ts` shipped with `useSizeClass` at the bottom, importing `react-native`, which
 * made **every test in this file uncollectable**: vitest runs in plain Node and react-native's
 * entry point is Flow-typed, so it fails at parse time. The failure mode is nasty because it does
 * not look like a coverage gap — the suite reports a broken file, and a broken file is easy to
 * skip past. A docstring asking the next person not to do it is not enough.
 */
describe("the rule stays testable", () => {
  it("does not import react-native", () => {
    const source = readFileSync(join(__dirname, "..", "layout.ts"), "utf8");
    expect(source).not.toMatch(/from\s+["']react-native["']/);
  });
});

describe("size class", () => {
  it("is compact below the breakpoint and regular at or above it", () => {
    expect(resolveSizeClass(REGULAR_WIDTH_BREAKPOINT - 1)).toBe("compact");
    expect(resolveSizeClass(REGULAR_WIDTH_BREAKPOINT)).toBe("regular");
    expect(resolveSizeClass(REGULAR_WIDTH_BREAKPOINT + 1)).toBe("regular");
  });

  it.each([
    ["iPhone SE", 320, "compact"],
    ["iPhone 16", 393, "compact"],
    ["iPhone 16 Pro Max", 440, "compact"],
    ["iPad mini portrait", 744, "compact"],
    ["iPad 11in portrait", 820, "regular"],
    ["iPad Pro 13in portrait", 1024, "regular"],
    ["iPad Pro 13in landscape", 1366, "regular"],
  ])("%s (%ipt) is %s", (_name, width, expected) => {
    expect(resolveSizeClass(width)).toBe(expected);
  });

  /**
   * ⚠️ The reason this is a width test rather than a device test. An iPad in a half or third split
   * hands the app phone-sized width, and a tablet layout there is worse than the phone one.
   */
  it.each([
    ["iPad third-split", 375],
    ["iPad half-split", 507],
    ["iPad two-thirds-split", 694],
  ])("%s (%ipt) stays compact", (_name, width) => {
    expect(resolveSizeClass(width)).toBe("compact");
  });
});

describe("content max width", () => {
  it("does not constrain a compact window", () => {
    // A phone letterboxing itself would be an obvious regression, so it is asserted, not assumed.
    expect(resolveContentMaxWidth(393)).toBeUndefined();
    expect(resolveContentMaxWidth(393, "full")).toBeUndefined();
  });

  it("caps a regular window at the reading measure by default", () => {
    expect(resolveContentMaxWidth(1024)).toBe(READABLE_CONTENT_MAX_WIDTH);
    expect(resolveContentMaxWidth(1366)).toBe(READABLE_CONTENT_MAX_WIDTH);
  });

  it("lets a screen opt out for a real column layout", () => {
    // The dashboard's multi-column layout (1.2.7.3) needs more than a reading measure.
    expect(resolveContentMaxWidth(1366, "full")).toBeUndefined();
  });

  it("caps a sheet on regular and leaves it full-bleed on compact", () => {
    // A bottom sheet on a phone must stay edge to edge — that is what a bottom sheet IS. The
    // constraint exists only because a Modal renders outside `Screen`'s content column.
    expect(resolveSheetMaxWidth(393)).toBeUndefined();
    expect(resolveSheetMaxWidth(1024)).toBe(SHEET_MAX_WIDTH);
    expect(resolveSheetMaxWidth(1366)).toBe(SHEET_MAX_WIDTH);
  });

  it("keeps a sheet narrower than the page behind it", () => {
    // Matching the reading measure would make the sheet read as a second page rather than as
    // something sitting on top of the first.
    expect(SHEET_MAX_WIDTH).toBeLessThan(READABLE_CONTENT_MAX_WIDTH);
  });

  it("caps well below the widths that produced the defect — the control", () => {
    // 1.2.7.1 measured a 1326px card on a 1366px window. Without this, a max width that happened
    // to exceed the viewport would satisfy every assertion above and change nothing on screen.
    expect(READABLE_CONTENT_MAX_WIDTH).toBeLessThan(1024);
  });
});
