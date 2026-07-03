# Phase B — Batched TestFlight Validation Checklist

> ## ✅ PASSED — 2026-06-30
> Ran on a real device via TestFlight. **All sections (A–D) passed**, including the live IAP
> purchase → unlock → restore loop and the PDF / Schedule C export print+share. This was the
> **Phase B exit criterion** — the premium spine is validated end-to-end. The only remaining gate
> before Premium goes live is **v1.0 clearing App Store review** (then merge `v1.1` → `master`).

The off-device work is done and green (typecheck, 103 unit tests, 7/7 Playwright incl. the paywall flow).
What's left is the **native, device-only** pass. To respect the Codemagic minute budget, this is written
as **one build that validates everything** — the IAP purchase/restore loop **and** the PDF/Schedule C
export in the same TestFlight session. Run it top to bottom; don't ship a second build to catch a missed step.

This is the **exit criterion for the whole premium track** (per [PHASE_B_EXECUTION_PLAN.md](PHASE_B_EXECUTION_PLAN.md) Steps 1–2).

## Before the build (2 remaining setup sub-items)

- [ ] **Sandbox tester account** exists (App Store Connect → Users and Access → Sandbox → Testers). Required to buy without being charged. *(Task 3 #7.)*
- [ ] **IAP review screenshot** attached to both products — needed for Apple to *approve* the IAP (not for testing). Now unblocked since the paywall is built; ask Claude to generate a paywall screenshot. *(Task 3 #6.)*

## On device (sign into the **sandbox** Apple ID first: Settings → App Store → Sandbox Account)

### A. Premium gate (free state)
- [ ] Fresh install / not subscribed → Settings shows **"Tax Summary (PDF) · Premium"** with a lock icon.
- [ ] Tapping it **routes to the Paywall** (does not export).
- [ ] Paywall shows both prices from RevenueCat (**$29.99/yr**, **$4.99/mo**), auto-renewal disclosure, Terms/Privacy links, Subscribe, Restore.

### B. Purchase → unlock
- [ ] Tap **Subscribe** (annual) → native sandbox purchase sheet → confirm.
- [ ] Paywall dismisses and the app reflects **premium active** (lock icon on the export row is gone; label drops the "· Premium" suffix).
- [ ] Analytics funnel fired (`paywall_viewed` → `purchase_started` → `purchase_completed`) — visible in PostHog if you want to confirm.

### C. PDF / Schedule C export (now unlocked)
- [ ] With **at least one entry logged this year**, tap **Tax Summary (PDF)**.
- [ ] PDF renders; the **system share sheet** opens (Save to Files / Mail / AirDrop). File is named `tax-summary-<year>.pdf`.
- [ ] Open the PDF and sanity-check the numbers against a known scenario:
  - [ ] **Line 1** gross receipts = earnings + tips.
  - [ ] **Line 9** = standard-mileage deduction **+ parking + tolls** (the note under the table spells out miles × rate).
  - [ ] **Line 22** supplies, **Line 25** phone.
  - [ ] **Line 31** net profit = gross − total expenses.
  - [ ] "Estimated amount to set aside" matches the dashboard number.
  - [ ] Header (prepared-for name, filing status, state/county, generated date) and the disclaimer are present.
- [ ] **Empty-year guard:** with no entries for the current year, the export shows the "Log at least one entry…" alert instead of an empty PDF.

### D. Restore + offline trust
- [ ] Delete + reinstall (or sign out/in) → tap **Restore purchases** on the paywall → premium comes back.
- [ ] **Airplane mode** with a previously-active subscription → premium **stays unlocked** (offline-cached entitlement), and the export still works.

## Pass = done
When A–D all pass, item #1 (the batched TestFlight pass) is complete and Phase B's IAP + PDF/Schedule C
anchor are validated. The only remaining live-gate is **v1.0 clearing App Store review** before any of this
merges to `master`.
