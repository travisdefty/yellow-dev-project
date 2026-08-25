import { redirect } from '@sveltejs/kit';
import { firstIncompleteStep, readDraft, resetApplication } from '$lib/server/draft';
import type { Actions, PageServerLoad } from './$types';

/**
 * What "Get started" on the landing page actually means when an application is already open.
 *
 * The landing page is prerendered and has no server code of its own — deliberately, it is the page
 * every visitor loads first — so it cannot know whether this browser is mid-application. Its form
 * therefore lands here instead of going straight to the first step, and this is the one screen
 * allowed to ask.
 *
 * The alternative was to clear the draft on any visit to `/`. That is worse in both directions: it
 * would give the landing page server code and cost it its prerender, and it would destroy a
 * half-finished application on nothing more than a mis-tapped logo. Wiping someone's work should
 * take an answer, not a navigation.
 */
const nextWithName = (name: string) =>
	`/apply/details${name ? `?name=${encodeURIComponent(name)}` : ''}`;

export const load: PageServerLoad = ({ locals, cookies, url }) => {
	const draft = locals.draft ?? readDraft(cookies);
	const name = url.searchParams.get('name')?.trim() ?? '';

	// Nothing to resume: this is an ordinary start, so don't make them read a question about it.
	if (!draft.identityAcceptedAt) redirect(303, nextWithName(name));

	return { name, firstName: draft.firstName ?? '', resumeAt: firstIncompleteStep(draft) };
};

export const actions = {
	default: async ({ cookies, url }) => {
		resetApplication(cookies);
		// The name they just typed carries into the new application — they only typed it once, and
		// asking for it again would be the wrong kind of thorough.
		redirect(303, nextWithName(url.searchParams.get('name')?.trim() ?? ''));
	}
} satisfies Actions;
