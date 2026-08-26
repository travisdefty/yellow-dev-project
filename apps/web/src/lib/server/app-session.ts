/**
 * The wizard's session cookie: application id plus a secret token, and the check that the token
 * actually belongs to that row.
 *
 * Cookie parse/set live here rather than in the API handlers so `$lib/server/api/` stays free of
 * `@sveltejs/kit`. The handlers call `requireAppSession` before they touch a row.
 */
import { eq } from 'drizzle-orm';
import { dev } from '$app/environment';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { messageError } from '$lib/server/api/errors';
import { db } from '$lib/server/db';
import { applications } from '$lib/server/db/schema';
import { tokensMatch } from '$lib/server/session-token';

export const APP_COOKIE = 'yl_app';

/** Browser-session cookie: no maxAge, so it dies when the browser actually quits. */
export const appCookieOpts = {
	path: '/',
	httpOnly: true,
	sameSite: 'lax' as const,
	secure: !dev
};

export type AppSession = {
	applicationId: string;
	sessionToken: string;
};

export function serializeAppCookie(applicationId: string, sessionToken: string): string {
	return `${applicationId}.${sessionToken}`;
}

export function parseAppCookieValue(value: string | undefined): AppSession | null {
	if (!value) return null;
	const dot = value.indexOf('.');
	if (dot <= 0 || dot === value.length - 1) return null;
	return { applicationId: value.slice(0, dot), sessionToken: value.slice(dot + 1) };
}

export function readAppCookie(cookies: Cookies): AppSession | null {
	return parseAppCookieValue(cookies.get(APP_COOKIE));
}

export function setAppCookie(cookies: Cookies, session: AppSession): void {
	cookies.set(APP_COOKIE, serializeAppCookie(session.applicationId, session.sessionToken), appCookieOpts);
}

export function clearAppCookie(cookies: Cookies): void {
	cookies.delete(APP_COOKIE, { path: '/' });
}

/** This token is the one minted for this application id. */
export function assertSession(applicationId: string, sessionToken: string): void {
	const row = db
		.select({ sessionTokenHash: applications.sessionTokenHash })
		.from(applications)
		.where(eq(applications.id, applicationId))
		.get();

	if (!row?.sessionTokenHash || !tokensMatch(row.sessionTokenHash, sessionToken)) {
		throw messageError(401, 'This application is not yours.');
	}
}

/**
 * Cookie must be present, parse as id.token, name the same application as `applicationId`, and
 * hash-match the row. Used by GET/PATCH `/api/applications/:id`.
 */
export function requireAppSession(
	event: Pick<RequestEvent, 'cookies'>,
	applicationId: string
): void {
	const session = readAppCookie(event.cookies);
	if (!session || session.applicationId !== applicationId) {
		throw messageError(401, 'This application is not yours.');
	}
	assertSession(session.applicationId, session.sessionToken);
}

/** Cookie identifies the application. Used by GET `/api/phones` so the query string cannot. */
export function requireOwnApplication(event: Pick<RequestEvent, 'cookies'>): string {
	const session = readAppCookie(event.cookies);
	if (!session) throw messageError(401, 'This application is not yours.');
	assertSession(session.applicationId, session.sessionToken);
	return session.applicationId;
}
