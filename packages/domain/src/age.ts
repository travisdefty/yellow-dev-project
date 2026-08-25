/**
 * Age and risk-band logic. Dates are 'YYYY-MM-DD' strings throughout, compared numerically
 * field-by-field rather than parsed into `Date` objects — string comparison at this resolution
 * is exact and avoids timezone and DST pitfalls entirely.
 */

export type RiskGroup = 'A' | 'B' | 'C';

export const MIN_AGE = 18;
export const MAX_AGE = 65;

/**
 * The ONLY impure function in this package. Everything else takes `today` as a parameter so it
 * stays pure and testable at exact boundaries — and so the server process's own timezone is
 * irrelevant, since South African eligibility must be judged in Africa/Johannesburg regardless
 * of where the code runs.
 */
export function todayInJohannesburg(): string {
	return new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg' }).format(new Date());
}

/**
 * Full years between `dobIso` and `todayIso`. `today` is a parameter rather than computed
 * internally: it makes the birthday boundary testable (someone whose birthday is today is that
 * age; one day earlier they are a year younger) and keeps the function pure.
 */
export function ageOn(dobIso: string, todayIso: string): number {
	const [dobYear, dobMonth, dobDay] = dobIso.split('-').map(Number);
	const [todayYear, todayMonth, todayDay] = todayIso.split('-').map(Number);

	let age = todayYear - dobYear;
	const birthdayNotYetReached =
		todayMonth < dobMonth || (todayMonth === dobMonth && todayDay < dobDay);
	if (birthdayNotYetReached) age -= 1;
	return age;
}

export const RISK_BANDS: readonly { group: RiskGroup; minAge: number; maxAge: number }[] = [
	{ group: 'A', minAge: 18, maxAge: 30 },
	{ group: 'B', minAge: 31, maxAge: 50 },
	{ group: 'C', minAge: 51, maxAge: 65 }
];

export function riskGroupFor(age: number): RiskGroup | null {
	const band = RISK_BANDS.find((b) => age >= b.minAge && age <= b.maxAge);
	return band ? band.group : null;
}
