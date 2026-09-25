# v1.2 — TestFlight device-QA checklist

_Per the standing rule: **no submission until a real-device TestFlight run against a per-version
full-surface checklist, native paths first.** Companion to [V1_2_EXECUTION_PLAN.md](V1_2_EXECUTION_PLAN.md);
run at **1.2.12**, the device-QA gate. ⚠️ Said "1.2.9" until 2026-09-23 — which since the renumber
is the accessibility audit, so the header was pointing at the wrong gate._

**Why this version's list is unusually load-bearing.** v1.2 replaced the entire navigation layer
(`expo-router`), added `react-native-screens` beneath every screen, moved all app state above the
router, and relabelled every text input. **The web suite is green across all of it and can see none of
it** — react-native-web renders no `Alert`, has no biometrics, no document picker, no widget, and no
real navigation stack. Green means "nothing else broke", not "this works on a phone."

**Legend:** ⬜ not run · ✅ pass · ❌ fail (file it) · 🤖 covered by Maestro (spot-check only)

---

## 🎯 THE ONE BUILD — read this before dispatching _(assembled 2026-09-21 at 1.2.5.6; rows 10–12 added 2026-09-24)_

> ### ⚡ Dispatch card — 2026-09-25
>
> | | |
> |---|---|
> | **Branch** | 🔴 **`v1.2`** — **NOT `master`, which is 161 commits behind.** The UI's branch dropdown is how the wrong one gets picked. |
> | **Workflow** | **`ios-testflight`** — ⛔ **`ios-adhoc` HAS NEVER WORKED** (no device UDID in an ad-hoc profile; established 2026-08-07 and recommended wrongly three times since). |
> | **First** | ⚠️ **Run `ios-simulator` on GitHub Actions first** *(`gh workflow run maestro-ios.yml --ref v1.2`)* — it is this project's only compile check, and it is **free**. A syntax error found on a signed build has spent the expensive cycle. |
> | **Verify at the top of the log** | The first step now prints **BRANCH / COMMIT / SUBJECT / DATE**. **Read those four lines before believing anything else.** Expect `v1.2` and today's HEAD. |
> | **Expect** | ⚠️ **"Missing Compliance"** in App Store Connect — that is **[D23] working**, not a broken build. Answering it is row 0(b) and is how 1.2.10.2 gets its answer from Apple. |
> | **State at dispatch** | 453 unit · 137/137 Playwright · Maestro **12/12** on device · lint 0 · typecheck clean · CI green · tree pushed *(verified after `git fetch`)*. |


⚠️ **Codemagic is ~80% consumed and the remainder is reserved for TestFlight** (Jason 2026-09-21).
**Never spend a build on a single item.** This section is the agenda for one build carrying
everything four items owe, in the order to actually do them — most-likely-to-be-broken first.

⛔ **1.2.5 (mileage) has ZERO device verification and cannot get any other way.** It is the only
prebuild-affecting change in v1.2: two native modules, a config plugin, a background location task.
**If this build fails, it is almost certainly 1.2.5** — which is why `expo-location` and
`expo-task-manager` each landed in their own commit, so the suspect list is short.

| order | what | why it is first/last |
|---|---|---|
| **0** | **⛔ DOES IT UPLOAD — AND THEN, DOES IT INSTALL?** Two separate gates. (a) **ITMS-91053** names every required-reason API still undeclared — the one thing about the privacy manifest that cannot be checked off-device (1.2.10.1). (b) ⚠️ **The build will land as "Missing Compliance" and testers cannot install it until you answer the export-compliance questionnaire in App Store Connect** — that is [D23] working as intended, not a broken build. **Answer it, then record Apple's classification in `exportCompliance.test.ts`.** | A refused or un-installable binary costs the whole cycle before any row below runs. ⚡ This is also how 1.2.10.2 gets its answer: Apple's own questionnaire, not our reading of the EAR. |
| **1** | **Does it build and launch at all?** | A prebuild change is the class that has broken iOS CI here before. Everything below is moot if this fails. |
| **2** | **Start a trip → drive → stop.** Miles land on the entry, editable. | The feature's whole point, and **unprovable off-device** — the simulator only does canned routes. |
| **3** | **⭐ Leave the app while a trip runs.** Switch to another app, lock the screen. | **[D17] is the reason this feature is worth shipping**, and this is the only way to know it works. Confirm the **location indicator** shows the entire time. |
| **4** | **Revoke location mid-trip** (Settings → Privacy), then return. | 1.2.5.5's warning must appear and name the cause. A silent stall is the defect this item is built around. |
| **5** | **Force-quit mid-trip, reopen.** | `resumeTripIfRunning` must pick the distance back up. Expect to lose the metres since the last fix — that is the [D16] trade, not a bug. |
| **6** | **The recovery screen's `Alert`s** (§A) | 1.2.3's entire `Alert` layer is unverified; web renders none. |
| **7** | **The weekly sheet at phone width** with a full year of weeks | 1.2.4 is Playwright-covered for behaviour, never for a small screen. |
| **8** | **Demo mode end-to-end** (§C) | 1.2.1 is 7/7 built and has never been device-validated. |
| **9** | **Reminders survive a relaunch, and a disabled switch stays disabled.** With reminders ON, cold-start and confirm notifications are scheduled for the **shifted** dates; then turn the switch OFF, relaunch, and confirm **nothing is re-created**. | 1.2.6.2's launch refresh. **`useReminderRefresh` has no test and cannot get one here** — no React renderer. The rule underneath is covered four ways; the wiring is covered by this row alone. The off-then-relaunch half is the data-loss-shaped direction: the OS permission outlives the switch. |
| **10** | ⭐ **The guided tour, on a phone.** Enter the sample account from onboarding: the tour appears, the spotlight sits **on** the thing each stop names, the card is fully on screen at all four stops, Skip stays skipped, and Settings → **Replay the tour** brings it back. Then turn on **Reduce Motion** and confirm the spotlight **cuts** rather than slides. | 1.2.8 is new in this version and **everything known about it except one Maestro flow was learned in a browser** — which has no real `Modal` presentation, no native `Animated`, and no VoiceOver. ⚠️ The geometry is unit-tested and the cut-out is asserted in both suites; what no gate here can judge is whether it *reads* as calm. |
| **11** | **VoiceOver through the tour.** Swipe through one stop: the progress line, title and body are read, the four dim bands are **not**, and focus cannot escape the card onto the dashboard behind it. | 1.2.8.5 covered the accessibility **tree** — `aria-hidden` on the bands, `accessibilityViewIsModal` on the card — and **the browser has no VoiceOver**, so reading ORDER and focus containment are owed here and nowhere else. ⚠️ A coach-mark that traps focus is worse than no tour. |
| **12** | **`LockScreen` and `RecoveryScreen`, looked at in both themes.** App lock on, cold start; then the recovery path. Read the text against its background. | ⛔ **These are the two surfaces the contrast gate deliberately does NOT measure** (1.2.18.1). Both need contrived state and neither is reachable by clicking — and a lock screen whose biometric prompt does not exist on web is half a screen, so measuring the half that renders would report a pass over something nobody has seen whole. **This row is that decision, made explicit rather than left as a gap.** |

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

### Accessibility — 1.2.9's device-owed rows _(added 2026-09-23)_

⚠️ **ALL of this is device-owed for a structural reason, not because nobody got to it.** Every
animation in the app is native-only (`Screen`'s entrance and all four sheets pass `"none"` on web),
and react-native-web has neither an accessibility text-size setting nor VoiceOver — so the browser
suite renders a motionless, screen-reader-less app that looks correct whether or not any of this
works. The rules are unit-tested; the behaviour is only visible here.

| | check | why it matters on device |
|---|---|---|
| ⬜ | **VoiceOver end-to-end** _(1.2.9.5)_ | Onboard, log an entry, open a premium card, reach the paywall — entirely by screen reader. The labels were audited and 26 shadowing sites reviewed, but nobody has *listened* to the app. |
| ⬜ | **Reduce Motion** _(1.2.9.4)_ | Turn it on in Control Center **while the app is open** — the hook subscribes, so sheets should switch from slide to cross-fade and screen entrances should stop, without a relaunch. |
| ⬜ | **Dynamic Type at AX5** | The browser check scales text 1.5× and proves nothing clips; iOS goes far higher. Walk every screen at the largest accessibility size. |
| ⬜ | **The small touch targets** | Chips, the paywall legal links, the dashboard chevrons and the breakdown rows all reach 44pt **through `hitSlop`, which react-native-web ignores** — so this is the first time anything actually measures them. |

### iPad — 1.2.7's device-owed rows _(moved out of "not yet applicable" 2026-09-23)_

⚠️ **`supportsTablet` is already `true` on this branch**, so the app ships to iPad whether or not
these are checked. **RN-web at 1024px is not UIKit at 1024pt** — the local iPad Playwright projects
catch layout *breaks*, never fidelity, so everything here is genuinely owed.

| | check | why it matters on device |
|---|---|---|
| ⬜ | 🔴 **iPad App Store screenshots** _(1.2.7.7)_ | **A SUBMISSION REQUIREMENT that shipped with the `supportsTablet` flip** — App Store Connect will not accept the build without them. Capture in **dark** mode, per the standing screenshot rule. |
| ⬜ | **Hardware keyboard** _(1.2.7.6)_ | Cannot be reached from RN-web at all: tab order, the return key moving between fields, and nothing trapped behind a software keyboard that never appears. |
| ⬜ | **Split View + Stage Manager, dragged live** | The seam is proven to react in a browser resize; this is the real thing. Drag the divider through the 768pt breakpoint **both ways** and confirm the second column leaves and comes back. |
| ⬜ | **Rotation** | The iPhone is pinned portrait and the iPad is not (1.2.7.1). Rotate on every route, not just the dashboard. |
| ⬜ | **The two-column dashboard, looked at** | Geometry is asserted; *proportion* is not. Does the band read as spacious or as two cramped halves — in **both themes**? |
| ⬜ | **The four bottom sheets** | Capped at 540pt and centred rather than full-bleed slabs. They are the surface most likely to look wrong at tablet width. |

## C. Regression surface — 🤖 Maestro covers these; spot-check the riskiest

| | check |
|---|---|
| 🤖⬜ | Onboarding (incl. validation Alerts) · log + delete entry (destructive Alert) · **clear all data (new flow)** |
| 🤖⬜ | Premium paywall + all five gating flows |
| ⬜ | **Purchase + restore-purchases against a real StoreKit sandbox account** — Maestro cannot buy anything. |

## D. Not yet applicable

- **The iOS home-screen widget** — ⛔ **cut to v1.3 ([D8], 2026-09-20)**, so nothing here is owed by
  this version. When it lands: home-screen placement, data freshness, both themes, and the App Group
  actually sharing data. _(This row cited "1.2.6", which since the renumber means the premium slice.)_
- _iPad moved to §B on 2026-09-23 — it is applicable now, not later: `supportsTablet` is `true` and
  1.2.7.1–.5 have shipped._

---

## Status

✅ **A `1.2.0` TestFlight build exists (2026-08-08)** — built, signed, uploaded, installable. **§A is
now runnable**, and §A is the whole reason this document exists: those checks cannot be automated by
anything, so they are the only way that surface ever gets verified.

⚙️ **The flows now run, on GitHub Actions ([D27]) — `gh workflow run maestro-ios.yml --ref v1.2`.**
Six runs so far; the suite is not green yet, and that work is 1.2.14, not a device gate. **Nothing
here waits on it** — §A exists precisely for the checks Maestro cannot make.

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
