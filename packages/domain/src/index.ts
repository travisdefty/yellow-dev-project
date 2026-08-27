/**
 * Barrel export for `@yellow/domain`. Consumers (the SvelteKit app, and later the Fastify API)
 * import from here rather than reaching into individual modules.
 */

export {
	LOAN_TERM_DAYS,
	MIN_MONTHLY_INCOME_CENTS,
	MAX_MONTHLY_INCOME_CENTS,
	applyBps,
	parseRandsToCents,
	formatCentsAsRandsInput
} from './money.ts';
export type { Cents, Bps } from './money.ts';

export { isValidSaId, idBirthDigits } from './sa-id.ts';

export { MIN_AGE, MAX_AGE, todayInJohannesburg, ageOn, RISK_BANDS, riskGroupFor } from './age.ts';
export type { RiskGroup } from './age.ts';

export { quote } from './pricing.ts';
export type { PricingRow, Quote } from './pricing.ts';

export { MONTHLY_DAYS, INCOME_MULTIPLE, minimumIncomeFor, isAffordable } from './eligibility.ts';

export {
	composeDob,
	detailsSchema,
	detailsStepSchema,
	incomeSchema,
	phoneSelectionSchema,
	submitSchema,
	patchSchema
} from './schemas.ts';
export type {
	DetailsInput,
	DetailsStepInput,
	IncomeInput,
	PhoneSelectionInput,
	SubmitInput,
	PatchBody
} from './schemas.ts';
