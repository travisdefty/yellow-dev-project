import type { Handle } from '@sveltejs/kit';
import { readDraft } from '$lib/server/draft';

/**
 * Scoped to the wizard for three reasons that all matter.
 *
 * `/` is prerendered, so it must never receive a `Set-Cookie` — and reading the draft is also what
 * starts an application, which nothing outside the wizard should trigger. And `readDraft` reaches
 * the record through `/api/*`; if that path ran this hook, the read would call itself forever.
 *
 * Confirmation lives under `/apply` so the URL can be read aloud from the same flow, but it is not
 * the wizard. It looks up by public reference and carries no session. `readDraft` starts a fresh
 * row whenever the cookie names a *submitted* application — which is the right answer for a
 * back-button return to details, and the wrong one for the page submit just redirected to.
 */
export const handle: Handle = async ({ event, resolve }) => {
	if (isWizardPath(event.url.pathname)) {
		event.locals.draft = await readDraft(event);
	}
	return resolve(event);
};

function isWizardPath(pathname: string): boolean {
	return pathname.startsWith('/apply') && !pathname.startsWith('/apply/confirmation');
}
