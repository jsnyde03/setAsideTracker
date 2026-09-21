import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { addPoint, startTrip, tripMiles, type TripPoint, type TripState } from "./trip";

/**
 * The live trip: a background location task, the state it accumulates, and the way the UI watches it.
 *
 * ## Why this is a background task rather than `watchPositionAsync`
 *
 * [D17]. A gig worker's phone is showing the delivery app, not this one, so a tracker that only
 * counts while SetAside is on screen would miss most of the drive — and **under-counting a mileage
 * deduction costs the user money**, which is the same defect this version exists to remove, pointed
 * the other way. `startLocationUpdatesAsync` keeps measuring on **when-in-use** permission, with iOS
 * showing its location indicator the entire time. No "Always" prompt.
 *
 * ## ⛔ What is persisted, and what must never be
 *
 * The running total is written to storage so that a trip survives the app being terminated
 * mid-drive. **Coordinates are not, and that is a published commitment, not a preference** — the
 * privacy policy ([D16]) states trip locations "are never stored and never transmitted", and only
 * the distance is kept. So the anchor lives in memory only: if the OS kills the app, the next fix
 * starts a fresh anchor and the metres in between are lost. **That is the correct trade** — losing a
 * few hundred feet is cheaper than writing a location to disk against a disclosure.
 */

export const TRIP_TASK = "setaside-mileage-trip";

/** Where the running total survives a termination. Distance and counters only — never a position. */
const TRIP_STORAGE_KEY = "gigTaxTracker:activeTrip";

/** Distance and counters, without the anchor. The shape that is safe to write down. */
type PersistedTrip = Omit<TripState, "anchor">;

let state: TripState = startTrip();
let active = false;
const listeners = new Set<(miles: number) => void>();

function publish() {
  const miles = tripMiles(state);
  listeners.forEach((listener) => listener(miles));
}

/**
 * Fire-and-forget: a failed write costs the termination-resilience of a trip in progress, and must
 * never take down the capture itself or interrupt a drive.
 */
function persist() {
  const { anchor: _anchor, ...withoutPosition } = state;
  void AsyncStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(withoutPosition satisfies PersistedTrip)).catch(
    () => {}
  );
}

/**
 * Feeds one platform reading into the trip. Exported for the task below **and for tests** — the task
 * body itself cannot be exercised off-device, so the seam is here rather than inside it.
 */
export function ingestLocations(locations: Location.LocationObject[]): void {
  if (!active) return; // a straggler delivered after the trip stopped is not part of it
  for (const location of locations) {
    const point: TripPoint = {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy ?? undefined,
      timestamp: location.timestamp,
    };
    state = addPoint(state, point);
  }
  persist();
  publish();
}

// Defined at module scope, as TaskManager requires: the OS can deliver a location to a freshly
// relaunched process, and the task has to already exist when it does.
TaskManager.defineTask(TRIP_TASK, async ({ data, error }) => {
  if (error) return;
  const locations = (data as { locations?: Location.LocationObject[] } | undefined)?.locations;
  if (locations?.length) ingestLocations(locations);
});

export type TripStartResult =
  | { started: true }
  | { started: false; reason: "permission-denied" | "services-disabled" | "unavailable" };

/**
 * Asks for permission if needed, then starts measuring.
 *
 * Every failure is **named and returned** rather than thrown — 1.2.5.5's whole point is that a user
 * who cannot be tracked is told so immediately, instead of discovering a trip recorded zero miles
 * after the drive is over.
 */
export async function startTripTracking(): Promise<TripStartResult> {
  try {
    if (!(await Location.hasServicesEnabledAsync())) {
      return { started: false, reason: "services-disabled" };
    }

    const { granted } = await Location.requestForegroundPermissionsAsync();
    if (!granted) return { started: false, reason: "permission-denied" };

    state = startTrip();
    active = true;
    persist();
    publish();

    await Location.startLocationUpdatesAsync(TRIP_TASK, {
      accuracy: Location.Accuracy.High,
      // Every 10 m or 5 s, whichever comes first — enough to trace a route without waking the
      // device on every jitter. The jitter itself is filtered in `trip.ts` regardless.
      distanceInterval: 10,
      timeInterval: 5000,
      // ⚠️ [D17]'s visible half: iOS shows its location indicator for the whole trip. Removing this
      // would make the capture silent, which is the thing that makes when-in-use background
      // tracking acceptable in the first place.
      showsBackgroundLocationIndicator: true,
      pausesUpdatesAutomatically: false,
    });

    return { started: true };
  } catch {
    active = false;
    return { started: false, reason: "unavailable" };
  }
}

/** Stops measuring and returns the trip's miles. Safe to call when nothing is running. */
export async function stopTripTracking(): Promise<number> {
  active = false;
  const miles = tripMiles(state);
  try {
    if (await TaskManager.isTaskRegisteredAsync(TRIP_TASK)) {
      await Location.stopLocationUpdatesAsync(TRIP_TASK);
    }
  } catch {
    // Already stopped, or the platform refused. The trip is over either way — the miles above are
    // what the user gets, and failing here must not lose them.
  }
  void AsyncStorage.removeItem(TRIP_STORAGE_KEY).catch(() => {});
  state = startTrip();
  publish();
  return miles;
}

export function isTripActive(): boolean {
  return active;
}

/** Current miles, for a screen mounting mid-trip. */
export function currentTripMiles(): number {
  return tripMiles(state);
}

/** Subscribe to the running total. Returns the unsubscribe. */
export function watchTripMiles(listener: (miles: number) => void): () => void {
  listeners.add(listener);
  listener(tripMiles(state));
  return () => listeners.delete(listener);
}

/**
 * Reattaches to a trip that was running when the app was terminated: the task may still be
 * registered with the OS, and the distance so far was persisted.
 */
export async function resumeTripIfRunning(): Promise<boolean> {
  try {
    if (!(await TaskManager.isTaskRegisteredAsync(TRIP_TASK))) return false;

    const raw = await AsyncStorage.getItem(TRIP_STORAGE_KEY);
    if (raw) {
      const restored = JSON.parse(raw) as PersistedTrip;
      // No anchor: the next fix starts one. The metres between the kill and the next reading are
      // gone, which is the cost of not writing positions down.
      state = { ...restored };
    }
    active = true;
    publish();
    return true;
  } catch {
    return false;
  }
}

/** Test seam: resets module state between cases. Not called by the app. */
export function __resetTripTrackerForTests(): void {
  state = startTrip();
  active = false;
  listeners.clear();
}
