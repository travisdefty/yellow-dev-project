/**
 * The only place in the API that knows it is running inside SvelteKit.
 *
 * Handlers in `$lib/server/api/` return a value or throw an `ApiError`; this turns either into a
 * `Response`. It sits deliberately *outside* that directory, so "nothing under `api/` imports from
 * @sveltejs/kit" stays a fact you can check with grep rather than a convention. Keeping the
 * translation in one small function is what would make pointing those handlers at Fastify a matter
 * of writing the equivalent of this file, without touching a single rule about applications.
 *
 * Anything that is not an `ApiError` is a genuine bug and is rethrown, so it reaches the error
 * handler as a 500 with a stack rather than being flattened into a polite 400.
 */
import { json } from '@sveltejs/kit';
import { isApiError, type ApiError } from '$lib/server/api/errors';

export function respond<T>(handler: () => T): Response {
	try {
		return json(handler());
	} catch (error) {
		if (isApiError(error)) return errorResponse(error);
		throw error;
	}
}

export function errorResponse(error: ApiError): Response {
	return json(error.body, { status: error.status });
}
