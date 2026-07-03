# Premium Pricing & Tier Strategy (v1.1)

Companion to [PHASE_B_EXECUTION_PLAN.md](PHASE_B_EXECUTION_PLAN.md) (the *how/what-order* of the premium build) and [PHASE_B_SETUP_CHECKLIST.md](PHASE_B_SETUP_CHECKLIST.md) (the App Store Connect / RevenueCat setup this doc feeds). The roadmap's monetization framing is [ROADMAP.md §"Premium tier"](ROADMAP.md).

**Purpose:** decide, before the App Store Connect subscription product is created, (1) what we charge, (2) whether the premium *goals/composition* should shift, and (3) how the still-pending Small Business Program changes the math. Written 2026-06-30.

**TL;DR recommendation:**
- **One tier** ("Premium"), two SKUs: **Annual $29.99 (hero)** + **Monthly $4.99 (anchor)**.
- **No free trial at launch**; add an intro offer later once PostHog funnel data exists.
- **Don't claw anything back from free** — the generous free tier is the moat. But **reframe** the v1.1 paid bundle as *filing-prep + tax-optimization*, lead the paywall with the PDF export and the W-4/safe-harbor optimizers, and treat v1.1 as a **soft monetization launch** — the real conversion inflection is v1.3 (GPS auto-mileage) and v1.4 (auto-sync), the automation features this market actually pays premium for.
- **Price so it works at 30%.** Your SBP application is pending; year-1 subscription revenue may be taxed at Apple's full 30% until approval lands. At near-zero COGS this is fine — SBP is upside, not a prerequisite.
- **Two tiers, ever (so far):** Premium now (v1.1), then a **Premium+/AI tier at v2.0** (~$14.99–19.99/mo, gated on validated inference cost). Full picture in §1.

---

## 1. The complete premium picture — tiers, timing, prices

This is the whole monetization plan as currently known, pulled from [ROADMAP.md](ROADMAP.md) and [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md). Everything past v1.1 is **planned, not committed** — prices and timing past the current release will move as funnel data and costs come in.

| Tier | Status | Launches | Price (current plan) | Marginal cost | What it is |
|---|---|---|---|---|---|
| **Premium** | ⬜ building (v1.1) | **v1.1** | **$29.99/yr + $4.99/mo** | ~$0 (no backend) | Filing-prep + tax-optimization + automation layer on top of the free engine |
| **Premium+ / AI** | ⬜ planned | **v2.0** | **$14.99–19.99/mo, or usage-based credits** | real (LLM inference) | AI deduction finder, conversational tax assistant, predictive finance, bank/Plaid sync |

> **Two tiers is the whole plan right now.** No third tier is on the roadmap. Both tiers will live in the **same App Store `Premium` subscription group**, which is what lets a user upgrade Premium → Premium+ (or downgrade) cleanly — but Premium+ is **not created until v2.0**. For v1.1 you create only the Premium products.

<details>
<summary>Full feature → version → tier → price timeline (everything we know).</summary>

**Free, never paywalled (the moat — same across all versions):** the full tax estimate, the "set aside" number, show-your-math audit trail, in-app tax literacy, what-if simulator, platform comparison, CSV export, reminders, the earnings share card, and the well-timed rating prompt. Later free additions: **Tax Wrapped** year-end recap (v1.5), and the growth features below. Per the [tier-gating principle](PHASE_B_EXECUTION_PLAN.md#L98) — trust/literacy features earn the conversion; they're never sold.

| Version | Timing | Premium ($29.99/yr) features added | Tier price action | Free / growth features (not paywalled) |
|---|---|---|---|---|
| **v1.1** | building now | PDF tax-ready export · Schedule C alignment · W-4 optimizer · safe-harbor/Form 2210 · IRS mileage-log fields · custom categories · year-over-year insights · multi-state *(design pass)* | **Launch Premium at $29.99/$4.99**, no trial | (Phase A, already shipped: show-your-math, tax literacy, what-if, platform comparison, share card, rating prompt) |
| **v1.2** | Android launch | shift/earnings optimizer (premium) | Play Billing via same RevenueCat — **same prices**, no second integration | widgets, voice/hands-free logging, milestone/streaks, referral program, push expansion |
| **v1.3** | Mileage & receipts automation | **GPS-assisted mileage** · receipt OCR · receipt/document vault · IRS mileage-log export | **Candidate price raise → ~$39.99/yr** (grandfather existing subs) — bundle now has real automation | — |
| **v1.4** | Platform auto-sync | **Argyle auto-sync** of earnings ("single best premium conversion driver") | Hold raised price; this is the strongest converter | (first real backend — compliance posture required) |
| **v1.5** | Filing season (ship by early Jan) | *1099-NEC/1099-K reconciliation* (filing-season; tier not yet explicitly tagged — treat as Premium) | seasonal intro-offer test window | **Tax Wrapped (free)**, tax-filing affiliate / CPA referral directory |
| **v1.6** | Money-Moves & Pro Tools | SE health-insurance + SEP-IRA/Solo-401k deductions · QBSE-compatible export · CPA shareable package · multi-vehicle | — (depends only on v1.1 infra; can run parallel to v1.3/v1.4) | — |
| **v2.0** | **AI tier launch** | — | **Create Premium+/AI tier ($14.99–19.99/mo), gated on validated inference economics** | natural-language entry, AI deduction finder *(in Premium+)* |
| **v2.1** | Conversational assistant | — | Premium+ | tax-optimization chat (RAG over own data), anomaly detection |
| **v2.2** | Predictive finance | — | Premium+ | predictive cash-flow, **Plaid bank sync** (legal/SOC-2 review first), pay-discrepancy detection |
| **v2.3** | Financial wellness | — | Premium+ (envelope buckets maybe teased to Premium) | envelope buckets, vehicle break-even, retirement-account nudges |

</details>

<details>
<summary>The pricing-evolution plan in one paragraph.</summary>

**Launch low, raise as the bundle gets heavier, never claw back from free.** v1.1 ships Premium at **$29.99/yr — deliberately under the market** because we give the estimate away and the v1.1 bundle is filing-prep/optimization, not the automation the market pays for (§2, §3). When **automation lands (GPS mileage v1.3, auto-sync v1.4)**, the bundle becomes "can't-live-without" and the price can step to **~$39.99/yr with existing subscribers grandfathered**. The **second tier (Premium+/AI) arrives at v2.0** at a higher price point (**$14.99–19.99/mo or usage-based credits**) because it carries real per-call inference cost — its price is **cost-driven with usage caps**, gated on validated economics, not a market-comparison like Premium. Throughout, the free tier stays intact as the growth/trust engine.

</details>

---

## 2. Where we sit in the market

<details>
<summary>Live competitor pricing (pulled 2026-06-30) and the one structural fact that should drive our price.</summary>

| App | Free tier | Paid price | What you pay *for* |
|---|---|---|---|
| **Stride** | Everything (no paid tier) | $0 — monetizes via insurance referrals | Manual-start GPS mileage, basic expense log, IRS-ready summary |
| **Everlance** | 30 auto-trips/mo | **$8/mo billed annually (~$96/yr)**; Plus $12/mo | Unlimited auto-mileage, PDF reports, work-hours |
| **Hurdlr** | Manual tracking + **real-time tax estimate** | **$9.99/mo or $99.99/yr** | *Automation*: auto-mileage/expense/income, real-time tax calc |
| **QuickBooks Solopreneur** | none (30-day trial) | **$20/mo (~$120/yr)** | Full bookkeeping, invoicing, mileage, Schedule C |
| **Keeper** | 7-day trial | **$99–$399/yr** | Expense tracking **+ actual tax filing** + tax-pro support |
| **FlyFin** | 7-day trial | undisclosed (AI tax engine) | AI deduction finder + CPA review |
| **— Us (v1.1) —** | **Full tax estimate + set-aside + show-your-math + what-if + comparison + CSV + reminders** | *TBD (this doc)* | PDF export, Schedule C alignment, W-4 optimizer, safe-harbor, mileage-log fields, custom categories, YoY |

**The structural fact that sets our ceiling:** every paid competitor gates either the *tax estimate itself* (Hurdlr), *automation* (Everlance, Hurdlr), or *filing* (Keeper, QBSE). **We give the estimate, the set-aside number, the audit trail, and the what-if simulator away for free.** That is a deliberate trust/growth moat — and it means we **cannot charge Hurdlr/QBSE prices** for the v1.1 bundle, because we're not selling the thing they sell. We're selling the *filing-prep and optimization layer on top of* a free engine that's already best-in-class.

So our annual price should sit **clearly below the $96–$120 "tracker+estimate" band** — positioned as "the affordable add-on that makes the free estimate filing-ready," not as a peer to full trackers. That's a feature, not a weakness: it's the cheapest way in the category to get audit-defensible, CPA-ready output.

</details>

---

## 3. Should the premium *goals* shift? (Yes — reframe, don't claw back)

<details>
<summary>The honest read: the v1.1 paid bundle is value-real but conversion-thin, because the market's proven premium converters (automation, filing) aren't in it yet.</summary>

The original roadmap premium vision ([ROADMAP.md:185](ROADMAP.md#L185)) was automation-led: *unlimited tracking, auto-import, GPS auto-mileage, receipt OCR*. But v1.1 gives **all tracking away free** and gates **filing-prep tooling**: PDF export, Schedule C alignment, W-4 optimizer, safe-harbor, mileage-log fields, custom categories, YoY ([IMPLEMENTATION_PLAN.md:265-279](IMPLEMENTATION_PLAN.md#L265)).

That's a coherent strategy, but be clear-eyed about it:

- **The market's strongest premium converters are automation and filing — v1.1 has neither.** Everlance and Hurdlr's entire paywall is *automation* (auto-mileage/auto-import). Keeper's is *filing*. Our automation lands in **v1.3 (GPS auto-mileage)** and **v1.4 (auto-sync)**; filing isn't planned. So v1.1 premium is a "saves me CPA hassle / helps me optimize" bundle — valuable, but **"nice to have," not "can't operate without."**
- **Within v1.1, the value is lopsided.** The genuine differentiators are the **W-4 withholding optimizer** and **safe-harbor/Form 2210 calculator** — *year-round*, and things **no competitor in this list does**. The **PDF export** is the seasonal anchor. The rest (custom categories, mileage-log fields, YoY) are organizational niceties that won't, by themselves, drive a subscribe.

**Recommended shifts (composition, not price):**

1. **Keep the free tier exactly as-is. No clawbacks.** The free estimate/set-aside/audit-trail is the growth engine and the trust that converts later. Pulling any of it to paid would betray the [tier-gating principle](PHASE_B_EXECUTION_PLAN.md#L98) and torch organic sharing. This is the one line we don't cross.
2. **Lead the paywall with the optimizers year-round, the PDF in season.** Jan–Apr: hero = "Export a tax-ready PDF for your CPA / TurboTax." May–Dec: hero = "Find out how to stop making quarterly payments" (W-4 optimizer) and "Avoid an underpayment penalty" (safe-harbor). These are the unique, year-round hooks that fight this product's natural filing-season seasonality.
3. **Treat v1.1 as a soft monetization launch — a learning + early-revenue release, not the ARPU play.** Its real job is to stand up the IAP spine, instrument the funnel (PostHog), and harvest early-adopter revenue + reviews. Don't over-invest in squeezing v1.1 conversion.
4. **Flag a possible roadmap shift: consider pulling GPS auto-mileage (v1.3) forward if launch funnel data shows weak conversion.** It's the single most proven converter in this category. Don't pre-commit — let the PostHog `paywall_viewed → purchase_completed` rate decide. This is the lever if v1.1 conversion disappoints.
5. **Hold custom categories + mileage-log fields as conversion-rescue levers.** If conversion is weak, these are the cheapest things to move to free as funnel hooks (they're niceties, not the core paid value). Launch them paid; revisit with data.

</details>

---

## 4. The recommendation: one tier, two SKUs

<details>
<summary>Annual $29.99 (hero) + Monthly $4.99 (anchor). One entitlement, one offering.</summary>

| | **Annual — the hero** | **Monthly — the anchor** |
|---|---|---|
| **Price** | **$29.99 / year** | **$4.99 / month** |
| **Effective** | $2.50/mo | $59.88/yr |
| **Role** | The default, visually emphasized choice (~50% cheaper than monthly) | Low-commitment entry; deliberately captures filing-season-only users for 1–2 months |
| **App Store product ID** | `com.gigtaxtracker.app.premium.annual` | `com.gigtaxtracker.app.premium.monthly` |

Both SKUs map to the **same** RevenueCat entitlement `premium` and the **same** offering `default`. The app only ever checks the entitlement, never the price or product ID — so these numbers can change later without a code change.

**Why $29.99 annual:**
- **Below the $96–$120 tracker band on purpose** (see §2) — we don't gate the estimate, so we're the "affordable filing-prep add-on," a no-brainer vs. a CPA visit or a $100 competitor.
- **Maximizes launch conversion + review velocity**, which matter far more than ARPU right now (App Store ranking, funnel learning).
- **Still anchored to real value:** the W-4 optimizer or a single avoided underpayment penalty is worth multiples of $29.99 — easy to justify in copy without looking expensive.
- **Leaves obvious headroom:** launch low, **grandfather early adopters**, raise to $39.99–$49.99 once v1.3/v1.4 automation makes the bundle "can't-live-without." Raising later with a heavier bundle is easy; cutting a too-high launch price signals weakness.

**Why $4.99 monthly:** it's a clean ~50% premium over the annual's effective rate (so annual looks like the deal), it's the accessible psychological floor, and seasonal churn here is a *feature* — a user who subscribes monthly in March, exports their PDF, and cancels in May still paid ~$10–15 and may renew next season.

**Alternative if early intent looks strong:** $39.99 annual / $5.99 monthly. Don't launch here — start at $29.99/$4.99, watch the PostHog funnel, and step up at the next release if conversion is healthy.

**Rejected options:**
- *$0.99–1.99/mo:* signals low value for genuinely high-value tax tooling; leaves money on the table; attracts low-intent churn.
- *$9.99/mo / $99/yr (Hurdlr parity):* we don't gate the estimate, so we can't credibly hold that price for a niceties-heavy v1.1 bundle. Revisit after automation lands.
- *A second (Premium+/AI) tier:* **not in v1.1.** The roadmap's $14.99–19.99 AI tier ([ROADMAP.md:200](ROADMAP.md#L200)) depends on features that don't exist. Don't create it in App Store Connect now — one tier only.

</details>

---

## 5. Free trial / intro offer

<details>
<summary>Launch with no trial; add a data-driven intro offer later.</summary>

**Recommendation: launch without a free trial.** Reasons specific to this product:
- The **free tier already is the trial** — it does all the trust-building (full estimate, audit trail, what-if). A separate trial is redundant trust-building.
- Tax-tooling value is **concentrated at filing time**; a 7-day trial invites "trial during filing week → export the PDF → cancel" extraction with little chance to demonstrate the *year-round* value.
- A clean, trial-free funnel is **easier to measure** at launch (`paywall_viewed → purchase_completed`), which is half the point of v1.1.

**Then, once PostHog has 4–8 weeks of funnel data, A/B test ONE of:**
- A **7-day free trial on the annual** (the category norm — Everlance/Keeper/FlyFin all do it). Lowest-risk way to lift conversion if the no-trial rate is weak.
- A **first-year intro price** (e.g., annual $19.99 first year, renews $29.99). Often out-converts a trial for annual plans and locks in a full year.

RevenueCat supports both as offering changes — **no app code change**, just dashboard config. So this is purely a post-launch optimization, not a launch dependency.

</details>

---

## 6. Apple economics with SBP *pending* (the part you flagged)

<details>
<summary>You've applied but aren't approved. Price so it works at 30% — SBP is upside, and it can't block launch.</summary>

**Status: Small Business Program applied 2026-06-30, not yet approved.** Apple reviews enrollment, and the reduced rate takes effect **15 days after the end of the fiscal month in which you're approved** — and it is **not retroactive**. So every day before approval, year-1 subscription revenue is taxed at the full **30%**.

**What the commission actually is, per SKU:**

| | At **30%** (pre-SBP, year 1) | At **15%** (SBP approved, *or* any subscriber's year 2+) |
|---|---|---|
| Annual $29.99 | you net **$20.99** | you net **$25.49** |
| Monthly $4.99 | you net **$3.49** | you net **$4.24** |

**Three things that make this a non-issue for launch:**
1. **Near-zero COGS.** The app has no backend; marginal cost per subscriber is ~nothing. Even at 30%, $20.99/year/subscriber is almost all margin. The price works at 30% — that's the test it passes.
2. **The "year-2 = 15%" rule is automatic, SBP or not.** Apple already drops any auto-renewing subscription to 15% after a subscriber's first 12 months. So **SBP's only real subscription benefit is first-year revenue.** Annual subs that renew get 15% in year 2 regardless of whether SBP ever approves.
3. **Timing affects margin, not viability.** Earlier SBP approval = more of your year-1 annual cohort captured at 15%. Since you've already applied, there's nothing to *do* but wait — just don't build the price around an approval that may not land before the v1.1 launch window. (It won't delay anything; it's a margin tailwind that arrives when it arrives.)

**Action:** none beyond what's done. Don't hold the launch for SBP. If approval lands mid-launch-window, the rate flips forward automatically — no code, no re-pricing.

</details>

---

## 7. Exact values to create in App Store Connect / RevenueCat

<details>
<summary>This finalizes the open items in PHASE_B_SETUP_CHECKLIST Task 3 & 4.</summary>

**App Store Connect — Subscriptions (Task 3):**
- **Subscription Group:** `Premium`
- **Auto-renewing subscription #1 (primary):**
  - Reference Name: `Premium Annual`
  - Product ID: `com.gigtaxtracker.app.premium.annual`
  - Duration: 1 year · Price: **$29.99**
- **Auto-renewing subscription #2:**
  - Reference Name: `Premium Monthly`
  - Product ID: `com.gigtaxtracker.app.premium.monthly`
  - Duration: 1 month · Price: **$4.99**
- **No introductory offer at launch** (add later per §5).
- Localized display name + description required on both, plus a review screenshot (mock the paywall — Claude will generate one once the Paywall screen is built).

**RevenueCat (Task 4):**
- **Entitlement:** `premium` (attach *both* products)
- **Offering:** `default`, with two packages — annual (mark as the featured/default package) and monthly — both pointing at the products above.

> Everything here is dashboard-only. The app references the `premium` entitlement and the `default` offering; prices, product IDs, and any future intro offer are all changeable in the dashboards with **zero code changes**.

</details>

---

## 8. Open decisions for you to confirm

<details>
<summary>Three yes/no calls before this is final.</summary>

1. **Annual + monthly, or annual-only?** Recommendation: **both** (monthly is a useful anchor and seasonal-capture SKU). Annual-only is simpler but loses the price-contrast that makes annual convert.
2. **Launch price $29.99 / $4.99, or the $39.99 / $5.99 alternative?** Recommendation: **$29.99 / $4.99** for launch (conversion + reviews first), raise later with a grandfather.
3. **No trial at launch (recommended), or a 7-day trial on annual?** Recommendation: **no trial**, test an intro offer post-launch with real funnel data.

Confirm these three and I'll mark [PHASE_B_SETUP_CHECKLIST.md](PHASE_B_SETUP_CHECKLIST.md) Task 3/4 as decided so the numbers above are the single source of truth when you build the products.

</details>
