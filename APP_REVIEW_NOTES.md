# App Review notes — SetAsideTracker

Paste this (or a trimmed version) into App Store Connect's "App Review Information → Notes" field, and the equivalent in Google Play Console's review submission.

```
SetAsideTracker has no login or account system by design — all data is stored locally on the
device, with no backend server. There's nothing to sign in with, so reviewers can go straight
from the first launch screen into the app:

1. On first launch, complete the tax-profile setup screen:
   - Enter a name (required) and optional email.
   - Select a filing status: Single, Married Filing Jointly, Head of Household, or Married
     Filing Separately.
   - Enter number of dependents (defaults to 0 — fine to leave).
   - Enter a 2-letter U.S. state code (e.g. "TX"). For MD, NY, or PA, a county/city picker
     appears automatically — select any county listed (e.g. "Montgomery County" for MD, or
     "New York City" for NY).
   - There is an optional "I also have a W2 job" toggle. Skip it entirely if you just want to
     test the pure gig-income path — all fields under it are optional.
   - Check the required disclaimer checkbox ("Tax figures are estimates, not tax advice").
   - Tap "Continue."
2. From the dashboard, tap "Log Earnings" to add a sample entry (platform, date, and gross pay
   are the only required fields) and tap "Save Entry."
3. The dashboard updates immediately to show an estimated tax "set aside" amount with a full
   breakdown (self-employment tax, federal income tax, state tax).
4. The gear icon (top right) opens Settings, which includes optional Face ID/Touch ID app lock,
   CSV export, and a backup/restore feature — all operating on local device storage only.

No test account credentials are needed since there's no authentication of any kind.

This app provides tax *estimates* for personal financial planning — it does not file taxes,
move money, or connect to any bank/financial institution. A persistent disclaimer ("Estimates
for planning purposes only — not tax advice") appears on the main screen, and a checkbox
acknowledging this is required during onboarding before the app can be used.

If app lock is enabled (off by default) and you need to bypass it during review, it relies
entirely on the device's own Face ID/Touch ID/passcode — there's no in-app PIN to provide
separately.
```

## Notes to self before submitting
- The W2 fields in onboarding are all optional — reviewers who skip the W2 toggle entirely will
  still reach a fully functional dashboard. No need to fill in pay-stub fields during review.
- If Face ID/Touch ID could cause review friction, consider explicitly testing the "remains off
  by default" path so reviewers never even encounter the lock screen.
