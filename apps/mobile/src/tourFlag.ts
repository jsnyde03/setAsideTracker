import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The one-shot "this person has been shown the dashboard tour" flag (1.2.8.4).
 *
 * ⛔ **Deliberately raw `AsyncStorage`, OUTSIDE the repository's demo isolation — and that is the
 * whole design, not a shortcut.** The tour runs over demo data ([D29]), so if the flag lived in
 * `AppSettings` it would go through the demo store, which is a **fresh `Map` on every entry**
 * (`storage/demoStore.ts`). The flag would reset each time and the tour would replay forever, for
 * everyone, with no way to skip it permanently.
 *
 * ⚠️ **This makes it the FIFTH thing that persists outside `repository.ts`**, and the previous
 * addition went wrong exactly here: the trip tracker guarded its *write* and left the read and the
 * remove unguarded, so stopping a demo trip deleted a trip the real user's phone was holding. So be
 * explicit about all three directions, because for this flag **all three are intentionally shared**:
 *
 * - **read** — shared: someone who saw the tour in a demo has seen the tour.
 * - **write** — shared, and it always happens *during* a demo, since that is the only place the
 *   tour runs. Marking it from there is the point.
 * - **reset** — shared, and reachable only from the explicit "Replay tour" action in Settings. A
 *   demo cannot reset it by accident because nothing else calls it.
 *
 * ⛔ **Do NOT add this key to `clearAllLocalData`.** That function writes through `backend()`, which
 * IS the demo store during a demo — so clearing this key there would need a raw `AsyncStorage`
 * call, and a demo visitor tapping "Clear All Data" would then wipe the real user's flag. Whether
 * "Clear All Data" *should* reset the tour is a real question about a published privacy claim; it
 * is filed with the existing `appSettings` defect rather than decided as a side effect here.
 */

const TOUR_SEEN_KEY = "gigTaxTracker:dashboardTourSeen";

export async function hasSeenDashboardTour(): Promise<boolean> {
  return (await AsyncStorage.getItem(TOUR_SEEN_KEY)) === "true";
}

/**
 * Marks the tour shown. Called when the visitor reaches the last stop **and** when they skip —
 * "skip that actually stays skipped" is the requirement, so both endings write the same flag.
 */
export async function markDashboardTourSeen(): Promise<void> {
  await AsyncStorage.setItem(TOUR_SEEN_KEY, "true");
}

/** Clears the flag so the next demo entry runs the tour again. The Settings "Replay tour" row. */
export async function resetDashboardTour(): Promise<void> {
  await AsyncStorage.removeItem(TOUR_SEEN_KEY);
}
