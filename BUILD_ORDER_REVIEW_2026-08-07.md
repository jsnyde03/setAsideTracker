# Gig — build-order re-review, 2026-08-07

**Trigger.** Jason: *"I want us to revisit why we pushed the next premium features out to 1.3. I think
shipping 1.2 with nothing new in premium is a bad idea, especially since I've started getting
conversions."* Settled immediately (premium goes into v1.2 — see §2), which per the standing rule
means the **whole build order** gets re-reviewed, not just the one version that changed.

Two problems turned out to be the same problem, which is why this is a ladder review and not an edit.

---

## 1. The finding: only ONE item on the ladder is date-locked, and it is currently last-but-two

Everything on this roadmap can ship in any month **except the Filing Season Toolkit**, whose value
window is hard:

| item | value if it slips 3 months | window |
|---|---|---|
| **Filing Season Toolkit** | **collapses** — 1099s arrive Jan–Feb; "Tax Wrapped" is a January artifact or it waits a full year; affiliate revenue peaks Feb–Apr | 🔒 **Jan–Apr, hard** |
| Android launch | unchanged — arguably *higher* in tax season, when gig workers actually search for tax apps | none |
| Mileage & Receipts (GPS) | unchanged | none |
| Platform Auto-Sync | unchanged | none |
| Native iPad · a11y · widget | unchanged | none |
| Demo mode · tour | unchanged | none |
| Money-Moves & Pro Tools | unchanged | none |

**Today is 2026-08-07 — about five months to January.** The Filing Season Toolkit currently sits at
**v1.6**, four versions out, behind a large v1.2, an Android launch that may carry a 14-day
closed-testing gate, a mileage version and an auto-sync version that needs a backend built.

**It will not land in its window on the current order.** A March ship catches maybe the tail of the
Apr 15 deadline and misses 1099 reconciliation's whole moment; Tax Wrapped misses by a full year.

This matters commercially, not just tidily: **filing season is when a tax app earns** — the traffic
spike, the conversion spike, and the affiliate revenue all land in the same quarter. Missing it costs
a year, and it is the one thing on this list that cannot be recovered by shipping later.

**Scheduling consequence:** sequence the date-locked item *to its date*, and fill the months around it
with the flexible ones. That is the whole review.

## 2. The premium-cadence finding (Jason's original objection, now settled)

v1.2 as planned was 100% free-tier work. Demo mode does serve premium — it shows non-subscribers
populated premium screens — but that is value aimed entirely at people who **haven't** paid. Someone
who subscribed in July and renews through v1.2 receives a tour, an iPad layout, and a free widget.

That inverts the stated model, where free is bounded and finishable and **premium carries growth**, and
it is a churn risk on the newest paying cohort.

**Settled (Jason 2026-08-07): "Both"** — v1.2 gains the shift/earnings optimizer **and** the
quarterly-payments slice:

- **Shift/earnings optimizer** *(premium headline)* — best time-of-day / day-of-week / platform
  patterns from the user's own history. Also delivers the **"reframe tax data as earning
  optimization"** repositioning that is separately owed. Soft-gate below ~30 entries; **demo mode can
  show it populated**, which is a real synergy with the same version.
- **Safe-harbor payment tracker** *(premium)* — payments made vs. required: *"$2,400 of the $3,600 you
  need to stay penalty-safe."* **Completes a feature v1.1 left half-built** — the calculator that
  produces the number shipped, and nothing tracks whether you paid it.
- **Per-quarter amount in reminders + on the dashboard** *(premium amount; the date stays free)* —
  today the notification says "due Sep 15" with no amount. ⚠️ Narrower than the backlog claimed:
  `perQuarter` is **already** shown on `SafeHarborScreen.tsx:221` and in the PDF, so this is a
  surfacing fix, not a new capability.
- **Expense-breakdown drill-down** *(premium, supporting)* — tap a Schedule C line → the entries behind it.

**Standing consequence:** every version from here carries a premium line. This gap happened because
nothing in the process required one.

## 3. The collision

The two findings pull against each other. §2 makes v1.2 **bigger** — a routing migration, four
free-tier UX items, and four premium items. §1 needs the months before December **freed up**.

The v1.2 bundle's original "one contiguous block" rationale (2026-06-30) has also partly expired:

- ~~*protects the FinancialFreedom protected launch*~~ — **gone**, Freedom shipped 2026-07-23.
- *amortizes the per-screen passes* — **still true and still good.** The tour, the iPad layout and the
  a11y audit each walk all 13 screens; separating them means walking them twice.
- *avoids context-switch tax* — **weak now.** These would be consecutive versions of the same app, not
  a switch to another project.

So one of the three original reasons is dead, one is weak, and one is genuinely load-bearing — and the
load-bearing one (amortization) argues for keeping **tour + iPad + a11y** together, not for keeping
*everything* together.

---

## 3b. ⚖️ DECIDED (Jason 2026-08-07): keep v1.2 intact, ship it in August

> *"It's August. I'm confident that we can have 1.2 out this month, so I'm voting to keep the version
> intact."*

**The split in §4 below was not adopted.** If v1.2 ships in August, the collision in §3 dissolves rather
than needing to be worked around — there is no need to buy months that are no longer scarce. §4 is kept
as the record of the alternative and as the fallback if the August date slips.

**What survives the decision, and is adopted:** §1's finding. Even with an August v1.2, the *current*
ladder still puts Filing Season at v1.6, behind Mileage **and** Platform Auto-Sync — and Auto-Sync
requires building the app's first backend. That cannot land by December. **Filing Season moves ahead of
both** (neither has a deadline; it does):

| version | contents | timing |
|---|---|---|
| **v1.2** | the bundle, intact, + the premium slice | **August 2026** |
| **v1.3** | Android launch + growth (voice · milestones · referral · push · Android widget) | Sep–Oct |
| **v1.4** | 🔒 **Filing Season Toolkit** — 1099 reconciliation · Tax Wrapped · affiliate | **submit ~Dec 15** |
| **v1.5** | Mileage & Receipts (GPS auto-mileage) | |
| **v1.6** | Platform Auto-Sync (first backend) | |
| **v1.7** | Money-Moves & Pro Tools | |

**Two things start NOW regardless of build order**, because both have external approval latency that
does not compress: the **Play Console prerequisites** (a personal account means a 14-day / 12-tester
gate) and the **tax-filing affiliate applications** (TurboTax / FreeTaxUSA / Cash App Taxes — weeks of
partner-side approval; if the application isn't in by ~November, the affiliate half of v1.4 misses its
window no matter when the code is ready).

**⚠️ The August date's real risk is not build time — it's the widget.** It is the only v1.2 item with an
external dependency chain (App Group → provisioning-profile regeneration → CI signing → a native target
that has broken iOS CI before). Backwards from Aug 31: submit ~Aug 24, feature-complete ~Aug 20 — about
**13 build days**. If the widget's prerequisites aren't started immediately, cut it to v1.3 and keep the
date rather than letting it take the version with it.

---

## 4. The alternative that was NOT adopted (kept for the record)

**Split v1.2 along the seam the amortization argument actually draws, and put Filing Season in December.**

| | version | contents | timing |
|---|---|---|---|
| **v1.2** | **Visible value + quarterly tools** | routing migration (`expo-router`) · demo mode · **premium: optimizer · safe-harbor payment tracker · per-quarter amounts · expense drill-down** · lint ledger · verify | ~Sep–Oct |
| **v1.3** | **Native surfaces** | guided onboarding tour · native iPad · a11y depth audit · iOS widget — **one device/native cycle covering all four**, and one walk of the 13 screens · premium line: multi-year PDF packet **or** the YoY trend chart | ~Nov |
| **v1.4** | 🔒 **Filing Season Toolkit** | 1099-NEC/1099-K reconciliation · "Tax Wrapped" (free) · tax-filing affiliate integration | **target December — hard** |
| **v1.5** | **Android + growth** | Android launch · voice logging · milestones/streaks · referral · push expansion · Android widget | Jan–Feb, **into** tax season |
| **v1.6** | Mileage & Receipts | GPS auto-mileage · receipt OCR/vault · IRS mileage-log export | |
| **v1.7** | Platform Auto-Sync | Argyle et al · first backend | |
| **v1.8** | Money-Moves & Pro Tools | | |

**Why the tour moves to v1.3 rather than staying with demo mode:** the tour walks every screen, exactly
as the iPad pass and the a11y audit do. Grouping the three means one pass over 13 screens instead of
two — which is the *only* surviving reason the bundle was contiguous in the first place. Demo mode
stays in v1.2 because the premium optimizer needs it (a populated view is how you demo a pattern
engine), and because it is the cheap half.

**Why Android moves to v1.5 rather than earlier:** it has no deadline, and launching a new platform
*during* tax season — with a filing-ready app, into the quarter when gig workers actually search for
tax tools — is better than launching it in October into an app that isn't filing-ready. Its Jason-side
prerequisites still start **now**, so the 14-day gate is never on the critical path.

**Risk accepted:** iPad slips ~6 weeks versus the current plan. It has no deadline, and v1.2 still
ships a premium headline to the cohort that's converting.

### The alternative, if the split is rejected

Keep v1.2 whole (routing + demo + tour + iPad + a11y + widget + 4 premium items) and accept that
**Filing Season lands late** — probably Feb–Mar, catching the Apr 15 tail, missing 1099 season's peak
and skipping Tax Wrapped for a year. That is a legitimate call if iPad-sooner is worth more than one
filing season; it should just be made deliberately rather than by drift.

---

## 5. Open

- **⏳ Conversion numbers.** Jason reports conversions have started — the first Gig data point. Needed:
  how many, and over what install base. This bears on how hard premium cadence should be defended, and
  it partially answers the audit's data-gated section.
- **⏳ [D3] the ASA read** — still outstanding.
