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

/**
 * The SOURCE of JSX child expressions — `{formatCurrency(x)}` and the like — so an interpolated
 * figure counts as rendered.
 *
 * ⛔ **Attribute values are excluded, and that exclusion is the whole reason this is usable.** A
 * first version scanned raw child source and counted `size={18}` on an icon as a rendered number,
 * reporting **22 of 33 sites lossy**. An implausible answer is the instrument, not the app.
 */
function childExpressionSources(node: ts.Node, acc: string[] = []): string[] {
  node.forEachChild((child) => {
    if (ts.isJsxAttributes(child)) return;
    if (
      ts.isJsxExpression(child) &&
      child.parent !== undefined &&
      (ts.isJsxElement(child.parent) || ts.isJsxFragment(child.parent))
    ) {
      acc.push(child.getText());
    }
    childExpressionSources(child, acc);
  });
  return acc;
}

/**
 * Does this render MONEY? — `formatCurrency(...)`, a literal `$12`, or a `toFixed()` figure.
 *
 * ⚠️ **Currency only, and that was MEASURED rather than chosen.** A broad "contains a digit" signal
 * flagged 5 sites of which **4 were false positives**: the digit inside *"W-4 optimizer"*, and the
 * words *"amount"* and *"miles"*. A gate at that precision needs an exemption per benign case, and a
 * gate full of exemptions teaches everyone to add exemptions. **Currency flagged 7 sites and got all
 * 7 right.**
 */
const RENDERS_MONEY = /formatCurrency|\$\d|toFixed\(/;

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

/**
 * Wrappers whose label hides a currency figure their own children render (1.2.22.3).
 *
 * ⛔ **A GATE, not a reviewed list, and the difference is the whole point.** The fixture below asks
 * *"has a human signed off on this site?"* — a question about paperwork. It answered **yes** to
 * three labels that hid money: the tax-profile row (1.2.18.3), the entry row (1.2.20.3) and the
 * platform-compare card (1.2.22.2). ⚡ **Two of those three were signed off by me, days apart, while
 * actively looking for this exact class.** The reviewer's eye goes to words; a regex has no eye.
 *
 * ⚠️ **It does not replace the reviewed list.** The tax-profile row hid a filing status and a state,
 * not a figure — this gate would never have caught it. **Money is the subset that can be checked
 * mechanically**; the general case still needs a human, and the fixture is where that is recorded.
 */
const moneyLosers: string[] = [];

/** Every wrapper whose label swallows rendered text, keyed stably by file + label source. */
function shadowingSites(): string[] {
  const sites: string[] = [];
  moneyLosers.length = 0;
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
          const key = `${relative(SRC, file).replace(/\\/g, "/")} :: ${label}`;
          sites.push(key);
          // 1.2.22.3: and separately, a label that hides MONEY its own children render.
          const rendered = [...renderedText(node), ...childExpressionSources(node)].join(" ");
          if (RENDERS_MONEY.test(rendered) && !RENDERS_MONEY.test(label)) moneyLosers.push(key);
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

  /**
   * ⛔ **No allowlist, on purpose.** A reviewed entry is how the other three checks let a human say
   * "this one is fine", and **that mechanism is exactly what let three money-hiding labels through**.
   * A label that renders a currency figure and does not speak one is not a judgement call in a tax
   * app: it is a screen-reader user being told the name of a number they cannot hear.
   *
   * ⚠️ If a genuine exception ever appears, it needs a **sentence** here explaining why the figure is
   * not information — not a line appended to a JSON file.
   */
  it("never lets a label hide money its own children render", () => {
    shadowingSites(); // populates `moneyLosers` from the same single walk
    expect(
      moneyLosers.sort(),
      "these labels speak no figure while their children render one — a VoiceOver user hears the " +
        "name of an amount they never get told",
    ).toEqual([]);
  });

  /**
   * ⛔ The instrument, again. If `RENDERS_MONEY` ever stops matching anything — a rename of
   * `formatCurrency`, a refactor to a hook — the check above passes over every site in the app and
   * reports nothing forever. **It passes today because 7 sites render money; asserting that is what
   * makes its silence mean something.**
   */
  it("still recognises money somewhere — otherwise the check above is vacuous", () => {
    let rendersMoney = 0;
    for (const file of tsxFiles(SRC)) {
      const src = ts.createSourceFile(
        file,
        readFileSync(file, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
      );
      const visit = (node: ts.Node) => {
        if (ts.isJsxElement(node) && labelSource(node.openingElement) !== null) {
          const rendered = [...renderedText(node), ...childExpressionSources(node)].join(" ");
          if (RENDERS_MONEY.test(rendered)) rendersMoney += 1;
        }
        node.forEachChild(visit);
      };
      visit(src);
    }
    expect(rendersMoney, "no labelled wrapper renders currency — the signal has stopped working")
      .toBeGreaterThanOrEqual(5);
  });
});
