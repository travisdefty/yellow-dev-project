/**
 * `POST /applications`, `GET /applications/:id`, `PATCH /applications/:id` — as plain functions.
 *
 * Nothing here imports from `@sveltejs/kit`. The `+server.ts` files are adapters that unwrap a
 * request and wrap a response; every rule about what an application is lives in this file. That
 * separation is what makes porting to Fastify a re-mount of three routes rather than a rewrite,
 * and it is also why these functions are testable by calling them.
 *
 * The patch is where eligibility runs. The specification is explicit that eligibility is "a
 * function the patch runs, not a route", and that is load-bearing: every rule below is enforced on
 * the write, so no path through the UI — or around it — can reach a state the rules forbid.
 */
import { and, eq, sql } from 'drizzle-orm';
import {
	ageOn,
	isAffordable,
	minimumIncomeFor,
	patchSchema,
	quote,
	riskGroupFor,
	todayInJohannesburg,
	type DetailsInput,
	type PatchBody,
	type RiskGroup
} from '@yellow/domain';
import { fieldErrors } from '$lib/field-errors';
import { formatCents } from '$lib/format';
import { db } from '../db/index.ts';
import { applications, phonePricing, phones, type ApplicationRow } from '../db/schema.ts';
import type { QuotedPhone } from '$lib/catalogue';
import { fieldError, messageError } from './errors.ts';
import { isStepUnlocked } from './steps.ts';

/**
 * An application as it crosses the wire.
 *
 * `id` becomes `applicationId`, and every `null` column becomes an absent key. Both are for the
 * same reason: this is the shape the wizard already spoke when its state lived in a cookie, so the
 * entire wizard — guards, redirects, pre-filled inputs — carries over untouched. It also means the
 * object survives a JSON round trip unchanged, since `JSON.stringify` drops `undefined` rather
 * than inventing a null the guards would then misread as a filled-in answer.
 */
export type Application = {
	applicationId: string;
	status: 'draft' | 'submitted';
	firstName?: string;
	lastName?: string;
	mobile?: string;
	idNumber?: string;
	dob?: string;
	identityAcceptedAt?: string;
	riskGroup?: RiskGroup;
	monthlyIncomeCents?: number;
	phoneId?: number;
	consentAt?: string;
	cashPriceCents?: number;
	depositCents?: number;
	principalCents?: number;
	loanAmountCents?: number;
	dailyCents?: number;
	totalPayableCents?: number;
	/**
	 * The chosen phone, priced — present only once one has been chosen.
	 *
	 * Attached here rather than left for the review screen to assemble, because a quote is a single
	 * fact about an application and assembling it in two places is how the summary and the record
	 * end up disagreeing. Before submit it is computed live from the pricing rows, so an edit to
	 * income or phone is reflected immediately. After submit it is rebuilt from the columns stored
	 * on the application, so the confirmation shows the deal that was actually agreed rather than
	 * whatever the catalogue happens to say today.
	 */
	selection?: QuotedPhone;
};

const undef = <T>(value: T | null): T | undefined => value ?? undefined;

function toDto(row: ApplicationRow): Application {
	return {
		selection: selectionFor(row),
		applicationId: row.id,
		status: row.status,
		firstName: undef(row.firstName),
		lastName: undef(row.lastName),
		mobile: undef(row.mobile),
		idNumber: undef(row.idNumber),
		dob: undef(row.dob),
		identityAcceptedAt: undef(row.identityAcceptedAt),
		riskGroup: undef(row.riskGroup),
		monthlyIncomeCents: undef(row.monthlyIncomeCents),
		phoneId: undef(row.phoneId),
		consentAt: undef(row.consentAt),
		cashPriceCents: undef(row.cashPriceCents),
		depositCents: undef(row.depositCents),
		principalCents: undef(row.principalCents),
		loanAmountCents: undef(row.loanAmountCents),
		dailyCents: undef(row.dailyCents),
		totalPayableCents: undef(row.totalPayableCents)
	};
}

export function createApplication(): Application {
	const id = crypto.randomUUID();
	const [row] = db.insert(applications).values({ id, status: 'draft' }).returning().all();
	return toDto(row);
}

export function getApplication(id: string): Application {
	const row = db.select().from(applications).where(eq(applications.id, id)).get();
	if (!row) throw messageError(404, 'No application with that reference.');
	return toDto(row);
}

export function patchApplication(id: string, body: unknown): Application {
	const row = db.select().from(applications).where(eq(applications.id, id)).get();
	if (!row) throw messageError(404, 'No application with that reference.');

	// A submitted application is a record, not a draft. Refusing further writes here is what makes
	// the submitted status meaningful — otherwise the back button plus one more POST would edit a
	// loan that has already been agreed.
	if (row.status === 'submitted') {
		throw messageError(409, 'This application has already been submitted.');
	}

	const parsed = patchSchema.safeParse(body);
	if (!parsed.success) {
		// Path is ['data', <field>] here, and `fieldErrors` keys on the first segment — which would
		// bucket every failure under 'data'. Dropping the prefix puts each message back on the field
		// the applicant can actually see.
		const trimmed = {
			issues: parsed.error.issues.map((issue) => ({
				...issue,
				path: issue.path[0] === 'data' ? issue.path.slice(1) : issue.path
			}))
		};
		const errors = fieldErrors(trimmed);
		// A rejected unknown key has no field to bind to, so it becomes a message instead of a red
		// line under an input that does not exist.
		throw Object.keys(errors).length > 0
			? fieldError(400, errors)
			: messageError(400, parsed.error.issues[0]?.message ?? 'That request was not understood.');
	}

	// Step order is enforced on the write, not only on the route. A load guard stops someone
	// navigating out of turn; without this, a POST straight at the endpoint would happily write an
	// income onto an application whose identity was never accepted, which then reaches the
	// catalogue with no risk band to price against.
	if (!isStepUnlocked(toDto(row), parsed.data.step)) {
		throw messageError(409, `This application is not ready for the ${parsed.data.step} step.`);
	}

	const patch = buildPatch(row, parsed.data);

	try {
		const [updated] = db
			.update(applications)
			.set({ ...patch, updatedAt: sql`(current_timestamp)` })
			.where(eq(applications.id, id))
			.returning()
			.all();
		return toDto(updated);
	} catch (error) {
		// One submitted application per ID number, enforced by a partial unique index rather than by
		// a SELECT-then-INSERT that two concurrent submits could both walk through. The database is
		// the only place that check can be made honestly, so this is where it is caught — turned into
		// a field error on the input that caused it, not left to become a 500 on the last screen.
		if (isUniqueViolation(error)) {
			throw fieldError(409, {
				idNumber: 'An application already exists for this ID number.'
			});
		}
		throw error;
	}
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		String((error as { code: unknown }).code).startsWith('SQLITE_CONSTRAINT')
	);
}

type ColumnPatch = Partial<typeof applications.$inferInsert>;

function buildPatch(row: ApplicationRow, body: PatchBody): ColumnPatch {
	switch (body.step) {
		case 'details':
			return detailsPatch(row, body.data);
		case 'income':
			return incomePatch(row, body.data.monthlyIncomeCents);
		case 'phone':
			return phonePatch(row, body.data.phoneId);
		case 'submit':
			return submitPatch(row);
	}
}

function detailsPatch(row: ApplicationRow, data: DetailsInput): ColumnPatch {
	const names = { firstName: data.firstName, lastName: data.lastName, mobile: data.mobile };

	// The identity lock. Once accepted, the ID number and date of birth are the two answers that
	// cannot move, because the risk group — and therefore every rate the applicant has already been
	// shown — was derived from them. Allowing an edit here would be band shopping: fill in a
	// 25-year-old's ID, see band A's rates, then change to whichever band prices best.
	//
	// This refuses rather than silently ignoring. The form already declines to send changed values,
	// so a request that carries one did not come from the form, and an API that quietly discards a
	// field it was asked to write is lying to its caller about what it did.
	if (row.identityAcceptedAt) {
		const changed: Record<string, string> = {};
		const message = 'Your ID number and date of birth cannot be changed once they are accepted.';
		if (data.idNumber !== row.idNumber) changed.idNumber = message;
		if (data.dob !== row.dob) changed.dob = message;
		if (Object.keys(changed).length > 0) throw fieldError(400, changed);
		return names;
	}

	// Derived here, once, at the moment identity is accepted — and never recomputed on a later
	// visit. That is what keeps pricing stable if the applicant's birthday rolls over while they
	// are still filling in the form. `riskGroupFor` cannot return null: the schema's superRefine
	// already rejected any date of birth outside the 18-65 band.
	const riskGroup = riskGroupFor(ageOn(data.dob, todayInJohannesburg()));
	if (!riskGroup) {
		throw fieldError(400, { dob: 'Applicants must be between 18 and 65 years old.' });
	}

	return {
		...names,
		idNumber: data.idNumber,
		dob: data.dob,
		identityAcceptedAt: new Date().toISOString(),
		riskGroup
	};
}

function incomePatch(row: ApplicationRow, monthlyIncomeCents: number): ColumnPatch {
	const patch: ColumnPatch = { monthlyIncomeCents };

	// Income is the only answer in this flow that a later step depends on, so it is the only one
	// whose edit can invalidate work already done. Left alone, a phone chosen under a higher income
	// would sit on the application until the submit button and the applicant would be turned away
	// on the last screen for a decision they made three steps earlier. Dropping it here moves the
	// refusal to the moment it becomes true, and `nextRequiredStep` then sends them back to choose.
	//
	// Nothing else needs invalidating: names and mobile feed nothing downstream, and ID and date of
	// birth are locked, so the risk group the quote is built from cannot move underneath it.
	if (row.phoneId != null && row.riskGroup) {
		const priced = priceOne(row.phoneId, row.riskGroup);
		if (!isAffordable(monthlyIncomeCents, priced.dailyCents)) patch.phoneId = null;
	}

	return patch;
}

function phonePatch(row: ApplicationRow, phoneId: number): ColumnPatch {
	if (!row.riskGroup) throw messageError(409, 'Identity must be accepted before choosing a phone.');

	const priced = priceOne(phoneId, row.riskGroup);
	// The catalogue filtered this phone off the page if it was unaffordable, but the endpoint is a
	// URL like any other and a hidden card is not a refusal. Checked here so an unaffordable choice
	// never reaches the record at all, rather than sitting on it until submit turns it away.
	if (!isAffordable(row.monthlyIncomeCents ?? 0, priced.dailyCents)) {
		throw messageError(
			400,
			`That phone needs a monthly income of at least ${formatCents(minimumIncomeFor(priced.dailyCents))}.`
		);
	}

	return { phoneId };
}

function submitPatch(row: ApplicationRow): ColumnPatch {
	if (row.phoneId == null || !row.riskGroup) {
		throw messageError(409, 'This application is not ready to submit.');
	}

	// Recomputed from the phone and pricing rows rather than trusted from anything the client sent
	// — the client has never seen a rate and never will. These are the numbers that get stored, and
	// storing them is what stops a later catalogue edit from silently restating the offer.
	const priced = priceOne(row.phoneId, row.riskGroup);
	if (!isAffordable(row.monthlyIncomeCents ?? 0, priced.dailyCents)) {
		throw messageError(
			400,
			`This phone needs a monthly income of at least ${formatCents(minimumIncomeFor(priced.dailyCents))}. Choose a cheaper phone, or update what you earn.`
		);
	}

	return {
		status: 'submitted',
		consentAt: new Date().toISOString(),
		cashPriceCents: priced.cashPriceCents,
		depositBps: priced.depositBps,
		interestBps: priced.interestBps,
		depositCents: priced.depositCents,
		principalCents: priced.principalCents,
		loanAmountCents: priced.loanAmountCents,
		dailyCents: priced.dailyCents,
		totalPayableCents: priced.totalPayableCents
	};
}

/**
 * The chosen phone with its quote, or nothing if none has been chosen.
 *
 * A submitted application is rebuilt from its own stored columns and never re-priced: those numbers
 * are a promise made at a moment in time, and re-deriving them would silently restate the offer
 * every time a pricing row moved.
 */
function selectionFor(row: ApplicationRow): QuotedPhone | undefined {
	if (row.phoneId == null) return undefined;

	const phone = db.select().from(phones).where(eq(phones.phoneId, row.phoneId)).get();
	if (!phone) return undefined;

	if (row.status === 'submitted' && row.dailyCents != null) {
		return {
			...phone,
			cashPriceCents: row.cashPriceCents ?? phone.cashPriceCents,
			depositCents: row.depositCents ?? 0,
			principalCents: row.principalCents ?? 0,
			loanAmountCents: row.loanAmountCents ?? 0,
			dailyCents: row.dailyCents,
			totalPayableCents: row.totalPayableCents ?? 0
		};
	}

	if (!row.riskGroup) return undefined;
	const { cashPriceCents, depositBps, interestBps, ...priced } = priceOne(row.phoneId, row.riskGroup);
	return { ...phone, ...priced };
}

/**
 * One phone, priced at one band, straight from the two tables. The rates never leave this file's
 * side of the wire — `listPhones` and every patch above go through here.
 */
export function priceOne(phoneId: number, riskGroup: RiskGroup) {
	const found = db
		.select({
			cashPriceCents: phones.cashPriceCents,
			depositBps: phonePricing.depositBps,
			interestBps: phonePricing.interestBps
		})
		.from(phones)
		.innerJoin(
			phonePricing,
			and(eq(phonePricing.phoneId, phones.phoneId), eq(phonePricing.riskGroup, riskGroup))
		)
		.where(eq(phones.phoneId, phoneId))
		.get();

	if (!found) throw fieldError(400, { phoneId: 'Choose a phone from the list.' });

	return { ...found, ...quote(found.cashPriceCents, found) };
}
