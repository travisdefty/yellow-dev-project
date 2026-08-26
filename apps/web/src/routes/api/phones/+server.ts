import type { RequestHandler } from './$types';
import { listPhones } from '$lib/server/api/phones';
import { requireOwnApplication } from '$lib/server/app-session';
import { respond } from '$lib/server/respond';

/**
 * Thin by design: the cookie names the application, a page number is optional, and `listPhones`
 * decides pricing, affordability and paging. The application id is not accepted from the query —
 * that would let anyone price a catalogue against any draft they could guess.
 */
export const GET: RequestHandler = (event) => {
	const rawPage = event.url.searchParams.get('page');
	return respond(() => {
		const applicationId = requireOwnApplication(event);
		return listPhones({
			applicationId,
			// `null` means "no preference", which is what lets the handler default to the page holding
			// the phone already chosen. A junk value becomes NaN and is clamped there, not here.
			page: rawPage === null ? null : Number(rawPage)
		});
	});
};
