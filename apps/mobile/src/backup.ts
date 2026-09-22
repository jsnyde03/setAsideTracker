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
    entries: candidate.entries.map(validateEntry),
    appSettings: candidate.appSettings ?? { appLockEnabled: false },
  };
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/**
 * Checks one entry from a backup file well enough that restoring it cannot poison the app.
 *
 * ⛔ **Restore is DESTRUCTIVE — it replaces everything before anything is validated downstream** —
 * and until now the only check on the entries list was `Array.isArray`. A file containing
 * `entries: [{}]` therefore restored cleanly and then produced `NaN` in every tax figure derived
 * from it, with no error and nothing to undo. A backup is also the one input a user can hand the app
 * from outside: hand-edited, truncated by a sync, or written by an older version.
 *
 * ⚠️ **A bad entry rejects the whole FILE rather than being skipped.** Dropping it silently would be
 * data loss the user cannot see — they asked for their data back and would get most of it, with no
 * indication which shift went missing. Refusing outright leaves the device untouched, which is the
 * state they can still recover from.
 */
function validateEntry(entry: unknown, index: number): Entry {
  const where = `Entry ${index + 1}`;
  if (typeof entry !== "object" || entry === null) {
    throw new Error(`That backup file is damaged — ${where.toLowerCase()} isn't readable.`);
  }

  const candidate = entry as Partial<Entry>;
  if (typeof candidate.id !== "string" || candidate.id === "") {
    throw new Error(`That backup file is damaged — ${where.toLowerCase()} has no id.`);
  }
  if (typeof candidate.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(candidate.date)) {
    throw new Error(`That backup file is damaged — ${where.toLowerCase()} has no valid date.`);
  }
  // Compared as a plain string: `candidate` is typed as a `Partial<Entry>` for convenience, but the
  // value came out of a JSON file and is genuinely `unknown` — the point is to catch what the type
  // says cannot happen.
  if (typeof candidate.platform !== "string" || (candidate.platform as string) === "") {
    throw new Error(`That backup file is damaged — ${where.toLowerCase()} has no platform.`);
  }
  for (const field of ["grossPay", "tips", "mileage"] as const) {
    if (!isFiniteNumber(candidate[field])) {
      throw new Error(`That backup file is damaged — ${where.toLowerCase()}'s ${field} isn't a number.`);
    }
  }
  const expenses = candidate.expenses as Partial<Entry["expenses"]> | undefined;
  if (typeof expenses !== "object" || expenses === null) {
    throw new Error(`That backup file is damaged — ${where.toLowerCase()} has no expenses.`);
  }
  for (const field of ["parking", "tolls", "supplies", "phone"] as const) {
    if (!isFiniteNumber(expenses[field])) {
      throw new Error(`That backup file is damaged — ${where.toLowerCase()}'s ${field} expense isn't a number.`);
    }
  }

  return entry as Entry;
}
