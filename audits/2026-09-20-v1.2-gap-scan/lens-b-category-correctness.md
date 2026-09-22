# Lens B — category expectations and correctness

Read-only audit, 2026-09-20, branch `v1.2`. Scope: `services/tax-engine/src/` (all),
`apps/mobile/src/calculations.ts`, `apps/mobile/src/storage/`, `PRIVACY_POLICY.md`,
`apps/mobile/app.json`.

**Evidence discipline note.** Every assertion about behaviour below is traced through the actual
arithmetic and cited `file:line`. Where a finding depends on what a *statute* says (a rate, a
threshold, whether a state figure is an exemption or a credit) the code side is measured and the
tax-law side is marked as needing confirmation against an authoritative source. Items marked
`UNVERIFIED` were not confirmed either way.

---

## Georgia, South Carolina and Minnesota dependent *exemptions* are modelled as dollar-for-dollar tax *credits*

**Type:** correctness
**Severity:** blocker

**What's wrong or missing:** The state engine treats `credit.perDependent` as a direct reduction of
tax owed — `creditApplied = Math.min(availableCredit, stateLevelTax)` (`stateTax.ts:170-171`). GA is
configured with `credit: { perDependent: 4000 }`, SC with `4930`, MN with `5300`. Those three figures
are — to my strong belief, needing authoritative confirmation — each state's **dependent exemption /
subtraction from taxable income**, not a tax credit. Applied as a credit they are roughly 15–20×
too large and will zero out state tax entirely for most gig workers with a child. The error direction
is *understatement* — the user is told to set aside less than they owe.

Three pieces of internal evidence, independent of my recall of state law:

1. **Order-of-magnitude asymmetry against the states whose credits are genuine.** In the same file,
   AR is `perFiler 29 / perDependent 29`, DE `110/110`, NE `176/176`, OR `256/256` — real per-filer
   nonrefundable credits, all two- to three-figure. GA/SC/MN sit at 4,000–5,300 in the same field.
   No US state has a per-dependent nonrefundable income-tax credit of that size.
2. **The same file already models an exemption correctly, the other way.** VT folds its personal
   exemption into the deduction: `standardDeduction: { single: 7650 + 5300, marriedFilingJointly:
   15300 + 10600, ... }` (`2026.ts:1108`), and OH folds its `$2,400/$4,800 personal exemption`
   into bracket thresholds (`2025.ts:249-253`). The codebase knows the pattern; these three entries
   used the wrong slot.
3. **The code comments themselves are the only thing asserting "credit"** — e.g. `// Georgia's
   $4,000/dependent credit — genuinely material for a parent, not a rounding error.`
   (`2026.ts:190`). That is a carried premise, not a measurement, and it is repeated nearly verbatim
   for all three states, which reads like one assumption propagated three times.

**Evidence:**
- `services/tax-engine/src/stateTax.ts:26-36` (`calculateAvailableStateCredit` — `perFiler + perDependent * n`)
- `services/tax-engine/src/stateTax.ts:170-171,182` (credit subtracted from tax, not from income)
- `services/tax-engine/src/stateTaxConfigs/2026.ts:191` (GA), `:1081` (SC), `:749` (MN)
- `services/tax-engine/src/taxYears/2025.ts:204` (GA), `:1094` (SC), `:750` (MN) — same shape for 2025
- `services/tax-engine/src/taxYears/2025.ts:137-141` — comment asserting GA's/SC's figures "WERE separately confirmed unchanged for 2025"; a confirmation of the *amount*, not of whether it is a credit or an exemption
- Contrast: `2026.ts` AR / DE / NE / OR `credit` lines (29 / 110 / 176 / 256)
- Contrast: `2026.ts:1108` (VT exemption folded into `standardDeduction`)

**Failure scenario:** GA resident, single filer, 2 dependents, $40,000 net profit, 0 business miles,
no W2. State AGI ≈ $37,175; less GA standard deduction $12,000 → taxable ≈ $25,175; GA tax at 5.19%
≈ **$1,307**. Available credit as configured = 2 × $4,000 = $8,000, capped at $1,307 → `creditApplied
= 1307`, `stateTax = 0`. The app reports **$0 Georgia tax**. Modelled correctly as an exemption, the
same taxpayer's taxable income is $25,175 − $8,000 = $17,175 and GA tax is ≈ **$891**. The user
under-sets-aside by ~$891 and discovers it at filing. SC (2 × $4,930) and MN (2 × $5,300) both
exceed any realistic state tax at gig-level income, so both go to $0 the same way.

**Confirm before fixing:** GA O.C.G.A. §48-7-26 dependent exemption amount; SC Code §12-6-1140(11)
dependent deduction; MN Stat. §290.0121 dependent exemption — and whether any of the three *also*
has a separate small credit that the figure could legitimately be.

---

## The Section 199A / QBI deduction is not modelled anywhere

**Type:** correctness
**Severity:** major

**What's wrong or missing:** A gig worker filing Schedule C is a sole proprietor and is the
archetypal claimant of the 20% qualified-business-income deduction. `grep -rni "qbi|199a|qualified
business income"` across `apps/`, `services/` and `docs/` returns **zero hits** — it is not
implemented, not stubbed, not disclosed as a known simplification. `calculateFederalIncomeTax` goes
straight from AGI to `AGI − standardDeduction` (`federalIncomeTax.ts:15-21`) with no
below-the-line deduction step between them. The effect is a systematic **overstatement** of federal
income tax — the safe direction, but large enough that the app's set-aside recommendation is visibly
wrong against any competitor or tax preparer, which is a trust problem for the app's whole premise.

**Evidence:**
- `services/tax-engine/src/federalIncomeTax.ts:15-24` — AGI → `max(0, AGI − standardDeduction)` → brackets; no QBI term
- `services/tax-engine/src/estimate.ts:24-30` — the only call site; nothing intervenes
- `services/tax-engine/src/types.ts` — `TaxYearConfig` has no QBI field (`standardDeduction`,
  `socialSecurityWageBase`, `additionalMedicareThreshold`, `standardMileageRate`, `childTaxCredit`,
  `stateTaxConfigs` only)
- repo-wide grep for QBI/199A/"qualified business income": no matches

**Failure scenario:** Single filer, $40,000 net profit, no other income, 2026 config. SE tax on
$36,940 of net SE earnings ≈ $5,651; deductible half ≈ $2,825; AGI ≈ $37,175; taxable after the
$16,100 standard deduction ≈ $21,075 → federal income tax ≈ **$2,281**. With the QBI deduction
(20% of QBI $37,175 = $7,435, limited to 20% of pre-QBI taxable income $21,075 = $4,215) taxable
income is $16,860 → federal income tax ≈ **$1,775**. The app overstates federal income tax by ~$506
(≈22%) for a very ordinary user. The gap widens with profit.

**Note on scope:** modelling QBI correctly needs the taxable-income limitation and the
specified-service/wage-limit phase-in above the threshold; for gig-income magnitudes the simple
`min(20% × QBI, 20% × pre-QBI taxable income)` form is exact. If it is not implemented for v1.2, it
should at minimum be **disclosed** in the estimate's assumptions, since silence reads as "we modelled
your return."

---

## A business loss is floored at zero instead of offsetting other income

**Type:** correctness
**Severity:** minor

**What's wrong or missing:** `netProfitAfterMileage = Math.max(0, netSelfEmploymentProfit −
mileageDeduction)` (`estimate.ts:12-15`). A Schedule C net loss legitimately reduces AGI and offsets
W2 wages; here it is clipped to zero, so a user whose mileage deduction exceeds their earnings is
told they owe the full tax on their W2 income with no benefit from the loss. Direction is
overstatement (safe), but it is visibly wrong in exactly the situation a mileage-heavy driver hits.

**Evidence:** `services/tax-engine/src/estimate.ts:12-15`; the clipped value is then the input to
`calculateSeTax` (`:17-22`), `calculateFederalIncomeTax` (`:24-30`) and `calculateStateTax`
(`:41-50`), so the loss is discarded for all three.

**Failure scenario:** Part-time driver: $6,000 gig income, 12,000 business miles (deduction $8,700 at
the 2026 rate), plus a $45,000 W2 job. True Schedule C loss of $2,700 reduces AGI to ~$42,300; the
app computes `netProfitAfterMileage = 0` and taxes the full $45,000. ~$594 of overstated federal tax
at the 22% bracket, plus state.

*(Flooring SE tax at zero separately is correct — a loss does not generate negative SE tax. The
defect is only that the loss never reaches the income-tax and state-tax bases.)*

---

## Dependents are counted in the tax owed but not in the withholding credited — the set-aside is understated for any parent with a W2 job

**Type:** correctness
**Severity:** major

**What's wrong or missing:** The set-aside number is
`max(0, totalEstimatedTax − w2WithholdingYtdEstimate)` (`calculations.ts:316`). The minuend
**includes** the Child Tax Credit and any state per-dependent credit; the subtrahend **excludes**
both. `estimateW2Withholding` calls `calculateFederalIncomeTax(0, 0, annualW2Income, …)` with no CTC
step (`w2Withholding.ts:27,31`) and `calculateStateTax(0, 0, annualW2Income, filingStatus,
stateCode, config, county)` with `numberOfChildren` left at its default `0`
(`w2Withholding.ts:28`, `stateTax.ts:96`). So the same dependents reduce one side of the subtraction
and not the other. The module's stated assumption is "a correctly-filled-out W-4"
(`w2Withholding.ts:6-14`) — but a correctly-filled-out W-4 for a parent includes **Step 3,
`$2,000 × qualifying children`**, which is exactly what this model omits. Direction:
**understatement** of the amount to set aside.

**Evidence:**
- `apps/mobile/src/calculations.ts:316` — the subtraction
- `services/tax-engine/src/estimate.ts:32-39,65,71-77` — CTC netted out of `totalEstimatedTax`
- `services/tax-engine/src/estimate.ts:41-50` — `numberOfChildren` **is** passed to the combined state calc
- `services/tax-engine/src/w2Withholding.ts:27-33` — neither credit applied to the W2-only figure
- `services/tax-engine/src/stateTax.ts:96,170-171` — the `numberOfChildren = 0` default feeds `calculateAvailableStateCredit`

**Failure scenario:** MFJ, 2 children, W2 gross $60,000, gig net profit $20,000, no mileage, TX
(no state tax), 2026 config, no YTD withholding actuals entered. W2-only federal estimate: taxable
$27,800 → **$2,840**, credited in full (`calculations.ts:311`). Combined: SE tax $2,826, federal
income tax $5,070 less the full $4,400 CTC = $670, total **$3,496**. App reports set-aside
= 3,496 − 2,840 = **$656**. If the couple filled in W-4 Step 3 (the correct thing to do — $4,000 for
two children), their employer withholds roughly $0 federal, not $2,840, and the true balance due is
~**$3,496**. The app is short by ~$2,840 on a very common household shape.

**Note:** the fix is either to apply the same credits to the W2-only figure, or to stop netting
credits out of the combined total for this purpose. Do not fix one side only.

---

## A tax year with no config silently borrows the *newest* year's figures — including for years in the past

**Type:** correctness
**Severity:** minor

**What's wrong or missing:** `const config = taxYearConfigs[year] ?? currentTaxYear`
(`calculations.ts:266`); `taxYearConfigs` holds only 2025 and 2026 (`tax-engine/src/index.ts:20-23`)
and `currentTaxYear = taxYear2026` (`:16`). The fallback *is* flagged — `usedFallbackConfig` reaches
the dashboard (`DashboardScreen.tsx:243`) and the tax summary (`taxSummaryHtml.ts:161`), so this is
not silent-silent. But the fallback always resolves **forward** to the newest config, and the doc
comment frames it as a future-year case only ("next year, before that year's IRS figures are
confirmed", `calculations.ts:243`). For a **past** year it applies future brackets, a future standard
deduction, a future SS wage base and a future mileage rate to a year whose real figures are known and
knowable. A warning banner is the wrong answer there; refusing, or shipping the config, is.

Separately: on 2027-01-01 the dashboard's default year becomes 2027 (`calculations.ts:249,264`), so
every already-installed v1.2 binary defaults to the fallback banner with 2026 figures until the user
takes an app update. There is no remote-config path.

**Evidence:** `apps/mobile/src/calculations.ts:249,264,266,321`;
`services/tax-engine/src/index.ts:16,20-23`; `apps/mobile/src/screens/DashboardScreen.tsx:243`

**Failure scenario:** A user logs 2024 entries (nothing stops them — `entriesForYear` just prefix-
matches `YYYY-MM-DD`, `calculations.ts:177-179`) and switches the year selector to 2024. The estimate
uses the 2026 mileage rate of **$0.725/mi** instead of 2024's, the 2026 $16,100 standard deduction
instead of 2024's, and the 2026 $184,500 wage base instead of 2024's — a materially wrong number
presented behind a generic "estimates may be less accurate" banner. *(The specific 2024 figures need
confirming against an authoritative source; the point here is only that they are not 2026's.)*

---

## A decryption failure has no recovery path, and there is no integrity check to distinguish it from corruption

**Type:** data-safety
**Severity:** major

**What's wrong or missing:** `readJson` decrypts inside a `try` and, on **any** throw, falls back to
`JSON.parse(raw)` on the still-encrypted blob (`repository.ts:99-106`). The comment says the fallback
exists for pre-encryption plaintext, which it handles — but the **wrong-key** case falls off the end
of it: `raw` is a base64 `U2FsdGVkX1…` string, `JSON.parse` throws a `SyntaxError`, and that throw
escapes `readJson` uncaught. It surfaces as `loadError` (`AppDataContext.tsx:89-95`) — a generic load
failure with no message saying the key is gone, no offer to restore from backup, and no way for the
user to tell it apart from a transient error. The ciphertext is still on disk and still recoverable
if the key ever returns, but nothing tells the user that.

Compounding it: `CryptoJS.AES.encrypt(plainText, key)` with a **string** key is AES-256-CBC with
PKCS7 and an OpenSSL-KDF-derived key/IV, and **no MAC** (`cryptoCore.ts:13-19`). There is no
authentication tag, so a wrong key, a truncated blob and a tampered blob are indistinguishable — all
three take the same path. (The key itself is 32 bytes of `crypto.getRandomValues`, hex-encoded
(`encryption.ts:44-46`), so the weak passphrase KDF is not itself the risk here.)

**Evidence:**
- `apps/mobile/src/storage/repository.ts:99-107` — the try/catch and its fallback
- `apps/mobile/src/storage/cryptoCore.ts:13-19` — unauthenticated AES via the passphrase form
- `apps/mobile/src/storage/encryption.ts:34-49` — key lives only in SecureStore; no escrow, no rotation, no "key missing" signal
- `apps/mobile/src/state/AppDataContext.tsx:86-103` — the only handler; records `loadError` and flips `ready`

**Failure scenario:** An Android user re-enrolls a fingerprint (or an iOS user restores to a new
device where Keychain items did not migrate). `SecureStore.getItemAsync` returns null →
`getOrCreateEncryptionKey` **generates a brand-new key** (`encryption.ts:44-48`) and stores it. Every
subsequent read decrypts with the wrong key, throws, falls through to `JSON.parse(ciphertext)`,
throws again. The user sees a generic error state; a full year of earnings entries appears gone. And
because a new key was silently minted, the next successful write re-encrypts under it, so the old
data is permanently unreadable even if the old key is later recovered.

**UNVERIFIED:** whether CryptoJS's `enc.Utf8` decoder throws or returns `""` for a given wrong key —
both routes end at the same `JSON.parse(ciphertext)` throw, so the conclusion holds either way, but
the intermediate was not executed (this audit is read-only).

---

## Write failures are unhandled everywhere, and two settings toggles are optimistic with no rollback

**Type:** data-safety
**Severity:** major

**What's wrong or missing:** The **load** path is wrapped (`AppDataContext.tsx:89-98`). No **write**
path is. `saveEntry`, `removeEntry`, `saveProfile`, `saveTaxProfile`, `updateAmountSetAside` and
`updateFiledTax` all `await` a repository write with no `try`/`catch` and no `reportError` call
(`AppDataContext.tsx:112-160`). Worse, `setAppLockEnabled` and `setRemindersEnabled` set React state
**before** awaiting the write (`:162-169`), so a rejected write leaves the UI asserting a setting
that was never persisted. For app lock that is security-relevant: the user is shown a lock they do
not have, and it is gone at next launch with no notice.

Separately, entry writes are unguarded read-modify-write over the whole array
(`repository.ts:137-157`) — two concurrent `addEntry`/`updateEntry` calls both read the same list and
the second write wins, dropping the first. `updateAppSettings` was explicitly hardened against
exactly this class (`repository.ts:170-182`); entries were not.

**Evidence:**
- `apps/mobile/src/state/AppDataContext.tsx:112-116` (saveEntry), `:118-122` (removeEntry), `:124-132`, `:136-160`
- `apps/mobile/src/state/AppDataContext.tsx:162-169` — state set before the await, no rollback
- `apps/mobile/src/storage/repository.ts:109-114` — `writeJson` has no failure handling of its own
- `apps/mobile/src/storage/repository.ts:137-157` vs `:170-182` — the hardened setter beside the unhardened ones

**Failure scenario:** Device storage is full (or AsyncStorage's Android size limit is hit on a large
entry history). The user toggles App Lock on; the switch flips to on immediately; `updateAppSettings`
rejects; nothing catches it. They close the app believing their financial log is behind Face ID. It
is not, and at next launch the switch is off with no explanation. The same shape applies to
`saveEntry`: the write rejects, `setEntries(updated)` never runs, and the user is left looking at an
entry form with no error and no saved entry.

---

## "Clear All Data" leaves app settings behind, and the policy says it deletes everything

**Type:** compliance
**Severity:** minor

**What's wrong or missing:** `clearAllLocalData` removes `localUserProfile`, `taxProfile` and
`entries` only (`repository.ts:207-209`). `gigTaxTracker:appSettings` is not in the list. The privacy
policy lists app settings as data the app collects (`PRIVACY_POLICY.md:16`) and states that
`"Clear All Data" in Settings permanently deletes everything stored on your device`
(`PRIVACY_POLICY.md:44`). Those two statements are inconsistent with the code. (The cached premium
entitlement is also left behind, but that one is deliberate and documented at `repository.ts:204-206`
— it is the settings key that looks like an oversight, since `KEYS.appSettings` is defined two lines
above the array it was left out of.)

**Evidence:** `apps/mobile/src/storage/repository.ts:8-15,204-209`; `PRIVACY_POLICY.md:16,44`; the
same "Your choices" claim appears in `docs/privacy.html`.

**Failure scenario:** A user hands their phone on, taps Clear All Data, and their theme and app-lock
preferences persist — visible evidence that "everything" was not deleted, against a written promise
that it was.

---

## No iOS privacy manifest is declared

**Type:** compliance
**Severity:** minor

**What's wrong or missing:** There is no `PrivacyInfo.xcprivacy` anywhere in the repo and no
`ios.privacyManifests` key in `apps/mobile/app.json`. Apple has required a privacy manifest declaring
**required-reason API** usage and data-collection categories since May 2024. This app writes to
`UserDefaults`-backed storage (AsyncStorage) and ships two data-collecting SDKs (Sentry, PostHog).
Dependencies increasingly ship their own manifests, which may cover the required-reason side — but
the app-level declaration of what data the app itself collects has no home here at all.

**Evidence:** `find apps/mobile -name "*.xcprivacy"` → no matches;
`grep -rn "privacyManifests\|NSPrivacy"` over `apps/mobile` (excluding `node_modules`) → no matches;
`apps/mobile/app.json:10-17` — the `ios` block carries only `supportsTablet`, `bundleIdentifier`,
`buildNumber` and `infoPlist.ITSAppUsesNonExemptEncryption`.

**Failure scenario:** App Store Connect returns ITMS-91053 ("Missing API declaration") on upload,
blocking the v1.2 submission at the last and most expensive step. **Needs confirmation:** whether the
Expo SDK version in use auto-generates a manifest during prebuild from the config plugins present —
if it does, this is already covered and closes with one `grep` of the prebuild output.

---

## `ITSAppUsesNonExemptEncryption: false` is declared while the app implements AES-256 on user financial data

**Type:** compliance
**Severity:** minor

**What's wrong or missing:** `app.json:14` declares `"ITSAppUsesNonExemptEncryption": false`. The app
does implement its own encryption — `CryptoJS.AES` over every stored record (`cryptoCore.ts:13-19`,
`repository.ts:109-114`) — rather than relying only on OS-provided encryption or HTTPS. Whether that
qualifies for an export-compliance exemption is a legal question, not a code question, and the `false`
declaration may predate the encryption being added.

**Evidence:** `apps/mobile/app.json:14`; `apps/mobile/src/storage/cryptoCore.ts:1,13-19`;
`apps/mobile/src/storage/repository.ts:109-114`; and the code's own hedge at `cryptoCore.ts:8-11`
("not a substitute for a real security audit before handling production-grade financial data").

**Failure scenario:** Not a runtime failure — an export-compliance attestation that does not match
what ships. **Needs confirmation against an authoritative source** (Apple's "Complying with
Encryption Export Regulations" exemption list, and whether an annual self-classification report is
required). Cheap to check; expensive to be wrong about.

---

## The live privacy page still says analytics will be activated "in the future"

**Type:** compliance
**Severity:** minor

**What's wrong or missing:** `docs/privacy.html` correctly discloses Sentry and PostHog in its
"Crash reporting and analytics" and "Third parties" sections — but its "Changes to this policy"
section still carries the pre-launch sentence: *"if we add a real account system, cloud sync, or
**activate analytics/crash reporting** — we'll update this policy and notify you within the app
before the change takes effect"* — on the same page that already says both are active. A reader
cannot tell which statement is current.

**Evidence:** `docs/privacy.html:165-176` (accurate disclosure) versus `docs/privacy.html:200`
(residual pre-launch sentence), both live in the same document. Both SDKs genuinely run in release
builds: `EXPO_PUBLIC_SENTRY_DSN` and `EXPO_PUBLIC_POSTHOG_KEY` are set in `codemagic.yaml:52,59-60`
and consumed at `errorReporting.ts:15-22` and `analyticsClient.ts:21-31`.

*(Filed separately from the already-queued privacy/support single-source-of-truth item: this is a
self-contradiction **inside** the page that is otherwise correct, not a divergence between two
copies.)*

---

## No 1099-NEC / 1099-K reconciliation

**Type:** category-gap
**Severity:** major

**What's wrong or missing:** `grep -rni "1099"` over `apps/mobile/src` and `services` finds the
string only in marketing copy and doc comments — there is no import, entry field, or reconciliation
feature. Every gig platform issues a 1099-NEC or 1099-K in late January, and the first thing a driver
does with a year of logged earnings is compare their total against those forms. When the numbers
disagree — and they routinely do, because platforms report gross fares including fees the driver
never received — the app has nothing to say. A user switching from a spreadsheet has a "1099 total"
column; this app does not.

**Evidence:** repo-wide grep for `1099` (excluding `node_modules`) →
`apps/mobile/src/calculations.ts:329`, `apps/mobile/src/screens/PaywallScreen.tsx:31`,
`apps/mobile/src/screens/W4OptimizerScreen.tsx:35` — all prose. `apps/mobile/src/types.ts:12-46`
(`TaxProfile`) has no 1099 field.

**Failure scenario:** January. The app says $38,400 of gross gig income; the user's DoorDash 1099-NEC
says $41,050. They have no way to record the discrepancy, no way to see which platform it came from,
and no guidance on which figure belongs on Schedule C Line 1. They open a spreadsheet, and the app
has lost the moment it was built for.

---

## Standard mileage is the only vehicle-expense method offered

**Type:** category-gap
**Severity:** major

**What's wrong or missing:** `calculateMileageDeduction` is `miles × config.standardMileageRate` with
no alternative (`mileageDeduction.ts:3-14`), called unconditionally from `estimateTax`
(`estimate.ts:10`). The IRS lets a Schedule C filer choose between the standard mileage rate and the
**actual expense method** (gas, insurance, repairs, depreciation, lease payments × business-use
percentage), and the choice is consequential and partly irreversible. `scheduleC.ts:52` acknowledges
the hole from the other side: "Depreciation (Line 13) and insurance (Line 17) have no dedicated
tracked field."

**Evidence:** `services/tax-engine/src/mileageDeduction.ts:3-14`;
`services/tax-engine/src/estimate.ts:10-15`; `apps/mobile/src/scheduleC.ts:52`; repo grep for
`actualExpense`/`depreciation` → only that one comment.

**Failure scenario:** A driver leasing a car at $450/month who drives 9,000 business miles a year:
standard mileage gives $6,525; actual expenses (lease + insurance + gas + maintenance at, say, 80%
business use) can comfortably exceed $9,000. The app reports $6,525, gives no signal that a larger
deduction exists, and then produces a Schedule C export built on that figure.

---

## One state of residence; no multi-state or part-year support

**Type:** category-gap
**Severity:** minor

**What's wrong or missing:** `TaxProfile.state` is a single `string` (`types.ts:35`) and
`calculateStateTax` takes one `stateCode` (`stateTax.ts:93`). Gig work is routinely cross-border —
NJ/NY, MD/DC/VA, KS/MO — and a driver working in a state they don't live in generally owes a
nonresident return there with a resident-state credit. A mid-year move is likewise unrepresentable.
The app gives one number for the state in the profile and no indication the situation exists.

**Evidence:** `apps/mobile/src/types.ts:35-37`; `services/tax-engine/src/stateTax.ts:88-99`;
`apps/mobile/src/calculations.ts:278-279` (a single `stateCode` + `county` passed through).

**Failure scenario:** A driver living in NJ and delivering mostly in Philadelphia sets `state: "NJ"`.
The app reports NJ tax only — never PA's 3.07%, never Philadelphia's local tax (which the engine
*can* model; `paLocalTax2026.ts` exists), never the NJ credit for tax paid to PA.

---

## Ranked summary

| # | Finding | Type | Severity | v1.2 or later |
|---|---|---|---|---|
| 1 | GA/SC/MN dependent exemptions modelled as dollar-for-dollar tax credits | correctness | blocker | **v1.2 — fix now.** Wrong in the dangerous direction and zeroes out state tax for any parent in three states. Confirm the statutes, then move the figures into `standardDeduction`. |
| 2 | Dependents reduce the tax owed but not the withholding credited | correctness | major | **v1.2.** One-sided subtraction; understates the set-aside by roughly $2k per child for W2 parents. Fix both sides together. |
| 3 | Decryption failure has no recovery path; no integrity check | data-safety | major | **v1.2.** Detect "key present but data won't decrypt", say so, and route to backup restore instead of minting a new key over the user's data. |
| 4 | Write failures unhandled; app-lock/reminders toggles optimistic with no rollback | data-safety | major | **v1.2.** Cheap: wrap the writes, `reportError`, roll the toggle back. The app-lock case is security-visible. |
| 5 | Section 199A / QBI deduction not modelled at all | correctness | major | **v1.2 if the simple form is acceptable** (`min(20%·QBI, 20%·pre-QBI taxable income)` is exact at gig incomes); otherwise **disclose it in the estimate's assumptions this release** and implement later. |
| 6 | No 1099-NEC / 1099-K reconciliation | category-gap | major | **Later** — but schedule it for the release that lands before January; it is the app's highest-stakes moment of the year. |
| 7 | Standard mileage is the only vehicle-expense method | category-gap | major | **Later.** Needs a vehicle record and a depreciation model. A "you may be better off with actual expenses" prompt is a cheap v1.2 down payment. |
| 8 | Missing-year config falls back forward, including for past years | correctness | minor | **v1.2** for the guard (refuse, or name which year's figures are in use); shipping real past-year configs is later. |
| 9 | Business loss floored at zero instead of offsetting other income | correctness | minor | **Later.** Overstates tax (safe direction), but visible to mileage-heavy part-timers. |
| 10 | "Clear All Data" leaves `appSettings` behind while the policy says otherwise | compliance | minor | **v1.2.** One array entry at `repository.ts:208`. |
| 11 | No iOS privacy manifest | compliance | minor | **v1.2 — check before submitting.** If Expo is not generating one, this blocks the upload. |
| 12 | `ITSAppUsesNonExemptEncryption: false` with AES-256 at rest | compliance | minor | **v1.2 to verify**, not necessarily to change. Needs an authoritative read of Apple's exemption list. |
| 13 | Live privacy page contradicts itself on whether analytics are active | compliance | minor | **v1.2.** Delete one sentence at `docs/privacy.html:200`. |
| 14 | Single state of residence; no multi-state / part-year | category-gap | minor | **Later.** Real, but a proper nonresident-credit model is its own project. |

---

## Checked and found sound

Recorded so a later pass does not re-spend budget here.

- `bracketMath.ts:9-24` — progressive bracket application is correct: `break` on
  `taxableIncome <= bracket.min`, `min(taxableIncome, bracket.max)` upper bound, `max(0, …)` on the
  amount, and the open-ended top bracket (`max === null`) handled. No off-by-one at a threshold, and
  the detailed/total forms are literally the same loop so they cannot drift.
- `seTax.ts:24-40` — the 92.35% factor, 12.4%/2.9% rates, and the reduction of **both** the SS wage
  base and the Additional Medicare threshold by `otherFicaWages` all match Schedule SE / IRC
  §3101(b)(2). `deductibleSeTaxPortion` correctly **excludes** the Additional Medicare Tax from the
  halving.
- `childTaxCredit.ts:27-37` — phase-out is `ceil(excess / 1000) × 50`, correct for a reduction "per
  $1,000 or fraction thereof"; nonrefundable portion capped at income tax; ACTC capped at both the
  per-child cap and 15% of earned income over $2,500; and the credit correctly does **not** offset SE
  tax.
- `computeSafeHarbor` (`calculations.ts:480-532`) — 90% / 100% / 110%, the $150,000 ($75,000 MFS) AGI
  split, the $1,000 de-minimis measured after withholding, and "the smaller of the two legs" all match
  Form 2210. It correctly refuses to claim the prior-year leg without the user's own figure.
- **Money math.** Plain `number` throughout with no rounding until display, which is the right call at
  these magnitudes — float error is ~1e-17 against dollar figures and cannot move a cent. No
  division-by-zero found: `effectiveHourlyRate` guards `totalHoursWorked <= 0`
  (`calculations.ts:222`) and `effectiveSetAsideRate` guards `netProfitAfterMileage > 0`
  (`estimate.ts:79-80`). `totalCustomExpenses` floors negative amounts (`calculations.ts:160`).
  Unsupported state codes return a structured `supported: false` rather than throwing
  (`stateTax.ts:101-114`).
- **Demo-mode isolation** (`repository.ts:30-32`) — every read and write in that module genuinely
  routes through `backend()`; the claim in its comment holds for that file, and the two deliberate
  bypasses are the documented premium-cache pair.
- **State coverage** — all 50 states + DC are present in both the 2026 and the 2025 configs
  (51 unique top-level entries each); the "they'll report unsupported for 2025" warning at
  `2026.ts:56` is stale —
  the backfill was done. The disclosed 2025 approximations (2026 local-tax maps reused; MD Allegany
  and Kent county rates therefore slightly overstated for 2025) are documented at `2025.ts:128-136`
  and are not new findings.
