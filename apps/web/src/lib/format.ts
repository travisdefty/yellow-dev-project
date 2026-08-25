/**
 * Formatters are built once at module scope, not per call: constructing an `Intl.NumberFormat` is
 * the expensive part, and the catalogue calls these three times per card.
 */
const whole = new Intl.NumberFormat('en-ZA', {
	style: 'currency',
	currency: 'ZAR',
	minimumFractionDigits: 0,
	maximumFractionDigits: 0
});

const exact = new Intl.NumberFormat('en-ZA', {
	style: 'currency',
	currency: 'ZAR',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2
});

/** Rands only. For prices large enough that the cents are noise — cash price, deposit, total. */
export function formatCents(cents: number): string {
	return whole.format(cents / 100);
}

/** Rands and cents. For the daily instalment, where a difference of 50c is the whole decision. */
export function formatCentsExact(cents: number): string {
	return exact.format(cents / 100);
}

const longDate = new Intl.DateTimeFormat('en-ZA', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	// Fixed to the wizard's own timezone. A bare 'YYYY-MM-DD' parses as UTC midnight, which renders
	// as the previous day for any viewer west of Greenwich — a date of birth that shifts by a day
	// depending on where the browser is standing is not a date of birth worth showing.
	timeZone: 'Africa/Johannesburg'
});

/** 'YYYY-MM-DD' as the applicant would read it back: 1 January 1966. */
export function formatDateIso(iso: string): string {
	return longDate.format(new Date(`${iso}T00:00:00+02:00`));
}

/** 0821234567 as 082 123 4567. Anything not a 10-digit local number is left exactly as given. */
export function formatMobile(mobile: string): string {
	return /^\d{10}$/.test(mobile)
		? `${mobile.slice(0, 3)} ${mobile.slice(3, 6)} ${mobile.slice(6)}`
		: mobile;
}
