import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The first tests `repository.ts` has ever had.
 *
 * It was untestable because it imports AsyncStorage, and `encryption.ts` imports react-native's
 * `Platform` — neither of which Vitest can load. Three mocks fix that, and it matters here more than
 * anywhere: 1.2.3.2's guarantee is about what the *repository* decides, so testing a helper in
 * isolation would prove the rule is written down, not that it is the rule being followed.
 */

const secureStore = { key: null as string | null, throwOnRead: false, setCalls: 0 };
const asyncStore = new Map<string, string>();

vi.mock("react-native", () => ({ Platform: { OS: "ios" } }));

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async () => {
    if (secureStore.throwOnRead) throw new Error("keychain unavailable");
    return secureStore.key;
  }),
  setItemAsync: vi.fn(async (_name: string, value: string) => {
    secureStore.setCalls += 1;
    secureStore.key = value;
  }),
}));

vi.mock("@react-native-async-storage/async-storage", () => ({
  default: {
    getItem: vi.fn(async (key: string) => asyncStore.get(key) ?? null),
    setItem: vi.fn(async (key: string, value: string) => {
      asyncStore.set(key, value);
    }),
    removeMany: vi.fn(async (keys: string[]) => {
      keys.forEach((key) => asyncStore.delete(key));
    }),
  },
}));

// react-native-get-random-values is a side-effect polyfill; Node 22 already has crypto.getRandomValues.
vi.mock("react-native-get-random-values", () => ({}));

const ENTRIES_KEY = "gigTaxTracker:entries";
const PREMIUM_KEY = "gigTaxTracker:cachedPremium";

async function loadRepository() {
  vi.resetModules();
  return import("../storage/repository");
}

beforeEach(() => {
  secureStore.key = null;
  secureStore.throwOnRead = false;
  secureStore.setCalls = 0;
  asyncStore.clear();
});

describe("the encryption key is never minted over existing data", () => {
  it("mints one on a genuinely empty device", async () => {
    const repository = await loadRepository();

    await repository.addEntry({ id: "a", amount: 10 } as never);

    expect(secureStore.setCalls).toBe(1);
    expect(secureStore.key).toBeTypeOf("string");
  });

  /**
   * ⭐ The defect this sub-step exists for. SecureStore returning null does not mean "new device" —
   * `WHEN_UNLOCKED` accessibility returns null before the first unlock after a reboot. The old code
   * minted a replacement key here, and the next write made everything already stored unreadable
   * forever.
   */
  it("refuses to mint when data exists and the key does not", async () => {
    asyncStore.set(ENTRIES_KEY, "U2FsdGVkX1+already-encrypted-under-a-key-we-no-longer-have");
    const repository = await loadRepository();

    await expect(repository.getEntries()).rejects.toThrow("not available");
    expect(secureStore.setCalls, "a key was minted over existing data").toBe(0);
  });

  it("refuses to mint when the keystore itself errors", async () => {
    secureStore.throwOnRead = true;
    const repository = await loadRepository();

    // A WRITE, because that is what always needs a key — see the test below for why a read may not.
    await expect(repository.addEntry({ id: "a", amount: 10 } as never)).rejects.toThrow("not available");
    expect(secureStore.setCalls).toBe(0);
  });

  /**
   * Deliberate, and recorded so it is not "fixed" later: reading a key that holds nothing never
   * consults the keystore, because there is nothing to decrypt. A broken keystore on an empty device
   * therefore reads as empty rather than as an error — and the first write still fails loudly, so
   * nothing can be lost by it. Found by an assertion of mine that was wrong about the code.
   */
  it("reads an absent value as absent without needing a key at all", async () => {
    secureStore.throwOnRead = true;
    const repository = await loadRepository();

    await expect(repository.getEntries()).resolves.toEqual([]);
  });

  it("does not let a WRITE re-key or fall back to plaintext when the key is unavailable", async () => {
    asyncStore.set(ENTRIES_KEY, "U2FsdGVkX1+already-encrypted");
    const repository = await loadRepository();

    await expect(repository.saveTaxProfile({ state: "CA" } as never)).rejects.toThrow("not available");
    expect(secureStore.setCalls).toBe(0);
    // The decisive part: nothing was written. A plaintext write here would be silent data exposure.
    expect(asyncStore.has("gigTaxTracker:taxProfile")).toBe(false);
  });

  it("still mints when the only stored value is the premium cache", async () => {
    // A cached boolean re-fetches from RevenueCat; treating it as data would block a legitimate
    // first mint for anyone who had ever opened the paywall.
    asyncStore.set(PREMIUM_KEY, "U2FsdGVkX1+cached-boolean");
    const repository = await loadRepository();

    await repository.addEntry({ id: "a", amount: 10 } as never);

    expect(secureStore.setCalls).toBe(1);
  });

  it("uses the existing key rather than minting a second one", async () => {
    secureStore.key = "0123456789abcdef0123456789abcdef";
    const repository = await loadRepository();

    await repository.addEntry({ id: "a", amount: 10 } as never);

    expect(secureStore.setCalls).toBe(0);
    expect(asyncStore.get(ENTRIES_KEY)).toMatch(/^U2FsdGVkX1/);
  });
});

describe("recovering from a backup when the data cannot be read", () => {
  // ⚠️ A COMPLETE entry, and it did not used to be. This fixture was `{ id: "r1", grossPay: 250 }`
  // — no date, platform or expenses — which no writer in the app can produce, so the test was
  // restoring a shape no user could ever have backed up. 1.2.10.6's validation rejected it on its
  // first run, which is the fixture being wrong rather than the validation being strict.
  const RESTORED_ENTRY = {
    id: "r1",
    platform: "doordash",
    date: "2026-08-14",
    grossPay: 250,
    tips: 0,
    mileage: 0,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0 },
    createdAt: "2026-08-14T00:00:00.000Z",
  };

  const BACKUP = JSON.stringify({
    version: 1,
    exportedAt: "2026-09-01T00:00:00.000Z",
    localUserProfile: { id: "u", displayName: "Restored" },
    taxProfile: { state: "CA", filingStatus: "single" },
    entries: [RESTORED_ENTRY],
    appSettings: { appLockEnabled: true },
  });

  /** Every user-data key unreadable, and the key that opened them gone: the state recovery exists for. */
  function seedUnreadableDevice() {
    for (const key of [
      "gigTaxTracker:localUserProfile",
      "gigTaxTracker:taxProfile",
      ENTRIES_KEY,
      "gigTaxTracker:appSettings",
    ]) {
      asyncStore.set(key, "U2FsdGVkX1+written-under-a-key-that-is-gone");
    }
  }

  it("restores onto a device whose key is gone, which plain restore cannot do", async () => {
    seedUnreadableDevice();
    const repository = await loadRepository();

    // Proof the starting state is the hard one: an ordinary read fails.
    await expect(repository.getEntries()).rejects.toThrow("not available");

    const snapshot = await repository.recoverFromBackup(BACKUP);

    expect(snapshot.entries).toHaveLength(1);
    expect(secureStore.setCalls, "a key had to be minted after the wipe").toBe(1);
    // And the restored data reads back through the normal path, which is the whole point.
    await expect(repository.getEntries()).resolves.toEqual([RESTORED_ENTRY]);
  });

  /**
   * ⭐ The property that makes this safe to offer on an error screen. If the file is bad, the user
   * must still have whatever they had — however unreadable — rather than having traded it for
   * nothing. So parsing happens before anything is removed.
   */
  it("destroys nothing when the backup file is malformed", async () => {
    seedUnreadableDevice();
    const before = new Map(asyncStore);
    const repository = await loadRepository();

    await expect(repository.recoverFromBackup('{"version":99,"entries":[]}')).rejects.toThrow("version");
    await expect(repository.recoverFromBackup("not json at all")).rejects.toThrow("isn't valid");

    expect(asyncStore).toEqual(before);
    expect(secureStore.setCalls).toBe(0);
  });

  it("erases the settings blob too, or the app could never start again", async () => {
    // `clearAllLocalData` spares appSettings. Here that would leave one unreadable value behind,
    // which still blocks minting — so the user erases everything and is stranded anyway.
    seedUnreadableDevice();
    const repository = await loadRepository();

    await repository.eraseUnreadableLocalData();

    expect(asyncStore.size).toBe(0);
    // The app can start over: a write now succeeds, which means a key was minted.
    await repository.addEntry({ id: "fresh", amount: 1 } as never);
    expect(secureStore.setCalls).toBe(1);
  });
});

describe("a key failure is not cached forever", () => {
  /**
   * ⭐ [D12]'s retry depends entirely on this. The key is held in a module-level promise; a rejected
   * one would be handed to every later caller for the life of the process, so the retry offered to
   * the user would be guaranteed to fail no matter how many times they tapped it.
   */
  it("resolves on a retry once the keystore comes back", async () => {
    asyncStore.set(ENTRIES_KEY, "U2FsdGVkX1+encrypted");
    secureStore.throwOnRead = true;
    const repository = await loadRepository();

    await expect(repository.getEntries()).rejects.toThrow("not available");

    // The device is unlocked; the keystore answers now.
    secureStore.throwOnRead = false;
    secureStore.key = "0123456789abcdef0123456789abcdef";

    // Still fails, but on the DATA now (written under a different key), not on the key lookup —
    // which is the proof that the key was resolved a second time rather than served from cache.
    await expect(repository.getEntries()).rejects.toThrow("could not be read");
  });

  it("forgetCachedEncryptionKey drops a key that succeeded, so a later read resolves it again", async () => {
    secureStore.key = "0123456789abcdef0123456789abcdef";
    const repository = await loadRepository();
    await repository.addEntry({ id: "a", amount: 10 } as never);

    repository.forgetCachedEncryptionKey();
    secureStore.throwOnRead = true;

    await expect(repository.getEntries()).rejects.toThrow("not available");
  });
});

describe("clearing all data actually clears all data", () => {
  const SETTINGS_KEY = "gigTaxTracker:appSettings";
  const PROFILE_KEY = "gigTaxTracker:localUserProfile";

  it("removes app settings, so the app lock cannot survive the erase", async () => {
    // ⛔ The bug this pins was a LOCKOUT, not untidiness. `clearAllData` set the lock state to false
    // in memory, so the erase looked complete — while the stored `appLockEnabled: true` survived and
    // the next launch read it back, putting Face ID in front of an app with nothing in it.
    const repository = await loadRepository();
    await repository.updateAppSettings({ appLockEnabled: true });
    expect(asyncStore.has(SETTINGS_KEY)).toBe(true); // the control: there is something to clear

    await repository.clearAllLocalData();

    expect(asyncStore.has(SETTINGS_KEY)).toBe(false);
    // Read back through the real accessor, not the raw map — a default of `true` here would be the
    // same lockout arriving by a different route.
    expect((await repository.getAppSettings()).appLockEnabled).toBe(false);
  });

  it("clears the user's own data and keeps the purchased entitlement", async () => {
    const repository = await loadRepository();
    await repository.saveLocalUserProfile({
      id: "u1",
      displayName: "Test",
      email: "",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    await repository.saveCachedPremium(true);

    await repository.clearAllLocalData();

    expect(asyncStore.has(PROFILE_KEY)).toBe(false);
    // Premium is tied to the Apple ID, not to local data — wiping the device data must not drop a
    // subscription the user is still paying for.
    expect(asyncStore.has(PREMIUM_KEY)).toBe(true);
    expect(await repository.getCachedPremium()).toBe(true);
  });
});
