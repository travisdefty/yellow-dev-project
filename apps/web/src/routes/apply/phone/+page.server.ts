import { phoneFixtures } from '$lib/server/fixtures/phones';
import type { PageServerLoad } from './$types';

const PAGE_SIZE = 6;

/**
 * The seam. Everything priced is decided here, on the server, and arrives at the component as
 * finished numbers — the browser is never given a rate, a term or an arithmetic operator.
 *
 * In phase 3 the fixture import becomes a `fetch` of the SvelteKit `+server` route, and in phase 4
 * a `fetch` of Fastify. The return shape, the component and the rendered HTML stay as they are.
 */
export const load: PageServerLoad = ({ url }) => {
	const requested = Number(url.searchParams.get('page') ?? '1');
	const lastPage = Math.max(1, Math.ceil(phoneFixtures.length / PAGE_SIZE));
	// Clamped rather than 400'd: a page number out of range is a stale link, not an attack.
	const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), lastPage) : 1;
	const start = (page - 1) * PAGE_SIZE;

	return {
		items: phoneFixtures.slice(start, start + PAGE_SIZE),
		total: phoneFixtures.length,
		page,
		lastPage
	};
};
