# Screenshot plan — v1.1 submission (ASO-optimized)

**Updated 2026-06-30** in the ASO pass (companion to `STORE_LISTING.md`). Reordered to lead with the
strongest value shots, and expanded to include the **Premium screens** (PDF export, W-4 optimizer,
safe-harbor) that now exist as of v1.1 — the reason the ASO audit was sequenced *after* Phase B.

Capture from the **iOS Simulator** (or a real device / TestFlight build), not the web/browser dev
build — Simulator screenshots are pixel-perfect at the exact required resolutions and show real native
chrome (status bar, safe areas) the web build doesn't replicate.

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
