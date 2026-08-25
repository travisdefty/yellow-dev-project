import { fail, redirect } from '@sveltejs/kit';
import { isAffordable, minimumIncomeFor, phoneSelectionSchema, quote } from '@yellow/domain';
import { fieldErrors } from '$lib/field-errors';
import { formatCents } from '$lib/format';
import { readDraft, requireRiskGroup, requireStep, writeDraft } from '$lib/server/draft';
import { pricingFor } from '$lib/server/fixtures/pricing';
import { phoneFixtures } from '$lib/server/fixtures/phones';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 6;

/**
 * The seam. Everything priced is decided here, on the server, and arrives at the component as
 * finished numbers — the browser is never given a rate, a term or an arithmetic operator.
 *
 * In phase 3 the fixture import becomes a `fetch` of the SvelteKit `+server` route, and in phase 4
 * a `fetch` of Fastify. The return shape, the component and the rendered HTML stay as they are.
 *
 * Rates now come from a band-keyed pricing row (`pricingFor`), chosen by the applicant's own risk
 * group, rather than a single hardcoded rate — but the seam holds: the component still receives
 * finished cents and contains no arithmetic of its own, affordability included.
 */
export const load: PageServerLoad = ({ locals, cookies, url }) => {
	const draft = locals.draft ?? readDraft(cookies);
	requireStep(draft, '/apply/phone');

	const pricingRow = pricingFor(requireRiskGroup(draft));
	// requireStep above guarantees income is set; the fallback only satisfies the type.
	const monthlyIncomeCents = draft.monthlyIncomeCents ?? 0;

	// The whole catalogue is priced first and filtered second, because affordability is a fact about
	// the *quote*, not about the phone — the same handset is affordable at one risk band and not at
	// another. Filtering here rather than marking a disabled card in the UI: a list of phones the
	// applicant is told they cannot have is a list of ways to feel rejected, and every one of them
	// still has to be refused again at submit. The action below is what actually enforces the rule.
	const priced = phoneFixtures.map((phone) => ({
		...phone,
		...quote(phone.cashPriceCents, pricingRow)
	}));
	const affordable = priced.filter((phone) => isAffordable(monthlyIncomeCents, phone.dailyCents));

	const lastPage = Math.max(1, Math.ceil(affordable.length / PAGE_SIZE));

	// With no ?page= of their own, an applicant who already chose a phone lands on the page that
	// holds it rather than on page 1. Coming back to the catalogue and finding your choice on a page
	// you have to go looking for is indistinguishable from the choice having been thrown away — which
	// is what it looked like after editing an earlier step. An explicit ?page= still wins, so paging
	// works normally once they start browsing.
	const chosenIndex = affordable.findIndex((phone) => phone.phoneId === draft.phoneId);
	const defaultPage = chosenIndex === -1 ? 1 : Math.floor(chosenIndex / PAGE_SIZE) + 1;

	const requested = Number(url.searchParams.get('page') ?? defaultPage);
	// Clamped rather than 400'd: a page number out of range is a stale link, not an attack. It is
	// also reachable honestly now — raising the filter's cut can shrink the list under a bookmark.
	const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), lastPage) : 1;
	const start = (page - 1) * PAGE_SIZE;

	return {
		items: affordable.slice(start, start + PAGE_SIZE),
		total: affordable.length,
		// So a phone already chosen comes back marked rather than looking untouched. Without it,
		// walking forward from an edited earlier step reads as though the selection was thrown away.
		selectedPhoneId: draft.phoneId,
		// Set by the income step when a raised affordability bar knocked out the phone they had.
		repick: url.searchParams.get('repick') === '1',
		// What the cheapest phone in the catalogue would need. Only meaningful when the list came
		// back empty, which is the one case where "no phones" needs to become a number and a next step.
		minimumIncomeCents: minimumIncomeFor(Math.min(...priced.map((phone) => phone.dailyCents))),
		page,
		lastPage
	};
};

export const actions = {
	default: async ({ request, cookies }) => {
		const draft = readDraft(cookies);
		requireStep(draft, '/apply/phone');

		const form = await request.formData();
		const parsed = phoneSelectionSchema.safeParse({ phoneId: Number(form.get('phoneId')) });
		if (!parsed.success) return fail(400, { errors: fieldErrors(parsed.error) });

		// A made-up id is a 400, not a crash: the catalogue is server data, but the id still arrives
		// over the wire and gets no more trust than any other form field.
		const phone = phoneFixtures.find((p) => p.phoneId === parsed.data.phoneId);
		if (!phone) return fail(400, { errors: { phoneId: 'Choose a phone from the list.' } });

		// The load filtered this phone off the page if it was unaffordable, but the action is a URL
		// like any other and a hidden card is not a refusal. Checked here so an unaffordable phoneId
		// never reaches the draft at all, rather than sitting in it until the review step turns it
		// away — the applicant would otherwise get two steps further before being told no.
		const { dailyCents } = quote(phone.cashPriceCents, pricingFor(requireRiskGroup(draft)));
		if (!isAffordable(draft.monthlyIncomeCents ?? 0, dailyCents)) {
			return fail(400, {
				message: `That phone needs a monthly income of at least ${formatCents(minimumIncomeFor(dailyCents))}.`
			});
		}

		writeDraft(cookies, { phoneId: phone.phoneId });
		redirect(303, '/apply/review');
	}
} satisfies Actions;
