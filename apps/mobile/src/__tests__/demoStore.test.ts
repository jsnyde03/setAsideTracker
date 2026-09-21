import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDemoStore } from "../storage/demoStore";

/**
 * Two things are under test here, and the second is the one that matters.
 *
 * `createDemoStore` is pure and easy. The isolation guarantee — that nothing reaches real storage
 * while demo mode is on — is the item's actual promise, and a test that only exercised the Map would
 * restate the promise rather than depend on it. So the real-storage mock below records every call,
 * and the assertions are about what it did NOT receive.
 */

/** Stands in for AsyncStorage, recording writes so the test can assert real data was never touched. */
const realStore = {
  data: new Map<string, string>(),
  getItem: vi.fn(async (key: string) => realStore.data.get(key) ?? null),
  setItem: vi.fn(async (key: string, value: string) => {
    realStore.data.set(key, value);
  }),
  removeMany: vi.fn(async (keys: string[]) => {
    for (const key of keys) realStore.data.delete(key);
  }),
};

vi.mock("@react-native-async-storage/async-storage", () => ({ default: realStore }));

// Encryption is mocked away rather than exercised: it pulls in react-native and expo-secure-store,
// and it has its own test (encryption.test.ts). A null key is the app's real "store plaintext" path,
// which also keeps the stored values readable in the assertions below.
vi.mock("../storage/encryption", () => ({
  // `platformEncrypts` false is the web path — no key, values stored as-is — which is why the
  // assertions below can read them. 1.2.3.2 split the old `getOrCreateEncryptionKey` into a read and
  // a create so the repository can refuse to mint over existing data; neither is reached from here.
  platformEncrypts: () => false,
  readEncryptionKey: async () => null,
  createEncryptionKey: async () => {
    throw new Error("demo isolation test must never mint a key");
  },
  encryptText: (text: string) => text,
  decryptText: (text: string) => text,
}));

const SEED = {
  localUserProfile: { id: "demo", displayName: "Demo", email: "demo@example.com", createdAt: "2026-01-01T00:00:00.000Z" },
  taxProfile: { filingStatus: "single", dependents: 0, hasW2Job: false, state: "CA" },
  entries: [{ id: "d1", platform: "doordash", date: "2026-06-01", grossPay: 100 }],
  appSettings: { appLockEnabled: false },
  // Cast: the seed only needs to be shape-valid for storage, and spelling out every optional field
  // of TaxProfile/Entry here would test the type, not the isolation.
} as unknown as import("../storage/repository").DemoSeed;

describe("createDemoStore", () => {
  it("round-trips a value and reports a miss as null, not undefined", async () => {
    const store = createDemoStore();
    expect(await store.getItem("absent")).toBeNull();
    await store.setItem("k", "v");
    expect(await store.getItem("k")).toBe("v");
  });

  it("removes many keys and leaves the others", async () => {
    const store = createDemoStore();
    await store.setItem("a", "1");
    await store.setItem("b", "2");
    await store.setItem("c", "3");
    await store.removeMany(["a", "c"]);
    expect(await store.getItem("a")).toBeNull();
    expect(await store.getItem("b")).toBe("2");
  });

  it("starts empty every time, so one demo session can't leak into the next", async () => {
    const first = createDemoStore();
    await first.setItem("k", "from the first session");
    expect(await createDemoStore().getItem("k")).toBeNull();
  });
});

describe("demo mode isolation", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    realStore.data.clear();
    const repository = await import("../storage/repository");
    repository.exitDemoMode();
  });

  it("reports itself off until entered, and on afterwards", async () => {
    const { enterDemoMode, exitDemoMode, isDemoModeActive } = await import("../storage/repository");
    expect(isDemoModeActive()).toBe(false);
    await enterDemoMode(SEED);
    expect(isDemoModeActive()).toBe(true);
    exitDemoMode();
    expect(isDemoModeActive()).toBe(false);
  });

  it("writes NOTHING to real storage while demo mode is on", async () => {
    const { enterDemoMode, addEntry, saveTaxProfile, clearAllLocalData } = await import("../storage/repository");
    await enterDemoMode(SEED);
    realStore.setItem.mockClear();

    // A visitor exploring: adds an entry, edits the tax profile, even wipes the data.
    await addEntry({ id: "added-in-demo", platform: "uber", date: "2026-06-02", grossPay: 50 } as never);
    await saveTaxProfile({ filingStatus: "married", dependents: 2, hasW2Job: false, state: "NY" } as never);
    await clearAllLocalData();

    expect(realStore.setItem).not.toHaveBeenCalled();
    expect(realStore.removeMany).not.toHaveBeenCalled();
  });

  it("leaves real data byte-identical across a full demo session", async () => {
    const { saveTaxProfile, getTaxProfile, enterDemoMode, exitDemoMode, addEntry, getEntries } = await import(
      "../storage/repository"
    );

    const realProfile = { filingStatus: "head_of_household", dependents: 3, hasW2Job: true, state: "TX" };
    await saveTaxProfile(realProfile as never);
    await addEntry({ id: "real-1", platform: "instacart", date: "2026-05-01", grossPay: 200 } as never);
    const before = new Map(realStore.data);

    await enterDemoMode(SEED);
    // Demo reads its own seed, not the real profile.
    expect((await getTaxProfile()) as unknown as typeof realProfile).toMatchObject({ state: "CA" });
    await addEntry({ id: "demo-entry", platform: "uber", date: "2026-06-02", grossPay: 50 } as never);
    expect(await getEntries()).toHaveLength(2);

    exitDemoMode();

    expect(realStore.data).toEqual(before);
    expect((await getTaxProfile()) as unknown as typeof realProfile).toMatchObject({ state: "TX" });
    const entries = await getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBe("real-1");
  });

  it("keeps the premium cache on real storage — entitlement is Apple-ID-scoped, not demo data", async () => {
    const { enterDemoMode, saveCachedPremium, getCachedPremium, exitDemoMode } = await import("../storage/repository");

    await enterDemoMode(SEED);
    // A renewal landing mid-demo must still be cached where it survives leaving the demo.
    await saveCachedPremium(true);
    expect(realStore.setItem).toHaveBeenCalledWith("gigTaxTracker:cachedPremium", "true");

    exitDemoMode();
    expect(await getCachedPremium()).toBe(true);
  });

  it("seeds a fresh persona on re-entry, discarding what the previous session added", async () => {
    const { enterDemoMode, exitDemoMode, addEntry, getEntries } = await import("../storage/repository");

    await enterDemoMode(SEED);
    await addEntry({ id: "scribble", platform: "uber", date: "2026-06-02", grossPay: 50 } as never);
    expect(await getEntries()).toHaveLength(2);
    exitDemoMode();

    await enterDemoMode(SEED);
    expect(await getEntries()).toHaveLength(1);
  });
});
