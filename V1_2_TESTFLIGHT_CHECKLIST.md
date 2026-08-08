# v1.2 — TestFlight device-QA checklist

_Per the standing rule: **no submission until a real-device TestFlight run against a per-version
full-surface checklist, native paths first.** Companion to [V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md);
run at 1.2.9._

**Why this version's list is unusually load-bearing.** v1.2 replaced the entire navigation layer
(`expo-router`), added `react-native-screens` beneath every screen, moved all app state above the
router, and relabelled every text input. **The web suite is green across all of it and can see none of
it** — react-native-web renders no `Alert`, has no biometrics, no document picker, no widget, and no
real navigation stack. Green means "nothing else broke", not "this works on a phone."

**Legend:** ⬜ not run · ✅ pass · ❌ fail (file it) · 🤖 covered by Maestro (spot-check only)

---

## A. Cannot be automated at all — these are the reason this document exists

| | check | what specifically to watch |
|---|---|---|
| ⬜ | **Restore from backup** | Settings → Restore from backup file → pick a `.json` export. **Needs the native document picker, which no harness can drive.** Confirm: entries return · **the theme changes if the backup was saved in a different one** (this was broken until 1.2.0.2 — it applied only the app-lock setting) · reminders re-schedule · you land on the dashboard, not onboarding. |
| ⬜ | **App Lock — the actual biometric prompt** | Settings → App Lock on → background the app → return. Face ID/Touch ID must prompt. Then **fail it deliberately** → the retry hint appears. Then pass → the app opens. ⚠️ **Face ID does not work in Expo Go — needs this TestFlight build.** |
| ⬜ | **App Lock — the re-lock trigger** | Background and return **several times**. It must re-lock every time. ⚠️ Specifically confirm it does **not** re-lock when merely showing an `Alert` or the Face ID sheet — "inactive" vs "background" is a distinction this app got wrong once already. |
| ⬜ | **App Lock — turning it off releases immediately** | With the lock on and unlocked, turn it off. 1.2.0.3 made `isLocked` derived rather than stored precisely so this can't leave a stale lock behind. |
| ⬜ | **Quarterly reminder delivery** | Can only be confirmed by waiting for a real scheduled notification. Verify at minimum that toggling reminders off then on doesn't throw. |
| ⬜ | **CSV / PDF / backup export share sheets** | Native file + share paths. Each must open the real iOS share sheet and produce a file that opens elsewhere. |
| ⬜ | **Native date picker** | Entry form → Date. The iOS wheel/calendar, not a web input. |

## B. New in v1.2, and web-verified only

| | check | why it matters on device |
|---|---|---|
| ⬜ | **Every route opens and closes** | 12 routes. The close button on each must return you where you came from. |
| ⬜ | **The back SWIPE gesture** | Brand new: there was no navigation stack before v1.2, so this gesture never existed. Confirm it doesn't leave a half-dismissed screen or strand you. |
| ⬜ | **Deep-link entry** `setasidetracker://what-if` | Entered with **no history**. The close button must still work — it falls back to the dashboard (`useGoBack`). This was a dead button until 1.2.0.7. |
| ⬜ | **Deep-link a guarded route with no profile** | Delete and reinstall, then open `setasidetracker://settings`. Must land on onboarding, never a half-rendered screen. |
| ⬜ | **Reload/cold-start position** | Kill and reopen from a deep-linked screen. Confirm no crash and no stale state. |
| ⬜ | **Both themes on device** | Light held to the same bar as dark — verify by looking, on real hardware, not in a simulator screenshot. |

## C. Regression surface — 🤖 Maestro covers these; spot-check the riskiest

| | check |
|---|---|
| 🤖⬜ | Onboarding (incl. validation Alerts) · log + delete entry (destructive Alert) · **clear all data (new flow)** |
| 🤖⬜ | Premium paywall + all five gating flows |
| ⬜ | **Purchase + restore-purchases against a real StoreKit sandbox account** — Maestro cannot buy anything. |

## D. Not yet applicable

- **Widget (1.2.6)** — add its checks here when it lands: home-screen placement, data freshness, both themes, and the App Group actually sharing data.
- **iPad (1.2.3)** — split-view, rotation, Stage Manager, and keyboard.

---

## Owed before this can be run

1. **Dispatch `maestro-ios` on `v1.2`.** The flows have not run since the migration began. **Treat the
   first run as a validation pass, not a regression check** — the selectors were updated blind
   (1.2.0.8 relabelled every input, so five flows moved from placeholder-and-index to accessible
   names), and none of that has executed once.
2. **A TestFlight build from `v1.2`** with the version at `1.2.0` (the `1.1.1` upload was rejected as
   already-approved).
