/**
 * Affordability check: an applicant's declared monthly income must exceed a multiple of the
 * daily instalment.
 */

import type { Cents } from './money.ts';

export const MONTHLY_DAYS = 30;
export const INCOME_MULTIPLE = 10;

/** Exists so the UI can state the number the applicant needs, rather than just refuse. */
export function minimumIncomeFor(dailyCents: Cents): Cents {
	return dailyCents * MONTHLY_DAYS * INCOME_MULTIPLE;
}

export function isAffordable(monthlyIncomeCents: Cents, dailyCents: Cents): boolean {
	return monthlyIncomeCents > minimumIncomeFor(dailyCents);
}
