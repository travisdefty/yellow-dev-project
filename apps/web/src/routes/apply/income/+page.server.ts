import { fail, redirect } from '@sveltejs/kit';
import { parseRandsToCents } from '@yellow/domain';
import { nextStepAfter, requireStep, writeDraft } from '$lib/server/draft';
import type { Actions, PageServerLoad } from './$types';

// Deep-linking straight to /apply/income in a fresh browser (no application yet, or one that never
// finished details) must land back on details rather than crash or silently accept an income for
// an identity that was never confirmed.
export const load: PageServerLoad = ({ locals }) => {
	requireStep(locals.draft!, 'income');
	return {};
};

export const actions = {
	default: async (event) => {
		const { request, locals, url } = event;
		const before = locals.draft!;
		requireStep(before, 'income');

		const form = await request.formData();
		const monthlyIncomeCents = parseRandsToCents(String(form.get('income') ?? ''));

		// The error key here is 'income', not 'monthlyIncomeCents': the schema names the cents field,
		// but the form only has an input called 'income' with a FieldError sitting under it — the error
		// has to land on the thing the applicant can actually see.
		if (monthlyIncomeCents === null) {
			return fail(400, { errors: { income: 'Enter an amount, for example R 12 500.' } });
		}

		const result = await writeDraft(event, { step: 'income', data: { monthlyIncomeCents } });
		if (!result.ok) {
			const errors = result.failure.errors;
			return fail(result.status, {
				...result.failure,
				// Same remapping as above: a schema failure names monthlyIncomeCents, the input is called
				// income, and the message belongs under the input.
				errors: errors?.monthlyIncomeCents ? { income: errors.monthlyIncomeCents } : errors
			});
		}

		// Income is the only answer with a downstream dependent, and the API is what enforces that:
		// raising the affordability bar past the chosen phone clears it from the record. Detected by
		// comparing before and after rather than by a second rule here — one place owns the decision,
		// this only has to notice it happened and explain it.
		if (before.phoneId != null && result.draft.phoneId == null) {
			redirect(303, '/apply/phone?repick=1');
		}

		redirect(303, nextStepAfter(result.draft, url, '/apply/phone'));
	}
} satisfies Actions;
