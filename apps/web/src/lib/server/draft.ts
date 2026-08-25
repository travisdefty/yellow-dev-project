/**
 * The one module that knows where wizard state lives. Today that is two cookies; in phase 3 it is
 * an `applications` row reached over HTTP. Callers only ever see `readDraft` / `writeDraft` /
 * `clearDraft` / `firstIncompleteStep`, so that migration is a body swap in this file and nothing
 * else in the app changes: `readDraft` becomes `GET /applications/:id` keyed on the id already
 * sitting in `yl_app`, `writeDraft` becomes the `PATCH`, and `yl_draft` is deleted outright. That
 * is the whole reason this indirection exists rather than reading cookies at each call site.
 */
import { redirect, type Cookies } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { RiskGroup } from '@yellow/domain';

const APP_COOKIE = 'yl_app';
const DRAFT_COOKIE = 'yl_draft';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export type Draft = {
	applicationId: string;
	firstName?: string;
	lastName?: string;
	mobile?: string;
	idNumber?: string;
	dob?: string;
	/** ISO. Set once details validate. This is the identity lock — see steps.ts / details step. */
	identityAcceptedAt?: string;
	/** Derived server-side from age. Never accepted from the client, never sent to it. */
	riskGroup?: RiskGroup;
	monthlyIncomeCents?: number;
	phoneId?: number;
};

// yl_app is opaque and carries nothing sensitive, so it is scoped to '/' and rides along with
// every request, asset fetches included, without anyone having to think about it. yl_draft carries
// an SA ID number partway through the flow, so it is scoped to '/apply' — it has no business being
// attached to `/_app/immutable/*` or any other request outside the wizard.
function cookieOpts(path: string) {
	return { path, httpOnly: true, sameSite: 'lax' as const, secure: !dev, maxAge: MAX_AGE };
}

function freshDraft(applicationId: string): Draft {
	return { applicationId };
}

export function readDraft(cookies: Cookies): Draft {
	let applicationId = cookies.get(APP_COOKIE);
	if (!applicationId) {
		applicationId = crypto.randomUUID();
		cookies.set(APP_COOKIE, applicationId, cookieOpts('/'));
	}

	const raw = cookies.get(DRAFT_COOKIE);
	if (!raw) return freshDraft(applicationId);

	try {
		const parsed = JSON.parse(raw) as Draft;
		// Staleness check: yl_draft carries its own applicationId. If it doesn't match yl_app, this
		// is a leftover from a finished or expired application (yl_app rotated, yl_draft didn't) —
		// treat it as absent rather than resurrecting someone else's half-filled form.
		if (parsed.applicationId !== applicationId) return freshDraft(applicationId);
		return parsed;
	} catch {
		// Malformed JSON is a corrupt cookie, not a 500 — start clean.
		return freshDraft(applicationId);
	}
}

export function writeDraft(cookies: Cookies, patch: Partial<Draft>): Draft {
	const merged = { ...readDraft(cookies), ...patch };
	cookies.set(DRAFT_COOKIE, JSON.stringify(merged), cookieOpts('/apply'));
	return merged;
}

export function clearDraft(cookies: Cookies): void {
	cookies.delete(DRAFT_COOKIE, { path: '/apply' });
}

/**
 * Abandon the application outright: the draft *and* the id it was keyed by.
 *
 * Distinct from `clearDraft`, which runs on a successful submit and deliberately keeps `yl_app` —
 * that id is the reference the applicant reads off the confirmation page. Starting over is the
 * opposite case: whatever was half-entered is being thrown away, so the next visit to `/apply`
 * should mint a new id rather than reuse one that already has a partial application against it.
 */
export function resetApplication(cookies: Cookies): void {
	clearDraft(cookies);
	cookies.delete(APP_COOKIE, { path: '/' });
}

/** The wizard in order. `firstIncompleteStep` returns one of these; `requireStep` compares them. */
const STEP_ORDER = ['/apply/details', '/apply/income', '/apply/phone', '/apply/review'] as const;

/**
 * Refuses a step the draft has not earned yet, and sends the applicant to the one they actually
 * owe. Both loads and actions call this.
 *
 * The actions matter more than the loads. A load guard only stops someone *navigating* out of
 * order; an action is a URL like any other, and without this it will happily write income onto a
 * draft whose identity was never accepted — which then arrives at the catalogue with no risk band.
 */
export function requireStep(draft: Draft, step: (typeof STEP_ORDER)[number]): void {
	if (STEP_ORDER.indexOf(firstIncompleteStep(draft) as (typeof STEP_ORDER)[number]) < STEP_ORDER.indexOf(step)) {
		redirect(303, firstIncompleteStep(draft));
	}
}

/**
 * The band identity was accepted at, or a redirect back to the step that sets it.
 *
 * Deliberately not `draft.riskGroup ?? 'B'`: defaulting would quietly price someone who never
 * passed the identity check, at a band nobody chose for them. A missing band is a broken flow, not
 * a value to invent.
 */
export function requireRiskGroup(draft: Draft): RiskGroup {
	if (!draft.riskGroup) redirect(303, firstIncompleteStep(draft));
	return draft.riskGroup;
}

/**
 * Where a step goes after a successful write.
 *
 * The wizard is linear by default. An applicant who arrived from the review screen's Edit link is
 * not walking it, though — they came to correct one field and expect to land back where they were,
 * not to be marched through the two steps after it. `?return=review` says which of the two this is.
 *
 * It is honoured only while the application still adds up. An edit can invalidate a later step —
 * dropping income below what the chosen phone needs is the live case — and that step is then
 * genuinely incomplete, so `firstIncompleteStep` routes them to the work they now owe instead of
 * back to a review that no longer holds. That check is what keeps this from being a blind redirect
 * that returns someone to a summary of a phone they can no longer have.
 */
export function nextStepAfter(draft: Draft, url: URL, linearNext: string): string {
	if (url.searchParams.get('return') !== 'review') return linearNext;
	return firstIncompleteStep(draft);
}

export function firstIncompleteStep(draft: Draft): string {
	if (!draft.identityAcceptedAt) return '/apply/details';
	if (draft.monthlyIncomeCents === undefined) return '/apply/income';
	if (draft.phoneId === undefined) return '/apply/phone';
	return '/apply/review';
}
