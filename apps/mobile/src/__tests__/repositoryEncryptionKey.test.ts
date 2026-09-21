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
