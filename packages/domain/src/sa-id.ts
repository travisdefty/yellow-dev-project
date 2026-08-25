/**
 * South African ID number checks: structural validity (Luhn) and the birth-date digits it
 * encodes. Deliberately does not interpret citizenship/gender digits — this package only needs
 * validity and date of birth.
 */

export function isValidSaId(id: string): boolean {
	if (!/^\d{13}$/.test(id)) return false;

	let sum = 0;
	for (let i = 0; i < 13; i++) {
		let digit = Number(id[i]);
		// Luhn: double every second digit from the right (odd positions from the left, 0-indexed).
		if (i % 2 === 1) {
			digit *= 2;
			if (digit > 9) digit -= 9;
		}
		sum += digit;
	}
	return sum % 10 === 0;
}

/**
 * Returns the leading 'YYMMDD' digits, or null if `id` isn't 13 digits.
 *
 * Deliberately does NOT guess a century: '900101' could be 1990 or 1890, and that guess IS the
 * age gate we're trying to enforce — a wrong guess would let an ineligible applicant through or
 * reject an eligible one. The caller supplies the century via the separately-collected date of
 * birth and compares digit strings instead.
 */
export function idBirthDigits(id: string): string | null {
	if (!/^\d{13}$/.test(id)) return null;
	return id.slice(0, 6);
}
