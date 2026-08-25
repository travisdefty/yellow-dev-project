/**
 * Barrel export for `@yellow/domain`. Consumers (the SvelteKit app, and later the Fastify API)
 * import from here rather than reaching into individual modules.
 */

export { LOAN_TERM_DAYS, applyBps, parseRandsToCents } from './money.ts';
export type { Cents, Bps } from './money.ts';

export { isValidSaId, idBirthDigits } from './sa-id.ts';

export { MIN_AGE, MAX_AGE, todayInJohannesburg, ageOn, RISK_BANDS, riskGroupFor } from './age.ts';
export type { RiskGroup } from './age.ts';

export { quote } from './pricing.ts';
export type { PricingRow, Quote } from './pricing.ts';

export { MONTHLY_DAYS, INCOME_MULTIPLE, minimumIncomeFor, isAffordable } from './eligibility.ts';

export {
	detailsSchema,
	incomeSchema,
	phoneSelectionSchema,
	submitSchema
} from './schemas.ts';
export type { DetailsInput, IncomeInput, PhoneSelectionInput, SubmitInput } from './schemas.ts';
