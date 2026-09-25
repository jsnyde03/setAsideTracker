import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

/**
 * An `accessibilityLabel` on a wrapper **replaces every word inside it** in the accessibility tree.
 * That is often right — it is how a row of icons and numbers becomes one sentence — and it is
 * sometimes a real loss: the Subscribe button said "Subscribe" and never its price, and the restore
 * row said "Restore from backup file" while the warning that it *replaces everything on the device*
 * was visible only to people who could see it.
 *
 * ⛔ **This gate exists because the sweep that found those was the third enumeration of the same
 * class, and the first two were mine and were short.** Reading for it by eye produced "about 12
 * wrappers, mostly benign"; parsing the AST found **26**, several lossy. The repo's own standing
 * lesson is that every complete list here came from a script and every short one came from a person,
 * so this is the script, kept.
 *
 * ⚠️ **Structural, not a word list.** It does not look for known component names or known phrases —
 * a JSX element that carries `accessibilityLabel` *and* renders literal text is the shape, whatever
 * it is called. A pattern built from names can only ever find what somebody already thought of.
 *
 * **What it asserts:** not that shadowing is absent, but that the set of places doing it is the set
 * somebody reviewed. A new one fails this test and has to be looked at and added — which is the
 * review that otherwise never happens twice.
 */

const SRC = join(__dirname, "..");

function tsxFiles(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === "node_modules" || name === "__tests__") continue;
      tsxFiles(p, out);
    } else if (name.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/**
 * Literal strings this subtree actually renders, in source order.
 *
 * ⛔ **`inChildExpr` is why this is not four lines, and the reason is a defect this gate had.**
 * The first version accepted a string literal only when its **direct** parent was the
 * `JsxExpression` — so `{last ? "Done" : "Next"}` was invisible, because the literal's parent is
 * the `ConditionalExpression`. ⚡ **Found the only way it could be: two buttons were written one
 * line apart with the same shadowing defect, the static one was caught on the first run and the
 * ternary one passed** (1.2.8.2).
 *
 * ⚠️ **The naive fix — "any literal under a JsxExpression" — is worse than the bug.** It sweeps in
 * `key="row"`, `style={{color: "red"}}` and every other attribute value, which render nothing.
 * So the flag is carried down through **child** expressions only, and is **switched off again on
 * entering any attribute list**, including a nested element's inside a child expression.
 */
function renderedText(node: ts.Node, acc: string[] = [], inChildExpr = false): string[] {
  node.forEachChild((child) => {
    if (ts.isJsxText(child)) {
      const t = child.text.trim();
      if (t) acc.push(t);
      return;
    }
    // An attribute list renders nothing, whatever it is nested inside.
    if (ts.isJsxAttributes(child)) {
      renderedText(child, acc, false);
      return;
    }
    const isChildExpression =
      ts.isJsxExpression(child) &&
      child.parent !== undefined &&
      (ts.isJsxElement(child.parent) || ts.isJsxFragment(child.parent));
    const within = inChildExpr || isChildExpression;
    if ((ts.isStringLiteral(child) || ts.isNoSubstitutionTemplateLiteral(child)) && within) {
      const t = child.text.trim();
      if (t) acc.push(t);
    }
    renderedText(child, acc, within);
  });
  return acc;
}

function labelSource(opening: ts.JsxOpeningLikeElement): string | null {
  for (const attr of opening.attributes.properties) {
    if (!ts.isJsxAttribute(attr) || attr.name.getText() !== "accessibilityLabel") continue;
    const init = attr.initializer;
    if (!init) return "(present, no value)";
    if (ts.isStringLiteral(init)) return init.text;
    return init.getText().replace(/\s+/g, " ");
  }
  return null;
}

/**
 * Files this walk could not parse.
 *
 * ⛔ **This exists because the omission was silent and I caused it.** A stray JSX comment made
 * `SafeHarborScreen.tsx` unparseable, the walk found no nodes in it, and the site count quietly
 * dropped from 26 to 25 while the gate went on **passing**. A syntax error is the loudest kind of
 * mistake everywhere else in this repo and was the quietest one here: an AST gate that skips what
 * it cannot read reports "nothing to see" for exactly the files most likely to have something.
 */
const unparseable: string[] = [];

/** Every wrapper whose label swallows rendered text, keyed stably by file + label source. */
function shadowingSites(): string[] {
  const sites: string[] = [];
  unparseable.length = 0;
  for (const file of tsxFiles(SRC)) {
    const src = ts.createSourceFile(
      file,
      readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    // `parseDiagnostics` is internal but is the only way to see that a file failed to parse:
    // createSourceFile returns a tree either way, just an empty-ish one.
    const diagnostics = (src as unknown as { parseDiagnostics?: unknown[] }).parseDiagnostics;
    if (diagnostics && diagnostics.length > 0) {
      unparseable.push(relative(SRC, file).replace(/\\/g, "/"));
    }
    const visit = (node: ts.Node) => {
      if (ts.isJsxElement(node)) {
        const label = labelSource(node.openingElement);
        if (label !== null && renderedText(node).length > 0) {
          sites.push(`${relative(SRC, file).replace(/\\/g, "/")} :: ${label}`);
        }
      }
      node.forEachChild(visit);
    };
    visit(src);
  }
  return sites.sort();
}

/**
 * The reviewed set lives in a JSON fixture beside this file.
 *
 * ⚠️ **Not a TypeScript array, and that is deliberate.** These keys ARE JSX source — backticks,
 * `${}`, quotes — so hand-escaping them into string literals is its own defect surface. The first
 * version of this list was typed by hand and two of its twenty-three entries were silently wrong,
 * transcribed from a console dump that had truncated them at 90 characters. JSON holds the bytes
 * exactly, and the fixture is generated rather than typed.
 *
 * ⚠️ Adding a line is a decision, not paperwork: it says a screen reader user gets at least what a
 * sighted user gets from the same control.
 */
const FIXTURE = join(__dirname, "a11yLabelShadowing.reviewed.json");

/**
 * ⛔ Regenerate with `UPDATE_A11Y_REVIEWED=1 npx vitest run a11yLabelShadowing` — and only after
 * reading the new sites. The update path exists so the fixture and the check share ONE
 * implementation: a separate generator script would be a second copy of this AST walk, and two
 * copies of a rule drift apart exactly where nobody is looking.
 */
if (process.env.UPDATE_A11Y_REVIEWED) {
  writeFileSync(FIXTURE, JSON.stringify(shadowingSites(), null, 2) + "\n", "utf8");
}

const REVIEWED: Set<string> = new Set(JSON.parse(readFileSync(FIXTURE, "utf8")) as string[]);

describe("accessibility labels that swallow their own children", () => {
  it("finds the class at all — the instrument, not the app", () => {
    // ⛔ Without this, an AST walk that silently matched nothing would make every assertion below
    // vacuously true, and this gate would read as "no problems" forever.
    expect(shadowingSites().length).toBeGreaterThan(10);
  });

  it("can actually read every file it claims to have checked", () => {
    shadowingSites();
    expect(
      unparseable,
      "These files did not parse, so this gate saw NOTHING in them and said nothing about it.",
    ).toEqual([]);
  });

  it("introduces no wrapper whose spoken name has not been reviewed", () => {
    const unreviewed = shadowingSites().filter((s) => !REVIEWED.has(s));
    expect(
      unreviewed,
      "A wrapper's accessibilityLabel replaces the text inside it. Read the visible text and ask " +
        "whether the label still carries everything it says — a price, an amount, a warning — then " +
        "add it to REVIEWED.",
    ).toEqual([]);
  });

  it("keeps the reviewed list honest — no entry for a site that no longer exists", () => {
    const live = new Set(shadowingSites());
    expect([...REVIEWED].filter((s) => !live.has(s))).toEqual([]);
  });
});
