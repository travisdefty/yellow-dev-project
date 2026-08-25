import { fail, redirect } from '@sveltejs/kit';
import { isAffordable, minimumIncomeFor, quote, submitSchema } from '@yellow/domain';
import { formatCents } from '$lib/format';
import { clearDraft, readDraft, requireRiskGroup, requireStep } from '$lib/server/draft';
import { pricingFor } from '$lib/server/fixtures/pricing';
import { phoneFixtures } from '$lib/server/fixtures/phones';
import type { Actions, PageServerLoad } from './$types';

/**
 * The same seam as the catalogue: the quote is assembled on the server and handed over finished.
 * This is now the phone the applicant actually chose — looked up from the draft's `phoneId` and
 * priced at their own risk band — rather than a hardcoded fixture; the numbers still arrive this
 * way because a priced amount has no business being in a client bundle.
 */
export const load: PageServerLoad = ({ locals, cookies }) => {
	const draft = locals.draft ?? readDraft(cookies);
	requireStep(draft, '/apply/review');

	const phone = phoneFixtures.find((p) => p.phoneId === draft.phoneId);
	// The id in the draft is server-written (see the phone step's action), so this only fires if
	// the catalogue itself has changed under a stale draft — treat it the same as never choosing.
	if (!phone) redirect(303, '/apply/phone');

	const quoted = quote(phone.cashPriceCents, pricingFor(requireRiskGroup(draft)));
	return {
		phone: { ...phone, ...quoted },
		interestCents: quoted.loanAmountCents - quoted.principalCents,
		// Everything the applicant entered, played back for checking. Named explicitly rather than
		// spreading the draft: `riskGroup`, `identityAcceptedAt` and `applicationId` are server-side
		// facts, and a review screen is exactly where a careless spread would leak them to the client.
		applicant: {
			firstName: draft.firstName ?? '',
			lastName: draft.lastName ?? '',
			mobile: draft.mobile ?? '',
			idNumber: draft.idNumber ?? '',
			dob: draft.dob ?? '',
			monthlyIncomeCents: draft.monthlyIncomeCents ?? 0
		}
	};
};

export const actions = {
	default: async ({ request, cookies }) => {
		const draft = readDraft(cookies);
		requireStep(draft, '/apply/review');

		const form = await request.formData();
		// A checkbox posts 'on' when ticked and nothing at all when not — there is no unchecked value.
		const parsed = submitSchema.safeParse({ consent: form.get('consent') === 'on' });
		if (!parsed.success) {
			return fail(400, { errors: { consent: 'Please agree before submitting.' } });
		}

		const phone = phoneFixtures.find((p) => p.phoneId === draft.phoneId);
		if (!phone) redirect(303, '/apply/phone');

		// Re-checked here even though the card already disabled the button for this phone: the UI
		// hiding a device is a hint, the server re-computing the quote from the stored draft is the
		// rule. Income or phone could each have changed since the card was rendered.
		const { dailyCents } = quote(phone.cashPriceCents, pricingFor(requireRiskGroup(draft)));
		const monthlyIncomeCents = draft.monthlyIncomeCents ?? 0;
		if (!isAffordable(monthlyIncomeCents, dailyCents)) {
			return fail(400, {
				message: `This phone needs a monthly income of at least ${formatCents(minimumIncomeFor(dailyCents))}. Choose a cheaper phone, or update what you earn.`
			});
		}

		// The reference is the token minted when they started (yl_app), not a number invented at the
		// end — the same id the record is keyed by in later phases. Clearing the draft means a
		// back-button return starts a fresh application rather than resurrecting a submitted one.
		const applicationId = draft.applicationId;
		clearDraft(cookies);
		redirect(303, `/apply/confirmation/${applicationId}`);
	}
} satisfies Actions;
