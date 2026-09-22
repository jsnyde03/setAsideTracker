# v1.2 — Log

_The detail store for [V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md), which stays lean. Two things
live here: **scan records** (every before/after scan, at every level) and **completed-item detail**
(what shipped, how it was verified, what it surfaced). Newest on top within each section._

_It also holds **item specs for queued-but-not-active items** — decomposition belongs to the active
item only, so a queued item's spec waits here and is retrieved at its switch-in._

---

## Scan records

### 🔎 1.2.7.4 Every other screen at regular width — SUB-TASK after-scan · 2026-09-22 · ✅ DONE

**400 unit (from 398) · typecheck clean · 106/106 Playwright (66 chromium + 20 + 20) · lint 15
unchanged · ports free. 4 plants, 4 caught — but two of them only after the TEST was fixed.**

⚙️ **What shipped.** All four sheets capped at **540pt** (iOS's own iPad form-sheet width) and
centred, through **one** helper — `useSheetWidthStyle()` — rather than four copies of the same three
properties. The four sheets were already four copies of one pattern, and this repo has a standing
backlog entry about `formatCurrency` existing ten times because every caller fixed its own instance.
Plus `ipad-screens.spec.ts`: **12 routes read from `app/` at run time**, each asserted not to spill
at either iPad size, each screenshotted into `.results/` for the human half of the judgement.

⛔ **Confirmed, not assumed: `Screen`'s seam cannot reach a sheet.** A React Native `Modal` renders
in its own view tree, so the content column every other surface inherits simply does not apply.
Before this the weekly sheet was a **1366px slab with two rounded corners**.

🔴 **THE FINDING: the sweep's first overflow instrument could not fail, and twelve green tests said
otherwise.** It compared `document.documentElement.scrollWidth` to `clientWidth`. Every screen's
content sits inside a react-native-web `ScrollView`, which has its own `overflow` and **absorbs**
whatever width its children take — so the document never grows. ⚡ **Measured, not reasoned:**
planting `minWidth: 2000` on `/what-if` produced a 2000px div reaching **x=2347** and **27 elements
wider than the viewport**, while `scrollWidth` sat at exactly **1366** and all 12 route tests passed.
Replaced with element geometry (`getBoundingClientRect().right` against the viewport, plus a count of
elements wider than it), which then caught the same plant **and only on `/what-if`** — the other 11
stayed green, so it isolates.

⭐ **The plant is what found it, and nothing else would have.** Reading that assertion looks
perfectly sound; it is the same shape as CLAUDE.md's *"a check whose two sides come from ONE SOURCE
cannot fail, and reading it never reveals that — only planting does."* Here the single source was
**the browser's own scroll container**. ⚠️ And the diagnosis came first: the plant was checked for
having actually applied *before* the check was touched — it had.

🔴 **Second test defect, same family: a control that tested at a width where the defect is
invisible.** The compact sheet control ran at 393px. Planting *"constrain at every width"* passed it
— a 540pt cap cannot bind on a 393pt window, so the sheet is full-bleed either way. The control was
asserting something true of both the correct and the broken build. Added **744px** (iPad mini
portrait: compact by our breakpoint, but wider than the cap), which is the only region where the
mistake shows — and it reds at 540 vs >742. ⚡ **A plant that passes is information about the test:
twice in one sub-step, and both times the fix was the test, not the code.**

✅ **All 12 routes are clean at both iPad sizes under the corrected instrument** — no real overflow
defects anywhere in the app. That result is only worth stating *because* the instrument was proven
able to fail first; an hour earlier the same sentence would have been meaningless.

⚠️ **I wrote "derived from the router, not hand-written" above a hand-written array, and caught it
on re-read.** Made true rather than softened: `readdirSync("app")`, with a guard that throws if
fewer than 10 routes are found, so a wrong path cannot silently sweep nothing. Same failure this
repo logged as *findings cite comments as evidence* — a claim in a comment is not a measurement,
including when it is mine and thirty seconds old.

📋 **Human review still owed:** "does it look designed for an iPad" is not machine-decidable. The
screenshots are in `apps/mobile/e2e/.results/` under each `ipad-*` project — 12 screens × 2
orientations, plus the sheets. **Worth a look before the reserved build**, because a layout fault
that is merely *ugly* passes every assertion here.

### 🔎 1.2.7.3 Dashboard at regular width — SUB-TASK after-scan · 2026-09-22 · ✅ DONE

**398 unit · typecheck clean · 76/76 Playwright (66 chromium + 5 + 5) · lint 15 unchanged · ports
free. 3 plants, 3 caught.**

⚙️ **What shipped ([D25]).** A two-column band inside the `FlatList`'s `ListHeaderComponent`: money
left (total, set-aside, progress, Log Earnings), insight cards right, "Recent entries" and the list
full-width beneath. The dashboard is the **first and only `width="full"` consumer**, which is what
turns 1.2.7.2's opt-out from a tested helper into a used one.

🔴 **The structural find, and it decided the design: the dashboard is a `FlatList` whose header
holds the ENTIRE screen.** Everything above the entry rows — greeting, three cards, actions, six
insight cards — is one `ListHeaderComponent`. That is why the "cards left / shifts right" split was
the expensive option: it needs the header lifted out of the list entirely. The chosen band is a
wrapper around children that were already siblings.

⚠️ **All six insight cards are conditional, so a brand-new user has NONE** — and a two-column band
with an empty right half reads as a rendering fault, not as space. `twoColumn` therefore requires
`insightCardCount > 0`. ⭐ **The count is derived from the same six named booleans that gate the
cards**, because a second copy of those conditions would agree today and drift the first time one
changed. Planting the guard away reproduces exactly the defect: **673px of asymmetry**, the card
stranded in the left half.

🔴 **I wrote a test with a hole and found it by predicting a plant would survive.** The side-by-side
assertions (`money` ends before `insight` begins, `insight` past mid-screen) all hold **even if
`width="full"` is never passed** — the columns would simply be squeezed into the 672pt reading
measure. So the one thing .3 exists to prove about .2's opt-out was unasserted. Added
`bandWidth > READABLE_CONTENT_MAX_WIDTH` *before* running the plant, then confirmed it reds at
**632**. ⚡ **The useful habit is the order: ask what a plant would do before running it, and treat
"it would pass" as a finding about the test rather than a reason to skip the plant.**

🧪 **The plants.** ⓔ `width="full"` never passed → caught at 632 *(and would NOT have been caught an
hour earlier)*. ⓕ the empty-column guard removed → caught by **two** tests, 673px asymmetry.
ⓖ `flexDirection: "row"` removed → columns stack, insight card falls to x=20 while the money card
ends at 502.

✅ **All 66 chromium tests pass unchanged**, and this was the real risk: they run at 1280px, which
is regular, and most of them log entries — so they now exercise the **two-column** dashboard, not
the one they were written against. They survive because they select by text and accessible name
rather than position. ⚠️ **Corollary worth stating: no test anywhere now exercises the phone-layout
dashboard**, which sharpens the phone-width gap already filed from this item's before-scan.

🧹 **Reindented 369 lines, deliberately and separately.** The wrappers were first inserted without
reindenting their children, leaving `<View style={styles.summaryCard}>` at 12 spaces inside a parent
at 14 — structurally correct and a lie to anyone reading the tree. Whitespace only; typecheck and
all 76 tests re-run after. ⚠️ **Review this commit with `git diff -w`** — the real change is ~40
lines. (No prettier config exists in this repo, so nothing would have done it automatically.)

⏭ **Carried into 1.2.7.4:** the remaining 14 screens, sheets and modals first. The sheets are the
known-bad case — `Modal` + a bottom sheet with no `maxWidth`, so they span the full 1366px — and
`Screen`'s seam does **not** reach them, because a `Modal` renders outside the screen's view tree.
**1.2.7.4 needs its own constraint for the four sheets; .2's fix does not cover them.**

### 🔎 1.2.7.2 The size-class seam — SUB-TASK after-scan · 2026-09-22 · ✅ DONE

**398 unit (from 382) · typecheck clean · 72/72 Playwright (66 chromium + 3 + 3) · lint 15
unchanged · ports free. 4 plants, 4 caught.**

📏 **The number the item exists to move: a 1326px card became 632px, centred to the pixel.**

| viewport | card | gutters | before |
|---|---|---|---|
| iPad portrait 1024 | 632px | 196 / 196 | 984px at x=20 |
| iPad landscape 1366 | 632px | 367 / 367 | 1326px at x=20 |

⚙️ **What shipped.** `src/layout.ts` holds the rule — `REGULAR_WIDTH_BREAKPOINT = 768`,
`READABLE_CONTENT_MAX_WIDTH = 672`, `resolveSizeClass`, `resolveContentMaxWidth` — and
`useSizeClass.ts` the one-line hook over `useWindowDimensions`. `Screen.tsx` is the only default
caller, so the seam is applied once for all 15 screens. A screen needing real columns opts out with
`width="full"` (the dashboard, at 1.2.7.3).

⚠️ **Neither constant is invented, which matters in a repo that retired a "~30 entries" gate for
exactly that reason ([D20]).** 768 is the narrow edge of every iPad in portrait, so a full-screen
iPad is always regular and the widest iPhone (440pt) is always compact. 672 is roughly where iOS's
own `readableContentGuide` caps — the system's answer to the same question. ⭐ **And the breakpoint
is a WIDTH test, not a device test, on purpose:** an iPad in a half or third split hands the app
320–507pt, where a tablet layout is worse than the phone one. `Platform.isPad` cannot see that.

🔴 **I wrote the rule/hook split into the docstring and then defeated it in the same file.**
`layout.ts` shipped with `useSizeClass` at the bottom importing `react-native` — which made **every
test in `layout.test.ts` uncollectable**, because vitest runs in plain Node and react-native's entry
point is Flow-typed. ⚡ **The failure mode is worse than a coverage gap: the suite reports a broken
FILE, and a broken file is easy to scroll past.** Caught immediately only because the new tests were
run before anything else.

⭐ **So the promise became a gate, and planting it taught something the crash did not.**
`layout.test.ts` now asserts `layout.ts` contains no `react-native` import. Planting the import
back reds the gate — **while the other 15 tests still pass**, because an *unused* import is elided.
So the crash only arrives once something uses it. **The text gate is strictly stronger than the
failure it guards**: it fires while the import is still harmless, instead of when it breaks the file.

✅ **The split turned out to be an existing repo pattern, not an invention.** `appReview.ts`
(react-native wiring) and `appReviewPolicy.ts` (pure, tested) already did exactly this. ⚠️ **Found
by measuring, after a by-name sweep misled me**: `appReview.test.ts` imports `appReviewPolicy`, so
"does `appReview.ts` have a test?" answered *yes* by filename and *no* in fact. **A filename is not
a coverage claim.** Filed to 1.2.11 — two instances and nothing names the convention, the same shape
as `setAsideRate`'s hazard being commented in one file and repeated in another.

🧪 **The plants, and why these four.** ⓐ compact exemption removed → the phone letterboxes itself;
unit caught. ⓑ the `react-native` import restored → gate caught. ⓒ `alignSelf` removed → capped but
pinned left, **694px of gutter asymmetry**; only e2e could catch this. ⓓ `maxWidth` computed but
never applied → **1326px, the exact baseline number**. ⚡ **ⓓ is the important one:** every unit test
stays green while nothing changes on screen — *a tested helper is not a used helper*, and the only
thing standing between the rule and that outcome is the iPad projects added at 1.2.7.1.

✅ **The risk the before-scan flagged did not materialise: all 66 chromium tests pass unchanged.**
They run at 1280px, which is regular, so they now render the constrained layout — and none of them
depended on full-bleed positioning, because they select by text and accessible name.

⏭ **Carried into 1.2.7.3:** the dashboard is the first `width="full"` caller, and the opt-out exists
and is unit-tested but **has no consumer yet** — the same "correct rule, wired by nothing" shape
this repo has hit twice (`loadError`, `useReminderRefresh`). .3 is what proves it.

### 🔎 1.2.7.1 Flip the tablet flag + the iPad instrument — SUB-TASK after-scan · 2026-09-22 · ✅ DONE

**382 unit (from 378) · typecheck clean · 70/70 Playwright (66 chromium + 4 iPad) · lint 15
unchanged · ports free. 4 plants, 4 caught.**

⛔ **The sub-step was MISDESCRIBED, and building it is what found that.** It read *"unlock
`orientation` (portrait today)"*. Expo's `orientation` is a **global** key: `@expo/config-plugins`'
`setOrientation` writes exactly one Info.plist entry, `UISupportedInterfaceOrientations`, and
**never the `~ipad` variant** — verified in the plugin's source, not assumed. Done as written, an
iPad item would have let the **iPhone** rotate into landscape: a device class with no landscape
design, and — per this item's own before-scan — **no test coverage at phone width at all.** ⚡ **The
before-scan passed this through**, exactly as `preauthored-items-fail-two-ways` predicts: confirming
"`orientation` is `portrait`, as the plan says" is what a before-scan does. Only reaching for the
mechanism caught it.

✅ **What shipped instead:** `orientation: "portrait"` stays (it is the iPhone's setting), and
`ios.infoPlist["UISupportedInterfaceOrientations~ipad"]` carries all four. iOS prefers the `~ipad`
variant on iPad and the base key elsewhere. ⚠️ **This depends on a second verified fact:**
`createInfoPlistPluginWithPropertyGuard` suppresses the orientation plugin only when `ios.infoPlist`
sets the **exact** key it owns — so the `~ipad` variant does not trip the guard.

⭐ **`tabletOrientation.test.ts`, and the 4th plant is the one that earns it.** Claims gated
separately: ships to iPad · iPhone stays portrait · the `~ipad` array · **and a control asserting
the BASE key is absent from `infoPlist`.** Planting *the base key written instead of the variant* —
the realistic mistake — reds two tests, and without the control it would have been **invisible**:
that plant silences the orientation plugin via the guard, so the phone rotates while the config
still looks deliberate. Each plant red exactly its own claim; the other three stayed green.

🔴 **A measurement refuted my own instrument mid-step, and it read as evidence.** The baseline test
first measured the bounding box of the *heading text node* and reported the content spanning **12%**
of a 1366px viewport — which looks exactly like "the layout is already constrained." It was the
width of the words. Dumping the ancestor chain showed the card at **1326px of 1366 (x=20)**. ⚡ **The
claim was right and the instrument was wrong**, and the only reason it surfaced is that the number
disagreed with the claim — had the text happened to be wide, it would have passed and been believed.
Now selected structurally, by walking to the nearest ancestor with a real border radius, because
react-native-web's class names (`css-view-g5y9jx r-borderRadius-…`) are content hashes, not a
contract. ⚡ Same shape as CLAUDE.md's covered-route rule: *"a broken instrument that agrees with you
is indistinguishable from evidence."* That rule was written about a probe reading surviving local
state; this is the second instance, and the first outside navigation — **worth reading as a general
hazard of any measurement written alongside the claim it is meant to test.**

📏 **The baseline, as numbers rather than impressions** — this is what 1.2.7.2 moves:

| viewport | card width | x | span |
|---|---|---|---|
| iPad portrait 1024 | 984px | 20 | **98%** |
| iPad landscape 1366 | 1326px | 20 | **99%** |

A 1326px-wide card is a text measure no one can read — "stretched to fit", stated as a figure.
⚠️ **The baseline test asserts `> 0.9` deliberately, so 1.2.7.2 turns it RED** and it must be
rewritten to the constrained expectation. A baseline that keeps passing after the fix is a test of
nothing.

✅ **Answered: the app does NOT break when wide.** `scrollWidth <= clientWidth` at both iPad sizes,
and the 66-test suite was already running at 1280. The item's content is appearance, not survival —
which is what made [D24] available in the first place.

⚙️ **Playwright scoping matters as much as the viewports:** `chromium` carries all 66 with
`testIgnore` on `ipad-*.spec.ts`; the two iPad projects `testMatch` those alone. Running 66 × 3 on a
serial suite would triple runtime to re-prove viewport-independent logic. Confirmed by the count:
**70 = 66 + 2 + 2.**

⏭ **Carried into 1.2.7.2:** **5 of the repo's 15 lint findings live in `Screen.tsx`** — the file .2
edits. All pre-existing `react-hooks/refs` on the `Animated.Value` refs, none introduced here.
Recorded so .2's diff is not blamed for them, and so 1.2.11's re-count knows they were already there.

### 🔎 1.2.7 Native iPad — TASK before-scan · 2026-09-22

**Premises checked against the code before acting, per §0. Three held, one was wrong, and one
reframed the item.**

✅ **Held.** `ios.supportsTablet: false` and `orientation: "portrait"` in `apps/mobile/app.json`. ·
`components/Screen.tsx` is genuinely the single seam — **all 15 screens import it**, which is a
*stronger* claim than the plan made, so the "no screen invents its own breakpoint" design holds by
construction rather than by discipline. · Sheets are full-bleed: no `maxWidth` appears in any
component, and the four `Modal`s use a backdrop + bottom-sheet pattern that spans the full width.

⚠️ **Wrong: "the other 12 screens."** There are **15** in `src/screens/`. `RecoveryScreen` was added
at 1.2.3 and `LockScreen` was never counted. Corrected in the plan to 14. **Third instance of a
stale count surviving in the plan** after the two 2026-09-20 renumbers and the "1.2.3 = mileage"
rot — all three found by grepping rather than by reading, which is the usable tell.

⚡ **The reframe, and it is the reason the item changed shape: 1.2.7 was promoted as
"almost entirely visual and device-owed" ([D21]), and that is not true.** The Playwright suite's
only project is `Desktop Chrome` at **1280×720** — *wider than iPad portrait (1024)* and about iPad
landscape. So **66 green e2e tests have been rendering this app at regular width all along.** The
app therefore provably survives being wide *functionally*; what it lacks is any *design* for it
(zero `maxWidth` outside `LockScreen`/`RecoveryScreen`). The item's real content is appearance, not
survival — and appearance is screenshot-able locally.

⭐ **Consequently the implementation choice decides whether the item is verifiable here.** Nothing in
the repo uses `useWindowDimensions` yet. Built on it, the breakpoint re-renders on resize, so
**1.2.7.5 (Split View live-resize) falls out by construction** and Playwright can assert it by
resizing the viewport mid-test. Built on a `Platform.isPad`-style constant, **both** are lost — the
layout would settle on mount, which is precisely what .5 exists to catch. **A device-owed item was
device-owed because of how it was going to be built, not because of what it is.**

✅ **[D24] (Jason 2026-09-22): the seam is `useWindowDimensions`; iPad viewports join the e2e suite.**
.1–.5 verify here; the reserved build confirms *fidelity* — fonts, safe areas, real Split View — and
.6 (hardware keyboard) stays genuinely device-owed. ⚠️ **This does not make the build optional**, and
the standing caveat still applies: react-native-web at 1024px is not UIKit at 1024pt. It moves the
build from *discovering* layout breaks to *confirming* their absence.

⚡ **Sequencing reinforced rather than re-opened:** the reserved build already owes "every iPad
layout", so building iPad **now** is what makes the one-build agenda work. Deferring 1.2.7 past the
build costs a second build — the scarce resource — which is the opposite of what [D21]'s reasoning
was protecting.

🔴 **Filed to the backlog (not folded): no test in this repo has ever rendered the app at PHONE
width.** The app ships portrait iPhone only and its entire e2e suite runs at 1280px. Adding a
390×844 project is one config line, but it could red an unknown number of tests, which is a triage
workstream rather than an iPad sub-step → 1.2.9/1.2.11. ⚡ **Found only because the iPad question
forced a read of the Playwright config** — the omission of the *shipping* width had been invisible
for the whole version.

### 🔎 1.2.10 — WHOLE-ITEM after-scan · 2026-09-22 · ✅ CLOSED (6 built, 2 deferred)

**378 unit (from 346) · 102 engine · 66/66 Playwright · typecheck clean · lint 15 unchanged · both
tax-config gates green · ports free. 9 plants, 9 caught.**

⚡ **The pattern across the item: every defect was a CLAIM-vs-REALITY gap, not a code bug.** This was
nominally paperwork — a manifest, a declaration, some labels — and it surfaced a **lockout**, a
**data-poisoning restore**, and four documents disagreeing about what the app collects. ⛔ **The
compliance work was not adjacent to correctness; it was a route into it**, because every compliance
artifact is a statement about behaviour and checking it means checking the behaviour.

⭐ **Four written promises became four executable gates**, which is the item's real output:
`analyticsPrivacy` (property allow-list, catches keys nobody forbade) · `privacyClaimsAgree`
(manifest vs. App Store table, plus retired claims) · `exportCompliance` (the deliberate absence,
which is the kind of absence someone helpfully fixes) · backup shape validation. **A promise in a
document survives any amount of drift; a gate does not.**

🔴 **Three of seven sub-steps were misdescribed by the plan, and I wrote all three.** .5 claimed the
policy promises an opt-out — it promises nothing of the kind. .7 assumed an incomplete profile was a
correctness risk — measured, it sets aside *too much*, never too little. And **.2's framing was
wrong about the operative test**: I told Jason the distinction was crypto-js versus the OS's crypto,
when Note 4 turns on **primary function**. ⚡ **That one is the most instructive, because it was
wrong in a way that still reached a correct recommendation** — the answer (stop asserting, let Apple
classify) does not depend on the reasoning I got wrong. **Following 1.2.6, where 3 of 6 were wrong as
specified, the rate is now 6 of 13.**

⚡ **[D23] is the shape worth reusing: when a question is genuinely outside our competence, stop
answering it and route it to whoever can.** Removing the bypass key costs one manual step per upload
and replaces a guess with Apple's own classification. ⚠️ Its cost is documented in **both** checklists
because an unexplained "Missing Compliance" reads exactly like a broken build — and this project has
burned cycles on that kind of misreading before.

**Retroactive catch:** 1.2.10.6's new validation rejected an existing recovery fixture on its first
run — `{ id: "r1", grossPay: 250 }`, a shape no writer in the app can produce. The fixture was wrong,
not the gate.

**Replenishment → 1.2.7 (native iPad)**, decomposed. ⚠️ Promoted with its weakness stated: its
verification is almost entirely visual and device-owed, so it will **bank** checks for the reserved
build rather than clear them here. 🔴 And flipping `supportsTablet` **obliges iPad screenshots** in
App Store Connect — a submission requirement that ships with the flip, not after it.


### 🔎 1.2.10.3 / .4 / .6 — after-scans · 2026-09-22 · ✅ DONE _(.5 and .7 deferred, .2 blocked)_

**376 unit (from 358) · 102 engine · 66/66 Playwright · typecheck clean · lint 15 unchanged ·
both tax-config gates green · ports free. 3 plants, 3 caught.**

⭐ **1.2.10.3 — the [D16] sweep found FOUR disagreements, and two were an hour old.** Reading the
three documents side by side is the review nobody performs twice, and it showed:

1. The privacy manifest written in 1.2.10.1 declared **three** data types; the App Store table
   declares **four**. **Performance Data was simply missed** — and `Sentry.init` runs with
   `tracesSampleRate: 0.2`, so it is genuinely collected. Verified in the code before declaring it.
2. Crash Data's purposes disagreed — manifest `AppFunctionality`, labels `App Functionality +
   Analytics`.
3. The **policy** described crash reports and said nothing about performance tracing.
4. `STORE_LISTING.md` still said analytics sends "a state code" — **one hour after [D22] stopped
   sending it.** My own change created that drift, in the document [D16] exists to keep in step.

⚡ **Now a gate rather than a habit:** a test parses the manifest's declared types and the store
listing's table rows and requires them to be equal, plus a retired-claims list that fails any
document still asserting something the app stopped doing. Both real drifts were planted and both red.

🔴 **1.2.10.4 was a LOCKOUT, not untidiness.** `clearAllData` called `setAppLockEnabledState(false)`
— **in memory only** — while the persisted `appLockEnabled: true` survived, so the erase looked
complete and the *next launch* read it back and put Face ID in front of an app with nothing in it.
The published "deletes everything stored on your device" was false in the same breath. ⚠️ The theme
lives in `appSettings` too and now resets; that is the promise being kept rather than a side effect.

⭐ **1.2.10.6 — restore validated the entries list with `Array.isArray` and nothing else**, while
being **destructive**: it replaces everything first. A file containing `entries: [{}]` restored
cleanly and produced `NaN` in every derived tax figure. Entries are now shape-checked, and a bad one
**refuses the whole file** and names which entry — skipping it silently would be data loss the user
cannot see, having asked for their data back and received most of it.

⚡ **The new validation immediately caught an unrealistic FIXTURE, on its first run.** A recovery test
restored `{ id: "r1", grossPay: 250 }` — no date, platform or expenses — a shape no writer in the app
can produce. `seeds-omit-always-written-fields` exactly: the fixture was wrong, not the validation,
and the test now restores something a user could actually have backed up.

⏭ **.5 and .7 deferred to v1.3, and one of them because MY OWN ROW WAS WRONG.** 1.2.10.5's row said
*"the policy promises one and there is none"* — the policy promises no such thing; I checked. It is a
feature, and so is the completeness prompt: missing W2 figures yield zero withholding, so an
incomplete profile sets aside **too much**, never too little. **Both measured before deferring.**
⚠️ That row was written the previous day, by me — `preauthored-items-fail-two-ways` does not care how
old a claim is.

### 🔎 1.2.10.1 iOS privacy manifest — after-scan · 2026-09-22 · ✅ DONE

**358 unit (from 346) · 102 engine · 66/66 Playwright · typecheck clean · lint 15 unchanged ·
ports free. 3 plants, 3 caught.**

⚡ **The sub-step's own framing was right and answered itself in ten minutes.** "Does Expo's prebuild
already generate one?" — it does, from `ios.privacyManifests`, and `withPrivacyInfo` opens with
`if (!privacyManifests) { return config; }`. **The key was absent, so the app shipped with no
app-level manifest at all** while **12 dependencies ship their own**. Reading the generator settled
in minutes what "write a manifest" would have guessed at.

⚠️ **The dependency count came from the repo ROOT, and the first search returned zero.** This is an
npm workspace: `apps/mobile/node_modules` holds **nothing**, everything hoists. A sweep scoped to the
package directory reported "no privacy manifests anywhere" — which would have been read as *the
dependencies are non-compliant* rather than *I searched the wrong tree*.
`truncated-search-hides-a-class`, earned again, and the tell was that the answer was suspiciously
absolute.

🔴 **A defect I shipped in 1.2.6.3 surfaced here, and the CALENDAR found it rather than any test.**
The demo seeded each past quarter with `Math.round(perQuarter)` against the **unrounded**
requirement, so whether the persona read "nothing overdue" depended on which way the cents rounded —
**green on 2026-09-21, red on 2026-09-22**, because the seeded entries move with the date. Fixed
three ways: the seed pays up (`ceil`), sub-cent gaps are clamped (they are float noise from
`miles × rate`, not money), and a sub-dollar shortfall now renders with cents instead of reading
"$0 short". ⛔ **The guard that matters is date-INDEPENDENT** — the invariant runs over the seed's
existing seven sample dates, and **planting the old `round` reds only 2 of the 7.** That ratio is the
whole lesson: *a demo assertion that depends on today's date is a latent coin flip, and it will be
green the day you write it.*

**[D22] removed a question instead of answering it.** Analytics sent the user's state code, and a US
state is information about where someone is at lower precision than three decimal places — Apple's
Coarse Location, however the app came by it. Declaring it would have put a location category in the
manifest, the App Store labels **and** the policy, on a tax app that otherwise collects none. Not
collecting it deletes all three. ⭐ **Enforced by a gate rather than a promise:** a test parses the
property keys actually passed to `trackEvent` and fails anything outside an allow-list. Planted both
directions — the named-forbidden `state` **and** a `zipCode` nobody had thought to forbid — and the
allow-list is what caught the second. The policy's claim now has something holding it up besides
review.

⛔ **What this sub-step cannot prove, and says so:** the app's own `NSPrivacyAccessedAPITypes` list.
Apple's check runs at upload and the ITMS-91053 mail names the missing categories; nothing on this
machine can. `UserDefaults / CA92.1` is declared because it is true. **The first submission is the
gate**, which is the whole reason [D21] put this before any device build.

### 🔎 1.2.6 Premium slice — WHOLE-ITEM after-scan · 2026-09-21 · ✅ CLOSED 6/6

**346 unit · 102 engine · 66/66 Playwright · typecheck clean · both tax-config gates green ·
lint 15 unchanged · ports free. 31 plants across the item, 31 caught.**

⚡ **The headline across all six sub-steps: THREE of them were wrong as specified, and every one was
caught by a before-scan rather than by building.** 1.2.6.1's "mostly a surfacing fix" was a build.
1.2.6.3's per-year payments model could not answer the question the tracker exists to answer.
1.2.6.4's headline had **no data behind it** and its other half **already shipped free**, so building
it as written would have failed the slice's own gating rule. **The ratio is the argument for the
scan**: three corrections, none of which cost more than an hour to find, against features that would
have shipped wrong or not at all.

🔴 **The sweep's real find: a class of three DEAD SAVE PATHS, and I nearly dismissed it with a broken
probe.** `onEndEditing` does not fire on a web blur, so every figure typed into three inputs was
discarded — and the two safe-harbor fields have **no Save button**, so blur was the only path they
had. All three now use `onBlur`, which fires on both platforms, with an e2e asserting persistence
**across a real `page.reload()`**.

⛔ **Two of my own probes were wrong before one was right, and the reason is the same fact three
times.** Probe 1 navigated to Settings and back, concluded the value had persisted, and *refuted*
the finding — but the dashboard is the index route and Settings is pushed **over** it, so nothing
unmounted and I was reading the input's surviving local text as if it were storage. Probe 2 fixed
that with a reload, which drops demo mode's **in-memory** store entirely. Only probe 3 — a real
onboarded user, a real reload — measured anything. ⚡ **The covered-thing-stays-mounted fact bit
three separate times this item** (an absence assertion, a modal's duplicate "Close", and now my own
instrument), and the third was the expensive one because *a broken instrument that agrees with you
is indistinguishable from evidence.* `run-the-control-on-the-verifier`, earned again.

⚠️ **My hand-built lists undercounted and my first scripts miscounted — in both directions.** The
`onEndEditing` class: I said two sites, the script found **three**. The premium-route class: my
first script keyed on the string `(Premium)` in a docstring, which **missed the screen I had just
written** (its docstring reads `(Premium, [D20])`) and **falsely flagged two free screens** that
merely mention premium fields. Re-derived from the actual gate —
`canUsePremium ? X : onOpenPaywall` — it returns exactly five, and my hand count was right after all.
**The lesson is not "script it", it is "derive it from the mechanism":** a pattern over prose encodes
only what I already thought of, while a pattern over the *gating expression* cannot miss a synonym.

**Fixed in the sweep:** `year-over-year.spec.ts`'s soft-gate test asserted the card was absent with
nothing confirming the dashboard had rendered — `toHaveCount(0)` is equally true of a blank page, and
every other soft-gate test in the suite pairs its absence with a positive. **Filed:** four remaining
absence-assertion candidates (script artifacts, but the script is worth re-running at 1.2.11), and
`RequirePremium`, which still does not exist — ⚠️ **one of this item's own new tests reaches
`/safe-harbor` directly** *because* of that hole, so closing it changes that test in the same edit.

**Two live v1.1.1 defects were fixed as a side effect of building features on top of them** — the
tax-profile edit erasing `filedTaxByYear`, and reminders that reached no existing install while their
queue silently drained. Neither was on any backlog; both were found by a before-scan asking what the
code actually did before trusting what the plan said it did.

### 🔎 1.2.6.5 Expense-breakdown drill-down — after-scan · 2026-09-21 · ✅ DONE

**346 unit (from 339) · 102 engine · 64/64 Playwright (3 new) · typecheck clean · lint 15 unchanged ·
ports free. 7 plants, 7 caught.**

**The item was one word — "drill-down" — over a screen that already existed**, so the before-scan's
job was deciding whether anything was left. It was: **nothing on `ExpenseBreakdownScreen` was
tappable except Close**, and `buildScheduleCSummary` carried no per-entry attribution at all. So the
plain reading — tap a Schedule C line, see the entries behind it — was genuinely unbuilt, and it sits
squarely on the tax-time axis: this is *substantiation*, which is why it is a separate sheet from
`BreakdownDetailSheet` (that one answers "how was this calculated" with glossary terms).

✅ **The rows sum to the line exactly, and that was checked rather than hoped.** `deductionAmount` is
`miles × rate` **unrounded** over the same per-entry mileage the drill-down reads, so
`Σ(mᵢ × r) = (Σmᵢ) × r`. **1.2.4 needed an explicit adjustment row for the analogous problem; this
does not** — and a test asserts it across *every* mapped line rather than the one that was convenient.
Line 27's filtering had to mirror `buildScheduleCSummary`'s exactly, blank-label skip and negative
clamp included, or the rows would count what the total ignores.

⭐ **The most useful thing here was rewriting a test that could not fail.** The first version of
"the sheet's total matches the line" captured the line's figure, opened the sheet, and asserted that
figure was visible in it — **which the sheet prints from `line.amount`, so it passes with zero rows
behind it.** Replaced by summing the ROWS and comparing. ⚡ **Then planted it**: with
`contributions={[]}` the new assertion reds and the old one would not have. *A test written to check
a sum has to read the parts, not the total it was handed.*

⚠️ **Two controls named "Close" were reachable at once.** A sheet over a screen that has its own
Close leaves both in the tree, so a screen reader offers two identical names and the e2e clicked the
covered one and timed out retrying. The sheet's is now **"Close details"**. ⚡ **Same shape as the
"covered route stays mounted" lesson from 1.2.6.4, one level down** — modal over screen rather than
route over route. Filed `BreakdownDetailSheet`'s identical plain "Close" to 1.2.9; it is not ambiguous
today only because the dashboard it opens over has no Close of its own.

**Also folded in:** each contribution row is now labelled as one group. Left as three sibling `Text`s
a screen reader announces the date, the detail and the amount as unrelated fragments — the amount,
which is the point of the row, arrives with nothing attached to it. That grouping is also what gave
the strengthened e2e something to sum, which is a fair trade in both directions.

### 🔎 1.2.6.4 Earnings optimizer — after-scan · 2026-09-21 · ✅ DONE

**339 unit (from 330) · 102 engine · 61/61 Playwright (4 new) · typecheck clean · lint 15 unchanged ·
ports free. 6 plants, 6 caught.**

⛔ **THE HEADLINE: two thirds of the specified feature did not survive its own before-scan, and the
half that did was already shipped.** The spec — ROADMAP §9.1 and IMPLEMENTATION_PLAN §347, agreeing
with each other — promised *"best time-of-day, day-of-week, platform combinations by earnings and
effective hourly rate"*. Checked against the code:

- **Time-of-day had no data behind it.** `Entry` carries a date and no time, and nothing in the app
  has ever recorded one (`startedAt` exists only on transient live-trip state). It was not "hard";
  it was not possible, and nobody had looked.
- **Platform by earnings + effective hourly rate, with the best rate highlighted, already shipped —
  for FREE**, on `PlatformComparisonScreen`. Building it again behind the paywall would have
  **removed something free**, which is the single thing 1.2.6's own gating rule forbids. ⚡ **The
  item would have failed its own slice's rule**, and an e2e now asserts no platform name appears on
  the new screen at all.
- **Day-of-week survived** — derivable from `date`, and shown nowhere in the app today.

⚠️ **[D20] retired the "~30 entries" gate, and the reason generalises.** Nothing derived the 30, and
at 20 seeded entries it **excluded the demo persona that was supposed to make the feature demoable**
— the plan asserted both things two lines apart. What the count was proxying is **per-cell sample
size**: thirty shifts all on Saturdays say nothing about Tuesdays. Gating per weekday (≥3 entries,
≥2 qualifying weekdays) states the mechanism directly, and it lets an honest screen show its strong
days while naming the thin ones as thin. **Measured before building:** the seed's fixed day-offsets
always yield 4 qualifying weekdays and 2 empty ones, whatever date the demo is opened on — so the
e2e assertions are stable rather than lucky.

⚠️ **Ranks on hourly RATE, not total earned.** Total earnings rank the days the user already worked
most, which they know and cannot act on. A plant swapping the sort is caught by a fixture where
Monday earns more overall and Saturday more per hour.

🔴 **The most dangerous plant was the date parse.** `new Date("2026-03-02")` is UTC midnight, which
is the *previous* day in every US timezone — it would file every Monday shift under Sunday, silently,
for the whole app. `parseIsoDateLocal` is used instead, and the plant reds **7 of 9** tests. The
fixture also carries its own control asserting 2026-03-02 really is a Monday, because a fixture and
an implementation making the same off-by-one agree with each other.

⚠️ **Re-learned a lesson already written down in `e2e/helpers.ts`.** Two of four new specs failed
first time on web facts the helpers exist to absorb: a bare `getByText("DoorDash")` matches the
dashboard's entry rows once any entry exists (→ `platformChip`), and **a covered route stays MOUNTED
under a pushed one**, so an unscoped `toHaveCount(0)` fails while the screen is perfectly correct
(→ `visible()`). The helper's docstring says both. **A convention written in the place it applies
still has to be read.**

🔴 **No premium route has a route-level guard.** All five premium screens — the four that existed and
the one added here — wrap only in `RequireTaxProfile`, so the paywall lives entirely on the dashboard
card's `onPress` and a deep link walks straight past it. The new screen follows the same shape
deliberately rather than inventing a fifth pattern; filed to the backlog, where one `RequirePremium`
wrapper closes all five.

### 🔎 1.2.6.3 Safe-harbor payment tracker — after-scan · 2026-09-21 · ✅ DONE

**330 unit (from 321) · 102 engine · 57/57 Playwright (4 new) · typecheck clean · lint 15 unchanged ·
ports free. 5 plants, 5 caught.**

🔴 **The before-scan found a live v1.1.1 data-loss bug, in this item's own subject area.**
`EditTaxProfileScreen` rebuilt the saved profile by listing fields **by hand**, and `saveTaxProfile`
replaces the stored profile wholesale — so every field the list forgot was destroyed on save.
`amountSetAsideByYear` was carried forward explicitly; `filedTaxByYear`, added later for the
safe-harbor screen, never was. **Changing one number in the tax profile erased the user's filed
prior-year tax** — a figure copied off their own 1040, which the app cannot recompute, and which
powers the usually-cheaper leg of the safe harbor. ⚡ **1.2.6.3 was about to add a third per-year
field into the identical trap**, which is what made it Category 2 rather than a backlog row. Fixed
**structurally** — spread the profile, override only what the form edits — so the next field added is
immune rather than merely remembered.

⚡ **The codebase already knew this failure mode, in the other half of itself.** `AppDataContext.saveEntry`
restores `setAsideRate` onto an edited entry, with a comment saying the entry form's object literal
*is* the hazard and that the next screen saving an entry would repeat it. It did — on the other model,
eighteen months of commits away. Filed a grep sweep for a third instance.

⛔ **[D19]: the plan's stated model shape could not do the item's stated job.** It said to follow
`amountSetAsideByYear`'s `Record<year, number>`. But safe-harbor penalties are computed **per
period**, so an annual total reports somebody who paid nothing until January as fully compliant — and
"payments made vs. required" is a per-quarter claim. Jason took per-quarter. **A plant netting the
year (`totalPaid >= totalRequired`) instead of checking each period is caught** by the case that
motivated the decision: $4,000 paid entirely in Q1 covers the annual target while Q2 and Q3 sit unpaid.

⚠️ **`overdue` counts only deadlines already PASSED**, and that is not a nicety. Summing every
shortfall would tell a user in May they are thousands behind on payments not due until September and
January — wrong, and alarming in the direction that makes people distrust the number.

🔴 **The e2e found that `onEndEditing` is never reached by a web blur.** The tracker's inputs used it,
copying the prior-year input above them, and the clearing test failed with the field visibly empty and
the status still reading "of $187 ✓" — **the screenshot said it, the assertion text did not.** Moved to
`onBlur`, which fires in both. ⚠️ **The existing prior-year input was left on `onEndEditing`** — it
works on device, but its persist path is unprovable here, so it went to the backlog rather than being
changed without coverage.

⚠️ **The backup fixture was a minimal profile carrying none of the per-year fields**, so a round-trip
through it would have noticed none of them going missing. Added a fully-populated case asserting each
**against the value that went in** — including that a recorded `0` survives as `0`, since "I paid
nothing that quarter" and "nothing recorded" are different claims and any `?? 0` on that path erases
the distinction.

**The demo seed asks the engine, as it already did for the set-aside.** Every deadline already passed
is seeded paid in full, computed at seed time rather than pinned to specific quarters — so the persona
reads "nothing overdue" whatever date the demo is opened on. A demo that greets a visitor with a
penalty warning would be showing the feature working against the person it is meant to reassure.

### 🔎 1.2.6.1 Per-quarter amount on the dashboard — after-scan · 2026-09-21 · ✅ DONE

**321 unit · 53/53 Playwright (3 new) · typecheck clean · lint 15 unchanged · ports free.
4 plants, 3 caught — and the fourth passing is recorded as a gap, not as a pass.**

⛔ **The before-scan's most valuable finding was a wrong path that was genuinely attractive.** The
dashboard already holds a `computeTaxEstimate` result, so `computeSafeHarbor(taxEstimate, taxProfile)`
is right there, free, and looks like the obvious way to avoid recomputing. It is the **1.2.2.3
defect**: that entry point does not project gig income to a full year, and Form 2210's 90% leg is
defined on the full year's tax — comparing a year-to-date tax against a full-year withholding is what
reported *"no penalty expected"* through both spring deadlines. ⚡ **Planted it, and the suite caught
it** — though by the symptom rather than the sum: the un-projected call leaves `isProjected` false, so
the "Projected from your earnings so far" label vanishes and that assertion reds. The figure itself is
asserted only as a *shape* (`≈ $N per quarter`), deliberately — 1.2.2 and 1.2.4 both moved what the
demo seed produces, and a hardcoded dollar amount is a test that fails the next time the tax maths is
corrected. **A comment now sits on the call saying why the shortcut is wrong.**

**Gating, and it needed no new mechanism.** `SafeHarborScreen` was already premium behind a
`canUsePremium` dashboard row, so nothing that was free became paid: the date row renders exactly as
before and the amount is an additional row beneath it. On web there is no RevenueCat SDK, so the paid
side is reachable in the suite **only through demo mode's premium preview ([D5])** — which is 1.2.1
paying for itself in a place it was not built for.

⚠️ **Both absence assertions are paired with a positive one on the same card.** `toHaveCount(0)` is
equally true of a page that never rendered, and this suite has been fooled by that before.

🔴 **The plant that PASSED, reported as a gap:** removing the `estimatedPaymentsNeeded > 0` guard
changed nothing the tests could see. The demo persona always has income and, per [D11], always sits
in one current tax year — so the zero case (*"≈ $0.00 per quarter"*, which reads as a broken number
rather than an answer) and the selected-year-vs-today's-date pairing are both reachable and
unverified. Filed to the backlog. **The guards are in the code and correct; what is missing is
anything that would notice if they left.**

### 🔎 1.2.6.2 IRS due-date business-day shift — after-scan · 2026-09-21 · ✅ DONE

**321 unit (from 306) · 102 engine · 50/50 Playwright · typecheck clean · both tax-config gates
green · lint 15, unchanged and none in the new files · ports verified free. 7 plants, 7 caught.**

**Built:** `notifications/businessDays.ts` — the observed federal-holiday table plus
`nextBusinessDay`, applied to all four 1040-ES dates. ⚡ **A weekend-only shift, which is what the
retired docstring described and what a reasonable implementer would write, is wrong in three
separate ways.** MLK Day catches **every** January 15 that falls Sat, Sun *or* Mon — Jan 15 being a
Monday *is* Jan 15 being the third Monday, since the 1st is then a Monday too, so the January
deadline is wrong three years in seven. Emancipation Day moves April even when the 15th is an
ordinary weekday, as in 2022. And the shift has to **loop**, because both of those land the first
hop on another holiday. The tests assert **published IRS deadlines** (Apr 18 2022, Apr 18 2023,
Jan 16 2024, Jan 18 2022, Jan 17 2023), not values read back out of the implementation — a table
derived from the code would have agreed with a weekend-only rule.

🔴 **The after-scan found the fix reached nobody, and a live bug of the same shape beside it.**
`scheduleQuarterlyReminders` was called from exactly two places — finishing onboarding and the
Settings toggle — and notification content is frozen at schedule time. So (1) an existing v1.1.1 user
upgrading would keep the **old wrong dates** until they happened to toggle reminders off and on, and
(2) `MAX_UPCOMING_DUE_DATES = 4` is about a year, after which **the queue simply drains and the
feature stops** with the switch still reading "on". The second is live in v1.1.1 today and no scan
before this one had looked at *when* the scheduler runs, only at what it schedules. **One call fixes
both**: `refreshQuarterlyReminders` + `useReminderRefresh`, once per launch below the providers.
Folded into the item because a deadline fix that reaches no existing install is not a fix.

⚠️ **Two traps inside that fix, both caught by writing the assertion rather than the code.**
`refreshQuarterlyReminders` takes `remindersEnabled` as an **argument**: the OS permission survives
the user switching reminders off, so a refresh gated on permission alone would silently re-create
every reminder they had deliberately cancelled, on their next launch. And it first **delegated to
the whole of `scheduleQuarterlyReminders`**, which reaches `requestPermissionsAsync` — harmless while
iOS resolves an already-granted request without a dialog, and that is exactly the problem: it made
*"the launch refresh never prompts"* a property of the OS instead of of this file. **A test counting
the call is what surfaced it**; the body is now extracted so each caller owns its own permission step.

⛔ **The honest gap: `useReminderRefresh` itself is untested and cannot be tested here** — no React
renderer, no testing-library, vitest runs plain Node. The rule beneath it has four tests; the wiring
has none. **Same shape as `loadError` having no consumer in 1.2.3** — a correct rule reached by code
nothing exercises. Filed to the backlog and to the device checklist.

### 🔎 1.2.6.1 Per-quarter amount — before-scan · 2026-09-21

**The premise held and was still wrong about what the work is.** `perQuarter` exists
(`calculations.ts:866`), renders at `SafeHarborScreen.tsx:226` — the plan said `:221`, line drift —
and in `taxSummaryHtml.ts:92`. But **`SafeHarborScreen` is already a fully premium-gated screen**,
reached through a `canUsePremium` row on the dashboard. So *"amount is premium, date stays free"* is
**already true everywhere the amount currently lives**, and 1.2.6.1 is not a gating change at all. It
is a build in the places the amount is absent. ⚡ **A premise can be literally true and still
misdescribe the task** — "verify the premise" had to mean verifying what work it implied, not just
whether `perQuarter` was there.

🔴 **The rows were in the wrong order, and the plan said so itself.** 1.2.6.2's own cell read *"runs
here and first"*, the promoting commit said the same, and the queue's standing rule is that **build
order is row order, not numbering**. The table listed 1.2.6.1 first anyway. Swapped; IDs unchanged
per the stable-ID rule. ⚠️ **This is the failure mode the stable-ID rule trades for** — it removes
renumber rot and in exchange the rows must be *placed* correctly, which nothing checks.

🔴 **[D18] — an amount inside a notification is stale before it fires.** `scheduleQuarterlyReminders`
is called from **onboarding and the Settings toggle only** — never on dashboard mount, though its own
docstring says *"e.g. on every dashboard mount"*, which is doc/behaviour drift worth its own look. So
a body is frozen at schedule time and the OS delivers it up to a year later, while `perQuarter` moves
with every entry logged. **That is precisely the defect 1.2.6.2 exists to remove** — a wrong figure
carrying a payment instruction — arriving by a different route in the sub-step next door. Two
entitlement edges fall out of the same hole: a lapsed subscriber still delivered premium content, and
a user who subscribes afterwards who is not. **Jason chose dashboard-only**, keeping the
"check your dashboard" pointer, which is the one part of a months-old message still true when it
fires. Reminders are cut from 1.2.6.1's scope.

⚠️ **Carried to 1.2.6.2: a weekend-only shift is wrong.** Emancipation Day, observed in DC on
April 16, moves the federal Q1 deadline even when April 15 is an ordinary weekday. One fix reaches
two consumers — the scheduler and the dashboard both read `getQuarterlyDueDatesForTaxYear`.

🧹 **Folded in as adjacent polish:** the decision register had been broken into **five** tables by
stray blank lines and its rows ran D1–D9, D11, D17, D16, D13, D14, D15, D12, D10. Reordered into one
table. _(No row text changed; the reorder asserted the line multiset was preserved.)_

### 🔎 1.2.5 Mileage trip toggle — WHOLE-ITEM after-scan · 2026-09-21

**COMPLETE, 6/6.** **306 mobile unit (from 272) · 102 engine · 50/50 Playwright · typecheck + lint
clean · both tax-config gates green · ports verified free.** **10 plants across 4 sub-steps; 9
caught, and the one that passed was vacuous for two separate reasons in a row.**

⛔ **THE HEADLINE IS WHAT IS NOT VERIFIED.** Every other v1.2 item could be proven by something that
runs on this machine. **None of 1.2.5 can.** Two native modules, a config plugin and a background
location task, and the suite that covers them runs in Node against mocks. The unit tests prove the
*arithmetic* and the *decisions*; they prove nothing about whether the app builds, launches, or
receives a single location. The one-build agenda at the head of
[V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md) exists because of this.

🔴 **A fourth demo-mode leak, of the exact class 1.2.1.3 plugged.** `persist()` writes raw
AsyncStorage outside the repository, so a trip started inside a demo session wrote a key to **real**
storage that outlived the session. The three known non-repository writers (review flag,
notifications, analytics) were each guarded at their own choke point in 1.2.1; **this is the first
new one added since, and nothing structural stopped it.** ⚠️ The guarantee is checked by a
convention, not by the type system — the backlog entry proposing an ESLint rule restricting
AsyncStorage to `src/storage/` (filed at 1.2.1.1, still open at 1.2.11) would have caught this at
the keystroke.

⚡ **The pattern across this item: two decisions were taken MID-ITEM, and the second invalidated
artifacts the first had produced.** [D16] retired the second privacy policy and established that one
claim lives in three places; hours later [D17] changed what the app does, which falsified the usage
string *and* the policy sentence Jason had approved — both written under [D16]. **The rule caught
its own author within the same item.** Both were corrected in the same commit as the decision, which
is the only reason the three declarations still agree.

⚠️ **Two of this item's own premises were superseded by its own decisions**, not by drift: the spec's
"populating the `MileageLog` shape" (answered *no* by [D16]'s wording), and 1.2.5.5's "the app
backgrounded stops updates" (removed by [D17]). A plan is a hypothesis even against decisions taken
*after* it was written.

**Deferred, filed in this edit:** nothing new — the AsyncStorage lint rule already sits at 1.2.11
and this item is the second argument for it.

---

### 🔎 1.2.5.5 Degradation — SUB-TASK before + after-scan · 2026-09-21

**Shipped.** `tripHealth` (pure) + `diagnoseStall` + a warning line under the running trip.
**305 unit (was 296) · 50/50 Playwright · typecheck + lint clean.**

⚠️ **The before-scan found this row's own premise superseded — by a decision taken inside the same
item.** It listed *"the app backgrounded, which under when-in-use STOPS the updates"* as a headline
case; [D17] removed that case two sub-steps earlier. What survived is the sentence underneath it —
*a silently under-counted trip is worse than no trip* — re-aimed at the failures that remain:
permission revoked mid-drive, location services switched off, a trip left running.

⛔ **The problem is that a stalled trip looks exactly like a working one.** The button still reads
"Stop trip", the miles simply never rise, and a driver has no way to tell that from not having moved.

**Two design calls, each with a test that fails without it:**

1. **Staleness counts from the trip's START, not only from the last fix.** A trip that never received
   a single reading has no "time since last fix" at all, so a `lastFixAt`-only rule would call the
   worst case healthy forever. Planted: `(minutesSinceLastFix ?? 0)` instead of `?? runningMinutes`
   reddens exactly that test.
2. ⭐ **The cause is asked of the platform, never inferred from the silence.** A parked car and a
   revoked permission are indistinguishable from here. `diagnoseStall` queries services and
   permission, and returns `no-signal` **only when both are fine** — at which point "we are not
   receiving anything" is an honest report rather than a diagnosis. Planted: always blaming
   permission reddens the no-false-alarm test.

**And the UI says nothing for `no-signal` on an otherwise healthy trip.** That is deliberate and it
is the harder half: warning at every long light would train the user to dismiss the warning that
actually means their trip is dead.

⚠️ **A `lastFixAt` subtlety worth keeping:** it stamps on **every arrival, including rejected ones**.
A reading too imprecise to use still proves location is flowing, so it must reset the staleness
clock — otherwise a stream of poor fixes reads as a dead trip, and the user gets a false alarm while
the app is working as designed.

⚠️ **Lint caught a real thing, not a style nit:** clearing the warning synchronously in the effect
body trips `react-hooks/set-state-in-effect`. Moved inside the async check, which is where it
belonged — the not-running path had no reason to be synchronous.

---

### 🔎 1.2.5.1 One privacy policy, and the location disclosure — SUB-TASK before + after-scan · 2026-09-21

**Shipped.** `docs/privacy.html` is the only privacy policy ([D16]); `PRIVACY_POLICY.md` is a
pointer that explains why it stopped being a copy and lists the **three** places the same claims
live — the policy, the App Store Connect privacy labels, and the permission strings in `app.json`.
The location capture is disclosed, wording approved by Jason.

🔴 **The before-scan found the two copies contradicting each other on whether the app shares data at
all.** Not a stale date — a **factual** disagreement:

| `PRIVACY_POLICY.md` (June 27) | `docs/privacy.html` (July 1, live) |
|---|---|
| crash reporting and analytics *"neither is currently active"* | *"we do collect anonymous crash reports and basic usage analytics"* |
| *"we don't transmit your data anywhere at all"* | **Sentry** and **PostHog** named as processors |

**The hosted one is correct** — `errorReporting.ts` says Sentry is **live in release builds**, DSN
wired in `codemagic.yaml`, and its own comment already points at `docs/privacy.html` as the thing to
keep true. Nothing links to the markdown (`PRIVACY_POLICY_URL` → the hosted page), so no user was
ever shown the false version.

⚠️ **But it inverted the obvious fix, and that is the finding worth keeping.** "Consolidate the
privacy page" reads as *generate the HTML from the markdown* — the markdown being the source-looking
artifact. Doing that would have **published a denial of third-party data sharing** over a correct
disclosure. **Before picking a direction for a consolidation, check which copy is true.**

**Why one document rather than a generator + gate:** the tax-config gates exist because two
*mechanically checkable* values can drift. Here the drift was prose making a different claim about
the world. A generator would have kept two files identical without making either correct, and the
real fix is that there is nothing to keep in sync.

⚠️ **The policy now constrains the code.** It states trip locations are never stored and never
transmitted — only the distance is kept. That is a requirement on 1.2.5.3, recorded in both the
pointer file and the plan, not a description written after the fact.

---

### 🔎 1.2.4 Set-aside split by date and week — WHOLE-ITEM after-scan · 2026-09-21

**COMPLETE, 6/6.** **272 mobile unit (from 248) · 102 engine · 50/50 Playwright (from 43) ·
typecheck + lint clean · both tax-config gates green · ports verified free.** **11 plants across 4
sub-steps; 9 caught, and the 2 that PASSED each changed something.**

🔴 **The find only a whole-item pass could make: the demo persona would have shown every week as
"estimated".** `buildDemoSeed` builds entries directly and carried no `setAsideRate`, so all twenty
fell to [D14]'s fallback and the sheet rendered a footnote saying they *"were logged before this app
started recording a set-aside rate"* — **false about a persona this build generates**, on the
surface App Store screenshots are shot from (`SCREENSHOT_PLAN.md`) and the one a premium preview
shows. Invisible from any sub-step: 1.2.4.2 owned the provider's save path, 1.2.4.3 the arithmetic,
1.2.4.4 the rendering — and the demo goes through **none** of them. Folded in: the seed now freezes
rates in order exactly as the app does, with a plant confirming it.

⚡ **Two plants passed in this item, and neither was a shrug.** 1.2.4.4's asserted on the
*accessibility label* while the visible figure was hardcoded to `$0.00` — the label kept telling the
truth while the screen lied. 1.2.4.5's was **circular**: `weeksTotal + adjustment === yearTotal`
held when all three came from one source. **The running tally for v1.2 is now five tests that looked
like coverage and were not**, and the three in this item were each found by a plant rather than by
re-reading.

⚠️ **Two of the item's own premises were wrong, in opposite ways.** The spec's *"the schema cost is
small"* held exactly as measured. But **the entry form drops any field it does not name** (1.2.4.2),
which no one had reason to know until a non-user-edited field existed; and the plan's *"the catch-up
line already reconciles this"* (1.2.4.5) confused the user's **savings behaviour** with the
display's **internal arithmetic** — building it as written would have told someone perfectly on
track that they were behind.

**What is genuinely owed on a device:** nothing new that is not already in the checklist. The
feature is pure arithmetic plus two rendered surfaces, both Playwright-covered including the
reconciliation path. ⚠️ Worth a look during the 1.2.12 pass anyway: the sheet on a small screen with
a full year of weeks, which no web run judges.

**Deferred from this item, all filed in the same edits:** the drop-on-edit **class** (any future
non-user-edited `Entry` field) · `vitest` not typechecking · ten `formatCurrency` copies in two
signatures.

---

### 🔎 1.2.4.5 Reconcile the drift — SUB-TASK before + after-scan · 2026-09-21

**Shipped.** `summarizeWeeklySetAsides` returns the weeks, `weeksTotal`, `yearTotal` and the
**`adjustment`** between them; the sheet renders it as its own row plus a **Total** line, so the
list visibly adds up. Hidden below a cent, which is the normal case — a row reading
"Adjustment $0.00" makes a correct list look broken. **270 unit (was 266) · 50/50 Playwright
(was 48) · typecheck + lint clean.**

⛔ **The before-scan found the plan's premise was wrong, and it was not a wording problem.** The item
said *"`weeklyCatchUpAmount` already exists to say so."* It does not. `computeCatchUpStatus` takes
`(netAmountToSetAside, amountSetAsideSoFar)` — what is **owed** versus what the user **hand-types as
actually saved**. That is a fact about their savings behaviour. The drift here is the app's own
weekly figures against the app's own year total. **Two different axes**, and wiring one into the
other would have told a user who is perfectly on track that they were behind. Built as its own thing.

**When the drift is real** — worth listing, because "zero" is the normal case and only looks like
luck: each frozen figure is the tax its entry added, so the series telescopes to the year total
exactly. It moves only when something invalidates a past freeze — a rate clamped at 0 for a shift
that *reduced* the year's tax, an entry edited or deleted afterwards, a **tax profile changed
mid-year** (a move, a marriage, a spouse's income), or legacy entries on the fallback rate.

**The e2e induces it the way a user does: by moving from TX to CA after logging a shift**, then
asserts the row appears. Paired with a control asserting it is **absent** on an untouched profile —
and the control earns its place: a plant showing the row unconditionally passed the appearance test
and reddened only the control.

⚠️ **A plant exposed a circular assertion of mine.** *"Always reconciles: weeks + adjustment is the
year total"* was satisfied by a plant returning `yearTotal: weeksTotal, adjustment: 0` — all three
numbers from one source, so the equation held while the figure was wrong. It now compares
`yearTotal` against an **independently computed** `computeTaxEstimate`, and the re-planted version
reds it. _(This is the `roundtrip-through-one-encoder` shape: a check whose two sides come from one
source cannot fail, and reading it never reveals that — only planting does.)_

---

### 🔎 1.2.4.4 The weekly surface — SUB-TASK before + after-scan · 2026-09-21

**Shipped.** A "This week" row **inside** the set-aside card — beside the year total, never instead
of it ([D15]) — opening `WeeklySetAsideSheet`, which lists every week worked with [D14]'s estimated
weeks labelled and a footnote explaining what the label means. **266 unit · 48/48 Playwright (was
45) · typecheck clean · lint unchanged** _(the one error under the touched files is the pre-existing
`amountSetAsideInput` resync effect, already in the 1.2.11 ledger)_.

⛔ **A plant PASSED, and it rewrote the test rather than the code.** The spec asserted on the row's
**accessibility label**; a plant hardcoding the *displayed* figure to `$0.00` went green, because the
label is built from the same data and kept telling the truth while the screen did not. **A user
reads the number, so the test now reads the rendered text** — and keeps the label assertion
separately, because VoiceOver needs it too. This is the sharpest version of the vacuous-test pattern
seen so far in v1.2: the assertion was on real data, of the real component, and still could not see
the defect.

⚠️ **And a second assertion of mine would have reported a false defect.** `getByText("estimated")`
with a loose match found **"Q4 2026 estimated tax — Jan 15, 2027"** on the dashboard behind the
modal, which read exactly like "the week was wrongly marked estimated". Diagnosed by dumping storage
and the matched text rather than by reasoning: the entry carried `setAsideRate: 0.1412955` the whole
time. Now asserted on the sheet's own footnote. _(Memory: a "not caught" over the wrong subject
looks identical to a real finding.)_

**Before-scan finding, filed rather than fixed:** `formatCurrency` is defined **ten times** across
screens, in two different signatures — four take `fractionDigits`, six do not. Consolidating touches
ten files and changes how money renders app-wide, so an eleventh copy was added **deliberately**,
matching the dashboard's exact formatting so the feature is internally consistent, and the cleanup
went to the backlog. The shared helpers this codebase *does* have were extracted when a second
caller appeared — not retrofitted across ten files in the middle of a feature.

---

### 🔎 1.2.4.3 The weekly roll-up — SUB-TASK before + after-scan · 2026-09-21

**Shipped**, all pure: `weeklySetAsides`, `weekStartOf`, `fallbackSetAsideRate`. Monday–Sunday
([D13]), most recent week first, and **no row for a week with no work** — an empty row is not
information and the user did not work that week. **266 unit (was 256) · typecheck + lint clean.**
No UI yet, so no Playwright change; 1.2.4.4 owns the surface.

⚠️ **The before-scan's find: this file has no date parsing, and that is deliberate.** `entriesForYear`
matches a **string prefix**; `yearsWithEntries` slices four characters. Nothing converts an entry
date to a `Date`. So week bucketing had to either adopt that discipline or break it —
`new Date("2026-06-22")` is parsed as midnight **UTC**, which is Sunday *evening* anywhere in the
Americas, so a local-time implementation files every Sunday entry into the previous week for most of
this app's users. All week maths is UTC and never touches local time.

⭐ **And that was confirmed by planting the local-time version rather than reasoned about** — it
reddens three date tests in the machine's own timezone.

⚠️ **A test of mine was nearly vacuous and the plant is what showed it.** The timezone test
originally set `process.env.TZ = "America/Los_Angeles"` inside itself. **V8 does not reliably pick
that up mid-process**, so the switch may have done nothing at all — the test would have looked like
timezone coverage while being an ordinary assertion. Since the plant reds it in the ambient timezone
anyway, the forcing was removed and the comment now says what actually protects it. *Claiming
coverage you do not have is worse than not claiming it.*

**[D14]'s marking has a control.** One test asserts a legacy week **is** estimated; the next asserts
a fully frozen week is **not**. Without the second, an implementation that marked every week would
have passed — the same shape as the vacuous tests found in 1.2.2 and 1.2.3.1.

**Three plants, all caught:** local-time week starts (3 red) · never marking a week estimated
(1 red) · Sunday-start weeks (6 red).

---

### 🔎 1.2.4.2 Freeze the set-aside at log time — SUB-TASK before + after-scan · 2026-09-21

**Before-scan: all three of the spec's premises re-verified against the current code**, since they
were measured before 1.2.2 moved the tax math and 1.2.3 moved the storage path. All still hold —
`netAmountToSetAside` is still one YTD figure, **there is still no week concept anywhere** (the only
weekly number is `weeklyCatchUpAmount`, which renders only when already behind, and
`PAY_PERIODS_PER_YEAR`, which is about W2 paychecks), and `parseBackupSnapshot` still passes entries
through wholesale so a new optional field round-trips for free. Nothing surfaced to defer.

**Shipped.** `setAsideRate?: number` on `Entry`, `entryNetProfit`, `computeSetAsideRate`,
`entrySetAside`, and the provider freezing on create. **256 unit (was 248) · 45/45 Playwright
(was 43) · typecheck + lint clean.**

⭐ **The design decision, made at the code rather than in the plan: the frozen figure is the tax the
entry ACTUALLY ADDS.** `f(existing + this) − f(existing)`, where `f` is the same
`netAmountToSetAside` the dashboard renders. Three things fall out of that rather than being built:

1. **Progressive brackets, the SE wage base, state rules and the W2 withholding credit are all
   handled by construction** — there is no second tax path to drift from the real one, which is the
   same argument that made 1.2.2.3 route safe harbor through `estimateFromAggregate`.
2. **The increments telescope: they sum to the year's true total.** So a week's row is a real slice
   of a real number, not an apportionment. A test pins it, and it is what 1.2.4.5 will reconcile
   *against* once rates move.
3. **Early in a year where a W2 job already over-withholds, the rate is 0** — the correct answer,
   arrived at with no special case.

**Two deliberate departures, both recorded because they are lossy:**
- **A rate, not a dollar amount.** [D7] says "frozen at the rate in effect when logged", and storing
  the rate means editing an entry's pay moves its set-aside *at the old rate* — the property being
  preserved. A stored amount would sit still while the pay changed underneath it.
- **Clamped to ≥ 0, which gives up exactness on purpose.** A shift whose mileage deduction exceeds
  its pay genuinely *reduces* the year's tax. That stays true in the year total, but "set aside
  −$12" is not an instruction, and for a tax app the safe direction is setting aside slightly too
  much. The residue is the reconciliation 1.2.4.5 owns.

⛔ **The e2e found a defect no unit test could have: an edit DROPPED the field.**
`computeSetAsideRate` was correct and covered; the provider called it; and editing an entry still
erased the result. **`AddEntryScreen` builds a complete object literal field by field** — `id` and
`createdAt` survive only because they are explicitly copied — so anything the form does not name is
gone on save. `setAsideRate` is the app's **first `Entry` field the user does not edit**, so it is
the first to meet that shape, and every future one will meet it too. Carried forward in the
provider rather than the form, because the form's literal *is* the hazard and the next screen to
save an entry would repeat it. Explicitly named, never `{...previous, ...entry}`, which would
resurrect optional fields a user had just cleared.
⚡ **This is the memory `tested-helper-is-not-a-used-helper` landing a third time** — and the reason
the spec drives the real save path through the UI and reads what actually hit storage.

**Two plants, both caught:** the *average* rate in place of the increment (3 unit tests red,
including the telescoping sum) · re-rating on edit (the e2e red). ⚠️ **One test did NOT move under
the first plant and that is information:** *"does not move a logged entry's figure when more is
earned later"* passes under an average rate too, because the freezing is done by *storage*, not by
the formula. It pins the freeze mechanism, not the choice of rate — which is a real property, just
not the one its name suggests. Left as is, with this note.

⚠️ **`vitest` does not typecheck.** The first version of this test file named two `TaxProfile`
fields that do not exist (`numberOfChildren`, `w2AnnualIncome`) and ran green — so the W2 fixture
was asserting over a W2 job with **no salary at all**. Only `tsc` found it. The suite being green
says nothing about a fixture being what it claims; the guard assertion inside that test is what
made the correction verifiable.

---

### 🔎 1.2.3 Data-safety block — WHOLE-ITEM after-scan · 2026-09-21

**COMPLETE, 5/5.** **248 mobile unit (from 226) · 102 engine · 43/43 Playwright (from 38) ·
typecheck clean · both tax-config gates green · lint unchanged.** **12 plants across 4 sub-steps;
11 caught, and the 12th passing is what deleted a line of code.**

**What the item actually was, versus what it was admitted as.** The gap scan filed two findings.
**Both had the wrong mechanism, and the recommendation was right anyway** — the fourth time this
pattern has been recorded here, and it is now the reason findings get re-derived rather than
re-read:

| filed as | measured to be |
|---|---|
| "decryption throws, which escapes as a generic `loadError`" | it **does not throw** — 189 of 200 wrong keys return an empty string, and the user's real symptom was **being shown onboarding**, which the finding never mentioned |
| "no write anywhere is error-handled" | **all nine call sites alert.** The real defect was three setters ordering state before the write — one of them in a provider the scan never looked at |

⭐ **The most useful thing found was in neither finding.** `loadError` had no consumer. The provider
even said *"the consumer decides what to show"* — and nothing did, for the entire life of the file.
A grep for a symbol's *readers*, not its writers, would have found it in seconds, and none of the
document-level passes did.

**Two defects existed only because of the sub-step before them:**
- 1.2.3.2's cached-rejection was unreachable until 1.2.3.2 itself made key resolution *able* to
  reject; the old code minted instead of failing. **Fixing one thing made a dormant one live.**
- 1.2.3.3's recovery could not have worked on top of 1.2.3.2's rule without its own wipe, because
  `hasStoredUserData` counts `appSettings` and `clearAllLocalData` spares it.
**Neither is visible from a before-scan of the item.** They are the argument for the after-scan
being mandatory rather than a formality.

**Carried forward, filed to the backlog in this edit:** partial-readability recovery · React
provider test tooling · the two clear-data paths that 1.2.10 should unify.

⚠️ **Checked and found unreachable, so deliberately not handled:** entering demo mode calls
`writeJson`, which needs the real key even though the demo writes to memory — so on a key-lost
device demo entry would throw. It cannot be reached: the recovery screen renders *above the router*,
so Settings, and with it the demo entry point, does not exist in that state. Recorded because the
next person to move that gate will make it reachable.

⏭ **Device-owed, and it is the whole `Alert` layer.** react-native-web renders no `Alert`, so the
erase confirmation and both failure alerts are unverified — three checks added to
[V1_2_TESTFLIGHT_CHECKLIST.md](V1_2_TESTFLIGHT_CHECKLIST.md) §A, including how to *reach* a
wrong-key device, which is the hardest state in the app to produce on purpose.

---

### 🔎 1.2.3.4 A setting can no longer show a state that was never stored — SUB-TASK after-scan · 2026-09-21

**Shipped.** `setAppLockEnabled`, `setRemindersEnabled` and `setScheme` all persist first, then set
state. **248 unit · 43/43 Playwright (was 41) · typecheck + lint clean.**

⭐ **The fix is the file's own documented contract.** `AppDataValue` says, above the mutations:
*"Every one persists first, then updates state, and THROWS on failure."* Two of them did not — and
the comment had been sitting directly above them the whole time. **Nothing had to be designed here;
the rule already existed and two functions were outside it.**

⭐ **Three setters, not two.** The before-scan checked the same shape elsewhere and found
`ThemeContext.setScheme` doing exactly the same thing — state first, no rollback — in a different
provider, which the gap scan had not seen. A failed write there leaves the app wearing a theme it
will forget on the next launch, indistinguishable from one that saved. Folded in: same defect, same
item, three lines.

**Verified at the real boundary.** AsyncStorage on web is backed by `localStorage`, so the spec
overrides `setItem` to throw for the settings key — a write that fails the way a disk does, not the
way a mock does. The build log shows the injected error arriving at the real handler. App Lock's own
switch cannot be driven on web (disabled unless the device reports biometrics), so reminders stands
in; the two setters are the same three lines.

⚠️ **Paired with a control** asserting a *successful* write still moves the switch and survives a
reload. Without it, a switch wired to ignore every tap would pass the failure test perfectly.
**Plant caught:** restoring the old ordering turned the failure spec red while the control stayed
green — which is exactly the shape that says both tests are doing their own job.

---

### 🔎 1.2.3.3 The recovery surface — SUB-TASK after-scan · 2026-09-21

**Shipped.** `RecoveryScreen`, rendered by `AppGate` whenever `loadError` is set — **the consumer
that provider comment has been promising since the provider was written.** `retryLoad`,
`recoverFromBackupFile` and `eraseAndStartOver` on the context; `recoverFromBackup` and
`eraseUnreadableLocalData` in the repository. **248 unit · 41/41 Playwright (was 38) · typecheck +
lint clean.**

**The before-scan found a coupling that would have shipped a broken recovery:**

- 🔴 **Restore writes through the same key path it is recovering from.** `restoreBackupSnapshot`
  calls `writeJson`, which needs a key — so after key loss the one genuine recovery the app has
  **cannot run at all**. Recovery therefore discards first and writes second.
- 🔴 **And discarding with `clearAllLocalData` would not have been enough.** It spares `appSettings`
  (a known defect, filed at 1.2.10, which reads as cosmetic there) — but `hasStoredUserData` counts
  `appSettings`, so one unreadable blob left behind still blocks the mint. The user would have
  erased everything and *still* been stranded on the recovery screen. `discardUnreadableLocalData`
  removes all four. ⚠️ **`clearAllLocalData` deliberately unchanged** — it backs a shipped
  user-initiated flow, and changing what that does belongs to 1.2.10, not to a side effect here.
- ⭐ **The backup is parsed before anything is destroyed.** A malformed file must leave the user
  with whatever they had, however unreadable, rather than trading it for nothing. Planted: erasing
  first made the malformed-file test red immediately.

**Placement:** the recovery check sits **before** the app-lock check, deliberately. The app-lock
setting is one of the values that could not be read, so it defaults to off — meaning the lock cannot
be trusted to be *on* either. Nothing on the screen reveals data, and erasing is something an
attacker could achieve by deleting the app.

**Four plants. Three caught — and the fourth passed, which is why a line was removed:**
1. Erase before parse → the malformed-file test red.
2. Discard only three keys → two tests red.
3. `AppGate`'s `loadError` branch disabled — i.e. exactly the shipped state — → **both** recovery
   e2e specs red. That is the defect reproduced and caught.
4. `forgetCachedEncryptionKey()` removed from the discard path → **everything still green.** It was
   not load-bearing: a cached *rejection* is already cleared where it is cached, and a cached key
   that resolved is still correct after a wipe. **Deleted, with the reasoning left in its place** so
   it is not re-added as a defensive reflex. _(Retry keeps its call — that one is load-bearing and
   has its own test.)_

⚠️ **What the e2e cannot prove.** react-native-web renders no `Alert`, so the erase confirmation and
both failure alerts are **device-owed** and go to the TestFlight checklist. What the specs do cover
is the part that was broken — the routing decision — plus a **control** asserting that a readable
device still reaches onboarding, without which a screen that rendered unconditionally would have
passed. Unreadable state is seeded as corrupt *plaintext*, because web has no keystore, so the
decode path is reached the way the platform actually reaches it.

---

### 🔎 1.2.3.2 Never mint a key over existing data — SUB-TASK after-scan · 2026-09-21

**Shipped.** `getOrCreateEncryptionKey` is gone, split into `readEncryptionKey` and
`createEncryptionKey` — the name was the bug in miniature, since "get or create" is precisely the
decision that needs to know what is in storage, which `encryption.ts` cannot see.
`resolveEncryptionKey` in the repository now mints only when `hasStoredUserData()` is false.
**245 unit (was 236) · typecheck clean · lint unchanged.**

**Two things found while building, neither in the spec:**

1. 🔴 **A key failure was cached for the life of the process.** `encryptionKeyPromise` holds the
   *promise*, so a rejection is handed to every later caller forever. **[D12]'s retry would have been
   guaranteed to fail** — the user taps "Try again", the same rejected promise comes back, and the
   only escape is killing the app. This is a defect introduced by nothing: the caching predates the
   item and was harmless only because the old code *never rejected* (it minted instead). **Fixing one
   made the other reachable**, which is the argument for the after-scan being mandatory. Cleared on
   rejection, and `forgetCachedEncryptionKey()` exported for the retry button to call at 1.2.3.3.
2. ⚠️ **A null key used to mean two different things** — "web, nothing is encrypted here" and "the
   key is missing" — and `writeJson`'s `encryptionKey ? encrypt : json` treated both as permission to
   **write plaintext**. Now null means only the first. Planted: returning null instead of throwing
   silently wrote plaintext over encrypted data, and the test caught it.

⭐ **`repository.ts` has tests for the first time.** Three `vi.mock`s (AsyncStorage, expo-secure-store,
react-native) make it loadable. This mattered more than usual here: the guarantee is about what the
**repository** decides, so a pure helper tested in isolation would have proved the rule is written
down rather than that it is the rule being followed.

**Four plants, all caught:** mint unconditionally · cache the rejection · count the premium cache as
user data · return null instead of raising. ⭐ **And one assertion of mine was simply wrong about the
code** — I expected a *read* to fail on a broken keystore, and it correctly returns empty, because a
key that holds nothing needs no decryption. Kept as an explicit test with the reasoning, rather than
deleted, so it is not "fixed" later.

⚠️ **The API change silently broke five tests in another item's suite.** `demoStore.test.ts` mocks
`../storage/encryption` by hand, and `vi.mock` factories are **not type-checked** — `tsc` was clean
while the suite was red. Updated, and filed to the backlog.

---

### 🔎 1.2.3.1 A typed decryption failure — SUB-TASK after-scan · 2026-09-21

**Shipped.** `storageErrors.ts` (`UnreadableDataError`, carrying the *storage* key and never the
encryption key), `isCipherText` in `cryptoCore.ts`, and `decode.ts` holding the whole decision.
`readJson` is now four lines. **236 unit (was 226) · 102 engine · typecheck + lint clean.**

**Why a new module rather than fixing `readJson` in place:** `repository.ts` imports AsyncStorage and
`encryption.ts` imports react-native's `Platform`, so neither can be loaded by Vitest — which is why
no `repository.test.ts` has ever existed. The decision logic was untestable *where it lived*. This is
the same split, for the same reason, that already put `cryptoCore.ts` beside `encryption.ts`.

**Three plants, all caught:**
1. **The old fallback restored** (`catch { JSON.parse(raw) }`) → 3 tests red.
2. **The empty-string check removed** → 1 test red. It is load-bearing for the *cause chain*: without
   it the empty decrypt reaches `JSON.parse` and the error arrives carrying a `SyntaxError` about
   JSON — the misleading diagnosis, one level down, which is what a reader sees in Sentry.
3. **`isCipherText` forced to `false`** → 3 tests red.

⭐ **Plant 1 caught a vacuous test written minutes earlier.** *"Attributes a wrong key to the key,
not to JSON"* asserted only `error.cause === undefined` — and the old fallback throws a bare
`SyntaxError`, which also has no cause. It stayed **green** against the exact defect it was written
for. Now asserts the error *type* as well. **This is the third vacuous test in v1.2** (two in 1.2.2),
and all three looked like coverage.

**After-scan, and it feeds 1.2.3.3 rather than the backlog:**
- **One unreadable key fails the whole load.** `load()` is a `Promise.all` of four reads, so entries
  being readable while the profile is not still lands on the recovery surface with nothing salvaged.
  All-or-nothing is the right default, but 1.2.3.3 should decide it **knowingly** rather than inherit
  it — "restore from backup" is a different offer when half the data was fine.
- **Nothing reports these to Sentry today.** `loadError` has no consumer, so there is no figure at all
  for how often this happens in the wild. 1.2.3.3 is where that starts being measured.
- ⚠️ **No change to writes**, deliberately. `writeJson` is not guarded here; 1.2.3.2 and 1.2.3.4 own
  the write side, and mixing them into this step would have put the plants on two subjects at once.

---

### 🔎 1.2.3 Data-safety block — TASK before-scan · 2026-09-21

**Method:** the gap scan's two findings are hypotheses. Each was traced to the line, and where the
finding named a *behaviour* ("throws"), the behaviour was **measured** rather than read. **Both
findings needed correcting, one of them fundamentally, and a third thing was found that is worse
than either.**

**⚠️ The item was nearly the wrong one.** The `RESUME HERE` block and three other lines said
*"1.2.3 = the mileage toggle"*; the queue table and this log's own renumber map both say **1.2.3 is
data-safety and mileage is 1.2.5**. More 2026-09-20 renumber rot — the same class that broke 13
cross-references then, and it survived a grep sweep because these four read as prose, not as
references. All four corrected. Jason chose data-safety 2026-09-21 on row order + correctness-first;
mileage was independently blocked (`expo-location` is not installed anywhere in the repo, and all
three of its Jason-side prerequisites are open).

**(a) "A decryption failure has no recovery path." ✅ TRUE, but the stated mechanism is wrong, and
the real symptom is far worse than the one described.**

- ⛔ **A wrong key does not reliably throw. Measured: 189 of 200 trials returned an empty string;
  11 threw.** `decryptText` ends in `bytes.toString(CryptoJS.enc.Utf8)`, which throws "Malformed
  UTF-8 data" only when the garbage plaintext happens to be invalid UTF-8. **Truncated ciphertext
  and outright garbage behave identically** — all three return `""`. So the failure reaches the user
  as a `SyntaxError` from `JSON.parse("")`, then a *second* `SyntaxError` from `JSON.parse(raw)` on
  the ciphertext — two layers from its cause, and carrying none of it.
  ⭐ **The existing `encryption.test.ts` already knew this** — its wrong-key test has a `try`/`catch`
  with a comment saying CryptoJS "throws on most (but not all) random byte sequences". True, and
  the right call for *that* test; but nothing downstream was built for the "not all" case.
- ⭐ **There is a deterministic marker and the code never uses it.** Every CryptoJS ciphertext begins
  `U2FsdGVkX1` (base64 "Salted__"), so "is this ciphertext?" is decidable without `try`/`catch`.
- ⛔ **The "legacy plaintext" fallback at `repository.ts:104-106` protects data that cannot exist.**
  Its comment says "data written before encryption was added" — but `encryption.ts` **and** its
  wiring into `repository.ts` are both in the **initial commit** (`6e4afa4`, 2026-06-24), before any
  release, so no device ever wrote plaintext. The one real plaintext path is **web**, where the key
  is `null` and the `if (!encryptionKey)` branch above it already returns first. It is dead code
  whose only live effect is converting a diagnosable failure into a generic one.
- 🔴 **The symptom nobody wrote down: `loadError` has NO CONSUMER.** `grep -rn loadError` returns
  four hits, all inside `AppDataContext.tsx` — its type, its state, and twice in the context value.
  The comment at the `catch` says *"The consumer decides what to show; this layer doesn't own the
  UI"*, and **there is no consumer**. `AppGate` reads `ready` and `appLockEnabled` only. So on a
  decryption failure `ready` flips true with a null profile, and [index.tsx:16](apps/mobile/app/index.tsx#L16)
  redirects to **onboarding** — a user whose data cannot be read is shown a welcome screen. This is
  the actual catastrophe in (a), and the gap scan did not have it.
- ✅ **Key regeneration confirmed** (`encryption.ts:39-48`): SecureStore returning null mints a fresh
  key with no check for existing data. ⭐ **Partial mercy, worth knowing before designing the fix:**
  entry writes go through `getEntries()` first, which *throws* on the unreadable ciphertext, so
  `addEntry` fails loudly rather than overwriting. `completeOnboarding` has no such read and **does**
  write over the profile keys. So the damage is real but narrower than "the next write destroys
  everything": profile yes, entries no.

**(b) "No write anywhere is error-handled." ⛔ FALSE.** Every one of the nine write call sites is
wrapped in `try`/`catch` with `reportError` + an `Alert`: entry save and delete, onboarding,
amount-set-aside, filed tax, tax profile, profile, app lock, reminders, theme, clear-all. The
provider methods are indeed bare — but they are *callers*' business, and the callers handle it. The
finding appears to have read `AppDataContext.tsx` and stopped there.
**What survives is narrower and real:** `setAppLockEnabled` and `setRemindersEnabled` set React
state **before** awaiting the write (`:163-171`), and nothing rolls back — the caller alerts, and
the switch stays where the user put it. The user is shown an app lock they do not have.
⚠️ Also checked and **not** a defect: the read-modify-write in `addEntry`/`updateEntry`/`deleteEntry`
is sequential and provider-owned, unlike the multi-writer `AppSettings` case that forced
`updateAppSettings`'s read-then-merge. Left alone.

**Routed to the deferred backlog, immediately:** the missing MAC **and** the passphrase-KDF key
handling, as **one** v1.3 format change — see the backlog entry. Deferred rather than folded because
the recovery 1.2.3 builds is the same action whichever of wrong-key / truncation / tampering
occurred; a MAC buys a diagnosis, not a different outcome.

**Sub-steps:** five, in [V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md). **[D12] is Jason's** —
what the recovery surface offers a user whose data cannot be read.

---

### 🔎 1.2.2 Tax-correctness block — WHOLE-ITEM after-scan · 2026-09-21

**COMPLETE, 7/7.** All three live money-wrong bugs fixed, each mutation-verified.
**226 mobile unit (from 197) · 102 engine · 38/38 Playwright (from 34) · typecheck clean.**

**1.2.2.7 shipped:** `reviewedOn` on `TaxYearConfig` + `scripts/staleness-audit.mjs`, and **both
audits wired into CI's cheap gate step**. Both **exit non-zero** — the only difference between a
gate and a report nobody runs. The staleness gate fails when a live year is unreviewed for 6 months,
or when the current calendar year has no config and the engine would **silently fall back** to
another year's brackets. ⚠️ **Six months, not annually:** Georgia's change was effective mid-year, so
a January-keyed review would have missed it by months.

⭐ **Both gates were planted against, because an unverified gate IS the defect it exists to prevent.**
Putting GA back on the credit slot fails `audit:dependents`; a 20-month-old review date fails
`audit:staleness`. ⚠️ And my own verification nearly lied: `npm run audit:dependents | tail` reported
`exit=0` because `$?` captured **`tail`**, not npm. The real evidence was the `npm error code 1`
line. That is the documented shell-is-a-participant trap in this repo, walked into while checking a
gate designed to stop exactly this class of thing.

### The item in one line each

| | fix | direction it was wrong |
|---|---|---|
| **.1** | GA/SC/MN exemptions → income subtraction (+ GA $4,000→$5,000) | **understated** — $0 state tax vs ~$891 |
| **.2** | 51-state sweep + audit gate | found **35 of 42** states model no dependent mechanism |
| **.3** | Safe harbor projects to a full year | **understated** — "no penalty expected" through both spring deadlines |
| **.4** | MFJ counts spouse income, credits their withholding | **understated** — profit taxed from the bottom bracket |
| **.5** | Dependents reach the withholding estimate | **understated** — and undid a double-count .4 introduced |
| **.6** | State picker | **$0 state tax** for anyone who typed a state's name |
| **.7** | Both audits as CI gates | the gap that let GA's change sit unnoticed |

### What this item actually taught, beyond the fixes

⚡ **Nine plants across six sub-steps, and the ones that mattered most were the plants that PASSED.**
Two tests I wrote were vacuous, and both looked like coverage:
- 1.2.2.5 v1 compared two baselines that **both carried the defect**, so they moved together.
- 1.2.2.5 v2 measured the right thing through **too weak a fixture** — the child credit was capped
  near $1,000 at that income, so double-claiming moved less than the threshold allowed.

**A plant that passes is information about the test, not permission to move on.** Both would have
shipped as green coverage of a claim they could not check.

⛔ **Every sub-step's before-scan found something the plan did not know, and twice it found a defect
in the sub-step before it.** 1.2.2.5's scan caught the double-count 1.2.2.4 had shipped the previous
day — invisible to 1.2.2.4's own tests because every one of them used `hasW2Job: false`. **The gap
was in the fixture, not the assertions**, which is why only a different item's scan could surface
it. That is the strongest argument this version has produced for the before-scan being mandatory
rather than proportional.

⚠️ **Carried forward, unresolved:** the 35-state dependent gap (backlog, v1.3 — direction is *safe*,
which is why it defers), and lens B's "$656 vs ~$3,496" worked example, still **never re-derived**
and still labelled as indicative in both the log and its test.

---

### 🔎 1.2.2.6 State picker — SUB-TASK after-scan · 2026-09-21

**Shipped.** `src/states.ts` (list + `searchStates` + `stateName`), `components/StatePicker.tsx`,
wired into onboarding **and** the edit screen. **226 unit (was 212) · 38/38 Playwright (was 34).**

⭐ **Jason: "All states should be supported." They already were, and that was the trap.** The engine
has had **50 states + DC** the whole time — measured, not assumed: 51 configs, none missing, none
extra. **The defect was entirely in the input.** Free text meant "California" became the key
`CALIFORNIA`, which matched nothing, so the app computed **$0 state tax** and displayed *"CALIFORNIA
isn't supported yet"* — a false statement about its own capability, on the first screen anyone sees.
A user who believed it left; a user who ignored it got a wrong number.

⚡ **The list is hand-written, which is the thing that drifts — so it is checked, not trusted.**
`states.test.ts` asserts `US_STATES` matches the engine's configured keys **exactly, in both
directions, for every tax year the engine ships**: a name with no config offers a state the app
cannot tax, a config with no name hides one that works. Dropping DC from the list fails **5** tests,
including both year checks. That turns "all states are supported" into a fact the suite enforces
rather than a claim in a hint string.

⚠️ **The constraint that shaped the design: Maestro is out of minutes until ~November.** Every flow
selects this input by *"State you primarily work in"* and taps it by *"e.g. CA"*, then types a bare
code. A renamed selector or a newly-required tap could not be re-validated for weeks. So:
- the placeholder and accessible name are **deliberately unchanged**, and
- **an exact two-letter code auto-selects with no tap**, keeping every existing flow working.

⭐ The query is deliberately **not cleared** on auto-select — clearing it would eat the rest of the
word, so "California" would select CA at the second letter and then type "lifornia" into an empty
field. Subtle, and only visible by walking the keystrokes.

**A search-and-chips field, not a modal:** it matches the county selector directly above it, adds no
navigation, and keeps working under react-native-web — where a native picker renders as nothing and
the e2e suite would go blind precisely where this defect lived.

**Mutation-verified, one plant per claim:** reverting `searchStates` to code-only — the original
defect — fails **3** tests; dropping DC fails **5**. Both restored, full suite re-run, ports free.

**Territories:** still unsupported, and now *said* rather than implied. The empty state names them
instead of silently returning `$0` for an unrecognised key.

---

### 🔎 1.2.2.5 Dependents in the withholding credit — SUB-TASK after-scan · 2026-09-21

**Shipped.** `estimateW2Withholding` takes `numberOfChildren`, applies the CTC (W-4 Step 3) and
passes dependents to the state leg — which matters more since 1.2.2.1 made three states' dependent
figures income subtractions. **212 mobile unit · 102 engine · 34/34 Playwright.**

⛔ **The before-scan found a defect I had introduced the day before, in 1.2.2.4.** `estimateTax`
derives `w2WithholdingEstimate` from `otherTaxableIncome` — which 1.2.2.4 made include the spouse.
So the engine was *already* estimating withholding on combined income, and my separate spouse
estimate added it **again**. Measured: 18,040 where ~6,400 was right. **Overstates withholding,
understates the set-aside — the same dangerous direction as the bug 1.2.2.4 existed to fix.**

⚠️ **My own tests could not have caught it: every 1.2.2.4 spouse test used `hasW2Job: false`**, and
the double-count only fires when the user *also* has a W2. The gap was in the fixture, not the
assertions — which is why it took a different item's scan to surface it. **The fix was not to patch
the addition but to delete the second path**: each job's withholding is now estimated on its own
income, which is the model's own documented isolation assumption, and `estimate.w2WithholdingEstimate`
is deliberately no longer used for this.

⚡ **Dependents are claimed on exactly ONE W-4** — the user's when they have a job, otherwise the
spouse's. Claiming the same children on both would double the credit against withholding. A
household whose only W-4 belongs to the spouse would otherwise never claim its children at all.

### ⚠️ Three test versions before a plant was caught — the most useful thing here

Planting "claim dependents on BOTH W-4s" passed cleanly **twice**:

1. **v1 compared two baselines that both carried the defect.** The jump was measured against a
   spouse-alone figure that *also* claimed the children, so both sides moved together. ⛔ **A
   comparison whose two sides share the defect cannot detect it** — the same shape as a round-trip
   through one encoder.
2. **v2 measured the right thing through too small a lever.** At $40k of spouse income the child
   credit is capped near $1,000 by `nonrefundableCredit`, so double-claiming moved the total by far
   less than the threshold allowed. **The test was sound and the fixture was too weak** — diagnosed
   rather than fixed by loosening the bound.
3. **v3 is cap-independent:** claiming the children costs the household a fixed amount of
   withholding, so adding a spouse must not increase that cost. `spouseDrop` must equal `soloDrop`.
   Plant caught.

**The transferable point: a plant that passes is information about the TEST, not permission to move
on.** Both earlier versions would have shipped as green coverage of a claim they could not check.

**Not re-derived, and still recorded as such:** lens B's "$656 vs ~$3,496" worked example. The
mechanism is fixed and asserted; the *figure* was never measured and its test now asserts direction
only, with a comment saying why.

---

### 🔎 1.2.2.4 MFJ spouse income — SUB-TASK after-scan · 2026-09-21

**Shipped.** `spouseAnnualIncome` on `TaxProfile`; joint-filers-only field in **both** onboarding and
`EditTaxProfileScreen`; wired into `otherTaxableIncome` with a matching withholding credit.
**207 unit (was 202) · 34/34 Playwright · typecheck clean.**

⛔ **The before-scan caught a worse bug than the one being fixed, and it would have shipped.**
`netAmountToSetAside` is `totalEstimatedTax − withholding`. Adding a spouse's income raises
`totalEstimatedTax` by the spouse's whole tax — so counting the income **without** crediting their
withholding tells the user to set aside their spouse's entire tax bill. For a $90k spouse that is a
five-figure instruction, against an under-bracketing error of a few hundred. **The obvious
one-line version of this fix is far more harmful than the defect.** Income and withholding move
together or not at all.

⭐ **Two further rules fell out of reading the code rather than the plan:**
- **The credit must NOT be gated on `hasW2Job`.** That flag is about the *user's* job, and the case
  this feature exists for is a gig worker whose **spouse** holds the W2 — that user has no W2 of
  their own, so a gated credit would be zero and the set-aside would balloon. A test asserts this
  path specifically.
- **Spouse income must stay OUT of `otherFicaWages`.** That field shrinks both the Social Security
  wage base and the Additional Medicare threshold (`seTax.ts:26,33`), and **the SS wage base is
  per-person** — a spouse's wages do not consume the user's. Routing it there would silently cut
  the user's SE tax.

⚠️ **One simplification, stated rather than buried:** MFJ's $250k Additional Medicare threshold *is*
assessed on combined wages, so a couple above it sees that tax applied slightly late. Accepted
because the alternative — using `otherFicaWages` — miscomputes SE tax for **everyone** to fix an
edge above $250k of wages. The trade is recorded in the code at the decision point.

**Design note:** the field is **annual**, unlike the user's own per-paycheck W2 fields. It is a
second-hand figure — people know roughly what their spouse earns, not their pay-stub breakdown —
and the withholding model already treats each job's withholding as calibrated in isolation
(`estimateW2Withholding`'s own docstring), which is exactly how a default W-4 behaves. So one
annual number is both easier to answer and consistent with the existing model.

**Both traps mutation-verified, one plant each:** dropping the withholding credit fails **2** tests
(the spouse's-whole-bill test and the no-W2-user test); leaking spouse income into `otherFicaWages`
fails **1** (the SE-tax invariant). Both restored and re-verified.

**Stale-value handling:** the figure is persisted only while filing status is MFJ, and cleared on
switching away — otherwise a value left behind by a status change silently starts counting again if
the user switches back.

---

### 🔎 1.2.2.3 Safe-harbor full-year projection — SUB-TASK after-scan · 2026-09-21

**Shipped.** `projectAggregateToFullYear` + `computeSafeHarborFromEntries` in `calculations.ts`;
`SafeHarborScreen` now calls the latter. **202 unit (was 197) · 34/34 Playwright · typecheck clean.**

⭐ **The before-scan turned this from a policy question into a bug fix, and that changed who decides
it.** The plan framed it as *"project gig income to year-end, or scope the test to the period
elapsed?"* — a product call. But `SafeHarborResult`'s own docstrings already answer it:
`currentYearFederalTax` is *"Estimated **current-year** federal tax"* and `federalWithholding` is
*"Expected **full-year** federal W2 withholding"*. **Both are documented as full-year figures; only
the computation disagreed.** Projecting restores the contract rather than choosing a new one — so it
did not need escalating, and did not get escalated.

**The seam was already there.** `estimateFromAggregate` exists precisely so the What-if screen can
run hypothetical income through the real pipeline instead of a drift-prone copy. A projected
aggregate is just another hypothetical, so the projection reuses it and **no second tax path was
created** — which is the failure mode that would have made this fix worse than the bug.

⚠️ **The one genuine judgement call, made explicit rather than buried: the early-January cap.**
Linear projection divides by the elapsed fraction of the year, so on 5 January a single $500 day
annualises to **$36,500**. The multiplier is capped at **12.5×** (`MIN_ELAPSED_FRACTION_FOR_PROJECTION
= 0.08`). ⭐ **The cap is deliberately the only place that errs toward understating** — and it is
bounded to roughly the first month, when the de-minimis floor is doing the real work anyway.
Capping *higher* would understate for longer; not capping produces a number nobody would believe.

**Mutation-verified:** removing the projection — restoring exactly what shipped in v1.1.1 — fails
**one** test, the March W2+gig regression, and no other. That is the right blast radius: the other
four tests cover the projection maths, which the plant does not touch. Restored and re-verified.

⚡ **The UI had to change too, and this is the half that would have been easy to skip.** A projected
figure presented as settled is a new way of being wrong. The row now reads *"90% of this year's
**projected** tax"* while the year is running, and the disclaimer says the figure scales from
earnings so far and will move. `isProjected` and `projectionFactor` are on the result so the screen
states the assumption instead of the code hiding it.

**Checked, not assumed:** no Playwright or Maestro flow asserts the changed copy — only the screen
title *"Safe harbor"*, which is untouched. Playwright re-run anyway because a screen changed: 34/34.
Expo ports verified free afterwards.

---

### 🔎 1.2.2.2 Dependent-mechanism sweep — SUB-TASK after-scan · 2026-09-21

**Shipped.** `services/tax-engine/scripts/dependent-audit.mjs`, wired as `npm run audit:dependents`.
⭐ **The inventory is generated from the configs, never hand-built** — this item exists *because* a
hand-built list of three states was mistaken for the whole class, and a hand-built answer to it
would have repeated the error.

⚡ **The finding is an order of magnitude bigger than the audit's three states.** Of 51 configs,
9 are no-income-tax and 42 tax income. **Only 7 of those 42 model any dependent mechanism at all** —
GA/SC/MN (exemptions, corrected at 1.2.2.1) and AR/DE/NE/OR (genuine small credits). **35 model
nothing.** Spot-confirmed against sources that this is a real gap and not just states without one:
**CA $489/dependent credit · NJ $1,500 exemption · MA $1,000 exemption**, all currently ignored.

⚠️ **The direction differs, and that is what settles the routing.** GA/SC/MN *understated* what was
owed — a user under-sets-aside and meets an IRS penalty, which is why it shipped immediately. The 35
*overstate* — the user sets aside too much. Wrong, and wrong against any competitor or preparer, but
safe. **Deferred to its own v1.3 workstream.**

⛔ **Deliberately NOT "just fix the big states."** Folding in CA and NY by population is precisely
the error that produced this finding: three states were fixed because three had been looked at. The
correct unit of work is a systematic pass over all 42 with a statute citation each, and that is
research, not a sub-step.

**Two things the script does beyond reporting:**
- **Cross-year drift** — flags any state handled differently in 2025 vs 2026. Output: only GA, which
  is 1.2.2.1's intended $4,000 → $5,000 change. **No half-applied edits anywhere**, which is a real
  reassurance after touching six config sites by script.
- **It exits 1** on any per-dependent *credit* ≥ $1,000. No real credit approaches that (the genuine
  ones are $29–$256), so the GA/SC/MN class cannot silently return. That makes it a CI gate rather
  than a report nobody runs — the seed of what 1.2.2.7 owes.

**Correcting the before-scan on VT:** it called VT "half correct". The sweep shows VT in the
**no-dependent-mechanism** list, so the per-filer part folded into `standardDeduction` is all it has.
The reading holds; the sweep just places it in a much larger group than "one state over".

---

### 🔎 Maestro dispatches #2–#13 — PAUSED out of minutes · 2026-09-21

**State: 2 of 12 flows pass.** Paused for Codemagic minutes, resumes ~November. Everything is
pushed; **next action is simply to dispatch `5d15e56` or later and read the log.**

⛔ **THE APP WAS NEVER BROKEN.** Thirteen dispatches diagnosed a **harness**. Every app-level
hypothesis raised along the way — an `AppGate` spinner, a redirect loop on a failed profile write,
`ErrorBoundary` catching a throw, a circular import from 1.2.1.6, `enterDemo()` failing on device —
was **wrong**. The one real app question that surfaced (does demo entry work on a device?) resolved
as **yes**.

**What was actually wrong, in the order it was peeled back:**

| # | cause | how it presented |
|---|---|---|
| 1 | Hardcoded `"iPhone 15"`, absent from the Xcode 26.4 image, masked by `\|\| true` | an *install* failure two lines later |
| 2 | `scrollUntilVisible` stopping at the screen edge, and flows tapping blind below the fold | "element not found" on elements that were present |
| 3 | `hideKeyboard` **after** reaching for the state field, so "TX" appended to the name | 12/12 "could not reach the dashboard" |
| 4 | Four flows carrying their own inline copy of onboarding, untouched by the fix to the shared one | four flows lagging a round behind the rest |
| 5 | ⚡ **`CODE_SIGNING_ALLOWED=NO`** — an unsigned app has no entitlements, so the Keychain refuses, so `expo-secure-store` throws and **nothing can be saved at all** | `Couldn't save your info` / `getValueWithKeyAsync` |
| 6 | `SENTRY_DISABLE_AUTO_UPLOAD` reaching the script phase empty despite being declared | the JS-bundle phase failing the build |
| 7 | iOS's **numeric** keypad has no Done key, so `hideKeyboard` fails and the keypad hides the Premium rows | "couldn't hide the keyboard" + phantom missing rows |

⚡ **THE LESSON, and it is the transferable one: every step forward came from a DIAGNOSTIC, never
from a theory.** The commit-SHA echo, the `assertNotVisible` probes, and above all the **on-screen
text dump** each cracked something no amount of reasoning did — the dump twice, on its first run
each time. Meanwhile every mechanism reasoned out in advance was wrong. ⛔ **A failing assertion
tells you what was ABSENT; only the hierarchy tells you what was PRESENT.** The dump should have
been built at dispatch #3, not #11; that delay is most of the cost of this sequence.

**Now permanent in `codemagic.yaml`** (so the next session inherits it rather than rediscovering it):
the step prints the building commit first, captures the simulator's final frame on failure, and
dumps every on-screen text node with bounds for up to 12 failures.

**Three open questions, all answerable from the next log without a code change:**
1. `custom-expenses-gating` / `mileage-log-gating` cannot find the Premium row — **and they type
   nothing**, so the keypad is ruled out. Genuinely unknown. The dump now covers them (it sampled
   only 4 failures before, and neither was in the sample).
2. `Premium Paywall` — `Settings` not found on the dashboard.
3. `Demo mode` — enters the demo fine, then cannot find the seeded Uber entry.

---

### 🔎 Maestro dispatch #2 — FAILED, INFRASTRUCTURE, fixed · 2026-09-20

**The predicted failure, predicted for the right reason.** Died at **step 8, `Boot a simulator and
install the app`** — *not* inside `Run Maestro native flows` — so **the twelve flows never executed
and nothing about the app was tested.** `demo-mode.yaml` remains unrun; the expo-router migration's
native paths remain unvalidated. **Dispatch #3 is owed.**

```
Invalid device or device pair: iPhone 15
No devices are booted.
Step 8 script `Boot a simulator and install the app` exited with status code 148
```

**Mechanism, confirmed by reading the step rather than inferring it:**

```bash
xcrun simctl boot "iPhone 15" || true      # ← fails: no such device on the Xcode 26.4 image
xcrun simctl install booted ...            # ← "No devices are booted", exit 148
```

⚡ **The `|| true` is what made this expensive rather than obvious.** A missing-device problem
presented as an *install* problem two lines later — exactly the misread the plan's standing triage
note warned about, which is the only reason it took one read instead of a diagnosis. **The note
earned its keep; the build it warned about was still spent.**

**Fixed — and the fix is the general form, not a newer model number.** Hardcoding `iPhone 16` would
fail identically on the next Xcode bump. The step now *discovers* an available iPhone, names it in
the log, and **removes the `|| true`**: only the already-booted case is tolerated, and only after
reading the device's actual state. `bootstatus -b` waits for boot rather than racing the install.

⚠️ **Verified as far as it can be offline, which is not all the way.** There is no macOS or `xcrun`
here, so the selection pipeline was tested against realistic `simctl list devices available` sample
text: it picks a valid UDID, excludes iPad and Apple Watch rows, and survives a model name carrying
its own parentheses (`iPhone SE (3rd generation)`). The YAML re-parses with all 8 steps. **What
cannot be checked here is whether the real runner image has any iPhone at all** — hence the explicit
guard that prints the full device list and exits 1, so dispatch #3 fails *legibly* if it fails.

**Also confirmed clean:** the build step uses `-destination 'generic/platform=iOS Simulator'`, so
nothing else in the workflow names a device.

---

### 🔎 1.2.2 Tax-correctness block — TASK before-scan · 2026-09-20

**Method:** the gap scan's findings are hypotheses like any other plan. Each was traced through the
arithmetic before it earned a sub-step. **Two of the four needed correcting, and neither correction
would have surfaced by reading the findings again.**

**Verified true, mechanism intact**
- **Dependent asymmetry (finding d) — confirmed.** `w2Withholding.ts:28` calls
  `calculateStateTax(0, 0, annualW2Income, filingStatus, stateCode, config, county)` with **no
  `numberOfChildren`**, so it takes the parameter default of 0; the federal leg likewise applies no
  CTC. Meanwhile `estimate.ts:33,49` *does* pass `input.numberOfChildren ?? 0` into both. So the
  withholding estimate models a W-4 with no dependents claimed while the total it is subtracted from
  credits them — withholding overstated, set-aside understated. Direction confirmed.
- **The GA/SC/MN slot error — confirmed**, and the fix site is `stateTax.ts:152`, where
  `taxableIncome = max(0, stateAGI − standardDeductionUsed)`. An exemption belongs in that
  subtraction; the config currently routes it to `creditApplied` at `:171`.

**⚠️ Correction 1 — the audit's own precedent is only half right.** Lens B cited VT as the state that
*"already models an exemption the right way"*, folding `7650 + 5300` into `standardDeduction`. Reading
it: single `7650 + 5300`, **MFJ `15300 + 10600`** — the second term doubles with the number of
**filers**, so what is modelled is the **per-filer personal exemption**, correctly. VT's **dependent**
exemptions are not modelled at all. So VT is a valid precedent for the fixed per-filer part and **not**
for the per-dependent part, which must scale with `numberOfChildren`. _(Direction is safe — it
overstates VT tax — but it is the same class of defect, one state over.)_

**⚠️ Correction 2, and it resizes the item: nobody has checked the other 47 states.** The finding
names three states because three were *looked at*. GA, SC and MN were found by noticing their credit
values were two orders of magnitude larger than AR/DE/NE/OR — a heuristic that catches states whose
exemption is large, and silently passes any state whose exemption happens to look credit-sized, or
which omits a dependent mechanism entirely (as VT does). **Fixing three and shipping would leave the
class unmeasured**, which is why 1.2.2.2 exists as its own sub-step. This is the hand-built-site-list
undercount again, at audit scale rather than at grep scale.

**⚠️ Not re-derived, and flagged as such:** lens B's worked example for the asymmetry (MFJ, 2 kids,
$60k W2 + $20k gig → app says $656, true ≈ $3,496). The *mechanism* is confirmed; the *figure* is the
agent's and is carried as indicative until 1.2.2.5 derives it.

**Surfaced → routed:** the state configs have **no staleness review** — GA's $4,000 → $5,000 rise was
found by a web search during verification, not by anything in the repo. Folded into 1.2.2.7 rather
than deferred, because the item is already in those files and a fix that can silently rot is half a
fix.

---

### 🔎 1.2.1.7 Tests — SUB-TASK before-scan + partial after-scan · 2026-09-20

⭐ **The before-scan found most of this sub-step already shipped.** The spec reads *"Playwright
enter/exit + real-data-untouched · Maestro flow · unit tests for seed + isolation"* — but 1.2.1.4
shipped the enter/exit specs **and** the real-data-untouched round-trip, 1.2.1.5 added two more, and
`demoSeed`/`demoStore`/`demoLeaks` tests already cover seed and isolation. **A pre-authored sub-step
spec went stale because its own siblings absorbed its work**, which is a drift mode distinct from the
usual one: nothing about the code changed underneath it, the *plan* moved.

**What was actually missing: 1.2.1.6's preview, which had no e2e coverage at all.** Added 4 specs →
**34/34** (was 30).

⚡ **A finding that outlives this item: the e2e suite has no way to grant a real entitlement.** Every
premium spec asserts only the *locked* path, so until demo mode existed, W-4 optimizer, safe harbor,
year-over-year and expense breakdown had **never been opened end-to-end in a browser**. These tests
are those screens' first e2e coverage, which was not the sub-step's goal and is worth more than it.

**The control is half the value.** "Premium cards open inside a demo" would pass identically if the
cards had simply been unlocked for everyone, so a sibling test runs the same cards on a free account
and asserts the paywall. Both directions, per the standing rule that a one-way fixture leaves a
vacuous row reporting sound.

🔴 **A test failed for the right reason, and found a real gap.** `Open year-over-year insights` never
appears in a demo. Cause: every premium card has a **data** precondition on top of the premium gate,
and year-over-year's is `yearsTracked >= 2` (`DashboardScreen.tsx:516`), while `buildDemoSeed` keeps
the whole persona inside one tax year **on purpose** (it compresses rather than spills, because
`entriesForYear` would silently drop prior-year entries). **So the fourth premium screen cannot be
previewed at all.** Escalated as a `[DECISION]` rather than fixed unilaterally — seeding a second year
changes what the persona *represents* and touches 29 seed tests plus `SCREENSHOT_PLAN.md`.
⭐ **The absence is now itself asserted**, so the question cannot rot silently while it is open.

⛔ **Not done: `.maestro/demo-mode.yaml` is UNRUN.** Dispatch #2 is its validation, not a regression
check — the same status the 1.2.0.8 Maestro changes carried, and for the same reason.

**Ports verified free after the Playwright runs** (8081 / 8082 / 19000 / 19001 / 19006), per standing.

---

### 🔎 1.2.1.6 Premium preview without entitlement — SUB-TASK after-scan · 2026-09-20

**Shipped.** `premium/premiumAccess.ts` (pure `resolvePremiumAccess`) + `premium/usePremiumAccess.ts`
(the React adapter). Six gate sites read `canUsePremium`; purchase, PDF export and the "Premium
active" row keep reading `usePremium().isPremium`. **197 unit (was 191) · typecheck clean.**

⭐ **The before-scan corrected the spec's count: "the 4 gate sites" is wrong.** There are **seven**
`isPremium` consumers across three screens — Dashboard's four premium cards, AddEntry's mileage-log
and custom-expenses sections, and Settings' PDF export. Six take the preview; export does not, per
[D5]. **The spec was written before anyone counted**, and this is the same undercount that hand-built
site lists produce every time they are measured.

⚡ **A second before-scan finding changed the design, not just the count: `isDemoPreview` cannot live
on `PremiumContext`.** `PremiumProvider` sits **above** `DemoProvider` in `app/_layout.tsx` — it has
to, because both demo transitions re-read through `AppDataProvider`, which is below premium. A parent
context cannot read a child's, so premium genuinely cannot know a demo is running. [D5]'s "alongside
`isPremium`" is therefore a **composing hook**, not a field. Had this been implemented on faith, it
would have failed at the import.

⭐ **What only surfaced during implementation: there is no React test infrastructure in this project
at all.** No testing-library, and `vitest.config.ts` collects `src/**/*.{test,spec}.ts` — `.ts` only,
so a `.tsx` hook test would not even be picked up. Every existing unit test is plain logic. **So the
decision was split into a dependency-free pure module and the hook became a two-line adapter** —
which is the better shape regardless, and is precisely the precedent `demo/demoMode.ts` set for the
same reason (importing the context drags AsyncStorage and react-native into a plain-Node test).

**Mutation-verified, one plant per claim:**
- **Plant A** — `isPremium: isPremium || isDemo`, i.e. exactly the entitlement-faking [D5] forbids.
  Caught by **3** tests.
- **Plant B** — `isDemoPreview = isDemo`, dropping `&& !isPremium`, mislabelling a subscriber in a
  demo as previewing. Caught by **exactly 1** — the assertion written for that claim, which is the
  point of planting separately rather than once.
- Both restored and **re-verified green afterwards**. ⚠️ Worth noting: `premiumAccess.ts` was
  untracked at plant time, so `git checkout --` could not have restored it — the reversal had to be
  an explicit inverse edit with its own anchor assertion.

**Corrected in passing:** `PremiumContext`'s doc comment claimed *"Feature code reads a single
`isPremium` boolean via `usePremium()`"*. True when written, false the moment this landed, and it is
the comment a future reader would have trusted. Rewritten to name the three sites that legitimately
still read it.

---

### 🔎 1.2.1.5 Mark every demo surface — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/demo/DemoBanner.tsx`, rendered by `src/components/Screen.tsx`. Both candidate seams
were complete (13/13 screens use `Screen`, 12/12 routes use `ScreenFrame`); `Screen` won because it
is **inside** the `SafeAreaView`, so the bar clears the notch, and it is the same wrapper 1.2.3 will
use for size classes. No screen opts in and none can forget.

**A banner, not per-figure badges.** The confusing state isn't a number, it's a whole app — someone
entering from their own account sees a dashboard, a safe-harbor screen and a year-over-year chart all
showing a stranger's finances. Badging figures would be noise where it's least needed and would still
miss the charts. **Rendered first inside `Screen`**, which is the accessibility half of the exit line:
a VoiceOver user reaches it before any figure it qualifies. A marker placed after the content would
be technically "in the tree" and useless. **Tappable to exit** — a permanent bar announcing a state
with no way out of it sends people hunting through Settings. `primarySoft`, not `danger`: nothing is
wrong, and a red bar on every screen would read as an error for a healthy way to use the app.

---

### ⚠️ ⭐ The screenshot caught a defect four suites could not — and it was mine

The banner render looked right. The rest of the screen did not: the demo opened on
**"You're $85.63 behind — set aside an extra $14.27/week until Sep 15, 2026 to catch up."** Red
warning state, where `SCREENSHOT_PLAN.md` deliberately specifies green "on track" because a
reassurance sells better than a deficit — and because a demo opening on a warning misrepresents the
app's normal state.

**Mechanism.** `netAmountToSetAside = totalEstimatedTax − w2WithholdingYtdEstimate`, and that second
term is computed from **today** via `w2WithholdingYearFraction`. The target therefore moves through
the year while the entries do not. `SCREENSHOT_PLAN.md`'s literal **$1,400** was measured against a
≈ $1,384 target on one day in early July; by August the target was **$1,485.63** and the same
constant was $85 short.

⚡ **This is a correction to my own 1.2.1.2 after-scan.** It claimed *"Totals are unaffected … so the
green 'on track' state and every headline figure hold whenever the demo is entered."* The earnings
half is true and tested. The "on track" half was **false**, and asserting it is what let the defect
ship past a mutation-verified suite: the test I wrote checked earnings totals, which never moved, so
it could not fail. That test has been renamed to claim only what it proves.

**Fix.** The amount-set-aside is now **derived, not stated**: `buildDemoSeed` runs the app's own
`computeTaxEstimate` over the seeded entries and lands just above the result. Not circular —
`amountSetAsideByYear` is self-reported savings the estimate never reads. Regression test added and
**mutation-verified**: restoring the literal 1400 fails it and nothing else.

**The transferable lesson:** *a number copied from a document is a measurement, and measurements
have a date on them.* Both defects in this item came from the same place — absolute dates in the
persona (caught at 1.2.1.2) and an absolute dollar figure calibrated against them (caught only by
looking). The second was invisible to every automated check because the suites asserted the inputs,
which were faithful, rather than the rendered outcome, which was wrong.

---

**Health:** 30/30 Playwright (2 new) · 191 unit · typecheck clean · lint 14, none introduced.

### 🔎 1.2.1.4 EXTENDED — demo entry for onboarded users ([D6]) · 2026-08-08

**Jason, 2026-08-08:** *"There should be a way to access the demo for already onboarded users."*
Settled as **[D6]**; the backlog question raised at the after-scan is closed and removed from it.

**Shipped.** One Settings section with two states rather than two sections — the same row enters or
exits depending on `isDemo`. Entering from Settings routes to the dashboard rather than staying put:
a Settings screen whose profile name has quietly become someone else's reads as a bug, not as "you
are now in a demo". No confirmation Alert: real data is genuinely safe, so a warning would be
dishonest — and `Alert` doesn't render under react-native-web, so it would also be untestable here.

⭐ **This is what made the item's exit line testable.** "Real data provably untouched" could only be
asserted at the unit level while the demo was reachable solely from onboarding — a real account had
no way in, so no test could round-trip. There is now an e2e that onboards, logs a real entry, enters
the demo from Settings, adds a $999 entry inside it, exits, and finds the real entry back and the
demo's gone — **through the UI only, never touching storage to set up or to assert** — then reloads
to prove it is persisted state rather than a lucky in-memory render. **28/28.**

**Two test-authoring corrections, both mine, both worth recording:**

1. **The persona uses Instacart.** The first version had the "real" entry on Instacart and asserted it
   was absent inside the demo — but the demo has three Instacart entries, so the locator resolved to
   4 elements. The real entry is now **Spark**, which the persona deliberately does not use. A test
   distinguishing two data sets has to pick a value only one of them can produce.
2. **A `sed` left a `/g` flag** on the label regexes. A global regex carries `lastIndex` between
   calls, so it matches inconsistently across repeated locator evaluations — a flake generator.
   Removed. Bulk-editing test selectors by regex is how that gets introduced silently.

### 🔎 1.2.1.4 Enter/exit wiring — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/demo/DemoContext.tsx` — a provider inside `AppDataProvider` (both transitions must
re-read through it) exposing `isDemo` / `enterDemo` / `exitDemo`. Entry affordance on onboarding
("Explore with sample data", secondary to Continue by design); exit as the **first** section in
Settings, above Premium, because once someone is in a demo the most important thing that screen
offers is the way out. 4 new Playwright specs → **27/27**.

⭐ **`RequireTaxProfile` did NOT need widening, and the plan said it would.** The item spec carried
that over from Debt's `3.5.4.3`, where a blanket onboarding guard locked out the demo's own audience.
It does not transfer: **this demo seeds a profile**, so `localUserProfile` and `taxProfile` are both
non-null the moment `reload()` completes, and every guard passes untouched. A planned change to a
security-shaped guard was deleted rather than made — the better outcome, and only visible because the
premise was checked against the code instead of implemented on faith.

**Three ordering decisions, each with a failure mode behind it:**

1. **Entering rolls back.** If `reload()` throws after the store swap, the app would show real data
   while every write lands in the demo store — indistinguishable, to the user, from their edits
   silently not saving. On failure it now exits demo, re-reads, and rethrows.
2. **Leaving flips `isDemo` *before* the re-read.** The demo store is already gone at that point, so
   no render in between may still be claiming demo. There is nothing to roll back to; leaving is
   always safe.
3. **Exit routes to `/` unconditionally, never conditionally to `/onboarding`** the way
   `handleRestoreBackup` does. That handler can decide, because `restored` is a fresh snapshot; the
   exit handler's closure holds the **demo's** values, which cannot answer "does the real account
   have a profile?". The dashboard route already derives that redirect from freshly-loaded data.

**`useDemo()` returns a safe default rather than throwing**, unlike `useAppData`. Demo is an additive
overlay — a screen rendered without the provider should behave as the normal app, not crash.

**⚠️ e2e lesson, and it cost a red run.** `page.reload()` does not return to the dashboard:
expo-router keeps the URL on web, so reloading from Settings lands back on **/settings**. The failing
assertion had nothing to do with demo mode, and the failure screenshot showed the app behaving
correctly — including, usefully, that Settings rendered **no "Sample data" section** for a real
account. Looking at the artifact separated "my test is wrong" from "the app is wrong" immediately.

**Confirmed still owed:** demo money currently appears on the dashboard with **no marking at all**.
1.2.1.5 is doing necessary work, not polish.

### 🔎 Maestro dispatch #1 — TRIAGED · 2026-08-08

**Verdict: INFRASTRUCTURE. Not signal.** It died at **step 7, `Build the app for the iOS Simulator`**
— so `simctl`, Maestro and the flows themselves never ran. **The rewritten selectors and the
stacked-route accessibility hierarchy remain completely unvalidated**, exactly as before the
dispatch. The pre-registered triage rule called this correctly: a failure at or before `xcodebuild`
is a `codemagic.yaml` problem.

**Root cause, from the trace:** `error: Auth token is required for this request` out of `sentry-cli`,
then `+ exit 1` and `PhaseScriptExecution Bundle React Native code and images` failing the build.
The Maestro workflow's `environment:` was only `node: 22` — it deliberately omits the `AppleConnect`
group (a simulator build needs no signing), **and that group is also where `SENTRY_AUTH_TOKEN` comes
from.** With no token and `SENTRY_DISABLE_AUTO_UPLOAD` unset rather than `"true"`, the upload step
ran, failed, and took the phase with it.

⚡ **This was predicted in writing and still happened.** The TestFlight workflow's own comment records
that in `@sentry/react-native` 7.11.0 an upload failure fails the entire build and
`SENTRY_ALLOW_FAILURE` is *not* honored, with the stated recovery being to set
`SENTRY_DISABLE_AUTO_UPLOAD` back to `"true"`. The note was written about the release workflow; the
failure landed on the simulator workflow, which was created later and never inherited the warning.

**Fixed:** `SENTRY_DISABLE_AUTO_UPLOAD: "true"` added to the Maestro workflow. Disabling the upload
beats adding the token — a throwaway simulator binary's source maps have no business in Sentry, and
this keeps a secret and a network round-trip out of the test workflow.

**Predicted next false-failure, checked and RULED OUT.** The Maestro workflow also lacks
`EXPO_PUBLIC_RC_IOS_KEY`, which looked like it could leave `premium-paywall.yaml` asserting against a
paywall with no products. It can't: `PaywallScreen.tsx:277` renders `accessibilityLabel="Subscribe"`
unconditionally, and the flow asserts only static copy, never a price. No change needed.

**⚠️ Still untested downstream of the build:** the `xcrun simctl boot "iPhone 15" || true` line. The
runner reported **Xcode 26.4**; if that image has no iPhone 15, the swallowed boot failure surfaces as
an *install* failure and misreads as an app problem. Unchanged and unverified — the build never got
that far. Keep it in the triage rule for dispatch #2.

### 🔎 1.2.1.3 Plug the non-repository leaks — SUB-TASK after-scan · 2026-08-08

**Shipped.** Three guards, each at a single choke point: `maybeRequestReview` (`appReview.ts`),
`scheduleQuarterlyReminders` **and** `cancelQuarterlyReminders` (`notifications/scheduleReminders.ts`),
and `trackEvent` (`analytics.ts`). 9 tests, each written as a **pair** — guarded behaviour *and* the
unguarded behaviour — so a guard that simply always returned false would fail the other half.

**The flag moved to its own module, and the store reference went with it.** `src/demo/demoMode.ts`,
pure, no react-native. Two of the three guarded modules are deliberately import-light so their unit
tests run in plain Node; importing `repository.ts` for the flag would have dragged AsyncStorage and
`react-native` into all of them. The **store reference itself** lives there too rather than a
mirrored boolean — two things that must agree eventually don't. `repository.ts`'s `backend()` now
reads `getDemoStore() ?? AsyncStorage` and is still a one-expression, inspectable guarantee.

**Found during implementation, and the before-scan could not have seen it:**

1. 🔴 **`cancelQuarterlyReminders` needed guarding for the *opposite* reason to the scheduler, and
   this is the one that was nearly missed.** The before-scan flagged demo *scheduling* real
   reminders. But cancel calls `cancelAllScheduledNotificationsAsync()` — **every** scheduled
   notification on the device, demo's or not. A visitor flicking the reminders toggle inside the demo
   would have silently deleted the real user's genuine quarterly reminders. Data loss, disguised as a
   no-op, on the tax dates the app exists to protect. Guarded and tested.
2. **The scheduler guard had to sit ABOVE `requestPermissionsAsync`.** Otherwise a demo raises the
   notifications permission dialog — a one-shot system prompt the real app wants to ask for on its
   own terms, at a moment that means something.
3. **Analytics drops rather than tags.** A `demo: true` property still puts the event in the funnel,
   where every query would need to remember to exclude it forever, and the first that forgets reports
   a number that isn't true. Demo traffic is exactly what would distort the **[D3-ASA]** read. Dev
   console logging still fires, so demo behaviour stays visible while working on it.

**⚠️ Test-infrastructure trap, worth remembering.** The first run of these tests failed 3/9, and the
failure was in the *test*, not the guards: `vi.resetModules()` gives every dynamic `import()` a fresh
module graph, including a fresh `demoMode`. Toggling the demo flag on a **statically**-imported
`demoMode` therefore toggled a different instance than the module under test, and every guard read
`false`. The dangerous version of this mistake is the inverse — a guard test that passes because the
flag was never actually set — which would have looked exactly like proof. Loaders now return
`demoMode` from the same graph.

**Health:** 190 mobile unit tests (was 181) · typecheck clean · lint 14, none introduced.

### 🔎 1.2.1.2 Seed generator — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/demo/demoSeed.ts` — `buildDemoSeed(now = new Date())`, the Maya persona ported from
`SCREENSHOT_PLAN.md` with every date expressed as **days before today** and materialised at seed
time. 29 tests, `now` injected so the calendar behaviour is testable without touching the clock.

**The staleness risk was measured, not assumed.** `calculations.ts:177` — `entriesForYear` filters by
`entry.date.startsWith("2026-")`. So the absolute-dated persona wouldn't merely look old on 1
January, it would **vanish from the dashboard entirely**. That is what made relative dates a
requirement rather than a nicety.

**The January case, and why it compresses rather than shifts.** The persona spans 52 days; early in a
calendar year there isn't that much room before the tax year begins. Spilling into December would
re-create the exact defect above, so the span is **compressed proportionally** into whatever room
exists. Entries stay ordered, stay in the past, stay in-year. **Totals are unaffected** — all 20
entries always present at their original amounts — so the green "on track" state and every headline
figure hold whenever the demo is entered. Tested at seven dates including a leap day, 31 December,
and 1 January (the degenerate no-room edge).

**The port is faithful, and that is verified rather than eyeballed.** The test asserts gross + tips
**= $6,213**, which matches the sanity-check figure `SCREENSHOT_PLAN.md` states independently. A
transcription slip in any of the 20 rows breaks it.

**Surfaced during implementation:**

1. **The theme had to be deliberately excluded from the seed.** The persona's backup file carries
   `colorScheme: "dark"`, and seeding it would flip the visitor's app to dark — the most visible
   possible reach outside the sandbox, and on a preference the demo has no business touching. The
   seed omits it; the theme has lived outside this data since 1.2.0.2 anyway.
2. **`remindersEnabled: false` is in the seed, and it is a coupling 1.2.1.3 must honour.** The seed
   supplies the *state*; 1.2.1.3 prevents the scheduling *call*. Either alone leaves demo and reality
   disagreeing — a toggle reading "on" with nothing scheduled, or reminders scheduled from demo data.
3. **A demo entered on 1–2 January shows the entries bunched onto ~one day.** Correct, and harmless
   for the demo's job, but bad for store screenshots. Documented in the module; belongs with the
   already-filed `SCREENSHOT_PLAN.md` backlog item.

### 🔎 1.2.1.1 Demo store — SUB-TASK after-scan · 2026-08-08

**Shipped.** `src/storage/demoStore.ts` (pure, no imports — same reason `appReviewPolicy.ts` was
split out of `appReview.ts`: it stays testable in plain Node) exposing `KeyValueStore` +
`createDemoStore()`. `repository.ts` gained one variable and one function — `demoStore` and
`backend()` — plus `enterDemoMode(seed)` / `exitDemoMode()` / `isDemoModeActive()`. Every read and
write now routes through `backend()`; **`grep "AsyncStorage\." repository.ts` returns nothing**, which
is the inspectable form of the guarantee.

**Design property, deliberate: the demo store is in-memory and NOTHING is persisted** — not the seed,
not what a visitor adds, not a "was in demo" flag. That makes isolation structural rather than
careful: there is no demo artifact a later bug could fail to clean up, and `exitDemoMode()` is a
one-line reference drop because releasing it *is* the cleanup.

**Green was verified, not assumed.** Mutating `backend()` to `return AsyncStorage` failed exactly the
two isolation tests and nothing else — so those tests depend on the mechanism rather than restating
it. 8 new tests · 152 mobile unit (was 144) · typecheck clean · lint still 14, none introduced.

**Surfaced during implementation (the before-scan structurally could not have caught these):**

1. **The premium cache had to be exempted.** Routing `cachedPremium` into the demo store would mean a
   renewal or purchase landing while someone explores the demo gets cached nowhere and is lost on
   exit. Premium is Apple-ID-scoped, not local-data-scoped — the same reasoning `clearAllLocalData`
   already used. **Resolved in-item:** `readJson`/`writeJson` take an optional `store`, and the two
   premium functions pass `AsyncStorage` explicitly. It is the only override, and it is tested.
2. **Demo state does not survive a relaunch.** Correct and intended, but it has a *product*
   consequence 1.2.1.4 now owns: if iOS kills the app mid-demo, the visitor returns to onboarding
   rather than the demo. Noted on that sub-step.
3. **Callers must pair both transitions with `reload()`** or the provider shows demo data it can no
   longer write to. Documented on both functions; 1.2.1.4 wires it.
4. **Nothing stops future code importing AsyncStorage directly** and bypassing the guarantee — the
   comment asks, but nothing enforces. → **filed to the backlog for 1.2.8**, which is already the
   lint-rule/CI item.

### 🔎 1.2.1 Demo mode — TASK before-scan · 2026-08-08

**Premises verified against current code, not assumed.** Four held, one did not, and the one that
did not is the item's central claim.

**Held.** `src/storage/repository.ts` is one flat module (**16** exports, not the spec's 15) and
`AppDataProvider` reaches storage only through it · `reload()` exists, aliased to `load` ·
`RequireTaxProfile` is genuinely a one-line widen · the `setPurchasesClient()` seam is real.

**Better than the spec knew.** The persona is already authored as a **valid backup file** —
`store-assets/reference-screenshots/maya-persona-backup.json`, version 1, 20 entries, W2 +
prior-year filed tax + amount-set-aside. `parseBackupSnapshot` already validates that exact shape,
so the seed is a port, not an invention.

**Did NOT hold — "no other persistence path."** Three writes bypass the repository:

| path | where | consequence in demo |
|---|---|---|
| 🔴 review prompt | `appReview.ts` → `gigTaxTracker:reviewRequested`, raw AsyncStorage | `maybeRequestReview` fires on every entry save (`app/entry.tsx:38`); threshold is **5** and demo seeds **20**. The flag is **one-shot** — a visitor poking at sample data permanently burns the real user's single App Store review request. Irreversible. |
| 🔴 OS notifications | `scheduleQuarterlyReminders()` from `app/onboarding.tsx:28` + two sites in `app/settings.tsx` | demo data schedules **real** quarterly reminders if demo entry routes through onboarding-complete |
| 🟠 analytics | `trackEvent` at `entry_logged`, `onboarding_completed`, **`paywall_viewed`** | demo exploration pollutes the exact funnel the outstanding **[D3-ASA]** read depends on |

So isolation is checkable at **three** files, not one. Cheap to plug, but only if it is a named
sub-step — hence 1.2.1.3.

**Two more surfaced.** (a) The persona's dates are **absolute** (May–Jun 2026,
`amountSetAsideByYear: {"2026": …}`) — a demo that imports that file **goes stale in January**, so
the seed must generate dates relative to today. Hence 1.2.1.2. (b) `AsyncStorage.removeMany` in
`clearAllLocalData` looked wrong; checked against the v3 type defs (`async-storage@3.1.1` — v3
renamed `multiRemove` → `removeMany`) and it is **correct**. No defect. Recorded because the next
reader will have the same suspicion.

**Design tension found — resolved by [D5].** The exit line wants premium screens to preview
populated while `subscribe`/`export` still hit the real paywall, but `isPremium` is a **single
boolean** read at 4 sites (`AddEntryScreen`, `DashboardScreen`, `PaywallScreen`, `SettingsScreen`)
and no "preview" concept exists anywhere. Options put to Jason: **(A)** a separate `isDemoPreview`
consumed alongside `isPremium` at the gate sites, with the two *action* paths (purchase, PDF
export) still checking `isPremium` alone; **(B)** make `usePremium()` return true in demo and guard
the actions separately; **(C)** no premium preview in demo. **Jason chose A, 2026-08-08** — it keeps
the entitlement boolean honest and un-fakeable, which matters because every future gate site
inherits whatever is decided here. B makes the boolean a lie that later code will trust; C removes
the stated reason 1.2.1 runs before 1.2.2.

**Filed to the backlog, not folded:** consolidating `appReview.ts`'s direct AsyncStorage write into
the repository (architecture, not a demo blocker) · pointing `SCREENSHOT_PLAN.md` at the demo seed
so the persona stops having two sources of truth.

### 🔎 1.2.0.8 Close the native-verification gap — after-scan · 2026-08-08

**Result: closed as far as it can honestly be closed.** 23/23 e2e · typecheck + lint clean (still 14).

**The before-scan found the root cause, and it wasn't the tests.** The audit assumed the fix was
"write more Maestro flows". Reading the code first showed the actual problem: **`TextField` renders a
visible label but never associates it with its input** — no `accessibilityLabel`, no association at
all. So every text field in the app is an unnamed box to a screen reader, and the *only* handle a test
ever had was the placeholder plus an index. **The fragility was a symptom of an accessibility bug.**

Fixing it (label → `accessibilityLabel`, hint → `accessibilityHint`, and the visible `Text` hidden
from assistive tech so it isn't announced twice and doesn't put a duplicate in the hierarchy) did four
things at once: named every field for VoiceOver, removed 7 index-based Maestro selectors, let the
Playwright helper target by name, and pre-emptively cleared part of what 1.2.5's a11y audit would have
found anyway.

**Proof the fix is real, not just non-breaking:** the Playwright helper was switched from
`getByPlaceholder("0.00")` to `getByLabel("Gross pay")`. It passes — which it could not do if the
accessible name hadn't landed. A "23/23 still green" on its own would have proven nothing.

**Coverage, honestly split:**
- **Automatable → automated.** `clear-all-data.yaml` drives the full path: destructive Alert →
  confirm → land on onboarding → re-onboard → the logged entry is provably gone. Runs **last** in the
  config, since it destroys the data every other flow depends on.
- **Not automatable → written down.** Restore needs the native document picker; app-lock needs a
  biometric prompt. Neither can be driven by any harness. They are now explicit gates in
  `V1_2_TESTFLIGHT_CHECKLIST.md` §A with what specifically to watch — including that a restore from a
  differently-themed backup must change the theme, the bug 1.2.0.2 fixed.

**⚠️ The honest limit of this step: I cannot run Maestro here.** No macOS, no simulator. Five flows had
their selectors rewritten and one flow is brand new, and **none of it has executed once.** The
`maestro-ios` workflow comment and the checklist both now say so plainly: **the first dispatch is the
validation pass, not a regression check.** Writing flows I can't run is worth doing — but claiming
they work would not be.

**Fifth wrong UI-string guess, caught by reading:** the destructive confirm button is
**"Clear Everything"**, not "Clear". Had it shipped, the flow would have failed as *"the dialog never
appeared"* — which reads like an app bug rather than a flow bug, and would have cost a whole mac CI
cycle to diagnose. **Read the component; don't recall it.**

**Enhancements surfaced → routed:** the `TextField` a11y fix folded in (it *is* the root cause). The
`Chip` and `Switch` a11y defects stay filed for 1.2.5 — same class, but they need decisions about
roles that belong in the audit that sweeps every screen.

### 🔎 1.2.0 Routing migration — WHOLE-ITEM after-scan · 2026-08-08

**Closed.** 23/23 e2e (4 new) · 245 unit · typecheck + lint clean (still exactly 14, none introduced) ·
every route looked at in both themes · iOS build validated on Codemagic. `App.tsx` — 593 lines, 13
sequential `if (screen === …)` branches — is deleted.

**What the item actually bought, beyond "it has routes now":** three pieces of state stopped existing.
`editingEntry` became a URL param, `paywallOrigin` became nothing (history already knew), and the boot
screen and lock became derivations. **Deleted state can't drift**, which is worth more than the routes.

**The pattern across all seven sub-steps — and the one thing to carry into 1.2.1:**
**every sub-step's real cost was found by the scan, not by the plan, and twice the green suite was
actively misleading.**
- 1.2.0.1: the suites drive by visible text → a 1-file change, not 24. *(De-risked the whole item.)*
- 1.2.0.2: 17 specs passed a provider rewrite **without exercising it once**.
- 1.2.0.3: 19 specs passed a rewiring of clear-data, restore **and** lock **without touching any**.
- 1.2.0.4: "same pixels" ≠ "same DOM" — a `Stack` keeps routes mounted, breaking 12 selectors.
- 1.2.0.7: **`router.back()` on a deep-linked route did nothing**, leaving a dead close button and
  force-quit as the only exit. No assertion could have caught it: every test reaches those screens by
  tapping through, the one path where plain `back()` was always fine. **Found by walking the routes
  with `goto()` and looking** — which is exactly what the "look at every route" exit condition is for.

**Three defects fixed that predate this item or were introduced by it:**
1. **Restore-from-backup applied only `appLockEnabled`** — a backup saved in dark mode rendered light
   until a cold start, and restored reminders were never rescheduled. *(Pre-existing.)*
2. **`saveAppSettings` clobbered neighbouring settings** on any independent write. *(Latent; would have
   become live the moment the theme moved.)*
3. **Dead close button on any deep-linked route.** *(Introduced by 1.2.0.4, fixed at 1.2.0.7.)*

**⚠️ Standing caveat, unchanged and important: all of this is web-verified.** The Maestro flows have not
run since the migration began, and `react-native-screens` is now doing real work under every screen.
The iOS build compiles — that is not the same as the app behaving. **1.2.9's device pass is carrying
more weight than it was three days ago**, and the untested clear-data / restore / lock paths are still
owed a Maestro flow.

**Replenishment:** 1.2.1 (demo mode) promoted to the active slot. **Recommended because it is the
bundle's designed lead** — reusable seed-data infrastructure that the premium optimizer, the onboarding
tour and the iPad pass all consume; each of those is unshowable or untestable on an empty account.

---

### 🔎 1.2.0.5 Route guards + 1.2.0.7 Verify — SUB-TASK after-scans · 2026-08-08

**1.2.0.5.** `RequireTaxProfile` on the 9 data-dependent routes, plus the reverse guard on
`/onboarding`. **Both close holes that 1.2.0.4 opened rather than pre-existing bugs:** the old dispatch
only rendered a screen when its data existed — which is why 8 routes still cast `taxProfile as
TaxProfile` — and real routing plus a declared `scheme` made those states addressable by URL and by
deep link. Without the reverse guard, a link to `/onboarding` would walk an existing user back through
setup and overwrite what they had. New `route-guards.spec.ts` pins all of it, including a loop over
every guarded route. **`RequireTaxProfile` is deliberately one component** so 1.2.1 widens it in one
line rather than nine.

**1.2.0.7.** Verification, and it earned its place: the visual sweep found the dead-close-button defect
that 23 green assertions did not. A temporary sweep spec walked all 11 routes in both themes; the
screenshots were **looked at**, not just captured. Deleted afterwards rather than left in the standing
suite, where it would slow every run without anyone diffing its output.

**Also recorded:** my test assertions were wrong twice more — `"What if I earned more?"` is the
*dashboard's button*, not the What-If screen's heading (`"What if…"`), and the reminders switch label
was invented. Both fixed by reading the source instead of guessing again. That is now four wrong
guesses about UI strings across this item; **read the component, don't recall it.**

### 🔎 1.2.0.4 Port the screens to routes — SUB-TASK after-scan · 2026-08-08

**Result: done, and it absorbed 1.2.0.6.** 12 route files under `app/`, plus `AppGate` (loading + lock)
and `ScreenFrame` (the themed background + status bar repeated verbatim in all thirteen dispatch
branches). **`App.tsx` is deleted** — the 593-line screen machine is gone. 19/19 e2e · 245 unit ·
typecheck + lint clean (still 14).

**Two pieces of state died rather than moved**, which is the real measure of the migration:
- **`editingEntry`** → an `?id=` param. Which entry you're editing is a property of *where you are*, so
  it belongs in the URL. Side effect: an edit screen now survives a reload, which the old state never did.
- **`paywallOrigin`** → nothing. It existed only to remember which of three screens to return to, and
  history knows that already. **1.2.0.6 is therefore closed here** — there was nothing left to delete
  separately.

**⚠️ The cost the before-scan missed, and the lesson in it.** The scan established that the suites drive
by visible text and concluded they'd survive "if the visible UI is preserved". The visible UI *was*
preserved — and 12 selectors broke anyway. **A `Stack` keeps the previous route MOUNTED as
`display:none` instead of unmounting it.** So while the entry form is open the dashboard is still in
the DOM, and the two share text: `DoorDash` is both a platform chip and an entry row; `0.00` is both
the gross-pay field and the dashboard's set-aside input. Selectors that were unambiguous only because
the old dispatch unmounted everything else became ambiguous or resolved to hidden elements.

**The premise was right and the conclusion was still incomplete** — "same pixels" is not "same DOM".
Worth carrying: the before-scan reasoned about what the user sees, and the tests query what exists.

Fixed with visibility-scoped helpers in `e2e/helpers.ts` (`visible`, `grossPayField`, `platformChip`)
rather than 12 ad-hoc patches, so the reason is documented once. **This is not a workaround** — the
helpers state what the tests always meant: the thing the user can see and could tap. Several were
weak before (`.first()` on a placeholder used eight times in one screen).

**Diagnostic note worth keeping: a failing suite is a SLOW suite.** Runs went from ~1.4 min green to
600s+ timing out, because each broken selector waits out a 30s visibility timeout. I initially read
that as a hang and waited on it twice; **Jason called it frozen, correctly.** The right move on a
suddenly-slow suite is `--retries=0 --reporter=line` to a file immediately, not patience.

**And I corrected a wrong guess by reading rather than guessing again:** I assumed "DoorDash leads
with…" was on the comparison screen and asserted against it; the failure showed it hidden, because it
is on the *dashboard teaser card* that opens that screen.

**Boundary shift, recorded:** `AppGate` had to move the loading + lock gate here — a gate wrapping every
screen can't live inside one of them once they're separate routes. **1.2.0.5 is now "harden the guards"
(admit the demo's not-yet-onboarded audience), not "build them."**

**Enhancements surfaced → routed:** `ScreenFrame` and the e2e helpers folded in (both required). Nothing
deferred. ⚠️ **Untouched and still owed:** the native surface — every route change here is web-verified
only, and the Maestro flows have not run since. That is 1.2.0.7's and 1.2.9's.


### 🔎 1.2.0.3 Lift app state above the router — SUB-TASK after-scan · 2026-08-08

**Result: done.** New `src/state/AppDataContext.tsx`, mounted above the `Stack`, owns
`localUserProfile` / `taxProfile` / `entries` plus `appLockEnabled` / `remindersEnabled`. **`App.tsx`
now imports nothing from `storage/`** — 591 → 577 lines, and, more to the point, it talks to data
through one hook instead of to persistence directly. **That is the seam demo mode (1.2.1) redirects.**
19/19 e2e · 245 unit · typecheck + lint clean (still exactly 14).

**Before-scan sorted the state into four groups, and only two moved.** App data and the two non-theme
settings lifted; **session/lock state stays** (it belongs with the route guards at 1.2.0.5) and
**navigation state stays** (it dissolves at 1.2.0.4). Lifting all of it at once would have dragged two
later sub-steps into this one.

**Design decision: the data layer throws; the caller owns the response.** Each of the nine handlers was
persist → set state → navigate → track, with `Alert` + `reportError` on failure. Only the first two
halves moved. Moving the rest would have put `Alert.alert` and navigation inside a data provider,
which is how a data layer stops being one.

**Two things became derived rather than stored, and both are strictly better:**
- **The boot screen.** It used to be decided inside the load effect, which made "which screen opens" a
  side effect of loading — the reason a failed load could strand the app on the spinner. Now
  `screen = navScreen ?? (settled ? (profile ? dashboard : onboarding) : loading)`, so navigation is an
  explicit override over a derivation.
- **`isLocked` → `unlocked`.** Tracking the *unlock* instead of the lock means the lock can't be left
  stale by a settings change: turning it off releases the screen immediately, and clearing all data
  (which turns it off) can't strand the user behind a lock guarding an app with no data in it.
- Bonus: both avoided `setState`-in-effect, so the lint ledger stayed at 14 rather than growing.

**What only surfaced by doing it:**
1. 🔴 **Clear-all-data, restore-from-backup and app-lock have no automated coverage at all** — no
   Playwright spec, no Maestro flow. **The suite went 19/19 across a rewiring of all three without
   exercising any of them.** They're `Alert`-driven and RN-Web doesn't render Alerts, so they can't be
   covered on web; Maestro is the only instrument that can see them. **Two are data-loss paths.**
   Filed to the backlog for 1.2.9 device QA + a Maestro flow. *This is the second time in three
   sub-steps that a green suite meant "nothing else broke" rather than "this works."*
2. ⚠️ **Ordering trap:** the derived `screen` referenced `lockAvailable` above its own declaration —
   caught by typecheck, but a reminder that derivations are order-sensitive in a way `useState` isn't.
3. ⚙️ `node -e` silently no-op'd a file write again (third time this session). Used Edit instead.
   The rule already exists in memory; recording that it recurred, not re-learning it.

**Enhancements surfaced → routed:** the two derivations folded in (both required by the move and both
reduce risk). The coverage gap deferred to 1.2.9 + backlog — it needs a device, so it can't close here.
Nothing else.


### 🔎 1.2.0.2 Hoist the provider stack — SUB-TASK after-scan · 2026-08-07

**Result: done.** Providers (`SafeAreaProvider → ThemeProvider → PremiumProvider → ErrorBoundary`) and
the three `init*` calls moved into `app/_layout.tsx` above the `Stack`; `App.tsx` is now a plain route
component. **19/19 e2e (2 new) · 245 unit · typecheck + lint clean · ports closed.**

**The knot the before-scan found, and how it was cut.** `colorScheme` lived in `App()` for exactly one
reason: `ThemeProvider` took it as a prop while `AppContent` needed to set it, and a component can't
consume a context it renders itself. That entangled 1.2.0.2 with 1.2.0.3 through a single value.
Resolved by **giving `ThemeProvider` the preference outright** — it loads and persists it, and exposes
`scheme` + `setScheme`. The lifted state disappears, and any route can now change the theme without
being prop-drilled from `App`, which is a precondition for screens becoming independent routes.

**Prerequisite it forced — and a latent bug it closed.** `saveAppSettings` did a wholesale write, and
three separate call sites each rebuilt the whole object from their own closure. Safe only while all
three lived in one component; the moment `ThemeProvider` wrote independently it would have clobbered
the other two. Added **`updateAppSettings`** (read-then-merge) alongside the existing full-write, so
restore keeps its overwrite semantics unchanged. Covered by a new regression test.

**⭐ Pre-existing bug found and fixed:** `handleRestoreBackup` applied only `appLockEnabled`, though
`restoreBackupSnapshot` writes all three settings to storage and its own comment says the caller should
sync in-memory state. So **restoring a backup saved in dark mode kept rendering light until a cold
start**, and a restored `remindersEnabled` was persisted but never acted on — the notification schedule
stayed whatever it had been. Now applies all three and re-runs schedule/cancel.

**What only surfaced by doing it:**
1. ⚠️ **A bug I introduced and caught before committing:** the `init*` calls were added to
   `_layout.tsx` while still present in `App.tsx` — double-initialising Sentry, analytics and
   RevenueCat. Found by checking imports after typecheck passed. *Typecheck does not flag this class;
   only reading the diff does.*
2. ⚠️ **The 17-spec suite passed the entire change without exercising it once.** There was no test over
   theme switching or restore. Green meant "nothing else broke", not "this works" — exactly the trap
   this plan quotes from Debt. Two specs added.
3. ⚠️ **My first two test attempts asserted against invented selectors and an over-specified artifact.**
   `getByLabel("Quarterly tax reminders")` didn't exist (the label is "Quarterly Due Date Reminders",
   and the `Switch` has no `accessibilityLabel` at all), and a cross-reload **screenshot equality**
   check passed only on retry. Replaced with property assertions. *Pin the intent, not the artifact.*
4. ⚠️ **A reload lands on the dashboard, not the screen you were on** — screen position is still React
   state at the strangler-fig stage. My test assumed otherwise. Documented in the spec, with a pointer
   to revisit at 1.2.0.4, which is what makes routes survive a reload.
5. 🔴 **Two real a11y defects → filed to 1.2.5** (backlog, not folded — both touch shared primitives
   used on every screen): `Chip` announces **no selected state** because RN-Web drops
   `accessibilityState={{ selected }}` on `role="button"`, and `Chip` is the app's selection primitive
   everywhere; the Settings `Switch`es carry no `accessibilityLabel`.
6. ⚙️ **Version-bump lesson** (from the parallel Codemagic run): bump `app.json`'s version at the START
   of a version's work. `1.1.1` was already approved, so the interim TestFlight upload was rejected —
   at precisely the moment an interim build was most useful. Bumped to `1.2.0`.

**Native build validated by that same run** — it compiled, signed and produced a valid `.ipa`, which
closes 1.2.0.1's owed native pass: `expo prebuild` survives the entry-point swap, `react-native-screens`
autolinks, and the new `scheme` doesn't disturb signing. Only the ASC upload failed, on the version.

**Enhancements surfaced → routed:** `updateAppSettings` and the restore fix folded in (both required by,
or directly adjacent to, the change). The two a11y defects deferred to 1.2.5. Nothing else.


### 🔎 1.2.0.1 Install + entry point — SUB-TASK after-scan · 2026-08-07

**Result: done, exit criteria met.** `expo-router@56.2.18` + `react-native-screens@4.27.0` installed;
`"main"` → `expo-router/entry`; `scheme: "setasidetracker"` added; polyfill rehomed to
`app/_layout.tsx`; `index.ts` deleted (both its jobs rehomed). **17/17 Playwright green with zero test
edits · 245 unit tests · typecheck clean.**

⭐ **The version's one open viability risk is closed.** expo-router resolves cleanly against Expo SDK 56
/ RN 0.85 / React 19.2.3. **[D1] holds**; the audit's fallback option B is not needed.

**Design decision made during the step — strangler-fig, not big-bang.** `"main"` cannot flip to
`expo-router/entry` without a route tree to boot into, so rather than port 13 screens at once,
`app/index.tsx` re-exports the existing `App` and the whole app runs as a single route. **The app is
fully working after every sub-step**, and 1.2.0.4 extracts screens progressively. Recorded because it
changes what "done" looks like for the sub-steps that follow.

**What only surfaced by doing it:**
1. ⚠️ **The 1.2.0.1 / 1.2.0.2 boundary was wrong.** `app/_layout.tsx` had to exist for the entry point
   to flip at all, so it was created here. 1.2.0.2 is now *hoist providers into it*, not *create it*.
   Plan corrected in the same edit.
2. 🔴 **`react-native-screens` is a new NATIVE module and the native build is unvalidated.** Web green
   proves nothing about autolinking or the xcodeproj glob, both of which have broken this repo's iOS CI
   before. Filed as an **owed build pass on 1.2.0** rather than deferred to 1.2.9 — a three-week-late
   discovery here would invalidate work built on top of it. Admitted under queue category 2 (deferring
   makes later items unsafe).
3. ⚙️ **npm in this environment fails without `NODE_OPTIONS=--use-system-ca`** — the first
   `expo install` died on `ERR_SSL_WRONG_VERSION_NUMBER`; the identical command with that flag added 91
   packages. **This will recur on every install** (1.2.3, 1.2.6), and Playwright needs it too. Recorded
   so it is not rediscovered each time. _(Same root cause as the known Playwright CA quirk.)_
4. ⚙️ Windows `EPERM ... rmdir` warnings during npm's cleanup — non-fatal, file locks in `node_modules`.
   Noted only because a clean CI install may behave differently.
5. ❓ `react-native-screens` arrived **transitively** and is not declared in `apps/mobile/package.json`.
   Expo autolinking handles that, but it is worth an `expo-doctor` check when the native build runs.

**Enhancements surfaced → routed:** nothing folded in beyond the two corrections above; nothing new
deferred to the backlog. The step stayed scope-locked.


### 🔎 v1.2 — VERSION-LEVEL before-scan (viability + enhancement) · 2026-08-07

**Viability: GO.** The version is worth building and can be built. Its premise — *this app's value is
invisible until you've logged data* — was re-verified against the current code and holds: onboarding
collects a tax profile and hands the user a dashboard reading $0.00, and there is **zero** demo/seed
code anywhere in `apps/mobile/src`.

Standing on the 2026-08-07 structural audit (verdict **KEEP, no pivot**), plus:

- **Premium gap caught by Jason, now closed.** The version was 100% free-tier work, meaning existing
  subscribers would have received nothing — churn risk on the newly-converting cohort. Closed by [D3].
  **Root cause worth keeping: nothing in the process required a premium line per version.** Now it does.
- **One open viability risk, and it is genuinely open:** `expo-router`'s compatibility with Expo SDK 56
  / RN 0.85 / React 19.2.3 is **unverified** — it can't be confirmed without resolving the package.
  Deliberately front-loaded into the very first sub-step (1.2.0.1) so it fails fast and cheap rather
  than after screens have been ported. **If it fails, [D1] re-opens** and the fallback is the audit's
  option B (keep hand-rolled routing, ship a narrower iPad).
- **Schedule risk is real and is not build time.** ~13 build days to feature-complete. The binding
  constraint is 1.2.6's external chain (App Group → profile regeneration → CI signing → a native
  target that has broken iOS CI before). **Recommendation on record: cut the widget before cutting the
  date.**
- **Estimate corrections carried in** (audit F2/F3): iPad + a11y are ~2× their original sizing (scoped
  against 6 screens, now 13); demo mode is *cheaper* than its memory claims, because all persistence
  funnels through one flat `repository.ts`.

**Enhancements surfaced → routed.** Nothing folded in beyond what [D2]/[D3] already added; nothing new
deferred. The version's scope is considered closed at this scan.

---

### 🔎 1.2.0 Routing migration — TASK before-scan · 2026-08-07

**Method:** treated the plan as a hypothesis and checked each premise against the code at `db4a9a7`.

**Verified true**
- No navigation library of any kind. `App.tsx` is 593 lines; `type Screen` is a 13-member union;
  dispatch is sequential `if (screen === "x") return <X/>` early returns.
- All app state — `entries`, `taxProfile`, `localUserProfile`, `editingEntry`, `paywallOrigin`,
  `appLockEnabled`, `remindersEnabled`, `isLocked`, `lockAvailable` — lives inside `AppContent`.
- Providers already nest correctly (`SafeAreaProvider → ThemeProvider → PremiumProvider →
  ErrorBoundary`) but sit *inside* the single rendered component, not above a router.

**Corrected a premise I had asserted** ⚠️
- I flagged that swapping the entry point to `expo-router/entry` would silently drop the
  `react-native-get-random-values` polyfill that `index.ts` loads first, breaking encryption on Hermes
  while web tests still passed. **This is already defended:** `src/storage/encryption.ts:3` imports the
  polyfill itself as a side-effect, with a comment noting it is "also imported at the app entry point."
  Downgraded from landmine to migration check. *Recorded because the corrected version is the useful one.*

**The finding that most changes the estimate** ⭐
- **The 12 Playwright specs contain zero `getByTestId`.** They call `page.goto("/")` once in
  `helpers.ts` and then drive the app by visible text, exactly as a user would. The 11 Maestro flows do
  the same on native. **Consequence: the suites are coupled to the UI, not to the routing mechanism**,
  so a migration that preserves what's on screen leaves them essentially intact. This is the difference
  between a 1-file change and a 24-file change, and it is the main reason 1.2.0 is viable inside a
  13-day version.
- **Corollary constraint, now binding on 1.2.0.4:** preserve visible text and layout during the port.
  Any copy change made "while we're in there" costs a test fix. Copy changes belong in a later pass.

**New work the scan added to the sub-steps**
- `app.json` has **no `scheme`** — deep links need one (1.2.0.1).
- `paywallOrigin` exists only to emulate back-navigation. Real routing makes it meaningless: **delete
  rather than port** (1.2.0.6).
- Route guards must **admit** the not-yet-onboarded user, or they lock out the audience demo mode
  exists for — Debt's `3.5.4.3`, imported rather than rediscovered (1.2.0.5).

**Transferable lessons pulled from Debt's equivalent migration**
- Hoist the provider **above** the `Stack`, or sibling routes render unrelated state one tap away.
- **Do not trust a green e2e suite on a root-layout change.** Debt broke navigation app-wide while the
  suite stayed green, because a reload lands on the right URL regardless. Verify by looking (1.2.0.7).

**Enhancements surfaced → routed:** none folded in beyond the three sub-step additions above; nothing
deferred to the backlog. The migration is deliberately scope-locked to "same app, real routes" — every
adjacent improvement it makes *possible* (deep links, split-view, tour entry points) is owned by a
later item, not by this one.

---

## Queued item specs — retrieved at switch-in

> ### ⚠️ Renumber map — 2026-09-20
>
> Two items were admitted ([D7]/[D8]) and the widget was cut, which shifted everything after 1.2.1.
> **Any reference dated before 2026-09-20 — in this log, in a scan record, in a commit message — uses
> the OLD numbering.** Read it through this map:
>
> _This is the **single** map for 2026-09-20 — old number → **final** number. The queue was edited
> twice today (Jason's two items, then the gap-scan restructure); only the end state is recorded, so
> there is one mapping to apply rather than a chain._
>
> | old | final | item |
> |---|---|---|
> | — | **1.2.2** | 🔴 Tax-correctness block _(new — gap scan)_ |
> | — | **1.2.3** | 🔴 Data-safety block _(new — gap scan)_ |
> | — | **1.2.4** | ⭐ Set-aside split by date and week _(new — [D7])_ |
> | — | **1.2.5** | ⭐ Mileage trip toggle _(new — [D8])_ |
> | 1.2.2 | 1.2.6 | Premium slice |
> | 1.2.3 | 1.2.7 | Native iPad |
> | 1.2.4 | 1.2.8 | Guided onboarding tour |
> | 1.2.5 | 1.2.9 | Accessibility depth audit |
> | 1.2.6 | — | iOS widget → **cut to v1.3** |
> | 1.2.7 | 1.2.10 | Filed correctness + submission-compliance backlog |
> | 1.2.8 | 1.2.11 | Lint ledger → CI gate |
> | 1.2.9 | 1.2.12 | Verify · device QA · phase after-scan |

### 1.2.1 — Demo mode
⬆️ **Retrieved and superseded 2026-08-08.** It is the active item; its decomposition lives in
[V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md) and its before-scan record is above. _(The spec's
"no other persistence path" claim was measured false at switch-in — do not re-import it from here.)_

### 1.2.2 — 🔴 Tax-correctness block _(new 2026-09-20, gap scan)_

**Four findings, every one understating what the user owes. All live in v1.1.1.** Each was
re-verified by this session against the code before admission — the agents' stated mechanisms are
recorded as hypotheses that happened to hold, not as authority.

**(a) Safe harbor compares a partial-year tax to a full-year withholding. ✅ VERIFIED.**
`estimatedPaymentsNeeded = Math.max(0, requiredAnnualPayment - federalWithholding)`
(`calculations.ts:511`). The required payment is 90% of a tax built from `computeTaxEstimate(entries,
…)` — entries logged **so far** (`SafeHarborScreen.tsx:60`). `federalWithholding` is
`w2FederalWithholdingYtdEstimate`, which in the no-pay-stub path is assigned `annualFederalEstimate`,
the **whole year's** (`calculations.ts:312`). ⚠️ **The variable says Ytd; the value is annual.** In
March a W2+gig user gets `estimatedPaymentsNeeded = 0` and `noPenaltyExpected = true` (`:515`) — and
`underDeMinimis` on the line above fires independently, so both routes to "you're fine" are open.
Through both spring deadlines, on the one premium screen whose whole job is penalty avoidance.
⭐ **Blast radius checked, not assumed:** the same asymmetry does **not** break the headline
`netAmountToSetAside` — there full-year W2 tax and full-year W2 withholding sit on opposite sides of
one subtraction and cancel to gig-only tax, which is correct. Confined to safe harbor.

**(b) Married Filing Jointly collects no spouse income. ✅ VERIFIED.** `grep -ri spouse` across
`apps/` and `services/` returns **nothing**. MFJ is offered (`OnboardingScreen.tsx:33`) and
`TaxProfile` (`types.ts:12-46`) carries one set of W2 fields — the user's own. A married gig worker's
profit is taxed from the bottom of the MFJ brackets instead of stacking on the spouse's income.
Systematically low, silently, for most married users.

**(c) GA, SC and MN dependent exemptions are modelled as dollar-for-dollar tax CREDITS. ✅ VERIFIED
ON BOTH HALVES.** `calculateAvailableStateCredit` computes `perDependent × numberOfChildren`
(`stateTax.ts:34`) and it lands as `creditApplied = Math.min(availableCredit, stateLevelTax)`
(`:171`) — a direct reduction of **tax owed**. Configured GA `4000` (`stateTaxConfigs/2026.ts:191`),
MN `5300` (`:749`), SC `4930` (`:1081`). ⚠️ **The agent cited `taxYears/2026.ts`; the file is
`stateTaxConfigs/2026.ts` — line numbers exactly right, directory wrong.** Internal evidence: the
genuine credits in the same file are AR 29, DE 110, NE 176, OR 256, two orders of magnitude smaller;
and VT already models an exemption correctly by folding it into `standardDeduction`. **Tax law
confirmed against sources, not recall:** all three are subtractions from income — GA per O.C.G.A.
§48-7-26 ("allowed as a deduction in computing Georgia taxable income"), MN and SC per their
departments of revenue and SC Code §12-6-1140. **The values are right; the SLOT is wrong.** Effect: a
GA single filer with 2 dependents on $40k profit is told **$0** Georgia tax instead of ~$891.
🔍 **Surfaced while confirming:** GA's exemption is rising $4,000 → $5,000 (then +$125/yr to $6,000
from 2027) and the config still says 4000 — **effective year not yet confirmed; check it with the
fix.** There is no staleness review over the state configs at all.

**(d) Dependents are counted in the tax owed but not in the withholding credited.** `calculations.ts:316`
subtracts a W2-withholding estimate that omits the CTC and state dependent credits
(`w2Withholding.ts:27-33`; `numberOfChildren` defaults to 0 at `stateTax.ts:96`) from a combined total
that includes both (`estimate.ts:65,71-77`). The module's "accurate W-4" assumption omits W-4 Step 3,
which is $2,000/child. Agent's worked example — **not independently re-derived by this session, treat
as indicative**: MFJ, 2 kids, $60k W2 + $20k gig → app says set aside $656, true balance due ~$3,496.

**Exit line:** all four corrected with tests that would have caught them; the GA/SC/MN fix moves those
three to the income-subtraction path VT already uses; no feature item renders a number this block
has not corrected first.

### 1.2.3 — 🔴 Data-safety block _(new 2026-09-20, gap scan)_

⬆️ **Retrieved and SUPERSEDED 2026-09-21.** It is the active item; its decomposition lives in
[V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md) and its before-scan record is above. ⚠️ **Do not
re-import the two claims below** — the before-scan measured both wrong. A wrong key does not
reliably throw (189/200 trials returned an empty string), and "no write anywhere is error-handled"
is false: all nine call sites alert. Kept verbatim as the record of what was believed at admission.

**(a) A decryption failure has no recovery path, and the key can be silently replaced.**
`repository.ts:99-106` falls back to `JSON.parse(raw)` on ciphertext, which throws and escapes as a
generic `loadError`. Worse: `getOrCreateEncryptionKey` **mints a fresh key** when SecureStore returns
null (`encryption.ts:44-48`) — so a Keystore reset makes existing data permanently unreadable on the
next write. AES-CBC with no MAC (`cryptoCore.ts:13-19`) means wrong key, truncation and tampering are
indistinguishable from each other.

**(b) No write anywhere is error-handled.** Load is wrapped; no write is (`AppDataContext.tsx:112-160`).
`setAppLockEnabled` and `setRemindersEnabled` set state **before** awaiting the write (`:162-169`), so
a failed write shows the user an app lock they do not have. Entry writes are unguarded
read-modify-write over the whole array — while `updateAppSettings` was explicitly hardened against
exactly that (`repository.ts:170-182`), so the pattern was known and not generalised.

⚠️ **Pairs with the backup-restore validation hole** already filed at 1.2.10: together they are the
whole data-durability story, and the app currently has no automatic backup either (deferred).

### 1.2.4 — ⭐ Set-aside split by date and week _(new 2026-09-20, [D7])_

**The gap, in Jason's words:** *"Having one big lump sum to set aside makes it hard to keep track."*

**Measured at admission — the premises, checked against the code, not assumed:**
- The dashboard renders `netAmountToSetAside` — a **year-to-date cumulative** figure — as one 32pt
  number (`DashboardScreen.tsx:282`). What's been saved is a single hand-typed total,
  `amountSetAsideByYear[year]` (`:158`). One number owed, one number saved, for the whole year.
- **There is no week or period concept anywhere in the app.** Grepped. The sole weekly figure is
  `weeklyCatchUpAmount` (`calculations.ts:152`), and it only renders **when already behind**
  (`DashboardScreen.tsx:412`) — a remediation message, not a rhythm. ⭐ This is the finding that makes
  the item structural rather than a display tweak.
- **The schema cost is small, and this was measured not inferred.** `parseBackupSnapshot` passes
  `candidate.entries` through wholesale after an `Array.isArray` check (`backup.ts:51`, `:60`) — no
  per-field reconstruction — so a new optional `Entry` field round-trips through backup for free,
  exactly as `hoursWorked` / `customExpenses` / `mileageLog` already do. ⚠️ The same read surfaced the
  restore-validation hole now filed against 1.2.10; **the fix there must stay forward-compatible or it
  breaks this property.**

**The design rule that makes it trustworthy — [D7].** Tax is progressive, so a per-period figure
derived from the year's *average* rate **moves retroactively** every time the user earns more: open the
app in November and last July's number has changed. That is the opposite of trackable. So each entry's
set-aside is **frozen at the rate in effect when it was logged**, stored as one optional field; the
weekly row sums its entries; the existing catch-up line reconciles the drift against the true year
total. Stable history, and the reconciliation mechanism already exists.

**Shape:** per-entry figure (by date) → rolls up to a weekly total → weekly sits alongside, not
instead of, the YTD lump. Free tier — this is the core set-aside job, not the tax-time axis.

**Open at switch-in:** which week boundary (ISO Mon–Sun vs. the user's own pay week) · whether a
pre-existing entry with no frozen field back-fills at the current rate or renders as "—" · whether the
weekly row is on the dashboard or a drill-down.

### 1.2.5 — ⭐ Mileage trip toggle 🔧 _(new 2026-09-20, [D8])_

**The gap:** mileage is a **hand-typed number** — a text input at `AddEntryScreen.tsx:61`, parsed at
`:138`. That is the entire mechanism. Free tier.

**Measured at admission:**
- `MileageLog` (purpose / startLocation / endLocation) already exists as Premium free text
  (`types.ts:98-106`), and its own docstring calls itself *"the data-model groundwork for v1.3
  GPS-assisted mileage, which will populate the same shape."* ⚠️ **Flagged as a carried premise, not a
  measurement** — the shape is there; whether it is the right shape for captured trips is a
  switch-in question, not a settled one.
- **Zero implementation groundwork.** No `expo-location`, nothing location-related in `app.json` —
  both grepped. The type is all that exists.

**Scope — [D8]: toggle only.** Start/stop trip capture on **when-in-use** location, populating the
existing `MileageLog` shape. **Auto-detection is v1.3**, because that is where background location,
battery tuning and real-road testing live — and background location is among Apple's most scrutinised
permissions, on a version whose date has already slipped.

⚠️ **This is v1.2's only native item, by deliberate trade.** The widget (old 1.2.6) was cut to v1.3 to
keep it that way — it carried a standing "cut this before cutting the date", and two capability chains
on one slipped version was the thing to avoid. Prerequisites → the plan's External prerequisites §.

⛔ **Untestable in the web harness and barely testable in the simulator** (simulated routes only). This
lands squarely in the standing web-verified-only trap. Device verification is not optional here; it is
the only verification that means anything.

### 1.2.6 — Premium slice
**Shift/earnings optimizer** (headline; pulled from v1.3; also delivers the owed earning-optimization
repositioning; soft-gate below ~30 entries — demo mode is what makes it demoable) · **safe-harbor
payment tracker** (payments made vs. required; completes what v1.1 half-built; needs a per-year
payments-made model following `amountSetAsideByYear`'s shape) · **per-quarter amount in reminders +
dashboard** (⚠️ `perQuarter` is *already* on `SafeHarborScreen.tsx:221` and in the PDF — this is a
surfacing fix; amount is premium, date stays free) · **expense-breakdown drill-down**. Gating check: all
four sit on the tax-time/complexity axis, never on the core set-aside job; additive, never blurring an
already-free section.

### 1.2.7 — Native iPad
Flip `ios.supportsTablet` (`false` today), unlock `orientation` (`portrait` today). Adaptive
split-view/sidebar, multi-column dashboard, size classes, Split View / Stage Manager, hardware-keyboard
niceties, native-layout screenshots. `src/components/Screen.tsx` is the single wrapper for every screen
— the natural size-class seam. ~2× the original estimate.

### 1.2.8 — Guided onboarding (full coachmark tour)
Value-prop intro + interactive first-run tour over **populated** views (hence demo mode first). Overlay/
tooltip system built **reusable across the three finance apps**. ⚠️ Render coach-marks **outside**
gesture handlers — a `GestureDetector` swallows taps on native, and a tour whose tooltips don't respond
on device is the failure mode. Calm, one-at-a-time, replayable, skippable.

### 1.2.9 — Accessibility depth audit
Dynamic Type · VoiceOver order and labels · 44pt touch targets · high-contrast · reduce-motion. Runs
**after** the layout work so it sweeps the final surface. ~2× original estimate. VoiceOver end-to-end is
device-owed (1.2.12).

### ⛔ iOS home-screen widget — CUT TO v1.3 on 2026-09-20 ([D8]) _(was 1.2.6)_
Today's earnings + running set-aside. WidgetKit target mirroring Freedom v1. It was on record as the
#1 risk to the August date, with a standing *"cut this before cutting the date"* — and 1.2.5 made
mileage v1.2's native item, so carrying both meant two capability chains on an already-slipped
version. **The recommendation was standing since 2026-08-07; this is it being taken.** Its external
prerequisites (App Group → profile regeneration → CI signing) move to v1.3 with it. Cost is external,
not build time — so it is no cheaper later, just less concurrent.

### 1.2.10 — Filed correctness + submission-compliance backlog
🔴 **IRS due dates don't shift for weekends/holidays** — `quarterlyDueDates.ts` uses the fixed
Apr15/Jun15/Sep15/Jan15 rule, so reminders can fire on the wrong day. ⚠️ **Higher-stakes now that 1.2.6
puts a dollar amount in those reminders** — a wrong date carries a wrong payment instruction; consider
pulling into 1.2.6. Plus: tax-profile completeness prompt · analytics/crash opt-out toggle (restore the
privacy-policy line if added) · privacy/support pages single source of truth (⚠️ interacts with
repo→private: Pages-on-private needs a paid plan, and a dead privacy URL is a compliance issue).

### 1.2.11 — Lint ledger → CI gate
14 findings: 1 dead export (`totalCustomExpenses`), 4 `setState`-in-effect, and the
`useRef(new Animated.Value()).current` idiom in `Screen.tsx`. **Rules-of-React violations, not observed
defects** — nothing misbehaves today. Runs late because 1.2.0–1.2.7 rewrite these files. Then add
`npm run lint` to `web-e2e`.

### 1.2.12 — Verify · device QA · phase after-scan
Playwright + Maestro green, both themes at parity (**light held to the same bar as dark**) ·
**real-device TestFlight QA against a per-version full-surface checklist, native paths first — hard
gate** · pre-submit functional-correctness audit · Apple guideline pass incl. paywall findability ·
**whole-phase after-scan across all of v1.2** · `RELEASE_NOTES.md` updated per-item as work lands.

---

## Completed-item detail

### 1.2.5 — Mileage trip toggle · ✅ DONE 2026-09-21, 6/6

_Moved verbatim from the plan at the 1.2.6 switch-in. Scan records — four sub-task and one
whole-item — are in the section above._

**Why it is next ([D8]):** it is the one item in the queue that **needs the build capacity Jason
reserved**. ⚠️ **Codemagic is ~80% consumed and the remainder is deliberately held for TestFlight** —
so the rule is *accumulate, then send one build carrying everything*. Mileage brings the only
prebuild-affecting change in v1.2; landing it now means the next device build validates it **together
with** 1.2.3's `Alert` layer, 1.2.4's weekly sheet and 1.2.1's demo flows, instead of spending a
scarce cycle on any one of them.

⛔ **When-in-use only.** Auto-detection is v1.3 ([D8]). **The moment this needs "Always" it is a
different App Store review** — if a sub-step starts reaching for background location, stop and
re-decide rather than widening the ask.

| # | sub-step | scan |
|---|---|---|
| **1.2.5.1** | ✅ **DONE 2026-09-21.** **[D16]: `docs/privacy.html` is the only privacy policy**; `PRIVACY_POLICY.md` is now a pointer. 🔴 **The two copies had drifted on a MATERIAL point** — the markdown said crash reporting and analytics were "neither currently active" and that *"we don't transmit your data anywhere at all"*, while **Sentry is live in release builds** and the hosted page correctly names Sentry and PostHog. Nothing linked to the markdown, so nobody saw the false version — but it is the file anyone would have edited, and publishing from it would have replaced a correct disclosure with a denial of third-party sharing. Location disclosed on the canonical page, wording approved by Jason. ⚠️ **The wording binds 1.2.5.3**: coordinates are never stored or transmitted, only the distance. | ✅ |
| **1.2.5.2** | ✅ **DONE 2026-09-21.** `expo-location@~56.0.26` (SDK-matched by `expo install`) and the config plugin, **alone in one commit** so a native build failure has exactly one suspect. `locationWhenInUsePermission` is worded to say the **same thing** as the policy's Location section ([D16]), ⚠️ **Superseded within the item by [D17]**: iOS background location is now **on** (when-in-use permission + the visible indicator, no "Always"), Android stays off. The usage string and the policy moved with it — three declarations, one claim. ⚠️ **Nothing imports it yet**, so the web bundle is untouched and this commit is only as risky as a prebuild: **272 unit · core-loop e2e green · typecheck clean.** The real verification is a device build, which 1.2.5.6 batches. | ✅ |
| **1.2.5.3** | ✅ **DONE 2026-09-21.** `src/mileage/trip.ts` — pure, knows nothing of `expo-location`, so the maths is testable without a device. ⛔ **The spec's open question is answered and the answer is NO:** a trip yields **only a distance**, never `MileageLog`'s start/end places. [D16]'s published wording says locations are never stored or transmitted — writing a captured place would store one and geocoding it would transmit one. Those fields stay the user's own words. ⭐ **The filtering IS the feature:** accuracy, jitter and implausible-speed gates, because a naive sum inflates a **tax deduction** the user cannot tell is wrong. The anchor is **held, not advanced**, when a step is ignored — otherwise slow movement never accumulates. **286 unit (was 272) · 4 plants, each caught by exactly one test.** | ✅ |
| **1.2.5.4** | ✅ **DONE 2026-09-21.** `tripTracker.ts` (the task, start/stop, a subscription) + `TripTrackerButton` under the mileage field. A finished trip **adds to** the field rather than replacing it — one entry can cover several trips, and the number stays the user's to correct, which is what the policy promises. ⛔ **Coordinates are never persisted**, so a termination loses the metres since the last fix; a test asserts nothing resembling a position reaches storage. Every start failure is **named** and alerted immediately — learning after the drive that nothing recorded means the trip is gone. ⚠️ Renders **nothing on web**, so the e2e suite cannot see it: covered by unit tests over the tracker, and the rest is device-owed. **296 unit (was 286) · 50/50 Playwright.** | ✅ |
| **1.2.5.5** | ✅ **DONE 2026-09-21.** `tripHealth` + `diagnoseStall` + a warning line on the running trip. ⚠️ **This row's own "app backgrounded stops updates" premise was superseded by [D17]** mid-item — what survives is its principle, now aimed at the cases that remain. ⛔ **A stalled trip LOOKS like a working one**: the button still says "Stop trip", the miles just never rise. So staleness is detected **from the trip's START**, not only from the last fix — a trip that never received anything would otherwise never be called stale, which is the worst case of the set. ⭐ **The cause is ASKED of the platform, never inferred**: a parked car and a revoked permission look identical from the silence, and `no-signal` is returned only when permission and services are both fine — crying wolf at every long light teaches users to ignore the one warning that matters. **305 unit (was 296) · 50/50 Playwright · 2 plants caught.** | ✅ |
| **1.2.5.6** | ✅ **DONE 2026-09-21.** All runnable gates green: **306 unit · 102 engine · 50/50 Playwright · typecheck + lint · both audits · ports free.** 🔴 **The after-scan found a FOURTH demo-mode leak** of the class 1.2.1.3 plugged — `persist()` wrote raw AsyncStorage outside the repository, so a demo trip left a key in **real** storage. Guarded and planted. ⛔ **The headline is what is NOT verified: none of 1.2.5 can be proven on this machine.** The one-build agenda now sits at the head of the TestFlight checklist, ordered most-likely-broken first. Release notes written as the work landed. | ✅ |

**Exit line:** a user can start and stop a trip, the miles land on an entry they can still correct,
and every way the capture can fall short is something the app says out loud rather than absorbs.

---

### 1.2.4 — Set-aside split by date and week · ✅ DONE 2026-09-21, 6/6

_Moved verbatim from the plan at the 1.2.5 switch-in. Scan records for this item — five
sub-task and one whole-item — are in the section above._

**Why it is next:** the correctness blocks are closed, so the feature items can now render figures
that have already been corrected — which was the entire point of sequencing them first. In Jason's
words ([D7]): *"having one big lump sum to set aside makes it hard to keep track."*

⚠️ **The before-scan is owed at 1.2.4.2**, the first step that writes code. The spec's premises were
measured on 2026-09-20 — **before 1.2.2 changed the tax math and 1.2.3 changed the storage path** — so
they are a hypothesis again, not a finding. Spec → [V1_2_LOG.md](V1_2_LOG.md).

| # | sub-step | scan |
|---|---|---|
| **1.2.4.1** | ✅ **DONE 2026-09-21.** All three answered by Jason — **[D13]** week is a fixed **Mon–Sun** · **[D14]** legacy entries get a computed figure and any week containing one is **marked estimated** · **[D15]** "this week" goes **on the dashboard** beside the YTD total, past weeks behind a drill-down. | ✅ |
| **1.2.4.2** | ✅ **DONE 2026-09-21.** `setAsideRate` on `Entry`, frozen by the provider on create. ⭐ **It is the tax the entry ACTUALLY ADDS** — `f(existing + this) − f(existing)` through the same `netAmountToSetAside` the dashboard shows — so brackets, the SE wage base, state rules and the W2 credit are handled by construction, with no parallel tax path. The increments **telescope to the year's real total**, which is what will make the weekly rows add up, and a test pins that. A *rate* rather than a dollar amount, so an edit moves the dollars at the frozen rate. ⛔ **The e2e caught a defect no unit test could:** an edit DROPPED the field — the entry form builds a complete object literal, so anything it does not name is lost on save, and this is the app's first `Entry` field the user does not edit. Carried forward in the provider, not the form. **256 unit (was 248) · 45/45 Playwright (was 43) · 2 plants, both caught.** | ✅ |
| **1.2.4.3** | ✅ **DONE 2026-09-21.** `weeklySetAsides` + `weekStartOf` + `fallbackSetAsideRate`, all pure. Monday–Sunday per [D13]; most recent week first; **no row for a week with no work** — an empty row is not information. [D14] handled: a legacy entry gets the year's own effective rate and its week is **marked estimated**, with a control asserting a fully frozen week is *not*. ⚠️ **All week maths is UTC** — `new Date("2026-06-22")` is midnight UTC, which is Sunday evening across the Americas, so a local-time version files every Sunday into the wrong week. Confirmed by planting it. **266 unit (was 256) · 3 plants, all caught.** | ✅ |
| **1.2.4.4** | ✅ **DONE 2026-09-21.** "This week" sits inside the set-aside card **beside** the year total, never instead of it ([D15]), and opens `WeeklySetAsideSheet` — every week worked, with [D14]'s estimated weeks labelled and a footnote saying what that means. **266 unit · 48/48 Playwright (was 45).** ⛔ **A plant PASSED and rewrote the test:** the spec asserted on the accessibility *label*, so hardcoding the displayed figure to `$0.00` went green — the label kept telling the truth while the screen lied. It now reads the **rendered text**, and keeps the label assertion for VoiceOver. ⚠️ A second assertion of mine would have reported a false defect: a loose match on "estimated" caught the dashboard's *"Q4 2026 estimated tax"*. | ✅ |
| **1.2.4.5** | ✅ **DONE 2026-09-21.** `summarizeWeeklySetAsides` — the weeks, their total, the year total, and the **adjustment** between them — shown in the sheet as its own row plus a **Total** line, so the list visibly adds up. Hidden when it is zero, which is the normal case. ⛔ **The plan's premise was wrong and following it would have shipped an incoherent screen:** `computeCatchUpStatus` compares what is owed against what the user says they have **actually saved** — a hand-typed figure about their behaviour — not the weekly figures against the year total. Wiring this drift into that line would have told a user who is perfectly on track that they were behind. **270 unit (was 266) · 50/50 Playwright (was 48) · 2 plants caught**, and a third exposed a **circular** assertion of mine. | ✅ |
| **1.2.4.6** | ✅ **DONE 2026-09-21.** All gates green: **272 unit · 102 engine · 50/50 Playwright · typecheck + lint · both tax-config audits · ports verified free.** ✅ Release notes written **as the work landed**, not backfilled. 🔴 **The whole-item scan caught what no sub-step could:** the demo persona carried no frozen rates, so **every demo week rendered "estimated"** under a footnote claiming the entries predate the feature — false, and on the surface store screenshots are shot from. `buildDemoSeed` goes through none of the three paths the sub-steps built. Folded in, with a plant. | ✅ |

**Exit line:** each entry carries a set-aside frozen at the rate it was logged under, a week's worth
sums to a figure that never moves retroactively, and the YTD total still says what is really owed.

---

### 1.2.3 — Data-safety block · ✅ DONE 2026-09-21, 5/5

_Moved verbatim from the plan at the 1.2.4 switch-in. Scan records for this item — four
sub-task and one whole-item — are in the section above._

**Why it is next:** a decryption failure has no recovery path *and* no visible symptom — the app
sends a user whose data cannot be read to the **onboarding screen**. Correctness before features, the
same reason 1.2.2 preceded them.

⚠️ **The before-scan corrected the spec twice and found a third thing bigger than either.**
Measured, not re-read: a wrong key **does not reliably throw** (189 of 200 trials silently return an
empty string), and *"no write anywhere is error-handled"* is **false** — all nine call sites
alert. Record → [V1_2_LOG.md](V1_2_LOG.md).

| # | sub-step | scan |
|---|---|---|
| **1.2.3.1** | ✅ **DONE 2026-09-21.** `UnreadableDataError` + `isCipherText` (the `U2FsdGVkX1` marker) + a pure `decode.ts`, extracted so it is testable at all — `repository` imports AsyncStorage and `encryption` imports `Platform`, which Vitest cannot parse. The "legacy plaintext" fallback is **deleted**: it protected data that cannot exist. ⭐ **The error is deliberately NOT sub-classified by cause** — wrong key, truncation and garbage are measured to be indistinguishable without the integrity tag filed to v1.3. **236 unit (was 226) · 3 plants, all caught** — and plant 1 exposed a **vacuous assertion** in a test written minutes earlier, which only checked `.cause` and so stayed green against a completely different error. | ✅ |
| **1.2.3.2** | ✅ **DONE 2026-09-21.** `getOrCreateEncryptionKey` split into `readEncryptionKey` + `createEncryptionKey`; the repository mints **only** when no user data exists, and raises `EncryptionKeyUnavailableError` otherwise. A null key now means exactly one thing — *this platform does not encrypt* — so `writeJson` can no longer mistake a missing key for permission to write plaintext. ⛔ **A key failure is no longer CACHED**: the module-level promise held a rejection for the life of the process, which would have made [D12]'s retry fail every time it was tapped. ⭐ **`repository.ts` has its first tests ever** (3 mocks; it imports AsyncStorage, and `encryption` imports `Platform`) — so the rule is pinned where it is *followed*, not where it is written. **245 unit (was 236) · 4 plants, all caught.** | ✅ |
| **1.2.3.3** | ✅ **DONE 2026-09-21.** `RecoveryScreen` + `AppGate` wiring: `loadError` finally **has a consumer**, so an unreadable device no longer falls through to onboarding and gets written over. [D12]'s three routes, all working, and the load failure now reaches **Sentry** — nothing reported these before, so there is still no field figure for how often it happens. ⭐ **Recovery needed its own wipe**: restore writes through the same key path, and `clearAllLocalData` spares `appSettings`, so a recovery built on it would erase everything *and still refuse to mint* — stranding the user. ⭐ **The backup is parsed before anything is destroyed**, so a bad file costs nothing. **248 unit · 41/41 Playwright (was 38) · 4 plants; the 4th PASSED and a line came out because of it.** | ✅ |
| **1.2.3.4** | ✅ **DONE 2026-09-21.** All three setters persist **first**, then set state — which is the contract `AppDataContext` already documented for every mutation and which these were the only exceptions to. ⭐ **Three, not two: `ThemeContext.setScheme` had the identical defect in a different provider**, and was not in the spec. Verified at the real boundary — `localStorage.setItem` made to throw for the settings key, so the write fails the way a disk does rather than the way a mock does. **43/43 Playwright (was 41), with a control asserting a successful write still moves the switch** — without it, a switch that ignored every tap would have passed. Plant caught. | ✅ |
| **1.2.3.5** | **Verify + whole-item after-scan.** A plant against each of the four; Playwright over the recovery surface; full suites green. | ⬜ |

**Exit line:** a key or ciphertext failure is named, surfaced and recoverable; nothing re-keys or
overwrites data it could not read; no setting can display a state that was never stored.

---

### 1.2.2 — Tax-correctness block · ✅ DONE 2026-09-21, 7/7

_Moved verbatim from the plan at the 1.2.3 switch-in — the queue keeps one line and the
sub-step detail lives here. This item's scan records are in the section above._

**Why it is next:** three confirmed money-wrong bugs, live in v1.1.1, all understating what the user
owes the IRS — and **every feature item after this renders numbers this block corrects.** 1.2.4 puts a
per-entry set-aside in ~52 rows a year; building it first multiplies one wrong figure into fifty-two.

⚠️ **The before-scan corrected the audit twice. Both corrections are in the sub-steps below.**

| # | sub-step | scan |
|---|---|---|
| **1.2.2.1** | ✅ **DONE 2026-09-20.** New `StateExemptionConfig` + `dependentExemptionUsed` on the result; subtracted from income in **both** the flat and bracket branches; GA/SC/MN moved off `credit`. ⭐ **The bug had TESTS PROTECTING IT** — two asserted the credit behaviour, one named *"which is material (not a rounding error)"*. Rewritten as 4. ✅ **GA $4,000→$5,000 confirmed effective TY2026** (HB 463), so the 2026 config's `4000` was a *second*, separate bug. 102 engine tests, both plants caught. | ✅ |
| **1.2.2.2** | ✅ **DONE 2026-09-21.** `scripts/dependent-audit.mjs` (`npm run audit:dependents`) — inventory from the configs, not by hand. 🔴 **The finding is far bigger than three states: only 7 of 42 taxing states model ANY dependent mechanism; 35 model none**, incl. CA ($489/dep credit), NJ ($1,500), MA ($1,000) — all confirmed against sources. ⚠️ Direction is **safe** (overstates tax) unlike GA/SC/MN, so the 35-state fix is **deferred as its own workstream**, not folded. Cross-year drift clean (only GA's intended change). Script **exits 1** on any per-dependent credit ≥ $1,000, so the original class can never silently return. | ✅ |
| **1.2.2.3** | ✅ **DONE 2026-09-21.** `projectAggregateToFullYear` + `computeSafeHarborFromEntries` scale gig income to a full year through the **same** `estimateFromAggregate` pipeline the What-if screen uses — no parallel tax path. ⭐ **Not a policy call: the result type's own docstrings already said "current-year" and "full-year"** — only the computation disagreed. Early-January multiplier **capped at 12.5×** so one $500 day doesn't annualise to $36,500. Screen now says *"projected"* and discloses the assumption. 202 unit (was 197) · 34/34 Playwright · plant caught by exactly the blocker test. | ✅ |
| **1.2.2.4** | ✅ **DONE 2026-09-21.** `spouseAnnualIncome` on `TaxProfile`, joint-filers-only field in onboarding **and** edit (existing married users need the route), fed to `otherTaxableIncome`. ⛔ **The before-scan caught a worse bug than the one being fixed:** `netAmountToSetAside = tax − withholding`, so counting spouse income *without* crediting their withholding hands the user their spouse's **entire tax bill**. Both move together, and the credit is **ungated by `hasW2Job`** — a gig worker whose spouse holds the W2 is the case this exists for. ⭐ Spouse income is kept **out of `otherFicaWages`**: the SS wage base is per-person, so routing it there would silently cut the user's SE tax. 207 unit (was 202) · 34/34 Playwright · both traps mutation-verified. | ✅ |
| **1.2.2.5** | ✅ **DONE 2026-09-21.** `estimateW2Withholding` now takes `numberOfChildren` — W-4 Step 3 — applying the CTC and state dependent credits/exemptions, and dependents are claimed on **exactly one** W-4. ⛔ **Its before-scan caught a double-count I introduced in 1.2.2.4**: `estimateTax` derives withholding from `otherTaxableIncome`, which now includes the spouse, so my separate spouse estimate counted them twice whenever the user also had a W2 — every 1.2.2.4 test used `hasW2Job: false`. Replaced with one per-job path. ⚠️ **Three test versions before a plant was caught** — see the log. 212 unit · 102 engine · 34/34 Playwright. | ✅ |
| **1.2.2.6** | ✅ **DONE 2026-09-21.** `US_STATES` + `StatePicker`, search by name or code, in onboarding **and** edit. ⭐ **All 51 were always supported** — the engine has 50 states + DC and always did; the *input* was broken, so "California" became an unmatched key, `$0` state tax, and a warning that California wasn't supported. ⭐ **A hand-written list is what drifts, so a test asserts it matches the engine's keys exactly, both directions, for every tax year.** ⚠️ Placeholder and a11y name kept **unchanged** and an exact code auto-selects — Maestro is out of minutes until ~November and could not re-validate a renamed selector. 226 unit (was 212) · **38/38** Playwright (was 34) · both plants caught. | ✅ |
| **1.2.2.7** | ✅ **DONE 2026-09-21.** Both audits wired into CI's cheap gate step and **both exit non-zero** — gates, not reports. New `reviewedOn` on `TaxYearConfig` + `audit:staleness`: fails when a live year's figures are unreviewed for 6 months, or when the current calendar year has no config and the engine would **silently fall back** to another year's brackets. ⭐ **Every 1.2.2 fix is mutation-verified** — 9 plants across 6 sub-steps, each caught. ⚠️ Both gates were themselves planted against, because an unverified gate is the defect it is meant to prevent. | ✅ |

**Exit line:** all four money-wrong bugs corrected with mutation-verified tests; the dependent
mechanism checked across **all 51** configs, not three; no feature item renders a figure this block
has not already fixed.


