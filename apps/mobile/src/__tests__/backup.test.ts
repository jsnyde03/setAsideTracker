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

  it("carries every optional per-year field on the tax profile", () => {
    // ⚠️ The fixture above is a MINIMAL profile — no per-year records at all — so it would notice
    // none of these going missing. A backup silently dropping `filedTaxByYear` or the payment record
    // loses figures the user copied off their own 1040 and cannot be recomputed from anything the
    // app holds. Asserted field by field against the values that went IN, never against a second
    // trip through the writer, which would agree with itself about anything it dropped.
    const populated: TaxProfile = {
      ...taxProfile,
      amountSetAsideByYear: { 2026: 1500 },
      filedTaxByYear: { 2025: { totalTax: 3400, agi: 180000 } },
      estimatedPaymentsByYear: { 2026: { q1: 800, q2: 0 } },
    };

    const parsed = parseBackupSnapshot(
      JSON.stringify(
        buildBackupSnapshot({
          localUserProfile: profile,
          taxProfile: populated,
          entries,
          appSettings: { appLockEnabled: false },
        })
      )
    );

    expect(parsed.taxProfile?.amountSetAsideByYear).toEqual({ 2026: 1500 });
    expect(parsed.taxProfile?.filedTaxByYear).toEqual({ 2025: { totalTax: 3400, agi: 180000 } });
    // A recorded zero has to survive as a zero: it is the user saying "I paid nothing that quarter",
    // which is a different claim from the absent q3/q4, and `?? 0` anywhere on this path erases it.
    expect(parsed.taxProfile?.estimatedPaymentsByYear).toEqual({ 2026: { q1: 800, q2: 0 } });
    expect(parsed.taxProfile).toEqual(populated);
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

describe("a damaged backup is refused rather than restored", () => {
  // ⛔ Restore REPLACES everything before anything downstream validates it, so until 1.2.10.6 the
  // only check on the entries list was `Array.isArray`. A file with `entries: [{}]` restored
  // cleanly and then produced NaN in every derived tax figure, with nothing to undo.
  function fileWithEntries(entries: unknown[]): string {
    return JSON.stringify({ ...buildBackupSnapshot({ localUserProfile: profile, taxProfile, entries: [], appSettings: { appLockEnabled: false } }), entries });
  }

  it("accepts a well-formed entry — the control", () => {
    expect(parseBackupSnapshot(fileWithEntries(entries)).entries).toEqual(entries);
  });

  it.each([
    ["an empty object", [{}]],
    ["a null entry", [null]],
    ["a missing id", [{ ...entries[0], id: undefined }]],
    ["a malformed date", [{ ...entries[0], date: "10/03/2026" }]],
    ["a string where a number belongs", [{ ...entries[0], grossPay: "120" }]],
    ["a NaN amount", [{ ...entries[0], tips: Number.NaN }]],
    ["no expenses object", [{ ...entries[0], expenses: undefined }]],
    ["a non-numeric expense", [{ ...entries[0], expenses: { parking: 0, tolls: 0, supplies: 0, phone: "3" } }]],
  ])("refuses %s", (_label, bad) => {
    expect(() => parseBackupSnapshot(fileWithEntries(bad))).toThrow(/damaged/i);
  });

  it("names which entry is wrong, so the message can be acted on", () => {
    expect(() => parseBackupSnapshot(fileWithEntries([entries[0], {}]))).toThrow(/entry 2/i);
  });

  it("rejects the whole file rather than silently dropping the bad entry", () => {
    // Skipping it would be data loss the user cannot see: they asked for their data back and would
    // get most of it, with nothing saying which shift vanished.
    let restored: unknown;
    try {
      restored = parseBackupSnapshot(fileWithEntries([entries[0], {}]));
    } catch {
      restored = "refused";
    }
    expect(restored).toBe("refused");
  });
});
