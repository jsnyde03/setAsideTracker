import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Entry, LocalUserProfile, TaxProfile } from "../types";
import { decryptText, encryptText, getOrCreateEncryptionKey } from "./encryption";

const KEYS = {
  localUserProfile: "gigTaxTracker:localUserProfile",
  taxProfile: "gigTaxTracker:taxProfile",
  entries: "gigTaxTracker:entries",
} as const;

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
    // Defensive fallback for data written before encryption was added to this alpha — not a
    // formal migration system, just enough to not lose locally-entered test data.
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

/** Clears all locally stored data. Used for sign-out / reset in this local-only alpha. */
export async function clearAllLocalData(): Promise<void> {
  await AsyncStorage.removeMany([KEYS.localUserProfile, KEYS.taxProfile, KEYS.entries]);
}
