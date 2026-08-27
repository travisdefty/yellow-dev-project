/**
 * zod schemas for the four steps of the application flow. Field-level rules live on the
 * individual properties; the rules that only make sense once every field is present — ID/DOB
 * agreement, age band — live in the `superRefine` on `detailsSchema`.
 */

import { z } from 'zod';
import { isValidSaId, idBirthDigits } from './sa-id.ts';
import { ageOn, riskGroupFor, todayInJohannesburg } from './age.ts';
import { MAX_MONTHLY_INCOME_CENTS, MIN_MONTHLY_INCOME_CENTS } from './money.ts';

function isLeapYear(year: number): boolean {
	return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

// Pure arithmetic, not `new Date(...)`: this package's only impure operation is the clock helper
// in age.ts, so calendar validity has to be checked by hand instead of via Date's own normalising
// parser (which would silently accept '2024-02-30' as March 1st).
function isRealCalendarDate(iso: string): boolean {
	if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
	const [year, month, day] = iso.split('-').map(Number);
	if (month < 1 || month > 12) return false;
	const daysInMonth = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
	return day >= 1 && day <= daysInMonth[month - 1];
}

function padDobPart(raw: string): string {
	const value = raw.trim();
	return /^\d+$/.test(value) ? value.padStart(2, '0') : value;
}

/**
 * Glue the three form fields into the ISO date the schema parses. Pads day/month only when they
 * are already all digits — letters stay put so they fail the digit regex rather than being
 * silently dropped.
 */
export function composeDob(year: string, month: string, day: string): string {
	return `${year.trim()}-${padDobPart(month)}-${padDobPart(day)}`;
}

const nameSchema = z
	.string()
	.trim()
	.min(1)
	.max(60)
	.regex(/^\p{L}[\p{L}\s'.-]*$/u, 'Enter a name using letters.');

export const detailsSchema = z
	.strictObject({
		firstName: nameSchema,
		lastName: nameSchema,
		mobile: z
			.string()
			.trim()
			.overwrite((s) => s.replace(/[\s-]/g, ''))
			.regex(
				/^0[6-8]\d{8}$/,
				'Enter a 10-digit South African mobile number, starting 06, 07 or 08.'
			),
		idNumber: z
			.string()
			.trim()
			.overwrite((s) => s.replace(/\s/g, ''))
			.regex(/^\d{13}$/, 'ID number must be exactly 13 digits.'),
		dob: z.string().superRefine((value, ctx) => {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
				ctx.addIssue({
					code: 'custom',
					message: 'Enter your date of birth as day, month and year.'
				});
				return;
			}
			if (!isRealCalendarDate(value)) {
				ctx.addIssue({ code: 'custom', message: 'Enter a real calendar date.' });
			}
		})
	})
	.superRefine((data, ctx) => {
		if (!isRealCalendarDate(data.dob)) return;
		if (!/^\d{13}$/.test(data.idNumber)) return;

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

/**
 * Identity plus the processing acknowledgement. Kept as an `.extend()` of `detailsSchema` rather
 * than folded into it, so ID/DOB/age stay one concern and the checkbox is the details *step*'s.
 */
export const detailsStepSchema = detailsSchema.extend({
	consent: z.literal(true, { error: 'Please agree before continuing.' })
});

export type DetailsStepInput = z.infer<typeof detailsStepSchema>;

export const incomeSchema = z.strictObject({
	monthlyIncomeCents: z.int().min(MIN_MONTHLY_INCOME_CENTS).max(MAX_MONTHLY_INCOME_CENTS)
});

export type IncomeInput = z.infer<typeof incomeSchema>;

// Nothing priced here on purpose: no rates, no risk group. The client only names which phone it
// wants — the server prices it, using the applicant's own risk group, from trusted data.
export const phoneSelectionSchema = z.strictObject({
	phoneId: z.int().positive()
});

export type PhoneSelectionInput = z.infer<typeof phoneSelectionSchema>;

export const submitSchema = z.strictObject({});

export type SubmitInput = z.infer<typeof submitSchema>;

/**
 * The `PATCH /applications/:id` body: one step's worth of answers, and nothing else.
 *
 * Strict at both levels, which is the point. The outer `strictObject` is what turns a posted
 * `riskGroup`, `depositBps` or `dailyCents` into a 400 rather than a silently ignored field — the
 * client names which phone it wants and what it earns, and never anything carrying a price. The
 * inner schemas are the same four the browser validates against, so the rule the applicant sees
 * and the rule the server enforces are one object, not two that agree today.
 *
 * Nested under `data` rather than flattened onto the discriminator, so each step can keep its own
 * schema — details carries a `superRefine`, and submit is an empty object on purpose: consent is
 * recorded on the details write, and submit's job is to store the quote.
 *
 * It lives in the domain package rather than in the web app for the same reason the other four do:
 * this is the API's contract, and the API is meant to be portable to Fastify. Keeping it here also
 * keeps zod a dependency of exactly one package.
 */
export const patchSchema = z.discriminatedUnion('step', [
	z.strictObject({ step: z.literal('details'), data: detailsStepSchema }),
	z.strictObject({ step: z.literal('income'), data: incomeSchema }),
	z.strictObject({ step: z.literal('phone'), data: phoneSelectionSchema }),
	z.strictObject({ step: z.literal('submit'), data: submitSchema })
]);

export type PatchBody = z.infer<typeof patchSchema>;
