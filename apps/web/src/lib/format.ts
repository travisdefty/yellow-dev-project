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
