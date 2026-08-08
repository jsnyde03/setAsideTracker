import { createDemoStore, type KeyValueStore } from "../storage/demoStore";

/**
 * The single source of truth for "is demo mode on", and the holder of the store it runs on.
 *
 * ## Why this is a module of its own
 *
 * Three things outside `repository.ts` need to know demo mode is on — the App Store review prompt,
 * notification scheduling, and analytics — because they persist or act *without* going through the
 * repository. They are all either pure modules or close to it, and importing `repository.ts` would
 * drag AsyncStorage and `react-native` into their plain-Node unit tests.
 *
 * So the flag lives here, with no react-native dependency, and `repository.ts` consults it rather
 * than owning it. Crucially the **store reference itself** lives here too: a separate boolean
 * mirroring "a store exists" would be two things that must agree, and eventually wouldn't.
 */

let demoStore: KeyValueStore | null = null;

/**
 * Whether demo mode is currently on.
 *
 * ⚠️ Anything that writes outside `repository.ts`, or that reaches the OS, the network or the user's
 * real accounts, must check this. The repository's isolation covers app data and nothing else.
 */
export function isDemoModeActive(): boolean {
  return demoStore !== null;
}

/** The live demo store, or null when demo mode is off. Only `repository.ts` should need this. */
export function getDemoStore(): KeyValueStore | null {
  return demoStore;
}

/** Starts a fresh demo store. Always a new one, so a previous session can't leak into the next. */
export function startDemoStore(): void {
  demoStore = createDemoStore();
}

/** Ends demo mode. The store was never persisted, so dropping the reference IS the cleanup. */
export function stopDemoStore(): void {
  demoStore = null;
}
