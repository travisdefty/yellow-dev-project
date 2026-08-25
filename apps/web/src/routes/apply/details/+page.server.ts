import { fail, redirect } from '@sveltejs/kit';
import { detailsSchema, ageOn, riskGroupFor, todayInJohannesburg } from '@yellow/domain';
import { nextStepAfter, readDraft, writeDraft } from '$lib/server/draft';
import { fieldErrors } from '$lib/field-errors';
import type { Actions, PageServerLoad } from './$types';

// The first step in the wizard, so there is no completeness guard here — everyone lands here with
// an empty or partial draft and that is fine.
export const load: PageServerLoad = ({ url }) => ({
	// The prerendered start page posts the applicant's name here as a plain `?name=` query param via
	// a GET form, so the field arrives pre-filled without the start page needing any server code of
	// its own. Only used as a fallback when the draft doesn't already have a firstName.
	seededFirstName: url.searchParams.get('name')?.trim() || ''
});

// Both failure paths below return through here, so the action has one failure shape rather than a
// union of two literal ones — which is what lets the page index `form.errors` by field name.
const invalid = (errors: Record<string, string>) => fail(400, { errors });

export const actions = {
	default: async ({ request, cookies, url }) => {
		const draft = readDraft(cookies);
		const form = await request.formData();

		// The form sends day/month/year as three separate inputs so it degrades cleanly without JS
		// (three plain <input>s beat one that needs script to compose a date as you type). The server
		// is the one place that has to glue them back into 'YYYY-MM-DD', padded to two digits, because
		// that composition has to happen whether or not the client ran any validation of its own.
		const dobDay = String(form.get('dobDay') ?? '').padStart(2, '0');
		const dobMonth = String(form.get('dobMonth') ?? '').padStart(2, '0');
		const dobYear = String(form.get('dobYear') ?? '');
		const composedDob = `${dobYear}-${dobMonth}-${dobDay}`;

		const locked = Boolean(draft.identityAcceptedAt);

		// Identity lock: once identity has been accepted, idNumber and dob are no longer trusted from
		// the client at all — not validated-then-rejected, simply ignored, and the values already
		// sitting in the draft are re-validated instead. A client that shouldn't be sending these
		// fields gets no signal about what it sent; it just never affects the outcome.
		const candidate = {
			firstName: String(form.get('firstName') ?? ''),
			lastName: String(form.get('lastName') ?? ''),
			mobile: String(form.get('mobile') ?? ''),
			idNumber: locked ? (draft.idNumber ?? '') : String(form.get('idNumber') ?? ''),
			dob: locked ? (draft.dob ?? '') : composedDob
		};

		const parsed = detailsSchema.safeParse(candidate);
		if (!parsed.success) return invalid(fieldErrors(parsed.error));

		let updated;
		if (locked) {
			updated = writeDraft(cookies, {
				firstName: parsed.data.firstName,
				lastName: parsed.data.lastName,
				mobile: parsed.data.mobile
			});
		} else {
			// The risk group is derived from age, server-side, once — right here, at the moment identity
			// is accepted — and never recomputed on a later visit to this step. That keeps pricing stable
			// for the rest of the flow even if the applicant's birthday rolls over while they finish
			// applying. riskGroupFor cannot return null here: the schema's superRefine already rejected
			// any dob outside the 18-65 band, so this is just satisfying the type without a non-null
			// assertion.
			const age = ageOn(parsed.data.dob, todayInJohannesburg());
			const riskGroup = riskGroupFor(age);
			if (!riskGroup) {
				return invalid({ dob: 'Applicants must be between 18 and 65 years old.' });
			}

			updated = writeDraft(cookies, {
				firstName: parsed.data.firstName,
				lastName: parsed.data.lastName,
				mobile: parsed.data.mobile,
				idNumber: parsed.data.idNumber,
				dob: parsed.data.dob,
				identityAcceptedAt: new Date().toISOString(),
				riskGroup
			});
		}

		// Names and a mobile number have no downstream effect — nothing later in the flow is derived
		// from them — so an edit that only touches these is always safe to return straight to review.
		redirect(303, nextStepAfter(updated, url, '/apply/income'));
	}
} satisfies Actions;
