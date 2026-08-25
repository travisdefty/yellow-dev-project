import { fail, redirect } from '@sveltejs/kit';
import { requireStep, writeDraft } from '$lib/server/draft';
import type { PhoneListResult } from '$lib/server/api/phones';
import type { Actions, PageServerLoad } from './$types';

/**
 * The seam, now genuinely across the wire.
 *
 * Everything priced is decided by `GET /api/phones` — quoted at the applicant's own band, filtered
 * to what they can afford, and paginated — and arrives here as finished cents. The browser is never
 * given a rate, a term or an arithmetic operator, and neither is this file: it forwards a page
 * number and renders what comes back.
 *
 * The application id goes in the query rather than the risk group, because a risk group in a URL is
 * a rate the client got to choose. The band is read from the record, where the server put it.
 */
export const load: PageServerLoad = async ({ locals, url, fetch }) => {
	const draft = locals.draft!;
	requireStep(draft, 'phone');

	const params = new URLSearchParams({ applicationId: draft.applicationId });
	// Absent means "no preference", which is what lets the API default to the page holding the phone
	// already chosen rather than always page 1.
	const page = url.searchParams.get('page');
	if (page !== null) params.set('page', page);

	const response = await fetch(`/api/phones?${params}`);
	if (!response.ok) redirect(303, '/apply/income');

	return {
		...((await response.json()) as PhoneListResult),
		// So a phone already chosen comes back marked rather than looking untouched. Without it,
		// walking forward from an edited earlier step reads as though the selection was thrown away.
		selectedPhoneId: draft.phoneId,
		// Set by the income step when a raised affordability bar knocked out the phone they had.
		repick: url.searchParams.get('repick') === '1'
	};
};

export const actions = {
	default: async (event) => {
		const { request, locals } = event;
		requireStep(locals.draft!, 'phone');

		const form = await request.formData();
		const phoneId = Number(form.get('phoneId'));

		// The API refuses a made-up id, and refuses one the applicant cannot afford — a hidden card is
		// not a refusal, and the endpoint is a URL like any other. Forwarded rather than re-checked so
		// there is exactly one place that decides.
		const result = await writeDraft(event, { step: 'phone', data: { phoneId } });
		if (!result.ok) return fail(result.status, result.failure);

		redirect(303, '/apply/review');
	}
} satisfies Actions;
