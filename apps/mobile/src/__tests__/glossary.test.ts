import { describe, expect, it } from "vitest";
import { GLOSSARY, glossaryEntry, type GlossaryTermKey } from "../glossary";

describe("glossary", () => {
  it("every entry has a human term and a non-trivial plain-language definition", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(entry.term.length, key).toBeGreaterThan(0);
      // Definitions are explainers, not labels — guard against an accidental one-word stub.
      expect(entry.definition.length, key).toBeGreaterThan(40);
    }
  });

  it("avoids IRS form numbers in definitions (plain-language requirement)", () => {
    for (const [key, entry] of Object.entries(GLOSSARY)) {
      expect(entry.definition, `${key} mentions a form/schedule number`).not.toMatch(
        /\b(Schedule\s+[A-Z]|Form\s+\d|Line\s+\d)/
      );
    }
  });

  it("glossaryEntry returns the same object as the map", () => {
    const key: GlossaryTermKey = "selfEmploymentTax";
    expect(glossaryEntry(key)).toBe(GLOSSARY[key]);
  });
});
