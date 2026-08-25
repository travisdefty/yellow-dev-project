import { fail, redirect } from '@sveltejs/kit';
import { requireStep, writeDraft } from '$lib/server/draft';
import type { Actions, PageServerLoad } from './$types';

/**
 * The same seam as the catalogue: the quote is assembled on the server and handed over finished.
 * It rides on the application itself (`selection`), priced from the applicant's own band, so the
 * summary and the record cannot disagree about what is being offered.
 */
export const load: PageServerLoad = ({ locals }) => {
	const draft = locals.draft!;
	requireStep(draft, 'submit');

	// `selection` is absent only if the catalogue changed under a stale record — a phone that was
	// chosen and has since been withdrawn. Treated the same as never having chosen one.
	if (!draft.selection) redirect(303, '/apply/phone');

	return {
		phone: draft.selection,
		interestCents: draft.selection.loanAmountCents - draft.selection.principalCents,
		// Everything the applicant entered, played back for checking. Named explicitly rather than
		// spreading the record: `riskGroup`, `identityAcceptedAt` and the application id are
		// server-side facts, and a review screen is exactly where a careless spread leaks them.
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
	default: async (event) => {
		const { request, locals } = event;
		const draft = locals.draft!;
		requireStep(draft, 'submit');

		const form = await request.formData();
		// A checkbox posts 'on' when ticked and nothing at all when not — there is no unchecked value.
		// Checked here rather than forwarded, because `submitSchema` requires consent to be literally
		// true: an unticked box is not a body the API accepts, so there is nothing to ask it about.
		if (form.get('consent') !== 'on') {
			return fail(400, { errors: { consent: 'Please agree before submitting.' } });
		}

		// The API re-checks affordability from the stored record and recomputes the quote from the
		// pricing rows before writing any of it down. That re-check is not redundant with the phone
		// step's: income can have moved since the card was rendered. It is also where the database
		// refuses a second application on the same ID — which arrives here as a field error rather
		// than a 500 on the last screen of the flow.
		const result = await writeDraft(event, { step: 'submit', data: { consent: true } });
		if (!result.ok) return fail(result.status, result.failure);

		// The reference is the id minted when they started, not a number invented at the end — the
		// same id the record is keyed by. The application is now `submitted`, which is what stops a
		// back-button return from resurrecting it; no cookie has to be cleared to make that true.
		redirect(303, `/apply/confirmation/${result.draft.applicationId}`);
	}
} satisfies Actions;
