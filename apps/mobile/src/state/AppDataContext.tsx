import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Entry, FiledYearTax, LocalUserProfile, TaxProfile } from "../types";
import {
  addEntry,
  clearAllLocalData,
  deleteEntry as deleteEntryFromStore,
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
        // spinner forever with no feedback. The consumer decides what to show; this layer doesn't
        // own the UI.
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

  const setAppLockEnabled = useCallback(async (enabled: boolean) => {
    setAppLockEnabledState(enabled);
    await updateAppSettings({ appLockEnabled: enabled });
  }, []);

  const setRemindersEnabled = useCallback(async (enabled: boolean) => {
    setRemindersEnabledState(enabled);
    await updateAppSettings({ remindersEnabled: enabled });
  }, []);

  const clearAllData = useCallback(async () => {
    await clearAllLocalData();
    setEntries([]);
    setLocalUserProfile(null);
    setTaxProfile(null);
    setAppLockEnabledState(false);
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
