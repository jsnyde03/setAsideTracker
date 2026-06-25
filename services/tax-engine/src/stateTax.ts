import type {
  FilingStatus,
  LocalTaxConfig,
  StateCreditConfig,
  StateTaxResult,
  TaxYearConfig,
} from "./types";
import { applyBrackets } from "./bracketMath";

/** Nonrefundable credit available before capping against tax owed — perFiler + perDependent. */
function calculateAvailableStateCredit(
  credit: StateCreditConfig | undefined,
  filingStatus: FilingStatus,
  numberOfChildren: number
): number {
  if (!credit) return 0;
  const perFiler = credit.perFiler?.[filingStatus] ?? 0;
  const perDependent = (credit.perDependent ?? 0) * Math.max(0, numberOfChildren);
  return perFiler + perDependent;
}

interface LocalTaxLookupResult {
  county?: string;
  localTax: number;
  localTaxSupported: boolean;
}

function resolveLocalTax(
  localTaxJurisdictions: Record<string, LocalTaxConfig> | undefined,
  county: string | undefined,
  taxableIncome: number,
  filingStatus: FilingStatus
): LocalTaxLookupResult {
  if (!localTaxJurisdictions) {
    // This state has no local tax layer at all — nothing to flag, nothing owed.
    return { county: undefined, localTax: 0, localTaxSupported: true };
  }

  if (!county) {
    return { county: undefined, localTax: 0, localTaxSupported: false };
  }

  const normalizedCounty = county.trim();
  const matchKey = Object.keys(localTaxJurisdictions).find(
    (key) => key.toLowerCase() === normalizedCounty.toLowerCase()
  );

  if (!matchKey) {
    return { county: normalizedCounty, localTax: 0, localTaxSupported: false };
  }

  const jurisdiction = localTaxJurisdictions[matchKey];
  const localTax =
    jurisdiction.type === "flat"
      ? taxableIncome * jurisdiction.rate
      : applyBrackets(taxableIncome, jurisdiction.brackets[filingStatus]);

  return { county: matchKey, localTax, localTaxSupported: true };
}

/**
 * State (and, where applicable, local/county) income tax estimate. This is a simplification of
 * real state tax law: it approximates state taxable income as (net SE profit - deductible SE tax
 * portion + other income) minus the state's own standard deduction, mirroring the federal AGI
 * calc, then applies any local tax to that same base. A nonrefundable per-filer/per-dependent
 * credit is applied where a state's config defines one (see StateCreditConfig) — but not every
 * state's real credit/deduction mechanism is modeled this way; some are flat dollar amounts this
 * can't represent (e.g. percentage-of-exemption formulas with their own phase-outs). Real
 * state/local tax codes have other conformity rules and adjustments beyond this too — see
 * ROADMAP §6 on the annual tax-config review process.
 */
export function calculateStateTax(
  netSelfEmploymentProfit: number,
  deductibleSeTaxPortion: number,
  otherTaxableIncome: number,
  filingStatus: FilingStatus,
  stateCode: string,
  config: TaxYearConfig,
  county?: string,
  numberOfChildren = 0
): StateTaxResult {
  const normalizedStateCode = stateCode.trim().toUpperCase();
  const stateConfig = config.stateTaxConfigs[normalizedStateCode];

  if (!stateConfig) {
    return {
      stateCode: normalizedStateCode,
      supported: false,
      taxableIncome: 0,
      stateLevelTax: 0,
      localTax: 0,
      localTaxSupported: true,
      stateTax: 0,
      creditApplied: 0,
    };
  }

  const stateAdjustedGrossIncome = Math.max(
    0,
    netSelfEmploymentProfit - deductibleSeTaxPortion + otherTaxableIncome
  );

  if (stateConfig.type === "none") {
    return {
      stateCode: normalizedStateCode,
      supported: true,
      taxableIncome: stateAdjustedGrossIncome,
      stateLevelTax: 0,
      localTax: 0,
      localTaxSupported: true,
      stateTax: 0,
      creditApplied: 0,
    };
  }

  let taxableIncome: number;
  let stateLevelTax: number;

  if (stateConfig.type === "flat") {
    const standardDeduction = stateConfig.standardDeduction?.[filingStatus] ?? 0;
    taxableIncome = Math.max(0, stateAdjustedGrossIncome - standardDeduction);
    stateLevelTax = taxableIncome * stateConfig.rate;
  } else {
    // stateConfig.type === "bracket"
    const standardDeduction = stateConfig.standardDeduction[filingStatus];
    taxableIncome = Math.max(0, stateAdjustedGrossIncome - standardDeduction);
    stateLevelTax = applyBrackets(taxableIncome, stateConfig.brackets[filingStatus]);
  }

  const local = resolveLocalTax(stateConfig.localTaxJurisdictions, county, taxableIncome, filingStatus);

  // Nonrefundable: capped at stateLevelTax, applied only against the state-level amount, never
  // against local tax — mirrors how the federal Child Tax Credit only offsets income tax, not SE
  // tax. stateLevelTax itself is left as the gross pre-credit figure (see its doc comment).
  const availableCredit = calculateAvailableStateCredit(stateConfig.credit, filingStatus, numberOfChildren);
  const creditApplied = Math.min(availableCredit, stateLevelTax);

  return {
    stateCode: normalizedStateCode,
    supported: true,
    taxableIncome,
    stateLevelTax,
    creditApplied,
    county: local.county,
    localTax: local.localTax,
    localTaxSupported: local.localTaxSupported,
    stateTax: stateLevelTax - creditApplied + local.localTax,
  };
}
