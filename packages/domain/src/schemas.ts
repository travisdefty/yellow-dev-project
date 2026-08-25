/**
 * zod schemas for the four steps of the application flow. Field-level rules live on the
 * individual properties; the rules that only make sense once every field is present — ID/DOB
 * agreement, age band — live in the `superRefine` on `detailsSchema`.
 */

import { z } from 'zod';
import { isValidSaId, idBirthDigits } from './sa-id.ts';
import { ageOn, riskGroupFor, todayInJohannesburg } from './age.ts';

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Pure arithmetic, not `new Date(...)`: this package's only impure operation is the clock helper
// in age.ts, so calendar validity has to be checked by hand instead of via Date's own normalising
// parser (which would silently accept '2024-02-30' as March 1st).
function isRealCalendarDate(iso: string): boolean {
	const [year, month, day] = iso.split('-').map(Number);
	if (month < 1 || month > 12) return false;
	const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return day >= 1 && day <= daysInMonth[month - 1];
}

export const detailsSchema = z
	.strictObject({
		firstName: z.string().trim().min(1).max(60),
		lastName: z.string().trim().min(1).max(60),
		mobile: z
			.string()
			.regex(/^0[6-8]\d{8}$/, 'Enter a 10-digit South African mobile number, starting 06, 07 or 08.'),
		idNumber: z.string().regex(/^\d{13}$/, 'ID number must be exactly 13 digits.'),
		dob: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a date as YYYY-MM-DD.')
			.refine(isRealCalendarDate, 'Enter a real calendar date.')
	})
	.superRefine((data, ctx) => {
		if (!isValidSaId(data.idNumber)) {
			ctx.addIssue({
				code: 'custom',
				path: ['idNumber'],
				message: 'This ID number is not recognised. Check the digits and try again.'
			});
			// One clear error beats two: skip the ID/DOB agreement check on an already-invalid ID.
			return;
		}

		const idBirth = idBirthDigits(data.idNumber);
		const dobBirth = data.dob.slice(2, 4) + data.dob.slice(5, 7) + data.dob.slice(8, 10);
		if (idBirth !== dobBirth) {
			// Worded as a typo, not a rejection: this is a data-entry mismatch, not an eligibility
			// failure — the applicant may simply have fat-fingered one of the two fields.
			const message = 'Your ID number and date of birth do not agree. One of them has a typo.';
			ctx.addIssue({ code: 'custom', path: ['idNumber'], message });
			ctx.addIssue({ code: 'custom', path: ['dob'], message });
		}

		const age = ageOn(data.dob, todayInJohannesburg());
		if (riskGroupFor(age) === null) {
			ctx.addIssue({
				code: 'custom',
				path: ['dob'],
				message: 'Applicants must be between 18 and 65 years old.'
			});
		}
	});

export type DetailsInput = z.infer<typeof detailsSchema>;

export const incomeSchema = z.strictObject({
	monthlyIncomeCents: z.int().positive()
});

export type IncomeInput = z.infer<typeof incomeSchema>;

// Nothing priced here on purpose: no rates, no risk group. The client only names which phone it
// wants — the server prices it, using the applicant's own risk group, from trusted data.
export const phoneSelectionSchema = z.strictObject({
	phoneId: z.int().positive()
});

export type PhoneSelectionInput = z.infer<typeof phoneSelectionSchema>;

export const submitSchema = z.strictObject({
	consent: z.literal(true)
});

export type SubmitInput = z.infer<typeof submitSchema>;
