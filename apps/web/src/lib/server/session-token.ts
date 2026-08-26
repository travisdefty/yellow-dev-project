/**
 * Session-token crypto. Kit-free so the API handlers can mint and hash without importing
 * `@sveltejs/kit`.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function mintSessionToken(): string {
	return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(storedHash: string, token: string): boolean {
	const expected = Buffer.from(storedHash, 'hex');
	const actual = Buffer.from(hashSessionToken(token), 'hex');
	if (expected.length !== actual.length) return false;
	return timingSafeEqual(expected, actual);
}
