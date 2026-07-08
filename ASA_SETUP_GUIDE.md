# Apple Search Ads — Gig (SetAsideTracker) setup guide

_Created 2026-07-07. Your first ASA campaign, funded by the **$100 promo credit**. Written assuming zero prior ASA experience — exact nav paths, exact values to paste, exactly what to watch._

---

## 0. The mindset (read this first)

**This $100 is a diagnostic, not a growth campaign.** The goal is NOT the ~30–60 downloads it buys — it's to answer one question: **can you profitably acquire a Gig user?** You get that answer from three numbers ASA + PostHog report:

- **CPT** (cost per tap) — what you pay per person who taps your ad → lands on your App Store page.
- **Install conversion** (tap → download) — ASA reports this directly. High-intent search usually converts 40–70%.
- **CPA** (cost per install) = CPT ÷ conversion. This is the headline number.
- Then in **PostHog**: install → `paywall_viewed` → `purchase_completed`. That's your revenue funnel.

**Go/no-go, roughly:** an annual Premium is $29.99 (Apple keeps ~15–30%, so ~$21–25 to you). If ~3% of installs buy in year one, that's ~$0.70 revenue/install before renewals. So a CPA under ~$1–2 is promising (renewals + word-of-mouth make it work); a CPA of $5+ means paid UA can't work at this price and you go organic. **The point is to learn which world you're in.**

---

## 1. Use Apple Search Ads **Advanced** (not Basic)

At the top of searchads.apple.com there are two products:
- **Basic** — Apple auto-manages everything, you just set a budget. Simple, but a black box — almost no data. ❌ Wrong for a diagnostic.
- **Advanced** — you pick keywords, bids, see per-keyword data. ✅ This is where you learn. The $100 promo applies here.

Go to **[searchads.apple.com](https://searchads.apple.com) → Advanced.**

**Apply the promo credit:** Account (top-right) → **Billing** → confirm the $100 credit shows as available. Note its **expiry date** — pace spend to use it before then (§5 assumes ~1–2 weeks).

---

## 2. Campaign structure (keep it simple)

Create **ONE campaign** with **TWO ad groups**. That's it — resist over-building.

```
Campaign: "Gig — US Search"
  ├─ Ad group A: "High-Intent Exact"   ← the workhorse (your money)
  └─ Ad group B: "Discovery / Search Match"  ← cheap keyword-mining
```

**Create campaign:** Campaigns → **Create Campaign** → pick app **SetAsideTracker** → Countries/Regions **United States only** (your app is US-only) → name it `Gig — US Search`.

- **Campaign daily budget:** `$12`  _(→ the $100 lasts ~8 days; long enough for a clean read, short enough to see results this week)_
- Leave "Search results" as the placement (default).

---

## 3. Ad group A — "High-Intent Exact" (the workhorse)

New ad group → name `High-Intent Exact`.
- **Default max CPT bid:** start at **$1.20**. _(Finance is competitive; too low = zero impressions. You'll tune it in week 1.)_
- **Search Match:** **OFF** for this ad group (you're supplying exact keywords).
- **Ad Scheduling / dayparting:** leave default (all day).

**Add these keywords, all as `Exact` match** (paste one per line; set match type = Exact):

```
1099 tax calculator
quarterly taxes
quarterly tax calculator
self employment tax
self employment tax calculator
estimated taxes
estimated tax calculator
1099 taxes
gig worker taxes
doordash taxes
uber taxes
instacart taxes
freelance taxes
set aside taxes
tax calculator self employed
```

_(Exact match = you only show for that precise search. Highest intent, least waste. If a keyword gets zero impressions after a few days, it's too low-volume or your bid's too low — raise the bid or drop it.)_

**Negative keywords** (add at the campaign level → Negative Keywords, as `Broad`): these stop you paying for wrong-intent searches.

```
loan
payday loan
jobs
job
free
turbotax
h&r block
refund
```

---

## 4. Ad group B — "Discovery / Search Match" (optional but recommended)

This lets Apple auto-match your app to searches you didn't think of — cheap keyword discovery. New ad group → name `Discovery`.
- **Default max CPT bid:** **$0.50** (low — this is exploratory).
- **Search Match:** **ON.**
- **No keywords** (Search Match supplies them).
- Add the **same negative keywords** as §3.

_After a week, look at the "Search Terms" report here — any term that converted, promote it into Ad group A as an exact keyword._

---

## 5. Budget pacing

- Campaign budget **$12/day** → ~8 days of the $100 promo.
- Split roughly: Ad group A does most of the work; Ad group B is a small explorer. ASA spends across ad groups automatically up to the campaign budget — you don't split manually, just keep B's bid low so it doesn't eat the budget.
- **Don't** raise the budget mid-test chasing volume. Let it run the full window for a clean read.

---

## 6. Creative (the ad itself)

ASA's **Default ad** automatically uses your **currently-live** App Store screenshots, title, AND **icon**. So **your live listing IS the ad**.

> ⚠️ **SEQUENCING — do this before spending the promo.** The App Store icon is baked into the **build** (unlike screenshots/text, which are editable in ASC without a build). The **new premium Gig icon is NOT live yet** — it needs a fresh build + submission. Running ASA on the old generic icon would understate conversion and risk a false "paid doesn't work" read on a one-shot budget. **Preferred order: ship the new icon → then run this test.** ONLY run on the old icon if the **promo expires** before you can get an icon build live (check ASA → Billing) — and if so, treat the resulting CPA as a *pessimistic floor* (the new icon only improves it).

- For v1: **use the Default ad** (nothing to configure).
- _Later (once you have a winning keyword): Custom Product Pages let you show tax-specific screenshots to tax searchers — a v2 optimization, not now._

---

## 7. What to watch (daily, 2 minutes)

Dashboard → your campaign. Watch these columns:
- **Impressions** — are you even showing? (If ~0 after 24h, your bid is too low → raise Ad group A to $1.50–2.00.)
- **Taps** + **TTR** (tap-through rate) — is the ad compelling? Low TTR = icon/first-screenshot problem.
- **Conversion Rate** (tap → install) — the key number. <30% = your listing isn't converting the traffic (screenshots/first impression).
- **Avg CPT** and **Avg CPA (Cost per Acquisition)** — your headline economics.
- **Per keyword:** which exact keywords actually convert. Kill the ones that spend with no installs; raise bids on the ones that convert.

Then in **PostHog** (your analytics): filter to the campaign window and watch `paywall_viewed` → `purchase_completed` to see if these installs move toward Premium.

---

## 8. The decision at the end (~day 8)

You'll have your answer:
- **CPA under ~$2 + installs reaching the paywall** → paid UA can work. Reload budget (real money), scale the winning keywords, and this becomes your growth engine. Replicate for Debt at v1.6 launch.
- **CPA $5+ or installs that never open the paywall** → paid UA can't carry these unit economics. Stop; the answer is organic + content + cross-promo, and you've saved yourself from burning real money finding that out.
- **In between** → tune (raise bids on converters, cut the rest, improve the first screenshot) and run a second small test.

Either way, you'll finally *know*, instead of guessing — which is the whole point of the $100.

---

## Cross-refs
`STORE_LISTING.md` (Gig ASO — the keywords here mirror its positioning) · `app-portfolio/GO_TO_MARKET.md` (paid-UA was trigger-gated on conversion proof — this test *generates* that proof) · Debt: run the twin of this at v1.6 launch (`debt-app-v1/docs/release-notes/V16_ASO_STRATEGY.md`).
