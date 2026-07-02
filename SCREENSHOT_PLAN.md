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

## Seed data — exact values to enter (addendum, revised 2026-07-01)

One coherent story: **Maya Rodriguez**, a Los Angeles full-time gig worker (rideshare + delivery) who
*also* keeps a small part-time W2 café job **that under-withholds** — which is exactly why she needs
both the **W-4 optimizer** (#7) and **safe-harbor** (#8) tools, and why her gig tax shows up as a real
set-aside. California gives a federal **+ state** breakdown. All names/emails are fictional.

> **⚡ Fastest path — import, don't type.** A ready-made backup file
> `store-assets/reference-screenshots/maya-persona-backup.json` contains this whole persona (profile +
> 20 entries + tax profile, dark mode). On the device: **Settings → Backup & Restore → Restore from
> Backup → choose that file.** It replaces local data with the seeded persona in one step — no manual
> entry. (Get the file onto the device via AirDrop / Files / iCloud Drive.) The tables below are the
> manual fallback + the sanity-check reference. **Premium** isn't in the backup (it's tied to your
> Apple ID) — make sure your sandbox/test account has the Premium entitlement active so #6–#8 show the
> real screens. These reference shots were captured in **dark mode** (your preference).

### 1) Profile / onboarding
| Field | Value |
|---|---|
| Name | `Maya Rodriguez` |
| Email | `maya.rodriguez@example.com` |
| Filing status | **Single** · Dependents `0` |
| State | **California** (no county needed) |
| Appearance | **Dark** |

### 2) W2 job (turn the "I also have a W2 job" toggle ON)
A genuinely small, **under-withheld** part-time job — this is what leaves an uncovered gig-tax gap and
a real safe-harbor requirement (a large/over-withheld W2 zeroes the set-aside and hides #7/#8).
| Field | Value |
|---|---|
| Gross pay per paycheck | `900` |
| Pay frequency | **Biweekly** |
| Pretax 401(k) / benefits per paycheck | `0` (leave blank) |
| YTD federal income tax withheld | `250` |
| YTD state income tax withheld | `60` |
| W2 end date | *(leave empty)* |

### 3) Earnings entries — 20 full-day totals, late May–June 2026
`Miles`, `Hours`, and the four expense buckets are per entry. **Mileage-log** + **Custom expense** are
the **Premium-authored** fields (enter them so the PDF #6 and expense breakdown are rich).

| # | Date | Platform | Gross | Tips | Miles | Park | Toll | Supp | Phone | Hours | Premium extras |
|---|------|----------|-------|------|-------|------|------|------|-------|-------|----------------|
| 1 | May 6 | DoorDash | 244 | 52 | 80 | – | – | – | 3 | 6.5 | — |
| 2 | May 8 | Uber | 296 | 43 | 98 | – | 6 | – | 3 | 8.0 | — |
| 3 | May 11 | Instacart | 208 | 66 | 56 | – | – | 8 | 2 | 5.5 | — |
| 4 | May 15 | Amazon Flex | 288 | 0 | 84 | 5 | – | – | 3 | 6.5 | — |
| 5 | May 18 | DoorDash | 262 | 57 | 85 | – | – | – | 3 | 7.0 | **Hot bags** `17` |
| 6 | May 20 | Uber | 288 | 42 | 96 | – | 6 | – | 3 | 8.0 | — |
| 7 | May 22 | DoorDash | 224 | 58 | 74 | – | – | – | 3 | 6.5 | Mileage-log: `DoorDash dinner rush — Downtown LA` / `Home — Echo Park` → `Downtown LA`; **Hot bags** `18` |
| 8 | May 24 | Amazon Flex | 312 | 0 | 90 | 6 | – | – | 3 | 7.0 | **Car wash** `14` |
| 9 | May 27 | Instacart | 196 | 68 | 54 | – | – | 10 | 2 | 5.5 | — |
| 10 | May 29 | DoorDash | 252 | 51 | 82 | – | – | – | 3 | 7.0 | — |
| 11 | May 31 | Uber | 338 | 39 | 110 | – | 6 | – | 3 | 8.5 | — |
| 12 | Jun 3 | DoorDash | 214 | 55 | 70 | – | – | – | 2 | 6.0 | **Hot bags** `16` |
| 13 | Jun 5 | Amazon Flex | 296 | 0 | 86 | 5 | – | – | 3 | 6.5 | — |
| 14 | Jun 7 | Instacart | 222 | 74 | 60 | – | – | 8 | 2 | 5.5 | — |
| 15 | Jun 10 | Uber | 324 | 44 | 104 | – | 6 | – | 3 | 8.0 | — |
| 16 | Jun 13 | DoorDash | 268 | 59 | 86 | – | – | – | 3 | 7.0 | Mileage-log: `DoorDash weekend deliveries — Silver Lake / Los Feliz` / `Home — Echo Park` → `Silver Lake` |
| 17 | Jun 17 | Amazon Flex | 305 | 0 | 92 | 6 | – | – | 3 | 7.0 | — |
| 18 | Jun 20 | Instacart | 198 | 57 | 51 | – | – | 6 | 2 | 5.0 | — |
| 19 | Jun 24 | DoorDash | 279 | 48 | 90 | – | – | – | 3 | 7.5 | **Hot bags** `20` |
| 20 | Jun 27 | Uber | 345 | 41 | 114 | – | 6 | – | 3 | 9.0 | — |

**Expected totals (sanity-check):** total earnings **≈ $6,213** · set-aside **≈ $1,384** (~28.9% of net)
· effective rate **≈ $33/hr** · **1,662 business miles** · **~137 hours** · deductible expenses
**≈ $1,429** (Line 9 car/truck incl. mileage, Line 22/25 buckets, Line 27 **Hot bags $71 + Car wash $14**).

### 4) Prior-year filed tax — for the safe-harbor shot (#8)
On the **Safe-harbor** screen, enter **2025 total federal tax = `1200`** (leave AGI blank). This year's
federal tax jumped well above that, so the **prior-year leg ($1,200) binds** below 90%-of-this-year
(~$1,666) — the "your income jumped, pay far less" story, with a real per-quarter estimated payment.

### 5) Amount set aside so far — for the green "on track" shot (#3)
In the **"Amount set aside so far"** card enter **`1400`** (just above the ~$1,384 target) so the status
reads green **"on track."**

### Data → which shot each piece powers
- **#1 hero / #2 show-your-math** — CA profile + all 20 entries + W2 drive the SE / federal / state breakdown.
- **#3 on-track** — DROPPED (the on-track card is already inside the hero #1 on a 6.9" screen); the amount-set-aside step (step 5) still matters for how #1 reads.
- **#5 multi-platform** — the four platforms across 20 entries (scroll to the entry list).
- **#6 PDF** — Settings → Data → **Tax Summary (PDF)**; the real PDF is device-only (the reference proxies it with the on-screen expense breakdown). Mileage-log + custom expenses + prior-year feed the Schedule C / mileage / safe-harbor sections.
- **#7 W-4 optimizer** — needs the W2 toggle on (step 2) + the under-withholding.
- **#8 safe-harbor** — the `1200` prior-year figure (step 4).

_Reference captures live in `store-assets/reference-screenshots/` (01–09 + three bonus screens:
expense-breakdown, platform-comparison, what-if). They are the visual target for the on-device capture,
not final assets — reshoot on the real device per the capture workflow above._

## Screenshots to capture, in this order

**Final set = 7 shots (Jason, 2026-07-01): #1, #2, #4, #5, #6, #7, #8.** Dropped **#3** (near-duplicate
of the hero on a 6.9" screen) and **#9 + the optional 10th** (privacy/dark + data-export — the weakest
converters; 7 high-signal shots is plenty). The three lead slots go to **#1, #2, #4**. Numbers below
keep their original IDs for continuity (upload order: 1, 2, 4, 5, 6, 7, 8).

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

**3. ~~Quarterly due date + catch-up status.~~ DROPPED (2026-07-01).**
The "Amount set aside so far" card + due date + green "on track" message is already visible inside the
hero (#1) on a 6.9" screen, so this was a near-duplicate. Not submitted. _(The reference capture
`03-catchup-status.png` is retained but identical to `01-dashboard-hero.png`.)_

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
> _(#8 is the last shot in the final 7-shot set.)_

---

**9. ~~Privacy + dark mode.~~ DROPPED (2026-07-01)** — privacy/dark is a weak converter versus the
value/premium shots; the on-device-data trust story still lives in the description + privacy policy.

**~~Optional 10th (data control).~~ NOT INCLUDED** — same reasoning; 7 shots is the final set.

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
