/**
 * Money primitives. Every amount in this package is an integer number of cents — no floats,
 * ever, on a money path. Basis points (1/100th of a percent) are the only other unit in play.
 */

export type Cents = number;
export type Bps = number;

/** Every loan is one year, repaid daily. */
export const LOAN_TERM_DAYS = 360;

export function applyBps(cents: Cents, bps: Bps): Cents {
	return Math.round((cents * bps) / 10_000);
}

/**
 * Accepts what a South African actually types: "R 12 500", "12500", "12 500,50", "12,500.50",
 * "R12500.50". Currency symbol and whitespace (including non-breaking space) are stripped first;
 * of the remaining `,`/`.` separators, all but the last are thousands separators, and the last is
 * only a decimal point if it is followed by exactly 1 or 2 digits — otherwise it too is a
 * thousands separator (e.g. "12.500" means twelve thousand five hundred, not 12.5).
 */
export function parseRandsToCents(input: string): Cents | null {
	const stripped = input.replace(/[R\s ]/gi, '');
	if (stripped.length === 0) return null;
	if (!/^[0-9,.]+$/.test(stripped)) return null;

	const separatorPositions: number[] = [];
	for (let i = 0; i < stripped.length; i++) {
		if (stripped[i] === ',' || stripped[i] === '.') separatorPositions.push(i);
	}

	let integerPart: string;
	let fractionPart: string;

	if (separatorPositions.length === 0) {
		integerPart = stripped;
		fractionPart = '';
	} else {
		const lastPos = separatorPositions[separatorPositions.length - 1];
		const afterLast = stripped.slice(lastPos + 1);
		const lastIsDecimal = /^\d{1,2}$/.test(afterLast);

		if (lastIsDecimal) {
			integerPart = stripped.slice(0, lastPos).replace(/[,.]/g, '');
			fractionPart = afterLast;
		} else {
			integerPart = stripped.replace(/[,.]/g, '');
			fractionPart = '';
		}
	}

	if (integerPart.length === 0) return null;
	if (!/^\d+$/.test(integerPart)) return null;
	if (fractionPart.length > 2) return null;

	const cents = fractionPart.padEnd(2, '0');
	return Number(integerPart) * 100 + Number(cents || '0');
}
