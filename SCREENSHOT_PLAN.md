# Screenshot plan — v1.1 submission (ASO-optimized)

**Updated 2026-06-30** in the ASO pass (companion to `STORE_LISTING.md`). Reordered to lead with the
strongest value shots, and expanded to include the **Premium screens** (PDF export, W-4 optimizer,
safe-harbor) that now exist as of v1.1 — the reason the ASO audit was sequenced *after* Phase B.

**Capture workflow (Jason, 2026-07-01):** shoot on the **real device** (the 1.1.0 TestFlight build) and
frame/caption in **AppScreens** — same pipeline that produced the polished v1.0 set. A real iPhone 16/17
Pro Max captures at the exact 6.9" resolution (1320 × 2868), shows real native chrome, and AppScreens
adds the device frame + gradient background + headline/subtitle overlay in one pass (so the "iOS
Simulator" + "Figma/Canva" notes below are superseded — the shot list, seed data, captions, and sizes
still apply verbatim). Do **not** shoot the web/browser dev build.

## Two ASO rules that shape every caption

1. **Lead with value, not chrome.** App Store screenshots show in upload order and the **first 1–2
   drive ~80% of the conversion** — so shot #1 is the set-aside number and #2 is the trust shot. Don't
   open with a settings screen.
2. **Caption text is OCR-indexed in 2026.** Apple reads the caption text baked into each screenshot as
   a discovery *reinforcement* signal, so the captions below deliberately carry priority phrases
   ("set aside," "quarterly & 1099 taxes," "gig / rideshare / delivery," "self-employment tax"). Keep
   titles readable in ~1 second; subtitles can run two short lines.

## iPad — iPhone-only for v1.1 (unchanged)

`app.json`'s `ios.supportsTablet` is `false`, so the binary doesn't declare iPad support and Apple
won't expect iPad screenshots. A genuinely native iPad layout is a dedicated **v1.2** block (see
`MASTER_PLAN.md`) — not a stretched phone UI. Skip all iPad sizes.

## Sample data setup (do this once, before capturing anything)

One consistent, realistic persona so every screenshot tells the same coherent story — not
placeholder/edge-case dev data. (Once v1.2 demo mode ships this becomes a one-tap seed; until then,
set it up by hand.)

- **Name/profile:** a real-sounding name (not "Test User").
- **Tax profile:** a state *with* income tax (e.g. NY or CA), so the breakdown card shows federal
  **and** state lines — a richer hero than SE+federal alone.
- **W2 job:** turn the "I also have a W2 job" toggle **on** with believable pay-stub numbers — this is
  what makes the **W-4 optimizer** shot (#7) valid, and it's a real differentiator.
- **Entries:** 6–8 across 3–4 platforms (Amazon Flex, DoorDash, Uber, Instacart), spread over the last
  couple of weeks, believable amounts ($40–$180), several with mileage + expenses, at least one with
  hours (so the effective-hourly-rate line appears). Add a **custom expense category** or two (e.g.
  "hot bags," "car wash") and **mileage-log purpose/route** on a couple of trips, so the PDF and
  expense-breakdown shots are populated.
- **Prior-year filed tax:** enter a last-year figure (via the safe-harbor screen) so the safe-harbor
  shot (#8) shows the prior-year leg binding — the headline "your income jumped, pay less" story.
- **Amount set aside so far:** land it in the **green "on track"** state, not red "behind" —
  reassurance sells better than a warning in a marketing shot.
- **Premium:** capture the Premium shots (#6–#8) with the entitlement **unlocked** so the real screens
  show, not the paywall. Leave dark mode off for the main set; one dark shot at the end (#9).

## Seed data — exact values to enter (addendum, 2026-07-01)

The concrete version of the persona above. One coherent story: **Maya Rodriguez**, a Los Angeles
full-time gig worker (rideshare + delivery) who *also* keeps a part-time W2 café job — which is what
makes the **W-4 optimizer** (#7) valid, and her gig income **jumped this year** vs. last, which is the
**safe-harbor** headline (#8). California gives a federal **+ state** breakdown with no county field to
fill. Enter it by hand once (until v1.2 demo mode makes it one tap). All names/emails are fictional.

### 1) Profile / onboarding
| Field | Value |
|---|---|
| Name | `Maya Rodriguez` |
| Email | `maya.rodriguez@example.com` |
| Filing status | **Single** |
| Dependents | `0` |
| State | **California** (no county needed) |

### 2) W2 job (turn the "I also have a W2 job" toggle ON — enter from a recent pay stub)
| Field | Value |
|---|---|
| Gross pay per paycheck | `1500` |
| Pay frequency | **Biweekly** |
| Pretax 401(k) per paycheck | `0` (leave blank) |
| Pretax benefits (health/HSA) per paycheck | `0` (leave blank) |
| YTD federal income tax withheld | `1700` |
| YTD state income tax withheld | `520` |
| W2 end date | *(leave empty — job runs through year-end)* |

### 3) Earnings entries — log these 9 via "Log Earnings" (dates in June 2026)
`Miles`, `Hours`, and the four expense buckets are per entry. **Mileage-log** + **Custom expense**
columns are the **Premium-authored** fields — enter them so the PDF (#6) and expense breakdown are rich.

| # | Date | Platform | Gross | Tips | Miles | Parking | Tolls | Supplies | Phone | Hours | Mileage-log (Premium) | Custom expense (Premium) |
|---|------|----------|-------|------|-------|---------|-------|----------|-------|-------|----------------------|--------------------------|
| 1 | Jun 2 | DoorDash | 88 | 24 | 46 | – | – | – | 2 | 5.0 | — | — |
| 2 | Jun 4 | Uber | 126 | 21 | 68 | – | 6 | – | 2 | 6.0 | — | — |
| 3 | Jun 6 | Amazon Flex | 144 | 0 | 61 | 5 | – | – | 2 | 4.5 | — | **Car wash** `12` |
| 4 | Jun 10 | Instacart | 92 | 34 | 31 | – | – | 8 | 2 | 3.5 | — | — |
| 5 | Jun 13 | DoorDash | 104 | 29 | 52 | – | – | – | 2 | 5.0 | Purpose: `DoorDash dinner rush — Downtown LA` · From: `Home — Echo Park` · To: `Downtown LA` | **Hot bags** `18` |
| 6 | Jun 17 | Uber | 138 | 19 | 72 | – | 6 | – | 3 | 6.5 | — | — |
| 7 | Jun 20 | Amazon Flex | 132 | 0 | 57 | 4 | – | – | 2 | 4.0 | — | — |
| 8 | Jun 24 | DoorDash | 96 | 27 | 48 | – | – | – | 2 | 4.5 | Purpose: `DoorDash weekend deliveries — Silver Lake / Los Feliz` · From: `Home — Echo Park` · To: `Silver Lake` | **Hot bags** `16` |
| 9 | Jun 27 | Instacart | 110 | 38 | 36 | – | – | 6 | 2 | 4.0 | — | — |

**Expected totals (sanity-check after entry):** total earnings logged **≈ $1,222** (gross $1,030 + tips
$192) · **471 business miles** (→ standard-mileage deduction auto-computed) · **43.0 hours** (so the
effective-hourly-rate line appears) · fixed expenses **$54** (parking 9 · tolls 12 · supplies 14 · phone
19) · custom expenses **$46** → Schedule C Line 27 (**Hot bags $34** across 2 entries — shows
aggregation — **Car wash $12**).

### 4) Prior-year filed tax — for the safe-harbor shot (#8)
On the **Safe-harbor** screen's "last year's filed federal tax" input, enter **2025 total federal tax =
`2150`** (leave AGI blank — she's not high-income, so the 100% test applies). Because her gig income
jumped this year, 90% of this year's bill is well above $2,150, so the **prior-year leg binds** — the
"if your income jumped, pay far less" story.

### 5) Amount set aside so far — for the green "on track" shot (#3)
Log all 9 entries first, then read the dashboard's **"Set aside for taxes"** target. In the **"Amount
set aside so far"** card, enter a figure **~10–15% above** that target so the status reads green **"on
track"** (reassurance sells better than a red warning in a marketing shot). E.g. if it shows ≈ $540 to
set aside, enter ≈ `620`.

### Data → which shot each piece powers
- **#1 hero / #2 show-your-math** — CA profile + all 9 entries + W2 drive the SE / federal / state breakdown.
- **#3 on-track** — the amount-set-aside vs. computed target (step 5).
- **#5 multi-platform** — the four platforms (DoorDash, Uber, Amazon Flex, Instacart) across the 9 entries.
- **#6 PDF** — mileage-log detail + custom expenses + prior-year tax → Schedule C + mileage appendix + safe-harbor section.
- **#7 W-4 optimizer** — needs the W2 toggle on (step 2).
- **#8 safe-harbor** — the $2,150 prior-year figure (step 4).

**Want a punchier hero number?** These 9 entries ≈ 3–4 weeks. To roughly double the "set aside" total,
log a second similar batch dated in May (or bump each `Gross` ~50%); keep the W2 + prior-year figures
as-is and the story stays coherent. **Optional YoY 10th shot:** add 3–4 entries dated in **2025** so the
app has two tax years (the Year-over-year screen unlocks at 2+ years) — not needed for the core 9.

## Screenshots to capture, in this order

Target 9 (Apple allows 10; leaves room for an app-preview poster frame or a 10th later).

---

**1. Dashboard hero — the set-aside number.**
The full "Set aside for taxes" gradient card with the SE/federal/state breakdown, plus "Total earnings
logged" and the effective-hourly-rate line. *The single most important screenshot — the entire core
value prop in one glance.*

> **Title:** Know exactly what to set aside
> **Subtitle:** Real-time self-employment, federal, and state tax estimates — updated every time you log a gig.

---

**2. Show your math (the trust shot).**
A tax-breakdown line expanded into its plain-English calculation (AGI → deductions → per-bracket tax,
SE split). This is the free-tier trust feature that converts — it proves the number is real, not a
guess.

> **Title:** See the math behind every number
> **Subtitle:** Tap any line for a plain-English breakdown of exactly how your tax was calculated. No black box.

---

**3. Quarterly due date + catch-up status.**
The "Amount set aside so far" card with the next due date and the green "you're on track" message.
Shows the app keeps you ahead of quarterly taxes, not just shows a scary number.

> **Title:** Stay ahead of quarterly taxes
> **Subtitle:** Your next estimated-tax due date, and exactly how much to save each week to hit it on time.

---

**4. Log Earnings screen.**
Platform chips (Amazon Flex / Spark / DoorDash / Uber / Instacart / Other) and the clean entry form.
Shows how fast logging a gig is.

> **Title:** Log a gig in seconds
> **Subtitle:** Pick your platform, enter your pay — rideshare or delivery. Your set-aside updates the moment you save.

---

**5. Dashboard "Recent entries," multi-platform.**
Scrolled to show several different platforms logged. Demonstrates real, active multi-platform use.

> **Title:** Every platform, one tax picture
> **Subtitle:** Log Amazon Flex, DoorDash, Uber, Instacart and more — one combined self-employment tax estimate.

---

**6. PREMIUM — Tax-ready PDF export.**
The generated tax-ready PDF (Schedule C breakdown + mileage log + safe-harbor summary), or the Settings
"Tax Summary (PDF)" entry with the document previewed. The seasonal anchor of the paid tier.

> **Title:** A tax-ready PDF for your CPA
> **Subtitle:** Export a Schedule C breakdown, IRS mileage log, and safe-harbor summary — Premium.

---

**7. PREMIUM — W-4 withholding optimizer.**
The W-4 result screen with the exact extra per-paycheck withholding. Requires the W2 toggle on (see
setup). A genuinely unique, year-round hook no competitor in this list has.

> **Title:** Skip quarterly payments
> **Subtitle:** Also have a W2 job? See the exact W-4 withholding so your paycheck covers your gig taxes — Premium.

---

**8. PREMIUM — Safe-harbor / underpayment calculator.**
The safe-harbor result showing the prior-year leg binding (the "your income jumped, pay far less than
your full bill" story). The other unique year-round hook.

> **Title:** Avoid the IRS underpayment penalty
> **Subtitle:** See the minimum to pay in to stay penalty-free. If your income jumped, it's often far less — Premium.

---

**9. Privacy + dark mode.**
Settings → Security (Face ID / Touch ID app lock) with dark mode on — one shot covering the privacy
trust signal and the dark-mode feature.

> **Title:** Private by design, day or night
> **Subtitle:** Your data stays on your device, encrypted, with optional Face ID lock. Light and dark mode built in.

---

**Optional 10th (data control):** Settings → Backup & Restore / Export Data — the CSV/backup control,
a real trust signal for a finance app ("your data, your terms — export a full CSV or backup in one
tap, no cloud account"). Add if you want to fill the 10th slot; otherwise the 9 above tell a complete
story.

## Required sizes

**Apple (App Store Connect)** — current published spec:
- **6.9" (iPhone 17 Pro Max / 16 Pro Max class): 1320 × 2868 px** — the primary required size; Apple
  auto-scales it down for smaller device classes.
- 6.7" (iPhone Plus class): 1290 × 2796 px — optional fallback in addition to the 6.9" set, since
  auto-scaling can look slightly off on UI pinned to screen edges.
- No alpha channel, RGB only, no device frame baked in (Apple adds its own chrome in some placements).
- No iPad sizes (iPhone-only per above).

**Google Play Console** (for the later Android launch — not v1.1):
- 2–8 phone screenshots; recommended **1080 × 1920 px** (9:16); aspect ratio 9:16–16:9.
- JPEG or 24-bit PNG **without alpha** (transparency = rejection).
- Plus a **feature graphic**: exactly 1024 × 500 px (icon + name + tagline on a brand-color
  background).

## How to capture

1. Run in Xcode's iOS Simulator on a device matching the target size (iPhone 17 Pro Max for 6.9").
2. Set up the sample data once (above), unlock Premium for #6–#8, then navigate to each screen in
   order.
3. Capture with the Simulator's own screenshot (Cmd+S / Device → Trigger Screenshot) — native
   resolution, no manual resizing.
4. Re-run the sequence on a 6.7"-class simulator for the fallback set, if doing both.
5. For the later Google Play set, resize/crop the same captures to 1080×1920.

## Marketing-text overlays (do these — they're the OCR-indexed captions)

The Title/Subtitle under each shot above are meant to be **composited onto the screenshot** as headline
text (the polished-listing look), not just upload notes — that's what Apple's 2026 OCR reads as a
keyword signal, and overlays meaningfully lift conversion. Build them in Figma/Canva or App Store
Connect's overlay tooling. This is a fast-follow once the raw captures exist, but it's now part of the
ASO deliverable (the keyword phrasing above is chosen for it), not purely optional polish.

## Naming convention

`{store}-{size-class}-{number}-{short-description}.png`, e.g.
`appstore-6.9in-01-dashboard-hero.png`, `appstore-6.9in-06-premium-pdf.png`,
`playstore-03-catchup-status.png`.
