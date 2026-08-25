/**
 * The catalogue's public shape — what the API will return and what the cards render. Deliberately
 * outside `$lib/server/`: the components need the type, and only the data is secret.
 *
 * Every amount is an integer number of cents. No floats anywhere in a money path.
 */
export type PhoneItem = {
	phoneId: number;
	sku: string;
	brand: string;
	model: string;
	colour: string;
	storageGb: number;
	/** What the phone costs outright, with no finance. */
	cashPriceCents: number;
	/** Due at purchase. `depositCents + principalCents === cashPriceCents`. */
	depositCents: number;
	/** What is actually loaned. */
	principalCents: number;
	/** Principal plus interest — the total repayable over the term. */
	loanAmountCents: number;
	/** `loanAmountCents / LOAN_TERM_DAYS`. Hero price on the card. */
	dailyCents: number;
};

/** Every loan is one year, repaid daily. Moves to `packages/domain` in phase 2. */
export const LOAN_TERM_DAYS = 360;
