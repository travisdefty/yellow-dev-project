/**
 * The one module that knows where wizard state lives.
 *
 * It used to be two cookies. It is now an `applications` row reached over the API, and the fact
 * that this file is the only thing that changed is the point of it existing: every route reaches
 * state through `readDraft` / `writeDraft` / `resetApplication`, so none of them had to learn that
 * the storage moved. The guards below — `requireStep`, `requireRiskGroup`, `nextStepAfter` — are
 * pure functions over an application and did not move at all.
 *
 * `yl_draft` is gone. It carried the applicant's ID number and date of birth in a cookie, which
 * was a phase-2 expedient and never a good idea; only the opaque `yl_app` id remains, and the
 * personal data now lives on one row on the server.
 *
 * Reads and writes go through `event.fetch` rather than by calling the handlers directly. That is
 * deliberate: it exercises the same HTTP boundary an external client would, so the endpoints
 * cannot quietly diverge from what the wizard needs. It costs nothing — SvelteKit resolves a
 * same-origin `+server.ts` request straight to the handler with no network round trip — and `/api`
 * is outside `/apply`, so this never re-enters the hook that called it.
 */
import { redirect, type Cookies, type RequestEvent } from '@sveltejs/kit';
import { dev } from '$app/environment';
import type { PatchBody, RiskGroup } from '@yellow/domain';
import type { ActionFailure } from '$lib/field-errors';
import type { Application } from '$lib/server/api/applications';
import { STEP_ORDER, nextRequiredStep, type Step } from '$lib/server/api/steps';

const APP_COOKIE = 'yl_app';
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

/**
 * The wizard's name for an application. Unchanged in shape from the cookie era, which is why the
 * routes did not have to move — the DTO was built to match it.
 */
export type Draft = Application;

// Opaque, carries nothing sensitive, and is the reference the applicant reads off the confirmation
// page. Scoped to '/' so it survives a trip to the landing page and back.
const cookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: !dev,
	maxAge: MAX_AGE
};

type Event = Pick<RequestEvent, 'fetch' | 'cookies'>;

/**
 * The application this browser is working on, starting one if it has none.
 *
 * A submitted application is deliberately not resumed. The row stays as the record it now is, and
 * the applicant gets a fresh one — so a back-button return to the wizard after submitting starts
 * a new application rather than resurrecting a finished one.
 */
export async function readDraft(event: Event): Promise<Draft> {
	const applicationId = event.cookies.get(APP_COOKIE);

	if (applicationId) {
		const response = await event.fetch(`/api/applications/${applicationId}`);
		if (response.ok) {
			const application = (await response.json()) as Draft;
			if (application.status === 'draft') return application;
		}
		// A 404 means the cookie outlived its row — an expired demo database, or an id from another
		// deployment. Falling through starts a new application rather than 500ing on every request
		// until the applicant works out how to clear their cookies.
	}

	return startApplication(event);
}

async function startApplication(event: Event): Promise<Draft> {
	const response = await event.fetch('/api/applications', { method: 'POST' });
	if (!response.ok) throw new Error(`Could not start an application: ${response.status}`);

	const application = (await response.json()) as Draft;
	event.cookies.set(APP_COOKIE, application.applicationId, cookieOpts);
	return application;
}

/** Success carries the updated application; failure carries exactly what a `fail()` wants. */
export type WriteResult =
	| { ok: true; draft: Draft }
	| { ok: false; status: number; failure: ActionFailure };

/**
 * One step's worth of answers, written through the API.
 *
 * Returns a result rather than throwing because every caller is a form action, and a refusal here
 * is not exceptional — it is the identity lock, or a phone that stopped being affordable, and it
 * has to reach the applicant as a field error rather than a 500. `ApiError` bodies are already
 * shaped like an action failure, so the refusal is forwarded rather than translated: the message
 * the API gives an external client and the message under the input are the same string.
 */
export async function writeDraft(event: Event, body: PatchBody): Promise<WriteResult> {
	const applicationId = event.cookies.get(APP_COOKIE);
	if (!applicationId) return { ok: false, status: 400, failure: { message: 'No application in progress.' } };

	const response = await event.fetch(`/api/applications/${applicationId}`, {
		method: 'PATCH',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body)
	});

	const payload = await response.json();
	if (!response.ok) return { ok: false, status: response.status, failure: payload as ActionFailure };
	return { ok: true, draft: payload as Draft };
}

/**
 * Abandon the application outright.
 *
 * Only the cookie is dropped; the row is left where it is. An abandoned draft is a real thing that
 * happened and there is no reason to destroy the evidence — and because the unique index on ID
 * numbers only covers *submitted* rows, an abandoned one cannot lock anybody out of their own ID.
 * The next visit to `/apply` starts a new application.
 */
export function resetApplication(cookies: Cookies): void {
	cookies.delete(APP_COOKIE, { path: '/' });
}

const STEP_PATHS: Record<Step, string> = {
	details: '/apply/details',
	income: '/apply/income',
	phone: '/apply/phone',
	submit: '/apply/review'
};

/**
 * Refuses a step the application has not earned yet, and sends the applicant to the one they owe.
 *
 * The API enforces this on the write as well, and that is the enforcement that counts. This is the
 * navigational half: it stops someone *landing* on a step out of order and being shown a form that
 * cannot possibly succeed.
 */
export function requireStep(draft: Draft, step: (typeof STEP_ORDER)[number]): void {
	if (STEP_ORDER.indexOf(nextRequiredStep(draft)) < STEP_ORDER.indexOf(step)) {
		redirect(303, firstIncompleteStep(draft));
	}
}

/**
 * The band identity was accepted at, or a redirect back to the step that sets it.
 *
 * Deliberately not `draft.riskGroup ?? 'B'`: defaulting would quietly price someone who never
 * passed the identity check, at a band nobody chose for them. A missing band is a broken flow,
 * not a value to invent.
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
 * back to a review that no longer holds.
 */
export function nextStepAfter(draft: Draft, url: URL, linearNext: string): string {
	if (url.searchParams.get('return') !== 'review') return linearNext;
	return firstIncompleteStep(draft);
}

export function firstIncompleteStep(draft: Draft): string {
	return STEP_PATHS[nextRequiredStep(draft)];
}
