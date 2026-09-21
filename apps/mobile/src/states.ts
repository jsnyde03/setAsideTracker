/**
 * The states a user can pick, with full names so they can search by either.
 *
 * ⚠️ **This list must match the tax engine's configured states exactly.** A name here with no
 * config behind it offers a state the app cannot actually tax; a config with no entry here hides a
 * state that works. `states.test.ts` asserts both directions against the engine, so the two cannot
 * drift — which matters because a hand-written list is precisely the thing that goes stale, and
 * this one is written by hand.
 *
 * ## Why this exists
 *
 * The state was a free-text field until 1.2.2.6. Typing "California" produced the key `CALIFORNIA`,
 * which matches nothing, so the app computed **$0 state tax** and showed *"CALIFORNIA isn't
 * supported yet"* — over a config that has had all 50 states plus DC the whole time. Every miss was
 * data entry, and it sat on the first screen anyone sees.
 */
export interface UsState {
  /** Two-letter code — the key the tax engine's configs are stored under. */
  code: string;
  name: string;
}

export const US_STATES: UsState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia" },
  { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

/** Full name for a code, or the code itself if it isn't one we know. */
export function stateName(code: string): string {
  const match = US_STATES.find((s) => s.code === code.trim().toUpperCase());
  return match ? match.name : code;
}

/**
 * States matching a search, by code or name. An empty query returns everything, so the picker can
 * show the full list before the user types — "all states are supported" should be visible, not
 * something you have to discover by guessing the right letters.
 */
export function searchStates(query: string): UsState[] {
  const q = query.trim().toLowerCase();
  if (q.length === 0) return US_STATES;

  return US_STATES.filter(
    (s) => s.code.toLowerCase().startsWith(q) || s.name.toLowerCase().includes(q)
  );
}
