# Store listing copy — SetAsideTracker (v1.1, ASO-optimized)

**Submission-ready.** Rewritten 2026-06-30 from a full ASO audit (keyword research + competitor
teardown of the live 2026 US iOS market — Everlance, Stride, Hurdlr, Gridwise, FlyFin, Keeper) and
the **final v1.1 feature set** (free core + the Premium tier). This supersedes the pre-keyword-research
v1.0 draft. Everything here is metadata-only — it can be updated in App Store Connect without a new
binary, and lands with the **v1.1 submission** (see `MASTER_PLAN.md` §9 / `GO_TO_MARKET.md` §3).

> **Positioning wedge (the one thing to hold onto):** the market splits into *mileage-first* trackers
> (Everlance/Stride/MileIQ — saturated on "mileage tracker") and *tax-filing* apps (FlyFin/Keeper —
> premium CPA services). **Nobody owns the "how much do I set aside from each gig" job.** Our brand
> already contains the stems `set aside` + `tracker`, and we give the estimate away free — so we lead
> on **set-aside / calculator**, not mileage, and not filing. Don't try to out-mileage Everlance.

---

## App name / Title (App Store field: 30 char max)

```
SetAsideTracker: Gig Taxes
```
**26 chars.** Highest-weight indexed field. Brand (`set`, `aside`, `tracker`) + the top-fit category
phrase (`gig`, `taxes`).

- On-device app name (`app.json` → `expo.name`) stays **`SetAsideTracker`** — the App Store display
  name and the home-screen name are allowed to differ; only the store Name gets the `: Gig Taxes`
  suffix.
- **Timing:** the App Store Name can't be edited while v1.0 is *in review*. This name change lands
  with the **v1.1 version submission** (which is exactly when this metadata goes in).

## Subtitle (App Store field: 30 char max)

```
Quarterly 1099 tax calculator
```
**29 chars.** Second-highest-weight indexed field. Adds the four highest-value stems the brand doesn't
already cover: `quarterly`, `1099`, `tax`, `calculator`.

**Play Store short description (80 char max):**
```
Know exactly what to set aside for taxes from every gig — 1099 & quarterly.
```
*(74 chars.)*

### Why this Title + Subtitle pairing

Between the brand, title, and subtitle, Apple indexes and auto-combines these stems:
`set · aside · tracker · gig · taxes · quarterly · 1099 · tax · calculator`.
Apple builds multi-word phrases from single indexed words automatically, so this pairing already
covers, with **zero keyword-field characters spent**: *gig taxes · gig tax calculator · quarterly
taxes · quarterly tax calculator · 1099 taxes · 1099 tax calculator · set aside taxes · tax tracker*.

---

## Keywords (App Store keyword field: 100 char max)

```
estimated,selfemployed,mileage,expense,deduction,rideshare,delivery,freelance,contractor,sidehustle
```
**99 chars.** Rules applied (verified against Apple's 2026 behavior):

- **No spaces after commas** — spaces waste characters and are unnecessary; commas alone separate.
- **No word already in the Title/Subtitle** — `tax`, `taxes`, `gig`, `1099`, `quarterly`,
  `calculator`, `set`, `aside`, `tracker` are all already indexed above; repeating them here is the
  single biggest rookie waste of the 100 chars.
- **No plurals, no manually-built phrases** — Apple auto-combines single words into phrases across all
  indexed fields, so `estimated` + `tax` (from subtitle) → "estimated tax," `rideshare` + `taxes` →
  "rideshare taxes," `selfemployed` + `calculator` → "self-employed calculator," etc.
- **No `app`, `finance`, `free`, `best`, `2026`** — filler / disallowed ranking words.
- **No trademarks** (see the AVOID list below).

**What this field reaches (via auto-combination with the title/subtitle):** estimated taxes ·
self-employed tax · mileage · expense tracker · tax deduction / write-offs · rideshare taxes ·
delivery driver taxes · freelance taxes · independent contractor taxes · side hustle taxes.

**Dropped for space (next in if you free up characters — e.g. by shortening the subtitle):**
`schedulec`, `safeharbor`, `w4`, `withhold`, `irs`. These are Premium-feature terms with lower search
volume than the audience-reach terms above — keep them for the description/captions instead.

### Keywords to AVOID (do not put these anywhere in metadata)

- **Trademarks / competitor & platform brand names** — `Uber`, `DoorDash`, `Lyft`, `Instacart`,
  `Amazon Flex`, `Spark`, `Grubhub`, `QuickBooks`, `Everlance`, `Stride`, `Keeper`, `FlyFin`. These
  risk an **App Review Guideline 2.3.7 metadata rejection**. Reach those searchers instead via (a)
  **Apple Search Ads** bidding on the brand terms, and (b) the *generic* concepts already in the
  keyword field — `rideshare`, `delivery`. (The platform names may appear in the **description** as
  plain prose describing who the app is for — "driving for Uber or DoorDash" — that's product
  description, not keyword stuffing; the 2.3.7 risk is in the indexed metadata fields.)
- **`mileage tracker` as a title/subtitle anchor** — hopelessly saturated (Everlance/Stride/MileIQ).
  We keep `mileage` as a keyword-field term only; we do not build our identity on it.

---

## Promotional text (App Store — 170 char max; NOT indexed for search, editable anytime without review)

```
Know exactly what to set aside for taxes from every gig — in real time. Premium adds a tax-ready PDF, IRS mileage log, W-4 optimizer, and safe-harbor calculator.
```
*(161 chars.)* Use this slot for the value hook and seasonal promos (e.g. swap in a tax-season message
Jan–Apr) — it updates without a new build. It is **not** search-indexed, so it carries no keywords —
pure conversion copy.

---

## Full description (App Store — 4,000 char max)

> iOS does **not** index the description for search (unlike Google Play), so this is written for
> **conversion and for humans** — plus a few natural intent phrases ("how much to set aside," "surprise
> tax bill") that feed Apple's 2026 semantic App Tags and read well to a nervous new gig worker. The
> **first 3 lines** are what shows above the fold on the product page — they carry the pitch.

```
Just started driving for Uber or DoorDash? Delivering for Amazon Flex, Spark, or Instacart? Nobody withholds taxes from your gig income — so SetAsideTracker tells you exactly how much to set aside from every dollar you earn. No more surprise tax bill, no spreadsheets, no guesswork.

HOW MUCH SHOULD I SAVE FOR TAXES?
That's the whole question, and most gig apps don't answer it. SetAsideTracker estimates your self-employment tax, federal income tax, and state (plus local, where it applies) income tax in real time as you log earnings — so you always know what's really yours to spend, and what to set aside for the IRS.

Also gig on the side of a W2 job? Enter your pay stub and SetAsideTracker subtracts what your employer already withholds — your set-aside number only covers what you actually owe on your gig income.

WHAT YOU GET FREE — the full calculator, never paywalled
• Log earnings from any platform and watch your "set aside for taxes" number update instantly
• A real self-employment + federal + state + local tax estimate, not a rough rule of thumb
• "Show your math" — tap any line to see exactly how it was calculated, in plain English
• A "what if I earned more?" simulator — see how one more shift changes your set-aside
• Compare your platforms — which app actually pays best per hour after expenses?
• Your true effective hourly rate, after taxes and expenses
• Quarterly estimated-tax due-date reminders, plus a catch-up calculator if you've fallen behind
• Track mileage and expenses (parking, tolls, supplies, phone) for accurate deductions
• All 50 states + DC, including local/county tax where it applies (MD, NY, PA)
• Every filing status: Single, Married Filing Jointly, Head of Household, Married Filing Separately
• Export your data to CSV or create a full backup file anytime
• Your data stays on your device — encrypted, with optional Face ID / Touch ID lock
• Light and dark mode

PREMIUM — make it filing-ready and stop overpaying
Upgrade when it's time to file or optimize:
• Tax-ready PDF export — a Schedule C breakdown, your IRS mileage log, and a safe-harbor payment summary in one document you can hand to a preparer or drop into TurboTax
• IRS-compliant mileage log — record each trip's business purpose and start/end location for an audit-ready record of your miles
• Custom expense categories — track write-offs beyond the basics (health insurance, car washes, hot bags), mapped to Schedule C "Other expenses"
• On-screen expense breakdown by Schedule C line, before you ever export
• W-4 withholding optimizer — also have a W2 job? See the exact extra withholding to put on a new W-4 so your paycheck covers your gig taxes and you can skip quarterly payments entirely
• Safe-harbor calculator (Form 2210) — the minimum to pay in to dodge the IRS underpayment penalty. If your income jumped, this is often far less than your full bill
• Year-over-year insights — once you've tracked two tax years, see whether your earnings, profit, miles, and taxes are trending up

Premium is $29.99/year or $4.99/month. The full tax estimate and set-aside number are always free.

WHO IT'S FOR
Anyone earning 1099 / gig / self-employed income — your only income or a side hustle next to a W2 job — who wants a clear, real-time answer to "how much should I actually be setting aside?"

SetAsideTracker provides estimates for planning purposes only — not tax advice. Always consult a tax professional or filing software when it's time to file.
```

*(~2,650 chars — comfortably under the 4,000 limit, with room to add seasonal copy.)*

---

## "What's New" (App Store release notes — 4,000 char max; NOT indexed)

For the **v1.1 update** (what changed since the v1.0 free launch). Mirror of `RELEASE_NOTES.md`:

```
The Premium tier is here — and the free tools got smarter.

FREE FOR EVERYONE
• See the math behind every number — tap any line in your tax breakdown for a plain-English explanation.
• New "What if I earned more?" simulator — see how an extra shift changes your set-aside.
• Compare your platforms — which app actually pays best per hour after expenses?
• Share a clean summary of your earnings.

NEW — PREMIUM
• Tax-ready PDF export — a Schedule C breakdown, mileage log, and safe-harbor summary in one document for your preparer or TurboTax.
• IRS-compliant mileage log — a business purpose and route per trip, for an audit-ready record.
• Custom expense categories, mapped to Schedule C "Other expenses."
• On-screen expense breakdown by Schedule C line.
• W-4 withholding optimizer — have a W2 job? Cover your gig taxes through your paycheck and skip quarterly payments.
• Safe-harbor / Form 2210 calculator — the minimum to pay in to avoid the IRS underpayment penalty.
• Year-over-year insights — track two tax years and see your trend.

Premium is $29.99/year or $4.99/month. The full tax estimate and set-aside number stay free, forever.
```

---

## Screenshots

The order and captions live in **`SCREENSHOT_PLAN.md`** (updated in this same ASO pass to lead with
the strongest value shots and to add the Premium screens that now exist). Two ASO-specific rules that
apply to the captions:

- **Lead with value, not chrome.** The first 1–2 screenshots drive ~80% of the conversion — hero the
  "set aside $X" number and the show-your-math trust shot.
- **Caption text is OCR-indexed in 2026.** Apple reads screenshot caption text as a discovery
  reinforcement signal, so the captions deliberately carry priority phrases ("Know exactly what to set
  aside," "quarterly & 1099 taxes," "gig / rideshare / delivery"). See `SCREENSHOT_PLAN.md`.
- **App preview video (optional, high-leverage):** a 15–20s screen capture of logging an entry → the
  set-aside number updating live. Queued as a fast-follow, not a submission blocker.

---

## App Store Connect — field-by-field checklist

| Field | Value | Notes |
|---|---|---|
| **Name** | `SetAsideTracker: Gig Taxes` | 26/30. Lands with the v1.1 submission (can't change while v1.0 is in review). |
| **Subtitle** | `Quarterly 1099 tax calculator` | 29/30. |
| **Keywords** | `estimated,selfemployed,mileage,expense,deduction,rideshare,delivery,freelance,contractor,sidehustle` | 99/100. No spaces. |
| **Promotional text** | see above | 161/170. Editable anytime without review. |
| **Description** | see above | ~2,650/4,000. |
| **What's New** | see above | v1.1 update notes. |
| **Primary category** | Finance | |
| **Secondary category** | Utilities | Optional; keep or drop. |
| **Screenshots** | per `SCREENSHOT_PLAN.md` | 6.9" (1320×2868) required; iPhone-only (no iPad). |
| **App preview** | optional fast-follow | 15–20s log→set-aside capture. |

## Support / contact / URLs

- Support URL: **https://jsnyde03.github.io/Set_Aside_Tracker/support.html**
- Support email: **[FILL IN — must match the email in support.html and privacy.html]**
- Marketing URL (optional): **[FILL IN, if any]**
- Privacy Policy URL: **https://jsnyde03.github.io/Set_Aside_Tracker/privacy.html**

## Pricing / IAP

- App: **Free** to download.
- In-app purchases (auto-renewing subscription, group `Premium`):
  - **Premium Annual** — `com.gigtaxtracker.app.premium.annual` — **$29.99/yr** (hero)
  - **Premium Monthly** — `com.gigtaxtracker.app.premium.monthly` — **$4.99/mo**
  - No introductory offer at launch (per `PREMIUM_PRICING_STRATEGY.md` §5).
- Each IAP needs its own localized display name + description + a paywall review screenshot in ASC.

## Age rating

No objectionable content; standard "Finance" questionnaire answers (no gambling, no shared
user-generated content, no unrestricted web access) — answer the live App Store Connect questionnaire
directly; this is just a heads-up on the expected result (should land at 4+).

---

## ASO follow-ups (not blocking submission)

1. **Confirm keyword difficulty in a paid tool** (Sensor Tower / AppTweak / Mobile Action) on the
   three terms the whole strategy rides on — `1099 taxes`, `quarterly taxes`, `gig taxes` — before
   locking the title. Public web sources don't expose hard volume/difficulty numbers; the placement
   above is reasoned from competitor targeting and intent, and is a strong default, but a one-time
   pull would de-risk the title choice.
2. **Post-launch, watch the App Store Connect ASO funnel** (impressions → product-page views →
   downloads). A weak page-view→download rate means fix the screenshots/copy, not the keywords —
   iterate the promotional text (free, no review) and the first two screenshots first.
3. **Apple Search Ads** on the competitor/platform brand terms we (correctly) can't put in metadata —
   this is the compliant way to capture "doordash taxes," "uber driver taxes," etc. Gated behind the
   paid-UA triggers in `GO_TO_MARKET.md` §6 (needs live conversion data first).
```
