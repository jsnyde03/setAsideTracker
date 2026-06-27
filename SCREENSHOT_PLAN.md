# Screenshot plan — v1.0 submission

What to capture, in what order, with what sample data, and at what sizes. Capture these from the **iOS Simulator** (or a real device/TestFlight build), not the web/browser dev build — Simulator screenshots are pixel-perfect at the exact required resolutions and show real native chrome (status bar, safe areas), which the web build doesn't replicate accurately.

## iPad — resolved: iPhone-only for v1.0

`app.json`'s `ios.supportsTablet` is now set to `false` (was `true`) — the binary itself no longer declares iPad support, so Apple won't expect iPad screenshots at all. This app's UI hasn't been designed or tested for iPad layouts specifically (it's a single-column phone layout that would just stretch awkwardly on a tablet). Revisit if/when there's a real reason to support iPad properly — re-enabling is a one-line config change away, but the resulting layout would need actual tablet-specific design work before it'd look right.

## Sample data setup (do this once, before capturing anything)

Use one consistent, realistic persona so every screenshot tells the same coherent story — not the placeholder/edge-case data from dev testing. Suggested setup:

- **Name/profile:** a real-sounding name (not "Test User").
- **Tax profile:** a state *with* income tax (e.g. NY or CA) rather than a no-tax state like TX — this makes the breakdown card show federal **and** state lines, which is a richer, more informative hero shot than SE+federal alone.
- **Entries:** 5-8 entries across at least 3-4 different platforms (Amazon Flex, DoorDash, Uber, Instacart), spread across the last couple of weeks, with believable amounts ($40-$180/entry), a few with mileage and expenses logged, at least one with hours worked (so the "effective hourly rate" line appears).
- **Amount set aside so far:** set this to something that lands in the **green "on track"** state, not the red "behind" state — reassurance sells better than a warning in a marketing screenshot.
- Leave dark mode off for the main set; capture one dark-mode shot separately at the end (see #7 below).

## Screenshots to capture, in this order

App Store screenshots are shown in upload order, and the first 2-3 matter most for conversion — lead with the strongest, clearest value prop.

AppScreens title/subtitle copy is listed under each screenshot. Keep titles short enough to read in ~1 second; subtitles can run to two short lines.

---

**1. Dashboard hero shot.**
The full "Set aside for taxes" gradient card with the SE/federal/state breakdown visible, plus the "Total earnings logged" card with the effective hourly rate line above it. *This is the single most important screenshot — it shows the entire core value prop in one glance.*

> **Title:** Know exactly what to set aside
> **Subtitle:** Real-time self-employment, federal, and state tax estimates — updated every time you log a shift.

---

**2. Quarterly due date + catch-up status.**
The "Amount set aside so far" card showing the next due date and the green "you're on track" message. Demonstrates the app actively helps you stay ahead, not just shows a scary number.

> **Title:** Stay ahead of quarterly taxes
> **Subtitle:** See your next payment due date and exactly how much to save each week to hit it on time.

---

**3. Log Earnings screen.**
The platform chips (Amazon Flex/Spark/DoorDash/Uber/Instacart/Other) and clean entry form. Shows how fast logging a shift is.

> **Title:** Log a shift in seconds
> **Subtitle:** Pick your platform, enter your pay. Your tax estimate updates the moment you save.

---

**4. Dashboard "Recent entries" list**, scrolled to show several different platforms logged. Demonstrates real, active multi-platform use.

> **Title:** Every platform, one place
> **Subtitle:** Amazon Flex, DoorDash, Uber, Instacart — log them all and see your full tax picture in one view.

---

**5. Settings → Backup & Restore / Export Data.**
Shows users they're in full control of their data and can get it out anytime — a real trust signal for a financial app.

> **Title:** Your data, your terms
> **Subtitle:** Export a full CSV at tax time or create a backup file in one tap — no cloud account needed.

---

**6. Settings → Security (App Lock) + Appearance.**
Shows the privacy/security feature (Face ID/Touch ID lock) and the dark mode option in one shot.

> **Title:** Lock it with Face ID
> **Subtitle:** Optional Face ID/Touch ID keeps your earnings private. Light and dark mode included.

---

**7. Dark mode dashboard** (same as #1, just with Appearance set to Dark). One shot is enough to show the feature exists without doubling the whole set.

> **Title:** Looks great day or night
> **Subtitle:** Dark mode built right in — easy on the eyes during late-night delivery shifts.

---

That's 7 — comfortably within Apple's 10-screenshot max and well above Google Play's 2-minimum, while leaving room to add 1-2 more later without hitting the cap.

**Optional 8th screenshot (W2 job support):** Settings → Tax Profile with the "I also have a W2 job" toggle on and the pay-stub fields visible. Useful if you want to call out the W2+gig use case explicitly in the listing — skip if the pure-gig persona tells a cleaner story.

> **Title:** Gig on the side of a day job?
> **Subtitle:** Enter your pay stub and your set-aside only covers what your employer isn't already withholding.

## Required sizes

**Apple (App Store Connect)** — confirmed against Apple's current published spec as of this writing:
- **6.9" (iPhone 17 Pro Max / 16 Pro Max class): 1320 × 2868 px** — the primary required size; Apple auto-scales this down for smaller device classes if you don't provide them separately.
- 6.7" (iPhone Plus class): 1290 × 2796 px — recommended as a fallback in addition to the 6.9" set, since scaling can look slightly off depending on UI elements pinned to screen edges.
- No alpha channel, RGB only, no device frame baked into the image (Apple adds its own chrome in some placements).
- Skip iPad sizes if going iPhone-only per the decision above.

**Google Play Console:**
- Minimum 2, maximum 8 phone screenshots.
- Recommended size: **1080 × 1920 px** (9:16 portrait). Acceptable range: 320–3840 px per side, aspect ratio between 9:16 and 16:9.
- JPEG or 24-bit PNG **without alpha** (a PNG with transparency will be rejected).
- Also needs a **feature graphic**: exactly 1024 × 500 px, JPEG or 24-bit PNG, shown when Google features the app editorially — not a screenshot, more like a small banner/wordmark graphic. Can be simple (app icon + name + tagline on a brand-color background) — lower priority than the screenshots themselves, but Play Console requires it to publish.

## How to capture them

1. Run the app in Xcode's iOS Simulator on a device matching the target size (e.g. iPhone 17 Pro Max for the 6.9" set).
2. Set up the sample data once (see above), then navigate to each of the 7 screens in order.
3. Use the Simulator's own screenshot capture (Cmd+S, or Device → Trigger Screenshot) — this captures at the device's native resolution automatically, no manual resizing needed.
4. Re-run the same 7-shot sequence on a 6.7"-class simulator for the fallback size set, if doing both.
5. For Google Play, the same Simulator captures can usually be resized/cropped to 1080×1920 (a 9:16 portrait phone screenshot looks the same regardless of exact source device, since Play Console's range is more forgiving than Apple's exact-pixel requirement).

## Naming convention

`{store}-{size-class}-{number}-{short-description}.png`, e.g. `appstore-6.9in-01-dashboard-hero.png`, `playstore-02-catchup-status.png` — makes it obvious which file goes where during upload, especially once there are 14+ files across both stores and multiple size classes.

## Optional follow-up, not required for first submission

Marketing-text overlays ("Know exactly what to set aside" headline text composited over the screenshot, like most polished App Store listings have) meaningfully improve conversion but need a design tool (Figma, Canva, or App Store Connect's own preview/overlay options) — worth doing as a fast-follow once the raw screenshots above exist, not a blocker for getting the first submission in.
