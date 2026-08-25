import { fail, redirect } from '@sveltejs/kit';
import { incomeSchema, isAffordable, parseRandsToCents, quote } from '@yellow/domain';
import type { Draft } from '$lib/server/draft';
import { nextStepAfter, readDraft, requireRiskGroup, requireStep, writeDraft } from '$lib/server/draft';
import { fieldErrors } from '$lib/field-errors';
import { pricingFor } from '$lib/server/fixtures/pricing';
import { phoneFixtures } from '$lib/server/fixtures/phones';
import type { Actions, PageServerLoad } from './$types';

// Deep-linking straight to /apply/income in a fresh browser (no cookie yet, or one that never
// finished details) must land back on details rather than crash or silently accept an income for
// an identity that was never confirmed.
export const load: PageServerLoad = ({ locals, cookies }) => {
	requireStep(locals.draft ?? readDraft(cookies), '/apply/income');
	return {};
};

export const actions = {
	default: async ({ request, cookies, url }) => {
		const draft = readDraft(cookies);
		requireStep(draft, '/apply/income');

		const form = await request.formData();
		const monthlyIncomeCents = parseRandsToCents(String(form.get('income') ?? ''));

		// The error key here is 'income', not 'monthlyIncomeCents': the schema names the cents field,
		// but the form only has an input called 'income' and a FieldError sitting under it — the error
		// has to land on the thing the applicant can actually see, so both the parse failure and any
		// schema failure below get remapped onto the same key.
		if (monthlyIncomeCents === null) {
			return fail(400, { errors: { income: 'Enter an amount, for example R 12 500.' } });
		}

		const parsed = incomeSchema.safeParse({ monthlyIncomeCents });
		if (!parsed.success) {
			return fail(400, { errors: { income: fieldErrors(parsed.error).monthlyIncomeCents } });
		}

		// Income is the only answer in this wizard that a later step depends on, so it is the only one
		// whose edit can invalidate work already done: affordability is measured against it, and a
		// phone chosen under the old figure may not survive the new one. Left alone, that phone would
		// sit in the draft until the submit button, and the applicant would be turned away on the last
		// screen for a decision they made three screens earlier. Dropping it here moves the refusal to
		// the moment it becomes true, and `firstIncompleteStep` then sends them back to choose again.
		//
		// Nothing else needs invalidating: names and mobile feed nothing, and ID and date of birth are
		// locked once accepted, so the risk group the quote is built from cannot move underneath it.
		const patch: Partial<Draft> = { monthlyIncomeCents: parsed.data.monthlyIncomeCents };
		const chosen = phoneFixtures.find((phone) => phone.phoneId === draft.phoneId);
		const stillAffordable =
			chosen &&
			isAffordable(
				parsed.data.monthlyIncomeCents,
				quote(chosen.cashPriceCents, pricingFor(requireRiskGroup(draft))).dailyCents
			);
		// JSON.stringify drops undefined, so this genuinely removes the key rather than storing a hole.
		if (chosen && !stillAffordable) patch.phoneId = undefined;

		const updated = writeDraft(cookies, patch);
		if (chosen && !stillAffordable) redirect(303, '/apply/phone?repick=1');
		redirect(303, nextStepAfter(updated, url, '/apply/phone'));
	}
} satisfies Actions;
