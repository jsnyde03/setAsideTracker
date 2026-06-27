import { describe, expect, it } from "vitest";
import { buildBackupSnapshot, parseBackupSnapshot } from "../backup";
import type { Entry, LocalUserProfile, TaxProfile } from "../types";

const profile: LocalUserProfile = {
  id: "u1",
  displayName: "Test User",
  email: "",
  createdAt: "2026-01-01T00:00:00.000Z",
};
const taxProfile: TaxProfile = {
  filingStatus: "single",
  dependents: 0,
  hasW2Job: false,
  state: "TX",
};
const entries: Entry[] = [
  {
    id: "e1",
    platform: "doordash",
    date: "2026-03-10",
    grossPay: 100,
    tips: 5,
    mileage: 10,
    expenses: { parking: 0, tolls: 0, supplies: 0, phone: 0 },
    createdAt: "2026-03-10T00:00:00.000Z",
  },
];

describe("buildBackupSnapshot + parseBackupSnapshot round-trip", () => {
  it("round-trips a full snapshot through JSON exactly", () => {
    const snapshot = buildBackupSnapshot({
      localUserProfile: profile,
      taxProfile,
      entries,
      appSettings: { appLockEnabled: true },
    });
    const parsed = parseBackupSnapshot(JSON.stringify(snapshot));

    expect(parsed.localUserProfile).toEqual(profile);
    expect(parsed.taxProfile).toEqual(taxProfile);
    expect(parsed.entries).toEqual(entries);
    expect(parsed.appSettings).toEqual({ appLockEnabled: true });
    expect(parsed.version).toBe(1);
  });

  it("round-trips a never-onboarded snapshot (null profiles, empty entries)", () => {
    const snapshot = buildBackupSnapshot({
      localUserProfile: null,
      taxProfile: null,
      entries: [],
      appSettings: { appLockEnabled: false },
    });
    const parsed = parseBackupSnapshot(JSON.stringify(snapshot));

    expect(parsed.localUserProfile).toBeNull();
    expect(parsed.taxProfile).toBeNull();
    expect(parsed.entries).toEqual([]);
  });
});

describe("parseBackupSnapshot validation", () => {
  it("throws a descriptive error for invalid JSON", () => {
    expect(() => parseBackupSnapshot("not json{{{")).toThrow(/doesn't look like a backup/i);
  });

  it("throws a descriptive error for JSON that isn't an object", () => {
    expect(() => parseBackupSnapshot("42")).toThrow(/doesn't look like a backup/i);
  });

  it("throws a descriptive error for a missing/wrong version", () => {
    expect(() => parseBackupSnapshot(JSON.stringify({ version: 99, entries: [] }))).toThrow(/version/i);
  });

  it("throws a descriptive error when entries isn't an array", () => {
    expect(() => parseBackupSnapshot(JSON.stringify({ version: 1, entries: "nope" }))).toThrow(
      /missing the entries list/i
    );
  });
});
