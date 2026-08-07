# Gig (SetAsideTracker) — pre-v1.2 structural audit

**Run:** 2026-08-07 · **Repo state:** `efb7c51` on `master` · **Shipped version:** 1.1.1 (live)
**Target version under review:** v1.2 — the free-tier UX bundle
**Gate this satisfies:** portfolio audit-cadence #4 (the 1000-foot keep-vs-pivot), listed in
`app-portfolio/MASTER_PLAN.md` as *"Gig → before v1.2"*. Owed since 2026-07-17; never run until now.

**Method.** Every premise checked against the code at `efb7c51` rather than against the plan text
that asserted it — the v1.2 bundle was scoped on **2026-06-30**, and v1.1 (seven new screens plus the
entire premium tier) shipped in between. A pre-authored plan is a hypothesis.

---

## Verdict: **KEEP. No pivot.** But the bundle's scope is materially larger than when it was set.

The product's core job — *a free, live, correct "set aside this much" number, with multi-state and
local tax the competitors don't model* — is intact, differentiated, and now more defensible than at
v1.0 (all 50 states + DC, MD/PA/NY local, four filing statuses, CTC, W2 offset, safe-harbor). Nothing
found here argues for a pivot, a rewrite, or a cut.

What the audit *does* find is that **the v1.2 bundle, as written on 2026-06-30, contains one hidden
architectural prerequisite nobody costed**, and that the bundle attacks a different problem than the
one the differentiation strategy names as most urgent. Both are decisions for Jason, below.

---

## Findings

### 🔴 F1 — Native iPad split-view is blocked by an architectural prerequisite that was never costed

**There is no navigation library in this app.** No `expo-router`, no `react-navigation` — routing is a
hand-rolled `useState<Screen>` machine inside a **593-line `App.tsx`**, dispatched as a sequence of
early returns:

```
const [screen, setScreen] = useState<Screen>("loading");
...
if (screen === "onboarding") return <OnboardingScreen ... />;
if (screen === "addEntry")   return <AddEntryScreen ... />;
if (screen === "whatIf")     return <WhatIfScreen ... />;   // ×13
```

This model renders **exactly one screen at a time, by construction.** A native iPad split-view is by
definition *two screens rendered simultaneously* — a list pane beside a detail pane. It cannot be
expressed in this architecture at all. The memory that scoped this item is explicit that iPad must be
*"not just a wrapper — adaptive split-view / sidebar nav (entry list + detail pane)"*, so the item as
specified requires **a routing migration first**, not a layout pass.

Secondary consequences of the same finding: there are no route URLs (so the onboarding tour cannot
route by deep link, and neither can a demo entry point), and there is no route-guard concept (the
thing Debt needed at its own `3.5.4.3` so a not-yet-onboarded user could reach the demo).

**This is the single biggest scope risk in v1.2 and it needs a decision before the block starts.**
See [DECISION D1].

### 🟢 F2 — Demo mode has a genuinely clean seam. It is the *easiest* item in the bundle, not the hardest

The 2026-06-30 memory warns that *"demo mode's isolation/reversibility is the hard part."* Against the
current code, that is **no longer true, and it is worth correcting before the estimate is inherited.**

Every read and write of persisted state in this app funnels through **one flat module**,
`src/storage/repository.ts` — 15 exported async functions and no other persistence path. That is a
real chokepoint: demo mode can be enforced at a single file by routing reads to a seeded in-memory
snapshot and making writes land in the sandbox, and the isolation guarantee becomes *checkable by
inspection of one file* rather than by auditing call sites.

Compare Debt, which needed a `StoreProvider` hoisted above its router (`3.5.4.2`, explicitly flagged
there as *"the highest-blast-radius file in the app"*) precisely because its state was **not** behind
one seam. **Gig is in the better position here.** Confirmed: zero demo/seed/sample code exists today,
so this is greenfield, but greenfield against a good seam.

The premium-preview half also already has its seam — `setPurchasesClient()` in
`src/premium/purchases.ts` exists for tests and can inject a demo entitlement, so premium screens can
show populated sample data while `subscribe`/`export` still route to the real paywall.

### 🟠 F3 — The bundle's surface roughly doubled after it was scoped, and was never re-estimated

The bundle was sized on 2026-06-30 against a **6-screen** app. v1.1 then shipped `WhatIfScreen`,
`PlatformComparisonScreen`, `SafeHarborScreen`, `W4OptimizerScreen`, `YearOverYearScreen`,
`ExpenseBreakdownScreen` and `PaywallScreen`. The app is now **13 screens**.

The two items that scale linearly with screen count are exactly the two that carry no other
complexity: **the iPad layout pass and the accessibility depth audit**. Both are ~2× the work implied
by the estimate on record. Nothing is wrong with the items; the number attached to them is stale.

### 🟠 F4 — v1.2 attacks *activation*. The strategy names *retention decay* as the more urgent problem

`DIFFERENTIATION_STRATEGY.md` names two first-class problems for this app: **manual-entry retention
decay** (*"the logging habit is what dies first"*) and **discovery**. The v1.2 bundle — demo mode,
onboarding tour, iPad, a11y — is squarely aimed at a *third* thing: **first-run comprehension**, i.e.
turning an install into an activated user.

That is real and worth doing (the app's value genuinely is invisible until data exists). But it should
be named honestly: **v1.2 improves the top of the funnel and does nothing for the week-3 drop-off.**
The levers that attack decay are passive capture (GPS auto-mileage, v1.3) and ambient presence (the
home-screen widget).

The widget is the cheap one, and it is currently **orphaned** — it appears only in the v1.2 definition
that Jason's 2026-08-07 decision just retired. See [DECISION D2].

### 🟡 F5 — Three documents defined "v1.2" three incompatible ways; two are now resolved by decision

| Source | claimed v1.2 |
|---|---|
| `app-portfolio/MASTER_PLAN.md` item 4 (settled 2026-06-30) | free-tier UX bundle |
| `IMPLEMENTATION_PLAN.md:285` | Android + retention/growth |
| `ROADMAP.md` §9 tags | voice · widget · optimizer · Android · milestones · referral · push |

**Resolved 2026-08-07 (Jason):** v1.2 = the free-tier UX bundle; Android becomes v1.3 and the rest
renumbers. The retention/growth features are re-homed in the reconciliation pass. Recorded here
because the contradiction survived ~6 weeks and two of the three docs were being read as current.

### 🟡 F6 — The repo had no CI for five weeks, and no unit-test gate ever

Found and fixed at this switch-in (`efb7c51`), recorded here because it changes how much the green
suite was worth during v1.1's tail: `web-e2e`'s trigger was disabled 2026-06-30 *"until the monthly
reset"* and two resets passed with it off. Separately, that workflow ran **only** Playwright — the 101
tax-engine and 144 mobile unit tests and `tsc` had **never** run on a push in this repo's history.
Both closed. A lint gate now exists too, with a 14-item pre-existing ledger to clear (F7).

### 🟡 F7 — A 14-item rules-of-React ledger, newly visible

Now that lint runs: one dead export (`totalCustomExpenses` in `scheduleC.ts`), four
`setState`-synchronously-in-effect sites (`DashboardScreen`, `EditTaxProfileScreen`,
`OnboardingScreen`, `BreakdownDetailSheet`), and the `useRef(new Animated.Value()).current` idiom in
**`Screen.tsx` — the component that wraps every screen in the app.**

**Calibration, so this is not over-read:** these are rules-of-React violations, **not observed
defects.** Nothing is misbehaving today. They matter because they block adopting the React Compiler
and because `Screen.tsx` is precisely the file an iPad size-class pass has to touch — so the ledger is
cheapest to clear *as part of* v1.2, not before or after it.

---

## Decisions this audit raises

### [DECISION D1] — how to resolve the iPad/routing prerequisite (F1)

**Recommendation: adopt a real router as the first item of v1.2 (option A).** It is a prerequisite for
the *specified* iPad experience, it unblocks the tour's and the demo's entry points at the same time,
and it is the kind of foundational change that gets more expensive with every screen added — the app
went 6 → 13 screens in one version, and v1.3 (Android) plus v1.4 add more.

- **A. Adopt `expo-router` first, then build iPad on it.** Highest cost, but it is the only option
  that delivers split-view/sidebar as specified, and it pays off across the tour, the demo entry
  point, deep links, and Android's hardware back button (a v1.3 requirement that this architecture
  also has no answer for). Debt is the in-house reference implementation.
- **B. Keep hand-rolled routing; ship a narrower iPad.** Multi-column dashboard and wider layouts that
  use the canvas, but **no split-view and no sidebar.** Much cheaper, and honest — but it is closer to
  the "wrapper" outcome Jason explicitly rejected on 2026-06-30.
- **C. Drop iPad from v1.2**, ship demo + tour + a11y, and give iPad its own version once a router
  exists. Keeps v1.2 small and lets the routing migration be costed on its own merits.

### [DECISION D2] — does the home-screen widget join v1.2? (F4)

**Recommendation: no — defer it to v1.3 with Android.** It is genuinely the cheapest retention lever
and it is currently orphaned, but it is a *native* item (WidgetKit + App Widget) whose natural home is
the version that already carries a two-platform native device pass. Folding it into a bundle that is
otherwise pure-JS free-tier UX would drag a native build + signing cycle into v1.2 for one feature.
**Re-home it explicitly in the reconciliation pass so it cannot go orphaned again.**

---

## ⏳ The half of this audit that is data-gated, and still open

A keep-vs-pivot audit is supposed to read live numbers. These are Jason-side and were not available:

1. **[D3] the ASA read.** The $100 Apple Search Ads credit was due to exhaust **~2026-08-06**. Run 1
   served 0 impressions at $1.20 exact; run 2 relaunched at $15/day, exact @ $4.00. Needed: impressions,
   CPT, tap→install, and whether any install reached `paywall_viewed`.
   ⚠️ `ASA_SETUP_GUIDE.md` §8's caveats bind the reading: ~10–15 installs **cannot** measure a 3%
   purchase rate, and July/August is the seasonal trough for gig-tax search. A weak result is a
   *channel-timing* read, not a verdict on the product.
2. **PostHog since 2026-07-03:** installs, activation (% who log a first entry), the week-1→week-3
   retention curve, and `paywall_viewed` → `purchase_completed`.

**What they would change:** not the *keep* verdict — that rests on the product's job and its
correctness moat, neither of which conversion data can overturn at this sample size. They bear on
**F4's ordering**: a bad activation number strengthens v1.2 as scoped; a good activation number with a
bad week-3 curve argues for pulling retention work (widget, GPS) forward ahead of iPad.

**This audit is therefore green on structure and open on sequencing.** The v1.2 plan is written to be
correct either way — F4's answer changes which item leads, not whether the block is right.
