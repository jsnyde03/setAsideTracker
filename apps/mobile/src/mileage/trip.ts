/**
 * Trip distance accumulation — pure, and deliberately knowing nothing about `expo-location`.
 *
 * ## What a captured trip produces, and why it is only a number
 *
 * ⛔ **A trip yields a DISTANCE and nothing else.** `MileageLog`'s `startLocation` / `endLocation`
 * are **not** filled from the capture, even though the type's own docstring anticipated "GPS-assisted
 * mileage populating the same shape". The published privacy policy ([D16], 2026-09-21) states that
 * trip locations "are never stored and never transmitted" and that what is saved is the resulting
 * mileage number. Writing a captured place into an entry would store a location; deriving a street
 * address for it would transmit one to a geocoder. Both contradict a live disclosure, so the log's
 * text fields stay what they already are: **the user's own words**, typed by them.
 *
 * ## Why the filtering is the feature
 *
 * A naive sum of every fix inflates the distance — a phone sitting still on a passenger seat emits
 * a scatter of readings metres apart, and a bad fix can teleport the device across a city. That
 * inflation lands in a **tax deduction**, where an over-claim is the user's problem at audit and
 * they have no way to know the number was wrong. So points are filtered on three axes before any of
 * them moves the total, and what was rejected is reported rather than hidden.
 */

export interface TripPoint {
  latitude: number;
  longitude: number;
  /** Horizontal accuracy in metres, as the platform reports it. Absent means unknown, not perfect. */
  accuracy?: number;
  /** Epoch milliseconds. Used for the implausible-speed check. */
  timestamp: number;
}

export interface TripState {
  /** Miles accumulated so far. This is the only figure that ever reaches an entry. */
  miles: number;
  /** The last point that was ACCEPTED — the anchor the next one is measured from. */
  anchor?: TripPoint;
  /** Fixes discarded as too imprecise to trust. */
  rejectedForAccuracy: number;
  /** Fixes discarded as physically impossible — a jump no vehicle could have made. */
  rejectedForSpeed: number;
  /** Accepted fixes that were within the jitter threshold, so the phone had not really moved. */
  ignoredAsStationary: number;
}

/**
 * Worst horizontal accuracy still trusted, in metres. A good outdoor fix is under 10 m; anything
 * beyond this is a cell-tower or coarse-wifi estimate whose error dwarfs the distance being measured.
 */
export const MAX_ACCURACY_METERS = 50;

/**
 * Movement below this is treated as the phone sitting still, in metres.
 *
 * ⚠️ The anchor is deliberately **not** advanced when a point is ignored. Advancing it would make
 * slow real movement invisible — every step would fall under the threshold and never accumulate —
 * whereas holding the anchor lets genuine travel cross it and be counted in one piece.
 */
export const MIN_STEP_METERS = 10;

/** Above this, a fix is a glitch rather than a journey. Fast, but below any plausible car. */
export const MAX_SPEED_MPH = 120;

const EARTH_RADIUS_METERS = 6_371_008.8;
const METERS_PER_MILE = 1609.344;

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

/** Great-circle distance in metres. Haversine: accurate at the scale of a delivery route. */
export function distanceMeters(a: TripPoint, b: TripPoint): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = toRadians(b.latitude - a.latitude);
  const deltaLon = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function startTrip(): TripState {
  return {
    miles: 0,
    rejectedForAccuracy: 0,
    rejectedForSpeed: 0,
    ignoredAsStationary: 0,
  };
}

/**
 * Folds one fix into a trip. Pure: returns a new state and never mutates the one given.
 *
 * The first trusted point becomes the anchor and adds no distance — there is nothing to measure
 * from yet, which is why a trip that receives a single fix is 0 miles rather than an error.
 */
export function addPoint(state: TripState, point: TripPoint): TripState {
  if (point.accuracy !== undefined && point.accuracy > MAX_ACCURACY_METERS) {
    return { ...state, rejectedForAccuracy: state.rejectedForAccuracy + 1 };
  }

  if (!state.anchor) {
    return { ...state, anchor: point };
  }

  const meters = distanceMeters(state.anchor, point);
  const elapsedSeconds = Math.max(0, (point.timestamp - state.anchor.timestamp) / 1000);

  // A jump no vehicle could have made is a bad fix, not travel. Guarded against a zero interval,
  // where speed is undefined rather than infinite — two fixes can share a timestamp.
  if (elapsedSeconds > 0) {
    const mph = metersToMiles(meters) / (elapsedSeconds / 3600);
    if (mph > MAX_SPEED_MPH) {
      return { ...state, rejectedForSpeed: state.rejectedForSpeed + 1 };
    }
  }

  if (meters < MIN_STEP_METERS) {
    // Anchor held, not advanced — see MIN_STEP_METERS.
    return { ...state, ignoredAsStationary: state.ignoredAsStationary + 1 };
  }

  return { ...state, miles: state.miles + metersToMiles(meters), anchor: point };
}

/** The number that reaches an entry: whole tenths of a mile, which is how mileage is claimed. */
export function tripMiles(state: TripState): number {
  return Math.round(state.miles * 10) / 10;
}
