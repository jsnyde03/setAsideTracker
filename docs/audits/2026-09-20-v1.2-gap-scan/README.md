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

## Status

⏳ Dispatched 2026-09-20. Findings are routed per the standing rule: version-necessary + low-risk
folds into v1.2; everything else goes to the versioned deferred backlog in
[V1_2_EXECUTION_PLAN.md](../../../V1_2_EXECUTION_PLAN.md).
