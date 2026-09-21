import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The live-trip module: what it starts, what it refuses, and — the one that is a published
 * commitment rather than a preference — **what it writes to disk**.
 *
 * The TaskManager callback itself cannot run off-device, so `ingestLocations` is the seam: it is
 * exactly what the task body calls, so testing it tests the path the OS drives.
 */

const location = {
  hasServicesEnabled: true,
  granted: true,
  startThrows: false,
  stopThrows: false,
  startOptions: null as Record<string, unknown> | null,
  stopCalls: 0,
  /** Whether permission is STILL granted, queried mid-trip — separate from the initial request. */
  stillGranted: true,
  queryThrows: false,
};
const storage = new Map<string, string>();
let taskRegistered = false;

vi.mock("expo-location", () => ({
  Accuracy: { High: 4 },
  hasServicesEnabledAsync: vi.fn(async () => {
    if (location.queryThrows) throw new Error("query failed");
    return location.hasServicesEnabled;
  }),
  requestForegroundPermissionsAsync: vi.fn(async () => ({ granted: location.granted })),
  getForegroundPermissionsAsync: vi.fn(async () => ({ granted: location.stillGranted })),
  startLocationUpdatesAsync: vi.fn(async (_task: string, options: Record<string, unknown>) => {
    if (location.startThrows) throw new Error("no");
    location.startOptions = options;
    taskRegistered = true;
  }),
  stopLocationUpdatesAsync: vi.fn(async () => {
    location.stopCalls += 1;
    if (location.stopThrows) throw new Error("already stopped");
    taskRegistered = false;
  }),
}));

vi.mock("expo-task-manager", () => ({
  defineTask: vi.fn(),
  isTaskRegisteredAsync: vi.fn(async () => taskRegistered),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => storage.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      storage.set(key, value);
    }),
    removeItem: vi.fn(async (key: string) => {
      storage.delete(key);
    }),
  },
}));

const TRIP_STORAGE_KEY = "gigTaxTracker:activeTrip";

function fix(latOffsetMeters: number, secondsLater: number, accuracy = 5) {
  return {
    coords: { latitude: 34.05 + latOffsetMeters / 111_195, longitude: -118.25, accuracy },
    timestamp: 1_760_000_000_000 + secondsLater * 1000,
  } as never;
}

async function loadTracker() {
  vi.resetModules();
  const mod = await import("../mileage/tripTracker");
  mod.__resetTripTrackerForTests();
  return mod;
}

beforeEach(() => {
  location.hasServicesEnabled = true;
  location.granted = true;
  location.startThrows = false;
  location.stopThrows = false;
  location.startOptions = null;
  location.stopCalls = 0;
  location.stillGranted = true;
  location.queryThrows = false;
  storage.clear();
  taskRegistered = false;
});

describe("starting a trip", () => {
  it("names each reason it could not start, rather than throwing", async () => {
    const tracker = await loadTracker();

    location.hasServicesEnabled = false;
    expect(await tracker.startTripTracking()).toEqual({ started: false, reason: "services-disabled" });

    location.hasServicesEnabled = true;
    location.granted = false;
    expect(await tracker.startTripTracking()).toEqual({ started: false, reason: "permission-denied" });

    location.granted = true;
    location.startThrows = true;
    expect(await tracker.startTripTracking()).toEqual({ started: false, reason: "unavailable" });
    expect(tracker.isTripActive(), "a failed start must not leave a trip running").toBe(false);
  });

  /**
   * ⭐ [D17]'s visible half. Background tracking on when-in-use permission is acceptable *because*
   * iOS shows the location indicator throughout. Dropping this flag makes the capture silent, which
   * is a different product and a different App Store conversation.
   */
  it("asks for the visible location indicator", async () => {
    const tracker = await loadTracker();

    await tracker.startTripTracking();

    expect(location.startOptions?.showsBackgroundLocationIndicator).toBe(true);
    expect(location.startOptions?.pausesUpdatesAutomatically).toBe(false);
  });
});

describe("what reaches the disk", () => {
  /**
   * ⛔ The published commitment. `docs/privacy.html` states that trip locations "are never stored and
   * never transmitted" and that only the distance is kept ([D16]). This test is the thing standing
   * between that sentence and a future convenience — persisting the anchor would make resuming after
   * a termination lossless, and would also make the policy false.
   */
  it("never writes a coordinate, only the distance", async () => {
    const tracker = await loadTracker();
    await tracker.startTripTracking();

    tracker.ingestLocations([fix(0, 0), fix(1609.344, 60), fix(3218.688, 120)]);

    const written = storage.get(TRIP_STORAGE_KEY);
    expect(written, "nothing was persisted at all").toBeTypeOf("string");
    const parsed = JSON.parse(written as string) as Record<string, unknown>;

    expect(parsed.miles).toBeCloseTo(2, 3);
    expect(parsed).not.toHaveProperty("anchor");
    // Belt and braces against a future field carrying a position under another name.
    expect(written).not.toMatch(/latitude|longitude|34\.0|118\.2/);
  });

  it("clears the stored trip when the trip ends", async () => {
    const tracker = await loadTracker();
    await tracker.startTripTracking();
    tracker.ingestLocations([fix(0, 0), fix(1609.344, 60)]);
    expect(storage.has(TRIP_STORAGE_KEY)).toBe(true);

    await tracker.stopTripTracking();

    expect(storage.has(TRIP_STORAGE_KEY)).toBe(false);
  });
});

describe("accumulating and stopping", () => {
  it("reports the miles it measured", async () => {
    const tracker = await loadTracker();
    await tracker.startTripTracking();

    tracker.ingestLocations([fix(0, 0), fix(1609.344, 60)]);

    expect(tracker.currentTripMiles()).toBe(1);
    expect(await tracker.stopTripTracking()).toBe(1);
  });

  it("ignores a straggler delivered after the trip stopped", async () => {
    const tracker = await loadTracker();
    await tracker.startTripTracking();
    tracker.ingestLocations([fix(0, 0), fix(1609.344, 60)]);
    await tracker.stopTripTracking();

    // ⚠️ Two fixes, ten minutes apart, and both details are load-bearing. This test passed with the
    // guard REMOVED twice before it worked: once with a single late fix (stop resets the state, so
    // one point only sets an anchor and adds nothing), and again with a pair sixty seconds apart
    // (ten miles in a minute is 600 mph, which `trip.ts` rejects as a bad fix). A vacuous test can
    // be vacuous for a second reason after the first is fixed.
    tracker.ingestLocations([fix(0, 700), fix(16_093.44, 1300)]); // ten miles at 60 mph, arriving late

    expect(tracker.currentTripMiles()).toBe(0);
  });

  it("still returns the miles when the platform refuses to stop", async () => {
    const tracker = await loadTracker();
    await tracker.startTripTracking();
    tracker.ingestLocations([fix(0, 0), fix(1609.344, 60)]);
    location.stopThrows = true;

    // The drive is over either way; a failure here must not cost the user their mileage.
    expect(await tracker.stopTripTracking()).toBe(1);
  });

  it("tells watchers the running total, and stops when unsubscribed", async () => {
    const tracker = await loadTracker();
    await tracker.startTripTracking();
    const seen: number[] = [];
    const unsubscribe = tracker.watchTripMiles((miles) => seen.push(miles));

    tracker.ingestLocations([fix(0, 0), fix(1609.344, 60)]);
    unsubscribe();
    tracker.ingestLocations([fix(3218.688, 120)]);

    expect(seen).toEqual([0, 1]); // the immediate call, then the update — and nothing after
  });
});

describe("resuming after the app was terminated", () => {
  it("picks the distance back up when the task is still registered", async () => {
    storage.set(TRIP_STORAGE_KEY, JSON.stringify({ miles: 4.2, rejectedForAccuracy: 0, rejectedForSpeed: 0, ignoredAsStationary: 0 }));
    taskRegistered = true;
    const tracker = await loadTracker();

    expect(await tracker.resumeTripIfRunning()).toBe(true);
    expect(tracker.currentTripMiles()).toBe(4.2);
    expect(tracker.isTripActive()).toBe(true);
  });

  it("does not resume when no trip was running", async () => {
    taskRegistered = false;
    const tracker = await loadTracker();

    expect(await tracker.resumeTripIfRunning()).toBe(false);
    expect(tracker.isTripActive()).toBe(false);
  });
});

describe("diagnosing a trip that has gone quiet (1.2.5.5)", () => {
  /**
   * ⛔ Staleness alone cannot tell a parked car from a revoked permission, and guessing wrong harms
   * the user either way — a false alarm at a long light, or silence while the trip is lost. So the
   * cause is asked of the platform.
   */
  it("names the cause when the platform can give one", async () => {
    const tracker = await loadTracker();

    location.hasServicesEnabled = false;
    expect(await tracker.diagnoseStall()).toEqual({ kind: "services-disabled" });

    location.hasServicesEnabled = true;
    location.stillGranted = false;
    expect(await tracker.diagnoseStall()).toEqual({ kind: "permission-revoked" });
  });

  it("says no-signal rather than inventing a cause when everything is still permitted", async () => {
    const tracker = await loadTracker();
    location.hasServicesEnabled = true;
    location.stillGranted = true;

    // Nothing is wrong with permission or services, so the honest answer is "we are not receiving
    // anything" -- which is also what a parked car looks like. Claiming more would be a guess.
    expect(await tracker.diagnoseStall()).toEqual({ kind: "no-signal" });
  });

  it("does not turn its own failure into a diagnosis", async () => {
    const tracker = await loadTracker();
    location.queryThrows = true;

    expect(await tracker.diagnoseStall()).toEqual({ kind: "no-signal" });
  });

  it("reports the running trip's health", async () => {
    const tracker = await loadTracker();
    await tracker.startTripTracking();

    const health = tracker.currentTripHealth(Date.now() + 15 * 60_000);

    expect(health.stale, "a trip with no fixes for 15 minutes is stale").toBe(true);
  });
});
