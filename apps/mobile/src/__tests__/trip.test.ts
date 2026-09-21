import { describe, expect, it } from "vitest";
import {
  MAX_ACCURACY_METERS,
  MAX_SPEED_MPH,
  MIN_STEP_METERS,
  addPoint,
  distanceMeters,
  metersToMiles,
  startTrip,
  tripMiles,
  type TripPoint,
} from "../mileage/trip";

/** A point `metersNorth` from a base latitude — north/south only, so the maths is easy to check. */
function pointNorthOf(base: TripPoint, metersNorth: number, secondsLater: number, accuracy = 5): TripPoint {
  // 1 degree of latitude ≈ 111,195 m (the earth radius this module uses, times π/180).
  return {
    latitude: base.latitude + metersNorth / 111_195,
    longitude: base.longitude,
    accuracy,
    timestamp: base.timestamp + secondsLater * 1000,
  };
}

const ORIGIN: TripPoint = { latitude: 34.05, longitude: -118.25, accuracy: 5, timestamp: 1_760_000_000_000 };

describe("distanceMeters", () => {
  it("measures a known separation", () => {
    // 1,000 m north should come back as 1,000 m, within a metre.
    expect(distanceMeters(ORIGIN, pointNorthOf(ORIGIN, 1000, 60))).toBeCloseTo(1000, 0);
  });

  it("is zero for the same place and symmetric between two", () => {
    const other = pointNorthOf(ORIGIN, 500, 30);
    expect(distanceMeters(ORIGIN, ORIGIN)).toBe(0);
    expect(distanceMeters(ORIGIN, other)).toBeCloseTo(distanceMeters(other, ORIGIN), 9);
  });
});

describe("addPoint", () => {
  it("accumulates a straight run", () => {
    let trip = startTrip();
    trip = addPoint(trip, ORIGIN);
    trip = addPoint(trip, pointNorthOf(ORIGIN, 1609.344, 60)); // exactly a mile
    trip = addPoint(trip, pointNorthOf(ORIGIN, 3218.688, 120)); // and another

    expect(trip.miles).toBeCloseTo(2, 3);
    expect(tripMiles(trip)).toBe(2);
  });

  it("is a pure fold — the state handed in is never mutated", () => {
    const trip = addPoint(startTrip(), ORIGIN);
    const before = { ...trip };

    addPoint(trip, pointNorthOf(ORIGIN, 1000, 60));

    expect(trip).toEqual(before);
  });

  it("adds no distance for the first fix — there is nothing to measure from", () => {
    const trip = addPoint(startTrip(), ORIGIN);

    expect(trip.miles).toBe(0);
    expect(trip.anchor).toEqual(ORIGIN);
    expect(tripMiles(trip)).toBe(0);
  });

  /**
   * ⭐ The inflation this module exists to prevent. A phone on a passenger seat emits a scatter of
   * fixes metres apart; summed naively, a stationary hour becomes miles of "travel" — in a number
   * the user claims as a tax deduction and cannot tell is wrong.
   */
  it("does not accumulate a stationary phone's jitter", () => {
    expect(MIN_STEP_METERS, "fixture jitter must sit inside the threshold").toBeGreaterThan(4);
    let trip = addPoint(startTrip(), ORIGIN);

    for (let i = 1; i <= 200; i++) {
      // Alternating ±4 m: well inside MIN_STEP_METERS, and never in one direction for long.
      trip = addPoint(trip, pointNorthOf(ORIGIN, i % 2 === 0 ? 4 : -4, i * 5));
    }

    expect(trip.miles).toBe(0);
    expect(trip.ignoredAsStationary).toBe(200);
  });

  it("still counts slow movement, because the anchor is held rather than advanced", () => {
    // Steps of 6 m are each below the threshold. If the anchor advanced on every ignored point, this
    // walk would never register at all; holding it lets the distance cross the threshold and count.
    let trip = addPoint(startTrip(), ORIGIN);
    for (let i = 1; i <= 10; i++) {
      trip = addPoint(trip, pointNorthOf(ORIGIN, i * 6, i * 30));
    }

    expect(trip.miles).toBeGreaterThan(0);
    expect(trip.miles).toBeCloseTo(metersToMiles(60), 2);
  });

  it("rejects a fix too imprecise to trust, and says so", () => {
    let trip = addPoint(startTrip(), ORIGIN);
    trip = addPoint(trip, pointNorthOf(ORIGIN, 5000, 60, MAX_ACCURACY_METERS + 1));

    expect(trip.miles).toBe(0);
    expect(trip.rejectedForAccuracy).toBe(1);
    expect(trip.anchor).toEqual(ORIGIN); // and it did not become the anchor
  });

  it("accepts a fix exactly at the accuracy limit — the boundary is inclusive", () => {
    let trip = addPoint(startTrip(), ORIGIN);
    trip = addPoint(trip, pointNorthOf(ORIGIN, 1609.344, 60, MAX_ACCURACY_METERS));

    expect(trip.rejectedForAccuracy).toBe(0);
    expect(trip.miles).toBeCloseTo(1, 3);
  });

  it("rejects a teleport — a jump no vehicle could have made", () => {
    let trip = addPoint(startTrip(), ORIGIN);
    // 20 miles in 10 seconds is ~7,200 mph.
    trip = addPoint(trip, pointNorthOf(ORIGIN, 32_186, 10));

    expect(trip.miles).toBe(0);
    expect(trip.rejectedForSpeed).toBe(1);
    expect(trip.anchor).toEqual(ORIGIN);
  });

  it("accepts fast-but-possible travel — the filter must not eat a freeway", () => {
    let trip = addPoint(startTrip(), ORIGIN);
    // 70 mph for a minute.
    trip = addPoint(trip, pointNorthOf(ORIGIN, metersPerMinuteAt(70), 60));

    expect(trip.rejectedForSpeed).toBe(0);
    expect(trip.miles).toBeCloseTo(70 / 60, 2);
  });

  it("does not divide by zero when two fixes share a timestamp", () => {
    let trip = addPoint(startTrip(), ORIGIN);
    const sameInstant = { ...pointNorthOf(ORIGIN, 1609.344, 0) };

    trip = addPoint(trip, sameInstant);

    // No speed can be computed, so the speed filter must abstain rather than reject or throw.
    expect(trip.rejectedForSpeed).toBe(0);
    expect(trip.miles).toBeCloseTo(1, 3);
  });

  it("treats unknown accuracy as usable rather than perfect or fatal", () => {
    let trip = addPoint(startTrip(), { ...ORIGIN, accuracy: undefined });
    trip = addPoint(trip, { ...pointNorthOf(ORIGIN, 1609.344, 60), accuracy: undefined });

    expect(trip.rejectedForAccuracy).toBe(0);
    expect(trip.miles).toBeCloseTo(1, 3);
  });
});

describe("tripMiles", () => {
  it("rounds to a tenth, which is how mileage is claimed", () => {
    let trip = addPoint(startTrip(), ORIGIN);
    trip = addPoint(trip, pointNorthOf(ORIGIN, 1609.344 * 3.46, 600));

    expect(tripMiles(trip)).toBe(3.5);
  });
});

/** Metres covered in one minute at a given speed in mph. */
function metersPerMinuteAt(mph: number): number {
  expect(mph).toBeLessThan(MAX_SPEED_MPH);
  return (mph / 60) * 1609.344;
}
