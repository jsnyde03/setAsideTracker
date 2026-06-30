import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AppSettings, Entry, LocalUserProfile, TaxProfile } from "../types";
import { buildBackupSnapshot, parseBackupSnapshot, type BackupSnapshot } from "../backup";
import { decryptText, encryptText, getOrCreateEncryptionKey } from "./encryption";

const KEYS = {
  localUserProfile: "gigTaxTracker:localUserProfile",
  taxProfile: "gigTaxTracker:taxProfile",
  entries: "gigTaxTracker:entries",
  appSettings: "gigTaxTracker:appSettings",
  /** Locally cached RevenueCat premium entitlement, for offline trust — see getCachedPremium. */
  cachedPremium: "gigTaxTracker:cachedPremium",
} as const;

const DEFAULT_APP_SETTINGS: AppSettings = { appLockEnabled: false };

// Cached across calls so every read/write doesn't hit SecureStore — initialized lazily and
// shared via a single in-flight promise so concurrent calls can't race into generating two keys.
let encryptionKeyPromise: Promise<string | null> | null = null;

function getEncryptionKey(): Promise<string | null> {
  if (!encryptionKeyPromise) {
    encryptionKeyPromise = getOrCreateEncryptionKey();
  }
  return encryptionKeyPromise;
}

async function readJson<T>(key: string): Promise<T | null> {
  const raw = await AsyncStorage.getItem(key);
  if (raw === null) return null;

  const encryptionKey = await getEncryptionKey();
  if (!encryptionKey) {
    return JSON.parse(raw) as T;
  }

  try {
    const decrypted = decryptText(raw, encryptionKey);
    return JSON.parse(decrypted) as T;
  } catch {
    // Defensive fallback for data written before encryption was added — not a formal migration
    // system, just enough to not lose data written under an earlier version of the app.
    return JSON.parse(raw) as T;
  }
}

async function writeJson<T>(key: string, value: T): Promise<void> {
  const json = JSON.stringify(value);
  const encryptionKey = await getEncryptionKey();
  const payload = encryptionKey ? encryptText(json, encryptionKey) : json;
  await AsyncStorage.setItem(key, payload);
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

export async function saveAppSettings(settings: AppSettings): Promise<void> {
  await writeJson(KEYS.appSettings, settings);
}

/**
 * Last-known RevenueCat premium entitlement, cached so the gate can trust it offline — a failed
 * network call must never lock a paying user out of premium features. Defaults to false (free) when
 * never written. Stored through the same encrypted path as everything else.
 */
export async function getCachedPremium(): Promise<boolean> {
  const cached = await readJson<boolean>(KEYS.cachedPremium);
  return cached ?? false;
}

export async function saveCachedPremium(isPremium: boolean): Promise<void> {
  await writeJson(KEYS.cachedPremium, isPremium);
}

/** Clears all locally stored data — there's no real backend/account, so this is the app's reset.
 * The cached entitlement is deliberately NOT cleared here: premium is tied to the user's Apple ID
 * (restored via RevenueCat), not to their local data, so wiping local data shouldn't drop premium. */
export async function clearAllLocalData(): Promise<void> {
  await AsyncStorage.removeMany([KEYS.localUserProfile, KEYS.taxProfile, KEYS.entries]);
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
