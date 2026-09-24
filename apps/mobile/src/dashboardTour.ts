import type { TourStep } from "./tour";

/**
 * The four stops (1.2.8.3), and the anchor ids the dashboard registers for them.
 *
 * ⛔ **No react-native import** — same rule as `tour.ts` and `motion.ts`, so the copy and the
 * sequence stay unit-testable in plain Node.
 *
 * **Why these four, in this order** ([D29], Jason 2026-09-24): the two numbers that *are* the
 * product, then the loop that moves them, then the profile that makes them correct. It ends by
 * handing the visitor back to their own data rather than leaving them in the sample account.
 *
 * ⚠️ **The tour runs over DEMO data, never an empty dashboard.** That is the whole reason demo mode
 * was built first: on a brand-new account every figure these stops point at reads **$0**, which
 * teaches nothing and looks broken.
 */

export const DASHBOARD_TOUR_ANCHORS = {
  setAside: "dashboard.setAside",
  week: "dashboard.week",
  logEarnings: "dashboard.logEarnings",
  settings: "dashboard.settings",
} as const;

export const DASHBOARD_TOUR_STEPS: TourStep[] = [
  {
    id: "set-aside",
    anchorId: DASHBOARD_TOUR_ANCHORS.setAside,
    title: "What to set aside",
    body: "This is the part of what you've earned that isn't yours to spend. Keep it aside and April stops being a surprise.",
  },
  {
    id: "week",
    anchorId: DASHBOARD_TOUR_ANCHORS.week,
    title: "Your weekly target",
    body: "The year total is what you owe; this is what to move aside this week to stay square. Tap it any time to see every week.",
  },
  {
    id: "log-earnings",
    anchorId: DASHBOARD_TOUR_ANCHORS.logEarnings,
    title: "Log a shift",
    body: "Every shift you log moves both numbers. It takes about ten seconds — gross pay, tips, miles.",
  },
  {
    id: "settings",
    anchorId: DASHBOARD_TOUR_ANCHORS.settings,
    title: "Your tax profile",
    body: "Your state, filing status and any W-2 job live here. Getting those right is what makes these numbers yours rather than an average.",
  },
];
