import { describe, expect, it } from "vitest";
import {
  TOUR_EDGE_MARGIN,
  TOUR_TOOLTIP_GAP,
  inflateRect,
  isLastStep,
  isRectOnScreen,
  maskRects,
  nextStepIndex,
  placeTooltip,
  scrollDeltaToReveal,
  stepProgressLabel,
  type Insets,
  type Rect,
  type Size,
} from "../tour";

/** An iPhone-ish window, and insets with a notch and a home indicator. */
const WINDOW: Size = { width: 390, height: 844 };
const INSETS: Insets = { top: 59, right: 0, bottom: 34, left: 0 };
const NO_INSETS: Insets = { top: 0, right: 0, bottom: 0, left: 0 };

const area = (r: Rect) => r.width * r.height;
const totalArea = (rects: Rect[]) => rects.reduce((sum, r) => sum + area(r), 0);

/** Do two rects share any interior? Touching edges are fine; overlap is a double-dimmed stripe. */
function overlaps(a: Rect, b: Rect): boolean {
  return (
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height
  );
}

describe("inflateRect", () => {
  it("grows the rect on all four sides", () => {
    expect(inflateRect({ x: 100, y: 200, width: 50, height: 20 }, 10)).toEqual({
      x: 90,
      y: 190,
      width: 70,
      height: 40,
    });
  });

  it("keeps padding on the sides that fit when the anchor is flush with the edge", () => {
    // ⚠️ The negative x is intentional and is NOT a bug: maskRects clamps, so the left band
    // collapses to zero width while the right/top/bottom padding survives. Clamping here instead
    // would silently shave the padding off every edge-flush anchor.
    const inflated = inflateRect({ x: 0, y: 300, width: 390, height: 40 }, 8);
    expect(inflated.x).toBe(-8);
    expect(inflated.width).toBe(406);
  });

  it("treats a negative padding as zero rather than shrinking the hole", () => {
    const rect = { x: 10, y: 10, width: 30, height: 30 };
    expect(inflateRect(rect, -20)).toEqual(rect);
  });
});

describe("maskRects", () => {
  const hole: Rect = { x: 40, y: 200, width: 310, height: 120 };

  it("tiles the window exactly — no gap, no overlap", () => {
    const rects = maskRects(hole, WINDOW);
    // The whole point: four dim rects + the hole account for every pixel, once.
    expect(totalArea(rects) + area(hole)).toBe(WINDOW.width * WINDOW.height);
    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        expect(overlaps(rects[i], rects[j])).toBe(false);
      }
    }
  });

  it("leaves the hole itself uncovered", () => {
    for (const rect of maskRects(hole, WINDOW)) {
      expect(overlaps(rect, hole)).toBe(false);
    }
  });

  it("never emits a negative dimension for an anchor hanging off an edge", () => {
    const offEdge: Rect = { x: -30, y: -20, width: 200, height: 90 };
    for (const rect of maskRects(offEdge, WINDOW)) {
      expect(rect.width).toBeGreaterThanOrEqual(0);
      expect(rect.height).toBeGreaterThanOrEqual(0);
    }
  });

  it("still tiles exactly when the anchor runs off the bottom", () => {
    const offBottom: Rect = { x: 40, y: 800, width: 310, height: 200 };
    const rects = maskRects(offBottom, WINDOW);
    const visibleHole = { x: 40, y: 800, width: 310, height: WINDOW.height - 800 };
    expect(totalArea(rects) + area(visibleHole)).toBe(WINDOW.width * WINDOW.height);
  });

  it("dims the entire window for a centred step with no anchor", () => {
    const rects = maskRects(null, WINDOW);
    expect(rects).toHaveLength(1);
    expect(totalArea(rects)).toBe(WINDOW.width * WINDOW.height);
  });
});

describe("placeTooltip", () => {
  const tooltip: Size = { width: 300, height: 160 };

  it("sits below an anchor near the top", () => {
    const hole: Rect = { x: 40, y: 100, width: 310, height: 120 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.placement).toBe("below");
    expect(pos.top).toBe(hole.y + hole.height + TOUR_TOOLTIP_GAP);
  });

  it("flips above an anchor near the bottom", () => {
    // The Log Earnings button sits low on the dashboard; below it there is no room for a card.
    const hole: Rect = { x: 40, y: 700, width: 310, height: 56 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.placement).toBe("above");
    expect(pos.top).toBe(hole.y - TOUR_TOOLTIP_GAP - tooltip.height);
  });

  it("centres horizontally on the anchor", () => {
    const hole: Rect = { x: 40, y: 100, width: 310, height: 120 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.left).toBe(40 + 310 / 2 - 300 / 2);
  });

  it("clamps into the safe band rather than hanging off the right edge", () => {
    // A narrow anchor hard against the right edge — the settings gear is exactly this shape.
    const hole: Rect = { x: 340, y: 100, width: 40, height: 40 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.left).toBe(WINDOW.width - TOUR_EDGE_MARGIN - tooltip.width);
    expect(pos.left + tooltip.width).toBeLessThanOrEqual(WINDOW.width - TOUR_EDGE_MARGIN);
  });

  it("clamps into the safe band rather than hanging off the left edge", () => {
    const hole: Rect = { x: 4, y: 100, width: 40, height: 40 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.left).toBe(TOUR_EDGE_MARGIN);
  });

  it("never places the card under the home indicator", () => {
    const hole: Rect = { x: 40, y: 560, width: 310, height: 120 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.top + tooltip.height).toBeLessThanOrEqual(
      WINDOW.height - INSETS.bottom - TOUR_EDGE_MARGIN,
    );
  });

  it("never places the card under the notch", () => {
    const hole: Rect = { x: 40, y: 300, width: 310, height: 500 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.top).toBeGreaterThanOrEqual(INSETS.top + TOUR_EDGE_MARGIN);
  });

  it("stays on screen when the anchor is too tall for either side to fit", () => {
    // Overlapping the anchor is acceptable here; leaving the screen is not.
    const hole: Rect = { x: 20, y: 80, width: 350, height: 740 };
    const pos = placeTooltip(hole, WINDOW, tooltip, INSETS);
    expect(pos.top).toBeGreaterThanOrEqual(INSETS.top + TOUR_EDGE_MARGIN);
    expect(pos.top + tooltip.height).toBeLessThanOrEqual(
      WINDOW.height - INSETS.bottom - TOUR_EDGE_MARGIN,
    );
  });

  it("centres a step that has no anchor", () => {
    const pos = placeTooltip(null, WINDOW, tooltip, NO_INSETS);
    expect(pos.placement).toBe("center");
    expect(pos.top).toBe((WINDOW.height - tooltip.height) / 2);
    expect(pos.left).toBe((WINDOW.width - tooltip.width) / 2);
  });
});

describe("isRectOnScreen", () => {
  it("accepts a rect inside the safe band", () => {
    expect(isRectOnScreen({ x: 20, y: 200, width: 300, height: 80 }, WINDOW, INSETS)).toBe(true);
  });

  it("rejects a rect below the fold — the case that needs a scroll first", () => {
    expect(isRectOnScreen({ x: 20, y: 900, width: 300, height: 80 }, WINDOW, INSETS)).toBe(false);
  });

  it("rejects a rect hidden behind the notch", () => {
    expect(isRectOnScreen({ x: 20, y: 10, width: 300, height: 30 }, WINDOW, INSETS)).toBe(false);
  });

  it("rejects a rect that is only partly visible", () => {
    expect(isRectOnScreen({ x: 20, y: 760, width: 300, height: 80 }, WINDOW, INSETS)).toBe(false);
  });

  it("rejects an unmeasured anchor rather than cutting a hole in empty space", () => {
    expect(isRectOnScreen(null, WINDOW, INSETS)).toBe(false);
    expect(isRectOnScreen({ x: 0, y: 0, width: 0, height: 0 }, WINDOW, NO_INSETS)).toBe(false);
  });
});

describe("scrollDeltaToReveal", () => {
  it("does not move a rect already inside the band", () => {
    expect(scrollDeltaToReveal({ x: 0, y: 300, width: 390, height: 100 }, WINDOW, INSETS)).toBe(0);
  });

  it("scrolls down for an anchor below the fold — the Log Earnings case", () => {
    // Bottom of the band is 844 - 34 - 16 = 794. The anchor ends at 1000, so 206 past it.
    const delta = scrollDeltaToReveal({ x: 0, y: 940, width: 390, height: 60 }, WINDOW, INSETS);
    expect(delta).toBe(206);
  });

  it("scrolls up for an anchor above the band — the settings gear after scrolling away", () => {
    // Top of the band is 59 + 16 = 75; the anchor starts at 20, so 55 above it.
    const delta = scrollDeltaToReveal({ x: 0, y: 20, width: 44, height: 44 }, WINDOW, INSETS);
    expect(delta).toBe(-55);
  });

  it("lands the anchor inside the band when the delta is applied", () => {
    const rect: Rect = { x: 0, y: 940, width: 390, height: 60 };
    const delta = scrollDeltaToReveal(rect, WINDOW, INSETS);
    const moved: Rect = { ...rect, y: rect.y - delta };
    expect(isRectOnScreen(moved, WINDOW, INSETS)).toBe(true);
  });

  it("aligns a too-tall anchor to its top rather than scrolling past it", () => {
    // Taller than the band: showing the bottom would put the thing being pointed at off-screen.
    const delta = scrollDeltaToReveal({ x: 0, y: 200, width: 390, height: 900 }, WINDOW, INSETS);
    expect(delta).toBe(200 - (INSETS.top + TOUR_EDGE_MARGIN));
  });
});

describe("sequencing", () => {
  it("knows the last step", () => {
    expect(isLastStep(3, 4)).toBe(true);
    expect(isLastStep(2, 4)).toBe(false);
  });

  it("returns null past the end rather than an index nothing will render", () => {
    expect(nextStepIndex(0, 4)).toBe(1);
    expect(nextStepIndex(3, 4)).toBeNull();
    expect(nextStepIndex(0, 0)).toBeNull();
    expect(nextStepIndex(-1, 4)).toBeNull();
  });

  it("reads progress as words, because VoiceOver says a slash out loud", () => {
    expect(stepProgressLabel(0, 4)).toBe("Step 1 of 4");
    expect(stepProgressLabel(3, 4)).toBe("Step 4 of 4");
  });
});
