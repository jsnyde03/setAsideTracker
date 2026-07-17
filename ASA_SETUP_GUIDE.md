# Apple Search Ads — Gig (SetAsideTracker) setup guide

_Created 2026-07-07. Revised **2026-07-17** after run 1 failed to serve — bids corrected, icon blocker cleared. Your first ASA campaign, funded by the **$100 promo credit**. Written assuming zero prior ASA experience — exact nav paths, exact values to paste, exactly what to watch._

---

## 0a. Run 1 post-mortem (2026-07-07 → ~07-16) — READ BEFORE RELAUNCHING

Run 1 **ended having spent $0.46 of the $100.** It did not produce a diagnostic; it produced one fact.

| Ad group | Bid | Impressions | Taps | Outcome |
|---|---|---|---|---|
| High-Intent Exact | $1.20 | **0** | 0 | **never won an auction** |
| Discovery | $0.50 | 39 | 1 ($0.46) | only group that served |
| Platform Audience | $0.60 | 0 | 0 | ⚠️ not authored in this guide — origin unknown |

**What it proves:** at **$1.20, exact-match got literally zero impressions.** The workhorse never ran; the 39 impressions all came from the throwaway explorer. The old escalation rule here ("0 impressions after 24h → raise to $1.50–2.00") was far too timid — corrected in §3.

**What it does NOT prove:** that the keywords are bad. Zero impressions has two possible causes and run 1 can't separate them:
1. **Bid too low** — outbid in every auction (most likely; finance CPTs run $3–6).
2. **Near-zero search volume** — plausible in **July**, which sits between the Q2 (Jun 15) and Q3 (Sep 15) estimated-tax deadlines. Gig-tax search is **seasonal**; this is the annual trough. _(Seasonality was missed in the original guide.)_

Raising the bid (§3) tests cause 1. If impressions stay at ~0 at **$4.00**, the answer is cause 2 — volume, not price — and that is itself a real finding worth having.

**Other run-1 corrections:**
- The campaign **had an end date and hit it** — everything went `On hold` and stopped serving. Relaunch with **no end date** (§2).
- **Budget was never the constraint.** $12/day vs $0.46 actually spent. Do not tune budget to fix this; tune bids.
- **The real risk is UNDER-spending, not over-spending.** A promo credit you fail to spend is worth $0. Bid aggressively — overbidding on Apple's money is nearly free.

---

## 0. The mindset (read this first)

**This $100 is a diagnostic, not a growth campaign.** The goal is NOT the downloads it buys — at a realistic **$4 CPT that's only ~25 taps ≈ 10–15 installs**, so don't expect a volume event (the original "~30–60 downloads" estimate assumed the $1.20 bid that run 1 disproved). It's to answer one question: **can you profitably acquire a Gig user?** You get that answer from three numbers ASA + PostHog report:

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

**Promo credit status (verified 2026-07-17):** Account (top-right) → **Billing** shows a **Promo Credit** panel reading _"Promo credit applied on Jul 7, 2026."_ The credit **is attached and applying** — run 1's $0.46 came out of it, not your card.

⚠️ **No expiry date is displayed anywhere in the dashboard.** Standard Apple promo terms are ~30 days from application, which would put expiry around **~Aug 6, 2026** — but that is an *inference*, not confirmed. Two actions:
- **Plan against Aug 6.** It's the only date you have, and being wrong in the conservative direction costs nothing.
- **Confirm the real date** — reply to the original promo offer email (it states the terms), or ASA dashboard → **Help → Contact Us** with your org ID. Non-blocking: relaunch regardless. An unknown clock argues for spending *sooner*, never for waiting.

---

## 2. Campaign structure (keep it simple)

Create **ONE campaign** with **TWO ad groups**. That's it — resist over-building.

```
Campaign: "Gig — US Search"
  ├─ Ad group A: "High-Intent Exact"   ← the workhorse (your money)
  └─ Ad group B: "Discovery / Search Match"  ← cheap keyword-mining
```

**Create campaign:** Campaigns → **Create Campaign** → pick app **SetAsideTracker** → Countries/Regions **United States only** (your app is US-only) → name it `Gig — US Search v2`.

- **Campaign daily budget:** `$15`  _(the $100 arithmetic over ~20 days is $5/day, but budget well above it — you almost certainly won't hit the cap at this volume, and headroom is free when the ceiling is a credit you otherwise lose. Run 1 spent $0.46 against a $12/day budget.)_
- **Start date:** today. **End date: LEAVE BLANK / NO END DATE.** ⚠️ Run 1 died here — it hit its end date, flipped every ad group to `On hold`, and stopped serving. A campaign with no end date runs until the budget or the credit is gone.
- Leave "Search results" as the placement (default).

> ⚠️ **Run 1 had a third ad group, `Platform Audience` ($0.60 bid, 0 impressions), that this guide never authored.** Do not recreate it. If you're relaunching by editing the old campaign rather than building fresh, **delete it** — it's unattributed spend surface with no thesis behind it. Building a fresh campaign (recommended) avoids the question entirely.

---

## 3. Ad group A — "High-Intent Exact" (the workhorse)

New ad group → name `High-Intent Exact`.
- **Default max CPT bid:** **$4.00.** _(Revised up from $1.20 — run 1 proved $1.20 wins **zero** auctions in this category. US finance CPTs run $3–6. You are spending Apple's credit against an unknown expiry: the cost of overbidding is a few cents per tap; the cost of underbidding is the entire $100 expiring unused. Bid to win.)_
- **Search Match:** **OFF** for this ad group (you're supplying exact keywords).
- **Ad Scheduling / dayparting:** leave default (all day).

**Escalation rule (revised):** check at **24h**. Still ~0 impressions at $4.00? Raise to **$6.00** and check again at 48h. Still zero → the cause is **search volume, not bid** (see §0a — July is the gig-tax trough), and no bid fixes that. At that point pivot to Ad group B's Search Match data and spend the credit on whatever terms actually carry volume.

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
- **Default max CPT bid:** **$1.50** _(revised up from $0.50. At $0.50 it was the ONLY group that served in run 1 — 39 impressions, 1 tap — which means the $0.50 tier is buying bottom-of-barrel long-tail inventory, not real intent. $1.50 keeps it exploratory and well below A's $4.00 so it can't eat the budget, while reaching inventory that's actually worth something.)_
- **Search Match:** **ON.**
- **No keywords** (Search Match supplies them).
- Add the **same negative keywords** as §3.

_Why keep B at all on a $100 budget, when concentration usually wins? Because run 1 established that the §3 exact list is an **unvalidated hypothesis** — it has never once served. B is the hedge: if the exact keywords turn out to be zero-volume, B's Search Terms report is the only thing that will tell you what gig-tax searchers actually type. Keep it small; it's insurance, not a second test._

_After a week, look at the "Search Terms" report here — any term that converted, promote it into Ad group A as an exact keyword._

---

## 5. Budget pacing

- Campaign budget **$15/day** against a credit assumed to expire **~Aug 6** (~20 days from relaunch). That's a deliberately loose cap, not a spend target — see §2.
- Split roughly: Ad group A does most of the work; Ad group B is a small explorer. ASA spends across ad groups automatically up to the campaign budget — you don't split manually, just keep B's bid ($1.50) well under A's ($4.00) so it doesn't eat the budget.
- **Don't** raise the budget mid-test chasing volume — budget is not the lever. Run 1 proved that: $12/day available, $0.46 spent. **Bids are the lever.**
- **Watch for the opposite failure from run 1: under-spend.** If you're a week in and have burned <$25, the credit will expire with most of it unused. That is the worst outcome available — worse than a bad CPA, which at least teaches you something. Respond by raising A's bid, not the budget.

---

## 6. Creative (the ad itself)

ASA's **Default ad** automatically uses your **currently-live** App Store screenshots, title, AND **icon**. So **your live listing IS the ad**.

> ✅ **SEQUENCING BLOCKER CLEARED (2026-07-17).** This section previously blocked the campaign on shipping the premium icon, since the icon is baked into the build and ASA serves your live listing as the ad. **v1.1.1 (premium gold-shield icon) is approved and live**, so the ad now renders the intended creative. No reason left to wait — relaunch.

- For v1: **use the Default ad** (nothing to configure).
- _Later (once you have a winning keyword): Custom Product Pages let you show tax-specific screenshots to tax searchers — a v2 optimization, not now._

---

## 7. What to watch (daily, 2 minutes)

Dashboard → your campaign. Watch these columns:
- **Impressions** — are you even showing? **This is the whole ballgame at first; run 1 never got past it.** If ~0 after 24h → raise Ad group A to **$6.00** (see §3's revised escalation rule). Do not spend days staring at a campaign that isn't serving.
- **Spend vs. pace** — are you on track to actually use the credit before ~Aug 6? Under-spend is the live risk (§5).
- **Taps** + **TTR** (tap-through rate) — is the ad compelling? Low TTR = icon/first-screenshot problem.
- **Conversion Rate** (tap → install) — the key number. <30% = your listing isn't converting the traffic (screenshots/first impression).
- **Avg CPT** and **Avg CPA (Cost per Acquisition)** — your headline economics.
- **Per keyword:** which exact keywords actually convert. Kill the ones that spend with no installs; raise bids on the ones that convert.

Then in **PostHog** (your analytics): filter to the campaign window and watch `paywall_viewed` → `purchase_completed` to see if these installs move toward Premium.

---

## 8. The decision at the end (credit exhausted, or ~Aug 6)

You'll have your answer:
- **CPA under ~$2 + installs reaching the paywall** → paid UA can work. Reload budget (real money), scale the winning keywords, and this becomes your growth engine.
- **CPA $5+ or installs that never open the paywall** → paid UA can't carry these unit economics. Stop; the answer is organic + content + cross-promo, and you've saved yourself from burning real money finding that out.
- **In between** → tune (raise bids on converters, cut the rest, improve the first screenshot) and run a second small test.
- **Still ~0 impressions even at $6** → the finding is **demand, not economics**: nobody is searching these terms right now. Re-run the test in **late August (pre-Sep 15)** or **January–April (tax season)**, when gig-tax search actually peaks. See §0a.

⚠️ **Two caveats on however this reads:**
1. **~10–15 installs cannot measure a 3% purchase rate.** Expect **zero** purchases even in the good world — that's arithmetic, not failure. Judge this test on **CPT, tap→install conversion, and whether installs reach `paywall_viewed`**. Treat any CPA/purchase read as directional at best. Do not kill paid UA on a zero-purchase result at this sample size.
2. **July is the seasonal trough** for gig-tax search. A weak read here is partly a July read, not a verdict on the channel. Anything discouraging should be re-tested in tax season before it becomes a permanent conclusion.

**Note the scope change vs. the original guide:** replicating this for Debt is **removed** as an automatic follow-on. Debt sells only **$4.99/month** (annual $39.99 isn't live until v1.10), so its LTV needs a **~$0.50 CPA** to clear the LTV ≥ 3× CAC bar in `GO_TO_MARKET.md` — unreachable in the "debt payoff" auction. **Debt cannot pass a paid-UA test until annual pricing ships**, regardless of what Gig's numbers say.

Either way, you'll finally *know*, instead of guessing — which is the whole point of the $100.

---

## Cross-refs
`STORE_LISTING.md` (Gig ASO — the keywords here mirror its positioning) · `app-portfolio/GO_TO_MARKET.md` (paid-UA was trigger-gated on conversion proof — this test *generates* that proof) · Debt: the "run the twin at v1.6 launch" plan is **withdrawn** — blocked on Debt annual pricing (v1.10), see §8.
