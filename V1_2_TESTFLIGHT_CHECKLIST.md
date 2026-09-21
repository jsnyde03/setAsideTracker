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

## 🎯 THE ONE BUILD — read this before dispatching _(assembled 2026-09-21 at 1.2.5.6)_

⚠️ **Codemagic is ~80% consumed and the remainder is reserved for TestFlight** (Jason 2026-09-21).
**Never spend a build on a single item.** This section is the agenda for one build carrying
everything four items owe, in the order to actually do them — most-likely-to-be-broken first.

⛔ **1.2.5 (mileage) has ZERO device verification and cannot get any other way.** It is the only
prebuild-affecting change in v1.2: two native modules, a config plugin, a background location task.
**If this build fails, it is almost certainly 1.2.5** — which is why `expo-location` and
`expo-task-manager` each landed in their own commit, so the suspect list is short.

| order | what | why it is first/last |
|---|---|---|
| **1** | **Does it build and launch at all?** | A prebuild change is the class that has broken iOS CI here before. Everything below is moot if this fails. |
| **2** | **Start a trip → drive → stop.** Miles land on the entry, editable. | The feature's whole point, and **unprovable off-device** — the simulator only does canned routes. |
| **3** | **⭐ Leave the app while a trip runs.** Switch to another app, lock the screen. | **[D17] is the reason this feature is worth shipping**, and this is the only way to know it works. Confirm the **location indicator** shows the entire time. |
| **4** | **Revoke location mid-trip** (Settings → Privacy), then return. | 1.2.5.5's warning must appear and name the cause. A silent stall is the defect this item is built around. |
| **5** | **Force-quit mid-trip, reopen.** | `resumeTripIfRunning` must pick the distance back up. Expect to lose the metres since the last fix — that is the [D16] trade, not a bug. |
| **6** | **The recovery screen's `Alert`s** (§A) | 1.2.3's entire `Alert` layer is unverified; web renders none. |
| **7** | **The weekly sheet at phone width** with a full year of weeks | 1.2.4 is Playwright-covered for behaviour, never for a small screen. |
| **8** | **Demo mode end-to-end** (§C) | 1.2.1 is 7/7 built and has never been device-validated. |
| **9** | **Reminders survive a relaunch, and a disabled switch stays disabled.** With reminders ON, cold-start and confirm notifications are scheduled for the **shifted** dates; then turn the switch OFF, relaunch, and confirm **nothing is re-created**. | 1.2.6.2's launch refresh. **`useReminderRefresh` has no test and cannot get one here** — no React renderer. The rule underneath is covered four ways; the wiring is covered by this row alone. The off-then-relaunch half is the data-loss-shaped direction: the OS permission outlives the switch. |

⚠️ **Check first, before dispatching:** `git rev-list --count origin/v1.2..HEAD` is 0, and the
workflow prints the commit it built. Two build cycles were once spent on a month-old tree.

---

## A. Cannot be automated at all — these are the reason this document exists

| | check | what specifically to watch |
|---|---|---|
| ⬜ | **Restore from backup** | Settings → Restore from backup file → pick a `.json` export. **Needs the native document picker, which no harness can drive.** Confirm: entries return · **the theme changes if the backup was saved in a different one** (this was broken until 1.2.0.2 — it applied only the app-lock setting) · reminders re-schedule · you land on the dashboard, not onboarding. |
| ⬜ | **App Lock — the actual biometric prompt** | Settings → App Lock on → background the app → return. Face ID/Touch ID must prompt. Then **fail it deliberately** → the retry hint appears. Then pass → the app opens. ⚠️ **Face ID does not work in Expo Go — needs this TestFlight build.** |
| ⬜ | **App Lock — the re-lock trigger** | Background and return **several times**. It must re-lock every time. ⚠️ Specifically confirm it does **not** re-lock when merely showing an `Alert` or the Face ID sheet — "inactive" vs "background" is a distinction this app got wrong once already. |
| ⬜ | **App Lock — turning it off releases immediately** | With the lock on and unlocked, turn it off. 1.2.0.3 made `isLocked` derived rather than stored precisely so this can't leave a stale lock behind. |
| ⬜ | **Data recovery — the erase confirmation** _(new, 1.2.3.3)_ | Reach the recovery screen (below), tap **Erase and start over**. A destructive `Alert` must appear and **Cancel must leave the data exactly as it was**. ⚠️ **react-native-web renders no `Alert`**, so the web specs prove the routing and nothing about this dialog — the one guard standing between a tap and permanent deletion is unverified until this is done. |
| ⬜ | **Data recovery — restore from the recovery screen** _(new, 1.2.3.3)_ | From the recovery screen, **Restore from a backup** → the native picker → a real `.json` export. Confirm the data comes back and the app lands on the dashboard. ⚠️ This is a *different code path* from Settings' restore — it wipes first, because the existing data is what cannot be read. Also feed it a **deliberately corrupt file**: the alert must say your device data was not changed, and the recovery screen must still be there. |
| ⬜ | **Data recovery — a wrong-key device** _(new, 1.2.3.3, the hard one)_ | ⚠️ **How to reach it:** the app must have data, and its key must be gone from the Keychain. Easiest real approximation is a **restore of the app's data from a device backup onto a different device** (Keychain items do not always travel), or a build that deliberately writes a bad key once. What to confirm: the app shows **"We couldn't open your data"** and **never onboarding** — the shipped v1.1.1 behaviour is that a user in this state is greeted as brand new and their profile is then overwritten. Then **Try again** must genuinely re-read (it clears a cached key that would otherwise make the retry a no-op). |
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

## Status

✅ **A `1.2.0` TestFlight build exists (2026-08-08)** — built, signed, uploaded, installable. **§A is
now runnable**, and §A is the whole reason this document exists: those checks cannot be automated by
anything, so they are the only way that surface ever gets verified.

⏳ **Still owed: dispatch `maestro-ios` on `v1.2`.** The flows have not run since the migration began.
**Treat the first run as a validation pass, not a regression check** — 1.2.0.8 relabelled every input,
so five flows moved from placeholder-and-index to accessible names, and none of that has executed once.

### If there's only time for a few checks, do these — highest value first

They're ranked by *what nothing else in the project can see*, not by how likely they are to break.

1. **Restore from a backup saved in the OTHER theme** (§A) — exercises the exact bug 1.2.0.2 fixed,
   through the one path (a native document picker) no harness can drive.
2. **App Lock: enable → background → return** (§A) — the biometric prompt is invisible to every
   automated tool, and Face ID doesn't work in Expo Go, so this build is the first chance to see it.
3. **The back-swipe gesture** (§B) — **brand new**: there was no navigation stack before v1.2, so this
   interaction has never existed in this app on any build.
4. **Deep link `setasidetracker://what-if`, then hit Close** (§B) — the dead-close-button defect fixed
   at 1.2.0.7; confirm the fallback lands on the dashboard.
5. **Clear all data** (§A/C) — a data-loss path, and the destructive Alert is web-invisible. The new
   Maestro flow covers it, but that flow has never run.
