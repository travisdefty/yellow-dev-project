import { fail, redirect } from '@sveltejs/kit';
import { nextStepAfter, writeDraft } from '$lib/server/draft';
import type { Actions, PageServerLoad } from './$types';

// The first step, so there is no completeness guard — everyone lands here with an empty or partial
// application and that is fine.
export const load: PageServerLoad = ({ url }) => ({
	// The prerendered start page posts the applicant's name here as a plain `?name=` query param via
	// a GET form, so the field arrives pre-filled without that page needing any server code of its
	// own. Only used as a fallback when the record doesn't already have a firstName.
	seededFirstName: url.searchParams.get('name')?.trim() || ''
});

export const actions = {
	default: async (event) => {
		const { request, locals, url } = event;
		const draft = locals.draft!;
		const form = await request.formData();

		// The form sends day/month/year as three separate inputs so it degrades cleanly without JS
		// (three plain <input>s beat one that needs script to compose a date as you type). The server
		// is the one place that has to glue them back into 'YYYY-MM-DD', padded to two digits, because
		// that composition has to happen whether or not the client ran any validation of its own.
		const dobDay = String(form.get('dobDay') ?? '').padStart(2, '0');
		const dobMonth = String(form.get('dobMonth') ?? '').padStart(2, '0');
		const dobYear = String(form.get('dobYear') ?? '');
		const composedDob = `${dobYear}-${dobMonth}-${dobDay}`;

		// Identity lock, the form's half: once identity has been accepted, the inputs are readonly and
		// this sends the stored values back rather than whatever arrived in the body. The API refuses
		// a *changed* ID or date of birth outright, so a client that shouldn't be sending these gets a
		// 400 rather than a silent discard — but the honest form never triggers it.
		const locked = Boolean(draft.identityAcceptedAt);

		// A checkbox posts 'on' when ticked and nothing at all when not. `detailsStepSchema` requires
		// consent to be literally true, so an unticked box is not a body the API accepts — refused
		// here with the same wording the schema uses, rather than inventing a `false` to send it.
		if (form.get('consent') !== 'on') {
			return fail(400, { errors: { consent: 'Please agree before continuing.' } });
		}

		const result = await writeDraft(event, {
			step: 'details',
			data: {
				firstName: String(form.get('firstName') ?? ''),
				lastName: String(form.get('lastName') ?? ''),
				mobile: String(form.get('mobile') ?? ''),
				idNumber: locked ? (draft.idNumber ?? '') : String(form.get('idNumber') ?? ''),
				dob: locked ? (draft.dob ?? '') : composedDob,
				consent: true
			}
		});

		// Validation lives in one place now — the schema the API parses with is the schema the browser
		// parses with — so this forwards the refusal rather than reproducing it. `failure` is already
		// shaped the way the page's `FieldError` slots expect.
		if (!result.ok) return fail(result.status, result.failure);

		// Names and a mobile number have no downstream effect — nothing later is derived from them —
		// so an edit that only touches these is always safe to return straight to review.
		redirect(303, nextStepAfter(result.draft, url, '/apply/income'));
	}
} satisfies Actions;
