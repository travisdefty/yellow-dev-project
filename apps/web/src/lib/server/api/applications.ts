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
import { and, eq, ne, sql } from 'drizzle-orm';
import {
	ageOn,
	incomeSchema,
	isAffordable,
	minimumIncomeFor,
	patchSchema,
	quote,
	riskGroupFor,
	todayInJohannesburg,
	type DetailsStepInput,
	type PatchBody,
	type RiskGroup
} from '@yellow/domain';
import { fieldErrors } from '$lib/field-errors';
import { formatCents } from '$lib/format';
import {
	ACCEPTED_PROOF_MIME_SET,
	MAX_PROOF_BYTES,
	PROOF_TYPE_ERROR,
	proofMimeFromFilename
} from '$lib/upload/constants';
import { hashSessionToken, mintSessionToken } from '../session-token.ts';
import { db } from '../db/index.ts';
import { applications, phones, riskGroupRates, type ApplicationRow } from '../db/schema.ts';
import { saveProof } from '../proof-storage.ts';
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
	/** Applicant-facing reference. Confirmation URLs and the review screen show this, not `applicationId`. */
	publicReference: string;
	status: 'draft' | 'submitted';
	firstName?: string;
	lastName?: string;
	mobile?: string;
	idNumber?: string;
	dob?: string;
	identityAcceptedAt?: string;
	riskGroup?: RiskGroup;
	monthlyIncomeCents?: number;
	proofFilename?: string;
	proofMime?: string;
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
	 * end up disagreeing. Before submit it is computed live from the risk-group rates, so an edit to
	 * income or phone is reflected immediately. After submit it is rebuilt from the columns stored
	 * on the application, so the confirmation shows the deal that was actually agreed rather than
	 * whatever the catalogue happens to say today.
	 */
	selection?: QuotedPhone;
};

const undef = <T>(value: T | null): T | undefined => value ?? undefined;

const DUPLICATE_ID_MESSAGE = 'An application already exists for this ID number.';

export const PROOF_REQUIRED = 'Upload a payslip or bank statement.';

export type ProofUpload = {
	data: Buffer;
	mime: string;
	filename: string;
	/** Client-generated JPEG chip. Ignored if missing, too large, or the proof is not an image. */
	thumb?: Buffer | null;
};

/** Another submitted application already owns this ID — drafts and this row are excluded. */
function submittedIdTaken(idNumber: string, exceptApplicationId: string): boolean {
	return Boolean(
		db
			.select({ id: applications.id })
			.from(applications)
			.where(
				and(
					eq(applications.idNumber, idNumber),
					eq(applications.status, 'submitted'),
					ne(applications.id, exceptApplicationId)
				)
			)
			.get()
	);
}

function toDto(row: ApplicationRow): Application {
	return {
		selection: selectionFor(row),
		applicationId: row.id,
		publicReference: row.publicReference,
		status: row.status,
		firstName: undef(row.firstName),
		lastName: undef(row.lastName),
		mobile: undef(row.mobile),
		idNumber: undef(row.idNumber),
		dob: undef(row.dob),
		identityAcceptedAt: undef(row.identityAcceptedAt),
		riskGroup: undef(row.riskGroup),
		monthlyIncomeCents: undef(row.monthlyIncomeCents),
		proofFilename: undef(row.proofFilename),
		proofMime: undef(row.proofMime),
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

export type CreatedApplication = Application & { sessionToken: string };

const PUBLIC_REF_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** `YL-` plus 8 Crockford-base32 chars — short enough to read aloud, unique enough not to collide. */
function mintPublicReference(): string {
	const bytes = crypto.getRandomValues(new Uint8Array(5));
	let n = 0n;
	for (const byte of bytes) n = (n << 8n) | BigInt(byte);
	let body = '';
	for (let i = 0; i < 8; i++) {
		body = PUBLIC_REF_ALPHABET[Number(n & 31n)] + body;
		n >>= 5n;
	}
	return `YL-${body}`;
}

export function createApplication(): CreatedApplication {
	const id = crypto.randomUUID();
	const sessionToken = mintSessionToken();
	const sessionTokenHash = hashSessionToken(sessionToken);

	for (let attempt = 0; attempt < 8; attempt++) {
		try {
			const [row] = db
				.insert(applications)
				.values({
					id,
					status: 'draft',
					sessionTokenHash,
					publicReference: mintPublicReference()
				})
				.returning()
				.all();
			return { ...toDto(row), sessionToken };
		} catch (error) {
			if (!isUniqueViolation(error) || attempt === 7) throw error;
		}
	}

	throw new Error('Could not mint a unique public reference.');
}

export function getApplication(id: string): Application {
	const row = db.select().from(applications).where(eq(applications.id, id)).get();
	if (!row) throw messageError(404, 'No application with that reference.');
	return toDto(row);
}

/** Confirmation looks up by the public reference, never by the internal id. */
export function getApplicationByPublicReference(publicReference: string): Application {
	const row = db
		.select()
		.from(applications)
		.where(eq(applications.publicReference, publicReference))
		.get();
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
	return applyPatch(row, patch);
}

/** Income step with a multipart proof upload — the JSON patch cannot carry file bytes. */
export function patchIncomeWithProof(
	id: string,
	monthlyIncomeCents: number,
	proof: ProofUpload | 'keep'
): Application {
	const row = db.select().from(applications).where(eq(applications.id, id)).get();
	if (!row) throw messageError(404, 'No application with that reference.');
	if (row.status === 'submitted') {
		throw messageError(409, 'This application has already been submitted.');
	}
	if (!isStepUnlocked(toDto(row), 'income')) {
		throw messageError(409, 'This application is not ready for the income step.');
	}

	const parsed = incomeSchema.safeParse({ monthlyIncomeCents });
	if (!parsed.success) {
		throw fieldError(400, { income: 'Enter an amount, for example R 12 500.' });
	}

	return applyPatch(row, incomePatch(row, monthlyIncomeCents, proof));
}

function applyPatch(row: ApplicationRow, patch: ColumnPatch): Application {
	try {
		const [updated] = db
			.update(applications)
			.set({ ...patch, updatedAt: sql`(current_timestamp)` })
			.where(eq(applications.id, row.id))
			.returning()
			.all();
		return toDto(updated);
	} catch (error) {
		if (isUniqueViolation(error)) {
			throw fieldError(409, { idNumber: DUPLICATE_ID_MESSAGE });
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
			return incomePatch(row, body.data.monthlyIncomeCents, row.proofMime ? 'keep' : null);
		case 'phone':
			return phonePatch(row, body.data.phoneId);
		case 'submit':
			return submitPatch(row);
	}
}

function detailsPatch(row: ApplicationRow, data: DetailsStepInput): ColumnPatch {
	const names = { firstName: data.firstName, lastName: data.lastName, mobile: data.mobile };
	// Stamp once: a later edit of name or mobile is not a new acknowledgement. `??` also covers a
	// draft whose identity was accepted before consent moved onto this step.
	const consentAt = row.consentAt ?? new Date().toISOString();

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
		return { ...names, consentAt };
	}

	// Derived here, once, at the moment identity is accepted — and never recomputed on a later
	// visit. That is what keeps pricing stable if the applicant's birthday rolls over while they
	// are still filling in the form. `riskGroupFor` cannot return null: the schema's superRefine
	// already rejected any date of birth outside the 18-65 band.
	const riskGroup = riskGroupFor(ageOn(data.dob, todayInJohannesburg()));
	if (!riskGroup) {
		throw fieldError(400, { dob: 'Applicants must be between 18 and 65 years old.' });
	}

	// Checked here as well as at submit so the applicant sees it under the ID field on step 1, not
	// silently on the last screen after identity is already locked.
	if (submittedIdTaken(data.idNumber, row.id)) {
		throw fieldError(409, { idNumber: DUPLICATE_ID_MESSAGE });
	}

	return {
		...names,
		idNumber: data.idNumber,
		dob: data.dob,
		identityAcceptedAt: new Date().toISOString(),
		consentAt,
		riskGroup
	};
}

function incomePatch(
	row: ApplicationRow,
	monthlyIncomeCents: number,
	proof: ProofUpload | 'keep' | null
): ColumnPatch {
	const patch: ColumnPatch = { monthlyIncomeCents, ...proofColumns(row, proof) };

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

function proofColumns(
	row: ApplicationRow,
	proof: ProofUpload | 'keep' | null
): Pick<ColumnPatch, 'proofMime' | 'proofFilename'> {
	if (proof === 'keep') {
		if (!row.proofMime) throw fieldError(400, { proof: PROOF_REQUIRED });
		return {};
	}

	if (proof) {
		const mime = proof.mime || proofMimeFromFilename(proof.filename);
		if (!mime || !ACCEPTED_PROOF_MIME_SET.has(mime)) {
			throw fieldError(400, { proof: PROOF_TYPE_ERROR });
		}
		if (proof.data.length === 0 || proof.data.length > MAX_PROOF_BYTES) {
			throw fieldError(400, {
				proof: 'That file is too large. Use a photo under 5 MB or a smaller PDF.'
			});
		}
		saveProof(row.id, proof.data, mime.startsWith('image/') ? proof.thumb : null);
		return { proofMime: mime, proofFilename: proof.filename };
	}

	if (!row.proofMime) throw fieldError(400, { proof: PROOF_REQUIRED });
	return {};
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
	if (row.phoneId == null || !row.riskGroup || !row.consentAt) {
		throw messageError(409, 'This application is not ready to submit.');
	}

	// Recomputed from the phone and the band's rates rather than trusted from anything the client
	// sent — the client has never seen a rate and never will. These are the numbers that get stored,
	// and storing them is what stops a later catalogue edit from silently restating the offer.
	const priced = priceOne(row.phoneId, row.riskGroup);
	if (!isAffordable(row.monthlyIncomeCents ?? 0, priced.dailyCents)) {
		throw messageError(
			400,
			`This phone needs a monthly income of at least ${formatCents(minimumIncomeFor(priced.dailyCents))}. Choose a cheaper phone, or update what you earn.`
		);
	}

	return {
		status: 'submitted',
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
 * every time a rates row moved.
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
 * One phone, priced at one band: cash price from the catalogue, rates from the risk group.
 * The rates never leave this file's side of the wire — `listPhones` and every patch above go
 * through here.
 */
export function priceOne(phoneId: number, riskGroup: RiskGroup) {
	const phone = db
		.select({ cashPriceCents: phones.cashPriceCents })
		.from(phones)
		.where(eq(phones.phoneId, phoneId))
		.get();

	if (!phone) throw fieldError(400, { phoneId: 'Choose a phone from the list.' });

	const rates = db
		.select({
			depositBps: riskGroupRates.depositBps,
			interestBps: riskGroupRates.interestBps
		})
		.from(riskGroupRates)
		.where(eq(riskGroupRates.riskGroup, riskGroup))
		.get();

	if (!rates) throw new Error(`No rates for risk group ${riskGroup}`);

	return { ...phone, ...rates, ...quote(phone.cashPriceCents, rates) };
}
