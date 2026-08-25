import type { Handle } from '@sveltejs/kit';
import { readDraft } from '$lib/server/draft';

// Scoped to /apply so `/` — prerendered — never gets a Set-Cookie header and can stay prerendered.
// Reading the draft is also a `yl_app` mint on first visit; nothing outside the wizard should pay
// that cost or receive that cookie.
export const handle: Handle = async ({ event, resolve }) => {
	if (event.url.pathname.startsWith('/apply')) {
		event.locals.draft = readDraft(event.cookies);
	}
	return resolve(event);
};
