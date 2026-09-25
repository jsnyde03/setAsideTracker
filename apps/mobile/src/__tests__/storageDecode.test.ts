import { describe, expect, it } from "vitest";
import { decodeStoredValue } from "../storage/decode";
import { decryptText, encryptText, isCipherText } from "../storage/cryptoCore";
import { UnreadableDataError, isUnreadableDataError } from "../storage/storageErrors";

const KEY = "0123456789abcdef0123456789abcdef";
const STORAGE_KEY = "gigTaxTracker:entries";

describe("isCipherText", () => {
  it("recognises what encryptText produces, for a range of payloads", () => {
    for (const payload of ["{}", "[]", JSON.stringify({ a: 1 }), JSON.stringify([1, 2, 3])]) {
      expect(isCipherText(encryptText(payload, KEY))).toBe(true);
    }
  });

  it("does not mistake the plaintext this app stores for ciphertext", () => {
    // Everything written here is JSON.stringify of an object or an array, so it starts { or [.
    expect(isCipherText("{}")).toBe(false);
    expect(isCipherText('{"appLockEnabled":true}')).toBe(false);
    expect(isCipherText("[]")).toBe(false);
    expect(isCipherText('[{"id":"1"}]')).toBe(false);
  });
});

describe("decodeStoredValue", () => {
  it("round-trips an encrypted value", () => {
    const value = { entries: [{ id: "a", amount: 12.5 }], note: "café" };
    const stored = encryptText(JSON.stringify(value), KEY);

    expect(decodeStoredValue(STORAGE_KEY, stored, KEY)).toEqual(value);
  });

  it("reads plaintext when there is no key, which is the web case", () => {
    const value = { appLockEnabled: true };

    expect(decodeStoredValue(STORAGE_KEY, JSON.stringify(value), null)).toEqual(value);
  });

  /**
   * ⭐ The case the old implementation got wrong, and the reason this module exists.
   *
   * A wrong key usually does NOT throw — CryptoJS returns an empty string. The old code caught
   * nothing, so it ran `JSON.parse("")`, caught THAT, and fell through to `JSON.parse(ciphertext)`,
   * surfacing a SyntaxError about JSON for a problem that is about keys. Over many keys because the
   * minority of wrong keys do throw, and a single fixture could land on either branch by luck.
   */
  it("throws UnreadableDataError for a wrong key — every time, not most of the time", () => {
    const stored = encryptText(JSON.stringify({ secret: "value" }), KEY);

    for (let i = 0; i < 100; i++) {
      const wrongKey = `wrong-key-${i}`;
      let thrown: unknown;
      try {
        decodeStoredValue(STORAGE_KEY, stored, wrongKey);
      } catch (error) {
        thrown = error;
      }

      expect(isUnreadableDataError(thrown), `key ${wrongKey} threw ${String(thrown)}`).toBe(true);
      expect((thrown as UnreadableDataError).storageKey).toBe(STORAGE_KEY);
    }
  });

  /**
   * Keeps the empty-string check load-bearing. Without it the empty decrypt would reach `JSON.parse`
   * and the error would arrive carrying a SyntaxError about JSON as its cause — the same misleading
   * diagnosis, just one level down, which is what someone reads in Sentry.
   */
  it("attributes a wrong key to the key, not to JSON", () => {
    const stored = encryptText(JSON.stringify({ secret: "value" }), KEY);
    // A key that decrypts to an empty string rather than throwing — the majority outcome.
    const silentlyWrongKey = Array.from({ length: 100 }, (_, i) => `wrong-key-${i}`).find((candidate) => {
      try {
        return decryptText(stored, candidate) === "";
      } catch {
        return false;
      }
    });
    expect(silentlyWrongKey, "no silently-wrong key found — the fixture is not testing the case").toBeTypeOf(
      "string"
    );

    try {
      decodeStoredValue(STORAGE_KEY, stored, silentlyWrongKey as string);
      expect.unreachable("should have thrown");
    } catch (error) {
      // Both halves matter. Without the type assertion this passes for any error that happens to
      // carry no cause — measured: it stayed green under a plant that restored the old fallback,
      // which throws a bare SyntaxError.
      expect(isUnreadableDataError(error)).toBe(true);
      expect((error as Error).cause).toBeUndefined();
    }
  });

  it("throws UnreadableDataError for a truncated payload", () => {
    const stored = encryptText(JSON.stringify({ secret: "value" }), KEY);

    expect(() => decodeStoredValue(STORAGE_KEY, stored.slice(0, stored.length - 8), KEY)).toThrow(
      UnreadableDataError
    );
  });

  it("throws UnreadableDataError for ciphertext with no key at all, rather than trying to parse it", () => {
    const stored = encryptText(JSON.stringify({ secret: "value" }), KEY);

    expect(() => decodeStoredValue(STORAGE_KEY, stored, null)).toThrow(UnreadableDataError);
  });

  it("throws UnreadableDataError for corrupt plaintext", () => {
    expect(() => decodeStoredValue(STORAGE_KEY, '{"truncated":', null)).toThrow(UnreadableDataError);
  });

  it("names the storage key it could not read, and never the encryption key", () => {
    const stored = encryptText(JSON.stringify({ secret: "value" }), KEY);

    try {
      decodeStoredValue(STORAGE_KEY, stored, "the-wrong-key");
      expect.unreachable("should have thrown");
    } catch (error) {
      expect((error as Error).message).toContain(STORAGE_KEY);
      expect((error as Error).message).not.toContain("the-wrong-key");
    }
  });
});

/**
 * A scalar is legal JSON and is never something this app wrote.
 *
 * ⛔ **These are the DETERMINISTIC half of the wrong-key story.** The 100-key loop above is
 * probabilistic by nature — it depends on `encryptText`'s random salt producing garbage that
 * happens to parse — and it was **measured failing 1 run in 20** before this rule existed. A
 * once-in-twenty guard is not a guard for a rule that should hold every time, so the rule is also
 * asserted head-on, with the right key and no luck involved.
 */
describe("a decoded scalar is not this app's data", () => {
  for (const scalar of ["5", "-1", "0", '"text"', "true", "null"]) {
    it(`rejects ${scalar}, which a wrong key can produce by chance`, () => {
      // Encrypted with the CORRECT key: this isolates the shape rule from any decryption failure,
      // so a pass cannot be coming from the empty-string or invalid-UTF-8 branches above.
      const stored = encryptText(scalar, KEY);
      expect(decryptText(stored, KEY)).toBe(scalar); // the decrypt genuinely succeeded
      let thrown: unknown;
      try {
        decodeStoredValue(STORAGE_KEY, stored, KEY);
      } catch (error) {
        thrown = error;
      }
      expect(isUnreadableDataError(thrown), `${scalar} was accepted as stored data`).toBe(true);
      expect((thrown as UnreadableDataError).storageKey).toBe(STORAGE_KEY);
    });
  }

  it("still accepts the shapes this app actually writes", () => {
    for (const value of [{}, [], { appLockEnabled: true }, [{ id: "a" }]]) {
      const stored = encryptText(JSON.stringify(value), KEY);
      expect(decodeStoredValue(STORAGE_KEY, stored, KEY)).toEqual(value);
    }
  });
});
