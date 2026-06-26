import type { AppSettings, Entry, LocalUserProfile, TaxProfile } from "./types";

export const BACKUP_VERSION = 1;

export interface BackupSnapshot {
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  localUserProfile: LocalUserProfile | null;
  taxProfile: TaxProfile | null;
  entries: Entry[];
  appSettings: AppSettings;
}

/** Pure construction of a snapshot object from already-loaded data — the actual AsyncStorage
 * reads live in repository.ts, kept separate here so the shape-building/validation logic is
 * unit-testable without mocking storage. */
export function buildBackupSnapshot(data: {
  localUserProfile: LocalUserProfile | null;
  taxProfile: TaxProfile | null;
  entries: Entry[];
  appSettings: AppSettings;
}): BackupSnapshot {
  return { version: BACKUP_VERSION, exportedAt: new Date().toISOString(), ...data };
}

/**
 * Parses and validates a backup JSON string, throwing a descriptive Error (shown to the user via
 * Alert) rather than a cryptic parse error if the file is malformed, from a future/incompatible
 * version, or just isn't a backup file at all — restoring is a destructive operation (it
 * overwrites all current local data), so a clear failure here matters more than for a typical
 * "best effort" parse.
 */
export function parseBackupSnapshot(json: string): BackupSnapshot {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("That file isn't valid — it doesn't look like a backup export from this app.");
  }

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("That file isn't valid — it doesn't look like a backup export from this app.");
  }

  const candidate = parsed as Partial<BackupSnapshot>;
  if (candidate.version !== BACKUP_VERSION) {
    throw new Error(
      `This backup file's version (${String(candidate.version)}) isn't supported by this version of the app.`
    );
  }
  if (!Array.isArray(candidate.entries)) {
    throw new Error("That file isn't valid — it's missing the entries list.");
  }

  return {
    version: BACKUP_VERSION,
    exportedAt: candidate.exportedAt ?? new Date().toISOString(),
    localUserProfile: candidate.localUserProfile ?? null,
    taxProfile: candidate.taxProfile ?? null,
    entries: candidate.entries,
    appSettings: candidate.appSettings ?? { appLockEnabled: false },
  };
}
