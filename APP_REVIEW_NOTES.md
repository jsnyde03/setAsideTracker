# App Review notes — SetAsideTracker

Paste this (or a trimmed version) into App Store Connect's "App Review Information → Notes" field, and the equivalent in Google Play Console's review submission.

```
SetAsideTracker has no login or account system by design — all data is stored locally on the
device, with no backend server. There's nothing to sign in with, so reviewers can go straight
from the first launch screen into the app:

1. On first launch, fill in a name and state (any 2-letter state code, e.g. "TX"), check the
   required disclaimer checkbox, and tap Continue.
2. From the dashboard, tap "Log Earnings" to add a sample entry (platform, date, gross pay are
   the only required fields) and tap "Save Entry."
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
- Confirm the actual onboarding copy/flow still matches this description if anything changes before submission.
- If Face ID/Touch ID could cause review friction, consider explicitly testing the "remains off by default" path so reviewers never even encounter the lock screen.
