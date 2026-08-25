/**
 * `GET /phones` — the catalogue, priced for one application's locked risk group and paginated.
 *
 * The endpoint takes an application id rather than a risk group, and that is deliberate: a risk
 * group arriving as a query parameter would be a rate the client got to choose. The band is read
 * from the record, where it was written server-side at the moment identity was accepted.
 *
 * Everything priced happens on this side of the wire. What comes back is finished cents — the card
 * that renders it contains no rate, no term, and no arithmetic.
 */
import { and, eq } from 'drizzle-orm';
import { isAffordable, minimumIncomeFor, quote, type RiskGroup } from '@yellow/domain';
import type { QuotedPhone } from '$lib/catalogue';
import { db } from '../db/index.ts';
import { phonePricing, phones } from '../db/schema.ts';
import { messageError } from './errors.ts';
import { getApplication } from './applications.ts';

export const PAGE_SIZE = 6;

export type PhoneListResult = {
	items: QuotedPhone[];
	total: number;
	page: number;
	lastPage: number;
	/** What the cheapest phone in the whole catalogue would need. Only meaningful when empty. */
	minimumIncomeCents: number;
};

export function listPhones({
	applicationId,
	page: requestedPage
}: {
	applicationId: string;
	page?: number | null;
}): PhoneListResult {
	const application = getApplication(applicationId);
	if (!application.riskGroup) {
		throw messageError(409, 'Identity must be accepted before the catalogue can be priced.');
	}

	const priced = pricedCatalogue(application.riskGroup);

	// Priced first, filtered second, because affordability is a fact about the *quote* and not
	// about the phone — the same handset clears the bar at one band and not at another.
	//
	// Filtered rather than shown-and-disabled: a list of phones someone is told they cannot have is
	// a list of ways to feel rejected, and every one of them still has to be refused again at
	// submit. The patch is what enforces the rule; this only decides what is worth showing.
	const monthlyIncomeCents = application.monthlyIncomeCents ?? 0;
	const affordable = priced.filter((phone) => isAffordable(monthlyIncomeCents, phone.dailyCents));

	const lastPage = Math.max(1, Math.ceil(affordable.length / PAGE_SIZE));

	// An applicant who already chose a phone lands on the page holding it rather than on page 1.
	// Coming back to the catalogue and finding your choice on a page you have to go looking for is
	// indistinguishable from the choice having been thrown away. An explicit page still wins, so
	// paging works normally once they start browsing.
	const chosenIndex = affordable.findIndex((phone) => phone.phoneId === application.phoneId);
	const defaultPage = chosenIndex === -1 ? 1 : Math.floor(chosenIndex / PAGE_SIZE) + 1;

	const requested = requestedPage ?? defaultPage;
	// Clamped rather than refused: a page number out of range is a stale link, not an attack, and
	// it is reachable honestly — raising the affordability bar shrinks the list under a bookmark.
	const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), lastPage) : 1;
	const start = (page - 1) * PAGE_SIZE;

	return {
		items: affordable.slice(start, start + PAGE_SIZE),
		total: affordable.length,
		page,
		lastPage,
		minimumIncomeCents: minimumIncomeFor(Math.min(...priced.map((phone) => phone.dailyCents)))
	};
}

/** Every phone joined to its row for one band, then quoted. Twelve rows; one query. */
function pricedCatalogue(riskGroup: RiskGroup): QuotedPhone[] {
	const rows = db
		.select({
			phoneId: phones.phoneId,
			sku: phones.sku,
			brand: phones.brand,
			model: phones.model,
			colour: phones.colour,
			storageGb: phones.storageGb,
			cashPriceCents: phones.cashPriceCents,
			depositBps: phonePricing.depositBps,
			interestBps: phonePricing.interestBps
		})
		.from(phones)
		.innerJoin(
			phonePricing,
			and(eq(phonePricing.phoneId, phones.phoneId), eq(phonePricing.riskGroup, riskGroup))
		)
		.orderBy(phones.phoneId)
		.all();

	return rows.map(({ depositBps, interestBps, ...phone }) => ({
		...phone,
		...quote(phone.cashPriceCents, { depositBps, interestBps })
	}));
}
