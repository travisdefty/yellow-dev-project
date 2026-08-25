/**
 * Turns a cash price and a risk-group pricing row into a quote: deposit, principal, total loan
 * amount, and the daily instalment that repays it over `LOAN_TERM_DAYS`.
 */

import { applyBps, LOAN_TERM_DAYS } from './money.ts';
import type { Bps, Cents } from './money.ts';
import type { RiskGroup } from './age.ts';

export type PricingRow = { riskGroup: RiskGroup; depositBps: Bps; interestBps: Bps };

export type Quote = {
	depositCents: Cents;
	principalCents: Cents;
	loanAmountCents: Cents;
	dailyCents: Cents;
	/**
	 * What the applicant actually hands over: the deposit plus every daily instalment. Deliberately
	 * not `depositCents + loanAmountCents` — `dailyCents` rounds up, so 360 instalments collect a
	 * few cents more than the loan, and this is the honest total rather than the arithmetic one.
	 */
	totalPayableCents: Cents;
};

export function quote(
	cashPriceCents: Cents,
	row: Pick<PricingRow, 'depositBps' | 'interestBps'>
): Quote {
	const depositCents = applyBps(cashPriceCents, row.depositBps);
	// Subtracted from cash price rather than computed via (1 - depositBps/10000): this way
	// deposit + principal === cashPrice holds by construction and can never drift a cent under
	// independent rounding of the two halves.
	const principalCents = cashPriceCents - depositCents;
	if (depositCents + principalCents !== cashPriceCents) {
		throw new Error('deposit + principal must equal cash price');
	}

	const loanAmountCents = principalCents + applyBps(principalCents, row.interestBps);
	// Rounds up: 360 instalments of a rounded-down daily amount would undercollect the loan by
	// the end of the term.
	const dailyCents = Math.ceil(loanAmountCents / LOAN_TERM_DAYS);
	const totalPayableCents = depositCents + dailyCents * LOAN_TERM_DAYS;

	return { depositCents, principalCents, loanAmountCents, dailyCents, totalPayableCents };
}
