# Gig Tax Tracker — Roadmap & Implementation Plan

## 1. Product Vision
A mobile-first app for gig workers (Amazon Flex, Spark, DoorDash, Uber, Instacart, etc.) that:
- Logs earnings and mileage/expenses per shift/platform with minimal friction
- Calculates real-time estimated tax liability (self-employment tax + income tax) so users know what to set aside
- Starts simple, but is architected to grow into a large, AI-assisted financial assistant for gig workers
- Has a free tier that is genuinely useful on its own, with premium tiers for power users and advanced/AI features

Target user: someone driving between deliveries, glancing at their phone for 5–10 seconds. Every core flow must work one-handed, with minimal typing.

---

## 2. Core Domain Logic (the part that must be correct)

### 2.1 Income tracking
- Per-entry: platform, date, gross pay, tips, bonuses, mileage (manual or GPS-assisted), other deductible expenses (phone, parking, tolls, supplies)
- Support manual entry AND CSV/email-parsing import for platforms that send weekly summaries (Phase 2+)
- Multi-platform aggregation — a single dashboard across all gig apps

### 2.2 Tax estimation engine
This is the differentiator, so it needs to be modeled as an isolated, well-tested module, not scattered logic:
- **Self-employment tax**: 15.3% on ~92.35% of net earnings (2024+ rates, must stay updateable)
- **Federal income tax**: bracket-based estimate using user's filing status + standard deduction, layered on top of SE income plus any other income they declare
- **State tax**: pluggable per-state module (many states have no income tax — design for that from day one)
- **Quarterly estimated tax due dates**: Apr 15 / Jun 15 / Sep 15 / Jan 15, with reminders
- **Mileage deduction**: standard IRS mileage rate (updateable per tax year) vs actual expense method — let user pick
- **"Set aside" recommendation**: a single number — "Put aside $X from this week's earnings" — this is the killer feature for the free tier

Design this as a **rules engine with versioned tax-year configs** (JSON/YAML per year), not hardcoded constants, since rates change annually and you'll want historical accuracy for past-year amendments.

- **Safe-harbor / underpayment-penalty awareness.** "What you owe" and "whether you'll be penalized for not paying it quarterly" are two different questions — the IRS's safe-harbor rule (pay the lesser of 90% of this year's tax or 110% of last year's) determines the latter. The engine should be able to answer both, not just the first; most consumer mileage-tracker apps never get this far, which makes it a real differentiator, not just an edge case.
- **Mileage substantiation, not just a mileage total.** The IRS expects a contemporaneous log (date, business purpose, locations) to back up the standard mileage deduction in an audit, not a single number. Worth modeling per-entry purpose/locations now so the deduction is actually defensible, and so future GPS-assisted mileage tracking (Phase 2) has somewhere to put the purpose it can't infer automatically.

> **Gap found in v1 audit (2026-06-24):** the versioned configs exist (`taxYear2025`/`taxYear2026`), but nothing in `apps/mobile` actually picks the config matching an entry's own date — every entry, regardless of when it was logged, gets aggregated together and run through whichever config `currentTaxYear` happens to point at. There's no per-entry or per-dashboard-view tax-year scoping at all. Tracked as the top-priority item in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)'s v1.0 section — this needs to land before launch, not as a follow-up, since it makes the headline "set aside" number wrong as soon as a user's data spans a year boundary.

### 2.3 Why correctness matters
Tax calculations are estimates, not filings — the app must be explicit that it provides *estimates for planning purposes*, not tax advice, and should recommend a CPA/tax software for actual filing. This needs to be in onboarding, ToS, and persistently visible near tax figures (small disclaimer), to manage liability.

---

## 3. Architecture (built for extensibility)

```
/apps
  /mobile        (React Native or Flutter — see decision below)
  /web           (dashboard, marketing site, premium account mgmt)
/services
  /api           (core REST/GraphQL backend)
  /tax-engine    (standalone library: pure functions, versioned tax configs, unit-testable)
  /ingestion     (CSV/email parsers per gig platform — plugin architecture)
  /notifications (push/email reminders for quarterly taxes)
/packages
  /shared-types  (TypeScript types shared across mobile/web/api)
  /ui-kit        (shared design system components)
```

Key extensibility decisions:
- **Tax engine as an isolated package** with no UI dependencies — lets you unit test against IRS examples and reuse it in future products (e.g. a web calculator as a lead magnet)
- **Platform ingestion as a plugin system** — each gig platform (Flex, Spark, DoorDash...) gets its own parser module implementing a common interface, so adding a new platform doesn't touch core code
- **Feature flagging from day one** (e.g. via a simple in-house flag service or a tool like Unleash) — needed for premium gating and gradual AI feature rollout
- **Event-driven internal architecture** (entries emit events like `EntryLogged`, `WeekClosed`) — this pays off later when you add AI features that react to data ("detect anomaly," "suggest deduction") without entangling them in core logging code

### Mobile framework decision
- **React Native** recommended if you want to move fast and eventually share code/logic with a web dashboard (tax engine, types). Flutter is great too but less natural for sharing TS code with a web app.
- Use **Expo** to minimize native-build overhead early on.

### Backend
- Node/TypeScript (NestJS or simple Express) to share types end-to-end with RN frontend, or
- If you want strong typing + future ML workloads, Python (FastAPI) backend is worth considering since most AI/ML tooling is Python-native — tradeoff is duplicating types between FE/BE.
- Recommendation: **start with TypeScript everywhere** for velocity; isolate any future AI/ML services as separate Python microservices behind the API (best of both).

### Data storage
- Postgres for transactional data (entries, users, subscriptions)
- Object storage (S3-compatible) for receipt photos / imported statements
- Keep PII and financial data encrypted at rest; this app touches sensitive financial info, so treat it like fintech from day one (see Security section)

---

## 3.5 Gig Platform API Integration (cutting down manual entry)

**Reality check first**: Amazon Flex, Spark, DoorDash, Uber, and Instacart do **not** offer public, driver-facing APIs for pulling your own earnings history. There's no "official" `GET /my-earnings` endpoint you can register an app for, the way Plaid works for bank accounts. Any integration plan needs to account for that constraint rather than assume it away. There are three realistic paths, roughly in order of how much you'd want to build yourself:

### Option A — Third-party gig-income aggregators (recommended starting point)
Companies already solve "connect your gig account, get structured earnings/trip data" for income-verification use cases (lenders, fintech apps, etc.), covering most major platforms including Uber, Lyft, DoorDash, Instacart, Amazon Flex, Spark, Grubhub:
- **Argyle** — broadest gig-platform coverage, purpose-built for exactly this (driver connects account via OAuth-like flow, you get normalized earnings/shift data via webhook/API)
- **Pinwheel** — similar model, historically more payroll-focused but has gig coverage
- **Atomic** — another player in this space, worth comparing pricing/coverage

Tradeoffs: per-user monthly fee (often $0.50–2/connected account), and you're dependent on their platform coverage/reliability rather than owning the integration. But this gets you "connect Amazon Flex and your earnings auto-populate" in weeks rather than building and maintaining fragile scrapers against five platforms that change their UI/auth without notice.

**Recommendation**: build Phase 2 platform auto-sync on top of one of these (start with Argyle given coverage), gated as a premium feature. This turns "API integration" into an integration job rather than a reverse-engineering job.

### Option B — Email/statement parsing (already in Phase 2, lower lift)
Most platforms send weekly earnings summary emails or in-app statements. A "forward your weekly Flex/Spark summary email to import@yourapp.com" flow, or an OAuth-scoped read of the user's Gmail/Outlook filtered to known sender addresses, gets structured data without per-platform credential handling. Lower fidelity (no real-time trip-level detail) but lower cost and no per-account fee — good complement to Option A or a fallback for platforms an aggregator doesn't cover.

### Option C — Direct integration / scraping (not recommended to start)
Building and maintaining your own authenticated scrapers or reverse-engineered private API clients per platform. This is fragile (breaks on any UI/auth change), carries real legal/ToS risk (most platforms' ToS prohibit unauthorized automated access to driver accounts), and turns into an ongoing maintenance burden per platform. Only worth considering later, for a platform an aggregator doesn't cover and at significant scale — and even then, get legal review first.

### Suggested sequencing
1. Ship Phase 1 with manual entry + CSV export (no platform integration yet)
2. Phase 2: layer in Argyle (or equivalent) for the platforms it covers — likely Uber, DoorDash, Instacart, Amazon Flex out of the gate — gated as premium ("auto-sync your earnings")
3. Use email-parsing (Option B) as the fallback for platforms an aggregator doesn't cover (Spark coverage varies by provider — verify before committing)
4. Avoid Option C unless a specific high-value platform has no other path and you've cleared it legally

---

## 4. Phased Implementation Plan

### Phase 0 — Foundation (2–3 weeks)
- Repo scaffolding per architecture above
- Auth (email + Apple/Google sign-in)
- Tax engine v1: SE tax + federal brackets + standard mileage deduction, unit tested against known IRS examples
- Basic manual entry flow (platform, amount, date, mileage)
- Single dashboard: total earnings, estimated tax owed, "set aside this week" number

### Phase 1 — MVP Launch (4–6 weeks)
- Multi-platform tracking (manually tagged entries per platform)
- Quarterly due-date reminders (push notification)
- State tax module for a handful of high-gig-worker states (CA, TX, FL, NY, etc.) — **shipped in v0.3 with 6 states (CA, FL, MD, NY, PA, TX)**; full 50-state + DC coverage is tracked as its own prioritized item in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)'s v1.0 section, since most U.S. users currently land on the "state not supported" warning.
- Expense tracking beyond mileage (phone %, supplies, parking)
- Basic export (CSV / PDF summary) — useful at filing time, drives trust
- Free tier ships here — see monetization section

### Phase 2 — Growth features (ongoing)
- CSV/email import parsers per platform (start with Amazon Flex + Spark since those are named priorities, then DoorDash/Uber/Instacart)
- GPS-assisted mileage tracking (auto-detect trips, user confirms)
- Receipt photo capture + OCR for expenses
- Multi-year history, year-over-year comparison
- Bank/Plaid integration for automatic income detection (high value, also high compliance overhead — plan for this carefully)

### Phase 3 — AI layer (the "large, complex" vision)
This is where the long-term differentiation lives. Don't bolt these on — design Phase 0–2 data models so these are additive:
- **AI deduction finder**: analyze transaction/expense patterns, suggest missed deductions ("you drove 40mi to a supply store, did you log this trip?")
- **Natural language entry**: "spent $40 on gas and made $180 on Flex today" → auto-parsed structured entry
- **Personalized tax optimization chat**: conversational assistant over the user's own data (RAG over their transaction history) — "how much should I set aside this month if I also drove for Uber?"
- **Anomaly detection**: flag weeks where earnings/mileage look off compared to historical pattern (catches logging mistakes, not just tax issues)
- **Predictive cash-flow**: "based on your pattern, you'll owe ~$X this quarter, here's how to adjust your weekly set-aside"
- **Document understanding**: snap a photo of a 1099 or platform statement, auto-extract and reconcile

Each of these is a separate microservice behind a feature flag, callable from the core app — this is exactly why the event-driven/plugin architecture in section 3 matters early.

---

## 5. Monetization Strategy

### Philosophy
Free tier must independently solve the core anxiety ("how much should I set aside, and will I get hit with a surprise tax bill") — that's the trust-builder and the viral/word-of-mouth driver in gig worker communities (Reddit, Facebook groups). Premium should be about **scale, automation, and intelligence**, not gating core safety.

### Free tier (genuinely useful)
- Unlimited manual income/mileage/expense entries
- Tax estimation engine (SE tax + federal, one state)
- Quarterly due-date reminders
- "Set aside this week" number
- CSV export
- Single platform tracking at a time (or limited to e.g. 2 platforms) — a soft nudge, not a core feature gate
- Dark mode
- Local backup/restore (export/import a data snapshot) — a client-side safety net against data loss, distinct from real account-based multi-device sync (premium-tier, later)
- "Show your math" audit-trail view on every tax figure — trust/safety feature, never paywalled per the tier-gating principle below
- In-app tax literacy content (glossary, "why this number" explainers) — most users are first-time self-employed
- "What-if" earnings simulator (no AI cost — just reruns the existing tax engine with hypothetical numbers)
- Year-end "Tax Wrapped" recap and light milestone celebrations/streaks — retention and organic-sharing drivers
- "Catch-up" calculator for users behind on saving — self-reported amount-set-aside vs. owed, with a concrete weekly top-up plan to close the gap by the next due date

### Premium tier ($/month, e.g. $4.99–9.99)
- Unlimited platform tracking + auto-tagging
- Multi-state support (useful for people who moved or work across state lines)
- CSV/email auto-import per platform (saves real time — easy premium justification)
- GPS auto mileage tracking
- Receipt OCR + organized expense vault
- PDF tax-ready summary reports (great for handing to a CPA or importing into TurboTax/FreeTaxUSA)
- Year-over-year insights
- W-4 withholding optimizer (for the W2+1099 combo — adjust W2 withholding to cover 1099 liability instead of quarterly payments)
- Safe-harbor / Form 2210 underpayment-penalty calculator
- QuickBooks Self-Employed-compatible export
- CPA/tax-pro shareable summary package (beyond a plain PDF — a dedicated "share with your preparer" flow)
- Custom/user-defined expense categories
- Multi-vehicle tracking

### Premium+/AI tier (higher price point, e.g. $14.99–19.99, or usage-based credits)
- AI deduction finder
- Conversational tax assistant
- Predictive cash-flow & anomaly detection
- Bank/Plaid auto-sync
- Priority support

### Other monetization levers (later)
- Affiliate/referral to tax filing software (TurboTax, FreeTaxUSA, Cash App Taxes) at filing season — gig workers using your app are a built-in qualified lead for this
- Optional CPA marketplace / "ask a tax pro" add-on (one-off paid consults)
- B2B angle: white-label or API for gig platforms themselves to embed earnings/tax tooling for their drivers

### Tier-gating principle
Gate on **automation/time-saved and scale**, not on **financial safety**. Never put the core "what should I set aside" number behind a paywall — that's the thing that builds the trust that sells everything else.

---

## 6. Compliance & Trust Considerations
- Add a clear, persistent "estimates only, not tax advice" disclaimer
- If you add bank/Plaid integration, you'll need to handle this with the same rigor as a fintech app (SOC 2 eventually, encryption at rest/in transit, data retention policy)
- Tax rate configs must be reviewed/updated annually (have a process, not just code — IRS brackets/mileage rates change every year)
- Consider an audit trail / "show your math" view for every tax estimate — builds trust and is good practice for a financial tool

---

## 7. Suggested First Sprint (concrete starting point)
1. Scaffold mobile app (Expo/React Native) + basic API
2. Build the tax-engine package standalone, with unit tests against 2-3 known IRS scenarios (single filer, various income levels)
3. Build manual entry screen + dashboard showing live "estimated tax owed" and "set aside this week"
4. Ship a bare-bones TestFlight/internal build to validate the core loop before adding any platform-specific import logic

---

## 8. Additional Gaps to Close

### 8.1 Tax accuracy gaps
- **No tax profile/onboarding flow.** Need filing status, dependents, whether the user also has a W2 job (very common combo — W2 withholding already covers part of their tax bill, so the "set aside" math is wrong without this), and home state vs. state(s) actually worked in. Add this as a first-run wizard feeding the tax engine, not an afterthought. *(Onboarding wizard itself shipped in v0.2 — see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) — but see the Head of Household gap immediately below, found during a v1 audit.)*
- **`FilingStatus` only supports `single`/`marriedFilingJointly`** (`services/tax-engine/src/types.ts`) — Head of Household and Married Filing Separately aren't modeled anywhere in the engine (brackets, standard deduction, Additional Medicare threshold are all keyed only on those two). Head of Household in particular is common among single-parent gig workers and uses meaningfully different brackets/standard deduction than Single — onboarding currently has no way to even select it, so those users get a silently wrong estimate rather than an "unsupported" warning (unlike the state-tax gap, which does warn). Worth fixing before/around v1 launch given how large that user segment likely is for this app.
- **Schedule C alignment.** Expense categories should map to actual Schedule C line items (vehicle, supplies, advertising, phone, etc.) so exports are usable at filing time, not just a generic CSV.
- **SE deductions beyond basic SE tax/mileage**: self-employed health insurance deduction, SEP-IRA/Solo 401k contributions. Real money for gig workers and a natural Premium+/AI-tier feature ("how much could you save in a Solo 401k").
- **1099 reconciliation.** At year-end, platforms issue 1099-NEC/1099-K. Let users check tracked totals against the actual 1099 — catches missed entries and is a strong trust-builder.

### 8.2 Security (filling the section 3 cross-reference)
- Biometric/PIN app lock given this holds financial data
- Encryption at rest and in transit, explicit data retention policy
- User-facing data export and account/data deletion (required under CCPA and similar state privacy laws) — the deletion half already has a working function (`clearAllLocalData()` in `apps/mobile/src/storage/repository.ts`), it's just not wired to any UI yet; tracked as part of the new Settings screen item in [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)'s v1.0 section
- Breach response plan before launch, not after
- SOC 2 roadmap once bank/Plaid-style integration ships (section 6 already flags this — tie it to a concrete timeline)

### 8.3 Operational/UX gaps
- **Offline support.** Core use case is logging earnings while driving with spotty connectivity — entry flow needs local-first storage with background sync, not a "needs internet" error.
- **Multi-device/account recovery.** Not yet addressed; needed before launch since this is a daily-use financial tool.
- **Battery impact of GPS mileage tracking** (Phase 2). Background location tracking is a common source of 1-star reviews if not tuned carefully (geofencing/significant-change location APIs over continuous polling).

### 8.4 Business/legal gaps
- **Payment infra & store cut.** In-app purchase takes 15–30%, which materially affects whether $4.99/mo premium pricing actually works. Decide explicitly between IAP and Stripe-based web checkout, and plan for dunning/failed-payment handling.
- **Tax engine validation process.** Beyond unit tests, have an actual review process (ideally a CPA) each tax year and before launch — this is a liability surface as much as a code-quality one.
- **AI tier cost model.** LLM API calls have real variable cost; Premium+/AI pricing needs to be checked against actual per-user inference cost, with usage caps or rate limiting so it doesn't erode margin.

---

## 9. Differentiating Features ("kickass app" ideas)

These go beyond core tax tracking — they're what would make the app stand out and drive organic growth in gig-worker communities, not just function as a mileage log.

### 9.1 High-leverage, differentiating
- **True hourly rate calculator.** Net earnings minus gas, real vehicle wear/depreciation, and tax set-aside, divided by actual hours worked. Most drivers overestimate what they're really making — this single number ("you're actually earning $11.40/hr after costs") is the kind of insight that gets shared in Reddit/Facebook gig-worker groups and drives organic growth. **Pulled forward into v1.0** (see [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)) — it's free-tier insight, not automation, and cheap to add now. **Currently blocked on a real data-model gap:** `Entry` has no field for hours worked at all (`apps/mobile/src/types.ts`) — there's no "true hourly rate" without that, so adding a simple manual `hoursWorked` field per entry is a prerequisite, not a detail.
- **Voice/hands-free logging.** Siri Shortcuts / Google Assistant integration — "log $45 from DoorDash" — solves the core friction (driving, can't type) better than UI polish alone.
- **Home-screen/lock-screen widget** showing today's earnings and current tax set-aside. Near-zero build cost, high daily visibility, strong retention driver.
- **Shift/earnings optimizer.** Using the user's own historical data (best time-of-day/day-of-week per platform), surface patterns like "you've historically earned more on Spark Tuesday mornings" — personalized, not dependent on surge data you don't have access to.
- **Promised-vs-actual pay discrepancy tracking.** Gig platforms shorting drivers on pay is a constant complaint; flagging when an actual deposit doesn't match what was logged/promised is both useful and trust-building.

### 9.2 Financial-wellness features (fits the long-term AI vision)
- **Envelope-style virtual buckets** (tax / savings / spending) so volatile gig income gets automatically smoothed, not just taxed.
- **Vehicle break-even analysis** — true cost per mile (maintenance, insurance bump, depreciation) vs. the standard mileage deduction, to help decide if a different vehicle or an EV actually pencils out. Pairs with **multi-vehicle tracking** (selecting which vehicle an entry used) so the break-even math works per-vehicle instead of assuming one car.
- **Retirement nudges with actual action**, not just a calculation — a SEP-IRA/Roth partnership integration so the insight converts into action, not just a number on a screen.
- **"Catch-up" calculator for users who fall behind on saving.** Most gig workers won't set aside money perfectly every week — this app's job is to help them recover, not just show a growing scary number. Let the user self-report what they've actually set aside so far (the app can't see a real bank balance, so a single running number is enough), diff it against the computed total owed, and if there's a gap, turn `getUpcomingQuarterlyDueDates()` into a concrete plan: "you're $X behind — set aside an extra $Y/week until [next due date]." Free tier — this is reassurance/trust, not automation, so it shouldn't be paywalled per the tier-gating principle in §5.
- **Money moves, not just insight:**
  - **W-4 withholding optimizer** — for the common W2+1099 combo, suggest adjusting W2 withholding to cover the 1099 tax liability instead of making quarterly payments at all. A genuinely non-obvious, high-value move most users don't know is available.
  - **CPA/tax-pro shareable summary package** — a dedicated "share with your preparer" export/secure-summary flow, beyond a plain PDF.
  - **QuickBooks Self-Employed-compatible export** — matches a format self-employed users likely already use, a concrete premium hook beyond generic CSV.

### 9.3 Polish that matters more than it sounds
- **Apple Watch companion** for glanceable earnings without touching the phone — also a real safety angle for someone driving.
- **Multi-language support.** A large share of gig drivers aren't native English speakers — genuinely underserved and a real differentiator, not just a checkbox.
- **Dark mode.** Cheap to add on top of the centralized design-token system already built for the mobile app's premium visual pass — not a rewrite, just alternate token values behind a scheme.

### 9.4 Trust & education (the thing that sells the free tier)
- **"Show your math" audit-trail view.** Tap any tax-breakdown line (SE tax, federal, state, local) to see the actual calculation, not just the result — builds the trust that the free tier is supposed to earn per the monetization philosophy in §5. Should never be paywalled.
- **In-app tax literacy content** — a lightweight glossary and "why this number" explainers for terms like "estimated tax," "SE tax," and "standard mileage rate." Most users are first-time self-employed and don't have this vocabulary yet.
- **Safe-harbor / underpayment-penalty explainer.** Surface the IRS's 110%-of-prior-year safe-harbor rule (see §2.2) directly in the UI, not just compute it silently — the explanation is as valuable as the number.

### 9.5 Growth & delight
- **Year-end "Tax Wrapped" recap** — a Spotify-Wrapped-style annual summary (total earned, miles driven, top platform, busiest month, tax saved via deductions). Near-zero build cost reusing existing data; strong organic-sharing potential in the same gig-worker communities already targeted for growth. Time it for the filing-season window.
- **Milestone celebrations / light gamification** — "you've logged $10k this year," logging streaks. Cheap retention lever.
- **Referral program** — a straightforward word-of-mouth growth lever not yet captured anywhere in the monetization plan.

### 9.6 Explicitly out of scope (avoid scope creep)
- Invoicing/freelancer bookkeeping for non-gig-driving side hustles — dilutes focus from the core driving-gig use case.
- Tax-refund-advance or earned-wage-access style products — edges into predatory-lending territory that undermines a trust-based app.
- Non-US tax jurisdictions / international gig platforms — the multi-language support above (§9.3) is about language, not international tax law; this app is U.S.-tax-specific by design.
- Pooled spousal/household tracking (two gig-working spouses sharing one set of entries) — a real scenario, but deferred rather than silently unaddressed; revisit once core single-filer/household tracking is solid.

---

## Open questions for you
- Mobile-first only, or do you also want a web dashboard from the start?
- Should Phase 1 launch with just federal + 1–2 states, or do you want broader state coverage before launch?
- Any existing branding/name in mind, or should that be part of Phase 0?
