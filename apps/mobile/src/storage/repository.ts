import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, Entry, LocalUserProfile, TaxProfile } from "../types";
import { buildBackupSnapshot, parseBackupSnapshot, type BackupSnapshot } from "../backup";
import { getDemoStore, startDemoStore, stopDemoStore } from "../demo/demoMode";
import type { KeyValueStore } from "./demoStore";
import { createEncryptionKey, encryptText, platformEncrypts, readEncryptionKey } from "./encryption";
import { decodeStoredValue } from "./decode";
import { EncryptionKeyUnavailableError } from "./storageErrors";

const KEYS = {
  localUserProfile: "gigTaxTracker:localUserProfile",
  taxProfile: "gigTaxTracker:taxProfile",
  entries: "gigTaxTracker:entries",
  appSettings: "gigTaxTracker:appSettings",
  /** Locally cached RevenueCat premium entitlement, for offline trust — see getCachedPremium. */
  cachedPremium: "gigTaxTracker:cachedPremium",
} as const;

const DEFAULT_APP_SETTINGS: AppSettings = { appLockEnabled: false };

// ─── Demo mode (1.2.1) ───────────────────────────────────────────────────────────────────────────
//
// This one function is the WHOLE of the isolation guarantee: every read and write below goes through
// `backend()`, so while a demo store exists AsyncStorage is not called at all and real data cannot
// be reached — let alone modified. Deliberately one expression, so the claim is verifiable by
// reading this file, which is the property the item was scoped around.
//
// ⚠️ If you add a persistence path anywhere in the app that does NOT come through this module, you
// have put a hole in that guarantee. Three already existed when demo mode was built — the App Store
// review flag, notification scheduling and analytics — and they are guarded at their own choke
// points (1.2.1.3) precisely because they don't route through here.
function backend(): KeyValueStore {
  return getDemoStore() ?? AsyncStorage;
}

/** Re-exported so app-data callers have one import. The flag itself lives in `demo/demoMode` —
 *  it has no react-native dependency, so pure modules can consult it too. */
export { isDemoModeActive } from "../demo/demoMode";

/** The data a demo session starts from. Same shape as a backup's payload, so the seeded persona and
 *  a restored backup are the same kind of thing and can't drift apart. */
export interface DemoSeed {
  localUserProfile: LocalUserProfile;
  taxProfile: TaxProfile;
  entries: Entry[];
  appSettings: AppSettings;
}

/**
 * Switches storage to a fresh in-memory store and writes the seed into it.
 *
 * The seed is written through the same `writeJson` path as real data — so it is encrypted the same
 * way and read back by the same code — rather than being injected pre-formatted. A demo that used a
 * different write path would stop being a test of the real one.
 *
 * Callers must follow this with `reload()` on `AppDataProvider` to pick the seeded data up.
 */
export async function enterDemoMode(seed: DemoSeed): Promise<void> {
  startDemoStore();
  await Promise.all([
    writeJson(KEYS.localUserProfile, seed.localUserProfile),
    writeJson(KEYS.taxProfile, seed.taxProfile),
    writeJson(KEYS.entries, seed.entries),
    writeJson(KEYS.appSettings, seed.appSettings),
  ]);
}

/**
 * Drops the demo store, restoring access to real data. Nothing needs cleaning up — the demo's data
 * was never written anywhere, so releasing the reference IS the cleanup.
 *
 * Callers must follow this with `reload()`, or the provider keeps showing demo data it can no longer
 * write to.
 */
export function exitDemoMode(): void {
  stopDemoStore();
}

// Cached across calls so every read/write doesn't hit SecureStore — initialized lazily and
// shared via a single in-flight promise so concurrent calls can't race into generating two keys.
let encryptionKeyPromise: Promise<string | null> | null = null;

function getEncryptionKey(): Promise<string | null> {
  if (!encryptionKeyPromise) {
    const pending = resolveEncryptionKey();
    // ⚠️ A FAILURE MUST NOT BE CACHED. The cache above holds the promise, so a rejected one would be
    // handed to every later caller for the life of the process — and the retry [D12] puts in front
    // of the user, for the transient locked-keystore case this exists to survive, would be
    // guaranteed to fail. Clearing on rejection is what makes retrying mean anything.
    pending.catch(() => {
      encryptionKeyPromise = null;
    });
    encryptionKeyPromise = pending;
  }
  return encryptionKeyPromise;
}

/**
 * The rule: **never mint a key while there is data a previous key was holding.**
 *
 * @returns the key, or `null` — and null means exactly one thing, *this platform does not encrypt*
 *   (web, which has no keystore). It never means "the key is missing"; that raises instead, so
 *   `writeJson` cannot mistake an unavailable key for permission to write plaintext.
 * @throws {EncryptionKeyUnavailableError} when data exists and its key does not.
 */
async function resolveEncryptionKey(): Promise<string | null> {
  if (!platformEncrypts()) return null;

  let existing: string | null;
  try {
    existing = await readEncryptionKey();
  } catch (error) {
    // A keystore that errors is in the same position as one that is empty while data exists: the
    // one thing we must not do is carry on and re-key.
    throw new EncryptionKeyUnavailableError({ cause: error });
  }
  if (existing) return existing;

  if (await hasStoredUserData()) {
    throw new EncryptionKeyUnavailableError();
  }
  return createEncryptionKey();
}

/**
 * Whether this device holds user data that a new key would orphan.
 *
 * ⚠️ Reads **AsyncStorage directly**, not `backend()`: the question is about real stored data, and
 * a demo session's in-memory store is neither real nor at risk. And deliberately **not** the premium
 * cache — that key is a cached boolean that re-fetches from RevenueCat, so orphaning it costs
 * nothing, while treating it as data would block a legitimate first mint for anyone who had ever
 * opened the paywall.
 */
async function hasStoredUserData(): Promise<boolean> {
  const values = await Promise.all(
    [KEYS.localUserProfile, KEYS.taxProfile, KEYS.entries, KEYS.appSettings].map((key) =>
      AsyncStorage.getItem(key)
    )
  );
  return values.some((value) => value !== null);
}

/** Drops the cached key so the next read or write resolves it again — [D12]'s retry. */
export function forgetCachedEncryptionKey(): void {
  encryptionKeyPromise = null;
}

/** `store` defaults to whichever backend is live. The only caller that overrides it is the premium
 *  cache, which is Apple-ID-scoped and must stay on real storage even inside demo mode. */
async function readJson<T>(key: string, store: KeyValueStore = backend()): Promise<T | null> {
  const raw = await store.getItem(key);
  if (raw === null) return null;

  const encryptionKey = await getEncryptionKey();
  // Throws `UnreadableDataError` rather than returning null or falling back to parsing ciphertext —
  // "could not be read" and "was never written" are different answers and the caller must be able to
  // tell them apart. See decode.ts for what this replaced.
  return decodeStoredValue<T>(key, raw, encryptionKey);
}

async function writeJson<T>(key: string, value: T, store: KeyValueStore = backend()): Promise<void> {
  const json = JSON.stringify(value);
  // Throws rather than returning null when a device's key is unavailable, so the `? :` below cannot
  // quietly write plaintext over encrypted data. Null reaches here only on web.
  const encryptionKey = await getEncryptionKey();
  const payload = encryptionKey ? encryptText(json, encryptionKey) : json;
  await store.setItem(key, payload);
}

export async function getLocalUserProfile(): Promise<LocalUserProfile | null> {
  return readJson<LocalUserProfile>(KEYS.localUserProfile);
}

export async function saveLocalUserProfile(profile: LocalUserProfile): Promise<void> {
  await writeJson(KEYS.localUserProfile, profile);
}

export async function getTaxProfile(): Promise<TaxProfile | null> {
  return readJson<TaxProfile>(KEYS.taxProfile);
}

export async function saveTaxProfile(profile: TaxProfile): Promise<void> {
  await writeJson(KEYS.taxProfile, profile);
}

export async function getEntries(): Promise<Entry[]> {
  const entries = await readJson<Entry[]>(KEYS.entries);
  return entries ?? [];
}

export async function addEntry(entry: Entry): Promise<Entry[]> {
  const existing = await getEntries();
  const updated = [...existing, entry];
  await writeJson(KEYS.entries, updated);
  return updated;
}

export async function deleteEntry(entryId: string): Promise<Entry[]> {
  const existing = await getEntries();
  const updated = existing.filter((entry) => entry.id !== entryId);
  await writeJson(KEYS.entries, updated);
  return updated;
}

/** Replaces the entry with matching id in place, preserving its position in the stored list. */
export async function updateEntry(updatedEntry: Entry): Promise<Entry[]> {
  const existing = await getEntries();
  const updated = existing.map((entry) => (entry.id === updatedEntry.id ? updatedEntry : entry));
  await writeJson(KEYS.entries, updated);
  return updated;
}

export async function getAppSettings(): Promise<AppSettings> {
  const settings = await readJson<AppSettings>(KEYS.appSettings);
  return settings ?? DEFAULT_APP_SETTINGS;
}

/** Overwrites the whole settings object. Use this only when you genuinely have all of it — a
 * restore, for instance. For changing one setting, use `updateAppSettings`. */
export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await writeJson(KEYS.appSettings, settings);
}

/**
 * Merges a partial change into the stored settings.
 *
 * Every setting used to be saved by rebuilding the whole `AppSettings` object from whatever the
 * calling component happened to hold in state. That was safe only for as long as all three setters
 * lived in the same component and read the same closure — the moment any of them moves (the theme
 * preference moved into `ThemeProvider` in 1.2.0.2), a wholesale write silently clobbers the two
 * settings the writer didn't know about. Read-then-merge removes that whole class of bug.
 */
export async function updateAppSettings(patch: Partial<AppSettings>): Promise<void> {
  const current = await getAppSettings();
  await writeJson(KEYS.appSettings, { ...current, ...patch });
}

/**
 * Last-known RevenueCat premium entitlement, cached so the gate can trust it offline — a failed
 * network call must never lock a paying user out of premium features. Defaults to false (free) when
 * never written. Stored through the same encrypted path as everything else.
 *
 * ⚠️ **These two deliberately bypass demo mode** and always read/write real storage. Premium is tied
 * to the user's Apple ID, not to their local data — the same reason `clearAllLocalData` leaves it
 * alone. Routing it into the demo store would mean a purchase or renewal landing while someone is
 * exploring the demo gets cached nowhere and is lost on exit. Demo previews premium via
 * `isDemoPreview` ([D5]) and never touches the entitlement, so there is nothing here for it to fake.
 */
export async function getCachedPremium(): Promise<boolean> {
  const cached = await readJson<boolean>(KEYS.cachedPremium, AsyncStorage);
  return cached ?? false;
}

export async function saveCachedPremium(isPremium: boolean): Promise<void> {
  await writeJson(KEYS.cachedPremium, isPremium, AsyncStorage);
}

/**
 * Clears all locally stored data — there's no real backend/account, so this is the app's reset.
 *
 * The cached entitlement is deliberately NOT cleared here: premium is tied to the user's Apple ID
 * (restored via RevenueCat), not to their local data, so wiping local data shouldn't drop premium.
 *
 * ⛔ **`appSettings` was missing from this list, and the consequence was a lockout, not untidiness.**
 * `clearAllData` set the app-lock state to `false` **in memory only**, so the erase looked complete —
 * but the stored `appLockEnabled: true` survived, and the *next launch* read it back and put a Face
 * ID prompt in front of an app the user had just emptied. The published policy also says Clear All
 * Data "permanently deletes everything stored on your device", which this made false.
 *
 * ⚠️ The theme preference lives in `appSettings` too, so a reset returns it to "system". That is the
 * promise being kept rather than a side effect: it is data stored on the device, and "everything"
 * has to mean everything or the sentence needs rewriting instead.
 */
export async function clearAllLocalData(): Promise<void> {
  await backend().removeMany([KEYS.localUserProfile, KEYS.taxProfile, KEYS.entries, KEYS.appSettings]);
}

/** Wholesale-replaces the entries list — used by backup restore, where the imported list IS the
 * new source of truth, not something to merge with what's already on the device. */
async function saveEntries(entries: Entry[]): Promise<void> {
  await writeJson(KEYS.entries, entries);
}

/** Builds a full JSON backup of everything stored locally — the multi-device/account-recovery
 * story for this local-only app: move your data to a new device by exporting here and importing
 * via restoreBackupSnapshot there. */
export async function exportBackupSnapshot(): Promise<string> {
  const [localUserProfile, taxProfile, entries, appSettings] = await Promise.all([
    getLocalUserProfile(),
    getTaxProfile(),
    getEntries(),
    getAppSettings(),
  ]);
  return JSON.stringify(buildBackupSnapshot({ localUserProfile, taxProfile, entries, appSettings }));
}

/** Restores from a backup JSON string, overwriting all current local data. Returns the restored
 * snapshot so the caller can update in-memory app state without requiring a full app restart. */
/**
 * Everything a recovery must remove, which is **more than `clearAllLocalData` removes.**
 *
 * ⚠️ The difference is `appSettings`, and here it is not cosmetic. A new key can only be minted once
 * nothing is left that an older key was holding, and `appSettings` counts — so a recovery that used
 * `clearAllLocalData` would leave one unreadable blob behind, refuse to mint, and strand the user on
 * the recovery screen having *already* erased everything else.
 *
 * `clearAllLocalData` keeps its current behaviour deliberately: it backs a shipped, user-initiated
 * "delete my data" flow, and the fact that it spares `appSettings` against the stated privacy policy
 * is a separate defect already filed at 1.2.10. Fixing it there means changing what that flow does;
 * fixing it here would mean changing it as a side effect of an unrelated item.
 */
async function discardUnreadableLocalData(): Promise<void> {
  await backend().removeMany([KEYS.localUserProfile, KEYS.taxProfile, KEYS.entries, KEYS.appSettings]);
  // ⚠️ No `forgetCachedEncryptionKey()` here, and that is deliberate rather than an omission: it was
  // written, planted against, and the plant PASSED. There is no case for it — a cached *rejection*
  // is already cleared where it is cached, and a cached key that resolved is still the right key
  // after a wipe. Re-adding it would be defensive code no test can justify.
}

/** The erase half of the recovery surface: forget local data entirely and let the app start over. */
export async function eraseUnreadableLocalData(): Promise<void> {
  await discardUnreadableLocalData();
}

/**
 * Restore as a **recovery**: the local data is discarded first, then the snapshot is written.
 *
 * Different from `restoreBackupSnapshot` in the one way that matters — it does not require the
 * existing data to be readable, because in this path it is precisely what is not.
 *
 * ⚠️ **The snapshot is parsed BEFORE anything is destroyed.** A malformed or truncated backup file
 * must fail with the user's data still on the device, however unreadable it is; erasing first and
 * discovering the replacement is unusable second is the one outcome this path must never produce.
 */
export async function recoverFromBackup(json: string): Promise<BackupSnapshot> {
  const snapshot = parseBackupSnapshot(json);
  await discardUnreadableLocalData();
  await Promise.all([
    snapshot.localUserProfile ? saveLocalUserProfile(snapshot.localUserProfile) : Promise.resolve(),
    snapshot.taxProfile ? saveTaxProfile(snapshot.taxProfile) : Promise.resolve(),
    saveEntries(snapshot.entries),
    saveAppSettings(snapshot.appSettings),
  ]);
  return snapshot;
}

export async function restoreBackupSnapshot(json: string): Promise<BackupSnapshot> {
  const snapshot = parseBackupSnapshot(json);
  await Promise.all([
    snapshot.localUserProfile ? saveLocalUserProfile(snapshot.localUserProfile) : Promise.resolve(),
    snapshot.taxProfile ? saveTaxProfile(snapshot.taxProfile) : Promise.resolve(),
    saveEntries(snapshot.entries),
    saveAppSettings(snapshot.appSettings),
  ]);
  return snapshot;
}
