/**
 * The catalogue's public shape — what the API will return and what the cards render. Deliberately
 * outside `$lib/server/`: the components need the type, and only the data is secret.
 *
 * Every amount is an integer number of cents. No floats anywhere in a money path.
 */
import type { Quote } from '@yellow/domain';

export type Phone = {
	phoneId: number;
	sku: string;
	brand: string;
	model: string;
	colour: string;
	storageGb: number;
	/** What the phone costs outright, with no finance. */
	cashPriceCents: number;
};

/**
 * A `Phone` with its quote attached — deposit, principal, loan amount and daily price, computed
 * by `quote()` against the applicant's risk band. This is what the card actually renders; a bare
 * `Phone` is only the catalogue row before pricing has been applied.
 */
export type QuotedPhone = Phone & Quote;

// Re-exported rather than declared here so there is exactly one definition of 360 in the repo.
export { LOAN_TERM_DAYS } from '@yellow/domain';
