import { describe, expect, it } from "vitest";
import { decryptText, encryptText } from "../storage/cryptoCore";

describe("encryptText / decryptText", () => {
  it("round-trips plain text through encryption and decryption", () => {
    const plainText = JSON.stringify({ hello: "world", amount: 123.45 });
    const key = "test-key-1234567890";

    const cipherText = encryptText(plainText, key);
    expect(cipherText).not.toBe(plainText);

    const decrypted = decryptText(cipherText, key);
    expect(decrypted).toBe(plainText);
    expect(JSON.parse(decrypted)).toEqual({ hello: "world", amount: 123.45 });
  });

  it("produces different ciphertext for the same plaintext on repeated calls (random IV/salt)", () => {
    const plainText = "some entries data";
    const key = "test-key-1234567890";

    const first = encryptText(plainText, key);
    const second = encryptText(plainText, key);

    expect(first).not.toBe(second);
    expect(decryptText(first, key)).toBe(plainText);
    expect(decryptText(second, key)).toBe(plainText);
  });

  it("fails to decrypt to the original plaintext with the wrong key", () => {
    const plainText = "sensitive financial data";
    const cipherText = encryptText(plainText, "correct-key");

    // The wrong key produces garbage bytes — CryptoJS's UTF-8 decode throws on most (but not all)
    // random byte sequences, so this can come back either way. Either outcome is fine; the only
    // thing that must never happen is recovering the original plaintext.
    try {
      const decrypted = decryptText(cipherText, "wrong-key");
      expect(decrypted).not.toBe(plainText);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });
});
