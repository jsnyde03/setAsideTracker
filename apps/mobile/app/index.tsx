import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { Redirect, useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import type { Entry, TaxProfile } from "../src/types";
import { ScreenFrame } from "../src/components/ScreenFrame";
import { DashboardScreen } from "../src/screens/DashboardScreen";
import { TourAnchorProvider } from "../src/components/TourOverlay";
import { useDemo } from "../src/demo/DemoContext";
import { hasSeenDashboardTour, markDashboardTourSeen } from "../src/tourFlag";
import { useAppData } from "../src/state/AppDataContext";
import { reportError } from "../src/errorReporting";

export default function DashboardRoute() {
  const router = useRouter();
  const { entries, localUserProfile, taxProfile, updateAmountSetAside } = useAppData();
  const { isDemo } = useDemo();
  const { tour } = useLocalSearchParams<{ tour?: string }>();
  const isFocused = useIsFocused();

  /**
   * When the guided tour runs (1.2.8.4). Two ways in, and they are different questions:
   *
   * - **`?tour=1`** — an explicit request from Settings' replay row. Shown regardless of the flag,
   *   which is the whole point of replaying.
   * - **first demo entry** — shown once, then never again ([D29]). The flag lives outside demo
   *   isolation on purpose; see `tourFlag.ts`.
   */
  const replayRequested = tour === "1";
  /** `null` until the flag has been read — NOT `false`, which would flash the tour open. */
  const [seen, setSeen] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // ⚠️ Only the async read lives in an effect. The two synchronous conditions are derived during
  // render instead: `react-hooks/set-state-in-effect` is a lint ERROR here, and it is right — four
  // of the thirteen errors cleared at 1.2.11 were this same "decide state in an effect" shape, and
  // one of them was rendering a stale figure for a frame after every save.
  useEffect(() => {
    let cancelled = false;
    hasSeenDashboardTour().then(
      (value) => {
        if (!cancelled) setSeen(value);
      },
      () => {
        // A storage failure must not put an unskippable overlay in front of someone. Treating it as
        // "already seen" costs one missed tour; the other direction costs a blocked app.
        if (!cancelled) setSeen(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [isDemo]);

  /**
   * `dismissed` is a within-session shortcut, and it has to be cleared on BOTH transitions —
   * otherwise it, rather than the persisted flag, becomes what decides whether the tour appears.
   *
   * ⛔ **This is not tidiness; it was a vacuous test.** With `dismissed` sticky across demo
   * re-entry, "skip stays skipped" held for the wrong reason: re-entering the sample account found
   * the flag *irrelevant* because the session variable was still set. Planting
   * `markDashboardTourSeen` as a no-op left the suite **green**, which is how it was caught.
   * Clearing on the `isDemo` edge puts the stored flag back in charge — of the behaviour and of
   * the test.
   *
   * Both are adjusted during render — the idiom this repo standardised on at 1.2.11 — because
   * pushing Settings over this route does not unmount it, so the state survives the round trip.
   */
  const [lastReplay, setLastReplay] = useState(replayRequested);
  if (replayRequested !== lastReplay) {
    setLastReplay(replayRequested);
    if (replayRequested) setDismissed(false);
  }
  const [lastDemo, setLastDemo] = useState(isDemo);
  if (isDemo !== lastDemo) {
    setLastDemo(isDemo);
    setDismissed(false);
  }

  /**
   * ⛔ **`isFocused` is load-bearing, and the DOM is what said so.** Entering the sample account
   * from Settings calls `router.replace("/")` while a dashboard is already below it in the stack,
   * which leaves **two `DashboardScreen`s mounted** — and a covered route is only `display:none`,
   * while a `Modal` renders through a portal that **escapes that wrapper entirely**. Measured
   * rather than reasoned: two `tour-card`s in the DOM, both visible, one spotlight between them.
   * The unfocused copy cannot measure its anchors, so it rendered the degraded centred card on top
   * of the working one. Gating on focus is the narrow fix; the duplicate dashboard is a pre-existing
   * navigation quirk, filed rather than papered over here.
   */
  const showTour = isFocused && !dismissed && (replayRequested || (isDemo && seen === false));

  async function handleTourFinish() {
    setDismissed(true);
    // Mirror what was just persisted, so the in-memory answer and the stored one agree immediately
    // rather than only after the next `isDemo` change.
    setSeen(true);
    // Both endings write the flag — "skip that actually stays skipped" is the requirement.
    await markDashboardTourSeen().catch((error) =>
      reportError(error, { where: "handleTourFinish" }),
    );
    // Drop the request from the URL, or coming back to this route would replay it.
    if (replayRequested) router.setParams({ tour: undefined });
  }

  // Where the app opens is still derived from the data rather than decided by an effect — the same
  // reasoning as 1.2.0.3, now expressed as a redirect. `AppGate` has already waited for the load, so
  // an absent profile here means genuinely absent, not merely not-loaded-yet.
  if (!localUserProfile || !taxProfile) {
    return <Redirect href="/onboarding" />;
  }

  async function handleUpdateAmountSetAside(year: number, amount: number) {
    try {
      await updateAmountSetAside(year, amount);
    } catch (error) {
      reportError(error, { where: "handleUpdateAmountSetAside" });
      Alert.alert(
        "Couldn't save",
        error instanceof Error ? error.message : "An unexpected error occurred. Please try again."
      );
    }
  }

  return (
    <ScreenFrame>
      {/* The tour's anchor registry wraps the dashboard rather than the whole app: [D29] scopes the
          tour to this one screen, and a provider mounted here cannot be reached — or leaked into —
          by any other route. */}
      <TourAnchorProvider>
        <DashboardScreen
          entries={entries}
          taxProfile={taxProfile as TaxProfile}
          onAddEntry={() => router.push("/entry")}
          onEditEntry={(entry: Entry) =>
            router.push({ pathname: "/entry", params: { id: entry.id } })
          }
          onOpenSettings={() => router.push("/settings")}
          onOpenWhatIf={() => router.push("/what-if")}
          onOpenPlatforms={() => router.push("/platform-comparison")}
          onOpenW4Optimizer={() => router.push("/w4-optimizer")}
          onOpenSafeHarbor={() => router.push("/safe-harbor")}
          onOpenYearOverYear={() => router.push("/year-over-year")}
          onOpenExpenseBreakdown={() => router.push("/expense-breakdown")}
          onOpenBestDays={() => router.push("/best-days")}
          onOpenPaywall={() => router.push("/paywall")}
          onUpdateAmountSetAside={handleUpdateAmountSetAside}
          showTour={showTour}
          onTourFinish={handleTourFinish}
        />
      </TourAnchorProvider>
    </ScreenFrame>
  );
}
