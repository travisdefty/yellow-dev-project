import { phoneFixtures } from '$lib/server/fixtures/phones';
import type { PageServerLoad } from './$types';

/**
 * The same seam as the catalogue: the quote is assembled on the server and handed over finished.
 * Phase 2 replaces the hardcoded selection with the phone the applicant actually chose, but the
 * numbers keep arriving this way — a priced amount has no business being in a client bundle.
 */
export const load: PageServerLoad = () => {
	const phone = phoneFixtures[1];
	return {
		phone,
		interestCents: phone.loanAmountCents - phone.principalCents
	};
};
