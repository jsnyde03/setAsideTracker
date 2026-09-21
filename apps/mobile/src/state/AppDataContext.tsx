import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Entry, FiledYearTax, LocalUserProfile, TaxProfile } from "../types";
import { reportError } from "../errorReporting";
import {
  addEntry,
  clearAllLocalData,
  deleteEntry as deleteEntryFromStore,
  eraseUnreadableLocalData,
  forgetCachedEncryptionKey,
  recoverFromBackup,
  getAppSettings,
  getEntries,
  getLocalUserProfile,
  getTaxProfile,
  restoreBackupSnapshot,
  saveLocalUserProfile,
  saveTaxProfile as persistTaxProfile,
  updateAppSettings,
  updateEntry,
} from "../storage/repository";

type BackupSnapshot = Awaited<ReturnType<typeof restoreBackupSnapshot>>;

interface AppDataValue {
  /** False until the first load settles. Consumers shouldn't decide anything from empty data before it. */
  ready: boolean;
  /** Set if the initial load threw. Surfaced rather than swallowed so the app can tell the user —
   *  but not alerted from here, because this layer doesn't own the UI. */
  loadError: unknown | null;
  localUserProfile: LocalUserProfile | null;
  taxProfile: TaxProfile | null;
  entries: Entry[];
  appLockEnabled: boolean;
  remindersEnabled: boolean;

  // Mutations. Every one persists first, then updates state, and THROWS on failure — the caller owns
  // the user-facing response (alert, navigation, analytics). Keeping that split is the point: this is
  // a data layer, and the moment it starts showing Alerts it stops being one.
  completeOnboarding: (profile: LocalUserProfile, taxProfile: TaxProfile) => Promise<void>;
  saveEntry: (entry: Entry, isEditing: boolean) => Promise<Entry[]>;
  removeEntry: (entryId: string) => Promise<Entry[]>;
  saveProfile: (profile: LocalUserProfile) => Promise<void>;
  saveTaxProfile: (taxProfile: TaxProfile) => Promise<void>;
  updateAmountSetAside: (year: number, amount: number) => Promise<void>;
  updateFiledTax: (year: number, filed: FiledYearTax) => Promise<void>;
  setAppLockEnabled: (enabled: boolean) => Promise<void>;
  setRemindersEnabled: (enabled: boolean) => Promise<void>;
  clearAllData: () => Promise<void>;
  restoreBackup: (json: string) => Promise<BackupSnapshot>;

  // ─── Recovery ([D12]) — only reachable while `loadError` is set. ──────────────────────────────
  /** Re-resolves the encryption key and re-reads everything. The retry offered for the transient
   *  locked-keystore case; resolves to true if the data is readable now. */
  retryLoad: () => Promise<boolean>;
  /** Replaces unreadable local data with a backup file's contents. Parses before it destroys. */
  recoverFromBackupFile: (json: string) => Promise<BackupSnapshot>;
  /** Forgets the unreadable data entirely and returns the app to a first-run state. */
  eraseAndStartOver: () => Promise<void>;
  /** Re-reads everything from storage. The seam demo mode (1.2.1) uses to enter and leave cleanly. */
  reload: () => Promise<void>;
}

const AppDataContext = createContext<AppDataValue | null>(null);

/**
 * Owns the app's data — profile, tax profile, entries — and the two settings that aren't the theme's.
 *
 * It lives above the router (`app/_layout.tsx`) rather than inside a screen so that every route reads
 * one copy. Held inside a route instead, sibling routes would each load their own and drift apart.
 *
 * ⚠️ This is the seam demo mode swaps (1.2.1). Everything here reaches storage through
 * `storage/repository`, which is the single place all persistence funnels through — so demo mode can
 * redirect that one module and this provider needs no knowledge of it. `reload()` exists for exactly
 * that: entering or leaving demo mode re-reads, without remounting the tree.
 */
export function AppDataProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<unknown | null>(null);
  const [localUserProfile, setLocalUserProfile] = useState<LocalUserProfile | null>(null);
  const [taxProfile, setTaxProfile] = useState<TaxProfile | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [remindersEnabled, setRemindersEnabledState] = useState(true);

  const load = useCallback(async () => {
    const [storedProfile, storedTaxProfile, storedEntries, storedSettings] = await Promise.all([
      getLocalUserProfile(),
      getTaxProfile(),
      getEntries(),
      getAppSettings(),
    ]);
    setLocalUserProfile(storedProfile);
    setTaxProfile(storedTaxProfile);
    setEntries(storedEntries);
    setAppLockEnabledState(storedSettings.appLockEnabled);
    setRemindersEnabledState(storedSettings.remindersEnabled ?? true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await load();
      } catch (error) {
        // Recorded, not swallowed, and `ready` still flips below — without that the app hangs on a
        // spinner forever with no feedback. `AppGate` is the consumer: it shows the recovery surface
        // ([D12]) rather than letting the app fall through to onboarding with a null profile, which
        // is what happened for as long as this had no consumer at all.
        // Reported too — until 1.2.3.3 nothing sent these anywhere, so there is no figure for how
        // often a real device fails to open its own data.
        reportError(error, { where: "AppDataProvider/load" });
        if (!cancelled) setLoadError(error);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const completeOnboarding = useCallback(async (profile: LocalUserProfile, newTaxProfile: TaxProfile) => {
    await saveLocalUserProfile(profile);
    await persistTaxProfile(newTaxProfile);
    setLocalUserProfile(profile);
    setTaxProfile(newTaxProfile);
  }, []);

  const saveEntry = useCallback(async (entry: Entry, isEditing: boolean) => {
    const updated = isEditing ? await updateEntry(entry) : await addEntry(entry);
    setEntries(updated);
    return updated;
  }, []);

  const removeEntry = useCallback(async (entryId: string) => {
    const updated = await deleteEntryFromStore(entryId);
    setEntries(updated);
    return updated;
  }, []);

  const saveProfile = useCallback(async (profile: LocalUserProfile) => {
    await saveLocalUserProfile(profile);
    setLocalUserProfile(profile);
  }, []);

  const saveTaxProfile = useCallback(async (newTaxProfile: TaxProfile) => {
    await persistTaxProfile(newTaxProfile);
    setTaxProfile(newTaxProfile);
  }, []);

  // Both of the per-year updates below patch the tax profile rather than replacing it, and both
  // no-op without one — there is nothing to attach a year to yet.
  const updateAmountSetAside = useCallback(
    async (year: number, amount: number) => {
      if (!taxProfile) return;
      const updated: TaxProfile = {
        ...taxProfile,
        amountSetAsideByYear: { ...taxProfile.amountSetAsideByYear, [year]: amount },
      };
      await persistTaxProfile(updated);
      setTaxProfile(updated);
    },
    [taxProfile]
  );

  const updateFiledTax = useCallback(
    async (year: number, filed: FiledYearTax) => {
      if (!taxProfile) return;
      const updated: TaxProfile = {
        ...taxProfile,
        filedTaxByYear: { ...taxProfile.filedTaxByYear, [year]: filed },
      };
      await persistTaxProfile(updated);
      setTaxProfile(updated);
    },
    [taxProfile]
  );

  // ⛔ These two used to set state BEFORE awaiting the write, and nothing rolled them back. The
  // caller alerts on the failure, but the switch stayed where the user put it — so a failed write
  // left someone looking at an App Lock they did not have, believing their financial data was
  // locked. They are also the only two mutations here that broke the contract stated above: persist
  // first, then update state, and throw. Now they keep it, like everything else in this file.
  const setAppLockEnabled = useCallback(async (enabled: boolean) => {
    await updateAppSettings({ appLockEnabled: enabled });
    setAppLockEnabledState(enabled);
  }, []);

  const setRemindersEnabled = useCallback(async (enabled: boolean) => {
    await updateAppSettings({ remindersEnabled: enabled });
    setRemindersEnabledState(enabled);
  }, []);

  const clearAllData = useCallback(async () => {
    await clearAllLocalData();
    setEntries([]);
    setLocalUserProfile(null);
    setTaxProfile(null);
    setAppLockEnabledState(false);
  }, []);

  // ─── Recovery ([D12]) ──────────────────────────────────────────────────────────────────────────
  //
  // All three clear `loadError` only on success, so a failed recovery leaves the user on the screen
  // that can still help them rather than dropping them into an app with no data.

  const retryLoad = useCallback(async () => {
    // Without this the retry is theatre: the resolved key is cached in a module-level promise, so
    // the second attempt would reuse the first attempt's answer (1.2.3.2).
    forgetCachedEncryptionKey();
    try {
      await load();
      setLoadError(null);
      return true;
    } catch (error) {
      reportError(error, { where: "AppDataProvider/retryLoad" });
      setLoadError(error);
      return false;
    }
  }, [load]);

  const recoverFromBackupFile = useCallback(async (json: string) => {
    const snapshot = await recoverFromBackup(json);
    setEntries(snapshot.entries);
    setLocalUserProfile(snapshot.localUserProfile);
    setTaxProfile(snapshot.taxProfile);
    setAppLockEnabledState(snapshot.appSettings.appLockEnabled);
    setRemindersEnabledState(snapshot.appSettings.remindersEnabled ?? true);
    setLoadError(null);
    return snapshot;
  }, []);

  const eraseAndStartOver = useCallback(async () => {
    await eraseUnreadableLocalData();
    setEntries([]);
    setLocalUserProfile(null);
    setTaxProfile(null);
    setAppLockEnabledState(false);
    setRemindersEnabledState(true);
    setLoadError(null);
  }, []);

  const restoreBackup = useCallback(async (json: string) => {
    const snapshot = await restoreBackupSnapshot(json); // throws on a malformed file
    setEntries(snapshot.entries);
    setLocalUserProfile(snapshot.localUserProfile);
    setTaxProfile(snapshot.taxProfile);
    setAppLockEnabledState(snapshot.appSettings.appLockEnabled);
    setRemindersEnabledState(snapshot.appSettings.remindersEnabled ?? true);
    return snapshot;
  }, []);

  const value = useMemo<AppDataValue>(
    () => ({
      ready,
      loadError,
      localUserProfile,
      taxProfile,
      entries,
      appLockEnabled,
      remindersEnabled,
      completeOnboarding,
      saveEntry,
      removeEntry,
      saveProfile,
      saveTaxProfile,
      updateAmountSetAside,
      updateFiledTax,
      setAppLockEnabled,
      setRemindersEnabled,
      clearAllData,
      restoreBackup,
      retryLoad,
      recoverFromBackupFile,
      eraseAndStartOver,
      reload: load,
    }),
    [
      ready,
      loadError,
      localUserProfile,
      taxProfile,
      entries,
      appLockEnabled,
      remindersEnabled,
      completeOnboarding,
      saveEntry,
      removeEntry,
      saveProfile,
      saveTaxProfile,
      updateAmountSetAside,
      updateFiledTax,
      setAppLockEnabled,
      setRemindersEnabled,
      clearAllData,
      restoreBackup,
      retryLoad,
      recoverFromBackupFile,
      eraseAndStartOver,
      load,
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error("useAppData must be used inside <AppDataProvider>");
  return value;
}
