import type { Handle } from '@sveltejs/kit';
import { readDraft } from '$lib/server/draft';

/**
 * Scoped to `/apply` for three reasons that all matter.
 *
 * `/` is prerendered, so it must never receive a `Set-Cookie` — and reading the draft is also what
 * starts an application, which nothing outside the wizard should trigger. And `readDraft` reaches
 * the record through `/api/*`; if that path ran this hook, the read would call itself forever.
 */
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/apply')) {
		event.locals.draft = await readDraft(event);
	}
	return resolve(event);
};
