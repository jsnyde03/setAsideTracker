# v1.2 gap scan — 2026-09-20

**Light audit. Two fresh agents, read-only, no sub-agents.** Commissioned by Jason 2026-09-20:
*"run a light audit with a fresh agent to determine any other true gaps that are missing."*

**Target version:** v1.2, at commit `1b2a682` (local `v1.2` branch, 8 commits ahead of `origin/v1.2`).

## Why this scan exists

Three gaps were found by Jason in conversation, not by any process:

1. The dashboard shows one year-to-date lump sum, making the set-aside untrackable.
2. Mileage is a hand-typed number — no assisted capture of any kind.
3. (Found while checking the above) Backup restore does no validation of entry contents.

Two of those are on the **core free-tier job**, and the v1.2 queue is heavily weighted toward
premium, platform and polish work. **The question this scan answers: what else is missing that
nobody has noticed?**

## The two lenses

| | lens | question |
|---|---|---|
| **A** | **The user's job, end to end** | Walk the real gig worker's workflow — log a shift → know what to set aside → actually pay quarterly → file at tax time. Where does the app drop them? |
| **B** | **Category expectations + correctness/compliance** | What does a gig-work tax app need that this one lacks? Where is it wrong, unsafe, or non-compliant rather than merely incomplete? |

## The hard rule given to both agents

**Do not re-report what is already known.** The full known-items ledger (active queue, deferred
backlog, open items, and the three gaps above) was given to each agent as an exclusion list. A
finding that names something already on that ledger is noise, and the brief says so. The scan is
graded on gaps that are *new*.

## Outputs

- `lens-a-user-job.md`
- `lens-b-category-correctness.md`
- `SYNTHESIS.md` — written by the session after both land, with routing decisions

## Status — ✅ COMPLETE 2026-09-20

**28 findings across both lenses. Three blockers, all confirmed by this session against the code
before admission** — the agents' stated mechanisms were treated as hypotheses, and re-verification is
why one citation error and one bounded blast radius are on the record instead of in the plan.

| | |
|---|---|
| **Lens A** | 14 findings · 2 blockers · ~30 reads · `lens-a-user-job.md` |
| **Lens B** | 14 findings · 1 blocker · ~43 reads · `lens-b-category-correctness.md` |

### The three blockers — all understate what the user owes, all live in v1.1.1

1. **Safe harbor compares a partial-year tax to a full-year withholding.** `noPenaltyExpected` comes
   back `true` through both spring deadlines for a W2+gig user.
2. **Married Filing Jointly collects no spouse income.** `grep -ri spouse` returns nothing repo-wide.
3. **GA, SC and MN dependent exemptions are modelled as dollar-for-dollar tax credits.** Confirmed on
   both halves — the code half by reading it, the tax-law half against O.C.G.A. §48-7-26, SC Code
   §12-6-1140 and the MN Department of Revenue. The values are right; the slot is wrong.

All three became **1.2.2**, which is sequenced ahead of every feature item.

### What re-verification changed

- **Lens B's 2026 citations named the wrong directory** (`taxYears/` for `stateTaxConfigs/`). Line
  numbers were exact. The finding stood; the citation did not.
- **Lens A bounded its own blocker** — it checked whether the safe-harbor asymmetry also broke the
  headline `netAmountToSetAside`, found it did not, and said so rather than claiming the larger bug.
  That restraint is the main reason the rest of its list was trusted.
- **One finding was reached by both lenses independently** (a loss year floored to zero), from the
  user's side and the engine's side. That convergence moved it up.
- ⚠️ **Lens B's worked example for the dependent-withholding asymmetry was not independently
  re-derived** and is recorded as indicative, not as a measured figure.

### What the scan also certified as sound

Recorded so nobody re-spends budget: `bracketMath`, `seTax` (wage base and Additional-Medicare
threshold both correctly reduced by W2 FICA wages), `childTaxCredit` phase-out and ACTC caps,
`computeSafeHarbor`'s own 90/100/110 · $150k/$75k · $1,000 de-minimis constants against Form 2210,
float money math at these magnitudes, demo-mode isolation, and all 51 state entries present in both
year configs.

### Routing

Version-necessary + low-risk folded into v1.2 (blockers → 1.2.2, data safety → 1.2.3, four small
fixes folded into 1.2.2 / 1.2.4 / 1.2.10); everything else filed to the deferred backlog in
[V1_2_EXECUTION_PLAN.md](../../../V1_2_EXECUTION_PLAN.md), with the fold-in decisions recorded there
too so the routing is auditable rather than implicit.
