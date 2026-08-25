import type { RequestHandler } from './$types';
import { listPhones } from '$lib/server/api/phones';
import { respond } from '$lib/server/respond';

/**
 * Thin by design: read two query parameters, call the handler, hand back what it returns. Every
 * decision about pricing, affordability and paging lives in `listPhones`.
 */
export const GET: RequestHandler = ({ url }) => {
	const rawPage = url.searchParams.get('page');
	return respond(() =>
		listPhones({
			applicationId: url.searchParams.get('applicationId') ?? '',
			// `null` means "no preference", which is what lets the handler default to the page holding
			// the phone already chosen. A junk value becomes NaN and is clamped there, not here.
			page: rawPage === null ? null : Number(rawPage)
		})
	);
};
