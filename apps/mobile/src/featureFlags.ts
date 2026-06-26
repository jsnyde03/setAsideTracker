/**
 * W2 tax modeling is disabled for v1.0. Real-device testing found three compounding bugs in how
 * take-home pay was converted to taxable income and how W2 withholding was credited back against
 * the year's tax liability — see IMPLEMENTATION_PLAN.md's v1.1 section for the full writeup and
 * the pay-stub/YTD-actuals-based redesign planned to replace this. The underlying logic in
 * calculations.ts/w2Withholding.ts and its tests are intentionally left in place (not deleted) as
 * a starting point for that rebuild — this flag just keeps the UI from ever setting
 * `hasW2Job: true` in the meantime, so no real user can hit the bug.
 */
export const W2_JOB_SUPPORT_ENABLED = false;
