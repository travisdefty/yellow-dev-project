import { getApplication } from '$lib/server/api/applications';
import { isApiError } from '$lib/server/api/errors';
import type { PageServerLoad } from './$types';

/**
 * The one URL an applicant might bookmark, screenshot or read out over the phone, so it renders
 * from the address alone — no cookie, no session, no wizard state. That is also what makes it the
 * clearest demonstration that the application was actually persisted: the numbers below come from
 * the row, on a request that carries nothing else.
 *
 * Read through the handler directly rather than over `event.fetch`, because this route is outside
 * `/apply` and has no application in `locals` to work from; there is nothing for an HTTP hop to
 * prove here.
 *
 * A reference that does not resolve — mistyped, or from a database that has since been reset —
 * still renders the page with the reference and without the detail, rather than 404ing on someone
 * holding a piece of paper with a number on it.
 */
export const load: PageServerLoad = ({ params }) => {
	try {
		const application = getApplication(params.slug);
		// Only a submitted application has a deal to show. A draft id in this URL means someone
		// navigated sideways; the reference is still theirs, but there is nothing agreed to display.
		if (application.status !== 'submitted') return { slug: params.slug };

		return {
			slug: params.slug,
			firstName: application.firstName,
			phone: application.selection
		};
	} catch (error) {
		if (isApiError(error)) return { slug: params.slug };
		throw error;
	}
};
