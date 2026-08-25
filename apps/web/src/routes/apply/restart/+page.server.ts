import { redirect } from '@sveltejs/kit';
import { firstIncompleteStep, readDraft, resetApplication } from '$lib/server/draft';
import type { Actions, PageServerLoad } from './$types';

/**
 * The way out of the wizard.
 *
 * Deliberately a page with a confirm button rather than a link that clears on GET. Discarding a
 * half-filled application is destructive and irreversible, and a GET that mutates would fire on a
 * mis-tap, a prefetch or a browser's back-forward cache. This costs one extra screen and makes the
 * loss impossible to trigger by accident — without JavaScript, which a `confirm()` dialog would need.
 */
export const load: PageServerLoad = ({ locals, cookies }) => {
	const draft = locals.draft ?? readDraft(cookies);
	// Nothing entered yet means nothing to warn about — send them to the start rather than asking
	// whether they want to discard an empty form.
	if (!draft.firstName && !draft.identityAcceptedAt) redirect(303, '/');

	// Where "keep my application" goes back to: the step the flow actually resumes at, not a
	// hardcoded first step that would strand someone who came here from the review screen.
	return { firstName: draft.firstName ?? '', resumeAt: firstIncompleteStep(draft) };
};

export const actions = {
	default: async ({ cookies }) => {
		resetApplication(cookies);
		redirect(303, '/');
	}
} satisfies Actions;
